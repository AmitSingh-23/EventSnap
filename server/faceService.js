const canvas = require('canvas');
const faceapi = require('face-api.js');

const path = require('path');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;
async function loadModels() {
  if (modelsLoaded) return;
  const weightsDir = path.join(__dirname, 'weights');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(weightsDir);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(weightsDir);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(weightsDir);
  modelsLoaded = true;
  console.log('faceService: face-api models loaded');
}

async function getFaceEmbedding(imageUrl) {
  await loadModels();
  const img = await canvas.loadImage(imageUrl);
  const detection = await faceapi.detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
    
  if (!detection) return null;
  return Array.from(detection.descriptor);
}

module.exports = {
  getFaceEmbedding
};

