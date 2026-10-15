// Supabase REST 연동 (의존성 없이 fetch 만 사용).
// 멀티길드: 행 id = 코드의 SHA-256(hex). 코드별로 데이터가 분리됨.
// - 읽기: load_guild_content RPC 로 해당 id 의 암호문 blob 한 행만 조회 (테이블 전체 조회는 막힘)
// - 쓰기: save_guild_content RPC 호출. RPC 가 id == sha256(code) 인지 검증 후 upsert(남의 길드 행 못 씀)
import { config } from './supabase.config'
import type { EncryptedBlob } from './types'

/** Time 길드 기존 데이터(단일 길드 시절) 행 id. 멀티길드 전환 후 읽기 폴백용. */
export const LEGACY_ID = 'main'

export function supabaseEnabled(): boolean {
  return Boolean(config.url && config.anonKey)
}

function headers(): Record<string, string> {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    'Content-Type': 'application/json',
  }
}

/** RPC 호출 공통. 실패 시 서버 메시지를 담은 Error. */
async function rpc<T>(fn: string, args: Record<string, unknown>, fail: string): Promise<{ status: number; data?: T }> {
  const res = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(args),
  })
  if (res.ok) {
    const text = await res.text()
    return { status: res.status, data: (text ? JSON.parse(text) : null) as T }
  }
  if (res.status === 404) return { status: 404 }
  let msg = `${fail} (${res.status})`
  try {
    const j = await res.json()
    if (j?.message) msg = j.message
  } catch {
    /* ignore */
  }
  throw new Error(msg)
}

/**
 * 특정 길드 id 의 최신 암호문 블록. 없으면 null.
 * load_guild_content RPC 로 한 행만 읽음(테이블 전체 조회는 막혀 있음).
 * RPC 가 아직 없는 DB(supabase-setup.sql 재실행 전)면 예전 방식(직접 조회)으로 폴백.
 */
export async function loadRemoteBlob(id: string): Promise<EncryptedBlob | null> {
  if (!supabaseEnabled()) return null
  const r = await rpc<EncryptedBlob | null>('load_guild_content', { p_id: id }, '불러오기 실패')
  if (r.status !== 404) return r.data ?? null
  const res = await fetch(`${config.url}/rest/v1/guild_content?id=eq.${encodeURIComponent(id)}&select=blob`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`)
  const rows = (await res.json()) as Array<{ blob: EncryptedBlob }>
  return rows[0]?.blob ?? null
}

/** 관리자 목록의 한 줄. trashId 가 있으면 휴지통에 있는 항목. */
export type AdminGuildRow = {
  guildId: string
  savedAt: string
  bytes: number
  trashId: number | null
  deletedAt: string | null
}

async function adminRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabaseEnabled()) throw new Error('Supabase 미설정')
  const r = await rpc<T>(fn, args, '관리자 요청 실패')
  if (r.status === 404) throw new Error('관리자 기능이 DB에 아직 없습니다. guild/supabase-setup.sql 을 다시 실행하세요.')
  return r.data as T
}

/** 저장된 길드 행 + 휴지통 목록 (관리자 비밀번호 필요). */
export async function adminListGuilds(secret: string): Promise<AdminGuildRow[]> {
  const rows = await adminRpc<
    Array<{ guild_id: string; saved_at: string; bytes: number; trash_id: number | null; deleted_at: string | null }>
  >('admin_list_guilds', { p_secret: secret })
  return (rows ?? []).map((r) => ({
    guildId: r.guild_id,
    savedAt: r.saved_at,
    bytes: r.bytes,
    trashId: r.trash_id,
    deletedAt: r.deleted_at,
  }))
}

/** 길드 행을 휴지통으로 옮김(복구 가능). */
export async function adminDeleteGuild(secret: string, guildId: string): Promise<void> {
  await adminRpc('admin_delete_guild', { p_secret: secret, p_id: guildId })
}

/** 휴지통 항목 복구. */
export async function adminRestoreGuild(secret: string, trashId: number): Promise<void> {
  await adminRpc('admin_restore_guild', { p_secret: secret, p_trash_id: trashId })
}

/** 암호문 블록을 저장. id=코드해시, code=원본 코드(RPC 가 해시 일치 검증). */
export async function saveRemoteBlob(blob: EncryptedBlob, code: string, id: string): Promise<void> {
  if (!supabaseEnabled()) throw new Error('Supabase 미설정')
  const res = await fetch(`${config.url}/rest/v1/rpc/save_guild_content`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_id: id, p_blob: blob, p_code: code }),
  })
  if (!res.ok) {
    let msg = `저장 실패 (${res.status})`
    try {
      const j = await res.json()
      if (j?.message) msg = j.message
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
}
