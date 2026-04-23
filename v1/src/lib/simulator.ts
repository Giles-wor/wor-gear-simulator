import type { Hero } from '../../../src/data/heroes'
import type { GearSet } from '../../../src/data/gearSets'
import { getBreakpointInfo } from '../../../src/lib/calc'
import type { Artifact } from '../data/artifacts'
import type { ExclusiveEffect } from '../data/exclusiveEffects'
import { defaultHeroProfile, heroProfiles } from '../data/heroProfiles'

export type SimulationConditions = {
  antiAir: boolean
  burningTarget: boolean
  ccedTarget: boolean
  markedTarget: boolean
  targetBelowHalfHp: boolean
  hpAbove80: boolean
  ultimateFromStart: boolean
}

export type ExtendedSimulationResult = {
  finalAtk: number
  finalAspd: number
  interval: number
  cumulative30s: number
  dps30s: number
  basicHit: number
  ultimateHit: number
  timeline30s: { second: number; cumulativeDamage: number }[]
  appliedEffects: string[]
}

function getDamageMultiplier(critRate: number, critDmg: number) {
  const critRateRatio = Math.min(critRate, 100) / 100
  return 1 + critRateRatio * (critDmg / 100 - 1)
}

function resolveExclusiveBonus(effect: ExclusiveEffect | undefined, conditions: SimulationConditions) {
  if (!effect) return { atkPctBonus: 0, damageBonus: 0, critDmgBonus: 0, penetrationBonus: 0, notes: [] as string[] }

  if (effect.condition === 'antiAir' && !conditions.antiAir) return { atkPctBonus: 0, damageBonus: 0, critDmgBonus: 0, penetrationBonus: 0, notes: [] as string[] }
  if (effect.condition === 'ultimate' && !conditions.ultimateFromStart) return { atkPctBonus: 0, damageBonus: 0, critDmgBonus: 0, penetrationBonus: 0, notes: [] as string[] }
  if (effect.condition === 'belowHalfHp' && !conditions.targetBelowHalfHp) return { atkPctBonus: 0, damageBonus: 0, critDmgBonus: 0, penetrationBonus: 0, notes: [] as string[] }

  return {
    atkPctBonus: effect.atkPctBonus ?? 0,
    damageBonus: (effect.damageBonus ?? 0) + (conditions.antiAir ? effect.antiAirDamageBonus ?? 0 : 0),
    critDmgBonus: effect.critDmgBonus ?? 0,
    penetrationBonus: effect.penetrationBonus ?? 0,
    notes: [effect.summary],
  }
}

function resolveArtifactBonus(artifact: Artifact, conditions: SimulationConditions) {
  if (artifact.condition === 'hpAbove80' && !conditions.hpAbove80) return { damageBonus: 0, critDmgBonus: 0, extraHitsPerBasic: 0, notes: [] as string[] }
  if (artifact.condition === 'burningTarget' && !conditions.burningTarget) return { damageBonus: 0, critDmgBonus: 0, extraHitsPerBasic: 0, notes: [] as string[] }

  return {
    damageBonus: artifact.damageBonus ?? 0,
    critDmgBonus: artifact.critDmgBonus ?? 0,
    extraHitsPerBasic: artifact.extraHitsPerBasic ?? 0,
    notes: artifact.id === 'none' ? [] : [artifact.effectSummary],
  }
}

function getRightSetBonus(rightSet: GearSet | undefined, conditions: SimulationConditions, hitIndex: number, attackType: 'basic' | 'ultimate') {
  if (!rightSet) return { damageBonus: 0, critDmgBonus: 0 }

  if (rightSet.id === 'infernal_roar') {
    return { damageBonus: attackType === 'basic' ? 0.4 : 0, critDmgBonus: 0 }
  }

  if (rightSet.id === 'cataclysm') {
    return { damageBonus: Math.min(Math.max(hitIndex - 1, 0) * 0.1, 0.5), critDmgBonus: 0 }
  }

  if (rightSet.id === 'soulbound_arcana') {
    return { damageBonus: conditions.ultimateFromStart ? 0.5 : 0.1, critDmgBonus: 0 }
  }

  if (rightSet.id === 'hells_lament') {
    return conditions.ultimateFromStart ? { damageBonus: 0.2, critDmgBonus: 30 } : { damageBonus: 0, critDmgBonus: 0 }
  }

  return { damageBonus: rightSet.damagePct ?? 0, critDmgBonus: rightSet.critDmg ?? 0 }
}

export function simulateHeroLoadout(params: {
  hero: Hero
  leftSet?: GearSet
  rightSet?: GearSet
  artifact: Artifact
  factionExclusive?: ExclusiveEffect
  heroExclusive?: ExclusiveEffect
  totalAtk: number
  critRate: number
  critDmg: number
  totalAspd: number
  awakeningOn: boolean
  pantheonOn: boolean
  conditions: SimulationConditions
}) {
  const {
    hero,
    leftSet,
    rightSet,
    artifact,
    factionExclusive,
    heroExclusive,
    totalAtk,
    critRate,
    critDmg,
    totalAspd,
    awakeningOn,
    pantheonOn,
    conditions,
  } = params

  const profile = heroProfiles[hero.id] ?? defaultHeroProfile
  const leftDamageBonus = leftSet?.damagePct ?? 0
  const pantheonBonus = pantheonOn ? 40 : 0
  const finalAspd = totalAspd + pantheonBonus
  const bp = getBreakpointInfo(hero.attackSpeedProfileBaseIntervalOverride ?? hero.baseInterval, finalAspd)

  const factionBonus = resolveExclusiveBonus(factionExclusive, conditions)
  const heroExclusiveBonus = resolveExclusiveBonus(heroExclusive, conditions)
  const artifactBonus = resolveArtifactBonus(artifact, conditions)

  const finalAtk = Math.round(
    totalAtk +
    (awakeningOn ? hero.awakeningAtkBonus : 0) +
    totalAtk * ((factionBonus.atkPctBonus ?? 0) + (heroExclusiveBonus.atkPctBonus ?? 0)),
  )

  const battleSeconds = profile.battleWindowSec
  const timeline30s: { second: number; cumulativeDamage: number }[] = []
  const hitTimes: number[] = []
  let time = 0
  while (time <= battleSeconds + 1e-9) {
    hitTimes.push(Number(time.toFixed(4)))
    time += bp.interval
  }

  const basePenetration =
    (profile.penetrationBonus ?? 0) +
    (factionBonus.penetrationBonus ?? 0) +
    (heroExclusiveBonus.penetrationBonus ?? 0)

  let cumulativeDamage = 0
  let processed = 0
  let hitIndex = 0
  let lastBasicHit = 0
  let lastUltimateHit = 0
  const appliedEffects = [...profile.notes, ...factionBonus.notes, ...heroExclusiveBonus.notes, ...artifactBonus.notes]

  for (let second = 0; second <= battleSeconds; second += 1) {
    while (processed < hitTimes.length && hitTimes[processed] <= second + 1e-9) {
      hitIndex += 1
      const attackType = conditions.ultimateFromStart && hitIndex % 5 === 0 ? 'ultimate' : 'basic'
      const profileDamageBonus =
        (conditions.markedTarget ? profile.markDamageBonus ?? 0 : 0) +
        (conditions.antiAir ? profile.antiAirDamageBonus ?? 0 : 0)
      const rightSetBonus = getRightSetBonus(rightSet, conditions, hitIndex, attackType)
      const critMultiplier = getDamageMultiplier(
        critRate,
        critDmg + rightSetBonus.critDmgBonus + factionBonus.critDmgBonus + heroExclusiveBonus.critDmgBonus + artifactBonus.critDmgBonus,
      )
      const defense = Math.max(5000 * (1 - basePenetration), finalAtk * 0.05)
      const rawDamage = Math.max(finalAtk - defense, finalAtk * 0.05)
      const hitDamage =
        rawDamage *
        critMultiplier *
        (1 +
          leftDamageBonus +
          profileDamageBonus +
          rightSetBonus.damageBonus +
          factionBonus.damageBonus +
          heroExclusiveBonus.damageBonus +
          artifactBonus.damageBonus) *
        (attackType === 'ultimate' ? profile.ultimateDamageMultiplier : profile.basicDamageMultiplier)

      const effectiveHitDamage =
        hitDamage * (attackType === 'basic' ? 1 + artifactBonus.extraHitsPerBasic : 1)

      cumulativeDamage += effectiveHitDamage

      if (attackType === 'basic') {
        lastBasicHit = Math.round(effectiveHitDamage)
      } else {
        lastUltimateHit = Math.round(effectiveHitDamage)
      }

      processed += 1
    }

    timeline30s.push({
      second,
      cumulativeDamage: Math.round(cumulativeDamage),
    })
  }

  return {
    finalAtk,
    finalAspd,
    interval: bp.interval,
    cumulative30s: Math.round(cumulativeDamage),
    dps30s: Math.round(cumulativeDamage / battleSeconds),
    basicHit: lastBasicHit,
    ultimateHit: lastUltimateHit || lastBasicHit,
    timeline30s,
    appliedEffects,
  } satisfies ExtendedSimulationResult
}
