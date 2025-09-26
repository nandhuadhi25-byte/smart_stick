const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema({
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
  alertType: {
    type: String,
    enum: ['manual', 'automatic', 'fall-detection', 'panic', 'medical'],
    required: true
  },
  message: {
    type: String,
    required: false,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'false-alarm'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    required: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  notifications: [{
    type: {
      type: String,
      enum: ['sms', 'email', 'push', 'call'],
      required: true
    },
    recipient: {
      type: String,
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    response: {
      type: String,
      required: false
    }
  }],
  response: {
    type: String,
    required: false,
    maxlength: 1000
  },
  metadata: {
    batteryLevel: {
      type: Number,
      required: false
    },
    signalStrength: {
      type: Number,
      required: false
    },
    deviceInfo: {
      type: String,
      required: false
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
emergencyAlertSchema.index({ userId: 1, timestamp: -1 });
emergencyAlertSchema.index({ status: 1, priority: 1 });
emergencyAlertSchema.index({ timestamp: -1 });
emergencyAlertSchema.index({ latitude: 1, longitude: 1 });

// 2dsphere index for geospatial queries
emergencyAlertSchema.index({ 
  location: '2dsphere' 
});

// Virtual for GeoJSON point
emergencyAlertSchema.virtual('location').get(function() {
  return {
    type: 'Point',
    coordinates: [this.longitude, this.latitude]
  };
});

// Ensure virtual fields are serialized
emergencyAlertSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);
