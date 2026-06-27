// Supabase REST 연동 (의존성 없이 fetch 만 사용).
// - 읽기: guild_content 테이블에서 암호문 blob 조회 (anon select 허용, 암호문이라 코드 없으면 못 읽음)
// - 쓰기: save_guild_content RPC 호출 (편집 비밀번호 = 잠금 코드 확인 후 upsert)
import { config } from './supabase.config'
import type { EncryptedBlob } from './types'

const ROW_ID = 'main'

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

/** 원격 저장된 최신 암호문 블록. 없으면 null. */
export async function loadRemoteBlob(): Promise<EncryptedBlob | null> {
  if (!supabaseEnabled()) return null
  const res = await fetch(
    `${config.url}/rest/v1/guild_content?id=eq.${ROW_ID}&select=blob`,
    { headers: headers() },
  )
  if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`)
  const rows = (await res.json()) as Array<{ blob: EncryptedBlob }>
  return rows[0]?.blob ?? null
}

/** 암호문 블록을 원격에 저장. password 는 편집 비밀번호(잠금 코드와 동일). */
export async function saveRemoteBlob(blob: EncryptedBlob, password: string): Promise<void> {
  if (!supabaseEnabled()) throw new Error('Supabase 미설정')
  const res = await fetch(`${config.url}/rest/v1/rpc/save_guild_content`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_id: ROW_ID, p_blob: blob, p_pw: password }),
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
