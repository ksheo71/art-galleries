// 홈: 시대 × 유형별 유물 갤러리
import { escapeHtml, eraBadge, typeBadge, kindBadge, loadDataset } from "./util.js";

const galleryEl = document.getElementById("gallery");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const eraNavEl = document.getElementById("era-nav");
const typeNavEl = document.getElementById("type-nav");
const searchEl = document.getElementById("search");

let DATASET = null;
let activeEra = "all"; // "all" | era key
let activeType = "all"; // "all" | type key
let query = "";

function cardHtml(item) {
  const where = [item.region, item.city].filter(Boolean).join(" ");
  return `
    <a href="./detail.html?id=${encodeURIComponent(item.id)}"
       class="group block bg-white rounded-lg shadow-sm hover:shadow-lg overflow-hidden focus:outline-none focus:ring-4 focus:ring-teal-200 transition-shadow">
      <div class="aspect-[4/3] bg-stone-100 overflow-hidden">
        <img src="${escapeHtml(item.thumb)}" alt="${escapeHtml(item.name)}" loading="lazy"
             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
      </div>
      <div class="p-4">
        <div class="flex flex-wrap items-center gap-1.5 mb-1.5">${eraBadge(item)}${typeBadge(item)}${kindBadge(item.kind)}</div>
        <h3 class="font-semibold leading-snug">${escapeHtml(item.name)}</h3>
        <p class="text-xs text-gray-500 mt-1">${escapeHtml(item.eraRaw || item.eraLabel)}</p>
        ${where ? `<p class="text-xs text-gray-400 mt-0.5">${escapeHtml(where)}</p>` : ""}
      </div>
    </a>`;
}

function applyFilter() {
  let items = DATASET.items;
  if (activeEra !== "all") items = items.filter((i) => i.era === activeEra);
  if (activeType !== "all") items = items.filter((i) => i.type === activeType);
  if (query) {
    const q = query.toLowerCase();
    items = items.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.region || "").toLowerCase().includes(q)
    );
  }
  render(items);
}

function render(items) {
  if (!items.length) {
    galleryEl.innerHTML = "";
    statusEl.textContent = "조건에 맞는 유물이 없습니다.";
    statusEl.classList.remove("hidden");
    return;
  }
  statusEl.classList.add("hidden");
  galleryEl.innerHTML = items.map(cardHtml).join("");
}

// 현재 다른 축 필터를 반영한 동적 카운트로 칩을 그린다(시대 칩은 유형/검색 적용분, 반대도 동일).
function countWith(overrides) {
  const ea = overrides.era ?? activeEra;
  const ty = overrides.type ?? activeType;
  let items = DATASET.items;
  if (ea !== "all") items = items.filter((i) => i.era === ea);
  if (ty !== "all") items = items.filter((i) => i.type === ty);
  if (query) {
    const q = query.toLowerCase();
    items = items.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.region || "").toLowerCase().includes(q)
    );
  }
  return items.length;
}

function chipHtml(key, label, n, active) {
  return `
    <button data-key="${escapeHtml(key)}"
      class="filter-chip text-sm px-3 py-1.5 rounded-full border transition-colors ${
        key === active
          ? "bg-teal-800 text-white border-teal-800"
          : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"
      }">${escapeHtml(label)} <span class="opacity-60">${n}</span></button>`;
}

function renderNavs() {
  // 시대 칩 — 현재 유형/검색 조건에서의 건수
  const eraChips = [chipHtml("all", "전체", countWith({ era: "all" }), activeEra)];
  for (const e of DATASET.eras) {
    const n = countWith({ era: e.key });
    if (DATASET.counts.byEra[e.key] > 0) eraChips.push(chipHtml(e.key, e.label, n, activeEra));
  }
  eraNavEl.innerHTML = eraChips.join("");
  eraNavEl.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeEra = btn.dataset.key;
      renderNavs();
      applyFilter();
    });
  });

  // 유형 칩 — 현재 시대/검색 조건에서의 건수
  const typeChips = [chipHtml("all", "전체", countWith({ type: "all" }), activeType)];
  for (const t of DATASET.types) {
    const n = countWith({ type: t.key });
    if (DATASET.counts.byType[t.key] > 0) typeChips.push(chipHtml(t.key, t.label, n, activeType));
  }
  typeNavEl.innerHTML = typeChips.join("");
  typeNavEl.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeType = btn.dataset.key;
      renderNavs();
      applyFilter();
    });
  });
}

async function init() {
  try {
    DATASET = await loadDataset();
  } catch (e) {
    statusEl.textContent = `데이터를 불러오지 못했습니다: ${e.message}`;
    return;
  }
  summaryEl.textContent = `총 ${DATASET.counts.total}건 · 자료 갱신 ${(DATASET.generatedAt || "").slice(0, 10)}`;
  renderNavs();
  applyFilter();

  let t;
  searchEl.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      query = searchEl.value.trim();
      renderNavs();
      applyFilter();
    }, 150);
  });
}

init();
