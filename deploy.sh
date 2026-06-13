#!/bin/bash
# DEPLOYMENT SCRIPT - Run this to deploy Cheapflix Nepal

echo "🚀 CHEAPFLIX NEPAL DEPLOYMENT SCRIPT"
echo "===================================="
echo ""

# Step 1: GitHub Setup
echo "📌 STEP 1: Setting up GitHub"
echo "-------"
echo "Run these commands in PowerShell (as Administrator):"
echo ""
echo '  cd "d:\CHEAPFLIX NEPAL"'
echo "  git init"
echo '  git config user.email "your-email@gmail.com"'
echo '  git config user.name "Your Name"'
echo "  git add ."
echo '  git commit -m "Cheapflix Nepal - Production deployment"'
echo "  git branch -M main"
echo ""
echo "Then go to https://github.com/new and create a repo named: cheapflix-nepal"
echo ""
echo "Finally run:"
echo '  git remote add origin https://github.com/YOUR_USERNAME/cheapflix-nepal.git'
echo "  git push -u origin main"
echo ""
echo "Press Enter when done..."
read

# Step 2: Render Backend
echo ""
echo "📌 STEP 2: Deploying Backend"
echo "-------"
echo "1. Go to https://render.com/register"
echo "2. Sign up with GitHub"
echo "3. Click 'New Web Service'"
echo "4. Select your cheapflix-nepal repository"
echo "5. Configure:"
echo "   - Name: cheapflix-nepal-backend"
echo "   - Build: npm install && npx prisma migrate deploy && npx prisma generate"
echo "   - Start: npm start"
echo "   - Plan: Free"
echo ""
echo "6. Click 'Create Web Service' and wait for deployment"
echo "7. Copy your Render URL (e.g., https://cheapflix-nepal-backend-xxxx.onrender.com)"
echo ""
echo "Enter your Render backend URL:"
read RENDER_URL

# Step 3: Update Frontend Config
echo ""
echo "📌 STEP 3: Updating Frontend Config"
echo "-------"
echo "Updating frontend/config.js with your Render URL..."
echo ""

CONFIG_FILE="frontend/config.js"
if [ -f "$CONFIG_FILE" ]; then
  sed -i "s|const RENDER_BACKEND_URL = '[^']*'|const RENDER_BACKEND_URL = '${RENDER_URL}/api'|g" "$CONFIG_FILE"
  echo "✅ Updated frontend/config.js"
  echo "Backend URL set to: ${RENDER_URL}/api"
else
  echo "❌ Could not find $CONFIG_FILE"
fi

# Step 4: Deploy Frontend
echo ""
echo "📌 STEP 4: Deploying Frontend"
echo "-------"
echo "1. Go to https://app.netlify.com"
echo "2. Click 'Add new site' → 'Deploy manually'"
echo "3. Drag the 'frontend' folder into Netlify"
echo "4. Wait for deployment to complete"
echo "5. You'll get a URL like: https://your-site.netlify.app"
echo ""
echo "Enter your Netlify frontend URL:"
read FRONTEND_URL

# Summary
echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "====================================="
echo ""
echo "🔗 YOUR LIVE LINKS:"
echo "Frontend: $FRONTEND_URL"
echo "Backend API: ${RENDER_URL}/api"
echo "Admin Panel: ${FRONTEND_URL}/pages/admin-dashboard.html"
echo ""
echo "📝 NEXT STEPS:"
echo "1. Open your frontend URL in a browser"
echo "2. Sign up with a test account"
echo "3. Test the booking flow"
echo "4. Try sending a message"
echo "5. Login as admin to verify setup"
echo ""
echo "ℹ️  NOTE: First request to backend may take 30-50 seconds (cold start on free tier)"
echo ""
echo "Need help? Check these files:"
echo "- DEPLOY_NOW.md"
echo "- QUICK_DEPLOYMENT.md" 
echo "- DEPLOYMENT_GUIDE.md"
echo ""
echo "🎉 Congratulations! Your website is now live!"
