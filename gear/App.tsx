import { useMemo, useState } from 'react'
import { GlobalNav } from './components/GlobalNav'
import { SiteCredit } from './components/SiteCredit'
import { gearSetsBySide, gearSetDisplayName } from './data/gearSets'
import { mainStats, subStats, statLabel } from './data/attributes'
import {
  roles,
  progressionLevels,
  buildRolePreset,
  buildAllRolesPreset,
  buildGranular,
  granularRoles,
  granularIsEstimated,
  type ProgressionLevel,
  type GranularRole,
} from './data/presets'
import {
  emptyRule,
  newRuleId,
  ruleSummary,
  sideSetGroup,
  sideAllowsMainSelect,
  SIDE_LABEL,
  type FilterRule,
  type RuleSide,
} from './lib/filter'

const setLabelOf = (id: string) => gearSetDisplayName(id)
const mainLabelOf = (id: string) => statLabel(mainStats, id)
const subLabelOf = (id: string) => statLabel(subStats, id)

const SIDE_OPTIONS: RuleSide[] = ['accessory', 'weapon', 'armor', 'right', 'left', 'any']

function Chip({
  active,
  onClick,
  children,
  tone = 'default',
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  tone?: 'default' | 'main' | 'sub' | 'set' | 'req'
}) {
  return (
    <button type="button" className={`chip ${tone}${active ? ' active' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

function RuleCard({
  rule,
  index,
  onChange,
  onRemove,
}: {
  rule: FilterRule
  index: number
  onChange: (next: FilterRule) => void
  onRemove: () => void
}) {
  const group = sideSetGroup(rule.side)
  const setsForSide =
    group === 'any' ? [...gearSetsBySide.left, ...gearSetsBySide.right] : gearSetsBySide[group]
  const showMain = sideAllowsMainSelect(rule.side)

  const toggle = (key: 'sets' | 'mainStats' | 'subStats', id: string) => {
    const cur = rule[key]
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    // 부옵에서 제거하면 필수 속성에서도 제거
    const patch: Partial<FilterRule> = { [key]: next }
    if (key === 'subStats') patch.requiredSubs = rule.requiredSubs.filter((s) => next.includes(s))
    onChange({ ...rule, ...patch })
  }
  const toggleReq = (id: string) => {
    const next = rule.requiredSubs.includes(id)
      ? rule.requiredSubs.filter((x) => x !== id)
      : [...rule.requiredSubs, id]
    onChange({ ...rule, requiredSubs: next })
  }
  const toggleTier = (t: number) => {
    const next = rule.tiers.includes(t) ? rule.tiers.filter((x) => x !== t) : [...rule.tiers, t]
    onChange({ ...rule, tiers: next })
  }

  // Tier 선택 시 해당 Tier 세트만 칩으로 노출 (비었으면 전체)
  const setsForTier =
    rule.tiers.length > 0 ? setsForSide.filter((s) => rule.tiers.includes(s.tier)) : setsForSide

  const maxMatch = Math.max(1, rule.subStats.length || 4)

  return (
    <div className="ruleCard">
      <div className="ruleHeader">
        <span className="ruleIndex">규칙 {index + 1}</span>
        <input
          className="ruleName"
          value={rule.name}
          onChange={(e) => onChange({ ...rule, name: e.target.value })}
          placeholder="규칙 이름"
        />
        <button type="button" className="ruleRemove" onClick={onRemove} aria-label="규칙 삭제">
          ×
        </button>
      </div>

      <div className="ruleBlock">
        <div className="ruleBlockLabel">적용 부위</div>
        <div className="chipRow">
          {SIDE_OPTIONS.map((side) => (
            <Chip
              key={side}
              active={rule.side === side}
              onClick={() => onChange({ ...rule, side, sets: [] })}
            >
              {SIDE_LABEL[side]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="ruleBlock">
        <div className="ruleBlockLabel">
          Tier <small>(비우면 모든 Tier)</small>
        </div>
        <div className="chipRow">
          {[3, 2, 1, 0].map((t) => (
            <Chip key={t} tone="set" active={rule.tiers.includes(t)} onClick={() => toggleTier(t)}>
              T{t}
            </Chip>
          ))}
        </div>
      </div>

      <div className="ruleBlock">
        <div className="ruleBlockLabel">
          세트 종류 <small>(비우면 Tier 내 모든 세트)</small>
        </div>
        <div className="chipRow">
          {setsForTier.map((s) => (
            <Chip key={s.id} tone="set" active={rule.sets.includes(s.id)} onClick={() => toggle('sets', s.id)}>
              {s.nameKo ?? s.name} <small>T{s.tier}</small>
            </Chip>
          ))}
        </div>
      </div>

      {showMain ? (
        <div className="ruleBlock">
          <div className="ruleBlockLabel">
            주옵션 (메인) <small>(비우면 주옵션 무관)</small>
          </div>
          <div className="chipRow">
            {mainStats.map((s) => (
              <Chip
                key={s.id}
                tone="main"
                active={rule.mainStats.includes(s.id)}
                onClick={() => toggle('mainStats', s.id)}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        </div>
      ) : (
        <div className="ruleBlock">
          <div className="ruleBlockLabel">
            주옵션 (메인)
            <small> · {rule.side === 'weapon' ? '무기는 ATK 고정' : rule.side === 'armor' ? '방어구는 HP 고정' : '무기/방어구 고정'}</small>
          </div>
        </div>
      )}

      <div className="ruleBlock">
        <div className="ruleBlockLabel">부옵션 (서브)</div>
        <div className="chipRow">
          {subStats.map((s) => (
            <Chip
              key={s.id}
              tone="sub"
              active={rule.subStats.includes(s.id)}
              onClick={() => toggle('subStats', s.id)}
            >
              {s.label}
            </Chip>
          ))}
        </div>
        <div className="matchRow">
          <span>부옵션 중 최소</span>
          <select
            value={Math.min(rule.requiredSubMatches, maxMatch)}
            onChange={(e) => onChange({ ...rule, requiredSubMatches: Number(e.target.value) })}
            disabled={rule.subStats.length === 0}
          >
            {Array.from({ length: maxMatch }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}개
              </option>
            ))}
          </select>
          <span>매칭 시 KEEP</span>
        </div>
      </div>

      {rule.subStats.length > 0 ? (
        <div className="ruleBlock">
          <div className="ruleBlockLabel">
            필수 속성 <small>· 선택한 부옵 중 무조건 포함돼야 하는 것 (인게임 "장비 필수 속성")</small>
          </div>
          <div className="chipRow">
            {rule.subStats.map((id) => (
              <Chip key={id} tone="req" active={rule.requiredSubs.includes(id)} onClick={() => toggleReq(id)}>
                {subLabelOf(id)}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ruleSummary">{ruleSummary(rule, setLabelOf, mainLabelOf, subLabelOf)}</div>
    </div>
  )
}

type View = 'basic' | 'custom'

export default function App() {
  const [view, setView] = useState<View>('basic')
  const [level, setLevel] = useState<ProgressionLevel>('late')
  const [granularRole, setGranularRole] = useState<GranularRole>('attack_dps')
  // 변환 고려(true, 평소 수집) / 변환 미고려(false, 골드 정리 — 풀옵만 남김)
  const [conversion, setConversion] = useState(true)

  // 기본 뷰: 진행도 + 변환토글만 고르면 모든 역할 규칙이 한 방에 생성됨 (메모이즈)
  const basicRules = useMemo(() => buildAllRolesPreset(level, conversion), [level, conversion])

  // 개인화 뷰: 사용자가 편집하는 규칙 셋
  const [customRules, setCustomRules] = useState<FilterRule[]>(() => buildGranular('attack_dps', true))

  const activeRules = view === 'basic' ? basicRules : customRules

  const updateRule = (id: string, next: FilterRule) =>
    setCustomRules((prev) => prev.map((r) => (r.id === id ? next : r)))
  const removeRule = (id: string) => setCustomRules((prev) => prev.filter((r) => r.id !== id))
  const addRule = () => setCustomRules((prev) => [...prev, emptyRule(`규칙 ${prev.length + 1}`)])
  const applyRoleToCustom = (roleId: string) => {
    const built = buildRolePreset(roleId, level, conversion)
    if (built.length) setCustomRules(built)
  }
  const applyGranularToCustom = () => setCustomRules(buildGranular(granularRole, conversion))
  const clearAll = () => setCustomRules([{ ...emptyRule('새 규칙'), id: newRuleId() }])

  // 필수옵션 체크 → 자동 규칙 (무기/방어구)
  const [reqSide, setReqSide] = useState<'weapon' | 'armor'>('weapon')
  const [reqOpts, setReqOpts] = useState<string[]>([])
  const toggleReqOpt = (id: string) =>
    setReqOpts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const addReqRule = () => {
    if (reqOpts.length === 0) return
    const match = conversion ? Math.max(1, reqOpts.length - 1) : reqOpts.length
    const sideKo = reqSide === 'weapon' ? '무기' : '방어구'
    setCustomRules((prev) => [
      ...prev,
      {
        id: newRuleId(),
        name: `${sideKo} 필수옵션 (${conversion ? '변환' : '풀옵'})`,
        side: reqSide,
        tiers: [1, 2, 3],
        sets: [],
        mainStats: [],
        subStats: [...reqOpts],
        requiredSubMatches: Math.min(match, reqOpts.length),
        requiredSubs: [],
      },
    ])
  }

  const exportText = useMemo(() => {
    const lines = activeRules.map(
      (r, i) => `규칙 ${i + 1}. ${r.name}\n  ${ruleSummary(r, setLabelOf, mainLabelOf, subLabelOf)}`,
    )
    const convTxt = conversion ? '변환 고려(수집용)' : '변환 미고려(정리용)'
    const head =
      view === 'basic'
        ? `WoR 장비 필터 — 기본 프리셋 (${progressionLevels.find((l) => l.id === level)?.label} · ${convTxt})`
        : `WoR 장비 필터 — 개인화 (${convTxt})`
    return `${head} · 규칙 ${activeRules.length}개 (OR 조건)\n\n${lines.join('\n\n')}`
  }, [activeRules, view, level, conversion])

  const copyExport = () => {
    navigator.clipboard?.writeText(exportText).catch(() => {})
  }

  return (
    <div className="app">
      <SiteCredit />
      <GlobalNav active="gear" />

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">GEAR FILTER</p>
            <h1>장비 필터 설정</h1>
          </div>
        </div>
        <p className="muted">
          인게임 장비 필터를 미리 구성하는 도구입니다. <strong>장비가 어느 한 규칙이라도 통과하면 KEEP</strong>
          (규칙 간 OR). 아래 요약을 인게임 필터에 그대로 옮겨 설정하세요.
        </p>
        <div className="viewTabs">
          <button
            type="button"
            className={view === 'basic' ? 'viewTab active' : 'viewTab'}
            onClick={() => setView('basic')}
          >
            기본 (프리셋)
          </button>
          <button
            type="button"
            className={view === 'custom' ? 'viewTab active' : 'viewTab'}
            onClick={() => setView('custom')}
          >
            개인화 (직접 편집)
          </button>
        </div>

        <div className="convToggleRow">
          <span className="convToggleLabel">모드</span>
          <button
            type="button"
            className={conversion ? 'convChip active' : 'convChip'}
            onClick={() => setConversion(true)}
          >
            변환 고려 <small>· 평소 수집 (루즈)</small>
          </button>
          <button
            type="button"
            className={!conversion ? 'convChip active strict' : 'convChip'}
            onClick={() => setConversion(false)}
          >
            변환 미고려 <small>· 골드 정리 (풀옵만)</small>
          </button>
        </div>
        <p className="muted helperText">
          {conversion
            ? '평소엔 변환 고려로 두고 — 핵심 옵션만 맞으면 보관 (마지막 1옵은 변환보석으로 채울 수 있으므로).'
            : '골드 정리할 땐 변환 미고려로 — 부옵이 풀로 다 좋은 장비만 KEEP, 나머지는 정리 대상. (변환석 아낄 때)'}
        </p>
      </section>

      {/* ── 설정 내보내기 (항상 위) ── */}
      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">결과</p>
            <h2>설정 내보내기 ({activeRules.length}개 규칙)</h2>
          </div>
          <button type="button" className="ghostBtn" onClick={copyExport}>
            복사
          </button>
        </div>
        <pre className="exportBox">{exportText}</pre>
        {activeRules.length > 50 ? (
          <p className="alert">
            ⚠️ 규칙이 {activeRules.length}개로 인게임 한도(50개)를 넘습니다. 일부 역할/규칙을 줄여주세요.
          </p>
        ) : null}
        <p className="muted helperText">
          규칙별로 세트 / 주옵션 / 부옵션 / 매칭 개수를 인게임 필터에 동일하게 입력하면 됩니다. (인게임 한도 50개)
        </p>
      </section>

      {view === 'basic' ? (
        <section className="card">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">진행도 선택</p>
              <h2>내 진행도에 맞는 프리셋</h2>
            </div>
          </div>
          <div className="levelRow">
            {progressionLevels.map((lv) => (
              <button
                key={lv.id}
                type="button"
                className={level === lv.id ? 'levelChip active' : 'levelChip'}
                onClick={() => setLevel(lv.id)}
              >
                {lv.label}
              </button>
            ))}
          </div>
          <p className="muted helperText levelDesc">
            {progressionLevels.find((l) => l.id === level)?.desc}
          </p>
          <p className="muted helperText">
            진행도만 고르면 모든 역할(딜러·탱커·힐러·격려·유틸)의 규칙이 위 내보내기에 한 번에 담깁니다.
            세밀하게 손보려면 <strong>개인화</strong> 탭으로 가세요.
          </p>
          <div className="ruleList readonly">
            {basicRules.map((rule, i) => (
              <div key={rule.id} className="ruleSummaryRow">
                <span className="ruleSummaryIdx">{i + 1}</span>
                <div>
                  <strong>{rule.name}</strong>
                  <div className="ruleSummary">{ruleSummary(rule, setLabelOf, mainLabelOf, subLabelOf)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow">불러오기</p>
                <h2>프리셋에서 시작</h2>
              </div>
            </div>
            <div className="levelRow">
              <span className="levelRowLabel">진행도</span>
              {progressionLevels.map((lv) => (
                <button
                  key={lv.id}
                  type="button"
                  className={level === lv.id ? 'levelChip active' : 'levelChip'}
                  onClick={() => setLevel(lv.id)}
                  title={lv.desc}
                >
                  {lv.label}
                </button>
              ))}
            </div>
            <div className="presetRow">
              {roles.map((r) => (
                <button key={r.id} type="button" className="presetCard" onClick={() => applyRoleToCustom(r.id)}>
                  <strong>{r.label}</strong>
                  <span>{r.description}</span>
                </button>
              ))}
            </div>

            <div className="granularBlock">
              <p className="eyebrow">역할 정밀 세팅 (최상급 · 변환 고려)</p>
              <div className="levelRow">
                <span className="levelRowLabel">역할</span>
                {granularRoles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={granularRole === r.id ? 'levelChip active' : 'levelChip'}
                    onClick={() => setGranularRole(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="muted helperText levelDesc">
                {granularRole === 'hp_healer' || granularRole === 'atk_healer'
                  ? '힐러 우선순위: 주요 > 공속 > 치유 > 분노. 공속 우선 포함 + 악세 공속메인 루트. (변환 고려)'
                  : granularRole === 'inspiration'
                    ? '격려 힐러: 아군 공격력 버프형 — 모든 장비에서 공%·공격력 최우선. (변환 고려)'
                    : granularIsEstimated(granularRole)
                      ? '⚠️ 메타 기반 추정. 인게임 확인 후 다듬어 쓰세요.'
                      : '✓ 사용자 인게임 지침 기반 (변환 고려).'}
              </p>
              <button type="button" className="addRuleBtn" onClick={applyGranularToCustom}>
                이 역할로 정밀 규칙 채우기
              </button>
            </div>
          </section>

          <section className="card">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow">필수 옵션 → 자동 규칙</p>
                <h2>무기 / 방어구 핵심 옵션으로 규칙 추가</h2>
              </div>
            </div>
            <p className="muted helperText">
              내가 꼭 챙길 옵션을 고르면 규칙으로 만들어 아래 목록에 추가합니다. 현재 모드 기준 —
              {conversion
                ? ' 변환 고려: 고른 옵션 중 1개는 변환으로 채울 수 있어 (N−1)개만 맞아도 KEEP.'
                : ' 변환 미고려: 고른 옵션이 모두(N개) 있어야 KEEP.'}
            </p>
            <div className="levelRow">
              <span className="levelRowLabel">부위</span>
              {(['weapon', 'armor'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={reqSide === s ? 'levelChip active' : 'levelChip'}
                  onClick={() => setReqSide(s)}
                >
                  {s === 'weapon' ? '무기' : '방어구'}
                </button>
              ))}
            </div>
            <div className="chipRow">
              {subStats.map((s) => (
                <Chip
                  key={s.id}
                  tone="sub"
                  active={reqOpts.includes(s.id)}
                  onClick={() => toggleReqOpt(s.id)}
                >
                  {s.label}
                </Chip>
              ))}
            </div>
            <p className="muted helperText">
              선택 {reqOpts.length}개
              {reqOpts.length > 0
                ? ` → 매칭 ${Math.min(conversion ? Math.max(1, reqOpts.length - 1) : reqOpts.length, reqOpts.length)}개`
                : ''}
            </p>
            <button
              type="button"
              className="addRuleBtn"
              onClick={addReqRule}
              disabled={reqOpts.length === 0}
            >
              + 이 옵션들로 {reqSide === 'weapon' ? '무기' : '방어구'} 규칙 추가
            </button>
          </section>

          <section className="card">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow">규칙 편집</p>
                <h2>필터 규칙 ({customRules.length}개)</h2>
              </div>
              <button type="button" className="ghostBtn" onClick={clearAll}>
                전체 초기화
              </button>
            </div>
            <div className="ruleList">
              {customRules.map((rule, i) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  index={i}
                  onChange={(next) => updateRule(rule.id, next)}
                  onRemove={() => removeRule(rule.id)}
                />
              ))}
            </div>
            <button type="button" className="addRuleBtn" onClick={addRule}>
              + 규칙 추가
            </button>
          </section>
        </>
      )}
    </div>
  )
}
