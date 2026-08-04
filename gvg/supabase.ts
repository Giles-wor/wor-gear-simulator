// GvG 리더보드 Supabase 연동 (fetch 만 사용, 의존성 없음).
// 모델: 공용 코드 1개로 열람+수정. 행 id = sha256(code) 이고 내용은 브라우저에서 암호화한 뒤 저장한다.
// - 읽기: anon select 는 허용이지만 돌아오는 게 암호문뿐이라 코드 없이는 못 읽는다.
// - 쓰기: save_gvg_board RPC 로만. RPC 가 id == sha256(code) 를 검증(남의 코드 행은 못 덮어씀)하고
//         편집 로그(암호문)를 함께 append 한다.
// 프로젝트 URL/anon 키는 길드 페이지와 동일 프로젝트를 재사용한다.
import { config } from '../guild/supabase.config'
import type { EncBlob, LogRow } from './types'

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

/** 이 코드(보드 id)의 최신 암호문 블록. 없으면 null. */
export async function loadBoardBlob(id: string): Promise<EncBlob | null> {
  if (!supabaseEnabled()) return null
  const res = await fetch(
    `${config.url}/rest/v1/gvg_board?id=eq.${encodeURIComponent(id)}&select=blob`,
    { headers: headers() },
  )
  if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`)
  const rows = (await res.json()) as Array<{ blob: EncBlob }>
  return rows[0]?.blob ?? null
}

/** 이 보드의 편집 로그(암호문) 최신순. */
export async function loadLogRows(id: string, limit = 30): Promise<LogRow[]> {
  if (!supabaseEnabled()) return []
  const res = await fetch(
    `${config.url}/rest/v1/gvg_edit_log?board_id=eq.${encodeURIComponent(id)}` +
      `&select=blob,at&order=at.desc&limit=${limit}`,
    { headers: headers() },
  )
  if (!res.ok) throw new Error(`로그 조회 실패 (${res.status})`)
  return (await res.json()) as LogRow[]
}

/** 보드 저장. id=코드해시, code=원본 코드(RPC 가 해시 일치 검증). 로그 블록은 있으면 함께 기록. */
export async function saveBoardBlob(
  id: string,
  code: string,
  blob: EncBlob,
  logBlob: EncBlob | null,
): Promise<void> {
  if (!supabaseEnabled()) throw new Error('Supabase 미설정')
  const res = await fetch(`${config.url}/rest/v1/rpc/save_gvg_board`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_id: id, p_blob: blob, p_code: code, p_log: logBlob }),
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
