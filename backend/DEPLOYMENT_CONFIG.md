# Backend Deployment Configuration

## For Production Deployment to Render.com

### Environment Variables Required

```env
# Database (Render provides this automatically)
DATABASE_URL=postgresql://...

# Security
JWT_SECRET=your_strong_random_secret_here

# Server
NODE_ENV=production
PORT=5000

# CORS
CORS_ORIGIN=https://your-netlify-domain.netlify.app
```

### Important Notes

1. **Database Migrations**: Render will run migrations automatically during deployment
2. **Prisma**: The backend uses Prisma ORM - ensure `prisma generate` runs during build
3. **Port**: Must use dynamic PORT from environment (already set in server.js)
4. **Health Check**: Render will check the server is running on the specified port

### Deployment Steps

1. Push code to GitHub
2. Go to render.com → New Web Service
3. Connect your GitHub repository
4. Configure:
   - Build Command: `npm install && npx prisma migrate deploy && npx prisma generate`
   - Start Command: `npm start`
5. Add environment variables in Render Dashboard
6. Deploy

### After Deployment

- Note your Render URL (e.g., https://cheapflix-nepal-backend.onrender.com)
- Update frontend config.js with this URL
- Redeploy frontend on Netlify
- Test all features

### Free Tier Limitations

- Server sleeps after 15 minutes of inactivity
- First request takes 30-50 seconds (cold start)
- Optional: Use uptime monitor to keep alive
  - Use https://uptimerobot.com (free)
  - Add your backend URL to monitor
  - Pings every 5 minutes to prevent sleep

### Troubleshooting

**Issue**: Build fails
- Check: `npm install` completes successfully
- Check: `npx prisma migrate deploy` runs without errors
- Check: Database URL is correct

**Issue**: API returns 500 errors
- Check: DATABASE_URL environment variable is set
- Check: Render logs for database connection errors
- Check: All required environment variables are present

**Issue**: Frontend can't connect to backend
- Check: CORS_ORIGIN in Render env vars matches your Netlify domain
- Check: frontend/config.js has the correct Render backend URL
- Check: Both frontend and backend are deployed

### Upgrading from Free

When ready for production:
1. Go to Render Dashboard
2. Select your service
3. Upgrade to paid plan
4. Services will no longer sleep
5. Better performance and reliability
