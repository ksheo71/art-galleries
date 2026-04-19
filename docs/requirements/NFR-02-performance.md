# NFR-02 Performance

## Summary
Pages must feel fast: quick first paint, lazy-loaded images, and no layout jank.

## Criteria
- Initial HTML + CSS + JS payload for any page ≤ 150 KB gzipped (excluding OpenSeadragon, which loads only when the deep-zoom modal opens).
- Largest Contentful Paint (LCP) on main page ≤ 2.5 s on a 4G connection (measured locally with Chrome DevTools throttling).
- All artwork images use `loading="lazy"` and reserve space via explicit `width` / `height` (or aspect-ratio CSS) to prevent CLS.
- Cards render progressively: skeleton first, then real content — no hard block on all 12 API responses.
- OpenSeadragon CDN bundle is loaded on demand (first click of "View in high-res"), not on page load.
- Service Worker caching or HTTP cache headers are considered in a later phase; not required for MVP.

## Out of Scope (MVP)
- Image compression beyond what the API provides.
- Edge caching / CDN of our own.

## Related
- NFR-04 Responsive — image sizing.
