import * as favorites from "../favorites.js";
import { escapeHtml } from "../util.js";

export function renderCard(artwork) {
  const imgUrl = artwork.thumbUrl || null;
  const isFav = favorites.has(artwork.id);

  const article = document.createElement("article");
  article.className =
    "group bg-white rounded shadow-sm hover:shadow-md transition overflow-hidden";
  article.dataset.artworkId = String(artwork.id);
  article.innerHTML = `
    <a href="./artwork.html?id=${encodeURIComponent(artwork.id)}" class="block">
      <div class="aspect-[4/3] bg-gray-100 overflow-hidden">
        ${imgUrl
          ? `<img src="${imgUrl}" alt="${escapeHtml(artwork.title)} by ${escapeHtml(artwork.artist)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"/>`
          : `<div class="flex items-center justify-center h-full text-gray-400 text-sm">No image</div>`}
      </div>
    </a>
    <div class="p-3 flex items-start gap-2">
      <div class="flex-1 min-w-0">
        <a href="./artwork.html?id=${encodeURIComponent(artwork.id)}" class="block">
          <h3 class="font-medium text-sm truncate" title="${escapeHtml(artwork.title)}">${escapeHtml(artwork.title)}</h3>
          <p class="text-xs text-gray-600 truncate">${escapeHtml(artwork.artist)}</p>
        </a>
      </div>
      <button
        type="button"
        class="fav-btn text-xl leading-none p-1 ${isFav ? "text-red-500" : "text-gray-400 hover:text-red-500"}"
        aria-pressed="${isFav}"
        aria-label="${isFav ? "Remove from favorites" : "Add to favorites"}"
        title="${isFav ? "Remove from favorites" : "Add to favorites"}"
      >${isFav ? "♥" : "♡"}</button>
    </div>
  `;

  const favBtn = article.querySelector(".fav-btn");
  favBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!favorites.isAvailable()) {
      favBtn.title = "Favorites require local browser storage.";
      return;
    }
    const nowFav = favorites.toggle({
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      thumbUrl: artwork.thumbUrl,
    });
    favBtn.textContent = nowFav ? "♥" : "♡";
    favBtn.className = `fav-btn text-xl leading-none p-1 ${nowFav ? "text-red-500" : "text-gray-400 hover:text-red-500"}`;
    favBtn.setAttribute("aria-pressed", String(nowFav));
    const label = nowFav ? "Remove from favorites" : "Add to favorites";
    favBtn.setAttribute("aria-label", label);
    favBtn.setAttribute("title", label);
    article.dispatchEvent(
      new CustomEvent("favorite-change", {
        detail: { id: artwork.id, isFavorite: nowFav },
        bubbles: true,
      })
    );
  });

  return article;
}

export function renderSkeletonCard() {
  const div = document.createElement("div");
  div.className = "bg-white rounded shadow-sm overflow-hidden animate-pulse";
  div.innerHTML = `
    <div class="aspect-[4/3] bg-gray-200"></div>
    <div class="p-3 space-y-2">
      <div class="h-4 bg-gray-200 rounded w-3/4"></div>
      <div class="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  `;
  return div;
}
