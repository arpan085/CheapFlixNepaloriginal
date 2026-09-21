# QUICK ACTION GUIDE - DEPLOY NOW

## 🚀 IMMEDIATE ACTIONS

### Step 1: Run Database Migration (Required)
```bash
cd backend
npx prisma migrate dev --name add_support_tickets
```

### Step 2: Install Google Auth Library
```bash
cd backend
npm install google-auth-library
```

### Step 3: Update Backend Environment
Add to `.env`:
```
GOOGLE_CLIENT_ID=your-client-id
```

### Step 4: Restart Backend Server
```bash
npm start
```

---

## 🧪 LOCAL TESTING

### Test 1: Check Providers Load
1. Go to `http://localhost:3000` (frontend)
2. Scroll to "Trusted Professionals" section
3. Should see providers loading from API
4. If empty, check admin dashboard to verify providers exist

### Test 2: Test Google Login (Optional for now)
1. Go to login page
2. Google button should appear
3. You'll need actual Google Client ID to test
4. For now, use email/password login

### Test 3: Create Support Ticket
1. Login to dashboard
2. Click "Support Tickets" link in sidebar
3. Click "Create New Ticket"
4. Fill in form and submit
5. Should appear in "My Tickets"
6. Click ticket to view details

### Test 4: Check Dashboard Bookings
1. Create a booking from homepage
2. Go to dashboard
3. Should see booking in "My Bookings"

---

## 🌐 PRODUCTION DEPLOYMENT

### For Netlify (Frontend)
```bash
cd frontend
npm run build  # or just push to GitHub
```
Netlify auto-deploys. All changes are live.

### For Render (Backend)
1. Push code to GitHub
2. Render auto-deploys
3. Or manually trigger deploy in Render dashboard

### For MySQL (Database)
Render syncs automatically with Prisma migrations.

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] Database migration completed locally
- [ ] Google Auth library installed
- [ ] Environment variables set
- [ ] Tested providers display locally
- [ ] Tested support tickets locally
- [ ] Pushed to GitHub
- [ ] Frontend deployed to Netlify
- [ ] Backend deployed to Render
- [ ] Database migration applied to production
- [ ] Tested login/registration in production
- [ ] Tested support tickets in production

---

## ⚡ QUICK FIX COMMANDS

### If providers not showing:
```bash
# Check database
npx prisma studio

# Verify provider exists with verified=true
# Create test provider if needed:
node backend/seed.js
```

### If support page breaks:
```bash
# Ensure migration ran
npx prisma migrate status

# If issues, reset (WARNING - clears data):
npx prisma migrate reset
```

### If Google OAuth not working:
```bash
# Check environment variable is set
echo $GOOGLE_CLIENT_ID

# Update in .env file
# Restart backend server
npm start
```

---

## 📞 SUPPORT TICKET TESTING

1. **Create Ticket**:
   - Go to `/pages/support.html`
   - Fill form: Subject, Category, Priority, Description
   - Click "Create Ticket"

2. **View Tickets**:
   - Tickets appear in "My Tickets" section
   - Click any ticket to view details

3. **Add Message**:
   - In ticket modal, type in textarea
   - Click "Send Reply"
   - Message appears immediately

4. **Track Status**:
   - Status badge shows: open, in_progress, resolved, closed
   - Only admin can change status

---

## 🎯 EXPECTED RESULTS

✅ **Homepage**: Real providers display (not fake names)
✅ **Dashboard**: Create booking → appears in "My Bookings"
✅ **Support**: Create ticket → save & retrieve messages
✅ **Login**: Email/Password works
✅ **Google OAuth**: (Once Client ID configured) Google login works

---

## 🔗 URLS TO TEST

- Homepage: `https://cheapflixnepal.netlify.app`
- Support: `https://cheapflixnepal.netlify.app/pages/support.html`
- Dashboard: `https://cheapflixnepal.netlify.app/pages/dashboard.html`
- Login: `https://cheapflixnepal.netlify.app/pages/login.html`

---

## ⚠️ IF SOMETHING BREAKS

1. **Check browser console**: F12 → Console tab
2. **Check network tab**: See API responses
3. **Check backend logs**: `npm start`
4. **Check Render logs**: Render dashboard
5. **Run migration again**: `npx prisma migrate deploy`

---

## 💡 PRO TIPS

1. **Google OAuth**: Get Client ID from Google Cloud Console before deploying
2. **Providers**: Make sure at least 1 provider is verified before testing
3. **Support Tickets**: Test creating, viewing, and replying
4. **Mobile**: Test on phone to ensure responsive design works

---

## 📊 MONITORING

After deployment, monitor:
- User registrations (admin panel)
- Support tickets created (admin panel)
- Provider approvals (admin panel)
- Booking success rate
- Google OAuth success rate

---

You're ready to deploy! Push to GitHub and let the CI/CD pipeline do the rest. 🚀
