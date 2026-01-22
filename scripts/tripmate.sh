#!/bin/zsh
# One-click startup script for TripMate development environment
# - Backend: Node + SQLite (server/)
# - Frontend: Expo React Native (app/)

set -e

# Auto-detect project root directory (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
SERVER_DIR="$PROJECT_ROOT/server"

echo "🚀 Starting TripMate Development Environment"
echo "📂 Project root: $PROJECT_ROOT"

#######################################
# 1. Start Backend (background)
#######################################

if [ -d "$SERVER_DIR" ]; then
  echo ""
  echo "================ [Backend] Starting ================"
  cd "$SERVER_DIR"

  # Install dependencies (if not installed)
  if [ ! -d "node_modules" ]; then
    echo "📦 [Backend] node_modules not found, installing dependencies..."
    npm install
  fi

  # Ensure .env exists
  if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "⚙️  [Backend] .env not found, creating from .env.example..."
    cp .env.example .env
    echo "✅ [Backend] .env created, please configure JWT_SECRET in it"
  fi

  # Initialize database (if not initialized)
  if [ ! -f "data/tripmate.db" ]; then
    echo "🗄️  [Backend] data/tripmate.db not found, initializing database..."
    npm run init-db
  fi

  echo "🎯 [Backend] Starting development server with nodemon..."
  npm run dev &
  BACKEND_PID=$!
  echo "✅ [Backend] Running in background (PID: $BACKEND_PID), URL: http://localhost:3000"
  sleep 2  # Give backend time to start
else
  echo "⚠️  Backend directory not found: $SERVER_DIR, skipping backend startup"
fi

#######################################
# 2. Start Frontend (current terminal)
#######################################

if [ -d "$APP_DIR" ]; then
  echo ""
  echo "================ [Frontend] Starting ================"
  cd "$APP_DIR"

  # Install dependencies (if not installed)
  if [ ! -d "node_modules" ]; then
    echo "📦 [Frontend] node_modules not found, installing dependencies..."
    npm install
  fi

  echo "📱 [Frontend] Starting Expo development server for Expo Go..."
  echo ""
  echo "📲 How to open with Expo Go:"
  echo "   1. Install Expo Go app on your phone:"
  echo "      - iOS: https://apps.apple.com/app/expo-go/id982107779"
  echo "      - Android: https://play.google.com/store/apps/details?id=host.exp.exponent"
  echo "   2. Scan the QR code that will appear below"
  echo "   3. Or press 's' in the Expo CLI to send the link via email/SMS"
  echo ""
  echo "⚠️  Note: Some native modules (like react-native-maps) may have limited"
  echo "   support in Expo Go. For full functionality, consider using a development build."
  echo ""
  echo "🚀 Starting Expo with Expo Go mode..."
  echo ""
  npx expo start --go
else
  echo "⚠️  Frontend directory not found: $APP_DIR, cannot start Expo"
fi

echo ""
echo "✅ TripMate one-click startup script completed."
if [ -n "$BACKEND_PID" ]; then
  echo "ℹ️  To manually stop backend, run: kill $BACKEND_PID"
fi
