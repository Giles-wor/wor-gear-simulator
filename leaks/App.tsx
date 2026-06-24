import { useCallback, useEffect, useState } from 'react'
import { GlobalNav } from './components/GlobalNav'
import { SiteCredit } from './components/SiteCredit'
import { leakHeroes, leakSourceCredit, leakUpdatedAt, type LeakHero } from './data/leaks'

function ShotLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="leakOverlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="leakOverlayBox" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="leakOverlayClose" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <img className="leakOverlayImg" src={src} alt={alt} />
      </div>
    </div>
  )
}

function HeroSection({ hero, onShot }: { hero: LeakHero; onShot: (src: string, alt: string) => void }) {
  return (
    <section className="leakHero" id={hero.key}>
      <div className="leakHeroTop">
        {hero.portrait && (
          <div className="leakPortrait">
            <img src={hero.portrait} alt={`${hero.nameKo} 일러스트`} loading="lazy" />
          </div>
        )}
        <div className="leakHeroHead">
          <div className="leakNameRow">
            <h2 className="leakName">{hero.nameKo}</h2>
            <span className="leakNameRu">{hero.nameRu}</span>
          </div>
          {hero.titleKo && <p className="leakTitle">{hero.titleKo}</p>}
          <div className="leakMeta">
            <span className="leakBadge rarity">{hero.rarity}</span>
            <span className="leakBadge">팩션 · {hero.faction}</span>
            <span className="leakBadge">클래스 · {hero.className}</span>
          </div>
          <div className="leakTags">
            {hero.tags.map((t) => (
              <span key={t} className="leakTag">
                {t}
              </span>
            ))}
          </div>
          {hero.story && <p className="leakStory">{hero.story}</p>}
          <div className="leakStats">
            {hero.stats.map((s) => (
              <div key={s.label} className="leakStat">
                <span className="leakStatLabel">{s.label}</span>
                <span className="leakStatValue">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="leakBlock">
        <h3 className="leakBlockTitle">탤런트</h3>
        <p className="leakTalent">{hero.talent}</p>
      </div>

      <div className="leakBlock">
        <h3 className="leakBlockTitle">스킬</h3>
        <div className="leakSkills">
          {hero.skills.map((sk) => (
            <div key={sk.name} className="leakSkill">
              <div className="leakSkillHead">
                <span className="leakSkillName">{sk.name}</span>
                {sk.kind && <span className="leakSkillKind">{sk.kind}</span>}
              </div>
              <p className="leakSkillDesc">{sk.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="leakBlock">
        <h3 className="leakBlockTitle">각성 (Пробуждения)</h3>
        <ol className="leakAwaken">
          {hero.awakenings.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ol>
      </div>

      {hero.glossary && hero.glossary.length > 0 && (
        <div className="leakBlock">
          <h3 className="leakBlockTitle">효과 용어</h3>
          <dl className="leakGlossary">
            {hero.glossary.map((g) => (
              <div key={g.term} className="leakGlossaryRow">
                <dt>{g.term}</dt>
                <dd>{g.desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {hero.shots.length > 0 && (
        <div className="leakBlock">
          <h3 className="leakBlockTitle">원문 스크린샷 (검증용)</h3>
          <div className="leakShots">
            {hero.shots.map((src, i) => (
              <button
                key={src}
                type="button"
                className="leakShotThumb"
                onClick={() => onShot(src, `${hero.nameKo} 원문 ${i + 1}`)}
              >
                <img src={src} alt={`${hero.nameKo} 원문 스크린샷 ${i + 1}`} loading="lazy" />
                <span className="leakShotHint">🔍 크게 보기</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default function App() {
  const [shot, setShot] = useState<{ src: string; alt: string } | null>(null)
  const openShot = useCallback((src: string, alt: string) => setShot({ src, alt }), [])
  const closeShot = useCallback(() => setShot(null), [])

  return (
    <div className="app leaksApp">
      <SiteCredit />
      <GlobalNav active="leaks" />

      <header className="leakHeader">
        <h1>WoR 유출 정보</h1>
        <p className="leakIntro">
          데이터마이닝으로 공개된 신규 영웅 정보를 한국어로 번역해 정리했습니다. 원문은 러시아어이며,
          기계적인 직역이 아닌 의역이 포함됩니다.
        </p>
        <div className="leakDisclaimer" role="note">
          <strong>⚠️ 비공식 유출 자료</strong>
          <span>
            정식 출시 시 수치·효과·이름이 바뀔 수 있습니다. 일부 원문은 OCR/번역 한계로 추정이 섞여 있어요
            (해당 항목엔 “추정” 표기). 정확한 검증을 위해 각 영웅 하단에 <b>원문 스크린샷</b>을 함께
            실었습니다. 출처: {leakSourceCredit} · 정리일 {leakUpdatedAt}.
          </span>
        </div>
        <nav className="leakJump" aria-label="영웅 바로가기">
          {leakHeroes.map((h) => (
            <a key={h.key} href={`#${h.key}`} className="leakJumpLink">
              {h.nameKo}
            </a>
          ))}
        </nav>
      </header>

      <main className="leakList">
        {leakHeroes.map((h) => (
          <HeroSection key={h.key} hero={h} onShot={openShot} />
        ))}
      </main>

      <footer className="leakFooter">
        유출 영웅 {leakHeroes.length}명 · 번역 정리 Time 길드 · 원문 {leakSourceCredit}
      </footer>

      {shot && <ShotLightbox src={shot.src} alt={shot.alt} onClose={closeShot} />}
    </div>
  )
}
