// Supabase REST 연동 (의존성 없이 fetch 만 사용).
// 멀티길드: 행 id = 코드의 SHA-256(hex). 코드별로 데이터가 분리됨.
// - 읽기: guild_content 에서 해당 id 의 암호문 blob 조회 (anon select 허용, 암호문이라 코드 없으면 못 읽음)
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

/** 특정 길드 id 의 최신 암호문 블록. 없으면 null. */
export async function loadRemoteBlob(id: string): Promise<EncryptedBlob | null> {
  if (!supabaseEnabled()) return null
  const res = await fetch(`${config.url}/rest/v1/guild_content?id=eq.${encodeURIComponent(id)}&select=blob`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`)
  const rows = (await res.json()) as Array<{ blob: EncryptedBlob }>
  return rows[0]?.blob ?? null
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
