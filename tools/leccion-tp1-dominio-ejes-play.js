/*! Campus Ingeniería · TP1 §2 · Dom + interceptos 2.1–2.8. */
(function () {
  "use strict";
  var GK = window.CampusGameKit || {};
  var BLACK = "#111111", GRAPH_BG = "#f8fafc", GRID = "#e2e8f0";
  var TEAL = "#0d9488", GREEN = "#22c55e", AMBER = "#d97706", CORAL = "#e11d48", EMPTY = "#64748b";
  var PAD = { l: 52, r: 36, t: 28, b: 52 };

  var EXAMPLES = [
    {
      id: "2.1", title: "lineal",
      fHtml: "g(x) = −(1/3)x + 1",
      f: function (x) { return -(1 / 3) * x + 1; },
      ok: function () { return true; },
      xmin: -3, xmax: 6, ymin: -2, ymax: 4,
      domainHtml: "Dom(g) = ℝ",
      ix: { x: 3, y: 0, html: "(3; 0)" },
      iy: { x: 0, y: 1, html: "(0; 1)" }
    },
    {
      id: "2.2", title: "racional · dos polos",
      fHtml: "f(x) = (x+1)/(x²−3x+2)",
      f: function (x) { return (x + 1) / ((x - 1) * (x - 2)); },
      ok: function (x) { return Math.abs(x - 1) > 0.06 && Math.abs(x - 2) > 0.06; },
      holes: [1, 2],
      xmin: -2, xmax: 5, ymin: -6, ymax: 6,
      domainHtml: "Dom(f) = ℝ ∖ {1, 2}",
      ix: { x: -1, y: 0, html: "(−1; 0)" },
      iy: { x: 0, y: 0.5, html: "(0; 1/2)" }
    },
    {
      id: "2.3", title: "cuadrática",
      fHtml: "f(x) = −x² − 5",
      f: function (x) { return -x * x - 5; },
      ok: function () { return true; },
      xmin: -4, xmax: 4, ymin: -12, ymax: 2,
      domainHtml: "Dom(f) = ℝ",
      ix: null,
      iy: { x: 0, y: -5, html: "(0; −5)" }
    },
    {
      id: "2.4", title: "racional · den &gt; 0",
      fHtml: "f(x) = (x+1)/(x²+4)",
      f: function (x) { return (x + 1) / (x * x + 4); },
      ok: function () { return true; },
      xmin: -5, xmax: 5, ymin: -0.6, ymax: 0.8,
      domainHtml: "Dom(f) = ℝ",
      ix: { x: -1, y: 0, html: "(−1; 0)" },
      iy: { x: 0, y: 0.25, html: "(0; 1/4)" }
    },
    {
      id: "2.5", title: "raíz · voltea",
      fHtml: "f(x) = √(3−2x)",
      f: function (x) { return x <= 1.5 ? Math.sqrt(3 - 2 * x) : NaN; },
      ok: function (x) { return x <= 1.5 + 1e-9; },
      xmin: -2, xmax: 4, ymin: -1, ymax: 3,
      domainHtml: "Dom(f) = (−∞, 3/2]",
      ix: { x: 1.5, y: 0, html: "(3/2; 0)" },
      iy: { x: 0, y: Math.sqrt(3), html: "(0; √3)" }
    },
    {
      id: "2.6", title: "exponencial",
      fHtml: "f(x) = (1/3)ˣ",
      f: function (x) { return Math.pow(1 / 3, x); },
      ok: function () { return true; },
      xmin: -3, xmax: 4, ymin: -0.4, ymax: 5,
      domainHtml: "Dom(f) = ℝ",
      ix: null,
      iy: { x: 0, y: 1, html: "(0; 1)" }
    },
    {
      id: "2.7", title: "logaritmo",
      fHtml: "f(x) = ln(x)",
      f: function (x) { return Math.log(x); },
      ok: function (x) { return x > 0.02; },
      xmin: -1, xmax: 6, ymin: -3, ymax: 3,
      domainHtml: "Dom(f) = (0, ∞)",
      ix: { x: 1, y: 0, html: "(1; 0)" },
      iy: null,
      asy: 0
    },
    {
      id: "2.8", title: "trasladada de 1/x",
      fHtml: "g(x) = 1/(x−1) − 2",
      f: function (x) { return 1 / (x - 1) - 2; },
      ok: function (x) { return Math.abs(x - 1) > 0.06; },
      holes: [1],
      xmin: -2, xmax: 5, ymin: -5, ymax: 4,
      domainHtml: "Dom(g) = ℝ ∖ {1}",
      ix: { x: 1.5, y: 0, html: "(3/2; 0)" },
      iy: { x: 0, y: -3, html: "(0; −3)" }
    }
  ];

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
  var exProgress = document.getElementById("exProgress");
  var ruleList = document.getElementById("ruleList");

  var state = { playing: false, speedFactor: 1, timers: [], raf: 0, i: 0, showCurve: false, showIx: false, showIy: false, showDom: false };

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
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n)).replace("-", "−");
    return String(Math.round(n * 100) / 100).replace("-", "−");
  }
  function setCaption(html) { captionEl.innerHTML = html; }
  function setWork(html) {
    if (!html) { workPanel.classList.remove("on"); workPanel.innerHTML = ""; return; }
    workPanel.classList.add("on");
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
  function ex() { return EXAMPLES[state.i]; }

  function sizeCanvas() {
    var wrap = document.getElementById("graphWrap");
    var w = Math.max(480, Math.floor((wrap && wrap.clientWidth) || 720));
    var h = Math.max(360, Math.floor(w * 0.70));
    canvas.width = w; canvas.height = h;
  }
  function sx(x) {
    var e = ex();
    return PAD.l + ((x - e.xmin) / (e.xmax - e.xmin)) * (canvas.width - PAD.l - PAD.r);
  }
  function sy(y) {
    var e = ex();
    return PAD.t + ((e.ymax - y) / (e.ymax - e.ymin)) * (canvas.height - PAD.t - PAD.b);
  }

  function drawAxes() {
    var e = ex();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = GRAPH_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    var xi, yi;
    for (xi = Math.ceil(e.xmin); xi <= Math.floor(e.xmax); xi++) {
      ctx.beginPath(); ctx.moveTo(sx(xi), sy(e.ymin)); ctx.lineTo(sx(xi), sy(e.ymax)); ctx.stroke();
    }
    for (yi = Math.ceil(e.ymin); yi <= Math.floor(e.ymax); yi++) {
      ctx.beginPath(); ctx.moveTo(sx(e.xmin), sy(yi)); ctx.lineTo(sx(e.xmax), sy(yi)); ctx.stroke();
    }
    var y0 = e.ymin <= 0 && e.ymax >= 0 ? sy(0) : canvas.height - PAD.b;
    var x0 = e.xmin <= 0 && e.xmax >= 0 ? sx(0) : PAD.l;
    ctx.strokeStyle = BLACK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PAD.l, y0); ctx.lineTo(canvas.width - PAD.r, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, PAD.t); ctx.lineTo(x0, canvas.height - PAD.b); ctx.stroke();
    ctx.fillStyle = BLACK; ctx.font = "600 11px ui-monospace, Menlo, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (xi = Math.ceil(e.xmin); xi <= Math.floor(e.xmax); xi++) {
      if (xi === 0) continue;
      ctx.fillText(String(xi).replace("-", "−"), sx(xi), y0 + 6);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (yi = Math.ceil(e.ymin); yi <= Math.floor(e.ymax); yi++) {
      if (yi === 0) continue;
      ctx.fillText(String(yi).replace("-", "−"), x0 - 6, sy(yi));
    }
  }

  function plot(e) {
    var i, x, y, first = true, n = 320;
    ctx.save();
    ctx.strokeStyle = TEAL; ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.beginPath();
    for (i = 0; i <= n; i++) {
      x = e.xmin + (e.xmax - e.xmin) * (i / n);
      if (!e.ok(x)) { first = true; continue; }
      y = e.f(x);
      if (!isFinite(y) || y < e.ymin - 1 || y > e.ymax + 1) { first = true; continue; }
      if (first) { ctx.moveTo(sx(x), sy(y)); first = false; }
      else ctx.lineTo(sx(x), sy(y));
    }
    ctx.stroke();
    ctx.restore();
    (e.holes || []).forEach(function (h) {
      ctx.save();
      ctx.strokeStyle = EMPTY; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx(h), sy(e.ymin)); ctx.lineTo(sx(h), sy(e.ymax)); ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(sx(h), sy(0), 6, 0, Math.PI * 2);
      ctx.fillStyle = GRAPH_BG; ctx.fill();
      ctx.strokeStyle = EMPTY; ctx.lineWidth = 2.2; ctx.stroke();
    });
    if (e.asy != null) {
      ctx.save();
      ctx.strokeStyle = EMPTY; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx(e.asy), sy(e.ymin)); ctx.lineTo(sx(e.asy), sy(e.ymax)); ctx.stroke();
      ctx.restore();
    }
  }

  function dot(x, y, color, label) {
    ctx.beginPath(); ctx.arc(sx(x), sy(y), 6.5, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = color; ctx.font = "700 12px ui-monospace, Menlo, monospace";
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText(label, sx(x) + 8, sy(y) - 6);
  }

  function draw() {
    var e = ex();
    sizeCanvas();
    drawAxes();
    if (state.showCurve) plot(e);
    if (state.showIx && e.ix) dot(e.ix.x, e.ix.y, AMBER, "∩x " + e.ix.html);
    if (state.showIy && e.iy) dot(e.iy.x, e.iy.y, CORAL, "∩y " + e.iy.html);
  }

  function setStep(n) {
    var items = stepsList.querySelectorAll("li");
    items.forEach(function (li) {
      var s = parseInt(li.getAttribute("data-step"), 10);
      li.classList.remove("on", "done");
      if (s < n) li.classList.add("done");
      else if (s === n) li.classList.add("on");
    });
  }

  function paint() {
    var e = ex();
    exprFormula.innerHTML = "<span class=\"hl\">" + e.id + "</span> · " + e.fHtml;
    hintMini.textContent = e.title;
    loopEl.innerHTML = "Ej. <strong>" + e.id + "</strong>/" + EXAMPLES.length;
    if (exProgress) {
      var dots = exProgress.querySelectorAll(".ex-dot");
      dots.forEach(function (d, i) {
        d.classList.toggle("on", i === state.i);
        d.classList.toggle("done", i < state.i);
      });
    }
    if (ruleList) {
      ruleList.innerHTML = "<li>Dom: <strong class=\"ok\">" + e.domainHtml + "</strong></li>" +
        "<li>∩x: " + (e.ix ? e.ix.html : "<span class=\"empty\">no corta eje X</span>") + "</li>" +
        "<li>∩y: " + (e.iy ? e.iy.html : "<span class=\"empty\">no corta eje Y</span>") + "</li>";
    }
  }

  function playOne(i, done) {
    if (!state.playing) return;
    state.i = i;
    state.showCurve = false; state.showIx = false; state.showIy = false;
    paint(); setStep(1);
    setWork("<span class=\"paso\">" + ex().id + "</span> · " + ex().fHtml);
    setCaption("<span class=\"paso\">" + ex().id + ":</span> primero el dominio, después los cortes con los ejes.");
    bip("ok"); draw();
    later(900, function () {
      if (!state.playing) return;
      state.showCurve = true; setStep(2);
      setWork(ex().domainHtml);
      setCaption("<span class=\"paso\">Dom:</span> " + ex().domainHtml);
      chipBox.innerHTML = "<span class=\"chip green\">" + ex().domainHtml + "</span>";
      bip("ok"); draw();
      later(1100, function () {
        if (!state.playing) return;
        setStep(3); state.showIy = true;
        if (ex().iy) {
          setWork("∩y · x=0 → " + ex().iy.html);
          setCaption("<span class=\"paso\">∩y:</span> x = 0 → " + ex().iy.html);
          bip("ok");
        } else {
          setWork("∩y · <span class=\"empty\">no hay</span> (x=0 fuera de Dom o f(0)≠definido)");
          setCaption("<span class=\"paso\">∩y:</span> no corta el eje Y.");
          bip("bad");
        }
        draw();
        later(1100, function () {
          if (!state.playing) return;
          setStep(4); state.showIx = true;
          if (ex().ix) {
            setWork("∩x · y=0 → " + ex().ix.html);
            setCaption("<span class=\"paso\">∩x:</span> y = 0 → " + ex().ix.html);
            bip("ok");
          } else {
            setWork("∩x · <span class=\"empty\">no hay</span>");
            setCaption("<span class=\"paso\">∩x:</span> la curva no corta el eje X.");
            bip("bad");
          }
          draw();
          later(1200, function () { if (done) done(); });
        });
      });
    });
  }

  function runPlay() {
    if (state.playing) return;
    if (GK.ensureAudio) GK.ensureAudio();
    clearTimers();
    state.playing = true;
    playBtn.disabled = true; stopBtn.disabled = false;
    function next(i) {
      if (!state.playing) return;
      if (i >= EXAMPLES.length) {
        state.playing = false; playBtn.disabled = false; stopBtn.disabled = true;
        setStep(5);
        setWork("<span class=\"ok\">2.1–2.8 listos · Dom + ∩x + ∩y</span>");
        setCaption("<strong>Cierre:</strong> dominio primero · ∩y es f(0) si 0∈Dom · ∩x resuelve f(x)=0 en el Dom.");
        bip("ok");
        return;
      }
      playOne(i, function () { next(i + 1); });
    }
    next(0);
  }

  function stopPlay(msg) {
    clearTimers(); state.playing = false;
    playBtn.disabled = false; stopBtn.disabled = true;
    if (msg) setCaption(msg);
  }
  function restart() {
    stopPlay();
    state.i = 0; state.showCurve = false; state.showIx = false; state.showIy = false;
    paint(); setStep(0); setWork(""); chipBox.innerHTML = "";
    setCaption("Presioná <strong>▶ Play</strong> · 2.1 a 2.8 · Dom + ∩x + ∩y.");
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
  window.__L155 = { EXAMPLES: EXAMPLES };
  restart();
})();
