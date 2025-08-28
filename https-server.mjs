import { createServer } from 'https';
import { parse } from 'url';
import next from 'next';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3001;

console.log('Starting Next.js with HTTPS...');

const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: readFileSync(join(__dirname, 'certificates', 'key.pem')),
  cert: readFileSync(join(__dirname, 'certificates', 'cert.pem')),
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
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://localhost:${port}`);
    console.log(`> Ready on https://192.168.86.71:${port}`);
    console.log('');
    console.log('📱 iOS Setup:');
    console.log('1. First access http://192.168.86.71:3000/install-cert');
    console.log('2. Install AND trust the certificate');
    console.log('3. Then access https://192.168.86.71:3001');
  });
});