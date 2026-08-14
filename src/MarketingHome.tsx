import { useState } from "react";
import type { DeckId } from "./types";
import { useLanguage } from "./ui/i18n";
import heroBackground from "./assets/leather-hero-full.png";
import marketingStyles from "./landing.css?raw";

type Rarity = "common" | "uncommon" | "rare" | "legendary";
type Character = { name: string; title: string; house: string; rarity: Rarity; power: number; guile: number; vitality: number; locked?: boolean };
const characters: Character[] = [
  { name: "MORWENNA", title: "THE ASHEN ORACLE", house: "THE ASH", rarity: "legendary", power: 7, guile: 4, vitality: 6 },
  { name: "VESSEL", title: "OF THE NINTH HOUR", house: "THE HOLLOW", rarity: "legendary", power: 8, guile: 5, vitality: 6 },
  { name: "CRYSTALWING", title: "GRYPHON", house: "THE SIDEREAL", rarity: "rare", power: 6, guile: 3, vitality: 7 },
  { name: "FROSTBITE", title: "YETI", house: "THE UNBOUND", rarity: "common", power: 5, guile: 2, vitality: 8 },
  { name: "VOIDSHADOW", title: "SPECTER", house: "THE HOLLOW", rarity: "uncommon", power: 4, guile: 7, vitality: 3 },
  { name: "VALKYR", title: "THE CURSED", house: "THE ASH", rarity: "rare", power: 7, guile: 5, vitality: 4 },
];
const seals: { rarity: Rarity; label: string; rate: string; desc: string }[] = [
  { rarity: "common", label: "COMMON", rate: "1 IN 2", desc: "The first souls to answer." },
  { rarity: "uncommon", label: "UNCOMMON", rate: "1 IN 8", desc: "Unusual wills, hard to bind." },
  { rarity: "rare", label: "RARE", rate: "1 IN 40", desc: "Names remembered by the void." },
  { rarity: "legendary", label: "LEGENDARY", rate: "1 IN 240", desc: "The oldest pacts still burn." },
];

function Card({ c, back = false, small = false }: { c: Character; back?: boolean; small?: boolean }) {
  return <article className={`m-card ${c.rarity} ${small ? "small" : ""} ${c.locked ? "locked" : ""}`} aria-label={c.locked ? `${c.name}, locked` : `${c.name}, ${c.rarity}`}>
    <div className="m-card-inner">{back ? <><div className="filigree">◉</div><span className="back-title">ELARIS</span></> : <><div className="rarity-tab">{c.rarity}</div><div className="m-art"><span>✧</span></div><div className="m-card-copy"><h3>{c.name}</h3><p>{c.title}</p><i>{c.house}</i></div><div className="medal left">{c.power}</div><div className="medal right">{c.vitality}</div>{c.locked && <div className="lock" aria-label="Locked">⌑</div>}</>}</div>
  </article>;
}
function Pips({ value }: { value: number }) { return <span className="pips">{Array.from({ length: 10 }, (_, i) => <b key={i} className={i < value ? "on" : ""} />)}</span>; }

export function MarketingHome({ onPlay, onDeck }: { onPlay: () => void; onDeck: (deck: DeckId) => void }) {
 const { locale, setLocale } = useLanguage(); const en = locale === "en"; const [featured, setFeatured] = useState(0); const [signed, setSigned] = useState(false); const f = characters[featured % 3];
 const t = (a: string, b: string) => en ? a : b;
 return <div className="marketing"><style>{marketingStyles}</style>
  <header className="m-nav"><a className="m-logo" href="#top"><span>◉</span> ELARIS</a><nav><a href="#how">{t("HOW TO PLAY","玩法")}</a><a href="#collection">{t("COLLECTION","收藏")}</a><a href="#lore">{t("LORE","世界观")}</a><a href="#community">{t("COMMUNITY","社区")}</a></nav><div className="m-nav-actions"><div className="m-lang" role="group"><button className={en ? "active" : ""} onClick={() => setLocale("en")}>EN</button><button className={!en ? "active" : ""} onClick={() => setLocale("zh")}>中</button></div><button className="outline">{t("LOG IN","登录")}</button><button className="gold-button" onClick={onPlay}>{t("PLAY NOW","立即开始")}</button></div></header>
  <main id="top">
   <section className="m-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(5,5,5,.04) 0%, rgba(5,5,5,0) 62%), url(${heroBackground})` }}><div className="hero-book"><div className="book-sigil">◉</div><p className="label">{t("A GAME OF COLLECTED SOULS","契约灵魂的收藏卡牌游戏")}</p><h1>ELARIS</h1><h2>{t("SUMMON THE FORGOTTEN","唤醒遗忘之灵")}</h2><hr/><p className="hero-body">{t("Harness ancient legends, command the shadows, and conquer the void. Build your deck from 120 unique souls across four rarities.","驾驭古老传说，指引暗影，并征服虚空。在四种稀有度的 120 个灵魂中构筑你的牌组。")}</p><div className="hero-cta"><button className="gold-button" onClick={onPlay}>{t("BEGIN","开始")}</button><a className="outline" href="#collection">{t("VIEW THE CODEX","查看法典")}</a></div><small>120 {t("CHARACTERS. 4 RARITIES.","名角色 · 4 个稀有度")}</small></div><div className="card-wall" aria-hidden="true">{Array.from({length:30},(_,i)=><Card key={i} c={characters[i%characters.length]} back={[1,4,8,12,15,20,25,28].includes(i)} small />)}</div></section>
   <section className="section seals"><p className="label">{t("THE FOUR SEALS","四道封印")}</p><h2>{t("EVERY SOUL LEAVES A MARK","每个灵魂都留下印记")}</h2><div className="seal-row">{seals.map(s=><div className="seal" key={s.rarity}><Card c={{...characters[0],rarity:s.rarity}} back /><h3>{s.label}</h3><p>{t(s.desc,"等待被召唤的灵魂。")}</p><code>{s.rate}</code></div>)}</div></section>
   <section id="how" className="section pillars"><div><span>⌁</span><h2>{t("COLLECT","收集")}</h2><p>{t("Find the forgotten names. Each soul carries a different pact.","寻找被遗忘的名字。每个灵魂都携带不同的契约。")}</p></div><div><span>⚔</span><h2>{t("BATTLE","对决")}</h2><p>{t("Build your covenant and test it in tactical card duels.","构筑你的契约，在策略卡牌对决中证明它。")}</p></div><div><span>✦</span><h2>{t("ASCEND","升华")}</h2><p>{t("Unseal rarer forms and let familiar souls become legends.","解开更稀有的形态，让熟悉的灵魂成为传说。")}</p></div></section>
   <section className="section featured"><div className="featured-card"><Card c={f}/></div><div className="featured-copy"><p className="label">{t("FEATURED LEGENDARY","本周传奇")}</p><h2>{f.name}</h2><h3>{f.title}</h3><code>{f.house} · {f.rarity.toUpperCase()}</code><hr/><div className="stat"><span>{t("POWER","力量")}</span><Pips value={f.power}/></div><div className="stat"><span>{t("GUILE","谋略")}</span><Pips value={f.guile}/></div><div className="stat"><span>{t("VITALITY","生命")}</span><Pips value={f.vitality}/></div><div className="ability"><b>{t("ABILITY","能力")}</b><p>{t("The oldest oath is never broken. Once each turn, return a bound soul from the edge of defeat.","最古老的誓言永不破碎。每回合一次，让一个濒临溃散的契约灵魂重返战场。")}</p></div><a href="#collection">{t("VIEW IN CODEX","在法典中查看")} →</a><div className="feature-dots">{[0,1,2].map(n=><button key={n} className={n===featured?"active":""} onClick={()=>setFeatured(n)} aria-label={`Feature ${n+1}`}/>)}</div></div></section>
   <section id="collection" className="section collection"><div className="collection-head"><div><p className="label">{t("THE CODEX REMEMBERS","法典仍在铭记")}</p><h2>{t("A LIBRARY OF BOUND SOULS","被束缚灵魂的典藏")}</h2></div><div><code>34 / 120</code><div className="progress"><i/></div></div></div><div className="collection-grid">{Array.from({length:12},(_,i)=><Card key={i} c={{...characters[i%characters.length],locked:[1,4,8,10].includes(i)}} small />)}</div><button className="outline">{t("EXPLORE THE FULL CODEX","探索完整法典")}</button></section>
   <section id="lore" className="lore-strip"><span>◉</span><blockquote>“{t("Every soul that was ever bound is still bound. The deck simply chose to forget.","每一个曾被束缚的灵魂依然被束缚。只是牌组选择了遗忘。")}”</blockquote><code>— {t("THE FIRST SCRIBE","初代抄写员")}</code></section>
   <section id="community" className="section signup"><p className="label">{t("JOIN THE SUMMONING","加入召唤")}</p><h2>{t("THE NEXT SOUL IS WAITING","下一个灵魂正在等待")}</h2><p>{t("Receive new revelations, codex entries, and first access to the coming collection.","接收新的启示、法典条目，以及即将到来的收藏系统优先体验。")}</p>{signed?<div className="signed">{t("YOUR NAME HAS BEEN ENTERED INTO THE CODEX.","你的名字已经被写入法典。")}</div>:<form onSubmit={e=>{e.preventDefault();setSigned(true)}}><input type="email" aria-label="Email" required placeholder={t("YOUR EMAIL ADDRESS","你的邮箱地址")}/><button className="gold-button">{t("JOIN","加入")}</button></form>}</section>
  </main><footer className="m-footer"><div className="m-logo"><span>◉</span> ELARIS</div><div><b>{t("GAME","游戏")}</b><a href="#how">{t("How to Play","玩法")}</a><a href="#collection">{t("The Codex","法典")}</a></div><div><b>{t("COMMUNITY","社区")}</b><a href="#community">{t("Summoning List","召唤名单")}</a><a href="#">{t("Discord","社群")}</a></div><div><b>{t("SUPPORT","支持")}</b><a href="#">{t("Contact","联系我们")}</a><a href="#">{t("Terms","条款")}</a></div><small>© 2026 ELARIS · {t("ALL SOULS RESERVED.","所有灵魂均受保留。")}</small></footer>
 </div>;
}
