# 길드원 전용 페이지 (guild)

Time 길드 길드원만 볼 수 있는 잠금 페이지입니다. 콘텐츠는 **Web Crypto(AES-GCM + PBKDF2)** 로
암호화되어 저장되며, 잠금 코드 없이는 소스/DB를 열어도 내용(텍스트·이미지 포함)을 알 수 없습니다.

- **잠금 코드:** `time0303` (Time 길드)
- **탭 노출:** 상단 네비에 `길드원 🔒` (주소: `/wor-gear-simulator/guild/`)

## 멀티길드 (코드별 분리)

같은 페이지를 여러 길드가 **각자 다른 접속코드**로 쓸 수 있습니다. 코드가 곧 길드 식별자예요.

- 행 id = `SHA-256(코드)` → 코드마다 별도 암호화 데이터. 코드 모르면 남의 길드 건 암호문이라 못 봄.
- 쓰기는 `save_guild_content` 함수가 `id == sha256(code)` 인지 검증 → 자기 길드 행만 수정 가능.
- **새 길드 추가 = 그냥 새 코드로 입장**하면 빈 틀이 뜨고, 길드원 추가해 저장하면 끝. 배포·관리자 작업 불필요.
- 하나의 Supabase 프로젝트에 모든 길드 데이터가 행별로 쌓입니다(프로젝트 관리는 호스트만, 앱은 공개 키로 접근).
- ⚠️ 코드가 곧 워크스페이스라 **오타 코드는 빈 화면**으로 보일 수 있습니다(‘틀린 코드’ 경고 없음).

> 멀티길드 RPC로 바꾼 뒤에는 **`guild/supabase-setup.sql` 을 한 번 다시 실행**해야 저장이 됩니다(함수 시그니처 변경).
> Time 기존 데이터(행 `main`)는 앱이 폴백으로 읽고, time0303 으로 저장하면 `sha256(time0303)` 행으로 옮겨집니다.

## 페이지에서 직접 편집 (권장)

코드로 입장 후 우측 상단 **✏️ 편집** → 표/공지/이미지/링크를 수정하고 **저장**.

- 표: 칸 클릭해 값 입력, 칸의 **●** 로 주황 강조 ON/OFF, `+ 행 추가` / 행별 `✕` 삭제
- 저장 위치는 Supabase 연동 여부에 따라 다름:
  - **연동됨:** 저장 시 DB에 기록 → 코드 아는 **모든 길드원에게 반영**(재빌드 불필요). 헤더에 `공동편집 켜짐`
  - **미연동:** **이 브라우저(localStorage)** 에만 저장(나만, 이 기기). 헤더에 `로컬 저장`

데이터 우선순위(읽기): **Supabase → localStorage → 번들 기본값**.

## Supabase 연동(공동 편집 켜기)

1. <https://supabase.com> 무료 프로젝트 생성
2. **SQL Editor** 에 `guild/supabase-setup.sql` 붙여넣고 RUN (테이블·정책·저장함수 생성)
   - ⚠️ 잠금 코드를 바꾸면 SQL 안의 `'time0303'`(편집 비밀번호)도 같이 바꿔야 저장됨
3. **Settings → API** 에서 `Project URL` 과 `anon public` 키 복사
4. `guild/supabase.config.ts` 의 `url`, `anonKey` 에 붙여넣고 커밋 → 배포
   - anon 키는 공개되어도 안전(읽기는 암호문만, 쓰기는 편집 비밀번호로 보호)

## 초기값/대량 편집 (선택) — 파일 방식

페이지 편집 대신 평문 파일로 한 번에 넣고 싶을 때:

1. `guild/content.source.json` 작성 (스키마: `guild/types.ts` 의 `GuildContent`)
   - 표 칸: `"123"` 또는 강조 시 `{ "v": "123", "hi": true }`
   - 이미지: `{ "caption": "...", "src": "data:image/jpeg;base64,..." }`
2. `npm run encrypt:guild` → `guild/data/content.encrypted.json`(번들 기본값) 갱신
3. `content.encrypted.json` 만 커밋 (`content.source.json` 은 `.gitignore`)

> 번들 기본값은 Supabase에 아직 저장 기록이 없을 때의 시드입니다. 한 번이라도 페이지에서
> 저장하면 그 이후는 Supabase 값이 우선합니다.

## 빌드

- 개발: `npm run dev:guild` / 빌드: `npm run build:guild`
- 배포: `main` 머지 시 `.github/workflows/deploy.yml` 의 `Build (길드원 전용)` 스텝이 빌드
