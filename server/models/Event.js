const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, default: Date.now },
  description: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
