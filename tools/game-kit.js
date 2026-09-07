/*! Campus Ingeniería · shared game kit (AudioContext SFX, confetti, sound meter). No deps, no CDN. */
(function (global) {
  "use strict";

  var audioCtx = null;
  var confettiRaf = null;
  var meterTimers = new WeakMap();
  var stylesInjected = false;

  var METER_CSS =
    ".campus-gk-meter{margin:10px 0 0;display:flex;align-items:flex-end;justify-content:flex-end;" +
    "gap:5px;min-height:28px;padding:6px 10px;color:#8b9bb4;font-size:.8rem;font-weight:700;" +
    "user-select:none;background:#121a27;border:1px solid #2a3548;border-radius:999px;" +
    "width:fit-content;margin-left:auto}" +
    ".campus-gk-meter .sound-meter-label{margin-right:6px;line-height:20px;opacity:.9}" +
    ".campus-gk-meter .sound-bar{display:inline-block;width:5px;height:8px;border-radius:2px;" +
    "background:#3b4a63;transition:height .08s ease,background .08s ease}" +
    ".campus-gk-meter.live .sound-bar{background:#FFBF00;box-shadow:0 0 6px rgba(255,191,0,.45)}" +
    ".campus-gk-meter.live.ok .sound-bar{background:#5ad4a8;box-shadow:0 0 6px rgba(90,212,168,.4)}" +
    ".campus-gk-meter.live.bad .sound-bar{background:#ff7b7b;box-shadow:0 0 6px rgba(255,123,123,.4)}" +
    ".campus-gk-meter .sound-meter-level{margin-left:6px;min-width:4.5em;text-align:left;line-height:18px}" +
    ".campus-gk-meter.live .sound-meter-level{color:#e9eef7}";

  function ensureAudio() {
    if (!audioCtx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function resolveMeter(rootEl) {
    if (!rootEl) return null;
    var meter = rootEl.classList && (rootEl.classList.contains("sound-meter") || rootEl.classList.contains("campus-gk-meter"))
      ? rootEl
      : rootEl.querySelector && (rootEl.querySelector(".sound-meter") || rootEl.querySelector(".campus-gk-meter") || rootEl.querySelector("#soundMeter"));
    if (!meter) meter = rootEl;
    var bars = meter.querySelectorAll ? Array.prototype.slice.call(meter.querySelectorAll(".sound-bar")) : [];
    var level = meter.querySelector ? (meter.querySelector("#soundMeterLevel") || meter.querySelector(".sound-meter-level")) : null;
    return { meter: meter, bars: bars, level: level };
  }

  function pulseSoundMeter(rootEl, kind) {
    var r = resolveMeter(rootEl);
    if (!r || !r.meter || !r.bars.length) return;
    var prev = meterTimers.get(r.meter);
    if (prev) { clearInterval(prev); meterTimers.delete(r.meter); }
    r.meter.classList.add("live");
    r.meter.classList.toggle("ok", kind === "ok");
    r.meter.classList.toggle("bad", kind === "bad" || kind === "error");
    if (r.level) {
      r.level.textContent = kind === "ok" ? "Sonido: chime"
        : (kind === "bad" || kind === "error" ? "Sonido: buzz"
          : (kind === "boom" ? "Sonido: boom" : "Sonido: on"));
    }
    var n = 0;
    var peak = kind === "ok" ? [10, 16, 22, 16, 10] : [18, 12, 22, 10, 16];
    function paint(on) {
      r.bars.forEach(function (bar, i) {
        bar.style.height = (on ? peak[i] : 6) + "px";
        bar.style.opacity = on ? "1" : "0.35";
      });
      r.meter.classList.toggle("live", on);
    }
    paint(true);
    var timer = setInterval(function () {
      n++;
      var on = (n % 2 === 0);
      paint(on || n >= 5);
      if (n >= 5) {
        clearInterval(timer);
        meterTimers.delete(r.meter);
        setTimeout(function () {
          paint(false);
          r.meter.classList.remove("live", "ok", "bad");
          r.bars.forEach(function (bar) { bar.style.height = "8px"; bar.style.opacity = "1"; });
          if (r.level) r.level.textContent = "Sonido: off";
        }, 280);
      }
    }, 220);
    meterTimers.set(r.meter, timer);
  }

  function injectMeterStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var s = document.createElement("style");
    s.id = "campus-gk-meter-css";
    s.textContent = METER_CSS;
    document.head.appendChild(s);
  }

  function mountSoundMeter(parent) {
    if (!parent) return null;
    injectMeterStyles();
    var existing = parent.querySelector && parent.querySelector(".sound-meter, .campus-gk-meter, #soundMeter");
    if (existing) return existing;
    var el = document.createElement("div");
    el.className = "sound-meter campus-gk-meter";
    el.id = "soundMeter";
    el.setAttribute("aria-live", "polite");
    el.title = "Indicador de sonido del juego";
    el.innerHTML =
      '<span class="sound-meter-label" aria-hidden="true">♪</span>' +
      '<span class="sound-bar" data-i="0"></span>' +
      '<span class="sound-bar" data-i="1"></span>' +
      '<span class="sound-bar" data-i="2"></span>' +
      '<span class="sound-bar" data-i="3"></span>' +
      '<span class="sound-bar" data-i="4"></span>' +
      '<span class="sound-meter-level" id="soundMeterLevel">Sonido: off</span>';
    parent.appendChild(el);
    return el;
  }

  function playOkChime() {
    var ac = ensureAudio();
    if (!ac) return;
    var t0 = ac.currentTime;
    [523.25, 659.25, 783.99].forEach(function (f, i) {
      var osc = ac.createOscillator();
      var g = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      var t = t0 + i * 0.05;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(g); g.connect(ac.destination);
      osc.start(t); osc.stop(t + 0.24);
    });
  }

  function playErrorBuzz() {
    var ac = ensureAudio();
    if (!ac) return;
    var t0 = ac.currentTime;
    var bufLen = Math.floor(ac.sampleRate * 0.16);
    var buffer = ac.createBuffer(1, bufLen, ac.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufLen; i++) {
      var env = Math.pow(1 - i / bufLen, 1.4);
      data[i] = (Math.random() * 2 - 1) * env * 0.35;
    }
    var noise = ac.createBufferSource();
    noise.buffer = buffer;
    var filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 280;
    filter.Q.value = 1.2;
    var gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.55, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    noise.connect(filter); filter.connect(gain); gain.connect(ac.destination);
    noise.start(t0); noise.stop(t0 + 0.17);
    var osc = ac.createOscillator();
    var og = ac.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(110, t0);
    osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.12);
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    osc.connect(og); og.connect(ac.destination);
    osc.start(t0); osc.stop(t0 + 0.15);
  }

  function playExplosion() {
    var ac = ensureAudio();
    if (!ac) return;
    var t0 = ac.currentTime;
    var bufLen = Math.floor(ac.sampleRate * 0.28);
    var buffer = ac.createBuffer(1, bufLen, ac.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufLen; i++) {
      var env = Math.pow(1 - i / bufLen, 1.8);
      data[i] = (Math.random() * 2 - 1) * env * 0.85;
    }
    var noise = ac.createBufferSource();
    noise.buffer = buffer;
    var filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, t0);
    filter.frequency.exponentialRampToValueAtTime(180, t0 + 0.25);
    filter.Q.value = 0.7;
    var gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.75, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    noise.connect(filter); filter.connect(gain); gain.connect(ac.destination);
    noise.start(t0); noise.stop(t0 + 0.3);

    var boom = ac.createOscillator();
    var bg = ac.createGain();
    boom.type = "sine";
    boom.frequency.setValueAtTime(95, t0);
    boom.frequency.exponentialRampToValueAtTime(32, t0 + 0.32);
    bg.gain.setValueAtTime(0.0001, t0);
    bg.gain.exponentialRampToValueAtTime(0.55, t0 + 0.01);
    bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    boom.connect(bg); bg.connect(ac.destination);
    boom.start(t0); boom.stop(t0 + 0.36);

    var click = ac.createOscillator();
    var cg = ac.createGain();
    click.type = "triangle";
    click.frequency.setValueAtTime(220, t0);
    click.frequency.exponentialRampToValueAtTime(60, t0 + 0.08);
    cg.gain.setValueAtTime(0.0001, t0);
    cg.gain.exponentialRampToValueAtTime(0.22, t0 + 0.005);
    cg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    click.connect(cg); cg.connect(ac.destination);
    click.start(t0); click.stop(t0 + 0.1);
  }

  function fireConfetti(canvasEl) {
    if (!canvasEl) return;
    var confettiCtx = canvasEl.getContext("2d");
    if (!confettiCtx) return;
    var parent = canvasEl.parentElement;
    var w = canvasEl.width = parent ? (parent.clientWidth || 720) : 720;
    var h = canvasEl.height = parent ? (parent.clientHeight || 560) : 560;
    var colors = ["#FFBF00", "#ff5c5c", "#34d399", "#c084fc", "#60a5fa", "#f472b6", "#fbbf24"];
    var parts = [];
    for (var i = 0; i < 90; i++) {
      parts.push({
        x: w * 0.5 + (Math.random() - 0.5) * w * 0.35,
        y: h * 0.25 + Math.random() * h * 0.15,
        vx: (Math.random() - 0.5) * 9,
        vy: Math.random() * -7 - 2,
        g: 0.22 + Math.random() * 0.12,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        w: 5 + Math.random() * 5,
        h: 3 + Math.random() * 4,
        color: colors[(Math.random() * colors.length) | 0],
        life: 55 + ((Math.random() * 25) | 0)
      });
    }
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    function frame() {
      confettiCtx.clearRect(0, 0, w, h);
      var alive = 0;
      for (var j = 0; j < parts.length; j++) {
        var p = parts[j];
        if (p.life <= 0) continue;
        alive++;
        p.life--;
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rot);
        confettiCtx.globalAlpha = Math.max(0, p.life / 40);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
      }
      if (alive > 0) confettiRaf = requestAnimationFrame(frame);
      else { confettiCtx.clearRect(0, 0, w, h); confettiRaf = null; }
    }
    confettiRaf = requestAnimationFrame(frame);
  }

  /** Optional: update toolbar score chips. els = { ok, bad, round, streak } (elements or selectors). */
  function scoreChips(els, state) {
    if (!els || !state) return;
    function set(el, label, n) {
      if (!el) return;
      var node = typeof el === "string" ? document.querySelector(el) : el;
      if (!node) return;
      node.innerHTML = label + " <strong>" + n + "</strong>";
    }
    if ("ok" in state) set(els.ok, "Aciertos", state.ok);
    if ("bad" in state) set(els.bad, "Errores", state.bad);
    if ("round" in state) set(els.round, "Ronda", state.round);
    if ("streak" in state) set(els.streak, "Racha", state.streak);
  }

  global.CampusGameKit = {
    ensureAudio: ensureAudio,
    playOkChime: playOkChime,
    playErrorBuzz: playErrorBuzz,
    playExplosion: playExplosion,
    pulseSoundMeter: pulseSoundMeter,
    mountSoundMeter: mountSoundMeter,
    fireConfetti: fireConfetti,
    scoreChips: scoreChips
  };
})(typeof window !== "undefined" ? window : this);
