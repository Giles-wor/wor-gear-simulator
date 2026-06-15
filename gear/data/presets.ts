// 역할 × 진행도(레벨1~3) 기어 추천 프리셋.
// 출처: fidus/9enie "Gear Recommendation Settings" 스프레드시트를 그대로 코드화(recSettings.ts).
//   - 레벨1 = 18단 파밍 (세트 무관 · 좋은 부옵 위주, 느슨)
//   - 레벨2 = 19~21단 파밍 (역할 세트에 맞는 옵션)
//   - 레벨3 = 22~24단 파밍 (완벽 4옵/쿼드만)
// 각 룰의 부옵 매칭 개수(req)·필수옵(must)·후보옵(subs)은 시트 값을 그대로 사용.
// 좌측(무기/방어구)은 "stats over sets" 원칙대로 세트 무관(any), 우측(악세)은 역할 핵심 세트로 제한.
import { newRuleId, type FilterRule } from '../lib/filter'
import { REC_RULES, ALL_SUB_IDS, type RecRule, type RecRole } from './recSettings'

export type ProgressionLevel = 'lvl1' | 'lvl2' | 'lvl3'

export const progressionLevels: { id: ProgressionLevel; label: string; desc: string }[] = [
  { id: 'lvl1', label: '레벨 1', desc: '18단 파밍 · 세트 무관, 좋은 부옵 위주 (느슨)' },
  { id: 'lvl2', label: '레벨 2', desc: '19~21단 파밍 · 역할 세트에 맞는 옵션' },
  { id: 'lvl3', label: '레벨 3', desc: '22~24단 파밍 · 완벽 4옵(쿼드)만' },
]

const LEVEL_KEY: Record<ProgressionLevel, '1' | '2' | '3'> = { lvl1: '1', lvl2: '2', lvl3: '3' }

// ── 우측(악세) 역할별 핵심 세트 ──
const DPS_TOP_RIGHT = [
  'infernal_roar', 'soulbound_arcana', 'ageless_wrath', 'cataclysm', 'hells_lament',
  'the_insight', 'the_wisdom', 'night_terror', 'the_doom', 'the_styx',
  'fracture', 'curse', 'hawk_eye', 'fatality',
]
const TANK_TOP_RIGHT = ['guardian', 'tempered_will', 'unshaken_will', 'morale']
const HEALER_TOP_RIGHT = ['wings_of_grace', 'invigoration', 'asclepius', 'morale', 'the_wisdom']
const WINGS_INVIG_SETS = ['wings_of_grace', 'invigoration']

function setsFor(rec: RecRule): string[] {
  if (rec.side !== 'accessory') return [] // 좌측: 세트 무관
  if (rec.role === 'progression') return rec.name === 'BABY TANK' ? TANK_TOP_RIGHT : WINGS_INVIG_SETS
  if (rec.role === 'attack_dps' || rec.role === 'hp_dps') return DPS_TOP_RIGHT
  if (rec.role === 'tank') return TANK_TOP_RIGHT
  if (rec.role === 'inspiration' || rec.role === 'atk_healer' || rec.role === 'hp_healer') return HEALER_TOP_RIGHT
  return [] // debuffer 등: 세트 무관
}

const ROLE_KO: Record<RecRole, string> = {
  attack_dps: '공딜', hp_dps: '체딜', tank: '탱커', inspiration: '격려',
  atk_healer: '공힐', hp_healer: '체힐', debuffer: '디버퍼', progression: '진행',
}
const SIDE_KO: Record<RecRule['side'], string> = {
  weapon: '무기', armor: '방어구', left: '무기/방어구', accessory: '악세',
}
const MAIN_KO: Record<string, string> = {
  atk_pct: '공%', hp_pct: '체%', def_pct: '방%', crit_rate: '치확',
  crit_dmg: '치피', atk_spd: '공속', rage_regen: '분노', healing: '치유',
}

function ruleName(rec: RecRule): string {
  if (rec.name === 'BABY TANK') return '베이비 탱크 (HP%주 · 잡옵)'
  if (rec.name === 'WINGS/INVIG') return '윙/인빅 (공속·분노주)'
  if (rec.name === 'TRASH WINGS') return '트래시 윙 (첫 세트)'
  const v = rec.variant ? ` ${rec.variant}` : ''
  if (rec.side === 'accessory') {
    const mains = rec.main.length ? ` ${rec.main.map((s) => MAIN_KO[s] ?? s).join('/')}` : ''
    return `${ROLE_KO[rec.role]} 악세${mains}${v}`
  }
  return `${ROLE_KO[rec.role]} ${SIDE_KO[rec.side]}${v}`
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 시트 룰 1개 → 특정 레벨 FilterRule (없으면 null). conversion=변환 고려(매칭 -1, 느슨). */
function toFilterRule(rec: RecRule, level: ProgressionLevel, conversion: boolean): FilterRule | null {
  const d = rec.lv[LEVEL_KEY[level]]
  if (!d) return null
  const subs = d.subs === 'ALL' ? ALL_SUB_IDS : d.subs
  const must = d.must
  const want = conversion ? d.req - 1 : d.req
  const match = clamp(Math.min(want, 4), Math.max(1, must.length), Math.max(1, subs.length))
  return {
    id: newRuleId(),
    name: ruleName(rec),
    side: rec.side,
    tiers: [1, 2, 3],
    sets: setsFor(rec),
    mainStats: rec.side === 'accessory' ? rec.main : [],
    subStats: subs,
    requiredSubMatches: match,
    requiredSubs: must,
  }
}

function buildRules(
  roleFilter: RecRole | 'all',
  level: ProgressionLevel,
  conversion: boolean,
): FilterRule[] {
  return REC_RULES.filter((r) => (roleFilter === 'all' ? true : r.role === roleFilter))
    .map((r) => toFilterRule(r, level, conversion))
    .filter((r): r is FilterRule => r !== null)
}

// ── 역할 카드 / 정밀 역할 목록 (진행룰 제외) ──
export type GranularRole = 'attack_dps' | 'hp_dps' | 'tank' | 'inspiration' | 'atk_healer' | 'hp_healer' | 'debuffer'

type RoleDef = { id: GranularRole; label: string; description: string }
export const roles: RoleDef[] = [
  { id: 'attack_dps', label: '공격 딜러', description: '공% 스케일 — 공%·치확·치피·공속' },
  { id: 'hp_dps', label: '체비례 딜러', description: 'HP% 스케일 (에이드리언 등)' },
  { id: 'tank', label: '탱커', description: 'HP% 중심 · 방%/분노 보조' },
  { id: 'inspiration', label: '격려 힐러', description: '아군 공버프 — 공%·공격력 최우선' },
  { id: 'atk_healer', label: '공격 힐러', description: '공%·공속·치유' },
  { id: 'hp_healer', label: 'HP 힐러', description: 'HP%·공속·치유' },
  { id: 'debuffer', label: '디버퍼', description: '빠르고 단단하게 — HP%·공속·분노' },
]

export const granularRoles: { id: GranularRole; label: string }[] = roles.map((r) => ({
  id: r.id,
  label: r.label,
}))

/** 모든 역할 + 진행룰 한 번에 (레벨별 "한방" 프리셋). */
export function buildAllRolesPreset(level: ProgressionLevel, conversion = true): FilterRule[] {
  return buildRules('all', level, conversion)
}

/** 단일 역할 규칙 (진행룰 제외). */
export function buildRolePreset(roleId: string, level: ProgressionLevel, conversion = true): FilterRule[] {
  return buildRules(roleId as RecRole, level, conversion)
}

/** 역할 정밀 규칙 = 해당 역할을 선택 레벨로 생성. */
export function buildGranular(role: GranularRole, level: ProgressionLevel, conversion = true): FilterRule[] {
  return buildRules(role, level, conversion)
}

/** 시트 기반이라 추정 아님(항상 false) — 호환용. */
export function granularIsEstimated(_role: GranularRole): boolean {
  return false
}

// ──────────────────────────────────────────────────────────────────────────
// 무손실 압축: ① 동일 조건 무기+방어구 → 「무기/방어구」 한 룰로 통합,
//             ② 다른 룰에 KEEP 범위가 완전히 포함되는 잉여 룰 제거.
// 두 변환 모두 보관(KEEP)되는 장비 집합을 정확히 보존한다(무손실).
// ──────────────────────────────────────────────────────────────────────────

const sortedJoin = (a: (string | number)[]) => [...a].map(String).sort().join(',')

/** 부옵 조건(필수+매칭)이 같은지 비교하는 키 (부위/이름 제외). */
function condKey(r: FilterRule): string {
  return [
    sortedJoin(r.tiers),
    sortedJoin(r.sets),
    sortedJoin(r.mainStats),
    sortedJoin(r.subStats),
    r.requiredSubMatches,
    sortedJoin(r.requiredSubs),
  ].join('|')
}

/** 구조(부위·Tier·세트·주옵)가 같아 서로 비교 가능한 그룹 키. */
function structKey(r: FilterRule): string {
  return [r.side, sortedJoin(r.tiers), sortedJoin(r.sets), sortedJoin(r.mainStats)].join('|')
}

// 장비의 가능한 부옵 조합(0~4개) — KEEP 시그니처 계산용 (모듈 로드 시 1회).
const ITEM_SUBSETS: Set<string>[] = (() => {
  const out: Set<string>[] = []
  const rec = (start: number, cur: string[]) => {
    out.push(new Set(cur))
    if (cur.length === 4) return
    for (let i = start; i < ALL_SUB_IDS.length; i += 1) {
      cur.push(ALL_SUB_IDS[i])
      rec(i + 1, cur)
      cur.pop()
    }
  }
  rec(0, [])
  return out
})()

function keepsItem(r: FilterRule, item: Set<string>): boolean {
  if (r.requiredSubs.length && !r.requiredSubs.every((s) => item.has(s))) return false
  if (r.subStats.length) {
    let m = 0
    for (const s of r.subStats) if (item.has(s)) m += 1
    if (m < r.requiredSubMatches) return false
  }
  return true
}

/** 부옵 조건이 KEEP 하는 장비 집합을 비트열로 (구조 같은 룰끼리만 비교). */
function keepSig(r: FilterRule): string {
  let s = ''
  for (const it of ITEM_SUBSETS) s += keepsItem(r, it) ? '1' : '0'
  return s
}

/** a 의 KEEP 집합이 b 를 모두 포함하는가 (a ⊇ b). */
function superset(a: string, b: string): boolean {
  for (let i = 0; i < b.length; i += 1) if (b[i] === '1' && a[i] !== '1') return false
  return true
}

/** ① 조건이 완전히 같은 무기+방어구 쌍을 「무기/방어구」(left) 한 룰로 통합. */
function mergeWeaponArmor(rules: FilterRule[]): FilterRule[] {
  const armorUsed = new Set<number>()
  const armorRemoved = new Set<number>()
  const replace = new Map<number, FilterRule>()
  rules.forEach((w, wi) => {
    if (w.side !== 'weapon') return
    const wk = condKey(w)
    const ai = rules.findIndex((a, i) => a.side === 'armor' && !armorUsed.has(i) && condKey(a) === wk)
    if (ai >= 0) {
      armorUsed.add(ai)
      armorRemoved.add(ai)
      replace.set(wi, { ...w, side: 'left', name: w.name.replace('무기', '무기/방어구') })
    }
  })
  return rules.map((r, i) => replace.get(i) ?? r).filter((_, i) => !armorRemoved.has(i))
}

/** ② 같은 구조 그룹 안에서 다른 룰에 완전히 포함되는 잉여 룰 제거. */
function dropSubsumed(rules: FilterRule[]): FilterRule[] {
  const sig = rules.map(keepSig)
  const key = rules.map(structKey)
  const removed = new Array(rules.length).fill(false)
  for (let b = 0; b < rules.length; b += 1) {
    if (removed[b]) continue
    for (let a = 0; a < rules.length; a += 1) {
      if (a === b || removed[a] || removed[b]) continue
      if (key[a] !== key[b]) continue
      if (!superset(sig[a], sig[b])) continue
      // a ⊇ b: b 제거. 단 완전히 같으면 앞선 것만 남긴다.
      if (sig[a] !== sig[b] || a < b) removed[b] = true
    }
  }
  return rules.filter((_, i) => !removed[i])
}

/** 무손실 압축 적용 (①→②). */
export function compressRules(rules: FilterRule[]): FilterRule[] {
  return dropSubsumed(mergeWeaponArmor(rules))
}
