// VISIONX - With Universal Login System
let map, youMarker, destMarker;
let youLatLng = null;
let destLatLng = null;
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 VISIONX Starting with Login...');
  
  // Check if user is already logged in
  const token = localStorage.getItem('visionx_token');
  const userData = localStorage.getItem('visionx_user');
  
  if (token && userData) {
    currentUser = JSON.parse(userData);
    showMainApp();
  } else {
    showLogin();
  }
  
  setupEventListeners();
});

function showLogin() {
  console.log('🔐 Showing login screen');
  const loginModal = document.getElementById('loginModal');
  const app = document.getElementById('app');
  
  if (loginModal) {
    loginModal.style.display = 'flex';
  }
  
  if (app) {
    app.style.display = 'none';
  }
}

function showMainApp() {
  console.log('🚀 Showing main app');
  const loginModal = document.getElementById('loginModal');
  const app = document.getElementById('app');
  
  console.log('Elements found:', { loginModal: !!loginModal, app: !!app });
  
  if (loginModal) {
    loginModal.style.setProperty('display', 'none', 'important');
    console.log('Login modal hidden');
  }
  
  if (app) {
    app.style.setProperty('display', 'block', 'important');
    console.log('Main app shown');
    
    // Double check visibility after a moment
    setTimeout(() => {
      const appStyle = window.getComputedStyle(app);
      console.log('App computed display:', appStyle.display);
      console.log('App visible:', appStyle.display !== 'none');
    }, 50);
  }
  
  // Initialize app features
  setTimeout(() => {
    initializeMap();
    loadUserProfile();
    loadDemoData();
    log(`Welcome to VISIONX, ${currentUser?.name || 'User'}!`);
  }, 100);
}

function setupEventListeners() {
  console.log('⚡ Setting up event listeners...');
  
  // Login/Register tabs
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  
  if (loginTab) {
    loginTab.addEventListener('click', showLoginTab);
  }
  
  if (registerTab) {
    registerTab.addEventListener('click', showRegisterTab);
  }
  
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Register form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Search functionality
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput?.value?.trim();
      if (query) {
        searchPlace(query);
      }
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          searchPlace(query);
        }
      }
    });
  }
  
  // Emergency buttons
  const sosSmsBtn = document.getElementById('sosSmsBtn');
  const sosWaBtn = document.getElementById('sosWaBtn');
  
  if (sosSmsBtn) {
    sosSmsBtn.addEventListener('click', sendSosSms);
  }
  
  if (sosWaBtn) {
    sosWaBtn.addEventListener('click', sendSosWhatsApp);
  }
  
  // Connect/Disconnect buttons
  const bleConnectBtn = document.getElementById('bleConnectBtn');
  const bleDisconnectBtn = document.getElementById('bleDisconnectBtn');
  
  if (bleConnectBtn) {
    bleConnectBtn.addEventListener('click', connectBle);
  }
  
  if (bleDisconnectBtn) {
    bleDisconnectBtn.addEventListener('click', disconnectBle);
  }
  
  console.log('✅ Event listeners setup complete');
}

function showLoginTab() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  
  if (loginForm) loginForm.style.display = 'block';
  if (registerForm) registerForm.style.display = 'none';
  if (loginTab) loginTab.className = 'tab active';
  if (registerTab) registerTab.className = 'tab';
}

function showRegisterTab() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  
  if (loginForm) loginForm.style.display = 'none';
  if (registerForm) registerForm.style.display = 'block';
  if (loginTab) loginTab.className = 'tab';
  if (registerTab) registerTab.className = 'tab active';
}

function handleLogin(e) {
  e.preventDefault();
  console.log('🔐 Handling login...');
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }
  
  if (password.length < 3) {
    alert('Password must be at least 3 characters long');
    return;
  }
  
  // Create user data from login info
  const userData = {
    id: 'user_' + Date.now(),
    name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
    email: email,
    phone: '+1-234-567-8900',
    loginTime: new Date().toISOString()
  };
  
  // Save to localStorage
  localStorage.setItem('visionx_token', 'token_' + Date.now());
  localStorage.setItem('visionx_user', JSON.stringify(userData));
  
  currentUser = userData;
  console.log('✅ Login successful for:', userData.name);
  
  showMainApp();
}

function handleRegister(e) {
  e.preventDefault();
  console.log('📝 Handling registration...');
  
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const phone = document.getElementById('registerPhone').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  
  if (!name || !email || !password) {
    alert('Please fill in name, email, and password');
    return;
  }
  
  if (password.length < 3) {
    alert('Password must be at least 3 characters long');
    return;
  }
  
  // Create user data
  const userData = {
    id: 'user_' + Date.now(),
    name: name,
    email: email,
    phone: phone || '+1-234-567-8900',
    registrationTime: new Date().toISOString()
  };
  
  // Save to localStorage
  localStorage.setItem('visionx_token', 'token_' + Date.now());
  localStorage.setItem('visionx_user', JSON.stringify(userData));
  
  currentUser = userData;
  console.log('✅ Registration successful for:', userData.name);
  
  showMainApp();
}

function handleLogout() {
  localStorage.removeItem('visionx_token');
  localStorage.removeItem('visionx_user');
  currentUser = null;
  console.log('👋 Logged out');
  showLogin();
}

function initializeMap() {
  console.log('🗺️ Initializing map...');
  
  if (typeof L === 'undefined') {
    console.log('⏳ Leaflet not ready, will retry...');
    setTimeout(initializeMap, 1000);
    return;
  }
  
  const mapEl = document.getElementById('map');
  if (!mapEl) {
    console.error('❌ Map element not found!');
    return;
  }
  
  try {
    map = L.map('map').setView([12.9716, 77.5946], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Click to set destination
    map.on('click', (e) => {
      setDestination(e.latlng);
    });
    
    console.log('✅ Map initialized successfully');
    locateUser();
    
  } catch (error) {
    console.error('❌ Map init failed:', error);
  }
}

function locateUser() {
  if (!navigator.geolocation) {
    console.log('Geolocation not supported');
    return;
  }
  
  navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;
    youLatLng = L.latLng(latitude, longitude);
    
    if (youMarker) {
      youMarker.setLatLng(youLatLng);
    } else {
      youMarker = L.marker(youLatLng, { title: 'Your Location' }).addTo(map);
    }
    
    map.setView(youLatLng, 15);
    updateLocationDisplay();
    log('📍 Location found: ' + latitude.toFixed(4) + ', ' + longitude.toFixed(4));
  }, (error) => {
    console.error('Geolocation error:', error);
    log('❌ Could not get your location');
  });
}

function setDestination(latlng) {
  destLatLng = latlng;
  
  if (destMarker) {
    destMarker.setLatLng(destLatLng);
  } else {
    destMarker = L.marker(destLatLng, { title: 'Destination' }).addTo(map);
  }
  
  updateLocationDisplay();
  log('🎯 Destination set: ' + latlng.lat.toFixed(4) + ', ' + latlng.lng.toFixed(4));
}

function searchPlace(query) {
  console.log('🔍 Searching for:', query);
  log('🔍 Searching for: ' + query);
  
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data && data.length > 0) {
        const result = data[0];
        const latlng = L.latLng(parseFloat(result.lat), parseFloat(result.lon));
        setDestination(latlng);
        map.setView(latlng, 15);
        log('✅ Found: ' + result.display_name);
      } else {
        log('❌ Location not found: ' + query);
        alert('Location not found');
      }
    })
    .catch(error => {
      console.error('Search error:', error);
      log('❌ Search failed: ' + error.message);
      alert('Search failed');
    });
}

function sendSosSms() {
  const location = youLatLng || map.getCenter();
  const link = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  const message = `🚨 EMERGENCY: I need help! My location: ${link}`;
  
  console.log('📱 Sending SOS SMS');
  log('📱 SOS SMS initiated');
  window.location.href = `sms:?body=${encodeURIComponent(message)}`;
}

function sendSosWhatsApp() {
  const location = youLatLng || map.getCenter();
  const link = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  const message = `🚨 EMERGENCY: I need help! My location: ${link}`;
  
  console.log('📱 Sending SOS WhatsApp');
  log('📱 SOS WhatsApp initiated');
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

function connectBle() {
  log('🔗 BLE Connection initiated...');
  setTimeout(() => {
    const bleStatus = document.getElementById('bleStatus');
    if (bleStatus) {
      bleStatus.textContent = 'connected';
      bleStatus.style.color = '#4CAF50';
    }
    log('✅ BLE Connected to Smart Stick');
  }, 1000);
}

function disconnectBle() {
  log('🔌 BLE Disconnection initiated...');
  const bleStatus = document.getElementById('bleStatus');
  if (bleStatus) {
    bleStatus.textContent = 'disconnected';
    bleStatus.style.color = '#f44336';
  }
  log('❌ BLE Disconnected from Smart Stick');
}

function updateLocationDisplay() {
  const youCoordsEl = document.getElementById('youCoords');
  const destCoordsEl = document.getElementById('destCoords');
  
  if (youCoordsEl && youLatLng) {
    youCoordsEl.textContent = `${youLatLng.lat.toFixed(4)}, ${youLatLng.lng.toFixed(4)}`;
  }
  
  if (destCoordsEl && destLatLng) {
    destCoordsEl.textContent = `${destLatLng.lat.toFixed(4)}, ${destLatLng.lng.toFixed(4)}`;
  }
}

function loadUserProfile() {
  const userProfileEl = document.getElementById('userProfile');
  if (userProfileEl && currentUser) {
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
    userProfileEl.innerHTML = `
      <div class="user-info">
        <div class="user-avatar">${initials}</div>
        <div class="user-details">
          <h4>${currentUser.name}</h4>
          <p>${currentUser.email}</p>
          <p>${currentUser.phone}</p>
        </div>
      </div>
    `;
  }
}

function loadDemoData() {
  console.log('📊 Loading enhanced demo data...');
  
  setTimeout(() => {
    // Enhanced device status with beautiful indicators
    const gpsStatus = document.getElementById('gpsStatus');
    const batteryLevel = document.getElementById('batteryLevel');
    const signalStrength = document.getElementById('signalStrength');
    const bleStatus = document.getElementById('bleStatus');
    
    if (gpsStatus) gpsStatus.innerHTML = '<span class="status-excellent">🛰️ Locked & Ready</span>';
    if (batteryLevel) batteryLevel.innerHTML = '<span class="status-good">🔋 87% Charged</span>';
    if (signalStrength) signalStrength.innerHTML = '<span class="status-strong">📶 Excellent (4 bars)</span>';
    if (bleStatus) bleStatus.innerHTML = '<span class="status-connected">🔗 Connected</span>';
    
    // Enhanced navigation history
    const navigationHistory = document.getElementById('navigationHistory');
    if (navigationHistory) {
      navigationHistory.innerHTML = `
        <div class="history-item">
          <div class="history-route">🏠 Home → 🏢 Office</div>
          <div class="history-time">Today, 8:30 AM • 2.3 km</div>
        </div>
        <div class="history-item">
          <div class="history-route">🏪 Mall → 🏠 Home</div>
          <div class="history-time">Yesterday, 6:45 PM • 1.8 km</div>
        </div>
        <div class="history-item">
          <div class="history-route">🚉 Station → 🏪 Shopping Mall</div>
          <div class="history-time">Yesterday, 5:20 PM • 850m</div>
        </div>
        <div class="history-item">
          <div class="history-route">🏢 Office → 🚉 Metro Station</div>
          <div class="history-time">Yesterday, 5:15 PM • 650m</div>
        </div>
      `;
    }

    // Enhanced obstacles history
    const obstaclesHistory = document.getElementById('obstaclesHistory');
    if (obstaclesHistory) {
      obstaclesHistory.innerHTML = `
        <div class="obstacle-item">
          <div class="obstacle-type">🚧 Construction Zone</div>
          <div class="obstacle-time">Main St & 5th Ave • 2 hours ago</div>
        </div>
        <div class="obstacle-item">
          <div class="obstacle-type">🚗 Heavy Traffic</div>
          <div class="obstacle-time">Highway 101 • 4 hours ago</div>
        </div>
        <div class="obstacle-item">
          <div class="obstacle-type">🌧️ Weather Alert</div>
          <div class="obstacle-time">Downtown Area • 6 hours ago</div>
        </div>
      `;
    }

    // Enhanced emergency alerts
    const alertsList = document.getElementById('alertsList');
    if (alertsList) {
      alertsList.innerHTML = `
        <div class="alert-item resolved">
          <div class="alert-header">
            <span class="alert-type">✅ Safety Check</span>
            <span class="alert-time">10:30 AM</span>
          </div>
          <div class="alert-message">All systems normal - Safety check completed</div>
          <div class="alert-location">Current Location</div>
        </div>
        <div class="alert-item">
          <div class="alert-header">
            <span class="alert-type">🔔 Reminder</span>
            <span class="alert-time">9:15 AM</span>
          </div>
          <div class="alert-message">Don't forget your appointment at 2:00 PM</div>
          <div class="alert-location">Calendar Integration</div>
        </div>
      `;
    }
    
    // Enhanced guardian contacts with beautiful styling
    const guardianList = document.getElementById('guardianList');
    if (guardianList) {
      guardianList.innerHTML = `
        <div class="guardian-item">
          <strong>👨‍👩‍👧‍👦 John Smith (Father)</strong>
          <span>📱 +1-234-567-8901 • Available</span>
        </div>
        <div class="guardian-item">
          <strong>👩‍⚕️ Dr. Sarah Johnson (Family Doctor)</strong>
          <span>📱 +1-234-567-8902 • On Call</span>
        </div>
        <div class="guardian-item">
          <strong>👮‍♂️ Officer Mike Wilson (Emergency)</strong>
          <span>📱 +1-911-000-0001 • 24/7 Available</span>
        </div>
        <div class="guardian-item">
          <strong>🚑 Emergency Services</strong>
          <span>📱 911 • Always Ready</span>
        </div>
      `;
    }
    
    log('📊 ✨ Enhanced demo data loaded with beautiful formatting!');
  }, 500);
}

function log(message) {
  const logEl = document.getElementById('log');
  if (logEl) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}\n`;
    logEl.textContent = logEntry + (logEl.textContent || '').slice(0, 5000);
  }
  console.log(message);
}

console.log('📝 VISIONX App Loaded with Universal Login!');
