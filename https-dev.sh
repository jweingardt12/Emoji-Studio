#!/bin/bash

export HTTPS=true
export SSL_CRT_FILE=certificates/cert.pem
export SSL_KEY_FILE=certificates/key.pem
export PORT=3001

echo "Starting HTTPS development server on port 3001..."
echo ""
echo "⚠️  Certificate Warning: You may see a security warning."
echo "   This is normal for self-signed certificates."
echo "   Click 'Advanced' and 'Proceed' to continue."
echo ""

next dev -p 3001