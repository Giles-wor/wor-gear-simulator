import { Fragment, useMemo, useState } from 'react'
import { heroes } from '../../src/data/heroes'
import { leftSets, rightSets } from '../../src/data/gearSets'
import { artifacts } from './data/artifacts'
import { factionExclusiveEffects, heroExclusiveEffects } from './data/exclusiveEffects'
import { heroProfiles } from './data/heroProfiles'
import { simulateHeroLoadout, type SimulationConditions } from './lib/simulator'

type RankedCombination = {
  leftSetName: string
  rightSetName: string
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
          leftSetName: leftSet.name,
          rightSetName: rightSet.name,
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

        <div className="rankTable">
          <div className="tableHead">순위</div>
          <div className="tableHead">좌측 2세트</div>
          <div className="tableHead">우측 3세트</div>
          <div className="tableHead">아티팩트</div>
          <div className="tableHead">30초 누적</div>
          <div className="tableHead">일반 공격</div>
          <div className="tableHead">궁극기</div>
          <div className="tableHead">공격 간격</div>

          {topTen.map((row, index) => (
            <Fragment key={`${row.leftSetName}-${row.rightSetName}`}>
              <div className="tableCell rankIndex">#{index + 1}</div>
              <div className="tableCell">{row.leftSetName}</div>
              <div className="tableCell">{row.rightSetName}</div>
              <div className="tableCell">{row.artifactName}</div>
              <div className="tableCell strongCell">{row.score.toLocaleString()}</div>
              <div className="tableCell">{row.basicDamage.toLocaleString()}</div>
              <div className="tableCell">{row.ultimateDamage.toLocaleString()}</div>
              <div className="tableCell">{row.interval.toFixed(2)}초</div>
            </Fragment>
          ))}
        </div>
      </section>

      <section className="notesPanel">
        <h3>v1 실험 범위</h3>
        <ul>
          <li>hero profile, 아티팩트, 진영/영웅 전용 장비, 조건 토글, 30초 시뮬레이션 창을 붙였습니다.</li>
          <li>현재 데이터는 대표 영웅 중심의 실험용 스키마이며, 이후 크롤러 확장으로 더 자동화할 수 있습니다.</li>
          <li>이 폴더는 로컬 실험용이므로 v0 GitHub Pages 배포를 건드리지 않습니다.</li>
        </ul>
      </section>
    </div>
  )
}
