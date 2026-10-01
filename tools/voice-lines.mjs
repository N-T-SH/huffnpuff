// Prints every voice-coach clip as JSON (input for tools/build-audio.py).
import { EXERCISES } from '../js/exercises.js';
import { allLines } from '../js/voice-lines.js';
process.stdout.write(JSON.stringify(allLines(EXERCISES), null, 1));
