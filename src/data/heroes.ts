export type Hero = {
  id: string
  name: string
  baseAtk: number
  baseInterval: number
  awakeningAtkBonus: number
  burstAtkBonusPer100Aspd?: number
  description: string
}

export const heroes: Hero[] = [
  {
    id: 'ingrid',
    name: 'Ingrid',
    baseAtk: 6102,
    baseInterval: 3.0,
    awakeningAtkBonus: 300,
    description: '평타/모드 전환형 딜러. 공속 구간과 세트 선택 비교에 적합.'
  },
  {
    id: 'count_dracula',
    name: 'Count Dracula',
    baseAtk: 5103,
    baseInterval: 10.0,
    awakeningAtkBonus: 300,
    burstAtkBonusPer100Aspd: 0.1,
    description: '보너스 공속이 피해 증가와 연결되는 특수 딜러.'
  },
  {
    id: 'silas',
    name: 'Silas',
    baseAtk: 5600,
    baseInterval: 2.6,
    awakeningAtkBonus: 300,
    description: '기본 공격 기반 단일딜 비교용 시드 데이터.'
  },
  {
    id: 'hex',
    name: 'Hex',
    baseAtk: 5450,
    baseInterval: 2.8,
    awakeningAtkBonus: 300,
    description: '치명타/공격력 비교 테스트용 시드 데이터.'
  }
]
