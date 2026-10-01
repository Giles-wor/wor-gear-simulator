# WoR DPS 시뮬레이터 웹앱

Watcher of Realms 장비/세팅 비교용 모바일 우선 웹앱 초안입니다.

## 포함 기능
- 영웅 선택
- 각성 반영 토글
- 좌측 2세트 / 우측 3세트 선택
- Build A / Build B 비교
- 저방어 / 중방어 / 고방어 시나리오
- 공속 breakpoint, 다음 구간, 추가 필요 공속
- 치확 100 미만 경고
- 추천 스탯 엔진

## 실행 방법
```bash
node -v   # Node 20 권장
npm install
npm run dev
```

## 빌드
```bash
npm run build
```

## GitHub Pages 배포
- `main` 브랜치에 push 하면 GitHub Actions가 자동으로 빌드 후 Pages에 배포합니다.
- Actions 러너는 Node 20 + `npm ci` 기준으로 동작합니다.
- Vite `base`는 저장소명 `/wor-gear-simulator/` 기준으로 설정되어 있습니다.

## 데이터 자동화 (GitHub Actions)
| 워크플로 | 언제 | 하는 일 |
|---|---|---|
| `sync-data.yml` | 매주 월 03:00 UTC (수동 가능) | 영웅(fandom)·소환 확률·배너(wornuts → prospector 폴백)·한글 영웅명(worwiki.kr)·마병 아이콘 크롤 → PR 자동 머지 → **배포 실행** |
| `health-check.yml` | 주간 크롤 직후 (수동 가능) | `scripts/check-health.mjs` 로 데이터 점검 → `data-health` 라벨 이슈 하나를 생성/갱신, 다 해결되면 자동 종료 |
| `sync-soldiers.yml` | `guild/soldiers.json` 이 main 에 반영될 때 | 없는 마병 아이콘만 받고 목록에서 빠진 아이콘 삭제 → 배포 실행 |
| `probe-sources.yml` | 수동 / `claude/**` 브랜치에서 probe 스크립트 수정 시 | 크롤 후보 출처 조사(로그 출력) + 작업 브랜치에 크롤 결과 커밋 |

- 봇(GITHUB_TOKEN)이 머지·푸시한 커밋은 `deploy.yml` 의 push 트리거를 깨우지 않으므로, 각 워크플로가 `gh workflow run deploy.yml` 로 배포를 직접 실행합니다.
- 한글 영웅명: `src/data/heroNamesKo.ts` 수동 매핑이 우선, 없으면 worwiki.kr(나만겜 한국 영웅 위키) 공개 영웅 페이지에서 크롤한 이름(`heroNamesKo.generated.json`).
  worwiki 는 데이터 파일 직접 열람을 막아 두어 상세 페이지만 새 영웅 위주로 천천히 읽습니다. 두 표기가 다르면 점검 이슈에 표시됩니다.
- 사람이 채워야 하는 것(크롤로도 못 찾은 한글명, 신규 진영 효과, 유출 정보)은 상태 점검 이슈에 목록으로 올라옵니다.
  한글명이 없는 구 영웅은 `scripts/health-baseline.json` 기준선으로 경고에서 제외합니다.
- 로컬 점검: `npm run check:health`

## 데이터 수정 위치
- 영웅: `src/data/heroes.ts`
- 세트 효과: `src/data/gearSets.ts`
- 공속 구간: `src/data/attackSpeed.ts`
- 방어 시나리오: `src/data/defenseScenarios.ts`
- 계산식: `src/lib/calc.ts`
- 추천 엔진: `src/lib/recommend.ts`

## GitHub 업로드 순서
1. GitHub에서 private repository 생성
2. 이 폴더 전체 업로드
3. 로컬에서 아래 명령 실행
```bash
git init
git branch -M main
git remote add origin <YOUR_REPO_URL>
git add .
git commit -m "Initial mobile WoR simulator"
git push -u origin main
```

## 비공개 테스트 링크 관련
- GitHub Pages는 public repository가 일반적이라, 완전 비공개 테스트엔 부적합할 수 있습니다.
- private repo 상태로 테스트 링크를 만들려면 Vercel 또는 Cloudflare Pages가 더 편합니다.
- 지금 프로젝트는 어느 쪽에도 올릴 수 있게 정적 빌드 기반으로 구성했습니다.

## 현재 한계
- 영웅/세트/공속 데이터는 시드 데이터입니다.
- 실제 커뮤니티 검증값으로 교체해야 최종 정확도가 올라갑니다.
- 세트 유지율은 평균값 보정 방식입니다.
