# Harvard Art Museums (harvard-museum) — 검증방법

Harvard Art Museums API 기반 6번째 박물관. API 키가 필요하므로 정적 프론트엔드에 키를
노출하지 않기 위해 **동일 출처 키 프록시**(`/api/harvard/*` → 프록시 컨테이너 → Harvard API)를 둔다.

## 구성
- 프록시: `proxy/`(Node, 의존성 0) → 컨테이너 `art-galleries-proxy`. 키는 운영 트리
  `/opt/stack/services/public/art-galleries.kr/www/.env` 의 `HARVARD_API_KEY`(레포 제외).
- nginx: `location ~ ^/api/harvard/(.*)$` → `art-galleries-proxy:8080/harvard/$1`.
- 프론트: `apps/harvard-museum/js/api.js` 의 `API_BASE = "/api/harvard"`.

## A. 프록시 컨테이너 (mac/linux)
```bash
docker ps --filter name=art-galleries-proxy --format '{{.Names}} {{.Status}}'   # Up
docker exec art-galleries-proxy wget -qO- http://127.0.0.1:8080/healthz          # ok
```

## B. 동일 출처 프록시 경유 호출 (배포 호스트)
```bash
curl -s "http://localhost:3100/api/harvard/object?classification=Paintings&hasimage=1&size=1" | head -c 120
# → {"info":{...},"records":[...]}  (200, 키는 프록시가 주입 — URL 에 키 없음)
```
키 미설정 시: `{"error":"proxy: API key not configured"}` → 운영 트리 `.env` 확인.

## C. 홈 갤러리 / 검색 / 상세 (브라우저)
- `http://localhost:3100/harvard-museum/` → 헤더 "Harvard", 크림슨 테마, **회화 카드 12개**(매 새로고침 다른 작품).
- `…/harvard-museum/search.html?q=monet` → 결과 카드 + count 라벨 + Load more.
- 카드 클릭 → 상세: 이미지, 필드(Date/Medium/Classification/Dimensions/Place of origin/Credit), 관련 작품.
  (Harvard 는 IIIF 식별자가 일관되지 않아 **딥줌 버튼 없음** — 고해상 일반 이미지를 표시)

## D. 즐겨찾기
- ♥ 토글 → `localStorage` 키 `harvard-museum.favorites`, `favorites.html` 표시.

## E. 외부(배포 후, win/mac/linux)
```bash
curl -I https://art-galleries.kr/harvard-museum/                               # 200
curl -s "https://art-galleries.kr/api/harvard/object?q=monet&size=1" | head -c 80   # JSON
```

## 통과 기준
A~D 가 배포 호스트에서 통과하고, 배포 후 E 가 통과하면 완료. 콘솔 에러 없음.

## 메모 / 함정
- **키 비노출**: 키는 운영 트리 `.env` 에만. 레포·정적자산·URL 어디에도 키가 없어야 한다(`git grep <key>` 0건).
- **이미지**: `primaryimageurl` 은 `?width=&height=` 로 크기 조절(303→실제 JPEG). IIIF 딥줌 미사용.
- **검색 노이즈**: `q` 키워드는 X-ray 보존사진 등도 매칭될 수 있음. 첫인상(랜덤)은 `classification=Paintings` 로 회화만.
- **배포**: deploy.sh 가 `--env-file .env --build` 로 프록시 이미지 빌드 + 키 주입. `.env` 없으면 프록시는 키 없이 떠서 Harvard 만 비활성(프론트·타 박물관 정상).
- **재사용**: Smithsonian 등 키 필요한 API 추가 시 `proxy/server.js` 의 `UPSTREAMS` 에 항목만 추가.
