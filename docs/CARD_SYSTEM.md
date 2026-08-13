# Card system

## Pipeline

```
Card Definition → Engine
Card Definition → UI
Card Definition → Tests
```

File: `src/cards/definitions.ts` (`CARDS`).

**卡上写什么，就一定发生什么.** Structured combat data lives on the definition. Engine executes it; UI displays it; tests assert it.

## Identity

| Field | Meaning |
| --- | --- |
| `defId` (`CardDef.id`) | Printed card. Shared by all copies / future art variants |
| `instanceId` | Unique copy in this match (`GameState.instances`) |

Never key combat state by display name or hand index.

## Core definition fields

- `type`, `sources`, `cost` (deploy / cast)
- `hp` — printed max HP for eidolons
- `skill`: `{ name, cost, text, strike?, follow? }`
  - `strike.damage` — base attack damage
  - `strike.altWhen` / `altDamage` — e.g. entered 主契 this turn; friendly effect damage
  - `follow[]` — ordered after-hit steps (`selfDamage`, `healTarget`, `look`, `foxLook`, …)
- `resonanceFrom`, `resonanceCost`, `resonanceText` — resonance print
- `text` / `flavor` — static rules / flavor
- `artHue` / `artKind` — placeholder art only

`computeStrikeDamage(skill, eidolon)` is the shared damage resolver.

## Resonance condition (engine, 0.1.5)

Conditions are still checked in `canResonate` by `resonanceFrom` id (heal / look / emberSelfDamage / discardEntries / switches / that cat’s enter count).  
On-res heal for 苔冠 is still by form id. Future work may structure these; **do not rewrite unprompted**.

## Visual variants (future)

Ordinary / 异画 / Full Art / collection frames may differ visually.

**Same gameplay `defId` ⇒ same combat ability** unless a **new** gameplay definition is explicitly created.

Do not fork damage or follow lists per skin.

## What must not return

- `if (id === "star_fox") damage = 20` in the engine
- UI hardcoding a different 寻星 number than `strike.damage`
- Tests that assert flavor text instead of structured fields when checking combat math
