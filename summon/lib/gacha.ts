// 가챠(소환) 확률 엔진.
// 마르코프 체인 기반 정확 계산기 + 자원 환산 전략 헬퍼.
// 네트워크/외부 의존성 없음. 모든 함수는 순수 함수.

export type TargetModel = 'featured' | 'poolMember'

export type BannerConfig = {
  id: 'normal' | 'limited' | 'ancient' | 'divine'
  name: string
  /** 풀당 전설 등급 기본 확률 (0~1) */
  legendaryBaseRate: number
  /** 소프트 천장 시작 카운트 (마지막 전설 이후 N번째 소환부터 확률 상승). 없으면 미사용 */
  softPityStart?: number
  /** 소프트 천장 구간에서 소환 1회당 증가하는 전설 확률 (0~1) */
  softPityIncrement?: number
  /** 하드 천장: 마지막 전설 이후 이 카운트의 소환은 전설 확정 */
  hardPity: number
  /** featured: 픽업 캐릭 개념 / poolMember: 전설 풀에서 특정 1명 */
  targetModel: TargetModel
  /** featured 모델: 전설 1개가 픽업일 확률 (0~1) */
  featuredShare?: number
  /** poolMember 모델: 전설 풀 크기 (목표 1명 확률 = 1/poolSize) */
  legendaryPoolSize?: number
  /** featured 모델: 픽업 실패 시 다음 전설은 픽업 확정(50/50 보장형) */
  guaranteedAfterLoss?: boolean
  /** 소환 1회당 보석 환산값 (자원 전략용) */
  gemsPerPull?: number
  /** 추정 placeholder 여부 — 크롤/유저 확인 전이면 true */
  placeholder: boolean
  notes: string
}

export type SummonState = {
  /** 마지막 전설 이후 누적 소환 수 (천장 카운터) */
  pity: number
  /** 다음 전설이 픽업 확정 상태인지 (50/50 보장형) */
  guaranteed: boolean
  /** 이미 보유한 목표 캐릭 카피 수 */
  copies: number
}

export type ReachResult = {
  /** cdf[k] = k회 소환 이내에 목표 달성 누적 확률 */
  cdf: number[]
  /** pmf[k] = 정확히 k회째 소환에서 목표 달성 확률 */
  pmf: number[]
}

const clampProb = (v: number) => Math.min(1, Math.max(0, v))

/**
 * 마지막 전설 이후 `pityBefore`번 소환한 상태에서, 다음(이번) 소환의 전설 확률.
 * 이번 소환의 천장 카운트 n = pityBefore + 1.
 */
export function legendaryRateAt(config: BannerConfig, pityBefore: number): number {
  const n = pityBefore + 1
  if (n >= config.hardPity) return 1
  if (config.softPityStart != null && n >= config.softPityStart) {
    const inc = config.softPityIncrement ?? 0
    return clampProb(config.legendaryBaseRate + (n - config.softPityStart + 1) * inc)
  }
  return clampProb(config.legendaryBaseRate)
}

/** 전설 1개를 얻었을 때 그것이 목표 캐릭일 확률. */
export function featuredProbability(config: BannerConfig, guaranteed: boolean): number {
  if (config.targetModel === 'featured') {
    if (guaranteed) return 1
    return clampProb(config.featuredShare ?? 0)
  }
  const pool = config.legendaryPoolSize ?? 1
  return pool > 0 ? 1 / pool : 0
}

type StateKey = string
const keyOf = (pity: number, guaranteed: boolean, copies: number): StateKey =>
  `${pity}|${guaranteed ? 1 : 0}|${copies}`

/**
 * `start` 상태에서 시작해 목표 카피 `goal`개를 모을 때까지의 정확한 분포.
 * pulls 회까지의 누적/개별 달성 확률을 마르코프 DP로 계산.
 */
export function reachGoalDistribution(
  config: BannerConfig,
  goal: number,
  pulls: number,
  start: SummonState,
): ReachResult {
  const safeGoal = Math.max(1, Math.floor(goal))
  const hard = Math.max(1, Math.floor(config.hardPity))
  const startCopies = Math.min(start.copies, safeGoal)

  const pmf = new Array(pulls + 1).fill(0)
  const cdf = new Array(pulls + 1).fill(0)

  if (startCopies >= safeGoal) {
    return { cdf: cdf.map(() => 1), pmf }
  }

  let dist = new Map<StateKey, number>()
  dist.set(keyOf(Math.min(start.pity, hard - 1), start.guaranteed, startCopies), 1)

  let cumulative = 0
  for (let pull = 1; pull <= pulls; pull += 1) {
    const next = new Map<StateKey, number>()
    let successThisPull = 0

    for (const [stateKey, prob] of dist) {
      const [pityStr, guarStr, copiesStr] = stateKey.split('|')
      const pity = Number(pityStr)
      const guaranteed = guarStr === '1'
      const copies = Number(copiesStr)

      const pL = legendaryRateAt(config, pity)

      if (pL < 1) {
        const k = keyOf(Math.min(pity + 1, hard - 1), guaranteed, copies)
        next.set(k, (next.get(k) ?? 0) + prob * (1 - pL))
      }

      if (pL > 0) {
        const fp = featuredProbability(config, guaranteed)
        const pFeatured = prob * pL * fp
        const pMiss = prob * pL * (1 - fp)

        if (pFeatured > 0) {
          if (copies + 1 >= safeGoal) {
            successThisPull += pFeatured
          } else {
            const k = keyOf(0, false, copies + 1)
            next.set(k, (next.get(k) ?? 0) + pFeatured)
          }
        }

        if (pMiss > 0) {
          const newGuaranteed =
            config.targetModel === 'featured' && config.guaranteedAfterLoss ? true : false
          const k = keyOf(0, newGuaranteed, copies)
          next.set(k, (next.get(k) ?? 0) + pMiss)
        }
      }
    }

    cumulative += successThisPull
    pmf[pull] = successThisPull
    cdf[pull] = cumulative
    dist = next
  }

  return { cdf, pmf }
}

/** 목표 달성 확률 `p`(0~1)에 도달하는 최소 소환 수. 한도 내 미달이면 null. */
export function pullsForProbability(
  config: BannerConfig,
  goal: number,
  p: number,
  start: SummonState,
  maxPulls = 2000,
): number | null {
  const { cdf } = reachGoalDistribution(config, goal, maxPulls, start)
  for (let k = 1; k < cdf.length; k += 1) {
    if (cdf[k] >= p) return k
  }
  return null
}

/** 목표 첫 1카피까지 기대 소환 수 (한도 초과 잔여 질량은 한도값으로 근사). */
export function expectedPullsForFirst(
  config: BannerConfig,
  start: SummonState,
  maxPulls = 4000,
): number {
  const { pmf, cdf } = reachGoalDistribution(config, 1, maxPulls, start)
  let expected = 0
  for (let k = 1; k <= maxPulls; k += 1) expected += k * pmf[k]
  const tailMass = 1 - cdf[maxPulls]
  return expected + tailMass * maxPulls
}

/** `pulls`회 소환 안에 보유하게 될 목표 카피 기대값. */
export function expectedCopies(
  config: BannerConfig,
  pulls: number,
  start: SummonState,
  copiesCap = 50,
): number {
  let expected = start.copies
  for (let g = start.copies + 1; g <= copiesCap; g += 1) {
    const { cdf } = reachGoalDistribution(config, g, pulls, { ...start })
    const reached = cdf[pulls]
    if (reached <= 1e-9) break
    expected += reached
  }
  return expected
}

/** 전설 1개가 나왔다고 가정할 때 그것이 픽업일 확률 (현재 상태 기준). */
export function conditionalFeaturedGivenLegendary(
  config: BannerConfig,
  state: SummonState,
): number {
  return featuredProbability(config, state.guaranteed)
}

export type ResourceInput = {
  /** 보유 보석 */
  gems: number
  /** 보유 소환 티켓(1티켓 = 1소환) */
  tickets: number
}

/** 보유 자원을 소환 가능 횟수로 환산. */
export function pullsFromResources(config: BannerConfig, resources: ResourceInput): number {
  const perPull = config.gemsPerPull ?? 0
  const fromGems = perPull > 0 ? Math.floor(resources.gems / perPull) : 0
  return fromGems + Math.max(0, Math.floor(resources.tickets))
}

export type StrategyReport = {
  availablePulls: number
  goal: number
  probabilityWithBudget: number
  expectedCopiesWithBudget: number
  conditionalFeatured: number
  milestones: { label: string; p: number; pulls: number | null; deficitPulls: number | null }[]
}

/** 현재 스택 + 보유 자원으로 뽑기 전략 시뮬레이션. */
export function buildStrategyReport(
  config: BannerConfig,
  goal: number,
  start: SummonState,
  resources: ResourceInput,
): StrategyReport {
  const availablePulls = pullsFromResources(config, resources)
  const horizon = Math.max(availablePulls, 1)
  const { cdf } = reachGoalDistribution(config, goal, Math.max(horizon, 1), start)
  const probabilityWithBudget = availablePulls > 0 ? cdf[Math.min(availablePulls, cdf.length - 1)] : 0

  const milestones = [0.5, 0.75, 0.9, 0.99].map((p) => {
    const pulls = pullsForProbability(config, goal, p, start)
    return {
      label: `${Math.round(p * 100)}%`,
      p,
      pulls,
      deficitPulls: pulls != null ? Math.max(0, pulls - availablePulls) : null,
    }
  })

  return {
    availablePulls,
    goal,
    probabilityWithBudget,
    expectedCopiesWithBudget: expectedCopies(config, Math.max(availablePulls, 0), start),
    conditionalFeatured: conditionalFeaturedGivenLegendary(config, start),
    milestones,
  }
}
