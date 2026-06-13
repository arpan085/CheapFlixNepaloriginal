# 📬 Notification System Guide - Cheapflix Nepal

## Overview

When a customer books a service, the provider receives a notification. They can **accept** or **reject** the booking request.

## Notification Flow

```
Customer Books Service
        ↓
Booking created in database (status: "pending")
        ↓
Notification created for Provider
        ↓
Provider receives notification (status: "unread")
        ↓
     /--Accept--\       /--Reject--\
     ↓           ↓      ↓          ↓
Booking Status → "confirmed"  → "cancelled"
Notification → "read"        → "read"
Provider → accepts            → rejects
     ↓                          ↓
Customer gets                Customer gets
Accept notification        Rejection notification
```

## API Endpoints

### 1. Create Booking (Triggers Notification)

**Endpoint:** `POST /api/bookings`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "providerId": "clxxx123",
  "serviceId": "clxxx456",
  "date": "2025-06-20",
  "startTime": "10:00 AM",
  "duration": "2 hours",
  "location": "Kathmandu",
  "totalAmount": 1600,
  "paymentMethod": "esewa",
  "notes": "Please bring tools"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking created successfully. Provider will review shortly.",
  "data": {
    "id": "clxxx789",
    "bookingRef": "CF-2025-12345",
    "status": "pending",
    "date": "2025-06-20T00:00:00Z",
    "startTime": "10:00 AM",
    "totalAmount": 1600
  }
}
```

---

### 2. Get All Notifications (Provider)

**Endpoint:** `GET /api/notifications/user/:userId`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "notif123",
      "type": "booking_request",
      "title": "New Booking Request!",
      "message": "John Doe has requested an Electrician service on 6/20/2025",
      "status": "unread",
      "createdAt": "2025-06-12T10:30:00Z",
      "booking": {
        "id": "booking123",
        "bookingRef": "CF-2025-12345",
        "date": "2025-06-20",
        "startTime": "10:00 AM",
        "user": {
          "firstName": "John",
          "lastName": "Doe",
          "phone": "9841234567"
        }
      }
    }
  ]
}
```

---

### 3. Get Unread Notification Count

**Endpoint:** `GET /api/notifications/unread/:userId`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Response:**
```json
{
  "success": true,
  "unreadCount": 5
}
```

---

### 4. Get Single Notification Details

**Endpoint:** `GET /api/notifications/:notificationId`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "notif123",
    "type": "booking_request",
    "title": "New Booking Request!",
    "message": "John Doe has requested an Electrician service",
    "status": "read",
    "booking": {
      "id": "booking123",
      "bookingRef": "CF-2025-12345",
      "date": "2025-06-20",
      "startTime": "10:00 AM",
      "duration": "2 hours",
      "totalAmount": 1600,
      "user": {
        "firstName": "John",
        "lastName": "Doe",
        "phone": "9841234567",
        "address": "Kathmandu"
      }
    }
  }
}
```

---

### 5. Accept Booking Request

**Endpoint:** `POST /api/notifications/:notificationId/accept`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking accepted successfully",
  "data": {
    "id": "booking123",
    "status": "confirmed",
    "bookingRef": "CF-2025-12345"
  }
}
```

**What happens:**
- Booking status changes to `"confirmed"`
- Notification status changes to `"read"`
- Action recorded as `"accept"`
- Customer receives acceptance notification

---

### 6. Reject Booking Request

**Endpoint:** `POST /api/notifications/:notificationId/reject`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

**Request Body (optional):**
```json
{
  "reason": "I'm not available on that date"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking rejected successfully",
  "data": {
    "id": "booking123",
    "status": "cancelled",
    "bookingRef": "CF-2025-12345"
  }
}
```

**What happens:**
- Booking status changes to `"cancelled"`
- Notification status changes to `"read"`
- Action recorded as `"reject"`
- Customer receives rejection notification with reason (if provided)

---

### 7. Mark Notification as Read

**Endpoint:** `PATCH /api/notifications/:notificationId/read`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "notif123",
    "status": "read"
  }
}
```

---

## JavaScript Frontend Implementation

### Example: Fetch Provider Notifications

```javascript
async function getNotifications(userId) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/notifications/user/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.data; // Array of notifications
}
```

### Example: Accept Booking

```javascript
async function acceptBooking(notificationId) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/notifications/${notificationId}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  if (data.success) {
    alert('Booking accepted!');
    // Refresh notifications
  }
}
```

### Example: Reject Booking

```javascript
async function rejectBooking(notificationId, reason) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/notifications/${notificationId}/reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason })
  });
  
  const data = await response.json();
  if (data.success) {
    alert('Booking rejected');
    // Refresh notifications
  }
}
```

---

## Notification Types

| Type | When Sent | To Whom |
|------|-----------|--------|
| `booking_request` | When customer creates booking | Provider |
| `booking_accepted` | When provider accepts | Customer |
| `booking_rejected` | When provider rejects | Customer |
| `booking_completed` | When service is completed | Customer |

---

## Database Fields

### Notification Table

```sql
id             - Unique identifier
bookingId      - Link to booking
providerId     - Provider receiving notification
userId         - User (customer) who created booking
type           - Type of notification
title          - Short title
message        - Detailed message
status         - "unread" or "read"
action         - "accept", "reject", or NULL
actionDate     - When provider responded
createdAt      - When notification was created
updatedAt      - Last updated
```

---

## Testing with Postman/Thunder Client

### 1. Register Provider
```
POST /api/auth/register
Body: {
  "email": "provider@test.com",
  "password": "password123",
  "firstName": "Rajesh",
  "lastName": "Maharjan",
  "phone": "9841234567",
  "accountType": "provider"
}
```

### 2. Register Customer
```
POST /api/auth/register
Body: {
  "email": "customer@test.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "9849876543",
  "accountType": "user"
}
```

### 3. Login as Customer
```
POST /api/auth/login
Body: {
  "email": "customer@test.com",
  "password": "password123"
}
```

### 4. Create Booking (Use customer token)
```
POST /api/bookings
Headers: Authorization: Bearer CUSTOMER_TOKEN
Body: {
  "providerId": "PROVIDER_ID",
  "serviceId": "SERVICE_ID",
  "date": "2025-06-20",
  "startTime": "10:00 AM",
  "duration": "2 hours",
  "location": "Kathmandu",
  "totalAmount": 1600,
  "paymentMethod": "esewa"
}
```

### 5. Login as Provider
```
POST /api/auth/login
Body: {
  "email": "provider@test.com",
  "password": "password123"
}
```

### 6. Check Notifications (Use provider token)
```
GET /api/notifications/user/PROVIDER_USER_ID
Headers: Authorization: Bearer PROVIDER_TOKEN
```

### 7. Accept Booking
```
POST /api/notifications/NOTIFICATION_ID/accept
Headers: Authorization: Bearer PROVIDER_TOKEN
```

---

## Best Practices

1. **Always include JWT token** in Authorization header
2. **Validate notification belongs** to logged-in provider
3. **Update UI in real-time** using notification status
4. **Show unread count** in notification bell icon
5. **Auto-refresh** notifications every 30 seconds
6. **Handle errors gracefully** with user-friendly messages

---

## Troubleshooting

### Provider not receiving notifications?
- Check notification route is registered in server.js
- Verify provider ID is correct
- Check database has Notification table

### Booking not created?
- Verify providerId exists
- Check totalAmount is provided
- Ensure date format is YYYY-MM-DD

### Token issues?
- Verify token is not expired (7 days)
- Re-login to get new token
- Check Authorization header format: `Bearer TOKEN`

---

For questions or issues, check the API logs with:
```bash
npm start
```

This shows all incoming requests and errors. 🚀
