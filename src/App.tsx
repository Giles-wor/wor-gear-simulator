import { useMemo, useState } from 'react'
import { heroes } from './data/heroes'
import { leftSets, rightSets } from './data/gearSets'
import { calculateBuild, findSetById, type BuildInput } from './lib/calc'
import { getBestStatRecommendation } from './lib/recommend'
import { HeroHeader } from './components/HeroHeader'
import { BuildForm } from './components/BuildForm'
import { BuildResultCard } from './components/BuildResultCard'
import { ComparisonSummary } from './components/ComparisonSummary'
import { QuickCompareTable } from './components/QuickCompareTable'

const defaultBuild: BuildInput = {
  totalAtk: 12000,
  critRate: 100,
  critDmg: 250,
  attackSpeed: 120,
  awakeningOn: true,
  pantheonAspdOn: true,
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

  const resultA = useMemo(() => calculateBuild(hero, leftA, rightA, buildA), [hero, leftA, rightA, buildA])
  const resultB = useMemo(() => calculateBuild(hero, leftB, rightB, buildB), [hero, leftB, rightB, buildB])

  const recA = useMemo(() => getBestStatRecommendation(hero, leftA, rightA, buildA), [hero, leftA, rightA, buildA])
  const recB = useMemo(() => getBestStatRecommendation(hero, leftB, rightB, buildB), [hero, leftB, rightB, buildB])

  return (
    <div className="app">
      <HeroHeader hero={hero} heroOptions={heroes} heroId={heroId} onHeroChange={setHeroId} />

      <ComparisonSummary resultA={resultA} resultB={resultB} />
      <QuickCompareTable resultA={resultA} resultB={resultB} />

      <main className="columns">
        <BuildForm title="세팅 A" build={buildA} onChange={setBuildA} />
        <BuildForm title="세팅 B" build={buildB} onChange={setBuildB} />
      </main>

      <section className="resultsGrid">
        <BuildResultCard title="세팅 A 결과" result={resultA} compareAgainst={resultB} recommendation={recA} />
        <BuildResultCard title="세팅 B 결과" result={resultB} compareAgainst={resultA} recommendation={recB} />
      </section>

      <section className="card footerNote">
        <h3>현재 버전 메모</h3>
        <ul>
          <li>공속 breakpoint는 기본 공격 간격 그룹 기준으로 관리하며, 총 공속은 기본 100 포함 기준으로 계산합니다.</li>
          <li>입력 총 공속과 판테온 공속을 합쳐 최종 공속을 만들고, 공격 간격은 최종 공속 기준으로 판정합니다.</li>
          <li>입력 총 스탯에는 장비/아티팩트/세트의 상시 수치가 이미 포함된 것으로 보고, 조건부 효과만 별도 반영합니다.</li>
          <li>DPS 표기는 방어무시 기준 10초 누적값인 DPS(10s)로 통일하고, 최종 1회 피해와 분리해서 보여줍니다.</li>
          <li>우측 3세트 조건부 효과는 사용자 입력 없이 결과 카드에서 발동 구조를 설명합니다.</li>
          <li>데이터와 계산 로직은 분리되어 있어 GitHub Pages 같은 정적 배포에 그대로 맞출 수 있습니다.</li>
        </ul>
      </section>
    </div>
  )
}
