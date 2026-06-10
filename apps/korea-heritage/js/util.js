// 공용 유틸 — 국가유산청 시대별 건축물 갤러리

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// 시대 버킷별 악센트 색 (Tailwind 클래스). harvest.mjs 의 ERAS key 와 일치.
export const ERA_STYLE = {
  "prehistoric":    { badge: "bg-stone-200 text-stone-800",   dot: "bg-stone-500" },
  "three-kingdoms": { badge: "bg-amber-200 text-amber-900",   dot: "bg-amber-600" },
  "unified-silla":  { badge: "bg-orange-200 text-orange-900", dot: "bg-orange-600" },
  "goryeo":         { badge: "bg-emerald-200 text-emerald-900", dot: "bg-emerald-600" },
  "joseon":         { badge: "bg-rose-200 text-rose-900",     dot: "bg-rose-600" },
  "modern":         { badge: "bg-indigo-200 text-indigo-900", dot: "bg-indigo-600" },
  "unknown":        { badge: "bg-gray-200 text-gray-700",     dot: "bg-gray-400" },
};

export function eraBadge(item) {
  const s = ERA_STYLE[item.era] || ERA_STYLE.unknown;
  return `<span class="inline-block text-xs px-2 py-0.5 rounded-full ${s.badge}">${escapeHtml(item.eraLabel)}</span>`;
}

export function kindBadge(kind) {
  return `<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-teal-800 text-white">${escapeHtml(kind)}</span>`;
}

// 데이터셋 로드 (캐시 1회)
let _dataPromise = null;
export function loadDataset() {
  if (!_dataPromise) {
    _dataPromise = fetch("./data/heritage.json").then((r) => {
      if (!r.ok) throw new Error(`데이터 로드 실패 HTTP ${r.status}`);
      return r.json();
    });
  }
  return _dataPromise;
}
