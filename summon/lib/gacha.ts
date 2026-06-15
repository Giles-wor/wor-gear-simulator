// 가챠(소환) 확률 엔진 — WoR Drop Rates 정확 반영, 멀티 타겟 동시 노림 (AND) 지원.
//
// 모델 흐름:
//  1차 RNG (rarity): 영주 그룹 hit / 일반 그룹 hit / 미스
//  2차 RNG (그룹 내 영웅): 픽업들은 ×featuredMultiplier × stack^miss 가중치, 비-픽업은 ×1.
// stacking 보정: 비-픽업 5성을 뽑을 때마다 모든 그룹의 모든 픽업 가중치가 ×stack.
//   단, 이 보정은 "첫 픽업 획득 전"에만 유효 — 픽업(타겟이든 아니든)을 1장이라도 얻으면
//   그 배너 기간 동안 스택 보정은 영구히 꺼지고, 이후 카피는 기본 픽업배수(featuredMultiplier)만 적용된다.
//   (DP 의 obtained 차원으로 추적. owned>0 으로 시작하면 이미 보정 소진으로 간주.)
// 천장 (pityFocus='lord'): Lord 만 카운터 리셋. Common 5성은 카운터 계속 증가.
//
// 멀티 타겟: 각 픽업 슬롯이 goal>0 이면 "노리는 영웅". DP 가 모든 노리는 픽업의 카피를 동시에 추적,
// 모두가 자기 goal 에 도달하면 "성공" (AND). marginalCdf 로 픽업별 단독 달성 확률도 노출.

export type FeaturedGroup = 'lord' | 'common'

export type FeaturedHero = {
  /** 사용자에게 표시할 라벨 (예: 'Reve', '한정 영웅') */
  label: string
  /** 영주 / 일반 그룹 */
  group: FeaturedGroup
}

export type PickupSelection = {
  /** 이 배너의 모든 픽업(rate-up) 영웅 구성 */
  pickups: FeaturedHero[]
  /** 각 픽업별 획득 목표 (0 = 안 노림, ≥1 = 노리는 영웅) */
  goals: number[]
  /** 각 픽업별 이미 보유한 카피 수 */
  ownedCopies: number[]
}

export type BannerConfig = {
  id: 'normal' | 'limited' | 'ancient' | 'divine'
  name: string
  lordGroupRate: number
  commonGroupRate: number
  lordPoolSize: number
  commonPoolSize: number
  softPityStart?: number
  softPityIncrement?: number
  hardPity: number
  pityFocus?: 'anyLegendary' | 'lord'
  /** (고대 전용) 일반 레전더리(영주·알수없는자 제외) 독립 천장. 영주 천장과 별도 카운터.
   *  설정 시 commonGroup 에 별도 소프트/하드 천장이 적용된다. */
  commonSoftPityStart?: number
  commonSoftPityIncrement?: number
  commonHardPity?: number
  featuredMultiplier: number
  rateUpStackingMultiplier?: number
  /** 한정 선택 소환: 이 배너 누적 소환 N번째에서 타겟 픽업 자체 확정 (단일 타겟 한정) */
  featuredHardGuarantee?: number
  /** 기본 픽업 구성 (사용자가 UI에서 수정 가능) */
  defaultPickups: FeaturedHero[]
  /** 기본 goals (각 픽업 슬롯의 기본 획득 목표; 0 또는 1 권장) */
  defaultGoals: number[]
  placeholder: boolean
  notes: string
}

export type SummonState = {
  /** 마지막 (천장 기준) 5성 이후 누적 소환 수 */
  pity: number
  /** 마지막 픽업 이후 비-픽업 5성 누적 수 (stacking 보정) */
  rateUpMisses: number
  /** 이 배너에서 누적한 총 소환 수 (featuredHardGuarantee 계산용) */
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

/** 고대 2트랙 그룹 hit 확률: 영주 천장(softPityStart/hardPity) + 일반 레전더리 독립 천장
 *  (commonSoftPityStart/commonHardPity). lordPity/commonPity 는 각 트랙의 직전 미획득 누적. */
export function groupHitRates2D(
  config: BannerConfig,
  lordPityBefore: number,
  commonPityBefore: number,
): { lord: number; common: number } {
  const nL = lordPityBefore + 1
  const nC = commonPityBefore + 1
  const lInc = config.softPityIncrement ?? 0
  const lSoftStart = config.softPityStart
  const lordHard = nL >= config.hardPity
  const lordSoft = lSoftStart != null && nL >= lSoftStart ? (nL - lSoftStart + 1) * lInc : 0
  const cInc = config.commonSoftPityIncrement ?? 0
  const cSoftStart = config.commonSoftPityStart
  const cHard = config.commonHardPity ?? Infinity
  const commonHard = nC >= cHard
  const commonSoft = cSoftStart != null && nC >= cSoftStart ? (nC - cSoftStart + 1) * cInc : 0

  if (lordHard) return { lord: 1, common: 0 }
  if (commonHard) return { lord: 0, common: 1 }
  const lord = clampProb(config.lordGroupRate + lordSoft)
  let common = clampProb(config.commonGroupRate + commonSoft)
  if (lord + common > 1) common = Math.max(0, 1 - lord)
  return { lord, common }
}

// ─────────────────────────────────────────────────────────────
// 2차 RNG: 그룹 내 픽업 / 비-픽업 share
// ─────────────────────────────────────────────────────────────

export function featuredWeightAt(config: BannerConfig, rateUpMisses: number): number {
  const stack = config.rateUpStackingMultiplier ?? 1
  return Math.max(0, config.featuredMultiplier) * Math.pow(stack, Math.max(0, rateUpMisses))
}

export type GroupBreakdown = {
  /** 그룹 hit 시 픽업 1명이 차지하는 share */
  perPickupShare: number
  /** 그룹 hit 시 비-픽업 5성이 차지하는 share */
  nonRateUpShare: number
  /** 이 그룹의 픽업 영웅 수 */
  numPickups: number
}

export function groupBreakdownAt(
  config: BannerConfig,
  pickups: FeaturedHero[],
  rateUpMisses: number,
): { lord: GroupBreakdown; common: GroupBreakdown } {
  const wF = featuredWeightAt(config, rateUpMisses)
  const compute = (group: FeaturedGroup): GroupBreakdown => {
    const numPickups = pickups.filter((p) => p.group === group).length
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
// 1회 소환 결과 분포 (즉시 분기)
// ─────────────────────────────────────────────────────────────

export type SummonOutcome = {
  /** 각 픽업별 hit 확률 (index = pickup idx) */
  pickupProbs: number[]
  /** 픽업 아닌 5성 합산 확률 */
  nonRateUpLegendary: number
  /** 5성 아님 */
  noLegendary: number
}

export function summonOutcomeAt(
  config: BannerConfig,
  selection: PickupSelection,
  state: SummonState,
): SummonOutcome {
  const { lord: lordHit, common: commonHit } = groupHitRatesAt(config, state.pity)
  const noLegendary = Math.max(0, 1 - lordHit - commonHit)
  const breakdown = groupBreakdownAt(config, selection.pickups, state.rateUpMisses)

  const pickupProbs = selection.pickups.map((p) => {
    const hit = p.group === 'lord' ? lordHit : commonHit
    const share = p.group === 'lord' ? breakdown.lord.perPickupShare : breakdown.common.perPickupShare
    return hit * share
  })
  const nonRateUpLegendary = lordHit * breakdown.lord.nonRateUpShare + commonHit * breakdown.common.nonRateUpShare
  return { pickupProbs, nonRateUpLegendary, noLegendary }
}

/** "지금 5성 1개 나오면 그 5성이 픽업 영웅(어느 것이든) 일 확률" */
export function conditionalAnyPickupGivenLegendary(
  config: BannerConfig,
  selection: PickupSelection,
  state: SummonState,
): number {
  const o = summonOutcomeAt(config, selection, state)
  const anyPickup = o.pickupProbs.reduce((s, p) => s + p, 0)
  const legendary = anyPickup + o.nonRateUpLegendary
  return legendary > 0 ? anyPickup / legendary : 0
}

// ─────────────────────────────────────────────────────────────
// Max miss 동적 산출
// ─────────────────────────────────────────────────────────────

function maxMissesNeeded(config: BannerConfig, pickups: FeaturedHero[]): number {
  const stack = config.rateUpStackingMultiplier ?? 1
  if (stack <= 1) return 0
  if (pickups.length === 0) return 0

  let maxNeeded = 0
  for (const group of ['lord', 'common'] as const) {
    const numPickups = pickups.filter((p) => p.group === group).length
    if (numPickups === 0) continue
    const groupSize = group === 'lord' ? config.lordPoolSize : config.commonPoolSize
    const nonRateUp = Math.max(0, groupSize - numPickups)
    const M = Math.max(0, config.featuredMultiplier)
    if (nonRateUp === 0 || M <= 0) continue
    for (let m = 0; m <= MAX_RATE_UP_MISSES_ABS; m += 1) {
      const wF = M * Math.pow(stack, m)
      const totalFeatWeight = numPickups * wF
      const featShare = totalFeatWeight / (totalFeatWeight + nonRateUp)
      if (featShare >= FEATURED_CONVERGE_THRESHOLD) {
        if (m > maxNeeded) maxNeeded = m
        break
      }
    }
  }
  return maxNeeded
}

// ─────────────────────────────────────────────────────────────
// 멀티 타겟 DP — 각 활성 픽업의 카피를 동시 추적
// ─────────────────────────────────────────────────────────────

type ActiveTarget = {
  /** pickups 배열에서의 원본 인덱스 */
  pickupIdx: number
  /** 목표 카피 수 */
  goal: number
  group: FeaturedGroup
  /** 이미 보유 카피 (start) */
  owned: number
}

export type MultiTargetDistribution = {
  /** P(모든 활성 타겟이 자기 goal 만큼 보유) by pull k */
  cdf: number[]
  /** P(정확히 pull k 에 모든 활성 타겟 달성 완료) */
  pmf: number[]
  /** 픽업별 단독 목표 달성 확률 (활성 픽업만). 키 = pickupIdx */
  marginalCdf: Record<number, number[]>
  /** 픽업별 누적 기대 hit 횟수 (활성/비활성 모두). 키 = pickupIdx */
  expectedHitsByPickup: Record<number, number[]>
  /** 비-픽업 5성 누적 기대 횟수 */
  expectedNonRateUpLegendary: number[]
  /** 활성 타겟 정보 (UI 표시용) */
  activeTargets: ActiveTarget[]
}

/** 배너 변종 옵션 (열광/1+1 비교용) */
export type SummonModifiers = {
  /** 열광(Crazy): 모든 5성 base rate ×2 */
  crazy?: boolean
  /** 1+1: 전설 1개 나올 때마다 보너스 5성 1개 추가 (천장/stacking 무관, 영웅만 추가) */
  onePlusOne?: boolean
}

export function simulateMultiTargetDistribution(
  config: BannerConfig,
  selection: PickupSelection,
  pulls: number,
  start: SummonState,
  mods: SummonModifiers = {},
): MultiTargetDistribution {
  const crazy = !!mods.crazy
  const onePlusOne = !!mods.onePlusOne
  // 열광: base rate ×2 (천장 증가분/하드천장 규칙은 그대로). clampProb 는 groupHitRatesAt 내부에서.
  const effConfig: BannerConfig = crazy
    ? { ...config, lordGroupRate: config.lordGroupRate * 2, commonGroupRate: config.commonGroupRate * 2 }
    : config
  const hard = Math.max(1, Math.floor(effConfig.hardPity))
  const mxMiss = maxMissesNeeded(effConfig, selection.pickups)
  const pickups = selection.pickups

  const activeTargets: ActiveTarget[] = pickups
    .map((p, i) => ({
      pickupIdx: i,
      goal: Math.max(0, Math.floor(selection.goals[i] ?? 0)),
      group: p.group,
      owned: Math.max(0, Math.floor(selection.ownedCopies[i] ?? 0)),
    }))
    .filter((t) => t.goal > 0)

  // 활성 픽업 각각의 카피 차원
  const dims = activeTargets.length > 0 ? activeTargets.map((t) => t.goal + 1) : [1]
  // 스트라이드 (multi-dim 인덱싱)
  const strides = new Array<number>(dims.length)
  let cumStride = 1
  for (let j = 0; j < dims.length; j += 1) {
    strides[j] = cumStride
    cumStride *= dims[j]
  }
  const totalCopiesStates = cumStride
  const successCopiesIdx = activeTargets.length > 0 ? totalCopiesStates - 1 : 0

  // pickup idx → active position (없으면 -1)
  const activePosByPickup = new Array<number>(pickups.length).fill(-1)
  activeTargets.forEach((t, j) => {
    activePosByPickup[t.pickupIdx] = j
  })

  const initCopiesState = (() => {
    let s = 0
    for (let j = 0; j < activeTargets.length; j += 1) {
      const owned = Math.min(activeTargets[j].owned, activeTargets[j].goal)
      s += owned * strides[j]
    }
    return s
  })()

  // 활성 픽업 i 에 hit 했을 때 copiesIdx 가 어떻게 바뀌는지
  function tryIncrement(copiesIdx: number, pickupIdx: number): number {
    const j = activePosByPickup[pickupIdx]
    if (j < 0) return copiesIdx // 비활성 픽업은 copies 추적 안 함
    const stride = strides[j]
    const dimSize = dims[j]
    const before = Math.floor(copiesIdx / stride) % dimSize
    if (before >= activeTargets[j].goal) return copiesIdx
    return copiesIdx + stride
  }

  // 상태: (pity, miss, obtained, copies). obtained ∈ {0,1} = 픽업을 1장이라도 얻었는지.
  const obtainedStride = totalCopiesStates
  const missStride = 2 * obtainedStride
  const pityStride = (mxMiss + 1) * missStride
  const size = hard * pityStride
  const idx = (pity: number, miss: number, obtained: number, copies: number) =>
    pity * pityStride + miss * missStride + obtained * obtainedStride + copies

  let cur = new Float64Array(size)
  let nxt = new Float64Array(size)

  // 이미 픽업을 보유 중이면(owned>0) 보정은 이미 소진된 것으로 보고 obtained=1 로 시작
  const startObtained = selection.ownedCopies.some((c) => Math.floor(c ?? 0) > 0) ? 1 : 0
  const startPity = Math.min(start.pity, hard - 1)
  const startMiss = startObtained ? 0 : Math.min(start.rateUpMisses, mxMiss)
  cur[idx(startPity, startMiss, startObtained, initCopiesState)] = 1

  // 그룹 hit 확률 (pity 별 미리 계산)
  const lordHitByPity = new Float64Array(hard)
  const commonHitByPity = new Float64Array(hard)
  for (let p = 0; p < hard; p += 1) {
    const { lord, common } = groupHitRatesAt(effConfig, p)
    lordHitByPity[p] = lord
    commonHitByPity[p] = common
  }

  // miss 별 그룹 share
  const lordPerByMiss = new Float64Array(mxMiss + 1)
  const lordNonByMiss = new Float64Array(mxMiss + 1)
  const commonPerByMiss = new Float64Array(mxMiss + 1)
  const commonNonByMiss = new Float64Array(mxMiss + 1)
  for (let m = 0; m <= mxMiss; m += 1) {
    const b = groupBreakdownAt(effConfig, pickups, m)
    lordPerByMiss[m] = b.lord.perPickupShare
    lordNonByMiss[m] = b.lord.nonRateUpShare
    commonPerByMiss[m] = b.common.perPickupShare
    commonNonByMiss[m] = b.common.nonRateUpShare
  }

  const pityFocus = effConfig.pityFocus ?? 'anyLegendary'
  const commonResetsPity = pityFocus !== 'lord'

  // 1+1 보너스 영웅이 각 활성 타겟일 확률 (miss 별). 보너스는 전설 확정 → 그룹은 base 비율로 결정.
  const baseTotal = effConfig.lordGroupRate + effConfig.commonGroupRate
  const lordGroupShare = baseTotal > 0 ? effConfig.lordGroupRate / baseTotal : 0
  const commonGroupShare = baseTotal > 0 ? effConfig.commonGroupRate / baseTotal : 0
  // bonusTargetProbByMiss[m][activePos] = 보너스 1영웅이 활성타겟 activePos 일 확률
  const bonusTargetProbByMiss: number[][] = []
  for (let m = 0; m <= mxMiss; m += 1) {
    const row = activeTargets.map((t) =>
      t.group === 'lord' ? lordGroupShare * lordPerByMiss[m] : commonGroupShare * commonPerByMiss[m],
    )
    bonusTargetProbByMiss.push(row)
  }

  // 결과 누적 컨테이너
  const cdf = new Array(pulls + 1).fill(0)
  const pmf = new Array(pulls + 1).fill(0)
  const expectedNonRateUpLegendary = new Array(pulls + 1).fill(0)
  const marginalCdf: Record<number, number[]> = {}
  const expectedHitsByPickup: Record<number, number[]> = {}
  for (let i = 0; i < pickups.length; i += 1) {
    expectedHitsByPickup[i] = new Array(pulls + 1).fill(0)
  }
  for (const t of activeTargets) {
    marginalCdf[t.pickupIdx] = new Array(pulls + 1).fill(0)
  }

  // 초기 상태가 이미 성공이면 cdf[0] = 1
  let absorbedSuccessMass = 0
  if (activeTargets.length === 0) {
    // goal 이 하나도 없으면: 통계만 보고 싶은 경우. success 의미 없음.
    cdf[0] = 0
  } else if (initCopiesState === successCopiesIdx) {
    absorbedSuccessMass = 1
    cdf[0] = 1
    cur[idx(startPity, startMiss, startObtained, initCopiesState)] = 0
  }

  // 초기 marginal (start 상태 기준)
  for (const t of activeTargets) {
    const owned = Math.min(t.owned, t.goal)
    marginalCdf[t.pickupIdx][0] = owned >= t.goal ? 1 : 0
  }

  let cumNonRateUpLeg = 0
  const cumPickupHits = new Array(pickups.length).fill(0)

  /**
   * 전설 hit 결과(pity·miss·copies, prob p)를 nxt 에 반영하고 success 기여분을 반환.
   * 1+1 이면 보너스 영웅 1개를 추가 분배(타겟이면 copy +1, 천장/miss 무관).
   */
  const emit = (
    pity: number,
    miss: number,
    obtained: number,
    copies: number,
    p: number,
    shareMiss: number,
  ): number => {
    if (p === 0) return 0
    if (!onePlusOne) {
      if (copies === successCopiesIdx) return p
      nxt[idx(pity, miss, obtained, copies)] += p
      return 0
    }
    // 메인만으로 이미 성공이면 보너스 무관
    if (copies === successCopiesIdx) return p
    let sm = 0
    let assigned = 0
    const row = bonusTargetProbByMiss[shareMiss]
    for (let j = 0; j < activeTargets.length; j += 1) {
      const bp = p * row[j]
      if (bp === 0) continue
      const nc = tryIncrement(copies, activeTargets[j].pickupIdx)
      // 보너스로 픽업을 얻어도 이후 보정 OFF (obtained=1, miss=0)
      if (nc === successCopiesIdx) sm += bp
      else nxt[idx(pity, 0, 1, nc)] += bp
      assigned += bp
    }
    const rest = p - assigned // 보너스가 타겟이 아님 (다른 픽업/비픽업)
    if (rest > 0) nxt[idx(pity, miss, obtained, copies)] += rest
    return sm
  }

  for (let pull = 1; pull <= pulls; pull += 1) {
    nxt.fill(0)
    let pullNonRateUpLeg = 0
    const pullPickupHits = new Array(pickups.length).fill(0)
    let pullSuccessMass = 0

    const totalPullsOnBanner = start.pullsOnBanner + pull
    const isForcedFeaturedHardGuarantee =
      effConfig.featuredHardGuarantee != null &&
      totalPullsOnBanner === effConfig.featuredHardGuarantee &&
      activeTargets.length === 1 // 한정 선택 소환은 단일 타겟만 의미

    const forcedTargetPickupIdx = isForcedFeaturedHardGuarantee
      ? activeTargets[0].pickupIdx
      : -1

    for (let pity = 0; pity < hard; pity += 1) {
      const lordHit = lordHitByPity[pity]
      const commonHit = commonHitByPity[pity]
      const noLegendary = 1 - lordHit - commonHit
      const nextPity = Math.min(pity + 1, hard - 1)
      const lordNextPity = 0
      const commonNextPity = commonResetsPity ? 0 : nextPity

      for (let miss = 0; miss <= mxMiss; miss += 1) {
        const lordPer = lordPerByMiss[miss]
        const lordNon = lordNonByMiss[miss]
        const commonPer = commonPerByMiss[miss]
        const commonNon = commonNonByMiss[miss]
        const nextMiss = Math.min(miss + 1, mxMiss)

        // obtained: 픽업 1장이라도 얻은 뒤(=1)에는 스택 보정 OFF → 항상 base(miss=0) share 사용,
        // 비-픽업 5성을 더 뽑아도 스택을 쌓지 않는다. (obtained=1 상태는 항상 miss=0 로만 존재)
        for (let obtained = 0; obtained <= 1; obtained += 1) {
          const missAfterNon = obtained === 1 ? 0 : nextMiss

          for (let copies = 0; copies < totalCopiesStates; copies += 1) {
            const prob = cur[idx(pity, miss, obtained, copies)]
            if (prob === 0) continue

            // Forced (한정 200픽 픽업 확정): 활성 타겟의 첫 카피 미보유 시 그 타겟 강제
            if (isForcedFeaturedHardGuarantee && forcedTargetPickupIdx >= 0) {
              const activePos = activePosByPickup[forcedTargetPickupIdx]
              const before = Math.floor(copies / strides[activePos]) % dims[activePos]
              if (before === 0) {
                const newCopies = tryIncrement(copies, forcedTargetPickupIdx)
                if (newCopies === successCopiesIdx) {
                  pullSuccessMass += prob
                } else {
                  nxt[idx(0, 0, 1, newCopies)] += prob
                }
                pullPickupHits[forcedTargetPickupIdx] += prob
                continue
              }
            }

            // 1) 전설 안 뽑힘 → pity+1, miss·obtained 유지
            if (noLegendary > 0) {
              nxt[idx(nextPity, miss, obtained, copies)] += prob * noLegendary
            }

            // 2) 영주 그룹 hit
            if (lordHit > 0) {
              // 그룹 내 픽업별 분기 → 픽업 획득이므로 obtained=1, 스택 리셋(miss=0)
              for (let pi = 0; pi < pickups.length; pi += 1) {
                if (pickups[pi].group !== 'lord') continue
                const p = prob * lordHit * lordPer
                if (p === 0) continue
                const newCopies = tryIncrement(copies, pi)
                pullPickupHits[pi] += p
                pullSuccessMass += emit(lordNextPity, 0, 1, newCopies, p, 0)
              }
              // 그룹 내 비-픽업 5성 → obtained 유지, 미획득 상태에서만 스택 누적
              const pNon = prob * lordHit * lordNon
              if (pNon > 0) {
                pullSuccessMass += emit(lordNextPity, missAfterNon, obtained, copies, pNon, miss)
                pullNonRateUpLeg += pNon
              }
            }

            // 3) 일반 그룹 hit
            if (commonHit > 0) {
              for (let pi = 0; pi < pickups.length; pi += 1) {
                if (pickups[pi].group !== 'common') continue
                const p = prob * commonHit * commonPer
                if (p === 0) continue
                const newCopies = tryIncrement(copies, pi)
                pullPickupHits[pi] += p
                pullSuccessMass += emit(commonNextPity, 0, 1, newCopies, p, 0)
              }
              const pNon = prob * commonHit * commonNon
              if (pNon > 0) {
                pullSuccessMass += emit(commonNextPity, missAfterNon, obtained, copies, pNon, miss)
                pullNonRateUpLeg += pNon
              }
            }
          }
        }
      }
    }

    // swap
    const tmp = cur
    cur = nxt
    nxt = tmp

    absorbedSuccessMass += pullSuccessMass
    pmf[pull] = pullSuccessMass
    cdf[pull] = absorbedSuccessMass
    cumNonRateUpLeg += pullNonRateUpLeg
    expectedNonRateUpLegendary[pull] = cumNonRateUpLeg
    for (let i = 0; i < pickups.length; i += 1) {
      cumPickupHits[i] += pullPickupHits[i]
      expectedHitsByPickup[i][pull] = cumPickupHits[i]
    }

    // Marginal CDF 계산: 활성 타겟 t 별로 c_j == goal[j] 인 모든 copies 합산 + absorbedSuccessMass
    for (let j = 0; j < activeTargets.length; j += 1) {
      const t = activeTargets[j]
      const stride = strides[j]
      const dimSize = dims[j]
      // 합산: sum of cur[idx] where (copies / stride) % dimSize == goal[j]
      let marginalMass = absorbedSuccessMass
      for (let pity = 0; pity < hard; pity += 1) {
        for (let m = 0; m <= mxMiss; m += 1) {
          for (let obtained = 0; obtained <= 1; obtained += 1) {
            for (let copies = 0; copies < totalCopiesStates; copies += 1) {
              const cj = Math.floor(copies / stride) % dimSize
              if (cj === t.goal) {
                marginalMass += cur[idx(pity, m, obtained, copies)]
              }
            }
          }
        }
      }
      marginalCdf[t.pickupIdx][pull] = marginalMass
    }
  }

  return {
    cdf,
    pmf,
    marginalCdf,
    expectedHitsByPickup,
    expectedNonRateUpLegendary,
    activeTargets,
  }
}

// ─────────────────────────────────────────────────────────────
// 몬테카를로 — 2트랙 천장(고대)처럼 DP 차원이 폭발하는 경우용. 고정 시드(결정론적).
// ─────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function simulateMonteCarlo(
  config: BannerConfig,
  selection: PickupSelection,
  pulls: number,
  start: SummonState,
  mods: SummonModifiers = {},
  trials = 60000,
): MultiTargetDistribution {
  const crazy = !!mods.crazy
  const onePlusOne = !!mods.onePlusOne
  const effConfig: BannerConfig = crazy
    ? { ...config, lordGroupRate: config.lordGroupRate * 2, commonGroupRate: config.commonGroupRate * 2 }
    : config
  const hard = Math.max(1, Math.floor(effConfig.hardPity))
  const cpEnabled = effConfig.commonHardPity != null
  const cpHard = cpEnabled ? Math.max(1, Math.floor(effConfig.commonHardPity as number)) : 1
  const pickups = selection.pickups
  const n = pickups.length
  const MAXMISS = 40

  const goals = pickups.map((_, i) => Math.max(0, Math.floor(selection.goals[i] ?? 0)))
  const owned = pickups.map((_, i) => Math.max(0, Math.floor(selection.ownedCopies[i] ?? 0)))
  const activeIdx = pickups.map((_, i) => i).filter((i) => goals[i] > 0)
  const startObtained = owned.some((c) => c > 0)
  const commonResetsLord = (effConfig.pityFocus ?? 'anyLegendary') !== 'lord'
  const baseTotal = effConfig.lordGroupRate + effConfig.commonGroupRate
  const lordGroupShare = baseTotal > 0 ? effConfig.lordGroupRate / baseTotal : 0

  // rate 테이블 (lordPity × commonPity)
  const lordRate = new Float64Array(hard * cpHard)
  const commonRate = new Float64Array(hard * cpHard)
  for (let lp = 0; lp < hard; lp += 1) {
    for (let cp = 0; cp < cpHard; cp += 1) {
      const r = cpEnabled ? groupHitRates2D(effConfig, lp, cp) : groupHitRatesAt(effConfig, lp)
      lordRate[lp * cpHard + cp] = r.lord
      commonRate[lp * cpHard + cp] = r.common
    }
  }
  // breakdown by miss
  const lordPer = new Float64Array(MAXMISS + 1)
  const lordNon = new Float64Array(MAXMISS + 1)
  const commonPer = new Float64Array(MAXMISS + 1)
  const commonNon = new Float64Array(MAXMISS + 1)
  for (let m = 0; m <= MAXMISS; m += 1) {
    const b = groupBreakdownAt(effConfig, pickups, m)
    lordPer[m] = b.lord.perPickupShare
    lordNon[m] = b.lord.nonRateUpShare
    commonPer[m] = b.common.perPickupShare
    commonNon[m] = b.common.nonRateUpShare
  }
  const lordPickIdx = pickups.map((p, i) => (p.group === 'lord' ? i : -1)).filter((i) => i >= 0)
  const commonPickIdx = pickups.map((p, i) => (p.group === 'common' ? i : -1)).filter((i) => i >= 0)

  // 누적 컨테이너
  const successCount = new Float64Array(pulls + 1) // 첫 성공 도달 pull 카운트
  const marginalFirst: Record<number, Float64Array> = {}
  for (const i of activeIdx) marginalFirst[i] = new Float64Array(pulls + 1)
  const sumHits: Record<number, Float64Array> = {}
  for (let i = 0; i < n; i += 1) sumHits[i] = new Float64Array(pulls + 1)
  const sumNon = new Float64Array(pulls + 1)
  // 흡수(성공 후) 동결분: 성공 pull s 에서 1회만 기록 → 끝에서 suffix-sum 으로 전파 (O(N·pulls) 루프 제거)
  const tailHits: Record<number, Float64Array> = {}
  for (let i = 0; i < n; i += 1) tailHits[i] = new Float64Array(pulls + 2)
  const tailNon = new Float64Array(pulls + 2)

  const rng = mulberry32(0x9e3779b9)
  const startLordPity = Math.min(start.pity, hard - 1)
  const startMiss = startObtained ? 0 : Math.min(start.rateUpMisses, MAXMISS)

  const cumHits = new Float64Array(n)
  const have = new Float64Array(n) // owned + hits, goal 판정용 (시행마다 재사용)
  const na = activeIdx.length
  const met = new Uint8Array(na)

  for (let tr = 0; tr < trials; tr += 1) {
    let lordPity = startLordPity
    let commonPity = 0
    let misses = startMiss
    let obtained = startObtained
    cumHits.fill(0)
    let cumNon = 0
    for (let i = 0; i < n; i += 1) have[i] = owned[i]
    let allMet = true
    for (let j = 0; j < na; j += 1) {
      const ok = have[activeIdx[j]] >= goals[activeIdx[j]]
      met[j] = ok ? 1 : 0
      if (ok) marginalFirst[activeIdx[j]][0] += 1
      else allMet = false
    }
    let recordedSuccess = allMet
    if (allMet) successCount[0] += 1

    // 시작부터 성공이면 더 안 뽑음 (흡수)
    if (!allMet) for (let pull = 1; pull <= pulls; pull += 1) {
      const rates = lordPity * cpHard + commonPity
      const lord = lordRate[rates]
      const common = commonRate[rates]
      const m = obtained ? 0 : misses
      const r = rng()
      let mainPickup = false

      if (r < lord) {
        // 영주 그룹: 그룹 내 분배는 별도 난수로
        const per = lordPer[m]
        const r2 = rng()
        let acc = 0
        let hit = -1
        for (const pi of lordPickIdx) {
          acc += per
          if (r2 < acc) { hit = pi; break }
        }
        if (hit >= 0) { cumHits[hit] += 1; have[hit] += 1; obtained = true; misses = 0; mainPickup = true }
        else { cumNon += 1; if (!obtained) misses = Math.min(misses + 1, MAXMISS) }
        lordPity = 0
        if (cpEnabled) commonPity = Math.min(commonPity + 1, cpHard - 1)
      } else if (r < lord + common) {
        // 일반 그룹
        const per = commonPer[m]
        const r2 = rng()
        let acc = 0
        let hit = -1
        for (const pi of commonPickIdx) {
          acc += per
          if (r2 < acc) { hit = pi; break }
        }
        if (hit >= 0) { cumHits[hit] += 1; have[hit] += 1; obtained = true; misses = 0; mainPickup = true }
        else { cumNon += 1; if (!obtained) misses = Math.min(misses + 1, MAXMISS) }
        if (cpEnabled) commonPity = 0
        lordPity = commonResetsLord ? 0 : Math.min(lordPity + 1, hard - 1)
      } else {
        // 미획득
        lordPity = Math.min(lordPity + 1, hard - 1)
        if (cpEnabled) commonPity = Math.min(commonPity + 1, cpHard - 1)
      }

      // 1+1 보너스: 전설 1개당 보너스 5성 1개 (pity·stack 무관, base 그룹비율, 활성 타겟만 영향·기대hit 미집계)
      if (onePlusOne && r < lord + common) {
        const shareMiss = mainPickup ? 0 : m
        const r3 = rng()
        let acc = 0
        for (const ti of activeIdx) {
          const gShare = pickups[ti].group === 'lord' ? lordGroupShare : 1 - lordGroupShare
          const per = pickups[ti].group === 'lord' ? lordPer[shareMiss] : commonPer[shareMiss]
          acc += gShare * per
          if (r3 < acc) { if (have[ti] < goals[ti]) have[ti] += 1; obtained = true; misses = 0; break }
        }
      }

      // 기록
      for (let i = 0; i < n; i += 1) sumHits[i][pull] += cumHits[i]
      sumNon[pull] += cumNon
      let ok = true
      for (let j = 0; j < na; j += 1) {
        const ti = activeIdx[j]
        if (met[j] === 0 && have[ti] >= goals[ti]) { met[j] = 1; marginalFirst[ti][pull] += 1 }
        if (have[ti] < goals[ti]) ok = false
      }
      if (!recordedSuccess && ok) {
        successCount[pull] += 1
        recordedSuccess = true
        // 흡수: 동결분은 1회만 기록 (끝에서 suffix-sum 전파)
        const f = pull + 1
        for (let i = 0; i < n; i += 1) tailHits[i][f] += cumHits[i]
        tailNon[f] += cumNon
        break
      }
    }
  }

  // 흡수 동결분 전파: 성공 pull s 에서 index s+1 에 1회 기록 → 정방향 prefix-sum 으로 [s+1, pulls] 구간에 더함
  {
    let run = 0
    for (let k = 1; k <= pulls; k += 1) {
      run += tailNon[k]
      sumNon[k] += run
    }
    for (let i = 0; i < n; i += 1) {
      let r2 = 0
      const th = tailHits[i]
      const sh = sumHits[i]
      for (let k = 1; k <= pulls; k += 1) {
        r2 += th[k]
        sh[k] += r2
      }
    }
  }

  // 누적 → 분포
  const cdf = new Array(pulls + 1).fill(0)
  const pmf = new Array(pulls + 1).fill(0)
  const expectedNonRateUpLegendary = new Array(pulls + 1).fill(0)
  const marginalCdf: Record<number, number[]> = {}
  const expectedHitsByPickup: Record<number, number[]> = {}
  for (let i = 0; i < n; i += 1) expectedHitsByPickup[i] = new Array(pulls + 1).fill(0)
  for (const i of activeIdx) marginalCdf[i] = new Array(pulls + 1).fill(0)

  let cumSucc = 0
  const cumMarg: Record<number, number> = {}
  for (const i of activeIdx) cumMarg[i] = 0
  for (let k = 0; k <= pulls; k += 1) {
    cumSucc += successCount[k]
    cdf[k] = cumSucc / trials
    pmf[k] = successCount[k] / trials
    expectedNonRateUpLegendary[k] = sumNon[k] / trials
    for (let i = 0; i < n; i += 1) expectedHitsByPickup[i][k] = sumHits[i][k] / trials
    for (const i of activeIdx) {
      cumMarg[i] += marginalFirst[i][k]
      marginalCdf[i][k] = cumMarg[i] / trials
    }
  }

  const activeTargets: ActiveTarget[] = activeIdx.map((i) => ({
    pickupIdx: i,
    goal: goals[i],
    group: pickups[i].group,
    owned: Math.min(owned[i], goals[i]),
  }))

  return { cdf, pmf, marginalCdf, expectedHitsByPickup, expectedNonRateUpLegendary, activeTargets }
}

// ─────────────────────────────────────────────────────────────
// 결과 보고서
// ─────────────────────────────────────────────────────────────

export type StrategyReport = {
  availablePulls: number
  selection: PickupSelection
  /** 모든 활성 타겟 동시 달성 확률 (자원 한도 내) */
  jointProbabilityWithBudget: number
  /** 활성 타겟 별 단독 달성 확률 (자원 한도 내). key = pickupIdx */
  marginalProbabilityWithBudget: Record<number, number>
  /** 픽업별 기대 획득 수 (활성/비활성 모두). key = pickupIdx */
  expectedHitsWithBudget: Record<number, number>
  /** 자원 한도 내 픽업 아닌 5성 기대 횟수 */
  expectedNonRateUpLegendaryWithBudget: number
  /** 현재 상태 1회 소환 결과 분포 */
  outcomeNow: SummonOutcome
  /** "지금 5성 1개 나오면 어느 픽업이든 일 확률" */
  conditionalAnyPickup: number
  horizon: number
  /** joint cdf (모든 활성 타겟 동시) — 곡선 표시용 */
  jointCdf: number[]
  /** 활성 타겟 정보 */
  activeTargets: ActiveTarget[]
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
  start: SummonState,
  availablePulls: number,
  mods: SummonModifiers = {},
): StrategyReport {
  const safeBudget = Math.max(0, Math.floor(availablePulls))
  const horizon = Math.min(
    1500,
    Math.max(safeBudget, config.hardPity * 2, (config.featuredHardGuarantee ?? 0) + 20, 200),
  )

  // 일반 레전더리 독립 천장(고대 2트랙)은 DP 차원이 커서 결정론적 몬테카를로로 계산. 그 외는 정확 DP.
  const dist =
    config.commonHardPity != null
      ? simulateMonteCarlo(config, selection, horizon, start, mods)
      : simulateMultiTargetDistribution(config, selection, horizon, start, mods)
  const budgetIdx = Math.min(safeBudget, dist.cdf.length - 1)

  const jointProbabilityWithBudget = safeBudget > 0 ? dist.cdf[budgetIdx] : dist.cdf[0] ?? 0
  const marginalProbabilityWithBudget: Record<number, number> = {}
  for (const t of dist.activeTargets) {
    const series = dist.marginalCdf[t.pickupIdx]
    marginalProbabilityWithBudget[t.pickupIdx] = safeBudget > 0 ? series[budgetIdx] : series[0] ?? 0
  }
  const expectedHitsWithBudget: Record<number, number> = {}
  for (let i = 0; i < selection.pickups.length; i += 1) {
    expectedHitsWithBudget[i] = safeBudget > 0 ? dist.expectedHitsByPickup[i][budgetIdx] : 0
  }
  const expectedNonRateUpLegendaryWithBudget =
    safeBudget > 0 ? dist.expectedNonRateUpLegendary[budgetIdx] : 0

  const milestones = [0.5, 0.75, 0.9, 0.99].map((p) => {
    const pulls = pullsForProbabilityFromCdf(dist.cdf, p)
    return {
      label: `${Math.round(p * 100)}%`,
      p,
      pulls,
      deficitPulls: pulls != null ? Math.max(0, pulls - safeBudget) : null,
    }
  })

  // 1회 소환 분포는 열광(base ×2) 반영한 config 로 계산 (1+1 은 분포 자체는 동일, 보너스는 별도 영웅)
  const outcomeConfig: BannerConfig = mods.crazy
    ? { ...config, lordGroupRate: config.lordGroupRate * 2, commonGroupRate: config.commonGroupRate * 2 }
    : config

  // 이미 픽업 보유 중이면(owned>0) 보정 소진 → '현재 1회 소환'도 스택 OFF(기본배수)로 표시
  const alreadyObtained = selection.ownedCopies.some((c) => Math.floor(c ?? 0) > 0)
  const outcomeState: SummonState = alreadyObtained ? { ...start, rateUpMisses: 0 } : start

  return {
    availablePulls: safeBudget,
    selection,
    jointProbabilityWithBudget,
    marginalProbabilityWithBudget,
    expectedHitsWithBudget,
    expectedNonRateUpLegendaryWithBudget,
    outcomeNow: summonOutcomeAt(outcomeConfig, selection, outcomeState),
    conditionalAnyPickup: conditionalAnyPickupGivenLegendary(outcomeConfig, selection, outcomeState),
    horizon,
    jointCdf: dist.cdf,
    activeTargets: dist.activeTargets,
    milestones,
  }
}
