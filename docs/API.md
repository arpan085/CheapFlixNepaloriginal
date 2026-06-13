# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

## Auth Endpoints

### Register
- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "9841234567",
    "userType": "user" // or "provider"
  }
  ```
- **Response:** Token and user data

### Login
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:** Token and user data

### Get Current User
- **GET** `/auth/me`
- **Protected:** Yes
- **Response:** User profile data

## Booking Endpoints

### Create Booking
- **POST** `/bookings`
- **Protected:** Yes
- **Body:**
  ```json
  {
    "providerId": "provider_id",
    "serviceId": "service_id",
    "date": "2026-06-20",
    "startTime": "10:00 AM",
    "duration": "2 hours",
    "location": "Kathmandu",
    "notes": "Optional notes"
  }
  ```

### Get User's Bookings
- **GET** `/bookings/my-bookings`
- **Protected:** Yes

### Get Booking Details
- **GET** `/bookings/:id`
- **Protected:** Yes

### Cancel Booking
- **PUT** `/bookings/:id/cancel`
- **Protected:** Yes

## Provider Endpoints

### Get All Providers
- **GET** `/providers`
- **Query Params:** category, city, page, limit

### Get Provider Details
- **GET** `/providers/:id`

### Update Provider Profile
- **PUT** `/providers/profile`
- **Protected:** Yes (Provider only)

## Review Endpoints

### Create Review
- **POST** `/reviews`
- **Protected:** Yes
- **Body:**
  ```json
  {
    "bookingId": "booking_id",
    "providerId": "provider_id",
    "rating": 5,
    "comment": "Great service!"
  }
  ```

### Get Provider Reviews
- **GET** `/reviews/provider/:providerId`

## Admin Endpoints

### Admin Dashboard
- **GET** `/admin/dashboard`
- **Protected:** Yes (Admin only)

### List All Users
- **GET** `/admin/users`
- **Protected:** Yes (Admin only)

### Verify Provider
- **PUT** `/admin/providers/:id/verify`
- **Protected:** Yes (Admin only)

---

All endpoints return JSON responses with appropriate HTTP status codes.
