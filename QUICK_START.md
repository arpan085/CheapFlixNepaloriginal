# ⚡ Quick Start - Database & Notification Setup

## What Was Added?

✅ **Database Models:**
- `Notification` model for booking requests
- Updated `User`, `Provider`, `Booking` with notification relationships

✅ **Controllers:**
- `notificationController.js` - Handle all notification logic
- `bookingController.js` - Create bookings with notifications

✅ **Routes:**
- `notificationRoutes.js` - Notification API endpoints
- Updated `bookingRoutes.js` - Booking API endpoints

✅ **Documentation:**
- `DATABASE_SETUP.md` - Complete database setup instructions
- `NOTIFICATIONS.md` - API documentation & examples

## Quick Start (5 Steps)

### Step 1: Create MySQL Database

Open MySQL Command Prompt:

```sql
CREATE DATABASE cheapflix_nepal;
```

### Step 2: Update Environment

Check `backend/.env`:

```env
DATABASE_URL="mysql://root:password@localhost:3306/cheapflix_nepal"
```

Update `root` and `password` with your MySQL credentials.

### Step 3: Install & Migrate

```bash
cd backend
npm install
npx prisma migrate dev --name init
```

This creates all database tables.

### Step 4: Start Server

```bash
npm start
```

Expected output:
```
✅ Server running on http://localhost:5000
```

### Step 5: Test the Flow

**Scenario: Customer books → Provider receives notification → Provider accepts/rejects**

### Test in Postman/Browser:

1. **Register Provider**
   ```
   POST http://localhost:5000/api/auth/register
   {
     "email": "provider@test.com",
     "password": "test123",
     "firstName": "Rajesh",
     "lastName": "Maharjan",
     "phone": "9841234567",
     "accountType": "provider"
   }
   ```

2. **Register Customer**
   ```
   POST http://localhost:5000/api/auth/register
   {
     "email": "customer@test.com",
     "password": "test123",
     "firstName": "John",
     "lastName": "Doe",
     "phone": "9849876543",
     "accountType": "user"
   }
   ```

3. **Login as Customer** → Copy `token`
   ```
   POST http://localhost:5000/api/auth/login
   {
     "email": "customer@test.com",
     "password": "test123"
   }
   ```

4. **Create Booking** (Use customer token)
   ```
   POST http://localhost:5000/api/bookings
   Headers: Authorization: Bearer YOUR_TOKEN
   {
     "providerId": "PROVIDER_ID_FROM_REGISTER",
     "serviceId": "any_service_id",
     "date": "2025-06-20",
     "startTime": "10:00 AM",
     "duration": "2 hours",
     "location": "Kathmandu",
     "totalAmount": 1600,
     "paymentMethod": "esewa"
   }
   ```

5. **Login as Provider** → Copy `token`
   ```
   POST http://localhost:5000/api/auth/login
   {
     "email": "provider@test.com",
     "password": "test123"
   }
   ```

6. **Check Notifications** (Use provider token)
   ```
   GET http://localhost:5000/api/notifications/user/PROVIDER_USER_ID
   Headers: Authorization: Bearer PROVIDER_TOKEN
   ```

7. **Accept Booking** (Use provider token)
   ```
   POST http://localhost:5000/api/notifications/NOTIFICATION_ID/accept
   Headers: Authorization: Bearer PROVIDER_TOKEN
   ```

   ✅ Booking status → "confirmed"
   ✅ Customer gets notification

8. **Alternative: Reject Booking**
   ```
   POST http://localhost:5000/api/notifications/NOTIFICATION_ID/reject
   Headers: Authorization: Bearer PROVIDER_TOKEN
   {
     "reason": "I'm not available"
   }
   ```

   ✅ Booking status → "cancelled"
   ✅ Customer gets rejection notification

## Key Features

### Customer Side:
- ✅ Create booking with date, time, duration, payment method
- ✅ Receive notification when provider accepts/rejects
- ✅ View booking status

### Provider Side:
- ✅ Receive notification when customer books
- ✅ View customer details in notification
- ✅ Accept or reject booking
- ✅ See unread notification count

## Database Tables Created

```
✅ User          - Customer & Provider accounts
✅ Provider      - Provider profiles
✅ Service       - Services offered
✅ Booking       - Service bookings
✅ Notification  - Booking notifications (NEW)
✅ Review        - Customer reviews
✅ Admin         - Admin accounts
```

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/bookings` | Create booking |
| `GET` | `/api/notifications/user/:userId` | Get all notifications |
| `POST` | `/api/notifications/:notificationId/accept` | Accept booking |
| `POST` | `/api/notifications/:notificationId/reject` | Reject booking |
| `GET` | `/api/notifications/unread/:userId` | Get unread count |

## Next Steps

1. **Frontend Integration:**
   - Create provider notification page
   - Add accept/reject buttons
   - Show real-time notification count

2. **Real-time Updates (Optional):**
   - Use WebSocket (Socket.io) for instant notifications
   - Update provider dashboard live

3. **Email Notifications (Optional):**
   - Configure SMTP in `.env`
   - Send email when booking request arrives

4. **SMS Notifications (Optional):**
   - Integrate Twilio or similar service
   - Send SMS alerts

## Files Modified/Created

**Created:**
- ✅ `backend/controllers/bookingController.js`
- ✅ `backend/controllers/notificationController.js`
- ✅ `backend/routes/notificationRoutes.js`
- ✅ `backend/DATABASE_SETUP.md`
- ✅ `backend/NOTIFICATIONS.md`
- ✅ This file

**Modified:**
- ✅ `backend/prisma/schema.prisma` (Added Notification model)
- ✅ `backend/routes/bookingRoutes.js` (Updated implementation)
- ✅ `backend/server.js` (Added notification routes)

## Troubleshooting

**Error: "Database doesn't exist"**
```bash
mysql> CREATE DATABASE cheapflix_nepal;
```

**Error: "Access denied"**
- Update DATABASE_URL in .env with correct credentials

**Error: "Prisma client out of date"**
```bash
npx prisma generate
```

**View all data (optional):**
```bash
npx prisma studio
```

Opens `http://localhost:5555` - visual database explorer

---

## Need Help?

📖 **Full Guides:**
- `backend/DATABASE_SETUP.md` - Detailed database setup
- `backend/NOTIFICATIONS.md` - Complete API documentation

💻 **Test Endpoints:**
- Use Postman, Insomnia, or Thunder Client
- Example requests in NOTIFICATIONS.md

🚀 **You're all set!**

Your complete booking + notification system is ready!
