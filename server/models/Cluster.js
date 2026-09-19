const mongoose = require('mongoose');

const ClusterSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  centroid: {
    type: [Number],
    required: true,
  },
  coverImageUrl: {
    type: String,
    default: null
  },
  label: {
    type: String,
    default: null
  },
  photoIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo'
  }]
}, { timestamps: true });

module.exports = mongoose.model('Cluster', ClusterSchema);
