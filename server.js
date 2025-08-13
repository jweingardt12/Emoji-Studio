const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3001;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certificates', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certificates', 'cert.pem'))
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      // Parse URL using the old method for compatibility
      const parsedUrl = parse(req.url, true);
      
      // Handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://localhost:${port}`);
    console.log(`> Also available on https://192.168.86.71:${port}`);
    console.log('');
    console.log('⚠️  Certificate Warning: You may see a security warning.');
    console.log('   This is normal for self-signed certificates.');
    console.log('   Click "Advanced" and "Proceed" to continue.');
  });
});