// Raw YouCam replies (Skin Analysis, Facial Color Tones Analyzer, Face Analyzer) for the sample portraits,
// recorded 2026-11-01 on each photo's face crop. Signed mask URLs are stripped; they expire after a day.
import a from './a.json';
import b from './b.json';
import c from './c.json';
import d from './d.json';
import e from './e.json';

export const RECORDED: Record<string, { skin: unknown; tone: unknown; face: unknown }> = { a, b, c, d, e };
