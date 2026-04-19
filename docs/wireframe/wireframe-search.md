# Wireframe: Search Results (`search.html`)

Referenced requirements: FR-01, FR-02, FR-07, NFR-04.

## Desktop (≥ lg)

```
+-------------------------------------------------------------------+
| [Logo] [ monet              ][Go]             [Favorites ♥]      |
+-------------------------------------------------------------------+
|  Results for "monet"                                              |
|  1,248 artworks                                                   |
+-------------------------------------------------------------------+
| +------------+ +--------------------------------------------+     |
| | FILTERS    | |  +--------+ +--------+ +--------+          |     |
| |            | |  |  [img] | |  [img] | |  [img] |          |     |
| | ARTIST     | |  | title  | | title  | | title  |          |     |
| | ○ Monet    | |  | artist♥| | artist♥| | artist♥|          |     |
| | ○ Manet    | |  +--------+ +--------+ +--------+          |     |
| | ...        | |                                            |     |
| |            | |  +--------+ +--------+ +--------+          |     |
| | PERIOD     | |  |        | |        | |        |          |     |
| | [ from  ]  | |  +--------+ +--------+ +--------+          |     |
| | [  to   ]  | |                                            |     |
| |            | |  +--------+ +--------+ +--------+          |     |
| | DEPARTMENT | |  |        | |        | |        |          |     |
| | [Painting ▾]| |  +--------+ +--------+ +--------+          |     |
| |            | |                                            |     |
| | [Apply]    | |        [  Load more  ]                     |     |
| | [Clear]    | |                                            |     |
| +------------+ +--------------------------------------------+     |
+-------------------------------------------------------------------+
```

## Mobile (< 640 px)

```
+-----------------------------+
| [≡] [ monet      ] [Go] [♥] |
+-----------------------------+
| Results for "monet"         |
|   1,248 artworks            |
+-----------------------------+
| [ ▼ Filters ]  (collapsed)  |
+-----------------------------+
| +-------------------------+ |
| | [image]                 | |
| | title                   | |
| | artist               ♥ | |
| +-------------------------+ |
| +-------------------------+ |
| | ...                     | |
| +-------------------------+ |
|                             |
|       [ Load more ]         |
+-----------------------------+
```

## Empty State

```
+-------------------------------------------------+
|  No results for "asdfasdf".                     |
|  Try a different keyword, or [clear filters].   |
+-------------------------------------------------+
```

## Interaction Notes

- Changing any filter pushes to the URL (`history.replaceState` + refetch).
- "Load more" appends additional cards under the existing grid (same query, next page).
- Artist options are derived from result aggregates; the list updates as more results load.
- Department dropdown is populated from `/departments` (once per session).
- On mobile, the filter panel is a collapsible accordion that scrolls inline above the grid.
