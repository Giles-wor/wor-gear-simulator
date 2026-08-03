// GvG 리더보드 Supabase 연동 (fetch 만 사용, 의존성 없음).
// 모델: 읽기는 anon 이 평문 그대로 조회(누구나). 쓰기는 save_gvg_board RPC 로만 —
//       공용 편집 코드 검증 후 data upsert + gvg_edit_log 에 편집자/시각 기록.
// 프로젝트 URL/anon 키는 길드 페이지와 동일 프로젝트를 재사용한다.
import { config } from '../guild/supabase.config'
import type { Board, EditLog } from './types'

/** 단일 보드 행 id. */
export const BOARD_ID = 'main'

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

/** 최신 보드. 없으면 null. */
export async function loadBoard(): Promise<Board | null> {
  if (!supabaseEnabled()) return null
  const res = await fetch(
    `${config.url}/rest/v1/gvg_board?id=eq.${encodeURIComponent(BOARD_ID)}&select=data`,
    { headers: headers() },
  )
  if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`)
  const rows = (await res.json()) as Array<{ data: Board }>
  return rows[0]?.data ?? null
}

/** 편집 로그 최신순. */
export async function loadLog(limit = 30): Promise<EditLog[]> {
  if (!supabaseEnabled()) return []
  const res = await fetch(
    `${config.url}/rest/v1/gvg_edit_log?select=editor,note,at&order=at.desc&limit=${limit}`,
    { headers: headers() },
  )
  if (!res.ok) throw new Error(`로그 조회 실패 (${res.status})`)
  return (await res.json()) as EditLog[]
}

/** 보드 저장. 공용 편집 코드 + 편집자 이름 필요. 서버가 코드 검증 후 로그 기록. */
export async function saveBoard(
  board: Board,
  code: string,
  editor: string,
  note?: string,
): Promise<void> {
  if (!supabaseEnabled()) throw new Error('Supabase 미설정')
  const res = await fetch(`${config.url}/rest/v1/rpc/save_gvg_board`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_data: board, p_code: code, p_editor: editor, p_note: note ?? null }),
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
