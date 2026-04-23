import { useMemo, useState } from 'react'
import { heroes } from './data/heroes'
import { defenseScenarios } from './data/defenseScenarios'
import { leftSets, rightSets } from './data/gearSets'
import { calculateBuild, findSetById, type BuildInput } from './lib/calc'
import { getBestStatRecommendation } from './lib/recommend'

const defaultBuild: BuildInput = {
  flatAtk: 5000,
  atkPct: 0,
  critRate: 100,
  critDmg: 250,
  attackSpeed: 120,
  awakeningOn: true,
  leftSetId: 'warlord',
  rightSetId: 'infernal_roar',
  setUptime: 0.7
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

function SetSelector({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { id: string; name: string }[]
  onChange: (v: string) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function BuildPanel({
  title,
  build,
  setBuild,
}: {
  title: string
  build: BuildInput
  setBuild: (next: BuildInput) => void
}) {
  const selectedRight = rightSets.find((set) => set.id === build.rightSetId)

  return (
    <section className="card">
      <h3>{title}</h3>
      <div className="grid">
        <NumberInput label="추가 공격력" value={build.flatAtk} onChange={(v) => setBuild({ ...build, flatAtk: v })} />
        <NumberInput label="공격력%" value={build.atkPct} onChange={(v) => setBuild({ ...build, atkPct: v })} />
        <NumberInput label="치명타 확률" value={build.critRate} onChange={(v) => setBuild({ ...build, critRate: v })} />
        <NumberInput label="치명타 피해" value={build.critDmg} onChange={(v) => setBuild({ ...build, critDmg: v })} />
        <NumberInput label="공격 속도" value={build.attackSpeed} onChange={(v) => setBuild({ ...build, attackSpeed: v })} />
        <label className="field checkboxField">
          <span>각성 반영</span>
          <input
            type="checkbox"
            checked={build.awakeningOn}
            onChange={(e) => setBuild({ ...build, awakeningOn: e.target.checked })}
          />
        </label>
        <SetSelector label="좌측 2세트" value={build.leftSetId} options={leftSets} onChange={(v) => setBuild({ ...build, leftSetId: v })} />
        <SetSelector label="우측 3세트" value={build.rightSetId} options={rightSets} onChange={(v) => setBuild({ ...build, rightSetId: v })} />
        <NumberInput label="조건부 세트 유지율(0~1)" value={build.setUptime} onChange={(v) => setBuild({ ...build, setUptime: v })} />
      </div>
      <div className="muted">
        <strong>세트 설명:</strong> {selectedRight?.notes ?? '선택된 세트 설명 없음'}
      </div>
    </section>
  )
}

export default function App() {
  const [heroId, setHeroId] = useState(heroes[0].id)
  const [buildA, setBuildA] = useState<BuildInput>(defaultBuild)
  const [buildB, setBuildB] = useState<BuildInput>({ ...defaultBuild, critDmg: 300, attackSpeed: 80, rightSetId: 'cataclysm' })

  const hero = heroes.find((item) => item.id === heroId) ?? heroes[0]

  const leftA = findSetById(buildA.leftSetId, leftSets)
  const rightA = findSetById(buildA.rightSetId, rightSets)
  const leftB = findSetById(buildB.leftSetId, leftSets)
  const rightB = findSetById(buildB.rightSetId, rightSets)

  const resultA = useMemo(() => calculateBuild(hero, leftA, rightA, buildA, defenseScenarios.map((s) => ({ label: s.label, defense: s.defense }))), [hero, leftA, rightA, buildA])
  const resultB = useMemo(() => calculateBuild(hero, leftB, rightB, buildB, defenseScenarios.map((s) => ({ label: s.label, defense: s.defense }))), [hero, leftB, rightB, buildB])

  const recA = useMemo(() => getBestStatRecommendation(hero, leftA, rightA, buildA, defenseScenarios.map((s) => ({ label: s.label, defense: s.defense }))), [hero, leftA, rightA, buildA])
  const recB = useMemo(() => getBestStatRecommendation(hero, leftB, rightB, buildB, defenseScenarios.map((s) => ({ label: s.label, defense: s.defense }))), [hero, leftB, rightB, buildB])

  return (
    <div className="app">
      <header className="heroBanner card">
        <div>
          <p className="eyebrow">Watcher of Realms</p>
          <h1>모바일 DPS 시뮬레이터</h1>
          <p className="muted">엑셀 검증본을 웹앱으로 옮긴 초기 Git 업로드용 버전입니다.</p>
        </div>
        <label className="field heroSelect">
          <span>영웅 선택</span>
          <select value={heroId} onChange={(e) => setHeroId(e.target.value)}>
            {heroes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="card summaryCard">
        <h2>{hero.name}</h2>
        <p className="muted">{hero.description}</p>
        <div className="summaryGrid">
          <div><span>기본 공격력</span><strong>{hero.baseAtk.toLocaleString()}</strong></div>
          <div><span>기본 공격 간격</span><strong>{hero.baseInterval.toFixed(1)}초</strong></div>
          <div><span>각성 공격력 보너스</span><strong>+{hero.awakeningAtkBonus}</strong></div>
        </div>
      </section>

      <main className="columns">
        <BuildPanel title="세팅 A" build={buildA} setBuild={setBuildA} />
        <BuildPanel title="세팅 B" build={buildB} setBuild={setBuildB} />
      </main>

      <section className="resultsGrid">
        {[{ title: '세팅 A', result: resultA, rec: recA }, { title: '세팅 B', result: resultB, rec: recB }].map(({ title, result, rec }) => (
          <article className="card" key={title}>
            <div className="rowSpace">
              <h3>{title}</h3>
              <strong className="bigNumber">{result.avgDps.toLocaleString()}</strong>
            </div>
            <p className="muted">평균 기대 DPS</p>
            {result.critAlert && <p className="alert">치명타 확률이 100% 미만입니다. 치확 100 우선 권장.</p>}
            <div className="statList">
              <div><span>최종 공격력</span><strong>{result.finalAtk.toLocaleString()}</strong></div>
              <div><span>최종 치피</span><strong>{result.finalCritDmg}%</strong></div>
              <div><span>총 공속</span><strong>{result.totalAspd}</strong></div>
              <div><span>현재 공격 간격</span><strong>{result.interval.toFixed(2)}초</strong></div>
              <div><span>다음 공속 구간</span><strong>{result.nextThreshold ?? '-'}</strong></div>
              <div><span>추가 필요 공속</span><strong>{result.neededAspd ?? '-'}</strong></div>
            </div>
            <div className="scenarioBox">
              {result.scenarioDps.map((item) => (
                <div key={item.label}>
                  <span>{item.label} ({item.defense})</span>
                  <strong>{item.dps.toLocaleString()}</strong>
                </div>
              ))}
            </div>
            <div className="recommendBox">
              <strong>추천 스탯: {rec.title}</strong>
              <p>{rec.reason}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="card footerNote">
        <h3>현재 버전 메모</h3>
        <ul>
          <li>공속 breakpoint와 영웅 스탯은 시드 데이터입니다. 실제 커뮤니티 검증값으로 JSON을 교체하면 바로 반영됩니다.</li>
          <li>조건부 세트는 유지율(0~1)로 평균 DPS에 반영합니다.</li>
          <li>초기 배포용 구조이므로 데이터 파일과 계산 로직이 분리되어 있습니다.</li>
        </ul>
      </section>
    </div>
  )
}
