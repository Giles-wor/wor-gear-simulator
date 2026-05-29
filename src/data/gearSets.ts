export type GearSet = {
  id: string
  name: string
  /** 한글 이름 (인게임 표기) */
  nameKo?: string
  slotType: '좌측 2세트' | '우측 3세트'
  atkPct?: number
  critDmg?: number
  attackSpeed?: number
  normalDamage?: number
  damagePct?: number
  conditionLabel?: string
  defaultUptime?: number
  conditionalDisplay?: {
    type: 'none' | 'infernal_roar' | 'soulbound_arcana' | 'cataclysm' | 'hells_lament'
    summary: string
  }
  notes: string
}

/** 세트 한글 우선 표시명 (한글 없으면 영문). */
export function gearSetLabel(set: Pick<GearSet, 'name' | 'nameKo'> | undefined): string {
  if (!set) return '-'
  return set.nameKo ?? set.name
}

export const leftSets: GearSet[] = [
  {
    id: 'none_left',
    name: '없음',
    slotType: '좌측 2세트',
    notes: '세트 효과 없음'
  },
  {
    id: 'warlord',
    name: 'Warlord',
    nameKo: '전쟁의 주인',
    slotType: '좌측 2세트',
    atkPct: 0.25,
    attackSpeed: 30,
    notes: '공격력 +25%, 공격 속도 +30'
  },
  {
    id: 'wicked_vengeance',
    name: 'Wicked Vengeance',
    nameKo: '악의 복수',
    slotType: '좌측 2세트',
    atkPct: 0.10,
    critDmg: 40,
    notes: '공격력 +10%, 치명타 피해 +40'
  }
]

export const rightSets: GearSet[] = [
  {
    id: 'none_right',
    name: '없음',
    slotType: '우측 3세트',
    notes: '세트 효과 없음'
  },
  {
    id: 'infernal_roar',
    name: 'Infernal Roar',
    nameKo: '마수의 포효',
    slotType: '우측 3세트',
    normalDamage: 0.40,
    defaultUptime: 1,
    conditionalDisplay: {
      type: 'infernal_roar',
      summary: '일반 공격 피해에만 +40% 적용, 스킬 공격 피해에는 적용되지 않음'
    },
    notes: '일반 공격 피해 +40%'
  },
  {
    id: 'soulbound_arcana',
    name: 'Soulbound Arcana',
    nameKo: '영혼의 비밀',
    slotType: '우측 3세트',
    damagePct: 0.50,
    conditionLabel: '궁 사용 후 중첩 유지율',
    defaultUptime: 0.7,
    conditionalDisplay: {
      type: 'soulbound_arcana',
      summary: '스킬 사용 횟수에 따라 피해 증가 10%씩 누적'
    },
    notes: '궁 사용 후 피해 증가 최대 5중첩, 평균 유지율로 반영'
  },
  {
    id: 'cataclysm',
    name: 'Cataclysm',
    nameKo: '재앙 드래곤',
    slotType: '우측 3세트',
    damagePct: 0.50,
    conditionLabel: '치명타 중첩 유지율',
    defaultUptime: 0.75,
    conditionalDisplay: {
      type: 'cataclysm',
      summary: '치명타 횟수에 따라 피해 증가 10%씩 누적'
    },
    notes: '기본 공격 치명타 적중 시 피해 증가, 최대 중첩 유지율로 반영'
  },
  {
    id: 'hells_lament',
    name: "Hell's Lament",
    nameKo: '지옥 비명',
    slotType: '우측 3세트',
    critDmg: 50,
    damagePct: 0.35,
    conditionLabel: '궁 버프 유지율',
    defaultUptime: 0.5,
    conditionalDisplay: {
      type: 'hells_lament',
      summary: '궁극기 사용 여부에 따라 피해량/치피 보정이 달라짐'
    },
    notes: '궁 사용 후 20초 동안 피해량 +35%, 치명타 피해 +50%'
  }
]
