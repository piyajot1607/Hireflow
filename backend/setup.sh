#!/bin/bash

# HireFlow Backend Setup Script
# Run this to setup the backend quickly

echo "🚀 Setting up HireFlow Backend..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update .env file with your MongoDB URI"
echo "2. Change JWT_SECRET in .env for production"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Server will run on http://localhost:5000"
echo ""
echo "📚 For more information, see README.md"
