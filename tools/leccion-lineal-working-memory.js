/*! Campus Ingeniería · L200 · lineal working memory (b → m → tabla → graficar). */
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
  var PAD = { l: 48, r: 36, t: 28, b: 42 };
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

  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var confettiCanvas = document.getElementById("confetti");
  var graphWrap = document.getElementById("graphWrap");
  var promptEl = document.getElementById("prompt");
  var fnBox = document.getElementById("fnBox");
  var soundMeter = document.getElementById("soundMeter");
  var playBtn = document.getElementById("playBtn");
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
  var winRestartBtn = document.getElementById("winRestartBtn");
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
    locked: false
  };

  function later(ms, fn) {
    var id = setTimeout(fn, ms * (state.speedFactor || 1));
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers = [];
  }

  function armAudio() {
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
      case "ready": return "Play";
      case "fill": return "tabla";
      case "place": return "gráfica";
      case "win": return "listo";
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
    if (scoreRound) scoreRound.innerHTML = "Fase <strong>" + phaseLabel() + "</strong>";
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
      if (!state.near || state.won || state.paused || state.locked) return;
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
    if (GK.playOkChime) GK.playOkChime();
    if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    later(1200, function () { input.classList.remove("pip"); });
  }

  function worldToScreen(x, y) {
    var w = canvas.width - PAD.l - PAD.r;
    var h = canvas.height - PAD.t - PAD.b;
    var sx = PAD.l + ((x - XMIN) / (XMAX - XMIN)) * w;
    var sy = PAD.t + ((YMAX - y) / (YMAX - YMIN)) * h;
    return { x: sx, y: sy };
  }

  function screenToWorld(px, py) {
    var w = canvas.width - PAD.l - PAD.r;
    var h = canvas.height - PAD.t - PAD.b;
    var x = XMIN + ((px - PAD.l) / w) * (XMAX - XMIN);
    var y = YMAX - ((py - PAD.t) / h) * (YMAX - YMIN);
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
    if (!state.drag || !state.dragClient) {
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

  function sizeCanvas() {
    var wrapW = graphWrap.clientWidth || 900;
    var cssH = Math.max(420, Math.min(720, wrapW * 0.74));
    canvas.width = Math.max(640, Math.round(wrapW));
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

  function renderChips() {
    var pickingB = state.phase === "pick-b";
    var pickingM = state.phase === "pick-m";
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
    pickBBox.classList.toggle("off", !pickingB && !pickingM);
    pickBBox.classList.toggle("compact", pickingM);
    pickBBox.classList.toggle("done", state.b != null);
    pickMBox.classList.toggle("off", !pickingM);
    pickMBox.classList.toggle("done", state.m != null);
    bumpGo(pickBBox, pickingB);
    bumpGo(pickMBox, pickingM);
    if (tableWrap) tableWrap.classList.toggle("off", !boardOn);
    pickBKicker.textContent = pickingM && state.b != null ? "b = " + fmtNum(state.b) : "b";
    pickMKicker.textContent = "m";
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
    var canDrag = state.phase === "place" && !state.won && !state.paused && !state.locked;
    if (promptEl) promptEl.classList.toggle("can-drag", canDrag);
    if (dockHint) dockHint.classList.toggle("can-drag", canDrag);
  }

  function updateHud() {
    fnBox.innerHTML = latexFx();
    playBtn.disabled = state.b == null || state.m == null || state.paused;
    if (state.phase === "fill") {
      dockHint.textContent = "Escribí f(x) · Enter";
    } else if (state.phase === "place") {
      dockHint.innerHTML = '<span class="dot"></span>Arrastrá';
    } else if (state.phase === "win") {
      dockHint.textContent = "Otra · Reset o Seguir";
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
    ctx.moveTo(PAD.l, ox.y);
    ctx.lineTo(canvas.width - PAD.r, ox.y);
    ctx.moveTo(ox.x, PAD.t);
    ctx.lineTo(ox.x, canvas.height - PAD.b);
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
    ctx.fillText("x", canvas.width - PAD.r - 12, ox.y - 8);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("y", ox.x + 10, PAD.t + 4);
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

  function drawTokenWell() {
    if (state.phase !== "place" || state.won) return;
    var row = currentRow();
    if (!row || row.placed) return;
    var origin = worldToScreen(0, 0);
    var dock = { x: PAD.l + 28, y: canvas.height - PAD.b - 18 };
    if (state.active === 0) {
      var onAxis = worldToScreen(row.x, 0);
      dock = { x: onAxis.x, y: origin.y };
    }
    if (state.drag) return;
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

  function draw() {
    drawGrid();
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
        if (state.drag) {
          if (!ghostEl || ghostEl.hidden) {
            drawGhostAtPx(state.dragPx);
          }
        } else {
          drawTokenWell();
        }
        if (near) {
          drawPulseRings(row.x, row.y, "(" + fmtNum(row.x) + ", " + fmtNum(row.y) + ")", { fillDot: false });
        }
      }
    }
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
    armAudio();
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
      later(state.speedFactor > 1 ? 900 : 420, startPlace);
      return;
    }
    state.locked = true;
    later(state.speedFactor > 1 ? 700 : 320, function () {
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
    if (state.phase !== "place" || state.paused || state.locked || state.won) return false;
    var row = currentRow();
    return !!(row && !row.placed);
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

  function onPointerDown(ev) {
    beginDrag(ev, false);
  }

  function onPointerMove(ev) {
    if (state.paused || state.locked || state.won) return;
    var w = applyPointer(ev);
    if (state.phase !== "place") {
      draw();
      return;
    }
    var row = currentRow();
    if (!row || row.placed) {
      draw();
      return;
    }
    var Q = { x: row.x, y: row.y };
    var probe = state.drag || w;
    var near = inSnapZone(probe, Q);
    if (near) {
      state.near = true;
      if (!state.chimed) {
        state.chimed = true;
        focusChime();
      }
    } else if (state.near || state.chimed) {
      rearmChime();
    }
    draw();
  }

  function onPointerUp(ev) {
    if (state.phase !== "place" || !state.drag || state.paused || state.locked || state.won) {
      endDragVisual();
      return;
    }
    if (ev && ev.preventDefault) ev.preventDefault();
    applyPointer(ev);
    var row = currentRow();
    var drop = state.drag;
    endDragVisual();
    if (!row || row.placed) return;
    var Q = { x: row.x, y: row.y };
    if (inSnapZone(drop, Q) || dist(drop, Q) <= SNAP_IN) {
      placeCorrect();
    } else {
      placeWrong();
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
      if (row) setPrompt("Arrastrá", "attention");
    });
    draw();
  }

  function showVictory() {
    state.won = true;
    state.phase = "win";
    state.locked = true;
    state.hover = null;
    endDragVisual();
    setWinChrome(true);
    burstConfetti();
    if (GK.playExplosion) GK.playExplosion();
    else if (GK.playOkChime) GK.playOkChime();
    setPrompt("<strong class=\"ok\">Lograste graficar la función</strong>", "ok");
    renderTable();
    updateHud();
    draw();
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
    rearmChime();
    if (!keepScores) {
      state.ok = 0;
      state.bad = 0;
      state.round = 1;
    }
    pausedBanner.classList.remove("on");
    setWinChrome(false);
    renderChips();
    renderTable();
    updateHud();
    setPrompt("Tocá <strong class=\"hl-b\">b</strong>", "attention");
    draw();
  }

  function keepPlaying() {
    state.round++;
    resetAll(true);
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

  playBtn.addEventListener("click", function () {
    armAudio();
    startFill();
  });
  resetBtn.addEventListener("click", function () { resetAll(false); });
  slowBtn.addEventListener("click", toggleSlow);
  slowBtn.setAttribute("aria-pressed", "false");
  if (victoryRestart) victoryRestart.addEventListener("click", function () { resetAll(false); });
  if (victoryContinue) victoryContinue.addEventListener("click", keepPlaying);
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
    resetAll: resetAll,
    draw: draw,
    eventToCanvas: eventToCanvas,
    screenToWorld: screenToWorld,
    worldToScreen: worldToScreen
  };
})();
