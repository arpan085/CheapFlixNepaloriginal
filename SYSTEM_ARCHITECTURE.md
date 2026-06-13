# 📊 Cheapflix Nepal - Complete System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      CHEAPFLIX NEPAL                             │
│                   Service Booking Platform                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (HTML/CSS/JS)                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ├─ Landing Page (index.html)          ├─ Provider Dashboard        │
│  ├─ Login (login.html)                 ├─ Customer Dashboard        │
│  ├─ Register (register.html)           ├─ Admin Dashboard           │
│  └─ Booking Flow (booking-flow.html)   └─ Notifications Page        │
│                                                                        │
│  5-Step Booking Flow:                                                │
│  1️⃣  Search Providers                                               │
│  2️⃣  View Provider Profile                                          │
│  3️⃣  Select Date & Time                                             │
│  4️⃣  Choose Payment Method (eSewa, Khalti, IME Pay, Cash)           │
│  5️⃣  Review & Confirm Booking                                       │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
                                  ↓
                        HTTP/HTTPS API Calls
                                  ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  PORT: 5000                                                           │
│                                                                        │
│  API Routes:                                                          │
│  ├─ /api/auth          → User authentication                         │
│  ├─ /api/users         → User management                             │
│  ├─ /api/providers     → Provider profiles                           │
│  ├─ /api/bookings      → Booking management                          │
│  ├─ /api/notifications → Notifications & accept/reject               │
│  ├─ /api/reviews       → Customer reviews                            │
│  └─ /api/admin         → Admin controls                              │
│                                                                        │
│  Middleware:                                                          │
│  ├─ authMiddleware     → JWT verification                            │
│  ├─ providerMiddleware → Provider-only routes                        │
│  └─ adminMiddleware    → Admin-only routes                           │
│                                                                        │
│  Controllers:                                                         │
│  ├─ authController     → Register, Login, Auth                       │
│  ├─ bookingController  → Create, Get, Cancel bookings                │
│  └─ notificationController → Get, Accept, Reject notifications       │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
                                  ↓
                    MySQL Protocol (Port 3306)
                                  ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    DATABASE (MySQL 8.0+)                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Database: cheapflix_nepal                                            │
│                                                                        │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────┐           │
│  │    User      │    │   Provider    │    │   Service    │           │
│  ├──────────────┤    ├───────────────┤    ├──────────────┤           │
│  │ id (PK)      │    │ id (PK)       │    │ id (PK)      │           │
│  │ email        │◄───│ userId (FK)   │    │ providerId   │           │
│  │ password     │    │ category      │    │ name         │           │
│  │ firstName    │    │ bio           │    │ price        │           │
│  │ lastName     │    │ experience    │    │ description  │           │
│  │ phone        │    │ rating        │    │ duration     │           │
│  │ role         │    │ verified      │───┤ availability │           │
│  │ status       │    └───────────────┘   └──────────────┘           │
│  └──────────────┘            ▲                  ▲                    │
│        ▲                      │                  │                    │
│        │                      │                  │                    │
│        │                      └──────┬───────────┘                    │
│        │                             │                               │
│  ┌─────┴──────────┐        ┌─────────▼─────────┐   ┌──────────────┐ │
│  │   Booking      │        │      Review       │   │ Notification │ │
│  ├─────────────────┤       ├──────────────────┤   ├──────────────┤ │
│  │ id (PK)         │       │ id (PK)          │   │ id (PK)      │ │
│  │ bookingRef      │       │ bookingId (FK)   │   │ bookingId(FK)│ │
│  │ userId (FK)     │─┐     │ userId (FK)      │   │ providerId   │ │
│  │ providerId (FK) │─┼────►│ providerId (FK)  │   │ userId (FK)  │ │
│  │ serviceId (FK)  │ │     │ rating           │   │ type         │ │
│  │ status          │ │     │ comment          │   │ title        │ │
│  │ date            │ │     │ createdAt        │   │ message      │ │
│  │ startTime       │ │     └──────────────────┘   │ status       │ │
│  │ duration        │ │                            │ action       │ │
│  │ location        │ │                            │ actionDate   │ │
│  │ totalAmount     │ │                            └──────────────┘ │
│  │ paymentMethod   │ │            (NEW) ↑                 ▲        │
│  │ paymentStatus   │ │                  │                 │        │
│  │ createdAt       │ │                  └─────────────────┘        │
│  └─────────────────┘ │                                             │
│         ▲            │     ┌──────────────┐                        │
│         └────────────┴────►│    Admin     │                        │
│                            ├──────────────┤                        │
│                            │ id (PK)      │                        │
│                            │ email        │                        │
│                            │ password     │                        │
│                            │ name         │                        │
│                            │ permissions  │                        │
│                            └──────────────┘                        │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Booking Notification System

```
CUSTOMER                              PROVIDER                    DATABASE
    │                                    │                            │
    │  1. Register/Login                 │                            │
    ├─────────────────────────────────────────────────────────────────┤
    │  2. Browse & Select Provider       │                            │
    │  3. Complete 5-step Booking        │                            │
    ├──────────────────────────────────┐ │                            │
    │  4. Submit Booking                 │ │                            │
    │     POST /api/bookings             │ │                            │
    ├───────────────────────────────────►├─────────────────────────────┤
    │                                    │  Create Booking (pending)   │
    │                                    │  Create Notification        │
    │                                    │  (unread)                   │
    │                                    │◄────────────────────────────┤
    │                                    │                            │
    │                                    │  5. Check Notifications    │
    │                                    │  GET /api/notifications    │
    │                                    ├───────────────────────────┤
    │                                    │  Fetch notifications       │
    │                                    │◄───────────────────────────┤
    │                                    │                            │
    │                                    │  6. Accept or Reject?      │
    │                                    │  Decision Point:           │
    │                                    ├────────┬─────────────────┤
    │                                    │         │                 │
    │                 ACCEPT             │         │    REJECT       │
    │                   │                │         │      │         │
    │                   │                │    POST /api/notifications
    │   6a. POST /api/notifications      │    :notificationId/reject   │
    │       :notificationId/accept       │         │                 │
    │◄──────────────────────────────────┤         │                 │
    │                                    │         │                 │
    │                                    ├────────┴──┬────────────────┤
    │                                    │           │                 │
    │                                    │   Update  │                 │
    │                                    │   Booking │                 │
    │                                    │   Status: │                 │
    │  7. Receive Notification           │   CONFIRMED/CANCELLED       │
    │  "Booking Accepted!"               │           │                 │
    │  or                                │           │                 │
    │  "Booking Rejected"                ├───────────┼─────────────────┤
    │  GET /api/notifications/user       │           │                 │
    │◄──────────────────────────────────┤           │                 │
    │                                    │           │                 │
    │  8. View Booking Status            │      Create                │
    │  GET /api/bookings/user/:id        │      Confirmation           │
    ├───────────────────────────────────►│      Notification for       │
    │                                    │      Customer               │
    │                                    ├───────────────────────────┤
    │                                    │                            │
```

## Authentication Flow

```
┌─────────────────────────────────────────────────┐
│            AUTHENTICATION SYSTEM                 │
├─────────────────────────────────────────────────┤
│                                                   │
│  1. REGISTER                                     │
│     POST /api/auth/register                      │
│     ├─ Email, Password, Name, Phone              │
│     ├─ Role: "user" or "provider"                │
│     └─ Password hashing (bcryptjs - 10 rounds)   │
│                  ↓                               │
│     User created in database                    │
│                                                   │
│  2. LOGIN                                        │
│     POST /api/auth/login                         │
│     ├─ Email + Password verification             │
│     └─ Return JWT Token (7 days expiry)          │
│                  ↓                               │
│     Client stores token in localStorage          │
│                                                   │
│  3. AUTHENTICATED REQUESTS                       │
│     All protected endpoints require:             │
│     Headers: { Authorization: "Bearer TOKEN" }   │
│                                                   │
│     Middleware:                                  │
│     ├─ authMiddleware      → Verify token        │
│     ├─ providerMiddleware  → Check role = provider
│     └─ adminMiddleware     → Check role = admin  │
│                                                   │
│  4. LOGOUT                                       │
│     POST /api/auth/logout                        │
│     └─ Client removes token from localStorage    │
│                                                   │
└─────────────────────────────────────────────────┘
```

## Notification Status Timeline

```
Customer Books Service
        │
        ▼
   ┌─────────────────────────────────────┐
   │ Notification Created                 │
   │ ├─ status: "unread"                  │
   │ ├─ type: "booking_request"           │
   │ ├─ action: NULL                      │
   │ └─ actionDate: NULL                  │
   └─────────────────────────────────────┘
        │
        ├─────────────────┬─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   PROVIDER READS    PROVIDER ACCEPTS  PROVIDER REJECTS
        │                 │                 │
        ▼                 ▼                 ▼
   status: "read"    Booking: "confirmed" Booking: "cancelled"
                     status: "read"        status: "read"
                     action: "accept"      action: "reject"
                     actionDate: NOW       actionDate: NOW
                            │                    │
                            ▼                    ▼
                     Customer Notified   Customer Notified
                     "Accepted!"         "Rejected"
```

## Payment Flow (In Booking)

```
Customer selects payment method in Step 4:

┌──────────────────────────┐
│   PAYMENT OPTIONS        │
├──────────────────────────┤
│ 💳 eSewa (Online)        │
│ 📱 Khalti (Digital)      │
│ 💰 IME Pay (Bank)        │
│ 💵 Cash (After Service)  │
└──────────────────────────┘
            │
            ▼
   ┌─────────────────────┐
   │  Order Summary      │
   ├─────────────────────┤
   │ Service Fee: Rs1600 │
   │ Platform Fee: Rs160 │
   │ Tax (13%): Rs228    │
   │ TOTAL: Rs1988       │
   └─────────────────────┘
            │
            ▼
   Booking Created
   paymentMethod: selected
   paymentStatus: "unpaid" (initially)
   totalAmount: calculated
```

## Technology Stack

```
Frontend:
  • HTML5 (Semantic markup)
  • CSS3 (Custom properties, Flexbox, Grid)
  • JavaScript (Vanilla, no framework)
  • localStorage (Authentication state)

Backend:
  • Node.js (Runtime)
  • Express.js (Web framework)
  • Prisma (ORM)
  • MySQL (Database)
  • JWT (Authentication)
  • bcryptjs (Password hashing)
  • CORS (Cross-origin)

Tools:
  • VS Code (Editor)
  • MySQL Workbench (DB management)
  • Postman/Thunder Client (API testing)

Deployment Ready:
  • Windows, Mac, Linux
  • Heroku, Railway, Render
  • AWS, Azure, DigitalOcean
```

## Security Features

```
✅ Password Hashing
   └─ bcryptjs (10 rounds)

✅ JWT Authentication
   └─ 7-day token expiry
   └─ Secure header-based transmission

✅ Role-Based Access Control
   ├─ user (Customer)
   ├─ provider (Service Provider)
   └─ admin (Administrator)

✅ Authorization Middleware
   └─ Verify ownership before accessing data
   └─ Prevent unauthorized modifications

✅ Input Validation
   └─ Required fields checking
   └─ Data type validation

✅ Error Handling
   └─ Sensitive info not exposed
   └─ Proper HTTP status codes
```

---

**System Status:** ✅ **Ready for Development**

All components are in place and ready to be integrated into the frontend!
