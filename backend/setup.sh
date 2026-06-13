#!/bin/bash
# Cheapflix Nepal - Backend Setup Script

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          Cheapflix Nepal - Backend Setup Script                ║"
echo "║                                                                ║"
echo "║  This script will:                                             ║"
echo "║  1. Generate Prisma Client                                     ║"
echo "║  2. Create/migrate database                                    ║"
echo "║  3. Seed initial data (admin + providers)                      ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Step 1: Install dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 1: Installing dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Step 2: Generate Prisma
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Step 2: Generating Prisma Client..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma"
    exit 1
fi
echo "✅ Prisma generated"
echo ""

# Step 3: Run migrations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  Step 3: Creating/migrating database..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx prisma migrate dev --name init
if [ $? -ne 0 ]; then
    echo "❌ Failed to run migrations"
    echo ""
    echo "📝 Troubleshooting:"
    echo "   • Make sure MySQL is running"
    echo "   • Check DATABASE_URL in .env file"
    echo "   • Verify MySQL credentials"
    exit 1
fi
echo "✅ Database migrated"
echo ""

# Step 4: Seed data
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌱 Step 4: Seeding initial data..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node seed.js
if [ $? -ne 0 ]; then
    echo "❌ Failed to seed data"
    exit 1
fi
echo "✅ Data seeded"
echo ""

# Success!
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  ✅ SETUP COMPLETE!                            ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  🎉 Backend is ready to use!                                  ║"
echo "║                                                                ║"
echo "║  📝 Login Credentials:                                         ║"
echo "║     Email: admin@cheapflix.com                                 ║"
echo "║     Password: admin@123                                        ║"
echo "║                                                                ║"
echo "║  🚀 Start the server:                                          ║"
echo "║     npm start                                                   ║"
echo "║                                                                ║"
echo "║  🌐 Backend will run on: http://localhost:5000                 ║"
echo "║                                                                ║"
echo "║  📚 API Documentation:                                         ║"
echo "║     - POST /api/auth/register - Register new user              ║"
echo "║     - POST /api/auth/login - Login                             ║"
echo "║     - GET  /api/health - Health check                          ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
