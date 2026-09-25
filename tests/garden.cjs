/* End-to-end verification. All fixture content lives in a disposable directory. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { spawnSync } = require("node:child_process");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "garden-check-"));
const artifacts = process.env.GARDEN_ARTIFACTS || path.join(root, "local", "previews");
fs.mkdirSync(artifacts, { recursive: true });
const passed = [];
const failures = [];
const mounts = new Map();
let browser;
let origin;

const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".xml": "application/xml", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const prefix = [...mounts.keys()].sort((a, b) => b.length - a.length).find(p => !p || pathname === p || pathname.startsWith(p + "/"));
  if (prefix === undefined) { res.writeHead(404); return res.end(); }
  const directory = mounts.get(prefix);
  const relative = pathname.slice(prefix.length).replace(/^\/+/, "");
  const base = path.resolve(directory, relative);
  if (!base.startsWith(directory + path.sep) && base !== directory) { res.writeHead(403); return res.end(); }
  const file = [base, base + ".html", path.join(base, "index.html")].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(fs.readFileSync(path.join(directory, "404.html")));
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "text/plain; charset=utf-8" });
  res.end(fs.readFileSync(file));
});

function build(source, name, baseurl) {
  const dest = path.join(temporary, name);
  const config = path.join(temporary, name + ".yml");
  fs.writeFileSync(config, JSON.stringify({ url: origin, baseurl, future: false }));
  const result = spawnSync("bundle", ["exec", "jekyll", "build", "--source", source, "--destination", dest, "--config", path.join(source, "_config.yml") + "," + config], { cwd: source, env: { ...process.env, BUNDLE_GEMFILE: path.join(root, "Gemfile") }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  mounts.set(baseurl, dest);
  return dest;
}
function write(relative, content, directory) {
  const file = path.join(directory, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
async function check(name, fn) {
  try { await fn(); passed.push(name); console.log("PASS " + name); }
  catch (error) { failures.push({ name, error: error.stack }); console.error("FAIL " + name + "\n" + error.message); }
}
async function pageIn(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  const page = await context.newPage();
  return { page, context };
}
async function ready(page) { await page.evaluate(() => document.fonts.ready); }
async function noOverflow(page) {
  const measure = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  assert.ok(measure.content <= measure.width + 1, JSON.stringify(measure));
}
async function theme(page, value) {
  await page.evaluate(v => { localStorage.setItem("theme", v); document.documentElement.dataset.theme = v; }, value);
}
function localResourcePaths(html) {
  return [...html.matchAll(/(?:href|src)="([^"#?]+)[^"]*"/g)].map(m => m[1]).filter(v => v.startsWith("/") && !v.startsWith("//"));
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = "http://127.0.0.1:" + server.address().port;
  const built = build(root, "site", "");
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.GARDEN_CHROMIUM || undefined,
    args: ["--no-sandbox"]
  });

  await check("All public routes, local links and legacy redirects", async () => {
    const routes = ["/", "/home/", "/profile/", "/blogs/life/", "/blogs/academic/", "/blogs/", "/publications/", "/publication/2026-02-27-FlexLoRA", "/portfolio/", "/cv/", "/blogs/sharing/", "/blogs/study/", "/tags/", "/categories/", "/404.html"];
    const resources = new Set();
    for (const route of routes) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      const html = await response.text();
      assert.ok(html.includes(route === "/" ? "moon-door" : "site-header"), route);
      for (const resource of localResourcePaths(html)) resources.add(resource);
    }
    for (const removed of ["/sitemap/", "/feed.xml"]) {
      assert.equal((await fetch(origin + removed)).status, 404, removed);
      assert.ok(!resources.has(removed), "Removed links must not remain in HTML");
    }
    for (const resource of resources) assert.equal((await fetch(origin + resource)).status, 200, resource);
    const { page, context } = await pageIn();
    for (const [old, target] of [["/talks/", "/blogs/sharing/"], ["/teaching/", "/blogs/study/"], ["/about/", "/"], ["/about.html", "/"], ["/resume", "/cv/"], ["/year-archive/", "/blogs/"], ["/wordpress/blog-posts/", "/blogs/"]]) {
      await page.goto(origin + old);
      await page.waitForURL(origin + target);
    }
    assert.equal((await page.goto(origin + "/missing-path")).status(), 404);
    assert.ok(await page.locator("h1").innerText());
    await context.close();
  });

  await check("Moon entrance, keyboard entry, blue-black night, and no-script access", async () => {
    for (const javaScriptEnabled of [true, false]) {
      const {page, context} = await pageIn({javaScriptEnabled});
      await page.goto(origin);
      assert.equal(await page.locator(".site-header, #recent-entries").count(), 0);
      assert.equal(await page.locator(".moon-door").getAttribute("href"), "/home/");
      if (javaScriptEnabled) {
        await page.locator("#theme-toggle").click();
        assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(16, 27, 44)");
      }
      await page.locator(".moon-door").focus();
      await page.keyboard.press("Enter");
      await page.waitForURL(origin + "/home/");
      assert.equal(await page.locator("#recent-entries .journal-entry").count(), 1);
      if (javaScriptEnabled) assert.equal(await page.getAttribute("html", "data-theme"), "dark");
      await context.close();
    }
  });

  await check("Home, themes, language, clipboard, preferences and no browser errors", async () => {
    const { page, context } = await pageIn({ permissions: ["clipboard-read", "clipboard-write"], colorScheme: "dark" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/home/");
    await ready(page);
    assert.equal(await page.getAttribute("html", "data-theme"), "light", "New visits use paper even when OS is dark");
    assert.equal(await page.getAttribute("html", "lang"), "zh-CN");
    assert.equal(await page.locator("#recent-entries .journal-entry").count(), 1);
    assert.equal(await page.locator("#life, #academic, .home-works, .home-contact").count(), 0);
    assert.ok(!(await page.content()).includes("草稿模板"));
    assert.ok(!(await page.content()).includes("实时工作面板"));
    const poem = await page.locator("#poem-text").innerText();
    await page.locator("#theme-toggle").click();
    assert.equal(await page.getAttribute("html", "data-theme"), "dark");
    await page.locator("#language-toggle").click();
    assert.equal(await page.getAttribute("html", "lang"), "en");
    assert.equal(await page.locator("#recent-heading").innerText(), "Recent entries");
    assert.equal(await page.locator("#poem-text").innerText(), poem);
    await page.goto(origin + "/profile/");
    await page.locator("[data-copy]").click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "liumq04@163.com");
    assert.equal(await page.locator(".copy-status").innerText(), "Email copied.");
    await page.locator("#garden-nav a[href$='/portfolio/']").click();
    assert.equal(await page.getAttribute("html", "data-theme"), "dark");
    assert.equal(await page.getAttribute("html", "data-lang"), "en");
    await page.reload();
    assert.equal(await page.getAttribute("html", "data-theme"), "dark");
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check("Desktop/tablet/mobile screenshots in both themes, without overflow", async () => {
    const { page, context } = await pageIn();
    // A fixed random sample keeps visual snapshots comparable, not production behavior.
    await context.addInitScript(() => { Math.random = () => 0.34; });
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const palette of ["light", "dark"]) {
        await page.goto(origin + "/home/");
        await theme(page, palette);
        await ready(page);
        await noOverflow(page);
        await page.screenshot({ path: path.join(artifacts, "home-" + width + "-" + palette + ".png"), fullPage: true, animations: "disabled" });
      }
    }
    for (const [slug, route] of [["gate", "/"], ["profile", "/profile/"], ["life", "/blogs/life/"], ["blogs", "/blogs/"], ["paper", "/publication/2026-02-27-FlexLoRA"], ["works", "/portfolio/"], ["cv", "/cv/"], ["study", "/blogs/study/"], ["empty", "/blogs/sharing/"], ["404", "/404.html"]]) {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const palette of ["light", "dark"]) {
          await page.goto(origin + route);
          await theme(page, palette);
          await ready(page);
          await noOverflow(page);
          await page.screenshot({ path: path.join(artifacts, slug + "-" + width + "-" + palette + ".png"), fullPage: true, animations: "disabled" });
        }
      }
    }
    await context.close();
  });

  await check("Mobile menu, Escape, keyboard focus and section navigation", async () => {
    const { page, context } = await pageIn({ viewport: { width: 390, height: 844 } });
    await page.goto(origin + "/home/");
    assert.equal(await page.locator("#garden-nav").isVisible(), false);
    await page.locator(".menu-toggle").click();
    assert.equal(await page.getAttribute(".menu-toggle", "aria-expanded"), "true");
    assert.equal(await page.locator("#garden-nav").isVisible(), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.getAttribute(".menu-toggle", "aria-expanded"), "false");
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("menu-toggle")), true);
    await page.locator(".menu-toggle").click();
    await page.locator(".nav-dropdown summary").click();
    assert.equal(await page.locator(".nav-submenu").isVisible(), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".nav-dropdown").getAttribute("open"), null);
    assert.equal(await page.locator("#garden-nav").isVisible(), true);
    await page.locator(".nav-dropdown summary").click();
    await page.locator(".nav-submenu a[href$='/blogs/life/']").click();
    assert.equal(new URL(page.url()).pathname, "/blogs/life/");
    assert.equal(await page.locator("#garden-nav").isVisible(), false);
    assert.equal(await page.locator(".empty-garden p").innerText(), "留白");
    await page.locator(".blog-index a[href$='/blogs/academic/']").click();
    assert.equal(new URL(page.url()).pathname, "/blogs/academic/");
    await page.goto(origin + "/home/");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.className), "skip-link");
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    assert.notEqual(outline, "none");
    await page.keyboard.press("Enter");
    assert.equal(new URL(page.url()).hash, "#main");
    await context.close();
  });

  await check("No JavaScript retains poems, articles, navigation and useful links", async () => {
    const { page, context } = await pageIn({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await page.goto(origin + "/home/");
    const library = JSON.parse(await page.locator("#poem-library").textContent());
    const first = library.find(poem => typeof poem.text === "string" && poem.text.trim());
    assert.equal((await page.locator("#poem-text").textContent()).trim(), first.text.trim());
    assert.equal(await page.locator("#poem-author").textContent(), first.author);
    assert.equal(await page.locator("#garden-nav").isVisible(), true);
    assert.equal(await page.locator("#theme-toggle").isVisible(), false);
    assert.equal(await page.locator("#recent-entries .journal-entry a").count(), 1);
    await noOverflow(page);
    await page.locator(".nav-dropdown summary").click();
    await page.locator(".nav-submenu a[href$='/blogs/']").click();
    assert.equal(new URL(page.url()).pathname, "/blogs/");
    await context.close();
  });

  await check("Blocked storage, failed copy, failed fonts and reduced motion", async () => {
    const { page, context } = await pageIn({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage unavailable"); } });
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("Denied")) } });
      document.execCommand = () => false;
    });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*.woff2", route => route.abort());
    await page.goto(origin + "/home/");
    await page.locator("#theme-toggle").click();
    await page.locator("#language-toggle").click();
    assert.equal(await page.getAttribute("html", "data-lang"), "en");
    await page.goto(origin + "/profile/");
    await page.locator("#language-toggle").click();
    await page.locator("[data-copy]").click();
    assert.ok((await page.locator(".copy-status").innerText()).includes("Please select"));
    await page.goto(origin + "/home/");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".garden-room")).animationName), "none");
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), "auto");
    assert.ok(await page.locator("#poem-text").isVisible());
    await noOverflow(page);
    assert.deepEqual(errors, []);
    await context.close();
  });

  const fixture = path.join(temporary, "source");
  const excluded = new Set([".git", ".agents", ".codex", "_site", ".sass-cache", ".jekyll-cache", "node_modules", "local", ".profile-editor-backups"]);
  fs.cpSync(root, fixture, { recursive: true, filter: source => !excluded.has(path.basename(source)) });
  for (let i = 1; i <= 4; i++) {
    write("_posts/2026-01-0" + i + "-life-" + i + ".md",
      "---\ntitle: Life " + i + "\ndate: 2026-01-0" + i + "\n" + (i === 1 ? "" : "channel: life\n") +
      "tags: [reading]\n---\nA day in the fixture garden.\n", fixture);
  }
  const longTitle = "关于书页与日常的一篇很长的随笔标题，用来确认移动设备上的中文换行与图文阅读";
  write("_posts/2026-03-02-academic-one.md", "---\ntitle: Academic One\ndate: 2026-03-02\nchannel: academic\nmath: true\n---\nA study note.\n", fixture);
  write("_posts/2026-03-03-academic-two.md", "---\ntitle: Academic Two\ndate: 2026-03-03\nchannel: academic\n---\nAnother study note.\n", fixture);
  write("_posts/2026-02-01-illustrated.md", "---\ntitle: '" + longTitle + "'\ndate: 2026-02-01\nchannel: life\ntags: [reading, travel]\nmath: true\n---\n\n## 图文与公式\n\n" +
    "<figure><img src=\"{{ '/assets/art/leaf.svg' | relative_url }}\" alt=\"一片叶子\" width=\"66\"><figcaption>图片说明</figcaption></figure>\n\n> 一段引文。\n\n" +
    "\`\`\`python\nprint('" + "long line ".repeat(30) + "')\n\`\`\`\n\n$$y = Wx$$\n", fixture);
  write("_teaching/study-fixture.md", "---\ntitle: Study Fixture\ndate: 2026-03-05\n---\nA learning note.\n", fixture);
  write("_talks/sharing-fixture.md", "---\ntitle: Sharing Fixture\ndate: 2026-03-04\n---\nA shared thought.\n", fixture);
  build(fixture, "fixture", "/fixture");

  await check("Actual Jekyll fixtures: default life, academic+paper ordering, limits and baseurl", async () => {
    const { page, context } = await pageIn();
    await page.goto(origin + "/fixture/home/");
    assert.equal(await page.locator("#recent-entries .journal-entry").count(), 3);
    assert.equal(await page.locator("#life, #academic").count(), 0);
    const recent = await page.locator("#recent-entries h3").allTextContents();
    assert.ok(recent[0].includes("Study Fixture"));
    assert.ok(recent[1].includes("Sharing Fixture"));
    assert.ok(recent[2].includes("Academic Two"));
    await page.goto(origin + "/fixture/blogs/");
    assert.equal(await page.locator(".blog-list .journal-entry").count(), 10);
    await page.goto(origin + "/fixture/blogs/life/");
    assert.equal(await page.locator("#life .journal-entry").count(), 5);
    assert.ok((await page.locator("#life").innerText()).includes("Life 1"));
    const links = await page.locator("#life .journal-entry a").evaluateAll(nodes => nodes.map(n => n.getAttribute("href")));
    assert.ok(links.every(link => link.startsWith("/fixture/")));
    await page.goto(origin + "/fixture/blogs/academic/");
    assert.equal(await page.locator("#academic .journal-entry").count(), 3);
    assert.ok((await page.locator("#academic h3").allTextContents())[2].includes("FlexLoRA"));
    for (const [channel, title] of [["study", "Study Fixture"], ["sharing", "Sharing Fixture"]]) {
      await page.locator(".nav-dropdown summary").click();
      await page.locator(".nav-submenu a[href$='/blogs/" + channel + "/']").click();
      assert.equal(new URL(page.url()).pathname, "/fixture/blogs/" + channel + "/");
      assert.equal(await page.locator(".blog-list .journal-entry").count(), 1);
      assert.ok((await page.locator(".blog-list h3").innerText()).includes(title));
      assert.equal(await page.locator(".blog-index a[aria-current]").getAttribute("href"), "/fixture/blogs/" + channel + "/");
      await page.locator(".blog-list h3 a").click();
      assert.equal(await page.locator(".nav-dropdown").getAttribute("data-current"), "true");
      assert.equal((await page.locator(".reading-back .lang-zh").innerText()).trim(), "近笺");
    }
    await context.close();
  });

  await check("Long titles, photographs, captions, tags, code, formulas and article neighbors", async () => {
    const { page, context } = await pageIn({ viewport: { width: 390, height: 844 } });
    await page.goto(origin + "/fixture/illustrated/");
    assert.equal(await page.locator("h1").innerText(), longTitle);
    assert.equal(await page.locator("figure img").evaluate(img => img.complete && img.naturalWidth > 0), true);
    assert.equal(await page.locator("figcaption").innerText(), "图片说明");
    assert.equal(await page.locator(".post-pagination a").count(), 2);
    assert.equal(await page.locator(".article-tags a").count(), 2);
    assert.ok(await page.locator("pre").count());
    await page.waitForFunction(() => document.querySelector("mjx-container"), null, { timeout: 15000 });
    await ready(page);
    await noOverflow(page);
    await page.screenshot({ path: path.join(artifacts, "article-fixture-390.png"), fullPage: true, animations: "disabled" });
    await page.locator(".article-tags a").first().click();
    assert.ok((await page.locator(".archive-content").innerText()).includes(longTitle));
    await context.close();
  });

  await check("Ink interactions respond to the mouse and respect reduced motion", async () => {
    const { page, context } = await pageIn({ reducedMotion: "no-preference" });
    await page.goto(origin + "/home/");
    const scene = page.locator("[data-ink-scene]");
    const bounds = await scene.boundingBox();
    await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .4);
    await page.waitForFunction(() => document.querySelector("[data-ink-scene]").style.getPropertyValue("--scene-x") !== "");
    assert.notEqual(await scene.evaluate(el => el.style.getPropertyValue("--scene-x")), "0.00px");
    await page.mouse.click(bounds.x + 15, bounds.y + 35);
    assert.equal(await page.locator(".ink-ripple").count(), 1);
    assert.equal(await page.locator(".ink-ripple").evaluate(el => getComputedStyle(el).pointerEvents), "none");
    await page.locator(".ink-ripple").waitFor({ state: "detached" });
    await page.mouse.move(5, 5);
    assert.equal(await scene.evaluate(el => el.style.getPropertyValue("--scene-x")), "");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .4);
    await page.mouse.click(bounds.x + 15, bounds.y + 35);
    assert.equal(await scene.evaluate(el => el.style.getPropertyValue("--scene-x")), "");
    assert.equal(await page.locator(".ink-ripple").count(), 0);
    await context.close();
  });

  await check("Every seeded poem can be selected, without changes on theme/language toggle", async () => {
    const library = JSON.parse(fs.readFileSync(path.join(built, "home/index.html"), "utf8").match(/id="poem-library">(.*?)<\/script>/s)[1]);
    assert.equal(library.length, 25);
    assert.equal(library.filter(poem => poem.author.startsWith("日本·")).length, 5);
    assert.equal(library.filter(poem => !poem.author.startsWith("日本·")).length, 20);
    for (let i = 0; i < library.length; i++) {
      const { page, context } = await pageIn();
      await context.addInitScript(value => { Math.random = () => value; }, (i + 0.5) / library.length);
      await page.goto(origin + "/home/");
      const data = await page.locator("#poem-library").textContent();
      const poems = JSON.parse(data);
      assert.equal(await page.locator("#poem-text").textContent(), poems[i].text.trim());
      assert.equal(await page.locator("#poem-author").textContent(), poems[i].author);
      assert.equal(await page.locator("#hero-poem a").count(), 0);
      assert.ok(poems.every(poem => !("source" in poem)), "Source URLs stay in the maintenance file");
      assert.equal(await page.locator("#hero-poem").getAttribute("lang"), poems[i].lang || "zh-CN");
      await page.setViewportSize({width:390,height:844});
      await noOverflow(page);
      const before = await page.locator("#poem-text").innerText();
      await page.locator("#theme-toggle").click();
      await page.locator("#language-toggle").click();
      assert.equal(await page.locator("#poem-text").innerText(), before);
      await context.close();
    }
  });

  for (const [name, poems] of [
    ["empty", []],
    ["single", [{ text: "溪深水声远，\n山高月色迟。", author: "日本·良宽", title: "秋夜偶作" }]],
    ["long", [{ text: "风过疏林，落叶无声。".repeat(15) + "\n</script><script>window.unwanted=true</script>", author: "边界测试", title: "仅测试使用" }]]
  ]) {
    write("_data/poems.yml", JSON.stringify(poems), fixture);
    build(fixture, name, "/" + name);
    await check("Poem library build: " + name, async () => {
      const { page, context } = await pageIn({ viewport: { width: 390, height: 844 } });
      await page.goto(origin + "/" + name + "/home/");
      if (!poems.length) {
        assert.equal(await page.locator("#hero-poem").isVisible(), false);
      } else {
        assert.equal(await page.locator("#poem-text").textContent(), poems[0].text.trim());
        assert.equal(await page.locator("#poem-author").innerText(), poems[0].author);
      }
      assert.equal(await page.evaluate(() => window.unwanted), undefined);
      await noOverflow(page);
      await context.close();
      const fallback = await pageIn({ javaScriptEnabled: false });
      await fallback.page.goto(origin + "/" + name + "/home/");
      assert.equal(await fallback.page.locator("#hero-poem").isVisible(), poems.length > 0);
      await fallback.context.close();
    });
  }

  await check("Full source-font coverage is preserved and all poems have glyphs", async () => {
    const result = spawnSync("python3", ["-c", [
      "from pathlib import Path",
      "from fontTools.ttLib import TTFont",
      "import json",
      "p=Path('assets/fonts/garden')",
      "m=json.loads((p/'manifest.json').read_text())",
      "all_chars=set()",
      "for slug in ['qiji','zhuque']:",
      " chars=set()",
      " for f in p.glob(slug+'-*.woff2'):",
      "  with TTFont(f) as font: chars.update(font.getBestCmap())",
      " assert len(chars)==m[slug]['source_characters'], (slug,len(chars))",
      " all_chars.update(chars)",
      "text=Path('_data/poems.yml').read_text()",
      "missing={ch for ch in text if ord(ch)>127 and not ch.isspace() and ord(ch) not in all_chars}",
      "assert not missing, missing",
    ].join("\n")], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  });
})().catch(error => { failures.push({ name: "Runner", error: error.stack }); console.error(error); }).finally(async () => {
  if (browser) await browser.close();
  server.close();
  fs.writeFileSync(path.join(artifacts, "verification.json"), JSON.stringify({ passed, failures }, null, 2));
  fs.rmSync(temporary, { recursive: true, force: true });
  console.log(passed.length + " checks passed; " + failures.length + " failed. Artifacts: " + artifacts);
  process.exitCode = failures.length ? 1 : 0;
});
