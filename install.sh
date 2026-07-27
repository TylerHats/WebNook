#!/bin/bash
# WebNook Local Installer Script
set -e

echo "===================================================="
echo "    🚀 Installing WebNook Social Platform"
echo "===================================================="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v18+) and retry."
    exit 1
fi

echo "📦 Installing root, backend, and frontend dependencies..."
npm run setup

echo "🔨 Building frontend static assets and backend TypeScript..."
npm run build

echo "✨ Initializing data directory..."
mkdir -p backend/data backend/uploads

echo "===================================================="
echo " ✅ Installation Complete!"
echo " To start WebNook locally, run:"
echo "   npm start"
echo " Or run in development mode:"
echo "   npm run dev"
echo " Access WebNook at http://localhost:4000"
echo "===================================================="
