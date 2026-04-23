import type { DamageResult } from '../lib/calc'

type ComparisonSummaryProps = {
  resultA: DamageResult
  resultB: DamageResult
}

export function ComparisonSummary({ resultA, resultB }: ComparisonSummaryProps) {
  const diff = resultA.itemMaxCumulative30s - resultB.itemMaxCumulative30s
  const winner = diff === 0 ? '동률' : diff > 0 ? '세팅 A 우세' : '세팅 B 우세'
  const percentGap = Math.abs(diff) / Math.max(Math.min(resultA.itemMaxCumulative30s, resultB.itemMaxCumulative30s), 1)

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
        <div><span>A 아이템 최대 30초 누적</span><strong>{resultA.itemMaxCumulative30s.toLocaleString()}</strong></div>
        <div><span>B 아이템 최대 30초 누적</span><strong>{resultB.itemMaxCumulative30s.toLocaleString()}</strong></div>
      </div>
    </section>
  )
}
