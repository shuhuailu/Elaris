import type { DeckId } from "../types";

export const DECK_LISTS: Record<DeckId, string[]> = {
  mist: [
    ...Array(3).fill("moss_sleep"),
    ...Array(2).fill("moss_crown"),
    ...Array(2).fill("vine_weasel"),
    ...Array(2).fill("pale_wood"),
    ...Array(2).fill("microstar"),
    ...Array(2).fill("weave_moth"),
    ...Array(2).fill("star_owl"),
    ...Array(3).fill("star_fox"),
    ...Array(2).fill("mist_path"),
    ...Array(3).fill("sprout"),
    ...Array(3).fill("stardust"),
    ...Array(2).fill("borrowed_dawn"),
    ...Array(3).fill("chart_align"),
    ...Array(2).fill("old_scope"),
    ...Array(2).fill("moss_basin"),
    ...Array(2).fill("eve"),
    ...Array(1).fill("norn"),
    ...Array(2).fill("mist_night"),
  ],
  ash: [
    ...Array(3).fill("ash_lizard"),
    ...Array(2).fill("ash_crown"),
    ...Array(3).fill("ash_crow"),
    ...Array(2).fill("ember_emperor"),
    ...Array(2).fill("furnace_mole"),
    ...Array(2).fill("tide_jelly"),
    ...Array(1).fill("silver_umbrella"),
    ...Array(2).fill("moon_cat"),
    ...Array(1).fill("mirror_cat"),
    ...Array(3).fill("ash_borrow"),
    ...Array(3).fill("tide_return"),
    ...Array(2).fill("scar_burst"),
    ...Array(2).fill("warm_reclaim"),
    ...Array(3).fill("ash_scheme"),
    ...Array(2).fill("ash_furnace"),
    ...Array(2).fill("moon_mirror"),
    ...Array(2).fill("alo"),
    ...Array(1).fill("mira"),
    ...Array(1).fill("ash_rain"),
    ...Array(1).fill("high_tide"),
  ],
};

export const DECK_META: Record<
  DeckId,
  { title: string; titleEn: string; sources: string; blurb: string }
> = {
  mist: {
    title: "雾林引星",
    titleEn: "Mistwood Star-Calling",
    sources: "Verdant / Astral · 森 / 星",
    blurb: "Restore. Observe. Resonate. Outlast.",
  },
  ash: {
    title: "灰烬月潮",
    titleEn: "Ashen Moon-Tide",
    sources: "Ember / Tide · 烬 / 潮",
    blurb: "Bleed. Shift. Accelerate. Break.",
  },
};
