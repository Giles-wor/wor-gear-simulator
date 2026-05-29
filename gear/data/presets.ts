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

// ── 좌측(무기/방어구) 세트 그룹 — 빌드별 좌측 세트 지정용 ──
// 전쟁셋 계열: 공%·공속·치피 등 공격 스탯 (전쟁의 주인/악의 복수/재앙/질풍/인멸)
const LEFT_WAR_SETS = ['warlord', 'wicked_vengeance', 'calamity', 'whirlwind', 'annihilating_might']
// 치유셋 계열: 치유효과/HP (빛의 은혜/구원/생기/천상의 수호 등)
const LEFT_HEAL_SETS = ['lights_grace', 'salvation', 'life_force', 'astral_guardian']

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
  | 'atk_healer_war'
  | 'inspiration'

export const granularRoles: { id: GranularRole; label: string }[] = [
  { id: 'attack_dps', label: '공격 딜러' },
  { id: 'hp_dps', label: '체비례 딜러' },
  { id: 'def_dps', label: '방어 딜러' },
  { id: 'tank', label: '탱커' },
  { id: 'hp_healer', label: 'HP 힐러' },
  { id: 'atk_healer', label: '공격 힐러 (치유셋)' },
  { id: 'atk_healer_war', label: '공격 힐러 (전쟁셋)' },
  { id: 'inspiration', label: '격려 힐러 (전쟁셋 필수)' },
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
 * 역할 정밀 규칙. 인게임 "필수 속성(requiredSubs)" 을 활용해 flex 분리 없이 표현.
 * conversion=true (변환 고려, 기본): 매칭을 1 낮춤 (마지막 1옵은 변환으로 채울 수 있음, 루즈).
 * conversion=false (변환 미고려): 부옵 풀 전체 매칭 (풀옵만, 빡빡, 골드 정리용).
 * 필수 속성은 두 모드에서 항상 보장된다.
 */
export function buildGranular(role: GranularRole, conversion = true): FilterRule[] {
  const tiers = [1, 2, 3]
  const rules: FilterRule[] = []
  /**
   * add(name, side, sets, mains, subs, req)
   *  subs: 부옵 후보 풀 / req: 필수 부옵 (무조건 포함)
   *  매칭 개수 = 변환 미고려면 풀 전체, 변환 고려면 (전체−1) — 단 필수 개수 이상은 유지.
   */
  const add = (
    name: string,
    side: FilterRule['side'],
    sets: string[],
    mainStats: string[],
    subStats: string[],
    req: string[] = [],
  ) => {
    const full = subStats.length
    // 장비 부옵 슬롯은 최대 4개. 풀이 더 커도 매칭은 슬롯 수 기준.
    const slots = Math.min(4, full)
    // 변환 미고려: 슬롯 다 채워야(풀옵). 변환 고려: 1개는 변환으로 → slots-1. 단 필수 개수 이상.
    const match = Math.max(req.length, conversion ? Math.max(1, slots - 1) : slots)
    rules.push({
      id: newRuleId(),
      name,
      side,
      tiers,
      sets,
      mainStats,
      subStats,
      requiredSubMatches: Math.min(match, full),
      requiredSubs: req,
    })
  }

  if (role === 'attack_dps' || role === 'hp_dps' || role === 'def_dps') {
    const core = role === 'attack_dps' ? 'atk_pct' : role === 'hp_dps' ? 'hp_pct' : 'def_pct'
    // flex 후보(체%/공격력/체력/분노). 4번째 자리는 이 중 아무거나(공격력 으뜸).
    const flex = ['atk_flat', 'hp_pct', 'hp_flat', 'rage_regen'].filter((f) => f !== core)
    // 무기/방어구1: 공%·치확·치피·공속 (4코어)
    add('무기', 'weapon', [], [], [core, 'crit_rate', 'crit_dmg', 'atk_spd'], [core, 'atk_spd'])
    add('방어구1', 'armor', [], [], [core, 'crit_rate', 'crit_dmg', 'atk_spd'], [core, 'atk_spd'])
    // 방어구2: 필수[공%·치피·공속] + 4번째는 flex 풀에서
    add('방어구2 (필수 공%·치피·공속 + 1)', 'armor', [], [], [core, 'crit_dmg', 'atk_spd', ...flex], [core, 'crit_dmg', 'atk_spd'])
    // 악세 치피메인: 필수[공%·치확·공속] + flex
    add('악세 치피메인', 'accessory', DPS_TOP_RIGHT, ['crit_dmg'], [core, 'crit_rate', 'atk_spd', ...flex], [core, 'crit_rate', 'atk_spd'])
    // 악세 공%메인(가장 많이 씀): 필수[치확·치피·공속] + flex
    add('악세 공%메인', 'accessory', DPS_TOP_RIGHT, [core], ['crit_rate', 'crit_dmg', 'atk_spd', ...flex], ['crit_rate', 'crit_dmg', 'atk_spd'])
    // 악세 치확메인 = 안 씀
    return rules
  }

  if (role === 'tank') {
    const TANK = TANK_TOP_RIGHT
    add('무기', 'weapon', [], [], ['hp_pct', 'def_pct', 'rage_regen', 'hp_flat'], ['hp_pct', 'def_pct'])
    add('방어구', 'armor', [], [], ['hp_pct', 'def_pct', 'rage_regen', 'def_flat'], ['hp_pct', 'def_pct'])
    add('악세 HP%메인', 'accessory', TANK, ['hp_pct'], ['def_pct', 'rage_regen', 'hp_flat', 'def_flat'], ['def_pct'])
    add('악세 방%메인', 'accessory', TANK, ['def_pct'], ['hp_pct', 'rage_regen', 'hp_flat', 'def_flat'], ['hp_pct'])
    return rules
  }

  if (role === 'inspiration') {
    // 격려 힐러: 자기 공격력 비례로 아군 버프 → 무기/방어구 무조건 전쟁셋(공%·공속). 공% 필수.
    const HEAL = HEALER_TOP_RIGHT
    add('무기 (전쟁셋 필수)', 'weapon', LEFT_WAR_SETS, [], ['atk_pct', 'atk_spd', 'rage_regen', 'healing'], ['atk_pct'])
    add('방어구 (전쟁셋 필수)', 'armor', LEFT_WAR_SETS, [], ['atk_pct', 'atk_flat', 'atk_spd', 'rage_regen'], ['atk_pct'])
    add('악세 공%메인', 'accessory', HEAL, ['atk_pct'], ['atk_flat', 'atk_spd', 'rage_regen', 'healing'], ['atk_flat'])
    add('악세 공격력메인', 'accessory', HEAL, ['atk_flat'], ['atk_pct', 'atk_spd', 'rage_regen', 'healing'], ['atk_pct'])
    return rules
  }

  if (role === 'atk_healer_war') {
    // 공격 힐러 전쟁셋 빌드: 무기/방어구 전쟁셋(공%·공속) 으로 딜·버프 겸용. 공%·공속 중심.
    const HEAL = HEALER_TOP_RIGHT
    add('무기 (전쟁셋)', 'weapon', LEFT_WAR_SETS, [], ['atk_pct', 'atk_spd', 'crit_rate', 'rage_regen'], ['atk_pct', 'atk_spd'])
    add('방어구 (전쟁셋)', 'armor', LEFT_WAR_SETS, [], ['atk_pct', 'atk_spd', 'crit_rate', 'rage_regen'], ['atk_pct'])
    add('악세 공%메인', 'accessory', HEAL, ['atk_pct'], ['atk_spd', 'rage_regen', 'healing'], ['atk_spd'])
    add('악세 공속메인', 'accessory', HEAL, ['atk_spd'], ['atk_pct', 'rage_regen', 'healing'], [])
    return rules
  }

  if (role === 'hp_healer' || role === 'atk_healer') {
    // 치유셋 빌드 — 우선순위 주요>공속>치유>분노. 공속 필수.
    const HEAL = HEALER_TOP_RIGHT
    const core = role === 'hp_healer' ? 'hp_pct' : 'atk_pct'
    // 치유셋 빌드라 좌측은 치유/HP 세트 위주 (무관도 허용하려면 [] 로 두면 됨)
    add('무기', 'weapon', LEFT_HEAL_SETS, [], [core, 'atk_spd', 'healing', 'rage_regen'], ['atk_spd'])
    add('방어구', 'armor', LEFT_HEAL_SETS, [], [core, 'atk_spd', 'healing', 'rage_regen'], ['atk_spd'])
    add(
      role === 'hp_healer' ? '악세 HP%메인' : '악세 공%메인',
      'accessory',
      HEAL,
      [core],
      ['atk_spd', 'healing', 'rage_regen'],
      ['atk_spd'],
    )
    add('악세 공속메인', 'accessory', HEAL, ['atk_spd'], [core, 'healing', 'rage_regen'], [])
    add('악세 분노메인', 'accessory', HEAL, ['rage_regen'], [core, 'atk_spd', 'healing'], ['atk_spd'])
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
      requiredSubs: [],
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
      requiredSubs: [],
    })
  }
  return rules
}

/** 모든 역할 규칙을 한 번에 — 초보/중급/상급 "한방" 프리셋용.
 *  변환 미고려(정리 모드)에서는 공격 딜러를 정밀(필수 속성 활용 5규칙)으로 넣는다. */
export function buildAllRolesPreset(level: ProgressionLevel, conversion = true): FilterRule[] {
  return roles.flatMap((r) => {
    if (!conversion && r.id === 'attack_dps') return buildGranular('attack_dps', false)
    return buildRolePreset(r.id, level, conversion)
  })
}
