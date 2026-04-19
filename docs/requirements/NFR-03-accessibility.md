# NFR-03 Accessibility

## Summary
The site must be usable with keyboard and screen readers at a baseline WCAG 2.1 AA level.

## Criteria
- All interactive elements (search input, buttons, cards, filter controls, modal) are reachable via keyboard (`Tab`), with a visible focus outline.
- The search input has an associated `<label>` (visible or `sr-only`).
- Artwork images use descriptive `alt` text: `alt="<title> by <artist>"`.
- The favorite ♥ button is a `<button>` with an `aria-pressed` attribute reflecting the current state and an `aria-label` of "Add to favorites" / "Remove from favorites".
- The deep-zoom modal:
  - Traps focus inside the dialog while open.
  - Returns focus to the trigger button when closed.
  - Uses `role="dialog"` and `aria-modal="true"`.
  - Closes on `Escape`.
- Color contrast of text on background meets WCAG AA (≥ 4.5:1 for normal, ≥ 3:1 for large).
- The site works with browser-level zoom to 200% without breaking layout.

## Out of Scope (MVP)
- AAA-level contrast.
- Voice control optimization.
- Formal audit certification.
