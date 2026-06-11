import { aggregateAwakening, type AwakeningTier, type Hero } from '../data/heroes'
import { gearSetLabel, type GearSet } from '../data/gearSets'
import { getAttackSpeedProfile } from '../data/attackSpeed'
import { findFactionAccessory } from '../data/factionAccessories'
import { findLordEffect } from '../data/lordEffects'

export type BuildInput = {
  totalAtk: number
  critRate: number
  critDmg: number
  attackSpeed: number
  /** 각성 레벨 0~5 (0=각성 안 함, 2 이상이면 +300 ATK 등 누적) */
  awakeningLevel: number
  pantheonAspdOn: boolean
  factionAccessoryId: string
  lordEffectId: string
  leftSetId: string
  rightSetId: string
  setUptime: number
}

export type DamageResult = {
  finalAtk: number
  finalCritRate: number
  finalCritDmg: number
  awakeningAtkBonusApplied: number
  awakeningLevel: number
  awakeningTiersApplied: AwakeningTier[]
  awakeningTotal: {
    atkBonus: number
    atkPctBonus: number
    damageBonus: number
    basicDamageBonus: number
    critRateBonus: number
    critDmgBonus: number
    attackSpeedBonus: number
    penetrationBonus: number
    /** derived: 치피 → 관통 (raw ratio). 보통 0.1 같은 값 */
    penetrationFromCritDmgRatio: number
    /** derived 효과를 현재 baseFinalCritDmg 로 곱해 산출한 관통값 (실제 적용분) */
    derivedPenetrationApplied: number
  }
  attackSpeedProfileBaseInterval: number
  pantheonAspdBonus: number
  totalAspd: number
  finalAspd: number
  interval: number
  nextThreshold: number | null
  neededAspd: number | null
  normalDamageBonus: number
  totalDamageBonus: number
  basicAttackItemMaxDamage: number
  ultimateAttackItemMaxDamage: number
  statDamageIgnoreDefense: number
  itemMaxDamageIgnoreDefense: number
  statDamageMidDefense: number
  itemMaxDamageMidDefense: number
  itemMaxCumulative30s: number
  itemMaxDps30s: number
  timeline30s: { second: number; cumulativeDamage: number }[]
  /** 직접 고정피해(True Damage) — 치명타·방어 무시. 영웅별 발동 1회 값. */
  fixedDamageRows: { label: string; value: number; atkPct: number; note?: string }[]
  appliedEffects: string[]
  formula: {
    defense: number
    rawDamage: number
    critMultiplier: number
    statDamageBonus: number
    itemDamageBonus: number
    itemDamageBonusParts: { label: string; value: number }[]
    itemCritDmgBonus: number
    hitCount30s: number
    factionAccessoryName: string | null
    factionAccessorySummary: string | null
    lordEffectName: string | null
    lordEffectSummary: string | null
    lordEffectAtkPctBonus: number
    lordEffectDamageBonus: number
    lordEffectBasicDamageBonus: number
    lordEffectCritDmgBonus: number
    lordEffectAttackSpeedBonus: number
    lordEffectPenetrationBonus: number
    lordEffectBreakdown: {
      label: string
      value?: number
      text?: string
      note?: string
    }[]
  }
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
    dps30s: Math.round((hitDamage / interval) * 30),
  }
}

function getMaxSetBonus(rightSet: GearSet | undefined) {
  if (!rightSet) return { damageBonus: 0, critDmgBonus: 0 }

  if (rightSet.id === 'infernal_roar') {
    return { damageBonus: 0.4, critDmgBonus: 0 }
  }

  if (rightSet.id === 'cataclysm') {
    return { damageBonus: 0.5, critDmgBonus: 0 }
  }

  if (rightSet.id === 'soulbound_arcana') {
    return { damageBonus: 0.5, critDmgBonus: 0 }
  }

  if (rightSet.id === 'hells_lament') {
    return { damageBonus: 0.35, critDmgBonus: 50 }
  }

  return { damageBonus: rightSet.damagePct ?? 0, critDmgBonus: rightSet.critDmg ?? 0 }
}

function getAttackTypeDamageBonus(rightSet: GearSet | undefined, type: 'basic' | 'ultimate', mode: 'current' | 'max') {
  if (!rightSet) return { damageBonus: 0, critDmgBonus: 0 }

  if (rightSet.id === 'infernal_roar') {
    return {
      damageBonus: type === 'basic' ? 0.4 : 0,
      critDmgBonus: 0,
    }
  }

  if (rightSet.id === 'cataclysm') {
    return {
      damageBonus: mode === 'max' ? 0.5 : 0.3,
      critDmgBonus: 0,
    }
  }

  if (rightSet.id === 'soulbound_arcana') {
    return {
      damageBonus: mode === 'max' ? 0.5 : 0.5,
      critDmgBonus: 0,
    }
  }

  if (rightSet.id === 'hells_lament') {
    return {
      damageBonus: 0.35,
      critDmgBonus: 50,
    }
  }

  return {
    damageBonus: mode === 'max' ? (rightSet.damagePct ?? 0) : (rightSet.damagePct ?? 0),
    critDmgBonus: mode === 'max' ? (rightSet.critDmg ?? 0) : (rightSet.critDmg ?? 0),
  }
}

function buildTimeline30s(
  rightSet: GearSet | undefined,
  finalAtk: number,
  finalCritDmg: number,
  critRateRatio: number,
  interval: number,
  baseDamageBonus: number,
  midDefense: number,
) {
  const hitTimes: number[] = []
  let currentTime = 0
  while (currentTime <= 30 + 1e-9) {
    hitTimes.push(Number(currentTime.toFixed(4)))
    currentTime += interval
  }

  const points: { second: number; cumulativeDamage: number }[] = []
  let cumulativeDamage = 0
  let hitCount = 0
  let processedHits = 0

  for (let second = 0; second <= 30; second += 1) {
    while (processedHits < hitTimes.length && hitTimes[processedHits] <= second + 1e-9) {
      let rightSetDamageBonus = 0
      let rightSetCritBonus = 0

      if (rightSet?.id === 'infernal_roar') {
        rightSetDamageBonus = 0.4
      } else if (rightSet?.id === 'cataclysm') {
        rightSetDamageBonus = Math.min(hitCount * 0.1, 0.5)
      } else if (rightSet?.id === 'soulbound_arcana') {
        rightSetDamageBonus = 0.5
      } else if (rightSet?.id === 'hells_lament') {
        rightSetDamageBonus = 0.35
        rightSetCritBonus = 50
      }

      const critMultiplier = 1 + critRateRatio * ((finalCritDmg + rightSetCritBonus) / 100 - 1)
      const metrics = calculateDamageMetrics(finalAtk, critMultiplier, interval, baseDamageBonus + rightSetDamageBonus, midDefense)
      cumulativeDamage += metrics.damage
      hitCount += 1
      processedHits += 1
    }

    points.push({
      second,
      cumulativeDamage: Math.round(cumulativeDamage),
    })
  }

  return points
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
      name: gearSetLabel(rightSet),
      summary: '조건부 효과 없음',
      details: ['입력 총 스탯에 상시 효과가 이미 포함되어 있다고 가정합니다.']
    }
  }

  if (display.type === 'infernal_roar') {
    return {
      name: gearSetLabel(rightSet),
      summary: display.summary,
      details: [
        '일반 공격 피해: +40%',
        '스킬 공격 피해: 추가 피해증가 없음'
      ]
    }
  }

  if (display.type === 'soulbound_arcana') {
    return {
      name: gearSetLabel(rightSet),
      summary: display.summary,
      details: [
        `스킬 1회 사용: 피해증가 ${formatPercent(0.1)}`,
        `스킬 5회 사용 완료: 피해증가 ${formatPercent(0.5)}`
      ]
    }
  }

  if (display.type === 'cataclysm') {
    return {
      name: gearSetLabel(rightSet),
      summary: display.summary,
      details: [
        `첫 타: 피해증가 ${formatPercent(0)}`,
        `다음 타부터 치명타 1회당 피해증가 ${formatPercent(0.1)} 누적, 최대 ${formatPercent(0.5)}`
      ]
    }
  }

  if (display.type === 'hells_lament') {
    return {
      name: gearSetLabel(rightSet),
      summary: display.summary,
      details: [
        '궁극기 미사용: 추가 조건부 효과 없음',
        `궁극기 사용: 피해증가 ${formatPercent(rightSet.damagePct ?? 0)} / 치명타 피해 +${rightSet.critDmg ?? 0}%`
      ]
    }
  }

  return {
    name: gearSetLabel(rightSet),
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
  const awakening = aggregateAwakening(hero, build.awakeningLevel)
  const awakeningBonus = awakening.atkBonus
  const pantheonAspdBonus = build.pantheonAspdOn ? 40 : 0
  const factionAccessory = findFactionAccessory(build.factionAccessoryId, hero.factions)
  const lordEffect = findLordEffect(build.lordEffectId, hero.factions)
  const factionAtkPctBonus = factionAccessory?.atkPctBonus ?? 0
  const factionDamageBonus = factionAccessory?.damageBonus ?? 0
  const factionCritDmgBonus = factionAccessory?.critDmgBonus ?? 0
  const factionPenetrationBonus = factionAccessory?.penetrationBonus ?? 0
  const lordAtkPctBonus = lordEffect?.atkPctBonus ?? 0
  const lordDamageBonus = lordEffect?.damageBonus ?? 0
  const lordBasicDamageBonus = lordEffect?.basicDamageBonus ?? 0
  const lordCritDmgBonus = lordEffect?.critDmgBonus ?? 0
  const lordAttackSpeedBonus = lordEffect?.attackSpeedBonus ?? 0
  const lordPenetrationBonus = lordEffect?.penetrationBonus ?? 0
  const leftSetDamagePct = leftSet?.damagePct ?? 0
  const { normalDamageBonus, totalDamageBonus, bonusCritDmg } = damageMultiplier(rightSet, build.setUptime)
  const maxSetBonus = getMaxSetBonus(rightSet)

  const finalAtk = Math.round(
    build.totalAtk + awakeningBonus +
    build.totalAtk * (factionAtkPctBonus + lordAtkPctBonus + awakening.atkPctBonus),
  )
  const finalCritRate = Math.min(100, build.critRate + awakening.critRateBonus)
  const baseFinalCritDmg = build.critDmg + factionCritDmgBonus + lordCritDmgBonus + awakening.critDmgBonus
  const finalCritDmg = baseFinalCritDmg + bonusCritDmg
  const totalAspd = build.attackSpeed + awakening.attackSpeedBonus
  const finalAspd = totalAspd + pantheonAspdBonus + lordAttackSpeedBonus
  const attackSpeedProfileBaseInterval = hero.attackSpeedProfileBaseIntervalOverride ?? hero.baseInterval
  const bp = getBreakpointInfo(attackSpeedProfileBaseInterval, finalAspd)

  const critRateRatio = Math.min(finalCritRate, 100) / 100
  const critMultiplier = 1 + critRateRatio * (finalCritDmg / 100 - 1)
  // 드라큘라류: "모든 공속이 피해 보정" → 판테온/영주 공속 포함한 finalAspd 기준 (인게임 검증)
  const draculaBurstBonus = hero.burstAtkBonusPer100Aspd ? (finalAspd / 100) * hero.burstAtkBonusPer100Aspd : 0
  const automaticHeroDamageBonus = draculaBurstBonus + awakening.damageBonus
  const statDamageBonus = leftSetDamagePct + automaticHeroDamageBonus + factionDamageBonus + lordDamageBonus
  const itemDamageBonus = maxSetBonus.damageBonus + leftSetDamagePct + automaticHeroDamageBonus + factionDamageBonus + lordDamageBonus
  // Derived: 치피 → 관통. baseFinalCritDmg (%) 의 비율만큼 관통 추가 (예: 치피 270 × 0.1 = 27%p 관통)
  const derivedPenetrationFromCritDmg = (awakening.penetrationFromCritDmgRatio ?? 0) * (baseFinalCritDmg / 100)
  const totalPenetrationApplied = Math.min(
    factionPenetrationBonus + lordPenetrationBonus + awakening.penetrationBonus + derivedPenetrationFromCritDmg,
    0.9,
  )
  const effectiveMidDefense = Math.round(midDefense * (1 - totalPenetrationApplied))

  const statIgnoreDefenseMetrics = calculateDamageMetrics(finalAtk, critMultiplier, bp.interval, statDamageBonus, 0)
  const maxCritMultiplier = 1 + critRateRatio * ((baseFinalCritDmg + maxSetBonus.critDmgBonus) / 100 - 1)
  const itemIgnoreDefenseMetrics = calculateDamageMetrics(finalAtk, maxCritMultiplier, bp.interval, itemDamageBonus, 0)
  const statMidDefenseMetrics = calculateDamageMetrics(finalAtk, critMultiplier, bp.interval, statDamageBonus, effectiveMidDefense)
  const itemMidDefenseMetrics = calculateDamageMetrics(finalAtk, maxCritMultiplier, bp.interval, itemDamageBonus, effectiveMidDefense)
  const basicAttackMax = getAttackTypeDamageBonus(rightSet, 'basic', 'max')
  const ultimateAttackMax = getAttackTypeDamageBonus(rightSet, 'ultimate', 'max')
  const basicCritMultiplier = 1 + critRateRatio * ((baseFinalCritDmg + basicAttackMax.critDmgBonus) / 100 - 1)
  const ultimateCritMultiplier = 1 + critRateRatio * ((baseFinalCritDmg + ultimateAttackMax.critDmgBonus) / 100 - 1)
  const basicAttackItemMaxDamage = calculateDamageMetrics(finalAtk, basicCritMultiplier, bp.interval, statDamageBonus + lordBasicDamageBonus + awakening.basicDamageBonus + basicAttackMax.damageBonus, 0).damage
  const ultimateAttackItemMaxDamage = calculateDamageMetrics(finalAtk, ultimateCritMultiplier, bp.interval, statDamageBonus + ultimateAttackMax.damageBonus, 0).damage
  const timeline30s = buildTimeline30s(rightSet, finalAtk, baseFinalCritDmg, critRateRatio, bp.interval, statDamageBonus + lordBasicDamageBonus + awakening.basicDamageBonus, effectiveMidDefense)
  const itemMaxCumulative30s = timeline30s[timeline30s.length - 1]?.cumulativeDamage ?? 0
  const itemDamageBonusParts = [
    { label: leftSet?.name ? `좌측 ${leftSet.name}` : '좌측 세트', value: leftSetDamagePct },
    { label: rightSet?.name ? `우측 ${gearSetLabel(rightSet)}` : '우측 세트', value: maxSetBonus.damageBonus },
    { label: `${hero.name} (자동)`, value: draculaBurstBonus },
    { label: `${hero.name} 각성 ${awakening.level}각`, value: awakening.damageBonus },
    { label: factionAccessory?.sourceName ?? '진영 악세서리', value: factionDamageBonus },
    { label: lordEffect?.sourceName ?? '영주 피해', value: lordDamageBonus },
    { label: lordEffect ? `${lordEffect.name} 기본 공격` : '영주 기본 공격', value: lordBasicDamageBonus },
  ].filter((part) => Math.abs(part.value) > 1e-9)
  const awakeningNoteLines = awakening.tiers
    .map((tier) => {
      const parts: string[] = []
      if (tier.atkBonus) parts.push(`공격력 +${tier.atkBonus}`)
      if (tier.atkPctBonus) parts.push(`공격력 +${Math.round(tier.atkPctBonus * 100)}%`)
      if (tier.damageBonus) parts.push(`피해 +${Math.round(tier.damageBonus * 100)}%`)
      if (tier.basicDamageBonus) parts.push(`기본 공격 +${Math.round(tier.basicDamageBonus * 100)}%`)
      if (tier.critRateBonus) parts.push(`치확 +${tier.critRateBonus}`)
      if (tier.critDmgBonus) parts.push(`치피 +${tier.critDmgBonus}`)
      if (tier.attackSpeedBonus) parts.push(`공속 +${tier.attackSpeedBonus}`)
      if (tier.penetrationBonus) parts.push(`관통 +${Math.round(tier.penetrationBonus * 100)}%`)
      const detail = parts.length ? `[${parts.join(' / ')}]` : tier.note ? `[${tier.note}]` : ''
      return `${tier.label}${detail ? ` ${detail}` : ''}`
    })
  const appliedEffects = [
    ...(awakening.level > 0
      ? [`각성 ${awakening.level}각 적용 — ${awakeningNoteLines.join(' · ') || '효과 없음'}`]
      : []),
    ...(hero.burstAtkBonusPer100Aspd ? [`${hero.name}: 공속 100당 피해 +${Math.round(hero.burstAtkBonusPer100Aspd * 100)}% 자동 적용`] : []),
    ...(factionAccessory ? [`${factionAccessory.sourceName}: ${factionAccessory.summary}`] : []),
    ...(lordEffect ? [`${lordEffect.sourceName}: ${lordEffect.summary}`] : []),
  ]

  // 직접 고정피해(True Damage): ATK × 계수 × (1+피증). 치명타·방어·마방 무시.
  const fixedDamageRows = (hero.fixedDamage ?? []).map((fd) => ({
    label: fd.label,
    atkPct: fd.atkPct,
    note: fd.note,
    value: Math.round(finalAtk * fd.atkPct * (1 + statDamageBonus)),
  }))

  return {
    finalAtk,
    finalCritRate,
    finalCritDmg,
    awakeningAtkBonusApplied: awakeningBonus,
    awakeningLevel: awakening.level,
    awakeningTiersApplied: awakening.tiers,
    awakeningTotal: {
      atkBonus: awakening.atkBonus,
      atkPctBonus: awakening.atkPctBonus,
      damageBonus: awakening.damageBonus,
      basicDamageBonus: awakening.basicDamageBonus,
      critRateBonus: awakening.critRateBonus,
      critDmgBonus: awakening.critDmgBonus,
      attackSpeedBonus: awakening.attackSpeedBonus,
      penetrationBonus: awakening.penetrationBonus,
      penetrationFromCritDmgRatio: awakening.penetrationFromCritDmgRatio,
      derivedPenetrationApplied: derivedPenetrationFromCritDmg,
    },
    attackSpeedProfileBaseInterval,
    pantheonAspdBonus,
    totalAspd,
    finalAspd,
    interval: bp.interval,
    nextThreshold: bp.nextThreshold,
    neededAspd: bp.neededAspd,
    normalDamageBonus,
    totalDamageBonus: leftSetDamagePct + totalDamageBonus + automaticHeroDamageBonus + factionDamageBonus + lordDamageBonus + lordBasicDamageBonus,
    basicAttackItemMaxDamage,
    ultimateAttackItemMaxDamage,
    statDamageIgnoreDefense: statIgnoreDefenseMetrics.damage,
    itemMaxDamageIgnoreDefense: itemIgnoreDefenseMetrics.damage,
    statDamageMidDefense: statMidDefenseMetrics.damage,
    itemMaxDamageMidDefense: itemMidDefenseMetrics.damage,
    itemMaxCumulative30s,
    itemMaxDps30s: Math.round(itemMaxCumulative30s / 30),
    timeline30s,
    fixedDamageRows,
    appliedEffects,
    formula: {
      defense: effectiveMidDefense,
      rawDamage: Math.round(Math.max(finalAtk - effectiveMidDefense, finalAtk * 0.05)),
      critMultiplier: Number(maxCritMultiplier.toFixed(4)),
      statDamageBonus,
      itemDamageBonus: itemDamageBonus + lordBasicDamageBonus,
      itemDamageBonusParts,
      itemCritDmgBonus: maxSetBonus.critDmgBonus,
      hitCount30s: timeline30s.length > 0 ? Math.max(0, Math.round(30 / bp.interval) + 1) : 0,
      factionAccessoryName: factionAccessory?.sourceName ?? null,
      factionAccessorySummary: factionAccessory?.summary ?? null,
      lordEffectName: lordEffect?.sourceName ?? null,
      lordEffectSummary: lordEffect?.summary ?? null,
      lordEffectAtkPctBonus: lordAtkPctBonus,
      lordEffectDamageBonus: lordDamageBonus,
      lordEffectBasicDamageBonus: lordBasicDamageBonus,
      lordEffectCritDmgBonus: lordCritDmgBonus,
      lordEffectAttackSpeedBonus: lordAttackSpeedBonus,
      lordEffectPenetrationBonus: lordPenetrationBonus,
      lordEffectBreakdown: lordEffect?.damageBreakdown ?? [],
    },
    rightSetSummary: getRightSetSummary(rightSet),
    critAlert: finalCritRate < 100
  }
}
