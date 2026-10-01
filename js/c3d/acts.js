// SuperSweatClub 3D — little non-exercise "acts" the cast perform between moves:
// handovers (one per pair of characters), breathers and get-ready routines.
// Poses use the same shorthand as js/exercises.js (angles: 0 down, 90 forward, 180 up).
const STAND = { t: 0, ra: [6, 10], la: [-4, 0], rl: [2, 0], ll: [-2, 0] };
const P = (o) => ({ ...STAND, ...o });

const A = (tempo, frames, o = {}) => ({ tempo, ax: 'pelvis', frames, ...o });

export const ACTS = {
  idle: A(3, [P({}), P({ t: 2, n: 4, ra: [8, 14], la: [-2, 4] })]),
  walk: A(0.8, [
    P({ t: 4, ra: [-26, -12], la: [30, 54], rl: [28, -4], ll: [-20, -46], lift: 2 }),
    P({ t: 4, ra: [30, 54], la: [-26, -12], rl: [-20, -46], ll: [28, -4], lift: 2 }),
  ]),
  run: A(0.5, [
    P({ t: 12, ra: [-40, 40], la: [50, 120], rl: [60, -10], ll: [-30, -110], lift: 8 }),
    P({ t: 12, ra: [50, 120], la: [-40, 40], rl: [-30, -110], ll: [60, -10], lift: 8 }),
  ]),
  wave: A(1, [P({ ra: [150, 175], n: 6 }), P({ ra: [150, 215], n: 6 })]),
  highfive: A(1.6, [P({ ra: [20, 40] }), P({ t: -6, ra: [152, 162], rl: [4, 0] }), P({ t: 8, ra: [112, 118], lift: 5 }), P({ t: 4, ra: [60, 80] })], { d: [1, 1.3, 0.5, 1] }),
  fistbump: A(1.6, [P({ ra: [30, 110] }), P({ t: 4, ra: [40, 120] }), P({ t: 10, ra: [90, 90], rl: [22, 0], ll: [-12, 0] }), P({ t: 2, ra: [150, 170], la: [140, 160], lift: 10 })], { d: [1, 1, 0.5, 1.4] }),
  throw: A(1.6, [P({ ra: [40, 70] }), P({ t: -12, ra: [-60, -20], rl: [-6, 0], ll: [10, -10] }), P({ t: 16, ra: [140, 152], rl: [24, -4], ll: [-14, -10] }), P({ t: 6, ra: [70, 80] })], { d: [1, 1, 0.5, 1.5] }),
  catch: A(1.6, [P({ ra: [12, 24], la: [4, 14] }), P({ ra: [104, 118], la: [100, 114] }), P({ t: -10, ra: [104, 118], la: [100, 114], rl: [-8, 0], ll: [16, -20], lift: 0 }), P({ t: 4, ra: [44, 150], la: [40, 146] })], { d: [1, 0.8, 0.5, 1.5] }),
  give: A(1.6, [P({ ra: [30, 60] }), P({ t: 8, ra: [82, 88] }), P({ t: 8, ra: [84, 90] }), P({ ra: [12, 20] })], { d: [1, 1.2, 0.8, 1] }),
  take: A(1.6, [P({ ra: [8, 14] }), P({ t: 6, ra: [80, 86] }), P({ t: 4, ra: [40, 150] }), P({ ra: [44, 150] })], { d: [1.1, 1, 0.8, 1] }),
  bow: A(2, [P({}), P({ t: 58, n: 64, ra: [-8, 30], la: [-12, 26], rl: [-2, 0] }), P({ t: 58, n: 64, ra: [-8, 30], la: [-12, 26], rl: [-2, 0] }), P({ ra: [150, 175] })], { d: [0.6, 1, 0.8, 1] }),
  curtsy: A(2, [P({}), P({ t: 18, n: 30, ra: [-10, 40], la: [-14, 36], rl: [16, -30], ll: [-40, -90] }), P({ t: 18, n: 30, ra: [-10, 40], la: [-14, 36], rl: [16, -30], ll: [-40, -90] }), P({})], { d: [0.6, 1, 0.8, 1] }),
  hug: A(2, [P({ ra: [50, 90], la: [46, 86] }), P({ t: 10, n: 14, ra: [88, 150], la: [86, 146] }), P({ t: 10, n: 14, ra: [86, 156], la: [84, 152], lift: 6 }), P({ t: 4, ra: [40, 80], la: [36, 76] })], { d: [0.8, 1, 1.4, 0.8] }),
  dance: A(0.9, [
    P({ t: 6, ra: [162, 172], la: [24, 70], rl: [32, -34], ll: [-6, -10] }),
    P({ t: -4, ra: [24, 70], la: [-30, -10], rl: [-6, -10], ll: [32, -34], lift: 4 }),
  ]),
  disco: A(1.1, [
    P({ t: 4, ra: [160, 172], la: [-10, 30], rl: [20, -20], ll: [-4, -6] }),
    P({ t: 4, ra: [40, 10], la: [-10, 30], rl: [-4, -6], ll: [20, -20], lift: 2 }),
  ]),
  flex: A(1.6, [P({ ra: [92, 175], la: [80, 165] }), P({ t: 4, ra: [96, 150], la: [84, 140], rl: [12, 0], ll: [-12, 0] })]),
  point: A(1.2, [P({ t: 4, ra: [96, 100] }), P({ t: 6, ra: [104, 112], lift: 2 })]),
  zapped: A(0.9, [P({ ra: [150, 160], la: [150, 160], lift: 22, rfo: 40, lfo: 40 }), P({ ra: [20, 30], la: [20, 30], rl: [20, -20], ll: [16, -24] })]),
  cheer: A(1, [
    P({ t: 10, ra: [60, 150], la: [56, 146], rl: [40, -40], ll: [38, -42] }),
    P({ t: -4, ra: [165, 160], la: [195, 200], rl: [6, -20], ll: [-10, -30], rfo: 50, lfo: 50, lift: 30 }),
  ]),
  land: A(1.4, [P({ t: 34, ra: [70, 90], la: [66, 86], rl: [80, -40], ll: [76, -44] }), P({ t: 30, ra: [60, 80], la: [56, 76], rl: [72, -36], ll: [70, -40] }), P({ ra: [150, 175] })], { d: [0.4, 1, 1.4] }),
  tag: A(1.4, [P({ ra: [30, 50] }), P({ t: 10, ra: [96, 100], rl: [18, 0] }), P({ ra: [30, 50] })]),
  // breathers
  handsKnees: A(2.2, [P({ t: 42, n: 30, ra: [62, 40], la: [58, 36], rl: [26, -14], ll: [22, -18] }), P({ t: 47, n: 36, ra: [64, 42], la: [60, 38], rl: [28, -16], ll: [24, -20] })]),
  drink: A(2.4, [P({ ra: [40, 150] }), P({ t: -8, n: -30, ra: [66, 178] }), P({ t: -8, n: -30, ra: [66, 178] }), P({ n: 6, ra: [36, 140] })], { d: [1, 0.8, 1.6, 1] }),
  wipeBrow: A(2.2, [P({ ra: [110, 214], n: 6 }), P({ ra: [124, 244], n: 10 }), P({ ra: [14, 20] })], { d: [1, 1, 1.2] }),
  fan: A(0.45, [P({ ra: [64, 140], n: -12 }), P({ ra: [60, 104], n: -12 })]),
  shakeOut: A(0.36, [P({ ra: [8, 0], la: [-8, -4], lift: 3 }), P({ ra: [-8, -18], la: [8, 12], rl: [8, -8] })]),
  stretchUp: A(3.2, [P({}), P({ t: -6, n: -12, ra: [172, 178], la: [168, 176], rfo: 30, lfo: 30 })]),
  deepBreath: A(5, [P({ ra: [10, 14], la: [6, 10] }), P({ t: -4, n: -10, ra: [170, 176], la: [166, 172] })]),
  handsHips: A(2.4, [P({ ra: [-26, 62], la: [-30, 58] }), P({ t: -3, n: -4, ra: [-24, 64], la: [-28, 60], rl: [6, 0] })]),
  headNod: A(0.5, [P({ n: 14, ra: [20, 60], rl: [10, -10] }), P({ n: -4, ra: [14, 50] })]),
  beardStroke: A(1.8, [P({ ra: [40, 150], n: 8 }), P({ ra: [46, 138], n: 14 })]),
  bellyPat: A(0.6, [P({ ra: [22, 80], la: [18, 76] }), P({ ra: [26, 100], la: [20, 92] })]),
  hairFluff: A(1.4, [P({ ra: [150, 230], n: -6 }), P({ ra: [162, 254], n: -10 })]),
  // getting ready
  chalk: A(2.2, [P({ t: 4, ra: [62, 92], la: [58, 88] }), P({ t: 8, ra: [52, 80], la: [56, 84] }), P({ t: 18, ra: [-10, -6], la: [-6, 0], rl: [32, -30], ll: [28, -34] })], { d: [0.6, 0.6, 1.4] }),
  bounce: A(0.5, [P({ ra: [40, 100], la: [36, 96], rfo: 30, lfo: 30, lift: 4 }), P({ ra: [44, 104], la: [40, 100], rl: [8, -8], ll: [6, -10] })]),
  twist: A(1.4, [P({ t: 6, ra: [90, 92], la: [88, 90] }), P({ t: -4, ra: [70, 140], la: [110, 70] }), P({ t: 6, ra: [92, 94], la: [86, 88] }), P({ t: 4, ra: [110, 70], la: [70, 140] })]),
};

export const actEx = (name) => ({ id: 'act:' + name, name, cat: 'default', anim: ACTS[name] || ACTS.idle });

/* ---------- one handover per pair of characters ----------
   verb: what they do together · prop (owned by `owner`) · cam: camera move into the cut · wipe: transition overlay
   lines: what each says during the handover (owner/first speaker first). */
export const PAIRS = {
  'pip|bruno': { verb: 'toss', prop: 'dumbbell', owner: 'bruno', cam: 'whip', wipe: 'flash', gap: 160,
    lines: { bruno: 'Think fast, little buddy!', pip: 'Oof! Is this… made of lead?' } },
  'pip|jolene': { verb: 'highfive', cam: 'spin', wipe: 'vhs', gap: 86, sfx: 'SLAP!',
    lines: { jolene: 'Up top, sweatband!', pip: 'Totally tubular!' } },
  'pip|dee': { verb: 'dance', cam: 'roll', wipe: 'vinyl', gap: 120,
    lines: { dee: 'Dance-off. Now.', pip: 'I only know the robot!' } },
  'pip|fern': { verb: 'handoff', prop: 'bottle', owner: 'pip', cam: 'rise', wipe: 'leaves', gap: 88,
    lines: { pip: 'Hydrate, friend!', fern: 'The fox will want some too.' } },
  'pip|merlin': { verb: 'zap', prop: 'wand', owner: 'merlin', cam: 'zoom', wipe: 'stars', gap: 130, sfx: '✨ ZAP ✨',
    lines: { merlin: 'Abracad-abs!', pip: 'Whoa — I feel… spinny.' } },
  'pip|bao': { verb: 'handoff', prop: 'spoon', owner: 'bao', cam: 'drop', wipe: 'tiles', gap: 90,
    lines: { bao: 'Taste this. Protein soup!', pip: 'Mmm… sweaty!' } },
  'bruno|jolene': { verb: 'bow', cam: 'whip', wipe: 'curtain', gap: 116,
    lines: { bruno: 'M’lady. The floor is yours.', jolene: 'Oh, you big bean!' } },
  'bruno|dee': { verb: 'fistbump', cam: 'spin', wipe: 'flash', gap: 82, sfx: 'BUMP!',
    lines: { dee: 'Respect the moustache.', bruno: 'Respect the shades.' } },
  'bruno|fern': { verb: 'hug', cam: 'zoom', wipe: 'iris', gap: 56,
    lines: { fern: 'Bring it in, Bruno.', bruno: 'Gentle. I am very squishy.' } },
  'bruno|merlin': { verb: 'flexoff', cam: 'roll', wipe: 'splat', gap: 124,
    lines: { bruno: 'Behold: the gun show.', merlin: 'Mine are enchanted.' } },
  'bruno|bao': { verb: 'toss', prop: 'kettlebell', owner: 'bao', cam: 'drop', wipe: 'paint', gap: 156,
    lines: { bao: 'Fresh from the oven!', bruno: 'Still warm. Delicious.' } },
  'jolene|dee': { verb: 'dance', cam: 'spin', wipe: 'blinds', gap: 118, alt: 'disco',
    lines: { jolene: 'Five, six, seven, eight!', dee: 'Drop it on the one!' } },
  'jolene|fern': { verb: 'handoff', prop: 'towel', owner: 'jolene', cam: 'rise', wipe: 'iris', gap: 88,
    lines: { jolene: 'Towel, darling? You’re glowing.', fern: 'That’s just photosynthesis.' } },
  'jolene|merlin': { verb: 'zap', prop: 'wand', owner: 'merlin', cam: 'whip', wipe: 'vhs', gap: 130, sfx: '✨ POOF ✨',
    lines: { merlin: 'Begone, leg warmers!', jolene: 'Not the leg warmers!' } },
  'jolene|bao': { verb: 'handoff', prop: 'baguette', owner: 'bao', cam: 'whip', wipe: 'tiles', gap: 92,
    lines: { bao: 'Relay baton. Freshly baked!', jolene: 'Carbs! Go go go!' } },
  'dee|fern': { verb: 'bow', cam: 'zoom', wipe: 'leaves', gap: 112,
    lines: { fern: 'Namaste, Dee.', dee: 'Nama-slay, Fern.' } },
  'dee|merlin': { verb: 'highfive', cam: 'roll', wipe: 'stars', gap: 86, sfx: '⚡SMACK⚡',
    lines: { merlin: 'A high five of power!', dee: 'Ow. Tingly.' } },
  'dee|bao': { verb: 'toss', prop: 'record', owner: 'dee', cam: 'spin', wipe: 'vinyl', gap: 170,
    lines: { dee: 'Spin this in the kitchen!', bao: 'Is it… a giant pancake?' } },
  'fern|merlin': { verb: 'handoff', prop: 'leaf', owner: 'fern', cam: 'drop', wipe: 'iris', gap: 92,
    lines: { fern: 'A leaf, for your potions.', merlin: 'Ah! Essence of… leaf.' } },
  'fern|bao': { verb: 'handoff', prop: 'carrot', owner: 'fern', cam: 'zoom', wipe: 'splat', gap: 90,
    lines: { fern: 'Fresh from the forest floor.', bao: 'Carrot squats it is!' } },
  'merlin|bao': { verb: 'bow', cam: 'rise', wipe: 'curtain', gap: 114,
    lines: { merlin: 'The kitchen awaits, good chef.', bao: 'Wizard, wash your hands.' } },
};
export function pairFor(a, b) {
  return PAIRS[`${a}|${b}`] || PAIRS[`${b}|${a}`] || { verb: 'highfive', cam: 'whip', wipe: 'flash', gap: 86, lines: {} };
}

// What they say on arriving in their own set
export const ARRIVE = {
  pip: 'My turn! Sweatband on.', bruno: 'Hnnngh. Here we go.', jolene: 'Let’s get physical!', dee: 'Turn it up!',
  fern: 'Back to the clearing.', merlin: 'Behold, my tower!', bao: 'Back to the kitchen!',
};

// Taking a breather (same character up next) — a few each, cycled
export const BREATHERS = {
  pip: [{ act: 'handsKnees', line: 'Phew!' }, { act: 'drink', prop: 'bottle', line: 'Glug glug.' }, { act: 'shakeOut', line: 'Shake it off!' }],
  bruno: [{ act: 'wipeBrow', line: 'Hnnf. Sweaty.' }, { act: 'flex', line: 'Admire the gains.' }, { act: 'drink', prop: 'mug', line: 'Coffee is pre-workout.' }],
  jolene: [{ act: 'fan', line: 'Is it hot in here, or is it me?' }, { act: 'hairFluff', line: 'Perm check: still perfect.' }, { act: 'stretchUp', line: 'Reach for the stars, babe!' }],
  dee: [{ act: 'headNod', line: 'This track slaps.' }, { act: 'shakeOut', line: 'Loose and groovy.' }, { act: 'drink', prop: 'bottle', line: 'Hydration remix.' }],
  fern: [{ act: 'deepBreath', line: 'In… and out.' }, { act: 'stretchUp', line: 'The sun says hi.' }, { act: 'handsHips', line: 'The fox is napping. Same.' }],
  merlin: [{ act: 'beardStroke', line: 'Hmm. Most strenuous.' }, { act: 'handsKnees', line: 'Six centuries… still winded.' }, { act: 'stretchUp', prop: 'wand', line: 'A yawn of great power.' }],
  bao: [{ act: 'wipeBrow', prop: 'towel', line: 'Hot kitchen, hotter workout.' }, { act: 'drink', prop: 'spoon', line: 'Needs more salt.' }, { act: 'bellyPat', line: 'Fuel tank: full.' }],
};

// Getting ready, by the kind of move coming up
export const PREP = {
  strength: { act: 'chalk', line: 'Chalk up. Let’s lift!' },
  cardio: { act: 'bounce', line: 'Heart rate: rising!' },
  core: { act: 'twist', line: 'Brace that belly.' },
  mobility: { act: 'deepBreath', line: 'Nice and easy now.' },
  default: { act: 'bounce', line: 'Ready when you are!' },
};
