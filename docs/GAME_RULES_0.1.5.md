# Combat Prototype 0.1.5 — frozen rules

Source: current engine (`src/engine/game.ts`, `helpers.ts`) + `src/cards/definitions.ts` + user rulings.  
**Do not redesign from memory.** If this file and code disagree, report.

## Match setup

- Two constructed **40-card** lists: 雾林引星 (`mist`, Verdant/Astral), 灰烬月潮 (`ash`, Ember/Tide). Opponent receives the other list.
- Copy counts are as written in `src/cards/decks.ts` (currently at most **3** of a `defId`). There is **no separate runtime “max 4 copies” enforcer**.
- Each physical card is an **instance** (`instanceId`) pointing at a **definition** (`defId`).
- Opening: each side draws **5**. If the hand has no legal **basic starter** eidolon (`isBasicEidolon` / `BASIC_STARTERS`), the engine reshuffles hand+library and redraws (up to 40 tries). This is **automatic**, not a player mulligan UI.
- **Setup rite** (independent screen): player binds 1 主契 and optionally 1 伴契 from hand. Bind is **free**. Resonance forms cannot be bound. Setup bind is **not 初临**.
- AI binds first basic in hand as 主契 and another basic as 伴契 if present.

## Board

- 1 主契位 + **3** 伴契位 (max 4 eidolons).
- Relics persist on your side (`PersistentCard`).
- **One** global environment. Playing a new environment **discards the old one to the previous environment’s `owner` pile** (not necessarily the new caster).
- Types: 幻兽 eidolon, 灵术 spell, 遗物 relic, 旅者 traveler, 环境 environment.
- Sources (源相): 森 verdant, 潮 tide, 烬 ember, 星 astral. They are **not** a rock-paper-scissors damage table.

## Win / loss

- First player to **3 契痕** wins. You gain 1 契痕 when you **defeat the opposing 主契**.
- If a player **must draw** and the library is empty, they **lose** (opponent wins).
- If 主契 dies and there is no companion and no basic eidolon in hand to deploy, that player loses.

## 灵息 (Aether)

- At the start of your turn (苏醒): `aetherMax = min(7, max(1, turn))`, then `aether = aetherMax`.
- Temporary 灵息: `gainTempAether` adds at most enough to reach **+2 generated this turn** (`tempAetherGenerated`).
- Spend via `spendAether`. Player-facing shortage: 「灵息不足。」

## Turn flow

Phases: `setup` → each turn `awaken` → `draw` → `action` → `battle` → (`closing` for human after a strike) → `nightfall`.

1. **苏醒:** reset per-turn flags (normal switch, resonance, temp aether, many relic once-per-turn flags, 月潮涨时 first-switch flag). Clear 初临 and several per-eidolon turn flags on all your board eidolons.
2. **抽牌:** draw 1 (including first player’s turn 1).
3. **行动:** play cards, normal switch, resonate. Player must choose **进入战斗** (`END_ACTION`).
4. **战斗:** at most one attack skill from 主契 (prototype). Then human **closing** or AI auto-nightfall.
5. **夜幕:** e.g. 苔石盆 heals 森源 主契 10. Then opponent’s turn. After AI, `turn += 1`.

**First player:** `firstTurnNoStrike` — **cannot use attack skills** on their first turn. Flag clears when that turn nightfalls. They **still draw**.

AI resolves nightfall automatically; human closing is a guided beat.

## 初临 (Initial Arrival)

Formal global keyword. Help string: `INITIAL_ARRIVAL_HELP`.

- Eidolons **deployed from hand during the match** get `initialArrival: true` and **cannot use attack skills** that turn.
- **Setup bind is not 初临.**
- 苏醒 clears `initialArrival` on your board.
- Resonance **keeps** the base’s `initialArrival` flag.
- Deploy into an empty 主契 after death from hand **is** 初临.

Not copied onto every card body; shown as badge + hover.

## Switch (换位)

- **Normal switch:** action phase, **once per turn** (`usedNormalSwitch`), default cost **1** 灵息.
- **月潮涨时:** first **normal** switch this turn costs **0** but still **consumes** the normal switch (`envFirstSwitchFreeUsed`).
- **Free switch** (雾径, 潮汐折返, 弥拉, 铃潮 optional, empty-active promote paths): does **not** spend the normal switch and does not pay the 1 灵息.
- 月潮镜: first switch **this turn** (including free) heals the new 主契 10 (`switchesTurn === 1`). Text vs implementation: see HANDOFF.
- Counters: `switchesBattle` (match), `timesEnteredActiveFromCompanion` (per eidolon).

## Resonance (共鸣)

- Action phase, **once per side per turn**.
- Need the **base form** on your board (`resonanceFrom`), pay `resonanceCost`, meet condition:
  - 苔冠守兽 ← 苔眠团兽: `totalHealing >= 30`
  - 织星蛾 ← 微星虫: `deckTopViewed >= 6`
  - 灰冠火蜥 ← 烬尾蜥: `emberSelfDamage >= 20` (**己方烬源幻兽 self-damage only**)
  - 余烬鸦皇 ← 灰羽鸦: `discardEntries >= 3` (**your cards entering your discard**)
  - 银潮伞母 ← 潮铃水母: `switchesBattle >= 3`
  - 镜月灵猫 ← 月潮猫: **that** 月潮猫 `timesEnteredActiveFromCompanion >= 2`
- Damage counters persist: `newHp = newMax - (oldMax - oldHp)`. If `newHp <= 0`, **defeat before** on-res heal.
- 苔冠守兽 then heals 20 (still by id `moss_crown`).
- Resonance card is not a normal deploy.

## Combat / skills

- Attack only in `battle`, needs 主契, opposing 主契, 灵息 ≥ skill cost, not 初临, not first-turn lock.
- Damage = `computeStrikeDamage(skill, eidolon)` + `attackMod`, then target `nextAttackReduction`.
- Follow steps from `skill.follow` (look, foxLook, heal, selfDamage, etc.).
- **星灯狐「寻星」:** `strike.damage: 20` + `follow: foxLook` (look 3, pick 森/星 to arrange). Engine must not hardcode the 20 by id.

## Instances and piles

- `defId`: shared printed identity.
- `instanceId`: unique copy. Always target by instance.
- `discardCard`: push to that side’s discard and increment **that side’s** `discardEntries` (same card re-entering counts again). Opponent discard does not increment yours.
- `emberSelfDamage`: only when damage is applied with `{ self: true }` **and** the damaged eidolon has 烬 source.

## Card types (play)

- **幻兽:** pay `cost`, occupy 主契 or empty 伴契; 初临 if from hand in match.
- **灵术 / 旅者:** resolve then go to your discard (via `discardCard`).
- **遗物:** stay on your relic row.
- **环境:** replace unique env as above.

## Rulings (do not reopen)

See also `docs/DECISIONS.md`.

- 寻星 keeps **20** damage + look 3.
- 灰冠火蜥 condition: **己方烬源自伤**, not all friendly self-damage.
- 余烬鸦皇: **times your cards entered your discard**.
- 借来的晨光: heal 30 one friendly; if your 主契 is 星源, look top 2.
- 伊芙: list all 森源幻兽 in library, pick 1 to hand, shuffle.
