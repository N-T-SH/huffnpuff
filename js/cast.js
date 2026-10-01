// SuperSweatClub — the clay cast. Who performs which move, in which set, with what camera.
// Pure data (no three.js) so the UI can use it without loading the 3D engine.
import * as store from './store.js';

export const CAST = [
  {
    id: 'pip', name: 'Pip', set: 'studio', emoji: '🙂', always: true,
    tagline: 'Your sweatband-wearing sidekick',
    bio: 'Upbeat, a little clumsy, never skips a session. Pip wears whatever colours you pick and fills in for anyone who is off duty.',
    body: 'human', top: 'tee', bottom: 'shorts', feet: 'sneakers', hair: 'cap', hat: 'headband', eyes: 'big',
    colors: { skin: '#e9a77d', top: '#ff6b57', bottom: '#3d3a6b', shoes: '#2ec4b6', hair: '#3b2a20', accent: '#ffc93c' },
    pet: 'dog',
  },
  {
    id: 'bruno', name: 'Bruno', set: 'workbench', emoji: '🥔',
    tagline: 'A bean with a moustache and a barbell',
    bio: 'Bruno has never met a weight he did not want to pick up. Lives on a workbench between cinder blocks and a coffee mug. Grunts on every rep.',
    body: 'bean', top: 'none', bottom: 'trunks', feet: 'bare', hair: 'bald', facial: 'mustache', eyes: 'beady', nose: 'none',
    colors: { skin: '#e7b48f', top: '#e7b48f', bottom: '#b8322b', shoes: '#e7b48f', hair: '#3a2418', accent: '#b8322b' },
  },
  {
    id: 'jolene', name: 'Jolene', set: 'aerobics', emoji: '💃',
    tagline: '1986 called. It wants its leg warmers back.',
    bio: 'Aerobics queen with a perm the size of a cloud. Her studio is pure VHS, and the sneakers dance along whenever she isn’t looking.',
    body: 'doll', top: 'leotard', bottom: 'leotard', feet: 'sneakers', hair: 'curly', hat: 'headband', eyes: 'lashes', extras: ['legwarmers', 'belt', 'wristbands'],
    colors: { skin: '#f0c4a4', top: '#22b8c9', bottom: '#22b8c9', shoes: '#f4f4f4', hair: '#c9873d', accent: '#ff5fa2' },
  },

  {
    id: 'dee', name: 'DJ Dee', set: 'disco', emoji: '🪩',
    tagline: 'Drops the beat, then drops for burpees',
    bio: 'Spins records and HIIT intervals in the same breath. The disco ball turns, the lights sweep, and Dee never takes the shades off.',
    body: 'human', top: 'track', bottom: 'pants', feet: 'sneakers', hair: 'afro', eyes: 'big', eyewear: 'sunglasses', extras: ['chain'],
    colors: { skin: '#7a4a2f', top: '#7b3fe4', bottom: '#7b3fe4', shoes: '#ffffff', hair: '#1b1210', accent: '#ffd23f' },
  },
  {
    id: 'fern', name: 'Fern', set: 'forest', emoji: '🌿',
    tagline: 'Forest yogi with a fox for a friend',
    bio: 'Barefoot and unhurried. Flows through stretches on a mossy clearing while a curious fox wanders past and the clouds drift by.',
    body: 'doll', top: 'tank', bottom: 'pants', feet: 'bare', hair: 'bun', eyes: 'big',
    colors: { skin: '#d79b72', top: '#7fb069', bottom: '#4a6b52', shoes: '#d79b72', hair: '#5a3a22', accent: '#f2c14e' },
    pet: 'fox',
  },
  {
    id: 'merlin', name: 'Merlin', set: 'tower', emoji: '🧙',
    tagline: 'Ancient wizard, surprisingly strong core',
    bio: 'Has held a plank since the Middle Ages. Trains by candlelight in his tower, with a crystal ball that glows when the abs burn.',
    body: 'human', top: 'robe', bottom: 'robe', feet: 'bare', hair: 'bald', hat: 'wizard', facial: 'beard', eyes: 'big',
    colors: { skin: '#e8b493', top: '#5b3fa8', bottom: '#5b3fa8', shoes: '#e8b493', hair: '#f2f2f2', accent: '#ffd23f' },
  },
  {
    id: 'bao', name: 'Chef Bao', set: 'kitchen', emoji: '👨‍🍳',
    tagline: 'Squats while the dough proves',
    bio: 'Round, jolly and always mid-recipe. Swings kettlebells between pans on the kitchen counter while the cat supervises.',
    body: 'chunky', top: 'apron', bottom: 'pants', feet: 'sneakers', hair: 'cap', hat: 'chef', eyes: 'big', facial: 'mustache',
    colors: { skin: '#f1c6a0', top: '#ffffff', bottom: '#3c4a5c', shoes: '#2b2b2b', hair: '#1f1a17', accent: '#e54b4b' },
    pet: 'cat',
  },


];

export const CAST_BY_ID = Object.fromEntries(CAST.map((c) => [c.id, c]));

// Who performs which move (chosen by personality and workout style)
const ASSIGN = {
  bruno: ['bb-squat', 'bb-deadlift', 'bb-row', 'bb-ohp', 'bb-bench', 'db-bench', 'db-press', 'db-row', 'db-rdl', 'bicep-curl', 'hammer-curl', 'tricep-ext', 'front-raise', 'floor-press', 'pull-up', 'chin-up', 'dead-hang'],
  jolene: ['jumping-jack', 'march', 'high-knees', 'butt-kick', 'sumo-squat', 'squat-reach', 'toe-touch', 'calf-raise', 'arm-circles'],
  dee: ['burpee', 'mountain-climber', 'jump-squat', 'shadow-box', 'jump-rope', 'push-up', 'knee-push-up'],
  fern: ['down-dog', 'cobra', 'childs-pose', 'cat-cow', 'hip-flexor-stretch', 'hamstring-stretch', 'knee-hug', 'bird-dog', 'inchworm', 'glute-bridge', 'single-leg-bridge'],
  merlin: ['plank', 'high-plank', 'crunch', 'sit-up', 'leg-raise', 'hollow-hold', 'dead-bug', 'v-up', 'russian-twist', 'bicycle', 'reverse-crunch', 'flutter-kick', 'superman'],
  bao: ['goblet-squat', 'kb-swing', 'squat', 'lunge', 'reverse-lunge', 'chair-dip'],
  pip: ['wall-sit', 'wall-push-up', 'wave', 'celebrate', 'meditate', 'flex'],
};
const EX_TO_CHAR = {};
for (const [c, list] of Object.entries(ASSIGN)) for (const e of list) EX_TO_CHAR[e] = c;

// Stand-ins when someone is switched off
const BY_CAT = {
  strength: ['bruno', 'bao', 'dee', 'pip'],
  cardio: ['jolene', 'dee', 'pip'],
  core: ['merlin', 'fern', 'pip'],
  mobility: ['fern', 'jolene', 'pip'],
  default: ['pip'],
};

/* ---------- "me": the cast member the user plays ----------
   settings.me = { id, bio } and settings.look holds that character's colours
   (keys skin/shirt/shorts/shoes/hair/band, mapped onto the character's slots). */
export const meId = () => (CAST_BY_ID[store.settings().me?.id] ? store.settings().me.id : 'pip');
export const isMe = (c) => (c?.id || c) === meId();
export function myName() {
  return (store.get('profile')?.name || '').trim() || 'You';
}
export function nameOf(c) {
  return isMe(c) ? myName() : c.name;
}
export function bioOf(c) {
  const me = store.settings().me;
  return isMe(c) && me?.bio ? me.bio : c.bio;
}
export function taglineOf(c) {
  return isMe(c) ? `That’s you! (cast as ${c.name})` : c.tagline;
}
export const lookFromColors = (c) => ({ skin: c.skin, shirt: c.top, shorts: c.bottom, shoes: c.shoes, hair: c.hair, band: c.accent });
export const myLook = () => store.settings().look || lookFromColors(CAST_BY_ID[meId()].colors);

// Which colour slots make sense for each character, and what to call them
const TOPS = { tee: 'Shirt', tank: 'Tank top', leotard: 'Leotard', track: 'Tracksuit', robe: 'Robe', apron: 'Chef whites', none: null };
const BOTTOMS = { shorts: 'Shorts', pants: 'Trousers', trunks: 'Trunks', leotard: null, robe: null };
const ACCENTS = { pip: 'Headband', bruno: null, jolene: 'Headband & belt', dee: 'Gold chain', fern: 'Hair tie', merlin: 'Stars & sash', bao: 'Apron trim' };
export function colorSlots(c) {
  const hair = c.hair === 'bald' ? (c.facial ? (c.facial === 'beard' ? 'Beard' : 'Moustache') : null) : c.facial ? 'Hair & moustache' : 'Hair';
  return [
    ['skin', 'Skin'],
    ['shirt', TOPS[c.top] ?? 'Top'],
    ['shorts', BOTTOMS[c.bottom] ?? 'Bottoms'],
    ['shoes', c.feet === 'bare' ? null : 'Shoes'],
    ['hair', hair],
    ['band', ACCENTS[c.id] ?? 'Accent'],
  ].filter(([, l]) => l);
}

export function enabledCast() {
  const off = new Set(store.settings().castOff || []);
  return CAST.filter((c) => c.always || isMe(c) || !off.has(c.id));
}

export function isEnabled(id) {
  const c = CAST_BY_ID[id];
  return !!c && (c.always || isMe(id) || !(store.settings().castOff || []).includes(id));
}

export function characterFor(ex) {
  const want = EX_TO_CHAR[ex.id];
  if (want && isEnabled(want)) return CAST_BY_ID[want];
  for (const id of BY_CAT[ex.cat] || BY_CAT.default) if (isEnabled(id)) return CAST_BY_ID[id];
  return CAST_BY_ID.pip;
}

export function movesFor(charId) {
  return ASSIGN[charId] || [];
}

// The user's character wears the user's chosen colours
export function colorsFor(char) {
  const look = store.settings().look;
  if (!isMe(char) || !look) return char.colors;
  return { ...char.colors, skin: look.skin, top: look.shirt, bottom: look.shorts, shoes: look.shoes, hair: look.hair, accent: look.band };
}

export function castKey() {
  return (store.settings().castOff || []).join('.') + '|' + meId() + '|' + JSON.stringify(store.settings().look || '');
}

// Little speech bubbles when a character steps up to perform a move
export const QUIPS = {
  pip: ['You got this!', 'Sweatband: on. Let’s go!', 'Breathe in… and squish!', 'Tiny reps, big wins.'],
  bruno: ['Lift with the heart. And the legs.', 'Hnnngh!', 'Heavy is a feeling.', 'More plates. More moustache.'],
  jolene: ['Feel the burn, honey!', 'And kick! And kick!', 'Point those toes!', 'Totally tubular!'],
  dee: ['Drop the beat!', 'Faster on the chorus!', 'Shades stay on. Always.', 'This one’s a banger.'],
  fern: ['Breathe into it.', 'Let the ground hold you.', 'The fox approves.', 'Soft knees, open heart.'],
  merlin: ['A plank is a spell of patience.', 'Abracad-abs!', 'Six hundred years, still crunching.', 'The orb sees your form.'],
  bao: ['Squat while it simmers!', 'Knead the dough, knead the glutes.', 'Chef’s kiss on that rep!', 'The cat is judging.'],
};
export function quipFor(id, n = 0) {
  const q = QUIPS[id] || QUIPS.pip;
  return q[n % q.length];
}
