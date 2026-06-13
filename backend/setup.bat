@echo off
REM Cheapflix Nepal - Backend Setup Script for Windows

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║          Cheapflix Nepal - Backend Setup Script                ║
echo ║                                                                ║
echo ║  This script will:                                             ║
echo ║  1. Generate Prisma Client                                     ║
echo ║  2. Create/migrate database                                    ║
echo ║  3. Seed initial data (admin + providers)                      ║"
echo ║                                                                ║"
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js found: %NODE_VERSION%
echo.

REM Check if npm is installed
npm --version > nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm found: %NPM_VERSION%
echo.

REM Step 1: Install dependencies
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 📦 Step 1: Installing dependencies...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

REM Step 2: Generate Prisma
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🔄 Step 2: Generating Prisma Client...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
call npx prisma generate
if errorlevel 1 (
    echo ❌ Failed to generate Prisma
    pause
    exit /b 1
)
echo ✅ Prisma generated
echo.

REM Step 3: Run migrations
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🗄️  Step 3: Creating/migrating database...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
call npx prisma migrate dev --name init
if errorlevel 1 (
    echo ❌ Failed to run migrations
    echo.
    echo 📝 Troubleshooting:
    echo    * Make sure MySQL is running
    echo    * Check DATABASE_URL in .env file
    echo    * Verify MySQL credentials
    pause
    exit /b 1
)
echo ✅ Database migrated
echo.

REM Step 4: Seed data
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🌱 Step 4: Seeding initial data...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
call node seed.js
if errorlevel 1 (
    echo ❌ Failed to seed data
    pause
    exit /b 1
)
echo ✅ Data seeded
echo.

REM Success!
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                  ✅ SETUP COMPLETE!                            ║
echo ╠════════════════════════════════════════════════════════════════╣
echo ║                                                                ║
echo ║  🎉 Backend is ready to use!                                  ║
echo ║                                                                ║
echo ║  📝 Login Credentials:                                         ║
echo ║     Email: admin@cheapflix.com                                 ║
echo ║     Password: admin@123                                        ║
echo ║                                                                ║
echo ║  🚀 Start the server:                                          ║
echo ║     npm start                                                   ║
echo ║                                                                ║
echo ║  🌐 Backend will run on: http://localhost:5000                 ║
echo ║                                                                ║
echo ║  📚 API Documentation:                                         ║
echo ║     - POST /api/auth/register - Register new user              ║
echo ║     - POST /api/auth/login - Login                             ║
echo ║     - GET  /api/health - Health check                          ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

pause
