# iOS HTTPS Setup Guide

## The Problem
iOS Safari cannot access HTTPS sites with self-signed certificates until the certificate is installed and trusted. This creates a catch-22: you need HTTPS for camera access, but can't access HTTPS to install the certificate.

## Solution: Two-Step Process

### Step 1: Install Certificate via HTTP
1. **On your Mac**, run the development server in HTTP mode:
   ```bash
   npm run dev
   ```

2. **On your iPhone**:
   - Open Safari and go to: `http://192.168.86.71:3000/install-cert`
   - Click "Download Certificate"
   - Go to Settings → General → VPN & Device Management
   - Tap the downloaded profile and install it
   - Go to Settings → General → About → Certificate Trust Settings
   - Enable full trust for the certificate

### Step 2: Access via HTTPS
1. **On your Mac**, stop the HTTP server (Ctrl+C) and start HTTPS:
   ```bash
   npm run dev:https
   ```

2. **On your iPhone**:
   - Open Safari and go to: `https://192.168.86.71:3001`
   - The site should now load with HTTPS
   - Camera permissions will work

## Alternative: Using ngrok
If the above doesn't work, you can use ngrok for a public HTTPS tunnel:

1. Install ngrok: `brew install ngrok`
2. Run your dev server: `npm run dev`
3. In another terminal: `ngrok http 3000`
4. Use the provided HTTPS URL on your iPhone

## Troubleshooting

### "Can't establish secure connection"
- Make sure you completed BOTH steps in "Trust Certificate" (install AND trust)
- Try restarting Safari after trusting the certificate
- Verify the IP address matches your Mac's local IP

### Certificate not downloading
- Make sure you're using HTTP (not HTTPS) in Step 1
- Check that your iPhone and Mac are on the same network

### Find your Mac's IP address
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```