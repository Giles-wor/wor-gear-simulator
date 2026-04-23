export type GearSet = {
  id: string
  name: string
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
    slotType: '좌측 2세트',
    atkPct: 0.25,
    attackSpeed: 30,
    notes: '공격력 +25%, 공격 속도 +30'
  },
  {
    id: 'wicked_vengeance',
    name: 'Wicked Vengeance',
    slotType: '좌측 2세트',
    atkPct: 0.10,
    critDmg: 40,
    notes: '공격력 +10%, 치명타 피해 +40'
  },
  {
    id: 'annihilating_might',
    name: 'Annihilating Might',
    slotType: '좌측 2세트',
    atkPct: 0.15,
    notes: '공격력 +15%'
  },
  {
    id: 'calamity',
    name: 'Calamity',
    slotType: '좌측 2세트',
    damagePct: 0.10,
    notes: '피해량 +10%'
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
    slotType: '우측 3세트',
    critDmg: 30,
    damagePct: 0.20,
    conditionLabel: '궁 버프 유지율',
    defaultUptime: 0.5,
    conditionalDisplay: {
      type: 'hells_lament',
      summary: '궁극기 사용 여부에 따라 피해량/치피 보정이 달라짐'
    },
    notes: '궁 사용 후 일정 시간 피해량/치피 증가'
  }
]
