/*! Campus Ingeniería · L149–L152 · inversa: explain → algebra → graph f y f⁻¹ con y=x. */
(function () {
  "use strict";

  var CFG = window.__INVERSA_CFG__;
  if (!CFG) throw new Error("INVERSA: falta window.__INVERSA_CFG__");
  if (typeof CFG.f !== "function" || typeof CFG.fInv !== "function") {
    throw new Error("INVERSA: CFG.f y CFG.fInv deben ser funciones");
  }

  var GK = window.CampusGameKit || {};
  var BLACK = "#111111";
  var GRAPH_BG = "#f8fafc";
  var GRID = "#e2e8f0";
  var TEAL = "#0d9488";
  var CORAL = "#e11d48";
  var AMBER = "#d97706";
  var GREEN = "#16a34a";
  var EMPTY = "#64748b";
  var LPATH = "#7c3aed";
  var PAD = { l: 52, r: 48, t: 36, b: 48 };
  var XMIN = CFG.xmin;
  var XMAX = CFG.xmax;
  var YMIN = CFG.ymin;
  var YMAX = CFG.ymax;
  var TOTAL = CFG.totalPhases || 6;
  var fOk = CFG.fOk || function () { return true; };
  var invOk = CFG.invOk || function () { return true; };

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

  var state = {
    playing: false,
    speedFactor: 1,
    timers: [],
    raf: 0,
    phase: 0,
    fT: 0,
    invT: 0,
    showYX: false,
    yxT: 0,
    showMirror: false,
    mirrorT: 0,
    showMeet: false,
    showFAsy: false,
    showInvAsy: false,
    showLPaths: false,
    lItems: [],
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

  function setCaption(html) { captionEl.innerHTML = html; }

  function setWork(html) {
    if (!html) { workPanel.classList.remove("on", "boom"); workPanel.innerHTML = ""; return; }
    workPanel.classList.add("on");
    workPanel.innerHTML = html;
  }

  function bip(kind) {
    if (kind === "bad") {
      if (GK.playErrorBuzz) GK.playErrorBuzz();
      else if (GK.playBuzz) GK.playBuzz();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "bad");
    } else {
      if (GK.playOkChime) GK.playOkChime();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    }
  }

  function setPhaseUI(n) {
    state.phase = n;
    loopEl.innerHTML = "Fase <strong>" + (n || "—") + "</strong>/" + TOTAL;
    var lis = stepsList.querySelectorAll("li");
    for (var i = 0; i < lis.length; i++) {
      var s = parseInt(lis[i].getAttribute("data-step"), 10);
      lis[i].classList.remove("on", "done");
      if (n > 0 && s < n) lis[i].classList.add("done");
      else if (s === n) lis[i].classList.add("on");
    }
  }

  function sizeCanvas() {
    var spanX = XMAX - XMIN;
    var spanY = YMAX - YMIN;
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
    if (Math.abs(n - 1.5) < 1e-9) return "3/2";
    if (Math.abs(n + 1.5) < 1e-9) return "−3/2";
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
      var sx = worldToScreen(xi, 0);
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx.x, sx.y - 4); ctx.lineTo(sx.x, sx.y + 4); ctx.stroke();
      ctx.fillStyle = BLACK;
      ctx.fillText(fmtTick(xi), sx.x, sx.y + 8);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (yi = Math.ceil(YMIN); yi <= Math.floor(YMAX); yi++) {
      if (yi === 0) continue;
      var sy = worldToScreen(0, yi);
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sy.x - 4, sy.y); ctx.lineTo(sy.x + 4, sy.y); ctx.stroke();
      ctx.fillStyle = BLACK;
      ctx.fillText(fmtTick(yi), sy.x - 8, sy.y);
    }
    ctx.fillStyle = BLACK;
    ctx.font = "700 14px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    var oxY = (0 >= YMIN && 0 <= YMAX) ? ox.y : canvas.height - PAD.b;
    var oxX = (0 >= XMIN && 0 <= XMAX) ? ox.x : PAD.l;
    ctx.fillText("x", canvas.width - PAD.r - 16, Math.min(canvas.height - 18, oxY + 18));
    ctx.fillText("y", Math.max(10, oxX + 10), PAD.t + 16);
    if (0 >= XMIN && 0 <= XMAX && 0 >= YMIN && 0 <= YMAX) {
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.font = "600 12px ui-monospace, Menlo, monospace";
      ctx.fillText("0", ox.x - 8, ox.y + 8);
    }
  }

  function lerpPt(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function easeInOut(u) {
    return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  }

  function lGeom(spec) {
    if (!spec || spec.x == null) throw new Error("INVERSA: lPath requiere x");
    var x = spec.x;
    var y = spec.y != null ? spec.y : CFG.f(x);
    var first = spec.first;
    var start = { x: x, y: y };
    var end = { x: y, y: x };
    var corner;
    switch (first) {
      case "v":
        corner = { x: x, y: x };
        break;
      case "h":
        corner = { x: y, y: y };
        break;
      default: {
        var _exhaustive = first;
        throw new Error("INVERSA: lPath.first debe ser \"v\" o \"h\", no " + _exhaustive);
      }
    }
    return { start: start, corner: corner, end: end, first: first };
  }

  function wrapBadgeLines(text, maxW) {
    var words = String(text).split(/\s+/);
    var lines = [];
    var cur = "";
    var i, trial;
    for (i = 0; i < words.length; i++) {
      trial = cur ? cur + " " + words[i] : words[i];
      if (!cur || ctx.measureText(trial).width <= maxW) cur = trial;
      else {
        lines.push(cur);
        cur = words[i];
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function drawDashed(a, b, color, lw) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 1.6;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawAsymptotes(list, color) {
    if (!list || !list.length) return;
    var i, a, p0, p1;
    for (i = 0; i < list.length; i++) {
      a = list[i];
      ctx.save();
      ctx.strokeStyle = color || EMPTY;
      ctx.lineWidth = 1.7;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      if (a.type === "v") {
        p0 = worldToScreen(a.at, YMIN);
        p1 = worldToScreen(a.at, YMAX);
        ctx.moveTo(p0.x, PAD.t);
        ctx.lineTo(p1.x, canvas.height - PAD.b);
      } else if (a.type === "h") {
        p0 = worldToScreen(XMIN, a.at);
        p1 = worldToScreen(XMAX, a.at);
        ctx.moveTo(PAD.l, p0.y);
        ctx.lineTo(canvas.width - PAD.r, p1.y);
      } else {
        ctx.restore();
        throw new Error("INVERSA: tipo de asíntota desconocido: " + a.type);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color || EMPTY;
      ctx.font = "700 11px ui-monospace, Menlo, monospace";
      if (a.type === "v") {
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(a.label || ("x=" + fmtTick(a.at)), p0.x + 5, PAD.t + 4);
      } else {
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(a.label || ("y=" + fmtTick(a.at)), PAD.l + 6, p0.y - 3);
      }
      ctx.restore();
    }
  }

  function drawHoles(list) {
    if (!list || !list.length) return;
    var i, h, p;
    for (i = 0; i < list.length; i++) {
      h = list[i];
      p = worldToScreen(h.x, h.y);
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = GRAPH_BG;
      ctx.fill();
      ctx.strokeStyle = EMPTY;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawCurveProgress(fn, okFn, color, t, label) {
    t = Math.max(0, Math.min(1, t));
    if (t <= 0.001) return;
    var x0 = XMIN;
    var x1 = XMIN + (XMAX - XMIN) * t;
    var steps = 520;
    var first = true;
    var i, x, y, s, lastS = null, lastY = null;
    var jump = (YMAX - YMIN) * 0.42;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.15;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (i = 0; i <= steps; i++) {
      x = x0 + (x1 - x0) * (i / steps);
      if (!okFn(x)) { first = true; lastY = null; lastS = null; continue; }
      y = fn(x);
      if (!isFinite(y) || y < YMIN - 0.7 || y > YMAX + 0.7) {
        first = true; lastY = null; lastS = null; continue;
      }
      if (lastY != null && Math.abs(y - lastY) > jump) {
        first = true; lastS = null;
      }
      s = worldToScreen(x, y);
      lastS = s;
      lastY = y;
      if (first) { ctx.moveTo(s.x, s.y); first = false; }
      else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    if (t > 0.78 && lastS && label) {
      ctx.fillStyle = color;
      ctx.font = "800 13px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      var lx = Math.min(canvas.width - PAD.r - 8, lastS.x + 8);
      var ly = Math.max(PAD.t + 14, lastS.y - 6);
      ctx.fillText(label, lx, ly);
    }
    ctx.restore();
  }

  function drawYX() {
    if (!state.showYX || state.yxT <= 0.001) return;
    var lo = Math.max(XMIN, YMIN);
    var hi = Math.min(XMAX, YMAX);
    var mid = lo + (hi - lo) * Math.max(0, Math.min(1, state.yxT));
    var a = worldToScreen(lo, lo);
    var b = worldToScreen(mid, mid);
    drawDashed(a, b, AMBER, 2.1);
    if (state.yxT > 0.72) {
      var lab = worldToScreen(lo + (hi - lo) * 0.62, lo + (hi - lo) * 0.62);
      ctx.save();
      ctx.fillStyle = AMBER;
      ctx.font = "800 13px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("y = x", lab.x + 8, lab.y + 8);
      ctx.restore();
    }
  }

  function drawMirror() {
    if (!state.showMirror || !CFG.points) return;
    var t = Math.max(0, Math.min(1, state.mirrorT));
    var i, pt, p0, p1, pm, mx, my;
    for (i = 0; i < CFG.points.length; i++) {
      pt = CFG.points[i];
      p0 = worldToScreen(pt.x, pt.y);
      p1 = worldToScreen(pt.y, pt.x);
      mx = pt.x + (pt.y - pt.x) * t;
      my = pt.y + (pt.x - pt.y) * t;
      pm = worldToScreen(mx, my);
      drawDashed(p0, p1, "rgba(217,119,6,0.55)", 1.4);
      ctx.save();
      ctx.fillStyle = TEAL;
      ctx.beginPath(); ctx.arc(p0.x, p0.y, 5.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = CORAL;
      ctx.beginPath(); ctx.arc(pm.x, pm.y, 5.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.2; ctx.stroke();
      if (t > 0.92) {
        ctx.fillStyle = CORAL;
        ctx.font = "700 11px ui-monospace, Menlo, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText("(" + fmtTick(pt.y) + "," + fmtTick(pt.x) + ")", p1.x + 8, p1.y - 6);
      }
      ctx.restore();
    }
  }

  function drawDot(x, y, r, fill) {
    var p = worldToScreen(x, y);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    return p;
  }

  function drawLPaths() {
    if (!state.showLPaths || !state.lItems || !state.lItems.length) return;
    var i, item, g, t1, t2, a, c, tip, tipPt, pStart, pEnd;
    for (i = 0; i < state.lItems.length; i++) {
      item = state.lItems[i];
      g = item.geom;
      t1 = Math.max(0, Math.min(1, item.t1 || 0));
      t2 = Math.max(0, Math.min(1, item.t2 || 0));
      tip = null;
      a = worldToScreen(g.start.x, g.start.y);
      ctx.save();
      ctx.strokeStyle = item.done ? "rgba(124,58,237,0.78)" : LPATH;
      ctx.lineWidth = 2.8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      if (t1 > 0.001) {
        tipPt = lerpPt(g.start, g.corner, t1);
        tip = worldToScreen(tipPt.x, tipPt.y);
        ctx.lineTo(tip.x, tip.y);
      }
      if (t1 >= 0.999 && t2 > 0.001) {
        tipPt = lerpPt(g.corner, g.end, t2);
        tip = worldToScreen(tipPt.x, tipPt.y);
        c = worldToScreen(g.corner.x, g.corner.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(tip.x, tip.y);
      }
      ctx.stroke();
      ctx.restore();

      pStart = drawDot(g.start.x, g.start.y, 5.2, TEAL);
      ctx.save();
      ctx.fillStyle = TEAL;
      ctx.font = "700 11px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("(" + fmtTick(g.start.x) + "," + fmtTick(g.start.y) + ")", pStart.x + 8, pStart.y - 6);
      ctx.restore();

      if (t1 >= 0.92) {
        drawDot(g.corner.x, g.corner.y, 4.2, AMBER);
      }
      if (t2 > 0.88) {
        pEnd = drawDot(g.end.x, g.end.y, 5.2, CORAL);
        ctx.save();
        ctx.fillStyle = CORAL;
        ctx.font = "700 11px ui-monospace, Menlo, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText("(" + fmtTick(g.end.x) + "," + fmtTick(g.end.y) + ")", pEnd.x + 8, pEnd.y - 6);
        ctx.restore();
      }
      if (!item.done && tip) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 4.4, 0, Math.PI * 2);
        ctx.fillStyle = LPATH;
        ctx.fill();
        ctx.strokeStyle = "#ede9fe";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawMeet() {
    if (!state.showMeet || !CFG.meet || !CFG.meet.length) return;
    var i, m, p, r;
    for (i = 0; i < CFG.meet.length; i++) {
      m = CFG.meet[i];
      p = worldToScreen(m.x, m.y);
      r = 7.5 + (state.pulse ? Math.sin(state.pulse) * 1.2 : 0);
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(22,163,74,0.16)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = GREEN;
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = GREEN;
      ctx.font = "800 12px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(m.html || ("(" + fmtTick(m.x) + "," + fmtTick(m.y) + ")"), p.x + 10, p.y - 8);
      ctx.restore();
    }
  }

  function drawBadge() {
    if (!state.badge) return;
    ctx.save();
    ctx.font = "800 13px Segoe UI, system-ui, sans-serif";
    var maxInner = canvas.width - PAD.l - PAD.r - 40;
    var minW = Math.min(340, canvas.width - PAD.l - PAD.r - 16);
    var lines = wrapBadgeLines(state.badge, maxInner);
    var i, tw = 0, lw;
    for (i = 0; i < lines.length; i++) {
      lw = ctx.measureText(lines[i]).width;
      if (lw > tw) tw = lw;
    }
    var bw = Math.min(canvas.width - PAD.l - PAD.r - 16, Math.max(minW, tw + 24));
    var lineH = 18;
    var bh = Math.max(36, 16 + lines.length * lineH);
    var bx = PAD.l + 8, by = PAD.t + 8;
    ctx.fillStyle = "rgba(22,101,52,0.92)";
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 8);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#86efac";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    var y0 = by + bh / 2 - ((lines.length - 1) * lineH) / 2;
    for (i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + 12, y0 + i * lineH);
    }
    ctx.restore();
  }

  function draw() {
    drawAxes();
    if (state.showFAsy) drawAsymptotes(CFG.fAsy, EMPTY);
    if (state.showInvAsy) drawAsymptotes(CFG.invAsy, "#9f1239");
    drawYX();
    drawCurveProgress(CFG.f, fOk, TEAL, state.fT, "f");
    drawCurveProgress(CFG.fInv, invOk, CORAL, state.invT, "f⁻¹");
    if (state.fT > 0.5) drawHoles(CFG.fHoles);
    if (state.invT > 0.5) drawHoles(CFG.invHoles);
    drawLPaths();
    drawMirror();
    drawMeet();
    drawBadge();
  }

  function animateKey(key, from, to, durationMs, onDone) {
    var t0 = null;
    var dur = delay(durationMs);
    function frame(now) {
      if (!state.playing) return;
      if (t0 == null) t0 = now;
      var u = Math.min(1, (now - t0) / dur);
      var ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      state[key] = from + (to - from) * ease;
      draw();
      if (u < 1) state.raf = requestAnimationFrame(frame);
      else {
        state.raf = 0;
        state[key] = to;
        draw();
        if (onDone) onDone();
      }
    }
    state.raf = requestAnimationFrame(frame);
  }

  function animateLPath(item, durationMs, onDone) {
    var t0 = null;
    var dur = delay(durationMs);
    var holdFrac = 0.18;
    function frame(now) {
      if (!state.playing) return;
      if (t0 == null) t0 = now;
      var u = Math.min(1, (now - t0) / dur);
      var u1 = 0.5 - holdFrac / 2;
      var u2 = 0.5 + holdFrac / 2;
      if (u <= u1) {
        item.t1 = easeInOut(u / u1);
        item.t2 = 0;
      } else if (u <= u2) {
        item.t1 = 1;
        item.t2 = 0;
      } else {
        item.t1 = 1;
        item.t2 = easeInOut((u - u2) / (1 - u2));
      }
      draw();
      if (u < 1) state.raf = requestAnimationFrame(frame);
      else {
        state.raf = 0;
        item.t1 = 1;
        item.t2 = 1;
        item.done = true;
        draw();
        if (onDone) onDone();
      }
    }
    state.raf = requestAnimationFrame(frame);
  }

  function resetVisuals() {
    state.fT = 0;
    state.invT = 0;
    state.showYX = false;
    state.yxT = 0;
    state.showMirror = false;
    state.mirrorT = 0;
    state.showMeet = false;
    state.showFAsy = false;
    state.showInvAsy = false;
    state.showLPaths = false;
    state.lItems = [];
    state.badge = "";
    state.pulse = 0;
    setPhaseUI(0);
    if (exprResult) exprResult.innerHTML = CFG.resultIdleHtml;
    if (hintMini) hintMini.innerHTML = CFG.hintMini;
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
    loopEl.innerHTML = "Fase <strong>—</strong>/" + TOTAL;
  }

  function applyPhase(p) {
    if (p.fT != null) state.fT = p.fT;
    if (p.invT != null) state.invT = p.invT;
    if (p.showYX != null) state.showYX = p.showYX;
    if (p.yxT != null) state.yxT = p.yxT;
    if (p.showMirror != null) state.showMirror = p.showMirror;
    if (p.mirrorT != null) state.mirrorT = p.mirrorT;
    if (p.showMeet != null) state.showMeet = p.showMeet;
    if (p.showFAsy != null) state.showFAsy = p.showFAsy;
    if (p.showInvAsy != null) state.showInvAsy = p.showInvAsy;
    if (p.showLPaths != null) state.showLPaths = p.showLPaths;
    if (p.badge != null) state.badge = p.badge;
    if (p.resultHtml && exprResult) exprResult.innerHTML = p.resultHtml;
    draw();
    setWork(p.work || "");
    if (p.boom) workPanel.classList.add("boom");
    else workPanel.classList.remove("boom");
    setCaption(p.caption);
    bip(p.bip || "ok");
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
      setPhaseUI(p.step != null ? p.step : i + 1);
      var anim = p.anim || "hold";
      if (anim === "drawF") {
        applyPhase(p);
        animateKey("fT", 0, 1, p.dur || 900, function () {
          later(p.wait || 400, function () { chain(i + 1); });
        });
        return;
      }
      if (anim === "drawInv") {
        applyPhase(p);
        animateKey("invT", state.invT || 0, 1, p.dur || 900, function () {
          later(p.wait || 400, function () { chain(i + 1); });
        });
        return;
      }
      if (anim === "drawYX") {
        state.showYX = true;
        applyPhase(p);
        animateKey("yxT", 0, 1, p.dur || 700, function () {
          later(p.wait || 400, function () { chain(i + 1); });
        });
        return;
      }
      if (anim === "mirror") {
        state.showMirror = true;
        applyPhase(p);
        animateKey("mirrorT", 0, 1, p.dur || 1100, function () {
          later(p.wait || 450, function () { chain(i + 1); });
        });
        return;
      }
      if (anim === "lPath") {
        state.showLPaths = true;
        var item = { geom: lGeom(p.lPath), t1: 0, t2: 0, done: false };
        state.lItems.push(item);
        applyPhase(p);
        animateLPath(item, p.dur || 1500, function () {
          later(p.wait || 450, function () { chain(i + 1); });
        });
        return;
      }
      if (anim === "hold") {
        applyPhase(p);
        later(p.wait || 1600, function () { chain(i + 1); });
        return;
      }
      throw new Error("INVERSA: anim desconocida: " + anim);
    }
    chain(0);
  }

  function wireSoftPrev() {
    var el = document.getElementById("softPrev");
    var list = CFG.softPrev;
    if (!el || !list || !list.length) return;
    var idx = 0;
    function tryNext() {
      if (idx >= list.length) return;
      var c = list[idx++];
      fetch(c.href, { method: "GET", cache: "no-store" }).then(function (r) {
        if (!r.ok) { tryNext(); return; }
        var a = document.createElement("a");
        a.className = "lesson-nav prev";
        a.href = c.href;
        a.title = c.title;
        a.setAttribute("aria-label", "Lección anterior");
        a.innerHTML = '<span class="chev" aria-hidden="true"></span>';
        el.replaceWith(a);
      }).catch(tryNext);
    }
    tryNext();
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
  wireSoftPrev();
  window.addEventListener("resize", function () { sizeCanvas(); draw(); });
  window[CFG.exportName] = { CFG: CFG, state: state, draw: draw, resetView: resetView };
  resetView();
})();
