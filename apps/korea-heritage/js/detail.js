// 상세: 단일 건축물 + 이미지 갤러리(국가유산청 이미지 API 실시간 호출, CORS 허용)
import { escapeHtml, eraBadge, kindBadge, loadDataset } from "./util.js";

const statusEl = document.getElementById("status");
const detailEl = document.getElementById("detail");
const IMG_API = "https://www.khs.go.kr/cha/SearchImageOpenapi.do";

function getId() {
  return new URLSearchParams(location.search).get("id") || "";
}

const httpsImg = (u) => (u ? u.replace(/^http:\/\//i, "https://") : "");

// 이미지 API XML → [{url, desc}]
async function fetchImages(item) {
  const url = `${IMG_API}?ccbaKdcd=${item.kdcd}&ccbaAsno=${item.asno}&ccbaCtcd=${item.ctcd}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const xml = new DOMParser().parseFromString(await res.text(), "application/xml");
    // 이미지 API 는 모든 이미지를 단일 <item> 안에 평탄하게 담는다
    // (sn/imageNuri/imageUrl/ccimDesc 반복). 노드별로 모아 순서로 짝짓는다.
    const urls = [...xml.querySelectorAll("imageUrl")];
    const descs = [...xml.querySelectorAll("ccimDesc")];
    return urls
      .map((n, i) => ({
        url: httpsImg(n.textContent?.trim()),
        desc: descs[i]?.textContent?.trim() || "",
      }))
      .filter((i) => i.url)
      .slice(0, 15);
  } catch {
    return [];
  }
}

function infoRow(label, value) {
  if (!value) return "";
  return `<div class="flex gap-3 py-2 border-b border-gray-100">
    <dt class="w-24 shrink-0 text-sm text-gray-500">${escapeHtml(label)}</dt>
    <dd class="text-sm">${escapeHtml(value)}</dd></div>`;
}

function render(item, images) {
  document.title = `${item.name} — 국가유산청`;
  const main = images[0]?.url || item.thumb;
  const mapLink =
    item.lat && item.lng
      ? `<a href="https://map.kakao.com/link/map/${encodeURIComponent(item.name)},${item.lat},${item.lng}"
           target="_blank" rel="noopener" class="text-teal-700 hover:underline text-sm">📍 카카오맵에서 보기</a>`
      : "";

  const thumbs =
    images.length > 1
      ? `<div class="flex gap-2 overflow-x-auto mt-3 pb-1">
          ${images
            .map(
              (im, i) => `<button data-idx="${i}" title="${escapeHtml(im.desc)}"
              class="thumb shrink-0 w-20 h-16 rounded overflow-hidden border ${
                i === 0 ? "border-teal-600 ring-2 ring-teal-200" : "border-gray-200"
              }">
              <img src="${escapeHtml(im.url)}" alt="${escapeHtml(im.desc)}" loading="lazy" class="w-full h-full object-cover"/>
            </button>`
            )
            .join("")}
        </div>`
      : "";

  detailEl.innerHTML = `
    <div class="grid md:grid-cols-2 gap-8">
      <div>
        <div class="aspect-[4/3] bg-stone-100 rounded-lg overflow-hidden">
          <img id="main-img" src="${escapeHtml(main)}" alt="${escapeHtml(item.name)}" class="w-full h-full object-contain bg-stone-900/5"/>
        </div>
        <p id="main-cap" class="text-xs text-gray-500 mt-2 text-center">${escapeHtml(images[0]?.desc || "")}</p>
        ${thumbs}
      </div>
      <div>
        <div class="flex items-center gap-1.5 mb-2">${eraBadge(item)}${kindBadge(item.kind)}</div>
        <h1 class="text-2xl md:text-3xl font-bold">${escapeHtml(item.name)}</h1>
        ${item.hanja ? `<p class="text-gray-500 mt-1">${escapeHtml(item.hanja)}</p>` : ""}
        <dl class="mt-5">
          ${infoRow("시대", item.eraRaw)}
          ${infoRow("지정종목", item.kind)}
          ${infoRow("분류", item.category)}
          ${infoRow("수량", item.quantity)}
          ${infoRow("소재지", item.location)}
        </dl>
        ${mapLink ? `<div class="mt-3">${mapLink}</div>` : ""}
      </div>
    </div>
    ${
      item.desc
        ? `<section class="mt-8 max-w-3xl">
            <h2 class="font-semibold text-lg mb-2">설명</h2>
            <p class="text-sm leading-relaxed text-gray-700 whitespace-pre-line">${escapeHtml(item.desc)}</p>
           </section>`
        : ""
    }`;

  // 썸네일 클릭 → 메인 교체
  const mainImg = detailEl.querySelector("#main-img");
  const mainCap = detailEl.querySelector("#main-cap");
  detailEl.querySelectorAll(".thumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      const im = images[Number(btn.dataset.idx)];
      mainImg.src = im.url;
      mainCap.textContent = im.desc;
      detailEl.querySelectorAll(".thumb").forEach((b) =>
        b.classList.remove("border-teal-600", "ring-2", "ring-teal-200")
      );
      btn.classList.add("border-teal-600", "ring-2", "ring-teal-200");
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
  let dataset;
  try {
    dataset = await loadDataset();
  } catch (e) {
    statusEl.textContent = `데이터를 불러오지 못했습니다: ${e.message}`;
    return;
  }
  const item = dataset.items.find((i) => i.id === id);
  if (!item) {
    statusEl.textContent = "해당 건축물을 찾을 수 없습니다.";
    return;
  }
  // 먼저 대표 이미지로 렌더 → 이미지 API 응답 오면 갤러리 보강
  render(item, item.thumb ? [{ url: item.thumb, desc: "" }] : []);
  const images = await fetchImages(item);
  if (images.length) render(item, images);
}

init();
