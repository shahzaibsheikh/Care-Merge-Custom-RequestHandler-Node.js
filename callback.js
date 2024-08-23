const http = require('http');
const url = require('url');
const axios = require('axios');
const cheerio = require('cheerio');

const hostname = '127.0.0.1';
const port = 5000;

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/I/want/title')) {
    const query = url.parse(req.url, true).query;
    let addresses = query.address;

    if (!addresses) {
      res.statusCode = 404;
      res.end('No addresses provided');
      return;
    }

    if (typeof addresses === 'string') {
      addresses = [addresses];
    }

    const titles = [];
    let counter = 0;

    const fetchTitle = (address, callback) => {
      try {
        const fullAddress = address.startsWith('http') ? address : `https://${address}`;

        axios.get(fullAddress)
          .then(response => {
            const $ = cheerio.load(response.data);
            const title = $('title').text();
            callback(null, `${address} - "${title}"`);
          })
          .catch(() => {
            callback(null, `${address} - NO RESPONSE`);
          });
      } catch (error) {
        callback(null, `${address} - INVALID URL`);
      }
    };

    const onAllDone = () => {
      res.setHeader('Content-Type', 'text/html');
      res.write('<html><head></head><body><h1>Following are the titles of given websites:</h1><ul>');
      titles.forEach((title) => {
        res.write(`<li>${title}</li>`);
      });
      res.write('</ul></body></html>');
      res.end();
    };

    addresses.forEach((address) => {
      fetchTitle(address, (err, title) => {
        if (title) {
          titles.push(title);
        } else {
          titles.push(`${address} - NO RESPONSE`);
        }
        counter++;
        if (counter === addresses.length) {
          onAllDone();
        }
      });
    });
  } else {
    res.statusCode = 404;
    res.end('404 Not found');
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at a http://${hostname}:${port}/`);
});
