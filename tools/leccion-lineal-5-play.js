/*! Campus Ingeniería · TP1 §5 lineales 5.1–5.4 · m, b, interceptos, dibujo. */
(function () {
  "use strict";
  var CFG = window.__LINEAL5_CFG__;
  if (!CFG) throw new Error("LINEAL5: falta CFG");
  var GK = window.CampusGameKit || {};
  var BLACK = "#111111", GRAPH_BG = "#f8fafc", GRID = "#e2e8f0";
  var TEAL = "#0d9488", GREEN = "#22c55e", AMBER = "#d97706", CORAL = "#e11d48", RUN = "#2563eb";
  var PAD = { l: 52, r: 40, t: 32, b: 56 };
  var TOTAL = 5;

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
  var stepsList = document.getElementById("stepsList");
  var ruleList = document.getElementById("ruleList");

  var state = {
    playing: false, speedFactor: 1, timers: [], raf: 0, phase: 0,
    showB: false, showM: false, showIy: false, showIx: false, showLine: false, lineT: 0
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
  function fmt(n) {
    if (n == null || !isFinite(n)) return "—";
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n)).replace("-", "−");
    return String(Math.round(n * 100) / 100).replace("-", "−");
  }
  function setCaption(html) { captionEl.innerHTML = html; }
  function setWork(html) {
    if (!html) { workPanel.classList.remove("on"); workPanel.innerHTML = ""; return; }
    workPanel.classList.add("on");
    workPanel.innerHTML = html;
  }
  function bip(ok) {
    if (ok === false) {
      if (GK.playErrorBuzz) GK.playErrorBuzz();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "bad");
    } else {
      if (GK.playOkChime) GK.playOkChime();
      if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
    }
  }
  function setPhase(n) {
    state.phase = n;
    loopEl.innerHTML = "Fase <strong>" + (n || "—") + "</strong>/" + TOTAL;
    var items = stepsList.querySelectorAll("li");
    items.forEach(function (li) {
      var s = parseInt(li.getAttribute("data-step"), 10);
      li.classList.remove("on", "done");
      if (n > 0 && s < n) li.classList.add("done");
      else if (s === n) li.classList.add("on");
    });
  }

  function sizeCanvas() {
    var wrap = document.getElementById("graphWrap");
    var w = Math.max(480, Math.floor((wrap && wrap.clientWidth) || 720));
    var h = Math.max(360, Math.floor(w * 0.70));
    canvas.width = w; canvas.height = h;
  }
  function sx(x) { return PAD.l + ((x - CFG.xmin) / (CFG.xmax - CFG.xmin)) * (canvas.width - PAD.l - PAD.r); }
  function sy(y) { return PAD.t + ((CFG.ymax - y) / (CFG.ymax - CFG.ymin)) * (canvas.height - PAD.t - PAD.b); }

  function f(x) { return CFG.m * x + CFG.b; }

  function drawAxes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = GRAPH_BG; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    var xi, yi;
    for (xi = Math.ceil(CFG.xmin); xi <= Math.floor(CFG.xmax); xi++) {
      ctx.beginPath(); ctx.moveTo(sx(xi), sy(CFG.ymin)); ctx.lineTo(sx(xi), sy(CFG.ymax)); ctx.stroke();
    }
    for (yi = Math.ceil(CFG.ymin); yi <= Math.floor(CFG.ymax); yi++) {
      ctx.beginPath(); ctx.moveTo(sx(CFG.xmin), sy(yi)); ctx.lineTo(sx(CFG.xmax), sy(yi)); ctx.stroke();
    }
    var y0 = CFG.ymin <= 0 && CFG.ymax >= 0 ? sy(0) : canvas.height - PAD.b;
    var x0 = CFG.xmin <= 0 && CFG.xmax >= 0 ? sx(0) : PAD.l;
    ctx.strokeStyle = BLACK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PAD.l, y0); ctx.lineTo(canvas.width - PAD.r, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, PAD.t); ctx.lineTo(x0, canvas.height - PAD.b); ctx.stroke();
    ctx.fillStyle = BLACK; ctx.font = "600 11px ui-monospace, Menlo, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (xi = Math.ceil(CFG.xmin); xi <= Math.floor(CFG.xmax); xi++) {
      if (xi === 0) continue;
      ctx.fillText(String(xi).replace("-", "−"), sx(xi), y0 + 6);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (yi = Math.ceil(CFG.ymin); yi <= Math.floor(CFG.ymax); yi++) {
      if (yi === 0) continue;
      ctx.fillText(String(yi).replace("-", "−"), x0 - 6, sy(yi));
    }
  }

  function drawLine(t) {
    var x0 = CFG.xmin, x1 = CFG.xmin + (CFG.xmax - CFG.xmin) * t;
    ctx.save();
    ctx.strokeStyle = TEAL; ctx.lineWidth = 3.2; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx(x0), sy(f(x0)));
    ctx.lineTo(sx(x1), sy(f(x1)));
    ctx.stroke();
    ctx.restore();
  }

  function dot(x, y, color, label) {
    ctx.beginPath(); ctx.arc(sx(x), sy(y), 6.5, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.4; ctx.stroke();
    if (label) {
      ctx.fillStyle = color; ctx.font = "700 12px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText(label, sx(x) + 8, sy(y) - 6);
    }
  }

  function draw() {
    sizeCanvas();
    drawAxes();
    if (state.showLine) drawLine(state.lineT);
    if (state.showIy) dot(0, CFG.b, AMBER, "b = (0; " + fmt(CFG.b) + ")");
    if (state.showIx && CFG.ix != null) dot(CFG.ix, 0, CORAL, "∩x (" + fmt(CFG.ix) + "; 0)");
    if (state.showM && Math.abs(CFG.m) > 1e-9) {
      var xA = 0, yA = CFG.b, xB = CFG.run, yB = CFG.b + CFG.rise;
      ctx.save();
      ctx.strokeStyle = RUN; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(sx(xA), sy(yA)); ctx.lineTo(sx(xB), sy(yA)); ctx.stroke();
      ctx.strokeStyle = GREEN;
      ctx.beginPath(); ctx.moveTo(sx(xB), sy(yA)); ctx.lineTo(sx(xB), sy(yB)); ctx.stroke();
      ctx.restore();
    }
  }

  function animateLine(done) {
    var t0 = null, dur = delay(900);
    function frame(now) {
      if (!state.playing) return;
      if (t0 == null) t0 = now;
      var u = Math.min(1, (now - t0) / dur);
      state.lineT = u; state.showLine = true;
      draw();
      if (u < 1) state.raf = requestAnimationFrame(frame);
      else { state.raf = 0; state.lineT = 1; if (done) done(); }
    }
    state.raf = requestAnimationFrame(frame);
  }

  function runPlay() {
    if (state.playing) return;
    if (GK.ensureAudio) GK.ensureAudio();
    clearTimers();
    state.playing = true;
    playBtn.disabled = true; stopBtn.disabled = false;
    state.showB = state.showM = state.showIy = state.showIx = state.showLine = false;
    state.lineT = 0;
    setPhase(1);
    exprFormula.innerHTML = "f(x) = <span class=\"hl\">" + CFG.fHtml + "</span>";
    hintMini.textContent = "m y b";
    setWork("<span class=\"paso\">1</span> · f(x) = mx + b");
    setCaption("<span class=\"paso\">1:</span> escribimos la fórmula en forma <span class=\"hl\">pendiente-ordenada</span>.");
    bip(true); draw();
    later(1200, function () {
      if (!state.playing) return;
      setPhase(2); state.showB = true; state.showIy = true;
      exprFormula.innerHTML = "m = <span class=\"hl\">" + CFG.mHtml + "</span> · b = <span class=\"ok\">" + CFG.bHtml + "</span>";
      setWork("b = " + CFG.bHtml + " → ∩y (0; " + fmt(CFG.b) + ")");
      setCaption("<span class=\"paso\">2:</span> la ordenada al origen es b = " + CFG.bHtml + " · punto <span class=\"ok\">(0; " + fmt(CFG.b) + ")</span>.");
      chipBox.innerHTML = "<span class=\"chip amber\">b = " + CFG.bHtml + "</span>";
      bip(true); draw();
      later(1400, function () {
        if (!state.playing) return;
        setPhase(3); state.showM = true;
        setWork("m = " + CFG.mHtml + (Math.abs(CFG.m) < 1e-9 ? " · horizontal" : ""));
        setCaption(CFG.mCap);
        chipBox.innerHTML += "<span class=\"chip teal\">m = " + CFG.mHtml + "</span>";
        bip(true); draw();
        later(1400, function () {
          if (!state.playing) return;
          setPhase(4);
          if (CFG.ix == null) {
            state.showIx = false;
            setWork("∩x · <span class=\"empty\">no hay</span> (m = 0)");
            setCaption("<span class=\"paso\">4:</span> recta horizontal · nunca corta el eje X.");
            bip(false);
          } else {
            state.showIx = true;
            setWork("∩x · (" + fmt(CFG.ix) + "; 0)");
            setCaption("<span class=\"paso\">4:</span> y=0 → x = −b/m = <span class=\"hl\">" + CFG.ixHtml + "</span>.");
            chipBox.innerHTML += "<span class=\"chip coral\">∩x " + CFG.ixHtml + "</span>";
            bip(true);
          }
          draw();
          later(1200, function () {
            if (!state.playing) return;
            setPhase(5);
            animateLine(function () {
              if (!state.playing) return;
              setWork("<span class=\"ok\">y = " + CFG.fHtml + "</span> · Dom = ℝ");
              setCaption("<strong>Cierre " + CFG.sheet + ":</strong> m = " + CFG.mHtml + " · b = " + CFG.bHtml + " · " +
                (CFG.ix == null ? "sin ∩x" : "∩x (" + CFG.ixHtml + "; 0)") + " · ∩y (0; " + fmt(CFG.b) + ").");
              if (ruleList) ruleList.innerHTML = "<li>m = <strong>" + CFG.mHtml + "</strong></li><li>b = <strong class=\"ok\">" + CFG.bHtml + "</strong></li><li>Dom = ℝ</li>";
              bip(true);
              state.playing = false; playBtn.disabled = false; stopBtn.disabled = true;
            });
          });
        });
      });
    });
  }

  function stopPlay(msg) {
    clearTimers(); state.playing = false;
    playBtn.disabled = false; stopBtn.disabled = true;
    if (msg) setCaption(msg);
  }
  function restart() {
    stopPlay();
    state.showB = state.showM = state.showIy = state.showIx = state.showLine = false;
    state.lineT = 0; setPhase(0);
    exprFormula.innerHTML = "f(x) = " + CFG.fHtml;
    hintMini.textContent = "▶ Play · m, b, interceptos, dibujo";
    chipBox.innerHTML = ""; setWork("");
    setCaption(CFG.idleCap);
    if (ruleList) ruleList.innerHTML = "<li>f(x) = mx + b</li><li>∩y = (0; b)</li><li>∩x = (−b/m; 0) si m≠0</li>";
    draw();
  }

  playBtn.addEventListener("click", runPlay);
  stopBtn.addEventListener("click", function () { stopPlay("Detenido · ▶ Play para repetir."); });
  restartBtn.addEventListener("click", restart);
  slowBtn.addEventListener("click", function () {
    if (state.speedFactor === 1) {
      state.speedFactor = 1.85; slowBtn.classList.add("on"); slowBtn.setAttribute("aria-pressed", "true"); slowBtn.textContent = "Lento ✓";
    } else {
      state.speedFactor = 1; slowBtn.classList.remove("on"); slowBtn.setAttribute("aria-pressed", "false"); slowBtn.textContent = "Lento";
    }
  });
  window.addEventListener("resize", draw);
  window[CFG.exportName || "__LINEAL5"] = CFG;
  restart();
})();
