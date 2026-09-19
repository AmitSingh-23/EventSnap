const mongoose = require('mongoose');

const FaceSchema = new mongoose.Schema({
  embedding: {
    type: [Number],
    required: true,
  },
  boundingBox: {
    x: Number,
    y: Number,
    width: Number,
    height: Number
  },
  clusterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cluster',
    default: null
  }
}, { _id: true });

const PhotoSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending'
  },
  errorReason: {
    type: String,
    default: null
  },
  faces: [FaceSchema],
}, { timestamps: true });

module.exports = mongoose.model('Photo', PhotoSchema);
