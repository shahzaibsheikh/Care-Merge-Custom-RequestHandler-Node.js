const http = require('http');
const url = require('url');
const https = require('https');
const cheerio = require('cheerio');
const hostname = '127.0.0.1';
const port = 5000;

// Function to fetch title using a Promise
function fetchTitle(address) {
  return new Promise((resolve, reject) => {
    try {
      const options = { hostname: new URL(address).hostname, path: '/' };
      https.get(options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
          data += chunk;
        });
        resp.on('end', () => {
          const $ = cheerio.load(data);
          const title = $('title').text();
          resolve(`${address} - "${title}"`);
        });
      }).on('error', () => {
        resolve(`${address} - NO RESPONSE`);
      });
    } catch (err) {
      resolve(`${address} - NO RESPONSE`);
    }
  });
}

// Function to handle requests
const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/I/want/title')) {
    const query = url.parse(req.url, true).query;
    const addresses = query.address;

    if (!addresses || addresses.length === 0) {
      res.statusCode = 404;
      res.end('No addresses provided');
      return;
    }

    const titles = [];

    try {
      if (typeof addresses === 'string') {
        const title = await fetchTitle(addresses);
        titles.push(title);
      } else {
        const titlePromises = addresses.map((address) => fetchTitle(address));
        const results = await Promise.all(titlePromises);
        titles.push(...results);
      }

      res.setHeader('Content-Type', 'text/html');
      res.write('<html><head></head><body><h1>Following are the titles of given websites:</h1><ul>');
      titles.forEach((title) => {
        res.write(`<li>${title}</li>`);
      });
      res.write('</ul></body></html>');
      res.end();
    } catch (err) {
      res.statusCode = 500;
      res.end('Server error');
    }
  } else {
    res.statusCode = 404;
    res.end('404 Not found');
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at a http://${hostname}:${port}/`);
});
