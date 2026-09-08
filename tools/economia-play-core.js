/*! Campus Ingeniería · economía Play core (axes, play toolbar, phases). No deps, no CDN. */
(function (global) {
  "use strict";

  var COLORS = {
    black: "#111111",
    grid: "#e2e8f0",
    bg: "#f8fafc",
    ink: "#0f172a",
    muted: "#64748b",
    oferta: "#16a34a",
    demanda: "#e11d48",
    costo: "#d97706",
    ingreso: "#0d9488",
    beneficio: "#7c3aed",
    amber: "#d97706",
    teal: "#0d9488",
    coral: "#e11d48",
    green: "#16a34a",
    purple: "#7c3aed",
    blue: "#2563eb",
    empty: "#64748b"
  };

  function fmtNum(n, digits) {
    if (n == null || (typeof n === "number" && !isFinite(n))) return "—";
    if (Object.is(n, -0) || Math.abs(n) < 1e-12) return "0";
    var d = digits == null ? 2 : digits;
    var r = Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
    if (Math.abs(r - Math.round(r)) < Math.pow(10, -Math.max(d, 1)) / 2) {
      return String(Math.round(r)).replace(/-/g, "−");
    }
    var s = r.toFixed(d).replace(/\.?0+$/, "");
    return s.replace("-", "−").replace(".", ",");
  }

  function fmtAxis(n) {
    var a = Math.abs(n);
    if (a >= 1000000) return fmtNum(n / 1000000, 1) + "M";
    if (a >= 10000) return fmtNum(n / 1000, 0) + "k";
    if (a >= 1000) return fmtNum(n / 1000, 1) + "k";
    return fmtNum(n, Math.abs(n - Math.round(n)) < 1e-9 ? 0 : 1);
  }

  function Graph(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.world = world || {};
    this.pad = this.world.pad || { l: 58, r: 32, t: 30, b: 50 };
  }

  Graph.prototype.setWorld = function (world) {
    var k;
    for (k in world) if (Object.prototype.hasOwnProperty.call(world, k)) this.world[k] = world[k];
  };

  Graph.prototype.size = function () {
    var wrap = document.getElementById("graphWrap");
    var w = Math.max(480, Math.floor((wrap && wrap.clientWidth) || 720));
    var h = Math.max(360, Math.floor(w * 0.70));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  };

  Graph.prototype.sx = function (x) {
    var W = this.canvas.width - this.pad.l - this.pad.r;
    var xmin = this.world.xmin, xmax = this.world.xmax;
    return this.pad.l + ((x - xmin) / (xmax - xmin)) * W;
  };

  Graph.prototype.sy = function (y) {
    var H = this.canvas.height - this.pad.t - this.pad.b;
    var ymin = this.world.ymin, ymax = this.world.ymax;
    return this.pad.t + ((ymax - y) / (ymax - ymin)) * H;
  };

  Graph.prototype.pt = function (x, y) {
    return { x: this.sx(x), y: this.sy(y) };
  };

  Graph.prototype.clear = function () {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  };

  Graph.prototype.drawAxes = function () {
    var ctx = this.ctx;
    var w = this.world;
    var xmin = w.xmin, xmax = w.xmax, ymin = w.ymin, ymax = w.ymax;
    var pad = this.pad;
    var xFmt = w.xFmt || fmtAxis;
    var yFmt = w.yFmt || fmtAxis;
    var xi, yi, p0, p1;

    this.clear();
    ctx.save();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    var xTicks = w.xTicks;
    var yTicks = w.yTicks;
    if (!xTicks) {
      xTicks = [];
      for (xi = Math.ceil(xmin - 1e-9); xi <= Math.floor(xmax + 1e-9); xi++) xTicks.push(xi);
    }
    if (!yTicks) {
      yTicks = [];
      for (yi = Math.ceil(ymin - 1e-9); yi <= Math.floor(ymax + 1e-9); yi++) yTicks.push(yi);
    }
    for (xi = 0; xi < xTicks.length; xi++) {
      p0 = this.pt(xTicks[xi], ymin);
      p1 = this.pt(xTicks[xi], ymax);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    for (yi = 0; yi < yTicks.length; yi++) {
      p0 = this.pt(xmin, yTicks[yi]);
      p1 = this.pt(xmax, yTicks[yi]);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }

    var yAxisX = xmin <= 0 && xmax >= 0 ? this.sx(0) : pad.l;
    var xAxisY = ymin <= 0 && ymax >= 0 ? this.sy(0) : this.canvas.height - pad.b;
    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad.l, xAxisY);
    ctx.lineTo(this.canvas.width - pad.r, xAxisY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(yAxisX, pad.t);
    ctx.lineTo(yAxisX, this.canvas.height - pad.b);
    ctx.stroke();

    ctx.fillStyle = COLORS.black;
    ctx.font = "600 11px ui-monospace, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (xi = 0; xi < xTicks.length; xi++) {
      if (Math.abs(xTicks[xi]) < 1e-12) continue;
      var sx = this.sx(xTicks[xi]);
      ctx.strokeStyle = COLORS.black;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, xAxisY - 4);
      ctx.lineTo(sx, xAxisY + 4);
      ctx.stroke();
      ctx.fillStyle = COLORS.black;
      ctx.fillText(xFmt(xTicks[xi]), sx, xAxisY + 8);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (yi = 0; yi < yTicks.length; yi++) {
      if (Math.abs(yTicks[yi]) < 1e-12) continue;
      var sy = this.sy(yTicks[yi]);
      ctx.strokeStyle = COLORS.black;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(yAxisX - 4, sy);
      ctx.lineTo(yAxisX + 4, sy);
      ctx.stroke();
      ctx.fillStyle = COLORS.black;
      ctx.fillText(yFmt(yTicks[yi]), yAxisX - 8, sy);
    }

    ctx.fillStyle = COLORS.black;
    ctx.font = "700 13px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(w.xlabel || "x", this.canvas.width - pad.r - 8, Math.min(this.canvas.height - 14, xAxisY + 18));
    ctx.textBaseline = "top";
    ctx.fillText(w.ylabel || "y", Math.max(8, yAxisX + 8), pad.t + 4);
    ctx.restore();
  };

  Graph.prototype.plotFn = function (fn, x0, x1, style) {
    var ctx = this.ctx;
    var st = style || {};
    var steps = st.steps || 280;
    var i, x, y, p, first = true;
    var ymin = this.world.ymin, ymax = this.world.ymax;
    ctx.save();
    ctx.globalAlpha = st.alpha == null ? 1 : st.alpha;
    ctx.strokeStyle = st.color || COLORS.blue;
    ctx.lineWidth = st.lw || 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (st.dash) ctx.setLineDash(st.dash);
    ctx.beginPath();
    for (i = 0; i <= steps; i++) {
      x = x0 + (x1 - x0) * (i / steps);
      y = fn(x);
      if (y == null || !isFinite(y) || y < ymin - (ymax - ymin) * 0.2 || y > ymax + (ymax - ymin) * 0.2) {
        first = true;
        continue;
      }
      p = this.pt(x, y);
      if (first) { ctx.moveTo(p.x, p.y); first = false; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  };

  Graph.prototype.segment = function (x1, y1, x2, y2, style) {
    var ctx = this.ctx;
    var st = style || {};
    var a = this.pt(x1, y1), b = this.pt(x2, y2);
    ctx.save();
    ctx.globalAlpha = st.alpha == null ? 1 : st.alpha;
    ctx.strokeStyle = st.color || COLORS.blue;
    ctx.lineWidth = st.lw || 3.2;
    ctx.lineCap = "round";
    if (st.dash) ctx.setLineDash(st.dash);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  };

  Graph.prototype.polyline = function (pts, style) {
    if (!pts || pts.length < 2) return;
    var ctx = this.ctx;
    var st = style || {};
    var i, p;
    ctx.save();
    ctx.globalAlpha = st.alpha == null ? 1 : st.alpha;
    ctx.strokeStyle = st.color || COLORS.blue;
    ctx.lineWidth = st.lw || 3.2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (st.dash) ctx.setLineDash(st.dash);
    ctx.beginPath();
    p = this.pt(pts[0][0], pts[0][1]);
    ctx.moveTo(p.x, p.y);
    for (i = 1; i < pts.length; i++) {
      p = this.pt(pts[i][0], pts[i][1]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  };

  Graph.prototype.point = function (x, y, style) {
    var ctx = this.ctx;
    var st = style || {};
    var p = this.pt(x, y);
    var r = st.r || 7;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    if (st.open) {
      ctx.fillStyle = COLORS.bg;
      ctx.fill();
      ctx.strokeStyle = st.color || COLORS.empty;
      ctx.lineWidth = 2.6;
      ctx.stroke();
    } else {
      ctx.fillStyle = st.color || COLORS.green;
      ctx.fill();
      ctx.strokeStyle = st.stroke || "#0f172a";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.restore();
  };

  Graph.prototype.vLine = function (x, style) {
    this.segment(x, this.world.ymin, x, this.world.ymax, style || { color: COLORS.empty, lw: 1.4, dash: [5, 5], alpha: 0.75 });
  };

  Graph.prototype.hLine = function (y, style) {
    this.segment(this.world.xmin, y, this.world.xmax, y, style || { color: COLORS.empty, lw: 1.4, dash: [5, 5], alpha: 0.75 });
  };

  Graph.prototype.label = function (x, y, text, style) {
    var ctx = this.ctx;
    var st = style || {};
    var p = this.pt(x, y);
    ctx.save();
    ctx.fillStyle = st.color || COLORS.ink;
    ctx.font = st.font || "700 12px ui-monospace, Menlo, monospace";
    ctx.textAlign = st.align || "left";
    ctx.textBaseline = st.baseline || "bottom";
    ctx.fillText(text, p.x + (st.dx || 8), p.y + (st.dy || -8));
    ctx.restore();
  };

  Graph.prototype.badge = function (text, style) {
    var ctx = this.ctx;
    var st = style || {};
    var x = st.x == null ? this.pad.l + 10 : st.x;
    var y = st.y == null ? this.pad.t + 10 : st.y;
    ctx.save();
    ctx.font = "700 13px Segoe UI, system-ui, sans-serif";
    var tw = ctx.measureText(text).width + 18;
    ctx.fillStyle = st.bg || "rgba(15,23,42,0.88)";
    ctx.strokeStyle = st.border || "#334155";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    ctx.arcTo(x + tw, y, x + tw, y + 26, 8);
    ctx.arcTo(x + tw, y + 26, x, y + 26, 8);
    ctx.arcTo(x, y + 26, x, y, 8);
    ctx.arcTo(x, y, x + tw, y, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = st.color || "#e2e8f0";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + 9, y + 13);
    ctx.restore();
  };

  Graph.prototype.bandX = function (a, b, style) {
    var ctx = this.ctx;
    var st = style || {};
    var p0 = this.pt(a, this.world.ymin);
    var p1 = this.pt(b, this.world.ymax);
    ctx.save();
    ctx.fillStyle = st.color || "rgba(34,197,94,0.12)";
    ctx.fillRect(p0.x, p1.y, p1.x - p0.x, p0.y - p1.y);
    ctx.restore();
  };

  function markSteps(n) {
    var list = document.getElementById("stepsList");
    if (!list) return;
    var lis = list.querySelectorAll("li");
    var i, s;
    for (i = 0; i < lis.length; i++) {
      s = parseInt(lis[i].getAttribute("data-step"), 10);
      lis[i].classList.remove("on", "done");
      if (n > 0 && s < n) lis[i].classList.add("done");
      else if (s === n) lis[i].classList.add("on");
    }
  }

  function markTerms(ids) {
    var nodes = document.querySelectorAll("[data-term]");
    var i, id, on;
    var set = {};
    ids = ids || [];
    for (i = 0; i < ids.length; i++) set[ids[i]] = true;
    for (i = 0; i < nodes.length; i++) {
      id = nodes[i].getAttribute("data-term");
      on = !!set[id];
      nodes[i].classList.toggle("on", on);
    }
  }

  function bindPlay(opts) {
    var GK = global.CampusGameKit || {};
    var playBtn = document.getElementById("playBtn");
    var stopBtn = document.getElementById("stopBtn");
    var slowBtn = document.getElementById("slowBtn");
    var restartBtn = document.getElementById("restartBtn");
    var loopEl = document.getElementById("loopEl");
    var captionEl = document.getElementById("caption");
    var workPanel = document.getElementById("workPanel");
    var soundMeter = document.getElementById("soundMeter");
    var total = opts.totalPhases || 1;

    var api = {
      playing: false,
      speedFactor: 1,
      timers: [],
      raf: 0,
      phase: 0,
      vis: {},
      total: total
    };

    api.delay = function (ms) { return ms * (api.speedFactor || 1); };
    api.clearTimers = function () {
      api.timers.forEach(function (id) { clearTimeout(id); });
      api.timers = [];
      if (api.raf) { cancelAnimationFrame(api.raf); api.raf = 0; }
    };
    api.later = function (ms, fn) {
      var id = setTimeout(fn, api.delay(ms));
      api.timers.push(id);
      return id;
    };
    api.setCaption = function (html) { if (captionEl) captionEl.innerHTML = html; };
    api.setWork = function (html) {
      if (!workPanel) return;
      if (!html) { workPanel.classList.remove("on"); workPanel.innerHTML = ""; return; }
      workPanel.classList.add("on");
      workPanel.innerHTML = html;
    };
    api.bip = function (kind) {
      if (kind === "bad" || kind === "boom") {
        if (kind === "boom" && GK.playExplosion) GK.playExplosion();
        else if (GK.playErrorBuzz) GK.playErrorBuzz();
        if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, kind === "boom" ? "boom" : "bad");
      } else {
        if (GK.playOkChime) GK.playOkChime();
        if (GK.pulseSoundMeter) GK.pulseSoundMeter(soundMeter, "ok");
      }
    };
    api.setPhase = function (n, extras) {
      api.phase = n;
      if (loopEl) loopEl.innerHTML = "Fase <strong>" + (n || "—") + "</strong>/" + api.total;
      markSteps(n);
      if (extras && extras.terms) markTerms(extras.terms);
      if (opts.onPhase) opts.onPhase(n, api);
    };
    api.draw = function () { if (opts.draw) opts.draw(api); };
    api.resetVis = function () {
      api.vis = opts.idleVis ? JSON.parse(JSON.stringify(opts.idleVis)) : {};
      api.phase = 0;
      markSteps(0);
      markTerms([]);
      if (loopEl) loopEl.innerHTML = "Fase <strong>—</strong>/" + api.total;
    };

    function stopPlay(msg) {
      api.clearTimers();
      api.playing = false;
      if (playBtn) playBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
      if (msg) api.setCaption(msg);
    }

    function runPlay() {
      if (api.playing) return;
      if (GK.ensureAudio) GK.ensureAudio();
      api.clearTimers();
      api.playing = true;
      if (playBtn) playBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;
      api.resetVis();
      if (opts.reset) opts.reset(api);
      api.draw();
      opts.run(api);
    }

    function restart() {
      stopPlay();
      api.resetVis();
      if (opts.reset) opts.reset(api);
      api.setWork("");
      api.setCaption(opts.idleCaption || "Presioná <strong>▶ Play</strong> para arrancar.");
      api.draw();
    }

    if (playBtn) playBtn.addEventListener("click", runPlay);
    if (stopBtn) stopBtn.addEventListener("click", function () {
      stopPlay("Detenido · ▶ Play para repetir · o Reiniciar.");
    });
    if (restartBtn) restartBtn.addEventListener("click", restart);
    if (slowBtn) slowBtn.addEventListener("click", function () {
      if (api.speedFactor === 1) {
        api.speedFactor = 1.85;
        slowBtn.classList.add("on");
        slowBtn.setAttribute("aria-pressed", "true");
        slowBtn.textContent = "Lento ✓";
      } else {
        api.speedFactor = 1;
        slowBtn.classList.remove("on");
        slowBtn.setAttribute("aria-pressed", "false");
        slowBtn.textContent = "Lento";
      }
    });

    global.addEventListener("resize", function () { api.draw(); });
    api.finish = function (htmlCap, htmlWork) {
      api.playing = false;
      if (playBtn) playBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
      if (htmlWork) api.setWork(htmlWork);
      if (htmlCap) api.setCaption(htmlCap);
      api.bip("ok");
    };
    api.stopPlay = stopPlay;
    api.restart = restart;
    api.runSequence = function (steps, done) {
      function next(i) {
        if (!api.playing) return;
        if (i >= steps.length) {
          if (done) done(api);
          return;
        }
        var s = steps[i];
        if (s.phase != null) api.setPhase(s.phase, { terms: s.terms });
        else if (s.terms) markTerms(s.terms);
        if (s.vis) {
          var k;
          for (k in s.vis) if (Object.prototype.hasOwnProperty.call(s.vis, k)) api.vis[k] = s.vis[k];
        }
        if (s.work != null) api.setWork(s.work);
        if (s.cap != null) api.setCaption(s.cap);
        if (s.html && s.html.id && s.html.value != null) {
          var el = document.getElementById(s.html.id);
          if (el) el.innerHTML = s.html.value;
        }
        if (s.htmls) {
          s.htmls.forEach(function (h) {
            var node = document.getElementById(h.id);
            if (node) node.innerHTML = h.value;
          });
        }
        if (s.hint != null) {
          var hm = document.getElementById("hintMini");
          if (hm) hm.textContent = s.hint;
        }
        api.draw();
        if (s.silent) { /* no chime */ }
        else api.bip(s.bip || "ok");
        api.later(s.wait == null ? 1400 : s.wait, function () { next(i + 1); });
      }
      next(0);
    };
    restart();
    return api;
  }

  global.EconomiaPlay = {
    COLORS: COLORS,
    fmtNum: fmtNum,
    fmtAxis: fmtAxis,
    Graph: Graph,
    bindPlay: bindPlay,
    markSteps: markSteps,
    markTerms: markTerms
  };
})(typeof window !== "undefined" ? window : this);
