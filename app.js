(function () {
  const D = window.CAMPUS;
  if (!D.universities) D.universities = [];
  if (!D.countries) D.countries = [];
  if (!D.careers) D.careers = [];
  if (!D.events) D.events = [];
  const profileKey = "campus.profile.v1";
  const layoutKey = "campus.layout.v2";

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return fallback;
  }

  function escapeHTML(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const DESMOS_TOOLS = [
    { id: "graphing", name: "Calculadora Gráfica", short: "Gráfica", color: "#2a9d5c", url: "https://www.desmos.com/calculator?lang=es", icon: "∿", dock: "center", panelW: "min(520px, 48vw)" },
    { id: "scientific", name: "Calculadora Científica", short: "Científica", color: "#1a9b8e", url: "https://www.desmos.com/scientific?lang=es", icon: "∛", dock: "right", panelW: "min(400px, 40vw)" },
    { id: "fourfunction", name: "Calculadora de Cuatro Funciones", short: "4 funciones", color: "#0f766e", url: "https://www.desmos.com/fourfunction?lang=es", icon: "÷", dock: "right", panelW: "min(360px, 36vw)" },
    { id: "matrix", name: "Calculadora de Matrices", short: "Matrices", color: "#6d28d9", url: "https://www.desmos.com/matrix?lang=es", icon: "[⋅]", dock: "left", panelW: "min(400px, 40vw)" },
    { id: "geometry", name: "Herramienta de Geometría", short: "Geometría", color: "#a21caf", url: "https://www.desmos.com/geometry?lang=es", icon: "◯", dock: "center", panelW: "min(560px, 52vw)" },
    { id: "threeD", name: "Calculadora 3D", short: "3D", color: "#db2777", url: "https://www.desmos.com/3d?lang=es", icon: "▣", dock: "center", panelW: "min(560px, 52vw)" },
    { id: "notebook", name: "Cuaderno", short: "Cuaderno", color: "#0369a1", url: "https://www.desmos.com/notebook?lang=es", icon: "▤", dock: "center", panelW: "min(560px, 52vw)" },
  ];
  function toolById(id) {
    return DESMOS_TOOLS.find((t) => t.id === id) || DESMOS_TOOLS[0];
  }
  const SPLIT_WITH_SCI = new Set(["graphing", "geometry", "threeD"]);
  const SCI_URL = "https://www.desmos.com/scientific?lang=es";
  function canSplitWithSci(id) {
    return SPLIT_WITH_SCI.has(id);
  }
  function frameForTool(id) {
    const tool = toolById(id);
    const dock = tool.dock || "center";
    return {
      dock,
      left: "collapsed",
      right: "collapsed",
      top: "open",
      bot: "collapsed",
      maximized: false,
      splitSci: false,
    };
  }
  function toggleSplitSci(toolId) {
    if (!canSplitWithSci(toolId)) return;
    const f = state.openTools[toolId];
    if (!f) return;
    f.splitSci = !f.splitSci;
    f.maximized = false;
    f.dock = "center";
    f.left = "collapsed";
    f.right = "collapsed";
    f.bot = "collapsed";
    f.top = "open";
    focusTool(toolId);
    syncToolLayers();
  }
  function snapDock(toolId, side) {
    const f = state.openTools[toolId];
    if (!f) return;
    f.maximized = false;
    if (side !== "center") f.splitSci = false;
    f.dock = side;
    if (side === "left" || side === "right") {
      f.left = "collapsed";
      f.right = "collapsed";
      f.bot = "collapsed";
      f.top = "open";
    } else {
      f.left = "collapsed";
      f.right = "collapsed";
      f.bot = "collapsed";
      f.top = "open";
    }
    focusTool(toolId);
    syncToolLayers();
  }
  function isToolOpen(id) {
    return !!state.openTools[id];
  }
  function focusTool(id) {
    if (!state.openTools[id]) return;
    state.openOrder = state.openOrder.filter((x) => x !== id);
    state.openOrder.push(id);
  }
  function openTool(id) {
    if (!state.openTools[id]) {
      state.openTools[id] = frameForTool(id);
      state.openOrder.push(id);
    } else {
      focusTool(id);
    }
  }
  function closeTool(id) {
    delete state.openTools[id];
    state.openOrder = state.openOrder.filter((x) => x !== id);
  }
  function toggleTool(id) {
    if (isToolOpen(id)) closeTool(id);
    else openTool(id);
  }
  function sameDockStackIndex(id) {
    const f = state.openTools[id];
    if (!f || f.maximized) return 0;
    const dock = f.dock || "center";
    if (dock === "center") return 0;
    let n = 0;
    for (const oid of state.openOrder) {
      if (oid === id) break;
      const of = state.openTools[oid];
      if (!of || of.maximized) continue;
      if ((of.dock || "center") === dock) n += 1;
    }
    return n;
  }
  const toolsKey = "campus.tools.v1";
  function defaultToolVisibility() {
    const o = {};
    DESMOS_TOOLS.forEach((t) => { o[t.id] = true; });
    return o;
  }
  function loadToolVisibility() {
    const raw = loadJSON(toolsKey, null);
    const base = defaultToolVisibility();
    if (!raw || typeof raw !== "object") return base;
    DESMOS_TOOLS.forEach((t) => {
      if (typeof raw[t.id] === "boolean") base[t.id] = raw[t.id];
    });
    return base;
  }
  function saveToolVisibility() {
    localStorage.setItem(toolsKey, JSON.stringify(state.toolVisibility));
  }
  function normalizeMode(v, fallback) {
    if (v === "collapsed" || v === "open" || v === "wide") return v;
    if (v === false) return "collapsed";
    if (v === true) return "open";
    return fallback;
  }
  function defaultProfile() {
    return {
      countryIds: ["ar"],
      universityIds: ["udi"],
      careerIds: ["informatica", "sistemas"],
      activeCareerId: "informatica",
      customUniversities: [],
      customCareers: [],
    };
  }
  function loadProfile() {
    const p = loadJSON(profileKey, null);
    if (!p) return defaultProfile();
    return {
      countryIds: Array.isArray(p.countryIds) ? p.countryIds : (p.countryId ? [p.countryId] : []),
      universityIds: Array.isArray(p.universityIds) ? p.universityIds : [],
      careerIds: Array.isArray(p.careerIds) ? p.careerIds : [],
      activeCareerId: p.activeCareerId || (p.careerIds && p.careerIds[0]) || null,
      customUniversities: Array.isArray(p.customUniversities) ? p.customUniversities : [],
      customCareers: Array.isArray(p.customCareers) ? p.customCareers : [],
    };
  }
  function saveProfile() {
    localStorage.setItem(profileKey, JSON.stringify(state.profile));
  }

  const layout = loadJSON(layoutKey, null) || (() => {
    const legacy = loadJSON("campus.layout", null);
    if (legacy) {
      return {
        leftMode: legacy.sidebarOpen === false ? "collapsed" : "open",
        rightMode: legacy.rightbarOpen === false ? "collapsed" : "open",
      };
    }
    return { leftMode: "open", rightMode: "open" };
  })();

  const state = {
    view: "login",
    careerId: null,
    materiaId: null,
    tab: "bienvenida",
    openTemas: {},
    selectedNodo: null,
    videoIdx: 0,
    leftMode: normalizeMode(layout.leftMode, "open"),
    rightMode: normalizeMode(layout.rightMode, "open"),
    profile: loadProfile(),
    settingsSection: "estudio",
    settingsSavedFlash: false,
    draft: null,
    openTools: {},
    openOrder: [],
    toolVisibility: loadToolVisibility(),
    toolsMenuOpen: false,
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  function enrolledCareers() {
    return D.careers.filter((c) => state.profile.careerIds.includes(c.id));
  }
  function careerById(id) {
    return D.careers.find((c) => c.id === id);
  }
  function career() {
    return careerById(state.careerId);
  }
  function materia() {
    const c = career();
    return c?.materias.find((m) => m.id === state.materiaId);
  }
  function countriesSelected() {
    return (D.countries || []).filter((c) => (state.profile.countryIds || []).includes(c.id));
  }
  function universitiesSelected() {
    return D.universities.filter((u) => state.profile.universityIds.includes(u.id));
  }
  function initials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  function saveLayout() {
    localStorage.setItem(
      layoutKey,
      JSON.stringify({ leftMode: state.leftMode, rightMode: state.rightMode })
    );
  }

  function parseHash() {
    const previousNode = state.selectedNodo;
    state.selectedNodo = null;
    const raw = location.hash.replace(/^#\/?/, "");
    if (!raw || raw === "login") {
      state.view = "login";
      state.careerId = null;
      state.materiaId = null;
      return;
    }
    const parts = raw.split("/");
    if (parts[0] === "settings") {
      state.view = "settings";
      state.settingsSection = parts[1] || "estudio";
      state.careerId = state.profile.activeCareerId || state.profile.careerIds[0] || null;
      state.materiaId = null;
      return;
    }
    if (parts[0] === "home") {
      state.view = "home";
      const wanted = parts[1] || state.profile.activeCareerId || state.profile.careerIds[0];
      state.careerId = state.profile.careerIds.includes(wanted)
        ? wanted
        : state.profile.careerIds[0] || null;
      state.materiaId = null;
      return;
    }
    if (parts[0] === "materia" && parts[1] && parts[2]) {
      state.view = "materia";
      state.careerId = parts[1];
      state.materiaId = parts[2];
      state.tab = parts[3] || "bienvenida";
      if (state.tab === "temario" && parts[4]) {
        const selectedTema = materia()?.temas.find(t => t.nodos.some(n => n.id === parts[4]));
        if (selectedTema) {
          state.selectedNodo = parts[4];
          if (previousNode !== parts[4]) state.openTemas[selectedTema.id] = true;
        }
      }
      return;
    }
    state.view = "login";
  }

  function go(hash) {
    location.hash = hash;
  }

  function ensureDraft() {
    if (!state.draft) {
      state.draft = {
        countryIds: [...(state.profile.countryIds || [])],
        universityIds: [...state.profile.universityIds],
        careerIds: [...state.profile.careerIds],
        activeCareerId: state.profile.activeCareerId,
        customUniversities: [...(state.profile.customUniversities || [])],
        customCareers: [...(state.profile.customCareers || [])],
        countryQuery: "",
        uniQuery: "",
        careerQuery: "",
        customUniInput: "",
        customCareerInput: "",
      };
    }
    if (!Array.isArray(state.draft.countryIds)) state.draft.countryIds = [...(state.profile.countryIds || [])];
    if (!Array.isArray(state.draft.customUniversities)) state.draft.customUniversities = [...(state.profile.customUniversities || [])];
    if (!Array.isArray(state.draft.customCareers)) state.draft.customCareers = [...(state.profile.customCareers || [])];
    if (state.draft.countryQuery == null) state.draft.countryQuery = "";
    if (state.draft.uniQuery == null) state.draft.uniQuery = "";
    if (state.draft.careerQuery == null) state.draft.careerQuery = "";
    if (state.draft.customUniInput == null) state.draft.customUniInput = "";
    if (state.draft.customCareerInput == null) state.draft.customCareerInput = "";
  }

  function render() {
    parseHash();
    const root = $("#app");
    if (state.view === "login") {
      root.innerHTML = renderLogin();
      bindLogin();
      return;
    }
    if (state.view === "settings") {
      ensureDraft();
      root.innerHTML = renderShell(renderSettings(), renderSettingsRight()) + renderDesmosLayer();
      bindShell();
      bindSettings();
      bindDesmos();
      return;
    }
    if (!state.profile.careerIds.length) {
      root.innerHTML = renderShell(renderNeedsSetup(), renderHomeRight()) + renderDesmosLayer();
      bindShell();
      bindDesmos();
      return;
    }
    if (state.view === "home") {
      root.innerHTML = renderShell(renderHome(), renderHomeRight()) + renderDesmosLayer();
      bindShell();
      bindDesmos();
      return;
    }
    if (state.view === "materia") {
      root.innerHTML = renderShell(renderMateria(), renderMateriaRight()) + renderDesmosLayer();
      bindShell();
      bindMateria();
      bindDesmos();
    }
  }

  function renderLogin() {
    const hasProfile = state.profile.careerIds.length > 0;
    const pais = countriesSelected().map((c) => c.name).join(" · ") || "Sin país";
    const uni = universitiesSelected().map((u) => u.short).join(" · ") || "Sin universidad";
    const cars = enrolledCareers().map((c) => c.short).join(", ") || "Sin carreras";
    return `
    <div class="login-page">
      <header class="login-header">
        <div class="brand">
          <div class="brand-mark">CI</div>
          <div>Campus<small>Estudiante</small></div>
        </div>
        <div class="login-contact">✉ soporte@campus-ingenieria.demo</div>
      </header>
      <main class="login-main">
        <h1>Campus · Estudiante</h1>
        <p>Carrera y universidad se configuran una vez en Settings — no en cada ingreso.</p>
        <div class="field">
          ${
            hasProfile
              ? `<div class="settings-card" style="margin-bottom:16px;text-align:left">
                  <h3>Tu perfil de estudio</h3>
                  <p style="margin:0">${pais}</p>
                  <p style="margin:8px 0 0">${uni}</p>
                  <p style="margin:8px 0 0">${cars}</p>
                </div>
                <button class="btn-primary" id="btn-entrar">Entrar al Campus</button>
                <button class="btn-primary" id="btn-settings" style="margin-top:10px;background:transparent;color:var(--blue);border:1px solid var(--blue-mid)">Editar en Settings</button>`
              : `<div class="empty-state" style="margin-bottom:16px">
                  Todavía no elegiste universidad ni carrera.
                </div>
                <button class="btn-primary" id="btn-setup">Configurar mi estudio</button>`
          }
        </div>
      </main>
      <footer class="login-footer">
        <a href="#">Aviso legal</a>
        <a href="#">Política de Privacidad</a>
        <a href="#">Política de Cookies</a>
      </footer>
    </div>`;
  }

  function bindLogin() {
    const entrar = $("#btn-entrar");
    const setup = $("#btn-setup");
    const settings = $("#btn-settings");
    if (entrar) {
      entrar.addEventListener("click", () => {
        const id = state.profile.activeCareerId || state.profile.careerIds[0];
        go(`#/home/${id}`);
      });
    }
    if (setup) setup.addEventListener("click", () => go("#/settings/estudio"));
    if (settings) settings.addEventListener("click", () => go("#/settings/estudio"));
  }

  function bodyLayoutClass() {
    return [
      "app-body",
      state.leftMode === "collapsed" ? "left-collapsed" : "",
      state.leftMode === "wide" ? "left-wide" : "",
      state.rightMode === "collapsed" ? "right-collapsed" : "",
      state.rightMode === "wide" ? "right-wide" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function railClass(side, mode) {
    return ["edge-rail", side, mode === "collapsed" ? "collapsed" : "open", mode === "wide" ? "wide" : ""]
      .filter(Boolean)
      .join(" ");
  }

  function renderShell(mainHtml, rightHtml) {
    const c = career();
    const homeHref = state.profile.careerIds[0]
      ? `#/home/${state.profile.activeCareerId || state.profile.careerIds[0]}`
      : "#/settings/estudio";
    return `
    <div class="app-shell campus">
      <header class="topbar">
        <div class="topbar-left">
          <div class="brand" style="cursor:pointer" id="brand-home">
            <div class="brand-mark">C</div>
            <div>Campus<small>Estudiante</small></div>
          </div>
          ${renderToolsToolbar()}
        </div>
        <div class="top-links">
          <span>Centro de ayuda</span>
          <span>Servicios para estudiantes</span>
          <span>Mentorías</span>
          <span>Atención técnica</span>
        </div>
        <div class="topbar-right">
          <button class="gear-btn ${state.view === "settings" ? "active" : ""}" id="btn-open-settings" title="Settings · universidad y carreras">⚙️</button>
          <div class="top-user">
            <button class="icon-btn" title="Notificaciones"><span>🔔</span><span class="badge">2</span></button>
            <button class="icon-btn" title="Mensajes">✉️</button>
            <div class="avatar">${initials(D.student)}</div>
            <span>${D.student}</span>
          </div>
        </div>
      </header>
      <button type="button" class="${railClass("left", state.leftMode)}" id="rail-left" title="Clic: abrir/cerrar · Doble clic: ensanchar" aria-label="Barra lateral izquierda">
        <span class="rail-hint">nav</span>
      </button>
      <button type="button" class="${railClass("right", state.rightMode)}" id="rail-right" title="Clic: abrir/cerrar · Doble clic: ensanchar" aria-label="Barra lateral derecha">
        <span class="rail-hint">ctx</span>
      </button>
      <div class="${bodyLayoutClass()}" id="app-body">
        <aside class="sidebar">${renderSidebar(c, homeHref)}</aside>
        <main class="main">${mainHtml}</main>
        <aside class="rightbar">${rightHtml}</aside>
      </div>
    </div>`;
  }

  function renderSidebar(c, homeHref) {
    const enrolled = enrolledCareers();
    const tree = enrolled.length
      ? enrolled
          .map((car) => {
            const open = car.id === state.careerId;
            const mats = car.materias
              .map(
                (m) =>
                  `<a href="#/materia/${car.id}/${m.id}" class="${
                    state.materiaId === m.id && state.careerId === car.id ? "active" : ""
                  }">${m.name}</a>`
              )
              .join("");
            return `
        <div class="tree-career" data-id="${car.id}">
          <button type="button" data-toggle="${car.id}">
            <span>${car.short}</span><span>${open ? "▾" : "▸"}</span>
          </button>
          <div class="tree-materias ${open ? "" : "hidden"}">${mats}</div>
        </div>`;
          })
          .join("")
      : `<div class="sub" style="padding:8px">Sin carreras. Configuralas en Settings.</div>`;

    return `
      <nav class="side-nav">
        <a href="${homeHref}" class="${state.view === "home" ? "active" : ""}">🏠 Inicio</a>
        <a href="#/settings/estudio" class="${state.view === "settings" ? "active" : ""}">⚙️ Settings</a>
      </nav>
      <div class="side-section">
        <h3>Tus titulaciones</h3>
        ${tree}
      </div>
      <div class="side-tools">
        <div class="tool">📅<br>Calendario</div>
        <div class="tool">📝<br>Exámenes</div>
        <div class="tool">📚<br>Biblioteca</div>
      </div>
`;
  }

  function applyLayoutClasses() {
    const body = $("#app-body");
    if (body) body.className = bodyLayoutClass();
    const left = $("#rail-left");
    const right = $("#rail-right");
    if (left) left.className = railClass("left", state.leftMode);
    if (right) right.className = railClass("right", state.rightMode);
  }

  function cycleRail(side, widen) {
    const key = side === "left" ? "leftMode" : "rightMode";
    const cur = state[key];
    if (widen) {
      state[key] = cur === "collapsed" ? "wide" : cur === "wide" ? "open" : "wide";
    } else {
      state[key] = cur === "collapsed" ? "open" : "collapsed";
    }
    saveLayout();
    applyLayoutClasses();
  }

  function bindRail(el, side) {
    if (!el) return;
    let clicks = 0;
    let timer = null;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      clicks += 1;
      if (clicks === 1) {
        timer = setTimeout(() => {
          clicks = 0;
          cycleRail(side, false);
        }, 220);
      } else if (clicks === 2) {
        clearTimeout(timer);
        clicks = 0;
        cycleRail(side, true);
      }
    });
  }



  function visibleTools() {
    return DESMOS_TOOLS.filter((t) => state.toolVisibility[t.id] !== false);
  }

  function renderToolsToolbar() {
    const tools = visibleTools()
      .map((t) => {
        const active = isToolOpen(t.id);
        return `
      <button type="button" class="tool-btn ${active ? "active" : ""}" data-tool="${t.id}" style="--tool-color:${t.color}" aria-pressed="${active}" aria-label="${t.name}${active ? " (clic para cerrar)" : ""}">
        <span class="tool-btn-icon" aria-hidden="true">${t.icon}</span>
        <span class="tool-tip" role="tooltip">${t.name}</span>
      </button>`;
      })
      .join("");
    return `
      <div class="tools-toolbar" id="tools-toolbar">
        <div class="tools-btns">${tools || `<span class="tools-empty">Activá herramientas en Settings</span>`}</div>
      </div>`;
  }


  function renderDesmosLayer() {
    /* persistent layers live in #tool-layers via syncToolLayers */
    return "";
  }

  function ensureToolLayersRoot() {
    let root = document.getElementById("tool-layers");
    if (!root) {
      root = document.createElement("div");
      root.id = "tool-layers";
      document.body.appendChild(root);
    }
    return root;
  }

  function frameClass(tool, f) {
    const dock = f.dock || tool.dock || "center";
    const docked = dock === "left" || dock === "right";
    return [
      "tool-frame",
      docked ? `dock-${dock}` : "dock-center",
      f.splitSci ? "split-sci" : "",
      f.maximized ? "maximized" : "",
      f.left === "wide" ? "left-wide" : "",
      f.left === "collapsed" ? "left-collapsed" : "",
      f.right === "wide" ? "right-wide" : "",
      f.right === "collapsed" ? "right-collapsed" : "",
      f.top === "wide" ? "top-wide" : "",
      f.bot === "wide" ? "bot-wide" : "",
      f.bot === "collapsed" ? "bot-collapsed" : "",
    ].filter(Boolean).join(" ");
  }

  function buildToolFrameEl(id) {
    const tool = toolById(id);
    const wrap = document.createElement("div");
    wrap.className = "tool-layer";
    wrap.dataset.toolFrame = id;
    wrap.innerHTML = `
      <div class="tf-backdrop tf-backdrop-soft" data-tool-backdrop="${id}" hidden></div>
      <div class="tool-frame" data-tool-panel="${id}" role="dialog" aria-label="${tool.name}">
        <div class="tf-rail n" data-tf-rail="top" data-tool-id="${id}">
          <span class="tf-title">Desmos · ${tool.name}</span>
          <span class="tf-dock" role="group" aria-label="Posición del panel">
            <button type="button" data-dock="left" data-tool-id="${id}" title="Anclar a la izquierda" aria-label="Anclar a la izquierda">←</button>
            <button type="button" data-dock="center" data-tool-id="${id}" title="${canSplitWithSci(id) ? "Ancho completo · doble clic: + científica" : "Ancho completo"}" aria-label="Ancho completo">▣</button>
            <button type="button" data-dock="right" data-tool-id="${id}" title="Anclar a la derecha" aria-label="Anclar a la derecha">→</button>
          </span>
          <span class="tf-actions">
            <button type="button" data-tool-max="${id}">Pantalla completa</button>
            <button type="button" data-tool-close="${id}">Cerrar</button>
          </span>
        </div>
        <div class="tf-left" data-tf-rail="left" data-tool-id="${id}">
          <button type="button" class="tf-rail-strip" aria-label="Borde izquierdo">expr</button>
          <div class="tf-sidepanel">
            <strong>Expresiones / notas</strong>
            <p style="margin:8px 0 0;opacity:0.8">Doble clic en este borde para ensanchar.</p>
          </div>
        </div>
        <div class="tf-center">
          <div class="tf-main-pane">
            <iframe src="${tool.url}" title="${tool.name}" allow="clipboard-write; fullscreen" loading="lazy"></iframe>
          </div>
          <div class="tf-sci-pane" hidden>
            <div class="tf-sci-label">Científica</div>
            <iframe data-sci-frame="1" title="Calculadora Científica" allow="clipboard-write; fullscreen" loading="lazy"></iframe>
          </div>
        </div>
        <div class="tf-right" data-tf-rail="right" data-tool-id="${id}">
          <div class="tf-sidepanel">
            <strong>Contexto</strong>
            <p style="margin:8px 0 0;opacity:0.8">Notas de materia / nodos vinculados (demo).</p>
          </div>
          <button type="button" class="tf-rail-strip" aria-label="Borde derecho">tools</button>
        </div>
        <div class="tf-rail s" data-tf-rail="bot" data-tool-id="${id}">status · ${tool.url.replace("https://", "")}</div>
      </div>`;
    return wrap;
  }

  function syncToolLayers() {
    const root = ensureToolLayersRoot();
    document.body.classList.toggle("tools-open", Object.keys(state.openTools).length > 0);
    const openIds = new Set(Object.keys(state.openTools));
    [...root.querySelectorAll("[data-tool-frame]")].forEach((el) => {
      if (!openIds.has(el.dataset.toolFrame)) el.remove();
    });
    state.openOrder.forEach((id, idx) => {
      if (!state.openTools[id]) return;
      let wrap = root.querySelector(`[data-tool-frame="${id}"]`);
      if (!wrap) {
        wrap = buildToolFrameEl(id);
        root.appendChild(wrap);
      }
      const tool = toolById(id);
      const f = state.openTools[id];
      const dock = f.dock || tool.dock || "center";
      const docked = dock === "left" || dock === "right";
      const panel = wrap.querySelector("[data-tool-panel]");
      const backdrop = wrap.querySelector("[data-tool-backdrop]");
      panel.className = frameClass(tool, f);
      const titleEl = wrap.querySelector(".tf-title");
      if (titleEl) {
        titleEl.textContent = f.splitSci
          ? `Desmos · ${tool.short || tool.name} + Científica`
          : `Desmos · ${tool.name}`;
      }
      const sciPane = wrap.querySelector(".tf-sci-pane");
      const sciFrame = wrap.querySelector("iframe[data-sci-frame]");
      if (sciPane) {
        if (f.splitSci && canSplitWithSci(id)) {
          sciPane.hidden = false;
          if (sciFrame && !sciFrame.getAttribute("src")) sciFrame.src = SCI_URL;
        } else {
          sciPane.hidden = true;
        }
      }
      const centerBtn = wrap.querySelector('[data-dock="center"]');
      if (centerBtn && canSplitWithSci(id)) {
        centerBtn.classList.toggle("split-on", !!f.splitSci);
        centerBtn.title = f.splitSci
          ? "Paralelo con científica (doble clic para salir)"
          : "Ancho completo · doble clic: + científica";
      }
      const z = 80 + idx;
      wrap.style.zIndex = String(z);
      panel.style.zIndex = String(z + 1);
      if (backdrop) {
        // Docked: no dimmer — se ve el Campus al lado. Center: soft dimmer (fondo visible).
        if (docked && !f.maximized) {
          backdrop.hidden = true;
        } else {
          backdrop.hidden = false;
          backdrop.className = "tf-backdrop tf-backdrop-soft";
        }
        backdrop.style.zIndex = String(z);
      }
      const stack = sameDockStackIndex(id);
      if (docked && !f.maximized) {
        panel.style.setProperty("--tf-panel-w", tool.panelW || "min(400px, 40vw)");
        const shift = stack * 28;
        panel.style.top = "56px";
        panel.style.bottom = "0";
        panel.style.width = "";
        if (dock === "left") {
          panel.style.left = `${shift}px`;
          panel.style.right = "auto";
        } else {
          panel.style.right = `${shift}px`;
          panel.style.left = "auto";
        }
      } else {
        panel.style.removeProperty("--tf-panel-w");
        panel.style.top = "56px";
        panel.style.right = "0px";
        panel.style.bottom = "0px";
        panel.style.left = "0px";
        panel.style.width = "100vw";
        panel.style.height = "calc(100vh - 56px)";
        panel.style.maxWidth = "none";
        panel.style.margin = "0";
      }
      // side + status rails only for legacy wide-center with panels — never in dock-center/split
      wrap.querySelectorAll(".tf-left, .tf-right").forEach((el) => {
        el.style.display = "none";
      });
      const south = wrap.querySelector(".tf-rail.s");
      if (south) south.style.display = "";
      wrap.querySelectorAll("[data-dock]").forEach((btn) => {
        const side = btn.getAttribute("data-dock");
        btn.classList.toggle("on", !f.maximized && dock === side);
        btn.setAttribute("aria-pressed", String(!f.maximized && dock === side));
      });
      const maxBtn = wrap.querySelector(`[data-tool-max="${id}"]`);
      if (maxBtn) maxBtn.textContent = f.maximized ? "Restaurar" : "Pantalla completa";
    });
  }

  function cycleFrameRail(toolId, side, widen) {
    const f = state.openTools[toolId];
    if (!f) return;
    const cur = f[side];
    if (widen) {
      f[side] = cur === "collapsed" ? "wide" : cur === "wide" ? "open" : "wide";
    } else {
      f[side] = cur === "collapsed" ? "open" : "collapsed";
    }
    focusTool(toolId);
    syncToolLayers();
  }

  function bindFrameRail(el, side, toolId) {
    if (!el || el.dataset.railBound) return;
    el.dataset.railBound = "1";
    let clicks = 0;
    let timer = null;
    el.addEventListener("click", (e) => {
      if (e.target.closest("button") && !e.target.classList.contains("tf-rail-strip") && e.target !== el) return;
      e.preventDefault();
      e.stopPropagation();
      clicks += 1;
      if (clicks === 1) {
        timer = setTimeout(() => {
          clicks = 0;
          cycleFrameRail(toolId, side, false);
        }, 220);
      } else {
        clearTimeout(timer);
        clicks = 0;
        cycleFrameRail(toolId, side, true);
      }
    });
  }

  function bindToolLayersOnce() {
    const root = ensureToolLayersRoot();
    if (root.dataset.bound) return;
    root.dataset.bound = "1";
    root.addEventListener("click", (e) => {
      const t = e.target;
      const closeBtn = t.closest("[data-tool-close]");
      if (closeBtn) {
        e.stopPropagation();
        closeTool(closeBtn.getAttribute("data-tool-close"));
        syncToolLayers();
        render();
        return;
      }
      const maxBtn = t.closest("[data-tool-max]");
      if (maxBtn) {
        e.stopPropagation();
        const id = maxBtn.getAttribute("data-tool-max");
        const f = state.openTools[id];
        if (f) {
          f.maximized = !f.maximized;
          focusTool(id);
          syncToolLayers();
        }
        return;
      }
      const dockBtn = t.closest("[data-dock]");
      if (dockBtn) {
        e.stopPropagation();
        const id = dockBtn.getAttribute("data-tool-id");
        const side = dockBtn.getAttribute("data-dock");
        if (side === "center" && canSplitWithSci(id)) {
          const key = "_dockCenterClicks";
          const timers = (root._dockTimers = root._dockTimers || {});
          root[key] = (root[key] || 0) + 1;
          if (root[key] === 1) {
            timers[id] = setTimeout(() => {
              root[key] = 0;
              const f = state.openTools[id];
              if (f) f.splitSci = false;
              snapDock(id, "center");
            }, 260);
          } else {
            clearTimeout(timers[id]);
            root[key] = 0;
            toggleSplitSci(id);
          }
          return;
        }
        snapDock(id, side);
        return;
      }
      const backdrop = t.closest("[data-tool-backdrop]");
      if (backdrop) {
        closeTool(backdrop.getAttribute("data-tool-backdrop"));
        syncToolLayers();
        render();
        return;
      }
      const panel = t.closest("[data-tool-panel]");
      if (panel) {
        focusTool(panel.getAttribute("data-tool-panel"));
        syncToolLayers();
      }
    });
  }

  function bindDesmos() {
    bindToolLayersOnce();
    $$("[data-tool]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-tool");
        toggleTool(id);
        state.toolsMenuOpen = false;
        render();
      });
    });
    const gear = $("#tools-gear");
    if (gear) {
      gear.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.toolsMenuOpen = !state.toolsMenuOpen;
        render();
      });
    }
    $$("[data-tool-vis]").forEach((input) => {
      input.addEventListener("change", () => {
        const id = input.getAttribute("data-tool-vis");
        state.toolVisibility[id] = input.checked;
        if (!input.checked && isToolOpen(id)) closeTool(id);
        saveToolVisibility();
        render();
      });
    });
    if (state.toolsMenuOpen) {
      const closer = (e) => {
        const wrap = $("#tools-toolbar");
        if (wrap && !wrap.contains(e.target)) {
          state.toolsMenuOpen = false;
          document.removeEventListener("click", closer);
          render();
        }
      };
      setTimeout(() => document.addEventListener("click", closer), 0);
    }
    syncToolLayers();
    // bind rails for any new frames
    Object.keys(state.openTools).forEach((id) => {
      const wrap = document.querySelector(`[data-tool-frame="${id}"]`);
      if (!wrap) return;
      wrap.querySelectorAll("[data-tf-rail]").forEach((el) => {
        bindFrameRail(el, el.getAttribute("data-tf-rail"), id);
      });
    });
  }

    function bindShell() {
    const brand = $("#brand-home");
    if (brand) {
      brand.addEventListener("click", () => {
        const id = state.profile.activeCareerId || state.profile.careerIds[0];
        go(id ? `#/home/${id}` : "#/settings/estudio");
      });
    }
    const gear = $("#btn-open-settings");
    if (gear) gear.addEventListener("click", () => go("#/settings/estudio"));
    bindRail($("#rail-left"), "left");
    bindRail($("#rail-right"), "right");
    $$("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-toggle");
        const box = btn.parentElement.querySelector(".tree-materias");
        box.classList.toggle("hidden");
        btn.querySelector("span:last-child").textContent = box.classList.contains("hidden")
          ? "▸"
          : "▾";
      });
    });
  }

  if (!window.__campusLayoutKeys) {
    window.__campusLayoutKeys = true;
    window.addEventListener("keydown", (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "b") return;
      if (state.view === "login") return;
      e.preventDefault();
      cycleRail("left", false);
    });
  }

  function profilePills() {
    const countries = countriesSelected();
    const unis = universitiesSelected();
    const cars = enrolledCareers();
    const pais = countries.map((c) => c.short).join(" · ") || "—";
    const uni = unis.map((u) => u.short).join(" · ") || "—";
    const car = cars.map((c) => c.short).join(" · ") || "—";
    return `
      <div class="profile-pill">
        <span title="País / lugar de estudio">${pais}</span>
        <span class="sep">·</span>
        <span title="Universidad">${uni}</span>
        <span class="sep">·</span>
        <span title="Carreras">${car}</span>
      </div>`;
  }

  function renderNeedsSetup() {
    return `
      <h1 class="greeting">Configurá tu estudio</h1>
      <div class="empty-state">
        Elegí universidad(es) y carrera(s) en Settings. Después el día a día es solo materias y contenido.
        <div style="margin-top:14px"><a href="#/settings/estudio">Ir a Settings</a></div>
      </div>`;
  }

  function renderHome() {
    const enrolled = enrolledCareers();
    const active = career();
    const blocks = enrolled
      .map((car) => {
        const open = car.id === active?.id ? "open" : "";
        const cards = car.materias
          .map(
            (m) => `
          <a class="materia-card" href="#/materia/${car.id}/${m.id}">
            <div>
              <strong>${m.name}</strong>
              <span>${m.profesor}</span>
            </div>
            <span class="chip">${m.temas.length} temas</span>
          </a>`
          )
          .join("");
        return `
        <details class="career-block" ${open}>
          <summary><span>${car.name}</span><span>${car.materias.length} materias</span></summary>
          <div class="materia-grid">${cards}</div>
        </details>`;
      })
      .join("");
    return `
      <h1 class="greeting">Inicio ¡Hola, ${D.student}! 👋</h1>
      ${profilePills()}
      <p class="sub">Vista de tus materias · activa: <strong>${active?.name || "—"}</strong></p>
      <h2 class="section-title">Tus materias por carrera</h2>
      ${blocks || `<div class="empty-state">No hay carreras en tu perfil. <a href="#/settings/estudio">Settings</a></div>`}`;
  }

  function renderHomeRight() {
    const now = new Date(2026, 8, 5);
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const eventDays = new Set(D.events.map((e) => Number(e.date.split("-")[2])));
    let cells = "";
    for (let i = 0; i < firstDow; i++) cells += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const cls = ["day", d === 5 ? "today" : "", eventDays.has(d) ? "has-event" : ""]
        .filter(Boolean)
        .join(" ");
      cells += `<div class="${cls}">${d}</div>`;
    }
    const events = D.events
      .map(
        (e) => `
      <div class="event-item">
        <div class="when">${e.date} · ${e.time}</div>
        <div>${e.title}</div>
      </div>`
      )
      .join("");
    return `
      <div class="mini-cal">
        <h4>Septiembre 2026</h4>
        <div class="cal-grid">
          <div class="dow">D</div><div class="dow">L</div><div class="dow">M</div><div class="dow">X</div><div class="dow">J</div><div class="dow">V</div><div class="dow">S</div>
          ${cells}
        </div>
      </div>
      <div class="events">
        <h4>Próximos eventos</h4>
        ${events}
      </div>`;
  }

  function renderSettings() {
    const d = state.draft;
    const pq = (d.countryQuery || "").trim().toLowerCase();
    const uq = (d.uniQuery || "").trim().toLowerCase();
    const cq = (d.careerQuery || "").trim().toLowerCase();
    const countryFiltered = (D.countries || []).filter(
      (c) => !pq || c.name.toLowerCase().includes(pq) || c.short.toLowerCase().includes(pq)
    );
    const uniFiltered = D.universities.filter(
      (u) => !uq || u.name.toLowerCase().includes(uq) || u.short.toLowerCase().includes(uq)
    );
    const carFiltered = D.careers.filter(
      (c) => !cq || c.name.toLowerCase().includes(cq) || c.short.toLowerCase().includes(cq)
    );
    const countryChips = countryFiltered
      .map((c) => {
        const on = (d.countryIds || []).includes(c.id);
        return `<button type="button" class="chip-toggle ${on ? "on" : ""}" data-country="${c.id}"><span class="check">${on ? "✓" : ""}</span>${c.name}</button>`;
      })
      .join("") || `<p class="sub" style="margin:0">Sin coincidencias.</p>`;
    const uniChips = uniFiltered
      .map((u) => {
        const on = d.universityIds.includes(u.id);
        return `<button type="button" class="chip-toggle ${on ? "on" : ""}" data-uni="${u.id}"><span class="check">${on ? "✓" : ""}</span>${u.name}</button>`;
      })
      .join("") || `<p class="sub" style="margin:0">Sin coincidencias.</p>`;
    const carChips = carFiltered
      .map((c) => {
        const on = d.careerIds.includes(c.id);
        return `<button type="button" class="chip-toggle ${on ? "on" : ""}" data-career="${c.id}"><span class="check">${on ? "✓" : ""}</span>${c.name}</button>`;
      })
      .join("") || `<p class="sub" style="margin:0">Sin coincidencias.</p>`;
    const activeOpts = d.careerIds
      .map((id) => {
        const c = careerById(id);
        return `<option value="${id}" ${d.activeCareerId === id ? "selected" : ""}>${c?.name || id}</option>`;
      })
      .join("");
    return `
      <div class="crumbs"><a href="#/home/${state.profile.activeCareerId || ""}">Inicio</a> › Settings</div>
      <div class="settings-layout">
        <nav class="settings-nav">
          <button type="button" class="${state.settingsSection === "estudio" ? "active" : ""}" data-settings-nav="estudio">Estudio</button>
          <button type="button" class="${state.settingsSection === "cuenta" ? "active" : ""}" data-settings-nav="cuenta">Cuenta</button>
          <button type="button" class="${state.settingsSection === "herramientas" ? "active" : ""}" data-settings-nav="herramientas">Herramientas</button>
        </nav>
        <div class="settings-panel">
          ${
            state.settingsSection === "estudio"
              ? `
          <h2>Settings · Estudio</h2>
          <p class="lead">País, universidad y carrera se eligen acá (podés marcar varias). El día a día sigue en materias, pestañas y recursos.</p>
          <div class="settings-card">
            <div class="settings-card-head">
              <div>
                <h3>País / lugar de estudio</h3>
                <p>Dónde cursás o desde dónde estudiás (América + Europa).</p>
              </div>
              <label class="settings-search">
                <span class="sr-only">Buscar países</span>
                <input type="search" id="country-search" placeholder="Buscar país…" value="${(d.countryQuery || "").replace(/"/g, "&quot;")}" autocomplete="off" />
              </label>
            </div>
            <div class="chip-grid">${countryChips}</div>
          </div>
          <div class="settings-card">
            <div class="settings-card-head">
              <div>
                <h3>Universidades</h3>
                <p>Una o más instituciones donde cursás.</p>
              </div>
              <label class="settings-search">
                <span class="sr-only">Buscar universidades</span>
                <input type="search" id="uni-search" placeholder="Buscar universidad…" value="${(d.uniQuery || "").replace(/"/g, "&quot;")}" autocomplete="off" />
              </label>
            </div>
            <div class="chip-grid">${uniChips}</div>
            <div class="custom-add">
              <label for="custom-uni-input">¿No está tu universidad?</label>
              <p class="custom-hint">Escribila acá. Después un bot puede verificar si existe (demo: queda como solicitud).</p>
              <div class="custom-add-row">
                <input type="text" id="custom-uni-input" placeholder="Nombre de la universidad…" value="${(d.customUniInput || "").replace(/"/g, "&quot;")}" autocomplete="off" />
                <button type="button" class="btn-primary" id="btn-add-custom-uni" style="width:auto;padding:10px 14px">Agregar</button>
              </div>
              <div class="custom-list" id="custom-uni-list">
                ${(d.customUniversities || []).map((name, i) => `
                  <span class="custom-chip">
                    ${escapeHTML(name)}
                    <button type="button" data-remove-custom-uni="${i}" aria-label="Quitar">×</button>
                  </span>`).join("") || `<span class="custom-empty">Ninguna solicitud aún.</span>`}
              </div>
            </div>
          </div>
          <div class="settings-card">
            <div class="settings-card-head">
              <div>
                <h3>Carreras</h3>
                <p>Las titulaciones activas en tu Campus. No hace falta tocarlas cada sesión.</p>
              </div>
              <label class="settings-search">
                <span class="sr-only">Buscar carreras</span>
                <input type="search" id="career-search" placeholder="Buscar carrera…" value="${escapeHTML(d.careerQuery || "")}" autocomplete="off" />
              </label>
            </div>
            <div class="chip-grid">${carChips}</div>
            <div class="active-row">
              <label for="active-career">Carrera activa al entrar</label>
              <select id="active-career">${activeOpts || "<option value=''>—</option>"}</select>
            </div>
            <div class="custom-add">
              <label for="custom-career-input">¿No está tu carrera?</label>
              <p class="custom-hint">Cargá el nombre manualmente. Luego se puede revisar con un bot (demo: solicitud pendiente).</p>
              <div class="custom-add-row">
                <input type="text" id="custom-career-input" placeholder="Nombre de la carrera…" value="${escapeHTML(d.customCareerInput || "")}" autocomplete="off" />
                <button type="button" class="btn-primary" id="btn-add-custom-career" style="width:auto;padding:10px 14px">Agregar</button>
              </div>
              <div class="custom-list" id="custom-career-list">
                ${(d.customCareers || []).map((name, i) => `
                  <span class="custom-chip">
                    ${escapeHTML(name)}
                    <button type="button" data-remove-custom-career="${i}" aria-label="Quitar">×</button>
                  </span>`).join("") || `<span class="custom-empty">Ninguna solicitud aún.</span>`}
              </div>
            </div>
          </div>
          <div class="save-bar">
            <button class="btn-primary" id="btn-save-settings" style="width:auto;padding:10px 18px">Guardar</button>
            <button class="btn-primary" id="btn-back-campus" style="width:auto;padding:10px 18px;background:transparent;color:var(--blue);border:1px solid var(--blue-mid)">Volver al Campus</button>
            ${state.settingsSavedFlash ? `<span class="toast-ok">Guardado ✓</span>` : ""}
          </div>`
              : state.settingsSection === "herramientas"
              ? `
          <h2>Settings · Herramientas</h2>
          <p class="lead">Elegí qué herramientas aparecen en la barra principal (una sola fila de íconos).</p>
          <div class="settings-card">
            <h3>Visibles en el header</h3>
            <p>Marcá las que querés a mano. El cambio se aplica al instante.</p>
            <div class="tools-settings-list">
              ${DESMOS_TOOLS.map((t) => {
                const on = state.toolVisibility[t.id] !== false;
                return `<label class="tools-check row"><input type="checkbox" data-tool-vis="${t.id}" ${on ? "checked" : ""}/><span class="swatch" style="background:${t.color}"></span><span>${t.name}</span></label>`;
              }).join("")}
            </div>
          </div>`
              : `
          <h2>Settings · Cuenta</h2>
          <p class="lead">Stub demo — notificaciones, idioma, accesibilidad.</p>
          <div class="settings-card"><h3>Perfil</h3><p>${D.student} · estudiante demo</p></div>`
          }
        </div>
      </div>`;
  }

  function renderSettingsRight() {
    return `
      <div class="otros">
        <h4>Por qué acá</h4>
        <p class="sub">Cambiar de país, carrera o universidad es raro. Cambiar de materia, tab o video es lo frecuente — eso queda en el shell.</p>
      </div>
      <div class="profs" style="margin-top:16px">
        <h4>Referencia</h4>
        <p class="sub">Patrón tipo IDE: preferencias en Settings; tool windows en los bordes para el trabajo diario.</p>
      </div>`;
  }

  function bindSettings() {
    $$("[data-tool-vis]").forEach((input) => {
      input.addEventListener("change", () => {
        const id = input.getAttribute("data-tool-vis");
        state.toolVisibility[id] = input.checked;
        // keep at least one tool visible
        if (!Object.values(state.toolVisibility).some(Boolean)) {
          state.toolVisibility[id] = true;
          input.checked = true;
        }
        saveToolVisibility();
        render();
      });
    });
    $$("[data-settings-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.settingsSection = btn.getAttribute("data-settings-nav");
        state.settingsSavedFlash = false;
        go(`#/settings/${state.settingsSection}`);
      });
    });
    const countrySearch = $("#country-search");
    const uniSearch = $("#uni-search");
    const careerSearch = $("#career-search");
    function wireSearch(el, key, chipSelector) {
      if (!el) return;
      el.addEventListener("input", () => {
        const q = (el.value || "").trim().toLowerCase();
        state.draft[key] = el.value;
        const chips = $$(chipSelector);
        chips.forEach((btn) => {
          const text = btn.textContent.toLowerCase();
          const match = !q || text.includes(q);
          btn.style.display = match ? "" : "none";
        });
      });
    }
    wireSearch(countrySearch, "countryQuery", "[data-country]");
    wireSearch(uniSearch, "uniQuery", "[data-uni]");
    wireSearch(careerSearch, "careerQuery", "[data-career]");
    $$("[data-country]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-country");
        const set = new Set(state.draft.countryIds || []);
        if (set.has(id)) {
          set.delete(id);
          btn.classList.remove("on");
          const chk = btn.querySelector(".check");
          if (chk) chk.textContent = "";
        } else {
          set.add(id);
          btn.classList.add("on");
          const chk = btn.querySelector(".check");
          if (chk) chk.textContent = "✓";
        }
        state.draft.countryIds = [...set];
        state.settingsSavedFlash = false;
      });
    });
    $$("[data-uni]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-uni");
        const set = new Set(state.draft.universityIds);
        if (set.has(id)) {
          set.delete(id);
          btn.classList.remove("on");
          const chk = btn.querySelector(".check");
          if (chk) chk.textContent = "";
        } else {
          set.add(id);
          btn.classList.add("on");
          const chk = btn.querySelector(".check");
          if (chk) chk.textContent = "✓";
        }
        state.draft.universityIds = [...set];
        state.settingsSavedFlash = false;
      });
    });
    $$("[data-career]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-career");
        const set = new Set(state.draft.careerIds);
        if (set.has(id)) {
          set.delete(id);
          btn.classList.remove("on");
          const chk = btn.querySelector(".check");
          if (chk) chk.textContent = "";
        } else {
          set.add(id);
          btn.classList.add("on");
          const chk = btn.querySelector(".check");
          if (chk) chk.textContent = "✓";
        }
        state.draft.careerIds = [...set];
        if (!state.draft.careerIds.includes(state.draft.activeCareerId)) {
          state.draft.activeCareerId = state.draft.careerIds[0] || null;
        }
        state.settingsSavedFlash = false;
        const activeSel = $("#active-career");
        if (activeSel) {
          activeSel.innerHTML = state.draft.careerIds.map((cid) => {
            const c = careerById(cid);
            return `<option value="${cid}" ${state.draft.activeCareerId === cid ? "selected" : ""}>${escapeHTML(c?.name || cid)}</option>`;
          }).join("") || "<option value=''>—</option>";
        }
      });
    });
    const active = $("#active-career");
    if (active) {
      active.addEventListener("change", () => {
        state.draft.activeCareerId = active.value || null;
      });
    }
    function wireCustomInput(inputId, draftKey) {
      const el = document.getElementById(inputId);
      if (!el) return;
      el.addEventListener("input", () => {
        state.draft[draftKey] = el.value;
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const btnId = inputId === "custom-uni-input" ? "btn-add-custom-uni" : "btn-add-custom-career";
          const btn = document.getElementById(btnId);
          if (btn) btn.click();
        }
      });
    }
    wireCustomInput("custom-uni-input", "customUniInput");
    wireCustomInput("custom-career-input", "customCareerInput");
    const addUni = $("#btn-add-custom-uni");
    if (addUni) {
      addUni.addEventListener("click", () => {
        const name = (state.draft.customUniInput || "").trim();
        if (!name) return;
        const list = state.draft.customUniversities || [];
        if (!list.some((x) => x.toLowerCase() === name.toLowerCase())) {
          state.draft.customUniversities = [...list, name];
        }
        state.draft.customUniInput = "";
        state.settingsSavedFlash = false;
        render();
      });
    }
    const addCareer = $("#btn-add-custom-career");
    if (addCareer) {
      addCareer.addEventListener("click", () => {
        const name = (state.draft.customCareerInput || "").trim();
        if (!name) return;
        const list = state.draft.customCareers || [];
        if (!list.some((x) => x.toLowerCase() === name.toLowerCase())) {
          state.draft.customCareers = [...list, name];
        }
        state.draft.customCareerInput = "";
        state.settingsSavedFlash = false;
        render();
      });
    }
    $$("[data-remove-custom-uni]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-remove-custom-uni"));
        state.draft.customUniversities = (state.draft.customUniversities || []).filter((_, idx) => idx !== i);
        state.settingsSavedFlash = false;
        render();
      });
    });
    $$("[data-remove-custom-career]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-remove-custom-career"));
        state.draft.customCareers = (state.draft.customCareers || []).filter((_, idx) => idx !== i);
        state.settingsSavedFlash = false;
        render();
      });
    });
    const save = $("#btn-save-settings");
    if (save) {
      save.addEventListener("click", () => {
        state.profile = {
          countryIds: [...(state.draft.countryIds || [])],
          universityIds: [...state.draft.universityIds],
          careerIds: [...state.draft.careerIds],
          activeCareerId: state.draft.activeCareerId,
          customUniversities: [...(state.draft.customUniversities || [])],
          customCareers: [...(state.draft.customCareers || [])],
        };
        saveProfile();
        state.settingsSavedFlash = true;
        render();
      });
    }
    const back = $("#btn-back-campus");
    if (back) {
      back.addEventListener("click", () => {
        const id = state.profile.activeCareerId || state.profile.careerIds[0];
        go(id ? `#/home/${id}` : "#/settings/estudio");
      });
    }
  }

  function lessonURL(url) {
    const lesson = new URL(url, location.href);
    lesson.searchParams.set("returnTo", location.pathname + location.search + location.hash);
    return escapeHTML(lesson.pathname + lesson.search + lesson.hash);
  }

  function closeLesson() {
    const nodeId = state.selectedNodo;
    if (!nodeId) return;
    const tema = materia()?.temas.find(t => t.nodos.some(n => n.id === nodeId));
    if (tema) state.openTemas[tema.id] = true;
    history.replaceState(null, "", `#/materia/${state.careerId}/${state.materiaId}/temario`);
    render();
    const node = Array.from(document.querySelectorAll("[data-nodo]")).find(btn => btn.dataset.nodo === nodeId);
    node?.focus();
  }

  window.addEventListener("message", event => {
    const frame = document.getElementById("interactive-embed-frame");
    if (frame && event.origin === location.origin && event.source === frame.contentWindow &&
        event.data?.type === "campus:close-lesson") closeLesson();
  });

  function renderMateria() {
    const c = career();
    const m = materia();
    if (!m) return `<p>Materia no encontrada.</p>`;
    const tabs = [
      ["bienvenida", "Bienvenida"],
      ["temario", "Temario"],
      ["lab", "Laboratorio Interactivo"],
      ["recursos", "Recursos audiovisuales"],
      ["clases", "Clases"],
      ["foros", "Foros"],
      ["actividades", "Actividades y test"],
      ["docs", "Documentación"],
    ]
      .map(
        ([id, label]) =>
          `<button class="tab ${state.tab === id ? "active" : ""}" data-tab="${id}">${label}</button>`
      )
      .join("");
    return `
      <div class="crumbs">
        <a href="#/home/${c.id}">Inicio</a> › ${c.name} › ${m.name} › ${labelTab(state.tab)}
      </div>
      ${profilePills()}
      <h1 style="margin:0 0 8px;font-size:1.45rem">${m.name}</h1>
      <div class="tabs">${tabs}</div>
      <div id="tab-panel">${renderTab(m)}</div>`;
  }

  function labelTab(t) {
    return (
      {
        bienvenida: "Bienvenida",
        temario: "Temario",
        lab: "Laboratorio Interactivo",
        recursos: "Recursos audiovisuales",
        clases: "Clases",
        foros: "Foros",
        actividades: "Actividades y test",
        docs: "Documentación",
      }[t] || t
    );
  }

  function renderTab(m) {
    if (state.tab === "bienvenida") {
      return `
        <h2 class="section-title">¿Cómo estudiar la asignatura?</h2>
        <div class="howto">
          <div class="howto-card"><div class="num">01</div><h4>Programación semanal</h4><p>Organizá tu semana con clases, lecturas y entregas.</p></div>
          <div class="howto-card"><div class="num">02</div><h4>Temario y recursos</h4><p>Recorré los nodos del temario y los videos asociados.</p></div>
          <div class="howto-card"><div class="num">03</div><h4>Clases</h4><p>Asistí en vivo o mirá las grabaciones cuando puedas.</p></div>
          <div class="howto-card"><div class="num">04</div><h4>Actividades y test</h4><p>Practicá y entregá para consolidar lo aprendido.</p></div>
        </div>`;
    }
    if (state.tab === "temario") {
      const temas = m.temas
        .map((t, i) => {
          const isOpen = state.openTemas[t.id] ?? i === 0;
          const nodos = t.nodos
            .map(
              (n) =>
                `<button class="nodo ${
                  state.selectedNodo === n.id ? "active" : ""
                }" data-nodo="${n.id}" data-tema="${t.id}">
                  <span>${escapeHTML(n.title)}</span>
                  ${n.toolBadge ? `<span class="nodo-tool-badge">${escapeHTML(n.toolBadge)}</span>` : ""}
                </button>`
            )
            .join("");
          return `
          <div class="tema">
            <button class="tema-head" data-tema-toggle="${t.id}">
              <span>${escapeHTML(t.title)}</span>
              <span>${isOpen ? "▴" : "▾"}</span>
            </button>
            <div class="tema-body ${isOpen ? "" : "hidden"}">${nodos}</div>
          </div>`;
        })
        .join("");
      const detail = state.selectedNodo
        ? (() => {
            let found = null;
            let temaTitle = "";
            for (const t of m.temas) {
              const n = t.nodos.find((x) => x.id === state.selectedNodo);
              if (n) {
                found = n;
                temaTitle = t.title;
                break;
              }
            }
            if (!found) return "";
            if (found.toolUrl) {
              return `
              <div class="nodo-detail nodo-interactive-card">
                <div class="interactive-card-header">
                  <div class="interactive-card-info">
                    <span class="badge badge-interactive">${escapeHTML(found.toolBadge || "Interactivo")}</span>
                    <h3>${escapeHTML(found.title)}</h3>
                    <p class="sub">${escapeHTML(found.desc || `Laboratorio interactivo de ${temaTitle}`)}</p>
                  </div>
                  <div class="interactive-card-actions">
                    <a href="${lessonURL(found.toolUrl)}" target="_blank" class="btn-ghost-action" title="Abrir en ventana independiente">
                      ↗ Pestaña
                    </a>
                    <button type="button" class="btn-ghost-action" id="btn-close-embed">Cerrar lección</button>
                    <button type="button" class="btn-ghost-action" id="btn-reload-embed" title="Reiniciar ejercicio">
                      ↻ Reiniciar
                    </button>
                  </div>
                </div>
                <div class="interactive-frame-wrap">
                  <iframe id="interactive-embed-frame" src="${lessonURL(found.toolUrl)}" title="${escapeHTML(found.title)}" allow="clipboard-write; fullscreen" loading="lazy"></iframe>
                </div>
              </div>`;
            }
            return `
            <div class="nodo-detail">
              <h3>${escapeHTML(found.title)}</h3>
              <p>${escapeHTML(found.desc || `Contenido conceptual y ejercicios dentro de ${temaTitle}.`)}</p>
            </div>`;
          })()
        : `<p class="sub">Elegí un nodo del temario para ver su contenido o simulador.</p>`;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h2 class="section-title" style="margin:0">Temario</h2>
          <a href="#">DESCARGAR TEMAS EN PDF</a>
        </div>
        ${temas}
        ${detail}`;
    }
    if (state.tab === "lab") {
      const allTools = [];
      m.temas.forEach((t) => {
        (t.nodos || []).forEach((n) => {
          if (n.toolUrl) {
            allTools.push({ ...n, temaTitle: t.title });
          }
        });
      });
      const cards = allTools.map((tool) => `
        <div class="lab-card">
          <div class="lab-card-top">
            <span class="badge badge-interactive">${escapeHTML(tool.toolBadge || "Interactivo")}</span>
            <span class="lab-card-tema">${escapeHTML(tool.temaTitle)}</span>
          </div>
          <h4>${escapeHTML(tool.title)}</h4>
          <p>${escapeHTML(tool.desc || "Práctica interactiva en tiempo real.")}</p>
          <div class="lab-card-actions">
            <button type="button" class="btn-primary btn-sm" data-launch-nodo="${tool.id}">Abrir en Campus</button>
            <a href="${lessonURL(tool.toolUrl)}" target="_blank" class="btn-ghost-action">Pestaña ↗</a>
          </div>
        </div>
      `).join("");

      return `
        <div class="lab-header">
          <div>
            <h2 class="section-title" style="margin:0">Laboratorio Interactivo · ${escapeHTML(m.name)}</h2>
            <p class="sub" style="margin-top:4px">Interactivos, simulaciones y juegos matemáticos para experimentar directamente.</p>
          </div>
          <a href="${lessonURL('tools/index.html')}" class="btn-catalog-link" target="_blank">
            Explorar catálogo completo ↗
          </a>
        </div>
        <div class="lab-grid">
          ${cards || `<div class="empty-state">No hay interactivos configurados para esta materia aún. <a href="${lessonURL('tools/index.html')}" target="_blank">Ver catálogo general</a>.</div>`}
        </div>
      `;
    }
    if (state.tab === "recursos") {
      const videos = [];
      m.temas.forEach((t, ti) => {
        videos.push({
          title: `T${String(ti + 1).padStart(2, "0")}.01. ${t.title.replace(/^TEMA \d+\.\s*/, "")}`,
          mins: 6 + ti * 4,
        });
      });
      if (!videos.length) videos.push({ title: "Introducción", mins: 5 });
      const idx = Math.min(state.videoIdx, videos.length - 1);
      const list = videos
        .map(
          (v, i) =>
            `<button class="${i === idx ? "active" : ""}" data-video="${i}"><span>${v.title}</span><span>${v.mins} min</span></button>`
        )
        .join("");
      return `
        <h2 class="section-title">Recursos audiovisuales</h2>
        <div class="video-layout">
          <div>
            <div class="player"><div class="slide"><small>Vista previa</small><strong>${videos[idx].title}</strong></div></div>
            <div class="player-meta"><span>Vídeo ${idx + 1} de ${videos.length}</span><button class="btn-primary" style="width:auto;padding:8px 14px">Descargar video</button></div>
          </div>
          <div class="playlist">
            <h4>Total: ${videos.length} videos</h4>
            ${list}
          </div>
        </div>`;
    }
    const labels = {
      clases: "Clases en vivo y grabaciones (próximamente en el prototipo).",
      foros: "Foros de discusión por tema (stub).",
      actividades: "Actividades y tests asociados a cada nodo (stub).",
      docs: "Documentación y PDFs de la materia (stub).",
    };
    return `<div class="placeholder">${labels[state.tab] || "Sección en construcción."}</div>`;
  }

  function renderMateriaRight() {
    const m = materia();
    if (!m) return "";
    return `
      <div class="otros">
        <h4>Otros accesos</h4>
        <div class="link-list">
          <a href="#">Resultado de actividades y test</a>
          <a href="#">Calificaciones finales</a>
          <a href="#">Revisiones y citas</a>
          <a href="#">Participantes</a>
        </div>
      </div>
      <div class="profs" style="margin-top:20px">
        <h4>Tus profesores</h4>
        <div class="prof">
          <div class="avatar">${initials(m.profesor)}</div>
          <div><strong>${m.profesor}</strong><div class="sub" style="margin:0">Docente titular</div></div>
        </div>
      </div>`;
  }

  function bindMateria() {
    $$("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        state.selectedNodo = null;
        state.videoIdx = 0;
        go(`#/materia/${state.careerId}/${state.materiaId}/${tab}`);
      });
    });
    $$("[data-tema-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-tema-toggle");
        const m = materia();
        const idx = m ? m.temas.findIndex((x) => x.id === id) : 0;
        const currently = state.openTemas[id] ?? idx === 0;
        state.openTemas[id] = !currently;
        render();
      });
    });
    $$("[data-nodo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        go(`#/materia/${state.careerId}/${state.materiaId}/temario/${btn.getAttribute("data-nodo")}`);
      });
    });
    $$("[data-video]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.videoIdx = Number(btn.getAttribute("data-video"));
        render();
      });
    });
    $("#btn-close-embed")?.addEventListener("click", closeLesson);
    const reloadEmbed = $("#btn-reload-embed");
    if (reloadEmbed) {
      reloadEmbed.addEventListener("click", () => {
        const frame = $("#interactive-embed-frame");
        if (frame) {
          const s = frame.src;
          frame.src = "about:blank";
          setTimeout(() => { frame.src = s; }, 50);
        }
      });
    }
    $$("[data-launch-nodo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nid = btn.getAttribute("data-launch-nodo");
        go(`#/materia/${state.careerId}/${state.materiaId}/temario/${nid}`);
      });
    });
  }

  window.addEventListener("hashchange", render);
  if (!location.hash || location.hash === "#/login" || location.hash === "#login") {
    const id = state.profile.activeCareerId || state.profile.careerIds[0];
    if (id) location.hash = `#/home/${id}`;
    else if (!state.profile.careerIds.length && !state.profile.universityIds.length)
      location.hash = "#/settings/estudio";
    else location.hash = "#/login";
  } else render();
})();
