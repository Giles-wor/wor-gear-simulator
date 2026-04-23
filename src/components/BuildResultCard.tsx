import type { DamageResult } from '../lib/calc'

type Recommendation = {
  title: string
  reason: string
}

type BuildResultCardProps = {
  title: string
  result: DamageResult
  recommendation: Recommendation
}

export function BuildResultCard({ title, result, recommendation }: BuildResultCardProps) {
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
        <div><span>최종 공격력</span><strong>{result.finalAtk.toLocaleString()}</strong></div>
        <div><span>최종 치피</span><strong>{result.finalCritDmg}%</strong></div>
        <div><span>입력 공속 기준</span><strong>{result.bonusAspd - result.pantheonAspdBonus}</strong></div>
        <div><span>판테온 공속</span><strong>{result.pantheonAspdBonus}</strong></div>
        <div><span>총 추가 공속</span><strong>{result.bonusAspd}</strong></div>
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
        <strong>추천 스탯: {recommendation.title}</strong>
        <p>{recommendation.reason}</p>
      </div>
    </article>
  )
}
