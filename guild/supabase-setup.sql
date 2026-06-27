-- 길드원 페이지 공동 편집용 Supabase 설정.
-- Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 RUN 하세요.
--
-- 모델: 암호문 blob(JSON) 한 줄을 저장. 읽기는 anon 허용(암호문이라 코드 없으면 못 읽음),
--       쓰기는 save_guild_content 함수로만 가능하고 편집 비밀번호(잠금 코드)를 확인합니다.
-- ⚠️ 잠금 코드를 바꾸면 아래 함수 안의 'time0303' 도 같이 바꿔야 저장이 됩니다.

create table if not exists public.guild_content (
  id text primary key,
  blob jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.guild_content enable row level security;

-- 읽기: 누구나(반환값은 암호문이라 코드 없이는 복호화 불가)
drop policy if exists "guild_content read" on public.guild_content;
create policy "guild_content read" on public.guild_content
  for select to anon using (true);
-- (insert/update 정책은 만들지 않음 → anon 직접 쓰기 불가, 아래 함수로만)

-- 저장 함수: 편집 비밀번호 확인 후 upsert
create or replace function public.save_guild_content(p_id text, p_blob jsonb, p_pw text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pw is distinct from 'time0303' then
    raise exception '편집 비밀번호가 올바르지 않습니다';
  end if;
  insert into public.guild_content (id, blob, updated_at)
  values (p_id, p_blob, now())
  on conflict (id) do update
    set blob = excluded.blob, updated_at = now();
end;
$$;

grant execute on function public.save_guild_content(text, jsonb, text) to anon;
