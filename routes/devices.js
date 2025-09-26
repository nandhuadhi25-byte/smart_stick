const express = require('express');
const Device = require('../models/Device');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all devices for user
router.get('/', auth, async (req, res) => {
  try {
    const devices = await Device.find({ 
      userId: req.userId, 
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json(devices);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific device
router.get('/:deviceId', auth, async (req, res) => {
  try {
    const device = await Device.findOne({
      _id: req.params.deviceId,
      userId: req.userId,
      isActive: true
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register new device
router.post('/register', auth, async (req, res) => {
  try {
    const { name, deviceId, deviceType, bluetoothAddress, firmwareVersion, capabilities } = req.body;

    // Check if device already exists
    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) {
      return res.status(400).json({ message: 'Device already registered' });
    }

    const device = new Device({
      userId: req.userId,
      name,
      deviceId,
      deviceType,
      bluetoothAddress,
      firmwareVersion,
      capabilities: capabilities || {}
    });

    await device.save();

    res.status(201).json({
      message: 'Device registered successfully',
      device
    });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update device settings
router.put('/:deviceId/settings', auth, async (req, res) => {
  try {
    const { settings } = req.body;

    const device = await Device.findOne({
      _id: req.params.deviceId,
      userId: req.userId,
      isActive: true
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    device.settings = { ...device.settings, ...settings };
    await device.save();

    res.json({
      message: 'Device settings updated successfully',
      device
    });
  } catch (error) {
    console.error('Device settings update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update device status
router.put('/:deviceId/status', auth, async (req, res) => {
  try {
    const { isConnected, batteryLevel, lastSeen } = req.body;

    const device = await Device.findOne({
      _id: req.params.deviceId,
      userId: req.userId,
      isActive: true
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (isConnected !== undefined) device.isConnected = isConnected;
    if (batteryLevel !== undefined) device.batteryLevel = batteryLevel;
    if (lastSeen) device.lastSeen = new Date(lastSeen);

    await device.save();

    res.json({
      message: 'Device status updated successfully',
      device
    });
  } catch (error) {
    console.error('Device status update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete device
router.delete('/:deviceId', auth, async (req, res) => {
  try {
    const device = await Device.findOne({
      _id: req.params.deviceId,
      userId: req.userId,
      isActive: true
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    device.isActive = false;
    await device.save();

    res.json({ message: 'Device deactivated successfully' });
  } catch (error) {
    console.error('Device deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get device connection status
router.get('/:deviceId/status', auth, async (req, res) => {
  try {
    const device = await Device.findOne({
      _id: req.params.deviceId,
      userId: req.userId,
      isActive: true
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json({
      isConnected: device.isConnected,
      lastSeen: device.lastSeen,
      batteryLevel: device.batteryLevel,
      socketId: device.socketId
    });
  } catch (error) {
    console.error('Get device status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
