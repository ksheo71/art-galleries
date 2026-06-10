# 추가 박물관 API 조사 & 사이트 반영 방안

조사일: 2026-06-10. 현재 구현된 4개(chicago, metropolitan, cleveland, vna-east) 외에,
API 를 제공하는 박물관을 조사하고 이 사이트(백엔드 없는 정적 프론트엔드)에 어떻게 추가할지 정리한다.

---

## 1. 평가 기준 (이 사이트의 제약에서 도출)

이 프로젝트는 **백엔드가 없고 브라우저에서 API 를 직접 호출**한다. 따라서 후보 API 는 다음을 만족해야 한다.

| 기준 | 이유 |
|------|------|
| **CORS 허용**(`Access-Control-Allow-Origin`) | 브라우저 직접 호출이므로 필수. 없으면 프록시(=백엔드) 필요 |
| **API 키 불필요** (또는 키 노출 감수) | 정적 사이트에 키를 넣으면 공개 노출됨. 현재 4개는 모두 무키 |
| **키워드 검색 + 객체 상세 + 이미지 URL** | 앱의 home/search/artwork 페이지가 요구하는 최소 기능 |
| **공개도메인/오픈 라이선스 이미지** | 작품 이미지를 표시·확대하므로 |

> **키 노출 대응**: 키가 필요한 API 도, 이미 운영 중인 **Cloudflare Tunnel 인프라에 Cloudflare Worker** 를
> 하나 두어 키를 서버측에 숨기는 경량 프록시로 쓸 수 있다(여전히 "서버 없는" 정적 사이트 유지). Tier 2 참고.

---

## 2. 현재 아키텍처에서 박물관 1개 추가 비용

각 박물관 앱은 `/apps/<folder>/` 아래 **자기완결형**으로, 동일한 **어댑터 계약**을 따른다.

- **공통 함수 계약** (`js/api.js` 가 export): `search({q,page,limit})`, `fetchArtwork(id)`,
  `fetchRandomGallery({count})`, `fetchRelated({...})`, `fetchDepartments()` + IIIF/이미지 헬퍼.
- **공통 정규화 레코드 shape** (각 API 응답을 이 형태로 매핑):
  `{ id, title, artist, date, dateStart, dateEnd, medium, classification, dimensions,
     placeOfOrigin, creditLine, department, description, thumbUrl, fullImageUrl, imageId }`
- `js/ui/*` 와 `js/pages/*` 는 박물관마다 **복제**되어 테마색·소소한 필드만 다르다(현재는 공유 모듈 아님).

**따라서 새 박물관 추가 = ①기존 폴더를 템플릿으로 복제 → ②`api.js` 어댑터를 해당 API 에 맞게 다시 작성
(응답을 공통 shape 로 매핑) → ③테마색/타이틀 → ④`serve.json` rewrites → ⑤허브 `apps/index.html` 카드 추가.**
nginx docroot 이 `apps/` 라 폴더만 생기면 **서빙·배포는 자동**(별도 인프라 작업 없음, git push 시 자동 배포).

---

## 3. 후보 분류 (검증 결과 기준)

검증: `curl -H "Origin: https://art-galleries.kr"` 로 HTTP 상태·CORS 헤더·키 요구를 직접 확인(2026-06-10).

### Tier 1 — 무키 + CORS, 현재 4개처럼 즉시 추가 가능 ✅

| 박물관 | API base | 검증 | 이미지 | 비고 |
|--------|----------|------|--------|------|
| **Yale (LUX / Yale University Art Gallery)** | `https://lux.collections.yale.edu/api/` | 200, CORS `*`, 무키 | IIIF + `media.collections.yale.edu` 썸네일 | **최우선 추천.** Linked Art 표준. 단 검색은 객체 *참조*만 반환 → 상세/이미지는 객체 URI 를 N번 더 fetch(그리드 20개 = +20요청) |
| **Auckland War Memorial Museum (NZ)** | `https://api.aucklandmuseum.com/search/collectionsonline/_search` | 200, CORS `*`, 무키 | media API | raw Elasticsearch 패스스루(강력하지만 인덱스 스키마 학습 필요). 자연사 비중 큼·이미지 권리 혼재 → 미술 특화도 낮음 |
| (옵션) **Wikidata / Wikimedia Commons** | `https://query.wikidata.org/sparql`, Commons API | 200, CORS `*`, 무키 | Commons 원본/IIIF | 단일 박물관 아님. "전 세계 명화" 같은 **교차기관 갤러리** 컨셉이면 매우 강력(공개도메인 회화 수천 점) |

### Tier 2 — 무료 키 필요(+ CORS 대체로 허용). 키 노출/프록시 고려 ⚠️

| 박물관 | API base | 검증 | 라이선스/특징 |
|--------|----------|------|----------------|
| **Harvard Art Museums** | `https://api.harvardartmuseums.org/` | 401(무키), **CORS `*`** | IIIF, 풍부한 메타데이터. 키 무료 발급. CORS OK라 키만 있으면 브라우저 호출 가능 |
| **Smithsonian Open Access** | `https://api.si.edu/openaccess/api/v1.0/` | 403(무키), CORS `*` | **CC0** 대량. 키는 api.data.gov 무료 |
| **Rijksmuseum** | (구) `rijksmuseum.nl/api` / (신) `data.rijksmuseum.nl` | 구 410(폐기), 신 CORS `*`(Linked Art) | 네덜란드 걸작. 구 API 는 키 필요했고 현재 신 데이터 API 로 이전 중 → 쿼리 모델 재확인 필요 |
| **Cooper Hewitt (Smithsonian Design)** | `https://api.collection.cooperhewitt.org/rest/` | CORS `*`, 토큰 필요 | 디자인 컬렉션 |
| **Europeana** | `https://api.europeana.eu/record/v2/` | 401(무키), CORS `*` | 유럽 전역 집계, 키 무료 |
| **Finnish National Gallery / DPLA 등** | 각 사이트 | 키 필요 | 지역 특화 |

### Tier 3 — 정적 데이터셋만(라이브 검색 API 없음). 그대로는 부적합 ❌

MoMA, Tate, National Gallery of Art(워싱턴 DC), Minneapolis Institute of Art(Mia), Met 연구용 CSV 등은
**GitHub 의 CSV/JSON 덤프**만 제공한다(라이브 엔드포인트 없음). 이 사이트에 쓰려면 데이터 적재·인덱싱(=백엔드/검색엔진)
또는 빌드시 정적 인덱스 생성(ETL)이 필요하므로 "무백엔드" 원칙과 맞지 않는다. 향후 검색 백엔드를 도입한다면 후보.

---

## 4. 권장 로드맵

1. **Yale (LUX)** — Tier 1, 무키·CORS·IIIF·미술 특화. 다음 추가 1순위. 폴더 제안: `yale-museum`.
   - 구현 포인트: 검색은 `?q={"text":"<kw>"}` JSON 쿼리 → `orderedItems`(객체 URI) + `partOf[].totalItems`(총건수).
     각 객체 URI fetch → `_label`(제목), `produced_by`/`carried_out_by`(작가), `representation→digitally_shown_by→access_point`(이미지).
     그리드 1페이지당 N+1 fetch 이므로 `Promise.all` 로 병렬화 + 페이지당 12~20개로 제한.
2. **Harvard Art Museums** — Tier 2지만 CORS `*` 라 키만 발급하면 추가 쉬움. 데이터 품질 최상.
   키 노출이 꺼려지면 Cloudflare Worker 프록시(아래) 도입.
3. **Smithsonian (CC0)** 또는 **Wikidata 교차기관 갤러리** — 컬렉션 성격 다양화용.

---

## 5. 통합(구현) 가이드 — 새 박물관 추가 절차

1. `docs/references/api_info.md` 에 행 추가(provider/folder/url/api base). **폴더명은 이 파일이 단일 소스.**
2. 기존 박물관 폴더(예: `apps/vna-east-museum/`)를 새 폴더로 복제.
3. `js/api.js` 를 대상 API 에 맞게 재작성 — 응답을 §2 의 **공통 정규화 shape** 로 매핑하고
   동일한 **함수 계약**을 export. 이미지/IIIF 헬퍼도 해당 도메인에 맞게.
4. `index.html`·`search.html`·`artwork.html`·`favorites.html` 의 타이틀/테마색 교체,
   `serve.json` 의 rewrites 경로를 새 폴더 기준으로(확장자 없는 URL → `.html`).
5. 허브 `apps/index.html` 에 새 박물관 카드/링크(`./<folder>/`) 추가.
6. `git push` → self-hosted runner 가 자동 배포(nginx docroot=apps 라 폴더 자동 서빙). 인프라 작업 불필요.
7. **검증**: `docs/tasks/검증방법/<folder>-검증방법.md` 작성 — 홈 갤러리/검색/상세/이미지 로딩 확인.

### API별 함정 체크리스트 (V&A 교훈 반영 — `docs/mistake-history.md` 참조)
- **Deep pagination 한계**: Elasticsearch 기반 API 는 `offset(page*page_size) ≤ 10,000` 초과 시 실패(랜덤/페이지 상한 필요). V&A 가 이 케이스였음.
- **CORS 헤더 없는 에러 응답**: 한계 초과/오류 시 브라우저에서 HTTP 상태가 아니라 `TypeError: Failed to fetch` 로 보임 → 원인 추적 어려움.
- **N+1 검색(Yale LUX 등 Linked Art)**: 검색이 참조만 반환하면 상세를 병렬 fetch + 페이지 크기 제한.
- **이미지 라이선스 혼재**: 공개도메인/CC0 만 노출하거나, 권리 제한 항목은 썸네일 없는 카드 필터링.

### Tier 2(키 필요) 를 무백엔드로 쓰는 법 — Cloudflare Worker 프록시
이미 Cloudflare Tunnel 을 쓰므로, Worker 하나(`api-proxy.art-galleries.kr/<museum>/*`)를 두어
서버측 환경변수에 키를 보관하고 요청을 원 API 로 포워딩하면, 정적 프론트엔드는 키 없이 호출 가능하고
키는 노출되지 않는다. (선택 사항 — 무키 Tier 1 만으로도 확장은 충분.)

---

## 6. 한 줄 결론
**다음 추가는 무키·CORS·IIIF 를 모두 만족하는 Yale(LUX) 가 최적.** 그다음 데이터 품질이 좋은
Harvard(키 필요하나 CORS OK), 다양성 위해 Smithsonian/Wikidata. 정적 덤프만 있는 MoMA·Tate·NGA 는
검색 백엔드 도입 전까지는 보류.

### 출처
- Harvard Art Museums API 문서: https://harvardartmuseums.org/collections/api , https://github.com/harvardartmuseums/api-docs
- Smithsonian Open Access: https://www.si.edu/openaccess/devtools
- Yale LUX: https://lux.collections.yale.edu/ (api/search/item, data/object)
- Getty Open Data & APIs: https://www.getty.edu/projects/open-data-apis/
- Met API(기보유): https://metmuseum.github.io/
- 박물관 API 목록(GLAM): http://museum-api.pbworks.com/ , https://dahd.hcommons.org/open-data-collections/
