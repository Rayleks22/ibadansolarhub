const https = require('https');
const fs = require('fs');
const path = require('path');

const key = 'e84a2c91b5394d2fa816e3c809142026';
const host = 'ibadansolarhub.com.ng';
const keyLocation = `https://${host}/${key}.txt`;

// Read URLs from sitemap
const sitemapPath = path.join(__dirname, '../dist/sitemap-0.xml');
if (!fs.existsSync(sitemapPath)) {
  console.error('sitemap-0.xml not found! Run npm run build first.');
  process.exit(1);
}

const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
const urlList = [...sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

console.log(`Found ${urlList.length} URLs to submit to IndexNow:`);
console.log(urlList);

const payload = JSON.stringify({
  host: host,
  key: key,
  keyLocation: keyLocation,
  urlList: urlList
});

const endpoints = [
  'api.indexnow.org',
  'www.bing.com'
];

endpoints.forEach(endpoint => {
  const options = {
    hostname: endpoint,
    port: 443,
    path: '/indexnow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`\n[${endpoint}] Response Status: ${res.statusCode} (${res.statusMessage})`);
      if (res.statusCode === 200 || res.statusCode === 202) {
        console.log(`✓ Successfully submitted ${urlList.length} URLs to ${endpoint}!`);
      } else {
        console.log(`Response body: ${data}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Error submitting to ${endpoint}:`, e.message);
  });

  req.write(payload);
  req.end();
});
