@echo off
REM ApnaRoom Backend Installation Script for Windows
REM This script helps you set up the ApnaRoom backend with Supabase

echo 🚀 Welcome to ApnaRoom Backend Setup!
echo ======================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Visit: https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% lss 18 (
    echo ❌ Node.js version 18+ is required. Current version: 
    node --version
    pause
    exit /b 1
)

echo ✅ Node.js 
node --version
echo detected

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm 
npm --version
echo detected
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully
echo.

REM Check if .env file exists
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ✅ .env file created
    echo.
    echo ⚠️  IMPORTANT: Please edit .env file with your Supabase credentials:
    echo    - SUPABASE_URL
    echo    - SUPABASE_ANON_KEY
    echo    - SUPABASE_SERVICE_ROLE_KEY
    echo    - Other service configurations
    echo.
    echo Press any key when you've updated the .env file...
    pause >nul
) else (
    echo ✅ .env file already exists
)

REM Check if Supabase credentials are set
findstr "your_supabase_project_url" .env >nul
if %errorlevel% equ 0 (
    echo ⚠️  Please update your .env file with actual Supabase credentials before continuing
    echo    Required variables:
    echo    - SUPABASE_URL
    echo    - SUPABASE_ANON_KEY
    echo    - SUPABASE_SERVICE_ROLE_KEY
    echo.
    echo Press any key when you've updated the .env file...
    pause >nul
)

echo.
echo 🔧 Setting up database...

REM Try to run migrations
echo 📊 Running database migrations...
call npm run db:migrate

if %errorlevel% equ 0 (
    echo ✅ Database setup completed successfully
    
    REM Ask if user wants to seed the database
    echo.
    set /p SEED_DB="🌱 Would you like to seed the database with sample data? (y/n): "
    if /i "%SEED_DB%"=="y" (
        echo 🌱 Seeding database with sample data...
        call npm run db:seed
        if %errorlevel% equ 0 (
            echo ✅ Database seeded successfully
        ) else (
            echo ⚠️  Database seeding failed, but you can continue
        )
    )
) else (
    echo ⚠️  Automatic database setup failed
    echo.
    echo 📝 Manual setup required:
    echo 1. Go to your Supabase project dashboard
    echo 2. Navigate to SQL Editor
    echo 3. Copy and paste the contents of supabase-setup.sql
    echo 4. Run the script to create all tables manually
    echo.
    echo Press any key when you've completed the manual setup...
    pause >nul
)

echo.
echo 🎉 Setup completed!
echo.
echo 🚀 To start the server:
echo    Development: npm run dev
echo    Production:  npm start
echo.
echo 📚 For more information, check the README.md file
echo.
echo Happy coding! 🎊
pause
