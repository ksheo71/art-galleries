# FR-03 Main Page Random Gallery Preview

## Summary
The main page displays a random preview of 8–12 artworks below the search bar to invite exploration before the user types anything.

## Description
On first load and on every page refresh, the main page fetches a random subset of artworks from the API and renders them as a responsive grid of cards. The goal is serendipitous discovery ("a chance encounter with an artwork").

## Acceptance Criteria
- On `index.html` load, the app calls `GET /artworks?page=<rand>&limit=12&fields=id,title,artist_display,image_id`.
- Random page number is generated client-side (e.g., random integer in a sane range, such as 1–500).
- The result renders as 12 cards. Each card shows the artwork image (IIIF 843px), title, and artist.
- Clicking a card navigates to `artwork.html?id=<id>`.
- Cards with missing `image_id` are skipped (do not render a broken placeholder).
- If fewer than 8 valid items are returned, the app refetches with a different random page until at least 8 are rendered.
- Loading state shows a skeleton grid; error state shows a retry button.

## Out of Scope (MVP)
- Personalized recommendations.
- Time-based picks ("artwork of the day").
- Infinite scroll on the main page.

## Related
- Uses common `card.js` component shared with search results and favorites.
