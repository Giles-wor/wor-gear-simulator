# 이 폴더를 전용 저장소로 옮기는 방법

이 폴더(`soyo-content/`)는 **독립 저장소가 될 준비가 끝난 상태**다.
지금은 `wor-gear-simulator` 안에 임시로 얹혀 있다.

클로드가 저장소를 직접 만들 수 없어서(GitHub App에 생성 권한이 없다 — 403)
저장소 생성만 사람이 해야 한다.

## 1단계 — 빈 저장소 만들기 (직접)

GitHub에서 새 저장소를 만든다.

- 이름: `soyo-content`
- 공개 범위: **Private**
- `Add a README file` **체크하지 않는다** (비어 있어야 한다)
- `.gitignore`, `license` 모두 **None**

## 2단계 — 클로드에게 말하기

세션에서 이렇게 말하면 된다.

> soyo-content 저장소 만들었어. 옮겨줘.

그러면 클로드가 저장소를 세션에 붙이고, 이 폴더 내용을 첫 커밋으로 푸시하고,
`wor-gear-simulator`에서는 이 폴더를 지운다.

## 3단계 — 환경 만들기 (직접)

클로드 앱/웹에서 환경을 하나 만든다. 클로드는 환경을 만들 수 없다.

- 이름: `김소요 콘텐츠` (원하는 이름)
- 소스 저장소: `soyo-content`

이후 폰에서 세션을 열 때 이 환경을 고르면 `CLAUDE.md`가 자동 로드되고,
`피디야`라고 부르면 바로 김소요 모드가 된다.

## 직접 옮기고 싶다면

```bash
git clone https://github.com/Giles-wor/soyo-content.git
cp -r soyo-content/. soyo-content-clone/
cd soyo-content-clone
rm MIGRATE.md
git add -A
git commit -m "소비요정 김소요 콘텐츠 운영 저장소 초기 구성"
git push -u origin main
```

옮긴 뒤 `wor-gear-simulator`에서 `soyo-content/` 폴더를 지우면 된다.

## 옮긴 뒤 확인할 것

- [ ] 세션을 열고 `피디야` → 김소요 PD로 답하는지
- [ ] `sns팀에 시켜` → SNS팀 에이전트가 붙는지
- [ ] `브랜딩팀 의견 물어봐` → 브랜딩팀 에이전트가 붙는지
- [ ] `npm install && npm run tistory` → 웹 도구가 열리는지
- [ ] `node tistory/qa-cli.mjs` → 사용법이 나오는지

이 파일은 옮긴 뒤 지워도 된다.
