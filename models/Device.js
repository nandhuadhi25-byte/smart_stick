const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  deviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  deviceType: {
    type: String,
    enum: ['safety-stick', 'mobile-app', 'web-dashboard'],
    default: 'safety-stick'
  },
  bluetoothAddress: {
    type: String,
    required: false,
    trim: true
  },
  firmwareVersion: {
    type: String,
    required: false
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  socketId: {
    type: String,
    required: false
  },
  capabilities: {
    gps: {
      type: Boolean,
      default: true
    },
    bluetooth: {
      type: Boolean,
      default: true
    },
    vibration: {
      type: Boolean,
      default: true
    },
    audio: {
      type: Boolean,
      default: true
    },
    emergencyButton: {
      type: Boolean,
      default: true
    }
  },
  settings: {
    vibrationIntensity: {
      type: Number,
      min: 0,
      max: 10,
      default: 5
    },
    audioVolume: {
      type: Number,
      min: 0,
      max: 10,
      default: 7
    },
    autoEmergency: {
      type: Boolean,
      default: false
    },
    emergencyTimeout: {
      type: Number,
      default: 30 // seconds
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
deviceSchema.index({ userId: 1, isActive: 1 });
deviceSchema.index({ deviceId: 1 });
deviceSchema.index({ lastSeen: 1 });

module.exports = mongoose.model('Device', deviceSchema);
