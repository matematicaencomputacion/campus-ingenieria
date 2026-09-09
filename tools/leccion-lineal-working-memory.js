/*! Campus Ingeniería · L200 · lineal working memory (tabla automática → graficar → forma fácil). */
(function () {
  "use strict";

  var GK = window.CampusGameKit || {};
  var PURPLE = "#a78bfa";
  var PURPLE_GLOW = "rgba(167,139,250,0.38)";
  var HOT = "#f97316";
  var LINE = "#ff6b6b";
  var XRED = "#ff5c5c";
  var MUTED = "#8b9bb4";
  var OK = "#5ad4a8";
  var RUN = "#60a5fa";
  var RISE = "#34d399";
  var PAD = { l: 48, r: 36, t: 28, b: 42 };
  var viewPad = { l: PAD.l, r: PAD.r, t: PAD.t, b: PAD.b };
  var VIEW = 12;
  var XMIN = -VIEW;
  var XMAX = VIEW;
  var YMIN = -VIEW;
  var YMAX = VIEW;
  var XS = [-4, -2, 0, 2, 4];
  var B_OPTS = [-3, -2, -1, 0, 1, 2, 3];
  var M_OPTS = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
  var SNAP_IN = 0.55;
  var SNAP_OUT = 0.95;
  var BIG_R = 14;
  var EASY_PAD = 1.5;
  var EASY_ZOOM = 1.5;

  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var confettiCanvas = document.getElementById("confetti");
  var graphWrap = document.getElementById("graphWrap");
  var promptEl = document.getElementById("prompt");
  var fnBox = document.getElementById("fnBox");
  var soundMeter = document.getElementById("soundMeter");
  var resetBtn = document.getElementById("resetBtn");
  var slowBtn = document.getElementById("slowBtn");
  var scoreOk = document.getElementById("scoreOk");
  var scoreBad = document.getElementById("scoreBad");
  var scoreRound = document.getElementById("scoreRound");
  var tbody = document.getElementById("tbody");
  var bChips = document.getElementById("bChips");
  var mChips = document.getElementById("mChips");
  var pickBBox = document.getElementById("pickBBox");
  var pickMBox = document.getElementById("pickMBox");
  var pickBKicker = document.getElementById("pickBKicker");
  var pickMKicker = document.getElementById("pickMKicker");
  var dockHint = document.getElementById("dockHint");
  var tableWrap = document.getElementById("tableWrap");
  var winBanner = document.getElementById("winBanner");
  var victoryBanner = document.getElementById("victoryBanner");
  var badgeCartel = document.getElementById("badgeCartel");
  var pausedBanner = document.getElementById("pausedBanner");
  var victoryContinue = document.getElementById("victoryContinue");
  var victoryRestart = document.getElementById("victoryRestart");
  var victoryTitle = document.getElementById("victoryTitle");
  var victorySub = document.getElementById("victorySub");
  var winRestartBtn = document.getElementById("winRestartBtn");
  var winBannerText = document.getElementById("winBannerText");
  var easyBanner = document.getElementById("easyBanner");
  var stepCartel = document.getElementById("stepCartel");
  var easyBox = document.getElementById("easyBox");
  var easyKicker = document.getElementById("easyKicker");
  var easyCopy = document.getElementById("easyCopy");
  var ghostEl = document.getElementById("l200DragGhost");
  var dragListen = false;

  var timers = [];
  var state = {
    phase: "pick-b",
    m: null,
    b: null,
    rows: [],
    active: 0,
    hover: null,
    drag: null,
    dragPx: null,
    dragClient: null,
    near: false,
    chimed: false,
    chimeGen: 0,
    pipedFor: -1,
    pulse: 0,
    raf: 0,
    ok: 0,
    bad: 0,
    round: 1,
    speedFactor: 1,
    paused: false,
    won: false,
    locked: false,
    easyStarted: false,
    easyP1: false,
    easyP2: false,
    vh: null,
    lineAngle: 0,
    linePt: null,
    linePivot: null,
    hLearned: false,
    vLearned: false,
    hFlash: null,
    vFlash: null,
    bothFlash: null,
    bothNear: false
  };

  function later(ms, fn) {
    var id = setTimeout(fn, ms * (state.phase === "fill" ? 1 : (state.speedFactor || 1)));
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers = [];
  }

  var audioArmed = false;
  function armAudio() {
    audioArmed = true;
    if (GK.ensureAudio) return GK.ensureAudio();
    return null;
  }

  function fmtNum(n) {
    if (n == null || Number.isNaN(n)) return "—";
    if (Object.is(n, -0)) n = 0;
    var s = Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
    return s.replace("-", "−");
  }

  function signedNum(n) {
    if (n >= 0) return "+ " + fmtNum(n);
    return "− " + fmtNum(Math.abs(n));
  }

  function parseNum(raw) {
    if (raw == null) return NaN;
    var s = String(raw).trim().replace("−", "-").replace(",", ".").replace(/\s+/g, "");
    if (!s) return NaN;
    if (s.indexOf("/") >= 0) {
      var parts = s.split("/");
      if (parts.length !== 2) return NaN;
      var a = Number(parts[0]);
      var den = Number(parts[1]);
      if (!isFinite(a) || !isFinite(den) || den === 0) return NaN;
      return a / den;
    }
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  function almost(a, b) {
    return Math.abs(a - b) < 1e-6;
  }

  function gcdInt(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      var t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }

  function slopeToVH(m) {
    if (m == null || !isFinite(m) || Math.abs(m) < 1e-9) return { v: 0, h: 2 };
    var h;
    var v;
    for (h = 1; h <= 8; h++) {
      v = m * h;
      var vr = Math.round(v);
      if (Math.abs(v - vr) < 1e-6) {
        var g = gcdInt(vr, h);
        return { v: vr / g, h: h / g };
      }
    }
    var best = { v: 1, h: 1, err: Infinity };
    for (h = 1; h <= 6; h++) {
      v = Math.round(m * h);
      if (v === 0) continue;
      var err = Math.abs(m - v / h);
      if (err < best.err) best = { v: v, h: h, err: err };
    }
    var g2 = gcdInt(best.v, best.h);
    return { v: best.v / g2, h: best.h / g2 };
  }

  function easyP1() {
    return { x: 0, y: state.b };
  }

  function easyP2() {
    var vh = state.vh || slopeToVH(state.m);
    return { x: vh.h, y: state.b + vh.v };
  }

  function isEasyPhase() {
    switch (state.phase) {
      case "easy-intro":
      case "easy-b":
      case "easy-m":
      case "easy-line":
      case "easy-win":
        return true;
      default:
        return false;
    }
  }

  function isTokenPhase() {
    return state.phase === "place" || state.phase === "easy-b" || state.phase === "easy-m";
  }

  function nowMs() {
    return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  }

  function startFlash(times) {
    return { start: nowMs(), times: times, period: 280 };
  }

  function flashAlpha(flash, idle) {
    if (!flash || flash.start == null) return idle;
    var elapsed = nowMs() - flash.start;
    var total = flash.period * flash.times;
    if (elapsed >= total) return idle;
    var t = (elapsed % flash.period) / flash.period;
    return t < 0.45 ? 1 : 0.12;
  }

  function flashActive(flash) {
    if (!flash || flash.start == null) return false;
    return (nowMs() - flash.start) < (flash.period * flash.times);
  }

  function f(x) {
    return state.m * x + state.b;
  }

  function latexFx() {
    if (state.m == null || state.b == null) return "f(x) = ?";
    var m = state.m;
    var b = state.b;
    var left;
    if (m === 0) left = "";
    else if (m === 1) left = "x";
    else if (m === -1) left = "−x";
    else left = fmtNum(m) + "x";
    if (m === 0) return "f(x) = " + fmtNum(b);
    if (b === 0) return "f(x) = " + left;
    return "f(x) = " + left + " " + signedNum(b);
  }

  function workHTML(x) {
    var m = state.m;
    var b = state.b;
    var xs = x < 0 ? "(" + fmtNum(x) + ")" : fmtNum(x);
    var mPart = '<span class="muted">' + fmtNum(m) + "</span>";
    var xPart = '<span class="x-red">' + xs + "</span>";
    var bPart = '<span class="muted"> ' + signedNum(b) + "</span>";
    return mPart + " · " + xPart + bPart;
  }

  function phaseLabel() {
    switch (state.phase) {
      case "pick-b": return "b";
      case "pick-m": return "m";
      case "ready": return "preparada";
      case "fill": return "tabla";
      case "place": return "gráfica";
      case "win": return "listo";
      case "easy-intro": return "forma fácil";
      case "easy-b": return "eje Y";
      case "easy-m": return "v/h";
      case "easy-line": return "recta";
      case "easy-win": return "listo";
      default: {
        var _ex = state.phase;
        void _ex;
        return "—";
      }
    }
  }

  function syncScores() {
    if (scoreOk) scoreOk.innerHTML = "Aciertos <strong>" + state.ok + "</strong>";
    if (scoreBad) scoreBad.innerHTML = "Errores <strong>" + state.bad + "</strong>";
    if (scoreRound) scoreRound.innerHTML = state.phase === "fill" ? "Completá <strong>f(x)</strong>" : "Fase <strong>" + phaseLabel() + "</strong>";
  }

  function setPrompt(html, cls) {
    promptEl.className = "prompt" + (cls ? (" " + cls) : "");
    promptEl.innerHTML = html;
    syncDragCursor();
  }

  function flashOk() {
    graphWrap.classList.remove("flash-ok", "flash-bad");
    void graphWrap.offsetWidth;
    graphWrap.classList.add("flash-ok");
  }

  function pulseOk() {
    if (GK.playOkChime) GK.playOkChime();
    if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    flashOk();
  }

  function pulseBad() {
    if (GK.playErrorBuzz) GK.playErrorBuzz();
    if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "bad");
    graphWrap.classList.remove("flash-ok", "flash-bad");
    void graphWrap.offsetWidth;
    graphWrap.classList.add("flash-bad");
  }

  function smallConfetti() {
    if (GK.fireConfetti) GK.fireConfetti(confettiCanvas);
  }

  function burstConfetti() {
    if (!GK.fireConfetti) return;
    GK.fireConfetti(confettiCanvas);
    later(400, function () { if (GK.fireConfetti) GK.fireConfetti(confettiCanvas); });
    later(800, function () { if (GK.fireConfetti) GK.fireConfetti(confettiCanvas); });
  }

  function focusChime() {
    var gen = state.chimeGen;
    function ping() {
      if (gen !== state.chimeGen) return;
      if (!state.near || state.paused || state.locked) return;
      if (state.won && state.phase !== "easy-line") return;
      if (GK.playOkChime) GK.playOkChime();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    }
    var ac = armAudio();
    if (ac && ac.state === "suspended" && ac.resume) {
      ac.resume().then(ping).catch(ping);
      return;
    }
    ping();
  }

  function rearmChime() {
    state.chimeGen += 1;
    state.chimed = false;
    state.near = false;
  }

  function pipReadyInput(input) {
    if (!input) return;
    input.classList.remove("pip");
    void input.offsetWidth;
    input.classList.add("pip");
    if (audioArmed && GK.playOkChime) GK.playOkChime();
    if (audioArmed && GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    later(1200, function () { input.classList.remove("pip"); });
  }

  function worldToScreen(x, y) {
    var w = canvas.width - viewPad.l - viewPad.r;
    var h = canvas.height - viewPad.t - viewPad.b;
    var sx = viewPad.l + ((x - XMIN) / (XMAX - XMIN)) * w;
    var sy = viewPad.t + ((YMAX - y) / (YMAX - YMIN)) * h;
    return { x: sx, y: sy };
  }

  function screenToWorld(px, py) {
    var w = canvas.width - viewPad.l - viewPad.r;
    var h = canvas.height - viewPad.t - viewPad.b;
    var x = XMIN + ((px - viewPad.l) / w) * (XMAX - XMIN);
    var y = YMAX - ((py - viewPad.t) / h) * (YMAX - YMIN);
    return { x: x, y: y };
  }

  function pointerClient(ev) {
    var src = ev;
    if (ev.touches && ev.touches[0]) src = ev.touches[0];
    else if (ev.changedTouches && ev.changedTouches[0]) src = ev.changedTouches[0];
    return { x: src.clientX, y: src.clientY };
  }

  function eventToCanvas(ev) {
    var rect = canvas.getBoundingClientRect();
    var dw = rect.width || 1;
    var dh = rect.height || 1;
    var scaleX = canvas.width / dw;
    var scaleY = canvas.height / dh;
    var p = pointerClient(ev);
    return {
      x: (p.x - rect.left) * scaleX,
      y: (p.y - rect.top) * scaleY
    };
  }

  function syncGhostOverlay() {
    if (!ghostEl) return;
    if (!state.drag || !state.dragClient || state.phase === "easy-line") {
      ghostEl.hidden = true;
      return;
    }
    var rect = canvas.getBoundingClientRect();
    var scale = (rect.width && canvas.width) ? (rect.width / canvas.width) : 1;
    var cssR = BIG_R * scale;
    ghostEl.hidden = false;
    ghostEl.style.width = (cssR * 2) + "px";
    ghostEl.style.height = (cssR * 2) + "px";
    ghostEl.style.left = state.dragClient.x + "px";
    ghostEl.style.top = state.dragClient.y + "px";
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function inSnapZone(w, Q) {
    if (!w || !Q) return false;
    var d = dist(w, Q);
    if (state.near) return d <= SNAP_OUT;
    return d <= SNAP_IN;
  }

  function sizeConfetti() {
    if (!confettiCanvas || !graphWrap) return;
    confettiCanvas.width = graphWrap.clientWidth || canvas.width;
    confettiCanvas.height = graphWrap.clientHeight || canvas.height;
  }

  function easyFocusBounds() {
    var p1 = easyP1();
    var p2 = easyP2();
    var xs = [0, p1.x, p2.x];
    var ys = [0, p1.y, p2.y];
    return {
      xmin: Math.min.apply(null, xs) - EASY_PAD,
      xmax: Math.max.apply(null, xs) + EASY_PAD,
      ymin: Math.min.apply(null, ys) - EASY_PAD,
      ymax: Math.max.apply(null, ys) + EASY_PAD
    };
  }

  function applyIsotropicView(bounds, plotW, plotH) {
    var needW = Math.max(bounds.xmax - bounds.xmin, 1);
    var needH = Math.max(bounds.ymax - bounds.ymin, 1);
    var span = Math.max(needW, needH);
    var s = Math.min(plotW, plotH) / span;
    if (!(s > 0) || !isFinite(s)) s = 1;
    var used = span * s;
    var extraX = Math.max(0, plotW - used);
    var extraY = Math.max(0, plotH - used);
    viewPad.l = PAD.l + extraX / 2;
    viewPad.r = PAD.r + extraX / 2;
    viewPad.t = PAD.t + extraY / 2;
    viewPad.b = PAD.b + extraY / 2;
    var cx = (bounds.xmin + bounds.xmax) / 2;
    var cy = (bounds.ymin + bounds.ymax) / 2;
    XMIN = cx - span / 2;
    XMAX = cx + span / 2;
    YMIN = cy - span / 2;
    YMAX = cy + span / 2;
  }

  function sizeCanvas() {
    var wrapW = graphWrap.clientWidth || 900;
    var normalH = Math.max(420, Math.min(720, wrapW * 0.74));
    var cssH = normalH;
    var easy = isEasyPhase();
    graphWrap.classList.toggle("easy-focused", easy);
    XMIN = YMIN = -VIEW;
    XMAX = YMAX = VIEW;
    viewPad.l = PAD.l;
    viewPad.r = PAD.r;
    viewPad.t = PAD.t;
    viewPad.b = PAD.b;
    // Use CSS pixels in easy mode so the mobile tokens retain their hit area.
    var canvasW = easy ? Math.round(wrapW) : Math.max(640, Math.round(wrapW));
    if (easy) {
      // Stable isotropic camera: origin, P1, P2 and the h/v travel, square units.
      var bounds = easyFocusBounds();
      var plotW = Math.max(1, canvasW - PAD.l - PAD.r);
      var normalPlotH = Math.max(1, normalH - PAD.t - PAD.b);
      var originalUnit = Math.min(plotW, normalPlotH) / (2 * VIEW);
      var needW = Math.max(bounds.xmax - bounds.xmin, 1);
      var needH = Math.max(bounds.ymax - bounds.ymin, 1);
      var span = Math.max(needW, needH);
      var targetUnit = originalUnit * EASY_ZOOM;
      var floorH = Math.max(wrapW < 600 ? 240 : 140, normalH / 3);
      cssH = Math.max(floorH, Math.round(span * targetUnit + PAD.t + PAD.b));
      cssH = Math.min(cssH, normalH);
      applyIsotropicView(bounds, plotW, Math.max(1, cssH - PAD.t - PAD.b));
    }
    canvas.width = canvasW;
    canvas.height = Math.round(cssH);
    sizeConfetti();
  }

  function makeRows() {
    return XS.map(function (x) {
      return {
        x: x,
        y: f(x),
        typed: "",
        fillOk: false,
        fillBad: false,
        placed: false
      };
    });
  }

  function currentRow() {
    if (state.active < 0 || state.active >= state.rows.length) return null;
    return state.rows[state.active];
  }

  function allFilled() {
    return state.rows.length > 0 && state.rows.every(function (r) { return r.fillOk; });
  }

  function allPlaced() {
    return state.rows.length > 0 && state.rows.every(function (r) { return r.placed; });
  }

  function bumpGo(el, on) {
    if (!el) return;
    el.classList.remove("go");
    if (!on) return;
    void el.offsetWidth;
    el.classList.add("go");
  }

  function fracHTML(num, den) {
    return '<span class="frac" title="v/h"><span class="num">' + num +
      '</span><span class="den">' + den + "</span></span>";
  }

  function mEqHTML(vh) {
    var num = vh ? fmtNum(vh.v) : "v";
    var den = vh ? fmtNum(vh.h) : "h";
    return '<span class="m-eq">m = ' + fracHTML(num, den) + "</span>";
  }

  function dirCopy(vh) {
    if (!vh) return "hacia la derecha";
    var bits = [];
    if (vh.h > 0) bits.push("hacia la derecha");
    else if (vh.h < 0) bits.push("hacia la izquierda");
    if (vh.v > 0) bits.push("hacia arriba");
    else if (vh.v < 0) bits.push("hacia abajo");
    if (!bits.length) return "sobre el eje";
    if (bits.length === 1) return bits[0];
    return bits[0] + " y " + bits[1];
  }

  function renderEasyPanel() {
    if (!easyBox || !easyCopy) return;
    if (!isEasyPhase()) {
      easyCopy.innerHTML = "";
      return;
    }
    var vh = state.vh || (state.m != null ? slopeToVH(state.m) : null);
    var p1 = state.b != null ? easyP1() : null;
    var p2 = vh && state.b != null ? easyP2() : null;
    var html = "";
    if (p1) {
      html += "P1 = (0, " + fmtNum(p1.y) + ")";
    }
    if (vh) {
      html += (html ? "<br>" : "") + mEqHTML(vh);
    }
    if (p2) {
      html += "<br>P2 = (" + fmtNum(p2.x) + ", " + fmtNum(p2.y) + ")";
    }
    easyCopy.innerHTML = html;
    if (easyKicker) easyKicker.textContent = "forma fácil";
  }

  function setEasyBanner(on) {
    if (!easyBanner) return;
    easyBanner.hidden = !on;
  }

  function setStepCartel(html, on) {
    if (!stepCartel) return;
    if (html) stepCartel.innerHTML = html;
    stepCartel.classList.toggle("on", !!on);
    stepCartel.hidden = !on;
  }

  function renderChips() {
    var pickingB = state.phase === "pick-b";
    var pickingM = state.phase === "pick-m";
    var easyOn = isEasyPhase();
    var boardOn = state.phase === "fill" || state.phase === "place" || state.phase === "win";
    bChips.innerHTML = "";
    B_OPTS.forEach(function (v) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (state.b === v ? " b-on on" : "");
      btn.textContent = fmtNum(v);
      btn.setAttribute("aria-label", "b = " + fmtNum(v));
      btn.disabled = !pickingB;
      btn.addEventListener("click", function () { chooseB(v); });
      bChips.appendChild(btn);
    });
    mChips.innerHTML = "";
    M_OPTS.forEach(function (v) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (state.m === v ? " m-on on" : "");
      btn.textContent = fmtNum(v);
      btn.setAttribute("aria-label", "m = " + fmtNum(v));
      btn.disabled = !pickingM;
      btn.addEventListener("click", function () { chooseM(v); });
      mChips.appendChild(btn);
    });
    pickBBox.classList.toggle("off", !pickingB && !pickingM && !easyOn);
    pickBBox.classList.toggle("compact", pickingM || easyOn);
    pickBBox.classList.toggle("done", state.b != null);
    pickMBox.classList.toggle("off", !pickingM && !easyOn);
    pickMBox.classList.toggle("compact", easyOn);
    pickMBox.classList.toggle("done", state.m != null);
    bumpGo(pickBBox, pickingB);
    bumpGo(pickMBox, pickingM);
    if (tableWrap) tableWrap.classList.toggle("off", !boardOn);
    if (easyBox) easyBox.classList.toggle("off", !easyOn);
    pickBKicker.textContent = (pickingM || easyOn) && state.b != null ? "b = " + fmtNum(state.b) : "b";
    if (easyOn && state.m != null) {
      pickMKicker.innerHTML = mEqHTML(state.vh || slopeToVH(state.m));
    } else {
      pickMKicker.textContent = "m";
    }
    renderEasyPanel();
  }

  function renderTable() {
    tbody.innerHTML = "";
    var showWork = state.phase === "fill" || state.phase === "place" || state.phase === "win";
    var rows = state.rows.length ? state.rows : XS.map(function (x) {
      return { x: x, y: null, typed: "", fillOk: false, fillBad: false, placed: false };
    });
    rows.forEach(function (row, i) {
      var tr = document.createElement("tr");
      var isFill = state.phase === "fill" && i === state.active && !row.fillOk;
      var isPlace = state.phase === "place" && i === state.active && row.fillOk && !row.placed;
      if (isFill) tr.classList.add("lit");
      if (isPlace) tr.classList.add("ready-place");

      var tdX = document.createElement("td");
      tdX.className = "x";
      tdX.textContent = showWork ? fmtNum(row.x) : "·";
      tr.appendChild(tdX);

      var tdW = document.createElement("td");
      tdW.className = "work";
      if (showWork && row.y != null && (row.fillOk || isFill || state.phase === "place" || state.phase === "win")) {
        tdW.innerHTML = workHTML(row.x);
      } else {
        tdW.textContent = "—";
      }
      tr.appendChild(tdW);

      var tdFx = document.createElement("td");
      var input = document.createElement("input");
      input.type = "text";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.className = "fx-input";
      input.setAttribute("aria-label", "f de " + fmtNum(row.x));
      input.dataset.i = String(i);
      if (row.fillOk && row.y != null) {
        input.value = fmtNum(row.y).replace("−", "-");
        input.classList.add("ok");
        input.disabled = true;
      } else if (row.typed) {
        input.value = row.typed;
        if (row.fillBad) input.classList.add("bad");
      }
      input.disabled = input.disabled || !isFill || state.paused || state.locked;
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          submitFill(i, input.value);
        }
      });
      input.addEventListener("input", function () {
        row.typed = input.value;
        row.fillBad = false;
        input.classList.remove("bad");
      });
      tdFx.appendChild(input);
      tr.appendChild(tdFx);

      var tdM = document.createElement("td");
      if (row.fillOk) {
        var markOk = document.createElement("span");
        markOk.className = "mark ok";
        markOk.textContent = "✓";
        tdM.appendChild(markOk);
      } else if (row.fillBad) {
        var markBad = document.createElement("span");
        markBad.className = "mark bad";
        markBad.textContent = "✗";
        tdM.appendChild(markBad);
        if (isFill) {
          var retry = document.createElement("button");
          retry.type = "button";
          retry.className = "chip";
          retry.textContent = "OK";
          retry.setAttribute("aria-label", "Reintentar f(x)");
          retry.addEventListener("click", function () { submitFill(i, input.value); });
          tdM.appendChild(retry);
        }
      } else if (isFill) {
        var go = document.createElement("button");
        go.type = "button";
        go.className = "chip";
        go.textContent = "OK";
        go.setAttribute("aria-label", "Comprobar f(x)");
        go.addEventListener("click", function () { submitFill(i, input.value); });
        tdM.appendChild(go);
      } else {
        var mark = document.createElement("span");
        mark.className = "mark empty";
        mark.textContent = "·";
        tdM.appendChild(mark);
      }
      tr.appendChild(tdM);

      tbody.appendChild(tr);
      if (isFill) {
        later(30, function () {
          input.focus();
          if (state.pipedFor !== i) {
            state.pipedFor = i;
            pipReadyInput(input);
          }
        });
      }
    });
  }

  function syncDragCursor() {
    var canDrag = isTokenPhase() && !state.won && !state.paused && !state.locked;
    if (state.phase === "easy-line" && !state.won && !state.paused && !state.locked) canDrag = true;
    if (promptEl) promptEl.classList.toggle("can-drag", canDrag);
    if (dockHint) dockHint.classList.toggle("can-drag", canDrag);
    if (canvas) canvas.style.cursor = state.phase === "easy-line" && canDrag ? "grab" : "";
  }

  function updateHud() {
    fnBox.innerHTML = latexFx();
    slowBtn.hidden = state.phase === "fill" || state.phase === "ready" || state.phase === "pick-b" || state.phase === "pick-m";
    if (state.phase === "fill") {
      dockHint.textContent = "Escribí f(x) · Enter";
    } else if (state.phase === "place") {
      dockHint.innerHTML = '<span class="dot"></span>Arrastrá';
    } else if (state.phase === "easy-b") {
      dockHint.innerHTML = '<span class="dot"></span>Ordenada · eje Y';
    } else if (state.phase === "easy-m") {
      dockHint.innerHTML = '<span class="dot"></span>' + mEqHTML(state.vh);
    } else if (state.phase === "easy-line") {
      dockHint.textContent = "Mové la recta";
    } else if (state.phase === "win") {
      dockHint.textContent = "Seguí · forma fácil";
    } else if (state.phase === "easy-win") {
      dockHint.textContent = "Otra · Reiniciar o Seguir";
    } else {
      dockHint.textContent = "";
    }
    syncDragCursor();
    syncScores();
  }

  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    var xi;
    var yi;
    for (xi = Math.ceil(XMIN); xi <= Math.floor(XMAX); xi++) {
      var p0 = worldToScreen(xi, YMIN);
      var p1 = worldToScreen(xi, YMAX);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    for (yi = Math.ceil(YMIN); yi <= Math.floor(YMAX); yi++) {
      var q0 = worldToScreen(XMIN, yi);
      var q1 = worldToScreen(XMAX, yi);
      ctx.beginPath();
      ctx.moveTo(q0.x, q0.y);
      ctx.lineTo(q1.x, q1.y);
      ctx.stroke();
    }
    var ox = worldToScreen(0, 0);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(viewPad.l, ox.y);
    ctx.lineTo(canvas.width - viewPad.r, ox.y);
    ctx.moveTo(ox.x, viewPad.t);
    ctx.lineTo(ox.x, canvas.height - viewPad.b);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.font = "600 12px ui-monospace, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (xi = Math.ceil(XMIN); xi <= Math.floor(XMAX); xi++) {
      if (xi === 0) continue;
      var sx = worldToScreen(xi, 0);
      ctx.strokeStyle = "#64748b";
      ctx.beginPath();
      ctx.moveTo(sx.x, sx.y - 4);
      ctx.lineTo(sx.x, sx.y + 4);
      ctx.stroke();
      ctx.fillStyle = xi % 2 === 0 ? XRED : MUTED;
      ctx.fillText(fmtNum(xi), sx.x, sx.y + 8);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = MUTED;
    for (yi = Math.ceil(YMIN); yi <= Math.floor(YMAX); yi++) {
      if (yi === 0) continue;
      var sy = worldToScreen(0, yi);
      ctx.strokeStyle = "#64748b";
      ctx.beginPath();
      ctx.moveTo(sy.x - 4, sy.y);
      ctx.lineTo(sy.x + 4, sy.y);
      ctx.stroke();
      ctx.fillText(fmtNum(yi), sy.x - 8, sy.y);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("0", ox.x - 8, ox.y + 6);
    ctx.fillStyle = "#93c5fd";
    ctx.font = "700 14px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("x", canvas.width - viewPad.r - 12, ox.y - 8);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("y", ox.x + 10, viewPad.t + 4);
  }

  function drawLine() {
    var a = worldToScreen(XMIN, f(XMIN));
    var b = worldToScreen(XMAX, f(XMAX));
    ctx.save();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 3.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawVertical(x) {
    var a = worldToScreen(x, YMIN);
    var b = worldToScreen(x, YMAX);
    ctx.save();
    ctx.strokeStyle = "rgba(255,92,92,0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawDot(x, y, color, glow, r) {
    var p = worldToScreen(x, y);
    r = r == null ? BIG_R : r;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = glow || PURPLE_GLOW;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color || PURPLE;
    ctx.fill();
    ctx.strokeStyle = "#efe7ff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawPulseRings(x, y, label, opts) {
    opts = opts || {};
    var p = worldToScreen(x, y);
    var breath = 1 + 0.12 * Math.sin(state.pulse);
    var rings = [16, 24, 33];
    ctx.save();
    rings.forEach(function (base, i) {
      var phase = (Math.sin(state.pulse * 1.15 + i * 0.9) + 1) / 2;
      var r = (base * breath) + phase * 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(249,115,22," + (0.95 - i * 0.18) + ")";
      ctx.lineWidth = 2.1;
      ctx.stroke();
    });
    if (opts.fillDot) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, BIG_R + 1, 0, Math.PI * 2);
      ctx.fillStyle = PURPLE;
      ctx.fill();
      ctx.strokeStyle = "#fff7ed";
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
    ctx.fillStyle = HOT;
    ctx.font = "800 13px ui-monospace, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    var lx = p.x + 16;
    var ly = p.y - 12;
    if (lx > canvas.width - 90) {
      ctx.textAlign = "right";
      lx = p.x - 16;
    }
    ctx.fillText(label, lx, ly);
    ctx.restore();
  }

  function drawGhostAtPx(p) {
    if (!p) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, BIG_R, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(167,139,250,0.85)";
    ctx.fill();
    ctx.strokeStyle = "#efe7ff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function paintDock(dock) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(dock.x, dock.y, BIG_R + 5, 0, Math.PI * 2);
    ctx.fillStyle = PURPLE_GLOW;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dock.x, dock.y, BIG_R, 0, Math.PI * 2);
    ctx.fillStyle = PURPLE;
    ctx.fill();
    ctx.strokeStyle = "#efe7ff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    state._dock = dock;
  }

  function drawTokenWell() {
    if (state.won || state.drag) return;
    var origin = worldToScreen(0, 0);
    if (state.phase === "place") {
      var row = currentRow();
      if (!row || row.placed) return;
      var dock = { x: PAD.l + 28, y: canvas.height - PAD.b - 18 };
      if (state.active === 0) {
        var onAxis = worldToScreen(row.x, 0);
        dock = { x: onAxis.x, y: origin.y };
      }
      paintDock(dock);
      return;
    }
    if (state.phase === "easy-b" && !state.easyP1) {
      paintDock(origin);
      return;
    }
    if (state.phase === "easy-m" && state.easyP1 && !state.easyP2) {
      paintDock(worldToScreen(easyP1().x, easyP1().y));
    }
  }

  function drawGhostLive() {
    if (!state.drag) return;
    if (!ghostEl || ghostEl.hidden) {
      drawGhostAtPx(state.dragPx);
    }
  }

  function drawDashSeg(x0, y0, x1, y1, color, width, alpha, solid) {
    var a = worldToScreen(x0, y0);
    var b = worldToScreen(x1, y1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    if (!solid) ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawGuideLabel(x, y, text, color, align) {
    var p = worldToScreen(x, y);
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "800 13px ui-monospace, Menlo, monospace";
    ctx.textAlign = align || "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, p.x, p.y);
    ctx.restore();
  }

  function highlightYAxis() {
    var ox = worldToScreen(0, 0);
    ctx.save();
    ctx.strokeStyle = "rgba(167,139,250,0.55)";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(ox.x, viewPad.t);
    ctx.lineTo(ox.x, canvas.height - viewPad.b);
    ctx.stroke();
    ctx.restore();
  }

  function drawVHGuides(probe) {
    var p1 = easyP1();
    var vh = state.vh || slopeToVH(state.m);
    var dx = probe ? probe.x - p1.x : 0;
    var dy = probe ? probe.y - p1.y : 0;
    var x = p1.x + dx;
    var y = p1.y + dy;
    var hAlpha = flashAlpha(state.hFlash, state.hLearned ? 0.42 : 0.7);
    var vAlpha = flashAlpha(state.vFlash, state.vLearned ? 0.42 : 0.7);
    if (state.bothFlash && flashActive(state.bothFlash)) {
      hAlpha = flashAlpha(state.bothFlash, 0.85);
      vAlpha = hAlpha;
    }
    var hSolid = flashActive(state.hFlash) || flashActive(state.bothFlash);
    var vSolid = flashActive(state.vFlash) || flashActive(state.bothFlash);
    drawDashSeg(p1.x, p1.y, x, p1.y, RUN, hSolid ? 4.2 : 2.6, hAlpha, hSolid);
    drawDashSeg(x, p1.y, x, y, RISE, vSolid ? 4.2 : 2.6, vAlpha, vSolid);
    if (Math.abs(dx) > 0.25) {
      drawGuideLabel((p1.x + x) / 2, p1.y + (vh.h >= 0 ? -0.55 : 0.55), "h", RUN, "center");
    }
    if (Math.abs(dy) > 0.25) {
      drawGuideLabel(x + (vh.h >= 0 ? 0.55 : -0.55), (p1.y + y) / 2, "v", RISE, vh.h >= 0 ? "left" : "right");
    }
  }

  function lineEnds(pt, angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    if (Math.abs(c) < 1e-8) {
      return { a: worldToScreen(pt.x, YMIN), b: worldToScreen(pt.x, YMAX) };
    }
    var m = s / c;
    return {
      a: worldToScreen(XMIN, pt.y + m * (XMIN - pt.x)),
      b: worldToScreen(XMAX, pt.y + m * (XMAX - pt.x))
    };
  }

  function distPointToLine(q, pt, angle) {
    if (!q || !pt) return Infinity;
    var dx = Math.cos(angle);
    var dy = Math.sin(angle);
    return Math.abs((q.x - pt.x) * (-dy) + (q.y - pt.y) * dx);
  }

  function lineTouches(q, pt, angle) {
    return distPointToLine(q, pt, angle) <= SNAP_IN;
  }

  function currentLineModel() {
    var p1 = easyP1();
    var p2 = easyP2();
    var probe = state.drag || state.hover;
    var pivot = state.linePivot;
    var pt = state.linePt;
    var angle = state.lineAngle;
    if (pivot === "p1") {
      pt = p1;
      if (probe) angle = Math.atan2(probe.y - p1.y, probe.x - p1.x);
    } else if (pivot === "p2") {
      pt = p2;
      if (probe) angle = Math.atan2(probe.y - p2.y, probe.x - p2.x);
    } else if (probe) {
      pt = probe;
    }
    if (!pt) pt = { x: 0, y: 0 };
    return { pt: pt, angle: angle, p1: p1, p2: p2 };
  }

  function drawMovableLine() {
    var model = currentLineModel();
    var ends = lineEnds(model.pt, model.angle);
    var both = lineTouches(model.p1, model.pt, model.angle) && lineTouches(model.p2, model.pt, model.angle);
    ctx.save();
    ctx.strokeStyle = both ? OK : LINE;
    ctx.globalAlpha = both ? 0.95 : 0.78;
    ctx.lineWidth = both ? 4.2 : 3.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ends.a.x, ends.a.y);
    ctx.lineTo(ends.b.x, ends.b.y);
    ctx.stroke();
    ctx.restore();
    if (lineTouches(model.p1, model.pt, model.angle)) {
      drawPulseRings(model.p1.x, model.p1.y, "P1", { fillDot: false });
    }
    if (lineTouches(model.p2, model.pt, model.angle)) {
      drawPulseRings(model.p2.x, model.p2.y, "P2", { fillDot: false });
    }
  }

  function drawEasyScene() {
    if (state.phase === "easy-b") highlightYAxis();
    if (state.phase === "easy-win" || (state.phase === "easy-line" && state.won)) drawLine();
    if (state.easyP1) {
      var a = easyP1();
      drawDot(a.x, a.y, PURPLE, PURPLE_GLOW, BIG_R);
    }
    if (state.easyP2) {
      var bpt = easyP2();
      drawDot(bpt.x, bpt.y, RISE, "rgba(52,211,153,0.35)", BIG_R);
    }
    syncGhostOverlay();
    if (state.paused) return;
    if (state.phase === "easy-b" && !state.easyP1) {
      var t1 = easyP1();
      var probe = state.drag || state.hover;
      if (state.drag) drawGhostLive();
      else drawTokenWell();
      if (probe && inSnapZone(probe, t1)) {
        drawPulseRings(t1.x, t1.y, "(0, " + fmtNum(t1.y) + ")", { fillDot: false });
      }
    } else if (state.phase === "easy-m" && !state.easyP2) {
      var t2 = easyP2();
      var probe2 = state.drag || state.hover;
      if (probe2) drawVHGuides(probe2);
      if (state.drag) drawGhostLive();
      else drawTokenWell();
      if (probe2 && inSnapZone(probe2, t2)) {
        drawPulseRings(t2.x, t2.y, "(" + fmtNum(t2.x) + ", " + fmtNum(t2.y) + ")", { fillDot: false });
      }
    } else if (state.phase === "easy-line" && !state.won) {
      drawMovableLine();
    }
  }

  function drawPlaceScene() {
    if (state.phase === "place" && state.active === 0) {
      var first = currentRow();
      if (first && !first.placed) drawVertical(first.x);
    }
    if (state.phase === "win") drawLine();
    state.rows.forEach(function (row) {
      if (row.placed) drawDot(row.x, row.y, PURPLE, PURPLE_GLOW, BIG_R);
    });
    syncGhostOverlay();
    if (state.phase === "place" && !state.won && !state.paused) {
      var row = currentRow();
      if (row && !row.placed) {
        var target = { x: row.x, y: row.y };
        var probe = state.drag || state.hover;
        var near = !!(probe && inSnapZone(probe, target));
        if (state.drag) drawGhostLive();
        else drawTokenWell();
        if (near) {
          drawPulseRings(row.x, row.y, "(" + fmtNum(row.x) + ", " + fmtNum(row.y) + ")", { fillDot: false });
        }
      }
    }
  }

  function draw() {
    drawGrid();
    if (isEasyPhase()) drawEasyScene();
    else drawPlaceScene();
  }

  function chooseB(v) {
    if (state.phase !== "pick-b") return;
    armAudio();
    state.b = v;
    state.phase = "pick-m";
    renderChips();
    updateHud();
    setPrompt("Tocá <strong class=\"hl\">m</strong>", "attention");
    pulseOk();
    draw();
  }

  function chooseM(v) {
    if (state.phase !== "pick-m") return;
    armAudio();
    state.m = v;
    state.phase = "ready";
    renderChips();
    updateHud();
    startFill();
  }

  function setWinChrome(on) {
    victoryBanner.classList.toggle("on", !!on);
    victoryBanner.hidden = !on;
    winBanner.classList.toggle("on", !!on);
    badgeCartel.classList.toggle("on", !!on);
    badgeCartel.hidden = !on;
    pausedBanner.hidden = !state.paused;
    pausedBanner.classList.toggle("on", !!state.paused);
  }

  function startFill() {
    if (state.m == null || state.b == null) return;
    state.rows = makeRows();
    state.active = 0;
    state.pipedFor = -1;
    state.phase = "fill";
    state.won = false;
    setWinChrome(false);
    renderChips();
    renderTable();
    updateHud();
    var row = currentRow();
    setPrompt("Escribí <strong>f(<span class=\"hl-x\">" + fmtNum(row.x) + "</span>)</strong>", "attention");
    draw();
  }

  function submitFill(i, raw) {
    if (state.phase !== "fill" || i !== state.active || state.locked || state.paused) return;
    var row = state.rows[i];
    if (!row || row.fillOk) return;
    armAudio();
    var val = parseNum(raw);
    row.typed = raw;
    if (!isFinite(val) || !almost(val, row.y)) {
      row.fillBad = true;
      state.bad++;
      pulseBad();
      renderTable();
      updateHud();
      setPrompt("Otra", "bad");
      return;
    }
    row.fillOk = true;
    row.fillBad = false;
    state.ok++;
    smallConfetti();
    pulseOk();
    renderTable();
    updateHud();
    setPrompt("✓ <strong class=\"ok\">" + fmtNum(row.y) + "</strong>", "ok");
    if (allFilled()) {
      later(420, startPlace);
      return;
    }
    state.locked = true;
    later(320, function () {
      state.active = i + 1;
      state.locked = false;
      renderTable();
      updateHud();
      var nxt = currentRow();
      if (nxt) {
        setPrompt("Escribí <strong>f(<span class=\"hl-x\">" + fmtNum(nxt.x) + "</span>)</strong>", "attention");
      }
      draw();
    });
  }

  function startPlace() {
    state.phase = "place";
    state.active = 0;
    endDragVisual();
    state.hover = null;
    rearmChime();
    renderTable();
    updateHud();
    setPrompt("Arrastrá", "attention");
    draw();
  }

  function tokenHit(pt) {
    var dock = state._dock;
    if (!dock) return true;
    return Math.hypot(pt.x - dock.x, pt.y - dock.y) <= BIG_R + 16;
  }

  function canPlaceDrag() {
    if (state.paused || state.locked || state.won) return false;
    if (state.phase === "place") {
      var row = currentRow();
      return !!(row && !row.placed);
    }
    if (state.phase === "easy-b") return !state.easyP1;
    if (state.phase === "easy-m") return !!(state.easyP1 && !state.easyP2);
    return false;
  }

  function canLineDrag() {
    return state.phase === "easy-line" && !state.paused && !state.locked && !state.won;
  }

  function bindDragListen() {
    if (dragListen) return;
    dragListen = true;
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
  }

  function unbindDragListen() {
    if (!dragListen) return;
    dragListen = false;
    window.removeEventListener("pointermove", onPointerMove, true);
    window.removeEventListener("pointerup", onPointerUp, true);
    window.removeEventListener("pointercancel", onPointerUp, true);
  }

  function endDragVisual() {
    state.drag = null;
    state.dragPx = null;
    state.dragClient = null;
    unbindDragListen();
    syncGhostOverlay();
  }

  function applyPointer(ev) {
    var cpt = eventToCanvas(ev);
    var w = screenToWorld(cpt.x, cpt.y);
    state.hover = w;
    if (state.drag) {
      state.dragClient = pointerClient(ev);
      state.dragPx = cpt;
      state.drag = w;
    }
    return w;
  }

  function beginDrag(ev, fromOutside) {
    if (canLineDrag()) {
      beginLineDrag(ev);
      return;
    }
    if (!canPlaceDrag()) return;
    armAudio();
    if (!fromOutside) {
      var hit = eventToCanvas(ev);
      if (state._dock && !tokenHit(hit) && !state.drag) return;
    }
    if (ev.preventDefault) ev.preventDefault();
    if (canvas.setPointerCapture && ev.pointerId != null) {
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    }
    state.drag = { x: 0, y: 0 };
    applyPointer(ev);
    bindDragListen();
    onPointerMove(ev);
  }

  function beginLineDrag(ev) {
    armAudio();
    if (ev.preventDefault) ev.preventDefault();
    if (canvas.setPointerCapture && ev.pointerId != null) {
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    }
    var w = applyPointer(ev);
    var p1 = easyP1();
    var p2 = easyP2();
    if (dist(w, p1) <= SNAP_OUT) state.linePivot = "p1";
    else if (dist(w, p2) <= SNAP_OUT) state.linePivot = "p2";
    else state.linePivot = null;
    state.linePt = w;
    state.drag = w;
    bindDragListen();
    onPointerMove(ev);
  }

  function onPointerDown(ev) {
    beginDrag(ev, false);
  }

  function noteNear(near) {
    if (near) {
      state.near = true;
      if (!state.chimed) {
        state.chimed = true;
        focusChime();
      }
    } else if (state.near || state.chimed) {
      rearmChime();
    }
  }

  function updateVHGuides(probe) {
    if (!probe || !state.vh) return;
    var p1 = easyP1();
    var p2 = easyP2();
    var vh = state.vh;
    var dx = probe.x - p1.x;
    var dy = probe.y - p1.y;
    var hOk = Math.abs(dx - vh.h) <= SNAP_IN;
    var vOk = Math.abs(dy - vh.v) <= SNAP_IN;
    var both = inSnapZone(probe, p2);
    if (both) {
      if (!state.bothNear) {
        state.bothFlash = startFlash(3);
        state.bothNear = true;
        if (!state.hLearned) state.hLearned = true;
        if (!state.vLearned) state.vLearned = true;
      }
    } else {
      state.bothNear = false;
      if (hOk && !state.hLearned) {
        state.hLearned = true;
        state.hFlash = startFlash(1);
        if (GK.playOkChime) GK.playOkChime();
        if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
      }
      if (vOk && !state.vLearned) {
        state.vLearned = true;
        state.vFlash = startFlash(1);
        if (GK.playOkChime) GK.playOkChime();
        if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
      }
    }
  }

  function updateLineFollow(w) {
    var p1 = easyP1();
    var p2 = easyP2();
    var model;
    if (state.linePivot === "p1") {
      state.linePt = p1;
      state.lineAngle = Math.atan2(w.y - p1.y, w.x - p1.x);
    } else if (state.linePivot === "p2") {
      state.linePt = p2;
      state.lineAngle = Math.atan2(w.y - p2.y, w.x - p2.x);
    } else {
      state.linePt = w;
      if (lineTouches(p1, w, state.lineAngle)) state.linePivot = "p1";
      else if (lineTouches(p2, w, state.lineAngle)) state.linePivot = "p2";
    }
    model = currentLineModel();
    var both = lineTouches(model.p1, model.pt, model.angle) && lineTouches(model.p2, model.pt, model.angle);
    noteNear(both);
    if (both) completeEasyLine();
  }

  function onPointerMove(ev) {
    if (state.paused || state.locked) return;
    if (state.won && state.phase !== "easy-line") return;
    var w = applyPointer(ev);
    if (state.phase === "place") {
      var row = currentRow();
      if (!row || row.placed) {
        draw();
        return;
      }
      noteNear(inSnapZone(state.drag || w, { x: row.x, y: row.y }));
      draw();
      return;
    }
    if (state.phase === "easy-b" && !state.easyP1) {
      noteNear(inSnapZone(state.drag || w, easyP1()));
      draw();
      return;
    }
    if (state.phase === "easy-m" && !state.easyP2) {
      var probe = state.drag || w;
      updateVHGuides(probe);
      noteNear(inSnapZone(probe, easyP2()));
      draw();
      return;
    }
    if (state.phase === "easy-line" && !state.won) {
      if (!state.drag) {
        state.linePt = w;
      }
      updateLineFollow(w);
      draw();
      return;
    }
    draw();
  }

  function onPointerUp(ev) {
    if (state.paused || state.locked) {
      endDragVisual();
      return;
    }
    if (state.phase === "easy-line") {
      if (ev && ev.preventDefault) ev.preventDefault();
      applyPointer(ev);
      var model = currentLineModel();
      var both = lineTouches(model.p1, model.pt, model.angle) && lineTouches(model.p2, model.pt, model.angle);
      endDragVisual();
      if (both) completeEasyLine();
      else state.linePivot = state.linePivot;
      draw();
      return;
    }
    // easy-m: lock P2 on pointerup/click near the target even without an active drag
    // (hover already drives pulse / 3× flash; P1 still requires drag from the dock).
    if (state.phase === "easy-m" && !state.easyP2) {
      if (ev && ev.preventDefault) ev.preventDefault();
      applyPointer(ev);
      var p2Drop = state.drag || state.hover;
      var p2HadDrag = !!state.drag;
      endDragVisual();
      if (p2Drop && (inSnapZone(p2Drop, easyP2()) || dist(p2Drop, easyP2()) <= SNAP_IN)) lockEasyP2();
      else if (p2HadDrag) placeWrongEasy("v/h");
      return;
    }
    if (!state.drag) {
      endDragVisual();
      return;
    }
    if (ev && ev.preventDefault) ev.preventDefault();
    applyPointer(ev);
    var drop = state.drag;
    endDragVisual();
    if (state.phase === "place") {
      var row = currentRow();
      if (!row || row.placed) return;
      var Q = { x: row.x, y: row.y };
      if (inSnapZone(drop, Q) || dist(drop, Q) <= SNAP_IN) placeCorrect();
      else placeWrong();
      return;
    }
    if (state.phase === "easy-b" && !state.easyP1) {
      if (inSnapZone(drop, easyP1()) || dist(drop, easyP1()) <= SNAP_IN) lockEasyP1();
      else placeWrongEasy("en el eje Y");
    }
  }

  function onPointerLeave() {
    if (!state.drag) {
      state.hover = null;
      rearmChime();
      if (!state.won && !state.paused) draw();
    }
  }

  function placeCorrect() {
    var row = currentRow();
    if (!row) return;
    var heardHover = state.chimed;
    row.placed = true;
    state.ok++;
    state.hover = null;
    endDragVisual();
    rearmChime();
    if (heardHover) {
      flashOk();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    } else {
      pulseOk();
    }
    smallConfetti();
    renderTable();
    updateHud();
    setPrompt("✓ <strong class=\"ok\">(" + fmtNum(row.x) + ", " + fmtNum(row.y) + ")</strong>", "ok");
    draw();
    if (allPlaced()) {
      later(480, showVictory);
      return;
    }
    state.locked = true;
    later(state.speedFactor > 1 ? 800 : 380, function () {
      var i;
      for (i = 0; i < state.rows.length; i++) {
        if (!state.rows[i].placed) {
          state.active = i;
          break;
        }
      }
      state.locked = false;
      renderTable();
      updateHud();
      var nxt = currentRow();
      if (nxt) {
        setPrompt("Arrastrá <strong class=\"hl-x\">x = " + fmtNum(nxt.x) + "</strong>", "attention");
      }
      draw();
    });
  }

  function placeWrong() {
    state.bad++;
    syncScores();
    pulseBad();
    rearmChime();
    setPrompt("Ahí no", "bad");
    later(280, function () {
      var row = currentRow();
      if (row && state.phase === "place") setPrompt("Arrastrá", "attention");
    });
    draw();
  }

  function placeWrongEasy(kind) {
    state.bad++;
    syncScores();
    pulseBad();
    rearmChime();
    setPrompt(kind === "v/h" ? "Ahí no · v/h" : "Ahí no · eje Y", "bad");
    later(320, function () {
      if (state.phase === "easy-b") {
        setPrompt("Colocá <strong>P1</strong> en el eje Y · <strong>(0, b)</strong>", "attention");
        setStepCartel("Desplazamiento sobre el eje Y", true);
      } else if (state.phase === "easy-m") {
        promptEasySlope();
      }
    });
    draw();
  }

  function promptEasySlope() {
    var vh = state.vh || slopeToVH(state.m);
    setStepCartel(mEqHTML(vh), true);
    setPrompt(
      "Mové <strong>" + dirCopy(vh) + "</strong> · " + mEqHTML(vh),
      "attention"
    );
  }

  function lockEasyP1() {
    var heard = state.chimed;
    state.easyP1 = true;
    state.ok++;
    state.hover = null;
    endDragVisual();
    rearmChime();
    if (heard) {
      flashOk();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    } else pulseOk();
    smallConfetti();
    var p1 = easyP1();
    setPrompt("✓ <strong class=\"ok\">P1 = (0, " + fmtNum(p1.y) + ")</strong>", "ok");
    updateHud();
    renderEasyPanel();
    draw();
    state.locked = true;
    later(state.speedFactor > 1 ? 800 : 420, function () {
      state.locked = false;
      startEasySlope();
    });
  }

  function lockEasyP2() {
    var heard = state.chimed;
    state.easyP2 = true;
    state.ok++;
    state.hover = null;
    endDragVisual();
    rearmChime();
    if (heard) {
      flashOk();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    } else pulseOk();
    smallConfetti();
    var p2 = easyP2();
    setPrompt("✓ <strong class=\"ok\">P2 = (" + fmtNum(p2.x) + ", " + fmtNum(p2.y) + ")</strong>", "ok");
    updateHud();
    renderEasyPanel();
    draw();
    state.locked = true;
    later(state.speedFactor > 1 ? 800 : 420, function () {
      state.locked = false;
      startEasyLine();
    });
  }

  function startEasySlope() {
    state.phase = "easy-m";
    state.hLearned = false;
    state.vLearned = false;
    state.hFlash = null;
    state.vFlash = null;
    state.bothFlash = null;
    state.bothNear = false;
    rearmChime();
    promptEasySlope();
    updateHud();
    renderChips();
    draw();
  }

  function startEasyLine() {
    state.phase = "easy-line";
    state.lineAngle = 0;
    state.linePt = { x: 0, y: state.b || 0 };
    state.linePivot = null;
    rearmChime();
    setStepCartel("Recta que toca los dos puntos", true);
    setPrompt("Mové la <strong>recta</strong> hasta que toque <strong>P1</strong> y <strong>P2</strong>", "attention");
    updateHud();
    renderChips();
    draw();
  }

  function completeEasyLine() {
    if (state.phase !== "easy-line" || state.won) return;
    var heard = state.chimed;
    state.won = true;
    state.ok++;
    endDragVisual();
    rearmChime();
    if (heard) {
      flashOk();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    } else pulseOk();
    later(180, showEasyVictory);
  }

  function setVictoryCopy(title, sub, continueLabel, badge, winText) {
    if (victoryTitle) victoryTitle.textContent = title;
    if (victorySub) victorySub.innerHTML = sub;
    if (victoryContinue) victoryContinue.textContent = continueLabel;
    if (badgeCartel && badge) badgeCartel.textContent = badge;
    if (winBannerText && winText) winBannerText.innerHTML = winText;
  }

  function showVictory() {
    state.won = true;
    state.phase = "win";
    state.locked = true;
    state.hover = null;
    endDragVisual();
    setVictoryCopy(
      "¡Ganador!",
      "Lograste graficar la función",
      "Seguí participando",
      "Lograste graficar la función",
      "Lograste graficar la función."
    );
    setWinChrome(true);
    burstConfetti();
    if (GK.playExplosion) GK.playExplosion();
    else if (GK.playOkChime) GK.playOkChime();
    setPrompt("<strong class=\"ok\">Lograste graficar la función</strong>", "ok");
    renderTable();
    updateHud();
    draw();
    later(state.speedFactor > 1 ? 2200 : 1400, function () {
      if (state.phase === "win" && !state.easyStarted) startFormaFacil();
    });
  }

  function showEasyVictory() {
    state.won = true;
    state.phase = "easy-win";
    state.locked = true;
    state.hover = null;
    endDragVisual();
    setVictoryCopy(
      "¡Ganador!",
      "Lograste la forma fácil · " + mEqHTML(state.vh),
      "Seguir jugando",
      "Lograste la forma fácil",
      "Lograste graficar con " + mEqHTML(state.vh) + "."
    );
    setStepCartel("", false);
    setWinChrome(true);
    burstConfetti();
    if (GK.playExplosion) GK.playExplosion();
    else if (GK.playOkChime) GK.playOkChime();
    setPrompt("<strong class=\"ok\">Lograste la forma fácil · " + mEqHTML(state.vh) + "</strong>", "ok");
    updateHud();
    renderChips();
    draw();
  }

  function resetEasyFlags() {
    state.easyStarted = false;
    state.easyP1 = false;
    state.easyP2 = false;
    state.vh = null;
    state.lineAngle = 0;
    state.linePt = null;
    state.linePivot = null;
    state.hLearned = false;
    state.vLearned = false;
    state.hFlash = null;
    state.vFlash = null;
    state.bothFlash = null;
    state.bothNear = false;
    setEasyBanner(false);
    setStepCartel("", false);
  }

  function startFormaFacil() {
    if (state.m == null || state.b == null) return;
    if (state.easyStarted && isEasyPhase()) return;
    armAudio();
    state.easyStarted = true;
    state.won = false;
    state.locked = true;
    state.hover = null;
    endDragVisual();
    rearmChime();
    state.vh = slopeToVH(state.m);
    state.easyP1 = false;
    state.easyP2 = false;
    state.hLearned = false;
    state.vLearned = false;
    state.hFlash = null;
    state.vFlash = null;
    state.bothFlash = null;
    state.bothNear = false;
    state.lineAngle = 0;
    state.linePt = { x: 0, y: state.b };
    state.linePivot = null;
    state.phase = "easy-intro";
    setWinChrome(false);
    setEasyBanner(true);
    sizeCanvas();
    setStepCartel("forma fácil", true);
    setPrompt("<strong>Seguí participando</strong> · forma fácil", "attention");
    renderChips();
    updateHud();
    draw();
    later(state.speedFactor > 1 ? 1100 : 700, function () {
      if (state.phase !== "easy-intro") return;
      state.locked = false;
      state.phase = "easy-b";
      setStepCartel("Desplazamiento sobre el eje Y", true);
      setPrompt("Colocá <strong>P1</strong> en el eje Y · ordenada <strong>(0, b)</strong>", "attention");
      updateHud();
      renderChips();
      draw();
    });
  }

  function resetAll(keepScores) {
    clearTimers();
    state.phase = "pick-b";
    state.m = null;
    state.b = null;
    state.rows = [];
    state.active = 0;
    state.pipedFor = -1;
    state.hover = null;
    endDragVisual();
    state.won = false;
    state.locked = false;
    state.paused = false;
    resetEasyFlags();
    rearmChime();
    if (!keepScores) {
      state.ok = 0;
      state.bad = 0;
      state.round = 1;
    }
    pausedBanner.classList.remove("on");
    setVictoryCopy(
      "¡Ganador!",
      "Lograste graficar la función",
      "Seguí participando",
      "Lograste graficar la función",
      "Lograste graficar la función."
    );
    setWinChrome(false);
    state.b = B_OPTS[Math.floor(Math.random() * B_OPTS.length)];
    state.m = M_OPTS[Math.floor(Math.random() * M_OPTS.length)];
    state.phase = "ready";
    sizeCanvas();
    startFill();
  }

  function keepPlaying() {
    state.round++;
    resetAll(true);
  }

  function onVictoryContinue() {
    if (state.phase === "win" || state.phase === "easy-intro") {
      startFormaFacil();
      return;
    }
    keepPlaying();
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

  function tick() {
    state.pulse += 0.09;
    if (!state.paused) draw();
    state.raf = requestAnimationFrame(tick);
  }

  resetBtn.addEventListener("click", function () { resetAll(false); });
  slowBtn.addEventListener("click", toggleSlow);
  slowBtn.setAttribute("aria-pressed", "false");
  if (victoryRestart) victoryRestart.addEventListener("click", function () { resetAll(false); });
  if (victoryContinue) victoryContinue.addEventListener("click", onVictoryContinue);
  if (winRestartBtn) winRestartBtn.addEventListener("click", function () { resetAll(false); });

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  if (dockHint) {
    dockHint.addEventListener("pointerdown", function (ev) { beginDrag(ev, true); });
  }
  if (promptEl) {
    promptEl.addEventListener("pointerdown", function (ev) { beginDrag(ev, true); });
  }
  canvas.addEventListener("pointerdown", function () { armAudio(); });
  document.addEventListener("pointerdown", function () { armAudio(); });
  window.addEventListener("resize", function () {
    sizeCanvas();
    draw();
  });

  sizeCanvas();
  resetAll(false);
  window.CampusNumberDictation.attach(
    tbody,
    document.getElementById("dictateBtn"),
    document.getElementById("dictationStatus")
  );
  tick();

  window.__L200 = {
    state: state,
    XS: XS,
    B_OPTS: B_OPTS,
    M_OPTS: M_OPTS,
    f: f,
    latexFx: latexFx,
    chooseB: chooseB,
    chooseM: chooseM,
    startFill: startFill,
    submitFill: submitFill,
    startPlace: startPlace,
    placeCorrect: placeCorrect,
    startFormaFacil: startFormaFacil,
    slopeToVH: slopeToVH,
    easyP1: easyP1,
    easyP2: easyP2,
    lockEasyP1: lockEasyP1,
    lockEasyP2: lockEasyP2,
    completeEasyLine: completeEasyLine,
    resetAll: resetAll,
    draw: draw,
    eventToCanvas: eventToCanvas,
    screenToWorld: screenToWorld,
    worldToScreen: worldToScreen
  };
})();
