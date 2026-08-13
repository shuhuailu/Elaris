import { CARDS, def, isBasicEidolon } from "../cards/definitions";
import type { BoardEidolon, GameState, PlayerState, Side, Source } from "../types";

export function other(s: Side): Side {
  return s === "player" ? "ai" : "player";
}

export function P(g: GameState, s: Side): PlayerState {
  return s === "player" ? g.player : g.ai;
}

export function allBoard(p: PlayerState): BoardEidolon[] {
  return [p.active, ...p.companions].filter(Boolean) as BoardEidolon[];
}

export function findEidolon(p: PlayerState, id: string): BoardEidolon | null {
  if (p.active?.instanceId === id) return p.active;
  return p.companions.find((c) => c?.instanceId === id) ?? null;
}

export function hasSource(defId: string, src: Source): boolean {
  return def(defId).sources.includes(src);
}

export function usableAether(p: PlayerState): number {
  return p.aether;
}

export function spendAether(p: PlayerState, n: number): string | null {
  if (p.aether < n) return "灵息不足。";
  p.aether -= n;
  return null;
}

export function gainTempAether(p: PlayerState, n: number, g: GameState): number {
  const room = Math.max(0, 2 - p.tempAetherGenerated);
  const add = Math.min(n, room);
  p.tempAetherGenerated += add;
  p.aether += add;
  if (add) log(g, `${p.side === "player" ? "你" : "对方"}获得 ${add} 点临时灵息。`);
  return add;
}

export function log(g: GameState, text: string) {
  g.logId += 1;
  g.log = [...g.log.slice(-120), { id: g.logId, text, turn: g.turn }];
}

export function toast(g: GameState, text: string) {
  g.toastId += 1;
  g.toasts = [...g.toasts.slice(-4), { id: g.toastId, text }];
  g.lastActionIllegal = text;
}

export function emptySlotCount(p: PlayerState): number {
  return p.companions.filter((c) => !c).length + (p.active ? 0 : 1);
}

export function canStartWithHand(handDefs: string[]): boolean {
  return handDefs.some(isBasicEidolon);
}

export function cardName(id: string): string {
  return CARDS[id]?.name ?? id;
}

export function clone<T>(x: T): T {
  return structuredClone(x);
}

export function countBoard(p: PlayerState): number {
  return allBoard(p).length;
}
