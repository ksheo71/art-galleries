# Wireframe: Museum Hub (`apps/index.html`)

Referenced requirements: FR-08, NFR-04.

## Desktop (≥ md)

```
+-----------------------------------------------------------------+
|  Art Gallery                                        Museum Hub  |   ← header
+-----------------------------------------------------------------+
|                                                                 |
|              Choose a museum to explore                         |
|                                                                 |
|   Browse collections powered by public museum APIs.             |
|                                                                 |
|   +----------------------------+  +----------------------------+|
|   | ESTABLISHED 1879           |  | ESTABLISHED 1870           ||
|   |                            |  |                            ||
|   |  The Art Institute         |  |  The Metropolitan          ||
|   |  of Chicago                |  |  Museum of Art             ||
|   |                            |  |                            ||
|   +----------------------------+  +----------------------------+|
|   | Chicago                    |  | New York                   ||
|   | ~130,000 artworks ... IIIF |  | ~490,000 objects ...       ||
|   | Enter →                    |  | Enter →                    ||
|   +----------------------------+  +----------------------------+|
|                                                                 |
+-----------------------------------------------------------------+
|  Sources: artic.edu · metmuseum.org                             |   ← footer
+-----------------------------------------------------------------+
```

## Mobile (< 768 px)

```
+-----------------------------+
| Art Gallery                 |
+-----------------------------+
|                             |
|  Choose a museum to explore |
|  ...                        |
|                             |
| +-------------------------+ |
| | EST. 1879               | |
| | The Art Institute       | |
| | of Chicago              | |
| +-------------------------+ |
| | Chicago                 | |
| | 130k artworks · IIIF    | |
| | Enter →                 | |
| +-------------------------+ |
|                             |
| +-------------------------+ |
| | EST. 1870               | |
| | The Metropolitan Museum | |
| +-------------------------+ |
| | New York                | |
| | 490k objects            | |
| | Enter →                 | |
| +-------------------------+ |
|                             |
+-----------------------------+
```

## Visual Notes

- Chicago card: deep red gradient hero (reflecting the museum's red-accented identity).
- Met card: slate/charcoal gradient hero (reflecting the museum's neutral, classical identity).
- Hero area is non-image (pure CSS gradient + serif typography) so the hub loads instantly with no API dependency.

## Interactions

- Full card click navigates to the museum's index page.
- Keyboard focus shows a colored ring matching the museum's accent.
- No data loading on this page — it's a static landing.
