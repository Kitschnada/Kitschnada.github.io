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
      themeButton.setAttribute("aria-label", english() ? (dark ? "Use light theme" : "Use dark theme") : (dark ? "切换浅色主题" : "切换深色主题"));
      themeButton.setAttribute("aria-pressed", String(dark));
    }
    if (languageButton) languageButton.setAttribute("aria-label", english() ? "切换为中文" : "Switch to English");
    var meta = document.getElementById("theme-color");
    if (meta) meta.content = dark ? "#050507" : "#f5f5f7";
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

})();
