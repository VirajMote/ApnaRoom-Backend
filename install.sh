#!/bin/bash

# ApnaRoom Backend Installation Script
# This script helps you set up the ApnaRoom backend with Supabase

echo "🚀 Welcome to ApnaRoom Backend Setup!"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file with your Supabase credentials:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - Other service configurations"
    echo ""
    echo "Press Enter when you've updated the .env file..."
    read
else
    echo "✅ .env file already exists"
fi

# Check if Supabase credentials are set
if grep -q "your_supabase_project_url" .env; then
    echo "⚠️  Please update your .env file with actual Supabase credentials before continuing"
    echo "   Required variables:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "Press Enter when you've updated the .env file..."
    read
fi

echo ""
echo "🔧 Setting up database..."

# Try to run migrations
echo "📊 Running database migrations..."
npm run db:migrate

if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully"
    
    # Ask if user wants to seed the database
    echo ""
    read -p "🌱 Would you like to seed the database with sample data? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🌱 Seeding database with sample data..."
        npm run db:seed
        if [ $? -eq 0 ]; then
            echo "✅ Database seeded successfully"
        else
            echo "⚠️  Database seeding failed, but you can continue"
        fi
    fi
else
    echo "⚠️  Automatic database setup failed"
    echo ""
    echo "📝 Manual setup required:"
    echo "1. Go to your Supabase project dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste the contents of supabase-setup.sql"
    echo "4. Run the script to create all tables manually"
    echo ""
    echo "Press Enter when you've completed the manual setup..."
    read
fi

echo ""
echo "🎉 Setup completed!"
echo ""
echo "🚀 To start the server:"
echo "   Development: npm run dev"
echo "   Production:  npm start"
echo ""
echo "📚 For more information, check the README.md file"
echo ""
echo "Happy coding! 🎊"
