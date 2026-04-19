# NFR-05 Browser Support

## Summary
The app must run on the two most recent major versions of each mainstream evergreen browser.

## Criteria
- Supported: latest and latest-1 of Chrome, Firefox, Safari, Edge.
- Unsupported: Internet Explorer, any browser without ES2020 / `fetch` / `async-await`.
- No framework-specific polyfills are required; modern baseline JS is assumed.
- CSS features used: flexbox, grid, `aspect-ratio`, logical properties (baseline browser support OK).
- JS features used: `fetch`, `async`/`await`, `URL` / `URLSearchParams`, `localStorage`, ES modules via `<script type="module">`.
- The app should not throw a blocking error in an unsupported browser — it may display a graceful message ("This site requires a modern browser"), but this is not a hard MVP requirement.

## Testing
- Manual verification on the latest Chrome, Firefox, Safari (macOS), and Edge (Windows) before each release.
