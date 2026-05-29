// 장비 필터 규칙 모델 — 인게임 Gear Recommendation Settings 재현.
// 필터 = 여러 규칙(rule). 장비는 어느 한 규칙이라도 통과하면 KEEP (규칙 간 OR).
// 각 규칙 내부: 세트(복수, 비우면 전체) + 주옵션(복수) + 부옵션(복수) + 부옵션 매칭 개수(N).

import type { GearSide } from '../data/gearSets'

/** 규칙 적용 부위.
 *  weapon=무기(메인 ATK 고정), armor=방어구(메인 HP 고정), accessory=악세서리(우측, 메인 선택 가능)
 *  left=무기+방어구 통합, right=악세 통합, any=전체 */
export type RuleSide = 'weapon' | 'armor' | 'accessory' | 'left' | 'right' | 'any'

/** 부위가 좌측 세트풀인지 우측 세트풀인지 */
export function sideSetGroup(side: RuleSide): GearSide | 'any' {
  if (side === 'weapon' || side === 'armor' || side === 'left') return 'left'
  if (side === 'accessory' || side === 'right') return 'right'
  return 'any'
}

/** 메인 옵션을 사용자가 고를 수 있는 부위인지 (무기/방어구는 고정) */
export function sideAllowsMainSelect(side: RuleSide): boolean {
  return side === 'accessory' || side === 'right' || side === 'any'
}

export const SIDE_LABEL: Record<RuleSide, string> = {
  weapon: '무기',
  armor: '방어구',
  accessory: '악세서리',
  left: '무기/방어구',
  right: '악세서리(우측)',
  any: '전체',
}

export type FilterRule = {
  id: string
  /** 규칙 이름 (사용자 라벨) */
  name: string
  /** 적용 부위 */
  side: RuleSide
  /** 허용 세트 Tier 목록 (0~3). 비어 있으면 모든 Tier 허용 */
  tiers: number[]
  /** 허용 세트 id 목록 (비어 있으면 Tier 조건 내 모든 세트 허용) */
  sets: string[]
  /** 허용 주옵션 id 목록 (비어 있으면 모든 주옵션 허용) */
  mainStats: string[]
  /** 원하는 부옵션 id 목록 */
  subStats: string[]
  /** 부옵션 중 최소 몇 개가 매칭되어야 KEEP 인지 (1~4) */
  requiredSubMatches: number
}

let ruleCounter = 0
export function newRuleId(): string {
  ruleCounter += 1
  return `rule_${Date.now()}_${ruleCounter}`
}

export function emptyRule(name = '새 규칙'): FilterRule {
  return {
    id: newRuleId(),
    name,
    side: 'right',
    tiers: [],
    sets: [],
    mainStats: [],
    subStats: [],
    requiredSubMatches: 2,
  }
}

/** 규칙 한 줄 요약 텍스트 */
export function ruleSummary(
  rule: FilterRule,
  setLabel: (id: string) => string,
  statLabelMain: (id: string) => string,
  statLabelSub: (id: string) => string,
): string {
  const sideTxt = SIDE_LABEL[rule.side]
  const tierTxt = rule.tiers.length ? rule.tiers.slice().sort().map((t) => `T${t}`).join('/') : '모든 Tier'
  const setTxt = rule.sets.length ? rule.sets.map(setLabel).join(', ') : '모든 세트'
  const mainTxt = !sideAllowsMainSelect(rule.side)
    ? rule.side === 'weapon'
      ? '주옵션 ATK 고정'
      : rule.side === 'armor'
        ? '주옵션 HP 고정'
        : '주옵션 고정'
    : rule.mainStats.length
      ? rule.mainStats.map(statLabelMain).join(' / ')
      : '주옵션 무관'
  const subTxt = rule.subStats.length
    ? `${rule.subStats.map(statLabelSub).join(' / ')} 중 ${rule.requiredSubMatches}개 이상`
    : '부옵션 무관'
  return `[${sideTxt} · ${tierTxt}] 세트: ${setTxt} · 주옵션: ${mainTxt} · 부옵션: ${subTxt}`
}

/** 가상의 장비 — 판정 미리보기용 (빌더에선 미사용, 추후 확장 여지) */
export type GearPiece = {
  side: GearSide
  setId: string
  tier: number
  mainStat: string
  subStats: string[]
}

/** 한 규칙에 장비가 부합하는지 */
export function matchesRule(rule: FilterRule, gear: GearPiece): boolean {
  const group = sideSetGroup(rule.side)
  if (group !== 'any' && group !== gear.side) return false
  if (rule.tiers.length > 0 && !rule.tiers.includes(gear.tier)) return false
  if (rule.sets.length > 0 && !rule.sets.includes(gear.setId)) return false
  if (rule.mainStats.length > 0 && !rule.mainStats.includes(gear.mainStat)) return false
  if (rule.subStats.length > 0) {
    const matched = gear.subStats.filter((s) => rule.subStats.includes(s)).length
    if (matched < rule.requiredSubMatches) return false
  }
  return true
}

/** 필터(여러 규칙) 통과 여부 — 하나라도 부합하면 KEEP */
export function passesFilter(rules: FilterRule[], gear: GearPiece): boolean {
  return rules.some((r) => matchesRule(r, gear))
}
