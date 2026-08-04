import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { GlobalNav } from './components/GlobalNav'
import { SiteCredit } from './components/SiteCredit'
import { boardIdFromCode, decryptJson, encryptJson } from './crypto'
import { loadBoardBlob, loadLogRows, saveBoardBlob, supabaseEnabled } from './supabase'
import {
  autoRanks,
  cloneBoard,
  displayRank,
  emptyGuild,
  newId,
  sortByRound,
} from './board'
import type { Board, EditLog, GuildRow, Round } from './types'

const UNLOCK_KEY = 'gvgUnlock'
const UNLOCK_TTL = 24 * 60 * 60 * 1000 // 잠금 해제 유효기간: 1일(이후 코드 재입력)
const EDITOR_KEY = 'gvgEditor'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function emptyBoard(): Board {
  return { updatedAt: today(), title: 'GvG', rounds: [], guilds: [] }
}

function readUnlock(): { code: string; ts: number } | null {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY)
    const o = raw ? JSON.parse(raw) : null
    return o && typeof o.code === 'string' && typeof o.ts === 'number' ? o : null
  } catch {
    return null
  }
}

function writeUnlock(code: string, ts: number) {
  try {
    localStorage.setItem(UNLOCK_KEY, JSON.stringify({ code, ts }))
  } catch {
    /* 저장 실패해도 이번 세션은 그대로 사용 */
  }
}

function clearUnlock() {
  try {
    localStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* ignore */
  }
}

function parseNumOrNull(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  const n = Number(t.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

export default function App() {
  // 잠금 해제 상태 (code 가 빈 문자열이면 잠김)
  const [code, setCode] = useState('')
  const [boardId, setBoardId] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [lockError, setLockError] = useState('')
  const lockTimer = useRef<number | undefined>(undefined)

  const [board, setBoard] = useState<Board | null>(null)
  const [source, setSource] = useState<'server' | 'empty'>('empty')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [log, setLog] = useState<EditLog[]>([])
  const [showLog, setShowLog] = useState(false)

  // 편집 상태
  const [draft, setDraft] = useState<Board | null>(null)
  const [editor, setEditor] = useState(() => localStorage.getItem(EDITOR_KEY) ?? '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  /** 편집 로그를 받아 코드로 복호화. 실패해도 본문 표시는 막지 않는다. */
  const readLog = useCallback(async (c: string, id: string): Promise<EditLog[]> => {
    if (!supabaseEnabled()) return []
    try {
      const rows = await loadLogRows(id)
      const out: EditLog[] = []
      for (const r of rows) {
        try {
          const e = await decryptJson<{ editor: string; note?: string | null }>(c, id, r.blob)
          out.push({ editor: e.editor, note: e.note ?? null, at: r.at })
        } catch {
          /* 옛 코드로 남은 줄 → 건너뜀 */
        }
      }
      return out
    } catch {
      return []
    }
  }, [])

  const lock = useCallback(() => {
    window.clearTimeout(lockTimer.current)
    clearUnlock()
    setCode('')
    setBoardId('')
    setBoard(null)
    setDraft(null)
    setLog([])
    setSource('empty')
    setError(null)
  }, [])

  /**
   * 코드로 입장. ts = 잠금 해제 기준 시각(수동 입력=지금, 자동복원=저장된 시각) → ts+1일에 자동 잠금.
   * 서버에 이 코드의 보드가 있으면 복호화해서 보여주고(코드가 틀리면 복호화 실패),
   * 없으면 빈 보드로 입장한다(이 코드로 처음 만드는 경우).
   */
  const unlock = useCallback(
    async (c: string, ts: number, silent: boolean) => {
      setUnlocking(true)
      setLockError('')
      try {
        const id = await boardIdFromCode(c)
        let next = emptyBoard()
        let src: 'server' | 'empty' = 'empty'
        if (supabaseEnabled()) {
          let blob
          try {
            blob = await loadBoardBlob(id)
          } catch {
            throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
          }
          if (blob) {
            try {
              next = await decryptJson<Board>(c, id, blob)
              src = 'server'
            } catch {
              throw new Error('코드가 올바르지 않습니다. 다시 확인해 주세요.')
            }
          }
        }
        setBoard(next)
        setSource(src)
        setCode(c)
        setBoardId(id)
        writeUnlock(c, ts)
        window.clearTimeout(lockTimer.current)
        lockTimer.current = window.setTimeout(lock, Math.max(0, ts + UNLOCK_TTL - Date.now()))
        setLog(await readLog(c, id))
      } catch (e) {
        clearUnlock()
        if (!silent) setLockError(e instanceof Error ? e.message : '코드가 올바르지 않습니다.')
      } finally {
        setUnlocking(false)
      }
    },
    [lock, readLog],
  )

  // 1일 이내 해제 기록이 있으면 자동 입장, 아니면 코드 재입력.
  useEffect(() => {
    const u = readUnlock()
    if (u && Date.now() - u.ts < UNLOCK_TTL) void unlock(u.code, u.ts, true)
    else clearUnlock()
  }, [unlock])

  useEffect(() => () => window.clearTimeout(lockTimer.current), [])

  const refresh = useCallback(async () => {
    if (!code) return
    setLoading(true)
    setError(null)
    try {
      const blob = supabaseEnabled() ? await loadBoardBlob(boardId) : null
      if (blob) {
        setBoard(await decryptJson<Board>(code, boardId, blob))
        setSource('server')
      } else {
        setSource('empty')
      }
      setLog(await readLog(code, boardId))
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 오류')
    } finally {
      setLoading(false)
    }
  }, [boardId, code, readLog])

  const editing = draft !== null
  const view = draft ?? board

  const startEdit = () => {
    if (!board) return
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

  /** 초기 데이터(번들 시드)를 편집 상태로 불러온다. 저장해야 서버에 암호화되어 올라간다. */
  const loadSeed = async () => {
    setSaveMsg(null)
    const mod = await import('./data/seed.json')
    setDraft(cloneBoard(mod.default as Board))
  }

  const doSave = async () => {
    if (!draft) return
    if (!editor.trim()) {
      setSaveMsg('편집자 이름을 입력하세요.')
      return
    }
    if (!supabaseEnabled()) {
      setSaveMsg('Supabase 미설정이라 저장할 수 없습니다.')
      return
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      const payload: Board = { ...draft, updatedAt: today(), updatedBy: editor.trim() }
      const blob = await encryptJson(code, boardId, payload)
      const logBlob = await encryptJson(code, boardId, {
        editor: editor.trim(),
        note: note.trim() || null,
      })
      await saveBoardBlob(boardId, code, blob, logBlob)
      localStorage.setItem(EDITOR_KEY, editor.trim())
      setBoard(payload)
      setSource('server')
      setDraft(null)
      setNote('')
      setSaveMsg(null)
      setLog(await readLog(code, boardId))
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  if (!code || !view) {
    return (
      <div className="gvgPage">
        <SiteCredit />
        <GlobalNav active="gvg" />
        <GvgLock
          busy={unlocking}
          error={lockError}
          onSubmit={(c) => void unlock(c, Date.now(), false)}
        />
      </div>
    )
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
            {source === 'server'
              ? '● 서버 반영'
              : supabaseEnabled()
                ? '○ 이 코드로 저장된 보드 없음'
                : '○ 로컬 전용(Supabase 미설정)'}
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
          <button onClick={lock} title="코드 입력 화면으로">🔒 잠금</button>
        </div>
        {error && <p className="gvgError">불러오기 오류: {error}</p>}
      </header>

      {source === 'empty' && !editing && (
        <div className="gvgNotice">
          이 코드로 저장된 보드가 없습니다. 코드를 잘못 입력했다면 <b>잠금</b> 후 다시 입력하세요.
          맞다면 아래에서 새로 만들 수 있습니다.
          <button onClick={() => void loadSeed()}>초기 데이터 불러오기</button>
        </div>
      )}

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
          editor={editor}
          note={note}
          saving={saving}
          saveMsg={saveMsg}
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
        코드를 아는 사람만 열람·수정할 수 있습니다. 내용은 브라우저에서 암호화된 뒤 저장되므로 서버에는
        암호문만 남고, 저장 시 편집자 이름과 시각이 로그로 기록됩니다.
        순위 칸은 포인트 기준 자동 계산되며, 편집 중 순위 칸에 값을 직접 넣으면 그 값으로 보정됩니다(비우면 자동).
      </p>
    </div>
  )
}

function GvgLock(props: { busy: boolean; error: string; onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim()) props.onSubmit(code.trim())
  }
  return (
    <div className="gvgLock">
      <div className="gvgLockBox">
        <div className="gvgLockIcon" aria-hidden="true">
          🔒
        </div>
        <h1 className="gvgLockTitle">길드전 리더보드</h1>
        <p className="gvgLockDesc">
          공용 코드를 아는 사람만 열람·수정할 수 있습니다. 길드에서 받은 코드를 입력하세요.
        </p>
        <form className="gvgLockForm" onSubmit={submit}>
          <input
            className="gvgLockInput"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="공용 코드"
            autoComplete="off"
            autoFocus
            aria-label="공용 코드"
          />
          <button className="gvgLockBtn" type="submit" disabled={props.busy || !code.trim()}>
            {props.busy ? '확인 중…' : '입장'}
          </button>
        </form>
        {props.error && (
          <p className="gvgLockError" role="alert">
            {props.error}
          </p>
        )}
        <p className="gvgLockHint">한 번 입장하면 이 기기에서 1일간 유지됩니다.</p>
      </div>
    </div>
  )
}

function EditorBar(props: {
  editor: string
  note: string
  saving: boolean
  saveMsg: string | null
  onEditor: (v: string) => void
  onNote: (v: string) => void
  onSave: () => void
}) {
  return (
    <div className="gvgEditorBar">
      <div className="row">
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
