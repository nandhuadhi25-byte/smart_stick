# Smart Safety Stick - Full Stack Application

A comprehensive IoT safety solution combining ESP32 hardware, mobile app, and web dashboard for emergency assistance and navigation.

## 🚀 Features

### Hardware (ESP32)
- **Bluetooth Low Energy (BLE)** communication
- **GPS location tracking** with real-time updates
- **Emergency button** with haptic feedback
- **Fall detection** using accelerometer
- **Vibration motor** for tactile alerts
- **Audio alerts** with buzzer/speaker
- **Battery monitoring** with low battery warnings
- **LED indicators** for status

### Web Dashboard
- **Real-time location tracking** on interactive maps
- **Route planning** with turn-by-turn navigation
- **Emergency alerts** with SMS/WhatsApp integration
- **Device management** and status monitoring
- **User authentication** and profile management
- **Live emergency monitoring** dashboard

### Mobile App Integration
- **Web Bluetooth** support for ESP32 connection
- **Push notifications** for emergency alerts
- **Offline navigation** capabilities
- **Emergency contact management**

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **Socket.io** for real-time communication
- **MongoDB** with Mongoose ODM
- **JWT** authentication
- **Twilio** for SMS notifications
- **Nodemailer** for email alerts

### Frontend
- **HTML5/CSS3/JavaScript** (Vanilla)
- **Leaflet.js** for interactive maps
- **OpenStreetMap** tiles
- **OSRM** routing engine
- **Web Bluetooth API**

### Hardware
- **ESP32** microcontroller
- **Arduino IDE** development
- **GPS Module** (NEO-6M)
- **MPU6050** accelerometer
- **BLE** communication

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Arduino IDE
- ESP32 development board

### Backend Setup

1. **Clone and install dependencies:**
```bash
cd smart-safety-stick
npm install
```

2. **Environment configuration:**
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Start MongoDB:**
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Ubuntu/Debian
sudo systemctl start mongod

# On Windows
net start MongoDB
```

4. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

### Frontend Setup

The frontend is served statically from the `public` directory. No additional setup required.

### ESP32 Setup

1. **Install Arduino IDE** and ESP32 board support
2. **Install required libraries:**
   - BLEDevice (included with ESP32)
   - TinyGPS++ (install via Library Manager)
   - MPU6050 (install via Library Manager)

3. **Hardware connections:**
```
ESP32    | Component
---------|----------
GPIO 16  | GPS RX
GPIO 17  | GPS TX
GPIO 18  | Vibration Motor
GPIO 19  | Buzzer
GPIO 0   | Emergency Button
GPIO 2   | LED
A0       | Battery Voltage
```

4. **Upload the code:**
   - Open `esp32/smart_safety_stick.ino` in Arduino IDE
   - Select your ESP32 board
   - Upload the code

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/smart-safety-stick

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Twilio Configuration (for SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Emergency Contacts
EMERGENCY_PHONE=+1234567890
EMERGENCY_EMAIL=emergency@example.com

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:8080,http://localhost:4200
```

### Twilio Setup

1. Create a Twilio account
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Update the `.env` file with your credentials

### Email Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an app-specific password
3. Update the `.env` file with your credentials

## 🚀 Usage

### Web Dashboard

1. **Open the application:**
   ```
   http://localhost:3000
   ```

2. **Register a new account** or login

3. **Connect your ESP32 device:**
   - Click "Connect Stick"
   - Select your ESP32 device from the BLE list
   - Wait for connection confirmation

4. **Set destination:**
   - Search for a location or tap on the map
   - Click "Start Route" for navigation

5. **Emergency features:**
   - Use "SOS SMS" for SMS emergency alerts
   - Use "SOS WhatsApp" for WhatsApp emergency alerts
   - Press the emergency button on the ESP32

### ESP32 Device

1. **Power on the device**
2. **Wait for GPS fix** (LED will indicate status)
3. **Press emergency button** to trigger emergency alert
4. **Device will vibrate and beep** for feedback
5. **Location updates** are sent automatically

## 📱 Mobile App Integration

The web application is mobile-responsive and includes:

- **Web Bluetooth** support for ESP32 connection
- **Touch-friendly interface** for mobile devices
- **GPS integration** for location services
- **Push notifications** (when installed as PWA)

### PWA Installation

1. Open the web app in Chrome/Edge
2. Click the "Install" button in the address bar
3. The app will be installed as a native-like app

## 🔒 Security Features

- **JWT authentication** for secure API access
- **Rate limiting** to prevent abuse
- **Input validation** and sanitization
- **CORS protection** for cross-origin requests
- **Helmet.js** for security headers

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Devices
- `GET /api/devices` - Get user devices
- `POST /api/devices/register` - Register new device
- `PUT /api/devices/:id/settings` - Update device settings
- `DELETE /api/devices/:id` - Remove device

### Locations
- `GET /api/locations/history` - Get location history
- `POST /api/locations/update` - Update location
- `GET /api/locations/current` - Get current location

### Emergency
- `POST /api/emergency/alert` - Create emergency alert
- `GET /api/emergency/alerts` - Get user alerts
- `PUT /api/emergency/alerts/:id` - Update alert status

## 🚨 Emergency Flow

1. **Emergency triggered** (button press, fall detection, manual)
2. **Location captured** and sent to server
3. **Notifications sent** to emergency contacts via SMS/email
4. **Emergency services** notified automatically
5. **Real-time tracking** of emergency status
6. **Resolution** when emergency is resolved

## 🔧 Development

### Project Structure

```
smart-safety-stick/
├── server.js              # Main server file
├── package.json           # Dependencies
├── models/                # Database models
│   ├── User.js
│   ├── Device.js
│   ├── Location.js
│   └── EmergencyAlert.js
├── routes/                # API routes
│   ├── auth.js
│   ├── devices.js
│   ├── locations.js
│   └── emergency.js
├── middleware/            # Custom middleware
│   └── auth.js
├── public/                # Frontend files
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── esp32/                 # Arduino code
│   └── smart_safety_stick.ino
└── README.md
```

### Adding New Features

1. **Backend:** Add routes in `routes/` directory
2. **Frontend:** Update `public/app.js` for new functionality
3. **ESP32:** Modify `esp32/smart_safety_stick.ino` for hardware changes

## 🚀 Deployment

### Heroku Deployment

1. **Create Heroku app:**
```bash
heroku create your-app-name
```

2. **Set environment variables:**
```bash
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
# ... other variables
```

3. **Deploy:**
```bash
git push heroku main
```

### Docker Deployment

1. **Create Dockerfile:**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

2. **Build and run:**
```bash
docker build -t smart-safety-stick .
docker run -p 3000:3000 smart-safety-stick
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- [ ] **Machine Learning** fall detection
- [ ] **Voice commands** for hands-free operation
- [ ] **Offline mode** for areas without internet
- [ ] **Multi-language** support
- [ ] **Advanced analytics** and reporting
- [ ] **Integration** with smart home systems
- [ ] **Wearable device** support
- [ ] **AI-powered** emergency response
