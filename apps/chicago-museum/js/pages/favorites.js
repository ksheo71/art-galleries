import { renderHeader } from "../ui/header.js";
import { renderCard } from "../ui/card.js";
import * as favorites from "../favorites.js";
import { escapeHtml, relativeTime } from "../util.js";

function main() {
  renderHeader(document.getElementById("header"), {});
  render();
  document.addEventListener("favorite-change", () => render());
}

function render() {
  const container = document.getElementById("fav-container");
  const countLabel = document.getElementById("count-label");

  if (!favorites.isAvailable()) {
    countLabel.textContent = "";
    container.innerHTML = `
      <div class="text-center py-16 text-gray-600 max-w-md mx-auto">
        Favorites require local browser storage, which is unavailable in this browser mode.
      </div>
    `;
    return;
  }

  const items = favorites
    .getAll()
    .sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));

  countLabel.textContent = `${items.length} saved artwork${items.length === 1 ? "" : "s"}`;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-16 max-w-md mx-auto">
        <p class="text-gray-700 text-lg">You haven't saved anything yet.</p>
        <p class="text-gray-500 text-sm mt-2">Tap ♥ on any artwork to save it here.</p>
        <a href="./index.html" class="inline-block mt-6 px-4 py-2 bg-black text-white rounded">Back to home</a>
      </div>
    `;
    return;
  }

  container.innerHTML =
    '<div id="fav-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"></div>';
  const grid = container.querySelector("#fav-grid");

  for (const f of items) {
    const card = renderCard({
      id: f.id,
      title: f.title,
      artist: f.artist,
      imageId: f.imageId,
    });
    const body = card.querySelector(".p-3 > .flex-1");
    if (body) {
      const timeEl = document.createElement("p");
      timeEl.className = "text-[11px] text-gray-400 mt-1";
      timeEl.textContent = `added ${escapeHtml(relativeTime(f.addedAt))}`;
      body.appendChild(timeEl);
    }
    grid.appendChild(card);
  }
}

main();
