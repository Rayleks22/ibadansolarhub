/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SITE CONFIGURATION — single source of truth
 * ─────────────────────────────────────────────────────────────────────────────
 * Every phone number, affiliate link and integration key lives here.
 * If something needs changing across the whole site, change it here once.
 *
 * Audit reference: 5 Oct 2026 — the WhatsApp number was previously hard-coded
 * in 6 places across 4 files, which is how a placeholder shipped to production.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * WhatsApp number in FULL INTERNATIONAL FORMAT: country code + number,
 * with NO leading "+", NO leading zero, NO spaces or dashes.
 *
 * Nigerian local 0802 712 7331  →  2348027127331
 * Verify by opening: https://wa.me/2348027127331
 */
export const WHATSAPP_NUMBER = '2348027127331';

/** Display form used in visible copy (About page, footers, printed BOQ). */
export const WHATSAPP_DISPLAY = '+234 802 712 7331';

/** Business identity used in schema, printed documents and share cards. */
export const SITE = {
  name: 'IbadanSolarHub.com.ng',
  shortName: 'IbadanSolarHub',
  url: 'https://ibadansolarhub.com.ng',
  /**
   * ⚠️ VERIFY BEFORE PUBLISHING.
   * This address was assumed, not supplied. Either create the mailbox on your
   * domain or change it here — it is displayed publicly on /contact and
   * /privacy and is referenced by the contact form fallback.
   */
  email: 'hello@ibadansolarhub.com.ng',
  city: 'Ibadan',
  region: 'Oyo State',
  country: 'NG',
} as const;

/**
 * ⚠️ PLACEHOLDER — these appear on /about and /contact and in Organization
 * schema. Replace with your real registered details before publishing.
 * Leaving them blank is safer than publishing something inaccurate.
 */
export const BUSINESS = {
  legalName: 'Ibadan Solar Hub',
  /** e.g. 'RC 1234567' — required by some ad networks and payment providers. */
  registrationNumber: '',
  /** Street address, if you have a business premises you are happy to publish. */
  addressLine: '',
  addressLocality: 'Ibadan',
  addressRegion: 'Oyo State',
  /** Update if you have real founding information. */
  foundedYear: '',
} as const;

/**
 * Earthbond — solar financing for Nigerian businesses (5kVA–50kVA on
 * monthly payment plans). Referral link supplied by the site owner.
 *
 * Placement strategy (deliberately contextual, not sprayed everywhere):
 *   • Calculator  → shown only when the recommended system is 5kVA or above
 *   • Packages    → 5kVA and 10kVA package pages only
 *   • /solar-financing → dedicated landing page
 *   • Footer      → single text link
 *
 * Rationale: financing is only relevant at larger system sizes. Showing it on
 * a 1.2kVA starter kit would be noise and would dilute trust in the sizing tool.
 */
export const EARTHBOND = {
  url: 'https://earthbond.co/referral/196e8886',
  name: 'Earthbond',
  tagline: 'Solar financing for Nigerian businesses — monthly payment plans, no huge upfront cost.',
  /** Minimum recommended inverter size (kVA) before we surface financing. */
  minKvaForOffer: 5,
  /** Earthbond's own published product range. */
  rangeLabel: '5kVA – 50kVA',
} as const;

/**
 * Optional durable lead storage for the quote form.
 *
 * Leave as '' to run WhatsApp-only (the form still works, nothing is stored).
 * Set to your worker endpoint to ALSO save every submission, e.g.
 *   LEAD_ENDPOINT = 'https://leads.ibadansolarhub.com.ng/api/lead'
 * See `worker/README.md` for the ready-to-deploy Cloudflare Worker.
 *
 * Why: WhatsApp opens the chat, but if the visitor abandons it you currently
 * have no record that they ever came. This keeps a copy.
 */
export const LEAD_ENDPOINT = '';

/**
 * ── ANALYTICS ────────────────────────────────────────────────────────────────
 * The audit found zero analytics installed, so there is no way to know which
 * pages earn traffic or whether the WhatsApp CTAs convert.
 *
 * Leave ga4Id empty and NOTHING is loaded — no script, no cookie, no request.
 * Set it and the tag plus all conversion events switch on.
 *
 * Recommended events now wired: whatsapp_click, financing_click,
 * affiliate_click, product_click, quote_submit, calculator_used.
 *
 * Prefer cookieless (better fit for this performance profile)? Use
 * customScriptSrc + customDomain for Plausible or Umami instead — both are
 * a fraction of GA4's weight and need no consent banner.
 */
export const ANALYTICS = {
  /** GA4 Measurement ID, e.g. 'G-XXXXXXXXXX'. Create at analytics.google.com */
  ga4Id: '',
  /** Alternative: full script URL, e.g. 'https://plausible.io/js/script.js' */
  customScriptSrc: '',
  /** Domain for the cookieless script, e.g. 'ibadansolarhub.com.ng' */
  customDomain: 'ibadansolarhub.com.ng',
} as const;

/** Honeypot field name — bots fill it, humans never see it. */
export const HONEYPOT_FIELD = 'company_website_url';
