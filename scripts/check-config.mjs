/**
 * Pre-build guard: fail the build if a placeholder phone number or an
 * unwired affiliate link has crept back into the source.
 *
 * Why this exists: a placeholder WhatsApp number shipped to production once
 * already, hard-coded in six places across four files. Every lead CTA on the
 * site silently went nowhere for the entire life of the deployment, and nothing
 * caught it because `wa.me` returns HTTP 200 for any syntactically valid number.
 *
 * Wired into `npm run build` so the same mistake cannot ship twice.
 *
 * Run standalone:  node scripts/check-config.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const SCAN_DIRS = ['src', 'public', 'worker'];
const EXTENSIONS = new Set(['.astro', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.txt', '.md', '.html']);

/**
 * BLOCKING — fails the build.
 *
 * Reserved for defects that silently destroy the business, where the site still
 * LOOKS fine. The placeholder WhatsApp number is the canonical example: it
 * shipped once, every lead CTA failed, and nothing surfaced it because wa.me
 * returns HTTP 200 for any syntactically valid number.
 */
const FORBIDDEN = [
  {
    pattern: /2348000000000/,
    reason: 'Placeholder WhatsApp number. All lead CTAs will silently fail.',
  },
  {
    pattern: /wa\.me\/(?!2348027127331)\d{6,}/,
    reason: 'Hand-written wa.me link with an unexpected number. Use waLink() from src/lib/whatsapp.ts.',
  },
];

/**
 * NON-BLOCKING — printed loudly, build still succeeds.
 *
 * For known issues that cost money but must not hold up a deploy. Blocking a
 * build over a dead affiliate link would just teach you to bypass the check,
 * which would then also bypass the blocking one.
 */
const WARNINGS = [
  {
    pattern: /kol\.jumia\.com/,
    reason:
      'Dead affiliate domain — kol.jumia.com returns NXDOMAIN. Re-issue from the Jumia dashboard.',
  },
];

/** Config values that must be present and well-formed. */
const requiredConfig = () => {
  const configPath = path.join(ROOT, 'src/config/site.ts');
  if (!fs.existsSync(configPath)) {
    return ['src/config/site.ts is missing — the site has no central configuration.'];
  }
  const config = fs.readFileSync(configPath, 'utf8');
  const errors = [];

  const numberMatch = config.match(/WHATSAPP_NUMBER\s*=\s*'([^']+)'/);
  if (!numberMatch) {
    errors.push('WHATSAPP_NUMBER is not defined in src/config/site.ts');
  } else if (!/^234(70|80|81|90|91)\d{8}$/.test(numberMatch[1])) {
    errors.push(
      `WHATSAPP_NUMBER "${numberMatch[1]}" is not a valid Nigerian mobile number in ` +
        'international format (expected 234 + 10 digits, no leading zero, no plus).'
    );
  }

  // Must anchor on `export const` — an unanchored match hits the example in the
  // doc comment above the declaration and validates the wrong string.
  const endpointMatch = config.match(/export const LEAD_ENDPOINT\s*=\s*'([^']*)'/);
  if (endpointMatch && endpointMatch[1]) {
    if (!/^https:\/\//.test(endpointMatch[1])) {
      errors.push('LEAD_ENDPOINT must be an https:// URL, or empty for WhatsApp-only mode.');
    }
  }

  return errors;
};

const walk = (dir, files = []) => {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
};

const problems = [];
const warnings = [];
const files = SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));

for (const file of files) {
  const contents = fs.readFileSync(file, 'utf8');
  const lines = contents.split('\n');

  for (const { pattern, reason } of FORBIDDEN) {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        problems.push({
          file: path.relative(ROOT, file),
          line: index + 1,
          snippet: line.trim().slice(0, 100),
          reason,
        });
      }
    });
  }

  for (const { pattern, reason } of WARNINGS) {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        warnings.push({
          file: path.relative(ROOT, file),
          line: index + 1,
          reason,
        });
      }
    });
  }
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * CSP / endpoint consistency.
 *
 * The quote form POSTs to LEAD_ENDPOINT and then swallows any error with
 * `.catch(() => {})`, so a blocked request is invisible: the visitor still sees
 * "Request Sent" while the lead is thrown away. The deployed Worker will NOT be
 * on the same origin as the site (it is a workers.dev URL or a subdomain), so a
 * missing entry in `connect-src` would silently destroy every durable lead in
 * production — and nothing on the page would look wrong.
 *
 * This check makes that failure impossible to ship unnoticed.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function checkCspAllowsEndpoints() {
  const headersPath = path.join(ROOT, 'public', '_headers');
  if (!fs.existsSync(headersPath)) return;
  const cfg = fs.readFileSync(path.join(ROOT, 'src/config/site.ts'), 'utf8');
  const LEAD_ENDPOINT =
    (cfg.match(/export const LEAD_ENDPOINT\s*=\s*'([^']*)'/) || [])[1] || '';
  // Skip comment lines so the documented example cannot masquerade as the value.
  const CUSTOM_ANALYTICS_SRC =
    (cfg.split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l)).join('\n')
      .match(/customScriptSrc:\s*'([^']*)'/) || [])[1] || '';
  const csp = fs.readFileSync(headersPath, 'utf8')
    .split('\n')
    .find((l) => l.includes('Content-Security-Policy')) || '';
  const connect = (csp.match(/connect-src([^;]*)/) || [])[1] || '';
  const script = (csp.match(/script-src([^;]*)/) || [])[1] || '';

  const targets = [
    { value: LEAD_ENDPOINT, directive: connect, label: 'LEAD_ENDPOINT', name: 'connect-src' },
    { value: CUSTOM_ANALYTICS_SRC, directive: script, label: 'ANALYTICS.customScriptSrc', name: 'script-src' },
  ];

  for (const { value, directive, label, name } of targets) {
    if (!value || !/^https?:\/\//.test(value)) continue;
    const origin = new URL(value).origin;
    // Same-origin endpoints are covered by 'self' in the directive.
    if (origin === 'https://ibadansolarhub.com.ng' && directive.includes("'self'")) continue;
    if (directive.includes(origin)) continue;
    problems.push({
      file: 'public/_headers',
      line: 0,
      snippet: `${name}${directive.trim()}`,
      reason:
        `${label} is set to ${value}, but ${origin} is not allowed by the CSP ` +
        `\`${name}\` directive. The browser will BLOCK the request and the site will ` +
        `silently discard it (the form swallows fetch errors). Add ${origin} to ` +
        `\`${name}\` in public/_headers.`,
    });
  }
}
checkCspAllowsEndpoints();

for (const error of requiredConfig()) {
  problems.push({ file: 'src/config/site.ts', line: 0, snippet: '', reason: error });
}

// Warnings first — they are the reason the reader is looking at this output.
if (warnings.length) {
  const byReason = new Map();
  for (const w of warnings) {
    const key = w.reason;
    if (!byReason.has(key)) byReason.set(key, []);
    byReason.get(key).push(`${w.file}:${w.line}`);
  }
  console.warn('\n\x1b[33m⚠  Configuration warnings (build will continue)\x1b[0m\n');
  for (const [reason, where] of byReason) {
    console.warn(`  \x1b[1m${reason}\x1b[0m`);
    console.warn(`    ${where.length} occurrence(s): ${where.slice(0, 4).join(', ')}${where.length > 4 ? ', …' : ''}\n`);
  }
  console.warn('  These do not block the build, but they are broken links users will hit.\n');
}

if (problems.length) {
  console.error('\n\x1b[31m✗ Configuration check failed — build stopped\x1b[0m\n');
  for (const p of problems) {
    console.error(`  \x1b[1m${p.file}${p.line ? ':' + p.line : ''}\x1b[0m`);
    if (p.snippet) console.error(`    ${p.snippet}`);
    console.error(`    \x1b[31m→ ${p.reason}\x1b[0m\n`);
  }
  console.error(`  ${problems.length} blocking problem(s) found. Fix before deploying.\n`);
  process.exit(1);
}

console.log(
  `\x1b[32m✓\x1b[0m Config check passed — ${files.length} files scanned, ` +
    `WhatsApp number valid${warnings.length ? `, ${warnings.length} non-blocking warning(s) above` : ', no dead affiliate domains'}.`
);
