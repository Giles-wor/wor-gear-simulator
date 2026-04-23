import { useDeferredValue, useMemo, useState } from 'react'
import type { Hero } from '../data/heroes'

type HeroPickerProps = {
  selectedHeroId: string
  appliedHeroId: string
  heroes: Hero[]
  onChange: (heroId: string) => void
  onApply: () => void
}

export function HeroPicker({ selectedHeroId, appliedHeroId, heroes, onChange, onApply }: HeroPickerProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const currentHero = heroes.find((hero) => hero.id === selectedHeroId) ?? heroes[0]
  const appliedHero = heroes.find((hero) => hero.id === appliedHeroId) ?? heroes[0]

  const filteredHeroes = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()

    if (!normalizedQuery) return heroes

    return heroes.filter((hero) => {
      const haystack = [
        hero.name,
        hero.heroClass,
        hero.damageType,
        hero.rarity,
        ...hero.factions,
        ...hero.heroTags,
      ].join(' ').toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [deferredQuery, heroes])

  return (
    <div className="heroPicker">
      <label className="field">
        <span>영웅 검색</span>
        <input
          type="search"
          placeholder="이름, 클래스, 태그 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <label className="field heroSelect">
        <span>영웅 선택</span>
        <select value={selectedHeroId} onChange={(event) => onChange(event.target.value)}>
          {filteredHeroes.length > 0 ? (
            filteredHeroes.map((hero) => (
              <option key={hero.id} value={hero.id}>
                {hero.name} · {hero.heroClass}
              </option>
            ))
          ) : (
            <option value={currentHero.id}>
              검색 결과 없음 · 현재 선택 {currentHero.name}
            </option>
          )}
        </select>
      </label>

      <button type="button" className="applyButton" onClick={onApply}>
        영웅 적용
      </button>

      <p className="muted heroPickerMeta">
        검색 결과 {filteredHeroes.length}명 / 전체 {heroes.length}명
        {' · '}
        현재 적용: {appliedHero.name}
      </p>
    </div>
  )
}
