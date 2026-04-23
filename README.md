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
