const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const locationRoutes = require('./routes/locations');
const emergencyRoutes = require('./routes/emergency');

// Import models
const User = require('./models/User');
const Device = require('./models/Device');
const Location = require('./models/Location');
const EmergencyAlert = require('./models/EmergencyAlert');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "https://unpkg.com",
        "https://cdn.jsdelivr.net"
      ],
      "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://unpkg.com",
        "https://cdn.jsdelivr.net"
      ],
      "img-src": [
        "'self'",
        "data:",
        "blob:",
        "https://*.tile.openstreetmap.org"
      ],
      "connect-src": [
        "'self'",
        "ws:",
        "wss:",
        "https://router.project-osrm.org",
        "https://nominatim.openstreetmap.org"
      ],
      "worker-src": ["'self'", "blob:"],
      "font-src": ["'self'", "data:"]
    }
  }
}));
// Allow cross-origin resources like map tiles
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:3000"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/emergency', emergencyRoutes);

// Serve static files
app.use(express.static('public'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their room for personalized updates
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Handle device connection
  socket.on('device-connected', async (data) => {
    try {
      const { userId, deviceId, deviceInfo } = data;
      socket.join(`device-${deviceId}`);
      
      // Update device status in database
      await Device.findByIdAndUpdate(deviceId, {
        isConnected: true,
        lastSeen: new Date(),
        socketId: socket.id
      });

      // Notify user about device connection
      socket.to(`user-${userId}`).emit('device-status-update', {
        deviceId,
        isConnected: true,
        deviceInfo
      });

      console.log(`Device ${deviceId} connected for user ${userId}`);
    } catch (error) {
      console.error('Error handling device connection:', error);
    }
  });

  // Handle location updates
  socket.on('location-update', async (data) => {
    try {
      const { userId, deviceId, location } = data;
      
      // Skip saving if deviceId is not a valid ObjectId (e.g., 'web-dashboard')
      let deviceObjectId = null;
      try {
        deviceObjectId = new mongoose.Types.ObjectId(deviceId);
      } catch (_) {}

      if (deviceObjectId) {
        const locationRecord = new Location({
          userId,
          deviceId: deviceObjectId,
          latitude: location.lat,
          longitude: location.lng,
          accuracy: location.accuracy,
          timestamp: new Date()
        });
        await locationRecord.save();
      }

      // Broadcast to user's room
      io.to(`user-${userId}`).emit('location-updated', {
        deviceId,
        location,
        timestamp: new Date()
      });

      console.log(`Location updated for user ${userId}: ${location.lat}, ${location.lng}`);
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  });

  // Handle emergency alerts
  socket.on('emergency-alert', async (data) => {
    try {
      const { userId, deviceId, location, alertType, message } = data;
      
      // Create emergency alert record
      const emergencyAlert = new EmergencyAlert({
        userId,
        deviceId,
        latitude: location.lat,
        longitude: location.lng,
        alertType,
        message,
        status: 'active',
        timestamp: new Date()
      });
      await emergencyAlert.save();

      // Notify emergency contacts and authorities
      io.to(`user-${userId}`).emit('emergency-triggered', {
        alertId: emergencyAlert._id,
        location,
        alertType,
        message,
        timestamp: new Date()
      });

      // Broadcast to all connected clients (for monitoring dashboard)
      io.emit('emergency-broadcast', {
        userId,
        deviceId,
        location,
        alertType,
        message,
        timestamp: new Date()
      });

      console.log(`Emergency alert triggered for user ${userId}: ${alertType}`);
    } catch (error) {
      console.error('Error handling emergency alert:', error);
    }
  });

  // Handle device disconnection
  socket.on('device-disconnected', async (data) => {
    try {
      const { userId, deviceId } = data;
      
      // Update device status
      await Device.findByIdAndUpdate(deviceId, {
        isConnected: false,
        lastSeen: new Date()
      });

      // Notify user
      socket.to(`user-${userId}`).emit('device-status-update', {
        deviceId,
        isConnected: false
      });

      console.log(`Device ${deviceId} disconnected for user ${userId}`);
    } catch (error) {
      console.error('Error handling device disconnection:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-safety-stick', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
