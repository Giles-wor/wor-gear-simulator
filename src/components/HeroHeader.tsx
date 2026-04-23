import type { Hero } from '../data/heroes'

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
        <label className="field heroSelect">
          <span>영웅 선택</span>
          <select value={heroId} onChange={(event) => onHeroChange(event.target.value)}>
            {heroOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="card summaryCard">
        <div className="sectionHeading">
          <div>
            <h2>{hero.name}</h2>
            <p className="muted">{hero.description}</p>
          </div>
        </div>
        <div className="summaryGrid">
          <div><span>기본 공격력</span><strong>{hero.baseAtk.toLocaleString()}</strong></div>
          <div><span>기본 공격 간격</span><strong>{hero.baseInterval.toFixed(1)}초</strong></div>
          <div><span>각성 공격력 보너스</span><strong>+{hero.awakeningAtkBonus}</strong></div>
        </div>
      </section>
    </>
  )
}
