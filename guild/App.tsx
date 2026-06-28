import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { GlobalNav } from './components/GlobalNav'
import { SiteCredit } from './components/SiteCredit'
import { ResponsiveTable, cellOf, titleColIndex } from './components/ResponsiveTable'
import { ContentEditor } from './components/ContentEditor'
import { decryptContent, encryptContent, guildIdFromCode } from './crypto'
import { ensureSoldierTable, soldierIcon, SOLDIERS, SOLDIER_TABLE_TITLE } from './soldiers'
import { migrateMainTable, MAIN_HEADERS } from './migrate'
import { parseNum } from './thresholds'
import { loadRemoteBlob, saveRemoteBlob, supabaseEnabled, LEGACY_ID } from './supabase'
import { mergeMemberChanges } from './merge'
import type { EncryptedBlob, GuildContent, GuildTable } from './types'
import bundledBlob from './data/content.encrypted.json'

const SEED = bundledBlob as EncryptedBlob
const UNLOCK_KEY = 'guildUnlock'
const UNLOCK_TTL = 24 * 60 * 60 * 1000 // 잠금 해제 유효기간: 1일(이후 코드 재입력)
const LOCAL_BLOB = 'guildContentBlob' // 길드별로 :<guildId> 붙여 저장

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
    /* noop */
  }
}

function clearUnlock() {
  try {
    localStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* noop */
  }
}

function readLocalBlob(guildId: string): EncryptedBlob | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_BLOB}:${guildId}`)
    return raw ? (JSON.parse(raw) as EncryptedBlob) : null
  } catch {
    return null
  }
}

function writeLocalBlob(guildId: string, blob: EncryptedBlob) {
  try {
    localStorage.setItem(`${LOCAL_BLOB}:${guildId}`, JSON.stringify(blob))
  } catch {
    /* noop */
  }
}

/** 데이터가 전혀 없는 새 길드용 빈 틀. */
function freshContent(): GuildContent {
  return {
    updatedAt: new Date().toISOString().slice(0, 10),
    notice: '',
    tables: [{ title: '극한 도전 진행 현황', note: '', headers: [...MAIN_HEADERS], rows: [] }],
    images: [],
    links: [],
  }
}

function prepare(content: GuildContent): GuildContent {
  return ensureSoldierTable({ ...content, tables: content.tables.map(migrateMainTable) })
}

/**
 * 멀티길드: 코드의 해시(guildId)로 그 길드 데이터를 찾는다.
 * 원격(guildId) → 원격(레거시 main) → 로컬(guildId) → 번들 시드 순으로 코드 복호화 시도,
 * 처음 성공한 콘텐츠 반환. 전부 실패하면 = 새 길드 → 빈 틀.
 */
async function loadExisting(code: string, guildId: string): Promise<GuildContent | null> {
  const candidates: EncryptedBlob[] = []
  if (supabaseEnabled()) {
    try {
      const remote = await loadRemoteBlob(guildId)
      if (remote) candidates.push(remote)
    } catch {
      /* 네트워크 실패 → 폴백 */
    }
    try {
      const legacy = await loadRemoteBlob(LEGACY_ID)
      if (legacy) candidates.push(legacy)
    } catch {
      /* noop */
    }
  }
  const local = readLocalBlob(guildId)
  if (local) candidates.push(local)
  candidates.push(SEED)

  for (const blob of candidates) {
    try {
      return prepare(await decryptContent(code, blob))
    } catch {
      /* 이 코드로 복호화 안 되는 블록 → 다음 후보 */
    }
  }
  return null
}

async function loadContent(code: string, guildId: string): Promise<GuildContent> {
  // 데이터 없으면 = 새(또는 비어있는) 길드 → 빈 틀
  return (await loadExisting(code, guildId)) ?? prepare(freshContent())
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])
  return (
    <div className="leakOverlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="leakOverlayBox" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="leakOverlayClose" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <img className="leakOverlayImg" src={src} alt={alt} />
      </div>
    </div>
  )
}

function LockScreen({
  onSubmit,
  busy,
  error,
  onMigrate,
}: {
  onSubmit: (code: string) => void
  busy: boolean
  error: string
  onMigrate: (oldCode: string, newCode: string) => Promise<string | null>
}) {
  const [code, setCode] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim()) onSubmit(code.trim())
  }

  // 코드 이전 폼
  const [migOpen, setMigOpen] = useState(false)
  const [oldCode, setOldCode] = useState('')
  const [newCode, setNewCode] = useState('')
  const [migBusy, setMigBusy] = useState(false)
  const [migErr, setMigErr] = useState('')
  const doMigrate = async (e: FormEvent) => {
    e.preventDefault()
    setMigBusy(true)
    setMigErr('')
    const err = await onMigrate(oldCode, newCode)
    if (err) {
      setMigErr(err)
      setMigBusy(false)
    }
    // 성공 시 App 이 새 코드로 입장 → 이 컴포넌트 언마운트
  }

  return (
    <div className="guildLock">
      <div className="guildLockBox">
        <div className="guildLockIcon" aria-hidden="true">
          🔒
        </div>
        <h1 className="guildLockTitle">길드원 전용</h1>
        <p className="guildLockDesc">
          이 페이지는 <strong>Time 길드</strong> 길드원만 볼 수 있습니다. 길드에서 받은 코드를 입력하세요.
        </p>
        <form className="guildLockForm" onSubmit={submit}>
          <input
            className="guildLockInput"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="잠금 코드"
            autoComplete="off"
            autoFocus
            aria-label="잠금 코드"
          />
          <button className="guildLockBtn" type="submit" disabled={busy || !code.trim()}>
            {busy ? '확인 중…' : '입장'}
          </button>
        </form>
        {error && (
          <p className="guildLockError" role="alert">
            {error}
          </p>
        )}
        <p className="guildLockHint">코드는 길드 카카오톡에서 안내받을 수 있어요.</p>

        <button type="button" className="guildMigToggle" onClick={() => setMigOpen((v) => !v)}>
          🔁 코드 변경(이전){migOpen ? ' ▲' : ' ▼'}
        </button>
        {migOpen && (
          <form className="guildMigForm" onSubmit={doMigrate}>
            <p className="guildMigDesc">
              이전 코드의 모든 내용을 새 코드로 <b>복사</b>합니다. 이후 새 코드로 작업한 건 이전 코드엔 반영되지
              않아요(나간 사람은 옛 코드로 더 못 봄).
            </p>
            <input
              className="guildLockInput"
              type="text"
              value={oldCode}
              onChange={(e) => setOldCode(e.target.value)}
              placeholder="이전 코드"
              autoComplete="off"
              aria-label="이전 코드"
            />
            <input
              className="guildLockInput"
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="새 코드"
              autoComplete="off"
              aria-label="새 코드"
            />
            <button className="guildLockBtn" type="submit" disabled={migBusy || !oldCode.trim() || !newCode.trim()}>
              {migBusy ? '이전 중…' : '이전하기'}
            </button>
            {migErr && (
              <p className="guildLockError" role="alert">
                {migErr}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

/** 마병 표에서 멤버별 레벨 맵 추출. */
function buildSoldierLevels(soldierTable?: GuildTable): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>()
  if (!soldierTable) return map
  const tc = titleColIndex(soldierTable.headers)
  soldierTable.rows.forEach((r) => {
    const name = cellOf(r[tc] ?? '').v
    const lv: Record<string, string> = {}
    soldierTable.headers.forEach((h, ci) => {
      if (ci !== tc) lv[h] = cellOf(r[ci] ?? '').v
    })
    map.set(name, lv)
  })
  return map
}

/** 길드원 패널 안에 들어가는 마병 한 줄 strip(아이콘 + 레벨, 끝에 계). */
function MarStrip({ levels }: { levels?: Record<string, string> }) {
  const sum = SOLDIERS.reduce((acc, s) => acc + (parseNum(levels?.[s] ?? '') ?? 0), 0)
  return (
    <div className="marStrip">
      {SOLDIERS.map((s) => {
        const icon = soldierIcon(s)
        const v = (levels?.[s] ?? '').trim()
        return (
          <span key={s} className="marItem" title={s}>
            {icon ? (
              <img src={icon} alt={s} loading="lazy" />
            ) : (
              <span className="marAbbr">{s.slice(0, 3)}</span>
            )}
            <b className={v === '' ? 'marLv empty' : 'marLv'}>{v === '' ? '0' : v}</b>
          </span>
        )
      })}
      <span className="marSum">계 {sum}</span>
    </div>
  )
}

function ReadView({
  content,
  onShot,
  onEditMember,
}: {
  content: GuildContent
  onShot: (src: string, alt: string) => void
  onEditMember: (name: string) => void
}) {
  const soldierTable = content.tables.find((t) => t.title === SOLDIER_TABLE_TITLE)
  const levels = buildSoldierLevels(soldierTable)
  // 마병 표는 별도 표로 보여주지 않고, 각 멤버 패널 안에 strip 으로 삽입.
  const tables = content.tables.filter((t) => t.title !== SOLDIER_TABLE_TITLE)
  const marExtra = soldierTable
    ? (name: string) => <MarStrip levels={levels.get(name)} />
    : undefined

  return (
    <>
      <section className="guildBlock">
        <h2 className="guildBlockTitle">📢 공지</h2>
        {content.notice.trim() ? (
          <p className="guildNotice">{content.notice}</p>
        ) : (
          <p className="guildEmpty">아직 등록된 공지가 없습니다.</p>
        )}
      </section>

      {tables.length > 0 ? (
        tables.map((table, ti) => (
          <section className="guildBlock guildTableBlock" key={ti}>
            <h2 className="guildBlockTitle">📊 {table.title || '진행 현황'}</h2>
            <ResponsiveTable
              table={table}
              fallbackDate={content.updatedAt}
              headerIcon={soldierIcon}
              memberExtra={marExtra}
              onMemberClick={onEditMember}
            />
            {table.note && <p className="guildTableNote">{table.note}</p>}
          </section>
        ))
      ) : (
        <section className="guildBlock">
          <h2 className="guildBlockTitle">📊 진행 현황</h2>
          <p className="guildEmpty">아직 등록된 표가 없습니다.</p>
        </section>
      )}

      <section className="guildBlock">
        <h2 className="guildBlockTitle">🖼️ 이미지</h2>
        {content.images.length > 0 ? (
          <div className="guildImages">
            {content.images.map((im, ii) => (
              <figure key={ii} className="guildImageFig">
                <button
                  type="button"
                  className="guildImageThumb"
                  onClick={() => onShot(im.src, im.caption || `길드 이미지 ${ii + 1}`)}
                >
                  <img src={im.src} alt={im.caption || `길드 이미지 ${ii + 1}`} loading="lazy" />
                  <span className="leakShotHint">🔍 크게 보기</span>
                </button>
                {im.caption && <figcaption className="guildImageCap">{im.caption}</figcaption>}
              </figure>
            ))}
          </div>
        ) : (
          <p className="guildEmpty">아직 등록된 이미지가 없습니다.</p>
        )}
      </section>

      <section className="guildBlock">
        <h2 className="guildBlockTitle">🔗 링크 모음</h2>
        {content.links.length > 0 ? (
          <ul className="guildLinks">
            {content.links.map((lk, li) => (
              <li key={li}>
                <a href={lk.url} target="_blank" rel="noopener noreferrer">
                  {lk.label || lk.url}
                </a>
                {lk.desc && <span className="guildLinkDesc"> — {lk.desc}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="guildEmpty">아직 등록된 링크가 없습니다.</p>
        )}
      </section>
    </>
  )
}

export default function App() {
  const [content, setContent] = useState<GuildContent | null>(null)
  const [code, setCode] = useState('')
  const [guildId, setGuildId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editMember, setEditMember] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [status, setStatus] = useState('')
  const [shot, setShot] = useState<{ src: string; alt: string } | null>(null)
  const statusTimer = useRef<number | undefined>(undefined)
  const lockTimer = useRef<number | undefined>(undefined)

  const flashStatus = useCallback((msg: string) => {
    setStatus(msg)
    window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setStatus(''), 4000)
  }, [])

  const lock = useCallback(() => {
    window.clearTimeout(lockTimer.current)
    setContent(null)
    setCode('')
    setGuildId('')
    setEditing(false)
    setError('')
    clearUnlock()
  }, [])

  // ts = 잠금 해제 기준 시각(수동 입력=지금, 자동복원=저장된 시각). ts+1일에 자동 잠금.
  const tryUnlock = useCallback(
    async (c: string, ts: number, silent: boolean) => {
      setBusy(true)
      setError('')
      try {
        const id = await guildIdFromCode(c)
        const data = await loadContent(c, id)
        setContent(data)
        setCode(c)
        setGuildId(id)
        writeUnlock(c, ts)
        window.clearTimeout(lockTimer.current)
        lockTimer.current = window.setTimeout(lock, Math.max(0, ts + UNLOCK_TTL - Date.now()))
      } catch {
        clearUnlock()
        if (!silent) setError('코드가 올바르지 않습니다. 다시 확인해 주세요.')
      } finally {
        setBusy(false)
      }
    },
    [lock],
  )

  // 1일 이내 해제 기록이 있으면 자동 입장, 아니면 코드 재입력.
  useEffect(() => {
    const u = readUnlock()
    if (u && Date.now() - u.ts < UNLOCK_TTL) void tryUnlock(u.code, u.ts, true)
    else clearUnlock()
  }, [tryUnlock])

  const handleSave = useCallback(
    async (next: GuildContent) => {
      setSaving(true)
      setSaveError('')
      try {
        let toSave = next
        if (supabaseEnabled()) {
          // 동시 편집 데이터 손실 방지: 저장 직전 최신 원격을 다시 받아,
          // 내가 건드린 멤버만 병합한다. 원격을 못 받으면 빈/오래된 값으로 덮어쓰지 않도록 저장 취소.
          let latest: GuildContent | null = null
          try {
            const remote = await loadRemoteBlob(guildId)
            if (remote) latest = prepare(await decryptContent(code, remote))
          } catch {
            setSaveError('네트워크 문제로 저장을 취소했어요. 잠시 후 다시 시도해 주세요.')
            setSaving(false)
            return
          }
          if (latest && content) toSave = mergeMemberChanges(latest, content, next)
        }
        const blob = await encryptContent(code, toSave)
        if (supabaseEnabled()) await saveRemoteBlob(blob, code, guildId)
        writeLocalBlob(guildId, blob)
        setContent(toSave)
        setEditing(false)
        flashStatus(supabaseEnabled() ? '저장됨 · 전 길드원에게 반영됩니다' : '이 브라우저에 저장됨')
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : '저장에 실패했습니다.')
      } finally {
        setSaving(false)
      }
    },
    [code, guildId, content, flashStatus],
  )

  // 코드 이전: 이전 코드 내용을 새 코드로 복사(별도 행). 성공 시 새 코드로 자동 입장.
  // 반환: 에러 문자열(있으면) / null(성공).
  const migrateCode = useCallback(
    async (oldCode: string, newCode: string): Promise<string | null> => {
      if (!oldCode.trim() || !newCode.trim()) return '이전 코드와 새 코드를 모두 입력하세요.'
      const oldId = await guildIdFromCode(oldCode)
      const newId = await guildIdFromCode(newCode)
      if (oldId === newId) return '이전 코드와 새 코드가 같습니다.'
      const data = await loadExisting(oldCode, oldId)
      if (!data) return '이전 코드의 데이터를 찾을 수 없습니다. (코드 확인)'
      try {
        const blob = await encryptContent(newCode, data)
        if (supabaseEnabled()) await saveRemoteBlob(blob, newCode, newId)
        writeLocalBlob(newId, blob)
      } catch (e) {
        return e instanceof Error ? e.message : '이전 저장에 실패했습니다.'
      }
      await tryUnlock(newCode, Date.now(), false)
      flashStatus('코드 이전 완료 · 새 코드로 입장했습니다')
      return null
    },
    [tryUnlock, flashStatus],
  )

  return (
    <div className="app guildApp">
      <SiteCredit />
      <GlobalNav active="guild" />

      {!content ? (
        <LockScreen
          onSubmit={(c) => void tryUnlock(c, Date.now(), false)}
          busy={busy}
          error={error}
          onMigrate={migrateCode}
        />
      ) : (
        <>
          <header className="guildHeader">
            <div className="guildHeaderTop">
              <h1>길드원 전용 🛡️</h1>
              <div className="guildHeaderBtns">
                {!editing && (
                  <button
                    type="button"
                    className="guildEditOpen"
                    onClick={() => {
                      setEditMember('')
                      setEditing(true)
                    }}
                  >
                    ✏️ 편집
                  </button>
                )}
                <button type="button" className="guildLockOut" onClick={lock}>
                  잠그기
                </button>
              </div>
            </div>
            <p className="guildUpdated">
              갱신일 {content.updatedAt}
              <span className="guildSyncTag">
                {supabaseEnabled() ? '· 공동편집 켜짐' : '· 로컬 저장(공동편집 꺼짐)'}
              </span>
            </p>
          </header>

          {status && <div className="guildToast">{status}</div>}

          {editing ? (
            <ContentEditor
              initial={content}
              initialMember={editMember}
              onSave={handleSave}
              onCancel={() => {
                setEditing(false)
                setSaveError('')
              }}
              busy={saving}
              error={saveError}
              canPublish={supabaseEnabled()}
              headerIcon={soldierIcon}
            />
          ) : (
            <ReadView
              content={content}
              onShot={(src, alt) => setShot({ src, alt })}
              onEditMember={(name) => {
                setEditMember(name)
                setEditing(true)
              }}
            />
          )}
        </>
      )}

      {shot && <ImageLightbox src={shot.src} alt={shot.alt} onClose={() => setShot(null)} />}
    </div>
  )
}
