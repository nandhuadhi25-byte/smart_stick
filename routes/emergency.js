const express = require('express');
const EmergencyAlert = require('../models/EmergencyAlert');
const User = require('../models/User');
const auth = require('../middleware/auth');
const twilio = require('twilio');
const nodemailer = require('nodemailer');

const router = express.Router();

// Initialize Twilio client (only if credentials are provided)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('Twilio client initialized successfully');
  } catch (error) {
    console.warn('Twilio initialization failed:', error.message);
  }
} else {
  console.warn('Twilio credentials not configured or invalid');
}

// Initialize email transporter (only if credentials are provided)
let emailTransporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  try {
    emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('Email transporter initialized successfully');
  } catch (error) {
    console.warn('Email transporter initialization failed:', error.message);
  }
} else {
  console.warn('Email credentials not configured');
}

// Create emergency alert
router.post('/alert', auth, async (req, res) => {
  try {
    const { 
      deviceId, 
      latitude, 
      longitude, 
      alertType = 'manual', 
      message, 
      priority = 'high' 
    } = req.body;

    const alert = new EmergencyAlert({
      userId: req.userId,
      deviceId,
      latitude,
      longitude,
      alertType,
      message,
      priority
    });

    await alert.save();

    // Send notifications to emergency contacts
    await sendEmergencyNotifications(alert);

    res.status(201).json({
      message: 'Emergency alert created successfully',
      alert
    });
  } catch (error) {
    console.error('Create emergency alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's emergency alerts
router.get('/alerts', auth, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = { userId: req.userId };
    if (status) query.status = status;

    const alerts = await EmergencyAlert.find(query)
      .populate('deviceId', 'name deviceType')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json(alerts);
  } catch (error) {
    console.error('Get emergency alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update alert status
router.put('/alerts/:alertId', auth, async (req, res) => {
  try {
    const { status, response } = req.body;

    const alert = await EmergencyAlert.findOne({
      _id: req.params.alertId,
      userId: req.userId
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.status = status;
    if (response) alert.response = response;
    if (status === 'resolved') {
      alert.resolvedAt = new Date();
      alert.resolvedBy = req.userId;
    }

    await alert.save();

    res.json({
      message: 'Alert status updated successfully',
      alert
    });
  } catch (error) {
    console.error('Update alert status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active alerts (for monitoring dashboard)
router.get('/active', auth, async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find({ 
      status: 'active' 
    })
    .populate('userId', 'name email phone')
    .populate('deviceId', 'name deviceType')
    .sort({ timestamp: -1 });

    res.json(alerts);
  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send emergency notifications
async function sendEmergencyNotifications(alert) {
  try {
    const user = await User.findById(alert.userId);
    if (!user) return;

    const notifications = [];

    // Send SMS to emergency contacts
    if (user.emergencyContacts && user.emergencyContacts.length > 0) {
      for (const contact of user.emergencyContacts) {
        if (contact.phone) {
          if (twilioClient) {
            try {
              const smsMessage = `EMERGENCY ALERT: ${user.name} needs help! Location: https://maps.google.com/?q=${alert.latitude},${alert.longitude} Message: ${alert.message || 'Emergency assistance needed'}`;
              
              await twilioClient.messages.create({
                body: smsMessage,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: contact.phone
              });

              notifications.push({
                type: 'sms',
                recipient: contact.phone,
                sentAt: new Date(),
                status: 'sent'
              });
            } catch (error) {
              console.error('SMS send error:', error);
              notifications.push({
                type: 'sms',
                recipient: contact.phone,
                sentAt: new Date(),
                status: 'failed'
              });
            }
          } else {
            console.warn('Twilio not configured - SMS not sent to', contact.phone);
            notifications.push({
              type: 'sms',
              recipient: contact.phone,
              sentAt: new Date(),
              status: 'pending'
            });
          }
        }

        // Send email to emergency contacts
        if (contact.email) {
          if (emailTransporter) {
            try {
              await emailTransporter.sendMail({
                from: process.env.EMAIL_USER,
                to: contact.email,
                subject: `EMERGENCY ALERT: ${user.name} needs help!`,
                html: `
                  <h2>Emergency Alert</h2>
                  <p><strong>User:</strong> ${user.name}</p>
                  <p><strong>Phone:</strong> ${user.phone}</p>
                  <p><strong>Location:</strong> <a href="https://maps.google.com/?q=${alert.latitude},${alert.longitude}">View on Google Maps</a></p>
                  <p><strong>Coordinates:</strong> ${alert.latitude}, ${alert.longitude}</p>
                  <p><strong>Alert Type:</strong> ${alert.alertType}</p>
                  <p><strong>Message:</strong> ${alert.message || 'Emergency assistance needed'}</p>
                  <p><strong>Time:</strong> ${alert.timestamp}</p>
                `
              });

              notifications.push({
                type: 'email',
                recipient: contact.email,
                sentAt: new Date(),
                status: 'sent'
              });
            } catch (error) {
              console.error('Email send error:', error);
              notifications.push({
                type: 'email',
                recipient: contact.email,
                sentAt: new Date(),
                status: 'failed'
              });
            }
          } else {
            console.warn('Email not configured - email not sent to', contact.email);
            notifications.push({
              type: 'email',
              recipient: contact.email,
              sentAt: new Date(),
              status: 'pending'
            });
          }
        }
      }
    }

    // Send to emergency services
    if (twilioClient && process.env.EMERGENCY_PHONE) {
      try {
        const emergencyMessage = `EMERGENCY: ${user.name} (${user.phone}) needs help at ${alert.latitude},${alert.longitude}. Alert: ${alert.alertType}`;
        
        await twilioClient.messages.create({
          body: emergencyMessage,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: process.env.EMERGENCY_PHONE
        });

        notifications.push({
          type: 'sms',
          recipient: process.env.EMERGENCY_PHONE,
          sentAt: new Date(),
          status: 'sent'
        });
      } catch (error) {
        console.error('Emergency services SMS error:', error);
        notifications.push({
          type: 'sms',
          recipient: process.env.EMERGENCY_PHONE,
          sentAt: new Date(),
          status: 'failed'
        });
      }
    } else {
      console.warn('Emergency services SMS not configured');
    }

    // Update alert with notifications
    alert.notifications = notifications;
    await alert.save();

  } catch (error) {
    console.error('Send emergency notifications error:', error);
  }
}

module.exports = router;
