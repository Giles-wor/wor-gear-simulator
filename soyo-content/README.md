# soyo-content

소비요정 김소요 콘텐츠 운영 저장소.

> 네이버는 브랜드를 키우고, 티스토리는 검색 자산을 쌓는다.

## 이 저장소를 여는 순간

`CLAUDE.md`가 자동으로 로드된다. 그래서 세션을 열고 `피디야`라고 부르면
바로 김소요 콘텐츠 PD로 일한다. 별도 설명을 붙이지 않아도 된다.

폰이나 웹에서 세션을 열 때 **이 저장소를 소스로 하는 환경**을 고르면 된다.

## 구성

```
CLAUDE.md                            역할·호칭·브랜드 원칙 (항상 로드된다)
.claude/agents/sns-team.md           SNS팀 — 선별·재가공·검수 실무
.claude/agents/branding-team.md      브랜딩팀 — 일관성·톤·네이밍 검토
.claude/skills/tistory-convert/      티스토리 재가공 절차
tistory/                             재가공 도구 (규칙·프롬프트·HTML·검수)
tistory/RELAUNCH-CHECKLIST.md        기존 223개 글·애드센스 정리 수동 작업
```

## 쓰는 방법

### 클로드 세션에서 (주 경로)

네이버 원고를 주면 된다. `/tistory-convert` 스킬이 판단 → 변환 → 검수까지 잇는다.
설치할 것이 없다.

팀에 넘기고 싶으면 그냥 말하면 된다.

- `sns팀에 시켜` → 선별·재가공·1차 검수를 실무팀이 처리
- `브랜딩팀 의견 물어봐` → 브랜드 일관성 검토

### 로컬 웹 도구 (보조)

```bash
npm install      # 최초 1회
npm run tistory
```

입력 → 프롬프트 복사 → 클로드 결과 붙여넣기 → 티스토리 HTML + 검수 결과.

### CLI

```bash
node tistory/qa-cli.mjs init   input/naver_post.md
node tistory/qa-cli.mjs prompt input/naver_post.md
node tistory/qa-cli.mjs check  output/tistory_post.md --naver input/naver_post.md --out output/
```

`[수정]` 항목이 남으면 종료 코드 1이다.

자세한 내용은 [tistory/README.md](./tistory/README.md).

## 지켜야 할 것

1. 네이버 글을 먼저 쓰고 **발행한다**
2. 검색 수명이 긴 글만 골라 티스토리용으로 재가공한다
3. 네이버 일정이나 영상 제작이 밀리면 **티스토리를 생략한다**
4. 글당 추가 작업 10분 내외, 전체 작업 시간의 10~20%를 넘기지 않는다
5. **발행은 사람이 한다.** 자동 발행하지 않는다

`input/`과 `output/`은 커밋되지 않는다. 작업 중인 원고는 저장소에 남지 않는다.
