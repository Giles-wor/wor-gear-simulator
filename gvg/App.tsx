import { useCallback, useEffect, useMemo, useState } from 'react'
import { GlobalNav } from './components/GlobalNav'
import { SiteCredit } from './components/SiteCredit'
import { loadBoard, loadLog, saveBoard, supabaseEnabled } from './supabase'
import {
  autoRanks,
  cloneBoard,
  displayRank,
  emptyGuild,
  newId,
  sortByRound,
} from './board'
import type { Board, EditLog, GuildRow, Round } from './types'
import seed from './data/seed.json'

const SEED = seed as Board
const CODE_KEY = 'gvgEditCode'
const EDITOR_KEY = 'gvgEditor'

function parseNumOrNull(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  const n = Number(t.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

export default function App() {
  const [board, setBoard] = useState<Board>(SEED)
  const [source, setSource] = useState<'server' | 'seed'>('seed')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [log, setLog] = useState<EditLog[]>([])
  const [showLog, setShowLog] = useState(false)

  // 편집 상태
  const [draft, setDraft] = useState<Board | null>(null)
  const [code, setCode] = useState(() => localStorage.getItem(CODE_KEY) ?? '')
  const [editor, setEditor] = useState(() => localStorage.getItem(EDITOR_KEY) ?? '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const remote = await loadBoard()
      if (remote) {
        setBoard(remote)
        setSource('server')
      } else {
        setBoard(SEED)
        setSource('seed')
      }
      setLog(await loadLog())
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 오류')
      setBoard(SEED)
      setSource('seed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const editing = draft !== null
  const view = draft ?? board

  const startEdit = () => {
    setSaveMsg(null)
    setDraft(cloneBoard(board))
  }
  const cancelEdit = () => {
    setDraft(null)
    setNote('')
    setSaveMsg(null)
  }

  const mutate = (fn: (b: Board) => void) => {
    setDraft((prev) => {
      if (!prev) return prev
      const next = cloneBoard(prev)
      fn(next)
      return next
    })
  }

  const doSave = async () => {
    if (!draft) return
    if (!code.trim()) {
      setSaveMsg('편집 코드를 입력하세요.')
      return
    }
    if (!editor.trim()) {
      setSaveMsg('편집자 이름을 입력하세요.')
      return
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      const payload: Board = {
        ...draft,
        updatedAt: new Date().toISOString().slice(0, 10),
        updatedBy: editor.trim(),
      }
      await saveBoard(payload, code.trim(), editor.trim(), note.trim() || undefined)
      localStorage.setItem(CODE_KEY, code.trim())
      localStorage.setItem(EDITOR_KEY, editor.trim())
      setBoard(payload)
      setSource('server')
      setDraft(null)
      setNote('')
      setSaveMsg(null)
      setLog(await loadLog())
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gvgPage">
      <SiteCredit />
      <GlobalNav active="gvg" />

      <header className="gvgHead">
        <h1>길드전 리더보드</h1>
        <div className="gvgMeta">
          <span>갱신 {view.updatedAt}</span>
          {view.updatedBy && <span>· 최종 편집: {view.updatedBy}</span>}
          <span className={`gvgSrc ${source}`}>
            {source === 'server' ? '● 서버 반영' : supabaseEnabled() ? '○ 서버 데이터 없음(시드 표시)' : '○ 로컬 전용(Supabase 미설정)'}
          </span>
        </div>
        <div className="gvgActions">
          <button onClick={() => void refresh()} disabled={loading}>
            {loading ? '불러오는 중…' : '새로고침'}
          </button>
          {!editing ? (
            <button className="primary" onClick={startEdit}>수정</button>
          ) : (
            <>
              <button onClick={cancelEdit} disabled={saving}>취소</button>
            </>
          )}
          <button onClick={() => setShowLog((v) => !v)}>{showLog ? '로그 닫기' : '편집 로그'}</button>
        </div>
        {error && <p className="gvgError">불러오기 오류: {error} (시드 데이터를 표시합니다)</p>}
      </header>

      {showLog && (
        <section className="gvgLog">
          <h2>편집 로그</h2>
          {log.length === 0 ? (
            <p className="muted">기록이 없습니다{!supabaseEnabled() && ' (Supabase 미설정)'}.</p>
          ) : (
            <ul>
              {log.map((l, i) => (
                <li key={i}>
                  <b>{l.editor}</b> · {new Date(l.at).toLocaleString('ko-KR')}
                  {l.note ? ` — ${l.note}` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {editing ? (
        <EditorBar
          code={code}
          editor={editor}
          note={note}
          saving={saving}
          saveMsg={saveMsg}
          onCode={setCode}
          onEditor={setEditor}
          onNote={setNote}
          onSave={() => void doSave()}
        />
      ) : null}

      <BoardTable board={view} editing={editing} mutate={mutate} />

      {editing && (
        <div className="gvgEditTools">
          <button onClick={() => mutate((b) => b.guilds.push(emptyGuild()))}>+ 길드 추가</button>
          <button
            onClick={() =>
              mutate((b) =>
                b.rounds.push({ id: newId('r'), label: '새 회차', projected: true }),
              )
            }
          >
            + 회차 추가
          </button>
        </div>
      )}

      <p className="gvgHelp">
        읽기는 누구나 가능합니다. 수정은 편집 코드가 있는 사람만 가능하며, 저장 시 편집자 이름과 시각이 로그로 남습니다.
        순위 칸은 포인트 기준 자동 계산되며, 편집 중 순위 칸에 값을 직접 넣으면 그 값으로 보정됩니다(비우면 자동).
      </p>
    </div>
  )
}

function EditorBar(props: {
  code: string
  editor: string
  note: string
  saving: boolean
  saveMsg: string | null
  onCode: (v: string) => void
  onEditor: (v: string) => void
  onNote: (v: string) => void
  onSave: () => void
}) {
  return (
    <div className="gvgEditorBar">
      <div className="row">
        <label>
          편집 코드
          <input
            type="password"
            value={props.code}
            onChange={(e) => props.onCode(e.target.value)}
            placeholder="공용 편집 코드"
            autoComplete="off"
          />
        </label>
        <label>
          편집자 이름
          <input
            value={props.editor}
            onChange={(e) => props.onEditor(e.target.value)}
            placeholder="로그에 남을 이름"
            autoComplete="off"
          />
        </label>
        <label className="grow">
          변경 메모(선택)
          <input
            value={props.note}
            onChange={(e) => props.onNote(e.target.value)}
            placeholder="예: 8-1 결과 반영"
          />
        </label>
        <button className="primary" onClick={props.onSave} disabled={props.saving}>
          {props.saving ? '저장 중…' : '저장'}
        </button>
      </div>
      {props.saveMsg && <p className="gvgError">{props.saveMsg}</p>}
    </div>
  )
}

function BoardTable(props: {
  board: Board
  editing: boolean
  mutate: (fn: (b: Board) => void) => void
}) {
  const { board, editing, mutate } = props
  // 회차별 자동순위 맵 미리 계산
  const autoMaps = useMemo(() => {
    const m: Record<string, Map<string, number>> = {}
    for (const r of board.rounds) m[r.id] = autoRanks(board.guilds, r.id)
    return m
  }, [board])

  return (
    <div className="gvgTableWrap">
      <table className="gvgTable">
        <thead>
          <tr>
            <th className="stickyCol cornerCell" rowSpan={2}>
              {editing ? '길드' : board.title || 'GvG'}
            </th>
            {board.rounds.map((r) => (
              <th
                key={r.id}
                className={`roundHead ${r.projected ? 'projected' : ''}`}
                colSpan={2}
              >
                {editing ? <RoundHeadEdit round={r} mutate={mutate} /> : r.label}
              </th>
            ))}
          </tr>
          <tr>
            {board.rounds.map((r) => [
              <th key={r.id + '-p'} className={`subHead ${r.projected ? 'projected' : ''}`}>포인트</th>,
              <th key={r.id + '-r'} className={`subHead ${r.projected ? 'projected' : ''}`}>
                <span>순위</span>
                {editing && (
                  <button
                    className="miniBtn"
                    title="이 회차 순위(포인트)로 행 정렬"
                    onClick={() => mutate((b) => (b.guilds = sortByRound(b, r.id)))}
                  >
                    ↕
                  </button>
                )}
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {board.guilds.map((g, gi) => (
            <GuildRowView
              key={g.id}
              g={g}
              gi={gi}
              rounds={board.rounds}
              autoMaps={autoMaps}
              editing={editing}
              mutate={mutate}
              lastIndex={board.guilds.length - 1}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RoundHeadEdit(props: { round: Round; mutate: (fn: (b: Board) => void) => void }) {
  const { round, mutate } = props
  return (
    <div className="roundEdit">
      <input
        value={round.label}
        onChange={(e) =>
          mutate((b) => {
            const r = b.rounds.find((x) => x.id === round.id)
            if (r) r.label = e.target.value
          })
        }
      />
      <div className="roundEditBtns">
        <label title="예상(미확정) 회차">
          <input
            type="checkbox"
            checked={!!round.projected}
            onChange={(e) =>
              mutate((b) => {
                const r = b.rounds.find((x) => x.id === round.id)
                if (r) r.projected = e.target.checked
              })
            }
          />
          예상
        </label>
        <button
          className="miniBtn danger"
          title="이 회차 삭제"
          onClick={() =>
            mutate((b) => {
              b.rounds = b.rounds.filter((x) => x.id !== round.id)
              for (const g of b.guilds) {
                delete g.points[round.id]
                delete g.rankOverride[round.id]
              }
            })
          }
        >
          ×
        </button>
      </div>
    </div>
  )
}

function GuildRowView(props: {
  g: GuildRow
  gi: number
  rounds: Round[]
  autoMaps: Record<string, Map<string, number>>
  editing: boolean
  mutate: (fn: (b: Board) => void) => void
  lastIndex: number
}) {
  const { g, gi, rounds, autoMaps, editing, mutate, lastIndex } = props

  const setGuild = (fn: (gg: GuildRow) => void) =>
    mutate((b) => {
      const target = b.guilds.find((x) => x.id === g.id)
      if (target) fn(target)
    })

  return (
    <tr className={g.highlight ? 'hi' : ''}>
      <th className="stickyCol nameCell">
        {editing ? (
          <div className="nameEdit">
            <div className="nameEditTop">
              <input
                className="tag"
                value={g.tag}
                placeholder="[태그]"
                onChange={(e) => setGuild((gg) => (gg.tag = e.target.value))}
              />
              <label className="hiToggle" title="노란 강조">
                <input
                  type="checkbox"
                  checked={!!g.highlight}
                  onChange={(e) => setGuild((gg) => (gg.highlight = e.target.checked || undefined))}
                />
                ⭐
              </label>
            </div>
            <input
              className="gname"
              value={g.name}
              placeholder="길드명"
              onChange={(e) => setGuild((gg) => (gg.name = e.target.value))}
            />
            <div className="rowMove">
              <button
                className="miniBtn"
                disabled={gi === 0}
                title="위로"
                onClick={() =>
                  mutate((b) => {
                    if (gi > 0) [b.guilds[gi - 1], b.guilds[gi]] = [b.guilds[gi], b.guilds[gi - 1]]
                  })
                }
              >
                ↑
              </button>
              <button
                className="miniBtn"
                disabled={gi === lastIndex}
                title="아래로"
                onClick={() =>
                  mutate((b) => {
                    if (gi < b.guilds.length - 1)
                      [b.guilds[gi + 1], b.guilds[gi]] = [b.guilds[gi], b.guilds[gi + 1]]
                  })
                }
              >
                ↓
              </button>
              <button
                className="miniBtn danger"
                title="이 길드 삭제"
                onClick={() => mutate((b) => (b.guilds = b.guilds.filter((x) => x.id !== g.id)))}
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="tag">{g.tag}</span>
            <span className="gname">{g.name}</span>
          </>
        )}
      </th>
      {rounds.map((r) => {
        const pt = g.points[r.id]
        const auto = autoMaps[r.id]
        const shownRank = displayRank(g, r.id, auto)
        const autoRank = auto.get(g.id) ?? null
        return [
          <td key={r.id + '-p'} className={`ptCell ${r.projected ? 'projected' : ''}`}>
            {editing ? (
              <input
                className="num"
                inputMode="numeric"
                value={pt ?? ''}
                onChange={(e) => setGuild((gg) => (gg.points[r.id] = parseNumOrNull(e.target.value)))}
              />
            ) : (
              (pt ?? '')
            )}
          </td>,
          <td key={r.id + '-r'} className={`rankCell ${r.projected ? 'projected' : ''}`}>
            {editing ? (
              <input
                className="num"
                inputMode="numeric"
                placeholder={autoRank ? `${autoRank}` : '-'}
                value={g.rankOverride[r.id] ?? ''}
                onChange={(e) =>
                  setGuild((gg) => (gg.rankOverride[r.id] = parseNumOrNull(e.target.value)))
                }
              />
            ) : (
              (shownRank ?? '')
            )}
          </td>,
        ]
      })}
    </tr>
  )
}
