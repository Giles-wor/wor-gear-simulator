import type { DamageResult } from '../lib/calc'

type ComparisonSummaryProps = {
  resultA: DamageResult
  resultB: DamageResult
}

export function ComparisonSummary({ resultA, resultB }: ComparisonSummaryProps) {
  const diff = resultA.avgDps - resultB.avgDps
  const winner = diff === 0 ? '동률' : diff > 0 ? '세팅 A 우세' : '세팅 B 우세'
  const percentGap = Math.abs(diff) / Math.max(Math.min(resultA.avgDps, resultB.avgDps), 1)

  return (
    <section className="card comparisonCard">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">빠른 비교</p>
          <h2>{winner}</h2>
        </div>
        <strong className={`deltaBadge ${diff >= 0 ? 'positive' : 'negative'}`}>
          {diff >= 0 ? '+' : '-'}{Math.abs(diff).toLocaleString()}
        </strong>
      </div>

      <div className="summaryGrid comparisonGrid">
        <div><span>격차 비율</span><strong>{(percentGap * 100).toFixed(1)}%</strong></div>
        <div><span>A 평균 DPS</span><strong>{resultA.avgDps.toLocaleString()}</strong></div>
        <div><span>B 평균 DPS</span><strong>{resultB.avgDps.toLocaleString()}</strong></div>
      </div>
    </section>
  )
}
