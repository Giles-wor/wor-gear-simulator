// 가챠(소환) 확률 엔진 — WoR Drop Rates 정확 반영.
// 모델 흐름:
//  1차 RNG (rarity): 영주 그룹 hit / 일반 그룹 hit / 미스
//  2차 RNG (그룹 내 영웅): 그 그룹의 픽업들은 ×featuredMultiplier × stack^miss 가중치, 비-픽업은 ×1.
// stacking 보정: 비-픽업 5성을 뽑을 때마다 모든 그룹의 모든 픽업 가중치가 ×stack. 픽업(어느 그룹이든) 뽑으면 0 리셋.
// 천장 (pityFocus='lord'): Lord 만 카운터 리셋. Common 5성도 미-Lord 로 간주해 카운터 계속 증가.
// 네트워크/외부 의존성 없음, 순수 함수.

export type FeaturedGroup = 'lord' | 'common'

export type FeaturedHero = {
  /** UI 라벨 (예: 'A', '비올레타 베인', 또는 비워두면 group 으로 자동 표시) */
  label: string
  /** 영주 그룹 / 일반 그룹 */
  group: FeaturedGroup
}

export type PickupSelection = {
  /** 이 배너의 모든 픽업(rate-up) 영웅 구성 */
  pickups: FeaturedHero[]
  /** 사용자가 노리는 타겟 픽업의 인덱스 */
  targetIndex: number
}

export type BannerConfig = {
  id: 'normal' | 'limited' | 'ancient' | 'divine'
  name: string
  /** 영주(Lord) 그룹 전체 전설 확률 합 (0~1) */
  lordGroupRate: number
  /** 일반(Common) 그룹 전체 전설 확률 합 (0~1) */
  commonGroupRate: number
  /** 영주 풀 크기 */
  lordPoolSize: number
  /** 일반 풀 크기 */
  commonPoolSize: number
  /** 소프트 천장 시작 카운트 */
  softPityStart?: number
  /** 소프트 천장 1회당 추가 확률 (0~1) */
  softPityIncrement?: number
  /** 하드 천장: 천장 카운터 도달 시 (해당 그룹의) 전설 확정 */
  hardPity: number
  /** 천장 카운터 대상.
   *  'anyLegendary' (기본): 영주/일반 모두 천장 리셋, 소프트 천장 영주/일반 비율 유지.
   *  'lord' (고대): 영주만 천장 리셋·소프트 천장 적용. 일반은 base 유지하고 카운터 계속. */
  pityFocus?: 'anyLegendary' | 'lord'
  /** 픽업 영웅 1명당 가중치 multiplier (Special 계열=20, Basic=1) */
  featuredMultiplier: number
  /** 비-픽업 전설 뽑을 때 누적 곱해지는 stacking 보정. 모든 픽업에 적용. 픽업(어느 그룹이든) 뽑으면 0 리셋. */
  rateUpStackingMultiplier?: number
  /** 한정 선택 소환: 이 배너 누적 소환 N번째에서 타겟 픽업 자체 확정 (1카피 한정) */
  featuredHardGuarantee?: number
  /** 기본 픽업 구성 (사용자가 UI에서 수정 가능) */
  defaultPickups: FeaturedHero[]
  /** 기본 타겟 인덱스 (사용자가 UI에서 수정 가능) */
  defaultTargetIndex?: number
  /** 추정 placeholder 여부 */
  placeholder: boolean
  notes: string
}

export type SummonState = {
  /** 마지막 (천장 기준) 전설 이후 누적 소환 수 */
  pity: number
  /** 마지막 픽업 이후 비-픽업 5성 누적 수 (stacking 보정 카운터) */
  rateUpMisses: number
  /** 이미 보유한 타겟 픽업 카피 수 */
  copies: number
  /** 이 배너에서 지금까지 누적한 총 소환 수 (featuredHardGuarantee 계산용) */
  pullsOnBanner: number
}

const clampProb = (v: number) => Math.min(1, Math.max(0, v))
const MAX_RATE_UP_MISSES_ABS = 30
const FEATURED_CONVERGE_THRESHOLD = 0.99999

// ─────────────────────────────────────────────────────────────
// 1차 RNG: 영주/일반 그룹 hit 확률
// ─────────────────────────────────────────────────────────────

export function groupHitRatesAt(
  config: BannerConfig,
  pityBefore: number,
): { lord: number; common: number; legendary: number } {
  const n = pityBefore + 1
  const baseLord = config.lordGroupRate
  const baseCommon = config.commonGroupRate
  const baseTotal = baseLord + baseCommon
  if (baseTotal <= 0) return { lord: 0, common: 0, legendary: 0 }

  const focus = config.pityFocus ?? 'anyLegendary'
  const inSoft = config.softPityStart != null && n >= config.softPityStart
  const inHard = n >= config.hardPity
  const inc = config.softPityIncrement ?? 0
  const softBoost = inSoft ? (n - (config.softPityStart ?? n) + 1) * inc : 0

  if (focus === 'lord') {
    if (inHard) return { lord: 1, common: 0, legendary: 1 }
    let lord = clampProb(baseLord + softBoost)
    let common = baseCommon
    if (lord + common > 1) common = Math.max(0, 1 - lord)
    return { lord, common, legendary: lord + common }
  }

  let scaledTotal = baseTotal
  if (inHard) scaledTotal = 1
  else if (inSoft) scaledTotal = clampProb(baseTotal + softBoost)
  scaledTotal = clampProb(scaledTotal)
  const lord = scaledTotal * (baseLord / baseTotal)
  const common = scaledTotal - lord
  return { lord, common, legendary: scaledTotal }
}

// ─────────────────────────────────────────────────────────────
// 2차 RNG: 그룹 내 영웅 선택 — 픽업 가중치 분해
// ─────────────────────────────────────────────────────────────

/** 픽업 1명당 가중치 = featuredMultiplier × stack^miss. */
export function featuredWeightAt(config: BannerConfig, rateUpMisses: number): number {
  const stack = config.rateUpStackingMultiplier ?? 1
  return Math.max(0, config.featuredMultiplier) * Math.pow(stack, Math.max(0, rateUpMisses))
}

export type GroupBreakdown = {
  /** 이 그룹에 픽업이 hit 했다 가정 시, 1명의 픽업이 차지하는 share (=가중치/전체가중치) */
  perPickupShare: number
  /** 이 그룹의 비-픽업 5성 share */
  nonRateUpShare: number
  /** 이 그룹의 픽업 영웅 수 */
  numPickups: number
}

/** 영주/일반 그룹 각각에 대해 픽업/비-픽업 share 산출. */
export function groupBreakdownAt(
  config: BannerConfig,
  selection: PickupSelection,
  rateUpMisses: number,
): { lord: GroupBreakdown; common: GroupBreakdown } {
  const wF = featuredWeightAt(config, rateUpMisses)
  const compute = (group: FeaturedGroup): GroupBreakdown => {
    const numPickups = selection.pickups.filter((p) => p.group === group).length
    const poolSize = group === 'lord' ? config.lordPoolSize : config.commonPoolSize
    const nonRateUpSize = Math.max(0, poolSize - numPickups)
    const totalWeight = numPickups * wF + nonRateUpSize
    if (totalWeight <= 0) return { perPickupShare: 0, nonRateUpShare: 0, numPickups }
    return {
      perPickupShare: numPickups > 0 ? wF / totalWeight : 0,
      nonRateUpShare: nonRateUpSize / totalWeight,
      numPickups,
    }
  }
  return { lord: compute('lord'), common: compute('common') }
}

// ─────────────────────────────────────────────────────────────
// 한 번 소환 시 4가지 결과 분포 (현재 상태 즉시 분기)
// ─────────────────────────────────────────────────────────────

export type SummonOutcome = {
  /** 타겟 픽업 영웅 */
  target: number
  /** 타겟 외 다른 픽업 영웅 (어느 그룹이든 합산) */
  otherFeatured: number
  /** 픽업 아닌 5성 (어느 그룹이든 합산) */
  nonRateUpLegendary: number
  /** 5성 아님 (에픽/레어 등) */
  noLegendary: number
}

export function summonOutcomeAt(
  config: BannerConfig,
  selection: PickupSelection,
  state: SummonState,
): SummonOutcome {
  const { lord: lordHit, common: commonHit } = groupHitRatesAt(config, state.pity)
  const noLegendary = Math.max(0, 1 - lordHit - commonHit)
  const breakdown = groupBreakdownAt(config, selection, state.rateUpMisses)
  const target = selection.pickups[selection.targetIndex]
  if (!target) {
    return {
      target: 0,
      otherFeatured: 0,
      nonRateUpLegendary: lordHit * 1 + commonHit * 1, // 픽업 없으면 모든 전설은 비-픽업
      noLegendary,
    }
  }

  // 타겟 그룹의 hit 확률 × 타겟 1명 share
  const tHit = target.group === 'lord' ? lordHit : commonHit
  const tBreak = breakdown[target.group]
  const targetP = tHit * tBreak.perPickupShare

  // 다른 픽업: 타겟 그룹 안의 다른 픽업 + 다른 그룹의 모든 픽업
  const otherFeaturedSameGroupCount = Math.max(0, tBreak.numPickups - 1)
  const otherGroup: FeaturedGroup = target.group === 'lord' ? 'common' : 'lord'
  const oHit = otherGroup === 'lord' ? lordHit : commonHit
  const oBreak = breakdown[otherGroup]
  const otherFeatured =
    tHit * otherFeaturedSameGroupCount * tBreak.perPickupShare +
    oHit * oBreak.numPickups * oBreak.perPickupShare

  const nonRateUpLegendary =
    tHit * tBreak.nonRateUpShare + oHit * oBreak.nonRateUpShare

  return { target: targetP, otherFeatured, nonRateUpLegendary, noLegendary }
}

/** "지금 전설 1개 나오면 그것이 타겟 픽업일 확률" */
export function conditionalFeaturedGivenLegendary(
  config: BannerConfig,
  selection: PickupSelection,
  state: SummonState,
): number {
  const o = summonOutcomeAt(config, selection, state)
  const legendary = o.target + o.otherFeatured + o.nonRateUpLegendary
  return legendary > 0 ? o.target / legendary : 0
}

// ─────────────────────────────────────────────────────────────
// Max miss 동적 산출 (stacking 수렴 시점)
// ─────────────────────────────────────────────────────────────

function maxMissesNeeded(config: BannerConfig, selection: PickupSelection): number {
  const stack = config.rateUpStackingMultiplier ?? 1
  if (stack <= 1) return 0
  const target = selection.pickups[selection.targetIndex]
  if (!target) return 0
  const numFeatInTargetGroup = selection.pickups.filter((p) => p.group === target.group).length
  if (numFeatInTargetGroup === 0) return 0
  const groupSize = target.group === 'lord' ? config.lordPoolSize : config.commonPoolSize
  const nonRateUp = Math.max(0, groupSize - numFeatInTargetGroup)
  const M = Math.max(0, config.featuredMultiplier)
  if (nonRateUp === 0 || M <= 0) return 0
  for (let m = 0; m <= MAX_RATE_UP_MISSES_ABS; m += 1) {
    const wF = M * Math.pow(stack, m)
    const totalFeatWeight = numFeatInTargetGroup * wF
    const featShare = totalFeatWeight / (totalFeatWeight + nonRateUp)
    if (featShare >= FEATURED_CONVERGE_THRESHOLD) return m
  }
  return MAX_RATE_UP_MISSES_ABS
}

// ─────────────────────────────────────────────────────────────
// 마르코프 DP — 단일 패스로 모든 목표 카피 cdf 산출
// ─────────────────────────────────────────────────────────────

export type CopiesDistribution = {
  /** copiesAtLeast[g][k] = k회 소환 안에 타겟 픽업 g카피 이상 확보 누적 확률 */
  copiesAtLeast: number[][]
  /** copiesExpected[k] = k회 소환 시점의 타겟 픽업 기대 카피 */
  copiesExpected: number[]
  /** expectedOtherFeatured[k] = "타겟 외 다른 픽업" 누적 기대 횟수 */
  expectedOtherFeatured: number[]
  /** expectedNonRateUpLegendary[k] = "픽업 아닌 5성" 누적 기대 횟수 */
  expectedNonRateUpLegendary: number[]
}

export function simulateCopiesDistribution(
  config: BannerConfig,
  selection: PickupSelection,
  maxCopies: number,
  pulls: number,
  start: SummonState,
): CopiesDistribution {
  const hard = Math.max(1, Math.floor(config.hardPity))
  const mxMiss = maxMissesNeeded(config, selection)
  const mxCopy = Math.max(1, Math.floor(maxCopies))
  const missStride = mxCopy + 1
  const pityStride = (mxMiss + 1) * missStride
  const size = hard * pityStride
  const idx = (p: number, m: number, c: number) => p * pityStride + m * missStride + c

  let cur = new Float64Array(size)
  let nxt = new Float64Array(size)

  const startPity = Math.min(start.pity, hard - 1)
  const startMiss = Math.min(start.rateUpMisses, mxMiss)
  const startCopy = Math.min(start.copies, mxCopy)
  cur[idx(startPity, startMiss, startCopy)] = 1

  // 그룹 hit 확률 (pity 별 미리 계산)
  const lordHitByPity = new Float64Array(hard)
  const commonHitByPity = new Float64Array(hard)
  for (let p = 0; p < hard; p += 1) {
    const { lord, common } = groupHitRatesAt(config, p)
    lordHitByPity[p] = lord
    commonHitByPity[p] = common
  }

  // 그룹별 share (miss 별)
  const lordPerPickupByMiss = new Float64Array(mxMiss + 1)
  const lordNonRateUpByMiss = new Float64Array(mxMiss + 1)
  const commonPerPickupByMiss = new Float64Array(mxMiss + 1)
  const commonNonRateUpByMiss = new Float64Array(mxMiss + 1)
  for (let m = 0; m <= mxMiss; m += 1) {
    const b = groupBreakdownAt(config, selection, m)
    lordPerPickupByMiss[m] = b.lord.perPickupShare
    lordNonRateUpByMiss[m] = b.lord.nonRateUpShare
    commonPerPickupByMiss[m] = b.common.perPickupShare
    commonNonRateUpByMiss[m] = b.common.nonRateUpShare
  }
  const target = selection.pickups[selection.targetIndex]
  const numLordFeat = selection.pickups.filter((p) => p.group === 'lord').length
  const numCommonFeat = selection.pickups.filter((p) => p.group === 'common').length
  const numOtherLordFeat = numLordFeat - (target?.group === 'lord' ? 1 : 0)
  const numOtherCommonFeat = numCommonFeat - (target?.group === 'common' ? 1 : 0)
  const targetIsLord = target?.group === 'lord'
  const targetIsCommon = target?.group === 'common'

  const pityFocus = config.pityFocus ?? 'anyLegendary'
  const commonResetsPity = pityFocus !== 'lord'

  const copiesAtLeast: number[][] = []
  for (let g = 0; g <= mxCopy; g += 1) copiesAtLeast.push(new Array(pulls + 1).fill(0))
  for (let g = 0; g <= startCopy; g += 1) copiesAtLeast[g][0] = 1
  const copiesExpected: number[] = new Array(pulls + 1).fill(startCopy)
  const expectedOtherFeatured: number[] = new Array(pulls + 1).fill(0)
  const expectedNonRateUpLegendary: number[] = new Array(pulls + 1).fill(0)
  let cumOtherFeatured = 0
  let cumNonRateUpLegendary = 0

  for (let pull = 1; pull <= pulls; pull += 1) {
    nxt.fill(0)
    let pullOtherFeatured = 0
    let pullNonRateUpLegendary = 0
    const totalPullsOnBanner = start.pullsOnBanner + pull
    const isForcedFeatured =
      config.featuredHardGuarantee != null &&
      totalPullsOnBanner === config.featuredHardGuarantee

    for (let pity = 0; pity < hard; pity += 1) {
      const lordHit = lordHitByPity[pity]
      const commonHit = commonHitByPity[pity]
      const noLegendary = 1 - lordHit - commonHit
      const nextPity = Math.min(pity + 1, hard - 1)
      const lordNextPity = 0 // 영주는 항상 천장 리셋
      const commonNextPity = commonResetsPity ? 0 : nextPity

      for (let miss = 0; miss <= mxMiss; miss += 1) {
        const lordPer = lordPerPickupByMiss[miss]
        const lordNon = lordNonRateUpByMiss[miss]
        const commonPer = commonPerPickupByMiss[miss]
        const commonNon = commonNonRateUpByMiss[miss]
        const nextMiss = Math.min(miss + 1, mxMiss)
        const off = pity * pityStride + miss * missStride

        for (let copy = 0; copy <= mxCopy; copy += 1) {
          const prob = cur[off + copy]
          if (prob === 0) continue

          // 한정 선택 소환: pullsOnBanner == featuredHardGuarantee 일 때 타겟 자체 확정 (copy<1)
          if (isForcedFeatured && copy < 1) {
            const nextCopy = Math.min(copy + 1, mxCopy)
            nxt[idx(0, 0, nextCopy)] += prob
            continue
          }

          // 1) 전설 안 뽑힘
          if (noLegendary > 0) {
            nxt[idx(nextPity, miss, copy)] += prob * noLegendary
          }

          // 2) 영주 그룹 hit (천장 항상 리셋)
          if (lordHit > 0) {
            const pLord = prob * lordHit
            // 2a) 타겟이 영주인 경우 → 타겟 픽업 가능성
            if (targetIsLord) {
              const pTarget = pLord * lordPer
              const pOtherLordFeat = pLord * numOtherLordFeat * lordPer
              const pLordNonRateUp = pLord * lordNon
              if (pTarget > 0) {
                const nextCopy = Math.min(copy + 1, mxCopy)
                nxt[idx(lordNextPity, 0, nextCopy)] += pTarget
              }
              if (pOtherLordFeat > 0) {
                nxt[idx(lordNextPity, 0, copy)] += pOtherLordFeat
                pullOtherFeatured += pOtherLordFeat
              }
              if (pLordNonRateUp > 0) {
                nxt[idx(lordNextPity, nextMiss, copy)] += pLordNonRateUp
                pullNonRateUpLegendary += pLordNonRateUp
              }
            } else {
              // 2b) 타겟이 일반 → 영주 그룹 hit 은 "다른 픽업"(영주 픽업이 있다면) 또는 "픽업 아닌 5성"
              const pAnyLordFeat = pLord * numLordFeat * lordPer
              const pLordNonRateUp = pLord * lordNon
              if (pAnyLordFeat > 0) {
                nxt[idx(lordNextPity, 0, copy)] += pAnyLordFeat
                pullOtherFeatured += pAnyLordFeat
              }
              if (pLordNonRateUp > 0) {
                nxt[idx(lordNextPity, nextMiss, copy)] += pLordNonRateUp
                pullNonRateUpLegendary += pLordNonRateUp
              }
            }
          }

          // 3) 일반 그룹 hit (천장 리셋 여부는 commonResetsPity 에 의존)
          if (commonHit > 0) {
            const pCom = prob * commonHit
            if (targetIsCommon) {
              const pTarget = pCom * commonPer
              const pOtherCommonFeat = pCom * numOtherCommonFeat * commonPer
              const pCommonNonRateUp = pCom * commonNon
              if (pTarget > 0) {
                const nextCopy = Math.min(copy + 1, mxCopy)
                nxt[idx(commonNextPity, 0, nextCopy)] += pTarget
              }
              if (pOtherCommonFeat > 0) {
                nxt[idx(commonNextPity, 0, copy)] += pOtherCommonFeat
                pullOtherFeatured += pOtherCommonFeat
              }
              if (pCommonNonRateUp > 0) {
                nxt[idx(commonNextPity, nextMiss, copy)] += pCommonNonRateUp
                pullNonRateUpLegendary += pCommonNonRateUp
              }
            } else {
              const pAnyCommonFeat = pCom * numCommonFeat * commonPer
              const pCommonNonRateUp = pCom * commonNon
              if (pAnyCommonFeat > 0) {
                nxt[idx(commonNextPity, 0, copy)] += pAnyCommonFeat
                pullOtherFeatured += pAnyCommonFeat
              }
              if (pCommonNonRateUp > 0) {
                nxt[idx(commonNextPity, nextMiss, copy)] += pCommonNonRateUp
                pullNonRateUpLegendary += pCommonNonRateUp
              }
            }
          }
        }
      }
    }

    const tmp = cur
    cur = nxt
    nxt = tmp

    cumOtherFeatured += pullOtherFeatured
    cumNonRateUpLegendary += pullNonRateUpLegendary
    expectedOtherFeatured[pull] = cumOtherFeatured
    expectedNonRateUpLegendary[pull] = cumNonRateUpLegendary

    // marginal 추출
    let cumFromTop = 0
    let exp = 0
    for (let g = mxCopy; g >= 0; g -= 1) {
      let pSum = 0
      for (let p = 0; p < hard; p += 1) {
        for (let m = 0; m <= mxMiss; m += 1) {
          pSum += cur[p * pityStride + m * missStride + g]
        }
      }
      cumFromTop += pSum
      copiesAtLeast[g][pull] = cumFromTop
      exp += g * pSum
    }
    copiesExpected[pull] = exp
  }

  return { copiesAtLeast, copiesExpected, expectedOtherFeatured, expectedNonRateUpLegendary }
}

// ─────────────────────────────────────────────────────────────
// 결과 보고서 빌드
// ─────────────────────────────────────────────────────────────

export type StrategyReport = {
  availablePulls: number
  goal: number
  selection: PickupSelection
  probabilityWithBudget: number
  expectedCopiesWithBudget: number
  expectedOtherFeaturedWithBudget: number
  expectedNonRateUpLegendaryWithBudget: number
  outcomeNow: SummonOutcome
  conditionalFeatured: number
  horizon: number
  cdf: number[]
  milestones: {
    label: string
    p: number
    pulls: number | null
    deficitPulls: number | null
  }[]
}

export function pullsForProbabilityFromCdf(cdf: number[], p: number): number | null {
  for (let k = 1; k < cdf.length; k += 1) {
    if (cdf[k] >= p) return k
  }
  return null
}

export function buildStrategyReport(
  config: BannerConfig,
  selection: PickupSelection,
  goal: number,
  start: SummonState,
  availablePulls: number,
): StrategyReport {
  const safeGoal = Math.max(1, Math.floor(goal))
  const safeBudget = Math.max(0, Math.floor(availablePulls))
  const horizon = Math.min(
    1500,
    Math.max(safeBudget, config.hardPity * 2, (config.featuredHardGuarantee ?? 0) + 20, 200),
  )

  const { copiesAtLeast, copiesExpected, expectedOtherFeatured, expectedNonRateUpLegendary } =
    simulateCopiesDistribution(config, selection, safeGoal, horizon, start)
  const cdf = copiesAtLeast[safeGoal] ?? new Array(horizon + 1).fill(0)

  const budgetIdx = Math.min(safeBudget, cdf.length - 1)
  const probabilityWithBudget = safeBudget > 0 ? cdf[budgetIdx] : cdf[0] ?? 0
  const expectedCopiesWithBudget =
    safeBudget > 0 ? copiesExpected[budgetIdx] : copiesExpected[0] ?? start.copies
  const expectedOtherFeaturedWithBudget =
    safeBudget > 0 ? expectedOtherFeatured[budgetIdx] : 0
  const expectedNonRateUpLegendaryWithBudget =
    safeBudget > 0 ? expectedNonRateUpLegendary[budgetIdx] : 0

  const milestones = [0.5, 0.75, 0.9, 0.99].map((p) => {
    const pulls = pullsForProbabilityFromCdf(cdf, p)
    return {
      label: `${Math.round(p * 100)}%`,
      p,
      pulls,
      deficitPulls: pulls != null ? Math.max(0, pulls - safeBudget) : null,
    }
  })

  return {
    availablePulls: safeBudget,
    goal: safeGoal,
    selection,
    probabilityWithBudget,
    expectedCopiesWithBudget,
    expectedOtherFeaturedWithBudget,
    expectedNonRateUpLegendaryWithBudget,
    outcomeNow: summonOutcomeAt(config, selection, start),
    conditionalFeatured: conditionalFeaturedGivenLegendary(config, selection, start),
    horizon,
    cdf,
    milestones,
  }
}
