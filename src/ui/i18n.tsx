import { createContext, useContext, useEffect, useState } from "react";
import type { CardDef, CardType, Rarity, SkillDef, Source } from "../types";
import { CARDS } from "../cards/definitions";

export type Locale = "en" | "zh";
const STORAGE_KEY = "elaris-locale";

const UI = {
  en: {
    beginDuel: "BEGIN DUEL", language: "中文", languageTitle: "Switch language", aether: "Aether", health: "Health",
    cost: "Aether cost", initialArrival: "Initial Arrival", resonanceForm: "Resonance Form",
    source: "Source", resonanceCondition: "Resonance condition", progress: "Progress", rarity: "Rarity",
    inspectOnly: "Inspect only — this does not play a card or change the match.",
  },
  zh: {
    beginDuel: "开始对决", language: "EN", languageTitle: "切换语言", aether: "灵息", health: "生命",
    cost: "灵息费用", initialArrival: "初临", resonanceForm: "共鸣形态",
    source: "来源", resonanceCondition: "共鸣条件", progress: "进度", rarity: "稀有度",
    inspectOnly: "仅查看——不会使用卡牌或改变对局。",
  },
} as const;

const TYPE: Record<CardType | "resonance", Record<Locale, { label: string; help: string }>> = {
  eidolon: { en: { label: "Eidolon", help: "A creature card deployed to the active or companion row to fight." }, zh: { label: "幻兽", help: "可以部署到主契位或伴契位参与战斗的生物卡。" } },
  spell: { en: { label: "Spell", help: "Resolves once, then goes to the discard pile." }, zh: { label: "灵术", help: "使用后立即产生一次效果，然后进入弃牌区。" } },
  relic: { en: { label: "Relic", help: "Remains in play with an ongoing effect until removed or the match ends." }, zh: { label: "遗物", help: "安置到场上并持续产生效果，直到被移除或对局结束。" } },
  environment: { en: { label: "Environment", help: "Changes the battlefield. Only one Environment can exist at a time." }, zh: { label: "环境", help: "改变整个战场的规则。场上同时只能存在 1 个环境，新环境会替换旧环境。" } },
  traveler: { en: { label: "Traveler", help: "Resolves once, then goes to the discard pile." }, zh: { label: "旅者", help: "使用后立即产生一次效果，然后进入弃牌区。" } },
  resonance: { en: { label: "Resonance Form", help: "Cannot be deployed directly. It needs its base Eidolon and its Resonance condition." }, zh: { label: "共鸣形态", help: "不能直接部署。需要先有对应的基础幻兽，并在对局中满足共鸣条件后才能发动。" } },
};

const SOURCE: Record<Source, Record<Locale, string>> = {
  verdant: { en: "Verdant", zh: "森" }, tide: { en: "Tide", zh: "潮" }, ember: { en: "Ember", zh: "烬" }, astral: { en: "Astral", zh: "星" },
};
const RARITY: Record<Rarity, Record<Locale, string>> = {
  common: { en: "◇ Common", zh: "◇ 常契" }, rare: { en: "◆ Rare", zh: "◆ 珍契" }, arcane: { en: "✦ Arcane", zh: "✦ 秘契" }, relic: { en: "✧ Relic", zh: "✧ 遗契" }, mythic: { en: "✦✦ Mythic", zh: "✦✦ 神契" },
};

// Display-only translations: rules and numbers remain exclusively in CardDef's structured fields.
const CARD_EN: Record<string, { text?: string; resonance?: string; skillName?: string; skillText?: string }> = {
  moss_sleep:{text:"A sleeping knot of living moss.",skillName:"Moss Pounce",skillText:"Deal 20 damage."},
  moss_crown:{text:"The Resonance form of Moss-Sleep Cluster.",resonance:"When it Resonates, heal itself for 20. Requires 30 total healing this match.",skillName:"Moss-Crown Vigil",skillText:"Deal 30 damage, then heal a friendly Eidolon for 10."},
  vine_weasel:{text:"A small beast carrying a vine lantern.",skillName:"Lantern Draw",skillText:"Deal 10 damage. Look at the top 2 cards of your deck and reorder them."},
  pale_wood:{text:"An old guardian spirit formed by the forest.",skillName:"Forest Breath",skillText:"Deal 30 damage, then heal all friendly Eidolons for 10 each."},
  microstar:{text:"A living mote of light on a star chart.",skillName:"Glimmer",skillText:"Deal 10 damage. Look at the top 2 cards of your deck and reorder them."},
  weave_moth:{text:"The Resonance form of Microstar Mothling.",resonance:"Look at least 6 deck-top cards this match.",skillName:"Starweave",skillText:"Deal 30 damage. Look at the top 3 cards of your deck and reorder them."},
  star_owl:{text:"It watches the next page of the night.",skillName:"Twin-Star Gaze",skillText:"Deal 20 damage. Look at the top card of the opponent's deck; leave it there or put it on the bottom."},
  star_fox:{text:"Guiding glow: the first time each turn you search a card into hand from your deck, heal your active Eidolon for 10.",skillName:"Starseek",skillText:"Deal 20 damage to the opposing active Eidolon. Look at your top 3 cards; put 1 Verdant or Astral card on top, then reorder the rest."},
  mist_path:{text:"Switch for free. If the new active Eidolon is Astral, look at the top card of your deck."}, sprout:{text:"Heal a friendly Eidolon for 20. If it is Verdant, look at the top card of your deck."}, stardust:{text:"Look at the top 3 cards of your deck and reorder them."}, borrowed_dawn:{text:"Heal a friendly Eidolon for 30. If your active Eidolon is Astral, look at the top 2 cards of your deck."}, chart_align:{text:"Look at the top 4 cards. Put 1 Eidolon or Relic into hand; return the rest to the top in their original relative order. This counts as a search."}, old_scope:{text:"The first time each turn you look at your deck top, look at 1 extra card. Multiple copies do not stack."}, moss_basin:{text:"Nightfall: if your active Eidolon is Verdant, heal it for 10."}, eve:{text:"List all Verdant Eidolons in your deck. Put 1 into hand, then shuffle."}, norn:{text:"Look at the top 5 cards. Put 1 Astral card into hand, then put the rest on the bottom in any order."}, mist_night:{text:"The first damage each Verdant Eidolon takes each turn is reduced by 10, to a minimum of 0."},
  ash_lizard:{text:"Self-damage advances Ember Resonance.",skillName:"Cinder Bite",skillText:"Deal 30 damage, then take 10 damage."}, ash_crown:{text:"The Resonance form of Cinder-Tail Lizard.",resonance:"Your Ember Eidolons have taken at least 20 self-damage this match.",skillName:"Ash Flame",skillText:"Deal 40 damage. Deal 50 instead if this took damage from a friendly effect this turn."}, ash_crow:{text:"It pays with its own feathers.",skillName:"Scorchfeather",skillText:"Deal 20 damage. You may discard 1 card to draw 1 card."}, ember_emperor:{text:"The Resonance form of Ash-Feather Crow.",resonance:"Your cards have entered your discard pile at least 3 times this match.",skillName:"Burial Feathers",skillText:"Deal 40 damage. You may shuffle an Ember card from your discard into your deck; if you do, deal 10 more damage."}, furnace_mole:{text:"It tempers heat into breath.",skillName:"Furnace Strike",skillText:"Deal 20 damage. You may take 10 damage to gain 1 temporary Aether."}, tide_jelly:{text:"A bell of fresh water.",skillName:"Tide Bell",skillText:"Deal 10 damage, then you may switch for free."}, silver_umbrella:{text:"The Resonance form of Tide-Bell Jelly.",resonance:"Complete at least 3 switches this match.",skillName:"Still Tide",skillText:"Deal 20 damage. The opposing active Eidolon's next attack deals 20 less damage, to a minimum of 0."}, moon_cat:{text:"It is already leaping when it lands.",skillName:"Moon Mark",skillText:"Deal 20 damage. Deal 30 instead if it entered the active slot this turn."}, mirror_cat:{text:"The Resonance form of Moon-Tide Cat.",resonance:"This Moon-Tide Cat has entered the active slot from companion at least twice this match.",skillName:"Mirror Image",skillText:"Deal 30 damage. If it entered the active slot this turn, draw 1 card."},
  ash_borrow:{text:"Once per turn, deal 10 damage to a friendly Ember Eidolon to gain 1 temporary Aether."}, tide_return:{text:"Switch for free. If the new active Eidolon is Tide, heal it for 10."}, scar_burst:{text:"Requires a friendly Eidolon to have taken self-damage this turn. Deal 20 direct damage to the opposing active Eidolon."}, warm_reclaim:{text:"Return an Ember Eidolon from your discard to your hand. Then your active Eidolon takes 10 damage."}, ash_scheme:{text:"Discard 1 card, then draw 2 cards."}, ash_furnace:{text:"The first time a friendly Eidolon takes self-damage each turn, gain 1 temporary Aether. Multiple copies do not stack."}, moon_mirror:{text:"After your first switch each turn, heal the new active Eidolon for 10."}, alo:{text:"Deal 10 damage to a friendly Eidolon. Search your deck for an Ember card, put it into hand, then shuffle."}, mira:{text:"Switch for free. If the new active Eidolon is Tide, draw 1 card."}, ash_rain:{text:"All healing is reduced by 10, to a minimum of 0."}, high_tide:{text:"Your first normal switch each turn costs 0. When a Tide Eidolon enters the active slot, its next attack this turn deals +10 damage."},
};

const LanguageContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: "en", setLocale: () => {} });
export function LanguageProvider({ children }: { children: React.ReactNode }) { const [locale, setLocale] = useState<Locale>(() => localStorage.getItem(STORAGE_KEY) === "zh" ? "zh" : "en"); useEffect(() => localStorage.setItem(STORAGE_KEY, locale), [locale]); return <LanguageContext.Provider value={{ locale, setLocale }}>{children}</LanguageContext.Provider>; }
export const useLanguage = () => useContext(LanguageContext);
export const ui = (locale: Locale) => UI[locale];
export const cardName = (d: CardDef, locale: Locale) => locale === "en" ? d.nameEn : d.name;
export const cardText = (d: CardDef, locale: Locale) => locale === "en" ? CARD_EN[d.id]?.text ?? d.text : d.text;
export const resonanceText = (d: CardDef, locale: Locale) => locale === "en" ? CARD_EN[d.id]?.resonance ?? d.resonanceText : d.resonanceText;
export const skillName = (s: SkillDef, id: string, locale: Locale) => locale === "en" ? CARD_EN[id]?.skillName ?? s.name : s.name;
export const skillText = (s: SkillDef, id: string, locale: Locale) => locale === "en" ? CARD_EN[id]?.skillText ?? s.text : s.text;
export const typeInfo = (kind: CardType | "resonance", locale: Locale) => TYPE[kind][locale];
export const sourceLabel = (source: Source, locale: Locale) => SOURCE[source][locale];
export const rarityLabel = (rarity: Rarity, locale: Locale) => RARITY[rarity][locale];
export function starterTag(label: string, locale: Locale): string {
  if (locale === "zh") return label;
  return ({ "易上手": "Beginner-friendly", "低费": "Low cost", "规划": "Planning", "耐久": "Durable", "治疗": "Healing", "控制": "Control" } as Record<string, string>)[label] ?? label;
}
const STARTER_EN: Record<string, { pro: string; con: string; style: string }> = {
  moss_sleep: { pro: "Simple and low-cost, so it acts early.", con: "Its base ceiling is low; it needs healing support to Resonance.", style: "Steady / Beginner-friendly" },
  vine_weasel: { pro: "Low cost and its skill also plans your deck.", con: "Low health and modest burst damage.", style: "Low cost / Planning" },
  pale_wood: { pro: "High durability and strong team healing.", con: "Its skill costs 3 Aether, so it starts slowly.", style: "Durable / Slow start" },
  microstar: { pro: "Very cheap and can plan your deck early.", con: "Very low health; it must survive to pay off.", style: "Planning / Fragile" },
  star_owl: { pro: "Can see and alter the opponent's next draw.", con: "Average damage and a more intricate play pattern.", style: "Control / Planning" },
  star_fox: { pro: "Plans future draws for long-term value.", con: "Costs more than 1-cost Eidolons and takes planning.", style: "Planning / Midrange" },
  ash_lizard: { pro: "High damage at a low cost; direct to play.", con: "Its skill self-damages, increasing board pressure.", style: "Burst / Self-damage" },
  ash_crow: { pro: "Low-cost skill with a clear tempo plan.", con: "Average health; discard decisions unlock more value.", style: "Steady / Beginner-friendly" },
  furnace_mole: { pro: "Solid health; its skill can create temporary Aether.", con: "The skill costs 2 Aether and may self-damage.", style: "Midrange / Resource" },
  tide_jelly: { pro: "Low cost and can switch for free after its skill.", con: "Low individual damage; it needs switch synergy.", style: "Switching / Low cost" },
  moon_cat: { pro: "Hits harder after switching into the active slot.", con: "Costs 2 and needs room to switch.", style: "Switching / Midrange" },
};
export function starterNarrative(defId: string, fallback: { pro: string; con: string; style: string }, locale: Locale) {
  return locale === "en" ? (STARTER_EN[defId] ?? { pro: "Its health, cost, and skill work together.", con: "Manage its Aether cost and health to use its strengths.", style: "Balanced" }) : fallback;
}

/** Presentation-only translation for reducer logs, toasts and legacy prompt text. */
export function displayText(text: string, locale: Locale): string {
  if (locale === "zh") return text;
  let out = text;
  for (const d of Object.values(CARDS)) out = out.split(d.name).join(d.nameEn);
  const terms: [string, string][] = [
    ["对决开始。你持有 ", "Duel begins. You chose "], ["抽牌 1 张。", "draws 1 card."], ["你", "You"], ["对方", "Opponent"],
    ["行动阶段", "Action phase"], ["战斗阶段", "Battle phase"], ["进入战斗", "Enter Battle"], ["结束本回合", "End Turn"],
    ["灵息不足。", "Not enough Aether."], ["现在不能", "You cannot"], ["造成 ", "deals "], [" 点伤害", " damage"], ["回复 ", "heals "], [" 点", ""],
    ["获得 1 契痕", "gains 1 Covenant"], ["换位", "switches"], ["发动共鸣", "uses Resonance"], ["发动", "uses"], ["共鸣条件尚未满足", "Resonance condition not met"],
    ["弃牌区", "discard pile"], ["牌库", "deck"], ["主契", "active Eidolon"], ["伴契", "companion"], ["初临", "Initial Arrival"], ["夜幕", "Nightfall"], ["苏醒", "Awaken"],
  ];
  for (const [zh, en] of terms) out = out.split(zh).join(en);
  return out;
}
