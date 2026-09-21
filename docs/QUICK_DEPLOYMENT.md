# 🚀 QUICK DEPLOYMENT CHECKLIST - 5 MINUTES

## Prerequisites
- GitHub account (for pushing code)
- Render account (free, deploy.render.com)
- Netlify account (you already have this!)

---

## Step 1: Push Code to GitHub (1 min)

```bash
git init
git add .
git commit -m "Initial commit - ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cheapflix-nepal.git
git push -u origin main
```

---

## Step 2: Deploy Backend to Render (2 min)

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Select your GitHub repo
4. Fill in:
   - Name: `cheapflix-nepal-backend`
   - Branch: `main`
   - Build Command: `npm install && npx prisma migrate deploy`
   - Start Command: `npm start`
   - Select **Free Plan**

5. Click "Create Web Service"
6. **Wait for deployment to finish**
7. Copy your Render URL: `https://cheapflix-nepal-backend-XXXXX.onrender.com`

---

## Step 3: Update Frontend Config (1 min)

Edit `frontend/config.js` line 11:
```javascript
const RENDER_BACKEND_URL = 'https://cheapflix-nepal-backend-XXXXX.onrender.com/api';
// ↑ Replace XXXXX with your actual Render URL
```

---

## Step 4: Deploy Frontend to Netlify (1 min)

1. Go to https://app.netlify.com
2. Click "Add new site" → "Deploy manually"
3. Drag & drop the `frontend` folder
4. Done! ✅

---

## Step 5: Connect Your Domain (Optional)

In Netlify:
1. Go to "Domain settings"
2. Add your custom domain
3. Update DNS settings with Netlify nameservers

---

## 🎉 YOU'RE LIVE!

**Frontend**: https://your-domain.netlify.app
**Backend API**: https://cheapflix-nepal-backend-XXXXX.onrender.com/api

### Test It:
- ✅ Go to your frontend URL
- ✅ Try login (test@example.com / password)
- ✅ Try booking
- ✅ Try chat

---

## ⚡ FREE TIER LIMITATIONS

- Render backend: Sleeps after 15 min inactivity (free)
- First request takes 30-50s to wake up
- Use uptime monitor to keep it alive (optional)

---

## 🆘 NEED HELP?

If something doesn't work:
1. Check Render logs: Dashboard → Your app → Logs
2. Check Netlify logs: Site settings → Functions
3. Open browser DevTools (F12) → Console for errors
4. Check that config.js has the correct Render URL
