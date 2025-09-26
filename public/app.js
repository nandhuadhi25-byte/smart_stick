// Global state
let socket = null;
// Set this to your deployed backend when ready
// For demo mode without backend, set to empty string
const API_BASE = window.API_BASE || '';
const DEMO_MODE = !API_BASE; // Enable demo mode when no backend is available
let currentUser = null;
let map, youMarker, destMarker, routeControl;
let youLatLng = null;
let destLatLng = null;
let bleDevice = null;
let bleServer = null;

// DOM elements
const loginModal = document.getElementById('loginModal');
const app = document.getElementById('app');
const logEl = document.getElementById('log');
const bleStatusEl = document.getElementById('bleStatus');
const gpsStatusEl = document.getElementById('gpsStatus');
const batteryLevelEl = document.getElementById('batteryLevel');
const signalStrengthEl = document.getElementById('signalStrength');
const youCoordsEl = document.getElementById('youCoords');
const destCoordsEl = document.getElementById('destCoords');
const distanceToDestEl = document.getElementById('distanceToDest');
const etaToDestEl = document.getElementById('etaToDest');
const userProfileEl = document.getElementById('userProfile');
const guardianListEl = document.getElementById('guardianList');
const navigationHistoryEl = document.getElementById('navigationHistory');
const obstaclesHistoryEl = document.getElementById('obstaclesHistory');
const alertsListEl = document.getElementById('alertsList');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  // Always show login - no auto-authentication
  const token = localStorage.getItem('token');
  
  if (token) {
    // If token exists, assume user is logged in
    currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser && currentUser.name) {
      showApp();
      initializeMap();
      loadUserData();
      log(`Welcome back, ${currentUser.name}!`);
      return;
    }
  }
  
  // Show login for all users
  console.log('Please login to continue');
  showLogin();
}

function showLogin() {
  loginModal.classList.remove('hidden');
  app.classList.add('hidden');
}

function showApp() {
  loginModal.classList.add('hidden');
  app.classList.remove('hidden');
}

// Authentication
document.getElementById('loginTab').addEventListener('click', () => {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('registerForm').classList.add('hidden');
  document.getElementById('loginTab').classList.add('active');
  document.getElementById('registerTab').classList.remove('active');
});

document.getElementById('registerTab').addEventListener('click', () => {
  document.getElementById('registerForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('registerTab').classList.add('active');
  document.getElementById('loginTab').classList.remove('active');
});

document.getElementById('closeLoginModal').addEventListener('click', showLogin);

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  // Allow any login credentials
  if (email && password) {
    // Create user based on login info
    const userData = {
      _id: 'user-' + Date.now(),
      name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      email: email,
      phone: '+1-234-567-8900',
      emergencyContacts: [
        { name: 'Emergency Contact 1', phone: '+1-234-567-8901', relationship: 'Family' },
        { name: 'Emergency Contact 2', phone: '+1-234-567-8902', relationship: 'Friend' }
      ]
    };
    
    localStorage.setItem('token', 'user-token-' + Date.now());
    localStorage.setItem('currentUser', JSON.stringify(userData));
    currentUser = userData;
    
    showApp();
    initializeMap();
    loadUserData();
    log(`Welcome ${currentUser.name}! Login successful.`);
    return;
  } else {
    alert('Please enter both email and password');
  }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const phone = document.getElementById('registerPhone').value;
  const password = document.getElementById('registerPassword').value;
  
  // Allow any registration
  if (name && email && password) {
    const userData = {
      _id: 'user-' + Date.now(),
      name: name,
      email: email,
      phone: phone || '+1-234-567-8900',
      emergencyContacts: [
        { name: 'Emergency Contact 1', phone: '+1-234-567-8901', relationship: 'Family' },
        { name: 'Emergency Contact 2', phone: '+1-234-567-8902', relationship: 'Friend' }
      ]
    };
    
    localStorage.setItem('token', 'user-token-' + Date.now());
    localStorage.setItem('currentUser', JSON.stringify(userData));
    currentUser = userData;
    
    showApp();
    initializeMap();
    loadUserData();
    log(`Welcome ${currentUser.name}! Registration successful.`);
    return;
  } else {
    alert('Please fill in all required fields');
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  currentUser = null;
  if (socket) socket.disconnect();
  showLogin();
  log('Logged out successfully');
});

// Socket.io initialization
function initializeSocket() {
  // Socket functionality disabled for static deployment
  log('Socket connection disabled - running in static mode');
  return;

// Map initialization
function initializeMap() {
  map = L.map('map', { zoomControl: true });
  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  map.setView([12.9716, 77.5946], 13); // Bangalore default

  map.on('click', (e) => {
    setDestination(e.latlng);
    if (youLatLng) { buildRoute(); }
  });
  
  locateUser();
  initializeEvents();
}

function initializeEvents() {
  // BLE buttons
  document.getElementById('bleConnectBtn').addEventListener('click', connectBle);
  document.getElementById('bleDisconnectBtn').addEventListener('click', disconnectBle);
  
  // Route buttons
  document.getElementById('startRouteBtn').addEventListener('click', () => {
    if (!youLatLng) { alert('Waiting for your location...'); return; }
    if (!destLatLng) { alert('Set a destination (search or tap on the map).'); return; }
    buildRoute();
  });
  
  // Search
  document.getElementById('searchBtn').addEventListener('click', () => searchPlace(document.getElementById('searchInput').value));
  document.getElementById('searchInput').addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') searchPlace(document.getElementById('searchInput').value); 
  });
  
  // Emergency buttons
  document.getElementById('sosSmsBtn').addEventListener('click', sendSosSms);
  document.getElementById('sosWaBtn').addEventListener('click', sendSosWhatsApp);
}

// Location functions
function locateUser() {
  if (!navigator.geolocation) {
    setGpsStatus('unsupported');
    log('Geolocation not supported');
    return;
  }
  
  setGpsStatus('locating…');
  navigator.geolocation.watchPosition((pos) => {
    const { latitude, longitude } = pos.coords;
    youLatLng = L.latLng(latitude, longitude);
    setGpsStatus('ok');
    setYouCoords(youLatLng);

    if (!youMarker) {
      youMarker = L.marker(youLatLng, { title: 'You' }).addTo(map);
      map.setView(youLatLng, 15);
    } else {
      youMarker.setLatLng(youLatLng);
    }
    
    // Send location to server
    if (socket && currentUser) {
      socket.emit('location-update', {
        userId: currentUser._id,
        deviceId: 'web-dashboard',
        location: { lat: latitude, lng: longitude, accuracy: pos.coords.accuracy }
      });
    }
  }, (err) => {
    setGpsStatus('error');
    log('Geolocation error', { code: err.code, message: err.message });
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}

function setDestination(latlng) {
  destLatLng = latlng;
  setDestCoords(destLatLng);
  if (!destMarker) {
    destMarker = L.marker(destLatLng, { title: 'Destination', opacity: 0.9 }).addTo(map);
  } else {
    destMarker.setLatLng(destLatLng);
  }
}

async function searchPlace(q) {
  const query = (q || '').trim();
  if (!query) return;
  
  try {
    log(`Searching: ${query}`);
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    
    if (data && data.length) {
      const first = data[0];
      const latlng = L.latLng(parseFloat(first.lat), parseFloat(first.lon));
      setDestination(latlng);
      map.setView(latlng, 15);
      buildRoute();
    } else {
      alert('No results found');
    }
  } catch (e) {
    log('Search error', e);
  }
}

function buildRoute() {
  if (!youLatLng || !destLatLng) return;
  
  if (routeControl) {
    routeControl.setWaypoints([youLatLng, destLatLng]);
    return;
  }
  
  routeControl = L.Routing.control({
    waypoints: [youLatLng, destLatLng],
    router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
    showAlternatives: true,
    altLineOptions: { styles: [{ color: '#38bdf8', opacity: 0.6, weight: 6 }] },
    lineOptions: { styles: [{ color: '#22c55e', opacity: 0.9, weight: 7 }] },
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    show: false
  }).addTo(map);

  routeControl.on('routesfound', (e) => {
    const summary = e.routes[0].summary;
    const km = (summary.totalDistance / 1000).toFixed(2);
    const mins = Math.round(summary.totalTime / 60);
    log(`Route ready: ${km} km, ~${mins} min`);
    
    // Update distance and ETA displays
    setDistanceToDest(parseFloat(km));
    setEtaToDest(mins);
  });
  
  routeControl.on('routingerror', (e) => {
    log('Routing error', e?.error || e);
  });
}

// Emergency functions
function currentMapsLink() {
  const ll = youLatLng || map.getCenter();
  return `https://maps.google.com/?q=${ll.lat},${ll.lng}`;
}

async function sendSosSms() {
  const link = currentMapsLink();
  const body = encodeURIComponent(`EMERGENCY: I need help. My location: ${link}`);
  
  log('Emergency SMS alert initiated');
  // Simulate emergency alert
  showEmergencyAlert({
    alertType: 'manual',
    location: { lat: youLatLng?.lat || map.getCenter().lat, lng: youLatLng?.lng || map.getCenter().lng },
    message: 'Emergency assistance needed - SMS sent'
  });
  
  // Try SMS deep link
  window.location.href = `sms:?&body=${body}`;
}

async function sendSosWhatsApp() {
  const link = currentMapsLink();
  const text = encodeURIComponent(`EMERGENCY: I need help. My location: ${link}`);
  
  log('Emergency WhatsApp alert initiated');
  // Simulate emergency alert
  showEmergencyAlert({
    alertType: 'manual',
    location: { lat: youLatLng?.lat || map.getCenter().lat, lng: youLatLng?.lng || map.getCenter().lng },
    message: 'Emergency assistance needed - WhatsApp message sent'
  });
  
  // Try WhatsApp deep link
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

// BLE functions
async function connectBle() {
  if (!navigator.bluetooth) {
    setBleStatus('unsupported');
    alert('Web Bluetooth not supported in this browser. Use Chrome on Android/Desktop.');
    return;
  }
  
  try {
    setBleStatus('requesting…');
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['0000ffff-0000-1000-8000-00805f9b34fb'] // ESP32 service UUID
    });
    
    bleDevice = device;
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
    setBleStatus('connecting…');
    bleServer = await bleDevice.gatt.connect();
    setBleStatus('connected');
    
    log('BLE connected', { name: bleDevice.name, id: bleDevice.id });
    
    // Notify server about device connection
    if (socket && currentUser) {
      socket.emit('device-connected', {
        userId: currentUser._id,
        deviceId: bleDevice.id,
        deviceInfo: {
          name: bleDevice.name,
          id: bleDevice.id
        }
      });
    }
  } catch (e) {
    setBleStatus('disconnected');
    log('BLE connect failed', e);
  }
}

function onDisconnected() {
  setBleStatus('disconnected');
  log('BLE disconnected');
  
  if (socket && currentUser) {
    socket.emit('device-disconnected', {
      userId: currentUser._id,
      deviceId: bleDevice?.id
    });
  }
}

async function disconnectBle() {
  try {
    if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
      bleDevice.gatt.disconnect();
    }
  } catch (e) { /* ignore */ }
  
  bleDevice = null;
  bleServer = null;
  setBleStatus('disconnected');
}

// Data loading functions
async function loadUserData() {
  await Promise.all([
    loadUserProfile(),
    loadGuardians(),
    loadDevices(),
    loadAlerts(),
    loadNavigationHistory(),
    loadObstaclesHistory()
  ]);
}

async function loadDevices() {
  try {
    const response = await fetch((API_BASE || '') + '/api/devices', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const devices = await response.json();
      renderDevices(devices);
    }
  } catch (error) {
    log('Failed to load devices', error);
  }
}

async function loadAlerts() {
  try {
    const response = await fetch((API_BASE || '') + '/api/emergency/alerts', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const alerts = await response.json();
      renderAlerts(alerts);
    }
  } catch (error) {
    log('Failed to load alerts', error);
  }
}

function renderDevices(devices) {
  if (devices.length === 0) {
    log('No devices registered');
    // Set mock battery and signal data for demo
    setBatteryLevel(85);
    setSignalStrength(75);
    return;
  }
  
  log(`${devices.length} devices found`);
  
  // Update battery and signal displays with first device data
  if (devices.length > 0) {
    const device = devices[0];
    setBatteryLevel(device.batteryLevel || 85);
    setSignalStrength(device.isConnected ? 75 : 0);
  }
}

function renderAlerts(alerts) {
  if (alerts.length === 0) {
    alertsListEl.innerHTML = '<div class="loading">No active alerts</div>';
    return;
  }
  
  alertsListEl.innerHTML = alerts.slice(0, 5).map(alert => `
    <div class="alert-item ${alert.status === 'resolved' ? 'resolved' : ''}">
      <div class="alert-header">
        <span class="alert-type">${alert.alertType}</span>
        <span class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="alert-message">${alert.message || 'Emergency assistance needed'}</div>
      <div class="alert-location">${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}</div>
    </div>
  `).join('');
}

// New data loading functions
async function loadUserProfile() {
  try {
    if (currentUser) {
      renderUserProfile(currentUser);
    }
  } catch (error) {
    log('Failed to load user profile', error);
  }
}

async function loadGuardians() {
  try {
    if (currentUser && currentUser.emergencyContacts) {
      renderGuardians(currentUser.emergencyContacts);
    } else {
      guardianListEl.innerHTML = '<div class="loading">No guardian contacts</div>';
    }
  } catch (error) {
    log('Failed to load guardians', error);
  }
}

async function loadNavigationHistory() {
  try {
    const response = await fetch((API_BASE || '') + '/api/locations/history?limit=10', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const locations = await response.json();
      renderNavigationHistory(locations);
    }
  } catch (error) {
    log('Failed to load navigation history', error);
  }
}

async function loadObstaclesHistory() {
  try {
    // Mock obstacles data - in real implementation, this would come from ESP32 sensors
    const mockObstacles = [
      { type: 'Pothole', location: 'Main Street', timestamp: new Date(Date.now() - 300000) },
      { type: 'Construction', location: 'Oak Avenue', timestamp: new Date(Date.now() - 600000) },
      { type: 'Traffic Cone', location: 'Highway 101', timestamp: new Date(Date.now() - 900000) }
    ];
    renderObstaclesHistory(mockObstacles);
  } catch (error) {
    log('Failed to load obstacles history', error);
  }
}

function renderUserProfile(user) {
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  userProfileEl.innerHTML = `
    <div class="user-info">
      <div class="user-avatar">${initials}</div>
      <div class="user-details">
        <h4>${user.name}</h4>
        <p>${user.email}</p>
        <p>${user.phone}</p>
      </div>
    </div>
  `;
}

function renderGuardians(guardians) {
  if (guardians.length === 0) {
    guardianListEl.innerHTML = '<div class="loading">No guardian contacts</div>';
    return;
  }
  
  guardianListEl.innerHTML = guardians.map(guardian => `
    <div class="guardian-item">
      <div class="guardian-info">
        <h4>${guardian.name}</h4>
        <p>${guardian.phone} • ${guardian.relationship || 'Contact'}</p>
      </div>
      <div class="guardian-status"></div>
    </div>
  `).join('');
}

function renderNavigationHistory(locations) {
  if (locations.length === 0) {
    navigationHistoryEl.innerHTML = '<div class="loading">No navigation history</div>';
    return;
  }
  
  navigationHistoryEl.innerHTML = locations.slice(0, 8).map(location => `
    <div class="history-item">
      <div class="history-route">${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}</div>
      <div class="history-time">${new Date(location.timestamp).toLocaleString()}</div>
    </div>
  `).join('');
}

function renderObstaclesHistory(obstacles) {
  if (obstacles.length === 0) {
    obstaclesHistoryEl.innerHTML = '<div class="loading">No obstacles detected</div>';
    return;
  }
  
  obstaclesHistoryEl.innerHTML = obstacles.map(obstacle => `
    <div class="obstacle-item">
      <div class="obstacle-type">${obstacle.type}</div>
      <div class="obstacle-time">${obstacle.location} • ${new Date(obstacle.timestamp).toLocaleString()}</div>
    </div>
  `).join('');
}

function showEmergencyAlert(data) {
  const alert = document.createElement('div');
  alert.className = 'emergency-popup';
  alert.innerHTML = `
    <div class="emergency-content">
      <h3>🚨 EMERGENCY ALERT</h3>
      <p>Type: ${data.alertType}</p>
      <p>Location: ${data.location.lat.toFixed(4)}, ${data.location.lng.toFixed(4)}</p>
      <p>Message: ${data.message || 'Emergency assistance needed'}</p>
      <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
    </div>
  `;
  
  document.body.appendChild(alert);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (alert.parentElement) {
      alert.remove();
    }
  }, 10000);
}

// Utility functions
function log(msg, obj) {
  const time = new Date().toLocaleTimeString();
  const line = `[${time}] ${msg}` + (obj ? `\n${JSON.stringify(obj, null, 2)}` : '');
  logEl.textContent = `${line}\n${logEl.textContent}`.slice(0, 40000);
}

function setBleStatus(text) { bleStatusEl.textContent = text; }
function setGpsStatus(text) { gpsStatusEl.textContent = text; }
function setBatteryLevel(level) { 
  batteryLevelEl.innerHTML = `
    <div class="battery-indicator">
      <div class="battery-bar">
        <div class="battery-fill ${level < 20 ? 'critical' : level < 50 ? 'low' : ''}" style="width: ${level}%"></div>
      </div>
      <span>${level}%</span>
    </div>
  `;
}
function setSignalStrength(strength) {
  const bars = Math.min(4, Math.max(1, Math.ceil(strength / 25)));
  signalStrengthEl.innerHTML = `
    <div class="signal-indicator">
      ${Array.from({length: 4}, (_, i) => 
        `<div class="signal-bar ${i < bars ? 'active' : ''}"></div>`
      ).join('')}
      <span>${strength}%</span>
    </div>
  `;
}
function setYouCoords(latlng) { youCoordsEl.textContent = latlng ? `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}` : '—'; }
function setDestCoords(latlng) { destCoordsEl.textContent = latlng ? `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}` : '—'; }
function setDistanceToDest(distance) { distanceToDestEl.textContent = distance ? `${distance.toFixed(1)} km` : '—'; }
function setEtaToDest(eta) { etaToDestEl.textContent = eta ? `${eta} min` : '—'; }

function updateLocationDisplay(location) {
  if (youMarker) {
    youMarker.setLatLng([location.lat, location.lng]);
  }
}

// Global for console experiments
window._demo = { 
  map, 
  get you() { return youLatLng; }, 
  get dest() { return destLatLng; }, 
  connectBle, 
  disconnectBle,
  socket,
  currentUser
};
