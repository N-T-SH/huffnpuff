# Pulse 💓 — the claymation workout tracker

Pulse is a playful, private workout tracker for Android, installable as a Progressive Web App (PWA). Instead of stock exercise videos, every move is demonstrated by a hand-rigged **claymation character**. The figure is drawn live in SVG with a lumpy clay texture, fingerprint grain and a stop-motion "boil" running at 12 fps.

**No accounts. No cloud. No tracking.** Everything stays on your device (IndexedDB), and the app works fully offline.

## Features

- **60+ exercises**, each with its own clay animation, step-by-step instructions, coach tips, common mistakes and a muscle map.
- **20 ready-made workouts**: the Classic 7-minute circuit, HIIT, core, mobility, dumbbell, kettlebell, barbell push/pull/legs, jump rope, desk breaks, bedtime stretches and more.
- **Guided player**
  - Timed circuits with get-ready, work and rest phases, rounds, and round breaks.
  - Strength mode with sets × reps, weight logging, auto rest timers (+15s / skip) and timed holds.
  - Voice coach, beeps, vibration and screen wake lock.
  - Android back-button safe; a workout interrupted mid-way can be resumed.
- **Smart progression**: suggests the next weight or reps from your last session, estimates your 1RM and detects personal records automatically.
- **Workout builder**: build circuits or strength routines, reorder moves, tweak sets, reps, rest and work time. You can also customise a copy of any built-in workout.
- **Weekly plan**: generated from your goal, level, equipment and training days. Swap any day.
- **Progress**: weekly goal ring, day and week streaks, 8-week charts (minutes, workouts, kcal, volume), a GitHub-style activity calendar, a 7-day muscle heat map, personal records, a body-weight trend with BMI, and 20 badges.
- **Make it yours**: customise your clay character's skin, shirt, hair and headband. Light, dark and auto themes; kg or lb.
- **Your data, portable**: JSON backup and restore, plus CSV export of every set.

## Install on Android

1. Open the GitHub Pages URL in Chrome.
2. Tap **Install** on the Today screen, or use the ⋮ menu → **Install app**.
3. Pulse launches full-screen from your home screen and works offline.

## Hosting on GitHub Pages

`.github/workflows/pages.yml` deploys the site on every push to the default branch, and you can also run it manually from the Actions tab. If the first run fails at **Configure Pages**, enable Pages once:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

Then re-run the workflow. The app is published at `https://<user>.github.io/pulse/`. Each deploy stamps a fresh service-worker cache version, so installed apps update automatically and show a "Reload" prompt.

## Development

Pulse is plain HTML, CSS and ES modules, with **no build step** and **no dependencies**.

```bash
npx http-server -c-1 .     # or: python3 -m http.server
open http://localhost:8080
```

| Path | What it is |
| --- | --- |
| `js/clay.js` | Claymation engine: 2D rig, forward kinematics, auto ground contact/leveling, clay rendering, props, stop-motion player |
| `js/exercises.js` | Exercise library and per-exercise keyframes |
| `js/workouts.js` | Built-in routines, time estimates, plan generator |
| `js/store.js` | Local storage (IndexedDB with a localStorage fallback), backup and restore |
| `js/stats.js` | Streaks, PRs, 1RM, muscle load, calories, badges |
| `js/views/*` | Screens (onboarding, today, workouts, library, player, summary, progress, session, profile, builder) |
| `sw.js` | Offline service worker |
| `tools/gallery.html` | Contact sheet of every clay animation (`?all=1&cols=2&ex=squat,push-up`) |
| `tools/smoke.mjs` | Playwright end-to-end smoke test |
| `tools/render-icons.mjs` | Renders PNG icons from `icons/icon.svg` |

### Adding an exercise

Poses use a small shorthand: torso lean `t`, arms `ra`/`la` and legs `rl`/`ll` as absolute joint angles (0 = down, 90 = forward, 180 = up). The engine handles the rest. `lv` levels two contact points onto the floor (for example, hands and toes in a plank), `ax` pins a point horizontally, and `anchor` can hang the figure from a bar.

```js
def({
  id: 'squat', name: 'Bodyweight Squat', cat: 'strength', primary: ['quads', 'glutes'],
  anim: { tempo: 2.4, frames: [
    P({ t: 4, ra: [70, 78] }),
    P({ t: 38, ra: [92, 92], rl: [86, -28], ll: [84, -30] }),
  ] },
});
```

## Privacy

Pulse makes no network requests beyond loading its own files. Calorie numbers are MET-based estimates, not medical advice.
