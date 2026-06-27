# 길드원 전용 페이지 (guild)

Time 길드 길드원만 볼 수 있는 잠금 페이지입니다. 콘텐츠는 **Web Crypto(AES-GCM + PBKDF2)** 로
암호화되어 `guild/data/content.encrypted.json` 에만 들어갑니다. 잠금 코드 없이는 소스를 열어도
내용(텍스트·이미지 포함)을 알 수 없습니다.

- **잠금 코드:** `time0303` (바꾸려면 아래 `GUILD_CODE` 참고)
- **탭 노출:** 상단 네비에 `길드원 🔒` 로 표시 (주소: `/wor-gear-simulator/guild/`)

## 콘텐츠 수정 방법

1. 평문 콘텐츠 파일 `guild/content.source.json` 을 작성/수정합니다.
   스키마는 `guild/types.ts` 의 `GuildContent` 참고:
   - `notice`: 공지 텍스트 (줄바꿈 `\n` 지원)
   - `tables`: 진행 현황 등 표. 칸을 `"123"` 또는 강조 시 `{ "v": "123", "hi": true }`
   - `images`: `{ "caption": "...", "src": "data:image/jpeg;base64,..." }` — 이미지는
     **base64 data URL** 로 넣습니다(암호화 블록 안에 통째로 들어가 코드 없이는 못 봄).
   - `links`: `{ "label": "...", "url": "...", "desc": "..." }`
2. 암호화: `npm run encrypt:guild`
   → `guild/data/content.encrypted.json` 갱신
3. **`content.encrypted.json` 만 커밋**합니다. (`content.source.json` 은 `.gitignore` 처리되어
   리포에 올라가지 않습니다.)

### 코드(암호) 변경

```bash
GUILD_CODE=새코드 npm run encrypt:guild
```

암호를 바꾸면 길드원에게 새 코드를 다시 안내해야 합니다.

### 이미지를 data URL 로 만들기

```bash
# 예: jpeg 한 장을 data URL 로
printf 'data:image/jpeg;base64,'; base64 -w0 그림.jpg
```

출력 문자열을 `content.source.json` 의 `images[].src` 에 붙여넣습니다.

## 빌드

- 개발: `npm run dev:guild`
- 빌드: `npm run build:guild`
- 배포: `main` 에 머지되면 `.github/workflows/deploy.yml` 의 `Build (길드원 전용)` 스텝이 빌드합니다.
