# DEPLOYMENT GUIDE - CHEAPFLIX NEPAL

## 🚀 STEP 1: DEPLOY BACKEND TO RENDER.COM (FREE)

### 1.1 Create Render Account
- Go to https://render.com
- Sign up (free account)
- Connect your GitHub account

### 1.2 Deploy Backend
1. Push your code to GitHub
2. Go to Render Dashboard → New → Web Service
3. Connect your GitHub repo
4. Fill in:
   - **Name**: cheapflix-nepal-backend
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma migrate deploy && npx prisma generate`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 1.3 Add Environment Variables in Render
Go to Environment → Add these variables:

```
DATABASE_URL=postgresql://user:password@your-db-host/cheapflix
NODE_ENV=production
JWT_SECRET=generate_a_random_strong_secret_here
PORT=5000
CORS_ORIGIN=https://your-netlify-domain.netlify.app
```

### 1.4 Get Your Render Backend URL
After deployment, you'll get a URL like: `https://cheapflix-nepal-backend.onrender.com`

---

## 🎨 STEP 2: DEPLOY FRONTEND TO NETLIFY

### 2.1 Update Frontend Config
Before deploying, update `frontend/config.js` to use your Render backend URL:

```javascript
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:5000/api'
  : 'https://cheapflix-nepal-backend.onrender.com/api';  // ← UPDATE THIS
window.getApiUrl = (endpoint) => API_BASE_URL + endpoint;
```

### 2.2 Deploy to Netlify
1. Go to https://netlify.com (login with your account)
2. Click "Add New Site" → "Deploy Manually"
3. Drag & drop the `frontend` folder
4. Netlify will deploy it automatically

Or connect to GitHub:
1. Create a GitHub repo with the `frontend` folder
2. In Netlify: New Site → Import from Git
3. Deploy settings:
   - **Base directory**: `frontend`
   - **Build command**: (leave empty)
   - **Publish directory**: `.` (current directory)

### 2.3 Connect Your Domain
1. In Netlify, go to Domain Management
2. Add your domain
3. Follow DNS setup instructions

---

## 📊 STEP 3: DATABASE SETUP (Choose One)

### Option A: Use Render PostgreSQL (Easiest)
1. In Render Dashboard → New → PostgreSQL
2. Copy the `DATABASE_URL`
3. Use this in your Render backend environment variables

### Option B: Use Railway (Also Free)
1. Go to railway.app
2. Create new project
3. Add PostgreSQL
4. Copy connection string

### Option C: Use Managed MySQL
1. PlanetScale (MySQL) - free tier available
2. Supabase (PostgreSQL) - free tier available

---

## ✅ FINAL CHECKLIST

- [ ] Backend deployed on Render
- [ ] Frontend deployed on Netlify
- [ ] Domain connected to Netlify
- [ ] Environment variables set in Render
- [ ] Database URL configured
- [ ] Frontend config.js points to Render backend
- [ ] Test login functionality
- [ ] Test booking flow
- [ ] Test chat feature

---

## 🔗 LINKS YOU'LL GET

After deployment:
1. **Frontend URL**: `https://your-domain.com` (or your-site.netlify.app)
2. **Backend API**: `https://cheapflix-nepal-backend.onrender.com/api`
3. **Database**: Connected automatically

---

## 📝 PRODUCTION NOTES

1. **Never commit `.env` files** - use environment variables in hosting platforms only
2. **Keep JWT_SECRET secure** - generate a random string
3. **Test everything** - sign up, book, chat before going live
4. **Monitor performance** - Render free tier sleeps after 15 mins of inactivity
5. **Database backups** - set up automatic backups for production

---

## 🆘 TROUBLESHOOTING

**Q: Backend returns CORS error**
A: Add your Netlify domain to CORS_ORIGIN in Render environment

**Q: Messages not loading**
A: Check DATABASE_URL is correct in Render env vars

**Q: API calls 404**
A: Verify frontend config.js points to correct Render URL

**Q: Free tier sleeping**
A: Upgrade to paid or use uptime monitor (Uptimerobot)
