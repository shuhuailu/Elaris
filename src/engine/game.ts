import { CARDS, computeStrikeDamage, def, isBasicEidolon, starterBindError } from "../cards/definitions";
import { DECK_LISTS } from "../cards/decks";
import type {
  BoardEidolon,
  DeckId,
  GameAction,
  GameState,
  PlayerState,
  Side,
} from "../types";
import {
  allBoard,
  canStartWithHand,
  cardName,
  clone,
  emptySlotCount,
  findEidolon,
  gainTempAether,
  hasSource,
  log,
  other,
  P,
  spendAether,
  toast,
} from "./helpers";
import { mulberry32, shuffle } from "./rng";

let uid = 1;
function nid(prefix = "c"): string {
  uid += 1;
  return `${prefix}${uid}`;
}

function emptyPlayer(side: Side, deckId: DeckId): PlayerState {
  return {
    side,
    deckId,
    library: [],
    hand: [],
    discard: [],
    active: null,
    companions: [null, null, null],
    relics: [],
    aetherMax: 1,
    aether: 1,
    tempAetherGenerated: 0,
    covenant: 0,
    switchesBattle: 0,
    switchesTurn: 0,
    usedNormalSwitch: false,
    usedResonance: false,
    usedAshBorrow: false,
    totalHealing: 0,
    totalSelfDamage: 0,
    emberSelfDamage: 0,
    deckTopViewed: 0,
    discardEntries: 0,
    foxHealUsed: false,
    relicLookBonusUsed: false,
    relicAshAetherUsed: false,
    relicTideHealUsed: false,
    envFirstSwitchFreeUsed: false,
  };
}

export function menuState(): GameState {
  return {
    instances: {},
    defsReady: true,
    player: emptyPlayer("player", "mist"),
    ai: emptyPlayer("ai", "ash"),
    environment: null,
    turn: 0,
    activeSide: "player",
    phase: "setup",
    winner: null,
    winReason: null,
    prompt: null,
    promptSide: null,
    log: [],
    logId: 0,
    seed: Date.now() % 1e9,
    started: false,
    debug: false,
    toasts: [],
    toastId: 0,
    lastActionIllegal: null,
    fx: [],
    fxId: 0,
    switchFree: false,
    afterSwitch: null,
    firstTurnNoStrike: false,
    hasUsedBattle: false,
    settleNote: null,
    actionCue: null,
    actionCueId: 0,
  };
}

function pushAction(g: GameState, side: Side, title: string, lines: string[] = []) {
  g.actionCueId += 1;
  g.actionCue = { id: g.actionCueId, side, title, lines };
}

function pushFx(g: GameState, fx: Omit<import("../types").CombatFx, "id">) {
  g.fxId += 1;
  g.fx = [...g.fx.slice(-8), { ...fx, id: g.fxId }];
}

function makeDeck(g: GameState, list: string[], rng: () => number): string[] {
  const ids: string[] = [];
  for (const defId of list) {
    const instanceId = nid("i");
    g.instances[instanceId] = { instanceId, defId };
    ids.push(instanceId);
  }
  return shuffle(ids, rng);
}

function drawOne(g: GameState, s: Side): string | null {
  const p = P(g, s);
  if (p.library.length === 0) {
    g.winner = other(s);
    g.winReason = `${s === "player" ? "你" : "对方"}无法抽牌——牌库已空。`;
    log(g, g.winReason);
    return null;
  }
  const id = p.library.shift()!;
  p.hand.push(id);
  return id;
}

function discardCard(g: GameState, s: Side, instanceId: string) {
  const p = P(g, s);
  p.discard.push(instanceId);
  p.discardEntries += 1;
}

function defOf(g: GameState, instanceId: string) {
  return def(g.instances[instanceId].defId);
}

function openingHand(g: GameState, s: Side, rng: () => number) {
  const p = P(g, s);
  let tries = 0;
  while (tries < 40) {
    tries += 1;
    p.library = shuffle([...p.library, ...p.hand], rng);
    p.hand = [];
    for (let i = 0; i < 5; i++) drawOne(g, s);
    const defs = p.hand.map((id) => g.instances[id].defId);
    if (canStartWithHand(defs)) break;
  }
}

export function startMatch(g: GameState, playerDeck: DeckId): GameState {
  const next = menuState();
  next.seed = g.seed || Date.now() % 1e9;
  const rng = mulberry32(next.seed);
  const aiDeck: DeckId = playerDeck === "mist" ? "ash" : "mist";
  next.player = emptyPlayer("player", playerDeck);
  next.ai = emptyPlayer("ai", aiDeck);
  next.player.library = makeDeck(next, DECK_LISTS[playerDeck], rng);
  next.ai.library = makeDeck(next, DECK_LISTS[aiDeck], rng);
  openingHand(next, "player", rng);
  openingHand(next, "ai", rng);
  next.started = true;
  next.phase = "setup";
  next.prompt = { kind: "setup" };
  next.promptSide = "player";
  next.turn = 1;
  log(next, `对决开始。你持有 ${playerDeck === "mist" ? "雾林引星" : "灰烬月潮"}。`);
  return next;
}

function makeEidolon(g: GameState, instanceId: string, initial: boolean): BoardEidolon {
  const d = defOf(g, instanceId);
  return {
    instanceId,
    defId: d.id,
    hp: d.hp ?? 1,
    maxHp: d.hp ?? 1,
    initialArrival: initial,
    resonanceStack: [],
    enteredActiveThisTurn: true,
    timesEnteredActiveFromCompanion: 0,
    damageTakenThisTurn: 0,
    selfDamageThisTurn: 0,
    friendlyEffectDamageThisTurn: false,
    verdantFirstHitReducedThisTurn: false,
    attackMod: 0,
    nextAttackReduction: 0,
  };
}

function placeOnBoard(p: PlayerState, e: BoardEidolon, asActive: boolean): boolean {
  if (asActive && !p.active) {
    p.active = e;
    return true;
  }
  const i = p.companions.findIndex((c) => !c);
  if (i >= 0) {
    p.companions[i] = e;
    e.enteredActiveThisTurn = false;
    return true;
  }
  return false;
}

function finishSetup(g: GameState, activeId: string, companionId: string | null) {
  const p = g.player;
  if (!p.hand.includes(activeId)) {
    toast(g, "请选择手牌中的一张幻兽。");
    return;
  }
  const err = starterBindError(g.instances[activeId].defId);
  if (err) {
    toast(g, err);
    return;
  }
  if (companionId) {
    if (!p.hand.includes(companionId) || companionId === activeId) {
      toast(g, "伴契选择无效。");
      return;
    }
    const cErr = starterBindError(g.instances[companionId].defId);
    if (cErr) {
      toast(g, cErr);
      return;
    }
  }
  p.hand = p.hand.filter((id) => id !== activeId && id !== companionId);
  p.active = makeEidolon(g, activeId, false);
  p.active.enteredActiveThisTurn = false;
  if (companionId) {
    const c = makeEidolon(g, companionId, false);
    c.enteredActiveThisTurn = false;
    p.companions[0] = c;
  }
  log(g, `你将「${cardName(p.active.defId)}」设为主契。`);

  // AI setup
  const a = g.ai;
  const basics = a.hand.filter((id) => isBasicEidolon(g.instances[id].defId));
  const pick = basics[0];
  const rest = basics.filter((id) => id !== pick);
  a.hand = a.hand.filter((id) => id !== pick && id !== rest[0]);
  a.active = makeEidolon(g, pick, false);
  a.active.enteredActiveThisTurn = false;
  if (rest[0]) {
    const c = makeEidolon(g, rest[0], false);
    c.enteredActiveThisTurn = false;
    a.companions[0] = c;
  }
  log(g, `对方将「${cardName(a.active.defId)}」设为主契。`);
  g.prompt = null;
  g.promptSide = null;
  g.firstTurnNoStrike = true;
  beginTurn(g, "player");
}

function beginTurn(g: GameState, s: Side) {
  if (g.winner) return;
  g.activeSide = s;
  g.phase = "awaken";
  const p = P(g, s);
  p.aetherMax = Math.min(7, Math.max(1, g.turn));
  p.aether = p.aetherMax;
  p.tempAetherGenerated = 0;
  p.usedNormalSwitch = false;
  p.usedResonance = false;
  p.usedAshBorrow = false;
  p.switchesTurn = 0;
  p.foxHealUsed = false;
  p.relicLookBonusUsed = false;
  p.relicAshAetherUsed = false;
  p.relicTideHealUsed = false;
  p.envFirstSwitchFreeUsed = false;
  g.hasUsedBattle = false;
  for (const e of allBoard(p)) {
    e.initialArrival = false;
    e.enteredActiveThisTurn = false;
    e.damageTakenThisTurn = 0;
    e.selfDamageThisTurn = 0;
    e.friendlyEffectDamageThisTurn = false;
    e.verdantFirstHitReducedThisTurn = false;
    e.attackMod = 0;
  }
  log(g, `—— 苏醒 · ${s === "player" ? "你的" : "对方"}第 ${g.turn} 回合 · 灵息 ${p.aether}/${p.aetherMax} ——`);
  g.phase = "draw";
  const d = drawOne(g, s);
  if (d) log(g, `${s === "player" ? "你" : "对方"}抽牌 1 张。`);
  if (g.winner) return;
  g.phase = "action";
  if (s === "player") settle(g, `本回合灵息：${p.aether} / ${p.aetherMax}`);
}

function lookCount(g: GameState, s: Side, base: number): number {
  const p = P(g, s);
  let n = base;
  if (p.relics.some((r) => g.instances[r.instanceId].defId === "old_scope") && !p.relicLookBonusUsed) {
    n += 1;
    p.relicLookBonusUsed = true;
    log(g, "旧天文镜额外揭示 1 张。");
  }
  return n;
}

function noteLook(g: GameState, s: Side, n: number) {
  const p = P(g, s);
  p.deckTopViewed += n;
  log(g, `观视牌顶 ${n} 张。累计观视 ${p.deckTopViewed} 张。`);
  if (p.deckTopViewed >= 6) {
    log(g, "微星虫已满足共鸣条件（观视满 6 张）。");
  }
}

function triggerSearchHeal(g: GameState, s: Side) {
  const p = P(g, s);
  const fox = allBoard(p).find((e) => e.defId === "star_fox");
  if (fox && !p.foxHealUsed && p.active) {
    p.foxHealUsed = true;
    healEidolon(g, s, p.active, 10);
    log(g, "星灯狐 · 微光引路：主契回复 10。");
  }
}

function healAmount(g: GameState, raw: number): number {
  if (g.environment && g.instances[g.environment.instanceId].defId === "ash_rain") {
    return Math.max(0, raw - 10);
  }
  return raw;
}

function healEidolon(g: GameState, s: Side, e: BoardEidolon, raw: number) {
  const amt = healAmount(g, raw);
  if (amt <= 0) {
    log(g, `治疗 ${raw} 被减至 0。`);
    return;
  }
  const before = e.hp;
  e.hp = Math.min(e.maxHp, e.hp + amt);
  const gained = e.hp - before;
  if (gained > 0) {
    P(g, s).totalHealing += gained;
    log(g, `「${cardName(e.defId)}」回复 ${gained}（${e.hp}/${e.maxHp}）。累计治疗 ${P(g, s).totalHealing}。`);
    pushFx(g, { kind: "heal", text: `+${gained}`, side: s, at: P(g, s).active?.instanceId === e.instanceId ? "active" : "board" });
    if (P(g, s).totalHealing >= 30) log(g, "苔眠团兽已满足共鸣条件。");
  }
}

function applyDamage(
  g: GameState,
  targetSide: Side,
  e: BoardEidolon,
  raw: number,
  opts: { self?: boolean; friendly?: boolean; direct?: boolean } = {}
) {
  let dmg = raw;
  if (
    !opts.direct &&
    g.environment &&
    g.instances[g.environment.instanceId].defId === "mist_night" &&
    hasSource(e.defId, "verdant") &&
    !e.verdantFirstHitReducedThisTurn
  ) {
    e.verdantFirstHitReducedThisTurn = true;
    dmg = Math.max(0, dmg - 10);
    log(g, `雾林深夜使「${cardName(e.defId)}」首次受伤减少 10。`);
  }
  if (dmg <= 0) {
    log(g, `「${cardName(e.defId)}」未受到伤害。`);
    return;
  }
  e.hp -= dmg;
  e.damageTakenThisTurn += dmg;
  pushFx(g, { kind: "dmg", text: `−${dmg}`, side: targetSide, at: P(g, targetSide).active?.instanceId === e.instanceId ? "active" : "board" });
  if (opts.self) {
    e.selfDamageThisTurn += dmg;
    P(g, targetSide).totalSelfDamage += dmg;
    if (hasSource(e.defId, "ember")) P(g, targetSide).emberSelfDamage += dmg;
    log(g, `「${cardName(e.defId)}」承受 ${dmg} 点自伤。`);
    const p = P(g, targetSide);
    if (!p.relicAshAetherUsed && p.relics.some((r) => g.instances[r.instanceId].defId === "ash_furnace")) {
      p.relicAshAetherUsed = true;
      gainTempAether(p, 1, g);
      log(g, "灰烬炉给予 1 点临时灵息。");
    }
  } else {
    log(g, `「${cardName(e.defId)}」受到 ${dmg} 点伤害（${Math.max(0, e.hp)}/${e.maxHp}）。`);
  }
  if (opts.friendly) e.friendlyEffectDamageThisTurn = true;
  if (e.hp <= 0) defeat(g, targetSide, e);
}

function defeat(g: GameState, side: Side, e: BoardEidolon) {
  const p = P(g, side);
  log(g, `「${cardName(e.defId)}」溃散。`);
  pushFx(g, { kind: "defeat", text: "溃散", side, at: "active" });
  const pile = [e.instanceId, ...e.resonanceStack];
  for (const id of pile) discardCard(g, side, id);
  const wasActive = p.active?.instanceId === e.instanceId;
  if (wasActive) p.active = null;
  else {
    const i = p.companions.findIndex((c) => c?.instanceId === e.instanceId);
    if (i >= 0) p.companions[i] = null;
  }
  if (wasActive) {
    const opp = P(g, other(side));
    opp.covenant += 1;
    log(g, `${other(side) === "player" ? "你" : "对方"}获得 1 契痕（${opp.covenant}/3）。`);
    if (opp.covenant >= 3) {
      g.winner = other(side);
      g.winReason = "三枚契痕已经铭刻。";
      log(g, g.winReason);
      return;
    }
    if (p.companions.some(Boolean)) {
      g.prompt = { kind: "choosePromote" };
      g.promptSide = side;
    } else {
      const basics = p.hand.filter((id) => {
        const d = g.instances[id];
        return CARDS[d.defId].type === "eidolon" && !CARDS[d.defId].resonanceFrom;
      });
      if (basics.length) {
        g.prompt = { kind: "target", reason: "部署一只新的主契幻兽", filter: "friendlyEidolon", then: { type: "deploySlot" } };
        // reuse: we'll handle via special
        g.prompt = { kind: "choosePromote" };
        g.promptSide = side;
        // mark no companions - deploy from hand handled in promote
      } else {
        g.winner = other(side);
        g.winReason = `${side === "player" ? "你" : "对方"}已无可用幻兽。`;
        log(g, g.winReason);
      }
    }
  }
}

function doSwitch(g: GameState, s: Side, companionIndex: number, free: boolean): boolean {
  const illegal = canSwitch(g, s, companionIndex, free);
  if (illegal) {
    toast(g, illegal);
    return false;
  }
  const p = P(g, s);
  const c = p.companions[companionIndex];
  if (!c) {
    toast(g, "该伴契位为空。");
    return false;
  }
  if (!p.active) {
    p.active = c;
    p.companions[companionIndex] = null;
    c.enteredActiveThisTurn = true;
    c.timesEnteredActiveFromCompanion += 1;
    afterEnterActive(g, s, c);
    return true;
  }
  if (!free) {
    if (p.usedNormalSwitch) {
      toast(g, "本回合已进行过普通换位。");
      return false;
    }
    let cost = 1;
    if (g.environment && g.instances[g.environment.instanceId].defId === "high_tide" && !p.envFirstSwitchFreeUsed) {
      cost = 0;
    }
    if (cost > 0) {
      const err = spendAether(p, cost);
      if (err) {
        toast(g, err);
        return false;
      }
    }
    p.usedNormalSwitch = true;
    p.envFirstSwitchFreeUsed = true;
  }
  const old = p.active;
  p.active = c;
  p.companions[companionIndex] = old;
  old.enteredActiveThisTurn = false;
  c.enteredActiveThisTurn = true;
  c.timesEnteredActiveFromCompanion += 1;
  p.switchesBattle += 1;
  p.switchesTurn += 1;
  log(g, `${s === "player" ? "你" : "对方"}换位：「${cardName(c.defId)}」成为主契。换位 ${p.switchesBattle} 次。`);
  pushAction(g, s, `${s === "player" ? "你" : "对手"}进行了换位`, [`「${cardName(c.defId)}」成为主契`]);
  afterEnterActive(g, s, c);
  if (p.switchesBattle >= 3) log(g, "潮铃水母已满足共鸣条件。");
  if (c.timesEnteredActiveFromCompanion >= 2) log(g, "此月潮猫可能已满足共鸣条件。");
  return true;
}

function afterEnterActive(g: GameState, s: Side, e: BoardEidolon) {
  const p = P(g, s);
  if (p.relics.some((r) => g.instances[r.instanceId].defId === "moon_mirror") && !p.relicTideHealUsed && p.switchesTurn === 1) {
    p.relicTideHealUsed = true;
    healEidolon(g, s, e, 10);
    log(g, "月潮镜安抚新的主契。");
  }
  if (g.environment && g.instances[g.environment.instanceId].defId === "high_tide" && hasSource(e.defId, "tide")) {
    e.attackMod += 10;
    log(g, `「${cardName(e.defId)}」因月潮涨时获得 +10。`);
  }
}

function topCards(g: GameState, s: Side, n: number): string[] {
  return P(g, s).library.slice(0, n);
}

function rearrangeTop(g: GameState, s: Side, order: string[]) {
  const p = P(g, s);
  const set = new Set(order);
  const rest = p.library.filter((id) => !set.has(id));
  p.library = [...order, ...rest];
}

export function canPlayCard(g: GameState, s: Side, instanceId: string): string | null {
  if (g.winner) return "对局已结束。";
  if (g.phase !== "action" || g.activeSide !== s) return "现在不能打出此牌。";
  if (g.prompt) return "请先完成当前选择。";
  const p = P(g, s);
  if (!p.hand.includes(instanceId)) return "此牌不在手中。";
  const d = defOf(g, instanceId);
  if (d.type === "eidolon" && d.resonanceFrom) return "这是一张共鸣幻兽，需要先拥有对应基础形态，并在行动阶段点选共鸣。";
  if (p.aether < d.cost) return `灵息不足：需要 ${d.cost}，当前 ${p.aether}。`;
  if (d.type === "eidolon") {
    if (allBoard(p).length >= 4) return "契位已满（最多 4）。";
    if (p.active && !p.companions.some((c) => !c)) return "没有空的伴契位。";
  }
  if (d.id === "ash_borrow") {
    if (p.usedAshBorrow) return "灰烬借火每回合只能使用一次。";
    if (!allBoard(p).some((e) => hasSource(e.defId, "ember"))) return "场上没有烬源幻兽。";
  }
  if (d.id === "mist_path" || d.id === "tide_return" || d.id === "mira") {
    if (!p.active || !p.companions.some(Boolean)) return "没有可换位的伴契幻兽。";
  }
  if (d.id === "scar_burst") {
    if (!allBoard(p).some((e) => e.selfDamageThisTurn > 0)) return "本回合尚无友方自伤。";
    if (!P(g, other(s)).active) return "对方没有主契幻兽。";
  }
  if (d.id === "warm_reclaim") {
    const opts = p.discard.filter((id) => {
      const dd = defOf(g, id);
      return dd.type === "eidolon" && dd.sources.includes("ember");
    });
    if (!opts.length) return "弃牌中没有烬源幻兽。";
  }
  if (d.id === "ash_scheme") {
    if (p.hand.length < 2) return "没有可弃的其他手牌。";
  }
  if (d.id === "sprout" || d.id === "borrowed_dawn" || d.id === "alo") {
    if (!allBoard(p).length) return "场上没有可指定的幻兽。";
  }
  return null;
}

export function canSwitch(g: GameState, s: Side, companionIndex: number, free: boolean): string | null {
  if (g.winner) return "对局已结束。";
  const p = P(g, s);
  if (!p.companions[companionIndex]) return "该伴契位为空。";
  if (!p.active && free) return null;
  if (!free) {
    if (g.phase !== "action" || g.activeSide !== s) return "现在不能普通换位。";
    if (p.usedNormalSwitch) return "本回合已进行过普通换位。";
    let cost = 1;
    if (g.environment && g.instances[g.environment.instanceId].defId === "high_tide" && !p.envFirstSwitchFreeUsed) {
      cost = 0;
    }
    if (p.aether < cost) return "灵息不足。";
  }
  return null;
}

function playCard(g: GameState, s: Side, instanceId: string) {
  const illegal = canPlayCard(g, s, instanceId);
  if (illegal) {
    toast(g, illegal);
    return;
  }
  const p = P(g, s);
  const d = defOf(g, instanceId);
  spendAether(p, d.cost);
  p.hand = p.hand.filter((id) => id !== instanceId);

  if (d.type === "eidolon") {
    const e = makeEidolon(g, instanceId, true);
    if (!p.active) p.active = e;
    else {
      const i = p.companions.findIndex((c) => !c);
      p.companions[i] = e;
      e.enteredActiveThisTurn = false;
    }
    const asActive = p.active?.instanceId === instanceId;
    log(g, `「${cardName(d.id)}」就位。初临。`);
    const who = s === "player" ? "你" : "对手";
    pushAction(g, s, `${who}部署「${d.name}」`, [asActive ? "成为主契" : "成为伴契"]);
    settle(g, asActive ? `「${d.name}」成为你的主契幻兽。你仍处于行动阶段。` : `「${d.name}」已成为伴契。你仍处于行动阶段。`);
    return;
  }

  if (d.type === "relic") {
    p.relics.push({ instanceId, defId: d.id, owner: s });
    log(g, `安置遗物「${d.name}」。`);
    pushAction(g, s, `${s === "player" ? "你" : "对手"}安置「${d.name}」`, ["遗物留在场上"]);
    settle(g, `「${d.name}」已安置。你仍处于行动阶段。`);
    return;
  }

  if (d.type === "environment") {
    if (g.environment) {
      const prev = defOf(g, g.environment.instanceId);
      const prevOwner = g.environment.owner;
      log(g, `「${prev.name}」褪去。「${d.name}」覆上战场。`);
      discardCard(g, prevOwner, g.environment.instanceId);
    }
    g.environment = { instanceId, defId: d.id, owner: s };
    log(g, `环境：「${d.name}」。`);
    settle(g, `环境已更换。你仍处于行动阶段。`);
    return;
  }

  resolveSupport(g, s, d.id, instanceId);
}

function resolveSupport(g: GameState, s: Side, defId: string, instanceId: string) {
  const p = P(g, s);
  discardCard(g, s, instanceId);
  log(g, `施放「${cardName(defId)}」。`);
  pushAction(g, s, `${s === "player" ? "你" : "对手"}使用「${cardName(defId)}」`, []);

  if (defId === "mist_path") {
    g.prompt = { kind: "chooseSwitch", free: true, after: "mist_path" };
    g.promptSide = s;
    g.switchFree = true;
    g.afterSwitch = "mist_path";
    return;
  }
  if (defId === "sprout") {
    g.prompt = { kind: "target", reason: "芽生术：选择一只友方幻兽，回复 20 点生命。", filter: "friendlyAny", then: { type: "heal", amount: 20, verdantLook: true } };
    g.promptSide = s;
    return;
  }
  if (defId === "stardust") {
    beginLook(g, s, 3, "星屑占卜");
    return;
  }
  if (defId === "borrowed_dawn") {
    g.prompt = { kind: "target", reason: "借来的晨光：选择一只友方幻兽，回复 30 点生命。", filter: "friendlyAny", then: { type: "borrowedDawn" } };
    g.promptSide = s;
    return;
  }
  if (defId === "chart_align") {
    const n = lookCount(g, s, 4);
    const cards = topCards(g, s, n);
    noteLook(g, s, cards.length);
    g.prompt = { kind: "pickFromLook", cards, title: "星图校准：查看牌库顶若干张。选择 1 张幻兽或遗物加入手牌，其余按原相对顺序回到牌顶。", filter: "eidolonOrRelic", then: { type: "none" }, allowSkip: true };
    g.promptSide = s;
    (g as any)._chartRest = true;
    return;
  }
  if (defId === "eve") {
    const found = p.library.filter((id) => {
      const dd = defOf(g, id);
      return dd.type === "eidolon" && dd.sources.includes("verdant");
    });
    if (!found.length) {
      log(g, "牌库中已无森源幻兽。");
      return;
    }
    g.prompt = { kind: "pickFromLook", cards: found, title: "守林人·伊芙：从牌库选择 1 张森源幻兽加入手牌，然后洗牌。", filter: "any", then: { type: "none" }, allowSkip: false };
    g.promptSide = s;
    (g as any)._eveSearch = true;
    return;
  }
  if (defId === "norn") {
    const n = lookCount(g, s, 5);
    const cards = topCards(g, s, n);
    noteLook(g, s, cards.length);
    g.prompt = { kind: "pickFromLook", cards, title: "观测师·诺恩：查看牌库顶若干张。选择 1 张星源牌加入手牌，其余将置于牌底。", filter: "astral", then: { type: "none" }, allowSkip: true };
    g.promptSide = s;
    (g as any)._nornRest = true;
    return;
  }
  if (defId === "ash_borrow") {
    p.usedAshBorrow = true;
    g.prompt = { kind: "target", reason: "灰烬借火：选择一只友方烬源幻兽，承受 10 点并获得 1 点临时灵息。", filter: "friendlyEmber", then: { type: "ashBorrow" } };
    g.promptSide = s;
    return;
  }
  if (defId === "tide_return") {
    g.prompt = { kind: "chooseSwitch", free: true, after: "tide_return" };
    g.promptSide = s;
    g.switchFree = true;
    g.afterSwitch = "tide_return";
    return;
  }
  if (defId === "scar_burst") {
    const ok = allBoard(p).some((e) => e.selfDamageThisTurn > 0);
    if (!ok) {
      toast(g, "本回合尚无友方自伤。");
      // refund conceptually already spent - restore card? already discarded. Validate before play next time.
      return;
    }
    const t = P(g, other(s)).active;
    if (t) applyDamage(g, other(s), t, 20, { direct: true });
    return;
  }
  if (defId === "warm_reclaim") {
    const opts = p.discard.filter((id) => {
      const dd = defOf(g, id);
      return dd.type === "eidolon" && dd.sources.includes("ember");
    });
    if (!opts.length) {
      log(g, "弃牌中没有烬源幻兽。");
      return;
    }
    g.prompt = { kind: "pickFromLook", cards: opts, title: "余温回收：选择弃牌中一张烬源幻兽收回手牌。随后主契将受到 10 点伤害。", filter: "any", then: { type: "recycle" } };
    g.promptSide = s;
    return;
  }
  if (defId === "ash_scheme") {
    g.prompt = { kind: "pickHand", title: "选择一张手牌弃置", then: "scheme" };
    g.promptSide = s;
    return;
  }
  if (defId === "alo") {
    g.prompt = { kind: "target", reason: "烬匠·阿洛：选择一只友方幻兽承受 10 点，然后检索烬源牌。", filter: "friendlyAny", then: { type: "alo" } };
    g.promptSide = s;
    return;
  }
  if (defId === "mira") {
    g.prompt = { kind: "chooseSwitch", free: true, after: "mira" };
    g.promptSide = s;
    g.switchFree = true;
    g.afterSwitch = "mira";
    return;
  }
}

function settle(g: GameState, note: string) {
  g.settleNote = note;
  log(g, note);
}

function beginLook(g: GameState, s: Side, base: number, title: string) {
  const n = lookCount(g, s, base);
  const cards = topCards(g, s, n);
  noteLook(g, s, cards.length);
  if (cards.length === 0) {
    settle(g, `${title}结算完成。没有可查看的牌。你仍处于当前阶段，可以继续行动。`);
    return;
  }
  g.prompt = { kind: "rearrange", cards, title };
  g.promptSide = s;
}

function canResonate(g: GameState, s: Side, handId: string): string | null {
  const p = P(g, s);
  if (g.phase !== "action" || g.activeSide !== s) return "现在不是行动阶段，无法共鸣。";
  if (p.usedResonance) return "每方每回合最多共鸣一次。";
  if (!p.hand.includes(handId)) return "此牌不在手中。";
  const d = defOf(g, handId);
  if (!d.resonanceFrom) return "这不是共鸣印记。";
  const base = allBoard(p).find((e) => e.defId === d.resonanceFrom);
  if (!base) return `场上没有 ${cardName(d.resonanceFrom)}。`;
  if (p.aether < (d.resonanceCost ?? 0)) return "灵息不足。";
  if (d.resonanceFrom === "moss_sleep" && p.totalHealing < 30)
    return `共鸣条件尚未满足：累计治疗 ${p.totalHealing} / 30`;
  if (d.resonanceFrom === "microstar" && p.deckTopViewed < 6)
    return `共鸣条件尚未满足：观视牌顶 ${p.deckTopViewed} / 6`;
  if (d.resonanceFrom === "ash_lizard" && p.emberSelfDamage < 20)
    return `共鸣条件尚未满足：烬源自伤 ${p.emberSelfDamage} / 20`;
  if (d.resonanceFrom === "ash_crow" && p.discardEntries < 3)
    return `共鸣条件尚未满足：入弃牌 ${p.discardEntries} / 3`;
  if (d.resonanceFrom === "tide_jelly" && p.switchesBattle < 3)
    return `共鸣条件尚未满足：换位 ${p.switchesBattle} / 3`;
  if (d.resonanceFrom === "moon_cat") {
    if (base.timesEnteredActiveFromCompanion < 2)
      return `共鸣条件尚未满足：此月潮猫进入主契位 ${base.timesEnteredActiveFromCompanion} / 2`;
  }
  return null;
}

function doResonate(g: GameState, s: Side, handId: string) {
  const err = canResonate(g, s, handId);
  if (err) {
    toast(g, err);
    return;
  }
  const p = P(g, s);
  const d = defOf(g, handId);
  spendAether(p, d.resonanceCost ?? 0);
  const base = allBoard(p).find((e) => e.defId === d.resonanceFrom)!;
  const damageCounters = base.maxHp - base.hp;
  const stack = [...base.resonanceStack, base.instanceId];
  const keep = {
    initialArrival: base.initialArrival,
    timesEnteredActiveFromCompanion: base.timesEnteredActiveFromCompanion,
    enteredActiveThisTurn: base.enteredActiveThisTurn,
    damageTakenThisTurn: base.damageTakenThisTurn,
    selfDamageThisTurn: base.selfDamageThisTurn,
    friendlyEffectDamageThisTurn: base.friendlyEffectDamageThisTurn,
    verdantFirstHitReducedThisTurn: base.verdantFirstHitReducedThisTurn,
    attackMod: base.attackMod,
    nextAttackReduction: base.nextAttackReduction,
  };
  const neu = makeEidolon(g, handId, false);
  neu.hp = neu.maxHp - damageCounters;
  neu.resonanceStack = stack;
  Object.assign(neu, keep);
  pushFx(g, { kind: "resonate", text: "共鸣", side: s, at: "active" });
  if (p.active?.instanceId === base.instanceId) p.active = neu;
  else {
    const i = p.companions.findIndex((c) => c?.instanceId === base.instanceId);
    if (i >= 0) p.companions[i] = neu;
  }
  p.hand = p.hand.filter((id) => id !== handId);
  p.usedResonance = true;
  log(g, `「${cardName(base.defId)}」共鸣为「${d.name}」。`);
  pushAction(g, s, `${s === "player" ? "你" : "对手"}发动共鸣`, [`${cardName(base.defId)} → ${d.name}`]);
  if (neu.hp <= 0) {
    defeat(g, s, neu);
    return;
  }
  if (d.id === "moss_crown") healEidolon(g, s, neu, 20);
}

function canAttack(g: GameState, s: Side): string | null {
  if (g.phase !== "battle" || g.activeSide !== s) return "现在不是战斗阶段。";
  if (g.firstTurnNoStrike && s === "player") return "先手第一回合不可发动战技。";
  const p = P(g, s);
  if (!p.active) return "没有主契幻兽。";
  if (p.active.initialArrival) return "初临：这只幻兽本回合不能发动攻击型战技。";
  const sk = def(p.active.defId).skill;
  if (!sk) return "没有战技。";
  if (p.aether < sk.cost) return `灵息不足：需要 ${sk.cost}，当前 ${p.aether}。`;
  if (!P(g, other(s)).active) return "对方没有主契幻兽。";
  return null;
}

function doAttack(g: GameState, s: Side) {
  const err = canAttack(g, s);
  if (err) {
    toast(g, err);
    return;
  }
  const p = P(g, s);
  const e = p.active!;
  const d = def(e.defId);
  const sk = d.skill!;
  spendAether(p, sk.cost);
  g.hasUsedBattle = true;
  let dmg = computeStrikeDamage(sk, e);
  dmg += e.attackMod;
  e.attackMod = 0;
  const tgt = P(g, other(s)).active!;
  const red = tgt.nextAttackReduction;
  if (red) {
    dmg = Math.max(0, dmg - red);
    tgt.nextAttackReduction = 0;
    log(g, `静潮使即将到来的一击减少 ${red}。`);
  }
  log(g, `${d.name} 发动「${sk.name}」，造成伤害。`);
  pushAction(g, s, `${s === "player" ? "你" : "对手"}发动「${sk.name}」`, [`${d.name} → ${cardName(tgt.defId)}`, `造成 ${dmg} 点伤害`]);
  applyDamage(g, other(s), tgt, dmg);
  if (g.winner || g.prompt) {
    // still resolve after-effects if attacker lives
  }
  if (!p.active || p.active.instanceId !== e.instanceId) {
    g.phase = "nightfall";
    endTurnCleanup(g, s);
    return;
  }

  for (const step of sk.follow ?? []) {
    if (step.kind === "selfDamage") applyDamage(g, s, e, step.amount, { self: true });
    if (step.kind === "healTarget") {
      g.prompt = { kind: "target", reason: "选择一只友方幻兽，回复 10 点生命。", filter: "friendlyAny", then: { type: "skillHeal10" } };
      g.promptSide = s;
      return;
    }
    if (step.kind === "healAll") {
      for (const x of allBoard(p)) healEidolon(g, s, x, step.amount);
    }
    if (step.kind === "look") {
      beginLook(g, s, step.count, step.title);
      return;
    }
    if (step.kind === "foxLook") {
      const n = lookCount(g, s, 3);
      const cards = topCards(g, s, n);
      noteLook(g, s, cards.length);
      g.prompt = {
        kind: "pickFromLook",
        cards,
        title: "寻星：查看牌库顶最多 3 张。选择 1 张森源或星源牌置于牌顶，它会成为你下一次抽牌优先抽到的牌。",
        filter: "astralVerdant",
        then: { type: "none" },
        allowSkip: true,
      };
      g.promptSide = s;
      (g as any)._foxRest = true;
      return;
    }
    if (step.kind === "opponentTop") {
      const top = P(g, other(s)).library[0];
      if (top) {
        g.prompt = { kind: "opponentTop", cardId: top };
        g.promptSide = s;
        return;
      }
    }
    if (step.kind === "optionalDiscard") {
      if (p.hand.length) {
        g.prompt = { kind: "optionalDiscard", forSkill: true, cards: [...p.hand] };
        g.promptSide = s;
      }
      return;
    }
    if (step.kind === "optionalDiscardEmber") {
      const embers = p.discard.filter((id) => defOf(g, id).sources.includes("ember"));
      if (embers.length) {
        g.prompt = { kind: "optionalDiscardEmber", cards: embers };
        g.promptSide = s;
      }
      return;
    }
    if (step.kind === "optionalSelfDmg") {
      g.prompt = { kind: "optionalSelfDmg" };
      g.promptSide = s;
      return;
    }
    if (step.kind === "optionalFreeSwitch") {
      if (p.companions.some(Boolean)) {
        g.prompt = { kind: "chooseSwitch", free: true, optional: true };
        g.promptSide = s;
        g.switchFree = true;
      }
      return;
    }
    if (step.kind === "nextAttackReduction" && P(g, other(s)).active) {
      P(g, other(s)).active!.nextAttackReduction = step.amount;
      log(g, "静潮压制了对方主契。");
    }
    if (step.kind === "drawIfEnteredActive" && e.enteredActiveThisTurn) {
      drawOne(g, s);
      log(g, "镜影抽了 1 张牌。");
    }
  }
  if (!g.prompt && !g.winner) {
    if (s === "player") {
      g.phase = "closing";
      const foe = P(g, other(s)).active;
      settle(g, `「${d.name}」发动「${sk.name}」。${foe ? `对「${cardName(foe.defId)}」造成伤害。` : ""}战斗已经完成。`);
    } else nightfall(g, s);
  }
}

function maybeClose(g: GameState) {
  if (g.hasUsedBattle && !g.prompt && !g.winner && g.activeSide === "player") g.phase = "closing";
}

function nightfall(g: GameState, s: Side) {
  g.phase = "nightfall";
  const p = P(g, s);
  if (p.relics.some((r) => g.instances[r.instanceId].defId === "moss_basin") && p.active && hasSource(p.active.defId, "verdant")) {
    healEidolon(g, s, p.active, 10);
    log(g, "苔石盆在夜幕中复苏。");
  }
  endTurnCleanup(g, s);
}

function endTurnCleanup(g: GameState, s: Side) {
  if (g.winner) return;
  if (s === "player") {
    g.firstTurnNoStrike = false;
    g.activeSide = "ai";
    beginTurn(g, "ai");
  } else {
    g.turn += 1;
    g.activeSide = "player";
    beginTurn(g, "player");
  }
}

function handlePromote(g: GameState, s: Side, idx: number) {
  const p = P(g, s);
  if (p.companions[idx]) {
    p.active = p.companions[idx];
    p.companions[idx] = null;
    p.active!.enteredActiveThisTurn = true;
    p.active!.timesEnteredActiveFromCompanion += 1;
    afterEnterActive(g, s, p.active!);
    log(g, `「${cardName(p.active!.defId)}」进入主契位。`);
    g.prompt = null;
    return;
  }
}

function deployFromHandActive(g: GameState, s: Side, instanceId: string) {
  const p = P(g, s);
  if (!p.hand.includes(instanceId)) return;
  const d = defOf(g, instanceId);
  if (d.type !== "eidolon" || d.resonanceFrom) {
    toast(g, "请选择一只基础幻兽。");
    return;
  }
  p.hand = p.hand.filter((id) => id !== instanceId);
  p.active = makeEidolon(g, instanceId, true);
  log(g, `「${d.name}」进入空置的主契位。`);
  g.prompt = null;
}

export function reduce(state: GameState, action: GameAction): GameState {
  const g = clone(state);
  g.lastActionIllegal = null;
  if (action.type === "TOGGLE_DEBUG") {
    g.debug = !g.debug;
    return g;
  }
  if (action.type === "TO_MENU") return menuState();
  if (action.type === "RESTART") {
    const deck = g.player.deckId;
    return startMatch(menuState(), deck);
  }
  if (action.type === "SELECT_DECK") {
    g.player.deckId = action.deck;
    return g;
  }
  if (action.type === "BEGIN") return startMatch(g, g.player.deckId);
  if (action.type === "DISMISS_ILLEGAL") {
    g.lastActionIllegal = null;
    return g;
  }

  if (action.type === "DEBUG") {
    const p = g.player;
    if (action.cmd === "draw") drawOne(g, "player");
    if (action.cmd === "aether") {
      p.aether = Math.min(9, p.aether + 1);
    }
    if (action.cmd === "turn") nightfall(g, g.activeSide);
    if (action.cmd === "hand" && action.payload) {
      const defId = action.payload;
      if (CARDS[defId]) {
        const instanceId = nid("dbg");
        g.instances[instanceId] = { instanceId, defId };
        p.hand.push(instanceId);
      }
    }
    if (action.cmd === "reset") return startMatch(menuState(), p.deckId);
    return g;
  }

  if (!g.started) return g;

  if (action.type === "SETUP_CHOOSE") {
    finishSetup(g, action.activeId, action.companionId);
    return g;
  }

  if (action.type === "PLAY_CARD") {
    if (g.activeSide !== "player") {
      toast(g, "尚未轮到你。");
      return g;
    }
    playCard(g, "player", action.instanceId);
    if (action.thenTarget && g.prompt?.kind === "target") {
      return reduce(g, { type: "CONFIRM_TARGET", instanceId: action.thenTarget });
    }
    return g;
  }

  if (action.type === "OPEN_SWITCH") {
    const p = g.player;
    if (!p.companions.some(Boolean)) {
      toast(g, "需要先部署至少 1 只伴契幻兽才能换位。");
      return g;
    }
    if (p.usedNormalSwitch) {
      toast(g, "本回合已进行过普通换位。");
      return g;
    }
    let cost = 1;
    if (g.environment && g.instances[g.environment.instanceId].defId === "high_tide" && !p.envFirstSwitchFreeUsed) cost = 0;
    if (p.aether < cost) {
      toast(g, "灵息不足。");
      return g;
    }
    g.prompt = { kind: "chooseSwitch", free: false };
    g.promptSide = "player";
    g.switchFree = false;
    return g;
  }

  if (action.type === "CANCEL_PROMPT") {
    if (g.prompt?.kind === "chooseSwitch" && g.prompt.optional) {
      g.prompt = null;
      g.switchFree = false;
      g.afterSwitch = null;
    } else if (g.prompt?.kind === "optionalDiscard" || g.prompt?.kind === "optionalDiscardEmber" || g.prompt?.kind === "optionalSelfDmg") {
      g.prompt = null;
    }
    return g;
  }

  if (action.type === "SWITCH") {
    const s = g.promptSide ?? "player";
    const free =
      action.free === true ||
      g.switchFree ||
      (g.prompt?.kind === "chooseSwitch" && g.prompt.free);
    const after = g.afterSwitch || (g.prompt?.kind === "chooseSwitch" ? g.prompt.after : undefined);
    const ok = doSwitch(g, s, action.companionIndex, !!free);
    g.prompt = null;
    g.switchFree = false;
    g.afterSwitch = null;
    if (ok && g.player.active && s === "player") {
      if (after === "mist_path" && hasSource(g.player.active.defId, "astral")) beginLook(g, "player", 1, "雾径");
      else if (after === "tide_return" && hasSource(g.player.active.defId, "tide")) healEidolon(g, "player", g.player.active, 10);
      else if (after === "mira" && hasSource(g.player.active.defId, "tide")) {
        drawOne(g, "player");
        log(g, "弥拉因潮源抽了 1 张。");
      }
    }
    if (ok && s === "ai" && g.ai.active) {
      if (after === "tide_return" && hasSource(g.ai.active.defId, "tide")) healEidolon(g, "ai", g.ai.active, 10);
      if (after === "mira" && hasSource(g.ai.active.defId, "tide")) drawOne(g, "ai");
    }
    return g;
  }

  if (action.type === "PICK_HAND") {
    const pr = g.prompt;
    const s = g.promptSide ?? "player";
    const p = P(g, s);
    if (pr?.kind === "optionalDiscardEmber") {
      if (!pr.cards.includes(action.instanceId)) {
        toast(g, "请从弃牌中选择一张烬源牌。");
        return g;
      }
      p.discard = p.discard.filter((id) => id !== action.instanceId);
      p.library.push(action.instanceId);
      p.library = shuffle(p.library, mulberry32(g.seed + 3));
      const tgt = P(g, other(s)).active;
      if (tgt) applyDamage(g, other(s), tgt, 10, { direct: true });
      log(g, "葬羽将烬源洗回并加深伤害。");
      g.prompt = null;
      maybeClose(g);
      return g;
    }
    if (pr?.kind === "optionalDiscard" || pr?.kind === "pickHand") {
      if (!p.hand.includes(action.instanceId)) {
        toast(g, "请选择一张手牌。");
        return g;
      }
      p.hand = p.hand.filter((id) => id !== action.instanceId);
      discardCard(g, s, action.instanceId);
      if (pr.kind === "pickHand" && pr.then === "scheme") {
        drawOne(g, s);
        drawOne(g, s);
        log(g, "灰羽谋算抽了 2 张。");
      } else {
        drawOne(g, s);
        log(g, "焦羽弃 1 抽 1。");
      }
      g.prompt = null;
      maybeClose(g);
      return g;
    }
    return g;
  }

  if (action.type === "RESONATE") {
    doResonate(g, "player", action.handId);
    return g;
  }

  if (action.type === "END_ACTION") {
    if (g.activeSide === "player" && g.phase === "action" && !g.prompt) {
      g.phase = "battle";
      const who = g.player.active ? cardName(g.player.active.defId) : "主契";
      settle(g, `战斗阶段。轮到「${who}」行动。`);
    } else if (g.prompt) toast(g, "请先完成当前选择。");
    return g;
  }

  if (action.type === "ATTACK") {
    doAttack(g, "player");
    return g;
  }

  if (action.type === "SKIP_BATTLE" || action.type === "END_TURN") {
    if (g.prompt) {
      toast(g, "请先完成当前选择。");
      return g;
    }
    if (g.activeSide === "player") nightfall(g, "player");
    return g;
  }

  if (action.type === "CONFIRM_TARGET") {
    const pr = g.prompt;
    if (pr?.kind !== "target") return g;
    const s = g.promptSide ?? "player";
    const e = findEidolon(P(g, s), action.instanceId);
    if (!e && pr.filter !== "opposingActive") {
      toast(g, "请选择一只有效的幻兽。");
      return g;
    }
    const then = pr.then;
    g.prompt = null;
    if (then.type === "heal" && e) {
      healEidolon(g, s, e, then.amount);
      if (then.verdantLook && hasSource(e.defId, "verdant")) beginLook(g, s, 1, "芽生术");
    }
    if (then.type === "borrowedDawn" && e) {
      healEidolon(g, s, e, 30);
      if (P(g, s).active && hasSource(P(g, s).active!.defId, "astral")) beginLook(g, s, 2, "借来的晨光");
    }
    if (then.type === "ashBorrow" && e) {
      applyDamage(g, s, e, 10, { self: true, friendly: true });
      gainTempAether(P(g, s), 1, g);
    }
    if (then.type === "alo" && e) {
      applyDamage(g, s, e, 10, { self: true, friendly: true });
      if (g.winner) return g;
      const found = P(g, s).library.filter((id) => defOf(g, id).sources.includes("ember"));
      if (!found.length) {
        log(g, "阿洛在档案中未寻得烬源牌。");
      } else {
        g.prompt = { kind: "pickFromLook", cards: found, title: "烬匠·阿洛：从牌库选择 1 张烬源牌加入手牌，然后洗牌。", filter: "any", then: { type: "none" }, allowSkip: false };
        g.promptSide = s;
        (g as any)._aloSearch = true;
      }
    }
    if (then.type === "skillHeal10" && e) healEidolon(g, s, e, 10);
    return g;
  }

  if (action.type === "CONFIRM_REARRANGE") {
    if (g.prompt?.kind !== "rearrange") return g;
    const lookTitle = g.prompt.title;
    rearrangeTop(g, g.promptSide ?? "player", action.order);
    g.prompt = null;
    settle(g, `${lookTitle}结算完成。已确认牌库顶顺序。你仍处于当前阶段，可以继续行动。`);
    maybeClose(g);
    return g;
  }

  if (action.type === "CONFIRM_PICK") {
    const pr = g.prompt;
    if (pr?.kind !== "pickFromLook") return g;
    const s = g.promptSide ?? "player";
    const p = P(g, s);
    if (pr.then.type === "recycle") {
      p.discard = p.discard.filter((id) => id !== action.instanceId);
      p.hand.push(action.instanceId);
      if (p.active) applyDamage(g, s, p.active, 10, { self: true, friendly: true });
      g.prompt = null;
      return g;
    }
    if (!pr.cards.includes(action.instanceId) && action.instanceId !== "__skip__") {
      toast(g, "请从已揭示的牌中选择。");
      return g;
    }
    const cards = [...pr.cards];
    if (action.instanceId !== "__skip__") {
      const dd = defOf(g, action.instanceId);
      if (pr.filter === "eidolonOrRelic" && dd.type !== "eidolon" && dd.type !== "relic") {
        toast(g, "请选择一张幻兽或遗物。");
        return g;
      }
      if (pr.filter === "astral" && !dd.sources.includes("astral")) {
        toast(g, "请选择一张星源牌。");
        return g;
      }
      if (pr.filter === "astralVerdant" && !dd.sources.includes("astral") && !dd.sources.includes("verdant")) {
        toast(g, "请选择一张森源或星源牌。");
        return g;
      }
    }
    if ((g as any)._chartRest) {
      delete (g as any)._chartRest;
      if (action.instanceId !== "__skip__") {
        p.library = p.library.filter((id) => id !== action.instanceId);
        p.hand.push(action.instanceId);
        triggerSearchHeal(g, s);
        log(g, `星图校准入手「${cardName(g.instances[action.instanceId].defId)}」。`);
      }
      g.prompt = null;
      return g;
    }
    if ((g as any)._nornRest) {
      delete (g as any)._nornRest;
      const rest = cards.filter((id) => id !== action.instanceId);
      if (action.instanceId !== "__skip__" && defOf(g, action.instanceId).sources.includes("astral")) {
        p.library = p.library.filter((id) => id !== action.instanceId);
        p.hand.push(action.instanceId);
        log(g, `诺恩入手「${cardName(g.instances[action.instanceId].defId)}」。`);
      }
      g.prompt = { kind: "orderBottom", cards: rest };
      g.promptSide = s;
      return g;
    }
    if ((g as any)._foxRest) {
      delete (g as any)._foxRest;
      const chosen = action.instanceId === "__skip__" ? null : action.instanceId;
      const rest = cards.filter((id) => id !== chosen);
      if (chosen) {
        g.prompt = { kind: "rearrange", cards: [chosen, ...rest], title: "寻星：调整另外几张牌的顺序（第一张为下一张抽牌）" };
      } else {
        g.prompt = { kind: "rearrange", cards: rest, title: "调整牌库顶顺序（第一张为下一张抽牌）" };
      }
      g.promptSide = s;
      return g;
    }
    if ((g as any)._eveSearch || (g as any)._aloSearch) {
      const alo = !!(g as any)._aloSearch;
      delete (g as any)._eveSearch;
      delete (g as any)._aloSearch;
      if (action.instanceId !== "__skip__" && pr.cards.includes(action.instanceId)) {
        p.library = p.library.filter((id) => id !== action.instanceId);
        p.hand.push(action.instanceId);
        p.library = shuffle(p.library, mulberry32(g.seed + g.logId));
        triggerSearchHeal(g, s);
        log(g, `${alo ? "阿洛寻得" : "伊芙揭示"} ${cardName(g.instances[action.instanceId].defId)}。`);
      }
      g.prompt = null;
      return g;
    }
    g.prompt = null;
    return g;
  }

  if (action.type === "OPPONENT_TOP") {
    if (g.prompt?.kind !== "opponentTop") return g;
    const opp = g.ai;
    const id = g.prompt.cardId;
    opp.library = opp.library.filter((x) => x !== id);
    if (action.place === "top") opp.library.unshift(id);
    else opp.library.push(id);
    log(g, action.place === "top" ? "那张牌留在对方牌顶。" : "那张牌被置于对方牌底。");
    g.prompt = null;
    maybeClose(g);
    return g;
  }

  if (action.type === "OPTIONAL_YES" || action.type === "OPTIONAL_NO") {
    const yes = action.type === "OPTIONAL_YES";
    const s = g.promptSide ?? "player";
    const p = P(g, s);
    const pr = g.prompt;
    if (pr?.kind === "optionalDiscard" || pr?.kind === "optionalDiscardEmber") {
      if (!yes) {
        g.prompt = null;
        return g;
      }
      toast(g, "请点选具体的一张牌。");
      return g;
    }
    if (pr?.kind === "optionalSelfDmg") {
      g.prompt = null;
      if (yes && p.active) {
        applyDamage(g, s, p.active, 10, { self: true });
        if (p.active) gainTempAether(p, 1, g);
      }
      maybeClose(g);
      return g;
    }
    return g;
  }

  if (action.type === "ORDER_BOTTOM") {
    const s = g.promptSide ?? "player";
    const p = P(g, s);
    const set = new Set(action.order);
    p.library = p.library.filter((id) => !set.has(id));
    p.library.push(...action.order);
    g.prompt = null;
    return g;
  }

  if (action.type === "PROMOTE") {
    const s = g.promptSide ?? "player";
    const p = P(g, s);
    if (p.companions[action.companionIndex]) handlePromote(g, s, action.companionIndex);
    else if (!p.companions.some(Boolean) && p.hand[0]) {
      // try deploy - wait for DEPLOY
    }
    return g;
  }

  if (action.type === "DEPLOY_AFTER_DEATH") {
    deployFromHandActive(g, g.promptSide ?? "player", action.instanceId);
    return g;
  }

  if (action.type === "AI_STEP") {
    runAi(g);
    return g;
  }

  return g;
}

/** Deterministic heuristic AI for one think-step or a full turn slice. */
export function runAi(g: GameState) {
  if (g.winner || g.activeSide !== "ai") return;
  const s: Side = "ai";
  const p = g.ai;

  // resolve prompts automatically
  if (g.prompt && g.promptSide === "ai") {
    resolveAiPrompt(g);
    return;
  }

  if (g.phase === "action") {
    // resonance
    for (const hid of [...p.hand]) {
      if (!canResonate(g, s, hid)) {
        doResonate(g, s, hid);
        return;
      }
    }
    // play cheap useful cards
    const hand = [...p.hand].sort((a, b) => defOf(g, a).cost - defOf(g, b).cost);
    for (const hid of hand) {
      const d = defOf(g, hid);
      if (d.resonanceFrom) continue;
      if (d.cost > p.aether) continue;
      if (d.type === "eidolon" && allBoard(p).length < 4) {
        playCard(g, s, hid);
        return;
      }
      if (d.type === "relic" || d.type === "environment") {
        playCard(g, s, hid);
        return;
      }
      if (d.id === "ash_borrow" && !p.usedAshBorrow && allBoard(p).some((e) => hasSource(e.defId, "ember") && e.hp > 10)) {
        playCard(g, s, hid);
        return;
      }
      if (d.id === "tide_return" && p.companions.some(Boolean)) {
        playCard(g, s, hid);
        return;
      }
      if (d.id === "ash_scheme" && p.hand.length > 1) {
        playCard(g, s, hid);
        return;
      }
    }
    // switch if active low
    if (p.active && p.active.hp <= 20 && p.companions.some((c) => c && c.hp > p.active!.hp) && !p.usedNormalSwitch && p.aether >= 1) {
      const i = p.companions.findIndex((c) => c && c.hp > 20);
      if (i >= 0) {
        doSwitch(g, s, i, false);
        return;
      }
    }
    g.phase = "battle";
    return;
  }

    if (g.phase === "closing") {
      nightfall(g, s);
      return;
    }

    if (g.phase === "battle") {
    const lethal = (() => {
      if (!p.active || p.active.initialArrival || !g.player.active) return false;
      const sk = def(p.active.defId).skill;
      if (!sk || p.aether < sk.cost) return false;
      return true;
    })();
    if (lethal && !canAttack(g, s)) {
      doAttack(g, s);
      if (!g.prompt) {
        if (!g.winner && g.activeSide === "ai") nightfall(g, s);
      }
      return;
    }
    nightfall(g, s);
  }
}

function resolveAiPrompt(g: GameState) {
  const pr = g.prompt!;
  const p = g.ai;
  if (pr.kind === "chooseSwitch") {
    const i = p.companions.findIndex(Boolean);
    const after = pr.after || g.afterSwitch;
    if (i >= 0) doSwitch(g, "ai", i, pr.free);
    g.prompt = null;
    g.switchFree = false;
    g.afterSwitch = null;
    if (after === "tide_return" && p.active && hasSource(p.active.defId, "tide")) healEidolon(g, "ai", p.active, 10);
    if (after === "mira" && p.active && hasSource(p.active.defId, "tide")) drawOne(g, "ai");
    return;
  }
  if (pr.kind === "target") {
    const pool = allBoard(p);
    const e =
      pr.filter === "friendlyEmber"
        ? pool.find((x) => hasSource(x.defId, "ember") && x.hp > 10) ?? pool[0]
        : pool.sort((a, b) => a.hp - b.hp)[0];
    if (e) {
      g.prompt = null;
      const then = pr.then;
      if (then.type === "heal") healEidolon(g, "ai", e, then.amount);
      if (then.type === "ashBorrow") {
        applyDamage(g, "ai", e, 10, { self: true, friendly: true });
        gainTempAether(p, 1, g);
      }
      if (then.type === "alo") {
        applyDamage(g, "ai", e, 10, { self: true, friendly: true });
        const found = p.library.find((id) => defOf(g, id).sources.includes("ember"));
        if (found) {
          p.library = p.library.filter((id) => id !== found);
          p.hand.push(found);
          p.library = shuffle(p.library, mulberry32(g.seed));
        }
      }
      if (then.type === "skillHeal10") healEidolon(g, "ai", e, 10);
      if (then.type === "borrowedDawn") healEidolon(g, "ai", e, 30);
    } else g.prompt = null;
    return;
  }
  if (pr.kind === "rearrange") {
    rearrangeTop(g, "ai", pr.cards);
    g.prompt = null;
    return;
  }
  if (pr.kind === "pickFromLook") {
    const pick =
      pr.cards.find((id) => {
        const d = defOf(g, id);
        if (pr.filter === "astral") return d.sources.includes("astral");
        if (pr.filter === "eidolonOrRelic") return d.type === "eidolon" || d.type === "relic";
        if (pr.filter === "astralVerdant") return d.sources.includes("astral") || d.sources.includes("verdant");
        return true;
      }) ?? "__skip__";
    g.prompt = null;
    if (pr.then.type === "recycle" && pick !== "__skip__") {
      p.discard = p.discard.filter((id) => id !== pick);
      p.hand.push(pick);
      if (p.active) applyDamage(g, "ai", p.active, 10, { self: true, friendly: true });
    } else if (pick !== "__skip__" && ((g as any)._chartRest || (g as any)._eveSearch || (g as any)._aloSearch)) {
      delete (g as any)._chartRest;
      delete (g as any)._eveSearch;
      delete (g as any)._aloSearch;
      p.library = p.library.filter((id) => id !== pick);
      p.hand.push(pick);
      p.library = shuffle(p.library, mulberry32(g.seed));
    } else {
      delete (g as any)._nornRest;
      delete (g as any)._foxRest;
      delete (g as any)._chartRest;
      delete (g as any)._eveSearch;
      delete (g as any)._aloSearch;
    }
    return;
  }
  if (pr.kind === "opponentTop") {
    g.prompt = null;
    return;
  }
  if (pr.kind === "optionalDiscard" || pr.kind === "optionalSelfDmg" || pr.kind === "optionalDiscardEmber" || pr.kind === "pickHand") {
    if (pr.kind === "pickHand" && pr.then === "scheme" && p.hand.length) {
      const id = p.hand[p.hand.length - 1];
      p.hand = p.hand.filter((x) => x !== id);
      discardCard(g, "ai", id);
      drawOne(g, "ai");
      drawOne(g, "ai");
    }
    g.prompt = null;
    return;
  }
  if (pr.kind === "choosePromote") {
    const i = p.companions.findIndex(Boolean);
    if (i >= 0) handlePromote(g, "ai", i);
    else {
      const hid = p.hand.find((id) => {
        const d = defOf(g, id);
        return d.type === "eidolon" && !d.resonanceFrom;
      });
      if (hid) deployFromHandActive(g, "ai", hid);
      else {
        g.winner = "player";
        g.winReason = "Opponent has no remaining 幻兽.";
      }
    }
    return;
  }
  if (pr.kind === "orderBottom") {
    const set = new Set(pr.cards);
    p.library = p.library.filter((id) => !set.has(id));
    p.library.push(...pr.cards);
    g.prompt = null;
  }
}

export function validateDeckSizes() {
  return {
    mist: DECK_LISTS.mist.length,
    ash: DECK_LISTS.ash.length,
  };
}

export function resonanceLines(g: GameState, s: Side): string[] {
  const p = P(g, s);
  const lines: string[] = [];
  if (allBoard(p).some((e) => e.defId === "moss_sleep") || p.hand.some((id) => g.instances[id]?.defId === "moss_crown")) {
    lines.push(`共鸣进度：累计治疗 ${p.totalHealing} / 30`);
  }
  if (allBoard(p).some((e) => e.defId === "microstar") || p.hand.some((id) => g.instances[id]?.defId === "weave_moth")) {
    lines.push(`共鸣进度：观视牌顶 ${p.deckTopViewed} / 6`);
  }
  if (allBoard(p).some((e) => e.defId === "ash_lizard") || p.hand.some((id) => g.instances[id]?.defId === "ash_crown")) {
    lines.push(`共鸣进度：烬源自伤 ${p.emberSelfDamage} / 20`);
  }
  if (allBoard(p).some((e) => e.defId === "ash_crow") || p.hand.some((id) => g.instances[id]?.defId === "ember_emperor")) {
    lines.push(`共鸣进度：入弃牌 ${p.discardEntries} / 3`);
  }
  if (allBoard(p).some((e) => e.defId === "tide_jelly") || p.hand.some((id) => g.instances[id]?.defId === "silver_umbrella")) {
    lines.push(`共鸣进度：换位 ${p.switchesBattle} / 3`);
  }
  for (const e of allBoard(p)) {
    if (e.defId === "moon_cat") lines.push(`共鸣进度：此月潮猫进入主契位 ${e.timesEnteredActiveFromCompanion} / 2`);
  }
  return lines;
}

export function blankBattle(): GameState {
  const g = menuState();
  g.started = true;
  g.phase = "action";
  g.turn = 1;
  g.activeSide = "player";
  g.player.aether = 3;
  g.player.aetherMax = 3;
  g.ai.aether = 3;
  g.ai.aetherMax = 3;
  g.prompt = null;
  return g;
}

export function spawnCard(g: GameState, defId: string): string {
  const instanceId = nid("t");
  g.instances[instanceId] = { instanceId, defId };
  return instanceId;
}

export function putHand(g: GameState, s: Side, defId: string): string {
  const id = spawnCard(g, defId);
  P(g, s).hand.push(id);
  return id;
}

export function putField(g: GameState, s: Side, defId: string, slot: "active" | 0 | 1 | 2, initial = false) {
  const id = spawnCard(g, defId);
  const e = makeEidolon(g, id, initial);
  e.enteredActiveThisTurn = slot === "active";
  const p = P(g, s);
  if (slot === "active") p.active = e;
  else p.companions[slot] = e;
  return e;
}

export function putRelic(g: GameState, s: Side, defId: string) {
  const id = spawnCard(g, defId);
  P(g, s).relics.push({ instanceId: id, defId, owner: s });
}

export function putEnv(g: GameState, defId: string, owner: Side = "player") {
  const id = spawnCard(g, defId);
  g.environment = { instanceId: id, defId, owner };
}

export { canResonate, canAttack, beginTurn, doSwitch, playCard, doResonate, doAttack, nightfall, applyDamage, healEidolon, drawOne };
