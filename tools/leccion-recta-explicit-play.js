/*! Campus Ingeniería · L137–L139 · recta explícita a partir de dos puntos. */
(function () {
  "use strict";

  var CFG = window.__RECTA_CFG__;
  if (!CFG) throw new Error("RECTA: falta window.__RECTA_CFG__");

  var kind = CFG.kind;
  if (kind !== "explicit" && kind !== "vertical") {
    throw new Error("RECTA: kind desconocido: " + kind);
  }

  var GK = window.CampusGameKit || {};
  var BLACK = "#111111";
  var GRAPH_BG = "#f8fafc";
  var GRID = "#e2e8f0";
  var TEAL = "#0d9488";
  var GREEN = "#16a34a";
  var AMBER = "#d97706";
  var CORAL = "#e11d48";
  var RUN = "#2563eb";
  var RISE = "#15803d";
  var EMPTY = "#64748b";
  var BAD = "#dc2626";
  var BAND_H = 14;
  var PAD = { l: 52, r: 40, t: 32, b: 56 };
  var TOTAL = 4;

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
  var stepsList = document.getElementById("stepsList");
  var exprFormula = document.getElementById("exprFormula");
  var exprDomain = document.getElementById("exprDomain");
  var hintMini = document.getElementById("hintMini");
  var chipBox = document.getElementById("chipBox");
  var formulaRow = document.getElementById("formulaRow");

  var state = {
    playing: false,
    speedFactor: 1,
    timers: [],
    raf: 0,
    step: 0,
    showP1: false,
    showP2: false,
    hlP1: false,
    hlP2: false,
    showRun: false,
    showRise: false,
    showSlope: false,
    showPointSlope: false,
    showExplicit: false,
    showNoExplicit: false,
    showLine: false,
    lineDashed: false,
    lineReveal: 0,
    pointsFilled: false,
    showDomBand: false,
    bandReveal: 0,
    showVlt: false,
    vltReveal: 0,
    pulse: 0
  };

  function isVertical() { return kind === "vertical"; }

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

  function fmtNum(n) {
    if (n == null || !isFinite(n)) return "—";
    if (Object.is(n, -0) || Math.abs(n) < 1e-12) return "0";
    var half = n * 2;
    if (Math.abs(half - Math.round(half)) < 1e-9 && Math.abs(n - Math.round(n)) > 1e-9) {
      var hn = Math.round(half);
      return (hn < 0 ? "−" : "") + Math.abs(hn) + "/2";
    }
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n)).replace("-", "−");
    return String(Math.round(n * 100) / 100).replace("-", "−");
  }

  function fmtPoint(p) {
    return "(" + fmtNum(p.x) + "; " + fmtNum(p.y) + ")";
  }

  function fracHtml(num, den) {
    if (den === 0) return '<span class="bad">¿?</span>';
    if (num === 0) return "0";
    if (den < 0) { num = -num; den = -den; }
    if (den === 1) return String(num).replace("-", "−");
    var n = String(num).replace("-", "−");
    return '<span class="frac"><span class="num">' + n + '</span><span class="den">' + den + "</span></span>";
  }

  function fracText(num, den) {
    if (den === 0) return "¿?";
    if (num === 0) return "0";
    if (den < 0) { num = -num; den = -den; }
    if (den === 1) return String(num).replace("-", "−");
    return String(num).replace("-", "−") + "/" + den;
  }

  function mText() { return fracText(CFG.mNum, CFG.mDen); }

  function explicitText() {
    if (isVertical()) return "no existe";
    var m = mText();
    if (CFG.bNum === 0) return "y = (" + m + ")x";
    var sign = CFG.bNum < 0 ? " − " : " + ";
    return "y = (" + m + ")x" + sign + fracText(Math.abs(CFG.bNum), CFG.bDen);
  }

  function pointSlopeText() {
    var y1 = CFG.p1.y;
    var x1 = CFG.p1.x;
    var yLeft = "y − " + fmtNum(y1);
    var xPart;
    if (x1 === 0) xPart = "x";
    else if (x1 < 0) xPart = "(x + " + fmtNum(-x1) + ")";
    else xPart = "(x − " + fmtNum(x1) + ")";
    return yLeft + " = (" + mText() + ")" + (x1 === 0 ? "x" : xPart);
  }

  function mHtml() { return fracHtml(CFG.mNum, CFG.mDen); }

  function explicitHtml() {
    if (isVertical()) return "no existe";
    var m = fracHtml(CFG.mNum, CFG.mDen);
    if (CFG.bNum === 0) return "y = " + m + "·x";
    var bAbs = fracHtml(Math.abs(CFG.bNum), CFG.bDen);
    var sign = CFG.bNum < 0 ? " − " : " + ";
    return "y = " + m + "·x" + sign + bAbs;
  }

  function pointSlopeHtml() {
    var y1 = CFG.p1.y;
    var x1 = CFG.p1.x;
    var yLeft = "y − " + fmtNum(y1);
    var xPart;
    if (x1 === 0) xPart = "x";
    else if (x1 < 0) xPart = "(x + " + fmtNum(-x1) + ")";
    else xPart = "(x − " + fmtNum(x1) + ")";
    return yLeft + " = " + fracHtml(CFG.mNum, CFG.mDen) + xPart;
  }

  function setCaption(html) { captionEl.innerHTML = html; }

  function setWork(html) {
    if (!html) { workPanel.classList.remove("on"); workPanel.innerHTML = ""; return; }
    workPanel.classList.add("on");
    workPanel.innerHTML = html;
  }

  function bip(kindSound) {
    if (kindSound === "bad") {
      if (GK.playErrorBuzz) GK.playErrorBuzz();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "bad");
    } else {
      if (GK.playOkChime) GK.playOkChime();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    }
  }

  function setStepUI(n) {
    state.step = n;
    var items = stepsList.querySelectorAll("li");
    items.forEach(function (li) {
      var s = parseInt(li.getAttribute("data-step"), 10);
      li.classList.remove("on", "done");
      if (s < n) li.classList.add("done");
      else if (s === n) li.classList.add("on");
    });
    loopEl.innerHTML = "Fase <strong>" + (n < 1 ? "—" : n) + "</strong>/" + TOTAL;
  }

  function fillChips() {
    if (isVertical()) {
      chipBox.innerHTML =
        '<span class="chip coral">Δx = 0</span>' +
        '<span class="chip bad">m indefinida</span>' +
        '<span class="chip bad">sin y = mx+b</span>' +
        '<span class="chip amber">x = ' + fmtNum(CFG.p1.x) + "</span>";
      return;
    }
    chipBox.innerHTML =
      '<span class="chip teal">m = ' + fmtNum(CFG.mNum / CFG.mDen) + "</span>" +
      (CFG.throughOrigin
        ? '<span class="chip green">pasa por el origen</span>'
        : '<span class="chip amber">b = ' + fmtNum(CFG.bNum / CFG.bDen) + "</span>") +
      '<span class="chip green">Dom = ℝ</span>';
  }

  function fillFormulaIdle() {
    exprFormula.innerHTML =
      '<span class="hl-amber">P₁' + fmtPoint(CFG.p1) + "</span><br>" +
      '<span class="hl-coral">P₂' + fmtPoint(CFG.p2) + "</span>";
    if (isVertical()) {
      exprDomain.innerHTML = 'explícita = <span class="bad">no existe</span>';
      hintMini.textContent = "▶ Play · misma x → recta vertical · sin y = mx + b";
    } else {
      exprDomain.innerHTML = "y = <span class=\"hl-v\">…</span>";
      hintMini.textContent = "▶ Play · puntos → pendiente → explícita → gráfico";
    }
    formulaRow.classList.remove("phase-ask");
    fillChips();
  }

  function sizeCanvas() {
    var spanX = CFG.xmax - CFG.xmin;
    var spanY = CFG.ymax - CFG.ymin;
    var cell = 72;
    var w = Math.round(PAD.l + spanX * cell + PAD.r);
    var hh = Math.round(PAD.t + spanY * cell + PAD.b);
    if (w > 1100 || hh > 780) {
      cell = Math.max(40, Math.floor(Math.min((1100 - PAD.l - PAD.r) / spanX, (780 - PAD.t - PAD.b) / spanY)));
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
      x: PAD.l + ((x - CFG.xmin) / (CFG.xmax - CFG.xmin)) * w,
      y: PAD.t + ((CFG.ymax - y) / (CFG.ymax - CFG.ymin)) * hh
    };
  }

  function tickLabel(n) {
    if (Math.abs(n - 0.5) < 1e-9) return "½";
    if (Math.abs(n + 0.5) < 1e-9) return "−½";
    return fmtNum(n);
  }

  function extraTicks(axis) {
    var extra = [];
    function maybe(v) {
      if (Math.abs(v - Math.round(v)) > 1e-9) extra.push(v);
    }
    maybe(CFG.p1[axis]);
    maybe(CFG.p2[axis]);
    return extra;
  }

  function drawAxes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = GRAPH_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    var xi, yi, p0, p1;
    for (xi = Math.ceil(CFG.xmin); xi <= Math.floor(CFG.xmax); xi++) {
      p0 = worldToScreen(xi, CFG.ymin); p1 = worldToScreen(xi, CFG.ymax);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    for (yi = Math.ceil(CFG.ymin); yi <= Math.floor(CFG.ymax); yi++) {
      p0 = worldToScreen(CFG.xmin, yi); p1 = worldToScreen(CFG.xmax, yi);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }

    var ox = worldToScreen(0, 0);
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (0 >= CFG.ymin && 0 <= CFG.ymax) { ctx.moveTo(PAD.l, ox.y); ctx.lineTo(canvas.width - PAD.r, ox.y); }
    ctx.stroke();
    ctx.beginPath();
    if (0 >= CFG.xmin && 0 <= CFG.xmax) { ctx.moveTo(ox.x, PAD.t); ctx.lineTo(ox.x, canvas.height - PAD.b); }
    ctx.stroke();

    ctx.fillStyle = BLACK;
    ctx.font = "600 12px ui-monospace, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    var xt, sx;
    for (xt = Math.ceil(CFG.xmin); xt <= Math.floor(CFG.xmax); xt++) {
      if (xt === 0) continue;
      sx = worldToScreen(xt, 0);
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx.x, sx.y - 4); ctx.lineTo(sx.x, sx.y + 4); ctx.stroke();
      ctx.fillStyle = BLACK;
      ctx.fillText(tickLabel(xt), sx.x, sx.y + 8);
    }
    extraTicks("x").forEach(function (xv) {
      sx = worldToScreen(xv, 0);
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx.x, sx.y - 6); ctx.lineTo(sx.x, sx.y + 6); ctx.stroke();
      ctx.fillStyle = BLACK;
      ctx.font = "700 12px ui-monospace, Menlo, monospace";
      ctx.fillText(tickLabel(xv), sx.x, sx.y + 8);
    });

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "600 12px ui-monospace, Menlo, monospace";
    var yt, sy;
    for (yt = Math.ceil(CFG.ymin); yt <= Math.floor(CFG.ymax); yt++) {
      if (yt === 0) continue;
      sy = worldToScreen(0, yt);
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sy.x - 4, sy.y); ctx.lineTo(sy.x + 4, sy.y); ctx.stroke();
      ctx.fillStyle = BLACK;
      ctx.fillText(tickLabel(yt), sy.x - 8, sy.y);
    }
    extraTicks("y").forEach(function (yv) {
      sy = worldToScreen(0, yv);
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sy.x - 6, sy.y); ctx.lineTo(sy.x + 6, sy.y); ctx.stroke();
      ctx.fillStyle = BLACK;
      ctx.font = "700 12px ui-monospace, Menlo, monospace";
      ctx.fillText(tickLabel(yv), sy.x - 8, sy.y);
    });

    ctx.fillStyle = BLACK;
    ctx.font = "700 14px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    var oxY = (0 >= CFG.ymin && 0 <= CFG.ymax) ? ox.y : canvas.height - PAD.b;
    var oxX = (0 >= CFG.xmin && 0 <= CFG.xmax) ? ox.x : PAD.l;
    ctx.fillText("x", canvas.width - PAD.r - 16, Math.min(canvas.height - 18, oxY + 18));
    ctx.fillText("y", Math.max(10, oxX + 10), PAD.t + 16);

    if (0 >= CFG.xmin && 0 <= CFG.xmax && 0 >= CFG.ymin && 0 <= CFG.ymax) {
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.font = "600 12px ui-monospace, Menlo, monospace";
      ctx.fillText("0", ox.x - 8, ox.y + 8);
    }
  }

  function clipExplicit() {
    var m = CFG.mNum / CFG.mDen;
    var b = CFG.bNum / CFG.bDen;
    var pts = [];
    function inside(x, y) {
      return x >= CFG.xmin - 1e-9 && x <= CFG.xmax + 1e-9 && y >= CFG.ymin - 1e-9 && y <= CFG.ymax + 1e-9;
    }
    function add(x, y) {
      if (!inside(x, y)) return;
      var i;
      for (i = 0; i < pts.length; i++) {
        if (Math.abs(pts[i].x - x) < 1e-8 && Math.abs(pts[i].y - y) < 1e-8) return;
      }
      pts.push({ x: x, y: y });
    }
    add(CFG.xmin, m * CFG.xmin + b);
    add(CFG.xmax, m * CFG.xmax + b);
    if (Math.abs(m) > 1e-12) {
      add((CFG.ymin - b) / m, CFG.ymin);
      add((CFG.ymax - b) / m, CFG.ymax);
    }
    pts.sort(function (a, c) { return a.x - c.x; });
    if (pts.length < 2) return null;
    return { a: pts[0], b: pts[pts.length - 1] };
  }

  function clipVertical() {
    return { a: { x: CFG.p1.x, y: CFG.ymax }, b: { x: CFG.p1.x, y: CFG.ymin } };
  }

  function lerpPt(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function drawDomainBand() {
    if (!state.showDomBand || state.bandReveal <= 0.001 || isVertical()) return;
    var ox = worldToScreen(0, 0);
    var y = (0 >= CFG.ymin && 0 <= CFG.ymax) ? ox.y : (canvas.height - PAD.b - 8);
    var revealX = CFG.xmin + (CFG.xmax - CFG.xmin) * Math.min(1, state.bandReveal);
    var pa = worldToScreen(CFG.xmin, 0).x;
    var pb = worldToScreen(revealX, 0).x;
    if (pb <= pa + 1) return;
    ctx.save();
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = BAND_H;
    ctx.lineCap = "butt";
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    ctx.moveTo(pa, y);
    ctx.lineTo(pb, y);
    ctx.stroke();
    ctx.restore();
  }

  function drawSlopeTriangle() {
    if (!state.showRun && !state.showRise) return;
    var a = worldToScreen(CFG.p1.x, CFG.p1.y);
    var corner = worldToScreen(CFG.p2.x, CFG.p1.y);
    var b = worldToScreen(CFG.p2.x, CFG.p2.y);
    ctx.save();
    if (state.showRun) {
      ctx.strokeStyle = RUN;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(corner.x, corner.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = RUN;
      ctx.font = "700 13px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      var midRun = { x: (a.x + corner.x) / 2, y: a.y };
      var dx = CFG.p2.x - CFG.p1.x;
      if (Math.abs(dx) < 1e-9) {
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText("Δx = 0", a.x - 10, a.y - 8);
      } else {
        ctx.fillText("Δx = " + fmtNum(dx), midRun.x, midRun.y + 8);
      }
    }
    if (state.showRise) {
      ctx.strokeStyle = RISE;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(corner.x, corner.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = RISE;
      ctx.font = "700 13px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      var dy = CFG.p2.y - CFG.p1.y;
      ctx.fillText("Δy = " + fmtNum(dy), b.x + 10, (corner.y + b.y) / 2);
    }
    ctx.restore();
  }

  function drawLine() {
    if (!state.showLine || state.lineReveal <= 0.001) return;
    var seg = isVertical() ? clipVertical() : clipExplicit();
    if (!seg) return;
    var end = lerpPt(seg.a, seg.b, Math.min(1, state.lineReveal));
    var s0 = worldToScreen(seg.a.x, seg.a.y);
    var s1 = worldToScreen(end.x, end.y);
    ctx.save();
    ctx.strokeStyle = isVertical() ? CORAL : TEAL;
    ctx.lineWidth = isVertical() ? 4 : 3.4;
    ctx.lineCap = "round";
    if (state.lineDashed) ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.moveTo(s0.x, s0.y);
    ctx.lineTo(s1.x, s1.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawPoint(p, color, show, highlight, filled, labelSide) {
    if (!show) return;
    var s = worldToScreen(p.x, p.y);
    var pulse = highlight ? (7 + 3 * Math.sin(state.pulse * 0.012)) : 0;
    ctx.save();
    if (highlight) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, pulse + 6, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, filled ? 6.5 : 5.5, 0, Math.PI * 2);
    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else {
      ctx.fillStyle = GRAPH_BG;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.font = "700 12px ui-monospace, Menlo, monospace";
    ctx.textBaseline = "bottom";
    if (labelSide === "left") {
      ctx.textAlign = "right";
      ctx.fillText(fmtPoint(p), s.x - 12, s.y - 10);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(fmtPoint(p), s.x + 12, s.y - 10);
    }
    ctx.restore();
  }

  function drawVlt() {
    if (!state.showVlt || !isVertical()) return;
    var x = CFG.p1.x;
    var n = 7;
    var i, y, s, u;
    u = Math.min(1, state.vltReveal);
    ctx.save();
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.7;
    var top = worldToScreen(x, CFG.ymax);
    var bot = worldToScreen(x, CFG.ymin);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bot.x, bot.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    for (i = 0; i < n; i++) {
      if ((i + 1) / n > u + 0.001) break;
      y = CFG.ymax - (CFG.ymax - CFG.ymin) * ((i + 0.5) / n);
      s = worldToScreen(x, y);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = BAD;
      ctx.fill();
    }
    ctx.fillStyle = BAD;
    ctx.font = "800 13px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    var badge = worldToScreen(x, CFG.ymax);
    ctx.fillText("un x → infinitos y", badge.x + 12, PAD.t + 8);
    ctx.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawEqBadge() {
    if (!state.showExplicit && !state.showPointSlope && !state.showNoExplicit && !state.showSlope) return;
    var lines = [];
    if (state.showSlope && !isVertical()) {
      lines.push("m = Δy / Δx = " + mText());
    }
    if (state.showSlope && isVertical()) {
      lines.push("m = Δy / Δx = indefinida");
    }
    if (state.showPointSlope && !isVertical()) {
      lines.push(pointSlopeText());
    }
    if (state.showExplicit && !isVertical()) {
      lines.push(explicitText());
    }
    if (state.showNoExplicit) {
      lines.push("y = mx + b  →  NO");
      lines.push("explícita no existe");
      lines.push("x = " + fmtNum(CFG.p1.x));
    }
    if (!lines.length) return;
    ctx.save();
    var boxW = 248;
    var boxH = 18 + lines.length * 20;
    var x = canvas.width - PAD.r - boxW - 6;
    var y = PAD.t + 8;
    ctx.fillStyle = "rgba(15, 23, 42, 0.90)";
    ctx.strokeStyle = state.showNoExplicit ? CORAL : TEAL;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.font = "700 13px ui-monospace, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    lines.forEach(function (ln, i) {
      ctx.fillStyle = (state.showNoExplicit && i === 0) ? BAD : (i === lines.length - 1 ? "#5ad4a8" : "#e9eef7");
      if (state.showNoExplicit && i === 0) {
        ctx.fillText(ln, x + 12, y + 16 + i * 20);
        ctx.strokeStyle = BAD;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 16 + i * 20);
        ctx.lineTo(x + boxW - 14, y + 16 + i * 20);
        ctx.stroke();
      } else {
        ctx.fillText(ln, x + 12, y + 16 + i * 20);
      }
    });
    ctx.restore();
  }

  function draw() {
    drawAxes();
    drawDomainBand();
    drawSlopeTriangle();
    drawLine();
    drawVlt();
    drawPoint(CFG.p1, AMBER, state.showP1, state.hlP1, state.pointsFilled, CFG.p1.x >= 0 ? "right" : "left");
    drawPoint(CFG.p2, CORAL, state.showP2, state.hlP2, state.pointsFilled, isVertical() ? "left" : (CFG.p2.x >= 0 ? "right" : "left"));
    drawEqBadge();
  }

  function resetVisuals() {
    state.step = 0;
    state.showP1 = false;
    state.showP2 = false;
    state.hlP1 = false;
    state.hlP2 = false;
    state.showRun = false;
    state.showRise = false;
    state.showSlope = false;
    state.showPointSlope = false;
    state.showExplicit = false;
    state.showNoExplicit = false;
    state.showLine = false;
    state.lineDashed = false;
    state.lineReveal = 0;
    state.pointsFilled = false;
    state.showDomBand = false;
    state.bandReveal = 0;
    state.showVlt = false;
    state.vltReveal = 0;
    setStepUI(0);
  }

  function animateNum(key, durationMs, onDone) {
    var t0 = null;
    var dur = delay(durationMs);
    function frame(now) {
      if (!state.playing) return;
      if (t0 == null) t0 = now;
      var u = Math.min(1, (now - t0) / dur);
      var ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      state[key] = ease;
      state.pulse = now;
      draw();
      if (u < 1) state.raf = requestAnimationFrame(frame);
      else {
        state.raf = 0;
        state[key] = 1;
        draw();
        if (onDone) onDone();
      }
    }
    state.raf = requestAnimationFrame(frame);
  }

  function startPulse() {
    function tick(now) {
      if (!state.playing) return;
      state.pulse = now;
      draw();
      state.raf = requestAnimationFrame(tick);
    }
    state.raf = requestAnimationFrame(tick);
  }

  function stopPulseKeepDraw() {
    if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
    draw();
  }

  function fmtTerm(n) {
    var s = fmtNum(n);
    if (n < 0) return "(" + s + ")";
    return s;
  }

  function dyDxNarration() {
    var dy = CFG.p2.y - CFG.p1.y;
    var dx = CFG.p2.x - CFG.p1.x;
    return "m = (" + fmtNum(CFG.p2.y) + " − " + fmtTerm(CFG.p1.y) + ")/(" + fmtNum(CFG.p2.x) + " − " + fmtTerm(CFG.p1.x) + ") = (" + fmtNum(dy) + ")/(" + fmtNum(dx) + ")";
  }

  function runExplicit(onDone) {
    setStepUI(1);
    state.showP1 = true;
    state.hlP1 = true;
    startPulse();
    setWork('<span class="paso">Paso 1</span> · marcamos <span class="hl">P₁' + fmtPoint(CFG.p1) + "</span>");
    setCaption('<span class="paso">Paso 1:</span> Primero el punto <span class="hl-amber">P₁' + fmtPoint(CFG.p1) + "</span>.");
    bip("ok");

    later(1400, function () {
      if (!state.playing) return;
      state.showP2 = true;
      state.hlP2 = true;
      setWork('<span class="paso">Paso 1</span> · y <span class="hl">P₂' + fmtPoint(CFG.p2) + "</span>");
      setCaption('<span class="paso">Paso 1:</span> Ahora <span class="hl-coral">P₂' + fmtPoint(CFG.p2) + "</span>. Dos puntos determinan la recta.");
      bip("ok");
    });

    later(3000, function () {
      if (!state.playing) return;
      stopPulseKeepDraw();
      state.hlP1 = false;
      state.hlP2 = false;
      setStepUI(2);
      state.showRun = true;
      draw();
      setWork('<span class="paso">Paso 2</span> · Δx = <span class="hl">' + fmtNum(CFG.p2.x - CFG.p1.x) + "</span>");
      setCaption('<span class="paso">Paso 2:</span> Corremos en x: <span class="hl-t">Δx = x₂ − x₁ = ' + fmtNum(CFG.p2.x - CFG.p1.x) + "</span>.");
      bip("ok");
    });

    later(4400, function () {
      if (!state.playing) return;
      state.showRise = true;
      draw();
      setWork('<span class="paso">Paso 2</span> · Δy = <span class="ok">' + fmtNum(CFG.p2.y - CFG.p1.y) + "</span>");
      setCaption('<span class="paso">Paso 2:</span> Subimos en y: <span class="hl-v">Δy = y₂ − y₁ = ' + fmtNum(CFG.p2.y - CFG.p1.y) + "</span>.");
      bip("ok");
    });

    later(5800, function () {
      if (!state.playing) return;
      state.showSlope = true;
      draw();
      setWork('<span class="paso">Paso 2</span> · ' + dyDxNarration() + " = <span class=\"ok\">" + mHtml() + "</span>");
      setCaption('<span class="paso">Paso 2:</span> Pendiente <span class="hl-amber">m = (y₂−y₁)/(x₂−x₁) = ' + mHtml() + "</span>" + (CFG.throughOrigin ? " · pasa por el origen." : "."));
      bip("ok");
    });

    later(7800, function () {
      if (!state.playing) return;
      setStepUI(3);
      state.showPointSlope = true;
      draw();
      setWork('<span class="paso">Paso 3</span> · punto-pendiente: <span class="hl">' + pointSlopeHtml() + "</span>");
      setCaption('<span class="paso">Paso 3:</span> Con P₁ escribimos <span class="hl-t">y − y₁ = m(x − x₁)</span> → ' + pointSlopeHtml() + ".");
      bip("ok");
    });

    later(9800, function () {
      if (!state.playing) return;
      state.showExplicit = true;
      exprFormula.innerHTML =
        '<span class="hl-v">' + explicitHtml() + "</span><br>" +
        '<span style="color:#8b9bb4;font-size:0.82rem">' + pointSlopeHtml() + "</span>";
      exprDomain.innerHTML = 'Dom = <span class="hl-v">ℝ</span>';
      formulaRow.classList.add("phase-ask");
      fillChips();
      draw();
      setWork('<span class="paso">Paso 3</span> · explícita: <span class="ok">' + explicitHtml() + "</span>");
      setCaption('<span class="paso">Paso 3:</span> Expandimos: <span class="hl-v">' + explicitHtml() + "</span>" + (CFG.throughOrigin ? " · b = 0 porque pasa por (0; 0)." : "."));
      bip("ok");
    });

    later(11800, function () {
      if (!state.playing) return;
      setStepUI(4);
      state.showLine = true;
      state.lineDashed = false;
      setWork('<span class="paso">Paso 4</span> · dibujamos la recta completa');
      setCaption('<span class="paso">Paso 4:</span> La explícita vale para todo x · trazamos la <strong>recta entera</strong>.');
      animateNum("lineReveal", 1100, function () {
        if (!state.playing) return;
        state.pointsFilled = true;
        state.showDomBand = true;
        draw();
        setWork('<span class="paso">Paso 4</span> · puntos ● · Dom = <span class="ok">ℝ</span>');
        setCaption('<span class="paso">Paso 4:</span> Marcamos los dos puntos <span class="ok">llenos</span>. Dom = <span class="hl-v">ℝ</span>.');
        bip("ok");
        animateNum("bandReveal", 900, function () {
          if (!state.playing) return;
          later(900, function () {
            if (!state.playing) return;
            setWork("Cierre · <span class=\"ok\">" + explicitHtml() + "</span> · Dom = ℝ");
            setCaption("<strong>Cierre " + CFG.sheet + ":</strong> " + explicitHtml() + " · puntos " + fmtPoint(CFG.p1) + " y " + fmtPoint(CFG.p2) + " · Dom = <span class=\"hl-v\">ℝ</span>.");
            bip("ok");
            later(700, function () { if (onDone) onDone(); });
          });
        });
      });
    });
  }

  function runVertical(onDone) {
    setStepUI(1);
    state.showP1 = true;
    state.hlP1 = true;
    startPulse();
    setWork('<span class="paso">Paso 1</span> · <span class="hl">P₁' + fmtPoint(CFG.p1) + "</span>");
    setCaption('<span class="paso">Paso 1:</span> Marcamos <span class="hl-amber">P₁' + fmtPoint(CFG.p1) + "</span>.");
    bip("ok");

    later(1400, function () {
      if (!state.playing) return;
      state.showP2 = true;
      state.hlP2 = true;
      setWork('<span class="paso">Paso 1</span> · <span class="hl">P₂' + fmtPoint(CFG.p2) + '</span> · <span class="bad">misma x</span>');
      setCaption('<span class="paso">Paso 1:</span> <span class="hl-coral">P₂' + fmtPoint(CFG.p2) + "</span> · ¡la misma abscisa <span class=\"hl-amber\">x = " + fmtNum(CFG.p1.x) + "</span>!");
      bip("ok");
    });

    later(3200, function () {
      if (!state.playing) return;
      stopPulseKeepDraw();
      setStepUI(2);
      state.showRun = true;
      state.showRise = true;
      state.showSlope = true;
      draw();
      setWork('<span class="paso">Paso 2</span> · Δx = <span class="bad">0</span> · m = Δy/Δx <span class="bad">indefinida</span>');
      setCaption('<span class="paso">Paso 2:</span> m = (' + fmtNum(CFG.p2.y) + " − " + fmtNum(CFG.p1.y) + ")/(" + fmtNum(CFG.p2.x) + " − " + fmtNum(CFG.p1.x) + ") = " + fmtNum(CFG.p2.y - CFG.p1.y) + "/<span class=\"bad\">0</span> → <strong class=\"bad\">pendiente indefinida</strong>.");
      bip("bad");
    });

    later(5600, function () {
      if (!state.playing) return;
      setStepUI(3);
      state.showNoExplicit = true;
      exprFormula.innerHTML =
        '<span class="bad">y = mx + b  no existe</span><br>' +
        '<span class="hl-amber">x = ' + fmtNum(CFG.p1.x) + "</span>";
      exprDomain.innerHTML = 'explícita = <span class="bad">no existe</span>';
      formulaRow.classList.add("phase-ask");
      fillChips();
      draw();
      setWork('<span class="paso">Paso 3</span> · <span class="bad">explícita no existe</span>; ecuación <span class="hl">x = ' + fmtNum(CFG.p1.x) + "</span>");
      setCaption('<span class="paso">Paso 3:</span> <strong class="bad">La explícita y = mx + b no existe</strong> (no es función de x). La ecuación de la recta es <span class="hl-amber">x = ' + fmtNum(CFG.p1.x) + "</span>.");
      bip("bad");
    });

    later(8000, function () {
      if (!state.playing) return;
      setStepUI(4);
      state.showLine = true;
      state.lineDashed = true;
      setWork('<span class="paso">Paso 4</span> · recta <span class="bad">vertical</span> x = ' + fmtNum(CFG.p1.x));
      setCaption('<span class="paso">Paso 4:</span> Trazamos la vertical <span class="hl-amber">x = ' + fmtNum(CFG.p1.x) + "</span> (punteada).");
      animateNum("lineReveal", 900, function () {
        if (!state.playing) return;
        state.lineDashed = false;
        state.pointsFilled = true;
        draw();
        setCaption('<span class="paso">Paso 4:</span> Recta <strong>sólida</strong> · puntos ●. Como gráfico de relación: es esa vertical.');
        bip("ok");
        later(1400, function () {
          if (!state.playing) return;
          state.showVlt = true;
          setWork('<span class="paso">Paso 4</span> · prueba vertical: <span class="bad">no es y = f(x)</span>');
          setCaption('<span class="paso">Paso 4:</span> Como <span class="bad">función y = f(x)</span> falla la prueba de la recta vertical: un x, infinitos y.');
          bip("bad");
          animateNum("vltReveal", 1000, function () {
            if (!state.playing) return;
            exprDomain.innerHTML =
              'relación: <span class="hl-amber">x = ' + fmtNum(CFG.p1.x) + "</span><br>" +
              'función: <span class="bad">no</span>';
            setWork("Cierre · <span class=\"bad\">explícita no existe</span> · <span class=\"hl\">x = " + fmtNum(CFG.p1.x) + "</span>");
            setCaption("<strong>Cierre " + CFG.sheet + ":</strong> misma x → vertical. <span class=\"bad\">Explícita no existe</span>; ecuación <span class=\"hl-amber\">x = " + fmtNum(CFG.p1.x) + "</span>. Relación: la recta. Función y=f(x): <span class=\"bad\">no</span>.");
            later(800, function () { if (onDone) onDone(); });
          });
        });
      });
    });
  }

  function finishPlay() {
    state.playing = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    setStepUI(4);
    if (isVertical()) {
      state.showP1 = true;
      state.showP2 = true;
      state.showLine = true;
      state.lineDashed = false;
      state.lineReveal = 1;
      state.pointsFilled = true;
      state.showNoExplicit = true;
      state.showVlt = true;
      state.vltReveal = 1;
      state.showSlope = true;
      state.showRun = true;
      state.showRise = true;
    } else {
      state.showP1 = true;
      state.showP2 = true;
      state.showLine = true;
      state.lineReveal = 1;
      state.pointsFilled = true;
      state.showExplicit = true;
      state.showPointSlope = true;
      state.showSlope = true;
      state.showRun = true;
      state.showRise = true;
      state.showDomBand = true;
      state.bandReveal = 1;
    }
    draw();
  }

  function runPlay() {
    if (state.playing) return;
    if (GK.ensureAudio) GK.ensureAudio();
    clearTimers();
    resetVisuals();
    fillFormulaIdle();
    sizeCanvas();
    draw();
    state.playing = true;
    playBtn.disabled = true;
    stopBtn.disabled = false;
    setWork('<span class="paso">Hoja ' + CFG.sheet + "</span> · dos puntos → ecuación");
    setCaption("<strong>Arranque:</strong> a partir de " + fmtPoint(CFG.p1) + " y " + fmtPoint(CFG.p2) + " vamos <span class=\"paso\">paso a paso</span>.");
    bip("ok");
    later(800, function () {
      if (!state.playing) return;
      if (isVertical()) runVertical(finishPlay);
      else runExplicit(finishPlay);
    });
  }

  function resetView() {
    clearTimers();
    state.playing = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    resetVisuals();
    fillFormulaIdle();
    setWork("");
    setCaption(CFG.captionIdle || ('Presioná <strong>▶ Play</strong> · ecuación a partir de dos puntos · hoja ' + CFG.sheet + "."));
    sizeCanvas();
    draw();
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
    var on = slowBtn.getAttribute("aria-pressed") !== "true";
    slowBtn.setAttribute("aria-pressed", on ? "true" : "false");
    slowBtn.classList.toggle("on", on);
    slowBtn.textContent = on ? "Lento ✓" : "Lento";
    state.speedFactor = on ? 1.85 : 1;
  });

  resetView();
  window.addEventListener("resize", function () { sizeCanvas(); draw(); });
  window[CFG.exportName] = { CFG: CFG, state: state, draw: draw, resetView: resetView };
})();
