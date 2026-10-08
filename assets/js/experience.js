/* A small, dependency-free interactive sculpture. The page works without it. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var motionButton = document.getElementById("motion-toggle");
  var motionRunning = !reducedMotion.matches;
  var motionOverride = false;
  var scene = document.querySelector("[data-visual-stage]");
  var canvas = document.getElementById("hero-canvas");
  var paletteButtons = document.querySelectorAll("[data-palette]");
  var resetButtons = document.querySelectorAll("[data-scene-reset]");
  var renderer = null;
  var renderingUnavailable = false;
  var palette = "violet";

  function updateMotion() {
    var english = root.dataset.lang === "en";
    var running = motionRunning && !renderingUnavailable;
    var unavailableLabel = english ? "3D rendering unavailable" : "3D 渲染不可用";
    var motionLabel = running ? (english ? "Pause animation" : "暂停动画") : (english ? "Play animation" : "播放动画");
    root.dataset.motion = running ? "running" : "paused";
    root.classList.toggle("scene-unavailable", renderingUnavailable);
    if (motionButton) {
      motionButton.disabled = renderingUnavailable;
      motionButton.setAttribute("aria-pressed", String(running));
      motionButton.setAttribute("aria-label", renderingUnavailable ? unavailableLabel : motionLabel);
      var label = motionButton.querySelector("[data-motion-label]");
      if (label) label.textContent = renderingUnavailable ? unavailableLabel : motionLabel;
    }
    resetButtons.forEach(function (button) {
      button.disabled = renderingUnavailable;
      button.setAttribute("aria-label", renderingUnavailable ? unavailableLabel : (english ? "Reset view" : "重置视角"));
    });
    if (renderer) renderer.invalidate();
  }

  var languageButton = document.getElementById("language-toggle");
  if (languageButton) languageButton.addEventListener("click", updateMotion);

  if (motionButton) motionButton.addEventListener("click", function () {
    motionOverride = true;
    motionRunning = !motionRunning;
    updateMotion();
  });
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", function () {
    if (!motionOverride) motionRunning = !reducedMotion.matches;
    updateMotion();
  });
  updateMotion();

  function setPalette(value) {
    if (!["violet", "blue", "silver"].includes(value)) return;
    palette = value;
    root.dataset.palette = value;
    if (scene) scene.dataset.palette = value;
    paletteButtons.forEach(function (button) {
      if (button.tagName === "BUTTON") button.setAttribute("aria-pressed", String(button.dataset.palette === value));
    });
    if (renderer) renderer.invalidate();
  }
  paletteButtons.forEach(function (button) {
    if (button.tagName === "BUTTON") button.addEventListener("click", function () { setPalette(button.dataset.palette); });
  });
  setPalette(palette);

  function createSculpture() {
    if (!scene || !canvas) return null;
    var gl;
    try {
      gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: "low-power" });
    } catch (_) { return null; }
    if (!gl) return null;

    var vertexSource = [
      "attribute vec3 aPosition;",
      "attribute vec3 aOpenPosition;",
      "attribute vec3 aNormal;",
      "attribute vec3 aOpenNormal;",
      "attribute float aRibbon;",
      "attribute float aPart;",
      "attribute float aAlong;",
      "uniform mat4 uProjection;",
      "uniform mat3 uRotation;",
      "uniform mediump float uOpen;",
      "uniform float uFraming;",
      "varying vec3 vPosition;",
      "varying vec3 vNormal;",
      "varying float vRibbon;",
      "varying float vPart;",
      "varying float vAlong;",
      "void main() {",
      "  vPosition = uRotation * mix(aPosition, aOpenPosition, uOpen);",
      "  vNormal = uRotation * normalize(mix(aNormal, aOpenNormal, uOpen));",
      "  vRibbon = aRibbon;",
      "  vPart = aPart;",
      "  vAlong = aAlong;",
      "  vec4 clipPosition = uProjection * vec4(vPosition + vec3(0.0, 0.0, -5.0), 1.0);",
      "  clipPosition.xy *= uFraming;",
      "  gl_Position = clipPosition;",
      "}"
    ].join("\n");
    var fragmentSource = [
      "precision mediump float;",
      "varying vec3 vPosition;",
      "varying vec3 vNormal;",
      "varying float vRibbon;",
      "varying float vPart;",
      "varying float vAlong;",
      "uniform vec3 uColorA;",
      "uniform vec3 uColorB;",
      "uniform mediump float uOpen;",
      "uniform float uActive;",
      "vec3 environment(vec3 r) {",
      "  vec3 color = vec3(0.011, 0.015, 0.023);",
      "  float sky = smoothstep(-0.5, 0.95, r.y);",
      "  color += vec3(0.065, 0.076, 0.105) * sky;",
      "  float softbox = exp(-pow((r.x + 0.36) / 0.54, 2.0) - pow((r.y - 0.62) / 0.14, 2.0));",
      "  float strip = exp(-pow((r.x - 0.56) / 0.085, 2.0) - pow((r.y + 0.05) / 0.9, 2.0));",
      "  float lower = exp(-pow((r.y + 0.76) / 0.10, 2.0));",
      "  color += vec3(1.0, 0.98, 0.96) * softbox * 3.2;",
      "  color += vec3(0.78, 0.88, 1.0) * strip * 1.9;",
      "  float ceiling = exp(-pow((r.y - 0.82) / 0.31, 2.0));",
      "  color += vec3(0.82, 0.87, 1.0) * ceiling * 0.44;",
      "  color += uColorB * lower * 1.4;",
      "  float left = exp(-pow((r.x + 0.80) / 0.34, 2.0) - pow((r.y + 0.1) / 0.60, 2.0));",
      "  float right = exp(-pow((r.x - 0.65) / 0.36, 2.0) - pow((r.y - 0.15) / 0.58, 2.0));",
      "  color += uColorA * (left * 1.1 + sky * 0.04);",
      "  color += uColorB * right * 0.95;",
      "  float horizon = exp(-pow((r.y + 0.13 + r.x * 0.24) / 0.065, 2.0));",
      "  color += mix(uColorA, vec3(0.75, 0.85, 1.0), 0.45) * horizon * 0.6;",
      "  return color;",
      "}",
      "void main() {",
      "  vec3 n = normalize(vNormal);",
      "  if (!gl_FrontFacing) n = -n;",
      "  vec3 view = normalize(vec3(0.0, 0.0, 5.0) - vPosition);",
      "  vec3 reflected = reflect(-view, n);",
      "  float facing = max(dot(n, view), 0.0);",
      "  float fresnel = pow(1.0 - facing, 3.0);",
      "  vec3 color = environment(reflected);",
      "  vec3 interference = mix(uColorA, uColorB, 0.5 + 0.5 * sin(facing * 7.5 + vPosition.z * 1.4));",
      "  color += interference * (0.026 + fresnel * 0.11);",
      "  float rim = smoothstep(0.975, 0.999, abs(vRibbon));",
      "  color += mix(interference, vec3(0.7, 0.85, 1.0), 0.7) * rim * (0.12 + fresnel * 0.30);",
      "  float cutEdge = (1.0 - smoothstep(0.0, 0.024, min(vAlong, 1.0 - vAlong))) * uOpen;",
      "  float selected = (1.0 - step(0.1, abs(vPart - uActive))) * uOpen;",
      "  color += mix(uColorB, vec3(0.88, 0.94, 1.0), 0.65) * cutEdge * 0.46;",
      "  color += mix(uColorA, uColorB, 0.64) * selected * (0.18 + fresnel * 0.26);",
      "  float key = max(dot(n, normalize(vec3(-1.5, 2.5, 3.0))), 0.0);",
      "  color += mix(uColorA, vec3(0.27, 0.31, 0.39), 0.55) * key * 0.035;",
      "  color *= 0.84 + fresnel * 0.30;",
      "  color = clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);",
      "  color = pow(color, vec3(0.4545));",
      "  gl_FragColor = vec4(color, 1.0);",
      "}"
    ].join("\n");

    function compile(type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        throw new Error("Sculpture shader unavailable");
      }
      return shader;
    }

    var program = gl.createProgram();
    var vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
    var fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Sculpture program unavailable");
    gl.useProgram(program);

    // One half-twist joins each edge to the other: a true Möbius surface.
    // Duplicate seam vertices meet with reversed width and opposite normals.
    // Rendering both faces keeps the non-orientable ribbon seamless.
    var partCount = 5;
    var segmentsPerPart = 40;
    var minorSegments = 32;
    var vertices = [];
    var openVertices = [];
    var normals = [];
    var openNormals = [];
    var ribbons = [];
    var parts = [];
    var along = [];
    var indices = [];
    function surface(u, v) {
      var radius = 1.08 + v * Math.cos(u * 0.5);
      return [radius * Math.cos(u), radius * Math.sin(u), v * Math.sin(u * 0.5)];
    }
    function normal(u, v) {
      var halfCos = Math.cos(u * 0.5), halfSin = Math.sin(u * 0.5);
      var radial = 1.08 + v * halfCos;
      var du = [-0.5 * v * halfSin * Math.cos(u) - radial * Math.sin(u), -0.5 * v * halfSin * Math.sin(u) + radial * Math.cos(u), 0.5 * v * halfCos];
      var dv = [halfCos * Math.cos(u), halfCos * Math.sin(u), halfSin];
      var n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
      var magnitude = Math.hypot(n[0], n[1], n[2]);
      return [n[0] / magnitude, n[1] / magnitude, n[2] / magnitude];
    }
    // Each fifth has its own seam vertices. They meet exactly when closed;
    // opening trims the angular ends and moves each curved panel radially.
    var partAngle = Math.PI * 2 / partCount;
    var separation = 0.24;
    var endGap = 0.09;
    for (var part = 0; part < partCount; part++) {
      var midpoint = (part + 0.5) * partAngle;
      var offsetX = Math.cos(midpoint) * separation;
      var offsetY = Math.sin(midpoint) * separation;
      var baseIndex = vertices.length / 3;
      for (var i = 0; i <= segmentsPerPart; i++) {
        var fraction = i / segmentsPerPart;
        var u = (part + fraction) * partAngle;
        var openU = part * partAngle + endGap + fraction * (partAngle - endGap * 2);
        for (var j = 0; j <= minorSegments; j++) {
          var ribbon = j / minorSegments * 2 - 1;
          var v = ribbon * 0.58;
          var p = surface(u, v);
          var opened = surface(openU, v);
          var n = normal(u, v);
          var openedNormal = normal(openU, v);
          vertices.push(p[0], p[1], p[2]);
          openVertices.push(opened[0] + offsetX, opened[1] + offsetY, opened[2]);
          normals.push(n[0], n[1], n[2]);
          openNormals.push(openedNormal[0], openedNormal[1], openedNormal[2]);
          ribbons.push(ribbon);
          parts.push(part);
          along.push(fraction);
          if (i < segmentsPerPart && j < minorSegments) {
            var index = baseIndex + i * (minorSegments + 1) + j;
            indices.push(index, index + minorSegments + 1, index + 1, index + 1, index + minorSegments + 1, index + minorSegments + 2);
          }
        }
      }
    }
    function attribute(name, data, size) {
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      var location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size || 3, gl.FLOAT, false, 0, 0);
    }
    attribute("aPosition", vertices);
    attribute("aOpenPosition", openVertices);
    attribute("aNormal", normals);
    attribute("aOpenNormal", openNormals);
    attribute("aRibbon", ribbons, 1);
    attribute("aPart", parts, 1);
    attribute("aAlong", along, 1);
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);

    var uniforms = {};
    ["uProjection", "uRotation", "uColorA", "uColorB", "uOpen", "uActive", "uFraming"].forEach(function (name) { uniforms[name] = gl.getUniformLocation(program, name); });
    var colors = {
      violet: [[0.39, 0.035, 1.0], [0.025, 0.62, 1.0]],
      blue: [[0.015, 0.38, 0.95], [0.06, 0.9, 1.0]],
      silver: [[0.55, 0.62, 0.78], [0.73, 0.80, 0.94]]
    };
    var rotation = new Float32Array(9);
    var projection = new Float32Array(16);
    var initialAngleX = 0.68;
    var initialAngleY = -0.42;
    var angleX = initialAngleX;
    var angleY = initialAngleY;
    var hoverX = 0;
    var hoverY = 0;
    var elapsed = 0;
    var lastTime = 0;
    var frame = 0;
    var visible = true;
    var lost = false;
    var dirty = true;
    var drag = null;
    var resizeNeeded = true;
    var ringOpen = false;
    var ringAmount = 0;
    var ringFrom = 0;
    var ringStarted = 0;
    var activePart = -1;

    scene.addEventListener("ringnavchange", function (event) {
      var state = event.detail || {};
      var nextOpen = Boolean(state.open);
      if (nextOpen !== ringOpen) {
        ringFrom = ringAmount;
        ringStarted = performance.now();
        ringOpen = nextOpen;
      }
      activePart = Number.isInteger(state.active) && state.active >= 0 && state.active < partCount ? state.active : -1;
      invalidate();
    });

    function resize() {
      var box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      // A fixed pixel budget also keeps wide desktop displays inexpensive.
      var ratio = Math.min(window.devicePixelRatio || 1, 1.65, Math.sqrt(1200000 / (box.width * box.height)));
      var width = Math.max(1, Math.round(box.width * ratio));
      var height = Math.max(1, Math.round(box.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      var aspect = width / height;
      var f = 1 / Math.tan(0.70 / 2);
      // Preserve the sculpture's silhouette in portrait containers.
      if (aspect < 1) f *= aspect;
      projection[0] = f / aspect;
      projection[5] = f;
      projection[10] = -1.002002;
      projection[11] = -1;
      projection[14] = -0.2002002;
      gl.uniformMatrix4fv(uniforms.uProjection, false, projection);
      resizeNeeded = false;
    }

    function draw(now) {
      frame = 0;
      if (lost || !visible || document.hidden) { lastTime = 0; return; }
      var dt = lastTime ? Math.min((now - lastTime) / 1000, 0.08) : 0;
      if (!dirty && now - lastTime < 1000 / 40) { frame = requestAnimationFrame(draw); return; }
      lastTime = now;
      var target = ringOpen ? 1 : 0;
      var transition = reducedMotion.matches ? 1 : Math.min(1, Math.max(0, (now - ringStarted) / 480));
      var eased = transition * transition * (3 - 2 * transition);
      ringAmount = ringFrom + (target - ringFrom) * eased;
      if (motionRunning && !drag && !ringOpen && ringAmount === 0) elapsed += dt;
      if (resizeNeeded) resize();
      var x = angleX + Math.sin(elapsed * 0.26) * 0.09 + hoverY * 0.07;
      var y = angleY + Math.sin(elapsed * 0.20) * 0.18 + hoverX * 0.10;
      var z = -0.46 + elapsed * 0.035;
      // Return through the shortest arc to a predictable, stationary menu pose.
      // The original drag orientation and animation time resume on closing.
      x += Math.atan2(Math.sin(initialAngleX - x), Math.cos(initialAngleX - x)) * ringAmount;
      y += Math.atan2(Math.sin(initialAngleY - y), Math.cos(initialAngleY - y)) * ringAmount;
      z += Math.atan2(Math.sin(-0.46 - z), Math.cos(-0.46 - z)) * ringAmount;
      var cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
      rotation[0] = cz * cy;
      rotation[1] = sz * cy;
      rotation[2] = -sy;
      rotation[3] = cz * sy * sx - sz * cx;
      rotation[4] = sz * sy * sx + cz * cx;
      rotation[5] = cy * sx;
      rotation[6] = cz * sy * cx + sz * sx;
      rotation[7] = sz * sy * cx - cz * sx;
      rotation[8] = cy * cx;
      gl.uniformMatrix3fv(uniforms.uRotation, false, rotation);
      gl.uniform3fv(uniforms.uColorA, colors[palette][0]);
      gl.uniform3fv(uniforms.uColorB, colors[palette][1]);
      gl.uniform1f(uniforms.uOpen, ringAmount);
      gl.uniform1f(uniforms.uActive, activePart);
      var framing = 1 - ringAmount * 0.10;
      gl.uniform1f(uniforms.uFraming, framing);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      var points = [];
      for (var part = 0; part < partCount; part++) {
        var center = (part + 0.5) * partAngle;
        var radius = 1.08 + separation * ringAmount;
        var px = Math.cos(center) * radius;
        var py = Math.sin(center) * radius;
        var rx = rotation[0] * px + rotation[3] * py;
        var ry = rotation[1] * px + rotation[4] * py;
        var rz = rotation[2] * px + rotation[5] * py;
        points.push({ x: 0.5 + projection[0] * rx / (5 - rz) * 0.5 * framing, y: 0.5 - projection[5] * ry / (5 - rz) * 0.5 * framing });
      }
      scene.dispatchEvent(new CustomEvent("ringprojection", { detail: { points: points, open: ringAmount } }));
      dirty = false;
      if ((motionRunning && !ringOpen) || ringAmount !== target) frame = requestAnimationFrame(draw);
    }

    function invalidate() {
      dirty = true;
      if (!frame && !lost && visible && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    }

    canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || drag || ringOpen) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, angleX: angleX, angleY: angleY };
      canvas.setPointerCapture(event.pointerId);
      scene.classList.add("is-dragging");
    });
    canvas.addEventListener("pointermove", function (event) {
      if (drag && event.pointerId === drag.id) {
        angleY = drag.angleY + (event.clientX - drag.x) * 0.007;
        angleX = drag.angleX + (event.clientY - drag.y) * 0.007;
        invalidate();
      } else if (event.pointerType === "mouse" && motionRunning && !ringOpen) {
        var rect = canvas.getBoundingClientRect();
        hoverX = (event.clientX - rect.left) / rect.width * 2 - 1;
        hoverY = (event.clientY - rect.top) / rect.height * 2 - 1;
      }
    }, { passive: true });
    function endDrag(event) {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      scene.classList.remove("is-dragging");
      invalidate();
    }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("lostpointercapture", endDrag);
    canvas.addEventListener("pointerleave", function () { hoverX = 0; hoverY = 0; });
    document.querySelectorAll("[data-scene-reset]").forEach(function (button) {
      button.addEventListener("click", function () {
        angleX = initialAngleX;
        angleY = initialAngleY;
        elapsed = 0;
        hoverX = hoverY = 0;
        invalidate();
      });
    });
    if ("ResizeObserver" in window) {
      var resizeObserver = new ResizeObserver(function () { resizeNeeded = true; invalidate(); });
      resizeObserver.observe(canvas);
    } else window.addEventListener("resize", function () { resizeNeeded = true; invalidate(); }, { passive: true });
    if ("IntersectionObserver" in window) {
      var sceneObserver = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) invalidate();
        else stop();
      }, { rootMargin: "60px" });
      sceneObserver.observe(scene);
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else invalidate(); });
    canvas.addEventListener("webglcontextlost", function (event) {
      event.preventDefault();
      lost = true;
      stop();
      delete scene.dataset.renderer;
      renderingUnavailable = true;
      updateMotion();
    });
    // The CSS sculpture remains available if a driver drops the WebGL context.
    // Restoration is intentionally left to a fresh page load, avoiding duplicate listeners.
    draw(performance.now());
    if (gl.getError() !== gl.NO_ERROR) {
      lost = true;
      stop();
      throw new Error("Sculpture render unavailable");
    }
    scene.dataset.renderer = "webgl";
    return { invalidate: invalidate };
  }

  try { renderer = createSculpture(); } catch (_) {
    if (scene) delete scene.dataset.renderer;
  }
  renderingUnavailable = !renderer;
  updateMotion();

  var reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px 30px 0px" });
    reveals.forEach(function (element) { revealObserver.observe(element); });
    root.classList.add("reveal-ready");
  } else reveals.forEach(function (element) { element.classList.add("is-visible"); });

  document.querySelectorAll("[data-spotlight]").forEach(function (element) {
    var pending = 0;
    var spotX = 50, spotY = 50;
    element.addEventListener("pointermove", function (event) {
      if (reducedMotion.matches || event.pointerType !== "mouse") return;
      var rect = element.getBoundingClientRect();
      spotX = (event.clientX - rect.left) / rect.width * 100;
      spotY = (event.clientY - rect.top) / rect.height * 100;
      if (!pending) pending = requestAnimationFrame(function () {
        element.style.setProperty("--spotlight-x", spotX.toFixed(2) + "%");
        element.style.setProperty("--spotlight-y", spotY.toFixed(2) + "%");
        pending = 0;
      });
    }, { passive: true });
    element.addEventListener("pointerleave", function () {
      cancelAnimationFrame(pending);
      pending = 0;
      element.style.removeProperty("--spotlight-x");
      element.style.removeProperty("--spotlight-y");
    });
  });

  var scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    var travel = root.scrollHeight - window.innerHeight;
    root.style.setProperty("--scroll-progress", travel > 0 ? Math.max(0, Math.min(1, window.scrollY / travel)).toFixed(4) : "0");
    root.classList.toggle("has-scrolled", window.scrollY > 28);
  }
  function scheduleScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }
  window.addEventListener("scroll", scheduleScroll, { passive: true });
  window.addEventListener("resize", scheduleScroll, { passive: true });
  window.addEventListener("load", scheduleScroll, { once: true });
  updateScroll();

  var dialog = document.getElementById("quick-nav");
  var search = document.getElementById("quick-search");
  var empty = document.getElementById("search-empty");
  if (dialog && typeof dialog.showModal === "function") {
    var previousFocus = null;
    var searchLinks = Array.from(dialog.querySelectorAll("[data-search-link]"));
    function filterLinks() {
      var query = search ? search.value.trim().toLocaleLowerCase() : "";
      var count = 0;
      searchLinks.forEach(function (link) {
        var haystack = (link.textContent + " " + (link.dataset.searchLink || "") + " " + (link.dataset.searchText || "")).toLocaleLowerCase();
        link.hidden = query.length > 0 && !haystack.includes(query);
        if (!link.hidden) count++;
      });
      if (empty) empty.hidden = count !== 0;
    }
    function openNav(trigger) {
      if (dialog.open) return;
      previousFocus = trigger || document.activeElement;
      if (search) search.value = "";
      filterLinks();
      dialog.showModal();
      root.classList.add("nav-dialog-open");
      if (search) search.focus();
    }
    document.querySelectorAll("[data-open-nav]").forEach(function (button) {
      button.addEventListener("click", function () { openNav(button); });
    });
    dialog.querySelectorAll("[data-close-nav]").forEach(function (button) {
      button.addEventListener("click", function () { dialog.close(); });
    });
    dialog.addEventListener("click", function (event) {
      if (event.target.closest("[data-search-link]")) dialog.close();
      if (event.target === dialog) {
        var rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      }
    });
    dialog.addEventListener("close", function () {
      root.classList.remove("nav-dialog-open");
      if (previousFocus && previousFocus.isConnected) {
        var closedMenu = previousFocus.closest("details:not([open])");
        var focusTarget = previousFocus.closest(".ring-nav[inert]")
          ? document.querySelector("[data-ring-toggle]")
          : closedMenu ? closedMenu.querySelector("summary") : previousFocus;
        if (focusTarget) focusTarget.focus({ preventScroll: true });
      }
    });
    if (search) search.addEventListener("input", filterLinks);
    dialog.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        dialog.close();
        return;
      }
      var visibleLinks = searchLinks.filter(function (link) { return !link.hidden; });
      if (event.key === "Enter" && document.activeElement === search && visibleLinks.length) {
        event.preventDefault();
        visibleLinks[0].click();
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (!visibleLinks.length) return;
      event.preventDefault();
      var index = visibleLinks.indexOf(document.activeElement);
      if (event.key === "ArrowDown") index = (index + 1) % visibleLinks.length;
      else index = index <= 0 ? visibleLinks.length - 1 : index - 1;
      visibleLinks[index].focus();
    }, true);
    document.addEventListener("keydown", function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.open) dialog.close();
        else openNav();
      }
    });
  }
})();
