import { useEffect, useMemo, useState } from 'react'
import { GlobalNav } from './components/GlobalNav'
import { SiteCredit } from './components/SiteCredit'
import { bannerSchedule, liveStatus, sortedBanners, type ScheduledBanner } from './data/schedule'

const BASE = '/wor-gear-simulator/'

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
    <article className={`bannerCard bannerCard--${badge.cls}`}>
      <div className="bannerCardTop">
        <span className={`bannerBadge bannerBadge--${badge.cls}`}>{badge.label}</span>
        {banner.durationDays != null && (
          <span className="bannerDuration">{banner.durationDays}일 배너</span>
        )}
        <span className="bannerCountdown">⏳ {countdown}</span>
      </div>

      <h2 className="bannerType">{banner.type}</h2>
      <p className="bannerRange">📅 {fmtRange(banner.startUtc, banner.endUtc)}</p>

      <div className="bannerHeroes">
        {banner.heroes.map((h) => (
          <a
            key={h.slug ?? h.name}
            className={`bannerHero${h.rarity ? ` bannerHero--${h.rarity}` : ''}`}
            href={h.slug ? `${HERO_PAGE}${h.slug}/` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            title={`${h.name} 정보 (prospector.gg)`}
          >
            {h.icon && <img src={h.icon} alt="" loading="lazy" />}
            <span>{h.name}</span>
          </a>
        ))}
      </div>
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
      </header>

      {visible.length === 0 ? (
        <div className="bannersEmpty">
          <p>표시할 예정 배너가 없습니다.</p>
          <p className="bannersEmptyHint">잠시 후 데이터가 갱신되면 자동으로 표시됩니다.</p>
        </div>
      ) : (
        <div className="bannerList">
          {visible.map((b) => (
            <BannerCard key={`${b.type}-${b.startUtc}`} banner={b} now={now} />
          ))}
        </div>
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
