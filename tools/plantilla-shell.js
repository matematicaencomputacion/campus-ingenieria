/*! Campus Ingeniería · L199 · plantilla shell (CFG: rieles + ejes + foco). */
(function (global) {
  "use strict";

  var CSS_HREF = "plantilla-shell.css?v=20260910-l199g";
  var UI_KEY = "campus_l199_ui";

  function unknownAxis(axis) {
    throw new Error("Plantilla: eje desconocido: " + axis);
  }

  function unknownRail(rail) {
    throw new Error("Plantilla: riel desconocido: " + rail);
  }

  function ensureCss() {
    if (document.getElementById("plantilla-shell-css")) return;
    var link = document.createElement("link");
    link.id = "plantilla-shell-css";
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    document.head.appendChild(link);
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

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function placeholderSlides(prefix, count) {
    var out = [];
    var i;
    for (i = 0; i < count; i++) {
      out.push({
        title: "Slide " + (i + 1) + " · " + prefix,
        lead: "Slot contenido (placeholder)"
      });
    }
    return out;
  }

  function normalizeItems(items, prefix) {
    if (!items || !items.length) {
      return [
        { id: prefix + "-1", label: "1 · placeholder", slides: placeholderSlides(prefix, 3) }
      ];
    }
    return items.map(function (item, index) {
      var slides = item.slides && item.slides.length
        ? item.slides
        : placeholderSlides((item.label || prefix) + "", 3);
      return {
        id: item.id || (prefix + "-" + (index + 1)),
        label: item.label || String(index + 1) + " · placeholder",
        color: item.color || "",
        slides: slides
      };
    });
  }

  function itemGlyph(item, index) {
    var match = String(item.label || "").match(/^\s*([0-9A-Za-z])/);
    return match ? match[1].toUpperCase() : String(index + 1);
  }

  function fillSlide(host, slide, index, total) {
    host.innerHTML = "";
    var kicker = el("p", "plantilla-slide-kicker");
    kicker.textContent = slide.kicker || ("Forma  ◀  " + (index + 1) + "  ▶");
    var title = el("p", "plantilla-slide-title");
    title.textContent = slide.title || ("Slide " + (index + 1));
    host.appendChild(kicker);
    host.appendChild(title);
    if (slide.formula) {
      var formula = el("div", "plantilla-formula");
      formula.textContent = slide.formula;
      host.appendChild(formula);
    }
    if (slide.boxes && slide.boxes.length) {
      var row = el("div", "plantilla-inset-row");
      slide.boxes.forEach(function (box) {
        var card = el("div", "plantilla-inset");
        var lab = el("p", "plantilla-inset-label");
        lab.textContent = box.label || "";
        var val = el("p", "plantilla-inset-value");
        val.textContent = box.text || "";
        card.appendChild(lab);
        card.appendChild(val);
        row.appendChild(card);
      });
      host.appendChild(row);
    }
    var lead = el("p", "plantilla-slide-lead");
    lead.textContent = slide.lead || "Slot contenido (placeholder)";
    host.appendChild(lead);
    if (slide.html) {
      var extra = el("div");
      extra.innerHTML = slide.html;
      host.appendChild(extra);
    }
    host.setAttribute("data-slide", String(index));
    host.setAttribute("data-slide-total", String(total));
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    var whole = Math.floor(seconds);
    var m = Math.floor(whole / 60);
    var s = whole % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function clamp01(n) {
    if (!isFinite(n)) return 1;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  }

  function mount(cfg) {
    cfg = cfg || global.__L199_CFG__;
    if (!cfg) throw new Error("Plantilla: falta window.__L199_CFG__");

    ensureCss();

    var root = typeof cfg.mount === "string"
      ? document.querySelector(cfg.mount)
      : (cfg.mount || document.getElementById("plantillaRoot"));
    if (!root) throw new Error("Plantilla: no se encontró el mount");

    var leftItems = normalizeItems((cfg.left && cfg.left.items) || [], "números");
    var rightItems = normalizeItems((cfg.right && cfg.right.items) || [], "colores");
    var uiKey = cfg.uiKey || UI_KEY;
    var saved = readUi(uiKey) || {};

    var axis = saved.axis === "slide" || saved.axis === "idle" ? saved.axis : "leccion";
    var leftOpen = !!saved.left;
    var rightOpen = !leftOpen && !!saved.right;
    var rail = saved.rail === "right" || saved.rail === "left" ? saved.rail : null;
    var itemIndex = typeof saved.item === "number" ? saved.item : -1;
    var slideIndex = typeof saved.slide === "number" ? saved.slide : 0;
    var focoOn = !!saved.foco;
    var volume = clamp01(typeof saved.vol === "number" ? saved.vol : 1);
    var muted = !!saved.muted;
    var helpOn = false;

    if (rail === "left" && (itemIndex < 0 || itemIndex >= leftItems.length)) {
      itemIndex = leftOpen ? 0 : -1;
    }
    if (rail === "right" && (itemIndex < 0 || itemIndex >= rightItems.length)) {
      itemIndex = rightOpen ? 0 : -1;
    }
    if (!rail) itemIndex = -1;

    root.innerHTML = "";
    var shell = el("div", "plantilla-shell");
    shell.setAttribute("data-plantilla", "l199");

    var top = el("div", "plantilla-top");
    var lesson = el("div", "plantilla-lesson");
    lesson.setAttribute("data-plantilla-axis", "leccion");

    var lessonWord = el("p", "plantilla-lesson-word");
    lessonWord.textContent = "Lección";

    var pill = el("span", "plantilla-lesson-pill");
    pill.textContent = cfg.lessonNum || "199";

    var prev = el("a", "plantilla-lesson-btn");
    prev.href = (cfg.prev && cfg.prev.href) || "leccion-inversa-cara-juego.html";
    prev.title = (cfg.prev && cfg.prev.title) || "Lección anterior";
    prev.setAttribute("aria-label", (cfg.prev && cfg.prev.label) || "Lección anterior");
    prev.textContent = "◂◂";

    var next = el("a", "plantilla-lesson-btn");
    next.href = (cfg.next && cfg.next.href) || "leccion-lineal-working-memory.html";
    next.title = (cfg.next && cfg.next.title) || "Lección siguiente";
    next.setAttribute("aria-label", (cfg.next && cfg.next.label) || "Lección siguiente");
    next.textContent = "▸▸";

    var meta = el("div", "plantilla-lesson-meta");
    var title = el("p", "plantilla-lesson-title");
    title.textContent = cfg.title || "Enfoque";
    var sub = el("p", "plantilla-lesson-sub");
    sub.textContent = cfg.subtitle || "formas de la recta · plantilla";
    meta.appendChild(title);
    meta.appendChild(sub);

    var lessonLabel = el("p", "plantilla-axis-label");

    lesson.appendChild(lessonWord);
    lesson.appendChild(pill);
    lesson.appendChild(prev);
    lesson.appendChild(next);
    lesson.appendChild(meta);
    lesson.appendChild(lessonLabel);

    var actions = el("div", "plantilla-top-actions");
    var focoBtn = el("button", "plantilla-tool");
    focoBtn.type = "button";
    focoBtn.setAttribute("data-plantilla", "foco");
    actions.appendChild(focoBtn);
    top.appendChild(lesson);
    top.appendChild(actions);

    var body = el("div", "plantilla-body");

    function makeRail(side, spec, items) {
      var railEl = el("div", "plantilla-rail plantilla-rail--" + side);
      railEl.setAttribute("data-plantilla-rail", side);
      var list = el("div", "plantilla-rail-list");
      list.setAttribute("role", "listbox");
      list.setAttribute("aria-label", spec.tablistLabel || spec.label || "Opciones");
      var btns = [];
      items.forEach(function (item, index) {
        var btn = el("button", "plantilla-item");
        btn.type = "button";
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", "false");
        btn.setAttribute("data-item", item.id);
        btn.setAttribute("aria-label", item.label);
        var glyph = itemGlyph(item, index);
        if (item.color) {
          var sw = el("span", "plantilla-swatch");
          sw.style.setProperty("--swatch", item.color);
          sw.setAttribute("aria-hidden", "true");
          var letter = el("span", "plantilla-swatch-letter");
          letter.textContent = glyph;
          btn.appendChild(sw);
          btn.appendChild(letter);
        } else {
          var num = el("span", "plantilla-item-glyph");
          num.textContent = glyph;
          btn.appendChild(num);
        }
        btn.addEventListener("click", function () {
          chooseItem(side, index, true);
        });
        list.appendChild(btn);
        btns.push(btn);
      });
      railEl.appendChild(list);
      return { railEl: railEl, list: list, btns: btns };
    }

    var leftRail = makeRail("left", cfg.left || {}, leftItems);
    var rightRail = makeRail("right", cfg.right || {}, rightItems);

    var stage = el("div", "plantilla-stage");
    stage.setAttribute("data-plantilla-axis", "slide");

    var stageHead = el("div", "plantilla-stage-head");
    var formKicker = el("p", "plantilla-form-kicker");
    var indicators = el("div", "plantilla-indicators");
    var nums = el("div", "plantilla-nums");
    nums.setAttribute("role", "tablist");
    nums.setAttribute("aria-label", "Slides");
    var dots = el("p", "plantilla-dots");
    indicators.appendChild(nums);
    indicators.appendChild(dots);
    var slideFoco = el("p", "plantilla-slide-foco");
    stageHead.appendChild(formKicker);
    stageHead.appendChild(indicators);
    stageHead.appendChild(slideFoco);

    var slidePrev = el("button", "plantilla-pager prev");
    slidePrev.type = "button";
    slidePrev.textContent = "◀";
    slidePrev.setAttribute("aria-label", "Slide anterior");
    slidePrev.setAttribute("data-plantilla-nav", "slide");
    slidePrev.setAttribute("data-plantilla-dir", "prev");

    var slideNext = el("button", "plantilla-pager next");
    slideNext.type = "button";
    slideNext.textContent = "▶";
    slideNext.setAttribute("aria-label", "Slide siguiente");
    slideNext.setAttribute("data-plantilla-nav", "slide");
    slideNext.setAttribute("data-plantilla-dir", "next");

    var slot = el("div", "plantilla-slot");
    var slideHost = el("div", "plantilla-slide");
    slot.appendChild(slideHost);

    var caption = el("p", "plantilla-stage-caption");

    var exitFoco = el("button", "plantilla-tool plantilla-exit-foco");
    exitFoco.type = "button";
    exitFoco.textContent = "Salir de foco";
    exitFoco.setAttribute("data-plantilla", "foco-exit");

    stage.appendChild(stageHead);
    stage.appendChild(slidePrev);
    stage.appendChild(slideNext);
    stage.appendChild(slot);
    stage.appendChild(caption);
    stage.appendChild(exitFoco);

    var media = el("div", "plantilla-media");
    media.setAttribute("role", "group");
    media.setAttribute("aria-label", "Audio y recursos");
    media.setAttribute("data-plantilla-media", "bar");

    var playBtn = el("button", "plantilla-media-btn plantilla-media-play");
    playBtn.type = "button";
    playBtn.textContent = "▶";
    playBtn.setAttribute("aria-label", "Reproducir audio");
    playBtn.setAttribute("data-plantilla-media", "play");

    var progress = el("div", "plantilla-media-progress");
    var clock = el("span", "plantilla-media-clock");
    var timeEl = el("span", "plantilla-media-time");
    timeEl.textContent = "0:00";
    var clockSep = el("span", "plantilla-media-clock-sep");
    clockSep.textContent = " / ";
    var durEl = el("span", "plantilla-media-dur");
    durEl.textContent = "0:00";
    clock.appendChild(timeEl);
    clock.appendChild(clockSep);
    clock.appendChild(durEl);
    var seek = el("input", "plantilla-media-seek");
    seek.type = "range";
    seek.min = "0";
    seek.max = "1";
    seek.step = "0.01";
    seek.value = "0";
    seek.setAttribute("aria-label", "Posición");
    seek.disabled = true;
    progress.appendChild(clock);
    progress.appendChild(seek);

    var pdfBtn = el("a", "plantilla-media-btn plantilla-media-pdf");
    pdfBtn.href = cfg.pdf || "#";
    pdfBtn.textContent = "PDF";
    pdfBtn.setAttribute("aria-label", "Abrir PDF");
    pdfBtn.setAttribute("data-plantilla-media", "pdf");
    if (!cfg.pdf) {
      pdfBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        hintEl.textContent = "PDF aún no cargado";
      });
    }

    var muteBtn = el("button", "plantilla-media-btn plantilla-media-mute");
    muteBtn.type = "button";
    muteBtn.textContent = "🔊";
    muteBtn.setAttribute("aria-label", "Silenciar");
    muteBtn.setAttribute("data-plantilla-media", "mute");

    var vol = el("input", "plantilla-media-vol");
    vol.type = "range";
    vol.min = "0";
    vol.max = "1";
    vol.step = "0.05";
    vol.value = String(volume);
    vol.setAttribute("aria-label", "Volumen");
    vol.setAttribute("data-plantilla-media", "volume");

    var helpBtn = el("button", "plantilla-media-btn plantilla-media-help");
    helpBtn.type = "button";
    helpBtn.textContent = "?";
    helpBtn.setAttribute("aria-label", "Ayuda");
    helpBtn.setAttribute("data-plantilla-media", "help");
    helpBtn.setAttribute("aria-expanded", "false");

    var hintEl = el("p", "plantilla-media-hint");
    var audioEl = document.createElement("audio");
    audioEl.preload = "none";

    var mediaActions = el("div", "plantilla-media-actions");
    mediaActions.appendChild(pdfBtn);
    mediaActions.appendChild(muteBtn);
    mediaActions.appendChild(vol);
    mediaActions.appendChild(helpBtn);

    media.appendChild(playBtn);
    media.appendChild(progress);
    media.appendChild(mediaActions);
    media.appendChild(hintEl);
    media.appendChild(audioEl);

    body.appendChild(leftRail.railEl);
    body.appendChild(stage);
    body.appendChild(rightRail.railEl);
    shell.appendChild(top);
    shell.appendChild(body);
    shell.appendChild(media);
    root.appendChild(shell);

    function currentItems() {
      if (rail === "left") return leftItems;
      if (rail === "right") return rightItems;
      return [];
    }

    function currentItem() {
      var items = currentItems();
      if (itemIndex < 0 || itemIndex >= items.length) return null;
      return items[itemIndex];
    }

    function persist() {
      writeUi(uiKey, {
        axis: axis,
        left: leftOpen,
        right: rightOpen,
        rail: rail,
        item: itemIndex,
        slide: slideIndex,
        foco: focoOn,
        vol: volume,
        muted: muted
      });
    }

    function hasSelection() {
      return !!currentItem();
    }

    function applyVolume() {
      var silent = muted || volume === 0;
      audioEl.muted = silent;
      audioEl.volume = volume;
      vol.value = String(volume);
      muteBtn.textContent = silent ? "🔇" : "🔊";
      muteBtn.setAttribute("aria-label", silent ? "Activar sonido" : "Silenciar");
      muteBtn.setAttribute("aria-pressed", silent ? "true" : "false");
    }

    function setVolume(next) {
      volume = clamp01(next);
      if (volume > 0) muted = false;
      persist();
      applyVolume();
    }

    function setAxis(next, fromUser) {
      switch (next) {
        case "leccion":
        case "slide":
        case "idle":
          if (next === "slide" && !hasSelection()) next = "leccion";
          axis = next;
          break;
        default:
          unknownAxis(next);
      }
      if (fromUser) persist();
      render();
    }

    function setFoco(next) {
      focoOn = !!next;
      persist();
      render();
    }

    function toggleRail(side) {
      switch (side) {
        case "left":
          chooseItem("left", rail === "left" && itemIndex >= 0 ? itemIndex : 0, true);
          break;
        case "right":
          chooseItem("right", rail === "right" && itemIndex >= 0 ? itemIndex : 0, true);
          break;
        default:
          unknownRail(side);
      }
    }

    function chooseItem(side, index, fromUser) {
      switch (side) {
        case "left":
          leftOpen = true;
          rightOpen = false;
          rail = "left";
          if (index < 0) index = 0;
          if (index >= leftItems.length) index = leftItems.length - 1;
          break;
        case "right":
          rightOpen = true;
          leftOpen = false;
          rail = "right";
          if (index < 0) index = 0;
          if (index >= rightItems.length) index = rightItems.length - 1;
          break;
        default:
          unknownRail(side);
      }
      itemIndex = index;
      slideIndex = 0;
      if (fromUser) axis = "idle";
      persist();
      render();
    }

    function showSlide(next, fromUser) {
      var item = currentItem();
      if (!item) return;
      var n = item.slides.length;
      if (!n) return;
      if (next < 0) next = 0;
      if (next >= n) next = n - 1;
      slideIndex = next;
      if (fromUser) axis = "slide";
      persist();
      render();
    }

    function stepSlide(delta) {
      if (!hasSelection()) return;
      showSlide(slideIndex + delta, true);
    }

    function formKickerText(item) {
      if (!item) return "";
      var glyph = itemGlyph(item, itemIndex);
      if (rail === "right") return "COLOR " + glyph + " · FUNCIÓN";
      return "FORMA " + glyph + " · FUNCIÓN";
    }

    function render() {
      shell.setAttribute("data-axis", axis);
      shell.setAttribute("data-left", leftOpen ? "open" : "shut");
      shell.setAttribute("data-right", rightOpen ? "open" : "shut");
      shell.setAttribute("data-foco", focoOn ? "on" : "off");
      document.body.setAttribute("data-l199-foco", focoOn ? "on" : "off");

      var captionText = "";
      switch (axis) {
        case "leccion":
          lessonLabel.textContent = "FOCO: Lección ±";
          captionText = hasSelection()
            ? "eje: Slide ◀▶ (activo)"
            : "eje: Slide ◀▶ (inactivo hasta elegir tab)";
          slideFoco.textContent = "";
          break;
        case "slide":
          lessonLabel.textContent = "eje: Lección ±";
          captionText = "FOCO: Slide ◀▶ (dentro de la lección)";
          slideFoco.textContent = "FOCO: Slide ◀▶";
          break;
        case "idle":
          lessonLabel.textContent = "eje: Lección ±";
          captionText = hasSelection()
            ? "eje: Slide ◀▶ (activo)"
            : "eje: Slide ◀▶ (inactivo hasta elegir tab)";
          slideFoco.textContent = "";
          break;
        default:
          unknownAxis(axis);
      }

      leftRail.btns.forEach(function (btn, i) {
        btn.setAttribute("aria-selected", rail === "left" && i === itemIndex ? "true" : "false");
      });
      rightRail.btns.forEach(function (btn, i) {
        btn.setAttribute("aria-selected", rail === "right" && i === itemIndex ? "true" : "false");
      });

      var item = currentItem();
      var slides = item ? item.slides : [];
      var n = slides.length;
      if (n && slideIndex >= n) slideIndex = n - 1;
      if (slideIndex < 0) slideIndex = 0;

      formKicker.textContent = formKickerText(item);

      if (!item) {
        fillSlide(slideHost, {
          title: "Slot contenido (placeholder)",
          lead: "Elegí un tab izquierdo (números) o derecho (colores) para habilitar las slides horizontales."
        }, 0, 0);
        indicators.hidden = true;
        nums.replaceChildren();
        dots.textContent = "";
        caption.textContent = captionText;
        slidePrev.disabled = true;
        slideNext.disabled = true;
      } else {
        fillSlide(slideHost, slides[slideIndex] || {}, slideIndex, n);
        indicators.hidden = n <= 1;
        nums.replaceChildren();
        slides.forEach(function (_slide, i) {
          var numBtn = el("button", "plantilla-num");
          numBtn.type = "button";
          numBtn.textContent = String(i + 1);
          numBtn.setAttribute("aria-label", "Slide " + (i + 1));
          if (i === slideIndex) numBtn.setAttribute("aria-current", "true");
          numBtn.addEventListener("click", function () { showSlide(i, true); });
          nums.appendChild(numBtn);
        });
        dots.textContent = n
          ? slides.map(function (_s, i) { return i === slideIndex ? "●" : "○"; }).join(" ")
          : "";
        caption.textContent = captionText;
        slidePrev.disabled = slideIndex <= 0;
        slideNext.disabled = n <= 1 || slideIndex >= n - 1;
      }

      timeEl.textContent = formatTime(audioEl.currentTime || 0);
      durEl.textContent = formatTime(isFinite(audioEl.duration) ? audioEl.duration : 0);
      applyVolume();

      focoBtn.textContent = focoOn ? "Salir de foco" : "Foco";
      focoBtn.setAttribute("aria-pressed", focoOn ? "true" : "false");
      focoBtn.title = focoOn ? "Mostrar chrome" : "Modo Foco";
      focoBtn.setAttribute("aria-keyshortcuts", "Control+Shift+\\");
      helpBtn.setAttribute("aria-expanded", helpOn ? "true" : "false");
    }

    function onLessonFocus() { setAxis("leccion", true); }
    lesson.addEventListener("click", function (ev) {
      if (ev.target === prev || ev.target === next) return;
      onLessonFocus();
    });
    lesson.addEventListener("focusin", onLessonFocus);

    slidePrev.addEventListener("click", function () { stepSlide(-1); });
    slideNext.addEventListener("click", function () { stepSlide(1); });
    stage.addEventListener("click", function (ev) {
      if (!hasSelection()) return;
      if (ev.target === exitFoco) return;
      if (axis !== "slide") setAxis("slide", true);
    });

    focoBtn.addEventListener("click", function () { setFoco(!focoOn); });
    exitFoco.addEventListener("click", function () { setFoco(false); });

    playBtn.addEventListener("click", function () {
      hintEl.textContent = "Sin audio aún";
    });
    muteBtn.addEventListener("click", function () {
      muted = !muted;
      persist();
      applyVolume();
    });
    vol.addEventListener("input", function () {
      setVolume(parseFloat(vol.value));
    });
    helpBtn.addEventListener("click", function () {
      helpOn = !helpOn;
      hintEl.textContent = helpOn
        ? "Eje azul: Lección ±. Eje ámbar: Slide ◀▶. Modo Foco: Ctrl+Shift+\\."
        : "";
      helpBtn.setAttribute("aria-expanded", helpOn ? "true" : "false");
    });

    function onShortcut(ev) {
      if (ev.key !== "\\" || !ev.shiftKey || !(ev.ctrlKey || ev.metaKey)) return;
      var tag = (ev.target && ev.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (ev.target && ev.target.isContentEditable)) return;
      ev.preventDefault();
      setFoco(!focoOn);
    }
    document.addEventListener("keydown", onShortcut);

    render();

    var api = {
      CFG: cfg,
      axis: function () { return axis; },
      setAxis: function (next) { setAxis(next, true); },
      rail: function () { return rail; },
      item: function () { return itemIndex; },
      slide: function () { return slideIndex; },
      slideCount: function () {
        var item = currentItem();
        return item ? item.slides.length : 0;
      },
      foco: function () { return focoOn; },
      setFoco: setFoco,
      volume: function () { return muted ? 0 : volume; },
      setVolume: setVolume,
      openLeft: function () { if (!leftOpen) toggleRail("left"); },
      openRight: function () { if (!rightOpen) toggleRail("right"); },
      chooseLeft: function (index) { chooseItem("left", index, true); },
      chooseRight: function (index) { chooseItem("right", index, true); },
      nextSlide: function () { stepSlide(1); },
      prevSlide: function () { stepSlide(-1); },
      destroy: function () {
        document.removeEventListener("keydown", onShortcut);
        document.body.removeAttribute("data-l199-foco");
      }
    };
    if (cfg.exportName) global[cfg.exportName] = api;
    global.__L199 = api;
    return api;
  }

  function boot() {
    if (!global.__L199_CFG__) return;
    mount(global.__L199_CFG__);
  }

  global.CampusPlantillaShell = { mount: mount };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : this);
