// SuperSweatClub — everything the voice coach can say, as reusable clip-sized parts.
// The deploy pre-records each part with a neural voice (tools/build-audio.py); the app
// strings parts together (e.g. "Rest. Next up:" + "Wall Sit." + "Round 2 next.").
// Keep these builders the single source of truth: the app and the recorder both use them.

export const LINES = {
  getReady: 'Get ready. First up:',
  restNext: 'Rest. Next up:',
  rest: 'Rest.',
  nextUp: 'Next up:',
  halfway: 'Halfway there!',
  switchSides: 'Switch sides!',
  paused: 'Paused.',
  go: 'Go!',
  saved: 'Workout saved. Nice effort!',
  complete: 'Workout complete. Amazing job!',
  voiceOn: 'Voice coach on.',
  letsGo: 'Let’s get moving!',
};

export const exLine = (ex) => `${ex.name}.`;
export const secondsLine = (n) => `${n} seconds.`;
export const setLine = (n, m) => `Set ${n} of ${m}.`;
export const labelLine = (label) => `${label}.`;
export const roundLabel = (n) => `Round ${n} next`;
export const WARMUP_LABEL = 'Warm-up';
export const WARMUP_DONE_LABEL = 'Warm-up done — main workout next';

// Every clip the app may ask for (used at deploy time to pre-record them)
export function allLines(exercises) {
  const out = new Set(Object.values(LINES));
  for (const ex of exercises) out.add(exLine(ex));
  for (let s = 5; s <= 600; s += 5) out.add(secondsLine(s));
  for (let m = 1; m <= 12; m++) for (let n = 1; n <= m; n++) out.add(setLine(n, m));
  out.add(labelLine(WARMUP_LABEL));
  out.add(labelLine(WARMUP_DONE_LABEL));
  for (let r = 2; r <= 10; r++) out.add(labelLine(roundLabel(r)));
  return [...out];
}
