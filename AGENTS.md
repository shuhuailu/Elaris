# AGENTS.md — ELARIS coding-agent entry

Read this file first. Then `docs/HANDOFF.md`. Then only the docs that match the current task.

## Project Identity

- **Project:** ELARIS
- **Current stage:** Combat Prototype **0.1.5** / Combat **0.1.x**
- **Stack:** React + TypeScript + Vite (browser-only; local state; no backend)
- **Focus:** Core TCG combat, new-player readability, full human playtests, pace and basic balance
- **Primary environment:** Arena remains the main development environment until the user says otherwise
- **Do not enter Combat 0.2** without explicit user approval

Frozen gameplay snapshot:

- Tag: `combat-prototype-0.1.5`
- Commit: `f808768c50c071f4b80e7acef9b909f0fa30cc67`

Do **not** move, delete, or recreate that tag.

## Before Starting Any Task

1. Read this file
2. Read `docs/HANDOFF.md`
3. Read task-relevant docs (`GAME_RULES_0.1.5.md`, `ARCHITECTURE.md`, `CARD_SYSTEM.md`, `UX_PRINCIPLES.md`, `DECISIONS.md`, `ROADMAP.md`)
4. Check `git status`
5. Confirm branch / commit (and that `combat-prototype-0.1.5` still points at `f808768…` unless the user moved it)
6. Run or confirm baseline tests
7. Only then change code

## Source of Truth

**Card Definition is the single source of truth for structured card combat data.**

```
Card Definition → Engine
Card Definition → UI
Card Definition → Tests
```

Canonical file: `src/cards/definitions.ts` (`CARDS`, `SkillDef.strike`, `SkillDef.follow`, `computeStrikeDamage`).

Forbidden regressions:

- Hardcoding base strike damage by card id in the engine
- Engine and UI maintaining two different numbers for the same skill
- Card text saying one thing while the engine does another
- Changing rules without user approval

If `definition / engine / UI / tests` disagree: **report first**. Do not silently pick a winner.

Principle: **卡上写什么，就一定发生什么.**

## Core Frozen Rules (short)

Full rules: `docs/GAME_RULES_0.1.5.md`

- 40-card constructed test decks
- Board: 1 主契 + 3 伴契
- First to **3 契痕** wins; also lose if you must draw from an empty library
- 灵息 max 1 → 7 by turn; temp 灵息 +2/turn cap
- First player **does draw** on turn 1 but **cannot attack** (`firstTurnNoStrike`)
- **初临:** eidolons deployed from hand this turn cannot use attack skills; setup bind is **not** 初临
- Normal switch: usually 1/turn, usually 1 灵息; free switches do not consume the normal switch
- Resonance: 1/side/turn; damage counters persist (`newHp = newMax - (oldMax - oldHp)`); if ≤0, defeat before on-res heal
- **Inspect → Select → Commit** — inspect must not change game state

## Development Guardrails

- Do not silently change game rules
- Do not rebalance cards because it “feels more reasonable”
- Do not overturn user rulings (see `docs/DECISIONS.md`)
- Blocking bugs may be fixed first
- Non-blocking design changes: report impact first
- No Combat 0.2 unless explicitly approved
- Do not start Pack Opening, Collection, Account, Backend, PvP, World Map, shop, or login

Known non-blocking leftovers (do **not** large-refactor unless asked):

- 苔冠共鸣 on-enter heal still keyed by form id `moss_crown`
- `skillHeal10` is a fixed 10, not a generic amount
- 伊芙 / 阿洛 have pick windows, no opponent “reveal” animation

## UX Principles

**Inspect → Select → Commit**  
**查看是安全行为，确认才是游戏行为。**  
**Quick understand → Decide → Deep inspect**

Use ordinary TCG Chinese for basic actions: 回合, 抽牌, 行动, 战斗, 夜幕.  
World-unique terms only for world-unique mechanics (灵息, 契痕, 共鸣, 初临).

Details: `docs/UX_PRINCIPLES.md`

## Required Validation

After any code change, run the **real** project commands:

```bash
npm test
npx tsc -b
```

(`package.json`: `"test": "vitest run"`. If `npx tsc` resolves wrong, use `./node_modules/.bin/tsc -b`.)

**Frozen baseline: 51 tests passed.** `tsc -b` must pass.

Do not delete failing tests to go green unless the user re-ruled the behavior.

## Repository Map

| Path | Role |
| --- | --- |
| `src/cards/definitions.ts` | Card bible + `computeStrikeDamage` |
| `src/cards/decks.ts` | 40-card 雾林引星 / 灰烬月潮 |
| `src/engine/game.ts` | Deterministic reducer |
| `src/engine/helpers.ts` | Aether, board queries, log |
| `src/engine/flow.ts` | Player-facing battle labels / look copy |
| `src/engine/rng.ts` | Seeded shuffle |
| `src/engine/rules.test.ts` | Vitest (51) |
| `src/ui/` | Setup, CardView, HUD, terms |
| `src/App.tsx` | Desk + setup early-return |

More: `docs/ARCHITECTURE.md`

## Continuous Handoff (Arena keeps developing)

Arena is still the primary environment. These docs exist so a future Codex (or any new agent) can take over from the **repo**, not from chat history.

- Update **`docs/HANDOFF.md`** at each **important stable checkpoint / milestone** (version, completed, focus, known issues, debt, next work)
- If the user **approves a rule change**: update `GAME_RULES` + `DECISIONS`
- If architecture changes: update `ARCHITECTURE` and `CARD_SYSTEM` as needed
- Keep **`AGENTS.md` stable**. Do not dump daily logs here
- **`HANDOFF.md` is the living status file**

Do **not** refresh every docs file after every small button tweak.

## Final Handoff Audit

Only when the user explicitly says **「准备交给 Codex」**:

- Refresh relevant docs
- `git status`, full tests, record commit
- Confirm known issues, debt, next task
- Make a final migration bundle

Until then: continue in Arena; do not treat this file as a handoff order.

## Language

Communicate with the user in **Simplified Chinese**. Code identifiers may stay English. Player-facing game English names should appear with Chinese.
