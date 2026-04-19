import { fetchRandomGallery } from "../api.js";
import { renderHeader } from "../ui/header.js";
import { renderCard, renderSkeletonCard } from "../ui/card.js";

async function main() {
  renderHeader(document.getElementById("header"), {});

  const heroForm = document.getElementById("hero-search");
  heroForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = new FormData(heroForm).get("q")?.toString().trim();
    if (q) location.href = `./search.html?q=${encodeURIComponent(q)}`;
  });

  const grid = document.getElementById("gallery");
  renderSkeletons(grid, 12);

  const result = await fetchRandomGallery({ count: 12 });
  if (!result.ok || result.data.length === 0) {
    renderError(grid);
    return;
  }

  grid.innerHTML = "";
  for (const artwork of result.data) grid.appendChild(renderCard(artwork));
}

function renderSkeletons(grid, count) {
  grid.innerHTML = "";
  for (let i = 0; i < count; i++) grid.appendChild(renderSkeletonCard());
}

function renderError(grid) {
  grid.innerHTML = `
    <div class="col-span-full text-center py-16">
      <p class="text-gray-600 mb-4">We couldn't load the gallery right now.</p>
      <button type="button" class="px-4 py-2 bg-slate-800 text-white rounded" id="retry">Try again</button>
    </div>
  `;
  grid.querySelector("#retry")?.addEventListener("click", () => location.reload());
}

main();
