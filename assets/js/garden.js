/* Progressive enhancements. Every article and link already exists in the HTML. */
(function () {
  "use strict";
  var root = document.documentElement;
  function write(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  function english() { return root.dataset.lang === "en"; }

  var themeButton = document.getElementById("theme-toggle");
  var languageButton = document.getElementById("language-toggle");
  function syncLabels() {
    var dark = root.dataset.theme === "dark";
    if (themeButton) {
      themeButton.setAttribute("aria-label", english() ? (dark ? "Use paper theme" : "Use night theme") : (dark ? "切换昼庭主题" : "切换夜庭主题"));
      themeButton.setAttribute("aria-pressed", String(dark));
    }
    if (languageButton) languageButton.setAttribute("aria-label", english() ? "切换为中文" : "Switch to English");
    var meta = document.getElementById("theme-color");
    if (meta) meta.content = dark ? "#101b2c" : "#f3efe6";
    var nav = document.getElementById("garden-nav");
    if (nav) nav.setAttribute("aria-label", english() ? "Main navigation" : "主导航");
  }
  if (themeButton) themeButton.addEventListener("click", function () {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    write("theme", root.dataset.theme);
    syncLabels();
  });
  if (languageButton) languageButton.addEventListener("click", function () {
    root.dataset.lang = english() ? "zh" : "en";
    root.lang = english() ? "en" : "zh-CN";
    write("home_lang", root.dataset.lang);
    syncLabels();
  });
  syncLabels();

  var menu = document.querySelector(".menu-toggle");
  var nav = document.getElementById("garden-nav");
  var dropdowns = document.querySelectorAll(".nav-dropdown");
  function closeDropdowns(returnFocus) {
    dropdowns.forEach(function (dropdown) {
      if (dropdown.open) {
        dropdown.open = false;
        if (returnFocus) dropdown.querySelector("summary").focus();
      }
    });
  }
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".nav-dropdown")) closeDropdowns(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.querySelector(".nav-dropdown[open]")) {
      closeDropdowns(true);
      event.stopImmediatePropagation();
    }
  });
  function closeMenu(returnFocus) {
    if (!menu || !nav) return;
    nav.classList.remove("is-open");
    closeDropdowns(false);
    menu.setAttribute("aria-expanded", "false");
    if (returnFocus) menu.focus();
  }
  if (menu && nav) {
    menu.addEventListener("click", function () {
      var open = menu.getAttribute("aria-expanded") !== "true";
      menu.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    });
    nav.addEventListener("click", function (event) { if (event.target.closest("a")) closeMenu(false); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") closeMenu(true);
    });
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".header-right")) closeMenu(false);
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 760) closeMenu(false); });
  }

  var library = document.getElementById("poem-library");
  var poemFigure = document.getElementById("hero-poem");
  if (library && poemFigure) {
    try {
      var poems = JSON.parse(library.textContent);
      poems = Array.isArray(poems) ? poems.filter(function (poem) {
        return poem && typeof poem.text === "string" && poem.text.trim();
      }) : [];
      if (poems.length) {
        var poem = poems[Math.floor(Math.random() * poems.length)];
        poemFigure.lang = poem.lang || "zh-CN";
        document.getElementById("poem-text").textContent = poem.text.trim();
        document.getElementById("poem-author").textContent = poem.author || "";
        var title = document.getElementById("poem-title");
        title.textContent = poem.title || "";
        title.hidden = !poem.title;
        poemFigure.hidden = false;
      } else {
        poemFigure.hidden = true;
      }
    } catch (_) { /* The statically rendered first poem remains readable. */ }
  }

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    var timer;
    button.addEventListener("click", async function () {
      var value = button.getAttribute("data-copy");
      var status = button.parentElement.querySelector(".copy-status");
      var copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(value);
          copied = true;
        }
      } catch (_) {}
      if (!copied) {
        var field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("readonly", "");
        field.style.cssText = "position:fixed;left:-9999px;top:0;";
        document.body.appendChild(field);
        field.select();
        try { copied = document.execCommand("copy"); } catch (_) {}
        field.remove();
        button.focus();
      }
      if (status) {
        clearTimeout(timer);
        status.textContent = copied
          ? (english() ? "Email copied." : "邮箱已复制。")
          : (english() ? "Please select and copy the email address above." : "请手动选中上方邮箱并复制。");
        timer = setTimeout(function () { status.textContent = ""; }, 6000);
      }
    });
  });

  // Pointer gestures are decorative; navigation and reading never depend on them.
  var motion = window.matchMedia("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)");
  var scenes = document.querySelectorAll("[data-ink-scene]");
  scenes.forEach(function (scene) {
    var frame = 0;
    var x = 0, y = 0;
    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      scene.style.removeProperty("--scene-x");
      scene.style.removeProperty("--scene-y");
      scene.style.removeProperty("--light-x");
      scene.style.removeProperty("--light-y");
    }
    scene.addEventListener("pointermove", function (event) {
      if (!motion.matches || event.pointerType !== "mouse") return;
      var bounds = scene.getBoundingClientRect();
      x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      if (!frame) frame = requestAnimationFrame(function () {
        scene.style.setProperty("--scene-x", (x * 7).toFixed(2) + "px");
        scene.style.setProperty("--scene-y", (y * 5).toFixed(2) + "px");
        scene.style.setProperty("--light-x", (50 + x * 23).toFixed(1) + "%");
        scene.style.setProperty("--light-y", (50 + y * 23).toFixed(1) + "%");
        frame = 0;
      });
    }, { passive: true });
    scene.addEventListener("pointerleave", reset);
    if (motion.addEventListener) motion.addEventListener("change", reset);
  });

  document.addEventListener("click", function (event) {
    if (!motion.matches || event.detail === 0 || event.button !== 0) return;
    if (!event.target.closest("main") || event.target.closest("a, button, input, textarea, select, summary, label, [contenteditable], p, h1, h2, h3, blockquote, figcaption, pre, code")) return;
    if (window.getSelection() && !window.getSelection().isCollapsed) return;
    // Bound the number of simultaneous marks during rapid clicking.
    var marks = document.querySelectorAll(".ink-ripple");
    if (marks.length >= 5) marks[0].remove();
    var mark = document.createElement("span");
    mark.className = "ink-ripple";
    mark.setAttribute("aria-hidden", "true");
    mark.style.left = event.clientX + "px";
    mark.style.top = event.clientY + "px";
    document.body.appendChild(mark);
    mark.addEventListener("animationend", function () { mark.remove(); }, { once: true });
    setTimeout(function () { mark.remove(); }, 1200);
  });
})();
