/* Pointer-only perspective: links and reading never depend on the effect. */
(function () {
  "use strict";
  var motion = window.matchMedia("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)");
  document.querySelectorAll("[data-spatial-card]").forEach(function (card) {
    var frame = 0, x = 0, y = 0;
    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
    }
    card.addEventListener("pointermove", function (event) {
      if (!motion.matches || event.pointerType !== "mouse") return;
      var bounds = card.getBoundingClientRect();
      x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      if (!frame) frame = requestAnimationFrame(function () {
        card.style.setProperty("--tilt-x", (-y * 3.5).toFixed(2) + "deg");
        card.style.setProperty("--tilt-y", (x * 4.5).toFixed(2) + "deg");
        frame = 0;
      });
    }, { passive: true });
    card.addEventListener("pointerleave", reset);
    card.addEventListener("blur", reset);
    if (motion.addEventListener) motion.addEventListener("change", reset);
  });
})();
