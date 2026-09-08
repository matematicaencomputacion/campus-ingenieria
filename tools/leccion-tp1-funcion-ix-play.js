/*! Campus Ingeniería · TP1 §1 ¿es función? I–X · Play series (L110-style sweep). */
(function () {
  "use strict";

  var CFG = window.__TP1_FN_CFG__;
  if (!CFG) throw new Error("TP1_FN: falta window.__TP1_FN_CFG__");

  var GK = window.CampusGameKit || {};
  var BLACK = "#111111";
  var GRAPH_BG = "#f8fafc";
  var GRID = "#e2e8f0";
  var GREEN = "#22c55e";
  var RED = "#ef4444";
  var EMPTY = "#64748b";
  var PROBE = "#2563eb";
  var TEAL = "#0d9488";
  var AMBER = "#d97706";
  var CORAL = "#e11d48";
  var PURPLE = "#7c3aed";
  var BAND_H = 14;
  var PAD = { l: 48, r: 36, t: 28, b: 48 };
  var EPS = 1e-6;

  var graphs = CFG.graphs || [];
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
  var exprFormula = document.getElementById("exprFormula");
  var hintMini = document.getElementById("hintMini");
  var chipBox = document.getElementById("chipBox");
  var ruleList = document.getElementById("ruleList");
  var stepsList = document.getElementById("stepsList");
  var exProgress = document.getElementById("exProgress");

  var state = {
    playing: false,
    speedFactor: 1,
    timers: [],
    raf: 0,
    gi: 0,
    t: 0,
    showProbe: false,
    showHits: false,
    bandMode: "full",
    redefineOn: false
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
  function fmtNum(n) {
    if (n == null || !isFinite(n)) return "—";
    if (Object.is(n, -0) || Math.abs(n) < 1e-12) return "0";
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n)).replace("-", "−");
    return String(Math.round(n * 100) / 100).replace("-", "−");
  }
  function setCaption(html) { if (captionEl) captionEl.innerHTML = html; }
  function setWork(html) {
    if (!workPanel) return;
    if (!html) { workPanel.classList.remove("on"); workPanel.innerHTML = ""; return; }
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
  function g() { return graphs[state.gi] || graphs[0]; }

  function world() {
    var e = g();
    return { xmin: e.xmin, xmax: e.xmax, ymin: e.ymin, ymax: e.ymax };
  }
  function sizeCanvas() {
    var wrap = document.getElementById("graphWrap");
    var w = Math.max(480, Math.floor((wrap && wrap.clientWidth) || 720));
    var h = Math.max(360, Math.floor(w * 0.70));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  function sx(x) {
    var W = canvas.width - PAD.l - PAD.r;
    var e = world();
    return PAD.l + ((x - e.xmin) / (e.xmax - e.xmin)) * W;
  }
  function sy(y) {
    var H = canvas.height - PAD.t - PAD.b;
    var e = world();
    return PAD.t + ((e.ymax - y) / (e.ymax - e.ymin)) * H;
  }
  function pt(x, y) { return { x: sx(x), y: sy(y) }; }

  function hitsAt(t) {
    var e = g();
    var ys = e.ys ? e.ys(t) : [];
    return ys.filter(function (y) { return y != null && isFinite(y); });
  }

  function drawAxes() {
    var e = world();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = GRAPH_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    var xi, yi, a, b;
    for (xi = Math.ceil(e.xmin - 1e-9); xi <= Math.floor(e.xmax + 1e-9); xi++) {
      a = pt(xi, e.ymin); b = pt(xi, e.ymax);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (yi = Math.ceil(e.ymin - 1e-9); yi <= Math.floor(e.ymax + 1e-9); yi++) {
      a = pt(e.xmin, yi); b = pt(e.xmax, yi);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    var yAxisX = e.xmin <= 0 && e.xmax >= 0 ? sx(0) : PAD.l;
    var xAxisY = e.ymin <= 0 && e.ymax >= 0 ? sy(0) : canvas.height - PAD.b;
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PAD.l, xAxisY); ctx.lineTo(canvas.width - PAD.r, xAxisY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(yAxisX, PAD.t); ctx.lineTo(yAxisX, canvas.height - PAD.b); ctx.stroke();
    ctx.fillStyle = BLACK;
    ctx.font = "600 11px ui-monospace, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (xi = Math.ceil(e.xmin); xi <= Math.floor(e.xmax); xi++) {
      if (Math.abs(xi) < 1e-12) continue;
      ctx.fillText(String(xi).replace("-", "−"), sx(xi), xAxisY + 6);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (yi = Math.ceil(e.ymin); yi <= Math.floor(e.ymax); yi++) {
      if (Math.abs(yi) < 1e-12) continue;
      ctx.fillText(String(yi).replace("-", "−"), yAxisX - 6, sy(yi));
    }
    ctx.restore();
  }

  function plotParam(fnX, fnY, t0, t1, color, steps) {
    var i, t, x, y, p, first = true;
    var e = world();
    steps = steps || 240;
    ctx.save();
    ctx.strokeStyle = color || TEAL;
    ctx.lineWidth = 3.1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (i = 0; i <= steps; i++) {
      t = t0 + (t1 - t0) * (i / steps);
      x = fnX(t); y = fnY(t);
      if (!isFinite(x) || !isFinite(y) || y < e.ymin - 1 || y > e.ymax + 1) { first = true; continue; }
      p = pt(x, y);
      if (first) { ctx.moveTo(p.x, p.y); first = false; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function plotFn(fn, x0, x1, color, steps) {
    plotParam(function (t) { return t; }, fn, x0, x1, color, steps);
  }

  function drawDot(x, y, color, open) {
    var p = pt(x, y);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6.2, 0, Math.PI * 2);
    if (open) {
      ctx.fillStyle = GRAPH_BG;
      ctx.fill();
      ctx.strokeStyle = color || EMPTY;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    } else {
      ctx.fillStyle = color || GREEN;
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBand(a, b, color) {
    var e = world();
    var x0 = sx(Math.max(e.xmin, a));
    var x1 = sx(Math.min(e.xmax, b));
    var y = sy(0);
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x0, y - BAND_H / 2, x1 - x0, BAND_H);
    ctx.restore();
  }

  function drawGraph(e) {
    var kind = e.kind;
    if (kind === "sideways") {
      plotParam(function (t) { return t * t - 2; }, function (t) { return t; }, -3.2, 3.2, CORAL, 280);
      drawDot(-2, 0, AMBER, false);
    } else if (kind === "piece") {
      plotFn(function (x) { return -x - 3; }, e.xmin, -3, TEAL, 80);
      plotFn(function (x) { return -0.25 * (x + 3) * (x - 2); }, -3, 2, AMBER, 160);
      plotFn(function (x) { return x - 2; }, 2, e.xmax, CORAL, 80);
      drawDot(-3, 0, GREEN, false);
      drawDot(2, 0, GREEN, false);
    } else if (kind === "cubic") {
      plotFn(function (x) { return Math.pow(x / 2, 3) + 1; }, e.xmin, e.xmax, TEAL, 280);
      drawDot(-2, 0, GREEN, false);
      drawDot(0, 1, GREEN, false);
    } else if (kind === "roots") {
      plotFn(function (x) { return Math.sqrt(-x - 1); }, e.xmin, -1, TEAL, 140);
      plotFn(function (x) { return Math.sqrt(x - 3); }, 3, e.xmax, AMBER, 140);
      drawDot(-1, 0, GREEN, false);
      drawDot(3, 0, GREEN, false);
    } else if (kind === "ellipse") {
      plotParam(
        function (t) { return 0.5 + 3.5 * Math.cos(t); },
        function (t) { return 3 * Math.sin(t); },
        0, Math.PI * 2, PURPLE, 320
      );
      drawDot(-3, 0, GREEN, false);
      drawDot(4, 0, GREEN, false);
    } else if (kind === "vertical") {
      ctx.save();
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      var a = pt(-1, -2), b = pt(-1, 5);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.restore();
      plotFn(function (x) { return -x + 4; }, -1, e.xmax, TEAL, 140);
      drawDot(-1, 5, AMBER, false);
      drawDot(0, 4, GREEN, false);
      drawDot(4, 0, GREEN, false);
    } else if (kind === "jump") {
      plotFn(function (x) { return Math.sqrt(x + 1) - 0.5; }, -1, 3, TEAL, 160);
      plotFn(function (x) { return Math.sqrt(x - 3) + 2.5; }, 3, e.xmax, AMBER, 160);
      drawDot(3, 1.5, TEAL, true);
      drawDot(3, 2.5, AMBER, false);
      drawDot(-1, 0.5, TEAL, false);
    } else if (kind === "double") {
      plotFn(function (x) { return Math.sqrt(x + 1) - 0.5; }, -1, 3, TEAL, 160);
      plotFn(function (x) { return Math.sqrt(x - 3) + 2.5; }, 3, e.xmax, AMBER, 160);
      drawDot(3, 1.5, CORAL, false);
      drawDot(3, 2.5, CORAL, false);
    } else if (kind === "log") {
      plotFn(function (x) { return Math.log(x - 2); }, 2.02, e.xmax, TEAL, 220);
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = EMPTY;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      a = pt(2, e.ymin); b = pt(2, e.ymax);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.restore();
      drawDot(3, 0, GREEN, false);
    } else if (kind === "rational") {
      plotFn(function (x) { return 1 / (x - 4); }, e.xmin, 3.85, TEAL, 180);
      plotFn(function (x) { return 1 / (x - 4); }, 4.15, e.xmax, TEAL, 180);
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = EMPTY;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      a = pt(4, e.ymin); b = pt(4, e.ymax);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.restore();
      drawDot(4, 0, EMPTY, true);
    }
  }

  function drawVerdictBands(e) {
    var segs = e.bands || [];
    var i, s, col;
    for (i = 0; i < segs.length; i++) {
      s = segs[i];
      if (state.redefineOn && s.redef) col = "rgba(34,197,94,0.55)";
      else if (s.ok) col = "rgba(34,197,94,0.45)";
      else if (s.empty) col = "rgba(100,116,139,0.45)";
      else col = "rgba(239,68,68,0.50)";
      drawBand(s.a, s.b, col);
    }
  }

  function draw() {
    var e = g();
    sizeCanvas();
    drawAxes();
    if (state.bandMode !== "off") drawVerdictBands(e);
    drawGraph(e);
    if (state.showProbe) {
      var eW = world();
      ctx.save();
      ctx.strokeStyle = PROBE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      var p0 = pt(state.t, eW.ymin), p1 = pt(state.t, eW.ymax);
      ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      ctx.restore();
      if (state.showHits) {
        var ys = hitsAt(state.t);
        var many = e.kind === "vertical" && Math.abs(state.t + 1) < 0.05;
        if (many) {
          var yy;
          for (yy = -2; yy <= 5.01; yy += 0.7) drawDot(-1, yy, CORAL, false);
        } else {
          ys.forEach(function (y) {
            drawDot(state.t, y, ys.length === 1 ? GREEN : RED, false);
          });
        }
      }
    }
  }

  function setStepUI(n) {
    if (!stepsList) return;
    var items = stepsList.querySelectorAll("li");
    items.forEach(function (li) {
      var s = parseInt(li.getAttribute("data-step"), 10);
      li.classList.remove("on", "done");
      if (s < n) li.classList.add("done");
      else if (s === n) li.classList.add("on");
    });
  }

  function paintMeta() {
    var e = g();
    if (exprFormula) exprFormula.innerHTML = e.fHtml;
    if (hintMini) hintMini.innerHTML = e.tip || "";
    if (chipBox) chipBox.innerHTML = e.chipsHtml || "";
    if (ruleList) ruleList.innerHTML = e.ruleHtml || "";
    if (loopEl) loopEl.innerHTML = "Gráfico <strong>" + e.id + "</strong> · " + (state.gi + 1) + "/" + graphs.length;
    if (exProgress) {
      var dots = exProgress.querySelectorAll(".ex-dot");
      dots.forEach(function (d, i) {
        d.classList.toggle("on", i === state.gi);
        d.classList.toggle("done", i < state.gi);
      });
    }
  }

  function sweep(fromT, toT, durationMs, onDone) {
    var t0 = null;
    var dur = delay(durationMs);
    function frame(now) {
      if (!state.playing) return;
      if (t0 == null) t0 = now;
      var u = Math.min(1, (now - t0) / dur);
      var ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      state.t = fromT + (toT - fromT) * ease;
      state.showProbe = true;
      state.showHits = true;
      var ys = hitsAt(state.t);
      var n = ys.length;
      var e = g();
      if (e.kind === "vertical" && Math.abs(state.t + 1) < 0.06) n = 9;
      setWork("x = t = <span class=\"hl\">" + fmtNum(state.t) + "</span> · cortes: <span class=\"" + (n === 1 ? "ok" : (n === 0 ? "empty" : "bad")) + "\">" + (n >= 9 ? "∞" : n) + "</span>");
      draw();
      if (u < 1) {
        state.raf = requestAnimationFrame(frame);
      } else {
        state.raf = 0;
        state.t = toT;
        draw();
        if (onDone) onDone();
      }
    }
    state.raf = requestAnimationFrame(frame);
  }

  function playGraph(i, done) {
    if (!state.playing) return;
    state.gi = i;
    var e = g();
    state.t = e.tStart;
    state.showProbe = false;
    state.showHits = false;
    state.bandMode = "full";
    state.redefineOn = false;
    paintMeta();
    setStepUI(1);
    setWork("<span class=\"paso\">Gráfico " + e.id + "</span> · " + e.title);
    setCaption("<span class=\"paso\">Gráfico " + e.id + ":</span> " + e.intro);
    bip(e.isFn ? "ok" : "ok");
    draw();
    later(1100, function () {
      if (!state.playing) return;
      setStepUI(2);
      setCaption("<span class=\"paso\">Prueba vertical:</span> barre x = t · ¿cuántos y hay en cada x?");
      sweep(e.tStart, e.tKey, 2200, function () {
        if (!state.playing) return;
        setStepUI(3);
        var ys = hitsAt(e.tKey);
        var n = ys.length;
        if (e.kind === "vertical") n = 9;
        setWork(e.keyWork);
        setCaption(e.keyCap);
        bip(e.isFn && !e.redef ? "ok" : "bad");
        later(1600, function () {
          if (!state.playing) return;
          setStepUI(4);
          state.showProbe = true;
          state.showHits = true;
          state.t = e.tKey;
          if (e.redef) state.redefineOn = true;
          setWork(e.verdictWork);
          setCaption(e.verdictCap);
          bip(e.isFn ? "ok" : "bad");
          draw();
          later(1700, function () {
            if (!state.playing) return;
            if (done) done();
          });
        });
      });
    });
  }

  function runPlay() {
    if (state.playing) return;
    if (GK.ensureAudio) GK.ensureAudio();
    clearTimers();
    state.playing = true;
    playBtn.disabled = true;
    stopBtn.disabled = false;
    state.gi = 0;
    function next(i) {
      if (!state.playing) return;
      if (i >= graphs.length) {
        state.playing = false;
        playBtn.disabled = false;
        stopBtn.disabled = true;
        setStepUI(5);
        setWork("<span class=\"ok\">Serie " + CFG.series + " lista</span>");
        setCaption(CFG.closeCap);
        bip("ok");
        return;
      }
      playGraph(i, function () { next(i + 1); });
    }
    next(0);
  }

  function stopPlay(msg) {
    clearTimers();
    state.playing = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    if (msg) setCaption(msg);
  }

  function restart() {
    stopPlay();
    state.gi = 0;
    state.t = graphs[0] ? graphs[0].tStart : 0;
    state.showProbe = false;
    state.showHits = false;
    state.redefineOn = false;
    paintMeta();
    setStepUI(0);
    setWork("");
    setCaption(CFG.idleCap);
    draw();
  }

  playBtn.addEventListener("click", runPlay);
  stopBtn.addEventListener("click", function () {
    stopPlay("Detenido · ▶ Play para repetir · o Reiniciar.");
  });
  restartBtn.addEventListener("click", restart);
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
  window.addEventListener("resize", function () { draw(); });

  window[CFG.exportName || "__TP1_FN"] = { graphs: graphs };
  restart();
})();
