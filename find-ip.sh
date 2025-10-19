#!/bin/bash

echo "🔍 Finding your network configuration..."
echo ""

# Get local IP address on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 For testing on REAL DEVICE, use one of these IPs:"
    echo ""
    ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print "   http://" $2 ":8000"}'
    echo ""
    echo "📟 For SIMULATOR/EMULATOR, use:"
    echo "   http://127.0.0.1:8000"
fi

echo ""
echo "📝 To configure:"
echo "1. Create .env file: cp .env.example .env"
echo "2. Edit .env and set API_BASE_URL to the IP above"
echo "3. Restart your app: npm start"
echo ""
echo "🚀 Don't forget to start backend: cd ../earn-pilot-admin && php artisan serve"
