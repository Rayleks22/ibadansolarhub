/**
 * Local preview server that mimics Cloudflare Pages' production behaviour.
 *
 * `astro preview` does not reproduce the things we most need to test:
 *   • trailing-slash redirects      (/foo → 308 → /foo/)
 *   • the 404 page with a real 404  (not 200, not the homepage)
 *   • _headers                                                      
 *
 * Run:  node scripts/preview-server.mjs [port]
 * Then: http://localhost:4321
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const PORT = parseInt(process.argv[2] || '4321', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/** Parse public/_headers into { pattern: [[name, value], ...] } */
function loadHeaders() {
  const file = path.join(ROOT, '_headers');
  const rules = [];
  if (!fs.existsSync(file)) return rules;

  let current = null;
  for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (!line.includes(':') || (!line.startsWith('/') && current === null)) {
      if (!indentOf(rawLine) && line.startsWith('/')) {
        current = { pattern: line, headers: [] };
        rules.push(current);
        continue;
      }
    }
    if (!indentOf(rawLine) && line.startsWith('/')) {
      current = { pattern: line, headers: [] };
      rules.push(current);
      continue;
    }
    if (indentOf(rawLine) && current) {
      const idx = line.indexOf(':');
      if (idx > 0) current.headers.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
    }
  }
  return rules;

  function indentOf(s) {
    return /^\s/.test(s);
  }
}

function matchRules(rules, urlPath) {
  const out = [];
  for (const rule of rules) {
    if (rule.pattern === '/*' || rule.pattern === '/*.html') continue; // applied globally below
    if (urlPath.startsWith(rule.pattern.replace('*', ''))) out.push(...rule.headers);
  }
  return out;
}

const HEADER_RULES = loadHeaders();
const GLOBAL = HEADER_RULES.find((r) => r.pattern === '/*')?.headers || [];
const HTML_RULE = HEADER_RULES.find((r) => r.pattern === '/*.html')?.headers || [];

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const ext = path.extname(urlPath);

  const send = (body, status, headers = {}) => {
    const merged = {};
    for (const [k, v] of [...GLOBAL, ...HTML_RULE, ...matchRules(HEADER_RULES, urlPath)]) merged[k] = v;
    Object.assign(merged, headers);
    res.writeHead(status, merged);
    res.end(body);
  };

  // Anything with a file extension is an asset: never fall back to HTML.
  const isAsset = ext && ext !== '.html';
  const direct = path.join(ROOT, urlPath);

  // Cloudflare Pages: /foo → 308 → /foo/ for directory-based builds.
  if (!isAsset && urlPath !== '/' && !urlPath.endsWith('/')) {
    const asDir = path.join(ROOT, urlPath, 'index.html');
    if (fs.existsSync(asDir)) {
      send('', 308, { Location: urlPath + '/' });
      return;
    }
  }

  const candidates = [];
  if (isAsset) {
    candidates.push(direct);
  } else if (urlPath === '/' || urlPath.endsWith('/')) {
    candidates.push(path.join(direct, 'index.html'));
  } else {
    candidates.push(direct + '.html', direct);
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const type = MIME[path.extname(candidate)] || 'application/octet-stream';
      send(fs.readFileSync(candidate), 200, {
        'Content-Type': type,
        'Content-Length': fs.statSync(candidate).size,
      });
      return;
    }
  }

  // MISS → serve 404.html with a REAL 404 status. This is the behaviour we
  // are trying to verify; the old deployment returned the homepage with 200.
  const notFound = path.join(ROOT, '404.html');
  if (fs.existsSync(notFound)) {
    send(fs.readFileSync(notFound), 404, { 'Content-Type': 'text/html; charset=utf-8' });
  } else {
    send('Not found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving ${ROOT} on http://0.0.0.0:${PORT}`);
  console.log(`(mimics Cloudflare Pages: 308 trailing-slash redirects, real 404s, _headers)`);
});
