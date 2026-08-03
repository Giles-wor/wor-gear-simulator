# 길드전(GvG) 리더보드

읽기는 **누구나**, 수정은 **공용 편집 코드**가 있는 사람만. 저장하면 **편집자 이름·시각이 로그**로 남습니다.

## 동작 방식
- 데이터는 Supabase `gvg_board`(평문 jsonb)에 단일 행(`id='main'`)으로 저장됩니다.
- 읽기: anon 키로 그대로 조회(누구나). 편집 로그(`gvg_edit_log`)도 공개.
- 쓰기: `save_gvg_board()` RPC 로만. 공용 편집 코드(SHA-256 해시 비교) 검증 후 upsert + 로그 기록.
- Supabase 프로젝트 URL/anon 키는 길드원 페이지와 **동일 프로젝트**를 재사용합니다 (`../guild/supabase.config.ts`).
- Supabase 미설정(로컬)일 때는 번들 시드(`data/seed.json`)를 표시하며 저장은 비활성.

## 최초 1회 설정 (Supabase 대시보드)
1. Supabase → **SQL Editor** 에서 [`gvg-setup.sql`](./gvg-setup.sql) 실행.
2. 그 파일의 `'CHANGE_ME'` 를 원하는 **공용 편집 코드**로 바꿔서 실행(코드는 해시로만 저장됨).
3. 코드를 바꾸고 싶으면 SQL 의 `insert into public.gvg_config ... 'CHANGE_ME' ...` 줄만 새 코드로 다시 실행.

## 순위 규칙
- 각 회차(열)의 **순위 칸은 포인트 기준 자동 계산**(내림차순, 동점은 행 순서).
- 편집 중 순위 칸에 값을 직접 넣으면 그 값으로 **수동 보정**(비우면 자동). 이미지의 '예상 결과'처럼 손으로 순위를 지정할 때 사용.

## 로컬 실행
```bash
npm run dev:gvg        # http://localhost:5173/wor-gear-simulator/gvg/
npm run build:gvg
```
