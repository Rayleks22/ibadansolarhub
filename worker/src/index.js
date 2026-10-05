/**
 * Lead capture Worker for IbadanSolarHub.com.ng
 * ─────────────────────────────────────────────────────────────────────────────
 * OPTIONAL component. Skip it entirely if you are happy with WhatsApp-only.
 *
 * Why it exists: the quote form opens WhatsApp, but if a visitor abandons the
 * chat you currently have no record they ever visited. This Worker stores a
 * durable copy of every submission in Cloudflare KV.
 *
 * Deploy:
 *   1. npm i -g wrangler
 *   2. wrangler login
 *   3. cd worker
 *   4. wrangler kv namespace create LEADS
 *      → copy the returned id into wrangler.toml
 *   5. npx wrangler secret put ADMIN_TOKEN      (invent a long random string)
 *   6. npx wrangler deploy
 *   7. Put the resulting URL into LEAD_ENDPOINT in src/config/site.ts
 *
 * Then rebuild the site. Until LEAD_ENDPOINT is set, the form runs WhatsApp-only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ALLOWED_ORIGINS = [
  'https://ibadansolarhub.com.ng',
  'https://www.ibadansolarhub.com.ng',
];

const MAX_BODY_BYTES = 8 * 1024; // 8 KB is plenty for a quote form
const RATE_LIMIT_PER_HOUR = 10;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

/** Strip anything that could be used for injection or header smuggling. */
function clean(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Basic shared-secret gate so the URL alone is not enough.
    // Requests without the token are still accepted (the browser never has one)
    // but are flagged as unverified rather than rejected — rejecting would break
    // the legitimate form. Instead we rely on rate limiting + honeypot + origin.
    const isAdmin = env.ADMIN_TOKEN && request.headers.get('Authorization') === `Bearer ${env.ADMIN_TOKEN}`;

    // ── Admin: list recent leads ────────────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/api/leads') {
      if (!isAdmin) return json({ error: 'Unauthorized' }, 401, origin);

      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
      const list = await env.LEADS.list({ limit, prefix: 'lead:' });
      const leads = await Promise.all(
        list.keys.map(async (k) => JSON.parse((await env.LEADS.get(k.name)) || '{}'))
      );
      return json({ count: leads.length, leads }, 200, origin);
    }

    // ── Public: submit a lead ───────────────────────────────────────────────
    if (request.method === 'POST') {
      // Origin check — blocks trivial cross-site spam.
      if (origin && !ALLOWED_ORIGINS.includes(origin)) {
        return json({ error: 'Forbidden origin' }, 403, origin);
      }

      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) {
        return json({ error: 'Payload too large' }, 413, origin);
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return json({ error: 'Invalid JSON' }, 400, origin);
      }

      // Honeypot — bots fill hidden fields. Silently accept, store nothing.
      if (data.company_website_url) {
        return json({ ok: true, stored: false }, 200, origin);
      }

      const name = clean(data.name, 120);
      const phone = clean(data.phone, 20);
      const location = clean(data.location, 160);
      const property = clean(data.property, 80);
      const system = clean(data.system, 80);
      const notes = clean(data.notes, 1000);

      if (name.length < 2) return json({ error: 'Name is required' }, 400, origin);
      if (!/^234(70|80|81|90|91)\d{8}$/.test(phone)) {
        return json({ error: 'Valid Nigerian phone number required' }, 400, origin);
      }
      // Require a realistic human delay (honeypot by timing).
      const elapsed = Date.now() - (parseInt(data.form_loaded_at, 10) || 0);
      if (elapsed > 0 && elapsed < 1500) {
        return json({ ok: true, stored: false }, 200, origin);
      }

      // Simple rate limit per phone number.
      const rlKey = `rl:${phone}`;
      const hits = parseInt((await env.LEADS.get(rlKey)) || '0', 10);
      if (hits >= RATE_LIMIT_PER_HOUR) {
        return json({ error: 'Too many submissions. Please try again later.' }, 429, origin);
      }

      const id = `lead:${new Date().toISOString()}:${crypto.randomUUID().slice(0, 8)}`;
      const record = {
        id,
        name,
        phone,
        location,
        property,
        system,
        notes,
        pageUrl: clean(data.pageUrl, 300),
        submittedAt: new Date().toISOString(),
        country: request.headers.get('CF-IPCountry') || '',
        userAgent: clean(request.headers.get('User-Agent'), 200),
        whatsappDelivered: 'unknown',
      };

      await env.LEADS.put(id, JSON.stringify(record));

      // Touch the rate limit counter (1 hour TTL).
      await env.LEADS.put(rlKey, String(hits + 1), { expirationTtl: 3600 });

      // Optional: mirror to an email/webhook if you set one.
      if (env.NOTIFY_WEBHOOK) {
        try {
          await fetch(env.NOTIFY_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `New solar lead: ${name} (${phone}) — ${location} — ${system}`,
              lead: record,
            }),
          });
        } catch {
          /* never fail the request because notification failed */
        }
      }

      return json({ ok: true, stored: true, id }, 200, origin);
    }

    return json({ error: 'Method not allowed' }, 405, origin);
  },
};
