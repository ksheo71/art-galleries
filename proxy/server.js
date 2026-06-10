// 박물관 API 키 프록시 (얇은 백엔드)
//
// 목적: API 키가 필요한 박물관 API 를, 정적 프론트엔드에 키를 노출하지 않고
// 호출하기 위한 최소 리버스 프록시. 키는 컨테이너 env(맥미니 .env)에서 읽으며
// 레포에는 절대 들어가지 않는다.
//
// 라우팅: GET /<museum>/<rest...>?<query>
//   → <upstream.base>/<rest...>?<query>&<keyParam>=<key>
// 응답(JSON)을 그대로 전달. nginx 가 /api/harvard/ → 이 컨테이너로 proxy_pass 하므로
// 브라우저에서는 동일 출처(art-galleries.kr/api/harvard/...) 로 호출한다.
//
// 키 필요한 박물관이 늘면 UPSTREAMS 에 항목만 추가하면 된다.

const http = require("http");

const UPSTREAMS = {
  harvard: {
    base: "https://api.harvardartmuseums.org",
    keyParam: "apikey",
    key: process.env.HARVARD_API_KEY,
    // SSRF/오용 방지: 허용 경로 prefix 화이트리스트
    allow: [/^object(\/\d+)?$/, /^classification$/, /^century$/, /^person(\/\d+)?$/],
  },
  // e뮤지엄(국립박물관 통합) OpenAPI. data.go.kr 활용신청으로 발급받은 serviceKey 주입.
  // ⚠️ 주의 1: 업스트림은 반드시 http:// — https 는 4012(NO OPENAPI SERVICE)를 반환한다(서버측 라우팅 차이).
  // ⚠️ 주의 2: .env 에는 "Decoding" 키(원문)를 넣을 것 — searchParams.set 이 1회 인코딩하므로
  //           이미 %-인코딩된 "Encoding" 키를 넣으면 이중 인코딩되어 인증 실패한다.
  // 이미지: 목록/상세 응답의 imgUri/imgThumUri* 는 per-image 서명 토큰(serviceKey=<token>)을 가진
  //   http URL 이다. 프론트가 이를 동일출처 /api/emuseum/img?... 로 재작성해 호출하면, 아래
  //   "요청에 이미 keyParam 이 있으면 덮어쓰지 않음" 규칙 덕에 토큰이 보존되어 이미지가 열린다
  //   (메인 키로는 img 가 500). https 로 감싸 mixed-content 도 해소.
  emuseum: {
    base: "http://www.emuseum.go.kr/openapi",
    keyParam: "serviceKey",
    key: process.env.EMUSEUM_API_KEY,
    allow: [/^code$/, /^relic\/list$/, /^relic\/detail$/, /^img$/],
  },
};

const PORT = process.env.PORT || 8080;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }
  if (req.url === "/healthz") {
    res.writeHead(200, { ...CORS, "Content-Type": "text/plain" });
    return res.end("ok");
  }
  if (req.method !== "GET") {
    res.writeHead(405, CORS);
    return res.end("Method not allowed");
  }

  const url = new URL(req.url, "http://localhost");
  const m = url.pathname.match(/^\/([a-z0-9-]+)\/(.*)$/);
  if (!m) {
    res.writeHead(404, CORS);
    return res.end("Not found");
  }
  const [, museum, rest] = m;
  const up = UPSTREAMS[museum];
  if (!up) {
    res.writeHead(404, CORS);
    return res.end("Unknown upstream");
  }
  if (Array.isArray(up.allow) && !up.allow.some((re) => re.test(rest))) {
    res.writeHead(403, CORS);
    return res.end("Path not allowed");
  }
  if (!up.key) {
    res.writeHead(500, { ...CORS, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "proxy: API key not configured" }));
  }

  const target = new URL(`${up.base}/${rest}`);
  for (const [k, v] of url.searchParams) target.searchParams.set(k, v);
  // 키 주입: 요청에 이미 keyParam 이 있으면 보존한다(e뮤지엄 이미지의 per-image 서명 토큰).
  // 없을 때만 운영 키를 채운다 — 프론트는 list/detail/code 에 serviceKey 를 안 보내므로 운영 키가 쓰이고,
  // img 는 토큰을 들고 오므로 그대로 통과한다.
  if (!url.searchParams.has(up.keyParam)) target.searchParams.set(up.keyParam, up.key);

  try {
    // Accept 는 클라이언트 것을 그대로 전달한다. 데이터 호출(fetch)은 application/json 을,
    // 이미지 호출(<img>)은 image/* 를 보내므로 — 고정 json 으로 강제하면 img 가 406 을 낸다.
    const accept = req.headers["accept"] || "application/json";
    // 업스트림이 간헐적으로 5xx 를 내는 경우(e뮤지엄) 가볍게 재시도한다.
    let r;
    for (let attempt = 0; ; attempt++) {
      r = await fetch(target.toString(), { headers: { Accept: accept } });
      if (r.status < 500 || attempt >= 2) break;
      await new Promise((res2) => setTimeout(res2, 400 * (attempt + 1)));
    }
    const ct = r.headers.get("content-type") || "application/json";
    let body = Buffer.from(await r.arrayBuffer());
    // 키 누출 방지: 일부 API(Harvard 등)는 응답의 페이지네이션 URL(info.next/prev)에
    // apikey 를 그대로 echo 한다. 텍스트/JSON 응답에서 키 문자열을 제거한다.
    if (up.key && /json|text|javascript|xml/i.test(ct)) {
      body = Buffer.from(body.toString("utf8").split(up.key).join("REDACTED"), "utf8");
    }
    res.writeHead(r.status, {
      ...CORS,
      "Content-Type": ct,
      "Cache-Control": "no-cache",
    });
    res.end(body);
  } catch (e) {
    res.writeHead(502, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "proxy upstream error", detail: String(e) }));
  }
});

server.listen(PORT, () => console.log(`museum API proxy listening on :${PORT}`));
