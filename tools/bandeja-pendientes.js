/*! Campus Ingeniería · bandeja alumno Top-K pendientes (scaffolding, localStorage). */
(function (global) {
  "use strict";

  var STORAGE_KEY = "campus.bandeja.v1";
  var DEFAULT_K = 10;
  var ALLOWED_K = [5, 10, 15];
  var TOAST_MS = 2600;
  var memoryStore = {};
  var toastTimer = 0;

  function emptyState() {
    return { k: DEFAULT_K, statusById: {}, enabledById: {}, rankById: {} };
  }

  var storageFailed = false;
  var memoryStorage = {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null; },
    setItem: function (key, value) { memoryStore[key] = String(value); },
    removeItem: function (key) { delete memoryStore[key]; }
  };

  function getStorage() {
    if (storageFailed) return memoryStorage;
    try {
      if (api._storage) return api._storage;
      if (global.localStorage) return global.localStorage;
    } catch (err) { /* Switch to the session copy below. */ }
    storageFailed = true;
    return memoryStorage;
  }

  function loadState() {
    var raw;
    try {
      raw = getStorage().getItem(STORAGE_KEY);
      if (raw == null) delete memoryStore[STORAGE_KEY];
      else memoryStore[STORAGE_KEY] = raw;
    } catch (err) {
      storageFailed = true;
      raw = memoryStorage.getItem(STORAGE_KEY);
    }
    if (!raw) return emptyState();
    try {
      var parsed = JSON.parse(raw);
      var state = emptyState();
      state.k = normalizeK(parsed && parsed.k);
      if (parsed && parsed.statusById && typeof parsed.statusById === "object") {
        state.statusById = parsed.statusById;
      }
      if (parsed && parsed.enabledById && typeof parsed.enabledById === "object") {
        state.enabledById = parsed.enabledById;
      }
      if (parsed && parsed.rankById && typeof parsed.rankById === "object") {
        state.rankById = parsed.rankById;
      }
      return state;
    } catch (err) {
      return emptyState();
    }
  }

  function saveState(state) {
    var serialized = JSON.stringify(state);
    memoryStorage.setItem(STORAGE_KEY, serialized);
    try {
      getStorage().setItem(STORAGE_KEY, serialized);
    } catch (err) {
      storageFailed = true;
    }
  }

  function resetState() {
    memoryStore = {};
    try {
      getStorage().removeItem(STORAGE_KEY);
    } catch (err) {
      storageFailed = true;
    }
    return emptyState();
  }

  function normalizeK(value) {
    var n = Number(value);
    if (ALLOWED_K.indexOf(n) !== -1) return n;
    return DEFAULT_K;
  }

  function seedItems() {
    var queue = global.CAMPUS_PENDING_QUEUE;
    if (!queue || !Array.isArray(queue.items)) return [];
    return queue.items;
  }

  function seedDefaultK() {
    var queue = global.CAMPUS_PENDING_QUEUE;
    if (queue && typeof queue.defaultK === "number") return normalizeK(queue.defaultK);
    return DEFAULT_K;
  }

  function normalizeStatus(value) {
    if (value === "done" || value === "pending") return value;
    return "pending";
  }

  function mergeQueue(seed, state) {
    var list = Array.isArray(seed) ? seed : [];
    var st = state || emptyState();
    return list.map(function (item) {
      var id = item.id;
      var status = st.statusById[id] != null ? normalizeStatus(st.statusById[id]) : normalizeStatus(item.status);
      var enabled = st.enabledById[id] != null ? !!st.enabledById[id] : item.enabled !== false;
      var rank = st.rankById[id] != null ? Number(st.rankById[id]) : Number(item.rank);
      if (!isFinite(rank)) rank = 999;
      return {
        id: id,
        title: item.title,
        href: item.href,
        rank: rank,
        status: status,
        enabled: enabled
      };
    });
  }

  function sortByRank(items) {
    return items.slice().sort(function (a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
  }

  function pendingItems(items) {
    return sortByRank(items.filter(function (it) {
      return it.enabled !== false && it.status === "pending";
    }));
  }

  function topPending(items, k) {
    return pendingItems(items).slice(0, normalizeK(k));
  }

  function countPending(items) {
    return pendingItems(items).length;
  }

  function markDone(state, id) {
    var next = state || emptyState();
    next.statusById[id] = "done";
    return next;
  }

  function setStatus(state, id, status) {
    var next = state || emptyState();
    next.statusById[id] = normalizeStatus(status);
    return next;
  }

  function setEnabled(state, id, enabled) {
    var next = state || emptyState();
    next.enabledById[id] = !!enabled;
    return next;
  }

  function setK(state, k) {
    var next = state || emptyState();
    next.k = normalizeK(k);
    return next;
  }

  function swapRank(items, state, id, direction) {
    var next = state || emptyState();
    var ordered = sortByRank(items);
    var index = -1;
    for (var i = 0; i < ordered.length; i++) {
      if (ordered[i].id === id) {
        index = i;
        break;
      }
    }
    var other = index + direction;
    if (index < 0 || other < 0 || other >= ordered.length) return next;
    var a = ordered[index];
    var b = ordered[other];
    next.rankById[a.id] = b.rank;
    next.rankById[b.id] = a.rank;
    return next;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeHref(href) {
    if (typeof href !== "string") return "#";
    if (!/^[A-Za-z0-9._-]+\.html$/.test(href)) return "#";
    return href;
  }

  function pendingLabel(n, k) {
    var noun = n === 1 ? "tarea pendiente" : "tareas pendientes";
    return "Tenés " + n + " " + noun + " (top " + k + ")";
  }

  function showToast(root, message) {
    var toast = root.querySelector("[data-bandeja-toast]");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add("is-on");
    if (toastTimer) global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(function () {
      toast.classList.remove("is-on");
      toast.hidden = true;
    }, TOAST_MS);
  }

  function renderRow(item, index) {
    return (
      '<li class="bandeja-item">' +
        '<span class="bandeja-rank" aria-hidden="true">' + (index + 1) + "</span>" +
        '<a class="bandeja-link" href="' + escapeHtml(safeHref(item.href)) + '">' +
          escapeHtml(item.title) +
        "</a>" +
        '<button type="button" class="bandeja-done" data-bandeja-action="done" data-id="' +
          escapeHtml(item.id) +
        '">Marcar hecha</button>' +
      "</li>"
    );
  }

  function renderTeacherRow(item) {
    var enabled = item.enabled !== false;
    var done = item.status === "done";
    return (
      '<li class="bandeja-teacher-item' + (enabled ? "" : " is-off") + '">' +
        '<label class="bandeja-check">' +
          '<input type="checkbox" data-bandeja-action="enable" data-id="' +
            escapeHtml(item.id) +
          '"' +
          (enabled ? " checked" : "") +
          " />" +
          "<span>En cola</span>" +
        "</label>" +
        '<span class="bandeja-teacher-rank">#' + escapeHtml(item.rank) + "</span>" +
        '<span class="bandeja-teacher-title">' + escapeHtml(item.title) + "</span>" +
        '<div class="bandeja-teacher-actions">' +
          '<button type="button" class="bandeja-icon" data-bandeja-action="rank-up" data-id="' +
            escapeHtml(item.id) +
          '" aria-label="Subir prioridad">↑</button>' +
          '<button type="button" class="bandeja-icon" data-bandeja-action="rank-down" data-id="' +
            escapeHtml(item.id) +
          '" aria-label="Bajar prioridad">↓</button>' +
          '<button type="button" class="bandeja-mini" data-bandeja-action="status" data-id="' +
            escapeHtml(item.id) +
          '" data-status="' +
          (done ? "pending" : "done") +
          '">' +
            (done ? "Volver a pendiente" : "Marcar hecha") +
          "</button>" +
        "</div>" +
      "</li>"
    );
  }

  function kButtons(k) {
    return ALLOWED_K.map(function (value) {
      var active = value === k ? " is-active" : "";
      return (
        '<button type="button" class="bandeja-k-btn' +
          active +
          '" data-bandeja-action="k" data-k="' +
          value +
          '" aria-pressed="' +
          (value === k ? "true" : "false") +
        '">' +
          value +
        "</button>"
      );
    }).join("");
  }

  function render(root, options) {
    var opts = options || {};
    var state = opts.state || loadState();
    if (state.k === DEFAULT_K && !opts.state) {
      state.k = seedDefaultK();
    }
    var items = mergeQueue(opts.seed || seedItems(), state);
    var k = normalizeK(state.k);
    var pending = pendingItems(items);
    var shown = pending.slice(0, k);
    var n = pending.length;
    var teacherOpen = opts.teacherOpen;
    if (teacherOpen == null) {
      var prev = root.querySelector("[data-bandeja-teacher]");
      teacherOpen = !!(prev && prev.open);
    }

    var listHtml;
    if (shown.length === 0) {
      listHtml = '<p class="bandeja-empty">No hay tareas pendientes. ¡Bandeja al día!</p>';
    } else {
      listHtml = '<ol class="bandeja-list">' + shown.map(renderRow).join("") + "</ol>";
    }

    root.innerHTML =
      '<div class="bandeja-head">' +
        '<div class="bandeja-badge">' +
          '<span class="bandeja-hourglass" aria-hidden="true">⏳</span>' +
          '<div>' +
            '<p class="bandeja-title" id="bandeja-title">' + escapeHtml(pendingLabel(n, k)) + "</p>" +
            '<p class="bandeja-sub">Prototipo público · sin login · queda en este navegador</p>' +
          "</div>" +
        "</div>" +
        '<div class="bandeja-head-actions">' +
          '<span class="bandeja-proto">scaffolding</span>' +
          '<button type="button" class="bandeja-mail" data-bandeja-action="mail">Recordatorio mail</button>' +
        "</div>" +
      "</div>" +
      listHtml +
      '<details class="bandeja-teacher" data-bandeja-teacher' +
        (teacherOpen ? " open" : "") +
      ">" +
        "<summary>Controles docente (mock, solo este navegador)</summary>" +
        '<div class="bandeja-teacher-body">' +
          '<div class="bandeja-k-row">' +
            "<span>Esfuerzo K</span>" +
            '<div class="bandeja-k-group" role="group" aria-label="Elegir K">' +
              kButtons(k) +
            "</div>" +
          "</div>" +
          '<ol class="bandeja-teacher-list">' +
            sortByRank(items).map(renderTeacherRow).join("") +
          "</ol>" +
          '<button type="button" class="bandeja-reset" data-bandeja-action="reset">Restaurar demo</button>' +
        "</div>" +
      "</details>" +
      '<div class="bandeja-toast" data-bandeja-toast role="status" aria-live="polite" hidden></div>';

    if (global.CampusLessonNavigation) global.CampusLessonNavigation.refreshLessonLinks(root);
    if (opts.toast) showToast(root, opts.toast);
    return { items: items, shown: shown, pendingCount: n, k: k, state: state };
  }

  function currentTeacherOpen(root) {
    var el = root.querySelector("[data-bandeja-teacher]");
    return !!(el && el.open);
  }

  function applyAndRender(root, mutator, extra) {
    var state = loadState();
    state = mutator(state, mergeQueue(seedItems(), state)) || state;
    saveState(state);
    var opts = extra || {};
    opts.state = state;
    opts.seed = seedItems();
    if (opts.teacherOpen == null) opts.teacherOpen = currentTeacherOpen(root);
    return render(root, opts);
  }

  function handleAction(root, action, target) {
    var id = target.getAttribute("data-id");
    switch (action) {
      case "done":
        applyAndRender(root, function (state) {
          return markDone(state, id);
        });
        return;
      case "mail":
        showToast(root, "próximamente");
        return;
      case "k":
        applyAndRender(root, function (state) {
          return setK(state, target.getAttribute("data-k"));
        }, { teacherOpen: true });
        return;
      case "enable":
        applyAndRender(root, function (state) {
          return setEnabled(state, id, target.checked);
        }, { teacherOpen: true });
        return;
      case "rank-up":
        applyAndRender(root, function (state, items) {
          return swapRank(items, state, id, -1);
        }, { teacherOpen: true });
        return;
      case "rank-down":
        applyAndRender(root, function (state, items) {
          return swapRank(items, state, id, 1);
        }, { teacherOpen: true });
        return;
      case "status":
        applyAndRender(root, function (state) {
          return setStatus(state, id, target.getAttribute("data-status"));
        }, { teacherOpen: true });
        return;
      case "reset":
        resetState();
        render(root, { teacherOpen: true, toast: "Demo restaurada" });
        return;
      default: {
        var _exhaustive = action;
        if (typeof _exhaustive === "string" && _exhaustive) {
          return;
        }
        return;
      }
    }
  }

  function bind(root) {
    if (root.getAttribute("data-bandeja-bound") === "1") return;
    root.setAttribute("data-bandeja-bound", "1");
    root.addEventListener("click", function (ev) {
      var target = ev.target && ev.target.closest && ev.target.closest("[data-bandeja-action]");
      if (!target || !root.contains(target)) return;
      var action = target.getAttribute("data-bandeja-action");
      if (action === "enable") return;
      handleAction(root, action, target);
    });
    root.addEventListener("change", function (ev) {
      var target = ev.target;
      if (!target || target.getAttribute("data-bandeja-action") !== "enable") return;
      handleAction(root, "enable", target);
    });
  }

  function boot() {
    var root = global.document && global.document.getElementById("bandeja-pendientes");
    if (!root) return;
    bind(root);
    render(root, {});
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_K: DEFAULT_K,
    ALLOWED_K: ALLOWED_K,
    emptyState: emptyState,
    loadState: loadState,
    saveState: saveState,
    resetState: resetState,
    normalizeK: normalizeK,
    mergeQueue: mergeQueue,
    topPending: topPending,
    pendingItems: pendingItems,
    countPending: countPending,
    markDone: markDone,
    setStatus: setStatus,
    setEnabled: setEnabled,
    setK: setK,
    swapRank: swapRank,
    pendingLabel: pendingLabel,
    render: render,
    boot: boot
  };

  global.CampusBandeja = api;

  if (global.document) {
    if (global.document.readyState === "loading") {
      global.document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
