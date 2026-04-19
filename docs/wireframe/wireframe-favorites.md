# Wireframe: Favorites (`favorites.html`)

Referenced requirements: FR-07, NFR-04.

## Desktop (≥ lg)

```
+-------------------------------------------------------------------+
| [Logo] [ search                ][Go]           [Favorites ♥]     |
+-------------------------------------------------------------------+
|  Your Favorites                                                   |
|  12 saved artworks                                                |
+-------------------------------------------------------------------+
|  +---------+  +---------+  +---------+  +---------+               |
|  | [image] |  | [image] |  | [image] |  | [image] |               |
|  | title   |  | title   |  | title   |  | title   |               |
|  | artist ♥|  | artist ♥|  | artist ♥|  | artist ♥|               |
|  | 2d ago  |  | 1w ago  |  | 3w ago  |  | 1m ago  |               |
|  +---------+  +---------+  +---------+  +---------+               |
|  +---------+  +---------+  +---------+  +---------+               |
|  |         |  |         |  |         |  |         |               |
|  +---------+  +---------+  +---------+  +---------+               |
+-------------------------------------------------------------------+
```

- All ♥ buttons are filled (these are already favorited).
- Clicking ♥ removes the item from the list and re-renders (no page reload).
- Clicking the card itself navigates to the artwork detail page.
- Items are sorted by `addedAt` descending.

## Mobile (< 640 px)

```
+-----------------------------+
| [≡] Art Gallery        [♥] |
+-----------------------------+
| Your Favorites              |
| 12 saved artworks           |
+-----------------------------+
| +-------------------------+ |
| | [image]                 | |
| | title / artist       ♥ | |
| | added 2d ago            | |
| +-------------------------+ |
| +-------------------------+ |
| ...                         |
+-----------------------------+
```

## Empty State

```
+-------------------------------------------------+
|   You haven't saved anything yet.               |
|                                                 |
|   Tap ♥ on any artwork to save it here.         |
|                                                 |
|            [ Back to home ]                     |
+-------------------------------------------------+
```

## Storage Unavailable State

If `localStorage` is not available:

```
+-------------------------------------------------+
|   Favorites require local browser storage,      |
|   which is unavailable in this browser mode.    |
+-------------------------------------------------+
```

## Interaction Notes

- Remove action is immediate; no confirmation dialog in MVP (simple undo-by-re-clicking the heart on the detail page).
- The "relative time" label (e.g., "2d ago") is computed from `addedAt` at render time.
