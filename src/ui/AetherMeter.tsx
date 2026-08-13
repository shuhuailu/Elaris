export function AetherMeter({
  aether,
  max,
  tempGen,
}: {
  aether: number;
  max: number;
  tempGen: number;
}) {
  const tempNow = Math.max(0, aether - max);
  const permNow = Math.min(aether, max);
  return (
    <div className="aether-meter" title={tempNow || tempGen ? "临时灵息仅本回合可使用，回合结束时消失。" : "使用卡牌与战技需要消耗灵息。"}>
      <div className="aether-label">灵息</div>
      <div className="aether-pips" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`apip ${i < permNow ? "on" : ""}`}>
            {i < permNow ? "◆" : "◇"}
          </span>
        ))}
        {Array.from({ length: tempNow }, (_, i) => (
          <span key={`t${i}`} className="apip temp">
            ✦
          </span>
        ))}
      </div>
      <div className="aether-nums">
        {tempNow ? `${permNow} +${tempNow} / ${max}` : `${aether} / ${max}`}
      </div>
    </div>
  );
}
