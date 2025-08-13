const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all interfaces
const port = 3001;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Read certificates
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certificates', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certificates', 'cert.pem')),
  // Allow older TLS versions for compatibility
  secureProtocol: 'TLS_method',
  secureOptions: require('constants').SSL_OP_NO_SSLv2 | require('constants').SSL_OP_NO_SSLv3,
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, '0.0.0.0', () => {
      console.log(`> Ready on https://localhost:${port}`);
      console.log(`> Ready on https://192.168.86.71:${port}`);
      console.log('');
      console.log('📱 For iOS devices:');
      console.log('   1. Install certificate from http://192.168.86.71:3000/install-cert');
      console.log('   2. Trust certificate in Settings → General → About → Certificate Trust Settings');
      console.log('   3. Access https://192.168.86.71:3001');
    });
});