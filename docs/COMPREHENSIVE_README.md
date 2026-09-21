# 🎯 CHEAPFLIX NEPAL - COMPLETE SYSTEM GUIDE

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: 2026-06-14

---

## 📚 TABLE OF CONTENTS

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Frontend Guide](#frontend-guide)
6. [Backend Guide](#backend-guide)
7. [Database Guide](#database-guide)
8. [API Reference](#api-reference)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 OVERVIEW

**Cheapflix Nepal** is a professional service marketplace platform that connects service providers with customers in Nepal. Users can book services like electricians, plumbers, tutors, developers, and 50+ other categories.

### Key Features:
- ✅ User registration with email or Google OAuth
- ✅ Provider marketplace with ratings and reviews
- ✅ Real-time booking system
- ✅ In-app chat between users and providers
- ✅ Support ticket system for help and feedback
- ✅ Admin dashboard for management
- ✅ Responsive design for mobile and desktop

### Technology Stack:
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (no build tool)
- **Backend**: Node.js + Express.js
- **Database**: MySQL with Prisma ORM
- **Authentication**: JWT + Google OAuth 2.0
- **Deployment**: Netlify (frontend) + Render (backend)

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                     USER BROWSER                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Frontend (Netlify)                                  │   │
│  │  - index.html (homepage)                             │   │
│  │  - pages/ (login, register, dashboard, support)      │   │
│  │  - css/ (styling)                                    │   │
│  │  - js/ (auth logic)                                  │   │
│  │  - config.js (API configuration)                     │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬───────────────────────────────────────────┘
                 │ HTTPS Requests
                 ▼
    ┌────────────────────────────────────────┐
    │  Backend (Render) - Node.js/Express   │
    │                                        │
    │  /api/auth         (Authentication)    │
    │  /api/providers    (Provider Listing)  │
    │  /api/bookings     (Bookings)          │
    │  /api/chat         (Messaging)         │
    │  /api/support      (Support Tickets)   │
    │  /api/reviews      (Reviews)           │
    │  /api/admin        (Admin Functions)   │
    │                                        │
    └────────────┬───────────────────────────┘
                 │ SQL Queries
                 ▼
    ┌────────────────────────────────────────┐
    │  Database (Render MySQL)               │
    │                                        │
    │  Tables:                               │
    │  - User (customers & providers)        │
    │  - Provider (provider info)            │
    │  - Service (services offered)          │
    │  - Booking (user bookings)             │
    │  - Review (ratings & feedback)         │
    │  - Message (chat messages)             │
    │  - Notification (alerts)               │
    │  - SupportTicket (help requests)       │
    │  - TicketMessage (ticket replies)      │
    │                                        │
    └────────────────────────────────────────┘
```

---

## 📁 PROJECT STRUCTURE

```
d:\CHEAPFLIX NEPAL
│
├── frontend/                          # 🎨 Frontend Application
│   ├── index.html                    # Homepage (dynamic providers)
│   ├── config.js                     # API configuration
│   │
│   ├── pages/                        # User pages
│   │   ├── login.html               # Login (email + Google OAuth)
│   │   ├── register.html            # Registration
│   │   ├── dashboard.html           # User dashboard
│   │   ├── support.html             # Support tickets
│   │   ├── provider-dashboard.html  # Provider dashboard
│   │   ├── admin-dashboard.html     # Admin panel
│   │   └── booking-flow.html        # Booking process
│   │
│   ├── css/                         # Stylesheets
│   │   ├── style.css               # Main styles
│   │   ├── auth.css                # Auth pages
│   │   ├── dashboard.css           # Dashboard
│   │   └── provider-dashboard.css  # Provider dashboard
│   │
│   ├── js/                         # JavaScript
│   │   └── auth.js                 # Auth logic
│   │
│   └── images/                     # Images
│
├── backend/                         # 🔧 Backend Application
│   ├── server.js                   # Express app entry
│   ├── package.json                # Dependencies
│   ├── .env.example                # Environment template
│   │
│   ├── config/
│   │   └── database.js             # Prisma client
│   │
│   ├── middleware/
│   │   └── auth.js                 # JWT verification
│   │
│   ├── controllers/                # Business logic
│   │   ├── authController.js       # Auth logic
│   │   ├── googleAuthController.js # Google OAuth
│   │   ├── providerController.js   # Provider management
│   │   ├── bookingController.js    # Booking logic
│   │   ├── chatController.js       # Chat messages
│   │   ├── reviewController.js     # Reviews
│   │   ├── supportController.js    # Support tickets ✨ NEW
│   │   ├── notificationController.js # Notifications
│   │   └── adminController.js      # Admin functions
│   │
│   ├── routes/                     # API routes
│   │   ├── authRoutes.js          # Auth endpoints
│   │   ├── providerRoutes.js      # Provider endpoints
│   │   ├── bookingRoutes.js       # Booking endpoints
│   │   ├── chatRoutes.js          # Chat endpoints
│   │   ├── reviewRoutes.js        # Review endpoints
│   │   ├── supportRoutes.js       # Support endpoints ✨ NEW
│   │   ├── notificationRoutes.js  # Notification endpoints
│   │   ├── adminRoutes.js         # Admin endpoints
│   │   └── userRoutes.js          # User endpoints
│   │
│   └── prisma/                     # Database
│       ├── schema.prisma          # Database schema
│       └── migrations/            # Migration files
│
├── docs/                           # Documentation
│   ├── API.md                     # API documentation
│   └── README.md                  # Setup guide
│
└── README files (Documentation)
    ├── PRODUCTION_CHECKLIST.md           # Pre-deployment
    ├── FINAL_VERIFICATION.md            # System verification
    ├── DEPLOYMENT_QUICK_START.md        # Quick deployment
    └── This file                         # Complete guide
```

---

## 🚀 GETTING STARTED

### Prerequisites
- Node.js (v14+)
- MySQL database (local or hosted)
- GitHub account
- Netlify account
- Render account
- Google OAuth credentials

### Local Setup (Development)

#### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/cheapflix-nepal.git
cd cheapflix-nepal
```

#### 2. Setup Backend
```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your values:
# - DATABASE_URL: mysql://user:password@localhost:3306/cheapflix
# - JWT_SECRET: any-random-string
# - GOOGLE_CLIENT_ID: from Google Console

# Setup database
npx prisma generate
npx prisma migrate deploy

# Start backend
npm start
# Server runs on http://localhost:5000
```

#### 3. Test Frontend
```bash
# Open in browser: frontend/index.html
# Or use a local server:
npx http-server frontend -p 8080

# Visit: http://localhost:8080
```

---

## 🎨 FRONTEND GUIDE

### Key Files

**`frontend/config.js`** - API Configuration
```javascript
// Automatically detects environment
// Sets correct API base URL (localhost or production)
// Provides global getApiUrl() function
```

**`frontend/index.html`** - Homepage
- Dynamic provider loading from API
- Categories browsing
- "How it Works" process
- Testimonials section
- Support tickets CTA
- Responsive design

**`frontend/pages/login.html`** - Login Page
- Email/password tabs
- Google OAuth button
- Form validation
- Password visibility toggle
- Auto-redirect on success

**`frontend/pages/register.html`** - Registration
- Email input
- Password strength validation
- Role selection (User/Provider)
- Provider-specific fields
- Google registration option

**`frontend/pages/dashboard.html`** - User Dashboard
- Profile section
- Bookings display
- Chat with providers
- Support tickets link
- Settings

**`frontend/pages/support.html`** - Support Tickets
- Create new tickets
- View ticket history
- Add replies
- Status tracking
- Admin ticket management

### CSS Styling

All styling in `frontend/css/style.css`:
- CSS variables for colors and spacing
- Responsive breakpoints (768px for mobile)
- Gradient backgrounds
- Smooth animations
- Modern UI components

### JavaScript Functions

Key utility functions:
```javascript
// Get API URL based on environment
getApiUrl(endpoint)

// Generate initials for avatar
getInitials(firstName, lastName)

// Format rating display
formatRating(rating)

// Fetch and display providers
loadProviders()
displayProviders(providers)
```

---

## 🔧 BACKEND GUIDE

### Architecture

**Express.js Server Structure**:
1. Middleware (CORS, JSON parsing, auth)
2. Routes (API endpoints)
3. Controllers (Business logic)
4. Database (Prisma ORM)

### Middleware (`backend/middleware/auth.js`)

```javascript
authMiddleware        // Verify JWT token
adminMiddleware       // Verify admin role
providerMiddleware    // Verify provider role
```

### Controllers

Each controller handles specific domain:
- `authController.js` - Login/signup logic
- `googleAuthController.js` - Google OAuth verification
- `providerController.js` - Provider management
- `bookingController.js` - Booking operations
- `supportController.js` - Support ticket logic
- `chatController.js` - Message handling
- `reviewController.js` - Review creation
- And more...

### Error Handling

All controllers use try-catch:
```javascript
try {
  // Business logic
  res.json({ success: true, data: result });
} catch (error) {
  // Proper HTTP status codes
  res.status(500).json({ error: error.message });
}
```

---

## 💾 DATABASE GUIDE

### Prisma ORM

All database queries use Prisma:
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Deploy migrations
npx prisma migrate deploy

# View data in GUI
npx prisma studio
```

### Database Models

**User**
- Email, password (hashed)
- firstName, lastName
- Phone, address, city
- role: user/provider/admin
- status: active/inactive/suspended

**Provider**
- userId (linked to User)
- category (Electrician, Plumber, etc.)
- bio, experience, rating
- verified (true/false)
- documents (JSON)

**Service**
- providerId
- name, description
- price per hour
- availability

**Booking**
- customerId, providerId, serviceId
- date, time, duration
- status: pending/confirmed/completed/cancelled
- paymentStatus: unpaid/paid/refunded

**SupportTicket** ✨ NEW
- userId, title, description
- category: bug/feedback/payment/other
- priority: low/medium/high
- status: open/in_progress/resolved/closed

**TicketMessage** ✨ NEW
- ticketId, senderId
- message (text)
- attachment (optional)
- createdAt

### Relationships

All models properly related with:
- Foreign key constraints
- Cascade delete for data integrity
- Indexes on foreign keys for performance

---

## 📡 API REFERENCE

### Authentication Endpoints

**POST /api/auth/register**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"  // or "provider"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**POST /api/auth/google**
```json
{
  "token": "google-jwt-token-from-frontend"
}
```

### Provider Endpoints

**GET /api/providers** (Public - verified only)
Returns: Array of providers with ratings, services, availability

**POST /api/providers** (Protected)
Create provider profile

**PATCH /api/providers/:id** (Protected)
Update provider info

### Support Endpoints

**POST /api/support** (Protected)
Create support ticket

**GET /api/support** (Protected)
Get user's tickets

**GET /api/support/:id** (Protected)
Get ticket details

**POST /api/support/:id/messages** (Protected)
Add reply to ticket

### All Endpoints
- 50+ total endpoints
- Complete list in `docs/API.md`

---

## 🚀 DEPLOYMENT

### Pre-Deployment Checklist
- [ ] .env configured with production values
- [ ] Database migrations applied
- [ ] All tests passing
- [ ] No console errors
- [ ] Google OAuth credentials set
- [ ] CORS configured

### Deploy to Netlify (Frontend)
```
1. Push to GitHub
2. Connect repository to Netlify
3. Set build directory: frontend
4. Auto-deploying on every push
```

### Deploy to Render (Backend)
```
1. Push to GitHub
2. Create Web Service on Render
3. Set environment variables
4. Start command: node backend/server.js
5. Auto-deploying on every push
```

See `DEPLOYMENT_QUICK_START.md` for detailed steps.

---

## 🐛 TROUBLESHOOTING

### Backend Issues

**Problem**: Server won't start
```bash
# Check if port 5000 is in use
# Kill process: lsof -i :5000 | kill -9 <PID>
# Or change PORT in .env
```

**Problem**: Database connection fails
```bash
# Verify DATABASE_URL is correct
# Check MySQL is running
# Verify credentials are valid
```

**Problem**: Migrations fail
```bash
# Re-run migrations
npx prisma migrate reset  # WARNING: Clears data
npx prisma migrate deploy
```

### Frontend Issues

**Problem**: API calls failing (CORS error)
```
1. Check backend is running
2. Verify CORS origin in server.js
3. Check config.js has correct backend URL
```

**Problem**: Login not working
```
1. Check token is stored in localStorage
2. Verify backend returns valid JWT
3. Clear localStorage and try again
```

**Problem**: Providers not showing
```
1. Test /api/providers endpoint directly
2. Check database has provider data
3. Verify database connection
```

### Deployment Issues

**Problem**: Netlify build fails
```
1. Check netlify.toml configuration
2. Verify frontend folder structure
3. Check for missing dependencies
```

**Problem**: Render deployment fails
```
1. Check start command is correct
2. Verify environment variables are set
3. Check logs in Render dashboard
```

---

## 📊 MONITORING

### Health Check
```bash
# Test backend is running
curl https://YOUR_BACKEND/api/health

# Should return: {"status": "Server is running ✅"}
```

### Database Backup
```bash
# Regular backups recommended
# Use Render's automatic backups
# Or manual export from MySQL
```

### Error Logs
```
Frontend: Browser Console (F12)
Backend: Render Dashboard Logs
Database: MySQL Error Logs
```

---

## 📝 MAINTENANCE

### Regular Tasks
- [ ] Monitor error logs weekly
- [ ] Backup database monthly
- [ ] Update dependencies quarterly
- [ ] Review security logs regularly
- [ ] Test all features monthly

### Common Updates
```bash
# Update dependencies
npm update

# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

---

## 🎓 LEARNING RESOURCES

### Topics Covered
- Express.js basics
- JWT authentication
- Prisma ORM
- Google OAuth
- RESTful APIs
- Responsive web design
- Database design
- Security best practices

### External Resources
- [Express.js Documentation](https://expressjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)
- [JWT.io](https://jwt.io)

---

## 🎯 NEXT STEPS

After deployment, consider:

1. **Phase 2 Features**
   - Payment integration (Stripe/Khalti)
   - Email notifications
   - SMS reminders
   - Mobile app (React Native)

2. **Optimization**
   - Add caching layer
   - Implement CDN
   - Database query optimization
   - Image optimization

3. **Growth**
   - Analytics dashboard
   - Marketing automation
   - Influencer partnerships
   - Regional expansion

---

## 📞 SUPPORT

For issues or questions:
1. Check this guide first
2. Review `FINAL_VERIFICATION.md`
3. Check browser console (F12)
4. Check backend logs (Render)
5. Review database status

---

## 📄 LICENSE

Cheapflix Nepal © 2025. All rights reserved.

---

## ✅ DOCUMENTATION CHECKLIST

- [x] System architecture documented
- [x] Project structure explained
- [x] Setup instructions provided
- [x] API endpoints documented
- [x] Deployment guide created
- [x] Troubleshooting guide included
- [x] Database schema explained
- [x] Security notes included
- [x] Performance tips provided
- [x] Future roadmap outlined

---

**Last Updated**: 2026-06-14  
**Version**: 1.0.0  
**Status**: 🟢 Production Ready  
**Maintained By**: Development Team

