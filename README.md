# Wasteoff: 편의점 마감 판매 시연 페이지

편의점 **수요예측 기반 마감 판매 서비스**를 발표에서 보여 주는 한국어 한 페이지 웹사이트입니다.
수요예측이 당일 남을 것 같은 상품과 수량을 찾고, 점주는 추천된 한정 판매 상품과 수량을 **승인만** 합니다.
고객은 Wasteoff 사이트에서 마감 상품을 확인하고, 포인트를 쓴 뒤 사이트에 뜬 **결제 QR**을 간편결제 앱으로 스캔해
선결제합니다. 주문번호로 픽업하면 상품별로 계산된 **유동 포인트**가 적립됩니다.

전체 흐름: **수요예측 → 점주 승인 → 사이트 확인 → QR 결제 → 주문번호 픽업 → 포인트 적립**

## 화면 구성

1. **첫 화면:** 마감 1시간 전, 남을 상품만 한정 판매
2. **3D로 보는 실제 과정:** 매장과 매장 앞 테이블을 3D로 만들어 6단계를 카메라가 따라갑니다. 자동 재생, 멈춤, 단계 선택을 지원합니다.
3. **점주 승인:** 수요예측 근거, 제육 도시락 예측 결과(실물 재고 12 − 확정 주문 1 − 수요예측 정상가 판매 5 − 안전재고 2 = **남을 예상 4개**), 오늘 남을 상품 추천 목록과 승인, 상품별 유동 포인트
4. **고객 화면(사이트):** 마감 상품 확인 → 포인트 500P 사용(**4,500원**) → 결제 QR → 픽업 번호 **A-024**
5. **수령 완료:** 직원 화면의 수령 처리, 고객 포인트 내역, 전체 흐름

## 유동 포인트 규칙 (예시 값, `src/data.ts`의 `pointPolicy`)

- 적립 포인트 = 가격 × (10% + 남을 예상 비율 × 45%)
  - 남을 예상 비율 = 수요예측상 남을 수량 ÷ 실물 재고
- 상한: 가격의 30%, 그리고 상품 1개당 1,000P 중 작은 값. 10P 단위로 내림
- 적립한 포인트는 당일에는 쓸 수 없고 다음 날부터 사용할 수 있습니다.

| 상품 | 가격 | 남을 예상 | 계산값 | 적립 |
|---|---|---|---|---|
| 제육 도시락 | 5,000원 | 4/12 | 1,250P | **1,000P** (1,000P 상한) |
| 참치마요 삼각김밥 | 1,500원 | 3/6 | 488P | **450P** (가격 30% 상한) |
| 햄치즈 샌드위치 | 3,200원 | 2/8 | 680P | **680P** |

> 화면에 나오는 수요예측, 주문, 재고, 결제, 포인트는 모두 `src/data.ts`에 고정한 **예시 데이터**입니다.
> 실제 수요예측 모델, 로그인, 실제 결제, POS 연동, 데이터 저장, 실시간 재고 계산은 구현하지 않았습니다.
> 화면의 결제 QR은 시연용으로 이 페이지 주소를 담고 있어, 찍으면 결제가 아니라 이 시연 페이지가 열립니다.

## 기술 스택

React 18 · TypeScript · Vite 5 · three.js(3D, 해당 섹션 근처에서만 불러옴) · qrcode-generator · Pretendard 폰트 (정적 사이트)

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
  data.ts                    고정 예시 데이터와 유동 포인트 계산 (수요예측·추천·주문·결제·포인트)
  App.tsx                    섹션 구성, 스크롤 등장 애니메이션, 현재 섹션 표시
  qr.ts                      시연 페이지 주소로 QR 코드 생성
  three/scene.ts             3D 매장 장면 (단계별 카메라·인물·도시락 움직임)
  three/textures.ts          3D 안의 노트북(사이트) 화면, 휴대폰 결제 앱 화면, 간판 그림
  three/steps.ts             3D 6단계 문구와 재생 시간
  components/Process3D.tsx   3D 섹션 (지연 로딩, 자동 재생, 단계 선택)
  components/QrCode.tsx      시연용 QR 코드 (SVG)
  components/Inventory.tsx   수요예측 결과 카드, 재고 막대, 점주 승인 목록, 유동 포인트 표
  components/CustomerScreens.tsx  고객 모바일 화면 3장
  components/ui.tsx          휴대폰 프레임, '화면 예시' 표시, 아이콘
  styles.css                 색상 토큰과 반응형 스타일
  assets/dosirak-1440.jpg    도시락 사진
```

## 사진 출처

도시락 사진: JunHyun Cho, [Convenience store dosirak.jpg](https://commons.wikimedia.org/wiki/File:Convenience_store_dosirak.jpg), CC0 1.0 (퍼블릭 도메인)
