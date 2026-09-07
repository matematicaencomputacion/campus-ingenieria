# ADR-001 · Shared game kit (`game-kit.js`)

**Status:** Accepted  
**Date:** 2026-09-07

## Context

Lecciones 15–18 each inlined the same feedback stack: AudioContext SFX (ok chime, error buzz, explosion), canvas confetti, and a visible ♪ sound-meter. Duplication drifts and bloats gzip payload.

## Decision

Ship a single zero-dependency script `tools/game-kit.js` exporting `window.CampusGameKit`:

- `ensureAudio()`, `playOkChime()`, `playErrorBuzz()`, `playExplosion()` — Web Audio only (no `.mp3`, no CDN)
- `pulseSoundMeter(rootEl, kind)`, `mountSoundMeter(parent)` — shared ♪ meter markup/styles
- `fireConfetti(canvasEl)` — confetti burst matching L15/L16
- `scoreChips(els, state)` — optional aciertos/errores/ronda/racha helpers

**From now on**, new campus games include:

```html
<script src="game-kit.js?v=20260907"></script>
```

and reuse these APIs instead of copying feedback code.

## Consequences

- Leaner lesson HTML; consistent UX (confetti, SFX, visible meter, aciertos/errores).
- Keep the kit gzip-friendly: no assets, no frameworks.
- Existing L15–L18 may stay self-contained until a later refactor; new work (L19+) must use the kit.
