-- 길드원 페이지 공동 편집 + 멀티길드용 Supabase 설정.
-- Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 RUN 하세요.
--
-- 멀티길드 모델: 행 id = 접속코드의 SHA-256(hex). 코드별로 데이터가 분리됩니다.
--  - 읽기: load_guild_content(id) 함수로만. id(=코드 해시)를 정확히 알아야 그 행 하나를 받음.
--          테이블 전체 조회(해시 목록·암호문 일괄 다운로드)는 막혀 있음.
--  - 쓰기: save_guild_content 함수로만. 함수가 id == sha256(code) 인지 검증 →
--          자기 길드(코드) 행만 쓸 수 있고 남의 길드 행은 못 덮어씀.
-- 길드별 비밀번호를 따로 저장할 필요가 없습니다(코드 자체가 키 겸 식별자).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.guild_content (
  id text primary key,
  blob jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.guild_content enable row level security;

-- 읽기 잠금: 예전엔 anon select 를 전부 허용해서 누구나 해시 목록과 암호문을 통째로 받아 갈 수 있었음.
-- 이제 select 정책을 없애고(→ 직접 조회 시 빈 결과) 아래 load_guild_content 함수로만 한 행씩 읽음.
-- (insert/update/delete 정책도 없음 → anon 직접 쓰기 불가, 아래 함수로만)
drop policy if exists "guild_content read" on public.guild_content;

create or replace function public.load_guild_content(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select blob from public.guild_content where id = p_id;
$$;

grant execute on function public.load_guild_content(text) to anon;

-- 저장 함수: id 가 코드 해시와 일치할 때만 upsert
-- (옛 함수와 인자 이름이 달라 create or replace 가 안 되므로 먼저 drop. 시그니처 text,jsonb,text 동일)
drop function if exists public.save_guild_content(text, jsonb, text);

create or replace function public.save_guild_content(p_id text, p_blob jsonb, p_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_id is distinct from encode(digest(p_code, 'sha256'), 'hex') then
    raise exception '코드와 길드 식별자가 일치하지 않습니다';
  end if;
  insert into public.guild_content (id, blob, updated_at)
  values (p_id, p_blob, now())
  on conflict (id) do update
    set blob = excluded.blob, updated_at = now();
end;
$$;

grant execute on function public.save_guild_content(text, jsonb, text) to anon;

-- 참고: 단일 길드 시절 데이터는 행 id='main' 에 있습니다.
-- 앱이 로드 시 'main' 을 폴백으로 읽고, 코드로 저장하면 sha256(코드) 행으로 옮겨집니다.
-- (별도 마이그레이션 불필요. 'main' 행은 그대로 둬도 무방)

-- ────────────────────────────────────────────────────────────────────────
-- 관리자: 저장된 길드(코드) 목록 보기 + 휴지통 삭제/복구
-- ────────────────────────────────────────────────────────────────────────
-- 원래 코드는 어디에도 저장되지 않으므로 목록에는 해시·마지막 저장 시각·크기만 보입니다.
-- 관리자 비밀번호는 길드 코드와 별개이며 bcrypt 해시로만 저장됩니다(리포에 적지 않음).
--
-- ▶ 관리자 비밀번호 설정/변경: 아래 한 줄의 '여기에-비밀번호' 를 바꿔서 SQL Editor 에서 따로 실행.
--   insert into public.guild_admin (id, secret_hash)
--   values (1, extensions.crypt('여기에-비밀번호', extensions.gen_salt('bf')))
--   on conflict (id) do update set secret_hash = excluded.secret_hash;
--
-- ▶ 휴지통 완전 비우기(되돌릴 수 없음, SQL Editor 에서만):
--   delete from public.guild_content_trash where deleted_at < now() - interval '30 days';

create table if not exists public.guild_admin (
  id int primary key default 1 check (id = 1),
  secret_hash text not null
);
alter table public.guild_admin enable row level security;
revoke all on public.guild_admin from anon, authenticated;

create table if not exists public.guild_content_trash (
  trash_id bigserial primary key,
  id text not null,
  blob jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz not null default now()
);
alter table public.guild_content_trash enable row level security;
revoke all on public.guild_content_trash from anon, authenticated;

-- 내부용: 관리자 비밀번호 확인 (anon 이 직접 호출 못 함)
create or replace function public.guild_admin_check(p_secret text)
returns void
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.guild_admin a
    where a.id = 1 and a.secret_hash = crypt(coalesce(p_secret, ''), a.secret_hash)
  ) then
    raise exception '관리자 비밀번호가 올바르지 않습니다';
  end if;
end;
$$;
revoke execute on function public.guild_admin_check(text) from public, anon, authenticated;

-- 목록: 사용 중인 행 + 휴지통 행(trash_id 가 있으면 휴지통)
create or replace function public.admin_list_guilds(p_secret text)
returns table (guild_id text, saved_at timestamptz, bytes int, trash_id bigint, deleted_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
begin
  perform public.guild_admin_check(p_secret);
  return query
    select c.id, c.updated_at, octet_length(c.blob::text), null::bigint, null::timestamptz
      from public.guild_content c
    union all
    select t.id, t.updated_at, octet_length(t.blob::text), t.trash_id, t.deleted_at
      from public.guild_content_trash t
    order by 4 nulls first, 2 desc;
end;
$$;
grant execute on function public.admin_list_guilds(text) to anon;

-- 삭제: 행을 휴지통으로 옮김(복구 가능)
create or replace function public.admin_delete_guild(p_secret text, p_id text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  n int;
begin
  perform public.guild_admin_check(p_secret);
  with moved as (
    delete from public.guild_content c where c.id = p_id
    returning c.id, c.blob, c.updated_at
  )
  insert into public.guild_content_trash (id, blob, updated_at)
  select moved.id, moved.blob, moved.updated_at from moved;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception '해당 길드 데이터가 없습니다(이미 삭제됨?)';
  end if;
end;
$$;
grant execute on function public.admin_delete_guild(text, text) to anon;

-- 복구: 휴지통 행을 되돌림. 그 사이 같은 코드로 새로 저장된 데이터가 있으면 덮어쓰지 않고 거부.
create or replace function public.admin_restore_guild(p_secret text, p_trash_id bigint)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  t public.guild_content_trash%rowtype;
begin
  perform public.guild_admin_check(p_secret);
  select * into t from public.guild_content_trash x where x.trash_id = p_trash_id;
  if not found then
    raise exception '휴지통에 해당 항목이 없습니다';
  end if;
  if exists (select 1 from public.guild_content c where c.id = t.id) then
    raise exception '같은 코드로 새로 저장된 데이터가 있어 복구할 수 없습니다(먼저 그 행을 삭제하세요)';
  end if;
  insert into public.guild_content (id, blob, updated_at) values (t.id, t.blob, t.updated_at);
  delete from public.guild_content_trash x where x.trash_id = p_trash_id;
end;
$$;
grant execute on function public.admin_restore_guild(text, bigint) to anon;
