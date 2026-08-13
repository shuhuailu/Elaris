# HANDOFF — current project snapshot

Living status. Update this file at each important stable checkpoint.  
Do **not** treat listed leftovers as emergency refactors.

## Current Status

| Field | Value |
| --- | --- |
| Project | ELARIS |
| Version | Combat Prototype **0.1.5** |
| Stage | Combat **0.1.x** — rules + new-player readability |
| Latest **gameplay** milestone | `combat-prototype-0.1.5` → `f808768c50c071f4b80e7acef9b909f0fa30cc67` |
| Docs / handoff system | Commit after that tag (this documentation pass) |
| Stack | React + TypeScript + Vite, local state only |
| Primary IDE | Arena (until user says 「准备交给 Codex」) |
| GitHub | Not connected in the session that froze 0.1.5 |
| Baseline | **Vitest 51 passed**, `tsc -b` passed |
| Combat 0.2 | **Not started. Not authorized.** |

## Completed (0.1 → 0.1.5)

- Playable two-player-feel duel vs heuristic AI
- Two 40-card test decks: 雾林引星 (`mist`), 灰烬月潮 (`ash`); opponent gets the other
- 灵息 1→7 + temp 灵息 cap +2/turn
- Board: 1 主契 + 3 伴契; relics; unique environment
- 换位 (normal + free); 共鸣; 初临 keyword
- `instanceId` + `defId` (never bind by name/index)
- Environment replacement: old env to **previous owner** discard
- First player: **draws** on turn 1, **cannot attack** (`firstTurnNoStrike`)
- Independent **SetupScreen** (rite), not empty battlefield; duplicate starters grouped by `defId`
- Inspect → Select → Commit; full-card overlay does not mutate state
- Opponent `actionCue`; 灵息 HUD; toast under phase bar
- Guided turn flow (where / what / next); 进入战斗 is a choice; skill buttons use real names
- Terms: 回合 not 巡; 抽牌 not 抽录
- Card Definition canonicalization: `SkillDef.strike` / `follow`; `computeStrikeDamage`; 寻星 20 from definition
- Formal rulings: 灰冠烬源自伤 only; 鸦皇 own `discardEntries`; 借来的晨光 / 伊芙 text
- Progressive first-time hints (`elarishints-017`); menu reset 013–017
- Tests: 51 including 寻星 20+look3, 灰冠烬源自伤, 鸦皇己方弃牌, skills have `strike.damage`

## Current Focus

**Next work is full human playtesting** — fun, pace, and basic balance of the two test decks.

Not Combat 0.2. Not new systems.

## Known Technical Debt (non-blocking)

Do **not** large-refactor these unless the user asks.

1. **苔冠守兽** on-resonance heal 20 is still `if (d.id === "moss_crown")` in `doResonate`, not a structured follow/onEnter.
2. **`skillHeal10`** pending effect always heals 10; `healTarget.amount` is not yet wired through the prompt.
3. **伊芙 / 阿洛** are pick windows; no opponent-facing “展示” animation.
4. Some historical combat log phrasing may still be mixed; many lines already Chinese.
5. No automated React/component tests for SetupScreen overlay clicks.
6. 1366×768 not physically verified in this environment.
7. `README.md` “Known limitations” still contains **stale** lines (first-turn draw skipped; env discard to new caster). **Code is the truth:** first player draws; replaced env goes to **previous owner**. Prefer updating README at a later docs tidy, not mid-feature.

## Known Non-blocking Issues

- 月潮镜 “第一次换位” includes free switches; card text does not spell that out. **needs validation** if players find it confusing.
- 星图校准 look count can be +1 from 旧天文镜 (same as other looks). Documented on relic; **not a bug** unless re-ruled.
- Optional discard UX: player must click a specific card after Yes (engine toasts if they only confirm).
- Action-bar switch historically defaulted toward first occupied companion; tap companion during prompt to choose. **needs playtest confirmation** of current UI.
- AI is a shallow heuristic; does not plan deep Resonance lines.
- Card art is CSS placeholders (`artKind` / hue).
- 烬痕爆裂 has a leftover comment about illegal play after payment; `canPlayCard` now pre-checks self-damage — **needs validation** if any refund path remains.

Unknown / needs validation:

- Full new-player first-match confusion map (only partially observed)
- Deck balance (not formally measured)
- Whether 51 tests cover all player-visible skill texts

## Next Recommended Work

1. Full human playtests (both decks, both first/second)
2. Log real confusion points (HUD, 初临, 换位 cost, 共鸣 conditions)
3. Combat pace (turns to 3 契痕, empty-board feel)
4. Basic balance of the two 40-card lists — report before changing numbers
5. Only then evaluate Combat 0.2 with explicit approval

## Continuous Handoff Policy

Arena keeps developing. After each **milestone**:

- Update **this file** (status, completed, focus, issues, debt, next)
- Rule change (user-approved) → `GAME_RULES_*` + `DECISIONS.md`
- Architecture change → `ARCHITECTURE.md` / `CARD_SYSTEM.md`
- Leave `AGENTS.md` mostly stable

Final Codex audit only when the user says **「准备交给 Codex」**.
