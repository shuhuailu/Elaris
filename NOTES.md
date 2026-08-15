# ELARIS — engine notes

One file: index.html. No build step, no framework, no dependencies.

Layout of index.html:
  1. CSS design tokens (Ember Darkness palette)
  2. Scene styles, in journey order
  3. Markup for every scene
  4. Logo module (generated, see logo/logo.js)
  5. Covenant Mark generator
  6. Card data - single source of truth
  7. Scene routing, gate, persistence
  8. Lobby, sub-screens, inspector
  9. Score engine and settings

Key invariants:
  - Card definition is the single source of truth for engine, UI and tests.
  - Inspecting is always safe. Only explicit commit performs an action.
  - Localisation must never alter gameplay state.
  - Rarity must never equal power.
