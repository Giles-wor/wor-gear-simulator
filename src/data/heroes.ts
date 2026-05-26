import { heroes as generatedHeroes } from './heroes.generated'
import { heroNameKo } from './heroNamesKo'

export type AwakeningTier = {
  level: 1 | 2 | 3 | 4 | 5
  /** 사용자에게 표시할 짧은 설명 (예: '2각: 공격력 +300') */
  label: string
  /** 평탄 공격력 보너스 */
  atkBonus?: number
  /** 공격력 %  (0~1) */
  atkPctBonus?: number
  /** 일반 피해 증가 % (0~1) */
  damageBonus?: number
  /** 기본 공격 피해 % (0~1) */
  basicDamageBonus?: number
  /** 치명타 확률 % (절댓값, 예: 10 = +10%p) */
  critRateBonus?: number
  /** 치명타 피해 % (절댓값, 예: 30 = +30%p) */
  critDmgBonus?: number
  /** 공속 (절댓값) */
  attackSpeedBonus?: number
  /** 방어 무시 % (0~1) */
  penetrationBonus?: number
  /** 파생(derived) 효과: 치피% 의 N% 만큼 관통 추가 (예: Oren 3각 = 0.1).
   *  중방어 데미지에 반영됨 (방어무시는 원래 defense=0 이라 무관). */
  penetrationFromCritDmgRatio?: number
  /** 정량화 안 된 효과 — note 만 표시 (DPS 식에 미반영) */
  note?: string
}

export type Hero = {
  id: string
  name: string
  /** 한글 이름 (인게임 표기). 매핑 없으면 undefined. */
  nameKo?: string
  wikiTitle: string
  wikiUrl: string
  source: 'Watcher of Realms Wiki'
  sourceLevel: 'Lv.60'
  rarity: string
  heroClass: string
  damageType: string
  factions: string[]
  heroTags: string[]
  description: string
  hp: number
  baseAtk: number
  defense: number
  magicRes: number
  block: number
  cost: number
  revivalTime: number
  baseInterval: number
  attackSpeed: number
  critRate: number
  critDmg: number
  healingEffect: number
  rageRegen: number
  rrAuto: number
  rrBasicAtk: number
  rrAttacked: number
  awakeningAtkBonus: number
  /** 각성 단계별 효과 (1~5각). 미정의면 default 프로필 사용. */
  awakeningTiers?: AwakeningTier[]
  attackSpeedProfileBaseIntervalOverride?: number
  burstAtkBonusPer100Aspd?: number
}

/** WoR Legendary 등급의 표준 각성 패턴 (정량화 가능한 부분만).
 *  영웅별 세부 데이터가 없을 때 사용. 2각 +300 ATK 는 다수 딜러의 공통 패턴. */
function defaultLegendaryAwakeningTiers(awakeningAtkBonus: number): AwakeningTier[] {
  return [
    { level: 1, label: '1각: 패시브 강화', note: '영웅별 효과 (DPS 식 미반영)' },
    {
      level: 2,
      label: awakeningAtkBonus > 0 ? `2각: 공격력 +${awakeningAtkBonus}` : '2각: 능력치 강화',
      atkBonus: awakeningAtkBonus > 0 ? awakeningAtkBonus : undefined,
      note: awakeningAtkBonus > 0 ? undefined : '영웅별 효과 (확인 필요)',
    },
    { level: 3, label: '3각: 추가 효과', note: '영웅별 효과 (DPS 식 미반영)' },
    { level: 4, label: '4각: 스킬 강화', note: '영웅별 효과 (DPS 식 미반영)' },
    { level: 5, label: '5각: 궁극기 강화', note: '영웅별 효과 (DPS 식 미반영)' },
  ]
}

const heroOverrides: Partial<Record<string, Partial<Hero>>> = {
  oren: {
    description: 'Supreme Arbiter Lord. 3각 = 치피의 10%만큼 관통 (derived).',
    awakeningAtkBonus: 300,
    awakeningTiers: [
      { level: 1, label: '1각: 궁극기 후 첫 2회 평타 → Reprimand', note: '확률성/조건부' },
      { level: 2, label: '2각: 공격력 +300, 진영 ATK +5%', atkBonus: 300 },
      {
        level: 3,
        label: '3각: 치피의 10%만큼 관통 추가',
        penetrationFromCritDmgRatio: 0.1,
        note: '치피 300 기준 +30% 관통, 치피 500 기준 +50% 관통 (중방어 데미지에 동적 반영)',
      },
      { level: 4, label: '4각: 궁극 시 10명 Radiant Erosion 1스택 + 3초 기절', note: '제어 효과' },
      { level: 5, label: '5각: Anathema 물리 피해 ×3.0, 진리 피해 ×2.0', note: '특수 메커니즘 (DPS 식에는 미반영)' },
    ],
  },
  ingrid: {
    description: '평타/모드 전환형 딜러. 공속 구간과 세트 선택 비교에 적합.',
    awakeningAtkBonus: 300,
    awakeningTiers: [
      { level: 1, label: '1각: Stellar 모드, Radiant Erosion 대상 +20% 피해', note: '조건부 (Radiant Erosion 적용 대상만)' },
      { level: 2, label: '2각: 공격력 +300, 진영 ATK +5%', atkBonus: 300 },
      { level: 3, label: '3각: Solar/Stellar Overload 중 트리거 4타 → 1타로 단축', note: '에너지 가속 (DPS 식 미반영)' },
      { level: 4, label: '4각: 관통 +8%', penetrationBonus: 0.08 },
      { level: 5, label: '5각: Solar Flare 마법 저항 25% 무시', note: '마저 무시 (현재 DPS 식 미반영)' },
    ],
  },
  count_dracula: {
    description: '보너스 공속이 피해 증가와 연결되는 특수 딜러.',
    awakeningAtkBonus: 300,
    burstAtkBonusPer100Aspd: 0.1,
    awakeningTiers: [
      { level: 1, label: '1각: Soul Rot 동맹 피해 +30%', note: '아군 버프 (자기 DPS 식 미반영)' },
      { level: 2, label: '2각: 공격력 +300', atkBonus: 300 },
      { level: 3, label: '3각: 궁극 적 방어 -30% / 5초', note: '방어 디버프 (현재 단일 영웅 기준 미반영)' },
      { level: 4, label: '4각: 관통 +8%', penetrationBonus: 0.08 },
      { level: 5, label: '5각: 궁극 중 다중 타격 시 피해 최대 +40% (스택 누적)', note: '스택 조건부, 기대값으로 평균 +20% 정도' },
    ],
  },
  silas: {
    description: '기본 공격 기반 단일딜 비교용 영웅.',
    awakeningAtkBonus: 300,
    awakeningTiers: [
      { level: 1, label: '1각: 패시브 강화', note: '영웅별 효과 (확인 필요)' },
      { level: 2, label: '2각: 공격력 +300', atkBonus: 300 },
      { level: 3, label: '3각: 기본 공격 강화 (추정)', note: '확인 필요' },
      { level: 4, label: '4각: 관통 +8% (추정)', penetrationBonus: 0.08, note: 'Legendary 표준 패턴 — 인게임 확인 권장' },
      { level: 5, label: '5각: 궁극기 강화', note: '확인 필요' },
    ],
  },
  hex: {
    description: '치명타/공격력 비교 테스트에 자주 쓰이는 영웅.',
    awakeningAtkBonus: 300,
    awakeningTiers: [
      { level: 1, label: '1각: Mad Truth 중 The Fool 카드 확률 추첨', note: '확률성' },
      { level: 2, label: '2각: 공격력 +300', atkBonus: 300 },
      { level: 3, label: '3각: Mad Truth 중 Burning 대상 평타로 궁극 지속 +1초 (최대 30초)', note: '조건부 (Burning 필요) — DPS 식에는 미반영' },
      { level: 4, label: '4각: 관통 +5%', penetrationBonus: 0.05 },
      { level: 5, label: '5각: Joker/Fool 카드 피해 +30%', note: '특정 카드 한정 (단순 가산 미반영)' },
    ],
  },
  rosalia: {
    description: 'Cursed Cult 영주 / 페인트 타일 시너지 딜러.',
    awakeningAtkBonus: 300,
    awakeningTiers: [
      { level: 1, label: '1각: 배치 시 Rage 풀, 첫 20초 피해 +20%', damageBonus: 0.2, note: '첫 20초 한정 — 보수적 평균은 0~+20%' },
      { level: 2, label: '2각: 공격력 +300', atkBonus: 300 },
      { level: 3, label: '3각: 앞 2열 타일에 초당 30% AoE 마법 피해', note: '광역 지속 피해 (단일 식에는 미반영)' },
      { level: 4, label: '4각: 관통 +8%', penetrationBonus: 0.08 },
      { level: 5, label: '5각: 재배치 시간 -50%, 배치마다 피해 +5% (최대 +15%)', damageBonus: 0.15, note: '최대 스택 가정' },
    ],
  },
  lady_alexandra: {
    awakeningAtkBonus: 300,
    attackSpeedProfileBaseIntervalOverride: 2.0,
    awakeningTiers: [
      { level: 1, label: '1각: 패시브 강화', note: '영웅별 효과 (확인 필요)' },
      { level: 2, label: '2각: 공격력 +300', atkBonus: 300 },
      { level: 3, label: '3각: 추가 효과', note: '영웅별 효과 (확인 필요)' },
      { level: 4, label: '4각: 관통 +8% (추정)', penetrationBonus: 0.08, note: 'Legendary 표준 패턴 — 인게임 확인 권장' },
      { level: 5, label: '5각: 궁극기 강화', note: '확인 필요' },
    ],
  },
}

export const heroes: Hero[] = generatedHeroes.map((hero) => {
  const merged = {
    ...hero,
    description: hero.description || `${hero.rarity} ${hero.heroClass} / ${hero.damageType}`,
    awakeningAtkBonus: 0,
    nameKo: heroNameKo[hero.id],
    ...heroOverrides[hero.id],
  }
  // awakeningTiers 가 명시되지 않은 영웅은 표준 Legendary 프로필을 default 로.
  if (!merged.awakeningTiers && merged.rarity === 'Legendary') {
    merged.awakeningTiers = defaultLegendaryAwakeningTiers(merged.awakeningAtkBonus)
  }
  return merged
})

/** "English (한글)" 형식 표시. 한글 매핑 없으면 영문만 반환. */
export function heroDisplayName(hero: Pick<Hero, 'name' | 'nameKo'>): string {
  return hero.nameKo ? `${hero.name} (${hero.nameKo})` : hero.name
}

/** 선택한 각성 레벨까지의 누적 효과 합산. */
export function aggregateAwakening(hero: Hero, awakeningLevel: number) {
  const safeLevel = Math.max(0, Math.min(5, Math.floor(awakeningLevel)))
  const applied = (hero.awakeningTiers ?? []).filter((t) => t.level <= safeLevel)
  const total = {
    atkBonus: 0,
    atkPctBonus: 0,
    damageBonus: 0,
    basicDamageBonus: 0,
    critRateBonus: 0,
    critDmgBonus: 0,
    attackSpeedBonus: 0,
    penetrationBonus: 0,
    /** 치피의 N% 만큼 관통 — calc 에서 baseFinalCritDmg/100 으로 곱해 적용 */
    penetrationFromCritDmgRatio: 0,
  }
  for (const t of applied) {
    total.atkBonus += t.atkBonus ?? 0
    total.atkPctBonus += t.atkPctBonus ?? 0
    total.damageBonus += t.damageBonus ?? 0
    total.basicDamageBonus += t.basicDamageBonus ?? 0
    total.critRateBonus += t.critRateBonus ?? 0
    total.critDmgBonus += t.critDmgBonus ?? 0
    total.attackSpeedBonus += t.attackSpeedBonus ?? 0
    total.penetrationBonus += t.penetrationBonus ?? 0
    total.penetrationFromCritDmgRatio += t.penetrationFromCritDmgRatio ?? 0
  }
  return { level: safeLevel, tiers: applied, ...total }
}
