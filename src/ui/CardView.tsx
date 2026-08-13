import { RARITY_LABEL, SOURCE_LABEL, def } from "../cards/definitions";
import type { BoardEidolon, GameState } from "../types";
import { TypeMark } from "./TypeMark";
import { INITIAL_ARRIVAL_HELP } from "../cards/definitions";
import { TYPE_HELP, kindOf, resonanceExplain } from "./terms";

export function CardView({
  defId,
  size = "sm",
  e,
  onClick,
  dim,
  playable,
  selected,
  badge,
  showFeeLabel,
  g,
  typeHelp,
  onTypeAsk,
}: {
  defId: string;
  size?: "sm" | "lg" | "inspect" | "hand";
  e?: BoardEidolon | null;
  onClick?: () => void;
  dim?: boolean;
  playable?: boolean;
  selected?: boolean;
  badge?: string;
  showFeeLabel?: boolean;
  g?: GameState;
  typeHelp?: boolean;
  onTypeAsk?: () => void;
}) {
  const d = def(defId);
  const fee = d.resonanceFrom ? d.resonanceCost : d.cost;
  const kind = kindOf(defId);
  const res = resonanceExplain(defId, g);
  const cls = `card ${size} ${dim ? "dim" : ""} ${playable ? "playable" : ""} ${selected ? "selected" : ""} ${kind === "resonance" ? "is-res" : ""}`;
  const status = e?.initialArrival ? "初临" : kind === "resonance" ? "共鸣形态" : "";
  const statusTitle = e?.initialArrival ? INITIAL_ARRIVAL_HELP : undefined;
  const Tag = size === "inspect" ? "div" : "button";
  return (
    <Tag className={cls} onClick={onClick} {...(size === "inspect" ? {} : { type: "button" })}>
      {badge && <span className="sel-label">{badge}</span>}
      <div className={`art art-${d.artKind}`}>
        <div className="motif" />
        <div className="cost-pip" title="灵息费用">
          ◇{fee}
        </div>
        {(e || d.hp) && (
          <div className="hp-pip" title="生命">
            ♡{e ? e.hp : d.hp}
          </div>
        )}
        <span className="type-pip" title={kind === "resonance" ? "共鸣形态" : undefined}>
          <TypeMark kind={kind} compact iconOnly />
        </span>
      </div>
      <div className="body">
        <p className="cname">{d.name}</p>
        {size === "inspect" ? (
          <>
            <div className="meta">{d.nameEn}</div>
            <div className="meta">
              <TypeMark kind={kind} showHelp={typeHelp} onAsk={onTypeAsk} /> · {d.sources.map((s) => SOURCE_LABEL[s]).join(" / ")}
            </div>
            <div className="meta">
              {showFeeLabel ? `灵息费用：◇ ${fee}` : `◇ ${fee}`}
              {d.hp ? ` · ♡ ${e ? e.hp : d.hp}` : ""}
            </div>
            {res && (
              <p className="skill">
                来源：{res.source}
                <br />
                共鸣条件：{res.cond}
                {res.progress ? (
                  <>
                    <br />
                    {res.progress}
                  </>
                ) : null}
              </p>
            )}
            {d.skill && (
              <p className="skill">
                {d.skill.name} · ◇{d.skill.cost} — {d.skill.text}
              </p>
            )}
            <p className="skill" style={{ marginTop: 8 }}>
              {d.text}
            </p>
            <span className="rarity">{RARITY_LABEL[d.rarity]}</span>
          </>
        ) : (
          <div className="meta">{status || TYPE_HELP[kind].label}</div>
        )}
      </div>
    </Tag>
  );
}
