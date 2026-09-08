/*! Campus Ingeniería · L145–L148 · familias de funciones (hoja 8.1–8.4). */
(function () {
  "use strict";

  var CFG = window.__FAMILIA_CFG__;
  if (!CFG) throw new Error("FAMILIA: falta window.__FAMILIA_CFG__");

  var GK = window.CampusGameKit || {};
  var BLACK = "#111111";
  var GRAPH_BG = "#f8fafc";
  var GRID = "#e2e8f0";
  var TEAL = "#0d9488";
  var CORAL = "#e11d48";
  var AMBER = "#d97706";
  var VIOLET = "#7c3aed";
  var GREEN = "#16a34a";
  var EMPTY = "#64748b";
  var PAD = { l: 52, r: 46, t: 36, b: 52 };
  var XMIN = CFG.xmin, XMAX = CFG.xmax, YMIN = CFG.ymin, YMAX = CFG.ymax;
  var CURVES = CFG.curves || {};
  var ORDER = CFG.order || ["parent", "a", "b", "c"];
  var TOTAL = CFG.totalPhases || 4;
  var COLORS = { parent: TEAL, a: CORAL, b: AMBER, c: VIOLET };

  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var playBtn = document.getElementById("playBtn");
  var stopBtn = document.getElementById("stopBtn");
  var slowBtn = document.getElementById("slowBtn");
  var restartBtn = document.getElementById("restartBtn");
  var loopEl = document.getElementById("loopEl");
  var captionEl = document.getElementById("caption");
  var workPanel = document.getElementById("workPanel");
  var soundMeter = document.getElementById("soundMeter");
  var hintMini = document.getElementById("hintMini");
  var exprResult = document.getElementById("exprResult");
  var stepsList = document.getElementById("stepsList");
  var chipBox = document.getElementById("chipBox");
  var exprFormula = document.getElementById("exprFormula");

  var state = {
    playing: false,
    speedFactor: 1,
    timers: [],
    raf: 0,
    phase: 0,
    vis: {},
    dashed: {},
    showAsy: false,
    showLabels: false,
    showLandmarks: false,
    badge: "",
    pulse: 0
  };

  function delay(ms) { return ms * (state.speedFactor || 1); }
  function clearTimers() {
    state.timers.forEach(function (id) { clearTimeout(id); });
    state.timers = [];
    if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
  }
  function later(ms, fn) {
    var id = setTimeout(fn, delay(ms));
    state.timers.push(id);
    return id;
  }
  function setCaption(html) { if (captionEl) captionEl.innerHTML = html; }
  function setWork(html) {
    if (!workPanel) return;
    if (!html) { workPanel.classList.remove("on", "boom"); workPanel.innerHTML = ""; return; }
    workPanel.classList.add("on");
    workPanel.classList.remove("boom");
    workPanel.innerHTML = html;
  }
  function bip(kind) {
    if (kind === "bad") {
      if (GK.playErrorBuzz) GK.playErrorBuzz();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "bad");
    } else {
      if (GK.playOkChime) GK.playOkChime();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    }
  }

  function evalY(spec, x) {
    var kind = spec.kind;
    var y;
    switch (kind) {
      case "quad":
        y = spec.a * x * x + spec.k;
        break;
      case "ln": {
        var arg = x - spec.pole;
        if (arg <= 1e-9) return NaN;
        y = spec.amp * Math.log(arg);
        break;
      }
      case "exp":
        y = spec.amp * Math.pow(2, spec.sx * x + spec.add);
        break;
      case "hyp": {
        var den = x - spec.pole;
        if (Math.abs(den) < 1e-9) return NaN;
        y = spec.amp / den + spec.k;
        break;
      }
      default: {
        var _never = kind;
        throw new Error("FAMILIA: kind desconocido: " + _never);
      }
    }
    return y;
  }

  function setPhaseUI(n) {
    state.phase = n;
    if (loopEl) loopEl.innerHTML = "Fase <strong>" + (n || "—") + "</strong>/" + TOTAL;
    if (!stepsList) return;
    var lis = stepsList.querySelectorAll("li");
    for (var i = 0; i < lis.length; i++) {
      var s = parseInt(lis[i].getAttribute("data-step"), 10);
      lis[i].classList.remove("on", "done");
      if (n > 0 && s < n) lis[i].classList.add("done");
      else if (s === n) lis[i].classList.add("on");
    }
  }

  function sizeCanvas() {
    var spanX = XMAX - XMIN, spanY = YMAX - YMIN;
    var cell = 52;
    var w = Math.round(PAD.l + spanX * cell + PAD.r);
    var hh = Math.round(PAD.t + spanY * cell + PAD.b);
    if (w > 1100 || hh > 820) {
      cell = Math.max(32, Math.floor(Math.min((1100 - PAD.l - PAD.r) / spanX, (820 - PAD.t - PAD.b) / spanY)));
      w = Math.round(PAD.l + spanX * cell + PAD.r);
      hh = Math.round(PAD.t + spanY * cell + PAD.b);
    }
    canvas.width = w;
    canvas.height = hh;
  }

  function worldToScreen(x, y) {
    var w = canvas.width - PAD.l - PAD.r;
    var hh = canvas.height - PAD.t - PAD.b;
    return {
      x: PAD.l + ((x - XMIN) / (XMAX - XMIN)) * w,
      y: PAD.t + ((YMAX - y) / (YMAX - YMIN)) * hh
    };
  }

  function fmtTick(n) {
    if (Object.is(n, -0) || Math.abs(n) < 1e-12) return "0";
    if (Math.abs(n - 0.5) < 1e-9) return "½";
    if (Math.abs(n + 0.5) < 1e-9) return "−½";
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n)).replace("-", "−");
    return String(Math.round(n * 100) / 100).replace("-", "−");
  }

  function drawAxes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = GRAPH_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    var xi, yi, p0, p1;
    for (xi = Math.ceil(XMIN); xi <= Math.floor(XMAX); xi++) {
      p0 = worldToScreen(xi, YMIN); p1 = worldToScreen(xi, YMAX);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    for (yi = Math.ceil(YMIN); yi <= Math.floor(YMAX); yi++) {
      p0 = worldToScreen(XMIN, yi); p1 = worldToScreen(XMAX, yi);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    var ox = worldToScreen(0, 0);
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (0 >= YMIN && 0 <= YMAX) { ctx.moveTo(PAD.l, ox.y); ctx.lineTo(canvas.width - PAD.r, ox.y); }
    ctx.stroke();
    ctx.beginPath();
    if (0 >= XMIN && 0 <= XMAX) { ctx.moveTo(ox.x, PAD.t); ctx.lineTo(ox.x, canvas.height - PAD.b); }
    ctx.stroke();
    ctx.fillStyle = BLACK;
    ctx.font = "600 12px ui-monospace, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (xi = Math.ceil(XMIN); xi <= Math.floor(XMAX); xi++) {
      if (xi === 0) continue;
      p0 = worldToScreen(xi, 0);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y - 4); ctx.lineTo(p0.x, p0.y + 4); ctx.stroke();
      ctx.fillText(fmtTick(xi), p0.x, Math.min(canvas.height - 18, p0.y + 8));
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (yi = Math.ceil(YMIN); yi <= Math.floor(YMAX); yi++) {
      if (yi === 0) continue;
      p0 = worldToScreen(0, yi);
      ctx.beginPath(); ctx.moveTo(p0.x - 4, p0.y); ctx.lineTo(p0.x + 4, p0.y); ctx.stroke();
      ctx.fillText(fmtTick(yi), Math.max(8, p0.x - 8), p0.y);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("y", ox.x + 8, PAD.t);
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("x", canvas.width - PAD.r, ox.y - 6);
  }

  function drawAsymptotes() {
    if (!state.showAsy) return;
    var seenV = {};
    var seenH = {};
    ORDER.forEach(function (id) {
      if (!state.vis[id] || state.vis[id] <= 0) return;
      var spec = CURVES[id];
      if (!spec) return;
      var col = COLORS[id] || EMPTY;
      if (spec.va != null && !seenV[String(spec.va)]) {
        seenV[String(spec.va)] = true;
        var pv = worldToScreen(spec.va, 0);
        ctx.save();
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(pv.x, PAD.t);
        ctx.lineTo(pv.x, canvas.height - PAD.b);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.font = "700 11px ui-monospace, Menlo, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("x=" + fmtTick(spec.va), pv.x + 4, PAD.t + 4);
        ctx.restore();
      }
      if (spec.ha != null && !seenH[String(spec.ha)]) {
        seenH[String(spec.ha)] = true;
        var ph = worldToScreen(0, spec.ha);
        ctx.save();
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(PAD.l, ph.y);
        ctx.lineTo(canvas.width - PAD.r, ph.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.font = "700 11px ui-monospace, Menlo, monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText("y=" + fmtTick(spec.ha), canvas.width - PAD.r - 4, ph.y - 3);
        ctx.restore();
      }
    });
  }

  function sampleSegs(spec, tReveal) {
    var n = 520;
    var x0 = XMIN, x1 = XMAX;
    var maxX = x0 + (x1 - x0) * Math.max(0, Math.min(1, tReveal));
    var segs = [];
    var cur = [];
    var jump = (YMAX - YMIN) * 0.9;
    var i, x, y, prev;
    for (i = 0; i <= n; i++) {
      x = x0 + (x1 - x0) * (i / n);
      if (x > maxX + 1e-12) break;
      y = evalY(spec, x);
      if (!isFinite(y) || y < YMIN - 40 || y > YMAX + 40) {
        if (cur.length > 1) segs.push(cur);
        cur = [];
        continue;
      }
      if (cur.length) {
        prev = cur[cur.length - 1];
        if (Math.abs(y - prev.y) > jump) {
          if (cur.length > 1) segs.push(cur);
          cur = [];
        }
      }
      cur.push({ x: x, y: y });
    }
    if (cur.length > 1) segs.push(cur);
    return segs;
  }

  function drawCurve(id) {
    var t = state.vis[id] || 0;
    if (t <= 0) return;
    var spec = CURVES[id];
    if (!spec) return;
    var segs = sampleSegs(spec, t);
    var col = COLORS[id] || TEAL;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = id === "parent" ? 2.8 : 2.4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (state.dashed[id]) ctx.setLineDash([8, 5]);
    segs.forEach(function (seg) {
      ctx.beginPath();
      var j, p;
      for (j = 0; j < seg.length; j++) {
        p = worldToScreen(seg[j].x, seg[j].y);
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawLandmarks() {
    if (!state.showLandmarks) return;
    ORDER.forEach(function (id) {
      if (!state.vis[id] || state.vis[id] < 0.95) return;
      var spec = CURVES[id];
      if (!spec || !spec.landmarks) return;
      spec.landmarks.forEach(function (lm) {
        if (!lm.label) return;
        var p = worldToScreen(lm.x, lm.y);
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[id] || GREEN;
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = COLORS[id] || GREEN;
        ctx.font = "800 12px ui-monospace, Menlo, monospace";
        ctx.textAlign = lm.align || "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(lm.label, p.x + (lm.dx || 8), p.y + (lm.dy || -8));
        ctx.restore();
      });
    });
  }

  function drawLabels() {
    if (!state.showLabels) return;
    ORDER.forEach(function (id) {
      if (!state.vis[id] || state.vis[id] < 0.85) return;
      var spec = CURVES[id];
      if (!spec || !spec.labelAt) return;
      var p = worldToScreen(spec.labelAt.x, spec.labelAt.y);
      ctx.save();
      ctx.fillStyle = COLORS[id] || BLACK;
      ctx.font = "800 12px ui-monospace, Menlo, monospace";
      ctx.textAlign = spec.labelAt.align || "left";
      ctx.textBaseline = "middle";
      ctx.fillText(spec.short || spec.html, p.x, p.y);
      ctx.restore();
    });
  }

  function drawBadge() {
    if (!state.badge) return;
    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,0.90)";
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    var bw = Math.min(320, canvas.width - PAD.l - PAD.r - 16);
    var bx = PAD.l + 8, by = PAD.t + 8, bh = 34;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 8);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#86efac";
    ctx.font = "800 13px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(state.badge, bx + 12, by + bh / 2);
    ctx.restore();
  }

  function draw() {
    drawAxes();
    drawAsymptotes();
    ORDER.forEach(drawCurve);
    drawLandmarks();
    drawLabels();
    drawBadge();
  }

  function hideAllCurves() {
    ORDER.forEach(function (id) {
      state.vis[id] = 0;
      state.dashed[id] = false;
    });
  }

  function resetVisuals() {
    hideAllCurves();
    state.showAsy = false;
    state.showLabels = false;
    state.showLandmarks = false;
    state.badge = "";
    state.pulse = 0;
    setPhaseUI(0);
    if (exprResult) exprResult.innerHTML = CFG.resultIdleHtml;
    if (hintMini) hintMini.textContent = CFG.hintMini;
    if (chipBox && CFG.chipsIdle) chipBox.innerHTML = CFG.chipsIdle;
    if (exprFormula && CFG.formulaIdle) exprFormula.innerHTML = CFG.formulaIdle;
    draw();
  }

  function resetView() {
    clearTimers();
    state.playing = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    resetVisuals();
    setWork("");
    setCaption(CFG.captionIdle);
    if (loopEl) loopEl.innerHTML = "Fase <strong>—</strong>/" + TOTAL;
  }

  function applyPhaseMeta(p) {
    if (p.badge != null) state.badge = p.badge;
    if (p.showAsy != null) state.showAsy = p.showAsy;
    if (p.showLabels != null) state.showLabels = p.showLabels;
    if (p.showLandmarks != null) state.showLandmarks = p.showLandmarks;
    if (p.resultHtml && exprResult) exprResult.innerHTML = p.resultHtml;
    if (p.chipsHtml && chipBox) chipBox.innerHTML = p.chipsHtml;
    if (p.formulaHtml && exprFormula) exprFormula.innerHTML = p.formulaHtml;
    if (p.dashed) {
      ORDER.forEach(function (id) { state.dashed[id] = p.dashed.indexOf(id) !== -1; });
    } else {
      ORDER.forEach(function (id) { state.dashed[id] = false; });
    }
    setWork(p.work || "");
    setCaption(p.caption || "");
    if (p.bip) bip(p.bip);
  }

  function animateShow(ids, durationMs, onDone) {
    var from = {};
    ids.forEach(function (id) { from[id] = state.vis[id] || 0; });
    var t0 = null, dur = delay(durationMs);
    function frame(now) {
      if (!state.playing) return;
      if (t0 == null) t0 = now;
      var u = Math.min(1, (now - t0) / dur);
      var ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      ids.forEach(function (id) { state.vis[id] = from[id] + (1 - from[id]) * ease; });
      draw();
      if (u < 1) state.raf = requestAnimationFrame(frame);
      else {
        state.raf = 0;
        ids.forEach(function (id) { state.vis[id] = 1; });
        draw();
        if (onDone) onDone();
      }
    }
    state.raf = requestAnimationFrame(frame);
  }

  function runPlay() {
    if (state.playing) return;
    if (GK.ensureAudio) GK.ensureAudio();
    clearTimers();
    state.playing = true;
    playBtn.disabled = true;
    stopBtn.disabled = false;
    resetVisuals();
    sizeCanvas();
    draw();

    function chain(i) {
      if (!state.playing) return;
      if (i >= CFG.phases.length) {
        state.playing = false;
        playBtn.disabled = false;
        stopBtn.disabled = true;
        return;
      }
      var p = CFG.phases[i];
      if (p.step != null) setPhaseUI(p.step);

      if (p.anim === "clear") {
        hideAllCurves();
        state.showAsy = false;
        state.showLabels = false;
        state.showLandmarks = false;
        state.badge = "";
        draw();
        later(p.wait || 420, function () { chain(i + 1); });
        return;
      }

      applyPhaseMeta(p);
      var ids = p.show || [];
      if (p.anim === "solo" || p.anim === "pair" || p.anim === "all") {
        ids.forEach(function (id) { if (state.vis[id] == null) state.vis[id] = 0; });
        animateShow(ids, p.dur || 850, function () {
          later(p.wait || 500, function () { chain(i + 1); });
        });
        return;
      }
      draw();
      later(p.wait || 1400, function () { chain(i + 1); });
    }
    chain(0);
  }

  playBtn.addEventListener("click", runPlay);
  stopBtn.addEventListener("click", function () {
    clearTimers();
    state.playing = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    setCaption("Detenido. Presioná <strong>▶ Play</strong> o <strong>Reiniciar</strong>.");
  });
  restartBtn.addEventListener("click", resetView);
  slowBtn.addEventListener("click", function () {
    if (state.speedFactor === 1) {
      state.speedFactor = 1.85;
      slowBtn.classList.add("on");
      slowBtn.setAttribute("aria-pressed", "true");
      slowBtn.textContent = "Lento ✓";
    } else {
      state.speedFactor = 1;
      slowBtn.classList.remove("on");
      slowBtn.setAttribute("aria-pressed", "false");
      slowBtn.textContent = "Lento";
    }
  });

  sizeCanvas();
  draw();
  window.addEventListener("resize", function () { sizeCanvas(); draw(); });
  window[CFG.exportName] = { CFG: CFG, state: state, draw: draw, resetView: resetView, evalY: evalY };
  resetView();
})();
