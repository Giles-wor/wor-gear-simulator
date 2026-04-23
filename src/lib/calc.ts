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
  awakeningAtkBonusApplied: number
  attackSpeedProfileBaseInterval: number
  pantheonAspdBonus: number
  totalAspd: number
  finalAspd: number
  interval: number
  nextThreshold: number | null
  neededAspd: number | null
  normalDamageBonus: number
  totalDamageBonus: number
  statDamageIgnoreDefense: number
  itemMaxDamageIgnoreDefense: number
  statDamageMidDefense: number
  itemMaxDamageMidDefense: number
  itemMaxDps10s: number
  rightSetSummary: {
    name: string
    summary: string
    details: string[]
  }
  critAlert: boolean
}

function clampUptime(value: number) {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function getBreakpointInfo(baseInterval: number, finalAspd: number) {
  const profile = getAttackSpeedProfile(baseInterval)
  const table = profile.breakpoints
  let current = table[0]
  let next: typeof current | null = null

  for (let i = 0; i < table.length; i += 1) {
    if (finalAspd >= table[i].requiredTotalAspd) {
      current = table[i]
      next = table[i + 1] ?? null
    }
  }

  return {
    profileBaseInterval: profile.baseInterval,
    interval: current.interval,
    nextThreshold: next?.requiredTotalAspd ?? null,
    neededAspd: next ? Math.max(0, next.requiredTotalAspd - finalAspd) : null
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

function calculateDamageMetrics(
  finalAtk: number,
  critMultiplier: number,
  interval: number,
  damageBonus: number,
  defense: number,
) {
  const rawDamage = Math.max(finalAtk - defense, finalAtk * 0.05)
  const critAppliedDamage = rawDamage * critMultiplier
  const hitDamage = critAppliedDamage * (1 + damageBonus)

  return {
    damage: Math.round(hitDamage),
    dps10s: Math.round((hitDamage / interval) * 10),
  }
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function getRightSetSummary(rightSet: GearSet | undefined) {
  if (!rightSet) {
    return {
      name: '없음',
      summary: '우측 3세트 조건부 효과 없음',
      details: ['조건부 효과를 따로 계산하지 않습니다.']
    }
  }

  const display = rightSet.conditionalDisplay

  if (!display || display.type === 'none') {
    return {
      name: rightSet.name,
      summary: '조건부 효과 없음',
      details: ['입력 총 스탯에 상시 효과가 이미 포함되어 있다고 가정합니다.']
    }
  }

  if (display.type === 'infernal_roar') {
    return {
      name: rightSet.name,
      summary: display.summary,
      details: [
        '일반 공격 피해: +40%',
        '스킬 공격 피해: 추가 피해증가 없음'
      ]
    }
  }

  if (display.type === 'soulbound_arcana') {
    return {
      name: rightSet.name,
      summary: display.summary,
      details: [
        `스킬 1회 사용: 피해증가 ${formatPercent(0.1)}`,
        `스킬 5회 사용: 피해증가 ${formatPercent(0.5)}`
      ]
    }
  }

  if (display.type === 'cataclysm') {
    return {
      name: rightSet.name,
      summary: display.summary,
      details: [
        `치명타 1회: 피해증가 ${formatPercent(0.1)}`,
        `치명타 5회: 피해증가 ${formatPercent(0.5)}`
      ]
    }
  }

  if (display.type === 'hells_lament') {
    return {
      name: rightSet.name,
      summary: display.summary,
      details: [
        '궁극기 미사용: 추가 조건부 효과 없음',
        `궁극기 사용: 피해증가 ${formatPercent(rightSet.damagePct ?? 0)} / 치명타 피해 +${rightSet.critDmg ?? 0}%`
      ]
    }
  }

  return {
    name: rightSet.name,
    summary: rightSet.notes,
    details: [rightSet.notes]
  }
}

export function calculateBuild(
  hero: Hero,
  leftSet: GearSet | undefined,
  rightSet: GearSet | undefined,
  build: BuildInput,
): DamageResult {
  const midDefense = 5000
  const awakeningBonus = build.awakeningOn ? hero.awakeningAtkBonus : 0
  const pantheonAspdBonus = build.pantheonAspdOn ? 40 : 0
  const leftSetDamagePct = leftSet?.damagePct ?? 0
  const { normalDamageBonus, totalDamageBonus, bonusCritDmg } = damageMultiplier(rightSet, build.setUptime)
  const maxConditional = damageMultiplier(rightSet, 1)

  const finalAtk = Math.round(build.totalAtk + awakeningBonus)
  const finalCritRate = build.critRate
  const finalCritDmg = build.critDmg + bonusCritDmg
  const totalAspd = build.attackSpeed
  const finalAspd = totalAspd + pantheonAspdBonus
  const attackSpeedProfileBaseInterval = hero.attackSpeedProfileBaseIntervalOverride ?? hero.baseInterval
  const bp = getBreakpointInfo(attackSpeedProfileBaseInterval, finalAspd)

  const critRateRatio = Math.min(finalCritRate, 100) / 100
  const critMultiplier = 1 + critRateRatio * (finalCritDmg / 100 - 1)
  const draculaBurstBonus = hero.burstAtkBonusPer100Aspd ? (totalAspd / 100) * hero.burstAtkBonusPer100Aspd : 0

  const statIgnoreDefenseMetrics = calculateDamageMetrics(finalAtk, critMultiplier, bp.interval, leftSetDamagePct + draculaBurstBonus, 0)
  const itemIgnoreDefenseMetrics = calculateDamageMetrics(finalAtk, critMultiplier, bp.interval, (maxConditional.normalDamageBonus ?? 0) + leftSetDamagePct + (maxConditional.totalDamageBonus ?? 0) + draculaBurstBonus, 0)
  const statMidDefenseMetrics = calculateDamageMetrics(finalAtk, critMultiplier, bp.interval, leftSetDamagePct + draculaBurstBonus, midDefense)
  const itemMidDefenseMetrics = calculateDamageMetrics(finalAtk, critMultiplier, bp.interval, (maxConditional.normalDamageBonus ?? 0) + leftSetDamagePct + (maxConditional.totalDamageBonus ?? 0) + draculaBurstBonus, midDefense)

  return {
    finalAtk,
    finalCritRate,
    finalCritDmg,
    awakeningAtkBonusApplied: awakeningBonus,
    attackSpeedProfileBaseInterval,
    pantheonAspdBonus,
    totalAspd,
    finalAspd,
    interval: bp.interval,
    nextThreshold: bp.nextThreshold,
    neededAspd: bp.neededAspd,
    normalDamageBonus,
    totalDamageBonus: leftSetDamagePct + totalDamageBonus + draculaBurstBonus,
    statDamageIgnoreDefense: statIgnoreDefenseMetrics.damage,
    itemMaxDamageIgnoreDefense: itemIgnoreDefenseMetrics.damage,
    statDamageMidDefense: statMidDefenseMetrics.damage,
    itemMaxDamageMidDefense: itemMidDefenseMetrics.damage,
    itemMaxDps10s: itemMidDefenseMetrics.dps10s,
    rightSetSummary: getRightSetSummary(rightSet),
    critAlert: finalCritRate < 100
  }
}
