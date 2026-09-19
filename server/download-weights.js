const fs = require('fs');
const path = require('path');
const https = require('https');

const weightsDir = path.join(__dirname, 'weights');
if (!fs.existsSync(weightsDir)) {
  fs.mkdirSync(weightsDir);
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      return resolve();
    }
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function main() {
  console.log('Downloading face-api weights...');
  for (const file of files) {
    console.log(`Downloading ${file}...`);
    await download(`${baseUrl}/${file}`, path.join(weightsDir, file));
  }
  console.log('Done!');
}

main().catch(console.error);
