export type Source = "verdant" | "tide" | "ember" | "astral";
export type CardType = "eidolon" | "spell" | "relic" | "traveler" | "environment";
export type Rarity = "common" | "rare" | "arcane" | "relic" | "mythic";
export type Phase = "setup" | "awaken" | "draw" | "action" | "battle" | "closing" | "nightfall";
export type Side = "player" | "ai";
export type DeckId = "mist" | "ash";

export type SkillFollow =
  | { kind: "selfDamage"; amount: number }
  | { kind: "healTarget"; amount: number }
  | { kind: "healAll"; amount: number }
  | { kind: "look"; count: number; title: string }
  | { kind: "foxLook" }
  | { kind: "opponentTop" }
  | { kind: "optionalDiscard" }
  | { kind: "optionalDiscardEmber" }
  | { kind: "optionalSelfDmg" }
  | { kind: "optionalFreeSwitch" }
  | { kind: "nextAttackReduction"; amount: number }
  | { kind: "drawIfEnteredActive" };

export interface SkillDef {
  name: string;
  cost: number;
  text: string;
  strike?: {
    damage: number;
    altWhen?: "enteredActiveThisTurn" | "friendlyEffectDamage";
    altDamage?: number;
  };
  follow?: SkillFollow[];
}

export interface CardDef {
  id: string;
  name: string;
  nameEn: string;
  type: CardType;
  sources: Source[];
  cost: number;
  rarity: Rarity;
  hp?: number;
  skill?: SkillDef;
  resonanceFrom?: string;
  resonanceCost?: number;
  resonanceText?: string;
  text: string;
  flavor?: string;
  artHue: number;
  artKind: "moss" | "star" | "ember" | "tide" | "relic" | "spell" | "traveler" | "env";
}

export interface BoardEidolon {
  instanceId: string;
  defId: string;
  hp: number;
  maxHp: number;
  initialArrival: boolean;
  resonanceStack: string[];
  enteredActiveThisTurn: boolean;
  timesEnteredActiveFromCompanion: number;
  damageTakenThisTurn: number;
  selfDamageThisTurn: number;
  friendlyEffectDamageThisTurn: boolean;
  verdantFirstHitReducedThisTurn: boolean;
  attackMod: number;
  nextAttackReduction: number;
}

export interface PersistentCard {
  instanceId: string;
  defId: string;
  owner: Side;
}

export interface PlayerState {
  side: Side;
  deckId: DeckId;
  library: string[];
  hand: string[];
  discard: string[];
  active: BoardEidolon | null;
  companions: [BoardEidolon | null, BoardEidolon | null, BoardEidolon | null];
  relics: PersistentCard[];
  aetherMax: number;
  aether: number;
  tempAetherGenerated: number;
  covenant: number;
  switchesBattle: number;
  switchesTurn: number;
  usedNormalSwitch: boolean;
  usedResonance: boolean;
  usedAshBorrow: boolean;
  totalHealing: number;
  totalSelfDamage: number;
  emberSelfDamage: number;
  deckTopViewed: number;
  discardEntries: number;
  foxHealUsed: boolean;
  relicLookBonusUsed: boolean;
  relicAshAetherUsed: boolean;
  relicTideHealUsed: boolean;
  envFirstSwitchFreeUsed: boolean;
}

export type Prompt =
  | { kind: "setup" }
  | { kind: "target"; reason: string; filter: TargetFilter; then: PendingEffect }
  | { kind: "rearrange"; cards: string[]; title: string; then?: PendingEffect }
  | { kind: "pickFromLook"; cards: string[]; title: string; filter: "astralVerdant" | "eidolonOrRelic" | "astral" | "any"; then: PendingEffect; allowSkip?: boolean }
  | { kind: "opponentTop"; cardId: string }
  | { kind: "optionalDiscard"; forSkill: boolean; cards: string[] }
  | { kind: "optionalDiscardEmber"; cards: string[] }
  | { kind: "optionalSelfDmg" }
  | { kind: "choosePromote" }
  | { kind: "chooseSwitch"; free: boolean; after?: string; optional?: boolean }
  | { kind: "chooseResonance" }
  | { kind: "orderBottom"; cards: string[] }
  | { kind: "pickHand"; title: string; then: "scheme" | "crow" };

export type TargetFilter =
  | "friendlyAny"
  | "friendlyEmber"
  | "friendlyEidolon"
  | "opposingActive";

export type PendingEffect =
  | { type: "heal"; amount: number; verdantLook?: boolean }
  | { type: "borrowedDawn" }
  | { type: "ashBorrow" }
  | { type: "alo" }
  | { type: "recycle" }
  | { type: "skillHeal10" }
  | { type: "deploySlot" }
  | { type: "none" };

export interface Instance {
  instanceId: string;
  defId: string;
}

export interface LogEntry {
  id: number;
  text: string;
  turn: number;
}

export interface GameState {
  instances: Record<string, Instance>;
  defsReady: true;
  player: PlayerState;
  ai: PlayerState;
  environment: PersistentCard | null;
  turn: number;
  activeSide: Side;
  phase: Phase;
  winner: Side | "none" | null;
  winReason: string | null;
  prompt: Prompt | null;
  promptSide: Side | null;
  log: LogEntry[];
  logId: number;
  seed: number;
  started: boolean;
  debug: boolean;
  toasts: { id: number; text: string }[];
  toastId: number;
  lastActionIllegal: string | null;
  fx: CombatFx[];
  fxId: number;
  switchFree: boolean;
  afterSwitch: string | null;
  firstTurnNoStrike: boolean;
  hasUsedBattle: boolean;
  settleNote: string | null;
  actionCue: ActionCue | null;
  actionCueId: number;
}

export interface ActionCue {
  id: number;
  side: Side;
  title: string;
  lines: string[];
}

export interface CombatFx {
  id: number;
  kind: "dmg" | "heal" | "resonate" | "mark" | "defeat";
  text: string;
  side: Side;
  at: "active" | "board";
}

export type GameAction =
  | { type: "SELECT_DECK"; deck: DeckId }
  | { type: "BEGIN" }
  | { type: "SETUP_CHOOSE"; activeId: string; companionId: string | null }
  | { type: "PLAY_CARD"; instanceId: string; thenTarget?: string }
  | { type: "CONFIRM_TARGET"; instanceId: string }
  | { type: "CONFIRM_REARRANGE"; order: string[] }
  | { type: "CONFIRM_PICK"; instanceId: string }
  | { type: "OPPONENT_TOP"; place: "top" | "bottom" }
  | { type: "OPTIONAL_YES" }
  | { type: "OPTIONAL_NO" }
  | { type: "ORDER_BOTTOM"; order: string[] }
  | { type: "SWITCH"; companionIndex: number; free?: boolean }
  | { type: "RESONATE"; handId: string }
  | { type: "END_ACTION" }
  | { type: "ATTACK" }
  | { type: "SKIP_BATTLE" }
  | { type: "END_TURN" }
  | { type: "PROMOTE"; companionIndex: number }
  | { type: "DEPLOY_AFTER_DEATH"; instanceId: string }
  | { type: "RESTART" }
  | { type: "TO_MENU" }
  | { type: "TOGGLE_DEBUG" }
  | { type: "DEBUG"; cmd: string; payload?: string }
  | { type: "DISMISS_ILLEGAL" }
  | { type: "AI_STEP" }
  | { type: "OPEN_SWITCH" }
  | { type: "CANCEL_PROMPT" }
  | { type: "PICK_HAND"; instanceId: string };
