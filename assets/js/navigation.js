/* The sculpture is the navigation. Links remain ordinary, progressively enhanced anchors. */
(function () {
  "use strict";
  var root = document.documentElement;
  var scene = document.querySelector("[data-visual-stage]");
  var toggle = document.querySelector("[data-ring-toggle]");
  var nav = document.querySelector(".ring-nav");
  var corner = document.querySelector(".corner-nav");
  var globalTrigger = document.querySelector("[data-global-nav]");
  var labelTargets = Array.from(document.querySelectorAll("[data-label-zh]"));
  var open = false;

  function syncLabels() {
    var english = root.dataset.lang === "en";
    labelTargets.forEach(function (target) {
      var label = target.getAttribute(english ? "data-label-en" : "data-label-zh");
      if (target === toggle) label = english ? (open ? "Close navigation" : "Open navigation") : (open ? "收起导航" : "展开导航");
      target.setAttribute("aria-label", label);
      target.setAttribute("title", label);
    });
    document.querySelectorAll(".quick-trigger").forEach(function (button) {
      button.setAttribute("aria-label", english ? "Search" : "搜索");
      button.setAttribute("title", (english ? "Search" : "搜索") + " · ⌘ K");
    });
  }
  new MutationObserver(syncLabels).observe(root, { attributes: true, attributeFilter: ["data-lang"] });
  syncLabels();

  if (corner) {
    var returnToCorner = false;
    document.addEventListener("click", function (event) {
      if (!corner.contains(event.target)) corner.open = false;
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && corner.open) {
        event.preventDefault();
        corner.open = false;
        corner.querySelector("summary").focus();
      }
    });
    corner.querySelectorAll("[data-open-nav]").forEach(function (button) {
      button.addEventListener("click", function () {
        returnToCorner = true;
        corner.open = false;
      });
    });
    var quickDialog = document.getElementById("quick-nav");
    if (quickDialog) quickDialog.addEventListener("close", function () {
      if (!returnToCorner) return;
      returnToCorner = false;
      corner.querySelector("summary").focus({ preventScroll: true });
    });
  }
  if (!scene || !toggle || !nav) return;

  var parts = Array.from(nav.querySelectorAll(".ring-part"));
  var canvas = scene.querySelector("canvas");
  var closeTimer = 0;
  var active = -1;
  var hovered = -1;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  function signal() {
    scene.dispatchEvent(new CustomEvent("ringnavchange", { detail: { open: open, active: active } }));
  }
  function updateActive(index) {
    if (index === active) return;
    active = index;
    parts.forEach(function (part, position) { part.classList.toggle("is-active", position === active); });
    signal();
  }
  function setOpen(next) {
    clearTimeout(closeTimer);
    if (open === next && scene.dataset.navOpen !== undefined) return;
    open = next;
    scene.dataset.navOpen = String(open);
    toggle.setAttribute("aria-expanded", String(open));
    nav.inert = !open;
    nav.setAttribute("aria-hidden", String(!open));
    if (!open) {
      hovered = -1;
      active = -1;
      parts.forEach(function (part) { part.classList.remove("is-active"); });
    }
    syncLabels();
    signal();
  }
  function cancelClose() { clearTimeout(closeTimer); }
  function delayedClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      if (!scene.contains(document.activeElement)) setOpen(false);
    }, 280);
  }

  if (canvas) {
    canvas.addEventListener("pointerenter", function (event) {
      if (event.pointerType !== "touch" && finePointer.matches) setOpen(true);
    });
    canvas.addEventListener("pointerdown", function () { setOpen(false); }, true);
  }
  scene.addEventListener("pointerenter", cancelClose);
  scene.addEventListener("pointerleave", function (event) {
    if (event.pointerType !== "touch") delayedClose();
  });
  toggle.addEventListener("click", function (event) {
    var next = !open;
    setOpen(next);
    if (next && event.detail === 0 && parts[0]) parts[0].focus({ preventScroll: true });
  });
  toggle.addEventListener("keydown", function (event) {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    setOpen(true);
    if (parts[0]) parts[0].focus({ preventScroll: true });
  });
  parts.forEach(function (part, index) {
    part.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "touch") return;
      cancelClose();
      hovered = index;
      updateActive(index);
    });
    part.addEventListener("pointerleave", function () {
      hovered = -1;
      updateActive(parts.indexOf(document.activeElement));
    });
    part.addEventListener("focus", function () {
      setOpen(true);
      updateActive(index);
    });
    part.addEventListener("blur", function () {
      requestAnimationFrame(function () { updateActive(hovered >= 0 ? hovered : parts.indexOf(document.activeElement)); });
    });
  });
  scene.addEventListener("focusout", function () {
    requestAnimationFrame(function () {
      if (!scene.contains(document.activeElement)) setOpen(false);
    });
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      toggle.focus({ preventScroll: true });
    }
  });
  document.addEventListener("pointerdown", function (event) {
    if (open && !scene.contains(event.target)) setOpen(false);
  });

  scene.addEventListener("ringprojection", function (event) {
    if (!event.detail || !Array.isArray(event.detail.points)) return;
    var bounds = scene.getBoundingClientRect();
    var padX = Math.min(.25, 45 / Math.max(1, bounds.width));
    var padY = Math.min(.25, 45 / Math.max(1, bounds.height));
    event.detail.points.forEach(function (point, index) {
      if (!parts[index] || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
      var x = Math.max(padX, Math.min(1 - padX, point.x));
      var y = Math.max(padY, Math.min(1 - padY, point.y));
      parts[index].style.setProperty("--part-x", (x * 100).toFixed(3) + "%");
      parts[index].style.setProperty("--part-y", (y * 100).toFixed(3) + "%");
    });
  });
  // The renderer precedes this script; request a fresh projection after listening.
  setOpen(false);

  if (globalTrigger) {
    var hero = scene.closest(".cinematic-hero") || scene;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        globalTrigger.hidden = entries[0].isIntersecting;
      }, { threshold: 0 }).observe(hero);
    } else {
      function showGlobalTrigger() {
        var bounds = hero.getBoundingClientRect();
        globalTrigger.hidden = bounds.bottom > 0 && bounds.top < window.innerHeight;
      }
      window.addEventListener("scroll", showGlobalTrigger, { passive: true });
      showGlobalTrigger();
    }
  }
})();
