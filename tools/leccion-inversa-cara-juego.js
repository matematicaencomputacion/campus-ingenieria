/*! Campus Ingeniería · inversa parábola · juego (sonrisa / cara triste). */
(function () {
  "use strict";

  var GK = window.CampusGameKit || {};
  var BLACK = "#111111";
  var GRAPH_BG = "#f8fafc";
  var GRID = "#e2e8f0";
  var SMILE = "#e11d48";
  var PURPLE = "#a855f7";
  var PURPLE_GLOW = "rgba(168,85,247,0.35)";
  var HOT = "#f97316";
  var HOT_GLOW = "rgba(249,115,22,0.42)";
  var GREEN = "#16a34a";
  var GREEN_GLOW = "rgba(22,163,74,0.32)";
  var BLUE = "#2563eb";
  var AMBER = "#d97706";
  var AXIS_GLOW = "#FFBF00";
  var PAD = { l: 52, r: 48, t: 36, b: 48 };
  var XMIN = -11;
  var XMAX = 11;
  var YMIN = -16;
  var YMAX = 11;
  var DOM_LO = -9;
  var DOM_HI = -1;
  var BIG_R = 14;
  var SNAP_TOL = 0.55;
  var SHIFTS = [-2, -1, 0, 1, 2];

  var SHAPES = {
    sonrisa: {
      id: "sonrisa",
      label: "sonrisa",
      openDir: "derecha",
      baseC: 3,
      sign: 1,
      points0: [
        { x: -9, y: 7 },
        { x: -7, y: 4 },
        { x: -5, y: 3 },
        { x: -3, y: 4 },
        { x: -1, y: 7 }
      ],
      f0: function (x) { return 0.25 * (x + 5) * (x + 5) + 3; }
    },
    triste: {
      id: "triste",
      label: "cara triste",
      openDir: "izquierda",
      baseC: 5,
      sign: -1,
      points0: [
        { x: -9, y: 1 },
        { x: -7, y: 4 },
        { x: -5, y: 5 },
        { x: -3, y: 4 },
        { x: -1, y: 1 }
      ],
      f0: function (x) { return -0.25 * (x + 5) * (x + 5) + 5; }
    }
  };

  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var confettiCanvas = document.getElementById("confetti");
  var graphWrap = document.getElementById("graphWrap");
  var promptEl = document.getElementById("prompt");
  var soundMeter = document.getElementById("soundMeter");
  var pauseBtn = document.getElementById("pauseBtn");
  var restartBtn = document.getElementById("restartBtn");
  var slowBtn = document.getElementById("slowBtn");
  var pausedBanner = document.getElementById("pausedBanner");
  var victoryBanner = document.getElementById("victoryBanner");
  var victoryRestart = document.getElementById("victoryRestart");
  var victoryContinue = document.getElementById("victoryContinue");
  var scoreOk = document.getElementById("scoreOk");
  var scoreBad = document.getElementById("scoreBad");
  var scoreRound = document.getElementById("scoreRound");
  var dsmFFormula = document.getElementById("dsmFFormula");
  var dsmTableBody = document.getElementById("dsmTableBody");
  var chipBox = document.getElementById("chipBox");
  var sideHint = document.getElementById("sideHint");
  var modeTagEl = document.getElementById("modeTag");
  var ruleKicker = document.getElementById("ruleKicker");
  var ruleBody = document.getElementById("ruleBody");
  var exprResult = document.getElementById("exprResult");
  var measureHud = document.getElementById("measureHud");

  var state = {
    ok: 0,
    bad: 0,
    round: 1,
    shape: null,
    k: 0,
    points: [],
    placed: [],
    active: 0,
    hover: null,
    near: false,
    chimed: false,
    locked: false,
    paused: false,
    won: false,
    speedFactor: 1,
    timers: [],
    pulse: 0,
    raf: 0,
    lastShapeId: null
  };

  function delay(ms) {
    return ms * (state.speedFactor || 1);
  }

  function clearTimers() {
    (state.timers || []).forEach(function (id) { clearTimeout(id); });
    state.timers = [];
  }

  function later(ms, fn) {
    var id = setTimeout(fn, delay(ms));
    state.timers.push(id);
    return id;
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function fmtTick(n) {
    if (Object.is(n, -0) || Math.abs(n) < 1e-12) return "0";
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n)).replace("-", "−");
    return String(Math.round(n * 100) / 100).replace("-", "−");
  }

  function fmtPt(pt) {
    return "(" + fmtTick(pt.x) + ", " + fmtTick(pt.y) + ")";
  }

  function signedConst(n) {
    if (Math.abs(n) < 1e-12) return "";
    if (n > 0) return " + " + fmtTick(n);
    return " − " + fmtTick(-n);
  }

  function pivotOf(pt) {
    return { x: pt.x, y: pt.x };
  }

  function mirrorOf(pt) {
    return { x: pt.y, y: pt.x };
  }

  function fOf(x) {
    return state.shape.f0(x) + state.k;
  }

  function coreHTML(varName) {
    var c = state.shape.baseC + state.k;
    var quad = state.shape.sign > 0
      ? "¼(" + varName + "+5)²"
      : "−¼(" + varName + "+5)²";
    return quad + signedConst(c);
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function nearPt(a, b, tol) {
    tol = tol == null ? SNAP_TOL : tol;
    return dist(a, b) <= tol;
  }

  function sizeCanvas() {
    var spanX = XMAX - XMIN;
    var spanY = YMAX - YMIN;
    var cell = 48;
    var w = Math.round(PAD.l + spanX * cell + PAD.r);
    var hh = Math.round(PAD.t + spanY * cell + PAD.b);
    if (w > 1100 || hh > 900) {
      cell = Math.max(22, Math.floor(Math.min((1100 - PAD.l - PAD.r) / spanX, (900 - PAD.t - PAD.b) / spanY)));
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

  function screenToWorld(sx, sy) {
    var w = canvas.width - PAD.l - PAD.r;
    var hh = canvas.height - PAD.t - PAD.b;
    return {
      x: XMIN + ((sx - PAD.l) / w) * (XMAX - XMIN),
      y: YMAX - ((sy - PAD.t) / hh) * (YMAX - YMIN)
    };
  }

  function eventToCanvas(ev) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var src = (ev.touches && ev.touches[0]) ? ev.touches[0] : ev;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  }

  function syncScores() {
    scoreOk.innerHTML = "Éxitos <strong>" + state.ok + "</strong>";
    scoreBad.innerHTML = "Errores <strong>" + state.bad + "</strong>";
    scoreRound.innerHTML = "Ronda <strong>" + state.round + "</strong>";
  }

  function setPrompt(html, cls) {
    promptEl.className = "prompt" + (cls ? (" " + cls) : "");
    promptEl.innerHTML = html;
  }

  function pulseOk() {
    if (GK.playOkChime) GK.playOkChime();
    if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    graphWrap.classList.remove("flash-ok", "flash-bad");
    void graphWrap.offsetWidth;
    graphWrap.classList.add("flash-ok");
  }

  function pulseBad() {
    if (GK.playErrorBuzz) GK.playErrorBuzz();
    if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "bad");
    graphWrap.classList.remove("flash-ok", "flash-bad");
    void graphWrap.offsetWidth;
    graphWrap.classList.add("flash-bad");
  }

  function focusChime() {
    if (GK.playOkChime) GK.playOkChime();
    if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
  }

  function dealRound() {
    var ids = ["sonrisa", "triste"];
    var id = pick(ids);
    if (id === state.lastShapeId && Math.random() < 0.55) {
      id = id === "sonrisa" ? "triste" : "sonrisa";
    }
    var shape = SHAPES[id];
    if (!shape) throw new Error("INVERSA JUEGO: forma desconocida " + id);
    state.shape = shape;
    state.lastShapeId = id;
    state.k = pick(SHIFTS);
    state.points = shape.points0.map(function (p) {
      return { x: p.x, y: p.y + state.k };
    });
    state.placed = state.points.map(function () { return false; });
    state.active = 0;
    state.hover = null;
    state.near = false;
    state.chimed = false;
    state.locked = false;
    state.won = false;
  }

  function activePt() {
    if (state.active < 0 || state.active >= state.points.length) return null;
    return state.points[state.active];
  }

  function remainingCount() {
    var n = 0;
    var i;
    for (i = 0; i < state.placed.length; i++) if (!state.placed[i]) n++;
    return n;
  }

  function renderPanel() {
    var coreX = coreHTML("x");
    var coreY = coreHTML("y");
    var kChip = state.k === 0
      ? ""
      : '<span class="chip amber">corrimiento ' + (state.k > 0 ? "+" : "−") + fmtTick(Math.abs(state.k)) + "</span>";
    dsmFFormula.innerHTML =
      '<span class="hl-f">f(x) = ' + coreX + "</span><br>" +
      '<span class="dom">{−9 ≤ x ≤ −1}</span>';
    ruleKicker.textContent = "Inversa · " + state.shape.label + " · juego";
    ruleBody.innerHTML =
      '<span class="f">f(x)=' + coreX + "</span> en <span class=\"hl\">[−9, −1]</span> · " +
      'espejo <span class="ok">(y, x)</span> · relación <span class="inv">x=' + coreY + "</span>.";
    chipBox.innerHTML =
      '<span class="chip coral">' + state.shape.label + "</span>" +
      kChip +
      '<span class="chip purple">Dom [−9, −1]</span>' +
      '<span class="chip hot">activo ' + (state.active + 1) + "/5</span>" +
      '<span class="chip green">verdes ' + (5 - remainingCount()) + "/5</span>";
    if (modeTagEl) modeTagEl.textContent = state.shape.label;
    exprResult.innerHTML = "f⁻¹ · x = <span class=\"hl-b\">" + coreY + "</span>";
    renderTable();
    updateHud();
  }

  function renderTable() {
    var html = "";
    var i;
    var pt;
    var cls;
    var mir;
    for (i = 0; i < state.points.length; i++) {
      pt = state.points[i];
      cls = "";
      if (state.placed[i]) cls = "done";
      else if (state.active === i) cls = "on";
      mir = state.placed[i] ? fmtPt(mirrorOf(pt)) : "…";
      html += "<tr class=\"" + cls + "\" data-i=\"" + i + "\">";
      html += "<td>" + fmtTick(pt.x) + "</td>";
      html += "<td>" + fmtTick(pt.y) + "</td>";
      html += "<td class=\"mir\">" + mir + "</td></tr>";
    }
    dsmTableBody.innerHTML = html;
  }

  function updateHud() {
    var pt = activePt();
    if (!measureHud) return;
    if (!pt || state.won || state.paused) {
      measureHud.hidden = true;
      return;
    }
    var F = pivotOf(pt);
    var Q = mirrorOf(pt);
    var vert = Math.abs(pt.y - pt.x);
    var near = !!(state.hover && nearPt(state.hover, Q));
    measureHud.hidden = false;
    measureHud.classList.toggle("snap", near);
    measureHud.innerHTML =
      '<div class="k">↓ al y=x · |y − x| = ' + fmtTick(vert) + "</div>" +
      '<div>pivote ' + fmtPt(F) + "</div>" +
      '<div class="' + (near ? "ok" : "hot") + '">' +
      (near ? "¡L cerrada! tocá " + fmtPt(Q) : "L → " + fmtPt(Q)) +
      "</div>";
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
    for (xi = Math.ceil(XMIN); xi <= Math.floor(XMAX); xi++) {
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
    for (yi = Math.ceil(YMIN); yi <= Math.floor(YMAX); yi++) {
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
  }

  function drawYX() {
    var lo = Math.max(XMIN, YMIN);
    var hi = Math.min(XMAX, YMAX);
    var a = worldToScreen(lo, lo);
    var b = worldToScreen(hi, hi);
    drawDashed(a, b, AMBER, 2.15, [7, 6]);
    var lab = worldToScreen(6.2, 6.2);
    ctx.save();
    ctx.fillStyle = AMBER;
    ctx.font = "800 13px ui-monospace, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("y = x", lab.x + 8, lab.y + 8);
    ctx.restore();
  }

  function drawSmile() {
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
      x = DOM_LO + (DOM_HI - DOM_LO) * (i / steps);
      y = fOf(x);
      s = worldToScreen(x, y);
      if (first) {
        ctx.moveTo(s.x, s.y);
        first = false;
      } else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    var labY = fOf(DOM_HI) + (state.shape.sign > 0 ? 0.7 : -0.7);
    var lab = worldToScreen(-0.35, labY);
    ctx.fillStyle = SMILE;
    ctx.font = "800 14px ui-monospace, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("f", lab.x, lab.y);
    ctx.restore();
  }

  function drawInverse() {
    var steps = 220;
    var i;
    var t;
    var s;
    var first = true;
    ctx.save();
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 3.2;
    ctx.globalAlpha = 0.92;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (i = 0; i <= steps; i++) {
      t = DOM_LO + (DOM_HI - DOM_LO) * (i / steps);
      s = worldToScreen(fOf(t), t);
      if (first) {
        ctx.moveTo(s.x, s.y);
        first = false;
      } else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    var lab = worldToScreen(fOf(DOM_HI) + 0.35, DOM_HI + 0.45);
    ctx.fillStyle = BLUE;
    ctx.font = "800 14px ui-monospace, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("f⁻¹", lab.x, lab.y);
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

  function drawActiveHalo(pt) {
    var p = worldToScreen(pt.x, pt.y);
    var pulse = 1 + 0.08 * Math.sin(state.pulse);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, (BIG_R + 11) * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = HOT;
    ctx.lineWidth = 4;
    ctx.shadowColor = HOT_GLOW;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, BIG_R + 3, 0, Math.PI * 2);
    ctx.fillStyle = HOT;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, BIG_R - 2, 0, Math.PI * 2);
    ctx.fillStyle = PURPLE;
    ctx.fill();
    ctx.strokeStyle = "#fff7ed";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = HOT;
    ctx.font = "800 13px ui-monospace, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(fmtPt(pt), p.x + 16, p.y - 12);
    ctx.restore();
  }

  function drawPivot(F) {
    var p = worldToScreen(F.x, F.y);
    var r = 6.5 + Math.sin(state.pulse) * 0.7;
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

  function drawMeasureBracket(pt, F) {
    var a = worldToScreen(pt.x, pt.y);
    var b = worldToScreen(F.x, F.y);
    var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    var vert = Math.abs(pt.y - pt.x);
    ctx.save();
    ctx.fillStyle = "#92400e";
    ctx.font = "800 12px ui-monospace, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    var label = "|Δy| = " + fmtTick(vert);
    var tx = a.x + 10;
    if (tx > canvas.width - 90) tx = a.x - 12;
    ctx.textAlign = tx < a.x ? "right" : "left";
    ctx.fillText(label, tx, mid.y);
    ctx.restore();
  }

  function drawHoverL() {
    var pt = activePt();
    if (!pt || !state.hover || state.won || state.paused || state.locked) return;
    var F = pivotOf(pt);
    var Q = mirrorOf(pt);
    var near = nearPt(state.hover, Q);
    var a = worldToScreen(pt.x, pt.y);
    var f = worldToScreen(F.x, F.y);
    var cur = worldToScreen(state.hover.x, state.hover.y);
    var q = worldToScreen(Q.x, Q.y);
    drawDashed(a, f, AMBER, 2.4, [5, 5]);
    drawPivot(F);
    drawMeasureBracket(pt, F);
    if (near) {
      var hEnd = worldToScreen(Q.x, F.y);
      drawDashed(f, hEnd, GREEN, 2.6, [5, 5]);
      ctx.save();
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(q.x, q.y, BIG_R + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = GREEN;
      ctx.font = "800 13px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("L · " + fmtPt(Q), q.x + 16, q.y - 10);
      ctx.restore();
    } else {
      drawDashed(f, cur, "#fb923c", 2.1, [4, 5]);
      ctx.save();
      ctx.strokeStyle = "rgba(249,115,22,0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#c2410c";
      ctx.font = "700 12px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(fmtPt({ x: Math.round(state.hover.x * 10) / 10, y: Math.round(state.hover.y * 10) / 10 }), cur.x + 14, cur.y - 12);
      ctx.restore();
    }
  }

  function drawPoints() {
    var i;
    var pt;
    var q;
    for (i = 0; i < state.points.length; i++) {
      pt = state.points[i];
      if (state.placed[i]) {
        q = mirrorOf(pt);
        drawDashed(worldToScreen(pt.x, pt.y), worldToScreen(pt.x, pt.x), "rgba(217,119,6,0.45)", 1.4, [4, 5]);
        drawDashed(worldToScreen(pt.x, pt.x), worldToScreen(q.x, q.y), "rgba(22,163,74,0.45)", 1.4, [4, 5]);
        drawDot(pt.x, pt.y, PURPLE, PURPLE_GLOW, 0.82);
        drawDot(q.x, q.y, GREEN, GREEN_GLOW, 1);
      } else if (i !== state.active) {
        drawDot(pt.x, pt.y, PURPLE, "rgba(168,85,247,0.18)", 0.78);
      }
    }
    pt = activePt();
    if (pt && !state.placed[state.active]) drawActiveHalo(pt);
  }

  function draw() {
    drawAxes();
    drawYX();
    drawSmile();
    if (state.won) drawInverse();
    drawPoints();
    drawHoverL();
    updateHud();
  }

  function askPrompt() {
    var pt = activePt();
    if (!pt) return;
    var Q = mirrorOf(pt);
    setPrompt(
      "Punto <span class=\"hl-hot\">" + (state.active + 1) + "/5</span> · " +
      "<span class=\"hl-p\">" + fmtPt(pt) + "</span> → colocá el verde " +
      "<span class=\"hl-g\">(y, x)</span> formando la L sobre <span class=\"hl-axis\">y = x</span>.",
      "attention"
    );
    sideHint.textContent = "Vertical hasta " + fmtPt(pivotOf(pt)) + " · L hacia " + fmtPt(Q) + " · bip×3 al cerrar.";
  }

  function showVictory() {
    state.won = true;
    state.locked = true;
    state.hover = null;
    var subEl = victoryBanner.querySelector(".sub-v");
    var kTxt = state.k === 0 ? "sin corrimiento" : ("corrimiento " + (state.k > 0 ? "+" : "−") + fmtTick(Math.abs(state.k)));
    if (subEl) subEl.textContent = "5 puntos · " + state.shape.label + " · " + kTxt;
    victoryBanner.classList.add("on");
    if (GK.fireConfetti) {
      GK.fireConfetti(confettiCanvas);
      later(400, function () { if (GK.fireConfetti) GK.fireConfetti(confettiCanvas); });
    }
    if (GK.playExplosion) GK.playExplosion();
    else if (GK.playOkChime) GK.playOkChime();
    setPrompt("¡Ganador! 5 verdes. <strong>Seguir jugando</strong> o <strong>Reiniciar</strong>.", "ok");
    draw();
  }

  function placeCorrect() {
    var pt = activePt();
    if (!pt) return;
    state.placed[state.active] = true;
    state.ok++;
    state.hover = null;
    state.near = false;
    state.chimed = false;
    syncScores();
    pulseOk();
    renderPanel();
    var Q = mirrorOf(pt);
    setPrompt("¡Bien! " + fmtPt(pt) + " → <span class=\"hl-g\">" + fmtPt(Q) + "</span>.", "ok");
    draw();
    if (remainingCount() === 0) {
      later(500, showVictory);
      return;
    }
    state.locked = true;
    later(state.speedFactor > 1 ? 900 : 420, function () {
      var i;
      for (i = 0; i < state.placed.length; i++) {
        if (!state.placed[i]) {
          state.active = i;
          break;
        }
      }
      state.locked = false;
      renderPanel();
      askPrompt();
      draw();
    });
  }

  function placeWrong() {
    state.bad++;
    syncScores();
    pulseBad();
    setPrompt("Ahí no. Bajá en vertical al <span class=\"hl-axis\">y = x</span> y cerrá la L en <span class=\"hl-g\">(y, x)</span>.", "bad");
    later(280, function () { askPrompt(); });
  }

  function onMove(ev) {
    if (state.paused || state.locked || state.won) return;
    var w = screenToWorld(eventToCanvas(ev).x, eventToCanvas(ev).y);
    state.hover = w;
    var pt = activePt();
    if (!pt) return;
    var Q = mirrorOf(pt);
    var near = nearPt(w, Q);
    if (near && !state.chimed) {
      state.chimed = true;
      focusChime();
    }
    if (!near) state.chimed = false;
    state.near = near;
    draw();
  }

  function onLeave() {
    state.hover = null;
    state.near = false;
    state.chimed = false;
    if (!state.won && !state.paused) draw();
  }

  function onClick(ev) {
    if (state.paused || state.locked || state.won) return;
    if (ev && ev.preventDefault) ev.preventDefault();
    if (GK.ensureAudio) GK.ensureAudio();
    var w = screenToWorld(eventToCanvas(ev).x, eventToCanvas(ev).y);
    var pt = activePt();
    if (!pt) return;
    var Q = mirrorOf(pt);
    if (nearPt(w, Q)) placeCorrect();
    else placeWrong();
  }

  function togglePause() {
    if (state.won) return;
    state.paused = !state.paused;
    pausedBanner.classList.toggle("on", state.paused);
    pauseBtn.textContent = state.paused ? "Continuar" : "Pausar";
    pauseBtn.classList.toggle("pause-on", state.paused);
    if (state.paused) setPrompt("Pausa · tocá <strong>Continuar</strong> para seguir.", "");
    else askPrompt();
    draw();
  }

  function toggleSlow() {
    if (state.speedFactor === 1) {
      state.speedFactor = 2;
      slowBtn.classList.add("on");
      slowBtn.setAttribute("aria-pressed", "true");
    } else {
      state.speedFactor = 1;
      slowBtn.classList.remove("on");
      slowBtn.setAttribute("aria-pressed", "false");
    }
  }

  function startRound(keepScores) {
    clearTimers();
    dealRound();
    if (!keepScores) {
      state.ok = 0;
      state.bad = 0;
      state.round = 1;
    }
    state.paused = false;
    pauseBtn.textContent = "Pausar";
    pauseBtn.classList.remove("pause-on");
    pausedBanner.classList.remove("on");
    victoryBanner.classList.remove("on");
    syncScores();
    renderPanel();
    askPrompt();
    draw();
  }

  function keepPlaying() {
    state.round++;
    startRound(true);
  }

  function restart() {
    startRound(false);
  }

  function tick() {
    state.pulse += 0.09;
    if (!state.paused) draw();
    state.raf = requestAnimationFrame(tick);
  }

  sizeCanvas();
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onClick);
  canvas.addEventListener("pointerleave", onLeave);
  pauseBtn.addEventListener("click", togglePause);
  restartBtn.addEventListener("click", restart);
  if (victoryRestart) victoryRestart.addEventListener("click", restart);
  if (victoryContinue) victoryContinue.addEventListener("click", keepPlaying);
  slowBtn.addEventListener("click", toggleSlow);
  slowBtn.setAttribute("aria-pressed", "false");
  window.addEventListener("resize", function () {
    sizeConfetti();
    draw();
  });

  window.__L183 = {
    CFG: SHAPES,
    state: state,
    f: fOf,
    draw: draw,
    restart: restart,
    dealRound: dealRound,
    startRound: startRound
  };

  startRound(false);
  tick();
})();
