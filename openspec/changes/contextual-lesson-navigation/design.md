## Context
At baseline fb9c959, 187 tools pages comprise 171 a.back links and 16 shared bars.
Chromium confirms seno + trig is lost after a lesson round trip. The shared bar
uses referrer substring/history length; materia selection lives only in memory.

## Goals / Non-Goals
Preserve origin using URLs and existing native links. Keep educational DOM/CSS and
controls intact. The 16 existing bars move into normal flow before lesson content;
mobile labels remain visible, targets have a 44px minimum and focus has an outline.
Visual inspection found the prior fixed bar covering the heading at 390px. No global visual shell, backend, browser storage or sequence inference.

## Decisions
- Keep existing a.back controls and configure them using one shared classic script.
  Existing bar calls the same helper. Explicit data attribute selects legacy controls;
  do not replace arbitrary anchors or install a second bar.
- Catalog uses q/cat URL parameters, replaceState while filtering and popstate to restore.
  Each card carries a returnTo parameter, preserving normal clicks/new-tab behavior.
  Catalog entry from a materia also carries its route and returns there; direct catalog
  entry falls back to the Campus index.
- Validate returnTo with URL parsing against exact same-origin root index and catalog
  paths, derived from the script URL (also supports a subdirectory deployment).
  No referrer/history heuristics, external redirects or storage dependency.
- Materia hash gains an optional node segment. Older routes remain valid. Standalone
  links and iframe sources carry the current route as returnTo.
- The known interactive iframe sends a close message; parent verifies origin and
  event.source against the active frame, removes it and focuses the originating node.
  A header close button offers the same action. Other embedded contexts use a normal link.
- Preserve legacy text/geometry for links returning to catalog; provide an accessible
  name. Contextual materia links say Volver a la materia; embedded links say Cerrar lección.

## Risks / Trade-offs
- 187 HTML entry points → census and all-page assertion for exactly one return control.
- DOM selection/focus after render → real-browser tests for both close controls and reload.
- Intentional bar-label changes → inspect desktop/mobile samples; no CSS extraction.
- URL lengths grow modestly → restrict targets; do not nest lesson return URLs.
- CI is browser-based → extend the existing job, avoid adding a separate Chromium install.

## Migration Plan
Implement on a branch based on the pending SDD PR #225. Submit a dependent PR,
without merging either. Revert this change to restore prior navigation. Publish
only after separate merge/deploy authorization.
