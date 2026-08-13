# UX principles (confirmed in 0.1.x play)

## Commit model

**Inspect → Select → Commit**  
**查看是安全行为，确认才是游戏行为。**  
**Quick understand → Decide → Deep inspect**

- Clicking a hand card **inspects only**. It must not play the card or spend 灵息.
- Commit labels: 使用 / 部署 / 安置 / 展开 / 发动共鸣 / 发动「真实技能名」.
- Do not ship a vague sole button 「发动技能」 when the printed name is known.
- Full-card detail is a **modal overlay** (setup: `.rite-detail`). Open/close must not mutate match state. Closing keeps the previous selection.

## Information safety

**查看信息不能以失去其他决策信息为代价.**

- Phase bar always visible.
- Toast must not cover phase / 灵息 / hand / primary actions.
- Combat log must not bury the hand.
- 灵息: readable meter (`◆` style) plus spend / remaining when committing.
- Opponent actions: short `actionCue` on the field (AI delay ~1.1s).

## New-player guidance

- Player must see **why** they can or cannot act (初临, first-turn no strike, 灵息, empty companion row).
- Do not lecture mechanics they cannot use yet. Progressive hints (`elarishints-017`).
- 「进入战斗」 is an explicit choice, not a surprise phase jump.
- Setup is an independent **rite** screen, not an empty battlefield.
- Duplicate same-`defId` starters are **visually merged**; instances remain distinct underneath.
- Setup summary shows 战技 name + cost + full `skill.text`, then playstyle notes.

## Language

Basic TCG verbs: 回合, 抽牌, 行动, 战斗, 夜幕.  
World terms only for world mechanics: 灵息, 契痕, 共鸣, 初临, 主契, 伴契.

## Selection feedback

Selection must be immediately visible (highlight / inspector).  
After inspect, the player still sees board, 灵息, and the commit control.
