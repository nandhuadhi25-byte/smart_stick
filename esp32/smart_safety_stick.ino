/*
 * Smart Safety Stick - ESP32 Arduino Code
 * 
 * Features:
 * - Bluetooth Low Energy (BLE) communication
 * - GPS location tracking
 * - Emergency button with haptic feedback
 * - Vibration motor control
 * - Audio alerts
 * - Battery monitoring
 * - Fall detection (accelerometer)
 * 
 * Hardware Requirements:
 * - ESP32 Dev Board
 * - GPS Module (NEO-6M or similar)
 * - Accelerometer (MPU6050 or similar)
 * - Vibration Motor
 * - Buzzer/Speaker
 * - Emergency Button
 * - Battery with charging circuit
 * - LED indicators
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <TinyGPS++.h>
#include <Wire.h>
#include <MPU6050.h>
#include <WiFi.h>
#include <HTTPClient.h>

// Hardware pins
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define VIBRATION_PIN 18
#define BUZZER_PIN 19
#define EMERGENCY_BUTTON_PIN 0
#define LED_PIN 2
#define BATTERY_PIN A0

// BLE Service and Characteristic UUIDs
#define SERVICE_UUID "0000ffff-0000-1000-8000-00805f9b34fb"
#define LOCATION_CHAR_UUID "0000ff01-0000-1000-8000-00805f9b34fb"
#define EMERGENCY_CHAR_UUID "0000ff02-0000-1000-8000-00805f9b34fb"
#define SETTINGS_CHAR_UUID "0000ff03-0000-1000-8000-00805f9b34fb"
#define STATUS_CHAR_UUID "0000ff04-0000-1000-8000-00805f9b34fb"

// Global objects
BLEServer* pServer = NULL;
BLECharacteristic* pLocationCharacteristic = NULL;
BLECharacteristic* pEmergencyCharacteristic = NULL;
BLECharacteristic* pSettingsCharacteristic = NULL;
BLECharacteristic* pStatusCharacteristic = NULL;
TinyGPSPlus gps;
MPU6050 mpu;

// Device state
bool deviceConnected = false;
bool oldDeviceConnected = false;
bool emergencyTriggered = false;
bool fallDetected = false;
unsigned long lastLocationUpdate = 0;
unsigned long lastEmergencyCheck = 0;
unsigned long lastFallCheck = 0;
int batteryLevel = 100;
int vibrationIntensity = 5;
int audioVolume = 7;
bool autoEmergency = false;
int emergencyTimeout = 30; // seconds

// Location data
struct LocationData {
  float latitude;
  float longitude;
  float accuracy;
  float altitude;
  float speed;
  float heading;
  unsigned long timestamp;
};

LocationData currentLocation;

// Emergency data
struct EmergencyData {
  bool isActive;
  String alertType;
  String message;
  float latitude;
  float longitude;
  unsigned long timestamp;
};

EmergencyData emergencyData;

// Settings data
struct SettingsData {
  int vibrationIntensity;
  int audioVolume;
  bool autoEmergency;
  int emergencyTimeout;
};

SettingsData settings;

// BLE Server Callbacks
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("Device connected");
      digitalWrite(LED_PIN, HIGH);
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("Device disconnected");
      digitalWrite(LED_PIN, LOW);
    }
};

// Characteristic Callbacks
class LocationCharacteristicCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String value = pCharacteristic->getValue().c_str();
      Serial.println("Location characteristic written: " + value);
      // Handle location updates from mobile app
    }
};

class EmergencyCharacteristicCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String value = pCharacteristic->getValue().c_str();
      Serial.println("Emergency characteristic written: " + value);
      
      if (value == "TRIGGER") {
        triggerEmergency("manual", "Emergency button pressed");
      } else if (value == "CANCEL") {
        cancelEmergency();
      }
    }
};

class SettingsCharacteristicCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String value = pCharacteristic->getValue().c_str();
      Serial.println("Settings characteristic written: " + value);
      
      // Parse settings JSON
      parseSettings(value);
    }
};

void setup() {
  Serial.begin(115200);
  
  // Initialize hardware pins
  pinMode(VIBRATION_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(EMERGENCY_BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize GPS
  Serial2.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  
  // Initialize MPU6050
  Wire.begin();
  mpu.initialize();
  if (mpu.testConnection()) {
    Serial.println("MPU6050 initialized successfully");
  } else {
    Serial.println("MPU6050 initialization failed");
  }
  
  // Initialize BLE
  BLEDevice::init("Smart Safety Stick");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Location characteristic
  pLocationCharacteristic = pService->createCharacteristic(
    LOCATION_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY
  );
  pLocationCharacteristic->setCallbacks(new LocationCharacteristicCallbacks());
  pLocationCharacteristic->addDescriptor(new BLE2902());

  // Emergency characteristic
  pEmergencyCharacteristic = pService->createCharacteristic(
    EMERGENCY_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY
  );
  pEmergencyCharacteristic->setCallbacks(new EmergencyCharacteristicCallbacks());
  pEmergencyCharacteristic->addDescriptor(new BLE2902());

  // Settings characteristic
  pSettingsCharacteristic = pService->createCharacteristic(
    SETTINGS_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );
  pSettingsCharacteristic->setCallbacks(new SettingsCharacteristicCallbacks());

  // Status characteristic
  pStatusCharacteristic = pService->createCharacteristic(
    STATUS_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pStatusCharacteristic->addDescriptor(new BLE2902());

  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("BLE server started. Waiting for connections...");
  
  // Initialize default settings
  settings.vibrationIntensity = 5;
  settings.audioVolume = 7;
  settings.autoEmergency = false;
  settings.emergencyTimeout = 30;
  
  // Initialize location data
  currentLocation.latitude = 0.0;
  currentLocation.longitude = 0.0;
  currentLocation.accuracy = 0.0;
  currentLocation.altitude = 0.0;
  currentLocation.speed = 0.0;
  currentLocation.heading = 0.0;
  currentLocation.timestamp = 0;
  
  // Initialize emergency data
  emergencyData.isActive = false;
  emergencyData.alertType = "";
  emergencyData.message = "";
  emergencyData.latitude = 0.0;
  emergencyData.longitude = 0.0;
  emergencyData.timestamp = 0;
  
  Serial.println("Smart Safety Stick initialized successfully!");
}

void loop() {
  // Handle BLE connection
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Start advertising");
    oldDeviceConnected = deviceConnected;
  }
  
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
  
  // Read GPS data
  while (Serial2.available() > 0) {
    if (gps.encode(Serial2.read())) {
      if (gps.location.isValid()) {
        currentLocation.latitude = gps.location.lat();
        currentLocation.longitude = gps.location.lng();
        currentLocation.accuracy = gps.hdop.value();
        currentLocation.altitude = gps.altitude.meters();
        currentLocation.speed = gps.speed.kmph();
        currentLocation.heading = gps.course.deg();
        currentLocation.timestamp = millis();
        
        // Send location update via BLE
        if (deviceConnected && millis() - lastLocationUpdate > 5000) {
          sendLocationUpdate();
          lastLocationUpdate = millis();
        }
      }
    }
  }
  
  // Check emergency button
  if (digitalRead(EMERGENCY_BUTTON_PIN) == LOW) {
    if (!emergencyTriggered) {
      triggerEmergency("manual", "Emergency button pressed");
    }
  }
  
  // Check for fall detection
  if (millis() - lastFallCheck > 100) {
    checkFallDetection();
    lastFallCheck = millis();
  }
  
  // Monitor battery level
  if (millis() - lastEmergencyCheck > 30000) { // Check every 30 seconds
    updateBatteryLevel();
    sendStatusUpdate();
    lastEmergencyCheck = millis();
  }
  
  // Handle emergency timeout
  if (emergencyTriggered && autoEmergency) {
    if (millis() - emergencyData.timestamp > (emergencyTimeout * 1000)) {
      // Auto-trigger emergency if not cancelled
      if (!emergencyData.isActive) {
        emergencyData.isActive = true;
        sendEmergencyAlert();
      }
    }
  }
  
  delay(10);
}

void sendLocationUpdate() {
  if (deviceConnected && pLocationCharacteristic) {
    String locationData = String(currentLocation.latitude, 6) + "," +
                        String(currentLocation.longitude, 6) + "," +
                        String(currentLocation.accuracy, 2) + "," +
                        String(currentLocation.altitude, 2) + "," +
                        String(currentLocation.speed, 2) + "," +
                        String(currentLocation.heading, 2) + "," +
                        String(currentLocation.timestamp);
    
    pLocationCharacteristic->setValue(locationData.c_str());
    pLocationCharacteristic->notify();
    Serial.println("Location sent: " + locationData);
  }
}

void triggerEmergency(String alertType, String message) {
  if (!emergencyTriggered) {
    emergencyTriggered = true;
    emergencyData.isActive = true;
    emergencyData.alertType = alertType;
    emergencyData.message = message;
    emergencyData.latitude = currentLocation.latitude;
    emergencyData.longitude = currentLocation.longitude;
    emergencyData.timestamp = millis();
    
    // Activate haptic and audio feedback
    activateHapticFeedback();
    activateAudioAlert();
    
    // Send emergency alert via BLE
    sendEmergencyAlert();
    
    Serial.println("Emergency triggered: " + alertType + " - " + message);
  }
}

void cancelEmergency() {
  if (emergencyTriggered) {
    emergencyTriggered = false;
    emergencyData.isActive = false;
    
    // Stop haptic and audio feedback
    digitalWrite(VIBRATION_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    
    // Send cancellation via BLE
    if (deviceConnected && pEmergencyCharacteristic) {
      pEmergencyCharacteristic->setValue("CANCELLED");
      pEmergencyCharacteristic->notify();
    }
    
    Serial.println("Emergency cancelled");
  }
}

void sendEmergencyAlert() {
  if (deviceConnected && pEmergencyCharacteristic) {
    String emergencyData = "EMERGENCY," + emergencyData.alertType + "," +
                          emergencyData.message + "," +
                          String(emergencyData.latitude, 6) + "," +
                          String(emergencyData.longitude, 6) + "," +
                          String(emergencyData.timestamp);
    
    pEmergencyCharacteristic->setValue(emergencyData.c_str());
    pEmergencyCharacteristic->notify();
    Serial.println("Emergency alert sent: " + emergencyData);
  }
}

void checkFallDetection() {
  // Read accelerometer data
  int16_t ax, ay, az;
  mpu.getAcceleration(&ax, &ay, &az);
  
  // Calculate acceleration magnitude
  float acceleration = sqrt(ax*ax + ay*ay + az*az);
  
  // Fall detection threshold (adjust based on testing)
  if (acceleration > 20000) { // High acceleration indicates fall
    if (!fallDetected) {
      fallDetected = true;
      triggerEmergency("fall-detection", "Fall detected - automatic emergency");
    }
  } else {
    fallDetected = false;
  }
}

void activateHapticFeedback() {
  // Vibrate with intensity setting
  for (int i = 0; i < vibrationIntensity; i++) {
    digitalWrite(VIBRATION_PIN, HIGH);
    delay(100);
    digitalWrite(VIBRATION_PIN, LOW);
    delay(50);
  }
}

void activateAudioAlert() {
  // Generate audio alert with volume setting
  for (int i = 0; i < audioVolume; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

void updateBatteryLevel() {
  // Read battery voltage (adjust based on your battery setup)
  int batteryReading = analogRead(BATTERY_PIN);
  batteryLevel = map(batteryReading, 0, 4095, 0, 100);
  
  // Low battery warning
  if (batteryLevel < 20) {
    activateHapticFeedback();
    Serial.println("Low battery warning: " + String(batteryLevel) + "%");
  }
}

void sendStatusUpdate() {
  if (deviceConnected && pStatusCharacteristic) {
    String statusData = String(batteryLevel) + "," +
                       String(emergencyTriggered ? 1 : 0) + "," +
                       String(fallDetected ? 1 : 0) + "," +
                       String(millis());
    
    pStatusCharacteristic->setValue(statusData.c_str());
    pStatusCharacteristic->notify();
    Serial.println("Status sent: " + statusData);
  }
}

void parseSettings(String settingsJson) {
  // Simple JSON parsing for settings
  // In a real implementation, use a proper JSON library
  
  if (settingsJson.indexOf("\"vibrationIntensity\":") != -1) {
    int start = settingsJson.indexOf("\"vibrationIntensity\":") + 21;
    int end = settingsJson.indexOf(",", start);
    if (end == -1) end = settingsJson.indexOf("}", start);
    vibrationIntensity = settingsJson.substring(start, end).toInt();
  }
  
  if (settingsJson.indexOf("\"audioVolume\":") != -1) {
    int start = settingsJson.indexOf("\"audioVolume\":") + 14;
    int end = settingsJson.indexOf(",", start);
    if (end == -1) end = settingsJson.indexOf("}", start);
    audioVolume = settingsJson.substring(start, end).toInt();
  }
  
  if (settingsJson.indexOf("\"autoEmergency\":") != -1) {
    int start = settingsJson.indexOf("\"autoEmergency\":") + 16;
    int end = settingsJson.indexOf(",", start);
    if (end == -1) end = settingsJson.indexOf("}", start);
    autoEmergency = settingsJson.substring(start, end) == "true";
  }
  
  if (settingsJson.indexOf("\"emergencyTimeout\":") != -1) {
    int start = settingsJson.indexOf("\"emergencyTimeout\":") + 19;
    int end = settingsJson.indexOf(",", start);
    if (end == -1) end = settingsJson.indexOf("}", start);
    emergencyTimeout = settingsJson.substring(start, end).toInt();
  }
  
  Serial.println("Settings updated: Vibration=" + String(vibrationIntensity) + 
                 ", Audio=" + String(audioVolume) + 
                 ", AutoEmergency=" + String(autoEmergency) + 
                 ", Timeout=" + String(emergencyTimeout));
}
