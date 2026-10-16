// Huff n Puff — exercise library. Every exercise ships its own clay keyframes.
import { swap } from './clay.js';

// Pose shorthand: t torso lean (0 upright, + forward), n head lean,
// ra/la near/far arm [shoulder, elbow] absolute angles (0 down, 90 forward, 180 up),
// rl/ll near/far leg [hip, knee], rfo/lfo foot offsets, lift jump height.
const STAND = { t: 0, ra: [6, 10], la: [-4, 0], rl: [2, 0], ll: [-2, 0] };
const P = (o) => ({ ...STAND, ...o });

// Supine (on back, head left) and prone (face down, head right) helpers
const SUP = { t: -90, n: -90, ra: [92, 92], la: [88, 88], rl: [135, 15], ll: [132, 12] };
const PLANK_HI = { t: 74, n: 82, ra: [-2, -2], la: [3, 3], rl: [-74, -74], ll: [-76, -76], rfo: 78, lfo: 78 };

export const MUSCLES = {
  chest: 'Chest', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  abs: 'Abs', obliques: 'Obliques', lats: 'Lats', traps: 'Traps', lowerback: 'Lower back',
  glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves', adductors: 'Adductors', hipflexors: 'Hip flexors',
};

export const EQUIPMENT = {
  none: 'No equipment', dumbbell: 'Dumbbells', kettlebell: 'Kettlebell', barbell: 'Barbell',
  bench: 'Bench', pullupbar: 'Pull-up bar', chair: 'Chair / box', rope: 'Jump rope', mat: 'Mat',
};

export const CATS = { strength: 'Strength', cardio: 'Cardio', core: 'Core', mobility: 'Mobility' };

const EX = [];
const def = (o) => EX.push({ type: 'reps', reps: 10, time: 40, met: 5, equip: ['none'], secondary: [], tips: [], mistakes: [], ...o });

/* ===================== LOWER BODY ===================== */
def({
  id: 'squat', name: 'Bodyweight Squat', cat: 'strength', primary: ['quads', 'glutes'], secondary: ['hamstrings', 'abs'], reps: 15, met: 5,
  steps: ['Stand with feet shoulder-width apart, toes slightly out.', 'Push hips back and bend knees as if sitting into a chair.', 'Lower until thighs are about parallel to the floor, chest proud.', 'Drive through your whole foot to stand back up.'],
  tips: ['Keep your weight over mid-foot.', 'Let knees travel in line with toes.'],
  mistakes: ['Heels lifting off the floor', 'Knees caving inward', 'Rounding the lower back'],
  anim: { tempo: 2.4, frames: [
    P({ t: 4, ra: [70, 78], la: [66, 74], rl: [2, 0], ll: [2, 0], rlab: 5, llab: 5, rto: 12, lto: 12, rz: 7, lz: 7 }),
    P({ t: 38, ra: [92, 92], la: [88, 88], rl: [86, -28], ll: [84, -30], rlsw: 16, llsw: 16, rto: 12, lto: 12, rz: 7, lz: 7 }),
  ] },
});
def({
  id: 'jump-squat', name: 'Jump Squat', cat: 'cardio', primary: ['quads', 'glutes'], secondary: ['calves', 'hamstrings'], reps: 12, met: 8.5,
  steps: ['Start in a squat stance.', 'Sit into a squat with arms swinging back.', 'Explode upward, reaching the arms overhead.', 'Land softly back into the next squat.'],
  tips: ['Land quietly through the balls of your feet.', 'Use your arms to generate height.'],
  mistakes: ['Landing with straight, locked knees', 'Knees collapsing on landing'],
  anim: { tempo: 1.5, ax: 'pelvis', sweep: true /* arms swing forward and up on purpose */, d: [1, 0.6, 0.6, 1], frames: [
    P({ t: 38, ra: [-30, -20], la: [-34, -24], rl: [86, -28], ll: [84, -30] }),
    P({ t: 8, ra: [170, 175], la: [165, 170], rl: [0, -4], ll: [-2, -6], rfo: 45, lfo: 45, lift: 28 }),
    P({ t: 4, ra: [120, 130], la: [115, 125], rl: [10, -6], ll: [8, -8], lift: 6 }),
    P({ t: 30, ra: [-20, -10], la: [-24, -14], rl: [70, -24], ll: [68, -26] }),
  ] },
});
def({
  id: 'lunge', name: 'Forward Lunge', cat: 'strength', primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'], reps: 12, perSide: true, met: 5,
  steps: ['Stand tall with hands on hips or by your sides.', 'Step one foot forward and lower both knees to about 90°.', 'Keep the front shin vertical and torso upright.', 'Push through the front heel to return, then switch legs.'],
  tips: ['Take a long enough step so the front knee stays over the ankle.'],
  mistakes: ['Front knee shooting past the toes', 'Leaning the torso forward'],
  anim: { tempo: 4, ax: 'pelvis', frames: [
    P({}),
    P({ t: 4, ra: [10, 10], la: [-6, -4], rl: [82, -2], ll: [-22, -84], lfo: 62 }),
    P({}),
    swap(P({ t: 4, ra: [-6, -4], la: [10, 10], rl: [82, -2], ll: [-22, -84], lfo: 62 })),
  ] },
});
def({
  id: 'reverse-lunge', name: 'Reverse Lunge', cat: 'strength', primary: ['glutes', 'quads'], secondary: ['hamstrings'], reps: 12, perSide: true, met: 5,
  steps: ['Stand tall, feet hip-width.', 'Step one foot back and lower until both knees reach ~90°.', 'Drive through the front foot to return to standing.', 'Alternate legs.'],
  tips: ['Easier on the knees than forward lunges.', 'Brace your core to stay balanced.'],
  mistakes: ['Back knee slamming the floor', 'Short steps that overload the front knee'],
  anim: { tempo: 4, ax: 'rAnkle', frames: [
    P({ ra: [60, 100], la: [56, 96] }),
    P({ t: 8, ra: [70, 110], la: [66, 106], rl: [80, -4], ll: [-24, -84], lfo: 62 }),
    P({ ra: [60, 100], la: [56, 96] }),
    P({ t: 8, ra: [70, 110], la: [66, 106], rl: [80, -4], ll: [-24, -84], lfo: 62 }),
  ] },
});
def({
  id: 'wall-sit', name: 'Wall Sit', cat: 'strength', type: 'time', time: 40, primary: ['quads'], secondary: ['glutes', 'calves'], met: 4,
  steps: ['Lean your back flat against a wall.', 'Slide down until knees are bent to 90°.', 'Keep shins vertical and weight in your heels.', 'Hold and breathe steadily.'],
  tips: ['Press your lower back into the wall.', 'Rest hands on thighs, not pushing on them.'],
  mistakes: ['Hips higher than knees', 'Holding your breath'],
  anim: { tempo: 3, ax: 'pelvis', props: [{ type: 'wall', x: -22 }], frames: [P({ t: 0, n: 4, ra: [60, 92], la: [56, 90], rl: [90, 0], ll: [88, -2] })] },
});
def({
  id: 'glute-bridge', name: 'Glute Bridge', cat: 'strength', primary: ['glutes'], secondary: ['hamstrings', 'lowerback'], reps: 15, met: 3.5, equip: ['none', 'mat'],
  steps: ['Lie on your back, knees bent, feet flat and hip-width.', 'Squeeze your glutes and lift your hips.', 'Form a straight line from shoulders to knees.', 'Pause at the top, then lower with control.'],
  tips: ['Drive through your heels.', 'Tuck your ribs down to avoid arching.'],
  mistakes: ['Over-arching the lower back', 'Pushing through the toes'],
  anim: { tempo: 2.4, lv: ['shoulder', 'rHeel'], ax: 'rHeel', props: [{ type: 'mat' }], frames: [
    { ...SUP, ra: [92, 92], la: [90, 90], rl: [128, -20], ll: [126, -22] },
    { t: -116, n: -95, ra: [96, 96], la: [94, 94], rl: [112, -8], ll: [110, -10] },
  ] },
});
def({
  id: 'single-leg-bridge', name: 'Single-Leg Glute Bridge', cat: 'strength', primary: ['glutes'], secondary: ['hamstrings', 'abs'], reps: 10, perSide: true, met: 3.8, equip: ['none', 'mat'],
  steps: ['Lie on your back with one knee bent and the other leg extended.', 'Drive through the planted heel to lift your hips.', 'Keep the hips level at the top.', 'Lower slowly; switch sides after the set.'],
  tips: ['Keep the extended leg in line with the thigh.'],
  mistakes: ['Hips rotating/dropping on one side'],
  anim: { tempo: 2.4, lv: ['shoulder', 'rHeel'], ax: 'rHeel', props: [{ type: 'mat' }], frames: [
    { ...SUP, ra: [92, 92], la: [90, 90], rl: [128, -20], ll: [140, 140], lfo: 70 },
    { t: -116, n: -95, ra: [96, 96], la: [94, 94], rl: [112, -8], ll: [112, 112], lfo: 70 },
  ] },
});
def({
  id: 'calf-raise', name: 'Calf Raise', cat: 'strength', primary: ['calves'], reps: 20, met: 3,
  steps: ['Stand tall with feet hip-width apart.', 'Rise onto the balls of your feet as high as you can.', 'Pause at the top and squeeze.', 'Lower your heels slowly.'],
  tips: ['Hold a wall for balance if needed.', 'Go slow on the way down.'],
  mistakes: ['Bouncing', 'Rolling onto the outer edge of the foot'],
  anim: { tempo: 1.8, ax: 'rToe', frames: [P({ ra: [4, 4], la: [-2, -2] }), P({ ra: [4, 4], la: [-2, -2], rfo: 38, lfo: 38 })] },
});
def({
  id: 'sumo-squat', name: 'Sumo Squat', cat: 'strength', primary: ['adductors', 'glutes', 'quads'], reps: 15, met: 5,
  steps: ['Take a wide stance with toes turned out 45°.', 'Clasp hands at your chest.', 'Sit straight down, pushing knees out over toes.', 'Stand back up squeezing your glutes.'],
  tips: ['Keep your chest tall throughout.'],
  mistakes: ['Knees caving in', 'Leaning forward'],
  // wide stance, toes out; the knees push out over the toes while the feet stay planted
  anim: { tempo: 2.4, frames: [
    P({ t: 2, ra: [30, 150], la: [30, 150], rl: [2, 0], ll: [2, 0], rlab: 18, llab: 18, rto: 38, lto: 38, rz: 27, lz: 27 }),
    P({ t: 12, ra: [40, 160], la: [40, 160], rl: [74, -10], ll: [74, -10], rlsw: 44, llsw: 44, rto: 38, lto: 38, rz: 27, lz: 27 }),
  ] },
});
def({
  id: 'goblet-squat', name: 'Goblet Squat', cat: 'strength', equip: ['dumbbell', 'kettlebell'], primary: ['quads', 'glutes'], secondary: ['abs', 'forearms'], reps: 12, met: 6, weighted: true,
  steps: ['Hold a kettlebell or dumbbell vertically at your chest.', 'Squat down between your knees, elbows inside the thighs.', 'Keep the weight close and chest up.', 'Drive up through the heels.'],
  tips: ['The weight acts as a counterbalance—sit deep.'],
  mistakes: ['Letting the weight drift away from your chest', 'Heels lifting'],
  anim: { tempo: 2.6, hold: 'goblet', frames: [
    P({ t: 4, ra: [20, 165], la: [16, 160], rl: [2, 0], ll: [2, 0], rlab: 7, llab: 7, rto: 16, lto: 16, rz: 10, lz: 10 }),
    P({ t: 32, ra: [50, 175], la: [46, 170], rl: [86, -28], ll: [84, -30], rlsw: 20, llsw: 20, rto: 16, lto: 16, rz: 10, lz: 10 }),
  ] },
});
def({
  id: 'db-rdl', name: 'Dumbbell Romanian Deadlift', cat: 'strength', equip: ['dumbbell'], primary: ['hamstrings', 'glutes'], secondary: ['lowerback', 'forearms'], reps: 10, met: 6, weighted: true,
  steps: ['Hold dumbbells in front of your thighs.', 'Soften the knees and hinge at the hips, pushing them back.', 'Lower the weights along your legs until you feel a hamstring stretch.', 'Squeeze glutes to return to standing.'],
  tips: ['Keep your back flat and the weights close.', 'Think “hips back”, not “down”.'],
  mistakes: ['Rounding the back', 'Bending the knees into a squat'],
  anim: { tempo: 3, hold: 'dumbbells', frames: [P({ ra: [4, 4], la: [-2, -2] }), P({ t: 78, n: 64, ra: [4, 4], la: [-2, -2], rl: [-10, -20], ll: [-12, -22] })] },
});
def({
  id: 'bb-deadlift', name: 'Barbell Deadlift', cat: 'strength', equip: ['barbell'], primary: ['hamstrings', 'glutes', 'lowerback'], secondary: ['traps', 'forearms', 'quads'], reps: 5, met: 6, weighted: true,
  steps: ['Stand with mid-foot under the bar.', 'Hinge and grip the bar just outside your legs.', 'Brace, flatten your back and push the floor away.', 'Lock out with hips and knees together, then lower under control.'],
  tips: ['Keep the bar dragging close to your legs.', 'Big breath and brace before each rep.'],
  mistakes: ['Jerking the bar off the floor', 'Rounded back', 'Hyperextending at the top'],
  anim: { tempo: 3.2, hold: 'barbell', frames: [P({ t: 60, n: 45, ra: [6, 6], la: [4, 4], rl: [52, -30], ll: [50, -32] }), P({ t: 0, ra: [34, 34], la: [32, 32] })] },
});
def({
  id: 'bb-squat', name: 'Barbell Back Squat', cat: 'strength', equip: ['barbell'], primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lowerback', 'abs'], reps: 6, met: 6, weighted: true,
  steps: ['Set the bar on your upper back, hands just outside shoulders.', 'Brace your core and unrack.', 'Squat to depth keeping chest up.', 'Drive up, exhaling at the top.'],
  tips: ['Squeeze the bar to create upper back tension.'],
  mistakes: ['Good-morning the bar up', 'Knees caving'],
  anim: { tempo: 3, hold: 'barbellBack', elbowsOut: true, frames: [P({ t: 4, ra: [-40, 165], la: [-44, 160] }), P({ t: 34, ra: [-20, 175], la: [-24, 170], rl: [86, -28], ll: [84, -30] })] },
});
def({
  id: 'kb-swing', name: 'Kettlebell Swing', cat: 'cardio', equip: ['kettlebell'], primary: ['glutes', 'hamstrings'], secondary: ['lowerback', 'shoulders', 'abs'], reps: 15, met: 9.8, weighted: true,
  steps: ['Stand with feet wider than hips, bell in both hands.', 'Hike the bell back between your legs with a hip hinge.', 'Snap the hips forward to float the bell to chest height.', 'Let it fall back and hinge into the next rep.'],
  tips: ['It is a hip hinge, not a squat or a front raise.', 'Squeeze glutes hard at the top.'],
  mistakes: ['Lifting with the arms', 'Squatting the swing'],
  anim: { tempo: 1.6, hold: 'kettlebell', frames: [P({ t: 62, n: 50, ra: [-28, -30], la: [-30, -32], rl: [26, -12], ll: [24, -14] }), P({ t: -4, ra: [92, 92], la: [88, 88] })] },
});

/* ===================== UPPER BODY ===================== */
def({
  id: 'push-up', name: 'Push-up', cat: 'strength', primary: ['chest', 'triceps'], secondary: ['shoulders', 'abs'], reps: 10, met: 8,
  steps: ['Start in a high plank, hands under shoulders.', 'Brace your body into a straight line.', 'Lower your chest toward the floor, elbows ~45° from the body.', 'Press back up to full arm extension.'],
  tips: ['Squeeze glutes to keep hips level.', 'Lead with the chest, not the chin.'],
  mistakes: ['Sagging hips', 'Flared elbows', 'Partial range of motion'],
  anim: { tempo: 2, lv: ['rHand', 'rToe'], ax: 'rHand', props: [{ type: 'mat' }], frames: [{ ...PLANK_HI }, { ...PLANK_HI, t: 86, n: 92, ra: [-128, 16], la: [-124, 18], rl: [-86, -86], ll: [-88, -88] }] },
});
def({
  id: 'knee-push-up', name: 'Knee Push-up', cat: 'strength', primary: ['chest', 'triceps'], secondary: ['shoulders'], reps: 12, met: 5,
  steps: ['Kneel and place hands under your shoulders.', 'Form a line from knees to head.', 'Lower your chest toward the floor.', 'Press back up.'],
  tips: ['Great for building up to full push-ups.'],
  mistakes: ['Hips piking up', 'Head dropping'],
  anim: { tempo: 2, lv: ['rHand', 'rKnee'], ax: 'rHand', props: [{ type: 'mat' }], frames: [
    { t: 66, n: 76, ra: [-2, -2], la: [3, 3], rl: [-66, -102], ll: [-68, -104], rfo: 80, lfo: 80 },
    { t: 82, n: 90, ra: [-128, 16], la: [-124, 18], rl: [-82, -112], ll: [-84, -114], rfo: 80, lfo: 80 },
  ] },
});
def({
  id: 'wall-push-up', name: 'Wall Push-up', cat: 'strength', primary: ['chest', 'triceps'], secondary: ['shoulders'], reps: 15, met: 3.5,
  steps: ['Stand an arm’s length from a wall.', 'Place palms on the wall at shoulder height.', 'Bend elbows to bring your chest toward the wall.', 'Push back to the start.'],
  tips: ['Step further back to make it harder.'],
  mistakes: ['Hips sticking out'],
  anim: { tempo: 2, ax: 'rHand', props: [{ type: 'wall', x: 7, side: 'right' }], frames: [
    P({ t: 28, n: 26, ra: [96, 96], la: [94, 94], rl: [-28, -28], ll: [-28, -28], rfo: 100, lfo: 100 }),
    // hands and feet stay planted; the body tips toward the wall and the elbows drop, head just clear of it
    P({ t: 40, n: 20, ra: [80, 164], la: [78, 162], rl: [-40, -40], ll: [-40, -40], rfo: 100, lfo: 100 }),
  ] },
});
def({
  id: 'chair-dip', name: 'Chair Dip', cat: 'strength', equip: ['chair'], primary: ['triceps'], secondary: ['chest', 'shoulders'], reps: 12, met: 5,
  steps: ['Sit on the edge of a sturdy chair, hands beside your hips.', 'Slide your hips off the seat, legs extended.', 'Bend your elbows to lower straight down.', 'Press back up until arms are straight.'],
  tips: ['Keep your back close to the chair.', 'Bend the knees to make it easier.'],
  mistakes: ['Shoulders shrugging to the ears', 'Going too deep'],
  anim: { tempo: 2, anchor: 'hands', ground: 52, props: [{ type: 'box', x0: -64, x1: 4, top: 0 }], frames: [
    { t: 2, n: 4, ra: [-12, -12], la: [-14, -14], rl: [60, 40], ll: [58, 38] },
    { t: 4, n: 6, ra: [-84, -2], la: [-86, -4], rl: [92, 64], ll: [90, 62] },
  ] },
});
def({
  id: 'db-press', name: 'Dumbbell Shoulder Press', cat: 'strength', equip: ['dumbbell'], primary: ['shoulders'], secondary: ['triceps', 'traps'], reps: 10, met: 5, weighted: true,
  steps: ['Hold dumbbells at shoulder height, palms forward.', 'Brace your core and squeeze your glutes.', 'Press the weights overhead until arms are straight.', 'Lower back to the shoulders with control.'],
  tips: ['Keep ribs down—don’t arch.'],
  mistakes: ['Excessive back arch', 'Elbows drifting far forward'],
  // elbows out to the sides at shoulder height, pressing straight up overhead
  anim: { tempo: 2.2, hold: 'dumbbells', frames: [P({ ra: [8, 8], la: [8, 8], rab: [84, 178], lab: [84, 178] }), P({ ra: [6, 6], la: [6, 6], rab: [164, 170], lab: [164, 170] })] },
});
def({
  id: 'bb-ohp', name: 'Barbell Overhead Press', cat: 'strength', equip: ['barbell'], primary: ['shoulders'], secondary: ['triceps', 'abs'], reps: 6, met: 5.5, weighted: true,
  steps: ['Hold the bar at your collarbones, grip just outside shoulders.', 'Brace and press straight up, moving your head back slightly.', 'Lock out overhead with the bar over mid-foot.', 'Lower under control.'],
  tips: ['Squeeze glutes to protect the lower back.'],
  mistakes: ['Leaning way back', 'Pressing the bar forward instead of up'],
  anim: { tempo: 2.4, hold: 'barbell', frames: [P({ n: -8, ra: [24, 152], la: [22, 150] }), P({ n: -6, ra: [168, 172], la: [166, 170] })] },
});
def({
  id: 'db-row', name: 'Bent-Over Dumbbell Row', cat: 'strength', equip: ['dumbbell'], primary: ['lats'], secondary: ['biceps', 'traps', 'lowerback'], reps: 10, met: 5, weighted: true,
  steps: ['Hinge forward with a flat back, knees soft.', 'Let the dumbbells hang under your shoulders.', 'Row them to your hips, squeezing your shoulder blades.', 'Lower slowly.'],
  tips: ['Lead with the elbows.', 'Keep your neck neutral.'],
  mistakes: ['Jerking the torso up', 'Rounding the back'],
  anim: { tempo: 2.2, hold: 'dumbbells', frames: [P({ t: 68, n: 60, ra: [0, 0], la: [-2, -2], rl: [20, -10], ll: [18, -12] }), P({ t: 66, n: 58, ra: [-118, -12], la: [-120, -14], rl: [20, -10], ll: [18, -12] })] },
});
def({
  id: 'bb-row', name: 'Barbell Row', cat: 'strength', equip: ['barbell'], primary: ['lats', 'traps'], secondary: ['biceps', 'lowerback'], reps: 8, met: 5.5, weighted: true,
  steps: ['Hinge to ~45°, holding the bar with straight arms.', 'Pull the bar to your lower ribs.', 'Squeeze your back at the top.', 'Lower under control.'],
  tips: ['Brace your core like a deadlift.'],
  mistakes: ['Using momentum', 'Standing up as you row'],
  anim: { tempo: 2.2, hold: 'barbell', frames: [P({ t: 62, n: 52, ra: [0, 0], la: [-2, -2], rl: [24, -12], ll: [22, -14] }), P({ t: 60, n: 50, ra: [-54, 20], la: [-56, 18], rl: [24, -12], ll: [22, -14] })] },
});
def({
  id: 'bicep-curl', name: 'Dumbbell Bicep Curl', cat: 'strength', equip: ['dumbbell'], primary: ['biceps'], secondary: ['forearms'], reps: 12, met: 3.5, weighted: true,
  steps: ['Stand tall, dumbbells at your sides, palms forward.', 'Pin your elbows to your ribs.', 'Curl the weights up toward your shoulders.', 'Lower slowly to full extension.'],
  tips: ['Control the lowering phase for 2–3 seconds.'],
  mistakes: ['Swinging the torso', 'Elbows drifting forward'],
  anim: { tempo: 2, hold: 'dumbbells', frames: [P({ ra: [4, 6], la: [-2, 2] }), P({ ra: [10, 150], la: [6, 146] })] },
});
def({
  id: 'hammer-curl', name: 'Hammer Curl', cat: 'strength', equip: ['dumbbell'], primary: ['biceps', 'forearms'], reps: 12, met: 3.5, weighted: true,
  steps: ['Hold dumbbells with palms facing each other.', 'Keep elbows tucked.', 'Curl up without rotating the wrists.', 'Lower with control.'],
  tips: ['Great for forearm and brachialis size.'],
  mistakes: ['Using momentum'],
  anim: { tempo: 2, hold: 'dumbbells', frames: [P({ ra: [2, 2], la: [-2, -2] }), P({ ra: [12, 140], la: [8, 136] })] },
});
def({
  id: 'tricep-ext', name: 'Overhead Tricep Extension', cat: 'strength', equip: ['dumbbell'], primary: ['triceps'], reps: 12, met: 3.5, weighted: true,
  steps: ['Hold one dumbbell overhead with both hands.', 'Keep elbows pointing up and close to your head.', 'Lower the weight behind your head.', 'Extend the arms back to the top.'],
  tips: ['Keep your core braced to avoid arching.'],
  mistakes: ['Elbows flaring wide', 'Arching the back'],
  // both hands share one dumbbell: the arms angle in so the fists meet over the head
  anim: { tempo: 2.2, hold: 'dumbbell1', frames: [P({ ra: [172, 176], la: [172, 176], rab: [17, 30], lab: [17, 30] }), P({ ra: [158, 252], la: [158, 252], rab: [17, 6], lab: [17, 6] })] },
});
def({
  id: 'front-raise', name: 'Dumbbell Front Raise', cat: 'strength', equip: ['dumbbell'], primary: ['shoulders'], reps: 12, met: 3.5, weighted: true,
  steps: ['Stand with dumbbells in front of your thighs.', 'Raise them straight forward to shoulder height.', 'Pause, then lower slowly.'],
  tips: ['Use a lighter weight than you think.'],
  mistakes: ['Swinging', 'Raising above eye level'],
  anim: { tempo: 2.2, hold: 'dumbbells', frames: [P({ ra: [8, 8], la: [4, 4] }), P({ ra: [90, 92], la: [86, 88] })] },
});
def({
  id: 'floor-press', name: 'Dumbbell Floor Press', cat: 'strength', equip: ['dumbbell'], primary: ['chest', 'triceps'], secondary: ['shoulders'], reps: 10, met: 4.5, weighted: true,
  steps: ['Lie on your back with knees bent, dumbbells over your chest.', 'Lower until your upper arms touch the floor.', 'Press the weights back up over your chest.'],
  tips: ['Pause briefly with elbows on the floor.'],
  mistakes: ['Bouncing elbows off the floor'],
  anim: { tempo: 2.2, hold: 'dumbbells', lv: ['shoulder', 'rHeel'], props: [{ type: 'mat' }], frames: [
    { ...SUP, ra: [178, 180], la: [176, 178], rl: [130, -16], ll: [128, -18] },
    { ...SUP, ra: [96, 172], la: [94, 170], rl: [130, -16], ll: [128, -18] },
  ] },
});
def({
  id: 'db-bench', name: 'Dumbbell Bench Press', cat: 'strength', equip: ['dumbbell', 'bench'], primary: ['chest'], secondary: ['triceps', 'shoulders'], reps: 10, met: 5, weighted: true,
  steps: ['Lie on a flat bench with dumbbells at chest level.', 'Plant your feet and squeeze your shoulder blades together.', 'Press the weights up until arms are straight.', 'Lower slowly to chest level.'],
  tips: ['Keep wrists stacked over elbows.'],
  mistakes: ['Lifting hips off the bench', 'Flaring elbows to 90°'],
  anim: { tempo: 2.4, anchor: 'abs', hold: 'dumbbells', props: [{ type: 'bench', x0: -84, x1: 26, top: -42 }], frames: [
    { t: -90, n: -90, y: -56, ra: [178, 180], la: [176, 178], rl: [80, -4], ll: [78, -6] },
    { t: -90, n: -90, y: -56, ra: [94, 170], la: [92, 168], rl: [80, -4], ll: [78, -6] },
  ] },
});
def({
  id: 'bb-bench', name: 'Barbell Bench Press', cat: 'strength', equip: ['barbell', 'bench'], primary: ['chest'], secondary: ['triceps', 'shoulders'], reps: 6, met: 5.5, weighted: true,
  steps: ['Lie under the bar with eyes beneath it.', 'Grip slightly wider than shoulders, retract shoulder blades.', 'Lower the bar to mid-chest.', 'Press back up over your shoulders.'],
  tips: ['Use a spotter or safety pins for heavy sets.'],
  mistakes: ['Bouncing the bar off the chest', 'Flat, loose upper back'],
  anim: { tempo: 2.6, anchor: 'abs', hold: 'barbell', props: [{ type: 'bench', x0: -84, x1: 26, top: -42 }], frames: [
    { t: -90, n: -90, y: -56, ra: [176, 180], la: [174, 178], rl: [80, -4], ll: [78, -6] },
    { t: -90, n: -90, y: -56, ra: [98, 168], la: [96, 166], rl: [80, -4], ll: [78, -6] },
  ] },
});
def({
  id: 'pull-up', name: 'Pull-up', cat: 'strength', equip: ['pullupbar'], primary: ['lats'], secondary: ['biceps', 'forearms', 'traps'], reps: 6, met: 8,
  steps: ['Hang from the bar with an overhand grip, hands shoulder-width.', 'Pull your shoulder blades down and back.', 'Pull your chest toward the bar until the chin clears it.', 'Lower all the way down with control.'],
  tips: ['Use a band or negatives to build up.', 'Squeeze the bar hard.'],
  mistakes: ['Kipping or swinging', 'Half reps'],
  anim: { tempo: 2.6, anchor: 'hands', ground: 238, props: [{ type: 'bar', y: 0 }], frames: [
    { t: -4, n: 0, ra: [156, 160], la: [154, 158], rl: [8, -24], ll: [4, -30] },
    { t: -10, n: -4, ra: [55, 161], la: [52, 158], rl: [16, -26], ll: [12, -32] },
  ] },
});
def({
  id: 'chin-up', name: 'Chin-up', cat: 'strength', equip: ['pullupbar'], primary: ['lats', 'biceps'], secondary: ['forearms'], reps: 6, met: 8,
  steps: ['Hang from the bar with palms facing you.', 'Pull your elbows down to your ribs.', 'Bring your chin above the bar.', 'Lower slowly to a full hang.'],
  tips: ['Slightly easier than pull-ups thanks to the biceps.'],
  mistakes: ['Craning the neck to reach the bar'],
  anim: { tempo: 2.6, anchor: 'hands', ground: 238, props: [{ type: 'bar', y: 0 }], frames: [
    { t: -2, n: 0, ra: [156, 160], la: [154, 158], rl: [4, -10], ll: [0, -14] },
    { t: -10, n: -4, ra: [55, 161], la: [52, 158], rl: [10, -14], ll: [6, -18] },
  ] },
});
def({
  id: 'dead-hang', name: 'Dead Hang', cat: 'mobility', type: 'time', time: 30, equip: ['pullupbar'], primary: ['forearms', 'lats'], secondary: ['shoulders'], met: 3,
  steps: ['Grab the bar overhand, hands shoulder-width.', 'Let your body hang long and relaxed.', 'Breathe deeply and keep a light grip tension.'],
  tips: ['Excellent for grip and shoulder health.'],
  mistakes: ['Shrugging up into the ears for the whole hold'],
  anim: { tempo: 3, anchor: 'hands', ground: 238, props: [{ type: 'bar', y: 0 }], frames: [{ t: -4, n: 0, ra: [156, 160], la: [154, 158], rl: [2, -6], ll: [-2, -10] }] },
});
def({
  id: 'superman', name: 'Superman', cat: 'strength', primary: ['lowerback', 'glutes'], secondary: ['hamstrings', 'shoulders'], reps: 12, met: 3.5, equip: ['none', 'mat'],
  steps: ['Lie face down with arms extended in front.', 'Lift arms, chest and legs off the floor together.', 'Hold for a breath at the top.', 'Lower with control.'],
  tips: ['Look at the floor to keep your neck neutral.'],
  mistakes: ['Cranking the neck up', 'Jerky lifts'],
  anim: { tempo: 2.4, props: [{ type: 'mat' }], frames: [
    { t: 92, n: 94, ra: [92, 92], la: [90, 90], rl: [-90, -90], ll: [-90, -90], rfo: 90, lfo: 90 },
    { t: 80, n: 78, ra: [118, 118], la: [116, 116], rl: [-104, -110], ll: [-102, -108], rfo: 90, lfo: 90 },
  ] },
});
def({
  id: 'shadow-box', name: 'Shadow Boxing', cat: 'cardio', type: 'time', time: 40, primary: ['shoulders'], secondary: ['abs', 'obliques', 'calves'], met: 7.8,
  steps: ['Stand in a staggered stance, hands up guarding your face.', 'Throw quick straight punches, alternating hands.', 'Stay light on your feet and keep the guard up.'],
  tips: ['Exhale sharply with each punch.', 'Rotate through the hips.'],
  mistakes: ['Dropping the guard', 'Locking the elbows hard'],
  anim: { tempo: 1, ax: 'pelvis', fists: true, frames: [
    P({ t: 6, ra: [92, 92], la: [40, 150], rl: [16, 6], ll: [-16, -6], rfo: 80 }),
    P({ t: 6, ra: [40, 150], la: [92, 92], rl: [16, 6], ll: [-16, -6], rfo: 80, lift: 3 }),
  ] },
});
def({
  id: 'arm-circles', name: 'Arm Circles', cat: 'mobility', type: 'time', time: 30, primary: ['shoulders'], met: 2.5,
  steps: ['Stand tall with arms straight out to your sides.', 'Make smooth circles with your arms.', 'Switch direction halfway.'],
  tips: ['Move slowly and use the full range.'],
  mistakes: ['Shrugging the shoulders'],
  // arms held out to the sides, tracing circles (forward, up, back, down)
  anim: { tempo: 1.6, frames: [
    P({ ra: [24, 24], la: [24, 24], rab: [90, 90], lab: [90, 90] }),
    P({ ra: [0, 0], la: [0, 0], rab: [112, 112], lab: [112, 112] }),
    P({ ra: [-24, -24], la: [-24, -24], rab: [90, 90], lab: [90, 90] }),
    P({ ra: [0, 0], la: [0, 0], rab: [68, 68], lab: [68, 68] }),
  ] },
});

/* ===================== CORE ===================== */
def({
  id: 'plank', name: 'Forearm Plank', cat: 'core', type: 'time', time: 45, primary: ['abs'], secondary: ['shoulders', 'glutes', 'lowerback'], met: 3.8, equip: ['none', 'mat'],
  steps: ['Place forearms on the floor, elbows under shoulders.', 'Extend legs back and lift your body.', 'Form a straight line from head to heels.', 'Hold while breathing steadily.'],
  tips: ['Squeeze glutes and pull belly button in.', 'Push the floor away with your forearms.'],
  mistakes: ['Hips sagging', 'Butt piking up', 'Holding your breath'],
  anim: { tempo: 3, lv: ['rElbow', 'rToe'], ax: 'rElbow', props: [{ type: 'mat' }], frames: [{ t: 82, n: 88, ra: [0, 90], la: [2, 92], rl: [-82, -82], ll: [-84, -84], rfo: 80, lfo: 80 }] },
});
def({
  id: 'high-plank', name: 'High Plank', cat: 'core', type: 'time', time: 40, primary: ['abs'], secondary: ['shoulders', 'chest'], met: 3.8, equip: ['none', 'mat'],
  steps: ['Hands under shoulders, arms straight.', 'Legs extended, weight on the balls of the feet.', 'Keep a long straight line from head to heels.'],
  tips: ['Spread your fingers wide.'],
  mistakes: ['Locking elbows hard', 'Sagging hips'],
  anim: { tempo: 3, lv: ['rHand', 'rToe'], ax: 'rHand', props: [{ type: 'mat' }], frames: [{ ...PLANK_HI }] },
});
def({
  id: 'mountain-climber', name: 'Mountain Climbers', cat: 'cardio', type: 'time', time: 30, primary: ['abs', 'hipflexors'], secondary: ['shoulders', 'quads'], met: 8,
  steps: ['Start in a high plank.', 'Drive one knee toward your chest.', 'Quickly switch legs, like running in place.', 'Keep hips low and shoulders over wrists.'],
  tips: ['Speed up only if form stays solid.'],
  mistakes: ['Bouncing hips up and down', 'Shoulders drifting behind the hands'],
  anim: { tempo: 0.8, lv: ['rHand', ['rToe', 'lToe']], ax: 'rHand', frames: [
    { ...PLANK_HI, rl: [72, -78], ll: [-74, -74], rfo: 100 },
    { ...PLANK_HI, rl: [-74, -74], ll: [72, -78], lfo: 100 },
  ] },
});
def({
  id: 'crunch', name: 'Crunch', cat: 'core', primary: ['abs'], reps: 15, met: 3.8, equip: ['none', 'mat'],
  steps: ['Lie on your back, knees bent, feet flat.', 'Reach your hands toward your knees.', 'Curl your shoulders off the floor using your abs.', 'Lower slowly.'],
  tips: ['Exhale as you crunch up.'],
  mistakes: ['Pulling on the neck', 'Using momentum'],
  anim: { tempo: 2, lv: ['pelvis', 'rHeel'], ax: 'rHeel', props: [{ type: 'mat' }], frames: [
    { ...SUP, ra: [92, 92], la: [90, 90] },
    { ...SUP, t: -58, n: -45, ra: [112, 104], la: [110, 102] },
  ] },
});
def({
  id: 'sit-up', name: 'Sit-up', cat: 'core', primary: ['abs', 'hipflexors'], reps: 12, met: 4.5, equip: ['none', 'mat'],
  steps: ['Lie on your back with knees bent and feet anchored.', 'Cross arms over your chest.', 'Sit all the way up.', 'Roll back down one vertebra at a time.'],
  tips: ['Keep the movement smooth—no yanking.'],
  mistakes: ['Jerking the head forward'],
  anim: { tempo: 2.6, lv: ['pelvis', 'rHeel'], ax: 'rHeel', props: [{ type: 'mat' }], frames: [
    { ...SUP, ra: [120, 255], la: [118, 253] },
    { ...SUP, t: -10, n: 0, ra: [40, 175], la: [38, 173] },
  ] },
});
def({
  id: 'bicycle', name: 'Bicycle Crunch', cat: 'core', primary: ['obliques', 'abs'], reps: 20, met: 5, equip: ['none', 'mat'],
  steps: ['Lie on your back, hands lightly behind your head.', 'Lift shoulders and legs off the floor.', 'Bring one elbow toward the opposite knee while extending the other leg.', 'Alternate sides in a pedalling motion.'],
  tips: ['Slow and controlled beats fast and sloppy.'],
  mistakes: ['Pulling on the neck', 'Only moving the elbows'],
  anim: { tempo: 1.6, lv: ['pelvis', 'pelvis'], elbowsOut: true, props: [{ type: 'mat' }], frames: [
    { t: -62, n: -50, ra: [-150, 40], la: [-150, 40], rl: [140, 50], ll: [100, 100], rfo: 80, lfo: 80 },
    { t: -62, n: -50, ra: [-150, 40], la: [-150, 40], rl: [100, 100], ll: [140, 50], rfo: 80, lfo: 80 },
  ] },
});
def({
  id: 'leg-raise', name: 'Lying Leg Raise', cat: 'core', primary: ['abs', 'hipflexors'], reps: 12, met: 4, equip: ['none', 'mat'],
  steps: ['Lie on your back, legs straight, hands under your hips.', 'Lift your legs to vertical keeping them straight.', 'Lower slowly until just above the floor.'],
  tips: ['Press your lower back into the floor.'],
  mistakes: ['Arching the back', 'Dropping the legs fast'],
  anim: { tempo: 2.6, ax: 'pelvis', props: [{ type: 'mat' }], frames: [
    { t: -90, n: -90, ra: [96, 96], la: [94, 94], rl: [96, 96], ll: [94, 94], rfo: 70, lfo: 70 },
    { t: -90, n: -90, ra: [96, 96], la: [94, 94], rl: [176, 176], ll: [174, 174], rfo: 70, lfo: 70 },
  ] },
});
def({
  id: 'flutter-kick', name: 'Flutter Kicks', cat: 'core', type: 'time', time: 30, primary: ['abs', 'hipflexors'], met: 4.5, equip: ['none', 'mat'],
  steps: ['Lie on your back, legs extended, hands under hips.', 'Lift your heels a few inches off the floor.', 'Kick the legs up and down in small, quick alternating motions.'],
  tips: ['Keep the lower back glued to the floor.'],
  mistakes: ['Arching the back'],
  anim: { tempo: 0.7, ax: 'pelvis', props: [{ type: 'mat' }], frames: [
    { t: -86, n: -70, ra: [96, 96], la: [94, 94], rl: [118, 118], ll: [100, 100], rfo: 70, lfo: 70 },
    { t: -86, n: -70, ra: [96, 96], la: [94, 94], rl: [100, 100], ll: [118, 118], rfo: 70, lfo: 70 },
  ] },
});
def({
  id: 'hollow-hold', name: 'Hollow Body Hold', cat: 'core', type: 'time', time: 30, primary: ['abs'], secondary: ['hipflexors'], met: 4, equip: ['none', 'mat'],
  steps: ['Lie on your back and reach your arms overhead.', 'Lift your shoulders and legs off the floor.', 'Press your lower back down and hold a banana shape.'],
  tips: ['Bend the knees to make it easier.'],
  mistakes: ['Lower back peeling off the floor'],
  anim: { tempo: 3, ax: 'pelvis', props: [{ type: 'mat' }], frames: [{ t: -76, n: -66, ra: [-116, -112], la: [-118, -114], rl: [106, 106], ll: [104, 104], rfo: 70, lfo: 70 }] },
});
def({
  id: 'dead-bug', name: 'Dead Bug', cat: 'core', primary: ['abs'], secondary: ['hipflexors'], reps: 12, met: 3.5, equip: ['none', 'mat'],
  steps: ['Lie on your back with arms straight up and knees bent at 90°.', 'Lower one arm overhead and the opposite leg toward the floor.', 'Return and switch sides.'],
  tips: ['Move slowly and exhale as you extend.'],
  mistakes: ['Lower back arching off the floor'],
  anim: { tempo: 3, ax: 'pelvis', props: [{ type: 'mat' }], frames: [
    { t: -90, n: -88, ra: [180, 180], la: [176, 176], rl: [178, 92], ll: [176, 90] },
    { t: -90, n: -88, ra: [180, 180], la: [260, 260], rl: [100, 100], ll: [176, 90], rfo: 70 },
    { t: -90, n: -88, ra: [180, 180], la: [176, 176], rl: [178, 92], ll: [176, 90] },
    { t: -90, n: -88, ra: [260, 260], la: [176, 176], rl: [178, 92], ll: [100, 100], lfo: 70 },
  ] },
});
def({
  id: 'russian-twist', name: 'Russian Twist', cat: 'core', primary: ['obliques'], secondary: ['abs'], reps: 20, met: 4.5, equip: ['none', 'mat'],
  steps: ['Sit with knees bent and lean back to ~45°.', 'Lift your feet if you can.', 'Rotate your torso to tap your hands beside each hip.'],
  tips: ['Rotate from the ribs, not just the arms.'],
  mistakes: ['Rounding the back', 'Just swinging the arms'],
  anim: { tempo: 1.6, lv: ['pelvis', 'pelvis'], ax: 'pelvis', props: [{ type: 'mat' }], frames: [
    // hands clasped in front; the whole upper body turns to tap beside one hip, then the other
    { t: -38, n: -26, ra: [62, 96], la: [62, 96], rasw: -22, lasw: -22, tw: 48, rl: [130, 20], ll: [128, 18] },
    { t: -38, n: -26, ra: [62, 96], la: [62, 96], rasw: -22, lasw: -22, tw: -48, rl: [130, 20], ll: [128, 18] },
  ] },
});
def({
  id: 'v-up', name: 'V-up', cat: 'core', primary: ['abs'], secondary: ['hipflexors'], reps: 10, met: 6, equip: ['none', 'mat'],
  steps: ['Lie flat with arms overhead.', 'Simultaneously lift legs and torso, reaching hands to toes.', 'Lower back down with control.'],
  tips: ['Bend the knees for a tuck-up variation.'],
  mistakes: ['Flopping back down'],
  anim: { tempo: 2, ax: 'pelvis', props: [{ type: 'mat' }], frames: [
    { t: -92, n: -92, ra: [-90, -90], la: [-92, -92], rl: [92, 92], ll: [90, 90], rfo: 70, lfo: 70 },
    { t: -42, n: -30, ra: [-220, -220], la: [-222, -222], rl: [148, 148], ll: [146, 146], rfo: 70, lfo: 70 },
  ] },
});
def({
  id: 'reverse-crunch', name: 'Reverse Crunch', cat: 'core', primary: ['abs'], reps: 12, met: 4, equip: ['none', 'mat'],
  steps: ['Lie on your back with knees bent, feet lifted.', 'Curl your hips off the floor, bringing knees toward chest.', 'Lower slowly.'],
  tips: ['Think of peeling your tailbone off the floor.'],
  mistakes: ['Swinging the legs'],
  anim: { tempo: 2.2, ax: 'shoulder', props: [{ type: 'mat' }], frames: [
    { t: -90, n: -90, ra: [96, 96], la: [94, 94], rl: [140, 30], ll: [138, 28] },
    { t: -112, n: -92, ra: [100, 100], la: [98, 98], rl: [200, 60], ll: [198, 58] },
  ] },
});
def({
  id: 'bird-dog', name: 'Bird Dog', cat: 'core', primary: ['abs', 'lowerback'], secondary: ['glutes', 'shoulders'], reps: 10, perSide: true, met: 3, equip: ['none', 'mat'],
  steps: ['Start on hands and knees.', 'Extend one arm forward and the opposite leg back.', 'Hold for a breath, keeping hips level.', 'Return and switch sides.'],
  tips: ['Imagine balancing a glass of water on your back.'],
  mistakes: ['Rotating the hips', 'Arching the lower back'],
  anim: { tempo: 3.2, lv: ['rHand', 'rKnee'], ax: 'rHand', props: [{ type: 'mat' }], frames: [
    { t: 74, n: 80, ra: [0, 0], la: [2, 2], rl: [0, -90], ll: [2, -88], rfo: 4, lfo: 4 },
    { t: 74, n: 78, ra: [0, 0], la: [98, 98], rl: [-104, -104], ll: [2, -88], rfo: 90, lfo: 4, lv: ['rHand', 'lKnee'] },
    { t: 74, n: 80, ra: [0, 0], la: [2, 2], rl: [0, -90], ll: [2, -88], rfo: 4, lfo: 4 },
    { t: 74, n: 78, ra: [98, 98], la: [0, 0], rl: [0, -90], ll: [-104, -104], rfo: 4, lfo: 90, lv: ['lHand', 'rKnee'] },
  ] },
});

/* ===================== CARDIO ===================== */
def({
  id: 'jumping-jack', name: 'Jumping Jacks', cat: 'cardio', type: 'time', time: 40, primary: ['calves', 'shoulders'], secondary: ['quads', 'glutes'], met: 8,
  steps: ['Stand with feet together and arms by your sides.', 'Jump your feet out wide while swinging arms overhead.', 'Jump back to the start.', 'Keep a steady rhythm.'],
  tips: ['Stay on the balls of your feet.'],
  mistakes: ['Landing heavily on the heels'],
  // a frontal-plane move: arms sweep out to the sides and overhead, feet jump out wide and back
  anim: { tempo: 0.9, ax: 'pelvis', d: [1, 0.25, 1, 0.25], frames: [
    P({ ra: [2, 2], la: [2, 2], rab: [10, 12], lab: [10, 12], rl: [2, 0], ll: [2, 0], rfo: 70, lfo: 70 }),
    P({ ra: [4, 4], la: [4, 4], rab: [92, 96], lab: [92, 96], rl: [4, -2], ll: [4, -2], rlab: 9, llab: 9, lift: 12 }),
    P({ ra: [4, 4], la: [4, 4], rab: [168, 174], lab: [168, 174], rl: [6, -4], ll: [6, -4], rlab: 17, llab: 17, rto: 14, lto: 14, rfo: 80, lfo: 80 }),
    P({ ra: [4, 4], la: [4, 4], rab: [92, 96], lab: [92, 96], rl: [4, -2], ll: [4, -2], rlab: 9, llab: 9, lift: 12 }),
  ] },
});
def({
  id: 'high-knees', name: 'High Knees', cat: 'cardio', type: 'time', time: 30, primary: ['hipflexors', 'quads'], secondary: ['calves', 'abs'], met: 8,
  steps: ['Stand tall with arms bent.', 'Drive one knee up to hip height.', 'Quickly switch legs, pumping your arms.', 'Stay on the balls of your feet.'],
  tips: ['Lean back very slightly and keep your chest up.'],
  mistakes: ['Knees only reaching halfway'],
  anim: { tempo: 0.7, ax: 'pelvis', frames: [
    P({ t: -2, ra: [-36, 50], la: [40, 120], rl: [92, 0], ll: [-2, 0], rfo: 70, lfo: 60, lift: 4 }),
    P({ t: -2, ra: [40, 120], la: [-36, 50], rl: [-2, 0], ll: [92, 0], rfo: 60, lfo: 70, lift: 4 }),
  ] },
});
def({
  id: 'butt-kick', name: 'Butt Kicks', cat: 'cardio', type: 'time', time: 30, primary: ['hamstrings'], secondary: ['calves', 'quads'], met: 8,
  steps: ['Jog in place.', 'Kick your heels up toward your glutes.', 'Pump your arms and keep a quick pace.'],
  tips: ['Keep your knees pointing down.'],
  mistakes: ['Leaning forward'],
  anim: { tempo: 0.7, ax: 'pelvis', frames: [
    P({ t: 4, ra: [-36, 50], la: [40, 120], rl: [-6, -160], ll: [0, 0], rfo: 60, lfo: 60, lift: 4 }),
    P({ t: 4, ra: [40, 120], la: [-36, 50], rl: [0, 0], ll: [-6, -160], rfo: 60, lfo: 60, lift: 4 }),
  ] },
});
def({
  id: 'march', name: 'Marching in Place', cat: 'cardio', type: 'time', time: 45, primary: ['hipflexors'], secondary: ['calves', 'quads'], met: 3.5,
  steps: ['Stand tall.', 'Lift one knee up to hip height while swinging the opposite arm.', 'Alternate legs at a steady pace.'],
  tips: ['A low-impact way to raise your heart rate.'],
  mistakes: ['Slouching'],
  anim: { tempo: 1.2, ax: 'pelvis', frames: [
    P({ ra: [-26, -10], la: [36, 70], rl: [80, 0], ll: [0, 0], rfo: 80 }),
    P({ ra: [36, 70], la: [-26, -10], rl: [0, 0], ll: [80, 0], lfo: 80 }),
  ] },
});
def({
  id: 'burpee', name: 'Burpee', cat: 'cardio', primary: ['quads', 'chest'], secondary: ['shoulders', 'abs', 'glutes'], reps: 10, met: 10,
  steps: ['From standing, squat and place your hands on the floor.', 'Jump your feet back into a plank.', 'Jump your feet back in toward your hands.', 'Explode up with a jump, reaching overhead.'],
  tips: ['Step back instead of jumping to reduce impact.'],
  mistakes: ['Sagging hips in the plank', 'Landing stiff-legged'],
  anim: { tempo: 2.4, d: [0.8, 1, 0.8, 0.9, 0.6], frames: [
    P({ ra: [6, 6], la: [-2, -2], ax: 'rAnkle' }),
    P({ t: 58, n: 52, ra: [10, 10], la: [8, 8], rl: [98, -30], ll: [96, -32], lv: ['rHand', 'rToe'], ax: 'rHand' }),
    { ...PLANK_HI, ra: [8, 8], la: [10, 10], lv: ['rHand', 'rToe'], ax: 'rHand' },
    P({ t: 58, n: 52, ra: [10, 10], la: [8, 8], rl: [98, -30], ll: [96, -32], lv: ['rHand', 'rToe'], ax: 'rHand' }),
    P({ t: 2, ra: [172, 176], la: [168, 172], rl: [0, -2], ll: [-2, -4], rfo: 45, lfo: 45, lift: 24, ax: 'rAnkle' }),
  ] },
});
def({
  id: 'jump-rope', name: 'Jump Rope', cat: 'cardio', type: 'time', time: 60, equip: ['rope'], primary: ['calves'], secondary: ['shoulders', 'forearms', 'quads'], met: 11,
  steps: ['Hold the handles at hip height, elbows close.', 'Turn the rope with your wrists.', 'Hop just high enough to clear the rope.', 'Land softly on the balls of your feet.'],
  tips: ['Small hops, quick wrists.'],
  mistakes: ['Big arm circles', 'Jumping too high'],
  anim: { tempo: 0.6, ax: 'pelvis', rope: true, frames: [
    P({ ra: [20, 60], la: [16, 56], rl: [2, -2], ll: [0, -4], rfo: 60, lfo: 60, lift: 10 }),
    P({ ra: [22, 70], la: [18, 66], rl: [6, -6], ll: [4, -8] }),
  ] },
});
def({
  id: 'inchworm', name: 'Inchworm', cat: 'mobility', primary: ['hamstrings', 'shoulders'], secondary: ['abs', 'chest'], reps: 6, met: 4,
  steps: ['Stand tall, then fold forward and place hands on the floor.', 'Walk your hands out into a high plank.', 'Walk your hands back toward your feet.', 'Roll up to standing.'],
  tips: ['Keep legs as straight as comfortable.'],
  mistakes: ['Sagging hips in the plank'],
  anim: { tempo: 4.4, ax: 'rToe', frames: [
    P({}),
    P({ t: 118, n: 120, ra: [6, 6], la: [8, 8], rl: [-4, -4], ll: [-6, -6], lv: ['rHand', 'rToe'] }),
    { ...PLANK_HI, lv: ['rHand', 'rToe'] },
    P({ t: 118, n: 120, ra: [6, 6], la: [8, 8], rl: [-4, -4], ll: [-6, -6], lv: ['rHand', 'rToe'] }),
  ] },
});

/* ===================== MOBILITY ===================== */
def({
  id: 'down-dog', name: 'Downward Dog', cat: 'mobility', type: 'time', time: 40, primary: ['hamstrings', 'calves', 'shoulders'], met: 2.5, equip: ['none', 'mat'],
  steps: ['From hands and knees, tuck your toes.', 'Lift your hips up and back into an inverted V.', 'Press your chest toward your thighs, heels toward the floor.', 'Breathe deeply.'],
  tips: ['Bend the knees if hamstrings are tight.'],
  mistakes: ['Rounding the back to straighten the legs'],
  anim: { tempo: 4, lv: ['rHand', 'rHeel'], ax: 'rHand', props: [{ type: 'mat' }], frames: [{ t: 138, n: 138, ra: [42, 42], la: [44, 44], rl: [-40, -40], ll: [-42, -42], rfo: 92, lfo: 92 }] },
});
def({
  id: 'cobra', name: 'Cobra Stretch', cat: 'mobility', type: 'time', time: 30, primary: ['abs', 'lowerback'], secondary: ['chest'], met: 2.3, equip: ['none', 'mat'],
  steps: ['Lie face down with hands under your shoulders.', 'Press up gently, lifting your chest.', 'Keep hips on the floor and shoulders relaxed.', 'Breathe into the stretch.'],
  tips: ['Only go as high as feels comfortable.'],
  mistakes: ['Shrugging shoulders to ears'],
  // hands and hips on the floor (levelled), thighs sloping down so the knees rest too
  anim: { tempo: 4, ax: 'rHand', lv: ['rHand', 'pelvis'], props: [{ type: 'mat' }], frames: [
    { t: 90, n: 92, ra: [-100, 55], la: [-102, 53], rl: [-82, -90], ll: [-82, -90], rfo: 4, lfo: 4 },
    { t: 34, n: 12, ra: [-10, 40], la: [-8, 42], rl: [-82, -90], ll: [-82, -90], rfo: 4, lfo: 4 },
  ] },
});
def({
  id: 'childs-pose', name: "Child's Pose", cat: 'mobility', type: 'time', time: 40, primary: ['lowerback', 'lats'], secondary: ['glutes'], met: 2, equip: ['none', 'mat'],
  steps: ['Kneel and sit back on your heels.', 'Fold forward and walk your hands out in front.', 'Rest your forehead toward the floor.', 'Breathe slowly and relax.'],
  tips: ['Widen your knees for more space.'],
  mistakes: ['Holding tension in the shoulders'],
  anim: { tempo: 4, lv: ['rKnee', 'rHand'], ax: 'rKnee', props: [{ type: 'mat' }], frames: [{ t: 104, n: 88, ra: [80, 82], la: [82, 84], rl: [62, -90], ll: [60, -92], rfo: 4, lfo: 4 }] },
});
def({
  id: 'cat-cow', name: 'Cat–Cow', cat: 'mobility', type: 'time', time: 40, primary: ['lowerback', 'abs'], met: 2.3, equip: ['none', 'mat'],
  steps: ['Start on hands and knees.', 'Inhale: drop the belly, lift chest and tailbone (cow).', 'Exhale: round the spine, tuck chin and tailbone (cat).', 'Flow slowly with your breath.'],
  tips: ['Move one vertebra at a time.'],
  mistakes: ['Rushing through the movement'],
  anim: { tempo: 4.4, lv: ['rHand', 'rKnee'], ax: 'rHand', props: [{ type: 'mat' }], frames: [
    { t: 70, n: 48, ra: [0, 0], la: [2, 2], rl: [2, -90], ll: [4, -88], rfo: 4, lfo: 4 },
    { t: 78, n: 135, ra: [0, 0], la: [2, 2], rl: [-4, -90], ll: [-2, -88], rfo: 4, lfo: 4 },
  ] },
});
def({
  id: 'hamstring-stretch', name: 'Standing Hamstring Stretch', cat: 'mobility', type: 'time', time: 30, primary: ['hamstrings'], secondary: ['lowerback', 'calves'], met: 2.3,
  steps: ['Stand with feet hip-width.', 'Hinge at the hips and reach toward your toes.', 'Let your head hang heavy.', 'Breathe and relax deeper each exhale.'],
  tips: ['Soft knees are fine.'],
  mistakes: ['Bouncing'],
  anim: { tempo: 4, frames: [P({ t: 108, n: 125, ra: [6, 6], la: [8, 8], rl: [-8, -8], ll: [-10, -10] })] },
});
def({
  id: 'hip-flexor-stretch', name: 'Kneeling Hip Flexor Stretch', cat: 'mobility', type: 'time', time: 30, perSide: true, primary: ['hipflexors'], secondary: ['quads'], met: 2.3, equip: ['none', 'mat'],
  steps: ['Kneel on one knee with the other foot forward.', 'Tuck your pelvis and shift your hips forward.', 'Reach the arm on the kneeling side overhead.', 'Hold, then switch sides.'],
  tips: ['Squeeze the glute of the kneeling leg.'],
  mistakes: ['Arching the lower back instead of moving the hips'],
  anim: { tempo: 4, ax: 'rAnkle', props: [{ type: 'mat' }], frames: [P({ t: -4, ra: [10, 10], la: [150, 158], rl: [70, -10], ll: [-30, -90], lfo: 4 })] },
});
def({
  id: 'toe-touch', name: 'Toe Touches', cat: 'mobility', type: 'time', time: 30, primary: ['hamstrings'], secondary: ['lowerback', 'shoulders'], met: 3,
  steps: ['Stand tall, arms overhead.', 'Hinge and reach down toward your toes.', 'Rise back up reaching tall.', 'Repeat in a smooth rhythm.'],
  tips: ['Exhale on the way down.'],
  mistakes: ['Locking the knees hard'],
  anim: { tempo: 2.6, frames: [P({ ra: [164, 168], la: [158, 162] }), P({ t: 116, n: 130, ra: [0, 0], la: [2, 2], rl: [-8, -8], ll: [-10, -10] })] },
});
def({
  id: 'squat-reach', name: 'Squat to Overhead Reach', cat: 'mobility', primary: ['quads', 'shoulders'], secondary: ['glutes'], reps: 10, met: 4,
  steps: ['Sit into a deep squat with hands at your chest.', 'Stand up and reach both arms overhead.', 'Rise onto your toes at the top.', 'Return to the squat.'],
  tips: ['Breathe in as you reach up.'],
  mistakes: ['Rounding the back in the squat'],
  anim: { tempo: 2.8, frames: [P({ t: 34, ra: [40, 160], la: [36, 156], rl: [92, -30], ll: [90, -32] }), P({ ra: [164, 168], la: [158, 162], rfo: 45, lfo: 45 })] },
});
def({
  id: 'knee-hug', name: 'Lying Knee Hug', cat: 'mobility', type: 'time', time: 30, primary: ['lowerback', 'glutes'], met: 2, equip: ['none', 'mat'],
  steps: ['Lie on your back.', 'Hug both knees to your chest.', 'Gently rock side to side if it feels good.'],
  tips: ['Relax your shoulders into the floor.'],
  mistakes: ['Lifting the head and straining the neck'],
  anim: { tempo: 4, ax: 'pelvis', props: [{ type: 'mat' }], frames: [{ t: -92, n: -90, ra: [73, 153], la: [71, 151], rl: [-168, 72], ll: [-170, 70] }] },
});

/* ===================== MASCOT (not listed) ===================== */
const mascot = (o) => def({ hidden: true, cat: 'default', primary: [], steps: [], ...o });
mascot({ id: 'wave', name: 'Hello', anim: { tempo: 1.1, frames: [P({ ra: [150, 175], la: [-4, 0] }), P({ ra: [150, 215], la: [-4, 0] })] } });
mascot({ id: 'celebrate', name: 'Celebrate', anim: { tempo: 1, ax: 'pelvis', frames: [
  P({ t: 10, ra: [60, 150], la: [56, 146], rl: [40, -40], ll: [38, -42] }),
  P({ t: -4, ra: [165, 160], la: [195, 200], rl: [6, -20], ll: [-10, -30], rfo: 50, lfo: 50, lift: 30 }),
] } });
mascot({ id: 'meditate', name: 'Rest', cat: 'mobility', anim: { tempo: 4, frames: [{ t: 0, n: 4, ra: [30, 70], la: [26, 66], rl: [82, -78], ll: [86, -70], rfo: 70, lfo: 70 }] } });
mascot({ id: 'flex', name: 'Strong', anim: { tempo: 1.6, frames: [P({ ra: [92, 175], la: [80, 165] }), P({ ra: [96, 150], la: [84, 140] })] } });

// Moves retired by a library refresh (most skipped / thumbs-down, from the in-app
// move feedback report). They stay defined so past sessions still show their names.
export const ARCHIVED = [];
for (const e of EX) if (ARCHIVED.includes(e.id)) e.archived = true;
export const EXERCISES = EX.filter((e) => !e.hidden && !e.archived);
export const EX_BY_ID = Object.fromEntries(EX.map((e) => [e.id, e]));
export const getEx = (id) => EX_BY_ID[id];
