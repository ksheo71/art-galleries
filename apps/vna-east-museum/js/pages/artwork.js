import * as api from "../api.js";
import { renderHeader } from "../ui/header.js";
import { renderCard, renderSkeletonCard } from "../ui/card.js";
import { openViewer } from "../viewer.js";
import * as favorites from "../favorites.js";
import { escapeHtml } from "../util.js";

async function main() {
  renderHeader(document.getElementById("header"), {});

  const params = new URLSearchParams(location.search);
  // V&A systemNumbers are strings like "O132743" — keep as-is.
  const id = (params.get("id") || "").trim();
  if (!id) {
    showNotFound();
    return;
  }

  const result = await api.fetchArtwork(id);
  if (!result.ok) {
    showNotFound();
    return;
  }

  const artwork = result.data;
  document.title = `${artwork.title} · V&A East`;
  renderDetail(artwork);
  loadRelated(artwork);
}

function renderDetail(a) {
  const container = document.getElementById("detail-container");
  const thumb = a.thumbUrl;
  const isFav = favorites.has(a.id);

  container.innerHTML = `
    <div class="grid md:grid-cols-2 gap-8">
      <div>
        ${thumb
          ? `<img src="${thumb}" alt="${escapeHtml(a.title)} by ${escapeHtml(a.artist)}" class="w-full rounded shadow-sm bg-gray-100"/>`
          : `<div class="aspect-[4/3] bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">No public image available</div>`
        }
        ${a.imageId
          ? `<button type="button" id="deepzoom-btn" class="mt-4 w-full bg-amber-800 text-white py-2.5 rounded font-medium">View in high-res</button>`
          : ""}
      </div>
      <div>
        <div class="flex items-start justify-between gap-3">
          <h1 class="text-2xl md:text-3xl font-bold leading-tight">${escapeHtml(a.title)}</h1>
          <button
            type="button"
            id="fav-btn"
            class="text-2xl leading-none p-2 ${isFav ? "text-red-500" : "text-gray-400 hover:text-red-500"}"
            aria-pressed="${isFav}"
            aria-label="${isFav ? "Remove from favorites" : "Add to favorites"}"
          >${isFav ? "♥" : "♡"}</button>
        </div>
        <p class="text-gray-700 mt-1">${escapeHtml(a.artist)}</p>
        <dl class="mt-6 space-y-2 text-sm">
          ${fieldRow("Date", a.date)}
          ${fieldRow("Medium", a.medium)}
          ${fieldRow("Classification", a.classification)}
          ${fieldRow("Dimensions", a.dimensions)}
          ${fieldRow("Place of origin", a.placeOfOrigin)}
          ${fieldRow("Credit", a.creditLine)}
        </dl>
      </div>
    </div>
    ${a.description
      ? `<div class="mt-10 max-w-3xl">
           <h2 class="text-lg font-bold mb-3">Description</h2>
           <div class="text-gray-800 leading-relaxed whitespace-pre-line">${escapeHtml(a.description)}</div>
         </div>`
      : ""}
  `;

  const deepBtn = document.getElementById("deepzoom-btn");
  if (deepBtn) deepBtn.addEventListener("click", () => openViewer(a.imageId));

  const favBtn = document.getElementById("fav-btn");
  favBtn.addEventListener("click", () => {
    if (!favorites.isAvailable()) {
      favBtn.title = "Favorites require local browser storage.";
      return;
    }
    const nowFav = favorites.toggle({
      id: a.id,
      title: a.title,
      artist: a.artist,
      thumbUrl: a.thumbUrl,
    });
    favBtn.textContent = nowFav ? "♥" : "♡";
    favBtn.className = `text-2xl leading-none p-2 ${nowFav ? "text-red-500" : "text-gray-400 hover:text-red-500"}`;
    favBtn.setAttribute("aria-pressed", String(nowFav));
    favBtn.setAttribute("aria-label", nowFav ? "Remove from favorites" : "Add to favorites");
  });
}

function fieldRow(label, value) {
  if (!value) return "";
  return `
    <div class="flex gap-3">
      <dt class="text-gray-500 w-32 flex-shrink-0">${escapeHtml(label)}</dt>
      <dd class="flex-1">${escapeHtml(value)}</dd>
    </div>
  `;
}

async function loadRelated(a) {
  const section = document.getElementById("related-section");
  const grid = document.getElementById("related-grid");
  grid.innerHTML = "";
  for (let i = 0; i < 6; i++) grid.appendChild(renderSkeletonCard());

  const r = await api.fetchRelated({
    artist: a.artist,
    department: a.department,
    excludeId: a.id,
    limit: 6,
  });

  if (!r.ok || r.data.length === 0) {
    section.classList.add("hidden");
    return;
  }

  grid.innerHTML = "";
  for (const item of r.data) grid.appendChild(renderCard(item));
}

function showNotFound() {
  document.getElementById("detail-container").innerHTML = `
    <div class="text-center py-16">
      <p class="text-xl">Artwork not found.</p>
      <a href="./index.html" class="inline-block mt-4 underline">Back to home</a>
    </div>
  `;
  document.getElementById("related-section").classList.add("hidden");
}

main();
