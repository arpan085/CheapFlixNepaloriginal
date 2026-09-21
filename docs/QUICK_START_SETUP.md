# 🚀 CHEAPFLIX NEPAL - QUICK START GUIDE

## Prerequisites

Before you start, make sure you have:

- ✅ **Node.js** (v14+) - [Download](https://nodejs.org/)
- ✅ **MySQL** (v5.7+) - [Download](https://www.mysql.com/downloads/)
- ✅ **Git** (optional but recommended) - [Download](https://git-scm.com/)
- ✅ A code editor (VS Code recommended)

---

## STEP 1: Prepare the Database

### Create MySQL Database

Open MySQL command line and run:

```sql
CREATE DATABASE cheapflix_nepal;
```

Or use MySQL Workbench to create a new database named `cheapflix_nepal`.

**Verify:**
```sql
SHOW DATABASES;
-- Should see: cheapflix_nepal
```

---

## STEP 2: Setup Backend

### Windows Users:

1. Open Command Prompt
2. Navigate to project folder:
   ```
   cd "d:\CHEAPFLIX NEPAL\backend"
   ```
3. Run setup script:
   ```
   setup.bat
   ```
4. **Wait for "✅ SETUP COMPLETE!" message**

### Mac/Linux Users:

1. Open Terminal
2. Navigate to project folder:
   ```
   cd d:/CHEAPFLIX\ NEPAL/backend
   ```
3. Make script executable:
   ```
   chmod +x setup.sh
   ```
4. Run setup script:
   ```
   bash setup.sh
   ```
5. **Wait for "✅ SETUP COMPLETE!" message**

### Manual Setup (If Scripts Fail):

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
node seed.js
```

---

## STEP 3: Start Backend Server

```bash
npm start
```

You should see:
```
✅ Server is running on port 5000
✅ Database connected
```

**Test it:** Open browser and visit `http://localhost:5000/api/health`

Should show: `{ status: "Server is running ✅" }`

---

## STEP 4: Open Frontend

Simply open the landing page in your browser:

```
d:\CHEAPFLIX NEPAL\frontend\pages\index.html
```

Or copy the file path and paste in browser address bar.

---

## STEP 5: Login to System

### Login as Admin:

1. Click **Login** on homepage
2. Enter credentials:
   - **Email:** `admin@cheapflix.com`
   - **Password:** `admin@123`
3. Click **Login**
4. You'll be redirected to **Admin Dashboard**

### Admin Dashboard Features:
- 👥 View all users
- 🔧 Approve/verify providers
- 📅 View all bookings
- 💰 See revenue statistics
- 📊 Dashboard overview

### Test Customer Login:

1. Go back to home page
2. Click **Register**
3. Select "I'm a Customer" 
4. Enter details:
   ```
   First Name: John
   Last Name: Doe
   Email: john@example.com
   Phone: 9841234567
   Password: password123
   ```
5. Click **Register**
6. You'll be logged in automatically

### Test Provider Login:

1. Go back to home page
2. Click **Register**
3. Select "I'm a Service Provider"
4. Enter details:
   ```
   First Name: Ram
   Last Name: Kumar
   Email: ram@example.com
   Phone: 9841234567
   Service Category: Electrician
   Price/Hour: 500
   Experience: 5 years
   Bio: Experienced electrician
   Password: password123
   ```
5. Click **Register**
6. Complete the 3-step onboarding

---

## TESTING THE SYSTEM

### Test Booking Flow:

1. **Login as Customer** (use test account created above)
2. Go to **Dashboard**
3. Click **Book a Service**
4. Select a provider (e.g., Rajesh)
5. Choose date, time, duration
6. Review and confirm
7. ✅ Booking created!

### Test Admin Panel:

1. **Login as Admin** (admin@cheapflix.com)
2. Browse sections:
   - **Overview** - See stats
   - **Users** - See all customers
   - **Providers** - Approve/verify providers
   - **Bookings** - See all bookings
   - **Services** - See all services

### Test Provider Dashboard:

1. **Login as Provider** (any provider email)
2. See:
   - 📊 Overview stats
   - 📅 Bookings received
   - 🎯 Services offered
   - ⭐ Reviews (if any)
   - 👤 Profile settings

---

## USEFUL COMMANDS

### Backend Commands:

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run database migrations
npx prisma migrate dev --name init

# Reset database (CAREFUL!)
npx prisma migrate reset

# Seed test data
node seed.js

# View database (Prisma Studio)
npx prisma studio

# Generate Prisma client
npx prisma generate
```

### Testing API with cURL:

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cheapflix.com","password":"admin@123"}'

# Get all providers (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:5000/api/providers
```

---

## TROUBLESHOOTING

### ❌ "Can't connect to MySQL"

**Solution:**
1. Verify MySQL is running (Windows Task Manager → Services)
2. Check `.env` DATABASE_URL is correct
3. Default should be: `mysql://root:85arpan85@localhost:3306/cheapflix_nepal`
4. If password is different, update `.env`

### ❌ "PORT 5000 already in use"

**Solution:**
```bash
# Windows - Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

Then restart server: `npm start`

### ❌ "Module not found"

**Solution:**
```bash
cd backend
npm install
```

### ❌ "Prisma migration error"

**Solution:**
```bash
# Reset and retry
npx prisma migrate reset --force
node seed.js
```

### ❌ "Frontend shows 'No data found'"

**Solution:**
1. Verify backend is running: `http://localhost:5000/api/health`
2. Check if logged in (token in localStorage)
3. Open browser DevTools (F12) → Console tab → check for errors
4. Verify `.env` has correct DATABASE_URL

### ❌ "Can't login with admin account"

**Solution:**
1. Verify database is seeded: `node seed.js`
2. Check `.env` has JWT_SECRET set
3. Look for errors in backend console
4. Try resetting password by editing directly in database

---

## FILE STRUCTURE

```
CHEAPFLIX NEPAL/
├── backend/
│   ├── server.js                 # Main server file
│   ├── package.json              # Dependencies
│   ├── .env                       # Configuration
│   ├── setup.bat                  # Windows setup script
│   ├── setup.sh                   # Mac/Linux setup script
│   ├── seed.js                    # Database seeding
│   ├── config/
│   │   └── database.js            # Prisma client
│   ├── controllers/               # Business logic
│   ├── routes/                    # API routes
│   ├── middleware/                # Auth, validation
│   └── prisma/
│       └── schema.prisma          # Database schema
│
├── frontend/
│   ├── pages/
│   │   ├── index.html             # Landing page
│   │   ├── login.html             # Login page
│   │   ├── register.html          # Registration
│   │   ├── dashboard.html         # Customer dashboard
│   │   ├── admin-dashboard.html   # Admin panel
│   │   ├── provider-dashboard.html # Provider panel
│   │   └── booking-flow.html      # Booking wizard
│   ├── js/
│   │   └── auth.js                # Auth utilities
│   └── css/                        # Stylesheets
│
└── docs/
    ├── API.md                      # API documentation
    ├── README.md                   # Project info
    └── FIXES_APPLIED.md            # This file
```

---

## API BASE URL

All API requests go to:
```
http://localhost:5000/api
```

**Example:**
- Register: `POST http://localhost:5000/api/auth/register`
- Login: `POST http://localhost:5000/api/auth/login`
- Providers: `GET http://localhost:5000/api/providers`

---

## AUTHENTICATION HEADERS

For protected endpoints, include:
```
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json
```

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
     -H "Content-Type: application/json" \
     http://localhost:5000/api/bookings
```

---

## ENVIRONMENT VARIABLES (.env)

Located at: `backend/.env`

```ini
# Database
DATABASE_URL="mysql://root:85arpan85@localhost:3306/cheapflix_nepal"

# JWT
JWT_SECRET="cheapflix_nepal_secret_key_2026"
JWT_EXPIRE="7d"

# Server
PORT=5000
NODE_ENV="development"
```

⚠️ **IMPORTANT:** Change these values in production!

---

## NEXT STEPS

1. ✅ Setup database
2. ✅ Run setup script
3. ✅ Start backend (`npm start`)
4. ✅ Open frontend in browser
5. ✅ Login with admin account
6. ✅ Create test bookings
7. ✅ Explore dashboard features

---

## SUPPORT

If you encounter issues:

1. **Check browser console** (F12)
2. **Check backend terminal** for error messages
3. **Verify all prerequisites installed**
4. **Read FIXES_APPLIED.md** for technical details
5. **Check troubleshooting section above**

---

## FEATURES INCLUDED

✅ User Registration & Login
✅ Admin Dashboard
✅ Provider Management
✅ Booking System
✅ Services Management
✅ Real-time Stats
✅ Role-based Access
✅ JWT Authentication
✅ Responsive UI
✅ Database Migrations

---

**🎉 Happy Coding! System is ready to use! 🎉**

Last Updated: June 13, 2026
