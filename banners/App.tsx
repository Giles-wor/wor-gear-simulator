import { useCallback, useEffect, useMemo, useState } from 'react'
import { heroNameKo } from '../src/data/heroNamesKo'
import { GlobalNav } from './components/GlobalNav'
import { SiteCredit } from './components/SiteCredit'
import {
  bannerSchedule,
  liveStatus,
  sortedBanners,
  type BannerHero,
  type ScheduledBanner,
} from './data/schedule'

const BASE = '/wor-gear-simulator/'

/** prospector 슬러그(kebab) → 한글명. 매핑 없으면 원본 영문 표기. */
function koName(h: BannerHero): string {
  const key = (h.slug ?? h.name).replace(/-/g, '_').toLowerCase()
  return heroNameKo[key] ?? h.name
}

const KST = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function fmtRange(startUtc: string, endUtc: string): string {
  return `${KST.format(new Date(startUtc))} ~ ${KST.format(new Date(endUtc))} (KST)`
}

/** 남은 시간을 "2일 3시간" / "5시간 12분" 형태로 */
function fmtRemain(ms: number): string {
  if (ms <= 0) return '0분'
  const totalMin = Math.floor(ms / 60000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d}일 ${h}시간`
  if (h > 0) return `${h}시간 ${m}분`
  return `${m}분`
}

const HERO_PAGE = 'https://prospector.gg/hero/'

/** 배너 종류 영문 → 한글 (변형에 견디도록 키워드 매칭, 미매칭은 원문). */
function typeKo(type: string): string {
  if (/ancient/i.test(type)) return '고대 소환'
  if (/invocation|spirit|divine/i.test(type)) return '일반 소환'
  if (/limited/i.test(type)) return '한정 소환'
  return type
}

const DAY_MS = 86_400_000
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 타임스탬프의 UTC 날짜(자정) 키 — 배너가 07:00Z 리셋 정렬이라 UTC 일 단위로 버킷팅 */
const dayKeyUTC = (ts: number) => {
  const d = new Date(ts)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}
const shortType = (type: string) =>
  /ancient/i.test(type) ? '고대' : /limited/i.test(type) ? '한정' : '일반'
const typeColorClass = (type: string) =>
  /ancient/i.test(type) ? 'cal--ancient' : /limited/i.test(type) ? 'cal--limited' : 'cal--invocation'
const hasNewHero = (b: ScheduledBanner) =>
  b.heroes.some((h) => !h.icon || /preview/i.test(h.icon))
/** 신캐(미공개) 영웅 이름 목록 — koName 적용 */
const newHeroNames = (b: ScheduledBanner) =>
  b.heroes.filter((h) => !h.icon || /preview/i.test(h.icon)).map((h) => koName(h))
/** 스크롤 타겟용 안정적 DOM id */
const bannerDomId = (b: ScheduledBanner) => `banner-${Date.parse(b.startUtc)}-${Date.parse(b.endUtc)}`

function CalendarView({
  banners,
  todayTs,
  now,
  onPick,
}: {
  banners: ScheduledBanner[]
  todayTs: number
  now: number
  onPick: (id: string) => void
}) {
  const layout = useMemo(() => {
    const items = banners
      .map((b) => {
        const start = dayKeyUTC(Date.parse(b.startUtc))
        const endExcl = Math.max(dayKeyUTC(Date.parse(b.endUtc)), start + DAY_MS) // 리셋일=배타적
        return { b, start, endExcl }
      })
      .sort((a, z) => a.start - z.start || a.endExcl - z.endExcl)

    // 겹치지 않게 레인(행) 배정
    const laneEnds: number[] = []
    const withLane = items.map((it) => {
      let lane = laneEnds.findIndex((e) => e <= it.start)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(0)
      }
      laneEnds[lane] = it.endExcl
      return { ...it, lane }
    })
    const laneCount = Math.max(1, laneEnds.length)

    // 오늘 주(일요일 시작)부터, 마지막 배너까지 덮도록 4~8주
    const weekStart = todayTs - new Date(todayTs).getUTCDay() * DAY_MS
    const lastDay = withLane.reduce((m, it) => Math.max(m, it.endExcl - DAY_MS), todayTs + 27 * DAY_MS)
    const weeks = Math.min(8, Math.max(4, Math.ceil((lastDay - weekStart + DAY_MS) / (7 * DAY_MS))))
    return { withLane, laneCount, weekStart, weeks }
  }, [banners, todayTs])

  const { withLane, laneCount, weekStart, weeks } = layout
  const monthFmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', year: 'numeric', month: 'long' })

  const weekRows = Array.from({ length: weeks }, (_, w) => {
    const wkStart = weekStart + w * 7 * DAY_MS
    const wkEndExcl = wkStart + 7 * DAY_MS
    const bars = withLane
      .filter((it) => it.start < wkEndExcl && it.endExcl > wkStart)
      .map((it) => {
        const segStart = Math.max(it.start, wkStart)
        const segEnd = Math.min(it.endExcl, wkEndExcl)
        return {
          it,
          colStart: Math.round((segStart - wkStart) / DAY_MS),
          span: Math.round((segEnd - segStart) / DAY_MS),
          isStart: segStart === it.start,
          isEnd: segEnd === it.endExcl,
        }
      })
    return { wkStart, bars }
  })

  return (
    <section className="calendar" aria-label="배너 일정 달력">
      <div className="calHead">
        <strong>{monthFmt.format(new Date(todayTs))} 배너 일정</strong>
        <span className="calLegend">
          <i className="calDot cal--invocation" />일반
          <i className="calDot cal--ancient" />고대
          <i className="calDot cal--limited" />한정
          <em className="calLiveTag">진행 중</em>
          <em>⭐ 신캐</em>
        </span>
      </div>
      <div className="calWeekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      {weekRows.map(({ wkStart, bars }) => (
        <div
          key={wkStart}
          className="calWeek"
          style={{ gridTemplateRows: `20px repeat(${laneCount}, 16px)` }}
        >
          {Array.from({ length: 7 }, (_, d) => {
            const ts = wkStart + d * DAY_MS
            const dt = new Date(ts)
            const cls = ['calCell']
            if (ts === todayTs) cls.push('is-today')
            else if (ts < todayTs) cls.push('is-past')
            if (d === 0) cls.push('is-sun')
            return (
              <div key={d} className={cls.join(' ')} style={{ gridColumn: d + 1, gridRow: `1 / -1` }}>
                <span className="calNum">{dt.getUTCDate()}</span>
              </div>
            )
          })}
          {bars.map(({ it, colStart, span, isStart, isEnd }) => {
            const isLive = Date.parse(it.b.startUtc) <= now && now < Date.parse(it.b.endUtc)
            const news = newHeroNames(it.b)
            const label = news.length ? `⭐ ${news.join('·')}` : shortType(it.b.type)
            return (
              <button
                key={bannerDomId(it.b)}
                type="button"
                className={`calBar ${typeColorClass(it.b.type)}${isStart ? ' is-start' : ''}${isEnd ? ' is-end' : ''}${isLive ? ' is-live' : ''}`}
                style={{ gridColumn: `${colStart + 1} / span ${span}`, gridRow: it.lane + 2 }}
                onClick={() => onPick(bannerDomId(it.b))}
                title={`${shortType(it.b.type)} 소환${isLive ? ' (진행 중)' : ''} · ${it.b.heroes
                  .map((h) => h.name)
                  .join(', ')}`}
              >
                {isStart && <span className="calBarLabel">{label}</span>}
              </button>
            )
          })}
        </div>
      ))}
    </section>
  )
}

function BannerCard({ banner, now }: { banner: ScheduledBanner; now: number }) {
  const status = liveStatus(banner, now)
  const start = Date.parse(banner.startUtc)
  const end = Date.parse(banner.endUtc)

  const badge =
    status === 'active'
      ? { label: '진행 중', cls: 'active' }
      : { label: '예정', cls: 'upcoming' }
  const countdown =
    status === 'active'
      ? `종료까지 ${fmtRemain(end - now)}`
      : `시작까지 ${fmtRemain(start - now)}`

  return (
    <article id={bannerDomId(banner)} className={`bannerCard bannerCard--${badge.cls}`}>
      <div className="bannerCardTop">
        <span className={`bannerBadge bannerBadge--${badge.cls}`}>{badge.label}</span>
        {banner.durationDays != null && (
          <span className="bannerDuration">{banner.durationDays}일 배너</span>
        )}
        <span className="bannerCountdown">⏳ {countdown}</span>
      </div>

      <h2 className="bannerType" title={banner.type}>
        {typeKo(banner.type)}
      </h2>
      <p className="bannerRange">📅 {fmtRange(banner.startUtc, banner.endUtc)}</p>

      <div className="bannerHeroes">
        {banner.heroes.map((h) => {
          // 신캐 = 정식 포트레이트가 없는(미공개) 영웅: 아이콘이 없거나 'Preview' 이미지
          const isNew = !h.icon || /preview/i.test(h.icon)
          const cls =
            `bannerHero${h.rarity ? ` bannerHero--${h.rarity}` : ''}` +
            (isNew ? ' bannerHero--new' : '')
          const inner = (
            <>
              {h.icon && <img src={h.icon} alt="" loading="lazy" />}
              <span>{koName(h)}</span>
              {isNew && <span className="bannerHeroNew">신캐</span>}
            </>
          )
          // 상세페이지(slug) 있으면 링크, 없으면(신캐 등) 정적 칩
          return h.slug ? (
            <a
              key={h.slug}
              className={cls}
              href={`${HERO_PAGE}${h.slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              title={`${h.name} 정보 (prospector.gg)`}
            >
              {inner}
            </a>
          ) : (
            <span key={h.name} className={cls} title={isNew ? `${h.name} · 미공개 신규 영웅` : h.name}>
              {inner}
            </span>
          )
        })}
      </div>
      <p className="bannerCredit">출처 · prospector.gg</p>
    </article>
  )
}

export default function App() {
  const [now, setNow] = useState(() => Date.now())

  // 1분마다 카운트다운 갱신
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // 종료된 배너는 숨기고, 시작 시각 순으로 진행중 → 예정 노출
  const visible = useMemo(
    () => sortedBanners.filter((b) => liveStatus(b, now) !== 'ended'),
    [now],
  )

  const todayTs = useMemo(() => dayKeyUTC(now), [now])
  const scrollToBanner = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('bannerCard--flash')
    window.setTimeout(() => el.classList.remove('bannerCard--flash'), 1400)
  }, [])

  const updatedLabel = bannerSchedule.fetchedAt
    ? new Date(bannerSchedule.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : bannerSchedule.sourceModified
      ? `${new Date(bannerSchedule.sourceModified).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} (원본 기준)`
      : '—'

  return (
    <div className="app bannersApp">
      <SiteCredit />
      <GlobalNav active="banners" />

      <header className="bannersHeader">
        <h1>다가오는 영웅 배너</h1>
        <p className="bannersIntro">
          현재 진행 중이거나 곧 등장할 소환 배너와 픽업 영웅 일정입니다. 시간은 한국 시간(KST) 기준이며,
          남은 시간은 1분마다 자동 갱신돼요.
        </p>
        <p className="bannersSource">
          데이터 출처 ·{' '}
          <a href={bannerSchedule.sourceUrl} target="_blank" rel="noopener noreferrer">
            prospector.gg
          </a>{' '}
          · 영웅명은 인게임 한글 표기로 변환(미등록 영웅은 영문)
        </p>
      </header>

      {visible.length === 0 ? (
        <div className="bannersEmpty">
          <p>표시할 예정 배너가 없습니다.</p>
          <p className="bannersEmptyHint">잠시 후 데이터가 갱신되면 자동으로 표시됩니다.</p>
        </div>
      ) : (
        <>
          <CalendarView banners={visible} todayTs={todayTs} now={now} onPick={scrollToBanner} />
          <p className="calHint">막대를 누르면 아래 해당 배너로 이동해요.</p>
          <div className="bannerList">
            {visible.map((b) => (
              <BannerCard key={`${b.type}-${b.startUtc}`} banner={b} now={now} />
            ))}
          </div>
        </>
      )}

      <a className="bannerSummonCta" href={`${BASE}summon/`}>
        <span className="bannerSummonCtaText">
          <b>이 영웅, 뽑을까 말까?</b>
          <span className="bannerSummonCtaSub">천장·확률을 직접 계산해보세요</span>
        </span>
        <span className="bannerSummonCtaGo">소환 확률 시뮬레이터 가기 ›</span>
      </a>

      <footer className="bannersFooter">
        데이터 출처 ·{' '}
        <a href={bannerSchedule.sourceUrl} target="_blank" rel="noopener noreferrer">
          prospector.gg
        </a>{' '}
        · 갱신 {updatedLabel}
        <span className="bannersFooterNote">
          영웅명은 원본(영문) 표기이며, 일정은 변경될 수 있습니다.
        </span>
      </footer>
    </div>
  )
}
