# Wireframe: Home (`index.html`)

Referenced requirements: FR-01, FR-03, FR-07, NFR-04.

## Desktop (≥ lg, 1024 px+)

```
+-------------------------------------------------------------------+
|  [Logo]  Art Gallery · Chicago                [Favorites ♥]      |  ← header
+-------------------------------------------------------------------+
|                                                                   |
|                                                                   |
|                    The Art Institute of Chicago                   |  ← hero
|                                                                   |
|         +---------------------------------------------+           |
|         |  [ Search the collection...          ][Go] |           |
|         +---------------------------------------------+           |
|                                                                   |
|         A random encounter with an artwork             (subtitle) |
|                                                                   |
+-------------------------------------------------------------------+
|  +---------+  +---------+  +---------+  +---------+               |
|  | [image] |  | [image] |  | [image] |  | [image] |   ← random    |
|  | title   |  | title   |  | title   |  | title   |     gallery   |
|  | artist ♥|  | artist ♥|  | artist ♥|  | artist ♥|     (4 × 3)  |
|  +---------+  +---------+  +---------+  +---------+               |
|  +---------+  +---------+  +---------+  +---------+               |
|  |         |  |         |  |         |  |         |               |
|  +---------+  +---------+  +---------+  +---------+               |
|  +---------+  +---------+  +---------+  +---------+               |
|  |         |  |         |  |         |  |         |               |
|  +---------+  +---------+  +---------+  +---------+               |
+-------------------------------------------------------------------+
|  Source: artic.edu                                                |  ← footer
+-------------------------------------------------------------------+
```

## Mobile (< 640 px)

```
+-----------------------------+
| [≡] Art Gallery       [♥]  |
+-----------------------------+
|                             |
|   The Art Institute         |
|   of Chicago                |
|                             |
| +-------------------------+ |
| | Search the collection   | |
| +-------------------------+ |
|        [ Go ]               |
|                             |
| +-------------------------+ |
| | [ image       ]         | |
| | title                   | |
| | artist               ♥  | |
| +-------------------------+ |
| +-------------------------+ |
| | ...                     | |
| +-------------------------+ |
|        (1 column)           |
+-----------------------------+
```

## Loading State

```
+---------+  +---------+  +---------+  +---------+
| ▒▒▒▒▒▒▒ |  | ▒▒▒▒▒▒▒ |  | ▒▒▒▒▒▒▒ |  | ▒▒▒▒▒▒▒ |
| ▒▒      |  | ▒▒      |  | ▒▒      |  | ▒▒      |
| ▒▒      |  | ▒▒      |  | ▒▒      |  | ▒▒      |
+---------+  +---------+  +---------+  +---------+
   (skeleton grid — same layout as real cards)
```

## Error State

```
+-------------------------------------------------+
|  We couldn't load the gallery right now.        |
|          [ Try again ]                          |
+-------------------------------------------------+
```

## Interaction Notes

- Pressing Enter inside the search field submits the form; redirects to `search.html?q=…`.
- Empty search input → submit is a no-op (button is disabled or form rejects).
- Card click → `artwork.html?id=…`.
- Card ♥ button toggles favorite without navigating.
