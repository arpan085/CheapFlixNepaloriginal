// Configuration file - dynamically determines API base URL
// For development: uses localhost:5000
// For production: uses Render backend or same domain

(function() {
  // Override order: <meta name="cf-api" content="..."> (deploy-time,
  // no rebuild needed) > localhost default > production default.
  // Example: <meta name="cf-api" content="https://api.example.com/api" />
  function metaApi() {
    try {
      var m = document.querySelector('meta[name="cf-api"]');
      var v = m && m.getAttribute('content');
      return v ? v.replace(/\/$/, '') : '';
    } catch (e) { return ''; }
  }
  // Detect if running on localhost
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  let API_BASE_URL = metaApi();

  if (!API_BASE_URL) {
    if (isLocalhost) {
      // Development: always use localhost
      API_BASE_URL = 'http://localhost:5000/api';
    } else {
      // Production default (override with the cf-api meta tag)
      const RENDER_BACKEND_URL = 'https://cheapflixnepal-backend.onrender.com/api';
      API_BASE_URL = RENDER_BACKEND_URL;
    }
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
