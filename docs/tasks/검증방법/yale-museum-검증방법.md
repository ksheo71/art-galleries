# Yale University Art Gallery (yale-museum) — 검증방법

Yale LUX(Linked Art) API 기반 5번째 박물관 앱. 무키 + CORS. 검색이 객체 *참조*만 반환하므로
각 객체를 병렬 fetch(N+1) 해서 카드/상세를 구성한다.

> 정적 사이트라 별도 빌드 없음. 로컬은 `apps/` 를 정적 서버로 띄워 검증한다.

## 사전: 로컬 서버 (mac/linux)
```bash
cd ~/workspace/art-galleries
./scripts/start-server.sh 8010      # http://localhost:8010/
```
windows: `./scripts/start-server.ps1 8010`

## A. 허브에 Yale 카드 (브라우저)
- `http://localhost:8010/` → "Yale University Art Gallery" 카드(블루)가 5번째로 표시, 클릭 시 `/yale-museum/` 이동.

## B. 홈 갤러리 (브라우저 / curl)
- `http://localhost:8010/yale-museum/` → 헤더 "Yale", 제목 "Yale University Art Gallery", 그 아래 **이미지 카드 12개** 렌더(매 새로고침 다른 작품).
- 빠른 점검(mac/linux):
  ```bash
  curl -s "https://lux.collections.yale.edu/api/search/item?q=%7B%22AND%22%3A%5B%7B%22hasDigitalImage%22%3A1%7D%2C%7B%22classification%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fconcept%2Ff205dced-45a6-46d4-a4c5-efec14705c55%22%7D%7D%5D%7D&page=1&pageLength=3" | head -c 120
  # → {"@context"... orderedItems 포함 (200)
  ```

## C. 검색 (브라우저)
- `http://localhost:8010/yale-museum/search.html?q=monet` → Claude Monet 작품 카드들, count 라벨 "Showing 12 of ~NN objects", "Load more" 동작.
- 작가명이 "Artist: …(French, 1840–1926)" 가 아니라 **"Claude Monet"** 로 정리되어 표시.

## D. 작품 상세 + 딥줌 (브라우저)
- 카드 클릭(또는 `…/artwork.html?id=e0739551-91d0-4c7a-9722-4ff5d3830702`).
- 확인: 이미지 표시, 필드(Date/Medium/Classification/Dimensions/Place of origin/Credit) 채워짐,
  **"View in high-res"** 버튼 → 클릭 시 OpenSeadragon 딥줌 뷰어 모달 열림(IIIF info.json).
- 관련 작품(Related objects) 그리드 표시.

## E. 즐겨찾기
- 카드/상세의 ♥ 토글 → `localStorage` 키 `yale-museum.favorites` 에 저장, `favorites.html` 에 표시.

## F. 외부(배포 후, win/mac/linux)
```bash
curl -I https://art-galleries.kr/yale-museum/                 # → 200
curl -s https://art-galleries.kr/yale-museum/js/api.js | grep -c lux.collections.yale.edu   # > 0
```

## 통과 기준
A~E 가 로컬에서 모두 통과하고, 배포 후 F 가 통과하면 완료. 콘솔에 에러 없음.

## 구현 메모 / 함정 (mistake-history 연계)
- **N+1 검색**: LUX 검색은 객체 URI만 반환 → `Promise.all` 로 객체 병렬 fetch, 페이지 크기 12로 제한.
- **이미지 도메인 혼재**: `media.collections.yale.edu`(썸네일, 307), `images.collections.yale.edu`/`collections.library.yale.edu`(IIIF). 그리드는 representation 썸네일 그대로, 상세는 매니페스트(`manifests.collections.yale.edu`)에서 IIIF Image 서비스 추출해 딥줌.
- **랜덤 화사함/잡음 제거**: 바닐라 `hasDigitalImage:1` 은 archival material·흑백 발굴사진이 섞임 → `classification = Paintings` 개념으로 한정해 색감 풍부한 회화 위주로 표시.
- **deep pagination**: LUX 는 V&A 같은 10,000 하드 한계는 없었으나(테스트 시 page 2000도 200), 랜덤 페이지는 다양성/지연 위해 상한(500) 적용.
