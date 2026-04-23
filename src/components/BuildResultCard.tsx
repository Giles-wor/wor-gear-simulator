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
          <p className="muted">아이템 최대 적용 10초 누적 기준</p>
        </div>
        <strong className="bigNumber">{result.itemMaxCumulative10s.toLocaleString()}</strong>
      </div>

      {result.critAlert ? <p className="alert">치명타 확률이 100% 미만입니다. 치확 100을 먼저 맞추는 편이 좋습니다.</p> : null}

      <div className="statList">
        <div><span>스탯 기반 데미지 (방어 무시)</span><strong className={compareClass(result.statDamageIgnoreDefense, compareAgainst.statDamageIgnoreDefense)}>{result.statDamageIgnoreDefense.toLocaleString()}</strong></div>
        <div><span>아이템 적용 최대 데미지 (방어 무시)</span><strong className={compareClass(result.itemMaxDamageIgnoreDefense, compareAgainst.itemMaxDamageIgnoreDefense)}>{result.itemMaxDamageIgnoreDefense.toLocaleString()}</strong></div>
        <div><span>스탯 기반 데미지 (중 방어)</span><strong className={compareClass(result.statDamageMidDefense, compareAgainst.statDamageMidDefense)}>{result.statDamageMidDefense.toLocaleString()}</strong></div>
        <div><span>아이템 적용 최대 데미지 (중 방어)</span><strong className={compareClass(result.itemMaxDamageMidDefense, compareAgainst.itemMaxDamageMidDefense)}>{result.itemMaxDamageMidDefense.toLocaleString()}</strong></div>
        <div><span>일반 공격 최대 데미지</span><strong className={compareClass(result.basicAttackItemMaxDamage, compareAgainst.basicAttackItemMaxDamage)}>{result.basicAttackItemMaxDamage.toLocaleString()}</strong></div>
        <div><span>궁극기 공격 최대 데미지</span><strong className={compareClass(result.ultimateAttackItemMaxDamage, compareAgainst.ultimateAttackItemMaxDamage)}>{result.ultimateAttackItemMaxDamage.toLocaleString()}</strong></div>
        <div><span>아이템 적용 최대 10초 누적</span><strong className={compareClass(result.itemMaxCumulative10s, compareAgainst.itemMaxCumulative10s)}>{result.itemMaxCumulative10s.toLocaleString()}</strong></div>
        <div><span>아이템 적용 최대 DPS(10s)</span><strong className={compareClass(result.itemMaxDps10s, compareAgainst.itemMaxDps10s)}>{result.itemMaxDps10s.toLocaleString()}</strong></div>
        <div><span>최종 공격력</span><strong>{result.finalAtk.toLocaleString()}</strong></div>
        <div><span>각성 반영 공격력</span><strong>{result.awakeningAtkBonusApplied > 0 ? `+${result.awakeningAtkBonusApplied}` : '-'}</strong></div>
        <div><span>총 치피</span><strong>{result.finalCritDmg}%</strong></div>
        <div><span>총 공속</span><strong>{result.totalAspd}</strong></div>
        <div><span>판테온 공속</span><strong>{result.pantheonAspdBonus}</strong></div>
        <div><span>최종 공속</span><strong>{result.finalAspd}</strong></div>
        <div><span>적용 공속 그룹</span><strong>{result.attackSpeedProfileBaseInterval.toFixed(1)}</strong></div>
        <div><span>공격 간격</span><strong>{result.interval.toFixed(2)}초</strong></div>
        <div><span>다음 공속 구간</span><strong>{result.nextThreshold ?? '-'}</strong></div>
        <div><span>추가 필요 공속</span><strong>{result.neededAspd ?? '-'}</strong></div>
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
