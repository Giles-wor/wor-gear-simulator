-- 길드전 페이지 · 운영진 전용 블랙리스트 Supabase 설정 (종단 암호화).
-- Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 RUN 하세요. 기존 테이블(gvg_board 등)은 건드리지 않습니다.
--
-- 모델: 운영진 코드 1개로 열람 + 수정. 리더보드 공용 코드와는 별개입니다.
--  - 행 id = sha256('gvg-blacklist:' || code). 내용(항목·사유·닉네임 기록)은 브라우저에서 AES-GCM 으로 암호화한 뒤 올라갑니다.
--  - 읽기: 테이블 직접 조회는 막혀 있고(RLS, select 정책 없음) load_gvg_blacklist(id) 함수로 그 id 한 행만 받습니다.
--  - 쓰기: save_gvg_blacklist() 로만. id 가 코드 해시와 맞는지 검증하고,
--          다른 운영진이 그 사이 저장했다면(updated_at 불일치) 거부해서 덮어쓰기를 막습니다(앱이 다시 받아 재적용).
--  - 편집 로그: 편집자/작업 내용도 암호문. 시각(at)만 평문으로 서버가 찍습니다.
--  - 이 파일은 다시 실행해도 안전합니다(데이터를 지우지 않음).

create extension if not exists pgcrypto with schema extensions;

-- 1) 목록(암호문). anon 직접 조회 불가.
create table if not exists public.gvg_blacklist (
  id text primary key,
  blob jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.gvg_blacklist enable row level security;
-- (정책 없음 → anon/authenticated 직접 select/insert/update/delete 불가)

-- 2) 편집 로그(암호문). 시각만 평문.
create table if not exists public.gvg_blacklist_log (
  id bigint generated always as identity primary key,
  list_id text not null,
  blob jsonb not null,
  at timestamptz not null default now()
);
create index if not exists gvg_blacklist_log_list_at on public.gvg_blacklist_log (list_id, at desc);
alter table public.gvg_blacklist_log enable row level security;

-- 3) 읽기: 그 id 한 행(없으면 0행)
create or replace function public.load_gvg_blacklist(p_id text)
returns table (blob jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select b.blob, b.updated_at from public.gvg_blacklist b where b.id = p_id;
$$;
revoke execute on function public.load_gvg_blacklist(text) from public;
grant execute on function public.load_gvg_blacklist(text) to anon;

-- 4) 로그 읽기: 최신순
create or replace function public.load_gvg_blacklist_log(p_id text, p_limit int default 50)
returns table (blob jsonb, at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select l.blob, l.at from public.gvg_blacklist_log l
   where l.list_id = p_id
   order by l.at desc
   limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;
revoke execute on function public.load_gvg_blacklist_log(text, int) from public;
grant execute on function public.load_gvg_blacklist_log(text, int) to anon;

-- 5) 저장: 코드 검증 + 동시 저장 충돌 검사 + 로그 append. 새 updated_at 을 돌려줌.
--    p_expected = 내가 마지막으로 받은 updated_at (처음 만드는 경우 null)
create or replace function public.save_gvg_blacklist(
  p_id text, p_blob jsonb, p_code text, p_log jsonb, p_expected timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cur timestamptz;
  found_row boolean;
  now_ts timestamptz := clock_timestamp();
begin
  if p_id is distinct from encode(digest('gvg-blacklist:' || coalesce(p_code, ''), 'sha256'), 'hex') then
    raise exception '코드와 목록 식별자가 일치하지 않습니다';
  end if;

  select b.updated_at, true into cur, found_row from public.gvg_blacklist b where b.id = p_id for update;
  if found_row is true then
    if p_expected is null or cur is distinct from p_expected then
      raise exception 'CONFLICT: 다른 운영진이 먼저 저장했습니다';
    end if;
    update public.gvg_blacklist set blob = p_blob, updated_at = now_ts where id = p_id;
  else
    if p_expected is not null then
      raise exception 'CONFLICT: 목록이 서버에 없습니다(삭제됨?)';
    end if;
    insert into public.gvg_blacklist (id, blob, updated_at) values (p_id, p_blob, now_ts);
  end if;

  if p_log is not null then
    insert into public.gvg_blacklist_log (list_id, blob, at) values (p_id, p_log, now_ts);
  end if;
  return now_ts;
end;
$$;
revoke execute on function public.save_gvg_blacklist(text, jsonb, text, jsonb, timestamptz) from public;
grant execute on function public.save_gvg_blacklist(text, jsonb, text, jsonb, timestamptz) to anon;

-- 운영진 코드를 바꾸고 싶으면? 앱의 블랙리스트 화면에서 '코드 변경' 으로 옮기면 됩니다(새 코드로 다시 암호화해 저장).
-- 옛 코드 행은 남으니 필요 없으면 SQL Editor 에서 지우세요:
--   delete from public.gvg_blacklist where id = '<옛 행 id>';
--   delete from public.gvg_blacklist_log where list_id = '<옛 행 id>';
-- (항목 삭제는 앱의 휴지통에서 복구 가능. 위 SQL 은 목록 전체를 영구 삭제합니다.)
