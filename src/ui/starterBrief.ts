import { def } from "../cards/definitions";

export function hpBand(hp: number) {
  if (hp >= 120) return "非常耐打";
  if (hp >= 85) return "较高耐久";
  if (hp >= 65) return "中等耐久";
  return "偏脆";
}

export function deployBand(cost: number) {
  if (cost <= 1) return "以后重新部署很便宜";
  if (cost === 2) return "以后重新部署成本适中";
  return "以后正常部署较贵";
}

const NOTES: Record<string, { tags: string[]; pro: string; con: string; style: string }> = {
  moss_sleep: { tags: ["易上手", "低费"], pro: "简单、低费，前期容易行动", con: "基础形态上限较低，需要治疗体系才能进一步共鸣", style: "稳定 / 易上手" },
  vine_weasel: { tags: ["低费", "规划"], pro: "费用低，战技还能查看牌库", con: "生命偏低，爆发一般", style: "低费 / 规划" },
  pale_wood: { tags: ["耐久", "治疗"], pro: "耐久和群体恢复能力强", con: "战技需要 3 灵息，前几个回合启动较慢", style: "耐久 / 慢启动" },
  microstar: { tags: ["低费", "规划"], pro: "极低费，能早早查看牌库", con: "生命最低之一，站不住就很难兑现", style: "规划 / 脆" },
  star_owl: { tags: ["控制", "规划"], pro: "能窥视并调整对方下一次抽牌", con: "伤害一般，玩法稍绕", style: "控制 / 规划" },
  star_fox: { tags: ["规划"], pro: "能规划未来抽牌，长期价值高", con: "前期资源要求比 1 费幻兽高，玩法稍复杂", style: "规划 / 中速" },
  ash_lizard: { tags: ["低费"], pro: "伤害高、费用低，上手直接", con: "战技会自伤，站场压力更大", style: "爆发 / 自伤" },
  ash_crow: { tags: ["易上手", "低费"], pro: "低费战技，节奏清楚", con: "生命一般，需要弃牌决策才更完整", style: "稳定 / 易上手" },
  furnace_mole: { tags: ["耐久"], pro: "生命尚可，战技可换临时灵息", con: "战技要 2 灵息，还可能自伤", style: "中速 / 资源" },
  tide_jelly: { tags: ["低费"], pro: "低费，战技后还能免费换位", con: "单次伤害偏低，需要配合换位", style: "换位 / 低费" },
  moon_cat: { tags: ["易上手"], pro: "换上来时战技更疼，适合换位节奏", con: "部署费 2，需要先有换位空间", style: "换位 / 中速" },
};

export function groupStarterInstances(handIds: string[], defIdOf: (instanceId: string) => string) {
  const map = new Map<string, string[]>();
  for (const id of handIds) {
    const defId = defIdOf(id);
    const list = map.get(defId) ?? [];
    list.push(id);
    map.set(defId, list);
  }
  return [...map.entries()].map(([defId, ids]) => ({ defId, ids, pick: ids[0] }));
}

export function skillBite(text: string) {
  const first = text.split("。")[0] ?? text;
  return first.length > 22 ? `${first.slice(0, 20)}…` : first;
}

export function starterBrief(defId: string) {
  const d = def(defId);
  const note = NOTES[defId] ?? {
    tags: d.cost <= 1 ? ["低费"] : d.hp && d.hp >= 100 ? ["耐久"] : ["易上手"],
    pro: "能力来自它的生命、费用与战技组合",
    con: "需要用战技费用和生命去换取它的长处",
    style: "均衡",
  };
  const sk = d.skill;
  const keyAbility = d.text && (d.text.includes("每回合") || d.text.includes("：")) ? d.text : null;
  return {
    name: d.name,
    hp: d.hp ?? 0,
    hpLabel: hpBand(d.hp ?? 0),
    deploy: d.cost,
    deployLabel: deployBand(d.cost),
    skillName: sk?.name ?? "—",
    skillCost: sk?.cost ?? 0,
    skillText: sk?.text ?? "",
    skillBite: sk ? skillBite(sk.text) : "",
    keyAbility,
    tags: note.tags,
    pro: note.pro,
    con: note.con,
    style: note.style,
    confirmLine: `${d.hp ?? 0} 生命 · ${sk ? `${sk.name}需要 ${sk.cost} 灵息` : "无战技"} · ${note.style}`,
  };
}
