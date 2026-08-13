import { def } from "../cards/definitions";
import type { GameState } from "../types";
import { canSwitch } from "./game";

export function battleSkillLabel(defId: string) {
  const d = def(defId);
  const sk = d.skill;
  if (!sk) return null;
  return {
    name: sk.name,
    cost: sk.cost,
    text: sk.text,
    button: `发动「${sk.name}」`,
    detail: `消耗 ${sk.cost} 灵息 · ${sk.text}`,
  };
}

export function switchTeachReady(g: GameState): boolean {
  if (g.phase !== "action" || g.activeSide !== "player") return false;
  if (!g.player.active) return false;
  if (!g.player.companions.some(Boolean)) return false;
  const idx = g.player.companions.findIndex(Boolean);
  return idx >= 0 && canSwitch(g, "player", idx, false) === null;
}

export function lookPurpose(title: string): string {
  if (title.includes("寻星")) return "你正在预见接下来可能抽到的牌，并把一张森或星源牌安排到最前面。";
  if (title.includes("星屑")) return "你正在预见接下来可能抽到的牌，并决定它们的先后。";
  if (title.includes("芽生")) return "你正在预见下一次抽牌会拿到的牌。";
  if (title.includes("雾径") || title.includes("借来")) return "你正在预见接下来可能抽到的牌。";
  return "你正在预见接下来可能抽到的牌，并安排抽牌顺序。";
}
