/*! Campus Ingeniería · L200 · barras de explicación + subtítulos sincronizados. */
(function (global) {
  "use strict";

  var HINT_NO_AUDIO = "Sin audio aún";
  var DEFAULT_BASE = "audio/l200";
  var AUDIO_ICON = {
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    vol: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
    mute: "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
  };

  function firstDefined() {
    var i;
    for (i = 0; i < arguments.length; i++) {
      if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== "") {
        return arguments[i];
      }
    }
    return undefined;
  }

  function parseClock(raw) {
    var parts = String(raw).trim().replace(/,/g, ".").split(":");
    var sec = 0;
    var i;
    for (i = 0; i < parts.length; i++) {
      sec = sec * 60 + (parseFloat(parts[i]) || 0);
    }
    return sec;
  }

  function parseTime(value, unitHint) {
    if (value == null || value === "") return NaN;
    if (typeof value === "object") {
      if (isFinite(value.seconds)) {
        return Number(value.seconds) + (Number(value.nanos) || 0) / 1e9;
      }
      if (value.value != null) return parseTime(value.value, unitHint);
      return NaN;
    }
    var n;
    if (typeof value === "string") {
      var s = value.trim();
      if (/^\d{1,2}:\d{2}(:\d{2})?([.,]\d+)?$/.test(s)) return parseClock(s);
      s = s.replace(/,/g, ".").replace(/s$/i, "");
      n = parseFloat(s);
    } else {
      n = Number(value);
    }
    if (!isFinite(n)) return NaN;
    return unitHint === "ms" ? n / 1000 : n;
  }

  function pickText(obj) {
    if (obj == null) return "";
    if (typeof obj === "string") return obj.trim();
    var text = firstDefined(obj.text, obj.transcript, obj.line, obj.content, obj.word, obj.value);
    if (text && typeof text === "object" && Array.isArray(text) === false) {
      text = firstDefined(text.value, text.text);
    }
    if (Array.isArray(obj.alternatives) && obj.alternatives[0]) {
      text = firstDefined(text, obj.alternatives[0].transcript, obj.alternatives[0].text);
    }
    return text == null ? "" : String(text).replace(/^\s+|\s+$/g, "");
  }

  function fieldLooksMs(name) {
    return /(_ms|Ms|millis|milliseconds)$/.test(name || "");
  }

  function normalizeWords(list, unitHint) {
    if (!Array.isArray(list)) return [];
    var out = [];
    var i;
    for (i = 0; i < list.length; i++) {
      var word = normalizeCueItem(list[i], unitHint);
      if (word && word.text) out.push(word);
    }
    return out;
  }

  function normalizeCueItem(item, unitHint) {
    if (item == null) return null;
    if (typeof item === "string") {
      var t = item.trim();
      return t ? { start: 0, end: NaN, text: t, words: [] } : null;
    }
    var startRaw = firstDefined(item.start, item.startTime, item.start_time, item.from, item.begin, item.t0, item.offset);
    var startMs = firstDefined(item.start_ms, item.startMs, item.startMillis);
    var endRaw = firstDefined(item.end, item.endTime, item.end_time, item.to, item.finish, item.t1);
    var endMs = firstDefined(item.end_ms, item.endMs, item.endMillis);
    var durRaw = firstDefined(item.duration, item.dur, item.duration_ms, item.durationMs);
    var startHint = unitHint;
    var endHint = unitHint;
    if (startRaw === undefined && startMs !== undefined) {
      startRaw = startMs;
      startHint = "ms";
    }
    if (endRaw === undefined && endMs !== undefined) {
      endRaw = endMs;
      endHint = "ms";
    }
    var start = parseTime(startRaw, startHint);
    var end = parseTime(endRaw, endHint);
    if (!isFinite(end) && durRaw != null) {
      var durHint = fieldLooksMs("duration_ms") || fieldLooksMs("durationMs") || unitHint === "ms" ? "ms" : unitHint;
      if (item.duration_ms != null || item.durationMs != null) durHint = "ms";
      var dur = parseTime(durRaw, durHint);
      if (isFinite(start) && isFinite(dur)) end = start + dur;
    }
    var text = pickText(item);
    if (!text && !isFinite(start)) return null;
    var words = normalizeWords(item.words || item.tokens, unitHint);
    return { start: start, end: end, text: text, words: words };
  }

  function extractCueList(raw) {
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== "object") return [];
    var keys = ["cues", "segments", "subtitles", "items", "utterances", "chunks"];
    var i;
    for (i = 0; i < keys.length; i++) {
      if (Array.isArray(raw[keys[i]])) return raw[keys[i]];
    }
    if (raw.transcription && Array.isArray(raw.transcription.segments)) {
      return raw.transcription.segments;
    }
    if (Array.isArray(raw.results)) return raw.results;
    if (Array.isArray(raw.words)) return raw.words;
    if (Array.isArray(raw.transcript)) return raw.transcript;
    return [];
  }

  function looksLikeMilliseconds(cues) {
    var i;
    var counted = 0;
    var large = 0;
    for (i = 0; i < cues.length; i++) {
      var start = cues[i].start;
      if (!isFinite(start)) continue;
      counted += 1;
      if (start >= 1000) large += 1;
    }
    return counted > 0 && large * 2 >= counted;
  }

  function scaleCue(cue, factor) {
    var words = [];
    var i;
    for (i = 0; i < (cue.words || []).length; i++) {
      words.push({
        start: cue.words[i].start / factor,
        end: cue.words[i].end / factor,
        text: cue.words[i].text,
        words: []
      });
    }
    return {
      start: cue.start / factor,
      end: isFinite(cue.end) ? cue.end / factor : cue.end,
      text: cue.text,
      words: words
    };
  }

  function fillEnds(cues) {
    var i;
    for (i = 0; i < cues.length; i++) {
      if (!isFinite(cues[i].end) || cues[i].end <= cues[i].start) {
        cues[i].end = cues[i + 1] && isFinite(cues[i + 1].start)
          ? cues[i + 1].start
          : cues[i].start + 2;
      }
    }
    return cues;
  }

  function normalizeCues(raw) {
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch (err) { return []; }
    }
    var items = extractCueList(raw);
    var unitHint = "";
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      if (raw.time_unit === "ms" || raw.unit === "ms") unitHint = "ms";
    }
    var cues = [];
    var i;
    for (i = 0; i < items.length; i++) {
      var cue = normalizeCueItem(items[i], unitHint);
      if (cue && cue.text) cues.push(cue);
    }
    if (!cues.length && raw && typeof raw === "object" && Array.isArray(raw.words)) {
      for (i = 0; i < raw.words.length; i++) {
        cue = normalizeCueItem(raw.words[i], unitHint);
        if (cue && cue.text) cues.push(cue);
      }
    }
    if (looksLikeMilliseconds(cues) && unitHint !== "ms") {
      for (i = 0; i < cues.length; i++) cues[i] = scaleCue(cues[i], 1000);
    }
    cues.sort(function (a, b) { return a.start - b.start; });
    return fillEnds(cues);
  }

  function cueAt(cues, time) {
    if (!cues || !cues.length || !isFinite(time)) return null;
    var i;
    var last = cues[cues.length - 1];
    for (i = 0; i < cues.length; i++) {
      if (time >= cues[i].start && time < cues[i].end) return cues[i];
    }
    if (time === last.end) return last;
    return null;
  }

  function slotStem(slotId) {
    return "200_" + String(slotId == null ? "1" : slotId);
  }

  function cleanBase(base) {
    return String(base || DEFAULT_BASE).replace(/\/$/, "");
  }

  function audioCandidatesFor(base, slotId, fallbackStem) {
    var root = cleanBase(base);
    var numbered = slotStem(slotId);
    var list = [root + "/" + numbered + ".wav", root + "/" + numbered + ".mp3", root + "/" + numbered + ".ogg"];
    if (fallbackStem && fallbackStem !== numbered) {
      list.push(root + "/" + fallbackStem + ".mp3");
      list.push(root + "/" + fallbackStem + ".ogg");
    }
    return list;
  }

  function cueCandidatesFor(base, slotId, fallbackStem) {
    var root = cleanBase(base);
    var numbered = slotStem(slotId);
    var list = [root + "/" + numbered + ".json"];
    if (fallbackStem && fallbackStem !== numbered) list.push(root + "/" + fallbackStem + ".json");
    return list;
  }

  function formatMediaTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var s = Math.floor(sec);
    var m = Math.floor(s / 60);
    s = s % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function audioSvgIcon(d) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "l200-audio-icon");
    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    return svg;
  }

  function audioBtn(name, label, icon) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "l200-audio-btn l200-audio-" + name;
    btn.setAttribute("aria-label", label);
    btn.title = label;
    btn.appendChild(audioSvgIcon(icon));
    return btn;
  }

  function ensureOverlay(host) {
    if (!host) return null;
    if (host.getAttribute("data-l200-subs-ready") === "true") {
      return {
        host: host,
        badge: host.querySelector(".l200-subs-badge"),
        line: host.querySelector(".l200-subs-line"),
        fill: host.querySelector(".l200-subs-fill"),
        words: host.querySelector(".l200-subs-words")
      };
    }
    if (!/(^|\s)l200-subs(\s|$)/.test(host.className || "")) {
      host.className = (host.className ? host.className + " " : "") + "l200-subs";
    }
    host.setAttribute("data-l200-subs-ready", "true");
    var panel = document.createElement("div");
    panel.className = "l200-subs-panel";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    panel.setAttribute("aria-atomic", "true");
    var badge = document.createElement("span");
    badge.className = "l200-subs-badge";
    var lineWrap = document.createElement("div");
    lineWrap.className = "l200-subs-linewrap";
    var line = document.createElement("p");
    line.className = "l200-subs-line";
    var fill = document.createElement("span");
    fill.className = "l200-subs-fill";
    fill.setAttribute("aria-hidden", "true");
    var words = document.createElement("span");
    words.className = "l200-subs-words";
    line.appendChild(words);
    line.appendChild(fill);
    lineWrap.appendChild(line);
    var caret = document.createElement("span");
    caret.className = "l200-subs-caret";
    caret.setAttribute("aria-hidden", "true");
    panel.appendChild(badge);
    panel.appendChild(lineWrap);
    panel.appendChild(caret);
    host.replaceChildren(panel);
    host.hidden = true;
    host.setAttribute("aria-hidden", "true");
    return { host: host, badge: badge, line: line, fill: fill, words: words };
  }

  function createOverlayController(host) {
    var ui = ensureOverlay(host);
    var state = { text: "", label: "", progress: 0 };

    function hide() {
      if (!ui) return;
      ui.words.textContent = "";
      ui.fill.textContent = "";
      ui.fill.style.clipPath = "inset(0 100% 0 0)";
      ui.host.hidden = true;
      ui.host.setAttribute("aria-hidden", "true");
      ui.host.classList.remove("is-on");
      state.text = "";
      state.progress = 0;
    }

    function renderWords(cue, time) {
      ui.words.replaceChildren();
      var i;
      for (i = 0; i < cue.words.length; i++) {
        var word = cue.words[i];
        var span = document.createElement("span");
        span.className = "l200-subs-word";
        if (isFinite(word.end) && time >= word.end) span.classList.add("is-done");
        else if (isFinite(word.start) && time >= word.start) span.classList.add("is-on");
        span.textContent = word.text;
        ui.words.appendChild(span);
        if (i < cue.words.length - 1) ui.words.appendChild(document.createTextNode(" "));
      }
    }

    function show(cue, time, label) {
      if (!ui) return "";
      if (!cue || !cue.text) {
        hide();
        return "";
      }
      var span = Math.max(cue.end - cue.start, 0.001);
      var progress = isFinite(time) ? Math.max(0, Math.min(1, (time - cue.start) / span)) : 0;
      ui.badge.textContent = label || "Explicación";
      if (cue.words && cue.words.length) {
        renderWords(cue, time);
        ui.fill.textContent = "";
        ui.fill.style.clipPath = "inset(0 100% 0 0)";
        ui.line.classList.add("has-words");
      } else {
        ui.words.textContent = cue.text;
        ui.fill.textContent = cue.text;
        ui.fill.style.clipPath = "inset(0 " + ((1 - progress) * 100) + "% 0 0)";
        ui.line.classList.remove("has-words");
      }
      ui.host.hidden = false;
      ui.host.setAttribute("aria-hidden", "false");
      ui.host.classList.add("is-on");
      state.text = cue.text;
      state.label = label || "";
      state.progress = progress;
      return cue.text;
    }

    return {
      show: show,
      hide: hide,
      text: function () { return state.text; }
    };
  }

  function fetchFirstJson(urls) {
    if (typeof global.fetch !== "function") return Promise.resolve(null);
    function next(index) {
      if (index >= urls.length) return Promise.resolve(null);
      return global.fetch(urls[index], { cache: "no-store" }).then(function (res) {
        if (!res.ok) return next(index + 1);
        return res.json().catch(function () { return next(index + 1); });
      }).catch(function () { return next(index + 1); });
    }
    return next(0);
  }

  function mountAudioSlot(host, slots, overlay, base) {
    var stem = host.getAttribute("data-audio-stem") || "";
    var slotId = host.getAttribute("data-l200-audio") || "1";
    var label = host.getAttribute("aria-label") || "Audio";
    var cands = audioCandidatesFor(base, slotId, stem);
    var jsonCands = cueCandidatesFor(base, slotId, stem);
    host.setAttribute("data-l200-audio-bar", "true");

    var title = document.createElement("span");
    title.className = "l200-audio-label";
    title.textContent = label;

    var playBtn = audioBtn("play", "Reproducir " + label.toLowerCase(), AUDIO_ICON.play);
    playBtn.setAttribute("data-l200-audio-play", stem);
    playBtn.setAttribute("aria-pressed", "false");

    var progress = document.createElement("div");
    progress.className = "l200-audio-progress";
    var timeEl = document.createElement("span");
    timeEl.className = "l200-audio-time";
    timeEl.textContent = "0:00";
    var seek = document.createElement("input");
    seek.type = "range";
    seek.className = "l200-audio-seek";
    seek.min = "0";
    seek.max = "0";
    seek.step = "0.1";
    seek.value = "0";
    seek.setAttribute("aria-label", "Progreso de " + label.toLowerCase());
    var durEl = document.createElement("span");
    durEl.className = "l200-audio-dur";
    durEl.textContent = "0:00";
    progress.appendChild(timeEl);
    progress.appendChild(seek);
    progress.appendChild(durEl);

    var muteBtn = audioBtn("mute", "Silenciar " + label.toLowerCase(), AUDIO_ICON.vol);
    muteBtn.setAttribute("data-l200-audio-mute", stem);

    var vol = document.createElement("input");
    vol.type = "range";
    vol.className = "l200-audio-vol";
    vol.min = "0";
    vol.max = "1";
    vol.step = "0.05";
    vol.value = "1";
    vol.setAttribute("aria-label", "Volumen de " + label.toLowerCase());

    var hintEl = document.createElement("p");
    hintEl.className = "l200-audio-hint";
    hintEl.setAttribute("aria-live", "polite");

    var audioEl = document.createElement("audio");
    audioEl.preload = "none";
    audioEl.setAttribute("data-l200-audio-player", stem);

    host.replaceChildren(title, playBtn, progress, muteBtn, vol, hintEl, audioEl);

    var muted = false;
    var volume = 1;
    var playing = false;
    var hintTimer = null;
    var ignoreAudioError = false;
    var playSeq = 0;
    var cues = [];
    var cuesLoaded = false;
    var owner = false;

    function setPlayIcon(isPlaying) {
      playing = !!isPlaying;
      playBtn.replaceChildren(audioSvgIcon(playing ? AUDIO_ICON.pause : AUDIO_ICON.play));
      playBtn.setAttribute("aria-label", playing ? "Pausar " + label.toLowerCase() : "Reproducir " + label.toLowerCase());
      playBtn.title = playBtn.getAttribute("aria-label");
      playBtn.setAttribute("aria-pressed", playing ? "true" : "false");
    }

    function setMuteUi() {
      var silent = muted || volume === 0;
      muteBtn.replaceChildren(audioSvgIcon(silent ? AUDIO_ICON.mute : AUDIO_ICON.vol));
      muteBtn.setAttribute("aria-pressed", silent ? "true" : "false");
      muteBtn.setAttribute("aria-label", muted ? "Activar sonido de " + label.toLowerCase() : "Silenciar " + label.toLowerCase());
      muteBtn.title = muteBtn.getAttribute("aria-label");
      audioEl.muted = muted;
      audioEl.volume = volume;
      vol.value = String(volume);
    }

    function showHint(msg) {
      hintEl.textContent = msg || "";
      if (hintTimer) global.clearTimeout(hintTimer);
      hintTimer = null;
      if (msg) {
        hintTimer = global.setTimeout(function () { hintEl.textContent = ""; }, 3200);
      }
    }

    function resetProgress() {
      seek.value = "0";
      seek.max = "0";
      timeEl.textContent = "0:00";
      durEl.textContent = "0:00";
    }

    function canShowSubs() {
      return !!(audioEl.getAttribute("src") && !audioEl.error);
    }

    function syncOverlay(time, force) {
      if (!overlay) return "";
      if (!force && !owner) return overlay.text();
      if (!force && !canShowSubs()) {
        if (owner) overlay.hide();
        return "";
      }
      var t = isFinite(time) ? time : (audioEl.currentTime || 0);
      var cue = cueAt(cues, t);
      if (!cue) {
        overlay.hide();
        return "";
      }
      return overlay.show(cue, t, label);
    }

    function loadCues(seq) {
      if (cuesLoaded) {
        syncOverlay(audioEl.currentTime || 0);
        return;
      }
      fetchFirstJson(jsonCands).then(function (raw) {
        if (seq !== playSeq) return;
        cues = raw ? normalizeCues(raw) : [];
        cuesLoaded = true;
        syncOverlay(audioEl.currentTime || 0);
      });
    }

    function clearAudioSrc() {
      ignoreAudioError = true;
      audioEl.pause();
      audioEl.removeAttribute("src");
      audioEl.removeAttribute("data-rel");
      try { audioEl.load(); } catch (err) { /* empty src */ }
      ignoreAudioError = false;
    }

    function releaseOverlay() {
      if (owner && overlay) overlay.hide();
      owner = false;
    }

    function stopAudio() {
      playSeq += 1;
      clearAudioSrc();
      setPlayIcon(false);
      resetProgress();
      releaseOverlay();
    }

    function playSrc(src, seq) {
      if (seq !== playSeq) return;
      audioEl.setAttribute("data-rel", src);
      audioEl.src = src;
      audioEl.muted = muted;
      audioEl.volume = volume;
      owner = true;
      loadCues(seq);
      var p = audioEl.play();
      if (p && p.then) {
        p.then(function () {
          if (seq !== playSeq) return;
          setPlayIcon(true);
          showHint("");
          syncOverlay(audioEl.currentTime || 0);
        }).catch(function () {
          if (seq !== playSeq) return;
          showHint(HINT_NO_AUDIO);
          setPlayIcon(false);
          releaseOverlay();
        });
      }
    }

    function probeAndPlay(list, index, seq) {
      if (seq !== playSeq) return;
      if (index >= list.length) {
        clearAudioSrc();
        setPlayIcon(false);
        resetProgress();
        showHint(HINT_NO_AUDIO);
        releaseOverlay();
        return;
      }
      var src = list[index];
      var done = function (ok) {
        if (seq !== playSeq) return;
        if (ok) playSrc(src, seq);
        else probeAndPlay(list, index + 1, seq);
      };
      if (typeof global.fetch !== "function") {
        playSrc(src, seq);
        return;
      }
      global.fetch(src, { method: "HEAD" }).then(function (res) {
        if (res.ok) done(true);
        else if (res.status === 405 || res.status === 501) playSrc(src, seq);
        else done(false);
      }).catch(function () {
        playSrc(src, seq);
      });
    }

    function togglePlay() {
      if (!audioEl.paused && audioEl.getAttribute("src")) {
        audioEl.pause();
        setPlayIcon(false);
        return;
      }
      var rel = audioEl.getAttribute("data-rel") || "";
      if (rel && cands.indexOf(rel) !== -1 && audioEl.getAttribute("src") && !audioEl.error) {
        owner = true;
        loadCues(playSeq);
        var resume = audioEl.play();
        if (resume && resume.then) {
          resume.then(function () {
            setPlayIcon(true);
            syncOverlay(audioEl.currentTime || 0);
          }).catch(function () {
            showHint(HINT_NO_AUDIO);
            setPlayIcon(false);
            releaseOverlay();
          });
        }
        return;
      }
      if (!cands.length) {
        showHint(HINT_NO_AUDIO);
        return;
      }
      slots.forEach(function (other) {
        if (other.host !== host) other.stop();
      });
      playSeq += 1;
      owner = true;
      loadCues(playSeq);
      probeAndPlay(cands, 0, playSeq);
    }

    playBtn.addEventListener("click", togglePlay);
    muteBtn.addEventListener("click", function () {
      muted = !muted;
      setMuteUi();
    });
    vol.addEventListener("input", function () {
      volume = parseFloat(vol.value);
      if (!isFinite(volume)) volume = 1;
      if (volume < 0) volume = 0;
      if (volume > 1) volume = 1;
      if (volume > 0) muted = false;
      audioEl.volume = volume;
      setMuteUi();
    });
    seek.addEventListener("input", function () {
      var v = parseFloat(seek.value);
      if (isFinite(v) && isFinite(audioEl.duration) && audioEl.duration > 0) {
        audioEl.currentTime = v;
        syncOverlay(v);
      }
    });
    audioEl.addEventListener("error", function () {
      if (ignoreAudioError) return;
      showHint(HINT_NO_AUDIO);
      setPlayIcon(false);
      releaseOverlay();
    });
    audioEl.addEventListener("timeupdate", function () {
      if (isFinite(audioEl.duration) && audioEl.duration > 0) {
        seek.max = String(audioEl.duration);
        seek.value = String(audioEl.currentTime || 0);
        timeEl.textContent = formatMediaTime(audioEl.currentTime);
        durEl.textContent = formatMediaTime(audioEl.duration);
      }
      syncOverlay(audioEl.currentTime || 0);
    });
    audioEl.addEventListener("seeked", function () {
      syncOverlay(audioEl.currentTime || 0);
    });
    audioEl.addEventListener("loadedmetadata", function () {
      if (!isFinite(audioEl.duration) || audioEl.duration <= 0) return;
      seek.max = String(audioEl.duration);
      durEl.textContent = formatMediaTime(audioEl.duration);
      syncOverlay(audioEl.currentTime || 0);
    });
    audioEl.addEventListener("ended", function () {
      setPlayIcon(false);
      audioEl.currentTime = 0;
      seek.value = "0";
      timeEl.textContent = "0:00";
      if (overlay && owner) overlay.hide();
      owner = false;
    });
    audioEl.addEventListener("pause", function () {
      if (!audioEl.ended) setPlayIcon(false);
      syncOverlay(audioEl.currentTime || 0);
    });
    audioEl.addEventListener("play", function () {
      setPlayIcon(true);
      owner = true;
      syncOverlay(audioEl.currentTime || 0);
    });

    setMuteUi();
    var api = {
      host: host,
      stem: stem,
      slotId: slotId,
      candidates: function () { return cands.slice(); },
      cueCandidates: function () { return jsonCands.slice(); },
      muted: function () { return muted; },
      setMuted: function (next) { muted = !!next; setMuteUi(); },
      play: togglePlay,
      stop: stopAudio,
      setCues: function (raw) {
        cues = normalizeCues(raw);
        cuesLoaded = true;
        return cues.slice();
      },
      sync: function (time) {
        owner = true;
        return syncOverlay(time, true);
      },
      subtitleText: function () { return overlay ? overlay.text() : ""; },
      cueAt: function (time) { return cueAt(cues, time); },
      audioEl: audioEl
    };
    slots.push(api);
    return api;
  }

  function audioSlotById(slots, id) {
    var key = String(id == null ? "1" : id);
    var i;
    for (i = 0; i < slots.length; i++) {
      if (slots[i].host.getAttribute("data-l200-audio") === key || slots[i].stem === key) {
        return slots[i];
      }
    }
    return null;
  }

  function mount(options) {
    var opts = options || {};
    var root = opts.root || (global.document && global.document.getElementById("l200AudioSlots"));
    var overlayHost = opts.overlay || (global.document && global.document.getElementById("l200Subtitles"));
    var base = (root && root.getAttribute("data-audio-base")) || opts.base || DEFAULT_BASE;
    var overlay = createOverlayController(overlayHost);
    var slots = [];
    if (root) {
      var hosts = root.querySelectorAll("[data-l200-audio]");
      var i;
      for (i = 0; i < hosts.length; i++) mountAudioSlot(hosts[i], slots, overlay, base);
    }
    return {
      slots: slots,
      candidates: function (id) {
        var slot = audioSlotById(slots, id);
        return slot ? slot.candidates() : audioCandidatesFor(base, id, id === "2" || id === 2 ? "explicacion-2" : "explicacion-1");
      },
      cueCandidates: function (id) {
        var slot = audioSlotById(slots, id);
        return slot ? slot.cueCandidates() : cueCandidatesFor(base, id, id === "2" || id === 2 ? "explicacion-2" : "explicacion-1");
      },
      muted: function (id) {
        var slot = audioSlotById(slots, id);
        return slot ? slot.muted() : false;
      },
      setMuted: function (id, next) {
        var slot = audioSlotById(slots, id);
        if (slot) slot.setMuted(next);
      },
      play: function (id) {
        var slot = audioSlotById(slots, id);
        if (slot) slot.play();
      },
      setCues: function (id, raw) {
        var slot = audioSlotById(slots, id);
        return slot ? slot.setCues(raw) : normalizeCues(raw);
      },
      sync: function (id, time) {
        var slot = audioSlotById(slots, id);
        return slot ? slot.sync(time) : "";
      },
      subtitleText: function () { return overlay ? overlay.text() : ""; },
      hideSubtitles: function () { if (overlay) overlay.hide(); }
    };
  }

  global.CampusL200Audio = {
    HINT_NO_AUDIO: HINT_NO_AUDIO,
    normalizeCues: normalizeCues,
    cueAt: cueAt,
    audioCandidatesFor: audioCandidatesFor,
    cueCandidatesFor: cueCandidatesFor,
    mount: mount
  };
})(typeof window !== "undefined" ? window : globalThis);
