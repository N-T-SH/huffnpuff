// Huff n Puff — what's new. Newest first; the first entry is the app's version.
// Every push adds or extends an entry: patch (x.y.Z) for fixes and polish, minor (x.Y.0) for new
// features, major (X.0.0) for a big change in what the app is (like the rename to Huff n Puff).
export const CHANGELOG = [
  { v: '2.6.0', date: '2026-10-16', title: 'Tidier You tab', notes: [
    'Your data, backups, feedback and app info moved to a More settings page at the bottom of You',
    'Tap the version number to see what’s new',
  ] },
  { v: '2.5.1', date: '2026-10-16', title: 'Fixes', notes: [
    'No more crackle on beeps: the sound engine stays awake for the whole workout',
    'Progress: Progression gets its own tab, the muscle map lives under Body, personal records list removed',
  ] },
  { v: '2.5.0', date: '2026-10-14', title: 'Your own clay twin', notes: [
    'Sculpt your own character (body, hair, headwear, face fuzz, glasses, outfit and colours) instead of playing a cast member',
    'The cast keep their own names and moves',
    'Customise your twin from its own screen; progression settings moved to Progress',
  ] },
  { v: '2.4.0', date: '2026-10-14', title: 'Share the sweat', notes: [
    'Share a picture card of a finished workout',
    'Send a workout to a friend as a link, custom workouts included',
    'Link previews with the whole crew',
    'Send feedback from the app, and opt-out anonymous usage stats (no cookies)',
  ] },
  { v: '2.3.1', date: '2026-10-09', title: 'Fixes', notes: ['No more yellow strip under the app'] },
  { v: '2.3.0', date: '2026-10-07', title: 'Progressive overload', notes: [
    'Weekly-plan workouts get a little harder each week you finish them, with a lighter 4th week',
    'Battery saver, and lighter 3D drawing overall',
  ] },
  { v: '2.2.0', date: '2026-10-06', title: 'Smoother sets', notes: [
    'Timed sets start on their own; reps moves are one screen with sets and reps counters',
    'Workout length only counts time actually spent working out',
  ] },
  { v: '2.1.0', date: '2026-10-05', title: 'Make it yours', notes: [
    'Swap any move, before or during a workout',
    'Favourite workouts get their own carousel',
    'Optional two-minute cool-down',
  ] },
  { v: '2.0.0', date: '2026-10-05', title: 'Hello, Huff n Puff', notes: ['New name, logo, icon and home at huffnpuff.club'] },
  { v: '1.3.1', date: '2026-10-03', title: 'Fixes', notes: ['The 3D cast stays alive on phones', 'Smoother clay hands', 'Close-ups frame the action'] },
  { v: '1.3.0', date: '2026-10-02', title: 'The cast comes alive', notes: [
    'Real hands, expressive faces and directed close-ups',
    'Moves in every direction, planted feet and smooth blends between poses',
    'Workouts tailored to injuries and limits, plus a move speed setting',
  ] },
  { v: '1.2.0', date: '2026-10-01', title: 'Voice coach', notes: ['A natural recorded voice coach with a choice of voices', 'Well-timed “next up” calls'] },
  { v: '1.1.0', date: '2026-10-01', title: 'Claymation', notes: [
    'A 3D clay cast, each with their own miniature set',
    'Rest-period films: handovers, breathers and get-ready moments',
    'Muscle map, move feedback and speech-bubble cheers',
  ] },
  { v: '1.0.0', date: '2026-10-01', title: 'First release', notes: ['Guided workouts, a weekly plan, progress tracking and badges', 'Works offline, no account needed'] },
];
export const VERSION = CHANGELOG[0].v;
