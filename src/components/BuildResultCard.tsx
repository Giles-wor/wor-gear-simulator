import type { DamageResult } from '../lib/calc'

type Recommendation = {
  title: string
  reason: string
}

type BuildResultCardProps = {
  title: string
  result: DamageResult
  recommendation: Recommendation
  compareAgainst: DamageResult
}

function compareClass(current: number, other: number) {
  if (current > other) return 'better'
  if (current < other) return 'worse'
  return 'same'
}

export function BuildResultCard({ title, result, recommendation, compareAgainst }: BuildResultCardProps) {
  return (
    <article className="card resultCard">
      <div className="rowSpace">
        <div>
          <h3>{title}</h3>
          <p className="muted">평균 기대 DPS</p>
        </div>
        <strong className="bigNumber">{result.avgDps.toLocaleString()}</strong>
      </div>

      {result.critAlert ? <p className="alert">치명타 확률이 100% 미만입니다. 치확 100을 먼저 맞추는 편이 좋습니다.</p> : null}

      <div className="statList">
        <div><span>최종 공격력</span><strong className={compareClass(result.finalAtk, compareAgainst.finalAtk)}>{result.finalAtk.toLocaleString()}</strong></div>
        <div><span>최종 치피</span><strong className={compareClass(result.finalCritDmg, compareAgainst.finalCritDmg)}>{result.finalCritDmg}%</strong></div>
        <div><span>총 공속</span><strong className={compareClass(result.totalAspd, compareAgainst.totalAspd)}>{result.totalAspd}</strong></div>
        <div><span>판테온 공속</span><strong>{result.pantheonAspdBonus}</strong></div>
        <div><span>최종 공속</span><strong className={compareClass(result.finalAspd, compareAgainst.finalAspd)}>{result.finalAspd}</strong></div>
        <div><span>현재 공격 간격</span><strong className={compareClass(compareAgainst.interval, result.interval)}>{result.interval.toFixed(2)}초</strong></div>
        <div><span>다음 공속 구간</span><strong>{result.nextThreshold ?? '-'}</strong></div>
        <div><span>추가 필요 공속</span><strong>{result.neededAspd ?? '-'}</strong></div>
      </div>

      <div className="scenarioBox">
        {result.scenarioDps.map((item) => (
          <div key={item.label}>
            <span>{item.label} ({item.defense})</span>
            <strong className={compareClass(item.dps, compareAgainst.scenarioDps.find((scenario) => scenario.label === item.label)?.dps ?? item.dps)}>{item.dps.toLocaleString()}</strong>
          </div>
        ))}
      </div>

      <div className="setInfoBox">
        <strong>우측 3세트 조건부 효과: {result.rightSetSummary.name}</strong>
        <p>{result.rightSetSummary.summary}</p>
        <div className="setDetailList">
          {result.rightSetSummary.details.map((detail) => (
            <div key={detail}>{detail}</div>
          ))}
        </div>
      </div>

      <div className="recommendBox">
        <strong>추천 스탯: {recommendation.title}</strong>
        <p>{recommendation.reason}</p>
      </div>
    </article>
  )
}
