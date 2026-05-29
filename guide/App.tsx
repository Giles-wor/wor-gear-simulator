import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GlobalNav } from './components/GlobalNav'
import { SiteCredit } from './components/SiteCredit'
import { guideCategories, hasAnyGuide, type GuideItem } from './data/guides'

type Viewer = { item: GuideItem; index: number }

function GuideCard({ item, onOpen }: { item: GuideItem; onOpen: () => void }) {
  const cover = item.images[0]
  const count = item.images.length
  const empty = count === 0
  return (
    <button
      type="button"
      className={`guideCard${empty ? ' empty' : ''}`}
      onClick={empty ? undefined : onOpen}
      disabled={empty}
      aria-label={`${item.name} 공략 보기 (이미지 ${count}장)`}
    >
      <span className="guideCardThumb">
        {cover ? (
          <img src={cover} alt="" loading="lazy" />
        ) : (
          <span className="guideCardPlaceholder">준비 중</span>
        )}
        {count > 1 && <span className="guideCardCount">🖼 {count}</span>}
      </span>
      <span className="guideCardName">{item.name}</span>
      {item.credit && <span className="guideCardCredit">출처 · {item.credit}</span>}
    </button>
  )
}

function Lightbox({
  viewer,
  onClose,
  onStep,
}: {
  viewer: Viewer
  onClose: () => void
  onStep: (delta: number) => void
}) {
  const { item, index } = viewer
  const total = item.images.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onStep(1)
      else if (e.key === 'ArrowLeft') onStep(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, onStep])

  // 모바일 좌우 스와이프로 이미지 넘기기
  const touchX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (total > 1 && Math.abs(dx) > 45) onStep(dx < 0 ? 1 : -1)
  }

  return (
    <div className="lightboxOverlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightboxBox" onClick={(e) => e.stopPropagation()}>
        <div className="lightboxHead">
          <span className="lightboxTitle">
            <span className="lightboxName">
              {item.name}
              {total > 1 && (
                <span className="lightboxCounter">
                  {index + 1} / {total}
                </span>
              )}
            </span>
            {item.credit && <span className="lightboxCredit">출처 · {item.credit}</span>}
          </span>
          <button type="button" className="lightboxClose" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="lightboxStage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {total > 1 && (
            <button
              type="button"
              className="lightboxNav prev"
              onClick={() => onStep(-1)}
              aria-label="이전 이미지"
            >
              ‹
            </button>
          )}
          <img className="lightboxImg" src={item.images[index]} alt={`${item.name} ${index + 1}`} />
          {total > 1 && (
            <button
              type="button"
              className="lightboxNav next"
              onClick={() => onStep(1)}
              aria-label="다음 이미지"
            >
              ›
            </button>
          )}
        </div>
        {total > 1 && (
          <div className="lightboxThumbs">
            {item.images.map((src, i) => (
              <button
                type="button"
                key={src}
                className={`lightboxThumb${i === index ? ' active' : ''}`}
                onClick={() => onStep(i - index)}
                aria-label={`${i + 1}번 이미지`}
              >
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [viewer, setViewer] = useState<Viewer | null>(null)

  const open = useCallback((item: GuideItem) => setViewer({ item, index: 0 }), [])
  const close = useCallback(() => setViewer(null), [])
  const step = useCallback((delta: number) => {
    setViewer((cur) => {
      if (!cur) return cur
      const total = cur.item.images.length
      const next = (cur.index + delta + total) % total
      return { ...cur, index: next }
    })
  }, [])

  const totalImages = useMemo(
    () => guideCategories.reduce((n, c) => n + c.items.reduce((m, i) => m + i.images.length, 0), 0),
    [],
  )

  return (
    <div className="app guideApp">
      <SiteCredit />
      <GlobalNav active="guide" />

      <header className="guideHeader">
        <h1>WoR 공략</h1>
        <p className="guideIntro">
          타이탄·콘텐츠별 공략 자료 모음입니다. 카드를 누르면 관련 이미지가 크게 열리고, 여러 장이면
          좌우로 넘겨(모바일은 스와이프) 볼 수 있어요.
        </p>
      </header>

      <div className="guideNotice" role="note">
        <strong>📌 공략 자료 출처 안내</strong>
        <p>
          이곳의 공략 이미지는 <b>9enie</b> 님을 비롯한 여러 제작자분들이 만들어 주신 자료를
          <b> 제작자분들의 허락을 받아</b> 게시하고 있습니다. 각 이미지의 출처는 이미지 내에 표기되어
          있으며, 카드·팝업에도 함께 표시됩니다. 무단 도용·재배포는 삼가 주세요. 출처 정정이나 게시 관련
          문의는 상단 카카오톡 오픈채팅으로 알려 주세요.
        </p>
      </div>

      {!hasAnyGuide ? (
        <div className="guideEmptyGlobal">
          <p>아직 등록된 공략 이미지가 없습니다.</p>
          <p className="guideEmptyHint">
            <code>guide/assets/&lt;카테고리&gt;/&lt;항목명&gt;/</code> 폴더에 이미지를 올리면 자동으로
            여기에 표시됩니다.
          </p>
        </div>
      ) : (
        guideCategories.map((cat) => (
          <section className="guideSection" key={cat.id}>
            <h2 className="guideSectionTitle">{cat.label}</h2>
            {cat.items.length === 0 ? (
              <p className="guideEmptyCat">준비 중인 카테고리입니다.</p>
            ) : (
              <div className="guideGrid">
                {cat.items.map((item) => (
                  <GuideCard key={item.key} item={item} onOpen={() => open(item)} />
                ))}
              </div>
            )}
          </section>
        ))
      )}

      <footer className="guideFooter">총 {totalImages}장의 공략 이미지</footer>

      {viewer && <Lightbox viewer={viewer} onClose={close} onStep={step} />}
    </div>
  )
}
