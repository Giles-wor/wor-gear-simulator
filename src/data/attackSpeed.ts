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

function formatBaseIntervalKey(baseInterval: number) {
  return baseInterval.toFixed(1)
}

export function getAttackSpeedProfile(baseInterval: number) {
  const directKey = formatBaseIntervalKey(baseInterval)
  return attackSpeedProfilesByBaseInterval[directKey] ?? withBaseline(baseInterval, [])
}
