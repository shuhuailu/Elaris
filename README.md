<div align="center">

# ELARIS

**A dark fantasy collectible card game that runs in the browser.**

*An old natural-history and astronomical archive that becomes a playable table at night.*

`Combat Prototype 0.1.5` · `Set 001 — Waking of the Veilwood` · 《雾林初醒》

</div>

---

## What this is

ELARIS is an original collectible card game built around mysterious creatures,
covenants, celestial observation and **the act of recording living things**.

It is not a website decorated like a fantasy game. It is a quiet digital doorway
into an old fantasy world. Every system is a *place*, every control is an
*object*, every menu is a *ritual*.

The guiding philosophy:

> Gameplay makes players **stay**.
> Collecting makes them **invest**.
> The world makes them **remember**.

---

## Running it

No build step, no dependencies, no framework. It is one HTML file.

```bash
git clone https://github.com/shuhuailu/elaris.git
cd elaris
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

> **Note:** open it through a local server, not by double-clicking `index.html`.
> Browsers block audio and video autoplay on `file://` URLs.

---

## The player journey

```
LOADING  →  THRESHOLD  →  THE GATE  ┬─ new player → name → covenant mark
                                    │                → choose 1 of 10 parcels
                                    │                → reveal 5 records
                                    │                → THE HALL
                                    └─ returning     → THE HALL (one click)
```

From the hall you reach the Archive, the Card Table, the Sealed Chest,
the Merchant's Table, the Reliquary, the Covenant Board — and the Battle gate.

---

## Design system — "Ember Darkness"

The interface exists in darkness. Red is never a UI accent colour; it is heat
buried beneath charcoal, and it only wakes on interaction.

```
DARKNESS → DISTURBANCE → EMBER → DARKNESS
```

| Token | Hex |
|---|---|
| Soot | `#080707` |
| Charcoal | `#0C0B0B` |
| Oxblood | `#2B1012` |
| Live ember | `#8C2F1C` |
| Tarnished bronze | `#6B4934` |
| Old ivory | `#D8CDB8` |

### The four Aspects

Aspect colour is a rare interruption, never a theme.

| Aspect | Manifests as | Plays like |
|---|---|---|
| **Verdant** 森 | ancient forest green | growth, healing, compounding value |
| **Tide** 潮 | moonlit blue | movement; entering the Active place *is* the payoff |
| **Ember** 烬 | deep ember red | self-damage, discard, burst |
| **Astral** 星 | pale astral light | scry, search, planning |

---

## Core UX rules

**Inspect → Select → Commit.** Clicking a card to read it is always safe.
Inspection can never accidentally play something. Exploration is free;
commitment has a cost.

**Quick Understand → Decide → Deep Inspect.** Skills and cost are always
visible. The field record and lore fold away until asked for.

**Place, not page. Object, not button. Ritual, not menu.**

---

## What's implemented

- Full journey: loading → threshold → gate → covenant → first parcel → hall
- Account persistence via `localStorage`; returning players are recognised at the door
- **10 starter parcels**, each yielding a legal 40-card deck (verified: copy limits, ≤2 Aspects)
- **38 cards** across four Aspects with skills, lore and flavour
- Archive with Aspect/Kind/held filters
- Card Table with live stack, Aether curve and legality warnings
- Ceremonial pack opening
- Merchant's table (parcels in Embers, skins in Sigils)
- Reliquary — 7 skin treatments, appearance only, never power
- Rank ladder, notice board, friends board, profile
- Procedural **Covenant Marks** — unique per player, used for identity everywhere
- Four-cue adaptive score that crossfades between spaces
- Accessibility: reduce motion, high contrast, larger text, volume control

### Not yet built

The Battle gate currently simulates a win to demonstrate the economy loop.
The real combat engine, and server-authoritative PvP, are next.

---

## Assets

Everything in this repository was generated for the project.

| Path | What |
|---|---|
| `index.html` | The entire game — markup, design system, engine |
| `logo/` | Engraved stag-skull crest: lockup, crest, wordmark, favicon |
| `bg/` | Painted vault backgrounds + animated loading video |
| `audio/` | Four-cue original score |

**The score** was synthesized from raw DSP — detuned pads, struck bronze
partials, convolution reverb, tape wow and flutter. No samples, no loops.

| Cue | Length | Level | Character |
|---|---|---|---|
| Loading | 56s | −19 dB | D aeolian, slow descent |
| The Hall | 64s | −20 dB | warm, hearth crackle |
| The Archive | 69s | −26 dB | suspended, near-silent |
| Battle | 74s | −14 dB | 132 BPM, D phrygian, harsh |

All four loop seamlessly (verified at the sample level).

**The background** keeps its centre near-black (mean luminance 15, only 0.01%
above 60) so cards placed over it always dominate. Each Aspect wakes its own
region of the painting.

---

## Roadmap

```
Combat 0.1.x   core battle quality, readability, pacing
Combat 0.2     depth and rule maturity
Pack opening   rarity presentation, collecting psychology
Collection     bestiary, Eidolon archive, variant records
Deck builder   player-authored covenants
Card visuals   final frames, collectible treatments
World bible    history, recorders, ecology, regions
Narrative      the Veilwood
Long term      accounts, cloud collection, ranked PvP, seasons
```

---

## Credits

Design, art direction, code, artwork and score for ELARIS.
The stag-skull crest is original to the project.

<div align="center">

*“The act of recording something can change what is being recorded.”*

</div>
