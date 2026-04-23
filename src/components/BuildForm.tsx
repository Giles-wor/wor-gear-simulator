import { leftSets, rightSets } from '../data/gearSets'
import type { BuildInput } from '../lib/calc'
import { NumberField, SelectField } from './fields'

type BuildFormProps = {
  title: string
  build: BuildInput
  onChange: (next: BuildInput) => void
}

function getDefaultUptime(setId: string) {
  return rightSets.find((set) => set.id === setId)?.defaultUptime ?? 1
}

export function BuildForm({ title, build, onChange }: BuildFormProps) {
  const selectedRight = rightSets.find((set) => set.id === build.rightSetId)
  const uptimeLabel = selectedRight?.conditionLabel ?? '조건부 세트 유지율'
  const showUptime = selectedRight?.defaultUptime !== undefined

  return (
    <section className="card buildCard">
      <div className="sectionHeading">
        <div>
          <h3>{title}</h3>
          <p className="muted">모바일에서 빠르게 비교할 수 있게 핵심 입력만 먼저 배치했습니다.</p>
        </div>
      </div>

      <div className="grid">
        <NumberField label="추가 공격력" value={build.flatAtk} min={0} onChange={(value) => onChange({ ...build, flatAtk: value })} />
        <NumberField label="공격력%" value={build.atkPct} min={0} onChange={(value) => onChange({ ...build, atkPct: value })} />
        <NumberField label="치명타 확률" value={build.critRate} min={0} max={100} suffix="%" onChange={(value) => onChange({ ...build, critRate: value })} />
        <NumberField label="치명타 피해" value={build.critDmg} min={0} suffix="%" onChange={(value) => onChange({ ...build, critDmg: value })} />
        <NumberField label="공격 속도" value={build.attackSpeed} onChange={(value) => onChange({ ...build, attackSpeed: value })} />
        <label className="field checkboxField">
          <span>각성 반영</span>
          <input
            type="checkbox"
            checked={build.awakeningOn}
            onChange={(event) => onChange({ ...build, awakeningOn: event.target.checked })}
          />
        </label>
        <SelectField label="좌측 2세트" value={build.leftSetId} options={leftSets} onChange={(value) => onChange({ ...build, leftSetId: value })} />
        <SelectField
          label="우측 3세트"
          value={build.rightSetId}
          options={rightSets}
          onChange={(value) => onChange({ ...build, rightSetId: value, setUptime: getDefaultUptime(value) })}
        />
        {showUptime ? (
          <NumberField
            label={uptimeLabel}
            value={build.setUptime}
            min={0}
            max={1}
            step={0.05}
            suffix="0~1"
            onChange={(value) => onChange({ ...build, setUptime: value })}
          />
        ) : null}
      </div>

      <div className="muted detailNote">
        <strong>세트 설명:</strong> {selectedRight?.notes ?? '선택된 세트 설명 없음'}
      </div>
    </section>
  )
}
