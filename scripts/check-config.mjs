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

  const endpointMatch = config.match(/LEAD_ENDPOINT\s*=\s*'([^']*)'/);
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
