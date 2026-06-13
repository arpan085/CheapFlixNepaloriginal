// Configuration file - dynamically determines API base URL
// For development: uses localhost:5000
// For production: uses Render backend or same domain

(function() {
  // Detect if running on localhost
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  let API_BASE_URL;
  
  if (isLocalhost) {
    // Development: always use localhost
    API_BASE_URL = 'http://localhost:5000/api';
  } else {
    // Production: Check if we have a custom backend URL
    // Update the RENDER_BACKEND_URL below with your Render backend URL
    const RENDER_BACKEND_URL = 'https://cheapflixnepal-backend.onrender.com/api';
    API_BASE_URL = RENDER_BACKEND_URL;
  }
  
  // Create a global getApiUrl function
  window.getApiUrl = (endpoint) => {
    return API_BASE_URL + endpoint;
  };
  
  // Export for use in files that may need it
  window.CONFIG = {
    API_BASE_URL: API_BASE_URL,
    getApiUrl: window.getApiUrl
  };
  
  console.log('🔧 API Configuration loaded:', API_BASE_URL);
})();
