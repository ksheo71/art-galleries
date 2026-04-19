# Spec: Favorites Storage

## Purpose
Define the exact localStorage contract used by `favorites.js` so that all pages share a consistent format and can safely read/write favorites.

## Storage

- **Key**: `chicago-museum.favorites`
- **Value**: JSON-stringified array of `Favorite` objects.

```js
[
  {
    "id": 27992,
    "title": "A Sunday on La Grande Jatte — 1884",
    "artist": "Georges Seurat",
    "imageId": "1adf2696-8489-499b-cad2-821d7fde4b33",
    "addedAt": "2026-04-19T10:15:00.000Z"
  }
]
```

## Public API (`favorites.js`)

```js
getAll() => Favorite[]
has(id: number) => boolean
add({ id, title, artist, imageId }) => void     // sets addedAt = now
remove(id: number) => void
toggle({ id, title, artist, imageId }) => boolean  // returns new "isFavorite"
```

## Semantics

- `add` is idempotent: adding an id that already exists is a no-op (the existing `addedAt` is preserved).
- `remove` is idempotent: removing an id that does not exist is a no-op.
- `toggle` adds if absent, removes if present, returns `true` if the item is now favorited.
- `getAll` returns a shallow copy; callers must not mutate the returned array.
- Maximum stored items: no explicit cap in MVP. If localStorage quota errors occur, `add` emits a `console.warn` and silently drops the new item (UI shows a toast in a later phase).

## Error Handling

Wrap all `localStorage` access in try/catch:

```js
try {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
} catch {
  return [];
}
```

If `localStorage` is unavailable (e.g., restrictive private-browsing mode):
- `getAll` returns `[]`.
- `add` / `remove` / `toggle` are no-ops that return a safe default.
- UI (card ♥ button) shows a tooltip: "Favorites require local browser storage."

## Migration / Versioning

- MVP: no version field. Structure is flat and stable.
- Future: if schema evolves, wrap the value as `{ version: 1, items: [...] }` and migrate on read.

## Events

No cross-tab sync required in MVP. The `storage` event can be listened to in a later phase.
