export type HeroSimulationProfile = {
  heroId: string
  battleWindowSec: number
  basicDamageMultiplier: number
  ultimateDamageMultiplier: number
  aspdDamageBonusPer100?: number
  markDamageBonus?: number
  antiAirDamageBonus?: number
  penetrationBonus?: number
  ultimateStartDamageBonus?: number
  burningDamageBonus?: number
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
    ultimateStartDamageBonus: 0.1,
    markDamageBonus: 0.15,
    antiAirDamageBonus: 0.08,
    penetrationBonus: 0.3,
    notes: ['Mark of Enmity 대상 피해 증가', 'Anti-Air 조건 지원', 'Seal of Retribution 시작 버프 반영', 'DEF 관통 보정 지원'],
  },
  ingrid: {
    heroId: 'ingrid',
    battleWindowSec: 30,
    basicDamageMultiplier: 1.1,
    ultimateDamageMultiplier: 1.1,
    antiAirDamageBonus: 0.08,
    notes: ['Solar/Stellar 모드 전환형 기본 프로필', '기본 공격 누적형 영웅으로 가정', '우측 3세트와 공속 비교 중심'],
  },
  count_dracula: {
    heroId: 'count_dracula',
    battleWindowSec: 30,
    basicDamageMultiplier: 1.05,
    ultimateDamageMultiplier: 1.2,
    aspdDamageBonusPer100: 0.1,
    ultimateStartDamageBonus: 0.15,
    antiAirDamageBonus: 0.08,
    notes: ['공속 100당 피해 증가 반영', '궁극기 시작 상태 가정', 'Anti-Air 조건 지원', '장기전 30초 창 기준'],
  },
  iovar: {
    heroId: 'iovar',
    battleWindowSec: 30,
    basicDamageMultiplier: 1.15,
    ultimateDamageMultiplier: 1.05,
    ultimateStartDamageBonus: 0.15,
    antiAirDamageBonus: 0.08,
    notes: ['Infinite Blades 발동형 프로필', '기본 공격 중심', 'Anti-Air 조건 지원'],
  },
  anai: {
    heroId: 'anai',
    battleWindowSec: 30,
    basicDamageMultiplier: 1,
    ultimateDamageMultiplier: 1.1,
    burningDamageBonus: 0.35,
    notes: ['Burning 대상 추가 피해 반영', '전용 장비의 Burning 시너지 실험용'],
  },
}
