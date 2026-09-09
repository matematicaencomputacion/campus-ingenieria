/*! Campus Ingeniería · Enfoque · CFG-driven vertical tabs (Figma-like right rail). */
(function (global) {
  "use strict";

  var CSS_HREF = "enfoque-tabs.css?v=20260909d";
  var UI_KEY = "campus_enfoque_ui";
  var RAIL_SLIM = 48;
  var RAIL_LABELED = 88;
  var RAIL_MIN = 44;
  var RAIL_MAX = 120;
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
    var slideIndex = [];
    var active = start;
    var varHost = root.closest(".enfoque-nav-host") || root;

    var tabPrev = makePager("eleccion", "prev");
    var tabNext = makePager("eleccion", "next");
    var slidePrev = makePager("lamina", "prev");
    var slideNext = makePager("lamina", "next");
    tabPrev.title = "Elección · etiqueta anterior";
    tabNext.title = "Elección · etiqueta siguiente";
    slidePrev.title = "Lámina anterior";
    slideNext.title = "Lámina siguiente";
    tabPrev.setAttribute("aria-label", "Etiqueta anterior");
    tabNext.setAttribute("aria-label", "Etiqueta siguiente");
    slidePrev.setAttribute("aria-label", "Lámina anterior");
    slideNext.setAttribute("aria-label", "Lámina siguiente");

    function persist() {
      writeUi(uiKey, { labels: labelsOn, min: minimized, rail: railPx });
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
        slideEl.hidden = sIdx !== 0;
        fillSlide(slideEl, slide, cfg);
        panel.appendChild(slideEl);
        slideEls.push(slideEl);
      });
      body.appendChild(panel);
      panels.push(panel);
      slideSets.push(slideEls);
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

    main.appendChild(chrome);
    main.appendChild(body);
    main.appendChild(tabPrev);
    main.appendChild(tabNext);
    main.appendChild(slidePrev);
    main.appendChild(slideNext);
    rail.appendChild(split);
    rail.appendChild(tabStrip);
    rail.appendChild(railTools);
    shell.appendChild(main);
    shell.appendChild(rail);
    root.appendChild(shell);
    applyUi();
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
      setMinimized: setMinimized,
      setLabels: setLabels,
      destroy: function () {
        document.removeEventListener("keydown", onShortcut);
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
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

  global.CampusEnfoqueTabs = { mount: mount };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : this);
