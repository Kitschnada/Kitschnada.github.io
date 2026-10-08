/* Navigation acceptance on a real, strict static server. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifacts = process.env.NAV_ARTIFACTS || path.join(root, 'local', 'previews', 'integrated-navigation');
const selected = (process.env.NAV_CHECK || '').toLowerCase();
const passed = [], failures = [];
let origin = process.env.NAV_ORIGIN, browser, server, temporary;
fs.mkdirSync(artifacts, { recursive: true });

async function check(name, run) {
  if (selected && !name.toLowerCase().includes(selected)) return;
  try { await run(); passed.push(name); console.log('PASS ' + name); }
  catch (error) { failures.push({ name, error: error.stack }); console.error('FAIL ' + name + '\n' + error.message); }
}
async function withPage(options, run) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(origin); await page.evaluate(() => document.fonts.ready);
    await run(page); assert.deepEqual(errors, [], 'Unexpected browser errors');
  } finally { await context.close(); }
}
async function noOverflow(page) {
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  assert.ok(dimensions.content <= dimensions.viewport + 1, JSON.stringify(dimensions));
}
async function theme(page, palette) {
  if (await page.getAttribute('html', 'data-theme') !== palette) await page.locator('#theme-toggle').click();
  assert.equal(await page.getAttribute('html', 'data-theme'), palette);
  await page.mouse.move(1, 1);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function hoverSculpture(page) {
  const box = await page.locator('#hero-canvas').boundingBox();
  await page.mouse.move(box.x + box.width * .75, box.y + box.height * .35);
}
async function closed(page) {
  assert.equal(await page.locator('[data-ring-toggle]').getAttribute('aria-expanded'), 'false');
  for (const part of await page.locator('.ring-part').all()) {
    assert.equal(await part.evaluate(el => { el.focus(); return el === document.activeElement; }), false, 'Closed links cannot receive focus');
  }
}
async function open(page) {
  if (await page.locator('[data-ring-toggle]').getAttribute('aria-expanded') !== 'true') await page.locator('[data-ring-toggle]').click();
  await page.waitForFunction(() => document.querySelector('[data-visual-stage]').dataset.navOpen === 'true');
  await page.waitForTimeout(550);
}
async function iconTargets(page) {
  const icons = page.locator('.ring-nav .ring-part');
  assert.equal(await icons.count(), 5, 'Five destinations on the central sculpture');
  const bounds = [];
  for (const icon of await icons.all()) {
    assert.equal(await icon.isVisible(), true);
    assert.ok((await icon.getAttribute('aria-label') || '').trim(), 'Icon has a screen-reader name');
    assert.equal(await icon.locator('svg[aria-hidden="true"]').count(), 1);
    assert.ok(await icon.getAttribute('href'), 'Every part is a real link');
    const box = await icon.boundingBox(), viewport = page.viewportSize();
    assert.ok(box.width >= 44 && box.height >= 44, 'Touch target is at least 44 × 44: ' + JSON.stringify(box));
    assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, 'Navigation remains on screen: ' + JSON.stringify(box));
    bounds.push(box);
  }
  for (let i = 0; i < bounds.length; i++) for (let j = i + 1; j < bounds.length; j++) {
    const a = bounds[i], b = bounds[j];
    const overlapWidth = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const overlapHeight = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    assert.ok(overlapWidth <= 1 || overlapHeight <= 1, 'Icon targets do not overlap: ' + i + ', ' + j);
  }
}
async function screenshotPage(page, prefix) {
  await page.evaluate(() => document.fonts.ready);
  await page.keyboard.press('Escape'); await page.evaluate(() => document.activeElement.blur());
  await page.mouse.move(1, 1);
  await page.screenshot({ path: path.join(artifacts, prefix + '-closed.png'), fullPage: false, animations: 'disabled' });
  await open(page); await iconTargets(page);
  await page.screenshot({ path: path.join(artifacts, prefix + '-open.png'), fullPage: false, animations: 'disabled' });
  await page.keyboard.press('Escape'); await page.evaluate(() => document.activeElement.blur());
  for (const id of ['selected-work', 'recent-entries', 'contact']) {
    await page.locator('#' + id).scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(250); await noOverflow(page);
  await page.screenshot({ path: path.join(artifacts, prefix + '-full.png'), fullPage: true, animations: 'disabled' });
}
async function cornerMenu(page) {
  const summary = page.locator('.corner-nav > summary');
  await summary.click(); assert.equal(await page.locator('.corner-menu').isVisible(), true);
  return summary;
}

(async () => {
  if (!origin) {
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'navigation-check-'));
    const destination = path.join(temporary, 'site');
    const result = spawnSync('bundle', ['exec', 'jekyll', 'build', '--destination', destination], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
    server = http.createServer((req, res) => {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
      catch (_) { res.writeHead(400); return res.end(); }
      const base = path.resolve(destination, pathname.replace(/^\/+/, ''));
      if (base !== destination && !base.startsWith(destination + path.sep)) { res.writeHead(403); return res.end(); }
      const file = [base, path.join(base, 'index.html')].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
      if (!file) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = 'http://127.0.0.1:' + server.address().port;
  }
  browser = await chromium.launch({ headless: true, executablePath: process.env.NAV_CHROMIUM || process.env.GARDEN_CHROMIUM || undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

  await check('Central sculpture hover opens five named destinations and actual page routes', () => withPage({}, async page => {
    assert.equal(await page.locator('header, .mobius-nav-art, .dock-link, .nav-lens').count(), 0, 'Homepage has no separate top navigation');
    assert.ok((await page.locator('.cinematic-hero').boundingBox()).y <= 1, 'Hero begins at the top edge');
    await closed(page);
    await hoverSculpture(page);
    await page.waitForFunction(() => document.querySelector('[data-ring-toggle]').getAttribute('aria-expanded') === 'true');
    await page.waitForTimeout(550); await iconTargets(page);
    for (const icon of await page.locator('.ring-part').all()) {
      await icon.focus();
      assert.notEqual(await icon.evaluate(el => getComputedStyle(el).outlineStyle), 'none', 'Keyboard focus is visible');
    }
    const labels = await page.locator('.ring-part').evaluateAll(items => items.map(el => el.getAttribute('aria-label')));
    await page.locator('#language-toggle').click();
    assert.equal(await page.getAttribute('html', 'data-lang'), 'en'); await open(page);
    const translated = await page.locator('.ring-part').evaluateAll(items => items.map(el => el.getAttribute('aria-label')));
    for (let i = 0; i < labels.length; i++) assert.notEqual(labels[i], translated[i]);
    const paths = await page.locator('.ring-part').evaluateAll(links => links.map(a => new URL(a.href).pathname));
    assert.deepEqual(paths, ['/home/', '/blogs/', '/portfolio/', '/cv/', '/profile/']);
    for (const route of paths) {
      await page.goto(origin); await open(page);
      const [response] = await Promise.all([page.waitForNavigation(), page.locator('.ring-part[href$="' + route + '"]').click()]);
      assert.equal(response.status(), 200, route); assert.equal(new URL(page.url()).pathname, route);
      assert.ok(await page.locator('h1').innerText());
      assert.equal((await page.reload()).status(), 200, 'Direct reload of ' + route);
      if (route !== '/home/') {
        await cornerMenu(page);
        assert.equal(await page.locator('.corner-link[aria-current="page"]').getAttribute('href'), route);
        await page.locator('.corner-link[href$="/home/"]').click();
        assert.equal(new URL(page.url()).pathname, '/home/');
      }
    }
  }));

  await check('Keyboard and touch expansion, Escape, outside dismissal and quick search focus', () => withPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async page => {
    const toggle = page.locator('[data-ring-toggle]');
    await closed(page); await toggle.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('.ring-part').first().evaluate(el => document.activeElement === el), true);
    await iconTargets(page);
    await page.keyboard.press('Escape'); await closed(page);
    assert.equal(await toggle.evaluate(el => document.activeElement === el), true);
    await toggle.tap(); await iconTargets(page);
    const heading = await page.locator('#hero-name').boundingBox();
    await page.touchscreen.tap(heading.x + heading.width / 2, heading.y + heading.height / 2); await closed(page);
    await toggle.tap(); await page.locator('[data-open-nav]:visible').first().tap();
    assert.equal(await page.locator('#quick-nav').isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'quick-search');
    await page.keyboard.press('Escape'); await page.locator('#quick-nav').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement.hasAttribute('data-open-nav'));
    await closed(page);
    await toggle.focus(); await page.keyboard.press('Control+k');
    assert.equal(await page.locator('#quick-nav').isVisible(), true);
    await page.keyboard.press('Escape'); await page.locator('#quick-nav').waitFor({ state: 'hidden' });
    assert.equal(await toggle.evaluate(el => document.activeElement === el), true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.ring-part').first().evaluate(el => document.activeElement === el), true);
    await page.keyboard.press('Control+k');
    await page.waitForFunction(() => document.querySelector('[data-ring-toggle]').getAttribute('aria-expanded') === 'false');
    await page.keyboard.press('Escape'); await page.locator('#quick-nav').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement.hasAttribute('data-ring-toggle'));
    await page.locator('#contact').scrollIntoViewIfNeeded();
    const globalTrigger = page.locator('[data-global-nav]'); await globalTrigger.waitFor({ state: 'visible' });
    await globalTrigger.tap(); assert.equal(await page.locator('#quick-nav').isVisible(), true);
    await page.keyboard.press('Escape'); await page.locator('#quick-nav').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement.hasAttribute('data-global-nav'));
  }));

  await check('Interior native navigation, article categories and no-JavaScript fallback', async () => {
    for (const width of [1440, 390, 320]) await withPage({ javaScriptEnabled: false, viewport: { width, height: 844 } }, async page => {
      assert.equal(await page.locator('.ring-nav').isVisible(), true); await iconTargets(page); await noOverflow(page);
      await page.screenshot({ path: path.join(artifacts, 'no-js-' + width + '.png'), fullPage: false });
      await page.locator('.ring-part[href$="/blogs/"]').click();
      assert.equal(new URL(page.url()).pathname, '/blogs/');
      const summary = await cornerMenu(page);
      for (const link of await page.locator('.corner-link').all()) assert.equal(await link.isVisible(), true);
      await summary.click();
      await page.locator('.blog-index a[href$="/blogs/academic/"]').click();
      assert.equal(new URL(page.url()).pathname, '/blogs/academic/');
      await cornerMenu(page); await page.locator('.corner-link[href$="/home/"]').click();
      assert.equal(new URL(page.url()).pathname, '/home/');
    });
    await withPage({ viewport: { width: 390, height: 844 } }, async page => {
      await page.goto(origin + '/blogs/');
      const summary = page.locator('.corner-nav > summary');
      await summary.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('.corner-menu').isVisible(), true);
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => !!document.activeElement.closest('.corner-menu')), true);
      await page.keyboard.press('Escape'); assert.equal(await page.locator('.corner-menu').isVisible(), false);
      assert.equal(await summary.evaluate(el => document.activeElement === el), true);
      for (const category of ['/blogs/life/', '/blogs/academic/', '/blogs/study/', '/blogs/sharing/']) {
        const [response] = await Promise.all([page.waitForNavigation(), page.locator('.blog-index a[href$="' + category + '"]').click()]);
        assert.equal(response.status(), 200); assert.equal(new URL(page.url()).pathname, category);
      }
      await cornerMenu(page); await page.locator('#theme-toggle').click();
      assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
      await page.screenshot({ path: path.join(artifacts, 'interior-menu-mobile-light.png'), fullPage: false, animations: 'disabled' });
    });
  });

  await check('Five widths and both themes: closed/open screenshots, separated touch targets and no overflow', async () => {
    for (const width of [1440, 1024, 768, 390, 320]) for (const palette of ['dark', 'light']) {
      // A fresh context per viewport avoids stale software-GPU compositor tiles.
      await withPage({ viewport: { width, height: width <= 390 ? 844 : 1000 } }, async page => {
        await theme(page, palette); await noOverflow(page); await closed(page);
        await screenshotPage(page, 'page-reduced-' + width + '-' + palette);
      });
    }
    for (const viewport of [{ width: 320, height: 568 }, { width: 900, height: 412 }]) await withPage({ viewport }, async page => {
      await open(page); await page.locator('.ring-part').last().scrollIntoViewIfNeeded();
      await noOverflow(page);
      const [response] = await Promise.all([page.waitForNavigation(), page.locator('.ring-part[href$="/profile/"]').click()]);
      assert.equal(response.status(), 200); await cornerMenu(page);
      const last = page.locator('.corner-link').last(); await last.scrollIntoViewIfNeeded();
      const box = await last.boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= viewport.height + 1, 'Short-screen interior menu is reachable');
      await page.screenshot({ path: path.join(artifacts, 'short-' + viewport.width + 'x' + viewport.height + '.png'), fullPage: false, animations: 'disabled' });
    });
  });

  await check('The paused sculpture physically separates and highlights a selected part', () => withPage({}, async page => {
    await page.waitForFunction(() => document.querySelector('[data-visual-stage]').dataset.renderer === 'webgl');
    const canvas = page.locator('#hero-canvas');
    // Hide only the HTML controls during these canvas captures so the visible
    // difference must come from the renderer rather than the overlaid links.
    const controls = await page.addStyleTag({ content: '.ring-nav, .ring-toggle { opacity: 0 !important; }' });
    const before = await canvas.screenshot({ animations: 'disabled' });
    await hoverSculpture(page); await page.waitForTimeout(600);
    const expanded = await canvas.screenshot({ animations: 'disabled' });
    assert.ok(!before.equals(expanded), 'Opening navigation changes the actual sculpture');
    await page.locator('.ring-part').nth(2).focus(); await page.waitForTimeout(100);
    const selectedPart = await canvas.screenshot({ animations: 'disabled' });
    assert.ok(!expanded.equals(selectedPart), 'Focusing a destination highlights its mesh part');
    await controls.evaluate(el => el.remove()); await page.keyboard.press('Escape'); await closed(page);
    assert.equal(await page.getAttribute('html', 'data-motion'), 'paused');
  }));

  await check('Reduced motion, keyboard skip link and usable links without WebGL', async () => {
    await withPage({}, async page => {
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
      await page.keyboard.press('Enter'); await page.waitForURL(url => url.hash === '#main');
      assert.equal(await page.getAttribute('html', 'data-motion'), 'paused');
      await open(page);
      const durations = await page.locator('.ring-part, .ring-toggle').evaluateAll(elements => elements.map(el => {
        const s = getComputedStyle(el); return { element: el.className, animation: s.animationDuration, transition: s.transitionDuration };
      }));
      for (const duration of durations) for (const value of (duration.animation + ',' + duration.transition).split(',')) {
        assert.ok(parseFloat(value) <= 0.01, JSON.stringify(duration));
      }
    });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
    });
    const page = await context.newPage();
    try {
      await page.goto(origin); assert.equal(await page.locator('.scene-fallback').isVisible(), true);
      await open(page); await iconTargets(page);
      await page.locator('.ring-part[href$="/blogs/"]').click(); assert.equal(new URL(page.url()).pathname, '/blogs/');
    } finally { await context.close(); }
  });

  await check('Normal-motion desktop and mobile reveal all homepage content', async () => {
    for (const width of [1440, 390]) for (const palette of ['dark', 'light']) await withPage({ reducedMotion: 'no-preference', viewport: { width, height: width < 768 ? 844 : 1000 } }, async page => {
      await theme(page, palette);
      await page.waitForFunction(() => document.querySelector('[data-visual-stage]').dataset.renderer === 'webgl');
      await page.waitForTimeout(500); await screenshotPage(page, 'page-motion-' + width + '-' + palette);
    });
  });
})().catch(error => { failures.push({ name: 'setup', error: error.stack }); console.error(error); }).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
  fs.writeFileSync(path.join(artifacts, 'verification.json'), JSON.stringify({ passed, failures }, null, 2));
  console.log(passed.length + ' passed; ' + failures.length + ' failed');
  process.exitCode = failures.length ? 1 : 0;
});
