import { heroes as generatedHeroes } from './heroes.generated'

export type Hero = {
  id: string
  name: string
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
  attackSpeedProfileBaseIntervalOverride?: number
  burstAtkBonusPer100Aspd?: number
}

const heroOverrides: Partial<Record<string, Partial<Hero>>> = {
  ingrid: {
    description: '평타/모드 전환형 딜러. 공속 구간과 세트 선택 비교에 적합.',
    awakeningAtkBonus: 300,
  },
  count_dracula: {
    description: '보너스 공속이 피해 증가와 연결되는 특수 딜러.',
    awakeningAtkBonus: 300,
    burstAtkBonusPer100Aspd: 0.1,
  },
  silas: {
    description: '기본 공격 기반 단일딜 비교용 영웅.',
    awakeningAtkBonus: 300,
  },
  hex: {
    description: '치명타/공격력 비교 테스트에 자주 쓰이는 영웅.',
    awakeningAtkBonus: 300,
  },
  lady_alexandra: {
    awakeningAtkBonus: 300,
    attackSpeedProfileBaseIntervalOverride: 2.0,
  },
}

export const heroes: Hero[] = generatedHeroes.map((hero) => ({
  ...hero,
  description: hero.description || `${hero.rarity} ${hero.heroClass} / ${hero.damageType}`,
  awakeningAtkBonus: 0,
  ...heroOverrides[hero.id],
}))
