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
  var INDIGO = "#5b21b6";
  var EMPTY = "#64748b";
  var PERP_DASH = "rgba(217,119,6,0.62)";
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
    showLTeach: false,
    lPick: false,
    lAnim: null,
    lDone: [],
    perpAnim: null,
    perpDone: [],
    badge: "",
    pulse: 0
  };

  function delay(ms) { return ms * (state.speedFactor || 1); }

  function easeInOut(u) {
    return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  }

  function fmtPt(x, y) {
    return "(" + fmtTick(x) + ", " + fmtTick(y) + ")";
  }

  function lRoute(pt) {
    var a = pt.x;
    var b = pt.y;
    var first = pt.first;
    if (first === "vert") {
      return { corner: { x: a, y: a }, end: { x: b, y: a }, first: first };
    }
    if (first === "horiz") {
      return { corner: { x: b, y: b }, end: { x: b, y: a }, first: first };
    }
    throw new Error("INVERSA: lPoints.first debe ser \"vert\" o \"horiz\"");
  }

  function lerpPt(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function wrapBadgeText(text, maxWidth) {
    ctx.font = "800 13px Segoe UI, system-ui, sans-serif";
    var words = String(text).split(" ");
    var lines = [];
    var cur = "";
    var i, trial;
    for (i = 0; i < words.length; i++) {
      trial = cur ? cur + " " + words[i] : words[i];
      if (cur && ctx.measureText(trial).width > maxWidth) {
        lines.push(cur);
        cur = words[i];
      } else {
        cur = trial;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [text];
  }

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

  function drawLabeledDot(x, y, fill, label) {
    var p = worldToScreen(x, y);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (label) {
      ctx.fillStyle = fill;
      ctx.font = "700 11px ui-monospace, Menlo, monospace";
      ctx.textBaseline = "bottom";
      if (x < -0.05) {
        ctx.textAlign = "right";
        ctx.fillText(label, p.x - 8, p.y - 6);
      } else {
        ctx.textAlign = "left";
        ctx.fillText(label, p.x + 8, p.y - 6);
      }
    }
    ctx.restore();
  }

  function strokePoly(pts, color, lw, dashed) {
    if (!pts || pts.length < 2) return;
    var i, s;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (dashed) ctx.setLineDash(dashed);
    ctx.beginPath();
    s = worldToScreen(pts[0].x, pts[0].y);
    ctx.moveTo(s.x, s.y);
    for (i = 1; i < pts.length; i++) {
      s = worldToScreen(pts[i].x, pts[i].y);
      ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawPivot(pt) {
    var p = worldToScreen(pt.x, pt.y);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = AMBER;
    ctx.fill();
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawRightAngleMark(mid) {
    var s = 0.32;
    var verts = [
      { x: mid.x + s, y: mid.y },
      { x: mid.x, y: mid.y + s },
      { x: mid.x - s, y: mid.y },
      { x: mid.x, y: mid.y - s }
    ];
    var i, p;
    ctx.save();
    ctx.beginPath();
    p = worldToScreen(verts[0].x, verts[0].y);
    ctx.moveTo(p.x, p.y);
    for (i = 1; i < verts.length; i++) {
      p = worldToScreen(verts[i].x, verts[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(217,119,6,0.18)";
    ctx.fill();
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 1.7;
    ctx.stroke();
    ctx.restore();
  }

  function drawLPathFull(path) {
    strokePoly([path.start, path.corner, path.end], INDIGO, 2.7, [11, 5]);
    drawPivot(path.corner);
  }

  function drawLTeach() {
    if (!state.showLTeach) return;
    var i, pt, path, head, travelling;
    if (state.lPick && CFG.lPoints) {
      for (i = 0; i < CFG.lPoints.length; i++) {
        pt = CFG.lPoints[i];
        drawLabeledDot(pt.x, pt.y, TEAL, fmtPt(pt.x, pt.y));
      }
    }
    for (i = 0; i < state.lDone.length; i++) {
      path = state.lDone[i];
      drawLPathFull(path);
      drawLabeledDot(path.end.x, path.end.y, CORAL, fmtPt(path.end.x, path.end.y));
    }
    if (state.lAnim) {
      path = state.lAnim;
      if (path.stage === "leg1") {
        head = lerpPt(path.start, path.corner, path.t);
        strokePoly([path.start, head], INDIGO, 3.05, null);
        if (path.t > 0.92) drawPivot(path.corner);
        travelling = head;
      } else if (path.stage === "leg2") {
        head = lerpPt(path.corner, path.end, path.t);
        strokePoly([path.start, path.corner, head], INDIGO, 3.05, null);
        drawPivot(path.corner);
        travelling = head;
      } else {
        throw new Error("INVERSA: lAnim.stage desconocido: " + path.stage);
      }
      drawLabeledDot(travelling.x, travelling.y, INDIGO, "");
    }
  }

  function drawPerpTeach() {
    if (!state.showLTeach) return;
    var i, seg, head, mid;
    function strokePerp(a, b, t) {
      t = t == null ? 1 : t;
      head = lerpPt(a, b, t);
      strokePoly([a, head], PERP_DASH, 1.7, [6, 5]);
      if (t > 0.52) {
        mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        drawRightAngleMark(mid);
      }
    }
    for (i = 0; i < state.perpDone.length; i++) {
      seg = state.perpDone[i];
      strokePerp(seg.start, seg.end, 1);
    }
    if (state.perpAnim) {
      strokePerp(state.perpAnim.start, state.perpAnim.end, state.perpAnim.t);
    }
  }

  function drawBadge() {
    if (!state.badge) return;
    var maxInner = Math.min(430, canvas.width - PAD.l - PAD.r - 40);
    var lines = wrapBadgeText(state.badge, maxInner);
    var i, tw = 0;
    ctx.save();
    ctx.font = "800 13px Segoe UI, system-ui, sans-serif";
    for (i = 0; i < lines.length; i++) {
      tw = Math.max(tw, ctx.measureText(lines[i]).width);
    }
    var bw = Math.min(canvas.width - PAD.l - PAD.r - 16, Math.max(180, tw + 24));
    var lineH = 17;
    var bh = 12 + lines.length * lineH + 6;
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
    for (i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + 12, by + 9 + i * lineH + lineH / 2);
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
    drawMirror();
    drawLTeach();
    drawPerpTeach();
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
      var ease = easeInOut(u);
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

  function resolveLPoint(p) {
    var list = CFG.lPoints;
    if (!list || !list.length) {
      throw new Error("INVERSA: anim lPath/perpSeg requiere CFG.lPoints");
    }
    var idx = p.lIndex;
    if (idx == null || idx < 0 || idx >= list.length) {
      throw new Error("INVERSA: lIndex fuera de rango: " + idx);
    }
    return list[idx];
  }

  function animateLPath(pt, durationMs, onDone) {
    var route = lRoute(pt);
    var start = { x: pt.x, y: pt.y };
    var corner = route.corner;
    var end = route.end;
    var legMs = durationMs || 900;

    function runSeg(from, to, stage, ms, next) {
      var t0 = null;
      var dur = delay(ms);
      state.lAnim = {
        start: start,
        corner: corner,
        end: end,
        from: from,
        to: to,
        t: 0,
        stage: stage
      };
      function frame(now) {
        if (!state.playing) return;
        if (t0 == null) t0 = now;
        var u = Math.min(1, (now - t0) / dur);
        state.lAnim.t = easeInOut(u);
        draw();
        if (u < 1) state.raf = requestAnimationFrame(frame);
        else {
          state.raf = 0;
          state.lAnim.t = 1;
          draw();
          next();
        }
      }
      state.raf = requestAnimationFrame(frame);
    }

    runSeg(start, corner, "leg1", legMs, function () {
      if (!state.playing) return;
      bip("ok");
      later(340, function () {
        if (!state.playing) return;
        runSeg(corner, end, "leg2", legMs, function () {
          if (!state.playing) return;
          state.lDone.push({ start: start, corner: corner, end: end, pt: pt });
          state.lAnim = null;
          draw();
          if (onDone) onDone();
        });
      });
    });
  }

  function animatePerpSeg(pt, durationMs, onDone) {
    var t0 = null;
    var dur = delay(durationMs || 700);
    var start = { x: pt.x, y: pt.y };
    var end = { x: pt.y, y: pt.x };
    state.perpAnim = { start: start, end: end, t: 0 };
    function frame(now) {
      if (!state.playing) return;
      if (t0 == null) t0 = now;
      var u = Math.min(1, (now - t0) / dur);
      state.perpAnim.t = easeInOut(u);
      draw();
      if (u < 1) state.raf = requestAnimationFrame(frame);
      else {
        state.raf = 0;
        state.perpAnim.t = 1;
        state.perpDone.push({ start: start, end: end });
        state.perpAnim = null;
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
    state.showLTeach = false;
    state.lPick = false;
    state.lAnim = null;
    state.lDone = [];
    state.perpAnim = null;
    state.perpDone = [];
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
    if (p.showLTeach != null) state.showLTeach = p.showLTeach;
    if (p.lPick != null) state.lPick = p.lPick;
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
        state.showLTeach = true;
        applyPhase(p);
        animateLPath(resolveLPoint(p), p.dur || 900, function () {
          later(p.wait || 400, function () { chain(i + 1); });
        });
        return;
      }
      if (anim === "perpSeg") {
        state.showLTeach = true;
        applyPhase(p);
        animatePerpSeg(resolveLPoint(p), p.dur || 700, function () {
          later(p.wait || 800, function () { chain(i + 1); });
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
