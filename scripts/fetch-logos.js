#!/usr/bin/env node
/**
 * Okara Hub — Logo Fetcher
 * Fetches official logos for each AI provider using multiple strategies:
 *   1. Direct SVG/PNG URLs
 *   2. Clearbit Logo API (high-quality PNGs)
 *   3. HTML scraping — reads <link rel="icon"> from the site
 *   4. Google Favicon service (fallback)
 *
 * Usage: node scripts/fetch-logos.js
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR  = path.join(__dirname, '..', 'public', 'logos');
const LOGOS_JS = path.join(__dirname, '..', 'src', 'lib', 'logos.js');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Provider definitions ────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: 'chatgpt', name: 'ChatGPT', color: '#10a37f', domain: 'chatgpt.com',
    direct: [
      'https://cdn.oaistatic.com/assets/favicon-o20kmmos.svg',
      'https://cdn.oaistatic.com/assets/apple-touch-icon-mz9nytnj.webp',
    ],
  },
  {
    id: 'claude', name: 'Claude', color: '#d97757', domain: 'claude.ai',
    direct: [
      'https://claude.ai/images/claude_app_icon.png',
    ],
  },
  {
    id: 'gemini', name: 'Gemini', color: '#4285f4', domain: 'gemini.google.com',
    direct: [
      'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
      'https://www.gstatic.com/gemini-app/favicon.ico',
    ],
  },
  {
    id: 'perplexity', name: 'Perplexity', color: '#20b2aa', domain: 'perplexity.ai',
    direct: [
      'https://www.perplexity.ai/favicon.ico',
    ],
  },
  {
    id: 'deepseek', name: 'DeepSeek', color: '#1e40af', domain: 'deepseek.com',
    direct: [
      'https://chat.deepseek.com/favicon.ico',
      'https://www.deepseek.com/favicon.ico',
    ],
  },
  {
    id: 'mistral', name: 'Mistral', color: '#ff7000', domain: 'mistral.ai',
    direct: [
      'https://mistral.ai/favicon.ico',
      'https://chat.mistral.ai/favicon.ico',
    ],
  },
  {
    id: 'grok', name: 'Grok', color: '#000000', domain: 'grok.com',
    direct: [
      'https://grok.com/favicon.ico',
      'https://x.ai/favicon.ico',
    ],
  },
  {
    id: 'meta', name: 'Meta AI', color: '#0866ff', domain: 'meta.ai',
    direct: [
      'https://www.meta.ai/favicon.ico',
    ],
  },
  {
    id: 'copilot', name: 'Copilot', color: '#0078d4', domain: 'copilot.microsoft.com',
    direct: [
      'https://copilot.microsoft.com/favicon.ico',
      'https://www.bing.com/favicon.ico',
    ],
  },
  {
    id: 'poe', name: 'Poe', color: '#8b5cf6', domain: 'poe.com',
    direct: ['https://poe.com/favicon.ico'],
  },
  {
    id: 'cohere', name: 'Cohere', color: '#39d353', domain: 'cohere.com',
    direct: ['https://coral.cohere.com/favicon.ico', 'https://cohere.com/favicon.ico'],
  },
  {
    id: 'you', name: 'You.com', color: '#ff4785', domain: 'you.com',
    direct: ['https://you.com/favicon.ico'],
  },
  {
    id: 'groq', name: 'Groq', color: '#f55036', domain: 'groq.com',
    direct: ['https://groq.com/favicon.ico'],
  },
  {
    id: 'huggingface', name: 'HuggingFace', color: '#ff9d00', domain: 'huggingface.co',
    direct: ['https://huggingface.co/favicon.ico'],
  },
  {
    id: 'phind', name: 'Phind', color: '#6366f1', domain: 'phind.com',
    direct: ['https://www.phind.com/favicon.ico'],
  },
  {
    id: 'pi', name: 'Pi', color: '#f59e0b', domain: 'pi.ai',
    direct: ['https://pi.ai/favicon.ico'],
  },
];

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'image/svg+xml,image/webp,image/png,image/*,*/*',
};

function fetchBuffer(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: HEADERS, timeout: 10000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return fetchBuffer(next, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buf: Buffer.concat(chunks), ct: res.headers['content-type'] || '' }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function fetchText(url) {
  return fetchBuffer(url).then(({ buf }) => buf.toString('utf8'));
}

function getExt(url, ct) {
  if (ct.includes('svg') || url.endsWith('.svg'))  return '.svg';
  if (ct.includes('webp') || url.endsWith('.webp')) return '.webp';
  if (ct.includes('png') || url.endsWith('.png'))  return '.png';
  return '.ico';
}

function isValidImage(buf, ext) {
  if (!buf || buf.length < 16) return false;
  if (ext === '.svg')  return buf.toString('utf8', 0, 200).includes('<');
  if (ext === '.png')  return buf[0] === 0x89 && buf[1] === 0x50;
  if (ext === '.webp') return buf.toString('ascii', 0, 4) === 'RIFF';
  return buf.length > 64; // ico
}

// ─── Strategy 1: Direct URL list ─────────────────────────────────────────────
async function tryDirect(provider) {
  for (const url of (provider.direct || [])) {
    try {
      process.stdout.write(`    [direct] ${url.slice(0, 65)}... `);
      const { buf, ct } = await fetchBuffer(url);
      const ext = getExt(url, ct);
      if (!isValidImage(buf, ext)) { console.log('✗ bad image'); continue; }
      console.log(`✓ (${ext}, ${(buf.length/1024).toFixed(1)}KB)`);
      return { buf, ext };
    } catch (e) { console.log(`✗ ${e.message}`); }
  }
  return null;
}

// ─── Strategy 2: Clearbit logo API ───────────────────────────────────────────
async function tryClearbit(provider) {
  const url = `https://logo.clearbit.com/${provider.domain}?size=128`;
  try {
    process.stdout.write(`    [clearbit] ${url}... `);
    const { buf, ct } = await fetchBuffer(url);
    const ext = getExt(url, ct);
    if (!isValidImage(buf, ext)) { console.log('✗ bad image'); return null; }
    console.log(`✓ (${ext}, ${(buf.length/1024).toFixed(1)}KB)`);
    return { buf, ext };
  } catch (e) { console.log(`✗ ${e.message}`); return null; }
}

// ─── Strategy 3: Scrape <link rel="icon"> from HTML ──────────────────────────
async function tryScrape(provider) {
  const siteUrl = `https://${provider.domain}`;
  try {
    process.stdout.write(`    [scrape]  ${siteUrl}... `);
    const html = await fetchText(siteUrl);

    // Find all icon link tags
    const iconRe = /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi;
    const hrefRe = /href=["']([^"']+)["']/i;
    const matches = html.match(iconRe) || [];

    // Prefer SVG > PNG > others, then largest size
    const candidates = [];
    for (const tag of matches) {
      const m = tag.match(hrefRe);
      if (!m) continue;
      let href = m[1];
      if (!href.startsWith('http')) href = new URL(href, siteUrl).href;
      const isSvg  = href.includes('.svg') || tag.includes('svg');
      const isPng  = href.includes('.png');
      const isLarge = tag.includes('192') || tag.includes('256') || tag.includes('512');
      candidates.push({ href, score: (isSvg ? 10 : 0) + (isPng ? 5 : 0) + (isLarge ? 3 : 0) });
    }
    candidates.sort((a, b) => b.score - a.score);
    console.log(`found ${candidates.length} icon(s)`);

    for (const c of candidates.slice(0, 4)) {
      try {
        process.stdout.write(`      → ${c.href.slice(0, 65)}... `);
        const { buf, ct } = await fetchBuffer(c.href);
        const ext = getExt(c.href, ct);
        if (!isValidImage(buf, ext)) { console.log('✗ bad'); continue; }
        console.log(`✓ (${ext})`);
        return { buf, ext };
      } catch (e) { console.log(`✗ ${e.message}`); }
    }
  } catch (e) { console.log(`✗ ${e.message}`); }
  return null;
}

// ─── Strategy 4: Google favicon service (last resort) ────────────────────────
async function tryGoogle(provider) {
  const url = `https://www.google.com/s2/favicons?sz=64&domain_url=https://${provider.domain}`;
  try {
    process.stdout.write(`    [google]  ${url}... `);
    const { buf, ct } = await fetchBuffer(url);
    const ext = getExt(url, ct);
    if (!isValidImage(buf, ext)) { console.log('✗'); return null; }
    console.log(`✓ (${ext}, ${(buf.length/1024).toFixed(1)}KB)`);
    return { buf, ext };
  } catch (e) { console.log(`✗ ${e.message}`); return null; }
}

// ─── Main fetch logic per provider ───────────────────────────────────────────
async function fetchLogo(provider) {
  let result = await tryDirect(provider);
  if (!result) result = await tryClearbit(provider);
  if (!result) result = await tryScrape(provider);
  if (!result) result = await tryGoogle(provider);
  return result;
}

// ─── Entry point ─────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎨  Okara Hub — Logo Fetcher\n');
  console.log(`Saving to: ${OUT_DIR}\n`);

  const logos = {};
  let ok = 0, fail = 0;

  for (const p of PROVIDERS) {
    console.log(`\n[${p.id}] ${p.name}`);
    const result = await fetchLogo(p);

    if (result) {
      ok++;
      const filename = `${p.id}${result.ext}`;
      fs.writeFileSync(path.join(OUT_DIR, filename), result.buf);

      const mime = result.ext === '.svg'  ? 'image/svg+xml'
                 : result.ext === '.png'  ? 'image/png'
                 : result.ext === '.webp' ? 'image/webp'
                 : 'image/x-icon';
      logos[p.id] = `data:${mime};base64,${result.buf.toString('base64')}`;
      console.log(`  ✅  saved ${filename}`);
    } else {
      fail++;
      logos[p.id] = null;
      console.log(`  ⚠️   no logo found — will use letter fallback`);
    }
  }

  // Write logos.js
  const js = `// Auto-generated by: node scripts/fetch-logos.js
// Do not edit manually — re-run the script to refresh logos.
// Generated: ${new Date().toISOString()}

export const LOGOS = ${JSON.stringify(logos, null, 2)};

export function getLogo(providerId) {
  return LOGOS[providerId] || null;
}
`;
  fs.writeFileSync(LOGOS_JS, js);

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅  ${ok} logos fetched    ⚠️  ${fail} failed`);
  console.log(`📄  Written: src/lib/logos.js`);
  console.log(`🖼️   Files:   public/logos/`);
  console.log('\n🔁  Restart the app to see the logos (npm run dev)\n');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
