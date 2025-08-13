const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
  key: fs.readFileSync(path.join(__dirname, 'certificates', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certificates', 'cert.pem')),
};

https.createServer(options, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>HTTPS Test</title></head>
    <body>
      <h1>✅ HTTPS is working!</h1>
      <p>If you can see this, HTTPS is configured correctly.</p>
      <p>Time: ${new Date().toISOString()}</p>
    </body>
    </html>
  `);
}).listen(3001, '0.0.0.0', () => {
  console.log('Test HTTPS server running on:');
  console.log('  https://localhost:3001');
  console.log('  https://192.168.86.71:3001');
});