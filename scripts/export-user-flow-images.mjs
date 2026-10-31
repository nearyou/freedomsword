import { createRequire } from 'node:module';
import { resolve, join, extname, sep } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// This renderer uses a fresh, isolated browser context. It never uses a desktop profile.
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const runtime = option('--runtime-modules', process.env.NODE_MODULES_PATH);
const require = createRequire(runtime ? join(resolve(runtime), 'package.json') : import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');
// Telegram InlineQueryResultPhoto requires JPEG; keep the share image derived from the same artwork.
await sharp(resolve('frontend/public/brand/invitation-teaser.svg')).flatten({ background: '#102c3e' }).jpeg({ quality: 90 }).toFile(resolve('frontend/public/brand/invitation-teaser.jpg'));
const origin = option('--origin', 'https://freedomsword.org');
const source = resolve('frontend/public/review/user-flows');
const destination = resolve(option('--output', join(source, 'images')));
const index = await readFile(join(source, 'index.html'), 'utf8');
const steps = [...index.matchAll(/<iframe title="([^"]+)" src="([^"]+)"/g)].map((match) => ({ title: match[1], file: match[2], slug: match[2].replace('.html', '') }));
if (steps.length !== 18) throw new Error('Expected all 18 ordered review screens.');
await mkdir(destination, { recursive: true });
await mkdir(join(destination, 'phone-views'), { recursive: true });
const browser = await chromium.launch({ headless: true });
const exported = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', reducedMotion: 'reduce' });
  if (!args.includes('--remote')) {
    const publicRoot = resolve('frontend/public');
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      const file = resolve(publicRoot, '.' + decodeURIComponent(url.pathname));
      if (url.origin !== new URL(origin).origin || !file.startsWith(publicRoot + sep)) return route.abort();
      try { await route.fulfill({ status: 200, contentType: types[extname(file)] ?? 'application/octet-stream', body: await readFile(file) }); }
      catch { await route.fulfill({ status: 404, body: 'Asset not found' }); }
    });
  }
  const page = await context.newPage();
  for (const step of steps) {
    const failures = [];
    const onFailed = (request) => failures.push(request.url());
    page.on('requestfailed', onFailed);
    const response = await page.goto(`${origin}/review/user-flows/${step.file}`, { waitUntil: 'networkidle', timeout: 45_000 });
    if (response?.status() !== 200) throw new Error(`Could not load ${step.file}`);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((image) => image.decode().catch(() => {}))); });
    const broken = await page.locator('img').evaluateAll((images) => images.filter((image) => !image.complete || !image.naturalWidth).map((image) => image.src));
    if (broken.length || failures.length) throw new Error(`Missing assets in ${step.file}: ${[...broken, ...failures].join(', ')}`);
    await page.screenshot({ path: join(destination, 'phone-views', `${step.slug}.png`), animations: 'disabled' });
    // A second export reveals long cards and dialogs in full, without a fixed bar covering them.
    await page.addStyleTag({ content: `
      .modal-backdrop { position: relative !important; inset: auto !important; min-height: calc(100svh - 48px); padding-top: 24px !important; padding-bottom: 24px !important; }
      .modal { max-height: none !important; overflow: visible !important; }
      .mobile-nav { position: relative !important; inset: auto !important; }
      .app-shell { min-height: calc(100svh - 120px) !important; }
      .citizen-main { padding-bottom: 24px !important; }
    ` });
    const fullPath = join(destination, `${step.slug}.png`);
    await page.screenshot({ path: fullPath, fullPage: true, animations: 'disabled' });
    const metadata = await sharp(fullPath).metadata();
    if (metadata.width !== 780 || !metadata.height || metadata.height < 1500) throw new Error(`Unexpected capture dimensions for ${step.file}`);
    exported.push({ ...step, width: metadata.width, height: metadata.height });
    page.off('requestfailed', onFailed);
    console.log(`Exported ${step.title}: ${metadata.width} × ${metadata.height}`);
  }
} finally { await browser.close(); }
const tileWidth = 300, tileHeight = 690, gap = 24, columns = 4;
const tiles = [];
for (let i = 0; i < exported.length; i++) {
  const step = exported[i];
  const label = `<svg width="${tileWidth}" height="40"><rect width="100%" height="100%" fill="#0a1722"/><text x="4" y="25" fill="#f1f3f2" font-family="Arial,sans-serif" font-size="14">${step.title.replaceAll('&', '&amp;')}</text></svg>`;
  const screenshot = await sharp(join(destination, 'phone-views', `${step.slug}.png`)).resize(tileWidth, tileHeight - 40, { fit: 'contain', background: '#0a1722' }).png().toBuffer();
  const left = gap + (i % columns) * (tileWidth + gap), top = gap + Math.floor(i / columns) * (tileHeight + gap);
  tiles.push({ input: Buffer.from(label), left, top }, { input: screenshot, left, top: top + 40 });
}
await sharp({ create: { width: columns * (tileWidth + gap) + gap, height: Math.ceil(exported.length / columns) * (tileHeight + gap) + gap, channels: 3, background: '#0a1722' } }).composite(tiles).png().toFile(join(destination, '00-all-steps.png'));
await writeFile(join(destination, 'manifest.json'), JSON.stringify({ title: 'FreedomSword user flows 3–20', viewport: { width: 390, height: 844 }, scale: 2, steps: exported }, null, 2) + '\n');
await writeFile(join(destination, 'README.txt'), 'FreedomSword — user flows 3–20\n\nNumbered PNGs show each step in full, including content below the initial viewport.\nphone-views/ contains the initial 390 × 844 phone views at 2× resolution.\n00-all-steps.png is the ordered overview. Sample agreement and audit entries are layout illustrations.\n\nSource: https://freedomsword.org/review/user-flows/index.html\n');
console.log(`All ${exported.length} steps exported to ${destination}`);
