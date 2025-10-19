#!/bin/bash

echo "🔄 Restarting Earn Pilot Mobile App..."
echo ""
echo "📱 Current Configuration:"
echo "   API Base URL: http://192.168.31.242:8000"
echo "   Device Type: Real Device (Phone/Tablet)"
echo ""
echo "⚠️  Make sure:"
echo "   1. Your phone and computer are on the SAME WiFi"
echo "   2. Backend is running: cd ../earn-pilot-admin && php artisan serve"
echo ""
echo "🚀 Starting app with cleared cache..."
echo ""

cd "$(dirname "$0")"
npm start -- --clear

# Note: After starting, you should see:
# 🔗 API Base URL: http://192.168.31.242:8000
