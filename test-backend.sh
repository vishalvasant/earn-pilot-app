#!/bin/bash

echo "🎯 Quick Test Script - OTP Integration"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Backend Health
echo "Test 1: Checking if backend is running..."
HEALTH_RESPONSE=$(curl -s http://127.0.0.1:8000/api/health 2>&1)

if [[ $HEALTH_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is NOT running${NC}"
    echo "   Start it with: cd earn-pilot-admin && php artisan serve"
    exit 1
fi

# Test 2: Send OTP
echo ""
echo "Test 2: Testing Send OTP endpoint..."
PHONE="9999999999"
OTP_RESPONSE=$(curl -s -X POST http://127.0.0.1:8000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\"}")

if [[ $OTP_RESPONSE == *"success"*true* ]]; then
    echo -e "${GREEN}✅ Send OTP works${NC}"
    OTP=$(echo $OTP_RESPONSE | grep -o '"otp":"[0-9]*"' | grep -o '[0-9]\+')
    echo "   Generated OTP: $OTP"
else
    echo -e "${RED}❌ Send OTP failed${NC}"
    echo "   Response: $OTP_RESPONSE"
    exit 1
fi

# Test 3: Verify OTP (New User)
echo ""
echo "Test 3: Testing Verify OTP endpoint (New User)..."
VERIFY_RESPONSE=$(curl -s -X POST http://127.0.0.1:8000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"otp\":\"$OTP\",\"name\":\"Test User\"}")

if [[ $VERIFY_RESPONSE == *"success"*true* ]]; then
    echo -e "${GREEN}✅ Verify OTP works (New User)${NC}"
    TOKEN=$(echo $VERIFY_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${TOKEN:0:30}..."
else
    echo -e "${RED}❌ Verify OTP failed${NC}"
    echo "   Response: $VERIFY_RESPONSE"
    exit 1
fi

# Test 4: Network connectivity from external IP
echo ""
echo "Test 4: Checking network accessibility..."
YOUR_IP="192.168.31.242"
EXTERNAL_HEALTH=$(curl -s http://$YOUR_IP:8000/api/health 2>&1)

if [[ $EXTERNAL_HEALTH == *"success"* ]]; then
    echo -e "${GREEN}✅ Backend accessible from $YOUR_IP${NC}"
    echo ""
    echo -e "${YELLOW}📱 Test from phone browser:${NC}"
    echo "   http://$YOUR_IP:8000/api/health"
else
    echo -e "${RED}❌ Backend NOT accessible from $YOUR_IP${NC}"
    echo "   This might be a firewall issue"
    echo ""
    echo -e "${YELLOW}💡 Solutions:${NC}"
    echo "   1. Temporarily disable firewall"
    echo "   2. Allow port 8000 through firewall"
    echo "   3. Use ngrok: ngrok http 8000"
fi

echo ""
echo "======================================"
echo -e "${GREEN}Backend API: Working ✅${NC}"
echo ""
echo "Next steps:"
echo "1. Test http://$YOUR_IP:8000/api/health from phone browser"
echo "2. If that works, restart mobile app with: npm start -- --clear"
echo "3. Check app console shows: 🔗 API Base URL: http://$YOUR_IP:8000"
echo "4. Try Send OTP from the app"
echo ""
