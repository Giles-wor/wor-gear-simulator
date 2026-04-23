import type { ReactNode } from 'react'
import { leftSets, rightSets } from '../data/gearSets'
import type { BuildInput } from '../lib/calc'

type CompareBuildFormProps = {
  buildA: BuildInput
  buildB: BuildInput
  onChangeA: (next: BuildInput) => void
  onChangeB: (next: BuildInput) => void
}

type RowProps = {
  label: string
  left: ReactNode
  right: ReactNode
}

function Row({ label, left, right }: RowProps) {
  return (
    <div className="compareFormRow">
      <div className="compareFormLabel">{label}</div>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}

export function CompareBuildForm({ buildA, buildB, onChangeA, onChangeB }: CompareBuildFormProps) {
  return (
    <section className="card compareFormCard">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">입력 비교</p>
          <h2>세팅 A / B를 같은 화면에서 입력</h2>
        </div>
      </div>

      <div className="compareFormGrid">
        <div className="compareFormHeader">항목</div>
        <div className="compareFormHeader">세팅 A</div>
        <div className="compareFormHeader">세팅 B</div>

        <Row
          label="총 공격력"
          left={<input type="number" value={buildA.totalAtk} onChange={(e) => onChangeA({ ...buildA, totalAtk: Number(e.target.value) })} />}
          right={<input type="number" value={buildB.totalAtk} onChange={(e) => onChangeB({ ...buildB, totalAtk: Number(e.target.value) })} />}
        />
        <Row
          label="총 치명타 확률"
          left={<input type="number" value={buildA.critRate} onChange={(e) => onChangeA({ ...buildA, critRate: Number(e.target.value) })} />}
          right={<input type="number" value={buildB.critRate} onChange={(e) => onChangeB({ ...buildB, critRate: Number(e.target.value) })} />}
        />
        <Row
          label="총 치명타 피해"
          left={<input type="number" value={buildA.critDmg} onChange={(e) => onChangeA({ ...buildA, critDmg: Number(e.target.value) })} />}
          right={<input type="number" value={buildB.critDmg} onChange={(e) => onChangeB({ ...buildB, critDmg: Number(e.target.value) })} />}
        />
        <Row
          label="총 공속"
          left={<input type="number" value={buildA.attackSpeed} onChange={(e) => onChangeA({ ...buildA, attackSpeed: Number(e.target.value) })} />}
          right={<input type="number" value={buildB.attackSpeed} onChange={(e) => onChangeB({ ...buildB, attackSpeed: Number(e.target.value) })} />}
        />
        <Row
          label="좌측 2세트"
          left={
            <select value={buildA.leftSetId} onChange={(e) => onChangeA({ ...buildA, leftSetId: e.target.value })}>
              {leftSets.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
            </select>
          }
          right={
            <select value={buildB.leftSetId} onChange={(e) => onChangeB({ ...buildB, leftSetId: e.target.value })}>
              {leftSets.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
            </select>
          }
        />
        <Row
          label="우측 3세트"
          left={
            <select value={buildA.rightSetId} onChange={(e) => onChangeA({ ...buildA, rightSetId: e.target.value })}>
              {rightSets.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
            </select>
          }
          right={
            <select value={buildB.rightSetId} onChange={(e) => onChangeB({ ...buildB, rightSetId: e.target.value })}>
              {rightSets.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
            </select>
          }
        />
        <Row
          label="각성 적용"
          left={<input type="checkbox" checked={buildA.awakeningOn} onChange={(e) => onChangeA({ ...buildA, awakeningOn: e.target.checked })} />}
          right={<input type="checkbox" checked={buildB.awakeningOn} onChange={(e) => onChangeB({ ...buildB, awakeningOn: e.target.checked })} />}
        />
        <Row
          label="판테온 공속 +40"
          left={<input type="checkbox" checked={buildA.pantheonAspdOn} onChange={(e) => onChangeA({ ...buildA, pantheonAspdOn: e.target.checked })} />}
          right={<input type="checkbox" checked={buildB.pantheonAspdOn} onChange={(e) => onChangeB({ ...buildB, pantheonAspdOn: e.target.checked })} />}
        />
      </div>
    </section>
  )
}
