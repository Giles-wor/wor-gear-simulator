import { Fragment, useEffect, useMemo, useState } from 'react'
import { heroes } from '../../src/data/heroes'
import { leftSets, rightSets } from '../../src/data/gearSets'
import { calculateBuild, findSetById, type BuildInput } from '../../src/lib/calc'
import { getBestStatRecommendation } from '../../src/lib/recommend'
import { ComparisonSummary } from '../../src/components/ComparisonSummary'
import { QuickCompareTable } from '../../src/components/QuickCompareTable'
import { DamageTimelineChart } from '../../src/components/DamageTimelineChart'
import { BuildResultCard } from '../../src/components/BuildResultCard'
import { artifacts } from './data/artifacts'
import { factionExclusiveEffects, heroExclusiveEffects } from './data/exclusiveEffects'
import { heroProfiles } from './data/heroProfiles'
import { simulateHeroLoadout, type SimulationConditions } from './lib/simulator'

type RankedCombination = {
  key: string
  leftSetId: string
  leftSetName: string
  rightSetId: string
  rightSetName: string
  artifactId: string
  artifactName: string
  score: number
  interval: number
  basicDamage: number
  ultimateDamage: number
}

type V1BuildInput = {
  totalAtk: number
  critRate: number
  critDmg: number
  attackSpeed: number
  awakeningOn: boolean
  pantheonAspdOn: boolean
}

type AppPage = 'optimizer' | 'compare'

const defaultBuild: V1BuildInput = {
  totalAtk: 12000,
  critRate: 100,
  critDmg: 300,
  attackSpeed: 515,
  awakeningOn: true,
  pantheonAspdOn: true,
}

function buildRankings(heroId: string, build: V1BuildInput, conditions: SimulationConditions, useFactionExclusive: boolean, useHeroExclusive: boolean) {
  const hero = heroes.find((item) => item.id === heroId) ?? heroes[0]
  const ranked: RankedCombination[] = []
  const factionExclusive = hero.factions.map((faction) => factionExclusiveEffects[faction.toLowerCase().replace(/[^a-z0-9]+/g, '_')]).find(Boolean)
  const heroExclusive = heroExclusiveEffects[hero.id]

  for (const leftSet of leftSets) {
    for (const rightSet of rightSets) {
      for (const artifact of artifacts) {
        const result = simulateHeroLoadout({
          hero,
          leftSet,
          rightSet,
          artifact,
          factionExclusive: useFactionExclusive ? factionExclusive : undefined,
          heroExclusive: useHeroExclusive ? heroExclusive : undefined,
          totalAtk: build.totalAtk,
          critRate: build.critRate,
          critDmg: build.critDmg,
          totalAspd: build.attackSpeed,
          awakeningOn: build.awakeningOn,
          pantheonOn: build.pantheonAspdOn,
          conditions,
        })

        ranked.push({
          key: `${leftSet.id}__${rightSet.id}__${artifact.id}`,
          leftSetId: leftSet.id,
          leftSetName: leftSet.name,
          rightSetId: rightSet.id,
          rightSetName: rightSet.name,
          artifactId: artifact.id,
          artifactName: artifact.name,
          score: result.cumulative30s,
          interval: result.interval,
          basicDamage: result.basicHit,
          ultimateDamage: result.ultimateHit,
        })
      }
    }
  }

  return ranked.sort((a, b) => b.score - a.score)
}

export default function App() {
  const [page, setPage] = useState<AppPage>('optimizer')
  const [heroId, setHeroId] = useState('lady_alexandra')
  const [build, setBuild] = useState<V1BuildInput>(defaultBuild)
  const [useFactionExclusive, setUseFactionExclusive] = useState(true)
  const [useHeroExclusive, setUseHeroExclusive] = useState(true)
  const [conditions, setConditions] = useState<SimulationConditions>({
    antiAir: true,
    burningTarget: false,
    ccedTarget: false,
    markedTarget: true,
    targetBelowHalfHp: false,
    hpAbove80: true,
    ultimateFromStart: true,
  })
  const [selectedKeyA, setSelectedKeyA] = useState<string | null>(null)
  const [selectedKeyB, setSelectedKeyB] = useState<string | null>(null)
  const hero = heroes.find((item) => item.id === heroId) ?? heroes[0]
  const profile = heroProfiles[hero.id]
  const factionExclusive = hero.factions.map((faction) => factionExclusiveEffects[faction.toLowerCase().replace(/[^a-z0-9]+/g, '_')]).find(Boolean)
  const heroExclusive = heroExclusiveEffects[hero.id]

  const rankings = useMemo(
    () => buildRankings(hero.id, build, conditions, useFactionExclusive, useHeroExclusive),
    [hero.id, build, conditions, useFactionExclusive, useHeroExclusive],
  )
  const best = rankings[0]
  const topTen = rankings.slice(0, 10)
  const selectedA = rankings.find((row) => row.key === selectedKeyA) ?? topTen[0] ?? best
  const selectedB = rankings.find((row) => row.key === selectedKeyB) ?? topTen[1] ?? topTen[0] ?? best

  useEffect(() => {
    if (!topTen.length) return
    if (!selectedKeyA || !rankings.some((row) => row.key === selectedKeyA)) {
      setSelectedKeyA(topTen[0]?.key ?? null)
    }
    if (!selectedKeyB || !rankings.some((row) => row.key === selectedKeyB)) {
      setSelectedKeyB((topTen[1] ?? topTen[0])?.key ?? null)
    }
  }, [rankings, selectedKeyA, selectedKeyB, topTen])

  const compareBuildA: BuildInput = {
    totalAtk: build.totalAtk,
    critRate: build.critRate,
    critDmg: build.critDmg,
    attackSpeed: build.attackSpeed,
    awakeningOn: build.awakeningOn,
    pantheonAspdOn: build.pantheonAspdOn,
    leftSetId: selectedA?.leftSetId ?? leftSets[0].id,
    rightSetId: selectedA?.rightSetId ?? rightSets[0].id,
    setUptime: 1,
  }

  const compareBuildB: BuildInput = {
    totalAtk: build.totalAtk,
    critRate: build.critRate,
    critDmg: build.critDmg,
    attackSpeed: build.attackSpeed,
    awakeningOn: build.awakeningOn,
    pantheonAspdOn: build.pantheonAspdOn,
    leftSetId: selectedB?.leftSetId ?? leftSets[0].id,
    rightSetId: selectedB?.rightSetId ?? rightSets[0].id,
    setUptime: 1,
  }

  const compareLeftA = findSetById(compareBuildA.leftSetId, leftSets)
  const compareRightA = findSetById(compareBuildA.rightSetId, rightSets)
  const compareLeftB = findSetById(compareBuildB.leftSetId, leftSets)
  const compareRightB = findSetById(compareBuildB.rightSetId, rightSets)
  const compareResultA = calculateBuild(hero, compareLeftA, compareRightA, compareBuildA)
  const compareResultB = calculateBuild(hero, compareLeftB, compareRightB, compareBuildB)
  const compareRecA = getBestStatRecommendation(hero, compareLeftA, compareRightA, compareBuildA)
  const compareRecB = getBestStatRecommendation(hero, compareLeftB, compareRightB, compareBuildB)

  return (
    <div className="appShell">
      <header className="heroPanel">
        <div>
          <p className="eyebrow">v1 LAB</p>
          <h1>영웅별 최적 장비 탐색기</h1>
          <p className="subtle">
            현재 WoR 데이터와 v0 계산 로직을 재사용하는 별도 실험실입니다. GitHub Pages 배포 중인 v0와 분리되어 로컬 테스트 전용으로 사용합니다.
          </p>
        </div>

        <div className="pageTabs">
          <button type="button" className={page === 'optimizer' ? 'tabButton active' : 'tabButton'} onClick={() => setPage('optimizer')}>
            v1 최적화
          </button>
          <button type="button" className={page === 'compare' ? 'tabButton active' : 'tabButton'} onClick={() => setPage('compare')}>
            v0 비교
          </button>
        </div>

        <div className="heroMetaGrid">
          <label className="field">
            <span>영웅 선택</span>
            <select value={heroId} onChange={(event) => setHeroId(event.target.value)}>
              {heroes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="pill">기본 간격 {hero.baseInterval.toFixed(1)}초</div>
          <div className="pill">각성 +{hero.awakeningAtkBonus}</div>
          <div className="pill">{hero.heroClass} · {hero.damageType}</div>
        </div>
      </header>

      {page === 'optimizer' ? (
        <>
          <section className="inputPanel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">입력값</p>
                <h2>영웅 총 스탯 기준</h2>
              </div>
            </div>

            <div className="inputGrid">
              <label className="field">
                <span>총 공격력</span>
                <input type="number" value={build.totalAtk} onChange={(event) => setBuild({ ...build, totalAtk: Number(event.target.value) })} />
              </label>
              <label className="field">
                <span>총 치확</span>
                <input type="number" value={build.critRate} onChange={(event) => setBuild({ ...build, critRate: Number(event.target.value) })} />
              </label>
              <label className="field">
                <span>총 치피</span>
                <input type="number" value={build.critDmg} onChange={(event) => setBuild({ ...build, critDmg: Number(event.target.value) })} />
              </label>
              <label className="field">
                <span>총 공속</span>
                <input type="number" value={build.attackSpeed} onChange={(event) => setBuild({ ...build, attackSpeed: Number(event.target.value) })} />
              </label>
              <label className="checkField">
                <input type="checkbox" checked={build.awakeningOn} onChange={(event) => setBuild({ ...build, awakeningOn: event.target.checked })} />
                <span>각성 적용</span>
              </label>
              <label className="checkField">
                <input type="checkbox" checked={build.pantheonAspdOn} onChange={(event) => setBuild({ ...build, pantheonAspdOn: event.target.checked })} />
                <span>판테온 공속 +40</span>
              </label>
            </div>
          </section>

          <section className="inputPanel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">시뮬레이션 조건</p>
                <h2>영웅별 조건 토글</h2>
              </div>
            </div>

            <div className="inputGrid conditionGrid">
              <label className="checkField"><input type="checkbox" checked={conditions.ultimateFromStart} onChange={(event) => setConditions({ ...conditions, ultimateFromStart: event.target.checked })} /><span>시작 즉시 궁극기</span></label>
              <label className="checkField"><input type="checkbox" checked={conditions.markedTarget} onChange={(event) => setConditions({ ...conditions, markedTarget: event.target.checked })} /><span>마크 대상</span></label>
              <label className="checkField"><input type="checkbox" checked={conditions.antiAir} onChange={(event) => setConditions({ ...conditions, antiAir: event.target.checked })} /><span>공중 대상</span></label>
              <label className="checkField"><input type="checkbox" checked={conditions.burningTarget} onChange={(event) => setConditions({ ...conditions, burningTarget: event.target.checked })} /><span>Burning 대상</span></label>
              <label className="checkField"><input type="checkbox" checked={conditions.ccedTarget} onChange={(event) => setConditions({ ...conditions, ccedTarget: event.target.checked })} /><span>CC 대상</span></label>
              <label className="checkField"><input type="checkbox" checked={conditions.targetBelowHalfHp} onChange={(event) => setConditions({ ...conditions, targetBelowHalfHp: event.target.checked })} /><span>적 HP 50% 이하</span></label>
              <label className="checkField"><input type="checkbox" checked={conditions.hpAbove80} onChange={(event) => setConditions({ ...conditions, hpAbove80: event.target.checked })} /><span>내 HP 80% 이상</span></label>
              <label className="checkField"><input type="checkbox" checked={useFactionExclusive} onChange={(event) => setUseFactionExclusive(event.target.checked)} /><span>진영 전용 장비 적용</span></label>
              <label className="checkField"><input type="checkbox" checked={useHeroExclusive} onChange={(event) => setUseHeroExclusive(event.target.checked)} /><span>영웅 전용 장비 적용</span></label>
            </div>
          </section>

          <section className="summaryStrip">
            <div className="summaryCard">
              <span>최적 조합</span>
              <strong>{best.leftSetName} + {best.rightSetName}</strong>
            </div>
            <div className="summaryCard">
              <span>최대 30초 누적</span>
              <strong>{best.score.toLocaleString()}</strong>
            </div>
            <div className="summaryCard">
              <span>일반 공격 최대</span>
              <strong>{best.basicDamage.toLocaleString()}</strong>
            </div>
            <div className="summaryCard">
              <span>궁극기 최대</span>
              <strong>{best.ultimateDamage.toLocaleString()}</strong>
            </div>
            <div className="summaryCard">
              <span>추천 아티팩트</span>
              <strong>{best.artifactName}</strong>
            </div>
          </section>

          <section className="notesPanel">
            <h3>현재 영웅 프로필 / 전용 효과</h3>
            <ul>
              {(profile?.notes ?? ['공통 프로필']).map((note) => <li key={note}>{note}</li>)}
              {useFactionExclusive && factionExclusive ? <li>{factionExclusive.sourceName}: {factionExclusive.summary}</li> : null}
              {useHeroExclusive && heroExclusive ? <li>{heroExclusive.sourceName}: {heroExclusive.summary}</li> : null}
            </ul>
          </section>

          <section className="rankPanel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">랭킹</p>
                <h2>현재 데이터 기준 상위 10개 세트 조합</h2>
              </div>
            </div>

            <div className="rankTable rankTableExtended">
              <div className="tableHead">순위</div>
              <div className="tableHead">좌측 2세트</div>
              <div className="tableHead">우측 3세트</div>
              <div className="tableHead">아티팩트</div>
              <div className="tableHead">30초 누적</div>
              <div className="tableHead">일반 공격</div>
              <div className="tableHead">궁극기</div>
              <div className="tableHead">공격 간격</div>
              <div className="tableHead">비교 A</div>
              <div className="tableHead">비교 B</div>

              {topTen.map((row, index) => (
                <Fragment key={row.key}>
                  <div className="tableCell rankIndex">#{index + 1}</div>
                  <div className="tableCell">{row.leftSetName}</div>
                  <div className="tableCell">{row.rightSetName}</div>
                  <div className="tableCell">{row.artifactName}</div>
                  <div className="tableCell strongCell">{row.score.toLocaleString()}</div>
                  <div className="tableCell">{row.basicDamage.toLocaleString()}</div>
                  <div className="tableCell">{row.ultimateDamage.toLocaleString()}</div>
                  <div className="tableCell">{row.interval.toFixed(2)}초</div>
                  <div className="tableCell">
                    <button type="button" className={selectedA?.key === row.key ? 'pickButton activePick' : 'pickButton'} onClick={() => setSelectedKeyA(row.key)}>
                      A 선택
                    </button>
                  </div>
                  <div className="tableCell">
                    <button type="button" className={selectedB?.key === row.key ? 'pickButton activePick' : 'pickButton'} onClick={() => setSelectedKeyB(row.key)}>
                      B 선택
                    </button>
                  </div>
                </Fragment>
              ))}
            </div>
          </section>

          <section className="notesPanel">
            <h3>v1 실험 범위</h3>
            <ul>
              <li>hero profile, 아티팩트, 진영/영웅 전용 장비, 조건 토글, 30초 시뮬레이션 창을 붙였습니다.</li>
              <li>현재 데이터는 모든 영웅 선택 기준으로 세트 랭킹과 비교 후보 선택이 가능합니다.</li>
              <li>랭킹에서 고른 A/B 후보는 상단 탭의 `v0 비교` 페이지에서 바로 상세 비교할 수 있습니다.</li>
            </ul>
          </section>
        </>
      ) : (
        <>
          <section className="summaryStrip comparisonCandidates">
            <div className="summaryCard">
              <span>세팅 A 후보</span>
              <strong>{selectedA?.leftSetName} + {selectedA?.rightSetName}</strong>
              <small>{selectedA?.artifactName}</small>
            </div>
            <div className="summaryCard">
              <span>세팅 B 후보</span>
              <strong>{selectedB?.leftSetName} + {selectedB?.rightSetName}</strong>
              <small>{selectedB?.artifactName}</small>
            </div>
          </section>

          <ComparisonSummary resultA={compareResultA} resultB={compareResultB} />
          <QuickCompareTable resultA={compareResultA} resultB={compareResultB} />
          <DamageTimelineChart resultA={compareResultA} resultB={compareResultB} />

          <section className="compareCards">
            <BuildResultCard title="세팅 A 결과" result={compareResultA} compareAgainst={compareResultB} recommendation={compareRecA} />
            <BuildResultCard title="세팅 B 결과" result={compareResultB} compareAgainst={compareResultA} recommendation={compareRecB} />
          </section>

          <section className="notesPanel">
            <h3>v0 비교 페이지 안내</h3>
            <ul>
              <li>이 페이지는 랭킹에서 고른 좌측 2세트 / 우측 3세트 조합을 v0 공통 계산 로직으로 다시 비교합니다.</li>
              <li>아티팩트와 영웅/진영 전용 장비는 비교 후보 설명으로만 유지되고, 상세 비교 수치는 v0 기준 세트 비교에 초점을 둡니다.</li>
              <li>다시 후보를 바꾸려면 `v1 최적화` 탭으로 돌아가 A/B를 다시 선택하면 됩니다.</li>
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
