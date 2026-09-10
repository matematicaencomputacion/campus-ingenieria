/*! Campus Ingeniería · Enfoque · CFG-driven vertical tabs (Figma-like right rail). */
(function (global) {
  "use strict";

  var CSS_HREF = "enfoque-tabs.css?v=20260909e";
  var UI_KEY = "campus_enfoque_ui";
  var RAIL_SLIM = 48;
  var RAIL_LABELED = 88;
  var RAIL_MIN = 44;
  var RAIL_MAX = 120;
  var HINT_NO_AUDIO = "Sin audio aún";
  var ICON = {
    prev: "M6 6h2v12H6zm3.5 6l8.5 6V6z",
    next: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    vol: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
    mute: "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
  };
  var PALETTE = [
    "#ef4444", "#eab308", "#22c55e", "#a855f7", "#3b82f6",
    "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4",
    "#fbbf24", "#64748b"
  ];

  function ensureCss() {
    if (document.getElementById("enfoque-tabs-css")) return;
    var link = document.createElement("link");
    link.id = "enfoque-tabs-css";
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    document.head.appendChild(link);
  }

  function tabColor(tab, index) {
    return tab.color || PALETTE[index % PALETTE.length];
  }

  function tabId(tab, index) {
    return tab.id || ("tab-" + index);
  }

  function slideAudioCandidates(cfg, tab, slide, slideIdx) {
    if (slide && typeof slide.audio === "string" && slide.audio) {
      return [slide.audio];
    }
    var base = ((cfg && cfg.audioBase) || "audio/l201").replace(/\/$/, "");
    var stem = base + "/" + tabId(tab, 0) + "-" + slideIdx;
    return [stem + ".mp3", stem + ".ogg"];
  }

  function formatMediaTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var s = Math.floor(sec);
    var m = Math.floor(s / 60);
    s = s % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function svgIcon(d) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "enfoque-media-icon");
    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    return svg;
  }

  function mediaBtn(name, label, icon) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "enfoque-media-btn enfoque-media-" + name;
    btn.setAttribute("aria-label", label);
    btn.title = label;
    btn.appendChild(svgIcon(icon));
    return btn;
  }

  function findTabIndex(tabs, id) {
    var i;
    for (i = 0; i < tabs.length; i++) {
      if (tabId(tabs[i], i) === id) return i;
    }
    return 0;
  }

  function unknownKind(kind) {
    throw new Error("Enfoque: kind desconocido: " + kind);
  }

  function readUi(key) {
    try {
      var raw = global.sessionStorage.getItem(key);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj : null;
    } catch (err) {
      return null;
    }
  }

  function writeUi(key, state) {
    try {
      global.sessionStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      /* ignore quota / private mode */
    }
  }

  function normalizeSlides(tab) {
    if (Array.isArray(tab.slides) && tab.slides.length) return tab.slides;
    var kind = tab.kind || "html";
    if (kind === "elige") {
      return [{
        kind: "elige",
        kicker: tab.kicker,
        title: tab.title,
        lead: tab.lead,
        html: tab.html,
        options: tab.options,
        storageKey: tab.storageKey,
        min: tab.min,
        confirmLabel: tab.confirmLabel,
        onConfirm: tab.onConfirm
      }];
    }
    return [{ kind: "html", html: tab.html || "" }];
  }

  function fillSlide(slideEl, slide, cfg) {
    var kind = slide.kind || "html";
    switch (kind) {
      case "html":
        slideEl.innerHTML = slide.html || "";
        break;
      case "elige":
        slideEl.innerHTML = "";
        if (slide.title) {
          var kicker = document.createElement("p");
          kicker.className = "enfoque-kicker";
          kicker.textContent = slide.kicker || "Cierre";
          var title = document.createElement("h2");
          title.className = "enfoque-title";
          title.textContent = slide.title;
          var lead = document.createElement("p");
          lead.className = "enfoque-lead";
          lead.textContent = slide.lead || "Marcá una o más formas. Hace falta al menos una para seguir.";
          slideEl.appendChild(kicker);
          slideEl.appendChild(title);
          slideEl.appendChild(lead);
        }
        if (slide.html) {
          var extra = document.createElement("div");
          extra.innerHTML = slide.html;
          slideEl.appendChild(extra);
        }
        var host = document.createElement("div");
        slideEl.appendChild(host);
        if (!global.CampusEnfoqueElige) {
          throw new Error("Enfoque: falta enfoque-elige.js");
        }
        global.CampusEnfoqueElige.mount(host, {
          options: slide.options || [],
          storageKey: slide.storageKey || cfg.storageKey || "",
          min: slide.min == null ? 1 : slide.min,
          confirmLabel: slide.confirmLabel || "Seguir",
          ariaLabel: slide.title || "Elegí formas",
          onConfirm: slide.onConfirm
        });
        break;
      default:
        unknownKind(kind);
    }
  }

  function makePager(kind, dir) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lesson-nav enfoque-pager enfoque-pager--" + kind + " " + dir;
    btn.setAttribute("data-enfoque-nav", kind);
    btn.setAttribute("data-enfoque-dir", dir);
    var chev = document.createElement("span");
    chev.className = "chev";
    chev.setAttribute("aria-hidden", "true");
    btn.appendChild(chev);
    return btn;
  }

  function mount(cfg) {
    cfg = cfg || global.__ENFOQUE_CFG__;
    if (!cfg) throw new Error("Enfoque: falta window.__ENFOQUE_CFG__");
    var tabs = cfg.tabs || [];
    if (!tabs.length) throw new Error("Enfoque: CFG.tabs vacío");

    ensureCss();

    var root = typeof cfg.mount === "string"
      ? document.querySelector(cfg.mount)
      : (cfg.mount || document.getElementById("enfoqueRoot"));
    if (!root) throw new Error("Enfoque: no se encontró el mount");

    var uiKey = cfg.uiKey || UI_KEY;
    var saved = readUi(uiKey) || {};
    var labelsOn = saved.labels;
    if (labelsOn !== true && labelsOn !== false) {
      labelsOn = !(global.matchMedia && global.matchMedia("(max-width: 900px)").matches);
    }
    var minimized = !!saved.min;
    var railPx = typeof saved.rail === "number" ? saved.rail : (labelsOn ? RAIL_LABELED : RAIL_SLIM);

    var start = 0;
    if (cfg.hash !== false && global.location.hash) {
      start = findTabIndex(tabs, global.location.hash.replace(/^#/, ""));
    }

    root.innerHTML = "";
    var shell = document.createElement("div");
    shell.className = "enfoque-shell";

    var main = document.createElement("div");
    main.className = "enfoque-main";

    var chrome = document.createElement("div");
    chrome.className = "enfoque-chrome";

    var chromeTitle = document.createElement("p");
    chromeTitle.className = "enfoque-chrome-title";

    var chromeSlide = document.createElement("span");
    chromeSlide.className = "enfoque-chrome-slide";
    chromeSlide.setAttribute("aria-live", "polite");
    chromeSlide.hidden = true;

    var chromeActions = document.createElement("div");
    chromeActions.className = "enfoque-chrome-actions";

    var labelsBtn = document.createElement("button");
    labelsBtn.type = "button";
    labelsBtn.className = "enfoque-tool enfoque-tool-labels";
    labelsBtn.textContent = "Etiquetas";

    var minBtn = document.createElement("button");
    minBtn.type = "button";
    minBtn.className = "enfoque-tool enfoque-tool-min";

    chromeActions.appendChild(labelsBtn);
    chromeActions.appendChild(minBtn);
    chrome.appendChild(chromeTitle);
    chrome.appendChild(chromeSlide);
    chrome.appendChild(chromeActions);

    var body = document.createElement("div");
    body.className = "enfoque-body";

    var rail = document.createElement("div");
    rail.className = "enfoque-rail";

    var split = document.createElement("button");
    split.type = "button";
    split.className = "enfoque-split";
    split.setAttribute("role", "separator");
    split.setAttribute("aria-orientation", "vertical");
    split.setAttribute("aria-label", "Ancho del riel");
    split.tabIndex = 0;

    var tabStrip = document.createElement("div");
    tabStrip.className = "enfoque-tabs";
    tabStrip.setAttribute("role", "tablist");
    tabStrip.setAttribute("aria-orientation", "vertical");
    tabStrip.setAttribute("aria-label", cfg.tablistLabel || "Formas");

    var railTools = document.createElement("div");
    railTools.className = "enfoque-rail-tools";
    var labelsBtnRail = labelsBtn.cloneNode(true);
    labelsBtnRail.className = "enfoque-tool enfoque-tool-labels";
    labelsBtnRail.type = "button";
    labelsBtnRail.textContent = "Aa";
    labelsBtnRail.setAttribute("aria-label", "Etiquetas");
    var minBtnRail = minBtn.cloneNode(true);
    minBtnRail.className = "enfoque-tool enfoque-tool-min";
    minBtnRail.type = "button";
    minBtnRail.textContent = "‹";
    minBtnRail.setAttribute("aria-label", "Minimizar");
    railTools.appendChild(labelsBtnRail);
    railTools.appendChild(minBtnRail);

    var tabBtns = [];
    var panels = [];
    var slideSets = [];
    var slideMeta = [];
    var slideIndex = [];
    var active = start;
    var varHost = root.closest(".enfoque-nav-host") || root;

    var tabPrev = makePager("eleccion", "prev");
    var tabNext = makePager("eleccion", "next");
    tabPrev.title = "Elección · etiqueta anterior";
    tabNext.title = "Elección · etiqueta siguiente";
    tabPrev.setAttribute("aria-label", "Etiqueta anterior");
    tabNext.setAttribute("aria-label", "Etiqueta siguiente");

    var media = document.createElement("div");
    media.className = "enfoque-media";
    media.setAttribute("role", "group");
    media.setAttribute("aria-label", "Láminas y audio");
    media.setAttribute("data-enfoque-media", "bar");

    var slidePrev = mediaBtn("prev", "Lámina anterior", ICON.prev);
    var playBtn = mediaBtn("play", "Reproducir audio", ICON.play);
    var slideNext = mediaBtn("next", "Lámina siguiente", ICON.next);
    slidePrev.setAttribute("data-enfoque-nav", "lamina");
    slidePrev.setAttribute("data-enfoque-dir", "prev");
    slideNext.setAttribute("data-enfoque-nav", "lamina");
    slideNext.setAttribute("data-enfoque-dir", "next");
    playBtn.setAttribute("data-enfoque-media", "play");
    playBtn.setAttribute("aria-pressed", "false");

    var progress = document.createElement("div");
    progress.className = "enfoque-media-progress";
    var timeEl = document.createElement("span");
    timeEl.className = "enfoque-media-time";
    timeEl.textContent = "0:00";
    var seek = document.createElement("input");
    seek.type = "range";
    seek.className = "enfoque-media-seek";
    seek.min = "0";
    seek.max = "0";
    seek.step = "0.1";
    seek.value = "0";
    seek.setAttribute("aria-label", "Progreso del audio");
    var durEl = document.createElement("span");
    durEl.className = "enfoque-media-dur";
    durEl.textContent = "0:00";
    progress.appendChild(timeEl);
    progress.appendChild(seek);
    progress.appendChild(durEl);

    var muteBtn = mediaBtn("mute", "Silenciar", ICON.vol);
    muteBtn.setAttribute("data-enfoque-media", "mute");
    var vol = document.createElement("input");
    vol.type = "range";
    vol.className = "enfoque-media-vol";
    vol.min = "0";
    vol.max = "1";
    vol.step = "0.05";
    vol.value = "1";
    vol.setAttribute("aria-label", "Volumen");

    var hintEl = document.createElement("p");
    hintEl.className = "enfoque-media-hint";
    hintEl.setAttribute("aria-live", "polite");

    var audioEl = document.createElement("audio");
    audioEl.preload = "none";
    audioEl.setAttribute("data-enfoque-audio", "player");

    media.appendChild(slidePrev);
    media.appendChild(playBtn);
    media.appendChild(slideNext);
    media.appendChild(progress);
    media.appendChild(muteBtn);
    media.appendChild(vol);
    media.appendChild(hintEl);
    media.appendChild(audioEl);

    var muted = !!saved.muted;
    var volume = typeof saved.vol === "number" ? saved.vol : 1;
    if (volume < 0) volume = 0;
    if (volume > 1) volume = 1;
    var playing = false;
    var hintTimer = null;
    var ignoreAudioError = false;
    var playSeq = 0;

    function persist() {
      writeUi(uiKey, { labels: labelsOn, min: minimized, rail: railPx, muted: muted, vol: volume });
    }

    function currentSlideMeta() {
      var list = slideMeta[active] || [];
      var cur = slideIndex[active] || 0;
      return { tab: tabs[active], slide: list[cur] || {}, index: cur };
    }

    function setPlayIcon(isPlaying) {
      playing = !!isPlaying;
      playBtn.replaceChildren(svgIcon(playing ? ICON.pause : ICON.play));
      playBtn.setAttribute("aria-label", playing ? "Pausar audio" : "Reproducir audio");
      playBtn.title = playing ? "Pausar audio" : "Reproducir audio";
      playBtn.setAttribute("aria-pressed", playing ? "true" : "false");
    }

    function setMuteUi() {
      var silent = muted || volume === 0;
      muteBtn.replaceChildren(svgIcon(silent ? ICON.mute : ICON.vol));
      muteBtn.setAttribute("aria-pressed", silent ? "true" : "false");
      muteBtn.setAttribute("aria-label", muted ? "Activar sonido" : "Silenciar");
      muteBtn.title = muted ? "Activar sonido" : "Silenciar";
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

    function clearAudioSrc() {
      ignoreAudioError = true;
      audioEl.pause();
      audioEl.removeAttribute("src");
      audioEl.removeAttribute("data-rel");
      try { audioEl.load(); } catch (err) { /* empty src */ }
      ignoreAudioError = false;
    }

    function stopAudio() {
      playSeq += 1;
      clearAudioSrc();
      setPlayIcon(false);
      resetProgress();
    }

    function playSrc(src, seq) {
      if (seq !== playSeq) return;
      audioEl.setAttribute("data-rel", src);
      audioEl.src = src;
      audioEl.muted = muted;
      audioEl.volume = volume;
      var p = audioEl.play();
      if (p && p.then) {
        p.then(function () {
          if (seq !== playSeq) return;
          setPlayIcon(true);
          showHint("");
        }).catch(function () {
          if (seq !== playSeq) return;
          showHint(HINT_NO_AUDIO);
          setPlayIcon(false);
        });
      }
    }

    function probeAndPlay(cands, index, seq) {
      if (seq !== playSeq) return;
      if (index >= cands.length) {
        clearAudioSrc();
        setPlayIcon(false);
        resetProgress();
        showHint(HINT_NO_AUDIO);
        return;
      }
      var src = cands[index];
      var done = function (ok) {
        if (seq !== playSeq) return;
        if (ok) playSrc(src, seq);
        else probeAndPlay(cands, index + 1, seq);
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
      var meta = currentSlideMeta();
      var cands = slideAudioCandidates(cfg, meta.tab, meta.slide, meta.index);
      var rel = audioEl.getAttribute("data-rel") || "";
      if (rel && cands.indexOf(rel) !== -1 && audioEl.getAttribute("src") && !audioEl.error) {
        var resume = audioEl.play();
        if (resume && resume.then) {
          resume.then(function () { setPlayIcon(true); }).catch(function () {
            showHint(HINT_NO_AUDIO);
            setPlayIcon(false);
          });
        }
        return;
      }
      if (!cands.length) {
        showHint(HINT_NO_AUDIO);
        return;
      }
      playSeq += 1;
      probeAndPlay(cands, 0, playSeq);
    }

    function applyRailWidth() {
      var px = minimized ? RAIL_MIN : railPx;
      shell.style.setProperty("--enfoque-rail", px + "px");
      varHost.style.setProperty("--enfoque-rail", px + "px");
      split.setAttribute("aria-valuenow", String(px));
      split.setAttribute("aria-valuemin", String(RAIL_MIN));
      split.setAttribute("aria-valuemax", String(RAIL_MAX));
    }

    function applyUi() {
      shell.setAttribute("data-min", minimized ? "true" : "false");
      var showLabels = !minimized && labelsOn;
      shell.setAttribute("data-labels", showLabels ? "on" : "off");
      applyRailWidth();
      var minLabel = minimized ? "Mostrar" : "Minimizar";
      var minTitle = minimized
        ? "Mostrar riel (Ctrl+Shift+\\)"
        : "Minimizar riel (Ctrl+Shift+\\)";
      [minBtn, minBtnRail].forEach(function (btn) {
        var isRail = btn === minBtnRail;
        btn.textContent = isRail ? (minimized ? "›" : "‹") : minLabel;
        btn.title = minTitle;
        btn.setAttribute("aria-label", minLabel);
        btn.setAttribute("aria-pressed", minimized ? "true" : "false");
        btn.setAttribute("aria-keyshortcuts", "Control+Shift+\\");
      });
      [labelsBtn, labelsBtnRail].forEach(function (btn) {
        btn.setAttribute("aria-pressed", labelsOn ? "true" : "false");
        btn.title = labelsOn ? "Ocultar etiquetas" : "Mostrar etiquetas";
        if (btn === labelsBtnRail) btn.setAttribute("aria-label", "Etiquetas");
      });
    }

    function setMinimized(next) {
      minimized = !!next;
      applyUi();
      persist();
    }

    function setLabels(next) {
      labelsOn = !!next;
      if (labelsOn && minimized) minimized = false;
      railPx = labelsOn ? RAIL_LABELED : RAIL_SLIM;
      applyUi();
      persist();
    }

    function setPagerDisabled(btn, disabled) {
      btn.setAttribute("aria-disabled", disabled ? "true" : "false");
      btn.disabled = !!disabled;
    }

    function syncSlides() {
      var slides = slideSets[active] || [];
      var cur = slideIndex[active] || 0;
      if (cur < 0) cur = 0;
      if (slides.length && cur >= slides.length) cur = slides.length - 1;
      slideIndex[active] = cur;
      slides.forEach(function (el, i) {
        el.hidden = i !== cur;
      });
      var n = slides.length;
      chromeSlide.textContent = n > 1 ? (cur + 1) + " / " + n : "";
      chromeSlide.hidden = n <= 1;
      setPagerDisabled(slidePrev, cur <= 0);
      setPagerDisabled(slideNext, n <= 1 || cur >= n - 1);
      body.scrollTop = 0;
      stopAudio();
    }

    function showSlide(next) {
      var n = (slideSets[active] || []).length;
      if (!n) return;
      if (next < 0) next = 0;
      if (next >= n) next = n - 1;
      slideIndex[active] = next;
      syncSlides();
    }

    function stepTab(delta) {
      if (!tabs.length) return;
      var next = (active + delta + tabs.length) % tabs.length;
      activate(next, true, false);
    }

    function stepSlide(delta) {
      showSlide((slideIndex[active] || 0) + delta);
    }

    function activate(index, fromUser, focusTab) {
      if (index < 0) index = 0;
      if (index >= tabs.length) index = tabs.length - 1;
      active = index;
      var color = tabColor(tabs[index], index);
      main.style.setProperty("--enfoque-active", color);
      shell.style.setProperty("--enfoque-active", color);
      var label = tabs[index].title || tabs[index].tab || "";
      chromeTitle.textContent = label;
      slideIndex[index] = 0;
      tabBtns.forEach(function (btn, i) {
        var on = i === index;
        btn.setAttribute("aria-selected", on ? "true" : "false");
        btn.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      syncSlides();
      if (fromUser && minimized) setMinimized(false);
      if (fromUser && cfg.hash !== false) {
        var id = tabId(tabs[index], index);
        try {
          global.history.replaceState(null, "", "#" + id);
        } catch (err) {
          global.location.hash = id;
        }
      }
      if (fromUser && focusTab !== false) tabBtns[index].focus();
    }

    tabs.forEach(function (tab, index) {
      var id = tabId(tab, index);
      var color = tabColor(tab, index);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "enfoque-tab";
      btn.id = "enfoque-tab-" + id;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-controls", "enfoque-panel-" + id);
      btn.setAttribute("aria-selected", "false");
      btn.tabIndex = -1;
      btn.style.setProperty("--tab-color", color);
      btn.title = tab.title || tab.tab || "";

      var sq = document.createElement("span");
      sq.className = "enfoque-tab-sq";
      sq.setAttribute("aria-hidden", "true");
      var lab = document.createElement("span");
      lab.className = "enfoque-tab-label";
      lab.textContent = tab.tab || tab.title || String(index + 1);
      btn.appendChild(sq);
      btn.appendChild(lab);

      btn.addEventListener("click", function () { activate(index, true); });
      btn.addEventListener("keydown", function (ev) {
        var next = index;
        switch (ev.key) {
          case "ArrowDown":
          case "ArrowRight":
            next = (index + 1) % tabs.length;
            break;
          case "ArrowUp":
          case "ArrowLeft":
            next = (index - 1 + tabs.length) % tabs.length;
            break;
          case "Home":
            next = 0;
            break;
          case "End":
            next = tabs.length - 1;
            break;
          default:
            return;
        }
        ev.preventDefault();
        activate(next, true);
      });
      tabStrip.appendChild(btn);
      tabBtns.push(btn);

      var panel = document.createElement("section");
      panel.className = "enfoque-panel";
      panel.id = "enfoque-panel-" + id;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", btn.id);
      panel.hidden = true;
      var slides = normalizeSlides(tab);
      var slideEls = [];
      slides.forEach(function (slide, sIdx) {
        var slideEl = document.createElement("div");
        slideEl.className = "enfoque-slide";
        slideEl.setAttribute("data-slide", String(sIdx));
        slideEl.setAttribute("data-audio", slideAudioCandidates(cfg, tab, slide, sIdx)[0] || "");
        slideEl.hidden = sIdx !== 0;
        fillSlide(slideEl, slide, cfg);
        panel.appendChild(slideEl);
        slideEls.push(slideEl);
      });
      body.appendChild(panel);
      panels.push(panel);
      slideSets.push(slideEls);
      slideMeta.push(slides);
      slideIndex.push(0);
    });

    function onLabelsClick() { setLabels(!labelsOn); }
    function onMinClick() { setMinimized(!minimized); }
    labelsBtn.addEventListener("click", onLabelsClick);
    labelsBtnRail.addEventListener("click", onLabelsClick);
    minBtn.addEventListener("click", onMinClick);
    minBtnRail.addEventListener("click", onMinClick);

    function onShortcut(ev) {
      if (ev.key !== "\\" || !ev.shiftKey || !(ev.ctrlKey || ev.metaKey)) return;
      var tag = (ev.target && ev.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (ev.target && ev.target.isContentEditable)) return;
      ev.preventDefault();
      setMinimized(!minimized);
    }
    document.addEventListener("keydown", onShortcut);

    var drag = null;
    function railFromClientX(x) {
      var box = shell.getBoundingClientRect();
      return Math.round(box.right - x);
    }
    function clampRail(px) {
      if (px < RAIL_MIN) return RAIL_MIN;
      if (px > RAIL_MAX) return RAIL_MAX;
      return px;
    }
    function onPointerMove(ev) {
      if (!drag) return;
      railPx = clampRail(railFromClientX(ev.clientX));
      labelsOn = railPx >= 72;
      minimized = false;
      applyUi();
    }
    function onPointerUp() {
      if (!drag) return;
      drag = null;
      shell.setAttribute("data-dragging", "false");
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      persist();
    }
    split.addEventListener("pointerdown", function (ev) {
      if (minimized) return;
      ev.preventDefault();
      drag = true;
      shell.setAttribute("data-dragging", "true");
      if (split.setPointerCapture) split.setPointerCapture(ev.pointerId);
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    });
    split.addEventListener("keydown", function (ev) {
      var delta = 0;
      switch (ev.key) {
        case "ArrowLeft":
          delta = 8;
          break;
        case "ArrowRight":
          delta = -8;
          break;
        default:
          return;
      }
      ev.preventDefault();
      railPx = clampRail(railPx + delta);
      labelsOn = railPx >= 72;
      minimized = false;
      applyUi();
      persist();
    });

    tabPrev.addEventListener("click", function () { stepTab(-1); });
    tabNext.addEventListener("click", function () { stepTab(1); });
    slidePrev.addEventListener("click", function () { stepSlide(-1); });
    slideNext.addEventListener("click", function () { stepSlide(1); });
    playBtn.addEventListener("click", togglePlay);
    muteBtn.addEventListener("click", function () {
      muted = !muted;
      setMuteUi();
      persist();
    });
    vol.addEventListener("input", function () {
      volume = parseFloat(vol.value);
      if (!isFinite(volume)) volume = 1;
      if (volume < 0) volume = 0;
      if (volume > 1) volume = 1;
      if (volume > 0) muted = false;
      audioEl.volume = volume;
      setMuteUi();
      persist();
    });
    seek.addEventListener("input", function () {
      var v = parseFloat(seek.value);
      if (isFinite(v) && isFinite(audioEl.duration) && audioEl.duration > 0) {
        audioEl.currentTime = v;
      }
    });
    audioEl.addEventListener("error", function () {
      if (ignoreAudioError) return;
      showHint(HINT_NO_AUDIO);
      setPlayIcon(false);
    });
    audioEl.addEventListener("timeupdate", function () {
      if (!isFinite(audioEl.duration) || audioEl.duration <= 0) return;
      seek.max = String(audioEl.duration);
      seek.value = String(audioEl.currentTime || 0);
      timeEl.textContent = formatMediaTime(audioEl.currentTime);
      durEl.textContent = formatMediaTime(audioEl.duration);
    });
    audioEl.addEventListener("loadedmetadata", function () {
      if (!isFinite(audioEl.duration) || audioEl.duration <= 0) return;
      seek.max = String(audioEl.duration);
      durEl.textContent = formatMediaTime(audioEl.duration);
    });
    audioEl.addEventListener("ended", function () {
      setPlayIcon(false);
      audioEl.currentTime = 0;
      seek.value = "0";
      timeEl.textContent = "0:00";
    });
    audioEl.addEventListener("pause", function () {
      if (!audioEl.ended) setPlayIcon(false);
    });
    audioEl.addEventListener("play", function () {
      setPlayIcon(true);
    });

    main.appendChild(chrome);
    main.appendChild(body);
    main.appendChild(media);
    main.appendChild(tabPrev);
    main.appendChild(tabNext);
    rail.appendChild(split);
    rail.appendChild(tabStrip);
    rail.appendChild(railTools);
    shell.appendChild(main);
    shell.appendChild(rail);
    root.appendChild(shell);
    applyUi();
    setMuteUi();
    activate(start, false);

    var api = {
      CFG: cfg,
      activate: function (index) { activate(index, true, false); },
      index: function () { return active; },
      slide: function () { return slideIndex[active] || 0; },
      slideCount: function () { return (slideSets[active] || []).length; },
      nextTab: function () { stepTab(1); },
      prevTab: function () { stepTab(-1); },
      nextSlide: function () { stepSlide(1); },
      prevSlide: function () { stepSlide(-1); },
      play: togglePlay,
      stopAudio: stopAudio,
      audioCandidates: function () {
        var meta = currentSlideMeta();
        return slideAudioCandidates(cfg, meta.tab, meta.slide, meta.index);
      },
      muted: function () { return muted; },
      setMuted: function (next) {
        muted = !!next;
        setMuteUi();
        persist();
      },
      setMinimized: setMinimized,
      setLabels: setLabels,
      destroy: function () {
        document.removeEventListener("keydown", onShortcut);
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        if (hintTimer) global.clearTimeout(hintTimer);
        stopAudio();
      }
    };
    if (cfg.exportName) global[cfg.exportName] = api;
    global.__ENFOQUE__ = api;
    return api;
  }

  function boot() {
    if (!global.__ENFOQUE_CFG__) return;
    mount(global.__ENFOQUE_CFG__);
  }

  global.CampusEnfoqueTabs = {
    mount: mount,
    audioCandidates: slideAudioCandidates
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : this);
