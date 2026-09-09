/*! Campus Ingeniería · Enfoque · CFG-driven vertical tabs (right rail). */
(function (global) {
  "use strict";

  var CSS_HREF = "enfoque-tabs.css?v=20260909";
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

  function fillPanel(panel, tab, cfg) {
    var kind = tab.kind || "html";
    switch (kind) {
      case "html":
        panel.innerHTML = tab.html || "";
        break;
      case "elige":
        panel.innerHTML = "";
        if (tab.title) {
          var kicker = document.createElement("p");
          kicker.className = "enfoque-kicker";
          kicker.textContent = tab.kicker || "Cierre";
          var title = document.createElement("h2");
          title.className = "enfoque-title";
          title.textContent = tab.title;
          var lead = document.createElement("p");
          lead.className = "enfoque-lead";
          lead.textContent = tab.lead || "Marcá una o más formas. Hace falta al menos una para seguir.";
          panel.appendChild(kicker);
          panel.appendChild(title);
          panel.appendChild(lead);
        }
        if (tab.html) {
          var extra = document.createElement("div");
          extra.innerHTML = tab.html;
          panel.appendChild(extra);
        }
        var host = document.createElement("div");
        panel.appendChild(host);
        if (!global.CampusEnfoqueElige) {
          throw new Error("Enfoque: falta enfoque-elige.js");
        }
        global.CampusEnfoqueElige.mount(host, {
          options: tab.options || [],
          storageKey: tab.storageKey || cfg.storageKey || "",
          min: tab.min == null ? 1 : tab.min,
          confirmLabel: tab.confirmLabel || "Seguir",
          ariaLabel: tab.title || "Elegí formas",
          onConfirm: tab.onConfirm
        });
        break;
      default:
        unknownKind(kind);
    }
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

    var start = 0;
    if (cfg.hash !== false && global.location.hash) {
      start = findTabIndex(tabs, global.location.hash.replace(/^#/, ""));
    }

    root.innerHTML = "";
    var shell = document.createElement("div");
    shell.className = "enfoque-shell";

    var main = document.createElement("div");
    main.className = "enfoque-main";

    var rail = document.createElement("div");
    rail.className = "enfoque-rail";
    rail.setAttribute("role", "tablist");
    rail.setAttribute("aria-orientation", "vertical");
    rail.setAttribute("aria-label", cfg.tablistLabel || "Formas");

    var tabBtns = [];
    var panels = [];
    var active = start;

    function activate(index, fromUser) {
      if (index < 0) index = 0;
      if (index >= tabs.length) index = tabs.length - 1;
      active = index;
      var color = tabColor(tabs[index], index);
      main.style.setProperty("--enfoque-active", color);
      main.scrollTop = 0;
      tabBtns.forEach(function (btn, i) {
        var on = i === index;
        btn.setAttribute("aria-selected", on ? "true" : "false");
        btn.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (fromUser && cfg.hash !== false) {
        var id = tabId(tabs[index], index);
        try {
          global.history.replaceState(null, "", "#" + id);
        } catch (err) {
          global.location.hash = id;
        }
      }
      if (fromUser) tabBtns[index].focus();
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
      btn.textContent = tab.tab || tab.title || String(index + 1);
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
      rail.appendChild(btn);
      tabBtns.push(btn);

      var panel = document.createElement("section");
      panel.className = "enfoque-panel";
      panel.id = "enfoque-panel-" + id;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", btn.id);
      panel.hidden = true;
      fillPanel(panel, tab, cfg);
      main.appendChild(panel);
      panels.push(panel);
    });

    shell.appendChild(main);
    shell.appendChild(rail);
    root.appendChild(shell);
    activate(start, false);

    var api = {
      CFG: cfg,
      activate: function (index) { activate(index, true); },
      index: function () { return active; }
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
