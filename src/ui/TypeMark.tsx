import type { KindKey } from "./terms";
import { typeInfo, useLanguage } from "./i18n";

function Glyph({ k }: { k: KindKey }) { const c = "currentColor";
  if (k === "eidolon") return <svg viewBox="0 0 16 16" className="tmark-svg" aria-hidden><circle cx="8" cy="8" r="5.2" fill="none" stroke={c} strokeWidth="1.2" /><circle cx="8" cy="8" r="1.4" fill={c} /></svg>;
  if (k === "spell" || k === "traveler") return <svg viewBox="0 0 16 16" className="tmark-svg" aria-hidden><path d="M8 1.8 L9.4 6.2 L14 8 L9.4 9.8 L8 14.2 L6.6 9.8 L2 8 L6.6 6.2 Z" fill="none" stroke={c} strokeWidth="1.1" /></svg>;
  if (k === "relic") return <svg viewBox="0 0 16 16" className="tmark-svg" aria-hidden><rect x="4" y="3" width="8" height="10" rx="1" fill="none" stroke={c} strokeWidth="1.2" /><path d="M6 6.5h4M6 9.5h4" stroke={c} strokeWidth="1" /></svg>;
  if (k === "environment") return <svg viewBox="0 0 16 16" className="tmark-svg" aria-hidden><path d="M2 12 L6 6 L9 10 L11 7 L14 12 Z" fill="none" stroke={c} strokeWidth="1.15" /><circle cx="11.5" cy="4.2" r="1.2" fill="none" stroke={c} strokeWidth="1" /></svg>;
  return <svg viewBox="0 0 16 16" className="tmark-svg" aria-hidden><circle cx="6.2" cy="8" r="3.2" fill="none" stroke={c} strokeWidth="1.15" /><circle cx="9.8" cy="8" r="3.2" fill="none" stroke={c} strokeWidth="1.15" /></svg>;
}
export function TypeMark({ kind, compact, iconOnly, showHelp, onAsk }: { kind: KindKey; compact?: boolean; iconOnly?: boolean; showHelp?: boolean; onAsk?: () => void }) {
 const { locale } = useLanguage(); const info = typeInfo(kind, locale);
 return <span className={`tmark ${compact ? "sm" : ""}`} title={`${info.label}: ${info.help}`}><Glyph k={kind} />{!iconOnly && <span>{info.label}</span>}{!compact && <span className="ask" role="button" tabIndex={0} onClick={(ev) => { ev.stopPropagation(); onAsk?.(); }} aria-label={locale === "en" ? "Type help" : "类型说明"}>?</span>}{showHelp && <em className="thelp">{info.help}</em>}</span>;
}
