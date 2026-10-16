# Huff n Puff — notes for contributors (and Claude)

- Every push updates `js/changelog.js`: add an entry at the top (or extend the newest one if it hasn't
  shipped yet) and bump the version. Patch `x.y.Z` for fixes and polish, minor `x.Y.0` for new features,
  major `X.0.0` for a big change in what the app is. Write notes for users, not developers.
- Keep `const VERSION = 'pulse-vX.Y.Z'` in `sw.js` in step (the deploy swaps in the commit hash anyway).
- New files the app loads go in the service worker's `ASSETS` list in `sw.js`.
- Smoke tests: `npx http-server -p 8080 -s -c-1 .` then `node tools/smoke.mjs` (and smoke2–5).
