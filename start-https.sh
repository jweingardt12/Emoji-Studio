#!/bin/bash

# Kill any existing Next.js server on port 3001
echo "Stopping any existing server on port 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Wait a moment
sleep 2

# Start HTTPS server
echo "Starting HTTPS server on port 3001..."
echo ""
echo "🔒 HTTPS Server will be available at:"
echo "   https://localhost:3001"
echo "   https://192.168.86.71:3001"
echo ""
echo "📱 For iOS devices:"
echo "   1. First install the certificate from http://192.168.86.71:3000/install-cert"
echo "   2. Then access https://192.168.86.71:3001"
echo ""

# Start with HTTPS environment variables
HTTPS=true \
SSL_CRT_FILE=certificates/cert.pem \
SSL_KEY_FILE=certificates/key.pem \
PORT=3001 \
npm run dev -- -p 3001