# Mistake History

재발 방지를 위한 과거 실수 정리. 구현 전 이 파일을 먼저 확인한다.

## 2026-04-19 · `serve`의 cleanUrls 가 쿼리 스트링을 삭제

**증상**: 메인 페이지에서 "monet" 검색 시 검색 결과 페이지에 아무것도 나오지 않음 ("Enter a keyword above to search the collection." 만 표시).

**원인**: `npx serve` 는 기본값으로 `cleanUrls: true` 이다. `/search.html?q=monet` 요청 시:
- 301 Moved Permanently → `Location: /search`
- 리다이렉트 시 **쿼리 스트링이 잘려나감**
- 브라우저가 `/search` 로 이동하면 `location.search` 가 빈 문자열 → `URLSearchParams.get("q")` 가 `null` → `state.q` 가 빈 문자열

**해결**: `apps/chicago-meseum/serve.json` 생성 후 clean URLs 비활성화 + 루트 경로 rewrite 추가:
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

**연관 파일**: `apps/chicago-meseum/serve.json`, `docs/tasks/검증방법/chicago-meseum-mvp-검증방법.md`.
