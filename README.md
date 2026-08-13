# ELARIS — Combat Prototype 0.1

Browser-only trading-card duel. No accounts, no backend.

## Run

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

## Architecture

| Layer | Path | Role |
| --- | --- | --- |
| Types | `src/types.ts` | Cards, board, phases, prompts, actions |
| Card bible | `src/cards/definitions.ts` | All 幻兽 / 灵术 / 遗物 / 旅者 / 环境 |
| Decks | `src/cards/decks.ts` | 40-card 雾林引星 & 灰烬月潮 |
| Engine | `src/engine/game.ts` | Deterministic reducer: legality + mutation |
| Helpers | `src/engine/helpers.ts` | Aether, log, board queries |
| UI | `src/App.tsx`, `src/ui/CardView.tsx` | Presentation only |

Gameplay never lives only in buttons: `reduce()` rejects illegal mutations.

## Known limitations / ambiguities

- Optional discard (焦羽 / 灰羽谋算) currently discards the leftmost hand card after Yes, rather than letting you pick which card.
- 烬痕爆裂 validates after payment if played illegally (should be pre-checked more strictly).
- Switch control from the Action bar always targets the first occupied 伴契位; tap a companion during a switch prompt to choose.
- AI is a shallow heuristic; it does not plan Resonance lines deeply.
- Card art is abstract CSS placeholders (`artKind` / hue) so assets can replace later via `CardDef`.
- Environment discard ownership: a replaced Environment is placed in the new caster’s discard.
- First-turn draw is skipped for the starting player only.

## Prototype 0.2 suggestions

- Explicit target picker for discards and multi-companion switch.
- Full effect scripting language instead of `if (defId === …)`.
- Undo / replay from the chronicle.
- Richer AI evaluation.
- Swap placeholders for commissioned manuscript art.
