// 공용 유틸 — e뮤지엄(국립박물관 통합 소장품) 라이브 갤러리
//
// 모든 호출은 동일 출처 키 프록시(/api/emuseum/*)를 경유한다. 키는 프록시 컨테이너에만
// 존재하고 브라우저엔 안 나간다. 로컬 개발 시에는 localStorage.emuseumApiBase 로
// 프록시 절대주소(예: http://localhost:8099/emuseum)를 지정해 교차출처로 호출할 수 있다.

export const API_BASE =
  (typeof localStorage !== "undefined" && localStorage.getItem("emuseumApiBase")) || "/api/emuseum";

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// e뮤지엄 이미지 URL(http + per-image 서명 토큰)을 동일 출처 프록시 경로로 재작성한다.
//   http://www.emuseum.go.kr/openapi/img?serviceKey=<token>&imageId=<id>
//   → <API_BASE>/img?serviceKey=<token>&imageId=<id>
// 프록시는 요청에 이미 serviceKey 가 있으면 보존하므로 토큰으로 이미지가 열리고, http→https 로 감싼다.
export function proxyImg(u) {
  if (!u) return "";
  return u.replace(/^https?:\/\/www\.emuseum\.go\.kr\/openapi\//i, API_BASE + "/");
}

// 프록시 경유 JSON 호출. e뮤지엄은 간헐적 5xx/오류가 있어 가볍게 재시도한다.
export async function emuseum(path, params = {}) {
  const url = new URL(API_BASE + "/" + path, location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      const json = await res.json();
      if (json.resultCode && json.resultCode !== "0000") {
        throw new Error(`API ${json.resultCode}: ${json.resultMsg || ""}`);
      }
      return json;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// 상세조회 응답에서 본문 레코드를 꺼낸다(엔드포인트가 list[0] 에 단일 레코드를 담는다).
export function detailRecord(json) {
  if (Array.isArray(json.list) && json.list.length) return json.list[0];
  if (json.data) return json.data;
  return json;
}

// 상세조회의 이미지 목록 → [{full, thumb}] (대표이미지 우선, 없으면 본문 imgUri 1장)
export function detailImages(json, record) {
  const box = json.imageList;
  const arr = (box && (Array.isArray(box) ? box : box.list)) || [];
  const imgs = arr
    .map((im) => ({ full: proxyImg(im.imgUri || im.imgThumUriL), thumb: proxyImg(im.imgThumUriS || im.imgThumUriM) }))
    .filter((i) => i.full);
  if (imgs.length) return imgs;
  const fallback = proxyImg(record.imgUri || record.imgThumUriL || record.imgThumUriM);
  return fallback ? [{ full: fallback, thumb: fallback }] : [];
}
