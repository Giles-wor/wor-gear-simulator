// 블랙리스트 Supabase 연동. 테이블 직접 조회는 막혀 있어 RPC 로만 읽고 씁니다(blacklist-setup.sql).
import { config } from '../../guild/supabase.config'
import { loadBoardBlob, supabaseEnabled } from '../supabase'
import type { EncBlob } from '../types'

export { supabaseEnabled }

/** 행 id = sha256('gvg-blacklist:' + code). 리더보드 보드 id(sha256(code))와 겹치지 않게 접두사를 붙인다. */
export async function listIdFromCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`gvg-blacklist:${code}`),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 이 코드가 리더보드 공용 코드로도 쓰이고 있는지(그렇다면 운영진 전용이 아니게 됨). */
export async function isLeaderboardCode(code: string): Promise<boolean> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
  const id = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  try {
    return (await loadBoardBlob(id)) !== null
  } catch {
    return false
  }
}

/** 서버에 블랙리스트 SQL 이 아직 적용되지 않음(RPC 404). */
export class SetupMissingError extends Error {
  constructor() {
    super('블랙리스트용 Supabase 설정이 아직 안 되어 있습니다. gvg/blacklist-setup.sql 을 SQL Editor 에서 실행하세요.')
  }
}

/** 다른 운영진이 먼저 저장해 내 사본이 옛것이 됨. */
export class ConflictError extends Error {}

async function rpc<T>(fn: string, args: Record<string, unknown>, fail: string): Promise<T> {
  const res = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
  if (res.status === 404) throw new SetupMissingError()
  if (!res.ok) {
    let msg = `${fail} (${res.status})`
    try {
      const j = await res.json()
      if (j?.message) msg = j.message
    } catch {
      /* ignore */
    }
    if (msg.startsWith('CONFLICT')) throw new ConflictError(msg.replace(/^CONFLICT:\s*/, ''))
    throw new Error(msg)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

/** 이 id 의 암호문과 저장 시각. 없으면 null. */
export async function loadList(id: string): Promise<{ blob: EncBlob; updatedAt: string } | null> {
  const rows = await rpc<Array<{ blob: EncBlob; updated_at: string }>>(
    'load_gvg_blacklist',
    { p_id: id },
    '불러오기 실패',
  )
  const r = rows?.[0]
  return r ? { blob: r.blob, updatedAt: r.updated_at } : null
}

export async function loadLog(id: string, limit = 50): Promise<Array<{ blob: EncBlob; at: string }>> {
  return (
    (await rpc<Array<{ blob: EncBlob; at: string }>>(
      'load_gvg_blacklist_log',
      { p_id: id, p_limit: limit },
      '로그 조회 실패',
    )) ?? []
  )
}

/** 저장. expected = 마지막으로 받은 updatedAt(처음이면 null). 새 updatedAt 을 돌려준다. */
export async function saveList(
  id: string,
  code: string,
  blob: EncBlob,
  logBlob: EncBlob | null,
  expected: string | null,
): Promise<string> {
  return rpc<string>(
    'save_gvg_blacklist',
    { p_id: id, p_blob: blob, p_code: code, p_log: logBlob, p_expected: expected },
    '저장 실패',
  )
}
