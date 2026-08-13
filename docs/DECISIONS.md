# Decisions (ADR-lite)

Do not re-litigate these unless the user reopens them.

## 灵息 instead of Energy cards

- **Decision:** Resource is a turn-scaling 灵息 pool (1→7) plus capped temp 灵息, not Energy cards in deck.
- **Reason:** 40-card combat prototype should test board tactics, not energy-brick variance.
- **Consequence:** Decks are all gas; tempo is turn number + temp sources. Do not add Energy cards in 0.1.x.

## 源相 is not type advantage

- **Decision:** 森 / 潮 / 烬 / 星 gate **card text** (heal riders, 烬源自伤, 潮换位, 星 look), not a damage multiplier chart.
- **Reason:** Avoid rock-paper-scissors masking deck identity.
- **Consequence:** Do not add silent type-advantage math.

## Evolution is 共鸣

- **Decision:** Upgrade is 共鸣 (hand form + board base + condition + cost), not Pokémon-style evolve energy.
- **Reason:** World language; one-per-turn; damage counters persist.
- **Consequence:** Resonance cards are not free deploys. Keep HP-counter inheritance.

## Inspect is safe

- **Decision:** Click-to-look never spends or plays.
- **Reason:** New players misclick; TCG standard is examine then confirm.
- **Consequence:** Inspect → Select → Commit is non-negotiable in 0.1.x UI.

## Setup is a separate screen

- **Decision:** Opening bind is `SetupScreen`, not the empty combat desk.
- **Reason:** Choosing 主契 is a rite; empty board felt like a broken match.
- **Consequence:** Full-card overlay lives in the rite; setup bind is not 初临.

## Duplicate opening candidates merge visually

- **Decision:** Group by `defId` (e.g. 苍木守灵 ×2). Compare only different defs.
- **Reason:** “苍木 vs 苍木” is not a meaningful choice.
- **Consequence:** UI merge only; instances stay unique.

## 寻星 keeps 20 damage

- **Decision:** 星灯狐「寻星」 deals **20** and then fox-look 3. Text + `strike.damage: 20` + `follow: foxLook`.
- **Reason:** User ruling. Look is extra, not a replacement for the hit.
- **Consequence:** Engine must use `computeStrikeDamage`, not a card-id override.

## 灰冠火蜥 counts 烬源自伤 only

- **Decision:** Condition is `emberSelfDamage` on **friendly 烬源** eidolons’ self-damage.
- **Reason:** User ruling. Non-ember friendly self-damage must not unlock 灰冠.
- **Consequence:** `applyDamage(..., { self: true })` increments `emberSelfDamage` only if `hasSource(..., "ember")`.

## 余烬鸦皇 counts discard **entries**

- **Decision:** `discardEntries` = times **your** cards entered **your** discard. Re-entries count. Opponent discard does not.
- **Reason:** User ruling. “弃牌张数 in pile” would punish recycling.
- **Consequence:** Always increment via `discardCard` on the owning side.

## Definition is single source of truth

- **Decision:** Structured combat data lives on `CardDef`. Engine/UI/tests consume it.
- **Reason:** Id-scattered damage caused text/engine drift (寻星).
- **Consequence:** New skills add `strike` / `follow` (or report if the DSL is insufficient). Do not fork numbers in UI.

## Continuous docs, Arena still develops

- **Decision:** Handoff files exist so a future Codex can start from git. Arena remains primary until 「准备交给 Codex」.
- **Reason:** Chat history is not durable.
- **Consequence:** Update `HANDOFF.md` at milestones; do not pause Arena development because docs exist.
