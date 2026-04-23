export type ExclusiveEffect = {
  id: string
  sourceName: string
  summary: string
  damageBonus?: number
  critDmgBonus?: number
  atkPctBonus?: number
  antiAirDamageBonus?: number
  penetrationBonus?: number
  condition?: 'antiAir' | 'ultimate' | 'belowHalfHp' | 'none'
}

export const factionExclusiveEffects: Record<string, ExclusiveEffect> = {
  watchguard: {
    id: 'watchguard',
    sourceName: 'Watchguard',
    summary: '피해량 +8%, 치유 효과 +8%',
    damageBonus: 0.08,
    condition: 'none',
  },
  north_throne: {
    id: 'north_throne',
    sourceName: 'North Throne',
    summary: '배치 시 최대 HP +10%',
    condition: 'none',
  },
  nightmare_council: {
    id: 'nightmare_council',
    sourceName: 'Nightmare Council',
    summary: '기본 공격 5% 추가타 기대값',
    damageBonus: 0.05,
    condition: 'none',
  },
  cursed_cult: {
    id: 'cursed_cult',
    sourceName: 'Cursed Cult',
    summary: 'CC 대상 피해 +10%',
    damageBonus: 0.1,
    condition: 'none',
  },
  infernal_blast: {
    id: 'infernal_blast',
    sourceName: 'Infernal Blast',
    summary: '궁 사용 시 치피 +15%, 관통 +10%',
    critDmgBonus: 15,
    penetrationBonus: 0.1,
    condition: 'ultimate',
  },
  star_piercers: {
    id: 'star_piercers',
    sourceName: 'Star Piercers',
    summary: '공중 대상 피해 +8%',
    antiAirDamageBonus: 0.08,
    condition: 'antiAir',
  },
  esoteria_order: {
    id: 'esoteria_order',
    sourceName: 'Esoteria Order',
    summary: '궁 사용 시 Rage 회복 8%',
    damageBonus: 0.04,
    condition: 'ultimate',
  },
  supreme_arbiter: {
    id: 'supreme_arbiter',
    sourceName: 'Supreme Arbiter',
    summary: '배치 시 ATK +5%',
    atkPctBonus: 0.05,
    condition: 'none',
  },
  chaos_dominion: {
    id: 'chaos_dominion',
    sourceName: 'Chaos Dominion',
    summary: 'HP 50% 이하 피해 +12%',
    damageBonus: 0.12,
    condition: 'belowHalfHp',
  },
}

export const heroExclusiveEffects: Record<string, ExclusiveEffect> = {
  lady_alexandra: {
    id: 'lady_alexandra',
    sourceName: 'Divine Justice',
    summary: '마크 대상 피해 증가',
    damageBonus: 0.2,
    condition: 'none',
  },
  iovar: {
    id: 'iovar',
    sourceName: "Sentinel's Eye",
    summary: 'Infinite Blades 발동 시 피해 증가',
    damageBonus: 0.3,
    condition: 'none',
  },
  setram: {
    id: 'setram',
    sourceName: '전용 장비',
    summary: '실드 대상 피해 +20%',
    damageBonus: 0.2,
    condition: 'none',
  },
}
