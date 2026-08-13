import { useEffect, useReducer, useRef, useState } from "react";
import { CARDS, def, isBasicEidolon, starterBindError } from "./cards/definitions";
import { DECK_META } from "./cards/decks";
import { canPlayCard, menuState, reduce } from "./engine/game";
import { canAttack, canResonate } from "./engine/game";
import { battleSkillLabel, lookPurpose, switchTeachReady } from "./engine/flow";
import type { DeckId, GameState } from "./types";
import { CardView } from "./ui/CardView";
import { AetherMeter } from "./ui/AetherMeter";
import { kindOf } from "./ui/terms";
import { starterBrief } from "./ui/starterBrief";
import { SetupScreen } from "./ui/SetupScreen";

function Title({ g, dispatch }: { g: GameState; dispatch: (a: any) => void }) {
  const [sel, setSel] = useState<DeckId>(g.player.deckId);
  return (
    <div className="title-screen">
      <h1 className="brand">ELARIS</h1>
      <div className="subtitle">Combat Prototype · 0.1.5</div>
      <div className="decks">
        {(["mist", "ash"] as DeckId[]).map((id) => {
          const m = DECK_META[id];
          return (
            <button
              key={id}
              className={`deck-card ${sel === id ? "sel" : ""}`}
              onClick={() => {
                setSel(id);
                dispatch({ type: "SELECT_DECK", deck: id });
              }}
            >
              <h2>{m.title}</h2>
              <div className="en">{m.titleEn}</div>
              <div className="src">{m.sources}</div>
              <p>“{m.blurb}”</p>
            </button>
          );
        })}
      </div>
      <button className="begin" onClick={() => dispatch({ type: "BEGIN" })}>
        开始对决
        <span style={{ display: "block", fontSize: 11, letterSpacing: "0.2em", opacity: 0.7 }}>BEGIN DUEL</span>
      </button>
    </div>
  );
}

const PRE_PLAY_TARGET: Record<string, { reason: string; filter: "friendlyAny" | "friendlyEmber" }> = {
  sprout: { reason: "芽生术：选择一只友方幻兽，回复 20 点生命。", filter: "friendlyAny" },
  borrowed_dawn: { reason: "借来的晨光：选择一只友方幻兽，回复 30 点生命。", filter: "friendlyAny" },
  ash_borrow: { reason: "灰烬借火：选择一只友方烬源幻兽。", filter: "friendlyEmber" },
  alo: { reason: "烬匠·阿洛：选择一只友方幻兽承受效果。", filter: "friendlyAny" },
};

export default function App() {
  const [g, dispatch] = useReducer(reduce, undefined, menuState);
  const [inspect, setInspect] = useState<string | null>(null);
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const [pendingPlay, setPendingPlay] = useState<string | null>(null);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [promptTargetPick, setPromptTargetPick] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<string | null>(null);
  const [toastGone, setToastGone] = useState(false);
  const [typeAsk, setTypeAsk] = useState(false);
  const prevPhase = useRef<string>("setup");
  const [logOpen, setLogOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [setupActive, setSetupActive] = useState<string | null>(null);
  const [setupComp, setSetupComp] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<"active" | "confirm" | "companion">("active");
  const [showCompare, setShowCompare] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [seen, setSeen] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("elarishints-017") || "{}");
    } catch {
      return {};
    }
  });
  const dismissHint = (k: string) => {
    const n = { ...seen, [k]: true };
    setSeen(n);
    localStorage.setItem("elarishints-017", JSON.stringify(n));
  };
  const resetHints = () => {
    setSeen({});
    localStorage.removeItem("elarishints-017");
    localStorage.removeItem("elarishints-016");
    localStorage.removeItem("elarishints-015");
    localStorage.removeItem("elarishints-013");
  };

  useEffect(() => {
    if (!g.started) {
      prevPhase.current = g.phase;
      return;
    }
    if (prevPhase.current !== g.phase && g.activeSide === "player") {
      if (g.phase === "battle") {
        setHandoff("战斗阶段\n轮到你的主契幻兽行动。");
        const t = window.setTimeout(() => setHandoff(null), 1100);
        prevPhase.current = g.phase;
        return () => window.clearTimeout(t);
      }
      if (g.phase === "action" && g.turn === 1) {
        setHandoff("行动阶段\n你可以使用手牌。准备好后进入战斗。");
        const t = window.setTimeout(() => setHandoff(null), 1100);
        prevPhase.current = g.phase;
        return () => window.clearTimeout(t);
      }
    }
    prevPhase.current = g.phase;
  }, [g.phase, g.activeSide, g.started, g.turn]);

  useEffect(() => {
    if (g.activeSide === "ai" && g.started && !g.winner) {
      const wait = g.actionCue ? 1100 : 480;
      const t = setTimeout(() => dispatch({ type: "AI_STEP" }), wait);
      return () => clearTimeout(t);
    }
  }, [g.activeSide, g.phase, g.prompt, g.logId, g.started, g.winner, g.actionCueId]);

  useEffect(() => {
    if (String(g.prompt?.kind) === "setup" && !setupActive) setSetupStep("active");
  }, [g.prompt?.kind]);

  useEffect(() => {
    if (selectedHand && !g.player.hand.includes(selectedHand)) {
      setSelectedHand(null);
      setInspect(null);
      setPendingPlay(null);
    }
  }, [g.player.hand, selectedHand]);

  useEffect(() => {
    setToastGone(false);
    if (!g.settleNote && !handoff) return;
    const t = window.setTimeout(() => setToastGone(true), 2200);
    return () => window.clearTimeout(t);
  }, [g.settleNote, g.logId, handoff]);

  if (!g.started) return <Title g={g} dispatch={dispatch} />;

  const p = g.player;
  const o = g.ai;
  const phaseName =
    g.phase === "closing" ? "战斗" : g.phase === "setup" ? "备战" : ({ awaken: "苏醒", draw: "抽牌", action: "行动", battle: "战斗", nightfall: "夜幕" } as Record<string, string>)[g.phase] ?? "";

  const resReady = p.hand.some((id) => {
    const d = CARDS[g.instances[id].defId];
    return d.resonanceFrom && !canResonate(g, "player", id);
  });
  const hint =
    g.phase === "setup"
      ? null
      : !seen.aetherHud && g.phase === "action"
        ? { k: "aetherHud", t: "灵息：使用卡牌、部署幻兽和发动部分战技需要消耗。每回合开始时恢复，并随回合推进逐步增加。永久灵息上限最高为 7。" }
      : !seen.tempAether && p.tempAetherGenerated > 0
        ? { k: "tempAether", t: "临时灵息：本回合额外获得，回合结束时消失。每回合最多额外 2 点。" }
        : !seen.draw && g.phase === "action" && g.turn === 1
        ? { k: "draw", t: "抽牌：刚从牌库抽了 1 张加入手牌。现在可以使用手牌。" }
        : !seen.action && g.phase === "action"
          ? { k: "action", t: "行动阶段：使用或部署手牌。准备好后点「进入战斗」。" }
          : !seen.companion && g.phase === "action" && p.companions.some(Boolean)
            ? { k: "companion", t: "伴契在后方待命。之后可通过换位让它成为主契。" }
            : !seen.switchReady && switchTeachReady(g)
              ? { k: "switchReady", t: "换位：让一只伴契与主契交换。本次通常消耗 1 灵息。" }
              : !seen.battle && g.phase === "battle"
                ? { k: "battle", t: p.active ? `现在操作的是「${def(p.active.defId).name}」。` : "轮到主契行动。" }
                : !seen.close && g.phase === "closing"
                  ? { k: "close", t: "战斗已经完成。结束本回合后，对手将开始行动。" }
                  : !seen.res && g.phase === "action" && resReady
                    ? { k: "res", t: "共鸣已经回应你。" }
                    : null;
  const floatHint = hint;

  const lastLog = g.log[g.log.length - 1];

  const inspectHand = (id: string) => {
    const d = g.instances[id];
    setInspect(d.defId);
    setSelectedHand(id);
    const kk = `type-${kindOf(d.defId)}`;
    setTypeAsk(!seen[kk]);
    if (String(g.prompt?.kind) === "setup") {
      const bindErr = starterBindError(d.defId);
      if (bindErr) {
        return;
      }
      if (setupStep === "companion") {
        if (id === setupActive) return;
        setSetupComp(setupComp === id ? null : id);
        return;
      }
      if (setupActive === id) {
        return;
      }
      setSetupActive(id);
      if (setupComp === id) setSetupComp(null);
    }
  };

  const commitUse = (id: string) => {
    const inst = g.instances[id];
    const card = CARDS[inst.defId];
    if (g.prompt?.kind === "choosePromote" && !p.companions.some(Boolean)) {
      dispatch({ type: "DEPLOY_AFTER_DEATH", instanceId: id });
      setPendingPlay(null);
      setSelectedHand(null);
      return;
    }
    if (card.resonanceFrom) {
      dispatch({ type: "RESONATE", handId: id });
      setPendingPlay(null);
      setSelectedHand(null);
      setInspect(null);
      return;
    }
    if (PRE_PLAY_TARGET[card.id]) {
      setPendingPlay(id);
      setPendingTarget(null);
      return;
    }
    dispatch({ type: "PLAY_CARD", instanceId: id });
    setPendingPlay(null);
    setSelectedHand(null);
    setInspect(null);
  };

  const confirmPendingPlay = () => {
    if (!pendingPlay || !pendingTarget) return;
    dispatch({ type: "PLAY_CARD", instanceId: pendingPlay, thenTarget: pendingTarget });
    setPendingPlay(null);
    setPendingTarget(null);
    setSelectedHand(null);
    setInspect(null);
  };

  const cancelPendingPlay = () => {
    setPendingPlay(null);
    setPendingTarget(null);
  };

  const useLabel = (id: string) => {
    const card = CARDS[g.instances[id].defId];
    if (card.resonanceFrom) return `发动共鸣「${card.name}」`;
    if (card.type === "eidolon") return `部署「${card.name}」`;
    if (card.type === "relic") return `安置「${card.name}」`;
    if (card.type === "environment") return `展开「${card.name}」`;
    return `使用「${card.name}」`;
  };

  const selectedIllegal =
    selectedHand && g.phase === "action" && !g.prompt
      ? CARDS[g.instances[selectedHand].defId].resonanceFrom
        ? canResonate(g, "player", selectedHand)
        : canPlayCard(g, "player", selectedHand)
      : selectedHand && g.prompt?.kind === "choosePromote" && !p.companions.some(Boolean)
        ? starterBindError(g.instances[selectedHand].defId)
        : selectedHand
          ? "现在不能打出此牌。"
          : null;

  const mid = (p.hand.length - 1) / 2;
  const selectedFee =
    selectedHand && g.instances[selectedHand]
      ? (CARDS[g.instances[selectedHand].defId].resonanceFrom
          ? CARDS[g.instances[selectedHand].defId].resonanceCost ?? 0
          : CARDS[g.instances[selectedHand].defId].cost)
      : null;
  const remainAfter = selectedFee == null ? null : p.aether - selectedFee;
  const legalStarters = p.hand.filter((id) => !starterBindError(g.instances[id].defId));
  const finishMain = () => {
    if (!setupActive) return;
    const others = legalStarters.filter((id) => id !== setupActive);
    if (others.length) {
      setSetupStep("companion");
      setSetupComp(null);
      setShowCompare(false);
      return;
    }
    dispatch({ type: "SETUP_CHOOSE", activeId: setupActive, companionId: null });
  };

  if (g.prompt?.kind === "setup") {
    return (
      <SetupScreen
        g={g}
        setupActive={setupActive}
        setupComp={setupComp}
        setupStep={setupStep}
        showCompare={showCompare}
        showFull={showFull}
        onPick={(id) => {
          inspectHand(id);
          setShowFull(false);
          if (setupStep === "confirm") setSetupStep("active");
        }}
        onBind={() => setupActive && setSetupStep("confirm")}
        onConfirm={finishMain}
        onBackCompare={() => {
          setSetupStep("active");
          setShowCompare(true);
        }}
        onSkipComp={() => setupActive && dispatch({ type: "SETUP_CHOOSE", activeId: setupActive, companionId: null })}
        onConfirmComp={() =>
          setupActive && setupComp && dispatch({ type: "SETUP_CHOOSE", activeId: setupActive, companionId: setupComp })
        }
        onToggleCompare={() => setShowCompare((v) => !v)}
        onToggleFull={() => setShowFull((v) => !v)}
      />
    );
  }

  return (
    <div className={`desk ${inspect ? "has-inspect" : ""}`}>
      <header className="sky">
        <div className="hud-mini" title="击败对方主契获得契痕，先至 3 点获胜。">
          对方 <span className="dots">{"◇".repeat(o.covenant)}{"○".repeat(3 - o.covenant)}</span>
          <div>库 {o.library.length}</div>
        </div>
        <div className="sky-mid">
          <div className="turn-line">第 {g.turn} 回合 · {g.activeSide === "player" ? "你" : "对方"}</div>
          <div className="phases">
            {(["苏醒", "抽牌", "行动", "战斗", "夜幕"] as const).map((lab, i) => (
              <span key={lab}>
                {i > 0 ? " · " : ""}
                <span className={lab === phaseName ? "on" : ""}>{lab === phaseName ? `◇ ${lab}` : lab}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="hud-mini" style={{ textAlign: "right" }}>
          灵息 ◇ {p.aether}/{p.aetherMax}
          {p.tempAetherGenerated ? ` +${p.tempAetherGenerated}` : ""} · 库 {p.library.length}
          <div>
            契痕 <span className="dots">{"◇".repeat(p.covenant)}{"○".repeat(3 - p.covenant)}</span>
          </div>
        </div>
        <div className="menu-wrap">
          <button className="menu-btn" onClick={() => setMenu((v) => !v)} aria-label="菜单">
            ···
          </button>
          {menu && (
            <div className="menu-pop">
              <button onClick={() => dispatch({ type: "RESTART" })}>重新开始</button>
              <button onClick={() => dispatch({ type: "TO_MENU" })}>返回选牌</button>
              <button
                onClick={() => {
                  resetHints();
                  setMenu(false);
                }}
              >
                重置新手引导
              </button>
              <button onClick={() => dispatch({ type: "TOGGLE_DEBUG" })}>调试</button>
            </div>
          )}
        </div>
      </header>

      <main className="field">
        <div className="env-whisper">
          {g.environment ? def(g.instances[g.environment.instanceId].defId).name : ""}
        </div>
        <div className="lane">
          {o.companions.map((c, i) =>
            c ? <CardView key={i} defId={c.defId} e={c} onClick={() => setInspect(c.defId)} /> : <div key={i} style={{ width: 40 }} />
          )}
        </div>
        <div className="lane">
          {o.active && <CardView defId={o.active.defId} size="lg" e={o.active} onClick={() => setInspect(o.active!.defId)} />}
        </div>
        {g.actionCue && g.activeSide === "ai" && (
          <div className={`action-cue ${g.actionCue.side}`}>
            <strong>{g.actionCue.title}</strong>
            {g.actionCue.lines.map((ln) => (
              <div key={ln}>{ln}</div>
            ))}
          </div>
        )}
        <div className="rift" />
        <div className="lane">
          {p.active && (
            <CardView
              defId={p.active.defId}
              size="lg"
              e={p.active}
              selected={g.phase === "battle" && g.activeSide === "player"}
              badge={g.phase === "battle" && g.activeSide === "player" ? "主契行动" : undefined}
              onClick={() => setInspect(p.active!.defId)}
            />
          )}
        </div>
        <div className="lane">
          {p.companions.map((c, i) =>
            c ? (
              <CardView
                key={i}
                defId={c.defId}
                e={c}
                onClick={() => {
                  if (g.prompt?.kind === "choosePromote") dispatch({ type: "PROMOTE", companionIndex: i });
                  else if (g.prompt?.kind === "chooseSwitch") dispatch({ type: "SWITCH", companionIndex: i, free: g.prompt.free });
                  else setInspect(c.defId);
                }}
              />
            ) : (
              <div key={i} style={{ width: 40 }} />
            )
          )}
        </div>
      </main>

      <footer className="dock">
        <div className="dock-left">
          {String(g.prompt?.kind) === "setup" ? (
            <div className="coach">
              {setupStep === "companion" ? (
                <>
                  <div className="flow-title">可选 · 设置一只伴契</div>
                  <p className="whisper">伴契会在后方待命，之后可以通过换位成为主契。</p>
                </>
              ) : (
                <>
                  <div className="flow-title">第一步 · 选择你的主契幻兽</div>
                  <p className="whisper">
                    <strong>主契</strong>是当前出战的幻兽，通常由它发动战技。请点选发亮的基础幻兽。
                  </p>
                  <p className="whisper">♡ 生命：能承受的伤害，降到 0 会被击败。高生命更耐打，但不一定更强。</p>
                  <p className="whisper">◇ 左上角是以后从手牌部署的费用。开局绑定主契和伴契不消耗部署灵息。</p>
                  <p className="whisper">不同幻兽没有单纯强弱。生命、费用、战技消耗和能力各有取舍。</p>
                </>
              )}
            </div>
          ) : (
            <AetherMeter aether={p.aether} max={p.aetherMax} tempGen={p.tempAetherGenerated} />
          )}
        </div>
        <div className="fan">
          {p.hand.map((id, i) => {
            const d = g.instances[id];
            const illegal =
              g.phase === "action" && !g.prompt
                ? CARDS[d.defId].resonanceFrom
                  ? canResonate(g, "player", id)
                  : canPlayCard(g, "player", id)
                : String(g.prompt?.kind) === "setup"
                  ? null
                  : " ";
            const rot = (i - mid) * 5;
            const lift = Math.abs(i - mid) * 5;
            return (
              <div key={id} style={{ transform: `rotate(${rot}deg) translateY(${lift}px)`, zIndex: setupActive === id ? 20 : i, position: "relative" }}>
                <CardView
                  defId={d.defId}
                  size="hand"
                  dim={
                    String(g.prompt?.kind) === "setup"
                      ? !!starterBindError(d.defId) || (setupStep === "companion" && id === setupActive)
                      : !!illegal && g.phase === "action"
                  }
                  playable={
                    String(g.prompt?.kind) === "setup"
                      ? !starterBindError(d.defId) && !(setupStep === "companion" && id === setupActive)
                      : !illegal && g.phase === "action"
                  }
                  selected={setupActive === id || setupComp === id || selectedHand === id}
                  badge={
                    setupComp === id ? "伴契" : setupActive === id || selectedHand === id ? "已选择" : undefined
                  }
                  onClick={() => inspectHand(id)}
                />
              </div>
            );
          })}
        </div>
        <div className="actions">
          {g.prompt?.kind === "choosePromote" && !p.companions.some(Boolean) && selectedHand && (
            <>
              <button
                className="primary"
                disabled={!!starterBindError(g.instances[selectedHand].defId)}
                onClick={() => commitUse(selectedHand)}
              >
                部署「{def(g.instances[selectedHand].defId).name}」为主契
              </button>
              <span className="whisper">单击手牌仅查看；确认后才会部署。</span>
            </>
          )}
          {String(g.prompt?.kind) === "setup" && setupStep === "active" && (
            <>
              <button
                className="primary"
                disabled={!setupActive}
                onClick={() => setupActive && setSetupStep("confirm")}
              >
                {!setupActive ? "请选择一张发亮的基础幻兽" : `绑定「${def(g.instances[setupActive].defId).name}」为主契`}
              </button>
              {setupActive && <span className="whisper">确认后，它会成为你本局最先出战的幻兽。</span>}
              {legalStarters.length >= 2 && (
                <button className="ghost" onClick={() => setShowCompare((v) => !v)}>
                  {showCompare ? "收起比较" : "比较候选"}
                </button>
              )}
            </>
          )}
          {String(g.prompt?.kind) === "setup" && setupStep === "confirm" && setupActive && (
            <>
              <div className="flow-title">选择「{def(g.instances[setupActive].defId).name}」作为主契？</div>
              <span className="whisper">{starterBrief(g.instances[setupActive].defId).confirmLine}</span>
              <button className="primary" onClick={finishMain}>
                确认选择
              </button>
              <button
                className="ghost"
                onClick={() => {
                  setSetupStep("active");
                  setShowCompare(true);
                }}
              >
                继续比较
              </button>
            </>
          )}
          {String(g.prompt?.kind) === "setup" && setupStep === "companion" && setupActive && (
            <>
              <button
                className="primary"
                disabled={!setupComp}
                onClick={() => dispatch({ type: "SETUP_CHOOSE", activeId: setupActive, companionId: setupComp })}
              >
                {setupComp ? `设置「${def(g.instances[setupComp].defId).name}」为伴契` : "点选另一张发亮的基础幻兽"}
              </button>
              <button
                className="ghost"
                onClick={() => dispatch({ type: "SETUP_CHOOSE", activeId: setupActive, companionId: null })}
              >
                暂不设置
              </button>
            </>
          )}
          {g.phase === "action" && g.activeSide === "player" && !g.prompt && (
            <>
              <div className="flow-title">行动阶段</div>
              <span className="whisper">可以使用手牌。准备完成后，进入战斗。</span>
              <button className="primary" onClick={() => dispatch({ type: "END_ACTION" })}>
                进入战斗
              </button>
              <button
                className="ghost"
                title={!p.companions.some(Boolean) ? "需要先部署至少 1 只伴契幻兽才能换位。" : "换位：选择一只伴契与主契交换。"}
                onClick={() => {
                  if (switchTeachReady(g) && !seen.switchReady) dismissHint("switchReady");
                  dispatch({ type: "OPEN_SWITCH" });
                }}
                disabled={p.usedNormalSwitch || !p.companions.some(Boolean)}
              >
                换位
              </button>
            </>
          )}
          {g.phase === "battle" && g.activeSide === "player" && !g.prompt && (
            <>
              <div className="flow-title">战斗阶段</div>
              {(() => {
                const sk = p.active ? battleSkillLabel(p.active.defId) : null;
                const why = canAttack(g, "player");
                return (
                  <>
                    <span className="whisper">
                      {p.active ? `现在操作「${def(p.active.defId).name}」。` : "没有主契。"}
                      {sk ? ` ${sk.detail}` : ""}
                    </span>
                    <button className="primary" onClick={() => dispatch({ type: "ATTACK" })} disabled={!!why}>
                      {sk ? sk.button : "发动战技"}
                    </button>
                    {why && <span className="whisper">{why}</span>}
                    <button className="ghost" onClick={() => dispatch({ type: "SKIP_BATTLE" })}>
                      跳过战斗
                    </button>
                  </>
                );
              })()}
            </>
          )}
          {g.phase === "closing" && g.activeSide === "player" && !g.prompt && (
            <>
              <div className="flow-title">战斗完成</div>
              <span className="whisper">结束本回合后，对手将开始行动。</span>
              <button className="primary" onClick={() => dispatch({ type: "END_TURN" })}>
                结束本回合
              </button>
            </>
          )}
          {g.activeSide === "ai" && <span className="whisper">对方仪轨</span>}
        </div>
        <div className="logline" onClick={() => setLogOpen((v) => !v)}>
          {lastLog ? lastLog.text : "—"}
        </div>
      </footer>

      {showCompare && String(g.prompt?.kind) === "setup" && legalStarters.length >= 2 && (
        <div className="compare-pop">
          <div className="flow-title">比较当前手牌中的候选</div>
          <table className="cmp">
            <thead>
              <tr>
                <th>幻兽</th>
                <th>♡</th>
                <th>部署◇</th>
                <th>战技◇</th>
                <th>风格</th>
              </tr>
            </thead>
            <tbody>
              {legalStarters.map((id) => {
                const b = starterBrief(g.instances[id].defId);
                return (
                  <tr key={id} className={setupActive === id ? "on" : ""}>
                    <td>{b.name}</td>
                    <td>{b.hp}</td>
                    <td>{b.deploy}</td>
                    <td>{b.skillCost}</td>
                    <td>{b.style}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="whisper">只比较当前手牌里可选的基础幻兽。没有单纯的最强。</p>
        </div>
      )}
      {floatHint && (
        <div className="hint-float">
          {floatHint.t}{" "}
          <button className="ghost" onClick={() => dismissHint(floatHint.k)}>
            知道了
          </button>
        </div>
      )}

      <FxLayer g={g} />
      {handoff && !toastGone && <div className="toast settle handoff">{handoff}</div>}
      {g.settleNote && !g.lastActionIllegal && !handoff && !toastGone && <div className="toast settle">{g.settleNote}</div>}
      {g.lastActionIllegal && <div className="toast">{g.lastActionIllegal}</div>}
      {inspect && !pendingPlay && !(g.prompt && String(g.prompt.kind) !== "setup" && g.promptSide === "player") && (
        <aside className="inspector" aria-label="卡牌详情">
          <p className="whisper">已选择 · 查看（尚未使用）</p>
          <CardView
            defId={inspect}
            size="inspect"
            showFeeLabel={!seen.feeLabel}
            g={g}
            typeHelp={typeAsk}
            onTypeAsk={() => {
              setTypeAsk((v) => !v);
              dismissHint(`type-${kindOf(inspect)}`);
            }}
          />
          {String(g.prompt?.kind) === "setup" && !starterBindError(inspect) && (
            <StarterAsActive defId={inspect} />
          )}
          {selectedHand && g.phase === "action" && g.activeSide === "player" && !g.prompt && (
            <div className="controls">
              <button className="primary" disabled={!!selectedIllegal} onClick={() => { dismissHint("feeLabel"); commitUse(selectedHand); }}>
                {useLabel(selectedHand)}
              </button>
              {selectedFee != null && (
                <p className="whisper">
                  {remainAfter != null && remainAfter >= 0
                    ? `消耗 ${selectedFee} 灵息 · 使用后剩余 ${remainAfter}`
                    : `需要 ${selectedFee} 灵息 · 当前只有 ${p.aether}`}
                </p>
              )}
              {selectedIllegal && selectedIllegal !== "此牌不在手中。" && <p className="whisper">{selectedIllegal}</p>}
              <button
                onClick={() => {
                  setSelectedHand(null);
                  setInspect(null);
                }}
              >
                取消选择
              </button>
            </div>
          )}
          {(!selectedHand || g.phase !== "action") && (
            <div className="controls">
              <button
                onClick={() => {
                  setInspect(null);
                }}
              >
                关闭
              </button>
            </div>
          )}
        </aside>
      )}
      {pendingPlay && (
        <div className="overlay">
          <div className="modal">
            <h3>{PRE_PLAY_TARGET[g.instances[pendingPlay].defId].reason}</h3>
            <p className="whisper">尚未扣费、尚未打出。选择目标后点确认才会使用。</p>
            <div className="pick-row">
              {[g.player.active, ...g.player.companions]
                .filter((e): e is NonNullable<typeof e> => {
                  if (!e) return false;
                  const f = PRE_PLAY_TARGET[g.instances[pendingPlay].defId].filter;
                  if (f === "friendlyEmber") return def(e.defId).sources.includes("ember");
                  return true;
                })
                .map((e) => (
                  <CardView
                    key={e.instanceId}
                    defId={e.defId}
                    e={e}
                    selected={pendingTarget === e.instanceId}
                    badge={pendingTarget === e.instanceId ? "已选择" : undefined}
                    onClick={() => setPendingTarget(e.instanceId)}
                  />
                ))}
            </div>
            <div className="controls">
              <button className="primary" disabled={!pendingTarget} onClick={confirmPendingPlay}>
                确认使用
              </button>
              <button onClick={cancelPendingPlay}>取消使用</button>
            </div>
          </div>
        </div>
      )}
      {g.prompt && String(g.prompt.kind) !== "setup" && g.promptSide === "player" && !pendingPlay && (
        <div className="overlay">
          <div className="modal">
            <PromptUI g={g} dispatch={dispatch} pick={promptTargetPick} setPick={setPromptTargetPick} />
          </div>
        </div>
      )}
      {g.winner && (
        <div className="overlay">
          <div className="modal win">
            <h2>{g.winner === "player" ? "契痕归你" : "夜色合拢"}</h2>
            <p>{g.winReason}</p>
            <button className="primary" onClick={() => dispatch({ type: "RESTART" })}>重新开始</button>
            <button className="ghost" onClick={() => dispatch({ type: "TO_MENU" })}>返回选牌</button>
          </div>
        </div>
      )}
      {logOpen && (
        <div className="chronicle-pop" onClick={() => setLogOpen(false)}>
          {g.log.slice().reverse().map((e) => (
            <p key={e.id}>{e.text}</p>
          ))}
        </div>
      )}
      {g.debug && <Debug g={g} dispatch={dispatch} />}
    </div>
  );
}

function StarterAsActive({ defId }: { defId: string }) {
  const b = starterBrief(defId);
  return (
    <div className="starter-brief">
      <div className="flow-title">作为开局主契</div>
      <p className="whisper">左上角 ◇ 是部署费用；技能旁的 ◇ 是发动该技能的费用。开局绑定不消耗部署灵息。</p>
      <ul>
        <li>♡ {b.hp} 生命：{b.hpLabel}</li>
        <li>◇ {b.deploy}：{b.deployLabel}</li>
        <li>
          战技「{b.skillName}」：{b.skillCost} 灵息 / {b.skillText}
        </li>
        <li>标签：{b.tags.join(" · ")}</li>
        <li>优点：{b.pro}</li>
        <li>缺点：{b.con}</li>
      </ul>
    </div>
  );
}

function PromptUI({
  g,
  dispatch,
  pick,
  setPick,
}: {
  g: GameState;
  dispatch: (a: any) => void;
  pick: string | null;
  setPick: (id: string | null) => void;
}) {
  const pr = g.prompt!;
  if (pr.kind === "target") {
    const pool = [g.player.active, ...g.player.companions].filter((e) => {
      if (!e) return false;
      if (pr.filter === "friendlyEmber") return def(e.defId).sources.includes("ember");
      return true;
    });
    return (
      <>
        <h3>{pr.reason}</h3>
        <p className="whisper">先点选目标，再确认。此效果已开始结算，不能撤回用牌。</p>
        <div className="pick-row">
          {pool.map((e) => (
            <CardView
              key={e!.instanceId}
              defId={e!.defId}
              e={e}
              selected={pick === e!.instanceId}
              badge={pick === e!.instanceId ? "已选择" : undefined}
              onClick={() => setPick(e!.instanceId)}
            />
          ))}
        </div>
        <div className="controls">
          <button
            className="primary"
            disabled={!pick}
            onClick={() => {
              if (!pick) return;
              dispatch({ type: "CONFIRM_TARGET", instanceId: pick });
              setPick(null);
            }}
          >
            确认目标
          </button>
        </div>
      </>
    );
  }
  if (pr.kind === "rearrange") {
    return <Rearrange g={g} cards={pr.cards} title={pr.title} dispatch={dispatch} />;
  }
  if (pr.kind === "pickFromLook") {
    return (
      <>
        <h3>{pr.title}</h3>
        <div className="pick-row">
          {pr.cards.map((id) => (
            <CardView key={id} defId={g.instances[id].defId} onClick={() => dispatch({ type: "CONFIRM_PICK", instanceId: id })} />
          ))}
        </div>
        <div className="controls">
          {pr.allowSkip !== false && (
            <button onClick={() => dispatch({ type: "CONFIRM_PICK", instanceId: "__skip__" })}>跳过</button>
          )}
        </div>
      </>
    );
  }
  if (pr.kind === "opponentTop") {
    return (
      <>
        <h3>双星凝视 — 对方牌库顶</h3>
        <CardView defId={g.instances[pr.cardId].defId} />
        <div className="controls">
          <button onClick={() => dispatch({ type: "OPPONENT_TOP", place: "top" })}>留在牌顶</button>
          <button onClick={() => dispatch({ type: "OPPONENT_TOP", place: "bottom" })}>置于牌底</button>
        </div>
      </>
    );
  }
  if (pr.kind === "optionalSelfDmg") {
    return (
      <>
        <h3>是否承受 10 点自伤以获得 1 点临时灵息？</h3>
        <div className="controls">
          <button onClick={() => dispatch({ type: "OPTIONAL_YES" })}>是</button>
          <button onClick={() => dispatch({ type: "OPTIONAL_NO" })}>否</button>
        </div>
      </>
    );
  }
  if (pr.kind === "optionalDiscard" || pr.kind === "pickHand") {
    const cards = pr.kind === "pickHand" ? g.player.hand : pr.cards;
    return (
      <>
        <h3>{pr.kind === "pickHand" ? pr.title : "可选：点选一张手牌弃置（或放弃）"}</h3>
        <div className="pick-row">
          {cards.map((id) => (
            <CardView key={id} defId={g.instances[id].defId} onClick={() => dispatch({ type: "PICK_HAND", instanceId: id })} />
          ))}
        </div>
        {pr.kind === "optionalDiscard" && (
          <div className="controls">
            <button onClick={() => dispatch({ type: "OPTIONAL_NO" })}>放弃</button>
          </div>
        )}
      </>
    );
  }
  if (pr.kind === "optionalDiscardEmber") {
    return (
      <>
        <h3>可选：将一张烬源牌洗回牌库以加深伤害</h3>
        <div className="pick-row">
          {pr.cards.map((id) => (
            <CardView key={id} defId={g.instances[id].defId} onClick={() => dispatch({ type: "PICK_HAND", instanceId: id })} />
          ))}
        </div>
        <div className="controls">
          <button onClick={() => dispatch({ type: "OPTIONAL_NO" })}>放弃</button>
        </div>
      </>
    );
  }
  if (pr.kind === "chooseSwitch" || pr.kind === "choosePromote") {
    return (
      <>
        <h3>{pr.kind === "choosePromote" ? "选择进入主契位的伴契幻兽" : "换位"}</h3>
        {pr.kind === "chooseSwitch" && (
          <p className="whisper">
            选择一只伴契幻兽，与当前主契交换位置。换上来的将成为新的主契。普通换位每回合最多 1 次，通常消耗 1 灵息。
          </p>
        )}
        <div className="pick-row">
          {g.player.companions.map((c, i) =>
            c ? (
              <CardView
                key={c.instanceId}
                defId={c.defId}
                e={c}
                onClick={() =>
                  dispatch(
                    pr.kind === "choosePromote"
                      ? { type: "PROMOTE", companionIndex: i }
                      : { type: "SWITCH", companionIndex: i, free: pr.free }
                  )
                }
              />
            ) : null
          )}
        </div>
        {pr.kind === "choosePromote" && !g.player.companions.some(Boolean) && <p>请从手牌点选一张基础幻兽作为新的主契。</p>}
        {pr.kind === "chooseSwitch" && pr.optional && (
          <div className="controls">
            <button onClick={() => dispatch({ type: "CANCEL_PROMPT" })}>不换位</button>
          </div>
        )}
      </>
    );
  }
  if (pr.kind === "orderBottom") {
    return <BottomOrder g={g} cards={pr.cards} dispatch={dispatch} />;
  }
  return <p>…</p>;
}

function Rearrange(props: { g: GameState; cards: string[]; title: string; dispatch: (a: any) => void }) {
  const { g, cards, title, dispatch } = props;
  const [order, setOrder] = useState(cards);
  const one = order.length <= 1;
  return (
    <>
      <h3>{title}</h3>
      <p className="whisper">{lookPurpose(title)}</p>
      {one ? (
        <p className="whisper">只有 1 张。抽牌 = 从牌库抽 1 张加入手牌。它会成为下一次抽到的牌。</p>
      ) : (
        <p className="whisper">点选相邻两张可交换。「下一次抽到」的牌会在下一次抽牌时入手。</p>
      )}
      <div className="pick-row">
        {order.map((id, i) => (
          <div key={id}>
            <span className="ord-tag">{i === 0 ? "下一张" : i === 1 ? "第二张" : `第${i + 1}张`}</span>
            <CardView
              defId={g.instances[id].defId}
              onClick={() => {
                if (one) return;
                const next = [...order];
                const j = (i + 1) % next.length;
                [next[i], next[j]] = [next[j], next[i]];
                setOrder(next);
              }}
            />
          </div>
        ))}
      </div>
      <div className="controls">
        <button onClick={() => dispatch({ type: "CONFIRM_REARRANGE", order })}>{one ? "确认" : "确认顺序"}</button>
      </div>
    </>
  );
}

function BottomOrder(props: { g: GameState; cards: string[]; dispatch: (a: any) => void }) {
  const { g, cards, dispatch } = props;
  const [order, setOrder] = useState(cards);
  return (
    <>
      <h3>排列置于牌底的卡牌</h3>
      <div className="pick-row">
        {order.map((id, i) => (
          <CardView
            key={id}
            defId={g.instances[id].defId}
            onClick={() => {
              const next = [...order];
              if (i > 0) [next[i - 1], next[i]] = [next[i], next[i - 1]];
              setOrder(next);
            }}
          />
        ))}
      </div>
      <button className="begin" onClick={() => dispatch({ type: "ORDER_BOTTOM", order })}>
        确认
      </button>
    </>
  );
}

function FxLayer({ g }: { g: GameState }) {
  const last = g.fx.slice(-4);
  if (!last.length) return null;
  return (
    <div className="fx-layer" aria-hidden>
      {last.map((f) => (
        <div key={f.id} className={`fx fx-${f.kind} fx-${f.side}`}>
          {f.text}
        </div>
      ))}
    </div>
  );
}

function Debug({ g, dispatch }: { g: GameState; dispatch: (a: any) => void }) {
  const [id, setId] = useState("moss_sleep");
  const p = g.player;
  return (
    <div className="debug">
      <div>turn {g.turn} · {g.activeSide} · {g.phase}</div>
      <div>aether {p.aether}/{p.aetherMax} tempGen {p.tempAetherGenerated}</div>
      <div>deck {p.library.length} hand {p.hand.length} discard {p.discard.length}</div>
      <div>heal {p.totalHealing} self {p.totalSelfDamage} look {p.deckTopViewed}</div>
      <div>switches {p.switchesBattle} marks {p.covenant}</div>
      <button onClick={() => dispatch({ type: "DEBUG", cmd: "draw" })}>Draw</button>
      <button onClick={() => dispatch({ type: "DEBUG", cmd: "aether" })}>+Aether</button>
      <button onClick={() => dispatch({ type: "DEBUG", cmd: "turn" })}>Advance</button>
      <div>
        <input value={id} onChange={(e) => setId(e.target.value)} style={{ width: 120, background: "#111", color: "#ddd", border: "1px solid #444" }} />
        <button onClick={() => dispatch({ type: "DEBUG", cmd: "hand", payload: id })}>Add</button>
      </div>
    </div>
  );
}
