import { useMemo, useState } from 'react'
import { heroes } from './data/heroes'
import { defenseScenarios } from './data/defenseScenarios'
import { leftSets, rightSets } from './data/gearSets'
import { calculateBuild, findSetById, type BuildInput } from './lib/calc'
import { getBestStatRecommendation } from './lib/recommend'
import { HeroHeader } from './components/HeroHeader'
import { BuildForm } from './components/BuildForm'
import { BuildResultCard } from './components/BuildResultCard'
import { ComparisonSummary } from './components/ComparisonSummary'

const defaultBuild: BuildInput = {
  flatAtk: 5000,
  atkPct: 0,
  critRate: 100,
  critDmg: 250,
  attackSpeed: 120,
  awakeningOn: true,
  leftSetId: 'warlord',
  rightSetId: 'infernal_roar',
  setUptime: 1
}

export default function App() {
  const [heroId, setHeroId] = useState(heroes[0].id)
  const [buildA, setBuildA] = useState<BuildInput>(defaultBuild)
  const [buildB, setBuildB] = useState<BuildInput>({ ...defaultBuild, critDmg: 300, attackSpeed: 80, rightSetId: 'cataclysm', setUptime: 0.75 })

  const hero = heroes.find((item) => item.id === heroId) ?? heroes[0]

  const leftA = useMemo(() => findSetById(buildA.leftSetId, leftSets), [buildA.leftSetId])
  const rightA = useMemo(() => findSetById(buildA.rightSetId, rightSets), [buildA.rightSetId])
  const leftB = useMemo(() => findSetById(buildB.leftSetId, leftSets), [buildB.leftSetId])
  const rightB = useMemo(() => findSetById(buildB.rightSetId, rightSets), [buildB.rightSetId])

  const resultA = useMemo(() => calculateBuild(hero, leftA, rightA, buildA, defenseScenarios.map((s) => ({ label: s.label, defense: s.defense }))), [hero, leftA, rightA, buildA])
  const resultB = useMemo(() => calculateBuild(hero, leftB, rightB, buildB, defenseScenarios.map((s) => ({ label: s.label, defense: s.defense }))), [hero, leftB, rightB, buildB])

  const recA = useMemo(() => getBestStatRecommendation(hero, leftA, rightA, buildA, defenseScenarios.map((s) => ({ label: s.label, defense: s.defense }))), [hero, leftA, rightA, buildA])
  const recB = useMemo(() => getBestStatRecommendation(hero, leftB, rightB, buildB, defenseScenarios.map((s) => ({ label: s.label, defense: s.defense }))), [hero, leftB, rightB, buildB])

  return (
    <div className="app">
      <HeroHeader hero={hero} heroOptions={heroes} heroId={heroId} onHeroChange={setHeroId} />

      <ComparisonSummary resultA={resultA} resultB={resultB} />

      <main className="columns">
        <BuildForm title="세팅 A" build={buildA} onChange={setBuildA} />
        <BuildForm title="세팅 B" build={buildB} onChange={setBuildB} />
      </main>

      <section className="resultsGrid">
        <BuildResultCard title="세팅 A 결과" result={resultA} recommendation={recA} />
        <BuildResultCard title="세팅 B 결과" result={resultB} recommendation={recB} />
      </section>

      <section className="card footerNote">
        <h3>현재 버전 메모</h3>
        <ul>
          <li>공속 breakpoint와 영웅 스탯은 시드 데이터입니다. 실제 커뮤니티 검증값으로 교체하면 바로 반영됩니다.</li>
          <li>조건부 세트는 유지율(0~1)로 평균 DPS에 반영합니다.</li>
          <li>데이터와 계산 로직은 분리되어 있어 GitHub Pages 같은 정적 배포에 그대로 맞출 수 있습니다.</li>
        </ul>
      </section>
    </div>
  )
}
