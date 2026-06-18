/**
 * electron/logo-fetcher.js
 *
 * Fetches official logos directly from each provider's domain — exactly what
 * you'd see if you visited their site in a browser. Runs inside the Electron
 * main process so it has full, unrestricted network access.
 *
 * Strategy per domain (in priority order):
 *   1. Scrape the homepage HTML for <link rel="icon"> / <link rel="apple-touch-icon">
 *      → picks the highest-resolution SVG or PNG found
 *   2. Try /favicon.ico directly from the domain
 *   3. Try Google's public favicon service as last resort
 *
 * Results are cached to ~/.config/neural-dock/logos/<domain>.png|svg
 * A manifest (logo-manifest.json) records URL + etag so we only re-fetch
 * when the server says the file changed (304 Not Modified).
 */

const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const os     = require('os');

const LOGO_DIR     = path.join(os.homedir(), '.config', 'neural-dock', 'logos');
const MANIFEST     = path.join(os.homedir(), '.config', 'neural-dock', 'logo-manifest.json');
const TIMEOUT_MS   = 12000;
const MAX_REDIRECT = 6;

if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

// ─── Manifest helpers ─────────────────────────────────────────────────────────
function loadManifest() {
  try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return {}; }
}
function saveManifest(m) {
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2));
}

// ─── HTTP fetch ───────────────────────────────────────────────────────────────
function fetchRaw(url, extraHeaders = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > MAX_REDIRECT) return reject(new Error('Too many redirects'));
    let parsed;
    try { parsed = new URL(url); } catch (e) { return reject(e); }

    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(url, {
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
        'Accept': 'text/html,image/svg+xml,image/webp,image/png,image/*,*/*;q=0.9',
        ...extraHeaders,
      },
    }, (res) => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return fetchRaw(next, extraHeaders, redirects + 1).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// ─── Image validation ─────────────────────────────────────────────────────────
function detectType(buf) {
  if (!buf || buf.length < 8) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'jpg';
  if (buf[0] === 0x52 && buf[3] === 0x46) return 'webp'; // RIFF....WEBP
  if (buf.slice(0, 4).toString() === '<svg' || buf.includes('<svg')) return 'svg';
  if (buf.includes('<?xml') && buf.includes('<svg')) return 'svg';
  // ICO magic
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return 'ico';
  const text = buf.slice(0, 500).toString('utf8');
  if (text.trimStart().startsWith('<svg') || text.includes('<svg ')) return 'svg';
  return null;
}

function isValidImage(buf) {
  const t = detectType(buf);
  if (!t) return false;
  if (t === 'svg') return buf.length > 50;
  if (t === 'ico') return buf.length > 30;
  return buf.length > 200; // PNG/JPG/WEBP must be a real image
}

function extFor(type) {
  return { svg: '.svg', png: '.png', jpg: '.jpg', webp: '.webp', ico: '.png' }[type] || '.png';
}

// ─── Parse icon links from HTML ───────────────────────────────────────────────
function parseIconLinks(html, baseUrl) {
  const candidates = [];

  // Match <link ... rel="...icon..." ...> in any attribute order
  const linkRe = /<link([^>]+)>/gi;
  const attrRe = /(\w[\w-]*)=["']([^"']*)["']/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const tag = m[1];
    const attrs = {};
    let a;
    while ((a = attrRe.exec(tag)) !== null) attrs[a[1].toLowerCase()] = a[2];
    attrRe.lastIndex = 0;

    const rel = (attrs.rel || '').toLowerCase();
    if (!rel.includes('icon')) continue;

    let href = attrs.href;
    if (!href || href.startsWith('data:')) continue;
    try {
      href = new URL(href, baseUrl).href;
    } catch { continue; }

    const sizes = attrs.sizes || '';
    const isSvg = href.includes('.svg') || (attrs.type || '').includes('svg');
    const sizeNum = parseInt(sizes.split('x')[0]) || 0;
    const isApple = rel.includes('apple');

    // Score: SVG wins, then larger sizes, then apple-touch
    const score = (isSvg ? 1000 : 0) + sizeNum + (isApple ? 50 : 0);
    candidates.push({ href, score, isSvg });
  }

  // Also look for og:image as a fallback
  const ogRe = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i;
  const og = html.match(ogRe);
  if (og) {
    try { candidates.push({ href: new URL(og[1], baseUrl).href, score: -10 }); } catch {}
  }

  return candidates.sort((a, b) => b.score - a.score);
}

// ─── Fetch a single logo for a domain ────────────────────────────────────────
async function fetchLogoForDomain(domain, providerUrl, log) {
  const base = providerUrl || `https://${domain}`;
  const label = domain;

  // Step 1: scrape homepage for icon links
  log('INFO', 'LOGOS', `Scraping ${base} for icons...`);
  let homeHtml = null;
  try {
    const res = await fetchRaw(base);
    if (res.status === 200) homeHtml = res.body.toString('utf8');
  } catch (e) {
    log('WARN', 'LOGOS', `Could not scrape ${base}: ${e.message}`);
  }

  const candidates = homeHtml ? parseIconLinks(homeHtml, base) : [];

  // Also always add favicon.ico and apple-touch-icon as candidates
  const origin = new URL(base).origin;
  candidates.push(
    { href: `${origin}/favicon.svg`, score: 900 },
    { href: `${origin}/favicon.png`, score: 500 },
    { href: `${origin}/apple-touch-icon.png`, score: 200 },
    { href: `${origin}/favicon.ico`, score: 100 },
  );

  // Step 2: try each candidate in score order
  for (const c of candidates.slice(0, 8)) {
    try {
      log('INFO', 'LOGOS', `  → trying ${c.href.slice(0, 80)}`);
      const res = await fetchRaw(c.href);
      if (res.status !== 200) continue;
      if (!isValidImage(res.body)) continue;
      const type = detectType(res.body);
      const ext  = extFor(type);
      log('INFO', 'LOGOS', `  ✅ got ${type} (${(res.body.length/1024).toFixed(1)}KB) from ${c.href.slice(0, 60)}`);
      return { buffer: res.body, ext, type, sourceUrl: c.href, etag: res.headers.etag || '' };
    } catch (e) {
      log('WARN', 'LOGOS', `  ✗ ${c.href.slice(0, 60)}: ${e.message}`);
    }
  }

  // Step 3: Google favicon service as absolute last resort
  const gUrl = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(base)}`;
  try {
    log('INFO', 'LOGOS', `  → Google favicon service: ${gUrl}`);
    const res = await fetchRaw(gUrl);
    if (res.status === 200 && isValidImage(res.body)) {
      const type = detectType(res.body);
      log('INFO', 'LOGOS', `  ✅ got from Google (${type})`);
      return { buffer: res.body, ext: extFor(type), type, sourceUrl: gUrl, etag: '' };
    }
  } catch (e) {
    log('WARN', 'LOGOS', `  ✗ Google fallback: ${e.message}`);
  }

  log('WARN', 'LOGOS', `  ❌ No logo found for ${domain}`);
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Update logos for all models in the config.
 * Only re-fetches if the logo file is missing or the etag changed.
 * @param {Array} models - array of model objects
 * @param {Function} log  - logger(level, tag, msg)
 * @param {boolean} force - ignore cache, always re-fetch
 * @returns {Object} map of modelId → local file path
 */
async function updateAllLogos(models, log, force = false) {
  const manifest = loadManifest();
  const results  = {};

  for (const model of models) {
    let domain;
    try { domain = new URL(model.url).hostname.replace(/^www\./, ''); } catch { continue; }

    const cached = manifest[model.id];
    const filePath = cached?.file && fs.existsSync(cached.file) ? cached.file : null;

    if (!force && filePath) {
      // File exists — check if it's still fresh (< 24 hours)
      const age = Date.now() - (cached.fetchedAt || 0);
      if (age < 24 * 60 * 60 * 1000) {
        results[model.id] = filePath;
        continue;
      }
    }

    log('INFO', 'LOGOS', `Fetching logo for ${model.name} (${domain})`);
    const result = await fetchLogoForDomain(domain, model.url, log);

    if (result) {
      const filename = `${model.id}${result.ext}`;
      const outPath  = path.join(LOGO_DIR, filename);
      fs.writeFileSync(outPath, result.buffer);
      manifest[model.id] = { file: outPath, source: result.sourceUrl, etag: result.etag, fetchedAt: Date.now() };
      saveManifest(manifest);
      results[model.id] = outPath;
    } else {
      results[model.id] = null;
    }
  }

  return results;
}

/**
 * Fetch logo for a single newly-added model.
 * @returns local file path, or null
 */
async function fetchLogoForModel(model, log) {
  let domain;
  try { domain = new URL(model.url).hostname.replace(/^www\./, ''); } catch { return null; }

  log('INFO', 'LOGOS', `Fetching logo for new model: ${model.name} (${domain})`);
  const result = await fetchLogoForDomain(domain, model.url, log);
  if (!result) return null;

  const filename = `${model.id}${result.ext}`;
  const outPath  = path.join(LOGO_DIR, filename);
  fs.writeFileSync(outPath, result.buffer);

  const manifest = loadManifest();
  manifest[model.id] = { file: outPath, source: result.sourceUrl, etag: result.etag, fetchedAt: Date.now() };
  saveManifest(manifest);

  return outPath;
}

/**
 * Return the manifest so the renderer can request logo data URIs.
 */
function getLogoManifest() {
  return loadManifest();
}

/**
 * Read a saved logo as a base64 data URI (for the renderer).
 */
function getLogoDataUri(modelId) {
  const manifest = loadManifest();
  const entry = manifest[modelId];
  if (!entry || !entry.file || !fs.existsSync(entry.file)) return null;

  const buf  = fs.readFileSync(entry.file);
  const ext  = path.extname(entry.file).toLowerCase();
  const mime = ext === '.svg' ? 'image/svg+xml'
             : ext === '.png' ? 'image/png'
             : ext === '.jpg' ? 'image/jpeg'
             : ext === '.webp' ? 'image/webp'
             : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

module.exports = { updateAllLogos, fetchLogoForModel, getLogoManifest, getLogoDataUri, LOGO_DIR };
