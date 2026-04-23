export type HeroSimulationProfile = {
  heroId: string
  battleWindowSec: number
  basicDamageMultiplier: number
  ultimateDamageMultiplier: number
  markDamageBonus?: number
  antiAirDamageBonus?: number
  penetrationBonus?: number
  notes: string[]
}

export const defaultHeroProfile: HeroSimulationProfile = {
  heroId: 'default',
  battleWindowSec: 30,
  basicDamageMultiplier: 1,
  ultimateDamageMultiplier: 1,
  notes: ['공통 프로필'],
}

export const heroProfiles: Record<string, HeroSimulationProfile> = {
  lady_alexandra: {
    heroId: 'lady_alexandra',
    battleWindowSec: 30,
    basicDamageMultiplier: 1,
    ultimateDamageMultiplier: 1.15,
    markDamageBonus: 0.15,
    antiAirDamageBonus: 0.08,
    penetrationBonus: 0.3,
    notes: ['Mark of Enmity 대상 피해 증가', 'Anti-Air 조건 지원', 'DEF 관통 보정 지원'],
  },
  ingrid: {
    heroId: 'ingrid',
    battleWindowSec: 30,
    basicDamageMultiplier: 1.1,
    ultimateDamageMultiplier: 1.1,
    notes: ['기본 공격형 프로필', '우측 3세트와 공속 비교 중심'],
  },
  count_dracula: {
    heroId: 'count_dracula',
    battleWindowSec: 30,
    basicDamageMultiplier: 1.05,
    ultimateDamageMultiplier: 1.2,
    notes: ['공속 연동 피해 증가 고려', '장기전 30초 창 기준'],
  },
  iovar: {
    heroId: 'iovar',
    battleWindowSec: 30,
    basicDamageMultiplier: 1.15,
    ultimateDamageMultiplier: 1.05,
    antiAirDamageBonus: 0.08,
    notes: ['기본 공격 중심', 'Anti-Air 조건 지원'],
  },
}
