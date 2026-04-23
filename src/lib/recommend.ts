import type { Hero } from '../data/heroes'
import type { GearSet } from '../data/gearSets'
import type { BuildInput } from './calc'
import { calculateBuild } from './calc'

export function getBestStatRecommendation(
  hero: Hero,
  leftSet: GearSet | undefined,
  rightSet: GearSet | undefined,
  build: BuildInput,
) {
  const current = calculateBuild(hero, leftSet, rightSet, build)

  if (current.critAlert) {
    return {
      title: '치확 우선',
      reason: '치명타 확률이 100% 미만입니다. 현재 메타 기준으로 치확 100을 먼저 맞추는 편이 좋습니다.'
    }
  }

  const atkBuild = { ...build, totalAtk: build.totalAtk + 1000 }
  const cdBuild = { ...build, critDmg: build.critDmg + 25 }
  const aspdBuild = { ...build, attackSpeed: build.attackSpeed + Math.max(build.attackSpeed < 0 ? 0 : 20, current.neededAspd ?? 20) }

  const atkGain = calculateBuild(hero, leftSet, rightSet, atkBuild).defenseIgnoreDps10s - current.defenseIgnoreDps10s
  const cdGain = calculateBuild(hero, leftSet, rightSet, cdBuild).defenseIgnoreDps10s - current.defenseIgnoreDps10s
  const aspdGain = calculateBuild(hero, leftSet, rightSet, aspdBuild).defenseIgnoreDps10s - current.defenseIgnoreDps10s

  const ranking = [
    { key: '공격력', gain: atkGain },
    { key: '치피', gain: cdGain },
    { key: '공속', gain: aspdGain }
  ].sort((a, b) => b.gain - a.gain)

  return {
    title: `${ranking[0].key} 우선`,
    reason: `현재 기준 기대 DPS 상승폭은 ${ranking[0].key} > ${ranking[1].key} > ${ranking[2].key} 순입니다.`
  }
}
