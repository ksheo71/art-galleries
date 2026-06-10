# emuseum (e뮤지엄 · 국립박물관 통합 소장품) 검증방법

## 개요
e뮤지엄 OpenAPI(국립중앙박물관 등 국립박물관 통합 소장품)를 **이미지와 함께 라이브 검색·감상**하는 앱. 키가 필요해 Harvard 와 같은 동일출처 키 프록시(`/api/emuseum/*`)를 경유한다(키 비노출).
- 프록시: `proxy/server.js` 의 `UPSTREAMS.emuseum` (업스트림 `http://www.emuseum.go.kr/openapi`)
- 프론트: `apps/emuseum/index.html`(검색·브라우즈), `detail.html`(상세 + 이미지 갤러리 + 연관소장품)
- 웹 경로: `/emuseum` · API 경유: `/api/emuseum/*`
- 운영 키: `.env` 의 `EMUSEUM_API_KEY` (data.go.kr/문화데이터광장 활용신청, **Decoding 키**)

## 0. 핵심 함정(회귀 방지)
- ⚠️ 업스트림은 **반드시 http://** — `https://www.emuseum.go.kr/openapi` 는 `4012 NO OPENAPI SERVICE` 를 낸다.
- ⚠️ 이미지(`imgThumUri*`·`imgUri`)는 응답에 박힌 **per-image 서명 토큰**(serviceKey=<token>)을 가진 http URL.
  프론트가 동일출처 `/api/emuseum/img?...` 로 재작성하고, 프록시는 **요청에 serviceKey 가 있으면 덮어쓰지 않아** 토큰을 보존한다(메인 키로는 img 가 500).
- ⚠️ 프록시는 클라이언트 `Accept` 를 그대로 전달한다 — 이미지에 `application/json` 을 강제하면 **406**.

## 1. 프록시 단독 검증 (키 필요)

```bash
# mac/linux — 프록시를 로컬에서 띄운다
EMUSEUM_API_KEY=<발급키> PORT=8099 node proxy/server.js &

# 목록조회(0000 정상이어야 함, 응답에 메인키가 없어야 함=REDACTED)
curl -s "http://localhost:8099/emuseum/relic/list?name=청자&numOfRows=2" -H "Accept: application/json" | head -c 400

# 이미지(목록 응답의 imgThumUriM 값을 동일출처로 바꿔 호출 → image/jpeg 200 이어야 함)
#   http://www.emuseum.go.kr/openapi/img?... → http://localhost:8099/emuseum/img?...
```

검증 포인트: 목록 `resultCode 0000`, 응답에 `EMUSEUM_API_KEY` 원문이 없음(REDACTED), 이미지 요청이 `200 image/jpeg`.

## 2. 프론트 end-to-end (로컬)

프리뷰 정적 서버는 `/api/emuseum` 을 프록시하지 않으므로, 로컬에서는 프록시(8099)를 띄우고 브라우저
콘솔에서 API 베이스를 프록시 절대주소로 지정한다(프록시 CORS 허용):

```js
// 브라우저 콘솔에서 1회
localStorage.setItem('emuseumApiBase', 'http://localhost:8099/emuseum');
location.reload();
```

(운영에서는 `localStorage` 미설정 → 기본값 동일출처 `/api/emuseum` 사용)

화면 검증 체크리스트 (`/emuseum/`):
- [ ] 허브에 "국립박물관 소장품" 카드가 보이고 클릭 시 이동
- [ ] 홈 진입 시 카드 그리드 + **썸네일 이미지가 실제로 로드**(깨지지 않음, https)
- [ ] 카드에 소장처 배지(예: 국립중앙박물관) + 한글/한자 명칭
- [ ] 검색창에 "청자" 입력 → 결과·총건수 갱신, 결과가 검색어와 일치
- [ ] "더 보기" 클릭 → 다음 페이지가 아래로 누적
- [ ] 카드 클릭 → 상세에서 큰 이미지 + 국적·시대/재질/용도/소장처/설명
- [ ] 이미지 여러 장인 유물은 상세 썸네일 스트립 클릭 시 메인 교체
- [ ] (있는 경우) 연관 소장품 그리드 노출

## 3. 콘솔 오류 없음
DevTools 콘솔에 빨간 오류(특히 mixed-content/CORS/406)가 없어야 한다. 이미지는 동일출처 https(`/api/emuseum/img`)로 로드된다.

## 4. 운영 배포 전제
운영 트리 `.env` 에 `EMUSEUM_API_KEY=<Decoding 키>` 를 추가하고 `docker compose up -d` 로 프록시 컨테이너에 주입해야 한다. 키 없이는 프록시가 `{ error: "proxy: API key not configured" }` 를 반환한다.
