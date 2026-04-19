# Wireframe: Artwork Detail (`artwork.html`)

Referenced requirements: FR-04, FR-05, FR-06, FR-07, NFR-04.

## Desktop (≥ md)

```
+-------------------------------------------------------------------+
| [Logo] [ search                ][Go]           [Favorites ♥]     |
+-------------------------------------------------------------------+
| +-----------------------------+ +-------------------------------+ |
| |                             | | A Sunday on La Grande Jatte ♥ | |
| |                             | |                               | |
| |                             | | Georges Seurat                | |
| |        [  image  ]          | | French, 1859–1891             | |
| |        (IIIF 843px)         | |                               | |
| |                             | | 1884                          | |
| |                             | | Oil on canvas                 | |
| |                             | | 207.5 × 308.1 cm              | |
| |                             | | Place of origin: Paris        | |
| +-----------------------------+ |                               | |
|                                 | Credit: Helen Birch Bartlett  | |
|   [ View in high-res ]          | Memorial Collection           | |
|                                 +-------------------------------+ |
+-------------------------------------------------------------------+
|  Description                                                      |
|  ................................................................|
|  ................................................................|
+-------------------------------------------------------------------+
|  Related artworks                                                 |
|  +--------+ +--------+ +--------+ +--------+ +--------+ +--------+|
|  |  [img] | |  [img] | |  [img] | |  [img] | |  [img] | |  [img] ||
|  | title  | | title  | | title  | | title  | | title  | | title  ||
|  | artist | | artist | | artist | | artist | | artist | | artist ||
|  +--------+ +--------+ +--------+ +--------+ +--------+ +--------+|
+-------------------------------------------------------------------+
```

## Mobile (< 768 px)

Stacked:

```
+-----------------------------+
| header …                    |
+-----------------------------+
|                             |
|        [ image ]            |
|                             |
| A Sunday on La Grande Jatte ♥
| Georges Seurat              |
| 1884 · Oil on canvas        |
| 207.5 × 308.1 cm            |
| Paris                       |
| Credit: ...                 |
|                             |
|   [ View in high-res ]      |
+-----------------------------+
| Description                 |
| ...                         |
+-----------------------------+
| Related artworks            |
| +-------------------------+ |
| |  [img]                  | |
| |  title / artist         | |
| +-------------------------+ |
| ...                         |
+-----------------------------+
```

## Deep-Zoom Modal

```
+------------------------------------------- ✕ -+
|                                                |
|                                                |
|         [ pannable, zoomable image ]           |
|              (OpenSeadragon)                   |
|                                                |
|                                                |
|     [-] [=] [+]  [full]                        |   ← controls
+------------------------------------------------+
```

- Covers the full viewport, opaque black backdrop.
- ✕ top-right closes the modal (also `Escape`).
- OpenSeadragon provides zoom and fullscreen controls in the corner.

## States

- No image available: image area becomes a rounded grey placeholder with "No public image available for this work." Button "View in high-res" is hidden.
- Artwork id not found: whole main area replaced with "Artwork not found." + link to `index.html`.
- Related works failed / empty: section is hidden entirely (not an empty block).
