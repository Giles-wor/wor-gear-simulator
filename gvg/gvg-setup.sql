-- 길드전(GvG) 리더보드용 Supabase 설정 (종단 암호화판).
-- Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 RUN 하세요. (길드원 페이지와 같은 프로젝트 재사용)
--
-- 모델: 공용 코드 1개로 열람 + 수정. 코드가 곧 암호키이자 보드 식별자라
--       별도의 코드 해시 설정(gvg_config)이 필요 없습니다. 이 SQL 은 그대로 실행하면 끝입니다.
--  - 행 id = sha256(code). 내용은 브라우저에서 AES-GCM 으로 암호화한 뒤 올라갑니다.
--  - 읽기: anon 허용이지만 반환값이 암호문이라 코드 없이는 복호화 불가.
--  - 쓰기: save_gvg_board() 로만. id == sha256(code) 검증 → 남의 코드 행은 못 덮어씀.
--  - 편집 로그: 편집자 이름/메모도 암호문. 시각(at)만 평문으로 서버가 찍습니다.
--
-- ⚠️ 이전 평문 버전 테이블(gvg_board/gvg_edit_log/gvg_config)을 이미 만들어 두었다면
--    아래 drop 으로 지워집니다. 평문 시절 저장해 둔 내용이 있으면 먼저 백업하세요.

create extension if not exists pgcrypto with schema extensions;

-- 평문 버전 정리
drop function if exists public.save_gvg_board(jsonb, text, text, text);
drop table if exists public.gvg_edit_log;
drop table if exists public.gvg_board;
drop table if exists public.gvg_config;

-- 1) 보드(암호문). 누구나 읽을 수 있지만 코드 없이는 못 푼다.
create table public.gvg_board (
  id text primary key,
  blob jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.gvg_board enable row level security;
create policy "gvg_board read" on public.gvg_board for select to anon using (true);
-- (insert/update 정책 없음 → anon 직접 쓰기 불가, save_gvg_board 로만)

-- 2) 편집 로그(암호문). 시각만 평문.
create table public.gvg_edit_log (
  id bigint generated always as identity primary key,
  board_id text not null,
  blob jsonb not null,
  at timestamptz not null default now()
);
create index gvg_edit_log_board_at on public.gvg_edit_log (board_id, at desc);
alter table public.gvg_edit_log enable row level security;
create policy "gvg_log read" on public.gvg_edit_log for select to anon using (true);

-- 3) 저장 함수: id 가 코드 해시와 일치할 때만 upsert + 로그 append
create or replace function public.save_gvg_board(
  p_id text, p_blob jsonb, p_code text, p_log jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_id is distinct from encode(digest(p_code, 'sha256'), 'hex') then
    raise exception '코드와 보드 식별자가 일치하지 않습니다';
  end if;

  insert into public.gvg_board (id, blob, updated_at)
  values (p_id, p_blob, now())
  on conflict (id) do update
    set blob = excluded.blob, updated_at = now();

  if p_log is not null then
    insert into public.gvg_edit_log (board_id, blob) values (p_id, p_log);
  end if;
end;
$$;

grant execute on function public.save_gvg_board(text, jsonb, text, jsonb) to anon;

-- 코드를 바꾸고 싶으면? SQL 을 다시 돌릴 필요 없습니다.
-- 새 코드로 입장하면 빈 보드가 나오므로, 옛 코드로 들어가 내용을 복사해 두었다가
-- 새 코드로 입장해 붙여넣고 저장하면 됩니다. (옛 코드 행은 남아 있으니 필요 없으면
--  delete from public.gvg_board where id = '<옛 코드의 sha256>'; 로 지우세요.)
