import type { Hero } from '../data/heroes'
import { HeroPicker } from './HeroPicker'

type HeroHeaderProps = {
  hero: Hero
  heroOptions: Hero[]
  heroId: string
  onHeroChange: (heroId: string) => void
}

export function HeroHeader({ hero, heroOptions, heroId, onHeroChange }: HeroHeaderProps) {
  return (
    <>
      <header className="heroBanner card">
        <div className="heroCopy">
          <p className="eyebrow">Watcher of Realms</p>
          <h1>모바일 DPS 시뮬레이터</h1>
          <p className="muted">정교한 전투 재현보다, 어떤 스탯과 세트가 더 좋은지 빠르게 판단하는 데 초점을 둔 버전입니다.</p>
        </div>
        <HeroPicker heroId={heroId} heroes={heroOptions} onChange={onHeroChange} />
      </header>

      <section className="card summaryCard">
        <div className="sectionHeading compactHeading">
          <div>
            <h2 className="compactHeroName">{hero.name}</h2>
            <p className="muted compactHeroMeta">{hero.heroClass} · {hero.damageType} · {hero.rarity}</p>
          </div>
        </div>
        <div className="summaryGrid compactSummaryGrid">
          <div><span>기본 간격</span><strong>{hero.baseInterval.toFixed(1)}초</strong></div>
          <div><span>각성 보너스</span><strong>+{hero.awakeningAtkBonus}</strong></div>
          <div><span>출처</span><strong>{hero.sourceLevel}</strong></div>
        </div>
        <p className="muted detailNote">
          기본 스탯 출처: {hero.source} / {hero.sourceLevel} 기준
        </p>
      </section>
    </>
  )
}
