const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  accuracy: {
    type: Number,
    required: false,
    min: 0
  },
  altitude: {
    type: Number,
    required: false
  },
  speed: {
    type: Number,
    required: false,
    min: 0
  },
  heading: {
    type: Number,
    required: false,
    min: 0,
    max: 360
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['gps', 'network', 'passive'],
    default: 'gps'
  },
  isEmergency: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
locationSchema.index({ userId: 1, timestamp: -1 });
locationSchema.index({ deviceId: 1, timestamp: -1 });
locationSchema.index({ latitude: 1, longitude: 1 });
locationSchema.index({ timestamp: -1 });

// 2dsphere index for geospatial queries
locationSchema.index({ 
  location: '2dsphere' 
});

// Virtual for GeoJSON point
locationSchema.virtual('location').get(function() {
  return {
    type: 'Point',
    coordinates: [this.longitude, this.latitude]
  };
});

// Ensure virtual fields are serialized
locationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Location', locationSchema);
