// 홈: 전국 전시 — 장르 ∩ 지역 ∩ 상태 ∩ 검색
import { escapeHtml, genreBadge, statusBadge, loadDataset } from "./util.js";

const galleryEl = document.getElementById("gallery");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const genreNavEl = document.getElementById("genre-nav");
const regionNavEl = document.getElementById("region-nav");
const statusNavEl = document.getElementById("status-nav");
const searchEl = document.getElementById("search");

let DATA = null;
let TODAY = "";
let aGenre = "all", aRegion = "all", aStatus = "current", query = "";

function cardHtml(item) {
  const where = [item.institution, item.region].filter(Boolean).join(" · ");
  const period = item.start ? `${item.start} ~ ${item.end || ""}` : "";
  // 이미지 없으면(또는 로드 실패 시) 제목이 보이는 플레이스홀더가 뒤에서 드러난다.
  const img = item.thumb
    ? `<img src="${escapeHtml(item.thumb)}" alt="${escapeHtml(item.title)}" loading="lazy" referrerpolicy="no-referrer"
         class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
         onerror="this.remove();"/>`
    : "";
  return `
    <a href="${escapeHtml(item.url || "#")}" target="_blank" rel="noopener"
       class="group block bg-white rounded-lg shadow-sm hover:shadow-lg overflow-hidden focus:outline-none focus:ring-4 focus:ring-rose-200 transition-shadow">
      <div class="poster aspect-[3/4] bg-gradient-to-br from-rose-100 via-stone-100 to-stone-200 overflow-hidden relative">
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-3 gap-1">
          <span class="text-stone-700 text-sm font-semibold leading-snug line-clamp-4">${escapeHtml(item.title)}</span>
          <span class="text-stone-400 text-[11px] line-clamp-1">${escapeHtml(item.institution || "")}</span>
        </div>
        ${img}
        <div class="absolute top-2 left-2 z-10">${statusBadge(item, TODAY)}</div>
      </div>
      <div class="p-3">
        <div class="flex flex-wrap items-center gap-1.5 mb-1.5">${genreBadge(item)}</div>
        <h3 class="font-semibold leading-snug text-sm line-clamp-2">${escapeHtml(item.title)}</h3>
        <p class="text-xs text-gray-500 mt-1 line-clamp-1">${escapeHtml(where)}</p>
        ${period ? `<p class="text-xs text-gray-400 mt-0.5">${escapeHtml(period)}</p>` : ""}
        ${item.charge ? `<p class="text-xs text-gray-400 mt-0.5">${escapeHtml(item.charge)}</p>` : ""}
      </div>
    </a>`;
}

function match(i, o = {}) {
  const g = o.genre ?? aGenre, r = o.region ?? aRegion, s = o.status ?? aStatus;
  if (g !== "all" && i.genre !== g) return false;
  if (r !== "all" && i.region !== r) return false;
  if (s === "current") { if (i.status !== "ongoing" && i.status !== "upcoming") return false; }
  else if (s !== "all" && i.status !== s) return false;
  if (query) {
    const q = query.toLowerCase();
    if (!i.title.toLowerCase().includes(q) && !(i.institution || "").toLowerCase().includes(q)) return false;
  }
  return true;
}
const countWith = (o) => DATA.items.filter((i) => match(i, o)).length;

function render() {
  const items = DATA.items.filter((i) => match(i));
  if (!items.length) {
    galleryEl.innerHTML = "";
    statusEl.textContent = "조건에 맞는 전시가 없습니다.";
    statusEl.classList.remove("hidden");
    return;
  }
  statusEl.classList.add("hidden");
  galleryEl.innerHTML = items.map(cardHtml).join("");
}

function chip(key, label, n, active) {
  return `<button data-key="${escapeHtml(key)}"
    class="chip text-sm px-3 py-1.5 rounded-full border transition-colors ${
      key === active ? "bg-rose-700 text-white border-rose-700" : "bg-white/90 text-gray-700 border-gray-300 hover:border-rose-400"
    }">${escapeHtml(label)} <span class="opacity-60">${n}</span></button>`;
}

function renderNavs() {
  // 상태 (지난 전시는 "지난"으로 분리)
  statusNavEl.innerHTML = [
    chip("current", "현재", countWith({ status: "current" }), aStatus),
    chip("ongoing", "진행중", countWith({ status: "ongoing" }), aStatus),
    chip("upcoming", "예정", countWith({ status: "upcoming" }), aStatus),
    chip("ended", "지난", countWith({ status: "ended" }), aStatus),
  ].join("");
  // 장르
  const gChips = [chip("all", "전체 장르", countWith({ genre: "all" }), aGenre)];
  for (const g of DATA.genres) if (DATA.counts.byGenre[g.key] > 0) gChips.push(chip(g.key, g.label, countWith({ genre: g.key }), aGenre));
  genreNavEl.innerHTML = gChips.join("");
  // 지역 (건수순)
  const regions = Object.keys(DATA.counts.byRegion).sort((a, b) => DATA.counts.byRegion[b] - DATA.counts.byRegion[a]);
  const rChips = [chip("all", "전국", countWith({ region: "all" }), aRegion)];
  for (const r of regions) rChips.push(chip(r, r, countWith({ region: r }), aRegion));
  regionNavEl.innerHTML = rChips.join("");

  bind(statusNavEl, (k) => (aStatus = k));
  bind(genreNavEl, (k) => (aGenre = k));
  bind(regionNavEl, (k) => (aRegion = k));
}
function bind(el, set) {
  el.querySelectorAll(".chip").forEach((b) =>
    b.addEventListener("click", () => { set(b.dataset.key); renderNavs(); render(); })
  );
}

async function init() {
  try {
    DATA = await loadDataset();
  } catch (e) {
    statusEl.textContent = `데이터를 불러오지 못했습니다: ${e.message}`;
    return;
  }
  TODAY = DATA.today || new Date().toISOString().slice(0, 10);
  const bs = DATA.counts.byStatus || {};
  summaryEl.textContent = `현재 ${(bs.ongoing || 0) + (bs.upcoming || 0)}건 · 지난 ${bs.ended || 0}건 · 자료 갱신 ${(DATA.generatedAt || "").slice(0, 10)}`;
  renderNavs();
  render();
  let t;
  searchEl.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => { query = searchEl.value.trim(); renderNavs(); render(); }, 200);
  });
}

init();
