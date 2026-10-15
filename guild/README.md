# 길드원 전용 페이지 (guild)

Time 길드 길드원만 볼 수 있는 잠금 페이지입니다. 콘텐츠는 **Web Crypto(AES-GCM + PBKDF2)** 로
암호화되어 저장되며, 잠금 코드 없이는 소스/DB를 열어도 내용(텍스트·이미지 포함)을 알 수 없습니다.

- **잠금 코드:** 길드원에게만 따로 공유 (리포에 적지 않음)
- **탭 노출:** 상단 네비에 `길드원 🔒` (주소: `/wor-gear-simulator/guild/`)

## 멀티길드 (코드별 분리)

같은 페이지를 여러 길드가 **각자 다른 접속코드**로 쓸 수 있습니다. 코드가 곧 길드 식별자예요.

- 행 id = `SHA-256(코드)` → 코드마다 별도 암호화 데이터. 코드 모르면 남의 길드 건 암호문이라 못 봄.
- 쓰기는 `save_guild_content` 함수가 `id == sha256(code)` 인지 검증 → 자기 길드 행만 수정 가능.
- **새 길드 추가 = 그냥 새 코드로 입장**하면 빈 틀이 뜨고, 길드원 추가해 저장하면 끝. 배포·관리자 작업 불필요.
- 하나의 Supabase 프로젝트에 모든 길드 데이터가 행별로 쌓입니다(프로젝트 관리는 호스트만, 앱은 공개 키로 접근).
- ⚠️ 코드가 곧 워크스페이스라 **오타 코드는 빈 화면**으로 보일 수 있습니다(‘틀린 코드’ 경고 없음).

### 코드 변경(이전)

나간 사람이 옛 코드를 알아서 코드를 바꾸고 싶을 때: 잠금 화면의 **🔁 코드 변경(이전)** 에서
**이전 코드 + 새 코드**를 입력하면, 이전 코드 내용을 **새 코드로 복사**하고 새 코드로 자동 입장합니다.
이후 새 코드로 작업한 건 옛 코드엔 반영되지 않아 나간 사람은 옛 코드로 더 못 봅니다(옛 코드 행은 그 시점 스냅샷으로 남음).

> 멀티길드 RPC로 바꾼 뒤에는 **`guild/supabase-setup.sql` 을 한 번 다시 실행**해야 저장이 됩니다(함수 시그니처 변경).
> Time 기존 데이터(행 `main`)는 앱이 폴백으로 읽고, 현재 코드로 저장하면 `sha256(코드)` 행으로 옮겨집니다.

### 관리자: 저장된 코드 목록 · 삭제

잠금 화면(또는 입장 후 헤더)의 **🛠 관리자** 에서 관리자 비밀번호로 저장된 길드 데이터 목록을 보고 지울 수 있습니다.

- 원래 코드는 어디에도 저장되지 않아 목록엔 **해시 · 마지막 저장 시각 · 크기**만 보입니다. `코드로 찾기`에 코드를 넣으면 그 줄을 표시해 줍니다.
- **삭제 = 휴지통으로 이동**(관리자 화면에서 복구 가능). 완전 삭제는 Supabase SQL Editor 에서만 합니다(`supabase-setup.sql` 맨 아래 예시).
- 관리자 비밀번호는 길드 코드와 별개이고 DB에 bcrypt 해시로만 저장됩니다. 설정/변경은 `supabase-setup.sql` 맨 아래 주석의 `insert ... guild_admin` 한 줄을 SQL Editor 에서 실행(리포에 적지 않음).
- 읽기는 `load_guild_content(id)` 함수로만 됩니다. 해시 목록·암호문을 테이블째 받아 가는 직접 조회는 막혀 있어요.

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
3. **Settings → API** 에서 `Project URL` 과 `anon public` 키 복사
4. `guild/supabase.config.ts` 의 `url`, `anonKey` 에 붙여넣고 커밋 → 배포
   - anon 키는 공개되어도 안전(읽기는 코드 해시를 아는 행만, 쓰기는 코드 검증 함수로만)

## 초기값/대량 편집 (선택) — 파일 방식

페이지 편집 대신 평문 파일로 한 번에 넣고 싶을 때:

1. `guild/content.source.json` 작성 (스키마: `guild/types.ts` 의 `GuildContent`)
   - 표 칸: `"123"` 또는 강조 시 `{ "v": "123", "hi": true }`
   - 이미지: `{ "caption": "...", "src": "data:image/jpeg;base64,..." }`
2. `npm run encrypt:guild` → `guild/data/content.encrypted.json`(번들 기본값) 갱신
3. `content.encrypted.json` 만 커밋 (`content.source.json` 은 `.gitignore`)

> 번들 기본값은 Supabase에 아직 저장 기록이 없을 때의 시드입니다. 한 번이라도 페이지에서
> 저장하면 그 이후는 Supabase 값이 우선합니다.

## 카톡 방장봇용 집계 이미지

배포할 때 `scripts/render-guild-stats.mjs` 가 길드 데이터를 복호화해 **마병 보유 현황 / 방어덱 영웅 각성 현황** PNG 두 장을 만듭니다.
`deploy.yml` 이 매시간(:07) 재배포하므로 이미지도 매시간 최신으로 바뀝니다.

- 방장봇에 넣을 주소(답변이 100자 남짓에서 잘려서 짧은 주소 사용): `/wor-gear-simulator/s/<짧은 토큰>/m`(마병), `h`(영웅), `p1`·`p2`·`p3`·`pt`(1·2·3귀투, 귀투총합). 짧은 토큰 = sha256("<code>:<GUILD_STATS_SALT>:short-v1")[:16]. 긴 주소 `/stats/<토큰>/soldiers.html` 등도 그대로 있음. 카톡은 .png 주소는 링크로만 보여주고, 이 페이지는 og:image 썸네일 카드로 보여줌
- 갱신: 배포 때마다 + 매시간 예약 실행. GitHub 예약 실행은 몇 시간씩 건너뛸 수 있어서, 저장 즉시 갱신하려면 `guild/supabase-stats-refresh.sql` 을 한 번 실행(GitHub 토큰 필요, 파일 맨 위 설명 참고)
- 토큰 = `sha256("<접속코드>:<GUILD_STATS_SALT>:v2")` 앞 32자 (v1 은 로그 노출로 폐기). salt 는 Secret 이라 리포만 봐서는 주소를 알 수 없음
- **접속코드를 바꾸면** 저장소 Secret `GUILD_CODE` 도 새 코드로 바꾸세요 → 주소가 바뀌어 옛 링크는 죽고, 방장봇 답변 링크만 새 주소로 교체
- 이미지는 커밋하지 않고 배포 산출물에만 들어가며, 로그에도 주소를 찍지 않음. 모아보기 페이지는 `noindex`
- 필요한 저장소 Secret: `GUILD_CODE`(접속코드), `GUILD_STATS_SALT`(임의의 긴 문자열). 없으면 이미지 생성만 건너뜀
- 주소 확인(로컬): `GUILD_CODE=... GUILD_STATS_SALT=... npm run render:guild-stats -- --print-url`
- 표에 나오는 마병·영웅은 `guild/soldiers.json`, `guild/defenseHeroes.json` 목록을 따름(빼면 이미지에서도 빠짐)

## 빌드

- 개발: `npm run dev:guild` / 빌드: `npm run build:guild`
- 배포: `main` 머지 시 `.github/workflows/deploy.yml` 의 `Build (길드원 전용)` 스텝이 빌드
