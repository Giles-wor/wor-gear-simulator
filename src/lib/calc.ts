import type { Hero } from '../data/heroes'
import type { GearSet } from '../data/gearSets'
import { getAttackSpeedProfile } from '../data/attackSpeed'

export type BuildInput = {
  totalAtk: number
  critRate: number
  critDmg: number
  attackSpeed: number
  awakeningOn: boolean
  pantheonAspdOn: boolean
  leftSetId: string
  rightSetId: string
  setUptime: number
}

export type DamageResult = {
  finalAtk: number
  finalCritRate: number
  finalCritDmg: number
  pantheonAspdBonus: number
  bonusAspd: number
  totalAspd: number
  interval: number
  nextThreshold: number | null
  neededAspd: number | null
  normalDamageBonus: number
  totalDamageBonus: number
  scenarioDps: { label: string; defense: number; dps: number }[]
  avgDps: number
  critAlert: boolean
}

function clampUptime(value: number) {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function getBreakpointInfo(baseInterval: number, totalAspd: number) {
  const profile = getAttackSpeedProfile(baseInterval)
  const table = profile.breakpoints
  let current = table[0]
  let next: typeof current | null = null

  for (let i = 0; i < table.length; i += 1) {
    if (totalAspd >= table[i].requiredTotalAspd) {
      current = table[i]
      next = table[i + 1] ?? null
    }
  }

  return {
    interval: current.interval,
    nextThreshold: next?.requiredTotalAspd ?? null,
    neededAspd: next ? Math.max(0, next.requiredTotalAspd - totalAspd) : null
  }
}

export function findSetById(id: string, sets: GearSet[]) {
  return sets.find((set) => set.id === id)
}

function damageMultiplier(rightSet: GearSet | undefined, uptime: number) {
  if (!rightSet) return { normalDamageBonus: 0, totalDamageBonus: 0, bonusCritDmg: 0 }
  const fallbackUptime = rightSet.defaultUptime ?? 1
  const appliedUptime = rightSet.defaultUptime === undefined ? 1 : clampUptime(Number.isFinite(uptime) ? uptime : fallbackUptime)
  return {
    normalDamageBonus: (rightSet.normalDamage ?? 0) * appliedUptime,
    totalDamageBonus: (rightSet.damagePct ?? 0) * appliedUptime,
    bonusCritDmg: (rightSet.critDmg ?? 0) * appliedUptime
  }
}

export function calculateBuild(
  hero: Hero,
  leftSet: GearSet | undefined,
  rightSet: GearSet | undefined,
  build: BuildInput,
  scenarios: { label: string; defense: number }[],
): DamageResult {
  const awakeningBonus = build.awakeningOn ? hero.awakeningAtkBonus : 0
  const pantheonAspdBonus = build.pantheonAspdOn ? 40 : 0
  const leftSetDamagePct = leftSet?.damagePct ?? 0
  const { normalDamageBonus, totalDamageBonus, bonusCritDmg } = damageMultiplier(rightSet, build.setUptime)

  const finalAtk = Math.round(build.totalAtk + awakeningBonus)
  const finalCritRate = build.critRate
  const finalCritDmg = build.critDmg + bonusCritDmg
  const bonusAspd = build.attackSpeed + pantheonAspdBonus
  const totalAspd = 100 + bonusAspd
  const bp = getBreakpointInfo(hero.baseInterval, totalAspd)

  const critRateRatio = Math.min(finalCritRate, 100) / 100
  const critMultiplier = 1 + critRateRatio * (finalCritDmg / 100 - 1)
  const draculaBurstBonus = hero.burstAtkBonusPer100Aspd ? (bonusAspd / 100) * hero.burstAtkBonusPer100Aspd : 0

  const scenarioDps = scenarios.map((scenario) => {
    const rawDamage = Math.max(finalAtk - scenario.defense, finalAtk * 0.05)
    const critAppliedDamage = rawDamage * critMultiplier
    const hitDamage = critAppliedDamage * (1 + normalDamageBonus + leftSetDamagePct + totalDamageBonus + draculaBurstBonus)
    const dps = hitDamage / bp.interval
    return {
      label: scenario.label,
      defense: scenario.defense,
      dps: Math.round(dps)
    }
  })

  const avgDps = Math.round(scenarioDps.reduce((sum, item) => sum + item.dps, 0) / scenarioDps.length)

  return {
    finalAtk,
    finalCritRate,
    finalCritDmg,
    pantheonAspdBonus,
    bonusAspd,
    totalAspd,
    interval: bp.interval,
    nextThreshold: bp.nextThreshold,
    neededAspd: bp.neededAspd,
    normalDamageBonus,
    totalDamageBonus: leftSetDamagePct + totalDamageBonus + draculaBurstBonus,
    scenarioDps,
    avgDps,
    critAlert: finalCritRate < 100
  }
}
