-- 길드원 페이지 공동 편집 + 멀티길드용 Supabase 설정.
-- Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 RUN 하세요.
--
-- 멀티길드 모델: 행 id = 접속코드의 SHA-256(hex). 코드별로 데이터가 분리됩니다.
--  - 읽기: anon 허용(반환은 암호문이라 코드 없으면 복호화 불가)
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

-- 읽기: 누구나(암호문)
drop policy if exists "guild_content read" on public.guild_content;
create policy "guild_content read" on public.guild_content
  for select to anon using (true);
-- (insert/update 정책 없음 → anon 직접 쓰기 불가, 아래 함수로만)

-- 저장 함수: id 가 코드 해시와 일치할 때만 upsert
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

-- 참고: 단일 길드 시절(코드 time0303) 데이터는 행 id='main' 에 있습니다.
-- 앱이 로드 시 'main' 을 폴백으로 읽고, time0303 으로 저장하면 sha256('time0303') 행으로 옮겨집니다.
-- (별도 마이그레이션 불필요. 'main' 행은 그대로 둬도 무방)
