// SuperSweatClub 3D — little non-exercise "acts" the cast perform between moves:
// handovers (one per pair of characters), breathers and get-ready routines.
// Poses use the same shorthand as js/exercises.js (angles: 0 down, 90 forward, 180 up).
const STAND = { t: 0, ra: [6, 10], la: [-4, 0], rl: [2, 0], ll: [-2, 0] };
const P = (o) => ({ ...STAND, ...o });

const A = (tempo, frames, o = {}) => ({ tempo, ax: 'pelvis', frames, ...o });

export const ACTS = {
  idle: A(3, [P({}), P({ t: 2, n: 4, ra: [8, 14], la: [-2, 4] })]),
  // proper gaits: contact (heel down in front, back toes pushing) → passing (weight on a straight leg,
  // the other knee swinging through) → contact on the other foot → passing. Linear in-betweens:
  // the director drives the phase from distance travelled, so the planted foot stays put.
  walk: A(1.0, [
    P({ t: 3, ra: [-20, -8], la: [22, 40], rl: [22, -2], ll: [-18, -26], rfo: 96, lfo: 64 }),
    P({ t: 4, ra: [2, 12], la: [0, 10], rl: [2, 0], ll: [26, -36], lift: 2, lfo: 80 }),
    P({ t: 3, ra: [22, 40], la: [-20, -8], rl: [-18, -26], ll: [22, -2], rfo: 64, lfo: 96 }),
    P({ t: 4, ra: [0, 10], la: [2, 12], rl: [26, -36], ll: [2, 0], lift: 2, rfo: 80 }),
  ], { ease: 'linear' }),
  run: A(0.62, [
    P({ t: 12, ra: [-40, 30], la: [50, 112], rl: [24, -8], ll: [-26, -78], rfo: 96, lfo: 124 }),
    P({ t: 13, ra: [4, 70], la: [10, 80], rl: [-6, -16], ll: [44, -40], lift: 4 }),
    P({ t: 12, ra: [50, 112], la: [-40, 30], rl: [-26, -78], ll: [24, -8], lfo: 96, rfo: 124 }),
    P({ t: 13, ra: [10, 80], la: [4, 70], rl: [44, -40], ll: [-6, -16], lift: 4 }),
  ], { ease: 'linear' }),
  wave: A(1, [P({ ra: [150, 175], n: 6 }), P({ ra: [150, 215], n: 6 })]),
  highfive: A(1.6, [P({ ra: [20, 40] }), P({ t: -6, ra: [152, 162], rl: [4, 0] }), P({ t: 8, ra: [112, 118], lift: 5 }), P({ t: 4, ra: [60, 80] })], { d: [1, 1.3, 0.5, 1] }),
  fistbump: A(1.6, [P({ ra: [30, 110] }), P({ t: 4, ra: [40, 120] }), P({ t: 10, ra: [90, 90], rl: [22, 0], ll: [-12, -14] }), P({ t: 2, ra: [150, 170], la: [140, 160], lift: 10 })], { d: [1, 1, 0.5, 1.4] }),
  throw: A(1.6, [P({ ra: [40, 70] }), P({ t: -12, ra: [-36, -6], rl: [-6, 0], ll: [10, -10] }), P({ t: 16, ra: [140, 152], rl: [24, -4], ll: [-14, -10] }), P({ t: 6, ra: [70, 80] })], { d: [1, 1, 0.5, 1.5] }),
  catch: A(1.6, [P({ ra: [12, 24], la: [4, 14] }), P({ ra: [104, 118], la: [100, 114] }), P({ t: -10, ra: [104, 118], la: [100, 114], rl: [-8, 0], ll: [16, -20], lift: 0 }), P({ t: 4, ra: [44, 150], la: [40, 146] })], { d: [1, 0.8, 0.5, 1.5] }),
  give: A(1.6, [P({ ra: [30, 60] }), P({ t: 8, ra: [82, 88] }), P({ t: 8, ra: [84, 90] }), P({ ra: [12, 20] })], { d: [1, 1.2, 0.8, 1] }),
  take: A(1.6, [P({ ra: [8, 14] }), P({ t: 6, ra: [80, 86] }), P({ t: 4, ra: [40, 150] }), P({ ra: [44, 150] })], { d: [1.1, 1, 0.8, 1] }),
  bow: A(2, [P({}), P({ t: 58, n: 64, ra: [-8, 30], la: [-12, 26], rl: [-2, 0] }), P({ t: 58, n: 64, ra: [-8, 30], la: [-12, 26], rl: [-2, 0] }), P({ ra: [150, 175] })], { d: [0.6, 1, 0.8, 1] }),
  curtsy: A(2, [P({}), P({ t: 18, n: 30, ra: [-10, 40], la: [-14, 36], rl: [16, -30], ll: [-40, -90], lfo: 124 }), P({ t: 18, n: 30, ra: [-10, 40], la: [-14, 36], rl: [16, -30], ll: [-40, -90], lfo: 124 }), P({})], { d: [0.6, 1, 0.8, 1] }),
  hug: A(2, [P({ ra: [50, 90], la: [46, 86] }), P({ t: 10, n: 14, ra: [88, 150], la: [86, 146] }), P({ t: 10, n: 14, ra: [86, 156], la: [84, 152], lift: 6 }), P({ t: 4, ra: [40, 80], la: [36, 76] })], { d: [0.8, 1, 1.4, 0.8] }),
  dance: A(0.9, [
    P({ t: 6, ra: [162, 172], la: [24, 70], rl: [32, -34], ll: [-6, -10] }),
    P({ t: -4, ra: [24, 70], la: [-30, -10], rl: [-6, -10], ll: [32, -34], lift: 4 }),
  ]),
  disco: A(1.1, [
    P({ t: 4, ra: [160, 172], la: [-10, 30], rl: [20, -20], ll: [-4, -6] }),
    P({ t: 4, ra: [40, 44], la: [-10, 30], rl: [-4, -6], ll: [20, -20], lift: 2 }),
  ]),
  flex: A(1.6, [P({ ra: [92, 175], la: [80, 165] }), P({ t: 4, ra: [96, 150], la: [84, 140], rl: [12, 0], ll: [-12, -12] })]),
  point: A(1.2, [P({ t: 4, ra: [96, 100] }), P({ t: 6, ra: [104, 112], lift: 2 })]),
  zapped: A(0.9, [P({ ra: [150, 160], la: [150, 160], lift: 22, rfo: 40, lfo: 40 }), P({ ra: [20, 30], la: [20, 30], rl: [20, -20], ll: [16, -24] })]),
  cheer: A(1, [
    P({ t: 10, ra: [60, 150], la: [56, 146], rl: [40, -40], ll: [38, -42] }),
    P({ t: -4, ra: [165, 160], la: [195, 200], rl: [6, -20], ll: [-10, -30], rfo: 50, lfo: 50, lift: 30 }),
  ]),
  land: A(1.4, [P({ t: 34, ra: [70, 90], la: [66, 86], rl: [80, -40], ll: [76, -44] }), P({ t: 30, ra: [60, 80], la: [56, 76], rl: [72, -36], ll: [70, -40] }), P({ ra: [150, 175] })], { d: [0.4, 1, 1.4] }),
  talk: A(1.3, [P({ n: 4, ra: [38, 92], la: [-4, 4] }), P({ n: -2, ra: [54, 128], la: [10, 34] }), P({ n: 3, ra: [30, 80], la: [-2, 8] })]),
  tag: A(1.4, [P({ ra: [30, 50] }), P({ t: 10, ra: [96, 100], rl: [18, 0] }), P({ ra: [30, 50] })]),
  // breathers
  handsKnees: A(2.2, [P({ t: 42, n: 30, ra: [62, 56], la: [58, 52], rl: [26, -14], ll: [22, -18] }), P({ t: 47, n: 36, ra: [64, 58], la: [60, 54], rl: [28, -16], ll: [24, -20] })]),
  drink: A(2.4, [P({ ra: [40, 150] }), P({ t: -8, n: -30, ra: [66, 178] }), P({ t: -8, n: -30, ra: [66, 178] }), P({ n: 6, ra: [36, 140] })], { d: [1, 0.8, 1.6, 1] }),
  // (the forearm comes down over the top on purpose)
  wipeBrow: A(2.2, [P({ ra: [110, 214], n: 6 }), P({ ra: [124, 244], n: 10 }), P({ ra: [14, 20] })], { d: [1, 1, 1.2], sweep: true }),
  fan: A(0.45, [P({ ra: [64, 140], n: -12 }), P({ ra: [60, 104], n: -12 })]),
  shakeOut: A(0.36, [P({ ra: [8, 4], la: [-8, -4], lift: 3 }), P({ ra: [-8, -14], la: [8, 12], rl: [8, -8] })]),
  stretchUp: A(3.2, [P({}), P({ t: -6, n: -12, ra: [172, 178], la: [168, 176], rfo: 30, lfo: 30 })]),
  deepBreath: A(5, [P({ ra: [10, 14], la: [6, 10] }), P({ t: -4, n: -10, ra: [170, 176], la: [166, 172] })]),
  handsHips: A(2.4, [P({ ra: [-26, 62], la: [-30, 58] }), P({ t: -3, n: -4, ra: [-24, 64], la: [-28, 60], rl: [6, 0] })]),
  headNod: A(0.5, [P({ n: 14, ra: [20, 60], rl: [10, -10] }), P({ n: -4, ra: [14, 50] })]),
  beardStroke: A(1.8, [P({ ra: [40, 150], n: 8 }), P({ ra: [46, 138], n: 14 })]),
  bellyPat: A(0.6, [P({ ra: [22, 80], la: [18, 76] }), P({ ra: [26, 100], la: [20, 92] })]),
  hairFluff: A(1.4, [P({ ra: [150, 230], n: -6 }), P({ ra: [162, 254], n: -10 })]),
  // more ways to rest (with sideways moves where a body really does them)
  sitFloor: A(3.6, [P({ t: -16, n: -8, ra: [-36, -30], la: [-38, -32], rl: [88, 90], ll: [86, 88] }), P({ t: -12, n: -2, ra: [-34, -28], la: [-36, -30], rl: [86, 88], ll: [84, 86] })]),
  meditate: A(4.4, [P({ t: -2, n: 2, ra: [52, 46], la: [50, 44], rl: [84, -64], ll: [84, -64], rlsw: 46, llsw: 46, rfo: 40, lfo: 40 }), P({ t: -5, n: -4, ra: [54, 48], la: [52, 46], rl: [84, -64], ll: [84, -64], rlsw: 46, llsw: 46, rfo: 40, lfo: 40 })]),
  lieBack: A(4.2, [
    { t: -92, n: -96, ra: [92, 92], la: [92, 92], rab: [128, 128], lab: [128, 128], rl: [92, 92], ll: [92, 92], rlab: 12, llab: 12 },
    { t: -90, n: -94, ra: [92, 92], la: [92, 92], rab: [138, 138], lab: [138, 138], rl: [92, 92], ll: [92, 92], rlab: 14, llab: 14 },
  ]),
  quadStretch: A(2.4, [P({ t: 4, n: 2, ra: [-24, -6], la: [6, 90], lab: [40, 40], rl: [-6, -150], ll: [0, 0], rfo: 120 }), P({ t: 6, n: 4, ra: [-26, -8], la: [8, 96], lab: [46, 46], rl: [-8, -152], ll: [0, 0], rfo: 120 })]),
  sideStretch: A(3, [P({ tw: 10, ra: [4, 4], rab: [168, 176], la: [-4, 0] }), P({ tw: -10, la: [4, 4], lab: [168, 176], ra: [-4, 0] })]),
  neckRoll: A(2.4, [P({ n: 22 }), P({ n: 0, tw: 14 }), P({ n: -18 }), P({ n: 0, tw: -14 })]),
  armSwing: A(1, [P({ ra: [6, 8], la: [6, 8], rab: [52, 56], lab: [52, 56] }), P({ ra: [26, 34], la: [26, 34], rab: [-12, -8], lab: [-12, -8], rl: [6, 0] })]),
  marchSpot: A(1, [P({ ra: [-20, -8], la: [30, 60], rl: [64, -64], ll: [0, 0], rfo: 112 }), P({ ra: [30, 60], la: [-20, -8], rl: [0, 0], ll: [64, -64], lfo: 112 })]),
  lookAround: A(2.6, [P({ tw: 34, n: 4, ra: [-26, 62], la: [-30, 58] }), P({ tw: 0, n: -4, ra: [-26, 62], la: [-30, 58] }), P({ tw: -34, n: 4, ra: [-26, 62], la: [-30, 58] }), P({ tw: 0, n: 0, ra: [-26, 62], la: [-30, 58] })]),
  checkWatch: A(1.8, [P({ n: 26, la: [58, 142], lasw: -24, ra: [30, 90], rasw: -10 }), P({ n: 30, la: [60, 146], lasw: -24, ra: [32, 92], rasw: -10 })]),
  clap: A(0.5, [P({ ra: [72, 84], la: [72, 84], rasw: -26, lasw: -26, lift: 2 }), P({ ra: [70, 80], la: [70, 80], rasw: 12, lasw: 12 })]),
  airGuitar: A(0.7, [P({ t: -8, n: -12, ra: [34, 92], rasw: -20, la: [70, 150], lab: [20, 20], rl: [12, -6] }), P({ t: -6, n: -6, ra: [44, 70], rasw: -20, la: [72, 152], lab: [20, 20], rl: [12, -6] })]),
  squatRest: A(2.8, [P({ t: 32, n: 22, ra: [70, 64], la: [68, 62], rl: [96, -42], ll: [96, -42], rlsw: 16, llsw: 16 }), P({ t: 34, n: 26, ra: [72, 66], la: [70, 64], rl: [96, -42], ll: [96, -42], rlsw: 16, llsw: 16 })]),
  hulaHips: A(1.1, [P({ tw: 22, t: 3, ra: [-26, 62], la: [-30, 58], rl: [6, 0], ll: [-2, 0] }), P({ tw: -22, t: -3, ra: [-26, 62], la: [-30, 58], rl: [-2, 0], ll: [6, 0] })]),
  thinker: A(2.6, [P({ n: 10, ra: [24, 162], rasw: -14, la: [30, 92], lasw: -20 }), P({ n: 14, ra: [26, 166], rasw: -14, la: [30, 92], lasw: -20, tw: 6 })]),
  shadowJab: A(0.6, [P({ t: 6, ra: [92, 92], la: [40, 150], rl: [16, 6], ll: [-16, -6] }), P({ t: 6, ra: [40, 150], la: [92, 92], rl: [16, 6], ll: [-16, -6], lift: 2 })]),
  stir: A(1.2, [P({ t: 10, n: 22, ra: [44, 64], rasw: 20, la: [30, 80] }), P({ t: 10, n: 22, ra: [52, 72], rasw: 0, la: [30, 80] }), P({ t: 10, n: 22, ra: [44, 64], rasw: -20, la: [30, 80] }), P({ t: 10, n: 22, ra: [36, 56], rasw: 0, la: [30, 80] })]),
  flip: A(1.6, [P({ ra: [52, 80] }), P({ t: 4, ra: [60, 84], rl: [8, -6], ll: [8, -6] }), P({ t: -4, n: -20, ra: [92, 150], lift: 3 }), P({ ra: [56, 82] })], { d: [1, 0.4, 0.5, 1] }),
  scratch: A(0.8, [P({ n: 14, ra: [64, 74], rasw: 22, la: [26, 168], lab: [30, 30] }), P({ n: 6, ra: [64, 74], rasw: -16, la: [26, 168], lab: [30, 30] })]),
  readBook: A(3.4, [P({ n: 26, ra: [40, 104], la: [40, 104], rasw: -16, lasw: -16 }), P({ n: 30, ra: [42, 108], la: [40, 104], rasw: -16, lasw: -16 })]),
  conduct: A(1.8, [P({ t: -4, ra: [96, 150], la: [30, 70] }), P({ ra: [128, 124], rasw: -20, la: [34, 74] }), P({ t: -2, ra: [72, 132], rasw: 18, la: [30, 70] }), P({ ra: [116, 140], la: [34, 74] })]),
  treePose: A(3, [P({ ra: [172, 178], la: [172, 178], rasw: -10, lasw: -10, rl: [52, -70], rlsw: 50, rlab: 8, ll: [0, 0], rfo: 70, rto: 20 }), P({ t: 2, ra: [174, 180], la: [174, 180], rasw: -10, lasw: -10, rl: [54, -72], rlsw: 52, rlab: 8, ll: [0, 0], rfo: 70, rto: 20 })]),
  leanOn: A(3, [P({ t: 18, n: 6, ra: [96, 96], la: [-8, 0], rl: [-14, -16], ll: [10, -14] }), P({ t: 20, n: 10, ra: [98, 98], la: [-8, 0], rl: [-14, -16], ll: [12, -16] })]),
  crouchPeek: A(2, [P({ t: 40, n: 22, ra: [80, 78], la: [60, 56], rl: [96, -42], ll: [92, -42] }), P({ t: 42, n: 30, ra: [96, 94], la: [60, 56], rl: [96, -42], ll: [92, -42] })]),
  warmHands: A(0.8, [P({ t: 10, n: 14, ra: [70, 98], la: [70, 98], rasw: -16, lasw: -16 }), P({ t: 10, n: 14, ra: [72, 104], la: [68, 96], rasw: -10, lasw: -22 })]),
  eatApple: A(2, [P({ ra: [44, 168], rasw: -16, n: -4 }), P({ ra: [40, 120], rasw: -10, n: 4 }), P({ ra: [40, 120], rasw: -10, n: 0 })], { d: [0.6, 0.4, 1] }),
  selfie: A(2.2, [P({ tw: 12, n: -8, ra: [126, 140], rab: [20, 20], la: [-26, 62], rl: [4, 0], ll: [-8, -12] }), P({ tw: 16, n: -12, ra: [130, 144], rab: [22, 22], la: [-26, 62], rl: [4, 0], ll: [-8, -12] })]),
  nap: A(3.6, [P({ t: 4, n: 34, ra: [2, 4], la: [-2, 0] }), P({ t: 6, n: 40, ra: [4, 6], la: [0, 2], lift: 0 })]),
  // getting ready
  chalk: A(2.2, [P({ t: 4, ra: [62, 92], la: [58, 88] }), P({ t: 8, ra: [52, 80], la: [56, 84] }), P({ t: 18, ra: [-10, -6], la: [-6, 0], rl: [32, -30], ll: [28, -34] })], { d: [0.6, 0.6, 1.4] }),
  bounce: A(0.5, [P({ ra: [40, 100], la: [36, 96], rfo: 30, lfo: 30, lift: 4 }), P({ ra: [44, 104], la: [40, 100], rl: [8, -8], ll: [6, -10] })]),
  twist: A(1.4, [P({ t: 6, ra: [90, 92], la: [88, 90] }), P({ t: -4, ra: [70, 140], la: [110, 112] }), P({ t: 6, ra: [92, 94], la: [86, 88] }), P({ t: 4, ra: [110, 112], la: [70, 140] })]),
};

export const actEx = (name) => ({ id: 'act:' + name, name, cat: 'default', anim: ACTS[name] || ACTS.idle });

/* ---------- handovers: four per pair of characters, taken in turn ----------
   verb: what they do together (toss, handoff, highfive, fistbump, bow, hug, dance, flexoff, zap,
   cheer, chat) · prop (owned by `owner`) · cam: camera move into the cut · wipe: transition overlay
   lines: what each says (owner / first speaker first). */
const V = (verb, cam, wipe, gap, lines, o = {}) => ({ verb, cam, wipe, gap, lines, ...o });
export const PAIRS = {
  'pip|bruno': [
    V('toss', 'whip', 'flash', 160, { bruno: 'Think fast, little buddy!', pip: 'Oof! Is this… made of lead?' }, { prop: 'dumbbell', owner: 'bruno' }),
    V('highfive', 'spin', 'flash', 86, { bruno: 'Gentle high five. Gentle!', pip: 'My hand is… flat now.' }, { sfx: 'SLAP!' }),
    V('handoff', 'rise', 'paint', 90, { bruno: 'Coffee. Is pre-workout.', pip: 'I’m already vibrating!' }, { prop: 'mug', owner: 'bruno' }),
    V('chat', 'zoom', 'iris', 100, { pip: 'How are you SO strong?', bruno: 'Potatoes. Many potatoes.' }),
  ],
  'pip|jolene': [
    V('highfive', 'spin', 'vhs', 86, { jolene: 'Up top, sweatband!', pip: 'Totally tubular!' }, { sfx: 'SLAP!' }),
    V('dance', 'roll', 'blinds', 118, { jolene: 'Grapevine left, sweetie!', pip: 'Which one is left?!' }, { alt: 'disco' }),
    V('handoff', 'whip', 'vhs', 88, { jolene: 'Dab, don’t wipe, darling.', pip: 'Dab dab dab!' }, { prop: 'towel', owner: 'jolene' }),
    V('cheer', 'drop', 'flash', 100, { jolene: 'Who’s got the energy?', pip: 'WE’VE got the energy!' }, { sfx: 'WOO!' }),
  ],
  'pip|dee': [
    V('dance', 'roll', 'vinyl', 120, { dee: 'Dance-off. Now.', pip: 'I only know the robot!' }),
    V('fistbump', 'spin', 'flash', 82, { dee: 'Pound it, little homie.', pip: 'Pounded!' }, { sfx: 'BUMP!' }),
    V('toss', 'whip', 'vinyl', 160, { dee: 'Catch the beat!', pip: 'Got it! It’s… round.' }, { prop: 'record', owner: 'dee' }),
    V('chat', 'zoom', 'blinds', 100, { pip: 'Can you play something fast?', dee: 'Already queued, little legs.' }),
  ],
  'pip|fern': [
    V('handoff', 'rise', 'leaves', 88, { pip: 'Hydrate, friend!', fern: 'The fox will want some too.' }, { prop: 'bottle', owner: 'pip' }),
    V('hug', 'zoom', 'iris', 56, { fern: 'Hug it out, Pip.', pip: 'You smell like pine!' }),
    V('bow', 'rise', 'leaves', 112, { fern: 'Bow to the trees.', pip: 'Hi, trees!' }),
    V('handoff', 'drop', 'leaves', 88, { fern: 'A lucky leaf for you.', pip: 'It’s crunchy luck!' }, { prop: 'leaf', owner: 'fern' }),
  ],
  'pip|merlin': [
    V('zap', 'zoom', 'stars', 130, { merlin: 'Abracad-abs!', pip: 'Whoa — I feel… spinny.' }, { prop: 'wand', owner: 'merlin', sfx: '✨ ZAP ✨' }),
    V('handoff', 'rise', 'stars', 90, { merlin: 'Hold this. Touch nothing.', pip: 'I touched… something.' }, { prop: 'wand', owner: 'merlin' }),
    V('bow', 'whip', 'curtain', 114, { merlin: 'Young apprentice.', pip: 'Master Merlin!' }),
    V('highfive', 'roll', 'stars', 86, { merlin: 'Up high, small one!', pip: 'My hair is standing up!' }, { sfx: '⚡SMACK⚡' }),
  ],
  'pip|bao': [
    V('handoff', 'drop', 'tiles', 90, { bao: 'Taste this. Protein soup!', pip: 'Mmm… sweaty!' }, { prop: 'spoon', owner: 'bao' }),
    V('toss', 'whip', 'splat', 150, { bao: 'Catch! Vitamin A!', pip: 'I can see in the dark!' }, { prop: 'carrot', owner: 'bao' }),
    V('highfive', 'spin', 'tiles', 86, { bao: 'High five, sous-chef!', pip: 'Yes, chef!' }, { sfx: 'SLAP!' }),
    V('chat', 'zoom', 'paint', 100, { pip: 'What’s for dinner?', bao: 'Lunges. Then dinner.' }),
  ],
  'bruno|jolene': [
    V('bow', 'whip', 'curtain', 116, { bruno: 'M’lady. The floor is yours.', jolene: 'Oh, you big bean!' }),
    V('dance', 'roll', 'blinds', 120, { jolene: 'Shake those taters, Bruno!', bruno: 'They do not shake. They wobble.' }, { alt: 'disco' }),
    V('handoff', 'rise', 'iris', 88, { jolene: 'You’re dripping, hon.', bruno: 'Is mostly gravy.' }, { prop: 'towel', owner: 'jolene' }),
    V('flexoff', 'whip', 'vhs', 124, { bruno: 'Feel this bicep.', jolene: 'Feel these leg warmers!' }),
  ],
  'bruno|dee': [
    V('fistbump', 'spin', 'flash', 82, { dee: 'Respect the moustache.', bruno: 'Respect the shades.' }, { sfx: 'BUMP!' }),
    V('toss', 'whip', 'vinyl', 165, { dee: 'Spin it, big guy!', bruno: 'I will lift it instead.' }, { prop: 'record', owner: 'dee' }),
    V('dance', 'spin', 'blinds', 120, { dee: 'Show me the potato wobble.', bruno: 'It is called… the Mash.' }),
    V('chat', 'zoom', 'flash', 100, { bruno: 'Music. Louder. For gains.', dee: 'Bass boosted, just for you.' }),
  ],
  'bruno|fern': [
    V('hug', 'zoom', 'iris', 56, { fern: 'Bring it in, Bruno.', bruno: 'Gentle. I am very squishy.' }),
    V('handoff', 'drop', 'leaves', 90, { fern: 'From my garden.', bruno: 'A cousin. I respect him.' }, { prop: 'carrot', owner: 'fern' }),
    V('bow', 'rise', 'iris', 114, { fern: 'Strong roots, Bruno.', bruno: 'Very strong. Very rooty.' }),
    V('chat', 'zoom', 'leaves', 100, { bruno: 'Is the fox looking at me?', fern: 'He thinks you’re a boulder.' }),
  ],
  'bruno|merlin': [
    V('flexoff', 'roll', 'splat', 124, { bruno: 'Behold: the gun show.', merlin: 'Mine are enchanted.' }),
    V('zap', 'zoom', 'stars', 130, { merlin: 'Become… a mightier potato!', bruno: 'Hnnngh! I feel… crispy.' }, { prop: 'wand', owner: 'merlin', sfx: '✨ ZAP ✨' }),
    V('fistbump', 'spin', 'flash', 82, { merlin: 'A bump of fellowship.', bruno: 'Fellowship. Of the gains.' }, { sfx: 'BUMP!' }),
    V('handoff', 'rise', 'curtain', 90, { merlin: 'A potion of vigour.', bruno: 'Tastes like coffee.' }, { prop: 'mug', owner: 'merlin' }),
  ],
  'bruno|bao': [
    V('toss', 'drop', 'paint', 156, { bao: 'Fresh from the oven!', bruno: 'Still warm. Delicious.' }, { prop: 'kettlebell', owner: 'bao' }),
    V('handoff', 'rise', 'tiles', 90, { bao: 'Taste! Too much salt?', bruno: 'Never too much salt.' }, { prop: 'spoon', owner: 'bao' }),
    V('hug', 'zoom', 'iris', 60, { bao: 'My favourite ingredient!', bruno: 'Please do not cook me.' }),
    V('flexoff', 'whip', 'splat', 124, { bao: 'Kneading dough builds arms!', bruno: 'Lifting dough builds mine.' }),
  ],
  'jolene|dee': [
    V('dance', 'spin', 'blinds', 118, { jolene: 'Five, six, seven, eight!', dee: 'Drop it on the one!' }, { alt: 'disco' }),
    V('highfive', 'roll', 'vhs', 86, { jolene: 'Gimme five, DJ!', dee: 'Five on the beat!' }, { sfx: 'SLAP!' }),
    V('toss', 'whip', 'vinyl', 160, { dee: 'Your theme song, Jo.', jolene: 'It’s all synths. I LOVE it.' }, { prop: 'record', owner: 'dee' }),
    V('cheer', 'spin', 'blinds', 110, { dee: 'Make some noise!', jolene: 'WOOOO!' }, { sfx: 'WOO!' }),
  ],
  'jolene|fern': [
    V('handoff', 'rise', 'iris', 88, { jolene: 'Towel, darling? You’re glowing.', fern: 'That’s just photosynthesis.' }, { prop: 'towel', owner: 'jolene' }),
    V('hug', 'zoom', 'iris', 56, { jolene: 'Hug, darling!', fern: 'Now I’m covered in glitter.' }),
    V('dance', 'roll', 'leaves', 118, { jolene: 'Jazzercise in the forest!', fern: 'The squirrels approve.' }, { alt: 'disco' }),
    V('chat', 'rise', 'leaves', 100, { fern: 'Ever tried a calm stretch?', jolene: 'Calm? Never heard of her.' }),
  ],
  'jolene|merlin': [
    V('zap', 'whip', 'vhs', 130, { merlin: 'Begone, leg warmers!', jolene: 'Not the leg warmers!' }, { prop: 'wand', owner: 'merlin', sfx: '✨ POOF ✨' }),
    V('bow', 'rise', 'curtain', 114, { merlin: 'My lady of the leotard.', jolene: 'Charmed, I’m sure!' }),
    V('highfive', 'spin', 'stars', 86, { jolene: 'High five, Gandalf!', merlin: 'It’s Merlin. But yes.' }, { sfx: '⚡SMACK⚡' }),
    V('handoff', 'whip', 'vhs', 88, { jolene: 'Your beard is sweaty, babe.', merlin: 'That is magical sweat.' }, { prop: 'towel', owner: 'jolene' }),
  ],
  'jolene|bao': [
    V('handoff', 'whip', 'tiles', 92, { bao: 'Relay baton. Freshly baked!', jolene: 'Carbs! Go go go!' }, { prop: 'baguette', owner: 'bao' }),
    V('dance', 'roll', 'tiles', 118, { jolene: 'Kitchen disco!', bao: 'Mind the hot pans!' }),
    V('handoff', 'drop', 'paint', 90, { bao: 'Taste my protein sauce.', jolene: 'Ooh, zesty!' }, { prop: 'spoon', owner: 'bao' }),
    V('cheer', 'spin', 'flash', 110, { jolene: 'Who’s cooking up a sweat?', bao: 'Order up: one sweat!' }, { sfx: 'WOO!' }),
  ],
  'dee|fern': [
    V('bow', 'zoom', 'leaves', 112, { fern: 'Namaste, Dee.', dee: 'Nama-slay, Fern.' }),
    V('handoff', 'rise', 'leaves', 88, { fern: 'A leaf for your decks.', dee: 'Organic vinyl. Love it.' }, { prop: 'leaf', owner: 'fern' }),
    V('dance', 'roll', 'vinyl', 118, { dee: 'Forest rave, let’s go!', fern: 'Slowly. Like a tree.' }, { alt: 'disco' }),
    V('chat', 'zoom', 'iris', 100, { dee: 'You hear that birdsong?', fern: 'That’s your bassline, Dee.' }),
  ],
  'dee|merlin': [
    V('highfive', 'roll', 'stars', 86, { merlin: 'A high five of power!', dee: 'Ow. Tingly.' }, { sfx: '⚡SMACK⚡' }),
    V('zap', 'zoom', 'stars', 130, { merlin: 'Let there be… disco!', dee: 'Whoa. Sparkly.' }, { prop: 'wand', owner: 'merlin', sfx: '✨ POOF ✨' }),
    V('dance', 'spin', 'vinyl', 120, { dee: 'Show me your moves, wiz.', merlin: 'Behold: the Moonwalk of Avalon.' }, { alt: 'disco' }),
    V('toss', 'whip', 'flash', 160, { dee: 'Enchant this record!', merlin: 'It now plays… in Latin.' }, { prop: 'record', owner: 'dee' }),
  ],
  'dee|bao': [
    V('toss', 'spin', 'vinyl', 170, { dee: 'Spin this in the kitchen!', bao: 'Is it… a giant pancake?' }, { prop: 'record', owner: 'dee' }),
    V('highfive', 'roll', 'tiles', 86, { dee: 'Five, chef!', bao: 'Five spice!' }, { sfx: 'SLAP!' }),
    V('dance', 'spin', 'vinyl', 118, { dee: 'Cook to the beat!', bao: 'Chop-chop, chop-chop!' }),
    V('handoff', 'drop', 'paint', 90, { bao: 'Taste the remix.', dee: 'Needs more bass. And salt.' }, { prop: 'spoon', owner: 'bao' }),
  ],
  'fern|merlin': [
    V('handoff', 'drop', 'iris', 92, { fern: 'A leaf, for your potions.', merlin: 'Ah! Essence of… leaf.' }, { prop: 'leaf', owner: 'fern' }),
    V('bow', 'rise', 'iris', 112, { fern: 'Old friend.', merlin: 'Older than these trees.' }),
    V('zap', 'zoom', 'leaves', 130, { merlin: 'Grow, little sprout!', fern: 'I feel… leafy.' }, { prop: 'wand', owner: 'merlin', sfx: '✨ BLOOM ✨' }),
    V('chat', 'drop', 'stars', 100, { merlin: 'The stars say: squats.', fern: 'The trees say: stretch.' }),
  ],
  'fern|bao': [
    V('handoff', 'zoom', 'splat', 90, { fern: 'Fresh from the forest floor.', bao: 'Carrot squats it is!' }, { prop: 'carrot', owner: 'fern' }),
    V('hug', 'zoom', 'iris', 56, { fern: 'Thanks for the soup.', bao: 'Thanks for the carrots!' }),
    V('toss', 'whip', 'leaves', 150, { fern: 'Catch, chef!', bao: 'Straight into the soup!' }, { prop: 'carrot', owner: 'fern' }),
    V('handoff', 'rise', 'tiles', 90, { bao: 'Forest stew. Taste!', fern: 'Tastes like… home.' }, { prop: 'spoon', owner: 'bao' }),
  ],
  'merlin|bao': [
    V('bow', 'rise', 'curtain', 114, { merlin: 'The kitchen awaits, good chef.', bao: 'Wizard, wash your hands.' }),
    V('handoff', 'drop', 'tiles', 90, { bao: 'Stir my cauldron?', merlin: 'At last, a proper potion.' }, { prop: 'spoon', owner: 'bao' }),
    V('zap', 'zoom', 'stars', 130, { merlin: 'Self-washing dishes!', bao: 'Finally, real magic!' }, { prop: 'wand', owner: 'merlin', sfx: '✨ ZAP ✨' }),
    V('highfive', 'spin', 'flash', 86, { bao: 'Up high, wizard!', merlin: 'Ow. My centuries.' }, { sfx: 'SLAP!' }),
  ],
};
const FALLBACK = V('highfive', 'whip', 'flash', 86, {});

// each pair takes its handovers in turn (remembered between workouts), so they rarely repeat
export function pairFor(a, b, variant = null) {
  const key = PAIRS[`${a}|${b}`] ? `${a}|${b}` : `${b}|${a}`;
  const list = PAIRS[key];
  if (!list) return FALLBACK;
  let n = variant;
  if (n == null) {
    let seen = {};
    try { seen = JSON.parse(localStorage.getItem('pulse:handovers') || '{}'); } catch { /* ignore */ }
    n = seen[key] ?? Math.floor(Math.random() * list.length);
    seen[key] = (n + 1) % list.length;
    try { localStorage.setItem('pulse:handovers', JSON.stringify(seen)); } catch { /* ignore */ }
  }
  return list[((n % list.length) + list.length) % list.length];
}

// What they say on arriving in their own set
export const ARRIVE = {
  pip: 'My turn! Sweatband on.', bruno: 'Hnnngh. Here we go.', jolene: 'Let’s get physical!', dee: 'Turn it up!',
  fern: 'Back to the clearing.', merlin: 'Behold, my tower!', bao: 'Back to the kitchen!',
};

// Resting / waiting (same character up next, or before the workout starts): a dozen-plus each,
// taken in turn so they rarely repeat. dur: seconds it wants · prop: what's in hand
// · spot: walk over to part of the set ([side, how far past the actor's own space]) and back
// · face: 'spot' to face that thing (else they turn to the camera)
const B = (act, line, dur, o = {}) => ({ act, line, dur, ...o });
export const BREATHERS = {
  pip: [
    B('handsKnees', 'Phew!', 3), B('drink', 'Glug glug.', 3.5, { prop: 'bottle' }), B('shakeOut', 'Shake it off!', 2.5),
    B('marchSpot', 'Keep the legs moving!', 3), B('quadStretch', 'Quad stretch. Wobble wobble.', 4), B('sideStretch', 'Reach for the ceiling!', 4),
    B('crouchPeek', 'Hi, doggo!', 6.5, { spot: [-1, 10], face: 'spot' }), B('clap', 'Woo! Go me!', 2.5), B('lookAround', 'Is it… over already?', 3),
    B('shadowJab', 'Hyah! Hyah!', 3), B('sitFloor', 'Just… sitting a sec.', 6), B('selfie', 'Post-workout glow!', 3.5, { prop: 'phone' }),
    B('neckRoll', 'Neck rolls. Crunchy.', 3.5), B('stretchUp', 'Taller! Taller!', 3),
  ],
  bruno: [
    B('wipeBrow', 'Hnnf. Sweaty.', 3), B('flex', 'Admire the gains.', 3), B('drink', 'Coffee is pre-workout.', 3.5, { prop: 'mug' }),
    B('crouchPeek', 'Counting my blocks. Still six.', 6.5, { spot: [-1, 70], face: 'spot' }), B('squatRest', 'Potato squat. Resting.', 4), B('bellyPat', 'Fuel tank: full.', 2.5),
    B('thinker', 'Thinking about… lifting.', 4), B('eatApple', 'Snack. For strength.', 4, { prop: 'apple' }), B('armSwing', 'Swing. Swing.', 2.5),
    B('nap', 'Zzz… potato nap.', 5), B('sitFloor', 'Sit like a sack.', 6), B('lookAround', 'Who moved my mug?', 3), B('clap', 'Clap. For me.', 2.5),
  ],
  jolene: [
    B('fan', 'Is it hot in here, or is it me?', 3), B('hairFluff', 'Perm check: still perfect.', 3), B('stretchUp', 'Reach for the stars, babe!', 3.5),
    B('hulaHips', 'Hips don’t lie, darling.', 3.5), B('marchSpot', 'March it out!', 3), B('quadStretch', 'Quad stretch, very chic.', 4),
    B('sideStretch', 'And… side bend, two, three!', 4), B('airGuitar', 'Synth solo!', 3.5), B('drink', 'Hydrate, darling!', 3.5, { prop: 'bottle' }),
    B('crouchPeek', 'Naughty sneakers! Stay!', 6.5, { spot: [1, 20], face: 'spot' }), B('selfie', 'Leotard selfie!', 3.5, { prop: 'phone' }),
    B('clap', 'Give yourself a hand!', 2.5), B('lieBack', 'Starfish moment.', 6), B('wipeBrow', 'Glistening, not sweating.', 3, { prop: 'towel' }),
  ],
  dee: [
    B('headNod', 'This track slaps.', 3), B('shakeOut', 'Loose and groovy.', 2.5), B('drink', 'Hydration remix.', 3.5, { prop: 'bottle' }),
    B('scratch', 'Wikka-wikka.', 3.5, { prop: 'record' }), B('airGuitar', 'Air guitar solo!', 3.5), B('disco', 'Floor’s still hot.', 3.5),
    B('lookAround', 'Where’s my crowd?', 3), B('headNod', 'Right by the speaker. Feel that bass!', 6.5, { spot: [1, 60] }), B('hulaHips', 'Smooth hips.', 3),
    B('clap', 'Clap on two and four!', 2.5), B('sitFloor', 'Chill-out room.', 6), B('selfie', 'Shades selfie.', 3.5, { prop: 'phone' }),
    B('neckRoll', 'Neck rolls to the beat.', 3.5), B('checkWatch', 'BPM check.', 2.5),
  ],
  fern: [
    B('deepBreath', 'In… and out.', 5), B('stretchUp', 'The sun says hi.', 3.5), B('handsHips', 'The fox is napping. Same.', 3),
    B('treePose', 'Tree pose. Obviously.', 5), B('meditate', 'Om… nom.', 6), B('crouchPeek', 'Hello, little mushrooms.', 6.5, { spot: [1, 25], face: 'spot' }),
    B('eatApple', 'Forest snack.', 4, { prop: 'apple' }), B('sideStretch', 'Sway like a willow.', 4), B('lieBack', 'Cloud watching.', 6),
    B('neckRoll', 'Gentle neck rolls.', 3.5), B('quadStretch', 'Balance like a heron.', 4), B('lookAround', 'Was that a bird?', 3),
    B('drink', 'Spring water.', 3.5, { prop: 'bottle' }),
  ],
  merlin: [
    B('beardStroke', 'Hmm. Most strenuous.', 3.5), B('handsKnees', 'Six centuries… still winded.', 3), B('stretchUp', 'A yawn of great power.', 3.5, { prop: 'wand' }),
    B('readBook', 'Chapter nine: burpees.', 5, { prop: 'book' }), B('conduct', 'Bibbidi… squatty… boo.', 4, { prop: 'wand' }),
    B('warmHands', 'The crystal ball says… rest.', 6.5, { spot: [-1, 45], face: 'spot' }), B('thinker', 'I foresee… more squats.', 4),
    B('nap', 'Zzz… wizard nap.', 5), B('sitFloor', 'My knees are ancient.', 6), B('crouchPeek', 'Hello, Gerald.', 6.5, { spot: [1, 40], face: 'spot' }),
    B('armSwing', 'Limbering the robes.', 2.5), B('drink', 'Potion break.', 3.5, { prop: 'mug' }), B('lookAround', 'Who keeps lighting candles?', 3),
  ],
  bao: [
    B('wipeBrow', 'Hot kitchen, hotter workout.', 3, { prop: 'towel' }), B('drink', 'Needs more salt.', 3, { prop: 'spoon' }), B('bellyPat', 'Fuel tank: full.', 2.5),
    B('stir', 'Stir, stir, stir.', 4, { prop: 'spoon' }), B('flip', 'Pancake flip!', 3.5, { prop: 'pan' }), B('eatApple', 'Chef’s snack.', 4, { prop: 'apple' }),
    B('crouchPeek', 'Kitty! Not on the counter.', 6.5, { spot: [1, 50], face: 'spot' }), B('checkWatch', 'Timer’s still on.', 2.5),
    B('squatRest', 'Squatting by the oven.', 4), B('thinker', 'Garlic? More garlic.', 4), B('clap', 'Service!', 2.5),
    B('marchSpot', 'Kitchen shuffle.', 3), B('sitFloor', 'Five-second sit.', 6),
  ],
};

// Saying hello before the workout starts
export const HELLO = {
  pip: 'Ooh, a workout! Let me warm up.', bruno: 'Hnnngh. I am awake.', jolene: 'Leotard: on. Let’s go, babe!', dee: 'Soundcheck… one, two.',
  fern: 'Good morning, forest.', merlin: 'Ah. A new quest.', bao: 'Aprons on!',
};

// Getting ready, by the kind of move coming up
// (a few each, picked at random)
export const PREP = {
  strength: [{ act: 'chalk', line: 'Chalk up. Let’s lift!' }, { act: 'flex', line: 'Muscles: activated.' }, { act: 'shakeOut', line: 'Loose arms, strong lift.' }, { act: 'armSwing', line: 'Swing the arms, wake the back.' }],
  cardio: [{ act: 'bounce', line: 'Heart rate: rising!' }, { act: 'marchSpot', line: 'Knees up, here we go!' }, { act: 'shadowJab', line: 'Feeling speedy!' }, { act: 'clap', line: 'Clap it up, let’s move!' }],
  core: [{ act: 'twist', line: 'Brace that belly.' }, { act: 'hulaHips', line: 'Waking up the core.' }, { act: 'bounce', line: 'Abs, assemble!' }, { act: 'sideStretch', line: 'Long and tall first.' }],
  mobility: [{ act: 'deepBreath', line: 'Nice and easy now.' }, { act: 'neckRoll', line: 'Loosen up first.' }, { act: 'sideStretch', line: 'A little stretch to start.' }, { act: 'stretchUp', line: 'Reach up, slow down.' }],
  default: [{ act: 'bounce', line: 'Ready when you are!' }, { act: 'clap', line: 'Let’s do this!' }, { act: 'shakeOut', line: 'Shake out the nerves.' }],
};
export const prepFor = (cat, seed = Math.random()) => { const l = PREP[cat] || PREP.default; return l[Math.floor(seed * l.length) % l.length]; };
