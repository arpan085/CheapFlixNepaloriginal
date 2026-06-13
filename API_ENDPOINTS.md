# 📚 CHEAPFLIX NEPAL - COMPLETE API REFERENCE

## Base URL
```
http://localhost:5000/api
```

## Authentication

All endpoints except `/auth/register`, `/auth/login`, `/health`, and `/services` require:

```
Header: Authorization: Bearer <JWT_TOKEN>
Header: Content-Type: application/json
```

---

# 🔐 AUTHENTICATION ENDPOINTS

## Register New User/Provider

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "9841234567",
  "userType": "user" // or "provider"
}
```

**Response (200):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Additional Fields for Providers:

```json
{
  "email": "provider@example.com",
  "password": "password123",
  "firstName": "Ram",
  "lastName": "Kumar",
  "phone": "9841234567",
  "userType": "provider",
  "category": "Electrician",        // Service category
  "experience": "5 years",           // Experience level
  "bio": "Experienced electrician",  // Short bio
  "pricePerHour": 500               // Service rate
}
```

---

## Login User/Admin/Provider

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "role": "user",         // "user", "provider", or "admin"
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

## Get Current User Info

```http
GET /auth/me
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "status": "active"
}
```

---

# 👥 USER ENDPOINTS

## Get All Users (Admin Only)

```http
GET /users
Authorization: Bearer <ADMIN_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "9841234567",
      "status": "active",
      "createdAt": "2026-01-15T10:30:00Z",
      "role": "user"
    }
  ]
}
```

---

## Get User Profile (Self)

```http
GET /users/profile
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "9841234567",
    "address": "123 Main St",
    "city": "Kathmandu",
    "avatar": "https://...",
    "role": "user",
    "status": "active",
    "createdAt": "2026-01-15T10:30:00Z"
  }
}
```

---

## Update User Profile

```http
PUT /users/profile
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "9841234568",
  "address": "456 New St",
  "city": "Lalitpur",
  "avatar": "https://..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "phone": "9841234568",
    "address": "456 New St",
    "city": "Lalitpur"
  }
}
```

---

# 🔧 PROVIDER ENDPOINTS

## Get All Verified Providers (Public)

```http
GET /providers
```

**Response (200):**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "category": "Electrician",
      "bio": "Experienced electrician",
      "experience": "5 years",
      "rating": 4.5,
      "verified": true,
      "pricePerHour": 500,
      "user": {
        "id": "uuid",
        "firstName": "Ram",
        "lastName": "Kumar",
        "email": "ram@example.com",
        "phone": "9841234567"
      },
      "services": [
        {
          "id": "uuid",
          "name": "Electrical Repair",
          "description": "...",
          "price": 500,
          "duration": 60
        }
      ]
    }
  ]
}
```

---

## Get Provider Details

```http
GET /providers/:id
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "category": "Electrician",
    "bio": "Experienced electrician",
    "experience": "5 years",
    "rating": 4.5,
    "verified": true,
    "pricePerHour": 500,
    "user": {
      "id": "uuid",
      "firstName": "Ram",
      "lastName": "Kumar",
      "email": "ram@example.com",
      "phone": "9841234567"
    },
    "services": [...],
    "bookings": [...]
  }
}
```

---

## Update Provider Profile (Provider Only)

```http
PUT /providers/profile
Authorization: Bearer <PROVIDER_TOKEN>
Content-Type: application/json

{
  "category": "Plumber",
  "bio": "Expert plumber with 10 years experience",
  "experience": "10 years",
  "pricePerHour": 600
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Provider profile updated",
  "data": {
    "id": "uuid",
    "category": "Plumber",
    "bio": "Expert plumber with 10 years experience",
    "experience": "10 years",
    "rating": 4.5,
    "verified": true,
    "pricePerHour": 600,
    "user": {...},
    "services": [...]
  }
}
```

---

## Get All Services

```http
GET /providers/services/all
```

**Response (200):**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "id": "uuid",
      "name": "Electrical Repair",
      "description": "Professional electrical repairs",
      "price": 500,
      "duration": 60,
      "providerId": "uuid",
      "provider": {
        "id": "uuid",
        "user": {
          "firstName": "Ram",
          "lastName": "Kumar"
        }
      },
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ]
}
```

---

# 📅 BOOKING ENDPOINTS

## Create Booking

```http
POST /bookings
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "providerId": "uuid",
  "serviceId": "uuid",
  "date": "2026-02-15",
  "startTime": "10:00",
  "duration": 120,           // minutes
  "location": "123 Main St",
  "totalAmount": 1000,
  "paymentMethod": "cash",   // or "card", "online"
  "description": "Need electrical work"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "uuid",
    "bookingRef": "BK-2026-001",
    "userId": "uuid",
    "providerId": "uuid",
    "serviceId": "uuid",
    "date": "2026-02-15",
    "startTime": "10:00",
    "duration": 120,
    "location": "123 Main St",
    "totalAmount": 1000,
    "paymentMethod": "cash",
    "status": "pending",
    "createdAt": "2026-01-20T10:30:00Z"
  }
}
```

---

## Get User Bookings

```http
GET /bookings/user/:userId
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "uuid",
      "bookingRef": "BK-2026-001",
      "userId": "uuid",
      "providerId": "uuid",
      "date": "2026-02-15",
      "startTime": "10:00",
      "duration": 120,
      "location": "123 Main St",
      "totalAmount": 1000,
      "paymentMethod": "cash",
      "status": "pending",
      "provider": {
        "user": {
          "firstName": "Ram",
          "lastName": "Kumar"
        }
      },
      "service": {
        "name": "Electrical Repair"
      },
      "createdAt": "2026-01-20T10:30:00Z"
    }
  ]
}
```

---

## Get Provider Bookings

```http
GET /bookings/provider/:providerId
Authorization: Bearer <PROVIDER_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "bookingRef": "BK-2026-002",
      "date": "2026-02-18",
      "status": "pending",
      "user": {
        "firstName": "John",
        "lastName": "Doe",
        "phone": "9841234567"
      },
      "service": {
        "name": "Electrical Repair",
        "price": 500
      },
      "totalAmount": 1000,
      "location": "123 Main St"
    }
  ]
}
```

---

## Update Booking Status

```http
PATCH /bookings/:bookingId/status
Authorization: Bearer <PROVIDER_TOKEN>
Content-Type: application/json

{
  "status": "confirmed"  // pending, confirmed, in_progress, completed, cancelled
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking status updated",
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "updatedAt": "2026-01-20T11:00:00Z"
  }
}
```

---

## Cancel Booking

```http
POST /bookings/:bookingId/cancel
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "reason": "Emergency came up"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking cancelled",
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "reason": "Emergency came up"
  }
}
```

---

# ⭐ REVIEW ENDPOINTS

## Create Review

```http
POST /reviews
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "bookingId": "uuid",
  "rating": 5,
  "comment": "Excellent work! Very professional"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Review created",
  "data": {
    "id": "uuid",
    "rating": 5,
    "comment": "Excellent work! Very professional",
    "bookingId": "uuid",
    "user": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "createdAt": "2026-01-20T12:00:00Z"
  }
}
```

---

## Get Reviews for Provider

```http
GET /reviews/provider/:providerId
```

**Response (200):**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "Excellent work!",
      "user": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "createdAt": "2026-01-20T12:00:00Z"
    }
  ]
}
```

---

# 🔔 NOTIFICATION ENDPOINTS

## Get Notifications

```http
GET /notifications
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "type": "booking_request",
      "message": "New booking request from John Doe",
      "bookingId": "uuid",
      "read": false,
      "createdAt": "2026-01-20T10:30:00Z"
    }
  ]
}
```

---

## Mark Notification as Read

```http
PATCH /notifications/:notificationId/read
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

# 🛠️ ADMIN ENDPOINTS (Admin Only)

## Get Dashboard Stats

```http
GET /admin/dashboard
Authorization: Bearer <ADMIN_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": 25,
    "providers": 8,
    "verifiedProviders": 5,
    "bookings": 45,
    "revenue": 25000
  }
}
```

---

## Get All Users (Admin)

```http
GET /admin/users
Authorization: Bearer <ADMIN_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "9841234567",
      "status": "active",
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ]
}
```

---

## Get All Providers (Admin)

```http
GET /admin/providers
Authorization: Bearer <ADMIN_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "id": "uuid",
      "category": "Electrician",
      "verified": true,
      "rating": 4.5,
      "user": {
        "firstName": "Ram",
        "lastName": "Kumar",
        "email": "ram@example.com"
      }
    }
  ]
}
```

---

## Verify/Approve Provider

```http
PATCH /admin/providers/:providerId/verify
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "verified": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Provider approved",
  "data": {
    "id": "uuid",
    "verified": true,
    "user": {
      "firstName": "Ram",
      "lastName": "Kumar"
    }
  }
}
```

---

## Suspend Provider

```http
POST /admin/providers/:providerId/suspend
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "reason": "Multiple complaints"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Provider suspended",
  "data": {
    "id": "uuid",
    "user": {
      "firstName": "Ram",
      "lastName": "Kumar",
      "status": "suspended"
    }
  }
}
```

---

## Get All Bookings (Admin)

```http
GET /admin/bookings
Authorization: Bearer <ADMIN_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "count": 45,
  "data": [
    {
      "id": "uuid",
      "bookingRef": "BK-2026-001",
      "status": "pending",
      "totalAmount": 1000,
      "user": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "provider": {
        "user": {
          "firstName": "Ram"
        }
      },
      "service": {
        "name": "Electrical Repair"
      },
      "date": "2026-02-15"
    }
  ]
}
```

---

## Get All Services (Admin)

```http
GET /admin/services
Authorization: Bearer <ADMIN_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "id": "uuid",
      "name": "Electrical Repair",
      "price": 500,
      "duration": 60,
      "provider": {
        "user": {
          "firstName": "Ram",
          "lastName": "Kumar",
          "email": "ram@example.com"
        }
      }
    }
  ]
}
```

---

## Cancel Booking (Admin)

```http
PATCH /admin/bookings/:bookingId/cancel
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "reason": "Provider not responding"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking cancelled",
  "data": {
    "id": "uuid",
    "status": "cancelled"
  }
}
```

---

## Delete User (Admin)

```http
DELETE /admin/users/:userId
Authorization: Bearer <ADMIN_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted"
}
```

---

# 🌐 PUBLIC ENDPOINTS

## Health Check

```http
GET /health
```

**Response (200):**
```json
{
  "status": "Server is running ✅"
}
```

---

## Get All Services (Public)

```http
GET /services
```

**Response (200):**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "id": "uuid",
      "name": "Electrical Repair",
      "description": "Professional electrical repairs",
      "price": 500,
      "duration": 60,
      "provider": {
        "user": {
          "firstName": "Ram",
          "lastName": "Kumar",
          "email": "ram@example.com"
        }
      }
    }
  ]
}
```

---

# ❌ ERROR RESPONSES

## 400 Bad Request

```json
{
  "error": "Missing required fields: email, password"
}
```

---

## 401 Unauthorized

```json
{
  "error": "Invalid or expired token"
}
```

---

## 403 Forbidden

```json
{
  "error": "Access denied. Admin role required."
}
```

---

## 404 Not Found

```json
{
  "error": "Resource not found"
}
```

---

## 500 Server Error

```json
{
  "error": "Internal server error",
  "details": "Error message"
}
```

---

# 📋 STATUS CODES REFERENCE

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Auth required |
| 403 | Forbidden - Permission denied |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Backend issue |

---

# 🔐 ROLES & PERMISSIONS

| Endpoint | Guest | User | Provider | Admin |
|----------|-------|------|----------|-------|
| POST /auth/register | ✅ | ✅ | ✅ | ✅ |
| POST /auth/login | ✅ | ✅ | ✅ | ✅ |
| GET /services | ✅ | ✅ | ✅ | ✅ |
| GET /providers | ✅ | ✅ | ✅ | ✅ |
| POST /bookings | ❌ | ✅ | ✅ | ❌ |
| GET /bookings/user/* | ❌ | ✅ | ✅ | ❌ |
| PATCH /bookings/*/status | ❌ | ❌ | ✅ | ❌ |
| GET /admin/* | ❌ | ❌ | ❌ | ✅ |
| PATCH /admin/* | ❌ | ❌ | ❌ | ✅ |

---

**Last Updated:** June 13, 2026
**API Version:** 1.0
**Status:** ✅ All endpoints working
