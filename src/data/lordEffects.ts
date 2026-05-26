import { factionKey } from './factionAccessories'

export type LordEffect = {
  id: string
  faction: string
  name: string
  sourceName: string
  /** 한 줄 요약 (기존 호환) */
  summary: string
  atkPctBonus?: number
  damageBonus?: number
  basicDamageBonus?: number
  critDmgBonus?: number
  attackSpeedBonus?: number
  penetrationBonus?: number
  /** 데미지 산식 카드 하단에 표시할 영주 효과 항목별 상세 — 사용자 직관 강화용 */
  damageBreakdown?: {
    label: string
    /** 0~1 사이 값이면 % 로 표시 (예: 0.5 = +50%) */
    value?: number
    /** value 와 단위가 다른 경우 직접 표시 문자열 (예: "+30 치피", "+35 공속") */
    text?: string
    /** 추가 설명 */
    note?: string
  }[]
}

export const lordEffects: Record<string, LordEffect[]> = {
  watchguard: [
    {
      id: 'watchguard_ingrid',
      faction: 'Watchguard',
      name: 'Ingrid',
      sourceName: 'Watchguard Lord: Ingrid',
      summary: '기본 속성 +15%, 주기적 피해 보너스 +50%, Lord 직접 피해 후 추가 피해 +20%를 단순 기대값으로 반영',
      atkPctBonus: 0.15,
      damageBonus: 0.7,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '주기적 피해 보너스 (단순 기대값)', value: 0.5 },
        { label: 'Lord 직접 피해 후 추가 피해', value: 0.2 },
      ],
    },
    {
      id: 'watchguard_laya',
      faction: 'Watchguard',
      name: 'Laya',
      sourceName: 'Watchguard Lord: Laya',
      summary: '기본 속성 +15%, 주기적 피해 보너스 +30%, 치유 후 피해 +15%를 단순 기대값으로 반영',
      atkPctBonus: 0.15,
      damageBonus: 0.45,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '주기적 피해 보너스', value: 0.3 },
        { label: '치유 후 피해 보너스', value: 0.15 },
      ],
    },
    {
      id: 'watchguard_ain',
      faction: 'Watchguard',
      name: 'Ain',
      sourceName: 'Watchguard Lord: Ain',
      summary: '기본 속성 +10%, 주기적 피해 보너스 +20%',
      atkPctBonus: 0.1,
      damageBonus: 0.2,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스 (Epic Lord)', value: 0.1 },
        { label: '주기적 피해 보너스', value: 0.2 },
      ],
    },
  ],
  nightmare_council: [
    {
      id: 'nightmare_council_torodor',
      faction: 'Nightmare Council',
      name: 'Torodor',
      sourceName: 'Nightmare Council Lord: Torodor',
      summary: '기본 속성 +15%, 배치 누적 공속 +35%, 기본 공격 추가타 30% 기대값 반영',
      atkPctBonus: 0.15,
      attackSpeedBonus: 35,
      basicDamageBonus: 0.3,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '배치 누적 공속', text: '+35 공속' },
        { label: '기본 공격 추가타 (단순 기대값)', value: 0.3 },
      ],
    },
    {
      id: 'nightmare_council_rygar',
      faction: 'Nightmare Council',
      name: 'Rygar',
      sourceName: 'Nightmare Council Lord: Rygar',
      summary: '기본 속성 +15%, 배치 누적 공속 +35%, 궁극기 중 기본 공격 피해 +25%',
      atkPctBonus: 0.15,
      attackSpeedBonus: 35,
      basicDamageBonus: 0.25,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '배치 누적 공속', text: '+35 공속' },
        { label: '궁극기 중 기본 공격 피해', value: 0.25 },
      ],
    },
    {
      id: 'nightmare_council_wrath',
      faction: 'Nightmare Council',
      name: 'Wrath',
      sourceName: 'Nightmare Council Lord: Wrath',
      summary: '기본 속성 +10%, 배치 누적 공속 +35%',
      atkPctBonus: 0.1,
      attackSpeedBonus: 35,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스 (Epic Lord)', value: 0.1 },
        { label: '배치 누적 공속', text: '+35 공속' },
      ],
    },
  ],
  star_piercers: [
    {
      id: 'star_piercers_aracha',
      faction: 'Star Piercers',
      name: 'Aracha',
      sourceName: 'Star Piercers Lord: Aracha',
      summary: '기본 속성 +15%, 사거리 보너스, 거리당 피해 증가 최대 +50%를 최대 조건으로 반영',
      atkPctBonus: 0.15,
      damageBonus: 0.5,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '거리당 피해 증가 (최대 조건)', value: 0.5 },
        { label: '사거리 보너스', text: '사거리 +', note: 'DPS 식에는 미반영' },
      ],
    },
    {
      id: 'star_piercers_iovar',
      faction: 'Star Piercers',
      name: 'Iovar',
      sourceName: 'Star Piercers Lord: Iovar',
      summary: '기본 속성 +15%, 사거리 보너스, 20초마다 피해 +15% 최대 3중첩을 최대 조건으로 반영',
      atkPctBonus: 0.15,
      damageBonus: 0.45,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '20초마다 피해 +15% × 3중첩 (최대)', value: 0.45 },
        { label: '사거리 보너스', text: '사거리 +', note: 'DPS 식에는 미반영' },
      ],
    },
    {
      id: 'star_piercers_luneria',
      faction: 'Star Piercers',
      name: 'Luneria',
      sourceName: 'Star Piercers Lord: Luneria',
      summary: '기본 속성 +10%, 사거리 보너스',
      atkPctBonus: 0.1,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스 (Epic Lord)', value: 0.1 },
        { label: '사거리 보너스', text: '사거리 +', note: 'DPS 식에는 미반영' },
      ],
    },
  ],
  infernal_blast: [
    {
      id: 'infernal_blast_twinfiend',
      faction: 'Infernal Blast',
      name: 'Twinfiend',
      sourceName: 'Infernal Blast Lord: Twinfiend',
      summary: '기본 속성 +15%, 궁극기 연계 관통/치확/치피 증가를 치피 +30%, 관통 +20% 기대값으로 반영',
      atkPctBonus: 0.15,
      critDmgBonus: 30,
      penetrationBonus: 0.2,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '궁극기 연계 치피 증가 (기대값)', text: '+30 치피' },
        { label: '궁극기 연계 관통 (기대값)', value: 0.2, note: '방어 무시' },
      ],
    },
    {
      id: 'infernal_blast_solcadens',
      faction: 'Infernal Blast',
      name: 'Solcadens',
      sourceName: 'Infernal Blast Lord: Solcadens',
      summary: '기본 속성 +15%, 관통 증가와 엘리트/보스 추가 피해 +30%',
      atkPctBonus: 0.15,
      damageBonus: 0.3,
      penetrationBonus: 0.2,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '엘리트/보스 추가 피해', value: 0.3 },
        { label: '관통', value: 0.2, note: '방어 무시' },
      ],
    },
    {
      id: 'infernal_blast_pyros',
      faction: 'Infernal Blast',
      name: 'Pyros',
      sourceName: 'Infernal Blast Lord: Pyros',
      summary: '기본 속성 +10%, 관통 증가',
      atkPctBonus: 0.1,
      penetrationBonus: 0.2,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스 (Epic Lord)', value: 0.1 },
        { label: '관통', value: 0.2, note: '방어 무시' },
      ],
    },
  ],
  chaos_dominion: [
    {
      id: 'chaos_dominion_ghan',
      faction: 'Chaos Dominion',
      name: 'Ghan',
      sourceName: 'Chaos Dominion Lord: Ghan',
      summary: '기본 속성 +15%, 낮은 HP 조건의 피해 +60%, 관통 +20%를 최대 조건으로 반영',
      atkPctBonus: 0.15,
      damageBonus: 0.6,
      penetrationBonus: 0.2,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '낮은 HP 조건 피해 (최대)', value: 0.6 },
        { label: '관통', value: 0.2, note: '방어 무시' },
      ],
    },
    {
      id: 'chaos_dominion_valderon',
      faction: 'Chaos Dominion',
      name: 'Valderon',
      sourceName: 'Chaos Dominion Lord: Valderon',
      summary: '기본 속성 +15%, 낮은 HP 조건 피해/관통과 Valderon 배치 피해 보너스를 최대 기대값으로 반영',
      atkPctBonus: 0.15,
      damageBonus: 0.9,
      penetrationBonus: 0.2,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '낮은 HP 조건 피해 (최대)', value: 0.6 },
        { label: 'Valderon 배치 추가 피해', value: 0.3 },
        { label: '관통', value: 0.2, note: '방어 무시' },
      ],
    },
    {
      id: 'chaos_dominion_vladov',
      faction: 'Chaos Dominion',
      name: 'Vladov',
      sourceName: 'Chaos Dominion Lord: Vladov',
      summary: '기본 속성 +10%, 낮은 HP 조건 피해 +40%, 관통 +10%를 최대 조건으로 반영',
      atkPctBonus: 0.1,
      damageBonus: 0.4,
      penetrationBonus: 0.1,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스 (Epic Lord)', value: 0.1 },
        { label: '낮은 HP 조건 피해 (최대)', value: 0.4 },
        { label: '관통', value: 0.1, note: '방어 무시' },
      ],
    },
  ],
  cursed_cult: [
    {
      id: 'cursed_cult_morrigan',
      faction: 'Cursed Cult',
      name: 'Morrigan',
      sourceName: 'Cursed Cult Lord: Morrigan',
      summary: '기본 속성 +15%, CC 대상 피해 +30%, AoE 피해 +25%를 단순 기대값으로 반영',
      atkPctBonus: 0.15,
      damageBonus: 0.55,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: 'CC 대상 피해', value: 0.3 },
        { label: 'AoE 피해 (단순 기대값)', value: 0.25 },
      ],
    },
    {
      id: 'cursed_cult_ezareth',
      faction: 'Cursed Cult',
      name: 'Ezareth',
      sourceName: 'Cursed Cult Lord: Ezareth',
      summary: '기본 속성 +15%, CC 대상 피해 +30%, 팀 피해 +25%',
      atkPctBonus: 0.15,
      damageBonus: 0.55,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: 'CC 대상 피해', value: 0.3 },
        { label: '팀 피해', value: 0.25 },
      ],
    },
    {
      id: 'cursed_cult_demi',
      faction: 'Cursed Cult',
      name: 'Demi',
      sourceName: 'Cursed Cult Lord: Demi',
      summary: '기본 속성 +15%, CC 대상 피해 +30%, Demi 마법 누적 피해 +25%를 최대 조건으로 반영',
      atkPctBonus: 0.15,
      damageBonus: 0.55,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: 'CC 대상 피해', value: 0.3 },
        { label: 'Demi 마법 누적 피해 (최대 조건)', value: 0.25 },
      ],
    },
    {
      id: 'cursed_cult_aeon',
      faction: 'Cursed Cult',
      name: 'Aeon',
      sourceName: 'Cursed Cult Lord: Aeon',
      summary: '기본 속성 +10%, CC 대상 피해 +20%',
      atkPctBonus: 0.1,
      damageBonus: 0.2,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스 (Epic Lord)', value: 0.1 },
        { label: 'CC 대상 피해', value: 0.2 },
      ],
    },
  ],
  esoteria_order: [
    {
      id: 'esoteria_order_nastya',
      faction: 'Esoteria Order',
      name: 'Nastya',
      sourceName: 'Esoteria Order Lord: Nastya',
      summary: '기본 속성 +15%, 스킬 비용 감소, 디버프 대상 피해 최대 +40%',
      atkPctBonus: 0.15,
      damageBonus: 0.4,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '디버프 대상 피해 (최대)', value: 0.4 },
        { label: '스킬 비용 감소', text: '비용 -', note: 'DPS 식에는 미반영' },
      ],
    },
    {
      id: 'esoteria_order_cyrus',
      faction: 'Esoteria Order',
      name: 'Cyrus',
      sourceName: 'Esoteria Order Lord: Cyrus',
      summary: '기본 속성 +15%, 스킬 비용 감소, 아군 이탈/사망 후 피해 +25%',
      atkPctBonus: 0.15,
      damageBonus: 0.25,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '아군 이탈/사망 후 피해 (조건부)', value: 0.25 },
        { label: '스킬 비용 감소', text: '비용 -', note: 'DPS 식에는 미반영' },
      ],
    },
    {
      id: 'esoteria_order_venoma',
      faction: 'Esoteria Order',
      name: 'Venoma',
      sourceName: 'Esoteria Order Lord: Venoma',
      summary: '기본 속성 +15%, 스킬 비용 감소와 초기 Rage 증가',
      atkPctBonus: 0.15,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '스킬 비용 감소 / 초기 Rage', text: '비용 - / Rage +', note: 'DPS 식에는 미반영' },
      ],
    },
  ],
  north_throne: [
    {
      id: 'north_throne_king_harz',
      faction: 'North Throne',
      name: 'King Harz',
      sourceName: 'North Throne Lord: King Harz',
      summary: '기본 속성 +15%, 보호막/방어 중심 효과라 DPS에는 기본 속성만 반영',
      atkPctBonus: 0.15,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '보호막/방어 강화', text: '방어 +', note: 'DPS 식에는 미반영' },
      ],
    },
    {
      id: 'north_throne_elddr',
      faction: 'North Throne',
      name: 'Elddr',
      sourceName: 'North Throne Lord: Elddr',
      summary: '기본 속성 +15%, 보호막 중심 효과라 DPS에는 기본 속성만 반영',
      atkPctBonus: 0.15,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: '보호막 강화', text: '보호막 +', note: 'DPS 식에는 미반영' },
      ],
    },
  ],
  supreme_arbiter: [
    {
      id: 'supreme_arbiter_praetus',
      faction: 'Supreme Arbiter',
      name: 'Praetus',
      sourceName: 'Supreme Arbiter Lord: Praetus',
      summary: '기본 속성 +15%, Divinity/Sacred Blessing 계열은 정량화 전이라 기본 속성만 반영',
      atkPctBonus: 0.15,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: 'Divinity / Sacred Blessing', text: '버프', note: '정량화 전이라 DPS 식에는 미반영' },
      ],
    },
    {
      id: 'supreme_arbiter_oren',
      faction: 'Supreme Arbiter',
      name: 'Oren',
      sourceName: 'Supreme Arbiter Lord: Oren',
      summary: '기본 속성 +15%, Divinity 게이지 소비 시 추가 피해 +30%를 최대 조건으로 반영',
      atkPctBonus: 0.15,
      damageBonus: 0.3,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스', value: 0.15 },
        { label: 'Divinity 게이지 소비 시 추가 피해 (최대 조건)', value: 0.3 },
        { label: 'Sacred Blessing 계열', text: '버프', note: '정량화 전이라 DPS 식에는 미반영' },
      ],
    },
    {
      id: 'supreme_arbiter_elysia',
      faction: 'Supreme Arbiter',
      name: 'Elysia',
      sourceName: 'Supreme Arbiter Lord: Elysia',
      summary: '기본 속성 +10%, Divinity 계열은 정량화 전이라 기본 속성만 반영',
      atkPctBonus: 0.1,
      damageBreakdown: [
        { label: 'Lord 배치 기본 공격력 보너스 (Epic Lord)', value: 0.1 },
        { label: 'Divinity 계열', text: '버프', note: '정량화 전이라 DPS 식에는 미반영' },
      ],
    },
  ],
}

export function getLordOptionsForFactions(factions: string[]) {
  return factions.flatMap((faction) => lordEffects[factionKey(faction)] ?? [])
}

export function findLordEffect(id: string | undefined, factions: string[]) {
  if (!id || id === 'none') return undefined
  return getLordOptionsForFactions(factions).find((effect) => effect.id === id)
}
