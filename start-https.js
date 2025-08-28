#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables for HTTPS
process.env.HTTPS = 'true';
process.env.SSL_CRT_FILE = path.join(__dirname, 'certificates', 'cert.pem');
process.env.SSL_KEY_FILE = path.join(__dirname, 'certificates', 'key.pem');
process.env.PORT = '3001';

// Start Next.js dev server
const nextDev = spawn('next', ['dev', '-p', '3001'], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

nextDev.on('close', (code) => {
  process.exit(code);
});

console.log('Starting HTTPS server on port 3001...');
console.log('');
console.log('⚠️  Certificate Warning: You may see a security warning.');
console.log('   This is normal for self-signed certificates.');
console.log('   Click "Advanced" and "Proceed" to continue.');
console.log('');