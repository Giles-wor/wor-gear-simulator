import type { Hero } from '../data/heroes'
import { HeroPicker } from './HeroPicker'

type HeroHeaderProps = {
  hero: Hero
  heroOptions: Hero[]
  selectedHeroId: string
  appliedHeroId: string
  onHeroChange: (heroId: string) => void
  onHeroApply: () => void
}

export function HeroHeader({ hero, heroOptions, selectedHeroId, appliedHeroId, onHeroChange, onHeroApply }: HeroHeaderProps) {
  return (
    <>
      <header className="heroBanner card">
        <div className="heroCopy">
          <p className="eyebrow">Watcher of Realms</p>
          <h1>모바일 DPS 시뮬레이터</h1>
          <p className="muted">정교한 전투 재현보다, 어떤 스탯과 세트가 더 좋은지 빠르게 판단하는 데 초점을 둔 버전입니다.</p>
          <nav className="appLinks">
            <a className="appLink active" href="./">DPS 시뮬레이터</a>
            <a className="appLink" href="./summon/">소환 확률 계산기</a>
          </nav>
        </div>
        <HeroPicker
          selectedHeroId={selectedHeroId}
          appliedHeroId={appliedHeroId}
          heroes={heroOptions}
          onChange={onHeroChange}
          onApply={onHeroApply}
        />
      </header>
    </>
  )
}
