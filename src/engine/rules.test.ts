import { describe, expect, it } from "vitest";
import { CARDS, computeStrikeDamage, isBasicEidolon, starterBindError } from "../cards/definitions";
import { gainTempAether } from "./helpers";
import { battleSkillLabel, lookPurpose, switchTeachReady } from "./flow";
import { groupStarterInstances, starterBrief } from "../ui/starterBrief";
import {
  applyDamage,
  beginTurn,
  blankBattle,
  canAttack,
  canPlayCard,
  canResonate,
  canSwitch,
  doAttack,
  doResonate,
  doSwitch,
  drawOne,
  healEidolon,
  menuState,
  nightfall,
  playCard,
  putEnv,
  putField,
  putHand,
  putRelic,
  reduce,
  spawnCard,
  startMatch,
  validateDeckSizes,
} from "./game";

describe("牌组与开局", () => {
  it("双方牌组各 40 张", () => {
    expect(validateDeckSizes()).toEqual({ mist: 40, ash: 40 });
  });

  it("开局幻兽没有初临", () => {
    let g = startMatch(menuState(), "mist");
    const active = g.player.hand.find((id) => isBasicEidolon(g.instances[id].defId))!;
    const libBefore = g.player.library.length;
    const handBefore = g.player.hand.length;
    g = reduce(g, { type: "SETUP_CHOOSE", activeId: active, companionId: null });
    expect(g.player.active!.initialArrival).toBe(false);
    expect(g.player.aether).toBe(1);
    expect(g.player.library.length).toBe(libBefore - 1);
    expect(g.player.hand.length).toBe(handBefore - 1 + 1);
    expect(g.firstTurnNoStrike).toBe(true);
    g.phase = "battle";
    expect(canAttack(g, "player")).toMatch(/先手第一回合/);
  });
});

describe("初临与战技", () => {
  it("初临禁止攻击", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active", true);
    putField(g, "ai", "ash_lizard", "active");
    g.phase = "battle";
    expect(canAttack(g, "player")).toMatch(/初临/);
    const aether = g.player.aether;
    doAttack(g, "player");
    expect(g.player.aether).toBe(aether);
    expect(g.ai.active!.hp).toBe(60);
  });
});

describe("换位", () => {
  it("普通换位消耗 1 灵息且每回合一次", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    putField(g, "player", "microstar", 0);
    putField(g, "player", "vine_weasel", 1);
    g.player.aether = 3;
    expect(canSwitch(g, "player", 0, false)).toBeNull();
    expect(doSwitch(g, "player", 0, false)).toBe(true);
    expect(g.player.aether).toBe(2);
    expect(g.player.usedNormalSwitch).toBe(true);
    expect(doSwitch(g, "player", 1, false)).toBe(false);
    expect(g.player.aether).toBe(2);
    expect(g.player.active!.defId).toBe("microstar");
  });

  it("免费换位不消耗普通换位次数与灵息", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    putField(g, "player", "microstar", 0);
    g.player.aether = 3;
    expect(doSwitch(g, "player", 0, true)).toBe(true);
    expect(g.player.aether).toBe(3);
    expect(g.player.usedNormalSwitch).toBe(false);
    expect(doSwitch(g, "player", 0, false)).toBe(true);
    expect(g.player.usedNormalSwitch).toBe(true);
    expect(g.player.aether).toBe(2);
  });
});

describe("灵息", () => {
  it("永久上限 7", () => {
    const g = blankBattle();
    g.turn = 12;
    g.player.library = [spawnCard(g, "sprout")];
    beginTurn(g, "player");
    expect(g.player.aetherMax).toBe(7);
    expect(g.player.aether).toBe(7);
  });

  it("临时灵息每回合最多 +2，回合结束清除", () => {
    const g = blankBattle();
    g.player.aether = 3;
    g.player.aetherMax = 3;
    expect(gainTempAether(g.player, 2, g)).toBe(2);
    expect(gainTempAether(g.player, 1, g)).toBe(0);
    expect(g.player.aether).toBe(5);
    expect(g.player.tempAetherGenerated).toBe(2);
    g.ai.library = [spawnCard(g, "sprout")];
    nightfall(g, "player");
    expect(g.activeSide).toBe("ai");
    expect(g.ai.tempAetherGenerated).toBe(0);
    expect(g.ai.aether).toBe(g.ai.aetherMax);
  });
});

describe("共鸣", () => {
  it("条件未满足不可共鸣，满足后可共鸣且保留伤害，每回合一次", () => {
    const g = blankBattle();
    const base = putField(g, "player", "moss_sleep", "active");
    base.hp = 30;
    const hid = putHand(g, "player", "moss_crown");
    g.player.aether = 3;
    g.player.totalHealing = 10;
    expect(canResonate(g, "player", hid)).toMatch(/累计治疗 10 \/ 30/);
    doResonate(g, "player", hid);
    expect(g.player.active!.defId).toBe("moss_sleep");
    g.player.totalHealing = 30;
    expect(canResonate(g, "player", hid)).toBeNull();
    doResonate(g, "player", hid);
    expect(g.player.active!.defId).toBe("moss_crown");
    expect(g.player.active!.hp).toBe(110 - 40 + 20);
    expect(g.player.usedResonance).toBe(true);
    const hid2 = putHand(g, "player", "moss_crown");
    putField(g, "player", "moss_sleep", 0);
    expect(canResonate(g, "player", hid2)).toMatch(/最多共鸣一次/);
  });
});

describe("契痕与胜负", () => {
  it("击败主契获得契痕，3 枚获胜", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    const foe = putField(g, "ai", "ash_lizard", "active");
    applyDamage(g, "ai", foe, 60);
    expect(g.player.covenant).toBe(1);
    const f2 = putField(g, "ai", "ash_lizard", "active");
    applyDamage(g, "ai", f2, 60);
    const f3 = putField(g, "ai", "ash_lizard", "active");
    applyDamage(g, "ai", f3, 60);
    expect(g.player.covenant).toBe(3);
    expect(g.winner).toBe("player");
  });

  it("空牌库抽牌失败", () => {
    const g = blankBattle();
    g.player.library = [];
    drawOne(g, "player");
    expect(g.winner).toBe("ai");
  });
});

describe("环境、治疗、自伤、遗物", () => {
  it("环境牌替换", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    putEnv(g, "mist_night", "ai");
    const first = g.environment!.instanceId;
    const env = putHand(g, "player", "ash_rain");
    g.player.aether = 5;
    playCard(g, "player", env);
    expect(g.environment!.defId).toBe("ash_rain");
    expect(g.environment!.owner).toBe("player");
    expect(g.environment!.instanceId).not.toBe(first);
    expect(g.ai.discard.includes(first)).toBe(true);
    expect(g.player.discard.includes(first)).toBe(false);
  });

  it("治疗不能超过最大 HP", () => {
    const g = blankBattle();
    const e = putField(g, "player", "moss_sleep", "active");
    e.hp = 65;
    healEidolon(g, "player", e, 20);
    expect(e.hp).toBe(70);
  });

  it("自伤可击败己方幻兽", () => {
    const g = blankBattle();
    const e = putField(g, "player", "ash_lizard", "active");
    e.hp = 10;
    applyDamage(g, "player", e, 10, { self: true });
    expect(g.player.active).toBeNull();
    expect(g.ai.covenant).toBe(1);
  });

  it("遗物每回合仅触发一次（旧天文镜）", () => {
    const g = blankBattle();
    putField(g, "player", "microstar", "active");
    putRelic(g, "player", "old_scope");
    g.player.library = [spawnCard(g, "sprout"), spawnCard(g, "stardust"), spawnCard(g, "mist_path"), spawnCard(g, "eve")];
    const look = putHand(g, "player", "stardust");
    g.player.aether = 5;
    playCard(g, "player", look);
    expect(g.prompt?.kind).toBe("rearrange");
    if (g.prompt?.kind === "rearrange") expect(g.prompt.cards.length).toBe(4);
    expect(g.player.relicLookBonusUsed).toBe(true);
    g.prompt = null;
    const look2 = putHand(g, "player", "stardust");
    playCard(g, "player", look2);
    const pr = g.prompt as { kind: string; cards: string[] } | null;
    expect(pr?.kind === "rearrange" ? pr.cards.length : 0).toBe(3);
  });
});

describe("非法操作不改变状态", () => {
  it("烬痕爆裂在无自伤时不扣费", () => {
    const g = blankBattle();
    putField(g, "player", "ash_lizard", "active");
    putField(g, "ai", "moss_sleep", "active");
    const c = putHand(g, "player", "scar_burst");
    g.player.aether = 4;
    expect(canPlayCard(g, "player", c)).not.toBeNull();
    playCard(g, "player", c);
    expect(g.player.aether).toBe(4);
    expect(g.player.hand.includes(c)).toBe(true);
  });

  it("灰羽谋算无其他手牌时不可打出", () => {
    const g = blankBattle();
    putField(g, "player", "ash_lizard", "active");
    const c = putHand(g, "player", "ash_scheme");
    g.player.aether = 3;
    expect(canPlayCard(g, "player", c)).toMatch(/没有可弃/);
    playCard(g, "player", c);
    expect(g.player.aether).toBe(3);
    expect(g.player.hand).toEqual([c]);
  });

  it("阿洛检索列出全部烬源牌供选择", () => {
    const g = blankBattle();
    putField(g, "player", "ash_lizard", "active");
    const a = spawnCard(g, "ash_crow");
    const b = spawnCard(g, "furnace_mole");
    const tide = spawnCard(g, "tide_jelly");
    g.player.library = [a, b, tide];
    const alo = putHand(g, "player", "alo");
    g.player.aether = 5;
    playCard(g, "player", alo);
    expect(g.prompt?.kind).toBe("target");
    const next = reduce(g, { type: "CONFIRM_TARGET", instanceId: g.player.active!.instanceId });
    expect(next.prompt?.kind).toBe("pickFromLook");
    if (next.prompt?.kind === "pickFromLook") {
      expect([...next.prompt.cards].sort()).toEqual([a, b].sort());
    }
  });
});

describe("卡牌实例与开局选择", () => {
  function setupHand() {
    const g = startMatch(menuState(), "mist");
    const a = putHand(g, "player", "moss_sleep");
    const b = putHand(g, "player", "moss_sleep");
    const crown = putHand(g, "player", "moss_crown");
    const spell = putHand(g, "player", "sprout");
    return { g, a, b, crown, spell };
  }

  it("两张同名苔眠团兽拥有不同 instanceId", () => {
    const { a, b } = setupHand();
    expect(a).not.toBe(b);
  });

  it("绑定时使用实际 selectedCardInstanceId，不会换成另一张同名卡", () => {
    const { g, a, b } = setupHand();
    const next = reduce(g, { type: "SETUP_CHOOSE", activeId: b, companionId: null });
    expect(next.player.active!.instanceId).toBe(b);
    expect(next.player.active!.instanceId).not.toBe(a);
    expect(next.player.hand.includes(a)).toBe(true);
    expect(next.player.hand.includes(b)).toBe(false);
  });

  it("点击苔冠守兽不会自动选中苔眠团兽，也不能绑定", () => {
    const { g, a, crown } = setupHand();
    expect(starterBindError(g.instances[crown].defId)).toMatch(/共鸣形态/);
    const next = reduce(g, { type: "SETUP_CHOOSE", activeId: crown, companionId: null });
    expect(next.player.active).toBeNull();
    expect(next.prompt?.kind).toBe("setup");
    expect(next.player.hand.includes(crown)).toBe(true);
    expect(next.player.hand.includes(a)).toBe(true);
    expect(next.lastActionIllegal).toMatch(/共鸣形态/);
  });

  it("共鸣形态不能普通部署为伴契", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    const crown = putHand(g, "player", "moss_crown");
    g.player.aether = 3;
    expect(canPlayCard(g, "player", crown)).toMatch(/共鸣/);
    playCard(g, "player", crown);
    expect(g.player.companions.every((c) => !c || c.instanceId !== crown)).toBe(true);
    expect(g.player.hand.includes(crown)).toBe(true);
  });

  it("灵术不能绑定主契", () => {
    const { g, spell } = setupHand();
    expect(starterBindError(g.instances[spell].defId)).toMatch(/无法作为主契/);
    const next = reduce(g, { type: "SETUP_CHOOSE", activeId: spell, companionId: null });
    expect(next.player.active).toBeNull();
    expect(next.prompt?.kind).toBe("setup");
  });

  it("所有共鸣形态统一限制开局绑定", () => {
    for (const id of ["moss_crown", "weave_moth", "ash_crown", "ember_emperor", "silver_umbrella", "mirror_cat"]) {
      expect(starterBindError(id)).toMatch(/共鸣形态/);
    }
  });
});

describe("新手流程与查看牌顶", () => {
  it("没有伴契时不能普通换位", () => {
    const g = blankBattle();
    putField(g, "player", "star_fox", "active");
    expect(canSwitch(g, "player", 0, false)).toMatch(/空/);
    expect(doSwitch(g, "player", 0, false)).toBe(false);
    expect(g.player.active!.defId).toBe("star_fox");
  });

  it("牌库为空时查看牌顶不会卡死，并留下结算说明", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    g.player.library = [];
    const sprout = putHand(g, "player", "sprout");
    g.player.aether = 3;
    playCard(g, "player", sprout);
    expect(g.prompt?.kind).toBe("target");
    const next = reduce(g, { type: "CONFIRM_TARGET", instanceId: g.player.active!.instanceId });
    expect(next.winner).toBeNull();
    expect(next.phase).toBe("action");
    expect(next.prompt).toBeNull();
    expect(next.settleNote || next.log.some((e) => e.text.includes("没有可查看"))).toBeTruthy();
  });

  it("只揭示 1 张时重排窗口只有一张牌", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    const only = spawnCard(g, "stardust");
    g.player.library = [only];
    const sprout = putHand(g, "player", "sprout");
    g.player.aether = 3;
    playCard(g, "player", sprout);
    const next = reduce(g, { type: "CONFIRM_TARGET", instanceId: g.player.active!.instanceId });
    expect(next.prompt?.kind).toBe("rearrange");
    if (next.prompt?.kind === "rearrange") expect(next.prompt.cards.length).toBe(1);
    const done = reduce(next, { type: "CONFIRM_REARRANGE", order: [only] });
    expect(done.prompt).toBeNull();
    expect(done.phase).toBe("action");
    expect(done.settleNote).toMatch(/结算完成/);
  });
});

describe("交互安全：检视与使用分离", () => {
  it("没有 PLAY_CARD 时检视不会扣费或触发星屑占卜", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    const a = putHand(g, "player", "stardust");
    g.player.aether = 3;
    const snap = {
      aether: g.player.aether,
      hand: [...g.player.hand],
      discard: [...g.player.discard],
      prompt: g.prompt,
    };
    const idle = reduce(g, { type: "DISMISS_ILLEGAL" });
    expect(idle.player.aether).toBe(snap.aether);
    expect(idle.player.hand).toEqual(snap.hand);
    expect(idle.player.discard).toEqual(snap.discard);
    expect(idle.prompt).toBeNull();
    expect(idle.player.hand.includes(a)).toBe(true);
  });

  it("只有 PLAY_CARD 才会打出星屑占卜", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    g.player.library = [spawnCard(g, "sprout"), spawnCard(g, "mist_path"), spawnCard(g, "eve")];
    const a = putHand(g, "player", "stardust");
    g.player.aether = 3;
    const next = reduce(g, { type: "PLAY_CARD", instanceId: a });
    expect(next.player.aether).toBe(2);
    expect(next.player.hand.includes(a)).toBe(false);
    expect(next.prompt?.kind).toBe("rearrange");
  });

  it("使用前取消等同于不派发 PLAY_CARD，状态不变", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    const a = putHand(g, "player", "stardust");
    g.player.aether = 2;
    expect(g.player.hand).toEqual([a]);
    expect(g.player.aether).toBe(2);
    expect(g.prompt).toBeNull();
  });

  it("非法卡 canPlayCard 非空，PLAY_CARD 不改变状态", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    const a = putHand(g, "player", "stardust");
    g.player.aether = 0;
    expect(canPlayCard(g, "player", a)).toMatch(/灵息不足：需要 1，当前 0/);
    const next = reduce(g, { type: "PLAY_CARD", instanceId: a });
    expect(next.player.aether).toBe(0);
    expect(next.player.hand).toEqual([a]);
    expect(next.prompt).toBeNull();
  });

  it("需要目标的牌在确认目标前不会结算治疗", () => {
    const g = blankBattle();
    const e = putField(g, "player", "moss_sleep", "active");
    e.hp = 40;
    const sprout = putHand(g, "player", "sprout");
    g.player.aether = 3;
    const afterPlay = reduce(g, { type: "PLAY_CARD", instanceId: sprout });
    expect(afterPlay.prompt?.kind).toBe("target");
    expect(afterPlay.player.active!.hp).toBe(40);
    const settled = reduce(afterPlay, { type: "CONFIRM_TARGET", instanceId: e.instanceId });
    expect(settled.player.active!.hp).toBe(60);
  });

  it("thenTarget 一次提交只操作指定 instanceId", () => {
    const g = blankBattle();
    const e = putField(g, "player", "moss_sleep", "active");
    e.hp = 40;
    const a = putHand(g, "player", "sprout");
    const b = putHand(g, "player", "sprout");
    g.player.aether = 4;
    const next = reduce(g, { type: "PLAY_CARD", instanceId: b, thenTarget: e.instanceId });
    expect(next.player.hand.includes(a)).toBe(true);
    expect(next.player.hand.includes(b)).toBe(false);
    expect(next.player.active!.hp).toBe(60);
    expect(next.player.aether).toBe(3);
  });
});

describe("Guided Turn Flow 0.1.5", () => {
  it("行动阶段结束后正确进入战斗", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    const next = reduce(g, { type: "END_ACTION" });
    expect(next.phase).toBe("battle");
    expect(next.settleNote || "").toMatch(/战斗阶段/);
  });

  it("战斗阶段返回具体主契技能数据", () => {
    const sk = battleSkillLabel("moss_sleep");
    expect(sk?.button).toBe("发动「苔扑」");
    expect(sk?.cost).toBe(1);
    expect(sk?.text).toMatch(/20/);
  });

  it("初临与先手禁攻时不可发动", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active", true);
    putField(g, "ai", "ash_crow", "active");
    g.phase = "battle";
    g.firstTurnNoStrike = true;
    expect(canAttack(g, "player")).toMatch(/先手第一回合/);
    g.firstTurnNoStrike = false;
    expect(canAttack(g, "player")).toMatch(/初临/);
  });

  it("战技结算完成后进入收尾", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    putField(g, "ai", "ash_crow", "active");
    g.phase = "battle";
    g.firstTurnNoStrike = false;
    g.player.aether = 3;
    const next = reduce(g, { type: "ATTACK" });
    expect(next.phase).toBe("closing");
    expect(next.settleNote || "").toMatch(/苔扑|战斗已经完成/);
  });

  it("无伴契不提示可换位", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    expect(switchTeachReady(g)).toBe(false);
  });

  it("有伴契且规则允许时才教学换位", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    putField(g, "player", "star_owl", 0);
    g.player.aether = 2;
    expect(switchTeachReady(g)).toBe(true);
  });

  it("牌序说明先讲为什么", () => {
    expect(lookPurpose("星屑占卜")).toMatch(/预见/);
    expect(lookPurpose("寻星")).toMatch(/预见/);
  });
});

describe("对手行动与灵息可读性", () => {
  it("AI 战技产生可展示的 action cue", () => {
    const g = blankBattle();
    putField(g, "ai", "ash_crow", "active");
    putField(g, "player", "star_fox", "active");
    g.phase = "battle";
    g.activeSide = "ai";
    g.firstTurnNoStrike = false;
    g.ai.aether = 3;
    doAttack(g, "ai");
    expect(g.actionCue?.title).toMatch(/发动「焦羽」/);
    expect(g.actionCue?.lines.join(" ")).toMatch(/灰羽鸦/);
  });

  it("使用支援牌产生 action cue", () => {
    const g = blankBattle();
    putField(g, "player", "ash_lizard", "active");
    const c = putHand(g, "player", "ash_borrow");
    g.player.aether = 3;
    playCard(g, "player", c);
    expect(g.actionCue?.title).toMatch(/使用「灰烬借火」/);
  });

  it("卡牌离开手牌后不再在手中", () => {
    const g = blankBattle();
    putField(g, "player", "moss_sleep", "active");
    const c = putHand(g, "player", "stardust");
    g.player.aether = 3;
    const next = reduce(g, { type: "PLAY_CARD", instanceId: c });
    expect(next.player.hand.includes(c)).toBe(false);
  });

  it("灵息回合增长 1 至 7 且永久不超过 7", () => {
    const g = blankBattle();
    for (let t = 1; t <= 9; t++) {
      g.turn = t;
      g.player.library = [spawnCard(g, "sprout")];
      beginTurn(g, "player");
      expect(g.player.aetherMax).toBe(Math.min(7, t));
      expect(g.player.aether).toBe(Math.min(7, t));
    }
  });

  it("临时灵息每回合最多 +2", () => {
    const g = blankBattle();
    g.player.aether = 1;
    g.player.aetherMax = 1;
    expect(gainTempAether(g.player, 2, g)).toBe(2);
    expect(gainTempAether(g.player, 1, g)).toBe(0);
    expect(g.player.tempAetherGenerated).toBe(2);
    expect(g.player.aether).toBe(3);
  });
});

describe("开局候选详情与聚合", () => {
  it("同名候选聚合成一组并保留具体 instanceId", () => {
    const groups = groupStarterInstances(["a", "b", "c"], (id) => (id === "c" ? "star_owl" : "pale_wood"));
    expect(groups).toHaveLength(2);
    const wood = groups.find((x) => x.defId === "pale_wood")!;
    expect(wood.ids).toEqual(["a", "b"]);
    expect(wood.pick).toBe("a");
  });

  it("战技摘要来自卡牌定义", () => {
    expect(starterBrief("star_fox").skillText).toMatch(/牌库顶/);
    expect(starterBrief("pale_wood").skillText).toMatch(/治疗/);
    expect(starterBrief("star_owl").skillText).toMatch(/对方牌库顶/);
    expect(starterBrief("star_fox").keyAbility).toMatch(/检索/);
  });

  it("查看详情不改变对局：不派发 SETUP_CHOOSE 时手牌与阶段不变", () => {
    const g = startMatch(menuState(), "mist");
    const hand = [...g.player.hand];
    const idle = reduce(g, { type: "DISMISS_ILLEGAL" });
    expect(idle.prompt?.kind).toBe("setup");
    expect(idle.player.hand).toEqual(hand);
    expect(idle.player.active).toBeNull();
    expect(idle.started).toBe(true);
  });
});

describe("规则单一事实源", () => {
  it("所有战技的基础伤害来自 definition.strike", () => {
    const ids = Object.keys(CARDS).filter((id) => CARDS[id].skill);
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) {
      const sk = CARDS[id].skill!;
      expect(sk.cost).toBeGreaterThanOrEqual(0);
      expect(sk.strike?.damage).toBeGreaterThan(0);
      expect(computeStrikeDamage(sk, { enteredActiveThisTurn: false, friendlyEffectDamageThisTurn: false })).toBe(sk.strike!.damage);
    }
    expect(CARDS.star_fox.skill!.strike!.damage).toBe(20);
    expect(CARDS.star_fox.skill!.text).toMatch(/20/);
  });

  it("寻星对敌方主契造成 20 并查看牌库顶 3 张", () => {
    const g = blankBattle();
    putField(g, "player", "star_fox", "active");
    putField(g, "ai", "ash_crow", "active");
    g.phase = "battle";
    g.firstTurnNoStrike = false;
    g.player.aether = 3;
    g.player.library = [spawnCard(g, "sprout"), spawnCard(g, "stardust"), spawnCard(g, "mist_path")];
    doAttack(g, "player");
    expect(g.ai.active!.hp).toBe(40);
    expect(g.prompt?.kind).toBe("pickFromLook");
    if (g.prompt?.kind === "pickFromLook") expect(g.prompt.cards.length).toBe(3);
  });

  it("灰冠火蜥只统计烬源自伤", () => {
    const g = blankBattle();
    putField(g, "player", "ash_lizard", "active");
    const moss = putField(g, "player", "moss_sleep", 0);
    const hid = putHand(g, "player", "ash_crown");
    g.player.aether = 3;
    applyDamage(g, "player", moss, 20, { self: true });
    expect(g.player.emberSelfDamage).toBe(0);
    expect(canResonate(g, "player", hid)).toMatch(/烬源自伤/);
    applyDamage(g, "player", g.player.active!, 20, { self: true });
    expect(g.player.emberSelfDamage).toBe(20);
    expect(canResonate(g, "player", hid)).toBeNull();
  });

  it("余烬鸦皇只统计己方弃牌进入次数", () => {
    const g = blankBattle();
    putField(g, "player", "ash_crow", "active");
    putField(g, "ai", "moss_sleep", "active");
    const hid = putHand(g, "player", "ember_emperor");
    g.player.aether = 3;
    applyDamage(g, "ai", g.ai.active!, 70);
    expect(g.player.discardEntries).toBe(0);
    expect(canResonate(g, "player", hid)).toMatch(/入弃牌/);
    for (let i = 0; i < 3; i++) {
      const x = putHand(g, "player", "sprout");
      g.player.hand = g.player.hand.filter((id) => id !== x);
      g.player.discard.push(x);
      g.player.discardEntries += 1;
    }
    expect(canResonate(g, "player", hid)).toBeNull();
  });
});
