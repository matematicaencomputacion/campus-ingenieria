/*! Campus Ingeniería · inversa parábola (sonrisa / cara triste) · método de la L. CFG: window.__INVERSA_PARABOLA_CFG__. */
(function () {
  "use strict";

  var CFG = window.__INVERSA_PARABOLA_CFG__;
  if (!CFG) throw new Error("INVERSA PARÁBOLA: falta window.__INVERSA_PARABOLA_CFG__");
  if (typeof CFG.f !== "function") throw new Error("INVERSA PARÁBOLA: CFG.f debe ser función");
  if (!CFG.points || !CFG.points.length) throw new Error("INVERSA PARÁBOLA: CFG.points requerido");

  var GK = window.CampusGameKit || {};
  var BLACK = "#111111";
  var GRAPH_BG = "#f8fafc";
  var GRID = "#e2e8f0";
  var SMILE = CFG.curveColor || "#e11d48";
  var PURPLE = "#a855f7";
  var PURPLE_GLOW = "rgba(168,85,247,0.35)";
  var GREEN = "#16a34a";
  var GREEN_GLOW = "rgba(22,163,74,0.32)";
  var BLUE = CFG.invColor || "#2563eb";
  var AMBER = "#d97706";
  var AXIS_GLOW = "#FFBF00";
  var PAD = { l: 52, r: 48, t: 36, b: 48 };
  var XMIN = CFG.xmin != null ? CFG.xmin : -11;
  var XMAX = CFG.xmax != null ? CFG.xmax : 11;
  var YMIN = CFG.ymin != null ? CFG.ymin : -16;
  var YMAX = CFG.ymax != null ? CFG.ymax : 8;
  var TOTAL = 9;
  var BIG_R = 14;
  var POINTS = CFG.points;
  var fOf = CFG.f;
  var invXOfY = CFG.invX || CFG.f;
  var SHAPE = CFG.shape || "parábola";
  var OPEN_DIR = CFG.openDir || "derecha";
  var F_CORE = CFG.fCore || "f(x)";
  var INV_CORE = CFG.invCore || "f(y)";
  var EXPORT_NAME = CFG.exportName || "__INVERSA_PARABOLA";

  var DOM_LO = CFG.domLo;
  var DOM_HI = CFG.domHi;
  var INV_DOM_LO = CFG.invDomLo;
  var INV_DOM_HI = CFG.invDomHi;
  var INV_IM_LO = CFG.invImLo;
  var INV_IM_HI = CFG.invImHi;
  if (DOM_LO == null || DOM_HI == null) {
    DOM_LO = POINTS[0].x;
    DOM_HI = POINTS[0].x;
    POINTS.forEach(function (p) {
      if (p.x < DOM_LO) DOM_LO = p.x;
      if (p.x > DOM_HI) DOM_HI = p.x;
    });
  }
  if (INV_DOM_LO == null || INV_DOM_HI == null) {
    INV_DOM_LO = POINTS[0].y;
    INV_DOM_HI = POINTS[0].y;
    POINTS.forEach(function (p) {
      if (p.y < INV_DOM_LO) INV_DOM_LO = p.y;
      if (p.y > INV_DOM_HI) INV_DOM_HI = p.y;
    });
  }
  if (INV_IM_LO == null || INV_IM_HI == null) {
    INV_IM_LO = DOM_LO;
    INV_IM_HI = DOM_HI;
  }
  var vtxSrc = CFG.vertex || POINTS[Math.floor(POINTS.length / 2)];
  var INV_VTX = CFG.invVertex || { x: vtxSrc.y, y: vtxSrc.x };
  var F_LABEL = CFG.fLabel || { x: DOM_HI + 0.4, y: POINTS[POINTS.length - 1].y + 0.4 };
  var INV_LABEL = CFG.invLabel || { x: POINTS[POINTS.length - 1].y + 0.3, y: DOM_HI + 0.6 };
  var YX_LABEL = CFG.yxLabel || { x: 6.2, y: 6.2 };

  function zeros() {
    return POINTS.map(function () { return 0; });
  }
  function falses() {
    return POINTS.map(function () { return false; });
  }
  function fmtIntv(a, b) {
    return "[" + fmtTick(a) + ", " + fmtTick(b) + "]";
  }

  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var confettiCanvas = document.getElementById("confetti");
  var graphWrap = document.getElementById("graphWrap");
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
  var dsmTableBody = document.getElementById("dsmTableBody");
  var dsmInv = document.getElementById("dsmInv");
  var dsmInvFormula = document.getElementById("dsmInvFormula");
  var dsmF = document.getElementById("dsmF");

  var CAPTION_IDLE = CFG.captionIdle || ("Presioná <strong>▶ Play</strong> · " + SHAPE + " roja → puntos lila → L sobre <span class=\"hl-axis\">y = x</span> → inversa azul.");
  var RESULT_IDLE = "f⁻¹ · relación = <span class=\"hl-b\">…</span>";
  var HINT_IDLE = CFG.hintIdle || ("▶ Play · " + SHAPE + " → L punto a punto → f⁻¹");

  var state = {
    playing: false,
    speedFactor: 1,
    timers: [],
    raf: 0,
    phase: 0,
    fT: 0,
    yxT: 1,
    pops: [0, 0, 0, 0, 0],
    verts: [0, 0, 0, 0, 0],
    doneL: [false, false, false, false, false],
    greens: [0, 0, 0, 0, 0],
    active: -1,
    fat: 0,
    rot: 0,
    showPivot: false,
    curtainT: 0,
    railsT: 0,
    invT: 0,
    badge: "",
    pulse: 0
  };

  function pivotOf(pt) {
    return { x: pt.x, y: pt.x };
  }

  function mirrorOf(pt) {
    return { x: pt.y, y: pt.x };
  }

  function delay(ms) {
    return ms * (state.speedFactor || 1);
  }

  function clearTimers() {
    state.timers.forEach(function (id) { clearTimeout(id); });
    state.timers = [];
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
  }

  function later(ms, fn) {
    var id = setTimeout(fn, delay(ms));
    state.timers.push(id);
    return id;
  }

  function easeInOut(u) {
    return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  }

  function easeOutBack(u) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  }

  function setCaption(html) {
    captionEl.innerHTML = html;
  }

  function setWork(html) {
    if (!html) {
      workPanel.classList.remove("on");
      workPanel.innerHTML = "";
      return;
    }
    workPanel.classList.add("on");
    workPanel.innerHTML = html;
  }

  function bip() {
    if (GK.playOkChime) GK.playOkChime();
    if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
  }

  function fmtTick(n) {
    if (Object.is(n, -0) || Math.abs(n) < 1e-12) return "0";
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n)).replace("-", "−");
    return String(Math.round(n * 100) / 100).replace("-", "−");
  }

  function fmtPt(pt) {
    return "(" + fmtTick(pt.x) + ", " + fmtTick(pt.y) + ")";
  }

  function setPhaseUI(n) {
    state.phase = n;
    loopEl.innerHTML = "Fase <strong>" + (n || "—") + "</strong>/" + TOTAL;
    var lis = stepsList.querySelectorAll("li");
    var i;
    var s;
    for (i = 0; i < lis.length; i++) {
      s = parseInt(lis[i].getAttribute("data-step"), 10);
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
      cell = Math.max(22, Math.floor(Math.min((1100 - PAD.l - PAD.r) / spanX, (820 - PAD.t - PAD.b) / spanY)));
      w = Math.round(PAD.l + spanX * cell + PAD.r);
      hh = Math.round(PAD.t + spanY * cell + PAD.b);
    }
    canvas.width = w;
    canvas.height = hh;
    sizeConfetti();
  }

  function sizeConfetti() {
    if (!confettiCanvas || !graphWrap) return;
    confettiCanvas.width = graphWrap.clientWidth || canvas.width;
    confettiCanvas.height = graphWrap.clientHeight || canvas.height;
  }

  function worldToScreen(x, y) {
    var w = canvas.width - PAD.l - PAD.r;
    var hh = canvas.height - PAD.t - PAD.b;
    return {
      x: PAD.l + ((x - XMIN) / (XMAX - XMIN)) * w,
      y: PAD.t + ((YMAX - y) / (YMAX - YMIN)) * hh
    };
  }

  function spinTip(pt, F, theta) {
    var dx = pt.x - F.x;
    var dy = pt.y - F.y;
    return {
      x: F.x + dx * Math.cos(theta) - dy * Math.sin(theta),
      y: F.y + dx * Math.sin(theta) + dy * Math.cos(theta)
    };
  }

  function renderTable() {
    var html = "";
    var i;
    var pt;
    var cls;
    var mir;
    for (i = 0; i < POINTS.length; i++) {
      pt = POINTS[i];
      cls = "";
      if (state.active === i) cls = "on";
      else if (state.greens[i] > 0.6) cls = "done";
      mir = state.greens[i] > 0.6 ? fmtPt(mirrorOf(pt)) : "…";
      html += "<tr class=\"" + cls + "\" data-i=\"" + i + "\">";
      html += "<td>" + fmtTick(pt.x) + "</td>";
      html += "<td>" + fmtTick(pt.y) + "</td>";
      html += "<td class=\"mir\">" + mir + "</td></tr>";
    }
    dsmTableBody.innerHTML = html;
  }

  function drawAxes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = GRAPH_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    var xi;
    var yi;
    var p0;
    var p1;
    for (xi = Math.ceil(XMIN); xi <= Math.floor(XMAX); xi++) {
      p0 = worldToScreen(xi, YMIN);
      p1 = worldToScreen(xi, YMAX);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    for (yi = Math.ceil(YMIN); yi <= Math.floor(YMAX); yi++) {
      p0 = worldToScreen(XMIN, yi);
      p1 = worldToScreen(XMAX, yi);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    var ox = worldToScreen(0, 0);
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (0 >= YMIN && 0 <= YMAX) {
      ctx.moveTo(PAD.l, ox.y);
      ctx.lineTo(canvas.width - PAD.r, ox.y);
    }
    ctx.stroke();
    ctx.beginPath();
    if (0 >= XMIN && 0 <= XMAX) {
      ctx.moveTo(ox.x, PAD.t);
      ctx.lineTo(ox.x, canvas.height - PAD.b);
    }
    ctx.stroke();
    ctx.fillStyle = BLACK;
    ctx.font = "600 11px ui-monospace, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    var step = 1;
    for (xi = Math.ceil(XMIN); xi <= Math.floor(XMAX); xi += step) {
      if (xi === 0) continue;
      var sx = worldToScreen(xi, 0);
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx.x, sx.y - 4);
      ctx.lineTo(sx.x, sx.y + 4);
      ctx.stroke();
      ctx.fillStyle = BLACK;
      ctx.fillText(fmtTick(xi), sx.x, sx.y + 8);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (yi = Math.ceil(YMIN); yi <= Math.floor(YMAX); yi += step) {
      if (yi === 0) continue;
      var sy = worldToScreen(0, yi);
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sy.x - 4, sy.y);
      ctx.lineTo(sy.x + 4, sy.y);
      ctx.stroke();
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

  function drawDashed(a, b, color, lw, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 1.6;
    ctx.setLineDash(dash || [6, 5]);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawYX() {
    if (state.yxT <= 0.001) return;
    var lo = Math.max(XMIN, YMIN);
    var hi = Math.min(XMAX, YMAX);
    var mid = lo + (hi - lo) * Math.max(0, Math.min(1, state.yxT));
    var a = worldToScreen(lo, lo);
    var b = worldToScreen(mid, mid);
    drawDashed(a, b, AMBER, 2.15, [7, 6]);
    if (state.yxT > 0.72) {
      var lab = worldToScreen(YX_LABEL.x, YX_LABEL.y);
      ctx.save();
      ctx.fillStyle = AMBER;
      ctx.font = "800 13px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("y = x", lab.x + 8, lab.y + 8);
      ctx.restore();
    }
  }

  function drawSmile(t) {
    t = Math.max(0, Math.min(1, t));
    if (t <= 0.001) return;
    var x0 = DOM_LO;
    var x1 = DOM_LO + (DOM_HI - DOM_LO) * t;
    var steps = 220;
    var i;
    var x;
    var y;
    var s;
    var first = true;
    ctx.save();
    ctx.strokeStyle = SMILE;
    ctx.lineWidth = 3.2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (i = 0; i <= steps; i++) {
      x = x0 + (x1 - x0) * (i / steps);
      y = fOf(x);
      s = worldToScreen(x, y);
      if (first) {
        ctx.moveTo(s.x, s.y);
        first = false;
      } else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    if (t > 0.82) {
      var lab = worldToScreen(F_LABEL.x, F_LABEL.y);
      ctx.fillStyle = SMILE;
      ctx.font = "800 14px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("f", lab.x, lab.y);
    }
    ctx.restore();
  }

  function drawInverse(t) {
    t = Math.max(0, Math.min(1, t));
    if (t <= 0.001) return;
    var half = (INV_IM_HI - INV_IM_LO) / 2;
    var yLo = INV_VTX.y - half * t;
    var yHi = INV_VTX.y + half * t;
    var steps = 220;
    var i;
    var y;
    var x;
    var s;
    var first = true;
    ctx.save();
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 3.2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (i = 0; i <= steps; i++) {
      y = yLo + (yHi - yLo) * (i / steps);
      x = invXOfY(y);
      s = worldToScreen(x, y);
      if (first) {
        ctx.moveTo(s.x, s.y);
        first = false;
      } else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    if (t > 0.82) {
      var lab = worldToScreen(INV_LABEL.x, INV_LABEL.y);
      ctx.fillStyle = BLUE;
      ctx.font = "800 14px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("f⁻¹", lab.x, lab.y);
    }
    ctx.restore();
  }

  function drawDot(x, y, color, glow, scale) {
    scale = scale == null ? 1 : scale;
    if (scale <= 0.02) return;
    var p = worldToScreen(x, y);
    var r = BIG_R * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 7, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }

  function drawPivot(F) {
    var p = worldToScreen(F.x, F.y);
    var r = 6.5 + (state.pulse ? Math.sin(state.pulse) * 0.8 : 0);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,191,0,0.22)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = AXIS_GLOW;
    ctx.fill();
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  function drawVerticals() {
    var i;
    var pt;
    var F;
    var a;
    var b;
    var marked;
    var alpha;
    var lw;
    for (i = 0; i < POINTS.length; i++) {
      if (state.verts[i] <= 0.01) continue;
      if (state.doneL[i]) continue;
      if (state.active === i && state.fat > 0.15 && state.rot < 0.02 && !state.doneL[i]) continue;
      pt = POINTS[i];
      F = pivotOf(pt);
      a = worldToScreen(pt.x, pt.y);
      b = worldToScreen(F.x, F.y);
      marked = i === 0;
      alpha = 0.28 + 0.22 * state.verts[i] + (marked ? 0.12 : 0);
      lw = marked ? 1.7 : 1.25;
      ctx.save();
      ctx.globalAlpha = Math.min(0.7, alpha);
      drawDashed(a, b, AMBER, lw, marked ? [4, 5] : [3, 6]);
      ctx.restore();
    }
  }

  function drawDoneL() {
    var i;
    var pt;
    var F;
    var q;
    var a;
    var f;
    var b;
    for (i = 0; i < POINTS.length; i++) {
      if (!state.doneL[i]) continue;
      if (state.active === i && state.rot > 0.02 && state.rot < 0.98) continue;
      pt = POINTS[i];
      F = pivotOf(pt);
      q = mirrorOf(pt);
      a = worldToScreen(pt.x, pt.y);
      f = worldToScreen(F.x, F.y);
      b = worldToScreen(q.x, q.y);
      ctx.save();
      ctx.globalAlpha = 0.55;
      drawDashed(a, f, AMBER, 1.5, [4, 5]);
      drawDashed(f, b, AMBER, 1.5, [4, 5]);
      ctx.restore();
      drawPivot(F);
    }
  }

  function drawFatAndSpin() {
    if (state.active < 0) return;
    var pt = POINTS[state.active];
    var F = pivotOf(pt);
    var a;
    var b;
    var tip;
    var col;
    if (state.fat > 0.02 && state.rot < 0.02) {
      a = worldToScreen(pt.x, pt.y);
      b = worldToScreen(F.x, F.y);
      ctx.save();
      ctx.strokeStyle = "rgba(217,119,6,0.95)";
      ctx.lineWidth = 2 + 8 * state.fat;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
      if (state.showPivot) drawPivot(F);
      return;
    }
    if (state.rot > 0.01) {
      a = worldToScreen(pt.x, pt.y);
      b = worldToScreen(F.x, F.y);
      tip = spinTip(pt, F, -Math.PI / 2 * state.rot);
      var ts = worldToScreen(tip.x, tip.y);
      ctx.save();
      ctx.strokeStyle = "rgba(217,119,6,0.45)";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = "rgba(217,119,6,0.95)";
      ctx.lineWidth = 8.5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(ts.x, ts.y);
      ctx.stroke();
      ctx.restore();
      col = state.rot < 0.72 ? PURPLE : GREEN;
      drawDot(tip.x, tip.y, col, state.rot < 0.72 ? PURPLE_GLOW : GREEN_GLOW, 0.72 + 0.28 * state.rot);
      if (state.showPivot) drawPivot(F);
    }
  }

  function drawCurtain() {
    var t = state.curtainT;
    if (t <= 0.001) return;
    var xRight = DOM_LO + (DOM_HI - DOM_LO) * t;
    var steps = 80;
    var i;
    var x;
    var sTop;
    var sBot;
    ctx.save();
    ctx.beginPath();
    for (i = 0; i <= steps; i++) {
      x = DOM_LO + (xRight - DOM_LO) * (i / steps);
      sTop = worldToScreen(x, fOf(x));
      if (i === 0) ctx.moveTo(sTop.x, sTop.y);
      else ctx.lineTo(sTop.x, sTop.y);
    }
    for (i = steps; i >= 0; i--) {
      x = DOM_LO + (xRight - DOM_LO) * (i / steps);
      sBot = worldToScreen(x, x);
      ctx.lineTo(sBot.x, sBot.y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(225,29,72,0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(225,29,72,0.45)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (t > 0.55) {
      drawDashed(worldToScreen(DOM_LO, fOf(DOM_LO)), worldToScreen(DOM_LO, DOM_LO), "rgba(217,119,6,0.7)", 2, [5, 4]);
      if (t > 0.92) {
        drawDashed(worldToScreen(DOM_HI, fOf(DOM_HI)), worldToScreen(DOM_HI, DOM_HI), "rgba(217,119,6,0.7)", 2, [5, 4]);
        drawPivot({ x: DOM_LO, y: DOM_LO });
        drawPivot({ x: DOM_HI, y: DOM_HI });
      }
    }
    ctx.restore();
  }

  function drawRails() {
    var t = state.railsT;
    if (t <= 0.001) return;
    var yLo = INV_IM_LO;
    var yHi = INV_IM_HI;
    var xLoHit = DOM_LO;
    var xHiHit = DOM_HI;
    var xEndLo = xLoHit + (fOf(DOM_LO) - xLoHit) * t;
    var xEndHi = xHiHit + (fOf(DOM_HI) - xHiHit) * t;
    drawDashed(worldToScreen(xLoHit, yLo), worldToScreen(xEndLo, yLo), BLUE, 2.2, [6, 5]);
    drawDashed(worldToScreen(xHiHit, yHi), worldToScreen(xEndHi, yHi), BLUE, 2.2, [6, 5]);
    if (t > 0.55) {
      var xA = INV_DOM_LO;
      var xB = INV_DOM_LO + (INV_DOM_HI - INV_DOM_LO) * Math.min(1, (t - 0.55) / 0.45);
      var p0 = worldToScreen(xA, 0);
      var p1 = worldToScreen(xB, 0);
      ctx.save();
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.fillStyle = BLUE;
      ctx.font = "800 12px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.globalAlpha = 1;
      if (t > 0.85) {
        ctx.fillText("Dom f⁻¹ = " + fmtIntv(INV_DOM_LO, INV_DOM_HI), worldToScreen((INV_DOM_LO + INV_DOM_HI) / 2, 0).x, p0.y + 10);
      }
      ctx.restore();
      drawDashed(worldToScreen(INV_VTX.x, 0.4), worldToScreen(INV_VTX.x, INV_VTX.y), "rgba(37,99,235,0.55)", 1.6, [4, 4]);
      if (t > 0.9) {
        var endX;
        if (OPEN_DIR === "izquierda") endX = INV_DOM_LO;
        else if (OPEN_DIR === "derecha") endX = INV_DOM_HI;
        else throw new Error("INVERSA PARÁBOLA: openDir desconocido: " + OPEN_DIR);
        drawDashed(worldToScreen(endX, 0.4), worldToScreen(endX, INV_IM_LO), "rgba(37,99,235,0.45)", 1.6, [4, 4]);
      }
    }
  }

  function drawBadge() {
    if (!state.badge) return;
    ctx.save();
    ctx.fillStyle = "rgba(22,101,52,0.92)";
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    var bw = Math.min(400, canvas.width - PAD.l - PAD.r - 16);
    var bx = PAD.l + 8;
    var bh = 36;
    var by = canvas.height - PAD.b - bh - 10;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 8);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#86efac";
    ctx.font = "800 13px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(state.badge, bx + 12, by + bh / 2);
    ctx.restore();
  }

  function draw() {
    drawAxes();
    drawCurtain();
    drawRails();
    drawYX();
    drawSmile(state.fT);
    drawInverse(state.invT);
    drawVerticals();
    drawDoneL();
    drawFatAndSpin();
    var i;
    var pt;
    var q;
    for (i = 0; i < POINTS.length; i++) {
      pt = POINTS[i];
      drawDot(pt.x, pt.y, PURPLE, PURPLE_GLOW, state.pops[i]);
      if (state.greens[i] > 0.02) {
        q = mirrorOf(pt);
        drawDot(q.x, q.y, GREEN, GREEN_GLOW, state.greens[i]);
      }
    }
    drawBadge();
  }

  function animate(durationMs, onTick, onDone) {
    var t0 = null;
    var dur = delay(durationMs);
    function frame(now) {
      if (!state.playing) return;
      if (t0 == null) t0 = now;
      var u = Math.min(1, (now - t0) / dur);
      onTick(easeInOut(u), u);
      draw();
      if (u < 1) state.raf = requestAnimationFrame(frame);
      else {
        state.raf = 0;
        onTick(1, 1);
        draw();
        if (onDone) onDone();
      }
    }
    state.raf = requestAnimationFrame(frame);
  }

  function resetDesmosPanel() {
    dsmInv.classList.add("hidden");
    dsmInv.classList.remove("magic", "on");
    dsmF.classList.remove("xy-flash", "on");
    dsmInvFormula.innerHTML = "<span class=\"hl-b\">…</span>";
    exprResult.innerHTML = RESULT_IDLE;
    if (hintMini) hintMini.textContent = HINT_IDLE;
    renderTable();
  }

  function resetVisuals() {
    state.fT = 0;
    state.yxT = 1;
    state.pops = zeros();
    state.verts = zeros();
    state.doneL = falses();
    state.greens = zeros();
    state.active = -1;
    state.fat = 0;
    state.rot = 0;
    state.showPivot = false;
    state.curtainT = 0;
    state.railsT = 0;
    state.invT = 0;
    state.badge = "";
    state.pulse = 0;
    setPhaseUI(0);
    resetDesmosPanel();
    draw();
  }

  function resetView() {
    clearTimers();
    state.playing = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    resetVisuals();
    setWork("");
    setCaption(CAPTION_IDLE);
    loopEl.innerHTML = "Fase <strong>—</strong>/" + TOTAL;
  }

  function popPoint(i, done) {
    if (!state.playing) return;
    var pt = POINTS[i];
    setWork("<span class=\"p\">" + fmtPt(pt) + "</span> · x e y claros");
    animate(320, function (_e, u) {
      state.pops[i] = Math.max(0, easeOutBack(u));
    }, function () {
      state.pops[i] = 1;
      bip();
      renderTable();
      draw();
      later(160, done);
    });
  }

  function popAll(i, done) {
    if (!state.playing) return;
    if (i >= POINTS.length) {
      later(500, done);
      return;
    }
    popPoint(i, function () { popAll(i + 1, done); });
  }

  function fatten(i, done) {
    if (!state.playing) return;
    var pt = POINTS[i];
    var F = pivotOf(pt);
    state.active = i;
    state.fat = 0;
    state.rot = 0;
    state.showPivot = false;
    renderTable();
    setPhaseUI(3);
    setWork("<span class=\"paso\">3</span> · vertical gruesa · pivote <span class=\"hl\">" + fmtPt(F) + "</span>");
    setCaption("<span class=\"paso\">Paso 3:</span> engrosamos la vertical de <span class=\"hl-p\">" + fmtPt(pt) + "</span> y marcamos el <span class=\"hl-axis\">pivote</span> donde corta <span class=\"hl-axis\">y = x</span>.");
    animate(420, function (e) {
      state.fat = e;
    }, function () {
      state.fat = 1;
      state.showPivot = true;
      bip();
      draw();
      later(520, done);
    });
  }

  function rotate90(i, done) {
    if (!state.playing) return;
    var pt = POINTS[i];
    var q = mirrorOf(pt);
    setPhaseUI(4);
    setWork("<span class=\"paso\">4</span> · gira 90° · " + fmtPt(pt) + " → <span class=\"inv\">" + fmtPt(q) + "</span>");
    setCaption("<span class=\"paso\">Paso 4:</span> la L gira <strong>90°</strong> alrededor del pivote: <span class=\"hl-p\">" + fmtPt(pt) + "</span> se va hacia <span class=\"hl-v\">" + fmtPt(q) + "</span>.");
    animate(920, function (e) {
      state.rot = e;
    }, function () {
      state.rot = 1;
      bip();
      draw();
      later(280, done);
    });
  }

  function landGreen(i, done) {
    if (!state.playing) return;
    var pt = POINTS[i];
    var q = mirrorOf(pt);
    setPhaseUI(5);
    setWork("<span class=\"paso\">5</span> · <span class=\"p\">" + fmtPt(pt) + "</span> → <span class=\"ok\">" + fmtPt(q) + "</span>");
    setCaption("<span class=\"paso\">Paso 5:</span> el segmento vuelve a punteado y aparece el punto <span class=\"hl-v\">verde</span> en <span class=\"hl-v\">" + fmtPt(q) + "</span>. Lo dejamos.");
    state.doneL[i] = true;
    state.fat = 0;
    state.rot = 0;
    state.showPivot = true;
    animate(380, function (e) {
      state.greens[i] = e;
    }, function () {
      state.greens[i] = 1;
      state.active = -1;
      state.rot = 0;
      state.showPivot = false;
      renderTable();
      bip();
      draw();
      later(420, done);
    });
  }

  function reflectPoint(i, done) {
    if (!state.playing) return;
    if (i >= POINTS.length) {
      later(350, done);
      return;
    }
    fatten(i, function () {
      rotate90(i, function () {
        landGreen(i, function () {
          reflectPoint(i + 1, done);
        });
      });
    });
  }

  function algebraSwap(done) {
    if (!state.playing) return;
    setPhaseUI(6);
    dsmInv.classList.remove("hidden");
    dsmInv.classList.add("on");
    dsmF.classList.add("on", "xy-flash");
    dsmInvFormula.innerHTML = "<span class=\"hl-f\">y = " + F_CORE + "</span>";
    setWork("<span class=\"paso\">6</span> · y = " + F_CORE);
    setCaption("<span class=\"paso\">Paso 6a:</span> partimos de <span class=\"hl-f\">y = f(x)</span>. Ahora intercambiamos las letras.");
    bip();
    later(900, function () {
      if (!state.playing) return;
      dsmF.classList.add("xy-flash");
      dsmInvFormula.innerHTML = "<span class=\"hl-axis\">x ↔ y</span> · <span class=\"hl-b\">x = " + INV_CORE + "</span>";
      setWork("<span class=\"hl\">x ↔ y</span> · aparece la inversa");
      setCaption("<span class=\"paso\">Paso 6b:</span> <span class=\"hl-axis\">x ↔ y</span> — la fórmula inversa aparece <strong>mágicamente</strong>.");
      bip();
      later(850, function () {
        if (!state.playing) return;
        dsmF.classList.remove("xy-flash");
        dsmInv.classList.add("magic");
        dsmInvFormula.innerHTML = "<span class=\"hl-b\">x = " + INV_CORE + "</span><br><span class=\"dom\">{" + fmtTick(INV_DOM_LO) + " ≤ x ≤ " + fmtTick(INV_DOM_HI) + "} · Im = " + fmtIntv(INV_IM_LO, INV_IM_HI) + "</span>";
        exprResult.innerHTML = "x = <span class=\"hl-b\">" + INV_CORE + "</span>";
        setWork("<span class=\"inv\">x = " + INV_CORE + "</span>");
        setCaption("<span class=\"paso\">Paso 6c:</span> quedó <span class=\"hl-b\">x = " + INV_CORE + "</span> · vértice <span class=\"hl-v\">" + fmtPt(INV_VTX) + "</span>.");
        bip();
        later(900, done);
      });
    });
  }

  function projectDomain(done) {
    if (!state.playing) return;
    setPhaseUI(7);
    setWork("<span class=\"paso\">7</span> · Dom f = <span class=\"hl\">" + fmtIntv(DOM_LO, DOM_HI) + "</span> ↓ y = x");
    setCaption("<span class=\"paso\">Paso 7:</span> todo el dominio <span class=\"hl-f\">" + fmtIntv(DOM_LO, DOM_HI) + "</span> se proyecta en <strong>vertical</strong> sobre <span class=\"hl-axis\">y = x</span> (cortina).");
    animate(900, function (e) {
      state.curtainT = e;
    }, function () {
      state.curtainT = 1;
      bip();
      later(550, done);
    });
  }

  function drawRailsAnim(done) {
    if (!state.playing) return;
    setPhaseUI(8);
    setWork("<span class=\"paso\">8</span> · rieles · Dom f⁻¹ = <span class=\"inv\">" + fmtIntv(INV_DOM_LO, INV_DOM_HI) + "</span>");
    setCaption("<span class=\"paso\">Paso 8:</span> desde esos cortes, dos rieles horizontales enmarcan la inversa. <span class=\"hl-b\">Dom f⁻¹ = " + fmtIntv(INV_DOM_LO, INV_DOM_HI) + "</span>.");
    animate(900, function (e) {
      state.railsT = e;
    }, function () {
      state.railsT = 1;
      bip();
      later(550, done);
    });
  }

  function finishInverse(done) {
    if (!state.playing) return;
    setPhaseUI(9);
    setWork("<span class=\"inv\">x = " + INV_CORE + "</span> · " + SHAPE + " de costado");
    setCaption("<span class=\"paso\">Paso 9:</span> la curva <span class=\"hl-b\">azul</span> es la relación inversa: abre a la " + OPEN_DIR + ", vértice <span class=\"hl-v\">" + fmtPt(INV_VTX) + "</span>.");
    animate(1000, function (e) {
      state.invT = e;
    }, function () {
      state.invT = 1;
      state.badge = "Inversa · " + SHAPE + " · " + fmtIntv(INV_DOM_LO, INV_DOM_HI) + " → " + fmtIntv(INV_IM_LO, INV_IM_HI);
      exprResult.innerHTML = "f⁻¹ · relación = <span class=\"hl-b\">x = " + INV_CORE + "</span>";
      setCaption("<strong class=\"ok\">Listo:</strong> <span class=\"hl-f\">" + SHAPE + "</span> y <span class=\"hl-b\">inversa</span> son espejo sobre <span class=\"hl-axis\">y = x</span>.");
      bip();
      sizeConfetti();
      if (GK.fireConfetti) {
        GK.fireConfetti(confettiCanvas);
        later(380, function () {
          if (GK.fireConfetti) GK.fireConfetti(confettiCanvas);
        });
      }
      draw();
      later(1600, done);
    });
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
    setPhaseUI(1);
    setWork("<span class=\"paso\">1</span> · <span class=\"f\">f(x) = " + F_CORE + "</span> · {" + fmtTick(DOM_LO) + " ≤ x ≤ " + fmtTick(DOM_HI) + "}");
    setCaption("<span class=\"paso\">Paso 1:</span> dibujamos la <span class=\"hl-f\">" + SHAPE + "</span> en <span class=\"hl-t\">" + fmtIntv(DOM_LO, DOM_HI) + "</span>. Después, puntos con x,y claros: <span class=\"hl-p\">pop pop pop</span>.");
    animate(900, function (e) {
      state.fT = e;
    }, function () {
      state.fT = 1;
      bip();
      later(280, function () {
        popAll(0, function () {
          setPhaseUI(2);
          setWork("<span class=\"paso\">2</span> · verticales punteadas hasta <span class=\"hl\">y = x</span>");
          setCaption("<span class=\"paso\">Paso 2:</span> de cada punto lila baja (o sube) una vertical <strong>punteada tenue</strong> hasta <span class=\"hl-axis\">y = x</span>. Ahí están los pivotes.");
          animate(700, function (e) {
            var k;
            for (k = 0; k < POINTS.length; k++) state.verts[k] = e;
          }, function () {
            var k;
            for (k = 0; k < POINTS.length; k++) state.verts[k] = 1;
            bip();
            later(700, function () {
              reflectPoint(0, function () {
                algebraSwap(function () {
                  projectDomain(function () {
                    drawRailsAnim(function () {
                      finishInverse(function () {
                        state.playing = false;
                        playBtn.disabled = false;
                        stopBtn.disabled = true;
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
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

  renderTable();
  sizeCanvas();
  draw();
  window.addEventListener("resize", function () {
    sizeCanvas();
    draw();
  });
  window[EXPORT_NAME] = {
    CFG: CFG,
    POINTS: POINTS,
    f: fOf,
    invXOfY: invXOfY,
    state: state,
    draw: draw,
    resetView: resetView
  };
  resetView();
})();
