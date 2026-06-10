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
  target.searchParams.set(up.keyParam, up.key);

  try {
    const r = await fetch(target.toString(), { headers: { Accept: "application/json" } });
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
