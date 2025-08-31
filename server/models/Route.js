const mongoose = require('mongoose');

const StopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  arrivalTime: {
    type: String,
    required: true
  }
});

const RouteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  stops: [StopSchema],
  isActive: {
    type: Boolean,
    default: true
  }
});

// Create geospatial index for stop locations
RouteSchema.index({ 'stops.location': '2dsphere' });

module.exports = mongoose.model('Route', RouteSchema); 