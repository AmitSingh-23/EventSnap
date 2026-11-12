const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ai-event-photos',
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});

// Only accept images, and cap the size of each file, so the upload route cannot
// be used to store arbitrary or oversized files.
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB per photo
const ALLOWED_TYPES = ['image/jpeg', 'image/png']; // matches Cloudinary allowed_formats

function imageFileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
  const err = new Error('Only JPEG and PNG images are allowed');
  err.status = 400;
  return cb(err);
}

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 50 },
  fileFilter: imageFileFilter
});

module.exports = {
  cloudinary,
  upload,
  imageFileFilter,
  MAX_FILE_SIZE
};
