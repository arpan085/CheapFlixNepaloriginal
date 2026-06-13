# Cheapflix Nepal - Full Project Setup

## Project Structure

```
cheapflix-nepal/
├── backend/                    # Node.js + Express Backend
│   ├── config/                # Configuration files
│   │   └── database.js        # Prisma database setup
│   ├── controllers/           # Business logic
│   │   └── authController.js  # Authentication logic
│   ├── routes/               # API routes
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── providerRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── reviewRoutes.js
│   │   └── adminRoutes.js
│   ├── middleware/           # Express middleware
│   │   └── auth.js           # Authentication middleware
│   ├── prisma/              # Prisma ORM
│   │   └── schema.prisma    # Database schema
│   ├── uploads/             # File uploads directory
│   ├── .env                 # Environment variables
│   ├── .env.example         # Example environment file
│   ├── package.json         # Dependencies
│   └── server.js            # Express server entry point
│
├── frontend/                 # Frontend (HTML/CSS/JS)
│   ├── pages/              # HTML pages
│   │   ├── index.html          # Landing page
│   │   ├── login.html          # Login page
│   │   ├── register.html       # Registration page
│   │   ├── dashboard.html      # User dashboard
│   │   ├── provider-dashboard.html    # Provider dashboard
│   │   ├── admin-dashboard.html       # Admin dashboard
│   │   └── booking-flow.html   # Booking flow (moved from folder/)
│   ├── css/                # Stylesheets
│   │   ├── style.css           # Global styles
│   │   ├── landing.css         # Landing page styles
│   │   ├── auth.css            # Auth pages styles
│   │   ├── dashboard.css       # Dashboard styles
│   │   ├── provider-dashboard.css
│   │   └── admin-dashboard.css
│   ├── js/                 # JavaScript
│   │   └── auth.js             # Authentication utilities
│   └── images/             # Images directory
│
└── docs/                   # Documentation

```

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
```

### 2. Database Setup

- Install MySQL 8.0+
- Create a database:
  ```sql
  CREATE DATABASE cheapflix_nepal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

- Update `.env` with your MySQL credentials

### 3. Prisma Migrations

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npx prisma studio  # View database in browser
```

### 4. Start Backend Server

```bash
cd backend
npm run dev
```
Server runs on `http://localhost:5000`

### 5. Frontend Setup

- No build step required
- Open `frontend/pages/index.html` in browser
- Or use a local server:
  ```bash
  python -m http.server 8000
  # or
  npx serve frontend
  ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires token)

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Providers
- `GET /api/providers` - List all providers
- `GET /api/providers/:id` - Get provider details

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my-bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get booking details

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/provider/:providerId` - Get provider reviews

### Admin
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/users` - List all users
- `PUT /api/admin/providers/:id/verify` - Verify provider

## Login Test Credentials

For testing, register new accounts at `/pages/register.html`

User Types:
- **Customer**: Regular user who books services
- **Provider**: Service provider offering services
- **Admin**: System administrator (register as customer first, then update in database)

## Features Implemented

✅ User Registration & Login
✅ Email/Password Authentication
✅ JWT Token-based sessions
✅ Three user roles: Customer, Provider, Admin
✅ User Dashboard
✅ Provider Dashboard
✅ Admin Dashboard
✅ Booking Management System
✅ Reviews & Ratings
✅ Database schema with Prisma ORM
✅ API structure

## Features To Implement

- [ ] Email verification
- [ ] Password reset
- [ ] File uploads (provider documents)
- [ ] Payment gateway integration
- [ ] Real-time notifications
- [ ] Chat system
- [ ] Service management
- [ ] Admin analytics
- [ ] Mobile app

## Environment Variables (.env)

```
DATABASE_URL="mysql://user:password@localhost:3306/cheapflix_nepal"
JWT_SECRET="your_secret_key_here"
JWT_EXPIRE="7d"
PORT=5000
NODE_ENV="development"
```

## Troubleshooting

**Login not working?**
- Check if backend server is running on port 5000
- Verify `.env` file has correct database connection
- Check browser console for errors

**Database connection error?**
- Ensure MySQL is running
- Verify DATABASE_URL in `.env`
- Run `npx prisma migrate dev`

**CORS errors?**
- Backend CORS is already enabled
- Check if you're using correct API base URL

## Next Steps

1. Integrate payment gateway (eSewa, Khalti, etc.)
2. Add email notifications
3. Implement booking status updates
4. Add provider verification documents
5. Create admin reporting system
6. Set up error logging and monitoring

---

For more help, check individual files for inline comments.
