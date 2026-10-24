/**
 * Generador de música de demostración ORIGINAL (síntesis procedural, sin muestras de terceros).
 * Produce WAV mono 22,05 kHz 16 bits. Todo el contenido es propiedad del proyecto: se publica
 * etiquetado como demo (tracks.is_demo = true) y con licencia CC0.
 */
const RATE = 22050;

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {{ seconds: number, bpm: number, root: number, progression: number[][], seed: number, style: 'lofi'|'synth'|'ambient'|'pulse' }} spec
 */
export function renderTrack(spec) {
  const total = Math.floor(spec.seconds * RATE);
  const out = new Float32Array(total);
  const rnd = mulberry32(spec.seed);
  const beat = (60 / spec.bpm) * RATE;
  const bar = beat * 4;
  const chordAt = (i) => spec.progression[Math.floor(i / bar) % spec.progression.length];

  // Acordes (pad) con envolvente suave
  for (let i = 0; i < total; i++) {
    const chord = chordAt(i);
    const pos = (i % bar) / bar;
    const env = Math.min(1, pos * 8) * (1 - pos * 0.4);
    let v = 0;
    for (const n of chord) {
      const f = NOTE(spec.root + n);
      const t = i / RATE;
      v +=
        spec.style === 'synth'
          ? (2 * ((t * f) % 1) - 1) * 0.35
          : Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    }
    out[i] += (v / chord.length) * 0.22 * env;
  }

  // Melodía generada por paseo aleatorio sobre la escala menor pentatónica
  const scale = [0, 3, 5, 7, 10, 12, 15, 17];
  let idx = 3;
  const step = spec.style === 'ambient' ? beat * 2 : beat / 2;
  for (let start = 0; start < total; start += step) {
    if (rnd() < (spec.style === 'ambient' ? 0.5 : 0.25)) continue;
    idx = Math.max(0, Math.min(scale.length - 1, idx + Math.round((rnd() - 0.5) * 3)));
    const f = NOTE(spec.root + 12 + scale[idx]);
    const len = Math.min(step * 0.95, total - start);
    for (let k = 0; k < len; k++) {
      const env = Math.exp((-3 * k) / len) * Math.min(1, k / 200);
      out[start + k] += Math.sin(2 * Math.PI * f * (k / RATE)) * 0.18 * env;
    }
  }

  // Percusión sintetizada (bombo, caja con ruido y charles)
  if (spec.style !== 'ambient') {
    for (let b = 0; b * beat < total; b++) {
      const s = Math.floor(b * beat);
      const kick = b % 4 === 0 || b % 4 === 2;
      if (kick) {
        for (let k = 0; k < RATE * 0.25 && s + k < total; k++) {
          const t = k / RATE;
          out[s + k] +=
            Math.sin(2 * Math.PI * (55 + 90 * Math.exp(-t * 30)) * t) * Math.exp(-t * 12) * 0.55;
        }
      } else {
        for (let k = 0; k < RATE * 0.15 && s + k < total; k++) {
          out[s + k] +=
            (rnd() * 2 - 1) * Math.exp((-k / RATE) * 25) * (spec.style === 'lofi' ? 0.12 : 0.2);
        }
      }
      const hat = Math.floor(s + beat / 2);
      for (let k = 0; k < RATE * 0.03 && hat + k < total; k++)
        out[hat + k] += (rnd() * 2 - 1) * 0.05 * Math.exp((-k / RATE) * 120);
    }
  }

  // Ruido de vinilo para lo-fi, fundido de entrada/salida y normalización
  let peak = 0;
  for (let i = 0; i < total; i++) {
    if (spec.style === 'lofi') out[i] += (rnd() * 2 - 1) * 0.006;
    const fade = Math.min(1, i / (RATE * 1.5), (total - i) / (RATE * 2.5));
    out[i] *= fade;
    peak = Math.max(peak, Math.abs(out[i]));
  }
  const gain = peak > 0 ? 0.89 / peak : 1;
  const pcm = Buffer.alloc(44 + total * 2);
  pcm.write('RIFF', 0);
  pcm.writeUInt32LE(36 + total * 2, 4);
  pcm.write('WAVEfmt ', 8);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20);
  pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(RATE, 24);
  pcm.writeUInt32LE(RATE * 2, 28);
  pcm.writeUInt16LE(2, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write('data', 36);
  pcm.writeUInt32LE(total * 2, 40);
  for (let i = 0; i < total; i++)
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * gain)) * 32767), 44 + i * 2);
  return { buffer: pcm, durationMs: Math.round((total / RATE) * 1000) };
}

export const DEMO_TRACKS = [
  {
    title: 'Luz de neón',
    genre: 'electronica',
    seconds: 75,
    bpm: 118,
    root: 57,
    progression: [
      [0, 3, 7],
      [-4, 0, 3],
      [-2, 2, 5],
      [-5, -2, 2],
    ],
    seed: 11,
    style: 'synth',
  },
  {
    title: 'Domingo lento',
    genre: 'lofi',
    seconds: 80,
    bpm: 78,
    root: 60,
    progression: [
      [0, 4, 7, 11],
      [-3, 0, 4, 7],
      [2, 5, 9, 12],
      [-5, -1, 2, 5],
    ],
    seed: 23,
    style: 'lofi',
  },
  {
    title: 'Marea interior',
    genre: 'ambient',
    seconds: 90,
    bpm: 60,
    root: 52,
    progression: [
      [0, 7, 12],
      [-3, 4, 9],
      [-5, 2, 7],
      [-7, 0, 5],
    ],
    seed: 37,
    style: 'ambient',
  },
  {
    title: 'Pulso urbano',
    genre: 'urbano',
    seconds: 70,
    bpm: 96,
    root: 55,
    progression: [
      [0, 3, 7],
      [0, 3, 7],
      [-4, 0, 3],
      [-2, 2, 5],
    ],
    seed: 41,
    style: 'pulse',
  },
  {
    title: 'Ciudad a las tres',
    genre: 'electronica',
    seconds: 72,
    bpm: 124,
    root: 62,
    progression: [
      [0, 3, 7, 10],
      [-2, 2, 5, 9],
      [-4, 0, 3, 7],
      [-5, -1, 2, 5],
    ],
    seed: 59,
    style: 'synth',
  },
];
