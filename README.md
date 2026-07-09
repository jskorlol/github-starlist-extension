# Starlist for Git Repositories

![Starlist for Git Repositories](/assets/img.png)

GitHub를 이용하면서 스타리스트를 쉽게 볼 수 있도록, Stars 페이지에서 각 리포지토리가
어떤 리스트에 포함되어 있는지 `Starred` 버튼 왼쪽에 라벨로 표시해주는 크롬 확장
프로그램입니다.

## 핵심 기능

- GitHub Stars 탭(`?tab=stars`) 진입 시 자동 실행
- 각 스타 카드에 체크된 리스트 라벨(예: 🤖 ai, 🏰 devops)을 pill 형태로 표시
- 동일 repo는 페이지 내 캐시로 중복 요청 방지
- 실패/비로그인 상태에서는 표시하지 않음

## 동작 방식

1. Stars 페이지에서 각 카드의 Star/Unstar form을 기준으로 repo를 찾습니다.
2. `https://github.com/<owner>/<repo>/lists` HTML을 가져옵니다.
3. 체크된 리스트 입력(`input.js-user-list-menu-item[checked]`)의 라벨 텍스트를 파싱합니다.
4. 파싱된 라벨들을 `Starred` 버튼 왼쪽에 표시합니다.

## 로컬 개발

```bash
pnpm install
pnpm dev
```

Chrome에서 `chrome://extensions` → 개발자 모드 활성화 → `dist` 폴더 로드

## 디렉터리 개요

- `pages/content` : Stars 페이지에 주입되는 콘텐츠 스크립트
- `pages/content/src/starlist` : 리스트 파싱/배지 표시 로직
- `chrome-extension/manifest.ts` : 확장 매니페스트 설정
- `chrome-extension/public/content.css` : 배지 스타일

## 주의 사항

- GitHub의 DOM/HTML 구조 변경 시 파싱 로직이 깨질 수 있습니다.
- 리스트 표시 여부는 `/lists` 응답의 `checked` 체크박스를 기준으로 판단합니다.
