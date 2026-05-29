// 역할 × 진행도(초보/중급/상급/최상급) 2축 프리셋.
// 출처: 인게임 Gear Recommendation Settings 메타 (fidus 영상: mid game / late-endgame / hyper-endgame 계층)
//       + 사용자(딜러 무기/방어구) 설명.
//
// 진행도 hierarchy (fidus):
//  - 초보(beginner): 거의 다 보관. T0/잡옵만 버림 (부옵 1개만 맞아도 keep)
//  - 중급(mid): 모든 세트 허용(broken 포함), 부옵 2개 매칭
//  - 상급(late/endgame): top 세트 위주(승급 가능 T1 포함), 부옵 3개 매칭
//  - 최상급(hyper): top 세트만, 부옵 4개 전부 (완벽 추구)
//
// 주의: T1 은 변환보석/승급으로 T3 전환 가능하므로 모든 진행도에서 보관 (T0 만 항상 제외).
// 최상급의 엄격함은 Tier 컷이 아니라 부옵 매칭 개수(4개 전부)로 표현.
import { newRuleId, type FilterRule } from '../lib/filter'

// 초보/중급/상급 간단 프리셋용. 최상급은 "역할 정밀 세팅"(변환 고려 기본)이 담당.
export type ProgressionLevel = 'beginner' | 'mid' | 'late'

export const progressionLevels: { id: ProgressionLevel; label: string; desc: string }[] = [
  { id: 'beginner', label: '초보', desc: '거의 다 보관 · T0/잡옵만 버림 (부옵 1개 매칭)' },
  { id: 'mid', label: '중급', desc: '모든 세트 허용(broken 포함) · 부옵 2개 매칭' },
  { id: 'late', label: '상급', desc: 'top 세트 위주(승급 T1 포함) · 부옵 3개 매칭' },
]

type LevelMod = {
  tiers: number[]
  /** true 면 세트 제한 없이 전체 허용 */
  allSets: boolean
  /** 부옵 매칭 개수 (부옵 풀 크기로 cap) */
  subMatches: number
}

// T1 은 변환보석/승급으로 T3 전환 가능 → 모든 진행도에서 보관 (T0 만 제외).
const LEVEL_MOD: Record<ProgressionLevel, LevelMod> = {
  beginner: { tiers: [1, 2, 3], allSets: true, subMatches: 1 },
  mid: { tiers: [1, 2, 3], allSets: true, subMatches: 2 },
  late: { tiers: [1, 2, 3], allSets: false, subMatches: 3 },
}

type RoleDef = {
  id: string
  label: string
  description: string
  /** 우측 top 세트 (상급/최상급에서 사용) */
  rightSets: string[]
  /** 우측 주옵션 */
  rightMain: string[]
  /** 우측 부옵션 풀 (보통 4개) */
  rightSubs: string[]
  /** 좌측(무기/방어구) 부옵션 풀. 빈 배열이면 좌측 규칙 생략 */
  leftSubs: string[]
}

const DPS_TOP_RIGHT = [
  'infernal_roar',
  'soulbound_arcana',
  'ageless_wrath',
  'cataclysm',
  'hells_lament',
  'the_insight',
  'the_wisdom',
  'night_terror',
  'the_doom',
  'the_styx',
  'fracture',
  'curse',
  'hawk_eye',
  'fatality',
]
// 주의: T0 세트는 인게임 필터에 노출되지 않고 진행도 Tier 조건(T1-3)과도 모순 → 풀에서 제외.
const TANK_TOP_RIGHT = ['guardian', 'tempered_will', 'unshaken_will', 'morale']
const HEALER_TOP_RIGHT = ['wings_of_grace', 'invigoration', 'asclepius', 'morale', 'the_wisdom']
const UTILITY_TOP_RIGHT = ['morale', 'invigoration', 'mana_spring']

export const roles: RoleDef[] = [
  {
    id: 'attack_dps',
    label: '공격 딜러',
    description: '공% 스케일 딜러',
    rightSets: DPS_TOP_RIGHT,
    rightMain: ['atk_pct', 'crit_dmg', 'crit_rate', 'atk_spd'],
    rightSubs: ['atk_pct', 'crit_rate', 'crit_dmg', 'atk_spd'],
    leftSubs: ['atk_pct', 'crit_rate', 'crit_dmg', 'atk_spd'],
  },
  {
    id: 'hp_dps',
    label: 'HP 딜러',
    description: 'HP 스케일 딜러',
    rightSets: [...DPS_TOP_RIGHT, 'unshaken_will'],
    rightMain: ['hp_pct', 'crit_dmg', 'crit_rate', 'atk_spd'],
    rightSubs: ['hp_pct', 'crit_rate', 'crit_dmg', 'atk_spd'],
    leftSubs: ['hp_pct', 'crit_rate', 'crit_dmg', 'atk_spd'],
  },
  {
    id: 'def_dps',
    label: '방어 딜러',
    description: '방어력 스케일 딜러',
    rightSets: [...DPS_TOP_RIGHT, 'tempered_will'],
    rightMain: ['def_pct', 'crit_dmg', 'crit_rate', 'atk_spd'],
    rightSubs: ['def_pct', 'crit_rate', 'crit_dmg', 'atk_spd'],
    leftSubs: ['def_pct', 'crit_rate', 'crit_dmg', 'atk_spd'],
  },
  {
    id: 'tank',
    label: '탱커',
    description: '피해 감소/차단 탱커',
    rightSets: TANK_TOP_RIGHT,
    rightMain: ['hp_pct', 'def_pct'],
    rightSubs: ['hp_pct', 'def_pct', 'hp_flat', 'def_flat'],
    leftSubs: ['hp_pct', 'def_pct', 'hp_flat', 'def_flat'],
  },
  {
    id: 'hp_healer',
    label: 'HP 힐러',
    description: 'HP 스케일 힐러',
    rightSets: HEALER_TOP_RIGHT,
    rightMain: ['hp_pct', 'rage_regen', 'atk_spd'],
    rightSubs: ['hp_pct', 'rage_regen', 'healing', 'atk_spd'],
    leftSubs: ['hp_pct', 'rage_regen', 'healing', 'atk_spd'],
  },
  {
    id: 'atk_healer',
    label: '공격 힐러',
    description: '공격 스케일 힐러 (주요>공속>치유>분노)',
    rightSets: HEALER_TOP_RIGHT,
    rightMain: ['atk_pct', 'atk_spd', 'rage_regen'],
    rightSubs: ['atk_pct', 'atk_spd', 'healing', 'rage_regen'],
    leftSubs: ['atk_pct', 'atk_spd', 'healing', 'rage_regen'],
  },
  {
    id: 'inspiration',
    label: '격려 힐러',
    description: '아군 공격력 버프 — 공%·공격력 최우선',
    rightSets: HEALER_TOP_RIGHT,
    rightMain: ['atk_pct', 'atk_flat'],
    rightSubs: ['atk_pct', 'atk_flat', 'atk_spd', 'rage_regen'],
    leftSubs: ['atk_pct', 'atk_flat', 'atk_spd', 'rage_regen'],
  },
  {
    id: 'utility',
    label: '유틸/스패머',
    description: 'Mari·Laurel 류 평타/궁 회전',
    rightSets: UTILITY_TOP_RIGHT,
    rightMain: ['rage_regen', 'atk_spd', 'hp_pct'],
    rightSubs: ['rage_regen', 'atk_spd', 'hp_pct', 'atk_pct'],
    leftSubs: [],
  },
]

// ─────────────────────────────────────────────────────────────
// 역할 정밀 세팅 (최상급) — 무기/방어구/악세(메인별).
// 변환보석을 기본 전제로 한다: "핵심 N개만 맞으면 keep, 마지막 1옵은 변환으로 채움".
//   → 매칭 개수 = 핵심 옵션 수 (4번째 flex 분리 안 함). 더 너그러운(루즈) 규칙.
// ─────────────────────────────────────────────────────────────
export type GranularRole =
  | 'attack_dps'
  | 'hp_dps'
  | 'def_dps'
  | 'tank'
  | 'hp_healer'
  | 'atk_healer'
  | 'inspiration'

export const granularRoles: { id: GranularRole; label: string }[] = [
  { id: 'attack_dps', label: '공격 딜러' },
  { id: 'hp_dps', label: 'HP 딜러' },
  { id: 'def_dps', label: '방어 딜러' },
  { id: 'tank', label: '탱커' },
  { id: 'hp_healer', label: 'HP 힐러' },
  { id: 'atk_healer', label: '공격 힐러' },
  { id: 'inspiration', label: '격려 힐러' },
]

// flex 옵션 한글 라벨 (변환 미고려 딜러 규칙 이름용)
const STAT_KO: Record<string, string> = {
  atk_pct: '공%',
  hp_pct: '체%',
  def_pct: '방%',
  crit_rate: '치확',
  crit_dmg: '치피',
  atk_spd: '공속',
  atk_flat: '공격력',
  hp_flat: '체력',
  def_flat: '방어력',
  rage_regen: '분노',
}

/**
 * 역할 정밀 규칙.
 * conversion=true (변환 고려, 기본): "핵심 옵션 N개" 만 매칭 (마지막 1옵은 변환으로 채울 수 있음, 루즈).
 * conversion=false (변환 미고려): 매칭을 부옵 풀 전체로 올려 강화 잘된 풀옵만 남김 (빡빡, 골드 정리용).
 * 딜러: 부위별(무기/방어구/악세 메인별) 분리. 탱커/힐러는 메타 기반 추정(인게임 확인 권장).
 */
export function buildGranular(role: GranularRole, conversion = true): FilterRule[] {
  const tiers = [1, 2, 3]
  const rules: FilterRule[] = []
  const add = (
    name: string,
    side: FilterRule['side'],
    sets: string[],
    mainStats: string[],
    subStats: string[],
    match: number,
  ) => {
    rules.push({
      id: newRuleId(),
      name,
      side,
      tiers,
      sets,
      mainStats,
      subStats,
      // 변환 미고려면 부옵 풀 전체를 요구 (풀옵). 변환 고려면 핵심 N개.
      requiredSubMatches: conversion ? Math.min(match, subStats.length) : subStats.length,
    })
  }

  if (role === 'attack_dps' || role === 'hp_dps' || role === 'def_dps') {
    const core = role === 'attack_dps' ? 'atk_pct' : role === 'hp_dps' ? 'hp_pct' : 'def_pct'
    const FULL = [core, 'crit_rate', 'crit_dmg', 'atk_spd']

    if (conversion) {
      // 변환 고려: 핵심 옵션 N개만 (4번째는 변환으로 채움). 5규칙 루즈.
      add('무기', 'weapon', [], [], FULL, 3)
      add('방어구', 'armor', [], [], FULL, 3)
      add('악세 치피메인', 'accessory', DPS_TOP_RIGHT, ['crit_dmg'], [core, 'crit_rate', 'atk_spd'], 2)
      add('악세 공%메인', 'accessory', DPS_TOP_RIGHT, [core], ['crit_rate', 'crit_dmg', 'atk_spd'], 2)
      // 악세 치확메인 = 안 씀
      return rules
    }

    // 변환 미고려: 부옵 4개가 정확히 다 좋은 풀옵만. 4번째(flex)는 체%/공격력/체력/분노별로 규칙 분리.
    const flexPool = ['atk_flat', 'hp_pct', 'hp_flat', 'rage_regen'].filter((f) => f !== core)
    const STAR = (flex: string) => (flex === 'atk_flat' ? '★' : '') // 공격력 포함이 으뜸
    add('무기 (풀옵)', 'weapon', [], [], FULL, 4)
    add('방어구1 (풀옵)', 'armor', [], [], FULL, 4)
    // 방어구2: 필수[스케일·치피·공속] + flex
    for (const flex of flexPool) add(`방어구2 ${STAR(flex)}(+${STAT_KO[flex]})`, 'armor', [], [], [core, 'crit_dmg', 'atk_spd', flex], 4)
    // 악세 치피메인: 필수[스케일·치확·공속] + flex
    for (const flex of flexPool) add(`악세 치피메인 ${STAR(flex)}(+${STAT_KO[flex]})`, 'accessory', DPS_TOP_RIGHT, ['crit_dmg'], [core, 'crit_rate', 'atk_spd', flex], 4)
    // 악세 공%메인 (가장 많이 씀): 필수[치확·치피·공속] + flex
    for (const flex of flexPool) add(`악세 공%메인 ${STAR(flex)}(+${STAT_KO[flex]})`, 'accessory', DPS_TOP_RIGHT, [core], ['crit_rate', 'crit_dmg', 'atk_spd', flex], 4)
    return rules
  }

  if (role === 'tank') {
    // 탱커: HP%/방% 위주 + 분노. 변환 전제 너그럽게.
    const TANK = TANK_TOP_RIGHT
    add('무기', 'weapon', [], [], ['hp_pct', 'def_pct', 'rage_regen'], 2)
    add('방어구', 'armor', [], [], ['hp_pct', 'def_pct', 'rage_regen'], 2)
    add('악세 HP%메인', 'accessory', TANK, ['hp_pct'], ['def_pct', 'rage_regen', 'def_flat'], 2)
    add('악세 방%메인', 'accessory', TANK, ['def_pct'], ['hp_pct', 'rage_regen', 'hp_flat'], 2)
    return rules
  }

  if (role === 'inspiration') {
    // 격려 힐러: 자기 공격력에 비례해 아군 공격력 버프 → 모든 장비에서 공%·공격력 최우선.
    const HEAL = HEALER_TOP_RIGHT
    // 무기: 메인 ATK 고정 (공격력 메인) → 부옵 공%·공속·분노 + 치유
    add('무기 (격려)', 'weapon', [], [], ['atk_pct', 'atk_spd', 'rage_regen', 'healing'], 2)
    // 방어구: 메인 HP 고정 → 부옵에 공%·공격력 우선
    add('방어구 (격려)', 'armor', [], [], ['atk_pct', 'atk_flat', 'atk_spd', 'rage_regen'], 2)
    // 악세 공%메인: 부옵 공격력·공속·분노 (공격력 최우선)
    add('악세 공%메인', 'accessory', HEAL, ['atk_pct'], ['atk_flat', 'atk_spd', 'rage_regen'], 2)
    // 악세 공격력메인(고정): 부옵 공%·공속·분노
    add('악세 공격력메인', 'accessory', HEAL, ['atk_flat'], ['atk_pct', 'atk_spd', 'rage_regen'], 2)
    return rules
  }

  if (role === 'hp_healer' || role === 'atk_healer') {
    // 핵심 우선순위: 주요스탯 > 공속 > 치유 > 분노. 공속이 빠지면 안 됨.
    const HEAL = HEALER_TOP_RIGHT
    const core = role === 'hp_healer' ? 'hp_pct' : 'atk_pct'
    // 무기/방어구: 부옵 [주요·공속·치유·분노] 중 3 (공속 포함 우선)
    add('무기', 'weapon', [], [], [core, 'atk_spd', 'healing', 'rage_regen'], 3)
    add('방어구', 'armor', [], [], [core, 'atk_spd', 'healing', 'rage_regen'], 3)
    // 악세 주요메인: 부옵 [공속·치유·분노] 중 2 (공속 우선)
    add(
      role === 'hp_healer' ? '악세 HP%메인' : '악세 공%메인',
      'accessory',
      HEAL,
      [core],
      ['atk_spd', 'healing', 'rage_regen'],
      2,
    )
    // 악세 공속메인: 공속을 메인으로 확보 → 부옵 [주요·치유·분노]
    add('악세 공속메인', 'accessory', HEAL, ['atk_spd'], [core, 'healing', 'rage_regen'], 2)
    // 악세 분노메인: 부옵 [주요·공속·치유] (공속 포함)
    add('악세 분노메인', 'accessory', HEAL, ['rage_regen'], [core, 'atk_spd', 'healing'], 2)
    return rules
  }

  return rules
}

/** 역할 정밀 규칙이 메타 추정(인게임 확인 권장)인지 여부 — UI note 용. */
export function granularIsEstimated(role: GranularRole): boolean {
  return role === 'tank'
}

export function buildRolePreset(
  roleId: string,
  level: ProgressionLevel,
  conversion = true,
): FilterRule[] {
  const role = roles.find((r) => r.id === roleId)
  if (!role) return []
  const mod = LEVEL_MOD[level]
  const lvLabel = progressionLevels.find((l) => l.id === level)?.label ?? ''

  // 변환 고려: 진행도별 매칭 수. 변환 미고려: 부옵 풀 전체(풀옵) 요구.
  const cap = (subs: string[]) =>
    conversion ? Math.max(1, Math.min(mod.subMatches, subs.length)) : subs.length

  const rules: FilterRule[] = [
    {
      id: newRuleId(),
      name: `${role.label} 우측 (${lvLabel})`,
      side: 'right',
      tiers: mod.tiers,
      sets: mod.allSets ? [] : role.rightSets,
      mainStats: role.rightMain,
      subStats: role.rightSubs,
      requiredSubMatches: cap(role.rightSubs),
    },
  ]
  if (role.leftSubs.length > 0) {
    rules.push({
      id: newRuleId(),
      name: `${role.label} 무기/방어구 (${lvLabel})`,
      side: 'left',
      tiers: mod.tiers,
      sets: [], // 좌측은 메인 고정 → 세트 무관, 부옵 중심
      mainStats: [],
      subStats: role.leftSubs,
      requiredSubMatches: cap(role.leftSubs),
    })
  }
  return rules
}

/** 모든 역할 규칙을 한 번에 — 초보/중급/상급 "한방" 프리셋용.
 *  변환 미고려(정리 모드)에서는 공격 딜러를 정밀 14규칙으로 넣는다 (정리할 땐 딜러 풀옵만 남기려고).
 *  HP/방어 딜러는 드물어 간단 버전 유지 (50개 규칙 한도 관리). */
export function buildAllRolesPreset(level: ProgressionLevel, conversion = true): FilterRule[] {
  return roles.flatMap((r) => {
    if (!conversion && r.id === 'attack_dps') return buildGranular('attack_dps', false)
    return buildRolePreset(r.id, level, conversion)
  })
}
