// 상세: 단일 소장품 + 이미지 갤러리 + 연관 소장품 (프록시 경유 실시간 조회)
import { escapeHtml, proxyImg, emuseum, detailRecord, detailImages } from "./util.js";

const statusEl = document.getElementById("status");
const detailEl = document.getElementById("detail");

function getId() {
  return new URLSearchParams(location.search).get("id") || "";
}

function infoRow(label, value) {
  if (!value) return "";
  return `<div class="flex gap-3 py-2 border-b border-gray-100">
    <dt class="w-24 shrink-0 text-sm text-gray-500">${escapeHtml(label)}</dt>
    <dd class="text-sm">${escapeHtml(value)}</dd></div>`;
}

function relationsHtml(json) {
  const box = json.relationList;
  const arr = (box && (Array.isArray(box) ? box : box.list)) || [];
  const rel = arr.filter((r) => r && r.id);
  if (!rel.length) return "";
  return `
    <section class="mt-10">
      <h2 class="font-semibold text-lg mb-3">연관 소장품</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        ${rel
          .slice(0, 12)
          .map((r) => {
            const t = proxyImg(r.imgThumUriS || r.imgThumUriM || r.imgUri);
            const nm = r.nameKr || r.name || "";
            return `<a href="./detail.html?id=${encodeURIComponent(r.id)}" class="group block">
              <div class="aspect-square bg-stone-100 rounded overflow-hidden">
                ${t ? `<img src="${escapeHtml(t)}" alt="${escapeHtml(nm)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform"/>` : ""}
              </div>
              <p class="text-xs text-gray-600 mt-1 line-clamp-2">${escapeHtml(nm)}</p>
            </a>`;
          })
          .join("")}
      </div>
    </section>`;
}

function render(json) {
  const item = detailRecord(json);
  const images = detailImages(json, item);
  const name = item.nameKr || item.name || "(이름 미상)";
  document.title = `${name} — e뮤지엄`;
  const main = images[0]?.full || "";

  const thumbs =
    images.length > 1
      ? `<div class="flex gap-2 overflow-x-auto mt-3 pb-1">
          ${images
            .map(
              (im, i) => `<button data-idx="${i}"
              class="thumb shrink-0 w-20 h-16 rounded overflow-hidden border ${
                i === 0 ? "border-indigo-600 ring-2 ring-indigo-200" : "border-gray-200"
              }">
              <img src="${escapeHtml(im.thumb || im.full)}" alt="" loading="lazy" class="w-full h-full object-cover"/>
            </button>`
            )
            .join("")}
        </div>`
      : "";

  const museum = [item.museumName2, item.museumName3].filter(Boolean).join(" · ");

  detailEl.innerHTML = `
    <div class="grid md:grid-cols-2 gap-8">
      <div>
        <div class="aspect-[4/3] bg-stone-100 rounded-lg overflow-hidden">
          ${
            main
              ? `<img id="main-img" src="${escapeHtml(main)}" alt="${escapeHtml(name)}" class="w-full h-full object-contain bg-stone-900/5"/>`
              : `<div class="w-full h-full flex items-center justify-center text-stone-300">이미지 없음</div>`
          }
        </div>
        ${thumbs}
      </div>
      <div>
        ${museum ? `<span class="inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 mb-2">${escapeHtml(museum)}</span>` : ""}
        <h1 class="text-2xl md:text-3xl font-bold">${escapeHtml(name)}</h1>
        ${item.nameCn ? `<p class="text-gray-500 mt-1">${escapeHtml(item.nameCn)}</p>` : ""}
        <dl class="mt-5">
          ${infoRow("국적·시대", item.nationalityName1)}
          ${infoRow("재질", item.materialName1)}
          ${infoRow("용도·기능", [item.purposeName1, item.purposeName2, item.purposeName3, item.purposeName4].filter(Boolean).join(" > "))}
          ${infoRow("소장처", museum)}
          ${infoRow("유물번호", item.indexWord)}
        </dl>
      </div>
    </div>
    ${
      item.desc
        ? `<section class="mt-8 max-w-3xl">
            <h2 class="font-semibold text-lg mb-2">설명</h2>
            <p class="text-sm leading-relaxed text-gray-700 whitespace-pre-line">${escapeHtml(item.desc)}</p>
           </section>`
        : ""
    }
    ${relationsHtml(json)}`;

  const mainImg = detailEl.querySelector("#main-img");
  detailEl.querySelectorAll(".thumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      mainImg.src = images[Number(btn.dataset.idx)].full;
      detailEl.querySelectorAll(".thumb").forEach((b) =>
        b.classList.remove("border-indigo-600", "ring-2", "ring-indigo-200")
      );
      btn.classList.add("border-indigo-600", "ring-2", "ring-indigo-200");
    });
  });

  statusEl.classList.add("hidden");
  detailEl.classList.remove("hidden");
}

async function init() {
  const id = getId();
  if (!id) {
    statusEl.textContent = "잘못된 접근입니다.";
    return;
  }
  try {
    const json = await emuseum("relic/detail", { id });
    render(json);
  } catch (e) {
    statusEl.textContent = `데이터를 불러오지 못했습니다: ${e.message}`;
  }
}

init();
