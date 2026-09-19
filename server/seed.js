const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const SAMPLES_DIR = path.join(__dirname, 'samples');

async function seed() {
  const files = fs.readdirSync(SAMPLES_DIR).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
  if (files.length === 0) {
    console.error('No sample images found in /samples directory. Please add some synthetic face images (e.g., from thispersondoesnotexist.com) and try again.');
    process.exit(1);
  }

  try {
    // 1. Create Event
    const eventRes = await axios.post('http://localhost:5000/api/events', {
      name: 'Test Event',
      description: 'Seed event for testing pipeline'
    });
    const eventId = eventRes.data._id;
    console.log(`Created Event: ${eventId}`);

    // 2. Upload Photos
    const form = new FormData();
    for (const file of files) {
      form.append('photos', fs.createReadStream(path.join(SAMPLES_DIR, file)));
    }

    console.log('Uploading photos...');
    const uploadRes = await axios.post(`http://localhost:5000/api/events/${eventId}/photos`, form, {
      headers: {
        ...form.getHeaders()
      }
    });

    console.log('Upload Response:', uploadRes.data.message);
    console.log('Photos queued:', uploadRes.data.photos.length);
    console.log('Done! Start the worker if not already running to process them.');
  } catch (error) {
    console.error('Error during seeding:', error.response ? error.response.data : error.message);
  }
}

seed();
