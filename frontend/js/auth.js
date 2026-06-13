/* Authentication Functions */
class Auth {
  static setToken(token) {
    localStorage.setItem('token', token);
  }

  static getToken() {
    return localStorage.getItem('token');
  }

  static setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  static getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  static isLoggedIn() {
    return !!this.getToken();
  }

  static logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'pages/login.html';
  }

  static getAuthHeader() {
    const token = this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
}

// API Base URL - use relative path for deployment, localhost for dev
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
  ? 'http://localhost:5000/api'
  : '/api';

// API Request Functions
async function apiCall(endpoint, method = 'GET', data = null, auth = true) {
  const url = `${API_BASE_URL}${endpoint}`;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
  };

  // only attach token if needed
  if (auth) {
    const token = Auth.getToken();
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'API Error');
  }

  return result;
}

// Check if user is authenticated
function checkAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

// Redirect based on user role
function redirectByRole() {
  const user = Auth.getUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  switch (user.role) {
    case 'admin':
      window.location.href = 'admin-dashboard.html';
      break;
    case 'provider':
      window.location.href = 'provider-dashboard.html';
      break;
    case 'user':
      window.location.href = 'dashboard.html';
      break;
    default:
      window.location.href = 'login.html';
  }
}

async function login(email, password) {
  const res = await apiCall('/auth/login', 'POST', {
    email,
    password
  }, false); // ❗ no auth for login

  Auth.setToken(res.token);
  Auth.setUser(res.user);

  redirectByRole();
}

async function register(data) {
  const res = await apiCall('/auth/register', 'POST', data, false);

  Auth.setToken(res.token);
  Auth.setUser(res.user);

  redirectByRole();
}
