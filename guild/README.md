# 길드원 전용 페이지 (guild)

Time 길드 길드원만 볼 수 있는 잠금 페이지입니다. 콘텐츠는 **Web Crypto(AES-GCM + PBKDF2)** 로
암호화되어 저장되며, 잠금 코드 없이는 소스/DB를 열어도 내용(텍스트·이미지 포함)을 알 수 없습니다.

- **잠금 코드:** `time0303`
- **탭 노출:** 상단 네비에 `길드원 🔒` (주소: `/wor-gear-simulator/guild/`)

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
