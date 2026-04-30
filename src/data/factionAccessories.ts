export type FactionAccessoryEffect = {
  id: string
  faction: string
  sourceName: string
  summary: string
  atkPctBonus?: number
  damageBonus?: number
  critDmgBonus?: number
  penetrationBonus?: number
}

export const factionAccessoryEffects: Record<string, FactionAccessoryEffect> = {
  watchguard: {
    id: 'watchguard',
    faction: 'Watchguard',
    sourceName: 'Watchguard 3세트 악세서리',
    summary: '피해량 +8%',
    damageBonus: 0.08,
  },
  north_throne: {
    id: 'north_throne',
    faction: 'North Throne',
    sourceName: 'North Throne 3세트 악세서리',
    summary: '최대 HP 보정 효과라 DPS 계산에는 직접 반영하지 않음',
  },
  nightmare_council: {
    id: 'nightmare_council',
    faction: 'Nightmare Council',
    sourceName: 'Nightmare Council 3세트 악세서리',
    summary: '기본 공격 추가타 기대값을 피해 +5%로 단순 반영',
    damageBonus: 0.05,
  },
  cursed_cult: {
    id: 'cursed_cult',
    faction: 'Cursed Cult',
    sourceName: 'Cursed Cult 3세트 악세서리',
    summary: 'CC 대상 피해 +10%',
    damageBonus: 0.1,
  },
  infernal_blast: {
    id: 'infernal_blast',
    faction: 'Infernal Blast',
    sourceName: 'Infernal Blast 3세트 악세서리',
    summary: '궁극기 사용 조건을 활성 상태로 보고 치피 +15%, 관통 +10%',
    critDmgBonus: 15,
    penetrationBonus: 0.1,
  },
  star_piercers: {
    id: 'star_piercers',
    faction: 'Star Piercers',
    sourceName: 'Star Piercers 3세트 악세서리',
    summary: '공중 대상 피해 +8%',
    damageBonus: 0.08,
  },
  esoteria_order: {
    id: 'esoteria_order',
    faction: 'Esoteria Order',
    sourceName: 'Esoteria Order 3세트 악세서리',
    summary: 'Rage 회복 계열 효과를 피해 +4% 기대값으로 단순 반영',
    damageBonus: 0.04,
  },
  supreme_arbiter: {
    id: 'supreme_arbiter',
    faction: 'Supreme Arbiter',
    sourceName: 'Supreme Arbiter 3세트 악세서리',
    summary: '배치 시 ATK +5%',
    atkPctBonus: 0.05,
  },
  chaos_dominion: {
    id: 'chaos_dominion',
    faction: 'Chaos Dominion',
    sourceName: 'Chaos Dominion 3세트 악세서리',
    summary: 'HP 50% 이하 조건을 활성 상태로 보고 피해 +12%',
    damageBonus: 0.12,
  },
}

export function factionKey(faction: string) {
  return faction.toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

export function getFactionAccessoryOptions(factions: string[]) {
  return factions.map((faction) => factionAccessoryEffects[factionKey(faction)]).filter(Boolean)
}

export function findFactionAccessory(id: string | undefined, factions: string[]) {
  if (!id || id === 'none') return undefined
  return getFactionAccessoryOptions(factions).find((effect) => effect.id === id)
}
