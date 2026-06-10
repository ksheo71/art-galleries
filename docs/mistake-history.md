# Mistake History

재발 방지를 위한 과거 실수 정리. 구현 전 이 파일을 먼저 확인한다.

## 2026-04-19 · `serve`의 cleanUrls 가 쿼리 스트링을 삭제

**증상**: 메인 페이지에서 "monet" 검색 시 검색 결과 페이지에 아무것도 나오지 않음 ("Enter a keyword above to search the collection." 만 표시).

**원인**: `npx serve` 는 기본값으로 `cleanUrls: true` 이다. `/search.html?q=monet` 요청 시:
- 301 Moved Permanently → `Location: /search`
- 리다이렉트 시 **쿼리 스트링이 잘려나감**
- 브라우저가 `/search` 로 이동하면 `location.search` 가 빈 문자열 → `URLSearchParams.get("q")` 가 `null` → `state.q` 가 빈 문자열

**해결**: `apps/chicago-museum/serve.json` 생성 후 clean URLs 비활성화 + 루트 경로 rewrite 추가:
```json
{
  "cleanUrls": false,
  "rewrites": [{ "source": "/", "destination": "/index.html" }]
}
```

`serve` 가 같은 디렉토리의 `serve.json` 을 자동 로드한다. 설정 후 `/search.html?q=monet` 이 200 OK 직접 응답되어 쿼리 스트링 보존.

> **주의**: `cleanUrls: false` 만 설정하면 `/` 루트가 index.html 로 자동 매핑되지 않고 디렉토리 리스팅이 뜬다. `rewrites` 로 `/` → `/index.html` 을 명시해야 한다. `trailingSlash` 는 건드리지 않는다 (기본값 유지).

### 후속 이슈: 캐시된 301 리다이렉트

`cleanUrls` 를 끈 후에도 같은 포트로 재접속하면 404 가 날 수 있다.
- 원인: 이전 `cleanUrls: true` 서버가 응답한 **301 Moved Permanently** (`/search.html` → `/search`) 가 브라우저에 캐시됨. 301 은 영구 리다이렉트라 브라우저가 서버 확인 없이 즉시 리다이렉트한다 (쿼리 스트링 포함 경로 전체).
- 증상: `./search.html?q=monet` 클릭 → 브라우저가 서버 요청 없이 `/search` 로 바로 점프 (쿼리 스트링도 같이 날아감) → 새 서버는 `/search` 를 모르니 404.
- 우회: **다른 포트로 실행** (`-l 5173`) 하거나 브라우저 **시크릿 창** 사용. 같은 포트로 가려면 DevTools → Network → "Disable cache" 체크 후 F5, 또는 사이트 데이터 삭제.
- 방어: `serve.json` 의 `rewrites` 에 `/search → /search.html`, `/artwork → /artwork.html`, `/favorites → /favorites.html` 를 추가해 두면 캐시된 경로도 404 대신 (쿼리 없는) 페이지로 떨어진다. 쿼리는 여전히 캐시가 날려버리므로 완전한 복구는 캐시 삭제/시크릿 창만 가능.

**교훈**: 301 은 공격적으로 캐시된다. 정적 서버 설정을 바꿔 URL 포맷을 변경했을 땐 반드시 **포트를 바꾸거나 캐시를 지워서** 테스트한다.

**교훈**:
- 정적 서버 선택 시 기본 동작 (clean URL, trailing slash, 리다이렉트) 이 쿼리/해시 보존 여부를 항상 확인할 것.
- 리다이렉트 체인에서 `curl -sIL <URL>` 로 `Location:` 헤더를 확인하면 원인 파악이 빠름.
- GitHub Pages, Netlify, Vercel, Cloudflare Pages 각각 기본 동작이 다르므로 배포 전 재확인 필요.

**연관 파일**: `apps/chicago-museum/serve.json`, `docs/tasks/검증방법/chicago-museum-mvp-검증방법.md`.

## 2026-06-10 · V&A East 홈 갤러리 간헐적 "We couldn't load the gallery" (deep pagination 한계)

**증상**: 4개 박물관 중 V&A East Museum 홈만 자주 "We couldn't load the gallery right now." 에러. 다른 3개는 정상. 새로고침하면 가끔 되고 가끔 안 됨(간헐적).

**원인**: V&A 검색 API(`api.vam.ac.uk/v2/objects/search`)는 Elasticsearch 기반으로 **deep pagination 한계**가 있다. `offset = page * page_size` 가 **10,000(`max_result_window`)을 초과**하면 CORS 헤더 없는 에러 응답을 반환 → 브라우저 fetch 가 `TypeError: Failed to fetch` 로 throw → `request()` 의 catch 가 `{ok:false, error:{kind:"network"}}` 반환.
- `fetchRandomGallery` 가 랜덤 페이지를 **1~1000**, `page_size = count+4 = 16` 으로 호출 → `page > 625` 이면 offset > 10,000 → 실패. 즉 **약 37% 확률**로 실패(측정 ~30%와 일치).
- 게다가 `pages/home.js` 는 첫 `!ok` 에 **재시도 없이 즉시 renderError** 하므로 한 번만 실패해도 에러 화면.
- 검증 근거: page 540(offset 8,640) → 200, page 630(offset 10,080) → `Failed to fetch`.

**해결**: `apps/vna-east-museum/js/api.js`
- 상수 `MAX_RESULT_WINDOW = 10000` 추가.
- `fetchRandomGallery`: 랜덤 페이지 상한을 `floor(MAX_RESULT_WINDOW / page_size)`(=625) 로 제한.
- `search`: `totalPages` 를 `min(API pages, floor(MAX_RESULT_WINDOW / limit))` 로 제한해 도달 불가능한(=실패하는) 페이지를 페이지네이션에서 제외.
- 검증: `fetchRandomGallery` 20/20 성공, 홈 갤러리 12카드 렌더, 검색 최대 페이지(399, offset 9,975)도 200.

**교훈**:
- 외부 검색 API 의 **deep pagination 한계(max_result_window)** 를 항상 확인한다. 한계 초과 응답이 CORS 헤더 없이 오면 브라우저에선 HTTP 상태가 아니라 `TypeError: Failed to fetch` 로 나타나 원인 파악이 어렵다.
- 랜덤/페이지네이션 파라미터는 `page * page_size ≤ 한계` 가 항상 성립하도록 상한을 건다.
- "간헐적" 실패는 랜덤 파라미터를 의심하고, 결정적 스윕(page 90,180,...)으로 경계를 찾으면 원인이 빨리 드러난다.

**연관 파일**: `apps/vna-east-museum/js/api.js`, `docs/tasks/검증방법/vna-east-museum-검증방법.md`.

## 2026-06-10 · 국가유산청 이미지 API: 모든 이미지가 단일 `<item>` 에 평탄하게 담김

**증상**: korea-heritage 상세페이지에서 이미지 썸네일 스트립이 1장만 나옴(`totalCnt`는 99인데 파싱 결과 1장).

**원인**: `SearchImageOpenapi.do` 응답은 박물관 통상 패턴(`<item>` 1개당 이미지 1장)과 달리, **하나의 `<item>` 노드 안에 `sn/imageNuri/imageUrl/ccimDesc` 가 N번 반복**되는 평탄 구조다. 따라서 `querySelectorAll("item")` 은 1개만 잡고, 그 안에서 `querySelector("imageUrl")` 는 첫 장만 반환.

**해결**: `apps/korea-heritage/js/detail.js` — `item` 단위가 아니라 `imageUrl`/`ccimDesc` 노드를 각각 전부 모아(`querySelectorAll("imageUrl")`) 인덱스로 짝지어 매핑. 과다 방지로 `.slice(0,15)`.

**교훈**: 공공 XML API 는 동일 기관이라도 엔드포인트마다 레코드 경계(`<item>`)가 일관되지 않을 수 있다. `totalCnt` 와 실제 파싱 개수가 어긋나면 래퍼 노드 구조부터 의심하고, 레코드 단위 대신 **리프 태그를 직접 수집**하는 파싱으로 우회한다.

**연관 파일**: `apps/korea-heritage/js/detail.js`, `docs/tasks/검증방법/korea-heritage-검증방법.md`.
