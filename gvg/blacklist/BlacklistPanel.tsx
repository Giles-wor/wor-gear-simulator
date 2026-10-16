// 운영진 전용 블랙리스트. 리더보드 공용 코드와 별개인 운영진 코드로 열고, 내용은 그 코드로 암호화되어
// 서버에는 암호문만 남는다. 운영진 코드는 이 탭(sessionStorage)에만 기억하고 탭을 닫으면 잊는다.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { decryptJson, encryptJson } from '../crypto'
import { newId } from '../board'
import {
  ConflictError,
  isLeaderboardCode,
  listIdFromCode,
  loadList,
  loadLog,
  saveList,
  supabaseEnabled,
} from './api'
import { cleanNames, emptyList, findByUid, matches, parsePasted, sortEntries } from './list'
import type { Blacklist, BlacklistAction, BlacklistEntry, BlacklistLog, NameRecord } from './types'

const SESSION_KEY = 'gvgBlacklistCode'
const EDITOR_KEY = 'gvgEditor'

const ACTION_LABEL: Record<BlacklistAction, string> = {
  add: '추가',
  edit: '수정',
  delete: '휴지통으로',
  restore: '복구',
  rekey: '코드 변경',
}

/** 로컬 날짜 YYYY-MM-DD */
function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function readSession(): string {
  try {
    return sessionStorage.getItem(SESSION_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeSession(code: string) {
  try {
    if (code) sessionStorage.setItem(SESSION_KEY, code)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* 이번 화면에서는 그대로 사용 */
  }
}

type Draft = {
  /** 수정 중인 항목 id. 새 항목이면 null */
  id: string | null
  uid: string
  names: NameRecord[]
  reason: string
}

function draftFrom(e?: BlacklistEntry): Draft {
  return e
    ? { id: e.id, uid: e.uid, names: clone(e.names), reason: e.reason }
    : { id: null, uid: '', names: [{ name: '', seenAt: today() }], reason: '' }
}

export function BlacklistPanel() {
  const [code, setCode] = useState('')
  const [listId, setListId] = useState('')
  const [list, setList] = useState<Blacklist | null>(null)
  const [serverAt, setServerAt] = useState<string | null>(null)
  const [log, setLog] = useState<BlacklistLog[]>([])
  const [busy, setBusy] = useState(false)
  const [lockError, setLockError] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [showRekey, setShowRekey] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editor, setEditor] = useState(() => {
    try {
      return localStorage.getItem(EDITOR_KEY) ?? ''
    } catch {
      return ''
    }
  })

  const readLog = useCallback(async (c: string, id: string): Promise<BlacklistLog[]> => {
    try {
      const rows = await loadLog(id)
      const out: BlacklistLog[] = []
      for (const r of rows) {
        try {
          const e = await decryptJson<Omit<BlacklistLog, 'at'>>(c, id, r.blob)
          out.push({ ...e, at: r.at })
        } catch {
          /* 다른 코드로 남은 줄 → 건너뜀 */
        }
      }
      return out
    } catch {
      return []
    }
  }, [])

  /** 서버 최신본을 받아 복호화. 없으면 빈 목록. 코드가 틀리면 throw. */
  const fetchLatest = useCallback(async (c: string, id: string) => {
    const row = await loadList(id)
    if (!row) return { list: emptyList(), at: null as string | null }
    let l: Blacklist
    try {
      l = await decryptJson<Blacklist>(c, id, row.blob)
    } catch {
      throw new Error('코드가 올바르지 않습니다. 다시 확인해 주세요.')
    }
    return { list: l, at: row.updatedAt }
  }, [])

  const lock = useCallback(() => {
    writeSession('')
    setCode('')
    setListId('')
    setList(null)
    setServerAt(null)
    setLog([])
    setDraft(null)
    setError(null)
  }, [])

  const unlock = useCallback(
    async (c: string, silent: boolean) => {
      setBusy(true)
      setLockError('')
      try {
        if (!supabaseEnabled()) throw new Error('Supabase 미설정이라 블랙리스트를 쓸 수 없습니다.')
        if (await isLeaderboardCode(c)) {
          throw new Error('리더보드 공용 코드와 같은 코드는 쓸 수 없습니다. 운영진 전용 코드를 따로 정해 주세요.')
        }
        const id = await listIdFromCode(c)
        const { list: l, at } = await fetchLatest(c, id)
        setCode(c)
        setListId(id)
        setList(l)
        setServerAt(at)
        writeSession(c)
        setLog(await readLog(c, id))
      } catch (e) {
        writeSession('')
        if (!silent) setLockError(e instanceof Error ? e.message : '입장 실패')
      } finally {
        setBusy(false)
      }
    },
    [fetchLatest, readLog],
  )

  useEffect(() => {
    const c = readSession()
    if (c) void unlock(c, true)
  }, [unlock])

  const refresh = async () => {
    if (!code) return
    setBusy(true)
    setError(null)
    try {
      const { list: l, at } = await fetchLatest(code, listId)
      setList(l)
      setServerAt(at)
      setLog(await readLog(code, listId))
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 오류')
    } finally {
      setBusy(false)
    }
  }

  /**
   * 변경 하나를 저장. 다른 운영진이 그 사이 저장했으면 최신본을 받아 같은 변경을 다시 적용해 한 번 더 시도한다.
   * apply 는 목록을 직접 고치고, 진행할 수 없으면 오류 문구를 돌려준다.
   */
  const commit = async (
    action: BlacklistAction,
    uid: string,
    apply: (l: Blacklist) => string | void,
  ): Promise<boolean> => {
    if (!list) return false
    const who = editor.trim()
    if (!who) {
      setError('편집자 이름을 입력하세요(로그에 남습니다).')
      return false
    }
    setBusy(true)
    setError(null)
    try {
      let base = { list, at: serverAt }
      for (let attempt = 0; attempt < 2; attempt++) {
        const next = clone(base.list)
        const err = apply(next)
        if (err) throw new Error(err)
        const blob = await encryptJson(code, listId, next)
        const logBlob = await encryptJson(code, listId, { editor: who, action, uid })
        try {
          const at = await saveList(listId, code, blob, logBlob, base.at)
          try {
            localStorage.setItem(EDITOR_KEY, who)
          } catch {
            /* ignore */
          }
          setList(next)
          setServerAt(at)
          setLog(await readLog(code, listId))
          return true
        } catch (e) {
          if (!(e instanceof ConflictError) || attempt === 1) throw e
          base = await fetchLatest(code, listId)
        }
      }
      return false
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
      return false
    } finally {
      setBusy(false)
    }
  }

  const openDraft = (d: Draft) => {
    setError(null)
    setDraft(d)
  }
  const closeDraft = () => {
    setError(null)
    setDraft(null)
  }

  const saveDraft = async () => {
    if (!draft || !list) return
    const uid = draft.uid.trim()
    const names = cleanNames(draft.names)
    const reason = draft.reason.trim()
    if (!uid) return setError('고유 ID를 입력하세요.')
    if (!reason) return setError('사유를 입력하세요.')
    const who = editor.trim()
    const d = today()
    const isNew = draft.id === null
    const id = draft.id ?? newId('b')
    const ok = await commit(isNew ? 'add' : 'edit', uid, (l) => {
      const dup = findByUid(l, uid, id)
      if (dup) {
        return dup.deletedAt
          ? `같은 고유 ID(${uid})가 휴지통에 있습니다. 휴지통에서 복구해 수정하세요.`
          : `같은 고유 ID(${uid})가 이미 등록되어 있습니다. 그 항목을 수정하세요.`
      }
      if (isNew) {
        l.entries.push({ id, uid, names, reason, addedBy: who, addedAt: d })
        return
      }
      const e = l.entries.find((x) => x.id === id)
      if (!e) return '다른 운영진이 이 항목을 지웠습니다. 새로고침해 확인하세요.'
      Object.assign(e, { uid, names, reason, updatedBy: who, updatedAt: d })
    })
    if (ok) setDraft(null)
  }

  const setDeleted = (e: BlacklistEntry, del: boolean) => {
    if (del && !window.confirm(`${e.uid} 항목을 휴지통으로 옮길까요? (휴지통에서 복구할 수 있습니다)`)) return
    void commit(del ? 'delete' : 'restore', e.uid, (l) => {
      const t = l.entries.find((x) => x.id === e.id)
      if (!t) return '이미 없는 항목입니다. 새로고침해 확인하세요.'
      if (del) {
        t.deletedAt = today()
        t.deletedBy = editor.trim()
      } else {
        const dup = findByUid(l, t.uid, t.id)
        if (dup && !dup.deletedAt) return `같은 고유 ID(${t.uid})가 이미 목록에 있어 복구할 수 없습니다.`
        delete t.deletedAt
        delete t.deletedBy
      }
    })
  }

  const rekey = async (newCode: string) => {
    if (!list) return
    const who = editor.trim()
    if (!who) return setError('편집자 이름을 입력하세요(로그에 남습니다).')
    if (newCode === code) return setError('지금 코드와 같습니다.')
    setBusy(true)
    setError(null)
    try {
      if (await isLeaderboardCode(newCode)) throw new Error('리더보드 공용 코드와 같은 코드는 쓸 수 없습니다.')
      const id = await listIdFromCode(newCode)
      if (await loadList(id)) throw new Error('그 코드로 이미 저장된 목록이 있습니다. 다른 코드를 정하세요.')
      const latest = await fetchLatest(code, listId)
      const blob = await encryptJson(newCode, id, latest.list)
      const logBlob = await encryptJson(newCode, id, { editor: who, action: 'rekey' })
      const at = await saveList(id, newCode, blob, logBlob, null)
      writeSession(newCode)
      setCode(newCode)
      setListId(id)
      setList(latest.list)
      setServerAt(at)
      setLog(await readLog(newCode, id))
      setShowRekey(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '코드 변경 실패')
    } finally {
      setBusy(false)
    }
  }

  /** 붙여넣은 여러 줄을 한 번에 추가. 이미 있는 고유 ID(휴지통 포함)와 붙여넣기 안 중복은 건너뛴다. */
  const importRows = async (text: string): Promise<boolean> => {
    const rows = parsePasted(text, editor.trim(), today(), () => newId('b'))
    if (rows.length === 0) {
      setError('추가할 줄이 없습니다. 첫 칸에 고유 ID가 있어야 합니다.')
      return false
    }
    let added = 0
    const ok = await commit('add', `붙여넣기 ${rows.length}줄`, (l) => {
      added = 0
      for (const r of rows) {
        if (findByUid(l, r.uid)) continue
        l.entries.push(r)
        added++
      }
      if (added === 0) return '붙여넣은 고유 ID가 모두 이미 등록되어 있습니다.'
    })
    if (ok) {
      setShowImport(false)
      if (added < rows.length) setError(`${added}건 추가, ${rows.length - added}건은 이미 있는 고유 ID라 건너뛰었습니다.`)
    }
    return ok
  }

  const shown = useMemo(() => {
    if (!list) return []
    return sortEntries(list.entries.filter((e) => !!e.deletedAt === showTrash && matches(e, query)))
  }, [list, query, showTrash])

  const counts = useMemo(() => {
    const all = list?.entries ?? []
    const trash = all.filter((e) => e.deletedAt).length
    return { active: all.length - trash, trash }
  }, [list])

  if (!code || !list) {
    return <BlacklistLock busy={busy} error={lockError} onSubmit={(c) => void unlock(c, false)} />
  }

  return (
    <section className="blPanel">
      <div className="blHead">
        <h2>🚫 블랙리스트 <span className="muted">운영진 전용</span></h2>
        <div className="gvgActions">
          <button onClick={() => void refresh()} disabled={busy}>새로고침</button>
          <button className="primary" onClick={() => openDraft(draftFrom())} disabled={busy || !!draft}>
            + 추가
          </button>
          <button onClick={() => setShowImport((v) => !v)} disabled={busy}>📋 붙여넣기</button>
          <button onClick={() => setShowLog((v) => !v)}>{showLog ? '로그 닫기' : '편집 로그'}</button>
          <button onClick={() => setShowRekey((v) => !v)}>코드 변경</button>
          <button onClick={lock} title="운영진 코드 다시 묻기">🔒 잠금</button>
        </div>
      </div>

      <div className="blToolbar">
        <input
          className="blSearch"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="고유 ID · 닉네임(옛 닉 포함) · 사유 검색"
          aria-label="검색"
        />
        <div className="blTabs" role="tablist">
          <button role="tab" aria-selected={!showTrash} className={!showTrash ? 'on' : ''} onClick={() => setShowTrash(false)}>
            목록 {counts.active}
          </button>
          <button role="tab" aria-selected={showTrash} className={showTrash ? 'on' : ''} onClick={() => setShowTrash(true)}>
            휴지통 {counts.trash}
          </button>
        </div>
        <label className="blEditor">
          편집자
          <input
            value={editor}
            onChange={(e) => setEditor(e.target.value)}
            placeholder="로그에 남을 이름"
            autoComplete="off"
          />
        </label>
      </div>

      {error && <p className="gvgError" role="alert">{error}</p>}

      {showImport && (
        <ImportForm busy={busy} onSubmit={(t) => void importRows(t)} onCancel={() => setShowImport(false)} />
      )}

      {showRekey && <RekeyForm busy={busy} onSubmit={(c) => void rekey(c)} onCancel={() => setShowRekey(false)} />}

      {showLog && (
        <section className="gvgLog">
          <h2>편집 로그</h2>
          {log.length === 0 ? (
            <p className="muted">기록이 없습니다.</p>
          ) : (
            <ul>
              {log.map((l, i) => (
                <li key={i}>
                  <b>{l.editor}</b> · {ACTION_LABEL[l.action] ?? l.action}
                  {l.uid ? ` · ${l.uid}` : ''} · {new Date(l.at).toLocaleString('ko-KR')}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {draft && draft.id === null && (
        <EntryForm draft={draft} busy={busy} onChange={setDraft} onSave={() => void saveDraft()} onCancel={closeDraft} />
      )}

      {shown.length === 0 ? (
        <p className="muted blEmpty">
          {query ? '검색 결과가 없습니다.' : showTrash ? '휴지통이 비어 있습니다.' : '등록된 항목이 없습니다.'}
        </p>
      ) : (
        <ul className="blList">
          {shown.map((e) =>
            draft && draft.id === e.id ? (
              <li key={e.id}>
                <EntryForm draft={draft} busy={busy} onChange={setDraft} onSave={() => void saveDraft()} onCancel={closeDraft} />
              </li>
            ) : (
              <li key={e.id} className="blItem">
                <div className="blItemTop">
                  <span className="blUid">{e.uid}</span>
                  <span className="blName">{e.names[0]?.name ?? '(닉네임 없음)'}</span>
                  <span className="blBtns">
                    {e.deletedAt ? (
                      <button className="miniBtn" disabled={busy} onClick={() => setDeleted(e, false)}>복구</button>
                    ) : (
                      <>
                        <button className="miniBtn" disabled={busy || !!draft} onClick={() => openDraft(draftFrom(e))}>수정</button>
                        <button className="miniBtn danger" disabled={busy} onClick={() => setDeleted(e, true)}>삭제</button>
                      </>
                    )}
                  </span>
                </div>
                <p className="blReason">{e.reason}</p>
                {e.names.length > 0 && (
                  <ol className="blNames">
                    {e.names.map((n, i) => (
                      <li key={i}>
                        {n.name} <span className="muted">{n.seenAt}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="blMeta muted">
                  {e.addedAt} {e.addedBy} 추가
                  {e.updatedAt && ` · ${e.updatedAt} ${e.updatedBy ?? ''} 수정`}
                  {e.deletedAt && ` · ${e.deletedAt} ${e.deletedBy ?? ''} 삭제`}
                </p>
              </li>
            ),
          )}
        </ul>
      )}

      <p className="gvgHelp">
        운영진 코드를 아는 사람만 볼 수 있습니다. 리더보드 공용 코드로는 열리지 않고, 내용은 운영진 코드로 암호화되어
        서버에는 암호문만 남습니다. 운영진 코드는 이 탭에만 기억되며 탭을 닫으면 다시 물어봅니다.
        인게임 고유 ID·닉네임 외의 개인정보는 적지 말고, 사유는 사실 위주로 짧게 남겨 주세요.
      </p>
    </section>
  )
}

function EntryForm(props: {
  draft: Draft
  busy: boolean
  onChange: (d: Draft) => void
  onSave: () => void
  onCancel: () => void
}) {
  const { draft, busy, onChange } = props
  const set = (fn: (d: Draft) => void) => {
    const next = clone(draft)
    fn(next)
    onChange(next)
  }
  return (
    <div className="blForm">
      <label>
        고유 ID
        <input
          value={draft.uid}
          onChange={(e) => set((d) => (d.uid = e.target.value))}
          placeholder="인게임 고유 ID"
          autoComplete="off"
          autoFocus
        />
      </label>
      <div className="blFormNames">
        <span>확인된 닉네임 (닉을 바꾸면 새 줄로 추가)</span>
        {draft.names.map((n, i) => (
          <div className="blNameRow" key={i}>
            <input
              value={n.name}
              onChange={(e) => set((d) => (d.names[i].name = e.target.value))}
              placeholder="닉네임"
              autoComplete="off"
            />
            <input
              type="date"
              value={n.seenAt}
              onChange={(e) => set((d) => (d.names[i].seenAt = e.target.value))}
              aria-label="확인한 날짜"
            />
            <button className="miniBtn danger" title="이 줄 삭제" onClick={() => set((d) => d.names.splice(i, 1))}>
              ×
            </button>
          </div>
        ))}
        <button className="miniBtn" onClick={() => set((d) => d.names.unshift({ name: '', seenAt: today() }))}>
          + 닉네임 추가
        </button>
      </div>
      <label>
        사유
        <textarea
          value={draft.reason}
          onChange={(e) => set((d) => (d.reason = e.target.value))}
          placeholder="있었던 일을 사실 위주로 짧게"
          rows={3}
        />
      </label>
      <div className="blFormBtns">
        <button className="primary" onClick={props.onSave} disabled={busy}>
          {busy ? '저장 중…' : '저장'}
        </button>
        <button onClick={props.onCancel} disabled={busy}>취소</button>
      </div>
    </div>
  )
}

function ImportForm(props: { busy: boolean; onSubmit: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('')
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length
  return (
    <div className="blForm">
      <p className="muted">
        엑셀에서 여러 줄을 복사해 그대로 붙여넣으세요. 칸 순서는 <b>고유 ID · 서버 · 닉네임 · 길드 · 사유</b>이고,
        사유 뒤 칸은 사유에 이어 붙입니다. 서버·길드는 사유 끝 괄호에 남고, 닉네임 확인 날짜는 오늘로 들어갑니다.
        이미 있는 고유 ID는 건너뜁니다. 칸은 탭 대신 <code>|</code> 로 나눠도 됩니다.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={'9427630\t70055\t닉네임\t길드\t사유'}
        aria-label="붙여넣을 줄"
      />
      <div className="blFormBtns">
        <button className="primary" onClick={() => props.onSubmit(text)} disabled={props.busy || lines === 0}>
          {props.busy ? '저장 중…' : `${lines}줄 추가`}
        </button>
        <button onClick={props.onCancel} disabled={props.busy}>취소</button>
      </div>
    </div>
  )
}

function RekeyForm(props: { busy: boolean; onSubmit: (code: string) => void; onCancel: () => void }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (a.trim() && a.trim() === b.trim()) props.onSubmit(a.trim())
  }
  return (
    <form className="blForm" onSubmit={submit}>
      <p className="muted">
        운영진이 바뀌었을 때 씁니다. 지금 목록을 새 코드로 다시 암호화해 저장하고, 이후엔 새 코드로만 열립니다.
        옛 코드로 저장된 사본은 서버에 남으니 필요 없으면 SQL Editor 에서 지우세요(blacklist-setup.sql 맨 아래).
      </p>
      <input type="password" value={a} onChange={(e) => setA(e.target.value)} placeholder="새 운영진 코드" autoComplete="off" />
      <input type="password" value={b} onChange={(e) => setB(e.target.value)} placeholder="새 운영진 코드 확인" autoComplete="off" />
      {b && a !== b && <p className="gvgError">두 코드가 다릅니다.</p>}
      <div className="blFormBtns">
        <button className="primary" type="submit" disabled={props.busy || !a.trim() || a !== b}>바꾸기</button>
        <button type="button" onClick={props.onCancel}>취소</button>
      </div>
    </form>
  )
}

function BlacklistLock(props: { busy: boolean; error: string; onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim()) props.onSubmit(code.trim())
  }
  return (
    <div className="gvgLock">
      <div className="gvgLockBox">
        <div className="gvgLockIcon" aria-hidden="true">🚫</div>
        <h1 className="gvgLockTitle">블랙리스트</h1>
        <p className="gvgLockDesc">
          운영진 전용입니다. 리더보드 공용 코드와는 다른 <b>운영진 코드</b>를 입력하세요.
          처음 쓰는 코드라면 빈 목록이 열리고, 첫 항목을 저장할 때 그 코드로 만들어집니다.
        </p>
        <form className="gvgLockForm" onSubmit={submit}>
          <input
            className="gvgLockInput"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="운영진 코드"
            autoComplete="off"
            autoFocus
            aria-label="운영진 코드"
          />
          <button className="gvgLockBtn" type="submit" disabled={props.busy || !code.trim()}>
            {props.busy ? '확인 중…' : '열기'}
          </button>
        </form>
        {props.error && <p className="gvgLockError" role="alert">{props.error}</p>}
        <p className="gvgLockHint">이 탭을 닫으면 다시 물어봅니다.</p>
      </div>
    </div>
  )
}
