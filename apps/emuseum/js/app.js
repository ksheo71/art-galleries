// 홈: e뮤지엄(국립박물관 통합) 소장품 라이브 검색·브라우즈
import { escapeHtml, proxyImg, emuseum } from "./util.js";

const galleryEl = document.getElementById("gallery");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const searchEl = document.getElementById("search");
const moreWrapEl = document.getElementById("more-wrap");
const moreBtn = document.getElementById("more-btn");

const PAGE_SIZE = 24;
let query = "";
let pageNo = 1;
let total = 0;
let loading = false;

function cardHtml(item) {
  const name = item.nameKr || item.name || "(이름 미상)";
  const thumb = proxyImg(item.imgThumUriM || item.imgThumUriS || item.imgUri);
  const museum = item.museumName2 || item.museumName1 || "";
  return `
    <a href="./detail.html?id=${encodeURIComponent(item.id)}"
       class="group block bg-white rounded-lg shadow-sm hover:shadow-lg overflow-hidden focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-shadow">
      <div class="aspect-[4/3] bg-stone-100 overflow-hidden">
        ${
          thumb
            ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(name)}" loading="lazy"
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>`
            : `<div class="w-full h-full flex items-center justify-center text-stone-300 text-sm">이미지 없음</div>`
        }
      </div>
      <div class="p-4">
        ${museum ? `<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 mb-1.5">${escapeHtml(museum)}</span>` : ""}
        <h3 class="font-semibold leading-snug line-clamp-2">${escapeHtml(name)}</h3>
        ${item.nameCn ? `<p class="text-xs text-gray-400 mt-1 line-clamp-1">${escapeHtml(item.nameCn)}</p>` : ""}
      </div>
    </a>`;
}

async function load(reset) {
  if (loading) return;
  loading = true;
  moreBtn.disabled = true;
  moreBtn.textContent = "불러오는 중…";
  if (reset) {
    pageNo = 1;
    galleryEl.innerHTML = "";
    statusEl.textContent = "불러오는 중…";
    statusEl.classList.remove("hidden");
  }
  try {
    const json = await emuseum("relic/list", { name: query, numOfRows: PAGE_SIZE, pageNo });
    total = Number(json.totalCount || 0);
    const items = Array.isArray(json.list) ? json.list : [];
    if (reset && !items.length) {
      statusEl.textContent = query ? `"${query}" 검색 결과가 없습니다.` : "표시할 소장품이 없습니다.";
      moreWrapEl.classList.add("hidden");
      return;
    }
    statusEl.classList.add("hidden");
    galleryEl.insertAdjacentHTML("beforeend", items.map(cardHtml).join(""));
    summaryEl.textContent = `${query ? `"${query}" · ` : ""}총 ${total.toLocaleString("ko")}건`;
    const shown = pageNo * PAGE_SIZE;
    moreWrapEl.classList.toggle("hidden", shown >= total || items.length < PAGE_SIZE);
    pageNo += 1;
  } catch (e) {
    if (reset) {
      statusEl.textContent = `불러오지 못했습니다: ${e.message}`;
      statusEl.classList.remove("hidden");
    } else {
      moreWrapEl.classList.remove("hidden");
    }
  } finally {
    loading = false;
    moreBtn.disabled = false;
    moreBtn.textContent = "더 보기";
  }
}

function init() {
  load(true);
  let t;
  searchEl.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const q = searchEl.value.trim();
      if (q === query) return;
      query = q;
      load(true);
    }, 300);
  });
  moreBtn.addEventListener("click", () => load(false));
}

init();
