import * as api from "../api.js";
import { renderHeader } from "../ui/header.js";
import { renderCard, renderSkeletonCard } from "../ui/card.js";
import { renderFilters } from "../ui/filters.js";

const state = {
  q: "",
  page: 1,
  filters: { artist: null, dateStart: null, dateEnd: null, department: null },
  allResults: [],
  pagination: { total: 0, page: 1, totalPages: 1 },
  departments: [],
};

async function main() {
  readStateFromUrl();

  renderHeader(document.getElementById("header"), { currentQuery: state.q });
  document.getElementById("query-label").textContent = state.q
    ? `Results for "${state.q}"`
    : "Browse";

  document.getElementById("load-more").addEventListener("click", async () => {
    if (state.page >= state.pagination.totalPages) return;
    state.page++;
    const btn = document.getElementById("load-more");
    btn.disabled = true;
    btn.textContent = "Loading...";
    await loadResults(false);
  });

  api.fetchDepartments().then((r) => {
    if (r.ok) {
      state.departments = r.data;
      renderFiltersPanel();
    }
  });

  await loadResults(true);
}

function readStateFromUrl() {
  const params = new URLSearchParams(location.search);
  state.q = params.get("q") ?? "";
  state.filters.artist = params.get("artist") || null;
  const ds = params.get("dateStart");
  state.filters.dateStart = ds ? parseInt(ds, 10) : null;
  const de = params.get("dateEnd");
  state.filters.dateEnd = de ? parseInt(de, 10) : null;
  state.filters.department = params.get("dept") || null;
}

function writeStateToUrl() {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.filters.artist) params.set("artist", state.filters.artist);
  if (state.filters.dateStart) params.set("dateStart", state.filters.dateStart);
  if (state.filters.dateEnd) params.set("dateEnd", state.filters.dateEnd);
  if (state.filters.department) params.set("dept", state.filters.department);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

async function loadResults(reset) {
  const grid = document.getElementById("grid");
  if (reset) {
    state.page = 1;
    state.allResults = [];
    renderSkeletons(grid, 12);
  }

  if (!state.q) {
    grid.innerHTML = `<div class="col-span-full text-center py-16 text-gray-600">Enter a keyword above to search the collection.</div>`;
    updateCountLabel();
    updateLoadMoreButton();
    renderFiltersPanel();
    return;
  }

  const result = await api.search({ q: state.q, page: state.page, limit: 25 });
  if (!result.ok) {
    grid.innerHTML = `<div class="col-span-full text-center py-16"><p class="text-gray-600 mb-4">Could not load results.</p><button type="button" class="px-4 py-2 bg-black text-white rounded" id="retry">Try again</button></div>`;
    grid.querySelector("#retry")?.addEventListener("click", () => loadResults(true));
    return;
  }

  state.allResults = state.allResults.concat(result.data.items);
  state.pagination = result.pagination;

  renderGrid();
  renderFiltersPanel();
  updateCountLabel();
  updateLoadMoreButton();
}

function applyClientFilters(items) {
  return items.filter((a) => {
    if (state.filters.artist && a.artist !== state.filters.artist) return false;
    if (state.filters.department && a.departmentTitle !== state.filters.department) return false;
    if (state.filters.dateStart && a.dateEnd !== null && a.dateEnd < state.filters.dateStart) return false;
    if (state.filters.dateEnd && a.dateStart !== null && a.dateStart > state.filters.dateEnd) return false;
    return true;
  });
}

function renderGrid() {
  const grid = document.getElementById("grid");
  const filtered = applyClientFilters(state.allResults);
  grid.innerHTML = "";
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-16">
        <p class="text-gray-600">No results${state.q ? ` for "${state.q}"` : ""} with the current filters.</p>
        <button type="button" class="mt-4 underline text-sm" id="clear-inline">Clear filters</button>
      </div>
    `;
    grid.querySelector("#clear-inline")?.addEventListener("click", () =>
      onFiltersChange({ artist: null, dateStart: null, dateEnd: null, department: null })
    );
    return;
  }
  for (const a of filtered) grid.appendChild(renderCard(a));
}

function renderFiltersPanel() {
  const container = document.getElementById("filters");
  if (!container) return;
  const aggregates = {
    artists: [...new Set(state.allResults.map((a) => a.artist).filter(Boolean))].sort(),
    departments: [...new Set(state.allResults.map((a) => a.departmentTitle).filter(Boolean))],
  };
  renderFilters(
    container,
    {
      aggregates,
      departments: state.departments,
      current: state.filters,
    },
    onFiltersChange
  );
}

function onFiltersChange(newFilters) {
  state.filters = newFilters;
  writeStateToUrl();
  renderGrid();
  updateCountLabel();
}

function updateCountLabel() {
  const filtered = applyClientFilters(state.allResults);
  const label = document.getElementById("count-label");
  if (!state.q) {
    label.textContent = "";
    return;
  }
  if (state.pagination.total > state.allResults.length) {
    label.textContent = `Showing ${filtered.length} of ~${state.pagination.total} artworks — "Load more" for a wider filter pool.`;
  } else {
    label.textContent = `${filtered.length} artwork${filtered.length === 1 ? "" : "s"}`;
  }
}

function updateLoadMoreButton() {
  const btn = document.getElementById("load-more");
  if (state.q && state.page < state.pagination.totalPages) {
    btn.classList.remove("hidden");
    btn.textContent = "Load more";
    btn.disabled = false;
  } else {
    btn.classList.add("hidden");
  }
}

function renderSkeletons(grid, count) {
  grid.innerHTML = "";
  for (let i = 0; i < count; i++) grid.appendChild(renderSkeletonCard());
}

main();
