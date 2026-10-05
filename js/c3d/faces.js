// Huff n Puff 3D — facial expressions.
// An expression is a handful of numbers the clay face is posed with (see Character.applyFace).
// Each character has a personality: their own version of "working", "straining", "happy"…
// and every rest / handover act asks for a mood, which the personality turns into a face.

const BASE = {
  open: 1, // eye openness (0 shut … 1.3 wide)
  happy: 0, // ^ ^ eyes
  shut: 0, // relaxed closed ‿ ‿ eyes
  wink: 0, // one eye ^ while the other stays open
  lookX: 0, lookY: 0, // pupils: sideways / up
  cross: 0, // pupils toward each other (dizzy)
  browY: 0, // raise (+) / lower (−)
  browTilt: 0, // − angry (inner ends down) … + worried (inner ends up)
  browAsym: 0, // one brow up, the other down
  smile: 0.4, // −1 frown … 1 big smile
  smirk: 0, // lift one corner of the mouth
  mouth: 0, // how open (0 closed … 1 wide open)
  mouthW: 1, // mouth width (0.5 "o" … 1.4 wide grin)
  teeth: 0, tongue: 0,
  blush: 0.3, puff: 0, // cheeks
  pant: 0, // mouth works in and out for breath
};

const E = (o) => ({ ...BASE, ...o });
export const EXPR = {
  neutral: E({}),
  happy: E({ smile: 1, blush: 0.6, browY: 0.3 }),
  grin: E({ smile: 1, mouth: 0.42, mouthW: 1.25, teeth: 1, blush: 0.6, browY: 0.4 }),
  laugh: E({ happy: 1, smile: 1, mouth: 0.8, mouthW: 1.2, teeth: 0.6, tongue: 0.5, blush: 0.9, browY: 0.7 }),
  content: E({ happy: 1, smile: 0.9, blush: 0.6, browY: 0.2 }),
  calm: E({ shut: 1, smile: 0.55, browY: 0.1 }),
  sleepy: E({ shut: 1, smile: 0, mouth: 0.22, mouthW: 0.55, browY: -0.3, blush: 0.1 }),
  determined: E({ open: 0.82, browTilt: -0.7, browY: -0.35, smile: 0.1 }),
  focused: E({ open: 0.75, browTilt: -0.35, smile: 0.15, lookY: -0.2 }),
  strain: E({ open: 0.42, browTilt: -1, browY: -0.55, smile: -0.2, mouth: 0.5, mouthW: 1.3, teeth: 1, blush: 0.7 }),
  strainTongue: E({ open: 0.45, browTilt: -0.8, browY: -0.4, smile: 0, mouth: 0.72, mouthW: 1.05, tongue: 1, blush: 0.8 }),
  puffed: E({ open: 0.5, browTilt: -0.6, browY: -0.3, smile: 0, mouthW: 0.55, puff: 1, blush: 1 }),
  grimaceSmile: E({ open: 0.65, browTilt: 0.45, smile: 1, mouth: 0.38, mouthW: 1.4, teeth: 1, blush: 0.8 }),
  coolStrain: E({ open: 0.5, browTilt: -0.5, smile: 0.2, smirk: 0.7, browAsym: 0.4, teeth: 0.6, mouth: 0.18, mouthW: 1.2 }),
  exhausted: E({ open: 0.55, browTilt: 0.7, browY: -0.1, smile: -0.2, mouth: 0.5, tongue: 0.5, lookY: -0.35, blush: 0.8 }),
  pant: E({ open: 0.6, browTilt: 0.6, smile: -0.1, mouth: 0.45, tongue: 0.4, blush: 0.9, pant: 1 }),
  surprised: E({ open: 1.35, browY: 1, smile: 0, mouth: 0.6, mouthW: 0.6 }),
  wink: E({ wink: 1, browAsym: 0.8, smile: 1, smirk: 0.5, blush: 0.7 }),
  smirk: E({ open: 0.85, smile: 0.6, smirk: 0.9, browAsym: 0.6 }),
  smug: E({ open: 0.58, smile: 0.7, smirk: 0.6, browY: 0.25 }),
  cool: E({ open: 0.55, smile: 0.5, smirk: 0.5, browAsym: 0.3 }),
  worried: E({ open: 1.1, browTilt: 1, browY: 0.3, smile: -0.5, lookX: 0.4 }),
  grumpy: E({ open: 0.78, browTilt: -0.8, browY: -0.45, smile: -0.6 }),
  curious: E({ open: 1.15, browAsym: 0.8, smile: 0.25, lookX: 0.6, lookY: 0.2 }),
  proud: E({ open: 0.7, smile: 0.9, browY: 0.35, lookY: 0.3, blush: 0.5 }),
  dizzy: E({ open: 1.3, cross: 1, browTilt: 0.6, browY: 0.6, smile: -0.1, mouth: 0.42, mouthW: 0.8, tongue: 0.8 }),
  pout: E({ wink: 1, smile: 0, mouth: 0.24, mouthW: 0.42, browAsym: 0.5, blush: 0.9 }),
};

// personalities: which face each character pulls for a mood (anything missing → the mood itself)
export const PERSONA = {
  pip: { work: 'determined', strain: 'strainTongue', tired: 'exhausted', happy: 'grin', proud: 'grin', cool: 'grin' },
  bruno: { work: 'focused', strain: 'strain', tired: 'exhausted', happy: 'smug', grin: 'smug', laugh: 'happy', cool: 'smug', wink: 'smug' },
  jolene: { work: 'grin', strain: 'grimaceSmile', tired: 'pant', happy: 'grin', proud: 'wink', smirk: 'wink', content: 'wink', cool: 'pout' },
  dee: { work: 'cool', strain: 'coolStrain', tired: 'exhausted', happy: 'cool', grin: 'smirk', neutral: 'cool', proud: 'cool', determined: 'cool' },
  fern: { work: 'focused', strain: 'determined', tired: 'calm', happy: 'content', neutral: 'content', grin: 'content', laugh: 'content', determined: 'focused' },
  merlin: { work: 'grumpy', strain: 'strain', tired: 'exhausted', happy: 'smug', neutral: 'grumpy', grin: 'smug', proud: 'smug', cool: 'smug' },
  bao: { work: 'happy', strain: 'puffed', tired: 'pant', happy: 'laugh', neutral: 'happy', grin: 'laugh', proud: 'laugh' },
};

// the mood each rest / handover act calls for
export const ACT_MOOD = {
  idle: 'neutral', walk: 'neutral', run: 'grin', wave: 'happy', highfive: 'grin', fistbump: 'cool', throw: 'determined', catch: 'surprised',
  give: 'happy', take: 'happy', bow: 'proud', curtsy: 'proud', hug: 'content', dance: 'grin', disco: 'grin', flex: 'proud', point: 'smug',
  zapped: 'dizzy', cheer: 'laugh', land: 'surprised', tag: 'grin', talk: 'neutral',
  handsKnees: 'pant', drink: 'content', wipeBrow: 'exhausted', fan: 'exhausted', shakeOut: 'grin', stretchUp: 'content', deepBreath: 'calm',
  handsHips: 'proud', headNod: 'cool', beardStroke: 'curious', bellyPat: 'content', hairFluff: 'smirk',
  chalk: 'determined', bounce: 'determined', twist: 'determined',
  sitFloor: 'content', meditate: 'calm', lieBack: 'calm', quadStretch: 'focused', sideStretch: 'focused', neckRoll: 'calm', armSwing: 'happy',
  marchSpot: 'determined', lookAround: 'curious', checkWatch: 'worried', clap: 'laugh', airGuitar: 'grin', squatRest: 'pant', hulaHips: 'grin',
  thinker: 'curious', shadowJab: 'determined', stir: 'focused', flip: 'grin', scratch: 'cool', readBook: 'focused', conduct: 'smug',
  treePose: 'calm', leanOn: 'content', crouchPeek: 'happy', warmHands: 'content', eatApple: 'happy', selfie: 'wink', nap: 'sleepy',
};

export function faceFor(mood, charId) {
  const name = PERSONA[charId]?.[mood] || mood;
  return EXPR[name] || EXPR[mood] || EXPR.neutral;
}

// blend two expressions (t: 0 → a, 1 → b)
export function mixFace(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const o = {};
  for (const k in BASE) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}
export const FACE_KEYS = Object.keys(BASE);
export const NEUTRAL = EXPR.neutral;
