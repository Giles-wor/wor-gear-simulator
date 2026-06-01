import { generatedSchedule } from './schedule.generated'
import type { BannerSchedule, ScheduledBanner } from './types'

export type { BannerSchedule, ScheduledBanner, BannerHero, BannerStatus } from './types'

const EMPTY: BannerSchedule = {
  source: 'prospector.gg',
  sourceUrl: 'https://prospector.gg/upcoming-hero-banners/',
  fetchedAt: null,
  sourceModified: null,
  banners: [],
}

export const bannerSchedule: BannerSchedule = generatedSchedule ?? EMPTY

/** 시작 시각 오름차순 정렬된 배너 목록 */
export const sortedBanners: ScheduledBanner[] = [...bannerSchedule.banners].sort(
  (a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc),
)

export type LiveStatus = 'active' | 'upcoming' | 'ended'

/** 타임스탬프 기준으로 현재 상태를 재계산 (편집형 status 대신 실제 시각 사용). */
export function liveStatus(banner: ScheduledBanner, now: number): LiveStatus {
  const start = Date.parse(banner.startUtc)
  const end = Date.parse(banner.endUtc)
  if (now >= end) return 'ended'
  if (now >= start) return 'active'
  return 'upcoming'
}
