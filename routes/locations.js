const express = require('express');
const Location = require('../models/Location');
const Device = require('../models/Device');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user's location history
router.get('/history', auth, async (req, res) => {
  try {
    const { deviceId, limit = 100, startDate, endDate } = req.query;

    let query = { userId: req.userId };
    
    if (deviceId) {
      query.deviceId = deviceId;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const locations = await Location.find(query)
      .populate('deviceId', 'name deviceType')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json(locations);
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current location
router.get('/current', auth, async (req, res) => {
  try {
    const location = await Location.findOne({ 
      userId: req.userId 
    }).sort({ timestamp: -1 });

    if (!location) {
      return res.status(404).json({ message: 'No location data found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Get current location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update location
router.post('/update', auth, async (req, res) => {
  try {
    const { 
      deviceId, 
      latitude, 
      longitude, 
      accuracy, 
      altitude, 
      speed, 
      heading, 
      source = 'gps' 
    } = req.body;

    // Verify device belongs to user
    const device = await Device.findOne({
      _id: deviceId,
      userId: req.userId,
      isActive: true
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const location = new Location({
      userId: req.userId,
      deviceId,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      heading,
      source
    });

    await location.save();

    res.status(201).json({
      message: 'Location updated successfully',
      location
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get locations within radius
router.get('/nearby', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const locations = await Location.find({
      userId: req.userId,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius)
        }
      }
    }).sort({ timestamp: -1 }).limit(50);

    res.json(locations);
  } catch (error) {
    console.error('Get nearby locations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get location statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const { deviceId, days = 7 } = req.query;

    let query = { userId: req.userId };
    
    if (deviceId) {
      query.deviceId = deviceId;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    query.timestamp = { $gte: startDate };

    const stats = await Location.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalLocations: { $sum: 1 },
          avgAccuracy: { $avg: '$accuracy' },
          avgSpeed: { $avg: '$speed' },
          firstLocation: { $min: '$timestamp' },
          lastLocation: { $max: '$timestamp' }
        }
      }
    ]);

    res.json(stats[0] || {
      totalLocations: 0,
      avgAccuracy: 0,
      avgSpeed: 0,
      firstLocation: null,
      lastLocation: null
    });
  } catch (error) {
    console.error('Get location stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
