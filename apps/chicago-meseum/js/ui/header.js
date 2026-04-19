import { escapeHtml } from "../util.js";

export function renderHeader(container, { currentQuery = "" } = {}) {
  container.innerHTML = `
    <header class="bg-white border-b sticky top-0 z-30">
      <div class="container mx-auto px-4 py-3 flex items-center gap-3">
        <a href="./index.html" class="font-bold text-lg whitespace-nowrap">Art Gallery</a>
        <form id="header-search" class="flex-1 flex max-w-2xl" role="search">
          <label for="header-search-input" class="sr-only">Search the collection</label>
          <input
            id="header-search-input"
            name="q"
            type="search"
            value="${escapeHtml(currentQuery)}"
            placeholder="Search the collection..."
            class="flex-1 min-w-0 border border-gray-300 rounded-l px-3 py-2 text-sm"
          />
          <button class="bg-black text-white px-4 rounded-r text-sm font-medium">Search</button>
        </form>
        <a href="./favorites.html" class="text-sm px-3 py-2 whitespace-nowrap">♥ Favorites</a>
      </div>
    </header>
  `;

  const form = container.querySelector("#header-search");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = new FormData(form).get("q")?.toString().trim();
    if (q) location.href = `./search.html?q=${encodeURIComponent(q)}`;
  });
}
