/* Browser acceptance checks. Fixtures are built in a disposable directory. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'homepage-check-'));
const artifacts = process.env.GARDEN_ARTIFACTS || path.join(root, 'local', 'previews');
const selectedCheck = (process.env.GARDEN_CHECK || '').toLowerCase();
fs.mkdirSync(artifacts, { recursive: true });
const passed = [], failures = [], mounts = new Map();
let browser, origin;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const requestURL = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(requestURL.pathname);
  const prefix = [...mounts.keys()].sort((a, b) => b.length - a.length).find(p => !p || pathname === p || pathname.startsWith(p + '/'));
  if (prefix === undefined) { res.writeHead(404); return res.end(); }
  const directory = mounts.get(prefix), base = path.resolve(directory, pathname.slice(prefix.length).replace(/^\/+/, ''));
  if (!base.startsWith(directory + path.sep) && base !== directory) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(base) && fs.statSync(base).isDirectory() && !pathname.endsWith('/')) {
    res.writeHead(301, { Location: requestURL.pathname + '/' + requestURL.search }); return res.end();
  }
  // Match ordinary static hosting: no implicit extension or SPA fallback.
  const file = [base, path.join(base, 'index.html')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(path.join(directory, '404.html'))); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'text/plain; charset=utf-8' });
  res.end(fs.readFileSync(file));
});
function build(source, name, baseurl) {
  const dest = path.join(temporary, name), config = path.join(temporary, name + '.yml');
  fs.writeFileSync(config, JSON.stringify({ url: origin, baseurl, future: false }));
  const result = spawnSync('bundle', ['exec', 'jekyll', 'build', '--source', source, '--destination', dest, '--config', path.join(source, '_config.yml') + ',' + config], { cwd: source, env: { ...process.env, BUNDLE_GEMFILE: path.join(root, 'Gemfile') }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  mounts.set(baseurl, dest);
}
function write(relative, content, directory) {
  const file = path.join(directory, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content);
}
async function check(name, fn) {
  if (selectedCheck && !name.toLowerCase().includes(selectedCheck)) return;
  try { await fn(); passed.push(name); console.log('PASS ' + name); }
  catch (error) { failures.push({ name, error: error.stack }); console.error('FAIL ' + name + '\n' + error.message); }
}
async function pageIn(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage(); page.setDefaultTimeout(10000); return { page, context };
}
async function ready(page) { await page.evaluate(() => document.fonts.ready); }
async function noOverflow(page) {
  const measure = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  assert.ok(measure.content <= measure.width + 1, JSON.stringify(measure));
}
async function setTheme(page, value) {
  if (await page.getAttribute('html', 'data-theme') !== value) {
    const toggle = page.locator('#theme-toggle');
    const openedMenu = !(await toggle.isVisible());
    if (openedMenu) await page.locator('.corner-nav > summary').click();
    await toggle.click();
    if (openedMenu) await page.locator('.corner-nav > summary').click();
  }
  assert.equal(await page.getAttribute('html', 'data-theme'), value);
}
function localResourcePaths(html) { return [...html.matchAll(/(?:href|src)="([^"#?]+)[^"]*"/g)].map(m => m[1]).filter(v => v.startsWith('/') && !v.startsWith('//')); }

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  build(root, 'site', '');
  browser = await chromium.launch({ headless: true, executablePath: process.env.GARDEN_CHROMIUM || undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

  await check('Public routes, local resources, legacy redirects and 404', async () => {
    const routes = ['/', '/home/', '/profile/', '/blogs/life/', '/blogs/academic/', '/blogs/', '/slug/', '/publications/', '/publication/2026-02-27-FlexLoRA/', '/portfolio/', '/cv/', '/blogs/sharing/', '/blogs/study/', '/tags/', '/categories/', '/404.html'];
    const resources = new Set();
    for (const route of routes) {
      const response = await fetch(origin + route); assert.equal(response.status, 200, route);
      const html = await response.text(); assert.ok(html.includes('id="main"'), route);
      if (['/', '/home/'].includes(route)) assert.ok(html.includes('cinematic-hero'), route);
      for (const resource of localResourcePaths(html)) resources.add(resource);
    }
    for (const removed of ['/sitemap/', '/feed.xml', '/404']) {
      assert.equal((await fetch(origin + removed)).status, 404, removed);
      assert.ok(!resources.has(removed), 'Removed links must not remain in HTML');
    }
    for (const resource of resources) assert.equal((await fetch(origin + resource)).status, 200, resource);
    const { page, context } = await pageIn();
    for (const [old, target] of [['/talks/', '/blogs/sharing/'], ['/teaching/', '/blogs/study/'], ['/about/', '/'], ['/about.html', '/'], ['/resume', '/cv/'], ['/resume.html', '/cv/'], ['/publication/2026-02-27-FlexLoRA', '/publication/2026-02-27-FlexLoRA/'], ['/publication/2026-02-27-FlexLoRA.html', '/publication/2026-02-27-FlexLoRA/'], ['/year-archive/', '/blogs/'], ['/wordpress/blog-posts/', '/blogs/']]) {
      await page.goto(origin + old); await page.waitForURL(origin + target);
    }
    assert.equal((await page.goto(origin + '/missing-path')).status(), 404);
    assert.ok(await page.locator('h1').innerText()); await context.close();
  });

  await check('Authored article links open from homepage, archives and search on static hosting', async () => {
    const { page, context } = await pageIn();
    await page.goto(origin + '/blogs/');
    const articles = await page.locator('.journal-entry h3 a').evaluateAll(links => links.map(link => ({
      href: link.getAttribute('href'), title: link.textContent.replace('↗', '').trim()
    })));
    assert.ok(articles.some(article => article.title === '保研回忆录'), 'Include the authored blog post, not just the paper');
    assert.ok(articles.some(article => article.title.includes('FlexLoRA')));
    const byURL = new Map(articles.map(article => [article.href, article]));
    for (const source of ['/', '/home/', '/blogs/', '/blogs/life/', '/blogs/academic/', '/publications/', '/cv/']) {
      await page.goto(origin + source);
      const hrefs = await page.locator('.journal-entry h3 a').evaluateAll(links => links.map(link => link.getAttribute('href')));
      assert.ok(hrefs.length, source);
      for (const href of hrefs) {
        await page.goto(origin + source);
        const article = byURL.get(href); assert.ok(article, source + ' -> ' + href);
        const [response] = await Promise.all([
          page.waitForNavigation(), page.locator('.journal-entry h3 a').filter({ hasText: article.title }).click()
        ]);
        assert.equal(response.status(), 200, source + ' -> ' + href);
        assert.equal(new URL(page.url()).pathname, href);
        assert.equal(await page.locator('h1').innerText(), article.title);
        assert.ok((await page.locator('.reading-body').innerText()).length > 100);
        assert.equal((await page.reload()).status(), 200, 'Direct reload: ' + href);
      }
    }
    for (const article of articles) {
      await page.goto(origin);
      await page.keyboard.press('Control+k');
      await page.locator('#quick-search').fill(article.title);
      const result = page.locator('[data-search-link]:visible');
      assert.equal(await result.count(), 1);
      assert.equal(await result.getAttribute('href'), article.href);
      const [response] = await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
      assert.equal(response.status(), 200, 'Search -> ' + article.href);
      assert.equal(await page.locator('h1').innerText(), article.title);
    }
    await context.close();
  });

  await check('Direct homepage entry, identity and existing research/project links', async () => {
    const { page, context } = await pageIn(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/', '/home/']) {
      await page.goto(origin + route); await ready(page);
      assert.ok((await page.locator('#hero-name').innerText()).replace(/\s+/g, ' ').includes('Liu Muqing'));
      assert.ok((await page.locator('.cinematic-hero').innerText()).includes('刘穆清'));
      assert.ok(await page.locator('#recent-entries .journal-entry').count() > 0);
      assert.ok(await page.locator('#recent-entries .journal-entry').count() <= 3);
      assert.ok(await page.locator("#selected-work a[href*='FlexLoRA']").count());
      assert.ok(await page.locator("#selected-work a[href='https://liumuqing.pythonanywhere.com']").count());
      assert.ok(await page.locator("#contact a[href='mailto:liumq04@163.com']").isVisible());
      assert.equal(await page.locator('.moon-door, #hero-poem, #poem-library').count(), 0);
    }
    await page.locator("#recent-entries h3 a[href*='FlexLoRA']").click();
    assert.ok((await page.locator('h1').innerText()).includes('FlexLoRA'));
    assert.ok(await page.locator('.reading-body').isVisible());
    assert.deepEqual(errors, []); await context.close();
  });

  await check('Dark default, language/theme memory and email copy', async () => {
    const { page, context } = await pageIn({ permissions: ['clipboard-read', 'clipboard-write'], colorScheme: 'light' });
    await page.goto(origin);
    assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
    assert.equal(await page.getAttribute('html', 'lang'), 'zh-CN');
    await page.locator('#theme-toggle').click();
    assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
    await page.locator('#language-toggle').click();
    assert.equal(await page.getAttribute('html', 'lang'), 'en');
    assert.ok((await page.locator('#recent-heading').innerText()).includes('Latest'));
    await page.locator('#contact [data-copy]').click();
    await page.waitForFunction(() => document.querySelector('#contact .copy-status').textContent.includes('copied'));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'liumq04@163.com');
    await page.goto(origin + '/profile/');
    assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
    assert.equal(await page.getAttribute('html', 'data-lang'), 'en');
    await page.reload();
    assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
    assert.equal(await page.getAttribute('html', 'lang'), 'en'); await context.close();
  });

  await check('Five viewport sizes in both themes, inner pages and no overflow', async () => {
    for (const width of [1440, 1024, 768, 390, 320]) {
      for (const palette of ['dark', 'light']) {
        const { page, context } = await pageIn({ viewport: { width, height: width < 768 ? 844 : 1000 } });
        try {
          await page.goto(origin); await setTheme(page, palette); await ready(page);
          for (const id of ['selected-work', 'recent-entries', 'contact']) await page.locator('#' + id).scrollIntoViewIfNeeded();
          await page.evaluate(() => window.scrollTo(0, 0)); await noOverflow(page);
          await page.screenshot({ path: path.join(artifacts, 'home-' + width + '-' + palette + '.png'), fullPage: true, animations: 'disabled' });
        } finally { await context.close(); }
      }
    }
    for (const [slug, route] of [['profile', '/profile/'], ['blogs', '/blogs/'], ['paper', '/publication/2026-02-27-FlexLoRA/'], ['works', '/portfolio/'], ['cv', '/cv/'], ['empty', '/blogs/sharing/'], ['404', '/404.html']]) {
      for (const width of [1440, 390]) {
        const { page, context } = await pageIn({ viewport: { width, height: 1000 } });
        try {
          await page.goto(origin + route); await setTheme(page, 'dark'); await ready(page); await noOverflow(page);
          await page.screenshot({ path: path.join(artifacts, slug + '-' + width + '-dark.png'), fullPage: true, animations: 'disabled' });
        } finally { await context.close(); }
      }
    }
  });

  await check('Mobile ring navigation, Escape, keyboard skip link and article categories', async () => {
    const { page, context } = await pageIn({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await page.goto(origin);
    const toggle = page.locator('[data-ring-toggle]');
    assert.equal(await page.locator('.site-header, .mobius-nav-art, .dock-link').count(), 0);
    assert.equal(await page.locator('.ring-nav .ring-part').count(), 5);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await toggle.evaluate(el => document.activeElement === el), true);
    await toggle.click(); await page.locator(".ring-nav a[href$='/blogs/']").click();
    assert.equal(new URL(page.url()).pathname, '/blogs/');
    await page.locator(".blog-index a[href$='/blogs/life/']").click();
    assert.equal(new URL(page.url()).pathname, '/blogs/life/');
    await page.locator(".blog-index a[href$='/blogs/academic/']").click();
    assert.equal(new URL(page.url()).pathname, '/blogs/academic/');
    await page.goto(origin); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'none');
    await page.keyboard.press('Enter'); await page.waitForURL(url => url.hash === '#main'); await context.close();
  });

  await check('Quick navigation search, focus, Escape and keyboard result opening', async () => {
    const { page, context } = await pageIn(); await page.goto(origin);
    await page.locator('[data-open-nav]:visible').first().click();
    assert.equal(await page.locator('#quick-nav').isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'quick-search');
    await page.locator('#quick-search').fill('zxq-no-match-439');
    assert.equal(await page.locator('#search-empty').isVisible(), true);
    assert.equal(await page.locator('[data-search-link]:visible').count(), 0);
    await page.keyboard.press('Escape');
    await page.locator('#quick-nav').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement.hasAttribute('data-open-nav'));
    assert.equal(await page.locator('#quick-nav').isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-open-nav')), true);
    for (const shortcut of ['Control+k', 'Meta+k']) {
      await page.keyboard.press(shortcut);
      assert.equal(await page.locator('#quick-nav').isVisible(), true);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'quick-search');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('#quick-nav')), true);
      await page.keyboard.press('Escape');
      await page.locator('#quick-nav').waitFor({ state: 'hidden' });
    }
    await page.keyboard.press('Control+k'); await page.locator('#quick-search').fill('flexlora');
    assert.ok((await page.locator('[data-search-link]:visible').first().innerText()).toLowerCase().includes('flexlora'));
    assert.equal(await page.locator('#search-empty').isVisible(), false);
    await page.keyboard.press('Enter'); await page.waitForURL(/\/publication\/2026-02-27-FlexLoRA\/?$/);
    assert.ok((await page.locator('h1').innerText()).includes('FlexLoRA')); await context.close();
  });

  await check('WebGL scene, palettes, pause, drag rotation and reset', async () => {
    const { page, context } = await pageIn({ reducedMotion: 'no-preference' }); const errors = [];
    page.on('pageerror', error => errors.push(error.message)); await page.goto(origin);
    await page.waitForFunction(() => document.querySelector('[data-visual-stage]').dataset.renderer === 'webgl');
    const canvas = page.locator('#hero-canvas'); await canvas.waitFor({ state: 'visible' });
    assert.equal(await page.getAttribute('html', 'data-motion'), 'running');
    assert.equal(await page.getAttribute('#motion-toggle', 'aria-pressed'), 'true');
    await page.locator('#motion-toggle').click();
    assert.equal(await page.getAttribute('html', 'data-motion'), 'paused');
    assert.equal(await page.getAttribute('#motion-toggle', 'aria-pressed'), 'false');
    await page.waitForTimeout(250); const still = await canvas.screenshot({ animations: 'disabled' });
    await page.waitForTimeout(250);
    const stillAgain = await canvas.screenshot({ animations: 'disabled' });
    if (!still.equals(stillAgain)) {
      fs.writeFileSync(path.join(artifacts, 'pause-before.png'), still);
      fs.writeFileSync(path.join(artifacts, 'pause-after.png'), stillAgain);
    }
    assert.ok(still.equals(stillAgain), 'Paused canvas should remain still');
    for (const palette of ['blue', 'silver', 'violet']) {
      const beforePalette = await canvas.screenshot({ animations: 'disabled' });
      await page.locator("button[data-palette='" + palette + "']").click();
      assert.equal(await page.getAttribute("button[data-palette='" + palette + "']", 'aria-pressed'), 'true');
      assert.equal(await page.locator("button[data-palette][aria-pressed='true']").count(), 1);
      assert.ok(!beforePalette.equals(await canvas.screenshot({ animations: 'disabled' })), 'Palette change should be visible');
    }
    const before = await canvas.screenshot({ animations: 'disabled' }), bounds = await page.locator('[data-visual-stage]').boundingBox();
    await page.mouse.move(bounds.x + bounds.width * .45, bounds.y + bounds.height * .5); await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .65, { steps: 12 }); await page.mouse.up();
    await page.waitForTimeout(300); const dragged = await canvas.screenshot({ animations: 'disabled' });
    assert.ok(!before.equals(dragged), 'Dragging should visibly rotate the paused object');
    await page.locator('[data-scene-reset]').click();
    assert.ok(!dragged.equals(await canvas.screenshot({ animations: 'disabled' })), 'Reset should restore the scene pose');
    assert.equal(await page.getAttribute('#motion-toggle', 'aria-pressed'), 'false');
    await page.locator('#motion-toggle').click();
    assert.equal(await page.getAttribute('html', 'data-motion'), 'running');
    assert.deepEqual(errors, []); await context.close();
  });

  await check('No JavaScript retains static scene, identity, content, navigation and contact', async () => {
    const { page, context } = await pageIn({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } }); await page.goto(origin);
    assert.ok((await page.locator('#hero-name').innerText()).replace(/\s+/g, ' ').includes('Liu Muqing'));
    assert.equal(await page.locator('.scene-fallback').isVisible(), true);
    assert.equal(await page.locator('.ring-nav').isVisible(), true);
    assert.equal(await page.locator('#theme-toggle').isVisible(), false);
    assert.ok(await page.locator('#selected-work a[href]').count());
    assert.ok(await page.locator('#recent-entries .journal-entry a').count() > 0);
    assert.equal(await page.locator("#contact a[href^='mailto:']").isVisible(), true); await noOverflow(page);
    await page.locator(".ring-nav a[href$='/blogs/']").click();
    assert.equal(new URL(page.url()).pathname, '/blogs/'); await context.close();
  });

  await check('Denied storage/clipboard and reduced motion preserve useful controls', async () => {
    const { page, context } = await pageIn({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Denied')) } });
      document.execCommand = () => false;
    });
    const errors = []; page.on('pageerror', error => errors.push(error.message)); await page.goto(origin);
    assert.equal(await page.getAttribute('html', 'data-motion'), 'paused');
    assert.equal(await page.getAttribute('#motion-toggle', 'aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    await page.locator('#theme-toggle').click(); assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
    await page.locator('#language-toggle').click(); assert.equal(await page.getAttribute('html', 'data-lang'), 'en');
    await page.locator('#contact [data-copy]').click();
    await page.waitForFunction(() => document.querySelector('#contact .copy-status').textContent.includes('Please select'));
    assert.equal(await page.locator("#contact a[href^='mailto:']").getAttribute('href'), 'mailto:liumq04@163.com');
    await noOverflow(page); assert.deepEqual(errors, []); await context.close();
  });

  await check('Unavailable WebGL preserves the fallback, controls and content', async () => {
    for (const failureMode of ['no-context', 'initial-draw-error']) {
      const { page, context } = await pageIn({ reducedMotion: 'no-preference' });
      await context.addInitScript(mode => {
        if (mode === 'no-context') {
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
        } else {
          window.testDrawCalls = 0;
          const originalDraw = WebGLRenderingContext.prototype.drawElements;
          WebGLRenderingContext.prototype.drawElements = function (...args) {
            window.testDrawCalls++;
            return originalDraw.apply(this, args);
          };
          WebGLRenderingContext.prototype.getError = function () { return this.INVALID_OPERATION; };
        }
      }, failureMode);
      const errors = []; page.on('pageerror', error => errors.push(error.message)); await page.goto(origin);
      assert.equal(await page.locator('.scene-fallback').isVisible(), true, failureMode);
      assert.equal(await page.locator('#motion-toggle').isDisabled(), true, failureMode);
      assert.equal(await page.locator('[data-scene-reset]').isDisabled(), true, failureMode);
      assert.equal(await page.locator('.drag-hint').isVisible(), false, failureMode);
      assert.equal(await page.getAttribute('html', 'data-motion'), 'paused', failureMode);
      assert.equal(await page.locator('[data-visual-stage]').evaluate(el => getComputedStyle(el).cursor), 'default', failureMode);
      await page.locator("button[data-palette='blue']").click();
      assert.equal(await page.getAttribute("button[data-palette='blue']", 'aria-pressed'), 'true');
      if (failureMode === 'initial-draw-error') {
        const attemptedCalls = await page.evaluate(() => window.testDrawCalls);
        assert.ok(attemptedCalls > 0, 'Initial render was attempted');
        await page.waitForTimeout(350);
        assert.equal(await page.evaluate(() => window.testDrawCalls), attemptedCalls, 'Failed render must not leave a running animation loop');
      }
      assert.ok(await page.locator('#hero-name').isVisible());
      await page.locator("#recent-entries h3 a[href*='FlexLoRA']").click();
      assert.ok((await page.locator('h1').innerText()).includes('FlexLoRA'));
      assert.deepEqual(errors, []); await context.close();
    }
  });

  const fixture = path.join(temporary, 'source');
  const excluded = new Set(['.git', '.agents', '.codex', '_site', '.sass-cache', '.jekyll-cache', 'node_modules', 'local', '.profile-editor-backups']);
  fs.cpSync(root, fixture, { recursive: true, filter: source => !excluded.has(path.basename(source)) });
  // Isolate article-order fixtures from the site's authored posts.
  fs.rmSync(path.join(fixture, '_posts'), { recursive: true, force: true });
  for (let i = 1; i <= 4; i++) write('_posts/2026-01-0' + i + '-life-' + i + '.md', '---\ntitle: Life ' + i + '\ndate: 2026-01-0' + i + '\n' + (i === 1 ? '' : 'channel: life\n') + 'tags: [reading]\n---\nA fixture journal entry.\n', fixture);
  const longTitle = '关于书页与日常的一篇很长的随笔标题，用来确认移动设备上的中文换行与图文阅读';
  write('_posts/2026-03-02-academic-one.md', '---\ntitle: Academic One\ndate: 2026-03-02\nchannel: academic\nmath: true\n---\nA study note.\n', fixture);
  write('_posts/2026-03-03-academic-two.md', '---\ntitle: Academic Two\ndate: 2026-03-03\nchannel: academic\n---\nAnother study note.\n', fixture);
  write('_posts/2026-02-01-illustrated.md', '---\ntitle: "' + longTitle + '"\ndate: 2026-02-01\nchannel: life\ntags: [reading, travel]\nmath: true\n---\n\n## 图文与公式\n\n<figure><img src="{{ "/images/profile.png" | relative_url }}" alt="测试插图" width="200"><figcaption>图片说明</figcaption></figure>\n\n> 一段引文。\n\n```python\nprint("' + 'long line '.repeat(30) + '")\n```\n\n$$y = Wx$$\n', fixture);
  write('_teaching/study-fixture.md', '---\ntitle: Study Fixture\ndate: 2026-03-05\n---\nA learning note.\n', fixture);
  write('_talks/sharing-fixture.md', '---\ntitle: Sharing Fixture\ndate: 2026-03-04\n---\nA shared thought.\n', fixture);
  build(fixture, 'fixture', '/fixture');

  await check('Static article URLs, previous/next links and legacy redirects under a baseurl', async () => {
    const { page, context } = await pageIn();
    await page.goto(origin + '/fixture/blogs/');
    const hrefs = await page.locator('.journal-entry h3 a').evaluateAll(links => links.map(link => link.getAttribute('href')));
    assert.equal(hrefs.length, 10);
    for (const href of hrefs) {
      assert.ok(href.startsWith('/fixture/'), href);
      const response = await page.goto(origin + href); assert.equal(response.status(), 200, href);
      assert.equal(await page.locator('.reading-body').count(), 1, href);
      const neighbors = await page.locator('.post-pagination a').evaluateAll(links => links.map(link => link.getAttribute('href')));
      for (const neighbor of neighbors) {
        assert.ok(neighbor.startsWith('/fixture/'), neighbor);
        assert.equal((await fetch(origin + neighbor)).status, 200, neighbor);
      }
    }
    await page.goto(origin + '/fixture/publication/2026-02-27-FlexLoRA.html');
    await page.waitForURL(origin + '/fixture/publication/2026-02-27-FlexLoRA/');
    assert.ok((await page.locator('h1').innerText()).includes('FlexLoRA'));
    await context.close();
  });

  await check('Real Jekyll fixtures: categories, newest entries, limits and baseurl', async () => {
    const { page, context } = await pageIn(); await page.goto(origin + '/fixture/home/');
    assert.equal(await page.locator('#recent-entries .journal-entry').count(), 3);
    const recent = await page.locator('#recent-entries h3').allTextContents();
    assert.ok(recent[0].includes('Study Fixture')); assert.ok(recent[1].includes('Sharing Fixture')); assert.ok(recent[2].includes('Academic Two'));
    await page.keyboard.press('Control+k'); await page.locator('#quick-search').fill('Study Fixture');
    assert.ok((await page.locator('[data-search-link]:visible').first().getAttribute('href')).startsWith('/fixture/'));
    await page.keyboard.press('Escape'); await page.goto(origin + '/fixture/blogs/');
    assert.equal(await page.locator('.blog-list .journal-entry').count(), 10);
    await page.goto(origin + '/fixture/blogs/life/');
    assert.equal(await page.locator('#life .journal-entry').count(), 5);
    assert.ok((await page.locator('#life').innerText()).includes('Life 1'));
    assert.ok((await page.locator('#life .journal-entry a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')))).every(link => link.startsWith('/fixture/')));
    await page.goto(origin + '/fixture/blogs/academic/');
    assert.equal(await page.locator('#academic .journal-entry').count(), 3);
    assert.ok((await page.locator('#academic h3').allTextContents())[2].includes('FlexLoRA'));
    for (const [channel, title] of [['study', 'Study Fixture'], ['sharing', 'Sharing Fixture']]) {
      await page.goto(origin + '/fixture/blogs/'); await page.locator(".blog-index a[href$='/blogs/" + channel + "/']").click();
      assert.equal(new URL(page.url()).pathname, '/fixture/blogs/' + channel + '/');
      assert.equal(await page.locator('.blog-list .journal-entry').count(), 1);
      assert.ok((await page.locator('.blog-list h3').innerText()).includes(title));
      assert.equal(await page.locator('.blog-index a[aria-current]').getAttribute('href'), '/fixture/blogs/' + channel + '/');
      await page.locator('.blog-list h3 a').click();
      assert.equal(await page.locator('.reading-back').getAttribute('href'), '/fixture/blogs/');
    }
    await context.close();
  });

  await check('Long article titles, images, captions, tags, code, formulas and neighbors', async () => {
    const { page, context } = await pageIn({ viewport: { width: 390, height: 844 } }); await page.goto(origin + '/fixture/illustrated/');
    assert.equal(await page.locator('h1').innerText(), longTitle);
    assert.equal(await page.locator('figure img').evaluate(img => img.complete && img.naturalWidth > 0), true);
    assert.equal(await page.locator('figcaption').innerText(), '图片说明');
    assert.equal(await page.locator('.post-pagination a').count(), 2); assert.equal(await page.locator('.article-tags a').count(), 2);
    assert.ok(await page.locator('pre').count());
    await page.waitForFunction(() => document.querySelector('mjx-container'), null, { timeout: 15000 });
    await ready(page); await noOverflow(page);
    await page.screenshot({ path: path.join(artifacts, 'article-fixture-390.png'), fullPage: true, animations: 'disabled' });
    await page.locator('.article-tags a').first().click();
    assert.ok((await page.locator('.archive-content').innerText()).includes(longTitle)); await context.close();
  });
})().catch(error => { failures.push({ name: 'Runner', error: error.stack }); console.error(error); }).finally(async () => {
  if (browser) await browser.close(); server.close();
  fs.writeFileSync(path.join(artifacts, 'verification.json'), JSON.stringify({ passed, failures }, null, 2));
  fs.rmSync(temporary, { recursive: true, force: true });
  console.log(passed.length + ' checks passed; ' + failures.length + ' failed. Artifacts: ' + artifacts);
  process.exitCode = failures.length ? 1 : 0;
});
