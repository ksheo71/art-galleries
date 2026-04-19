import { escapeHtml } from "../util.js";

export function renderFilters(container, { aggregates, departments, current }, onChange) {
  // V&A: treat `objectType` as the department proxy. Departments come from
  // aggregates (no flat /departments endpoint on the V&A API).
  const deptOptions = departments.length > 0
    ? departments.filter((d) => aggregates.departments.includes(d.title))
    : aggregates.departments.map((title) => ({ id: title, title }));

  container.innerHTML = `
    <div class="space-y-5">
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">Maker</h4>
        <ul class="space-y-1 max-h-64 overflow-y-auto pr-1">
          <li>
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" name="f-artist" value="" ${!current.artist ? "checked" : ""}/>
              <span>All</span>
            </label>
          </li>
          ${aggregates.artists
            .map(
              (a) => `
            <li>
              <label class="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="f-artist" value="${escapeHtml(a)}" ${current.artist === a ? "checked" : ""}/>
                <span class="truncate" title="${escapeHtml(a)}">${escapeHtml(a)}</span>
              </label>
            </li>`
            )
            .join("")}
          ${aggregates.artists.length === 0 ? '<li class="text-xs text-gray-400">(Load results first)</li>' : ""}
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">Period</h4>
        <div class="flex gap-2">
          <input type="number" name="f-date-start" placeholder="From" value="${current.dateStart ?? ""}" class="w-full border rounded px-2 py-1 text-sm" aria-label="From year"/>
          <input type="number" name="f-date-end" placeholder="To" value="${current.dateEnd ?? ""}" class="w-full border rounded px-2 py-1 text-sm" aria-label="To year"/>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">Object type</h4>
        <select name="f-dept" class="w-full border rounded px-2 py-1 text-sm" aria-label="Object type">
          <option value="">All</option>
          ${deptOptions
            .map(
              (d) =>
                `<option value="${escapeHtml(d.title)}" ${current.department === d.title ? "selected" : ""}>${escapeHtml(d.title)}</option>`
            )
            .join("")}
        </select>
      </div>

      <div class="flex gap-2">
        <button type="button" class="flex-1 bg-amber-800 text-white py-2 rounded text-sm font-medium" id="apply-filters">Apply</button>
        <button type="button" class="flex-1 border py-2 rounded text-sm" id="clear-filters">Clear</button>
      </div>
    </div>
  `;

  container.querySelector("#apply-filters").addEventListener("click", () => {
    const artist = container.querySelector('[name="f-artist"]:checked')?.value || null;
    const ds = container.querySelector('[name="f-date-start"]').value;
    const de = container.querySelector('[name="f-date-end"]').value;
    const department = container.querySelector('[name="f-dept"]').value || null;
    onChange({
      artist,
      dateStart: ds ? parseInt(ds, 10) : null,
      dateEnd: de ? parseInt(de, 10) : null,
      department,
    });
  });

  container.querySelector("#clear-filters").addEventListener("click", () => {
    onChange({ artist: null, dateStart: null, dateEnd: null, department: null });
  });
}
