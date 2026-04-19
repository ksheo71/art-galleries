# Mistake History

재발 방지를 위한 과거 실수 정리. 구현 전 이 파일을 먼저 확인한다.

## 2026-04-19 · `serve`의 cleanUrls 가 쿼리 스트링을 삭제

**증상**: 메인 페이지에서 "monet" 검색 시 검색 결과 페이지에 아무것도 나오지 않음 ("Enter a keyword above to search the collection." 만 표시).

**원인**: `npx serve` 는 기본값으로 `cleanUrls: true` 이다. `/search.html?q=monet` 요청 시:
- 301 Moved Permanently → `Location: /search`
- 리다이렉트 시 **쿼리 스트링이 잘려나감**
- 브라우저가 `/search` 로 이동하면 `location.search` 가 빈 문자열 → `URLSearchParams.get("q")` 가 `null` → `state.q` 가 빈 문자열

**해결**: `apps/chicago-meseum/serve.json` 생성 후 clean URLs 비활성화:
```json
{ "cleanUrls": false, "trailingSlash": false }
```

`serve` 가 같은 디렉토리의 `serve.json` 을 자동 로드한다. 설정 후 `/search.html?q=monet` 이 200 OK 직접 응답되어 쿼리 스트링 보존.

**교훈**:
- 정적 서버 선택 시 기본 동작 (clean URL, trailing slash, 리다이렉트) 이 쿼리/해시 보존 여부를 항상 확인할 것.
- 리다이렉트 체인에서 `curl -sIL <URL>` 로 `Location:` 헤더를 확인하면 원인 파악이 빠름.
- GitHub Pages, Netlify, Vercel, Cloudflare Pages 각각 기본 동작이 다르므로 배포 전 재확인 필요.

**연관 파일**: `apps/chicago-meseum/serve.json`, `docs/tasks/검증방법/chicago-meseum-mvp-검증방법.md`.
