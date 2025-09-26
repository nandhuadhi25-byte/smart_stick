// VISIONX - Direct to Main App (No Login)
let map, youMarker, destMarker;
let youLatLng = null;
let destLatLng = null;

// Initialize app immediately
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 VISIONX Starting...');
  initializeMap();
  setupEventListeners();
  loadDemoData();
  log('VISIONX System Ready!');
});

function setupEventListeners() {
  console.log('⚡ Setting up event listeners...');
  
  // Search button
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
    map = L.map('map').setView([12.9716, 77.5946], 13); // Default to Bangalore
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Click to set destination
    map.on('click', (e) => {
      setDestination(e.latlng);
    });
    
    console.log('✅ Map initialized successfully');
    
    // Get user location
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
  // Simulate BLE connection
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

function loadDemoData() {
  console.log('📊 Loading demo data...');
  
  // Update device status
  setTimeout(() => {
    const gpsStatus = document.getElementById('gpsStatus');
    const batteryLevel = document.getElementById('batteryLevel');
    const signalStrength = document.getElementById('signalStrength');
    
    if (gpsStatus) gpsStatus.textContent = 'Ready';
    if (batteryLevel) batteryLevel.textContent = '85%';
    if (signalStrength) signalStrength.textContent = 'Strong';
    
    log('📊 Demo data loaded');
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

// Make functions available globally for debugging
window._visionx = {
  map,
  searchPlace,
  locateUser,
  sendSosSms,
  sendSosWhatsApp,
  connectBle,
  disconnectBle
};

console.log('📝 VISIONX App Loaded - No Login Required!');
