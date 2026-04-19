# NFR-04 Responsive Design

## Summary
The app is usable from mobile phones to large desktop monitors.

## Criteria
- Supported breakpoints (Tailwind defaults):
  - `sm` (≥ 640 px)
  - `md` (≥ 768 px)
  - `lg` (≥ 1024 px)
  - `xl` (≥ 1280 px)
- Card grid columns:
  - Mobile (< 640 px): 1 column
  - `sm`: 2 columns
  - `md`: 3 columns
  - `lg`+: 4 columns
- The search bar on the main page is full-width on mobile, capped at ~640 px on desktop.
- The search results filter panel is a sidebar on `lg`+ and a collapsible accordion on smaller screens.
- The artwork detail page stacks (image on top, metadata below) on mobile and switches to side-by-side at `md`+.
- The deep-zoom modal always takes the full viewport regardless of breakpoint.
- Tap targets are ≥ 44×44 px on touch devices.

## Out of Scope (MVP)
- Dedicated native mobile app.
- Orientation-specific layouts beyond portrait/landscape defaults.
