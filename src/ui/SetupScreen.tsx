import { def, starterBindError } from "../cards/definitions";
import type { GameState } from "../types";
import { CardView } from "./CardView";
import { groupStarterInstances, starterBrief } from "./starterBrief";
import { cardName, cardText, skillName, skillText, starterNarrative, starterTag, useLanguage } from "./i18n";

export function SetupScreen({
  g,
  setupActive,
  setupComp,
  setupStep,
  showCompare,
  showFull,
  onPick,
  onBind,
  onConfirm,
  onBackCompare,
  onSkipComp,
  onConfirmComp,
  onToggleCompare,
  onToggleFull,
}: {
  g: GameState;
  setupActive: string | null;
  setupComp: string | null;
  setupStep: "active" | "confirm" | "companion";
  showCompare: boolean;
  showFull: boolean;
  onPick: (id: string) => void;
  onBind: () => void;
  onConfirm: () => void;
  onBackCompare: () => void;
  onSkipComp: () => void;
  onConfirmComp: () => void;
  onToggleCompare: () => void;
  onToggleFull: () => void;
}) {
  const { locale, setLocale } = useLanguage();
  const en = locale === "en";
  const legal = g.player.hand.filter((id) => !starterBindError(g.instances[id].defId));
  const other = g.player.hand.filter((id) => starterBindError(g.instances[id].defId));
  const focusId = setupStep === "companion" ? setupComp : setupActive;
  const brief = focusId ? starterBrief(g.instances[focusId].defId) : null;
  const narrative = brief && focusId ? starterNarrative(g.instances[focusId].defId, brief, locale) : null;
  const pickingComp = setupStep === "companion";
  const rawPool = pickingComp ? legal.filter((id) => id !== setupActive) : legal;
  const groups = groupStarterInstances(rawPool, (id) => g.instances[id].defId);
  const uniqueDefs = groups.length;
  const fullDefId = setupActive ? g.instances[setupActive].defId : brief ? groups.find((x) => x.ids.includes(focusId!))?.defId : null;

  return (
    <div className="rite">
      <header className="rite-head">
        <div className="language-switch" role="group" aria-label="Language / 语言">
          <button className={locale === "en" ? "active" : ""} type="button" onClick={() => setLocale("en")} aria-pressed={locale === "en"}>EN</button>
          <span aria-hidden>⌁</span>
          <button className={locale === "zh" ? "active" : ""} type="button" onClick={() => setLocale("zh")} aria-pressed={locale === "zh"}>中</button>
        </div>
        <div className="brand-mini">ELARIS</div>
        <h1>{pickingComp ? (en ? "Optional · Set a Companion" : "可选 · 设置一只伴契") : (en ? "Choose your Active Eidolon" : "选择你的主契幻兽")}</h1>
        <p className="rite-lead">{pickingComp ? (en ? "Companions wait behind you and can later switch into the active slot." : "伴契在后方待命，之后可通过换位成为主契。") : (en ? "Your active Eidolon fights now and usually uses attack skills." : "主契是当前出战、通常负责发动战技的幻兽。")}</p>
        {!pickingComp && (
          <>
            <p className="rite-keys">{en ? "♡ Health = damage it can take     ◇ Deploy cost = Aether needed to deploy it from hand later" : "♡ 生命 = 能承受多少伤害　　◇ 部署费 = 之后从手牌部署时需要的灵息"}</p>
            <p className="rite-note">{en ? "Binding your opening Eidolon costs no deploy Aether." : "开局绑定主契不消耗部署灵息。"}</p>
            {uniqueDefs === 1 && groups[0].ids.length > 1 && (
              <p className="rite-note">
                本次开局可选主契：{starterBrief(groups[0].defId).name} ×{groups[0].ids.length}
              </p>
            )}
          </>
        )}
      </header>

      <section className="rite-stage">
        {groups.map((grp) => {
          const b = starterBrief(grp.defId);
          const d = def(grp.defId);
          const on = focusId != null && grp.ids.includes(focusId);
          return (
            <div key={grp.defId} className={`rite-cand ${on ? "on" : ""}`} onClick={() => onPick(grp.pick)}>
              <CardView defId={grp.defId} size="lg" selected={on} onClick={() => onPick(grp.pick)} />
              <div className="rite-meta">
                <strong>
                  {cardName(d, locale)}
                  {grp.ids.length > 1 ? ` ×${grp.ids.length}` : ""}
                </strong>
                <span>
                  ♡ {b.hp}　◇ {b.deploy}
                </span>
                <span>
                  {d.skill ? skillName(d.skill, d.id, locale) : "—"} · ◇{b.skillCost}
                </span>
                <span>{d.skill ? `${skillText(d.skill, d.id, locale).split(locale === "en" ? "." : "。")[0]}${locale === "en" ? "…" : "…"}` : ""}</span>
                <em>{b.tags.map((tag) => starterTag(tag, locale)).join(" / ")}</em>
              </div>
            </div>
          );
        })}
      </section>

      {brief && setupStep !== "companion" && (
        <aside className="rite-sum">
          <h2>{en ? def(g.instances[focusId!].defId).nameEn : brief.name}</h2>
          <p>
            ♡ {brief.hp} · {en ? "Health" : brief.hpLabel}
            <br />
            {en ? "Deploy cost" : "部署费"} ◇{brief.deploy} · {en ? "Aether" : brief.deployLabel}
          </p>
          <p>
            <b>{en ? "Skill" : "战技"}</b>
            <br />
            {def(g.instances[focusId!].defId).skill ? skillName(def(g.instances[focusId!].defId).skill!, def(g.instances[focusId!].defId).id, locale) : brief.skillName} · ◇{brief.skillCost}
            <br />
            {def(g.instances[focusId!].defId).skill ? skillText(def(g.instances[focusId!].defId).skill!, def(g.instances[focusId!].defId).id, locale) : brief.skillText}
          </p>
          {brief.keyAbility && (
            <p>
              <b>{en ? "Key ability" : "关键能力"}</b>
              <br />
              {cardText(def(g.instances[focusId!].defId), locale)}
            </p>
          )}
          <p>
            <b>{en ? "Playstyle" : "玩法"}</b>
            <br />
            {narrative?.pro}
          </p>
          <p>
            <b>{en ? "Trade-off" : "取舍"}</b>
            <br />
            {narrative?.con}
          </p>
          {setupStep === "confirm" ? (
            <div className="rite-acts">
              <button className="primary" onClick={onConfirm}>
                {en ? "CONFIRM" : "确认选择"}
              </button>
              {uniqueDefs >= 2 && (
                <button className="ghost" onClick={onBackCompare}>
                  {en ? "COMPARE AGAIN" : "继续比较"}
                </button>
              )}
            </div>
          ) : (
            <div className="rite-acts">
              <button className="primary" onClick={onBind}>
                选择{brief.name}
              </button>
              <button className="ghost" onClick={onToggleFull}>
                {showFull ? "收起完整卡牌" : "查看完整卡牌"}
              </button>
            </div>
          )}
        </aside>
      )}
      {showFull && (fullDefId || setupActive) && (
        <div className="rite-detail" role="dialog" aria-label="完整卡牌">
          <div className="rite-detail-card" onClick={(e) => e.stopPropagation()}>
            <p className="whisper">完整卡牌 · 仅查看，不会绑定或改变对局</p>
            <CardView defId={fullDefId || g.instances[setupActive!].defId} size="inspect" showFeeLabel typeHelp />
            <div className="rite-acts">
              <button className="primary" type="button" onClick={onToggleFull}>
                返回主契选择
              </button>
              <button className="ghost" type="button" onClick={onToggleFull} aria-label="关闭">
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {pickingComp && (
        <div className="rite-acts center">
          <button className="primary" disabled={!setupComp} onClick={onConfirmComp}>
            {setupComp ? `设置「${def(g.instances[setupComp].defId).name}」为伴契` : "点选一只伴契，或暂不设置"}
          </button>
          <button className="ghost" onClick={onSkipComp}>
            暂不设置
          </button>
        </div>
      )}

      {!pickingComp && uniqueDefs >= 2 && (
        <div className="rite-cmp-wrap">
          <button className="ghost" onClick={onToggleCompare}>
            {showCompare ? "收起比较" : "比较候选"}
          </button>
          {showCompare && (
            <div className="rite-cmp">
              {groups.map((grp) => {
                const b = starterBrief(grp.defId);
                const on = focusId != null && grp.ids.includes(focusId);
                return (
                  <button key={grp.defId} type="button" className={on ? "on" : ""} onClick={() => onPick(grp.pick)}>
                    {b.name}
                    {grp.ids.length > 1 ? ` ×${grp.ids.length}` : ""}　♡{b.hp}　◇{b.deploy}　{b.skillBite}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {other.length > 0 && (
        <footer className="rite-rest">
          <span>其他手牌</span>
          <div>
            {other.map((id) => (
              <CardView key={id} defId={g.instances[id].defId} size="sm" dim onClick={() => onPick(id)} />
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
