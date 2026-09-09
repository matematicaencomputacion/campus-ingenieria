/*! Campus Ingeniería · Enfoque · choice squares (kind:"elige" / standalone). */
(function (global) {
  "use strict";

  function parseStored(key) {
    if (!key) return [];
    try {
      var raw = global.sessionStorage.getItem(key);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(function (x) { return typeof x === "string"; }) : [];
    } catch (err) {
      return [];
    }
  }

  function writeStored(key, ids) {
    if (!key) return;
    try {
      global.sessionStorage.setItem(key, JSON.stringify(ids));
    } catch (err) {
      /* private mode / quota — UI still works */
    }
  }

  function optionById(options, id) {
    var i;
    for (i = 0; i < options.length; i++) {
      if (options[i].id === id) return options[i];
    }
    return null;
  }

  function mount(host, opts) {
    if (!host) throw new Error("Enfoque elige: falta el contenedor");
    opts = opts || {};
    var options = opts.options || [];
    if (!options.length) throw new Error("Enfoque elige: options[] vacío");
    var storageKey = opts.storageKey || "";
    var min = opts.min == null ? 1 : opts.min;
    var confirmLabel = opts.confirmLabel || "Seguir";
    var selected = {};
    var confirmed = false;

    var stored = parseStored(storageKey);
    stored.forEach(function (id) {
      if (optionById(options, id)) selected[id] = true;
    });
    if (stored.length) confirmed = true;

    host.classList.add("enfoque-elige");
    host.innerHTML = "";

    var grid = document.createElement("div");
    grid.className = "enfoque-elige-grid";
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", opts.ariaLabel || "Elegí formas");

    var buttons = [];

    function selectedIds() {
      return options.map(function (o) { return o.id; }).filter(function (id) { return selected[id]; });
    }

    function selectedCount() {
      return selectedIds().length;
    }

    function renderChips() {
      chips.innerHTML = "";
      if (!confirmed || selectedCount() < min) return;
      selectedIds().forEach(function (id) {
        var opt = optionById(options, id);
        var chip = document.createElement("span");
        chip.className = "enfoque-chip";
        chip.textContent = opt ? opt.label : id;
        chips.appendChild(chip);
      });
    }

    function sync() {
      var n = selectedCount();
      var ready = n >= min;
      confirmBtn.disabled = !ready;
      buttons.forEach(function (btn) {
        var on = !!selected[btn.getAttribute("data-id")];
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (!ready) {
        msg.className = "enfoque-elige-msg warn";
        msg.textContent = min <= 1
          ? "Elegí al menos una forma para seguir."
          : "Elegí al menos " + min + " formas para seguir.";
      } else if (confirmed) {
        msg.className = "enfoque-elige-msg ok";
        msg.textContent = "Listo · estas formas quedan para las próximas prácticas.";
      } else {
        msg.className = "enfoque-elige-msg";
        msg.textContent = n === 1 ? "1 forma elegida." : n + " formas elegidas.";
      }
      renderChips();
      if (typeof opts.onChange === "function") opts.onChange(selectedIds(), { confirmed: confirmed });
    }

    options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "enfoque-elige-sq";
      btn.setAttribute("data-id", opt.id);
      btn.setAttribute("aria-pressed", selected[opt.id] ? "true" : "false");
      btn.textContent = opt.label;
      if (opt.color) btn.style.setProperty("--tab-color", opt.color);
      btn.addEventListener("click", function () {
        selected[opt.id] = !selected[opt.id];
        confirmed = false;
        sync();
      });
      grid.appendChild(btn);
      buttons.push(btn);
    });

    var actions = document.createElement("div");
    actions.className = "enfoque-elige-actions";

    var confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "btn primary";
    confirmBtn.textContent = confirmLabel;

    var msg = document.createElement("p");
    msg.className = "enfoque-elige-msg";
    msg.setAttribute("aria-live", "polite");

    var chips = document.createElement("div");
    chips.className = "enfoque-chips";
    chips.setAttribute("aria-live", "polite");

    confirmBtn.addEventListener("click", function () {
      var ids = selectedIds();
      if (ids.length < min) return;
      confirmed = true;
      writeStored(storageKey, ids);
      sync();
      if (typeof opts.onConfirm === "function") opts.onConfirm(ids);
    });

    actions.appendChild(confirmBtn);
    actions.appendChild(msg);

    host.appendChild(grid);
    host.appendChild(actions);
    host.appendChild(chips);
    sync();

    return {
      getSelection: selectedIds,
      isConfirmed: function () { return confirmed; }
    };
  }

  global.CampusEnfoqueElige = {
    mount: mount,
    read: parseStored
  };
})(typeof window !== "undefined" ? window : this);
