import { def } from "../cards/definitions";
import type { BoardEidolon, GameState } from "../types";
import { TypeMark } from "./TypeMark";
import { INITIAL_ARRIVAL_HELP } from "../cards/definitions";
import { kindOf, resonanceExplain } from "./terms";
import { cardName, cardText, rarityLabel, resonanceText, skillName, skillText, sourceLabel, typeInfo, ui, useLanguage } from "./i18n";

export function CardView({ defId, size = "sm", e, onClick, dim, playable, selected, badge, showFeeLabel, g, typeHelp, onTypeAsk }: {
  defId: string; size?: "sm" | "lg" | "inspect" | "hand"; e?: BoardEidolon | null; onClick?: () => void; dim?: boolean; playable?: boolean; selected?: boolean; badge?: string; showFeeLabel?: boolean; g?: GameState; typeHelp?: boolean; onTypeAsk?: () => void;
}) {
  const { locale } = useLanguage();
  const words = ui(locale);
  const d = def(defId), fee = d.resonanceFrom ? d.resonanceCost : d.cost, kind = kindOf(defId), res = resonanceExplain(defId, g);
  const cls = `card ${size} ${dim ? "dim" : ""} ${playable ? "playable" : ""} ${selected ? "selected" : ""} ${kind === "resonance" ? "is-res" : ""}`;
  const status = e?.initialArrival ? words.initialArrival : kind === "resonance" ? words.resonanceForm : "";
  const Tag = size === "inspect" ? "div" : "button";
  return <Tag className={cls} onClick={onClick} {...(size === "inspect" ? {} : { type: "button" })}>
    {badge && <span className="sel-label">{badge}</span>}
    <div className={`art art-${d.artKind}`}>
      <div className="motif" />
      <div className="cost-pip" title={words.cost}>◇{fee}</div>
      {(e || d.hp) && <div className="hp-pip" title={words.health}>♡{e ? e.hp : d.hp}</div>}
      <span className="type-pip" title={status || undefined}><TypeMark kind={kind} compact iconOnly /></span>
    </div>
    <div className="body">
      <p className="cname">{cardName(d, locale)}</p>
      {size === "inspect" ? <>
        <div className="meta"><TypeMark kind={kind} showHelp={typeHelp} onAsk={onTypeAsk} /> · {d.sources.map((s) => sourceLabel(s, locale)).join(" / ")}</div>
        <div className="meta">{showFeeLabel ? `${words.cost}: ◇ ${fee}` : `◇ ${fee}`}{d.hp ? ` · ♡ ${e ? e.hp : d.hp}` : ""}</div>
        {res && <p className="skill">{words.source}: {locale === "en" ? (def(d.resonanceFrom!).nameEn) : res.source}<br />{words.resonanceCondition}: {resonanceText(d, locale) ?? res.cond}{res.progress && <><br />{words.progress}: {res.progress}</>}</p>}
        {d.skill && <p className="skill">{skillName(d.skill, d.id, locale)} · ◇{d.skill.cost} — {skillText(d.skill, d.id, locale)}</p>}
        <p className="skill" style={{ marginTop: 8 }}>{cardText(d, locale)}</p>
        <span className="rarity">{rarityLabel(d.rarity, locale)}</span>
      </> : <div className="meta">{status || typeInfo(kind, locale).label}</div>}
    </div>
  </Tag>;
}
