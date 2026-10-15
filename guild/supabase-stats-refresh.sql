-- 카톡 방장봇용 길드 집계 이미지를 "저장할 때마다" 바로 다시 만들기 (선택).
--
-- 왜: 이미지는 GitHub Actions 배포(deploy.yml)에서 만들어지는데, GitHub 의 예약 실행(cron)은
--     보장되지 않아 몇 시간씩 건너뛸 수 있음. 그래서 길드 데이터가 저장되면 Supabase 가 직접
--     GitHub 에 "배포 한 번 돌려줘"(workflow_dispatch) 를 보내게 함. 1~2분 뒤 이미지가 바뀜.
--     연달아 저장해도 deploy.yml 의 concurrency 설정으로 마지막 것만 끝까지 돌아감.
--
-- 준비: GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token
--   - Repository access: Only select repositories → wor-gear-simulator
--   - Permissions → Repository → Actions: Read and write (다른 권한은 필요 없음)
--   - 만료일은 원하는 대로(만료되면 이 기능만 멈추고 예약 실행은 그대로 동작)
--
-- 실행: 아래 1) 의 '여기에-토큰' 을 바꿔서 SQL Editor 에서 한 번 실행 → 2) 전체를 RUN.
--       토큰은 Supabase Vault 에 암호화되어 저장되고 리포에는 남지 않음.
--
-- 1) 토큰 저장 (토큰을 바꿀 때도 이 두 줄을 다시 실행)
--   delete from vault.secrets where name = 'github_dispatch_token';
--   select vault.create_secret('여기에-토큰', 'github_dispatch_token');
--
-- 끄기: drop trigger if exists guild_stats_refresh on public.guild_content;

-- 2) 저장 시 배포 요청
create extension if not exists pg_net with schema extensions;

create or replace function public.request_guild_stats_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  tok text;
begin
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'github_dispatch_token' limit 1;
  if tok is null or tok = '' then
    return null;
  end if;
  perform net.http_post(
    url := 'https://api.github.com/repos/Giles-wor/wor-gear-simulator/actions/workflows/deploy.yml/dispatches',
    body := jsonb_build_object('ref', 'main'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || tok,
      'Accept', 'application/vnd.github+json',
      'Content-Type', 'application/json',
      'User-Agent', 'guild-stats-refresh'
    )
  );
  return null;
end;
$$;
revoke execute on function public.request_guild_stats_refresh() from public, anon, authenticated;

drop trigger if exists guild_stats_refresh on public.guild_content;
create trigger guild_stats_refresh
  after insert or update on public.guild_content
  for each statement
  execute function public.request_guild_stats_refresh();
