import { CARDS, def } from "../cards/definitions";
import type { CardType, GameState } from "../types";

export type KindKey = CardType | "resonance";

export const TYPE_HELP: Record<KindKey, { label: string; help: string }> = {
  eidolon: { label: "幻兽", help: "可以部署到主契位或伴契位参与战斗的生物卡。" },
  spell: { label: "灵术", help: "使用后立即产生一次效果，然后进入弃牌区。" },
  relic: { label: "遗物", help: "安置到场上并持续产生效果，直到被移除或对局结束。" },
  environment: { label: "环境", help: "改变整个战场的规则。场上同时只能存在 1 个环境，新环境会替换旧环境。" },
  traveler: { label: "旅者", help: "使用后立即产生一次效果，然后进入弃牌区。" },
  resonance: { label: "共鸣形态", help: "不能直接部署。需要先有对应的基础幻兽，并在对局中满足共鸣条件后才能发动。" },
};

export function kindOf(defId: string): KindKey {
  const d = def(defId);
  if (d.resonanceFrom) return "resonance";
  return d.type;
}

export function resonanceExplain(defId: string, g?: GameState): { source: string; cond: string; progress?: string } | null {
  const d = def(defId);
  if (!d.resonanceFrom) return null;
  const base = CARDS[d.resonanceFrom]?.name ?? d.resonanceFrom;
  const p = g?.player;
  if (d.resonanceFrom === "moss_sleep") {
    const n = p?.totalHealing ?? 0;
    return { source: base, cond: "本局累计治疗至少 30 点", progress: `共鸣进度：${Math.min(n, 30)} / 30` };
  }
  if (d.resonanceFrom === "microstar") {
    const n = p?.deckTopViewed ?? 0;
    return { source: base, cond: "本局累计查看牌库顶至少 6 张", progress: `共鸣进度：${Math.min(n, 6)} / 6` };
  }
  if (d.resonanceFrom === "ash_lizard") {
    const n = p?.totalSelfDamage ?? 0;
    return { source: base, cond: "本局友方累计自伤至少 20 点", progress: `共鸣进度：${Math.min(n, 20)} / 20` };
  }
  if (d.resonanceFrom === "ash_crow") {
    const n = p?.discardEntries ?? 0;
    return { source: base, cond: "本局至少有 3 张友方牌进入过弃牌区", progress: `共鸣进度：${Math.min(n, 3)} / 3` };
  }
  if (d.resonanceFrom === "tide_jelly") {
    const n = p?.switchesBattle ?? 0;
    return { source: base, cond: "本局至少完成 3 次换位", progress: `共鸣进度：${Math.min(n, 3)} / 3` };
  }
  if (d.resonanceFrom === "moon_cat") {
    const e = p ? [p.active, ...p.companions].find((x) => x?.defId === "moon_cat") : undefined;
    const n = e?.timesEnteredActiveFromCompanion ?? 0;
    return { source: base, cond: "此月潮猫至少两次从伴契进入主契位", progress: `共鸣进度：${Math.min(n, 2)} / 2` };
  }
  return { source: base, cond: d.resonanceText ?? "满足共鸣条件后发动" };
}
