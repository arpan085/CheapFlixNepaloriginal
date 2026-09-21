# 🔌 Frontend-Backend Integration Guide

## Overview

Connect your HTML frontend to the Node.js backend API endpoints.

## Frontend Structure

```
frontend/
├── pages/
│   ├── index.html                 (Landing page)
│   ├── login.html                 (Customer/Provider login)
│   ├── register.html              (Sign up)
│   ├── booking-flow.html          (5-step booking)
│   ├── dashboard.html             (Customer dashboard)
│   ├── provider-dashboard.html    (Provider dashboard)
│   └── admin-dashboard.html       (Admin dashboard)
├── css/
│   ├── style.css                  (Global styles)
│   ├── auth.css                   (Auth pages)
│   └── dashboard.css              (Dashboard styles)
└── js/
    ├── auth.js                    (Authentication logic)
    ├── api.js                     (API calls)
    └── utils.js                   (Helper functions)
```

## 1. Create API Helper Module

**File: `frontend/js/api.js`**

```javascript
// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// ─── AUTH ENDPOINTS ───

async function register(userData) {
  return apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

async function login(email, password) {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

async function getCurrentUser() {
  return apiCall('/auth/me');
}

// ─── BOOKING ENDPOINTS ───

async function createBooking(bookingData) {
  return apiCall('/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData)
  });
}

async function getUserBookings(userId) {
  return apiCall(`/bookings/user/${userId}`);
}

async function getProviderBookings(providerId) {
  return apiCall(`/bookings/provider/${providerId}`);
}

async function getBooking(bookingId) {
  return apiCall(`/bookings/${bookingId}`);
}

async function cancelBooking(bookingId, reason) {
  return apiCall(`/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

// ─── NOTIFICATION ENDPOINTS ───

async function getNotifications(userId) {
  return apiCall(`/notifications/user/${userId}`);
}

async function getUnreadNotificationCount(userId) {
  return apiCall(`/notifications/unread/${userId}`);
}

async function getNotification(notificationId) {
  return apiCall(`/notifications/${notificationId}`);
}

async function acceptBooking(notificationId) {
  return apiCall(`/notifications/${notificationId}/accept`, {
    method: 'POST'
  });
}

async function rejectBooking(notificationId, reason) {
  return apiCall(`/notifications/${notificationId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

async function markNotificationAsRead(notificationId) {
  return apiCall(`/notifications/${notificationId}/read`, {
    method: 'PATCH'
  });
}

// Export functions
window.API = {
  register,
  login,
  getCurrentUser,
  createBooking,
  getUserBookings,
  getProviderBookings,
  getBooking,
  cancelBooking,
  getNotifications,
  getUnreadNotificationCount,
  getNotification,
  acceptBooking,
  rejectBooking,
  markNotificationAsRead
};
```

## 2. Update Auth Module

**File: `frontend/js/auth.js` (Update)**

```javascript
// Auth state management
const Auth = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  },

  getToken() {
    return this.token;
  },

  setUser(user) {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser() {
    return this.user;
  },

  isLoggedIn() {
    return !!this.token && !!this.user;
  },

  async logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/frontend/pages/index.html';
  }
};

// Handle login form
async function handleLogin(email, password) {
  try {
    const response = await API.login(email, password);
    
    Auth.setToken(response.data.token);
    Auth.setUser(response.data.user);

    // Redirect based on role
    const role = response.data.user.role;
    if (role === 'provider') {
      window.location.href = '/frontend/pages/provider-dashboard.html';
    } else if (role === 'admin') {
      window.location.href = '/frontend/pages/admin-dashboard.html';
    } else {
      window.location.href = '/frontend/pages/dashboard.html';
    }
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
}

// Handle registration
async function handleRegister(userData) {
  try {
    const response = await API.register(userData);
    
    Auth.setToken(response.data.token);
    Auth.setUser(response.data.user);

    // Redirect to appropriate dashboard
    const role = userData.accountType === 'provider' ? 'provider' : 'user';
    if (role === 'provider') {
      window.location.href = '/frontend/pages/provider-dashboard.html';
    } else {
      window.location.href = '/frontend/pages/dashboard.html';
    }
  } catch (error) {
    alert('Registration failed: ' + error.message);
  }
}

// Protected route redirect
function checkAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/frontend/pages/login.html';
  }
}

// Export
window.Auth = Auth;
```

## 3. Update Booking Flow

**File: `frontend/pages/booking-flow.html` (Integration Code)**

Add this to your booking flow JavaScript:

```javascript
// ─── BOOKING SUBMISSION ───

async function confirmBooking() {
  try {
    const user = Auth.getUser();
    
    if (!state.date || !state.time || !state.duration || !state.paymentMethod) {
      alert('Please complete all booking steps');
      return;
    }

    const bookingData = {
      providerId: providers[state.provider].id,  // Need to add ID to provider objects
      serviceId: 'default-service',  // Or get from selected service
      date: state.date,
      startTime: state.time,
      duration: state.duration,
      location: 'Kathmandu',  // Or get from user input
      totalAmount: calculateTotal(),
      paymentMethod: state.paymentMethod,
      notes: ''
    };

    // Show loading
    document.getElementById('btnNext').disabled = true;
    document.getElementById('btnNext').textContent = 'Processing...';

    // Call API
    const response = await API.createBooking(bookingData);

    // Success
    showBookingSuccess(response.data);
    resetFlow();

  } catch (error) {
    alert('Booking failed: ' + error.message);
    document.getElementById('btnNext').disabled = false;
    document.getElementById('btnNext').textContent = 'Review and Book';
  }
}

function calculateTotal() {
  const p = providers[state.provider];
  const baseCost = parseInt(state.duration) * p.price;
  const { platformFee, tax, total } = calculateFees(baseCost);
  return total;
}

function showBookingSuccess(bookingData) {
  // Update success screen with real data
  document.getElementById('bookingRef').textContent = bookingData.bookingRef;
  
  // Show success modal
  const successScreen = document.getElementById('step-success');
  successScreen.style.display = 'flex';
  
  console.log('✅ Booking created:', bookingData);
}
```

## 4. Provider Dashboard - Show Notifications

**File: `frontend/pages/provider-dashboard.html` (New)**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Provider Dashboard - Cheapflix Nepal</title>
  <link rel="stylesheet" href="../css/style.css">
  <style>
    .notification-item {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      cursor: pointer;
    }
    .notification-item.unread {
      background: #f0f7ff;
      border-color: #2563eb;
    }
    .notification-badge {
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Provider Dashboard</h1>
    
    <div class="notifications-section">
      <h2>Booking Requests <span class="notification-badge" id="unreadCount">0</span></h2>
      <div id="notificationsList"></div>
    </div>
  </div>

  <script src="../js/api.js"></script>
  <script src="../js/auth.js"></script>
  <script>
    // Check authentication
    checkAuth();
    
    const currentUser = Auth.getUser();

    // Fetch notifications
    async function loadNotifications() {
      try {
        const response = await API.getNotifications(currentUser.id);
        displayNotifications(response.data);
        
        const unreadCount = response.data.filter(n => n.status === 'unread').length;
        document.getElementById('unreadCount').textContent = unreadCount;
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    }

    function displayNotifications(notifications) {
      const container = document.getElementById('notificationsList');
      
      if (notifications.length === 0) {
        container.innerHTML = '<p>No booking requests yet</p>';
        return;
      }

      container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.status === 'unread' ? 'unread' : ''}">
          <h3>${notif.booking.user.firstName} ${notif.booking.user.lastName}</h3>
          <p>${notif.message}</p>
          <p><strong>Date:</strong> ${new Date(notif.booking.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${notif.booking.startTime}</p>
          <p><strong>Amount:</strong> Rs${notif.booking.totalAmount}</p>
          
          <div style="margin-top: 12px; display: flex; gap: 8px;">
            <button onclick="acceptNotification('${notif.id}')">✓ Accept</button>
            <button onclick="rejectNotification('${notif.id}')">✗ Reject</button>
          </div>
        </div>
      `).join('');
    }

    async function acceptNotification(notificationId) {
      try {
        await API.acceptBooking(notificationId);
        alert('Booking accepted!');
        loadNotifications();
      } catch (error) {
        alert('Failed to accept: ' + error.message);
      }
    }

    async function rejectNotification(notificationId) {
      const reason = prompt('Reason for rejection (optional):');
      try {
        await API.rejectBooking(notificationId, reason);
        alert('Booking rejected');
        loadNotifications();
      } catch (error) {
        alert('Failed to reject: ' + error.message);
      }
    }

    // Load on page load
    loadNotifications();
    
    // Refresh every 30 seconds
    setInterval(loadNotifications, 30000);
  </script>
</body>
</html>
```

## 5. Customer Dashboard - Show Bookings

**File: `frontend/pages/dashboard.html` (Update)**

```html
<!-- Add this to your dashboard -->
<div class="bookings-section">
  <h2>My Bookings</h2>
  <div id="bookingsList"></div>
</div>

<script>
// After Auth setup
async function loadMyBookings() {
  try {
    const currentUser = Auth.getUser();
    const response = await API.getUserBookings(currentUser.id);
    
    const container = document.getElementById('bookingsList');
    container.innerHTML = response.data.map(booking => `
      <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
        <h3>${booking.provider.user.firstName} ${booking.provider.user.lastName}</h3>
        <p><strong>Status:</strong> ${booking.status}</p>
        <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
        <p><strong>Amount:</strong> Rs${booking.totalAmount}</p>
        ${booking.status === 'pending' ? `
          <button onclick="cancelMyBooking('${booking.id}')">Cancel Booking</button>
        ` : ''}
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load bookings:', error);
  }
}

async function cancelMyBooking(bookingId) {
  if (confirm('Cancel this booking?')) {
    try {
      await API.cancelBooking(bookingId, 'Cancelled by customer');
      alert('Booking cancelled');
      loadMyBookings();
    } catch (error) {
      alert('Failed to cancel: ' + error.message);
    }
  }
}

// Load on page load
loadMyBookings();
</script>
```

## 6. Add to HTML Head

Make sure these scripts are included in your HTML files:

```html
<!-- In booking-flow.html, dashboard.html, provider-dashboard.html -->
<script src="../js/api.js"></script>
<script src="../js/auth.js"></script>
```

## 7. Environment Configuration

**File: `frontend/js/api.js` - Top of file:**

```javascript
// Change based on environment
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com/api'
  : 'http://localhost:5000/api';
```

## Integration Checklist

- [ ] Create `frontend/js/api.js` with API endpoints
- [ ] Update `frontend/js/auth.js` with login/register handlers
- [ ] Update `booking-flow.html` to call `API.createBooking()`
- [ ] Create `provider-dashboard.html` with notifications list
- [ ] Update `dashboard.html` to show customer bookings
- [ ] Add script tags to include `api.js` and `auth.js`
- [ ] Test all API calls in browser console
- [ ] Verify CORS is working (backend has CORS enabled)
- [ ] Test full booking flow end-to-end

## Testing API Calls in Browser Console

```javascript
// After page loads, test in DevTools Console

// Check API is available
console.log(API);

// Check Auth is available
console.log(Auth);

// Simulate a login
API.login('customer@test.com', 'test123')
  .then(res => console.log(res))
  .catch(err => console.error(err));
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| CORS Error | Enable CORS in backend (already done) |
| 401 Unauthorized | Token missing or expired, login again |
| 404 Not Found | Check endpoint URL spelling |
| No network request | Check server running on port 5000 |
| localStorage empty | Not logged in, register first |

---

Your frontend is now fully connected to the backend! 🎉
