# Wasteoff: 편의점 마감 판매 시연 페이지

편의점 **수요예측 기반 마감 판매 서비스**를 발표에서 보여 주는 한국어 한 페이지 웹사이트입니다.
스크롤을 내리면 아래 흐름이 차례로 나옵니다.

1. **첫 화면:** 마감 1시간 전, 남을 상품만 한정 판매
2. **점주 화면:** 캠퍼스점 제육 도시락, 실물 재고 12 − 확정 주문 1 − 예상 정상가 판매 5 − 안전재고 2 = **한정 판매 4개**
3. **고객 화면:** 상품 선택 → 포인트 500P를 쓴 웹 선결제(**4,500원**) → 픽업 번호 **A-024** 발급
4. **수령 완료:** 직원 화면의 수령 처리와 고객 포인트 내역(잔액 1,000P)

> 화면에 나오는 주문, 재고, 결제, 포인트는 모두 `src/data.ts`에 고정한 **예시 데이터**입니다.
> 로그인, 실제 결제, POS 연동, 데이터 저장, 실시간 재고 계산은 구현하지 않았습니다.

## 기술 스택

React 18 · TypeScript · Vite 5 · Pretendard 폰트 (정적 사이트)

## 로컬 실행

Node.js 18 이상이 필요합니다.

```bash
npm ci
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # dist/ 에 정적 파일 생성
npm run preview    # 빌드 결과 미리보기
```

## GitHub Pages 배포

`.github/workflows/deploy.yml`이 `main` 브랜치에 푸시할 때와 Actions 탭에서 수동으로 실행할 때 동작합니다.
`npm ci` → `npm run build` → `dist` 업로드 → GitHub Pages 배포 순서로 진행됩니다.

처음 한 번만 저장소에서 설정해 주세요.

1. **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
2. `main`에 푸시하거나 **Actions → Deploy to GitHub Pages → Run workflow**로 실행합니다.
3. 배포가 끝나면 `https://<사용자명>.github.io/<저장소명>/`에서 확인합니다.

`vite.config.ts`의 `base`를 `'./'`(상대 경로)로 설정했습니다. 그래서 저장소 하위 경로에서도 JS, CSS, 이미지가
정상적으로 불러와지고, 저장소 이름이 바뀌어도 설정을 고칠 필요가 없습니다.

## 폴더 구조

```
src/
  data.ts                    고정 예시 데이터 (재고·주문·결제·포인트)
  App.tsx                    섹션 구성, 스크롤 등장 애니메이션, 현재 섹션 표시
  components/Inventory.tsx   점주 재고 계산 카드와 재고 막대
  components/CustomerScreens.tsx  고객 모바일 화면 3장
  components/ui.tsx          휴대폰 프레임, '화면 예시' 표시, 아이콘
  styles.css                 색상 토큰과 반응형 스타일
  assets/dosirak-1440.jpg    도시락 사진
```

## 사진 출처

도시락 사진: JunHyun Cho, [Convenience store dosirak.jpg](https://commons.wikimedia.org/wiki/File:Convenience_store_dosirak.jpg), CC0 1.0 (퍼블릭 도메인)
