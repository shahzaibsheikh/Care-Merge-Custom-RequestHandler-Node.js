const http = require('http');
const url = require('url');
const https = require('https');
const cheerio = require('cheerio');
const async = require('async');
const hostname = '127.0.0.1';
const port = 5000;

const fetchTitle = (address, callback) => {
  try {
    // Ensure the address has a valid scheme
    let parsedUrl;
    try {
      parsedUrl = new URL(address);
    } catch (e) {
      // If URL parsing fails, assume it's an http address
      parsedUrl = new URL('http://' + address);
    }

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      method: 'GET'
    };

    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    protocol.get(options, (resp) => {
      let data = '';

      // Handle HTTP status codes
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        // Handle redirection
        console.log(`Redirecting to ${resp.headers.location}`);
        return fetchTitle(resp.headers.location, callback);
      } else if (resp.statusCode !== 200) {
        console.log(`Received status code ${resp.statusCode}`);
        return callback(null, `${address} - NO RESPONSE`);
      }

      resp.on('data', (chunk) => {
        data += chunk;
      });

      resp.on('end', () => {
        const $ = cheerio.load(data);
        const title = $('title').text();
        if (title) {
          callback(null, `${address} - "${title}"`);
        } else {
          callback(null, `${address} - NO RESPONSE`);
        }
      });
    }).on('error', (err) => {
      console.error(`Request error: ${err.message}`);
      callback(null, `${address} - NO RESPONSE`);
    });
  } catch (err) {
    console.error(`Fetch error: ${err.message}`);
    callback(null, `${address} - NO RESPONSE`);
  }
};

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/I/want/title')) {
    const query = url.parse(req.url, true).query;
    const addresses = query.address;

    if (!addresses || addresses.length === 0) {
      res.statusCode = 404;
      res.end('No addresses provided');
      return;
    }

    async.map(
      Array.isArray(addresses) ? addresses : [addresses],
      fetchTitle,
      (err, results) => {
        if (err) {
          res.statusCode = 500;
          res.end('Server error');
          return;
        }

        res.setHeader('Content-Type', 'text/html');
        res.write('<html><head></head><body><h1>Following are the titles of given websites:</h1><ul>');
        results.forEach((title) => {
          res.write(`<li>${title}</li>`);
        });
        res.write('</ul></body></html>');
        res.end();
      }
    );
  } else {
    res.statusCode = 404;
    res.end('404 Not found');
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at a http://${hostname}:${port}/`);
});
