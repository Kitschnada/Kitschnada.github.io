# Cinematic Homepage Implementation Plan

> **For agentic workers:** Execute the tasks below in this session, delegating the isolated scene and content work in parallel.

**Goal:** Replace the literary garden presentation with a cinematic, interactive personal site using existing personal content and minimal interface copy.

**Architecture:** Keep Jekyll and all public content routes. Share one homepage include between `/` and `/home/`; replace the active visual stylesheet, add a progressive WebGL experience, and keep readable static content available without scripts.

**Tech Stack:** Jekyll, Liquid, SCSS, vanilla JavaScript, WebGL, Playwright.

---

### Task 1: Content and page structure

- [x] Replace `_pages/about.html` and `_pages/home.html` with the shared `_includes/home-landing.html` presentation; remove the separate moon entrance.
- [x] Build the homepage from `site.author`, `site.publications`, `site.posts`, and `site.data.projects`: identity, research/project cards, recent entries, contact links.
- [x] Simplify `_includes/masthead.html`, `_includes/footer.html`, and interior page headings; remove generated literary introductions while retaining authored articles.

### Task 2: Visual system

- [x] Create `_sass/_experience.scss` and use it in `assets/css/main.scss`; use system sans-serif fonts, near-black backgrounds, silver typography, violet-blue illumination and subtle glass surfaces.
- [x] Keep inner-page reading styles from `_sass/_garden.scss` and override their typography and presentation consistently. Stop loading the garden font bundles and courtyard stylesheet.
- [x] Support desktop, tablet, mobile, light theme, keyboard focus, reduced motion, print and no-script access.

### Task 3: Interactive scene

- [x] Add `assets/js/experience.js` with locally rendered metallic geometry, drag rotation, palette selection, pause/reset and a static CSS fallback.
- [x] Pause animation when hidden/offscreen; bound rendering resolution and respect reduced motion.
- [x] Add searchable quick navigation with Ctrl/Cmd+K, section reveal, card lighting and reading progress.
- [x] Retain language/theme persistence, mobile navigation and email copy in `assets/js/garden.js`; remove obsolete poetry and ink enhancements.

### Task 4: Verification and documentation

- [x] Build with `bundle exec jekyll build` and validate JavaScript with `node --check`.
- [x] Update browser acceptance checks for the new homepage and interactions. Preserve checks for routes, real content, base paths, no scripts and denied storage/clipboard.
- [x] Run `npm run test:site`; inspect screenshots at desktop and mobile sizes, check console errors and horizontal overflow.
- [x] Update `README.md` and `tests/README.md` with current appearance, preview commands and supported interactions.

**Validation:** Jekyll build and JavaScript syntax checks passed. All 12 browser acceptance groups passed across 320–1440 px. Two WebGL groups were rechecked after the final fallback fix, including a forced first-draw error with no continuing render loop. Desktop/mobile screenshots reviewed in `local/previews/`.

## Follow-up: portable article routes and spatial navigation

- [x] Reproduce failures against the actual static preview and remove test-only extension rewriting that conceals missing files.
- [x] Make paper routes work as real directory/index files, preserve legacy URLs, and click each authored article from home, category and quick-search entry points.
- [x] Replace the flat header with a floating spatial dock, orbital identity, pointer/focus lens, category mega panel and full-screen mobile navigator.
- [x] Verify no-script links, touch/keyboard controls, reduced motion, theme/language, reading-page layout and all desktop/mobile widths; review actual screenshots.

**Follow-up validation:** The real static preview returned 404 for the old extensionless paper URL; canonical directory routes and legacy redirects now work without extension rewriting. All 14 site acceptance groups validated (12 passed on the full run; the two affected mobile groups passed after the navigation fix). Final navigation suite passed 5/5 with 23 screenshots, including short-screen, keyboard, no-script and reduced-motion checks.

## Follow-up: Möbius icon navigation and spatial composition

- [x] Replace the rectangular navigation dock with a twisted ribbon and five accessible icon nodes, including touch, keyboard and no-script access.
- [x] Replace the hero torus with a true two-sided, half-twist Möbius mesh; preserve motion controls and safe rendering fallbacks.
- [x] Recompose the homepage with oversized offset typography, stronger spatial lighting and interactive project surfaces while preserving authored content.
- [x] Verify actual article routes, icon navigation, tooltip accessibility, both themes, small screens and reduced motion; review browser screenshots.

**Möbius validation:** Jekyll build and JavaScript syntax checks passed. Final isolated site suite passed 14/14; navigation suite passed 7/7. Desktop/mobile full-page captures were reviewed after scrolling through the revealed sections, in both themes. Card tilt, pointer-exit reset and reduced-motion guard passed a separate browser interaction check. The final five-width/short-screen check also passed, including reachable last-category links at 320×568 and 900×412. The live local preview serves the actual static files at port 4000.

## Follow-up: navigation becomes the hero sculpture

**Goal:** Remove the top ribbon and its white header completely; reveal five real navigation destinations by interacting with the central Möbius surface.

**Architecture:** `_includes/ring-navigation.html` places accessible anchor controls inside the hero's `.visual-stage`. `assets/js/navigation.js` manages hover, touch and keyboard state; `ringnavchange` events drive the renderer in `assets/js/experience.js`, whose projected segment centers position the anchors. Homepage tools move to the bottom of the hero; interior pages use a small native corner menu. Existing content and static article routes remain the data source.

- [x] Replace `_includes/masthead.html` and add `_includes/ring-navigation.html`; keep real URLs and no-script access.
- [x] Split the WebGL surface into five contiguous mesh groups that separate on navigation open and highlight individually.
- [x] Replace `_sass/_navigation-experience.scss`, adjust `_sass/_spatial.scss` and `_includes/home-landing.html` for the headerless composition, anchored labels and bottom utilities.
- [x] Update browser acceptance for hover/touch/keyboard → destination → return, verify 320–1440 px and both themes with fresh screenshot contexts, retain strict article-route checks.
- [x] Update README and writing guide after inspecting closed/open desktop/mobile browser captures.

**Integrated navigation validation:** Jekyll build and JS syntax checks passed. Full site suite passed 14/14; all 7 navigation groups validated with per-group rerun evidence in `local/previews/integrated-navigation/verification-final.json`. Actual WebGL pixels confirm five-piece separation, active-piece highlighting, a stationary open view and exact paused pose restoration. Final 320–1440 px captures cover both themes, open/closed navigation, short screens and full-page content. Search now restores focus to the visible ring toggle or closed interior menu summary. Final screenshots are in `local/previews/integrated-navigation-final-layout/`; no deployment or push performed.
