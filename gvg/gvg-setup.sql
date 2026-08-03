-- 길드전(GvG) 리더보드용 Supabase 설정.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 RUN 하세요. (길드원 페이지와 같은 프로젝트 재사용)
--
-- 모델: 읽기는 누구나(평문). 수정은 '공용 편집 코드'가 있어야 하며, 저장 시 편집자 이름/시각이 로그로 남습니다.
--  - gvg_board       : 리더보드 데이터(단일 행 id='main', 평문 jsonb) — anon 읽기 허용
--  - gvg_edit_log    : 편집 로그(편집자 이름, 메모, 시각)          — anon 읽기 허용
--  - gvg_config      : 편집 코드 해시 저장                          — anon 읽기 불가(함수만 접근)
--  - save_gvg_board(): 코드 검증 후 data upsert + 로그 append 하는 유일한 쓰기 경로

create extension if not exists pgcrypto with schema extensions;

-- 1) 데이터 테이블 (평문, 누구나 읽기)
create table if not exists public.gvg_board (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.gvg_board enable row level security;
drop policy if exists "gvg_board read" on public.gvg_board;
create policy "gvg_board read" on public.gvg_board for select to anon using (true);
-- (insert/update 정책 없음 → anon 직접 쓰기 불가, save_gvg_board 로만)

-- 2) 편집 로그 (누구나 읽기)
create table if not exists public.gvg_edit_log (
  id bigint generated always as identity primary key,
  editor text not null,
  note text,
  at timestamptz not null default now()
);
alter table public.gvg_edit_log enable row level security;
drop policy if exists "gvg_log read" on public.gvg_edit_log;
create policy "gvg_log read" on public.gvg_edit_log for select to anon using (true);

-- 3) 설정(편집 코드 해시). RLS on + select 정책 없음 → anon 은 해시조차 못 읽음.
create table if not exists public.gvg_config (
  k text primary key,
  v text not null
);
alter table public.gvg_config enable row level security;

-- ★ 편집 코드 설정: 아래 'CHANGE_ME' 를 원하는 공용 편집 코드로 바꿔 실행하세요.
--   (코드 자체가 아니라 SHA-256 해시만 저장됩니다. 코드 변경 시 이 줄만 다시 실행.)
insert into public.gvg_config (k, v)
values ('edit_code_sha256', encode(digest('CHANGE_ME', 'sha256'), 'hex'))
on conflict (k) do update set v = excluded.v;

-- 4) 저장 함수: 공용 코드 검증 → data upsert + 편집 로그 기록
drop function if exists public.save_gvg_board(jsonb, text, text, text);
create or replace function public.save_gvg_board(
  p_data jsonb, p_code text, p_editor text, p_note text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  expected text;
begin
  select v into expected from public.gvg_config where k = 'edit_code_sha256';
  if expected is null then
    raise exception '편집 코드가 설정되지 않았습니다 (gvg_config 확인)';
  end if;
  if encode(digest(p_code, 'sha256'), 'hex') is distinct from expected then
    raise exception '편집 코드가 올바르지 않습니다';
  end if;
  if coalesce(btrim(p_editor), '') = '' then
    raise exception '편집자 이름을 입력하세요';
  end if;

  insert into public.gvg_board (id, data, updated_at, updated_by)
  values ('main', p_data, now(), p_editor)
  on conflict (id) do update
    set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by;

  insert into public.gvg_edit_log (editor, note)
  values (p_editor, nullif(btrim(p_note), ''));
end;
$$;

grant execute on function public.save_gvg_board(jsonb, text, text, text) to anon;
