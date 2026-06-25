import type { ReactNode } from 'react'
import { leftSets, rightSets, gearSetLabel } from '../data/gearSets'
import type { FactionAccessoryEffect } from '../data/factionAccessories'
import { heroDisplayName, type Hero } from '../data/heroes'
import type { LordEffect } from '../data/lordEffects'
import type { BuildInput } from '../lib/calc'

type CompareBuildFormProps = {
  hero: Hero
  buildA: BuildInput
  buildB: BuildInput
  accessoryOptions: FactionAccessoryEffect[]
  lordOptions: LordEffect[]
  onChangeA: (next: BuildInput) => void
  onChangeB: (next: BuildInput) => void
  showLeftSet?: boolean
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

function getDefaultUptime(setId: string) {
  return rightSets.find((set) => set.id === setId)?.defaultUptime ?? 1
}

function accessorySelect(
  build: BuildInput,
  options: FactionAccessoryEffect[],
  onChange: (next: BuildInput) => void,
) {
  const value = options.some((option) => option.id === build.factionAccessoryId) ? build.factionAccessoryId : 'none'

  return (
    <select value={value} onChange={(e) => onChange({ ...build, factionAccessoryId: e.target.value })}>
      <option value="none">적용 안 함</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.faction} · {option.summary}
        </option>
      ))}
    </select>
  )
}

function lordSelect(
  build: BuildInput,
  options: LordEffect[],
  onChange: (next: BuildInput) => void,
) {
  const value = options.some((option) => option.id === build.lordEffectId) ? build.lordEffectId : 'none'

  return (
    <select value={value} onChange={(e) => onChange({ ...build, lordEffectId: e.target.value })}>
      <option value="none">영주 없음</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.faction} · {option.name}
        </option>
      ))}
    </select>
  )
}

function gemToggles(build: BuildInput, onChange: (next: BuildInput) => void) {
  return (
    <div className="gemToggles">
      <label className="gemToggle">
        <input
          type="checkbox"
          checked={!!build.gemGunbangOn}
          onChange={(e) => onChange({ ...build, gemGunbangOn: e.target.checked })}
        />
        건방 <small>공격력 +400</small>
      </label>
      <label className="gemToggle">
        <input
          type="checkbox"
          checked={!!build.gemGeochimOn}
          onChange={(e) => onChange({ ...build, gemGeochimOn: e.target.checked })}
        />
        거침없는힘 <small>공격력 +5%</small>
      </label>
      <label className={`gemToggle gemToggleChild${build.gemGeochimOn ? '' : ' disabled'}`}>
        <input
          type="checkbox"
          disabled={!build.gemGeochimOn}
          checked={!!build.gemGeochimOn && !!build.gemMidongOn}
          onChange={(e) => onChange({ ...build, gemMidongOn: e.target.checked })}
        />
        └ 미동 배치 <small>피해 +5%</small>
      </label>
    </div>
  )
}

export function CompareBuildForm({ hero, buildA, buildB, accessoryOptions, lordOptions, onChangeA, onChangeB, showLeftSet = true }: CompareBuildFormProps) {
  return (
    <section className="card compareFormCard">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">입력 비교</p>
          <h2>세팅 A / B를 같은 화면에서 입력</h2>
          <p className="muted compactHeroMeta">{heroDisplayName(hero)}의 진영 기준으로 영주와 3세트 악세서리를 선택합니다.</p>
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
        {showLeftSet ? (
          <Row
            label="좌측 2세트"
            left={
              <select value={buildA.leftSetId} onChange={(e) => onChangeA({ ...buildA, leftSetId: e.target.value })}>
                {leftSets.map((set) => <option key={set.id} value={set.id}>{gearSetLabel(set)}</option>)}
              </select>
            }
            right={
              <select value={buildB.leftSetId} onChange={(e) => onChangeB({ ...buildB, leftSetId: e.target.value })}>
                {leftSets.map((set) => <option key={set.id} value={set.id}>{gearSetLabel(set)}</option>)}
              </select>
            }
          />
        ) : null}
        <Row
          label="우측 3세트"
          left={
            <select value={buildA.rightSetId} onChange={(e) => onChangeA({ ...buildA, rightSetId: e.target.value, setUptime: getDefaultUptime(e.target.value) })}>
              {rightSets.map((set) => <option key={set.id} value={set.id}>{gearSetLabel(set)}</option>)}
            </select>
          }
          right={
            <select value={buildB.rightSetId} onChange={(e) => onChangeB({ ...buildB, rightSetId: e.target.value, setUptime: getDefaultUptime(e.target.value) })}>
              {rightSets.map((set) => <option key={set.id} value={set.id}>{gearSetLabel(set)}</option>)}
            </select>
          }
        />
        <Row
          label="각성 레벨"
          left={
            <div className="awakeningPicker">
              {[0, 1, 2, 3, 4, 5].map((lv) => (
                <button
                  key={lv}
                  type="button"
                  className={buildA.awakeningLevel === lv ? 'awakeningChip active' : 'awakeningChip'}
                  onClick={() => onChangeA({ ...buildA, awakeningLevel: lv })}
                >
                  {lv}
                </button>
              ))}
            </div>
          }
          right={
            <div className="awakeningPicker">
              {[0, 1, 2, 3, 4, 5].map((lv) => (
                <button
                  key={lv}
                  type="button"
                  className={buildB.awakeningLevel === lv ? 'awakeningChip active' : 'awakeningChip'}
                  onClick={() => onChangeB({ ...buildB, awakeningLevel: lv })}
                >
                  {lv}
                </button>
              ))}
            </div>
          }
        />
        <Row
          label="판테온 공속 +40"
          left={<input type="checkbox" checked={buildA.pantheonAspdOn} onChange={(e) => onChangeA({ ...buildA, pantheonAspdOn: e.target.checked })} />}
          right={<input type="checkbox" checked={buildB.pantheonAspdOn} onChange={(e) => onChangeB({ ...buildB, pantheonAspdOn: e.target.checked })} />}
        />
        <Row
          label="영주 효과"
          left={lordSelect(buildA, lordOptions, onChangeA)}
          right={lordSelect(buildB, lordOptions, onChangeB)}
        />
        <Row
          label="진영 3세트 악세서리"
          left={accessorySelect(buildA, accessoryOptions, onChangeA)}
          right={accessorySelect(buildB, accessoryOptions, onChangeB)}
        />
        <Row
          label="보석(이화) 효과"
          left={gemToggles(buildA, onChangeA)}
          right={gemToggles(buildB, onChangeB)}
        />
      </div>
    </section>
  )
}
