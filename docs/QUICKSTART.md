# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Setup MySQL Database
```sql
CREATE DATABASE cheapflix_nepal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Update `backend/.env`:
```
DATABASE_URL="mysql://root:your_password@localhost:3306/cheapflix_nepal"
JWT_SECRET="your_secret_key"
PORT=5000
```

### Step 3: Run Prisma Migrations
```bash
cd backend
npx prisma migrate dev --name init
```

### Step 4: Start Backend Server
```bash
cd backend
npm run dev
```
✅ Server running on http://localhost:5000

### Step 5: Open Frontend
Option A - Direct file:
- Open `frontend/pages/index.html` in browser

Option B - Local Server:
```bash
cd frontend
python -m http.server 8000
# Visit: http://localhost:8000/pages/index.html
```

---

## 📋 Default Credentials (after setup)

Create your own account at `/pages/register.html`

---

## 🔑 User Roles

1. **Customer** - Books services
2. **Provider** - Offers services  
3. **Admin** - Manages system

---

## 📱 Pages Available

- `/pages/index.html` - Landing page
- `/pages/login.html` - Login
- `/pages/register.html` - Registration
- `/pages/dashboard.html` - Customer dashboard
- `/pages/provider-dashboard.html` - Provider dashboard
- `/pages/admin-dashboard.html` - Admin dashboard
- `/pages/booking-flow.html` - Service booking flow (existing)

---

## 🆘 Troubleshooting

**Database Error?**
- Ensure MySQL is running
- Check DATABASE_URL in `.env`
- Run migrations: `npx prisma migrate dev`

**Login not working?**
- Backend must be running on port 5000
- Check browser console for errors
- Verify credentials

**Port 5000 already in use?**
- Change PORT in `.env` to different number
- Update frontend `API_BASE_URL` accordingly

---

## 📚 Helpful Commands

```bash
# View database
npx prisma studio

# Generate Prisma client
npx prisma generate

# Reset database (caution!)
npx prisma migrate reset

# View migrations
npx prisma migrate status
```

---

## ✨ Features Ready to Use

✅ User Registration & Login
✅ JWT Authentication
✅ Three Dashboard Types
✅ Booking Management
✅ Reviews & Ratings
✅ Provider Verification
✅ Admin Panel

---

## 🎯 Next Steps

1. Test login with new account
2. Explore dashboards
3. Check API documentation in `/docs/API.md`
4. Start implementing features

Enjoy coding! 🎉
