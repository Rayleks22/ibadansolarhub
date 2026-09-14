# Cloudflare Pages Free Hosting & Custom Domain Deployment Guide

This guide walks you through deploying **ibadansolarhub.com.ng** to **Cloudflare Pages (100% Free Tier)** and setting up your custom `.com.ng` domain, SSL certificate, and automated GitHub continuous deployment.

---

## Why Cloudflare Pages for IbadanSolarHub?

- **100% Free Forever**: Unlimited monthly bandwidth, 500 builds per month, and free SSL/TLS certificates.
- **Global Edge Performance**: Your site is served from Cloudflare edge servers worldwide, including Cloudflare's **Lagos Edge Node**, ensuring near-zero latency for visitors on MTN, Airtel, Glo, and Starlink.
- **DDoS & Bot Protection**: Enterprise-level protection included by default.

---

## Step 1: Push the Code to GitHub

1. Open your terminal in the project directory:
   ```bash
   cd C:\Users\adele\.gemini\antigravity\scratch\ibadansolarhub
   ```
2. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: IbadanSolarHub programmatic site"
   ```
3. Create a new repository on your GitHub account (e.g. `ibadansolarhub`).
4. Link and push:
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ibadansolarhub.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Connect Cloudflare Pages

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, click **Compute (Workers & Pages)** > **Pages**.
3. Click **Connect to Git** and choose **GitHub**.
4. Authorize Cloudflare to access your `ibadansolarhub` repository.
5. In the **Set up builds and deployments** screen, enter the following settings:
   - **Project name**: `ibadansolarhub` (or your choice)
   - **Production branch**: `main`
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Click **Save and Deploy**.
7. Cloudflare will clone the repository, run `npm run build`, and deploy your site in ~45 seconds. You'll receive a free staging URL like `https://ibadansolarhub.pages.dev`.

---

## Step 3: Connect Custom Domain `ibadansolarhub.com.ng`

1. In your Cloudflare Pages project overview, click the **Custom domains** tab.
2. Click **Set up a custom domain**.
3. Enter `ibadansolarhub.com.ng` (and optionally `www.ibadansolarhub.com.ng`).
4. **If your domain DNS is already on Cloudflare**:
   - Cloudflare will automatically add the CNAME record for you with one click.
5. **If your domain is registered elsewhere (e.g. Whogohost, QServers, Namecheap)**:
   - Go to your registrar's DNS management and add a CNAME record:
     - **Name / Host**: `@` (or `ibadansolarhub.com.ng`)
     - **Target / Value**: `ibadansolarhub.pages.dev`
     - **TTL**: Auto or 3600
   - *Recommended*: Change your nameservers at your registrar to Cloudflare's free nameservers for faster DNS propagation and full edge CDN caching.
6. Cloudflare will automatically provision a free SSL/TLS certificate within a few minutes.

---

## Step 4: Monetization Setup Checklist

### 1. Affiliate Marketing
- **Jumia Nigeria**: Join the [Jumia KOL Program](https://kol.jumia.com/). Replace the dummy affiliate URLs in `src/data/equipment-catalog.json` with your real affiliate tracking tag.
- **Konga**: Register on Konga's affiliate portal and update the Konga affiliate links.
- **Direct Vendors**: Negotiate with trusted solar merchants in Dugbe (Ibadan) or Alaba/Trade Fair (Lagos) to insert direct referral WhatsApp tracking links.

### 2. Display Ads
- Add your Google AdSense / Ezoic / Adsterra publisher script inside `src/layouts/BaseLayout.astro` `<head>`.
- The `AdSlot.astro` component is already configured throughout all high-traffic pages (Homepage, Calculator, Location pages, Package pages, and Equipment pages).

### 3. Digital Products (Paystack / Gumroad)
- Open a free account on [Paystack](https://paystack.com).
- Under **Payment Pages** or **Product Links**, create links for:
  - *The Nigerian Solar Buyer's Blueprint (2026 Edition)* (₦4,500)
  - *Complete Solar Load & BOQ Calculator Spreadsheet* (₦3,000)
  - *Solar Installer Business Proposal Kit* (₦7,500)
- Set up automated file delivery in Paystack (upload the PDF/Excel files to Paystack so buyers get instant download upon payment).
- Update the `paystackUrl` fields in `src/data/digital-products.json`.

### 4. High-Ticket Installer Leads
- In `src/pages/quote.astro` and `src/components/SolarCalculator.tsx`, replace `2348000000000` with your business WhatsApp phone number.
- When leads come in with their property details and system size, you can:
  - Sell the lead to a vetted installer for ₦5,000 – ₦25,000 each.
  - Or partner with an installer for a 5% cut on every closed installation contract.
