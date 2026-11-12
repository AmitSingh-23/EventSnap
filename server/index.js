const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const { Event, Photo, Cluster } = require('./models');
const { upload } = require('./cloudinary');
const { photoQueue } = require('./queue');

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  }
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-event-photos')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Phase 2: Photo upload

app.post('/api/events', [
  body('name').trim().notEmpty().withMessage('Event name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, description } = req.body;
    
    const event = new Event({ name, description });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.post('/api/events/:eventId/photos', upload.array('photos', 50), async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    const createdPhotos = [];

    for (const file of req.files) {
      const photo = new Photo({
        eventId,
        imageUrl: file.path,
        status: 'pending'
      });
      await photo.save();
      createdPhotos.push(photo);
      
      await photoQueue.add('process-photo', {
        photoId: photo._id,
        imageUrl: file.path
      });
    }

    res.status(201).json({ message: 'Photos uploaded and queued for processing', photos: createdPhotos });
  } catch (error) {
    console.error('Error uploading photos:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

app.get('/api/events/:eventId/status', async (req, res) => {
  try {
    const { eventId } = req.params;
    const total = await Photo.countDocuments({ eventId });
    const processed = await Photo.countDocuments({ eventId, status: 'processed' });
    const failed = await Photo.countDocuments({ eventId, status: 'failed' });
    const pending = await Photo.countDocuments({ eventId, status: 'pending' });
    
    res.status(200).json({ total, processed, failed, pending });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

const { clusterEmbeddings, calculateCentroid } = require('./clustering');

app.post('/api/events/:eventId/cluster', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get all successfully processed photos for the event
    const photos = await Photo.find({ eventId, status: 'processed' });
    if (photos.length === 0) {
      return res.status(400).json({ error: 'No processed photos available to cluster' });
    }

    // Flatten all faces across all photos
    const dataset = [];
    const faceRefs = []; // keep track of which face belongs to which photo

    photos.forEach(photo => {
      photo.faces.forEach((face, index) => {
        dataset.push(face.embedding);
        faceRefs.push({ 
          photoId: photo._id, 
          faceId: face._id, 
          index, 
          imageUrl: photo.imageUrl, 
          boundingBox: face.boundingBox 
        });
      });
    });

    if (dataset.length === 0) {
      return res.status(400).json({ error: 'No faces found in processed photos' });
    }

    // Clear existing clusters for this event
    await Cluster.deleteMany({ eventId });
    // Reset clusterIds in all photos for this event
    await Photo.updateMany({ eventId }, { $set: { "faces.$[].clusterId": null } });

    // Group faces by person with DBSCAN (see clustering.js)
    const clusters = clusterEmbeddings(dataset);

    const createdClusters = [];
    const sharp = require('sharp');
    const axios = require('axios');
    const { cloudinary } = require('./cloudinary');

    // Process clusters
    for (const clusterIndices of clusters) {
      const clusterPoints = clusterIndices.map(i => dataset[i]);
      const centroid = calculateCentroid(clusterPoints);
      
      const photoIds = [...new Set(clusterIndices.map(i => faceRefs[i].photoId))];

      const firstFace = faceRefs[clusterIndices[0]];
      let coverImageUrl = null;
      if (firstFace.boundingBox) {
        try {
          const response = await axios.get(firstFace.imageUrl, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(response.data, 'binary');
          const box = firstFace.boundingBox;
          const marginX = box.width * 0.2;
          const marginY = box.height * 0.2;
          
          const sharpImg = sharp(buffer);
          const metadata = await sharpImg.metadata();
          
          const left = Math.max(0, Math.floor(box.x - marginX));
          const top = Math.max(0, Math.floor(box.y - marginY));
          const width = Math.min(metadata.width - left, Math.floor(box.width + marginX * 2));
          const height = Math.min(metadata.height - top, Math.floor(box.height + marginY * 2));
          
          const croppedBuffer = await sharp(buffer)
            .extract({ left, top, width, height })
            .toBuffer();
            
          const uploadRes = await new Promise((resolve, reject) => {
             const stream = cloudinary.uploader.upload_stream({ folder: 'ai-event-photos/covers' }, (err, result) => {
                if (err) reject(err); else resolve(result);
             });
             stream.end(croppedBuffer);
          });
          coverImageUrl = uploadRes.secure_url;
        } catch(err) {
          console.error('Failed to generate cover image', err);
        }
      }

      const newCluster = new Cluster({
        eventId,
        centroid,
        photoIds,
        coverImageUrl,
        label: `Person ${createdClusters.length + 1}`
      });
      await newCluster.save();
      createdClusters.push(newCluster);

      // Back-fill clusterId into photo's face entries
      for (const i of clusterIndices) {
        const ref = faceRefs[i];
        await Photo.updateOne(
          { _id: ref.photoId, "faces._id": ref.faceId },
          { $set: { "faces.$.clusterId": newCluster._id } }
        );
      }
    }

    res.status(200).json({ 
      message: 'Clustering completed successfully', 
      clusterCount: createdClusters.length 
    });
  } catch (error) {
    console.error('Error during clustering:', error);
    res.status(500).json({ error: 'Failed to cluster photos' });
  }
});

app.get('/api/events/:eventId/folders', async (req, res) => {
  try {
    const { eventId } = req.params;
    const clusters = await Cluster.find({ eventId });
    const result = clusters.map(c => ({
      clusterId: c._id,
      coverImageUrl: c.coverImageUrl,
      label: c.label || `Cluster ${c._id.toString().substring(0,4)}`,
      photoCount: c.photoIds.length
    }));
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

app.patch('/api/clusters/:clusterId', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { label } = req.body;
    const cluster = await Cluster.findByIdAndUpdate(clusterId, { label }, { new: true });
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });
    res.status(200).json(cluster);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update label' });
  }
});

app.get('/api/clusters/:clusterId/photos', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const cluster = await Cluster.findById(clusterId).populate('photoIds', 'imageUrl');
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });
    res.status(200).json(cluster.photoIds.map(p => p.imageUrl));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

const archiver = require('archiver');

const streamPhotosAsZip = async (cluster, res) => {
  res.attachment(`${cluster.label || 'person-photos'}.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  archive.on('error', err => { throw err; });
  archive.pipe(res);
  
  const axios = require('axios');
  
  for (let i = 0; i < cluster.photoIds.length; i++) {
    const photo = cluster.photoIds[i];
    try {
      const response = await axios.get(photo.imageUrl, { responseType: 'stream' });
      const extension = photo.imageUrl.split('.').pop() || 'jpg';
      archive.append(response.data, { name: `photo_${i + 1}.${extension}` });
    } catch(err) {
      console.error(`Failed to fetch photo ${photo.imageUrl}`);
    }
  }
  
  await archive.finalize();
};

app.get('/api/clusters/:clusterId/download', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const cluster = await Cluster.findById(clusterId).populate('photoIds', 'imageUrl');
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });
    
    await streamPhotosAsZip(cluster, res);
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to download zip' });
  }
});


// Direct Cluster Gallery
app.get('/api/clusters/:clusterId/gallery', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const cluster = await Cluster.findById(clusterId).populate('photoIds', 'imageUrl');
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });
    const photos = cluster.photoIds.map(p => p.imageUrl);
    res.status(200).json({ photos });
  } catch (error) {
    console.error('Error fetching cluster gallery:', error);
    res.status(500).json({ error: 'Failed to fetch cluster gallery' });
  }
});

// Health Check
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR CAUGHT:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error', details: err });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
