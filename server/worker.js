const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const canvas = require('canvas');
const faceapi = require('face-api.js');

const path = require('path');
const requireDotenv = require('dotenv');
requireDotenv.config();

const { Photo } = require('./models');

// Patch face-api environment
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-event-photos')
  .then(() => console.log('Worker: MongoDB connected'))
  .catch(err => console.error('Worker: MongoDB connection error:', err));

let modelsLoaded = false;
async function loadModels() {
  if (modelsLoaded) return;
  const weightsDir = path.join(__dirname, 'weights');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(weightsDir);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(weightsDir);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(weightsDir);
  modelsLoaded = true;
  console.log('Worker: face-api models loaded');
}

async function processPhoto(job) {
  const { photoId, imageUrl } = job.data;
  console.log(`Processing photo ${photoId}...`);

  await loadModels();

  try {
    // Load image using canvas
    const img = await canvas.loadImage(imageUrl);
    
    // Detect all faces in the image with their landmarks and descriptors (embeddings)
    const detections = await faceapi.detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) {
      await Photo.findByIdAndUpdate(photoId, {
        status: 'failed',
        errorReason: 'No face found'
      });
      return { success: false, reason: 'No face found' };
    }

    const faces = detections.map(det => {
      const box = det.detection.box;
      return {
        embedding: Array.from(det.descriptor), // convert Float32Array to Array
        boundingBox: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height
        }
      };
    });

    await Photo.findByIdAndUpdate(photoId, {
      status: 'processed',
      faces: faces
    });

    return { success: true, faceCount: faces.length };
  } catch (err) {
    console.error('Error processing photo:', err);
    await Photo.findByIdAndUpdate(photoId, {
      status: 'failed',
      errorReason: err.message || 'Processing error'
    });
    throw err;
  }
}

const worker = new Worker('photo-processing', processPhoto, { connection });

worker.on('completed', (job, returnvalue) => {
  console.log(`Job ${job.id} completed: ${JSON.stringify(returnvalue)}`);
});

worker.on('failed', (job, error) => {
  console.log(`Job ${job.id} failed with ${error.message}`);
});

console.log('Worker started');

