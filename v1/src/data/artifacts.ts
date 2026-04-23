export type Artifact = {
  id: string
  name: string
  effectSummary: string
  damageBonus?: number
  critDmgBonus?: number
  extraHitsPerBasic?: number
  condition?: 'hpAbove80' | 'burningTarget' | 'none'
}

export const artifacts: Artifact[] = [
  {
    id: 'none',
    name: '없음',
    effectSummary: '아티팩트 미적용',
    condition: 'none',
  },
  {
    id: 'slayers_malice',
    name: "Slayer's Malice",
    effectSummary: 'HP 80% 이상일 때 피해 증가',
    damageBonus: 0.15,
    condition: 'hpAbove80',
  },
  {
    id: 'blade_of_talkiel',
    name: 'Blade of Talkiel',
    effectSummary: 'Burning 대상 추가 피해',
    damageBonus: 0.25,
    condition: 'burningTarget',
  },
  {
    id: 'watchguards_ambition',
    name: "The Watchguard's Ambition",
    effectSummary: '기본 공격 추가타 기대값 반영',
    extraHitsPerBasic: 0.12,
    condition: 'none',
  },
  {
    id: 'warsong',
    name: 'Warsong',
    effectSummary: '기본 피해 증가',
    damageBonus: 0.1,
    condition: 'none',
  },
]
