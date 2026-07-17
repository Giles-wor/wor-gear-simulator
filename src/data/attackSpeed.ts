export type Breakpoint = {
  requiredTotalAspd: number
  interval: number
}

export type AttackSpeedProfile = {
  baseInterval: number
  breakpoints: Breakpoint[]
  notes?: string
}

function withBaseline(baseInterval: number, breakpoints: Breakpoint[]): AttackSpeedProfile {
  return {
    baseInterval,
    breakpoints: [{ requiredTotalAspd: 100, interval: baseInterval }, ...breakpoints],
  }
}

export const attackSpeedProfilesByBaseInterval: Record<string, AttackSpeedProfile> = {
  '3.5': withBaseline(3.5, [
    { interval: 2.2, requiredTotalAspd: 282 },
    { interval: 2.1, requiredTotalAspd: 314 },
    { interval: 2.0, requiredTotalAspd: 351 },
    { interval: 1.9, requiredTotalAspd: 395 },
    { interval: 1.8, requiredTotalAspd: 448 },
    { interval: 1.7, requiredTotalAspd: 515 },
  ]),
  '3.0': withBaseline(3.0, [
    { interval: 1.8, requiredTotalAspd: 308 },
    { interval: 1.7, requiredTotalAspd: 351 },
    { interval: 1.6, requiredTotalAspd: 403 },
    { interval: 1.5, requiredTotalAspd: 469 },
    { interval: 1.4, requiredTotalAspd: 555 },
    { interval: 1.3, requiredTotalAspd: 672 },
  ]),
  '2.7': withBaseline(2.7, [
    { interval: 1.3, requiredTotalAspd: 286 },
    { interval: 1.2, requiredTotalAspd: 316 },
    { interval: 1.1, requiredTotalAspd: 351 },
    { interval: 1.0, requiredTotalAspd: 391 },
    { interval: 0.9, requiredTotalAspd: 441 },
    { interval: 0.8, requiredTotalAspd: 501 },
    { interval: 0.7, requiredTotalAspd: 576 },
    { interval: 0.6, requiredTotalAspd: 672 },
    { interval: 0.5, requiredTotalAspd: 801 },
  ]),
  '2.6': withBaseline(2.6, [
    { interval: 1.6, requiredTotalAspd: 286 },
    { interval: 1.5, requiredTotalAspd: 330 },
    { interval: 1.4, requiredTotalAspd: 385 },
    { interval: 1.3, requiredTotalAspd: 458 },
    { interval: 1.2, requiredTotalAspd: 555 },
    { interval: 1.1, requiredTotalAspd: 694 },
  ]),
  '2.5': withBaseline(2.5, [
    { interval: 1.5, requiredTotalAspd: 301 },
    { interval: 1.4, requiredTotalAspd: 351 },
    { interval: 1.3, requiredTotalAspd: 415 },
    { interval: 1.2, requiredTotalAspd: 501 },
    { interval: 1.1, requiredTotalAspd: 621 },
    { interval: 1.0, requiredTotalAspd: 801 },
  ]),
  '2.4': withBaseline(2.4, [
    { interval: 1.5, requiredTotalAspd: 273 },
    { interval: 1.4, requiredTotalAspd: 320 },
    { interval: 1.3, requiredTotalAspd: 375 },
    { interval: 1.2, requiredTotalAspd: 451 },
    { interval: 1.1, requiredTotalAspd: 555 },
    { interval: 1.0, requiredTotalAspd: 708 },
  ]),
  '2.0': withBaseline(2.0, [
    { interval: 1.3, requiredTotalAspd: 243 },
    { interval: 1.2, requiredTotalAspd: 290 },
    { interval: 1.1, requiredTotalAspd: 351 },
    { interval: 1.0, requiredTotalAspd: 434 },
    { interval: 0.9, requiredTotalAspd: 555 },
    { interval: 0.8, requiredTotalAspd: 748 },
  ]),
  '5.0': withBaseline(5.0, [
    { interval: 3.0, requiredTotalAspd: 324 },
    { interval: 2.9, requiredTotalAspd: 351 },
    { interval: 2.8, requiredTotalAspd: 381 },
    { interval: 2.7, requiredTotalAspd: 415 },
    { interval: 2.6, requiredTotalAspd: 454 },
    { interval: 2.5, requiredTotalAspd: 501 },
  ]),
  // 카드그림(khadgrim): baseInterval 10, 공속표 Ver 26.7.17 기준
  '10.0': withBaseline(10, [
    { interval: 7.7, requiredTotalAspd: 258 },
    { interval: 7.6, requiredTotalAspd: 271 },
    { interval: 7.5, requiredTotalAspd: 285 },
    { interval: 7.4, requiredTotalAspd: 301 },
    { interval: 7.3, requiredTotalAspd: 317 },
    { interval: 7.2, requiredTotalAspd: 335 },
    { interval: 7.1, requiredTotalAspd: 355 },
    { interval: 7.0, requiredTotalAspd: 377 },
    { interval: 6.9, requiredTotalAspd: 401 },
    { interval: 6.8, requiredTotalAspd: 427 },
    { interval: 6.7, requiredTotalAspd: 456 },
    { interval: 6.6, requiredTotalAspd: 489 },
    { interval: 6.5, requiredTotalAspd: 526 },
    { interval: 6.4, requiredTotalAspd: 567 },
    { interval: 6.3, requiredTotalAspd: 613 },
    { interval: 6.2, requiredTotalAspd: 670 },
    { interval: 6.1, requiredTotalAspd: 734 },
    { interval: 6.0, requiredTotalAspd: 810 },
  ]),
}

export const specialAttackSpeedProfiles: Record<string, AttackSpeedProfile> = {
  '2.6_special': {
    baseInterval: 2.6,
    notes: '특수 케이스용 별도 공속표',
    breakpoints: [
      { requiredTotalAspd: 100, interval: 2.6 },
      { interval: 1.0, requiredTotalAspd: 373 },
      { interval: 0.9, requiredTotalAspd: 421 },
      { interval: 0.8, requiredTotalAspd: 478 },
      { interval: 0.7, requiredTotalAspd: 551 },
      { interval: 0.6, requiredTotalAspd: 643 },
      { interval: 0.5, requiredTotalAspd: 767 },
    ],
  },
}

// 같은 baseInterval 이라도 고유 공속 곡선을 갖는 영웅(키 = hero id).
// 예: 지제벨(jezebelle)은 baseInterval 5.0 이지만 일반 5.0 표(엘)와 구간이 다름.
export const heroSpecificAttackSpeedProfiles: Record<string, AttackSpeedProfile> = {
  jezebelle: withBaseline(5.0, [
    { interval: 3.7, requiredTotalAspd: 234 },
    { interval: 3.6, requiredTotalAspd: 253 },
    { interval: 3.5, requiredTotalAspd: 276 },
    { interval: 3.4, requiredTotalAspd: 301 },
    { interval: 3.3, requiredTotalAspd: 329 },
    { interval: 3.2, requiredTotalAspd: 362 },
    { interval: 3.1, requiredTotalAspd: 401 },
    { interval: 3.0, requiredTotalAspd: 446 },
    { interval: 2.9, requiredTotalAspd: 501 },
    { interval: 2.8, requiredTotalAspd: 567 },
    { interval: 2.7, requiredTotalAspd: 651 },
    { interval: 2.6, requiredTotalAspd: 758 },
  ]),
}

function formatBaseIntervalKey(baseInterval: number) {
  return baseInterval.toFixed(1)
}

export function getAttackSpeedProfile(baseInterval: number) {
  const directKey = formatBaseIntervalKey(baseInterval)
  return attackSpeedProfilesByBaseInterval[directKey] ?? withBaseline(baseInterval, [])
}

/** 영웅 전용 공속표가 있으면 그걸, 없으면 baseInterval 기준 일반표를 반환. */
export function getAttackSpeedProfileForHero(heroId: string | undefined, baseInterval: number) {
  if (heroId && heroSpecificAttackSpeedProfiles[heroId]) {
    return heroSpecificAttackSpeedProfiles[heroId]
  }
  return getAttackSpeedProfile(baseInterval)
}
