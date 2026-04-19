# NFR-01 Frontend-Only Static Site

## Summary
The app ships as a static site with no backend server of our own.

## Description
All dynamic data comes from the public Art Institute of Chicago API, called directly from the browser. The app must be deployable to any static host (e.g., GitHub Pages).

## Criteria
- No server-side runtime (no Node, PHP, Python, etc.) is required to run the app.
- All files under `apps/chicago-meseum/` are static assets: HTML, CSS, JS, images.
- Calls to third-party APIs go directly from the browser (the Art Institute API supports CORS).
- No build step is required to run in the browser, but a Tailwind CSS build step is permitted as a development convenience (output committed or produced via simple CLI).
- No environment variables, secrets, or keys are required (Art Institute API is unauthenticated).
- The app must function when opened behind a static host path prefix such as `/chicago-meseum/` (relative paths only — no absolute `/js/...` URLs).

## Out of Scope
- Server-side rendering.
- API proxying.
- Analytics pipelines.

## Related
- Dictates implementation style of `docs/specs/spec-api-client.md`.
