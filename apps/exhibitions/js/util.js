// 공용 유틸 — 전국 전시 (장르별)

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// 장르별 악센트 색 (harvest.mjs GENRES key 와 일치)
export const GENRE_STYLE = {
  "painting":     "bg-rose-100 text-rose-800",
  "sculpture":    "bg-violet-100 text-violet-800",
  "photo-media":  "bg-sky-100 text-sky-800",
  "craft-design": "bg-amber-100 text-amber-800",
  "calligraphy":  "bg-stone-200 text-stone-800",
  "history":      "bg-emerald-100 text-emerald-800",
  "etc":          "bg-gray-100 text-gray-700",
};

export function genreBadge(item) {
  const s = GENRE_STYLE[item.genre] || GENRE_STYLE.etc;
  return `<span class="inline-block text-xs px-2 py-0.5 rounded-full ${s}">${escapeHtml(item.genreLabel)}</span>`;
}

// 상태 + D-day 배지. today 기준.
export function statusBadge(item, today) {
  const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  if (item.status === "ended") {
    return `<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-500 text-white">지난</span>`;
  }
  if (item.status === "upcoming") {
    const d = item.start ? days(today, item.start) : null;
    const label = d != null ? (d <= 0 ? "곧 시작" : `D-${d}`) : "예정";
    return `<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white">예정 · ${label}</span>`;
  }
  const d = item.end ? days(today, item.end) : null;
  const label = d != null && d >= 0 && d <= 60 ? `D-${d}` : "진행중";
  return `<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-600 text-white">${label}</span>`;
}

let _p = null;
export function loadDataset() {
  if (!_p) {
    _p = fetch("./data/exhibitions.json").then((r) => {
      if (!r.ok) throw new Error(`데이터 로드 실패 HTTP ${r.status}`);
      return r.json();
    });
  }
  return _p;
}
