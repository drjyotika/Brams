// API base URL used by every fetch() call in the app.
//
// Production:   always https://bramsmindcare.com/api (relative URLs resolve correctly)
// Local dev:    defaults to /api  → hits your local Next.js server
//
// To test the PRODUCTION API from your local machine, add this to .env.local:
//   NEXT_PUBLIC_API_URL=https://bramsmindcare.com/api
//
// Then restart `npm run dev` — all admin panel saves/reads will go to prod.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "/api";
