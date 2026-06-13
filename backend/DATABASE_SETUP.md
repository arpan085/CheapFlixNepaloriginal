# 🚀 Cheapflix Nepal Database Setup Guide

## 1. Prerequisites

Make sure you have installed:
- **Node.js** (v14 or higher)
- **MySQL 8.0+** (or MySQL Community Server)
- **npm** (comes with Node.js)

## 2. Database Setup

### Step 1: Create MySQL Database

Open MySQL terminal (Command Prompt or MySQL Workbench):

```sql
-- Create database
CREATE DATABASE cheapflix_nepal;
```

### Step 2: Update Environment Variables

In your `backend/.env` file, update the DATABASE_URL:

```env
DATABASE_URL="mysql://root:password@localhost:3306/cheapflix_nepal"
```

**Replace:**
- `root` - Your MySQL username
- `password` - Your MySQL password
- `localhost:3306` - Your MySQL host and port (default: localhost:3306)
- `cheapflix_nepal` - Your database name

## 3. Install Dependencies & Run Migrations

Navigate to backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

### Initialize Prisma & Create Tables

First time setup (creates migrations folder):

```bash
npx prisma migrate dev --name init
```

This command will:
- Create migration files
- Run SQL to create all tables in MySQL
- Generate Prisma Client

**For future schema changes**, run:

```bash
npx prisma migrate dev --name "description_of_change"
```

Example:
```bash
npx prisma migrate dev --name "add notification model"
```

## 4. Verify Database Setup

### Option A: Using Prisma Studio (Visual Inspector)

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all tables and data
- Create/edit/delete records
- Test your schema

### Option B: Using MySQL Command Line

```sql
-- Connect to your database
USE cheapflix_nepal;

-- View all tables
SHOW TABLES;

-- View specific table structure
DESCRIBE User;
```

## 5. Database Schema Overview

Your database now has these tables:

| Table | Purpose |
|-------|---------|
| **User** | Store customer & provider accounts |
| **Provider** | Provider profile (extends User) |
| **Service** | Services offered by providers |
| **Booking** | Service booking records |
| **Notification** | Booking request notifications |
| **Review** | Customer reviews for completed bookings |
| **Admin** | Admin user accounts |

### Key Relationships:

```
User (1) ──────→ (Many) Booking
User (1) ──────→ (1) Provider
Provider (1) ───→ (Many) Service
Provider (1) ───→ (Many) Booking
Booking (1) ────→ (1) Service
Booking (1) ────→ (Many) Notification
Notification (1)→ (1) Booking, Provider, User
```

## 6. Start the Backend Server

```bash
npm start
```

Expected output:
```
✅ Server running on http://localhost:5000
```

## 7. API Endpoints Available

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/me` - Get current user

### Bookings
- `POST /api/bookings` - Create new booking (triggers notification)
- `GET /api/bookings/user/:userId` - Get user's bookings
- `GET /api/bookings/provider/:providerId` - Get provider's bookings
- `GET /api/bookings/:bookingId` - Get booking details

### Notifications (NEW)
- `GET /api/notifications/user/:userId` - Get all notifications for provider
- `GET /api/notifications/:notificationId` - Get single notification
- `POST /api/notifications/:notificationId/accept` - Accept booking
- `POST /api/notifications/:notificationId/reject` - Reject booking
- `PATCH /api/notifications/:notificationId/read` - Mark as read
- `GET /api/notifications/unread/:userId` - Get unread count

## 8. Testing the Notification Flow

### Test Workflow:

```
1. Create Provider Account
   POST /api/auth/register
   - Role: provider

2. Create Customer Account
   POST /api/auth/register
   - Role: user

3. Create Booking (As Customer)
   POST /api/bookings
   - This automatically creates notification for provider

4. Check Notifications (As Provider)
   GET /api/notifications/user/:providerId

5. Accept Booking (As Provider)
   POST /api/notifications/:notificationId/accept
   - Booking status changes to "confirmed"
   - Customer gets notification

6. Alternative: Reject Booking (As Provider)
   POST /api/notifications/:notificationId/reject
   - Booking status changes to "cancelled"
   - Customer gets notification
```

## 9. Troubleshooting

### Error: "connect ECONNREFUSED"
- MySQL service is not running
- **Fix:** Start MySQL service:
  - Windows: `net start MySQL80` (or your version)
  - Mac: `brew services start mysql`
  - Linux: `sudo systemctl start mysql`

### Error: "Access denied for user 'root'@'localhost'"
- Wrong MySQL credentials in .env
- **Fix:** Update `DATABASE_URL` with correct username/password

### Error: "Database 'cheapflix_nepal' doesn't exist"
- Database not created
- **Fix:** Run the SQL command in Step 2 again

### Prisma Client Out of Date
```bash
# Regenerate Prisma Client
npx prisma generate
```

## 10. Database Backup (Optional)

### Backup your database:

```bash
mysqldump -u root -p cheapflix_nepal > backup.sql
```

### Restore from backup:

```bash
mysql -u root -p cheapflix_nepal < backup.sql
```

## 11. Resetting Database (Development Only)

⚠️ **Warning: This deletes all data**

```bash
npx prisma migrate reset
```

This command will:
- Delete database
- Recreate database
- Run all migrations
- Reset to fresh state

---

## Quick Start Commands

```bash
# 1. Setup
cd backend
npm install

# 2. First time: Create database and run migrations
npx prisma migrate dev --name init

# 3. Start server
npm start

# 4. View data (optional)
npx prisma studio
```

Your database is now ready! 🎉
