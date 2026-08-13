# Architecture (as implemented in 0.1.5)

Do not invent modules that are not in the tree.

## Entry

- `index.html` → `src/main.tsx` → `src/App.tsx`
- Vite: `vite.config.ts` binds **0.0.0.0**, `allowedHosts: true` (Arena preview)
- Styles: `src/index.css`, `src/App.css`

## Layers

| Path | Responsibility |
| --- | --- |
| `src/types.ts` | `CardDef`, `SkillDef` / `SkillFollow`, `GameState`, `GameAction`, phases, prompts |
| `src/cards/definitions.ts` | All card records, `computeStrikeDamage`, 初临 help, starter legality |
| `src/cards/decks.ts` | `DECK_LISTS` / `DECK_META` |
| `src/engine/game.ts` | `reduce()` — legality + mutation; AI; setup/turn/combat |
| `src/engine/helpers.ts` | `spendAether`, `gainTempAether`, board queries, `canStartWithHand`, clone/log/toast |
| `src/engine/flow.ts` | Battle button labels (`发动「技能名」`), look purpose copy, switch teach gate |
| `src/engine/rng.ts` | `mulberry32`, `shuffle` |
| `src/engine/rules.test.ts` | Vitest; 51 cases at freeze |
| `src/ui/SetupScreen.tsx` | Independent opening rite |
| `src/ui/starterBrief.ts` | Setup blurbs |
| `src/ui/CardView.tsx` | Card face from **definition** |
| `src/ui/AetherMeter.tsx` | 灵息 HUD |
| `src/ui/TypeMark.tsx` | Source / type marks |
| `src/ui/terms.ts` | Player-facing terms |
| `src/App.tsx` | Menu, combat desk, inspect rail, prompts; early-return SetupScreen |

There is **no** server, store library, or effect DSL file. Some one-off flags still live as `(g as any)._foxRest` etc. inside `game.ts`.

## Definition vs Engine vs UI

- **Definition:** printed identity, costs, HP, `skill.text`, structured `strike` / `follow`, resonance fields.
- **Engine:** when a skill may fire; spend resources; apply damage/heal/look; enforce 初临, switch, win.
- **UI:** inspect, selection chrome, commit buttons, HUD, toasts. Must **read** definition for numbers and names. Must not invent a second damage table.
- **Tests:** drive `reduce` / helpers; assert the same structured fields.

Illegal actions are rejected in `reduce` / `canPlayCard` / `canAttack` / `canSwitch` / `canResonate` (not only hidden buttons).

## Setup flow

`SELECT_DECK` → `BEGIN` → `startMatch` (instances + opening hands) → `phase: setup` → `SetupScreen` → `SETUP_CHOOSE` → `finishSetup` → `beginTurn(player)`.

## Battle flow

`beginTurn` (awaken + draw + action) → plays / switch / resonate → `END_ACTION` → `battle` → `ATTACK` or skip → `closing` (human) or `nightfall` → other side.

Inspecting a hand card in `App.tsx` must not dispatch `PLAY_CARD`. Commit is 使用 / 部署 / 安置 / 展开 / 发动共鸣 / 发动「技能名」.

## Tests

`npm test` → `vitest run` on `src/engine/rules.test.ts`.  
Helpers `blankBattle`, `putHand`, `putField` exist for fixtures. No React Testing Library suite yet.

## Preview

`npm run dev` — do not bind localhost-only.
