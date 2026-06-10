// 홈: 시대별 건축물 갤러리
import { escapeHtml, eraBadge, kindBadge, loadDataset } from "./util.js";

const galleryEl = document.getElementById("gallery");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const eraNavEl = document.getElementById("era-nav");
const searchEl = document.getElementById("search");

let DATASET = null;
let activeEra = "all"; // "all" | era key
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
        <div class="flex items-center gap-1.5 mb-1.5">${eraBadge(item)}${kindBadge(item.kind)}</div>
        <h3 class="font-semibold leading-snug">${escapeHtml(item.name)}</h3>
        <p class="text-xs text-gray-500 mt-1">${escapeHtml(item.eraRaw || item.eraLabel)}</p>
        ${where ? `<p class="text-xs text-gray-400 mt-0.5">${escapeHtml(where)}</p>` : ""}
      </div>
    </a>`;
}

function applyFilter() {
  let items = DATASET.items;
  if (activeEra !== "all") items = items.filter((i) => i.era === activeEra);
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
    statusEl.textContent = "조건에 맞는 건축물이 없습니다.";
    statusEl.classList.remove("hidden");
    return;
  }
  statusEl.classList.add("hidden");
  galleryEl.innerHTML = items.map(cardHtml).join("");
}

function renderEraNav() {
  const counts = DATASET.counts.byEra;
  const chips = [{ key: "all", label: "전체", n: DATASET.counts.total }];
  for (const e of DATASET.eras) {
    if (counts[e.key] > 0) chips.push({ key: e.key, label: e.label, n: counts[e.key] });
  }
  eraNavEl.innerHTML = chips
    .map(
      (c) => `
      <button data-era="${c.key}"
        class="era-chip text-sm px-3 py-1.5 rounded-full border transition-colors ${
          c.key === activeEra
            ? "bg-teal-800 text-white border-teal-800"
            : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"
        }">${escapeHtml(c.label)} <span class="opacity-60">${c.n}</span></button>`
    )
    .join("");
  eraNavEl.querySelectorAll(".era-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeEra = btn.dataset.era;
      renderEraNav();
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
  renderEraNav();
  applyFilter();

  let t;
  searchEl.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      query = searchEl.value.trim();
      applyFilter();
    }, 150);
  });
}

init();
