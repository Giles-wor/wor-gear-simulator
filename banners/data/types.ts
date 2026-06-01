/** prospector.gg "다가오는 영웅 배너" 일정 데이터 타입. */

/** prospector 가 표기하는 편집형 상태 (실제 노출 상태는 타임스탬프로 재계산). */
export type BannerStatus = 'active' | 'next' | 'upcoming'

export type BannerHero = {
  /** 영문 영웅명 (prospector 표기) */
  name: string
  /** prospector 영웅 슬러그 (예: lord-phineas) — 한글명 매핑 키로 사용 */
  slug?: string
  /** legendary | epic 등 (아이콘 클래스에서 추출, 선택) */
  rarity?: string
  /** 영웅 아이콘 URL (선택) */
  icon?: string
}

export type ScheduledBanner = {
  status: BannerStatus
  /** 배너 종류 (예: Invocation of Spirits and Divine Summoning) */
  type: string
  /** 기간(일). 파싱 실패 시 null */
  durationDays: number | null
  /** UTC ISO8601 시작 */
  startUtc: string
  /** UTC ISO8601 종료 */
  endUtc: string
  heroes: BannerHero[]
}

export type BannerSchedule = {
  source: string
  sourceUrl: string
  /** 크롤 시각 (ISO). 시드 데이터는 null */
  fetchedAt: string | null
  /** 원본 페이지 최종 수정 시각 (WP modified_gmt) */
  sourceModified: string | null
  banners: ScheduledBanner[]
}
