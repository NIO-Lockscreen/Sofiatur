// A woman's voice from the Piper voice (24 November 2026). «Talesyntese» is a man's voice (about 125 Hz), and there is no Norwegian woman's voice
// that is both clear and small enough for an iPad (the women in Piper's «nvcc» lose about half the words). So the clip is changed here, on the device:
// 1. Every frequency is raised by FORMANT (1.18) by reading the clip faster. That moves the formants, the resonances of the mouth and throat that make
//    a voice sound like a man or a woman, to where a woman's are (about 15–20 % higher), and the pitch with them.
// 2. TD-PSOLA (pitch-synchronous overlap-add) then raises the pitch the rest of the way and stretches the clip back to its own length, without moving
//    the formants again: each period of the voice is cut out with a window round its peak and laid down again closer together.
// Together the pitch goes up PITCH (1.7) times, from about 125 to about 210 Hz, a woman's, while the words stay as clear (see the tests and README).
export const FORMANT = 1.18, PITCH = 1.7;

// Read x at rate k (k > 1: higher and shorter), with cubic interpolation.
function resample(x, k) {
  const n = Math.floor((x.length - 1) / k), y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i * k, j = Math.floor(t), f = t - j;
    const a = x[j - 1] ?? x[j], b = x[j], c = x[j + 1] ?? b, d = x[j + 2] ?? c;
    y[i] = b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a)));
  }
  return y;
}

// The period (in samples) at every hop, 0 where the sound is not voiced: normalised autocorrelation over 30 ms, periods for 70–450 Hz. It is
// worked out at half the sample rate (five times less work) and then refined to the sample at the full rate.
function periods(x, sr, hop) {
  const h = new Float32Array(x.length >> 1);
  for (let i = 0; i < h.length; i++) h[i] = (x[2 * i] + x[2 * i + 1]) * 0.5;
  const hsr = sr / 2, win = Math.round(0.03 * hsr), lo = Math.floor(hsr / 450), hi = Math.ceil(hsr / 70), out = new Int32Array(Math.ceil(x.length / hop));
  const score = new Float32Array(hi + 2);
  let prev = 0;
  for (let f = 0; f < out.length; f++) {
    const s = ((f * hop) >> 1) - (win >> 1);
    if (s < 0 || s + win + hi + 1 >= h.length) continue;
    let e0 = 0;
    for (let i = 0; i < win; i++) e0 += h[s + i] * h[s + i];
    if (e0 / win < 1e-5) { prev = 0; continue; }
    let best = 0, bestK = 0;
    for (let k = lo; k <= hi + 1; k++) {
      let c = 0, e1 = 0;
      for (let i = 0; i < win; i++) { const v = h[s + i + k]; c += h[s + i] * v; e1 += v * v; }
      score[k] = c / Math.sqrt(e0 * e1 + 1e-12);
      if (k <= hi && score[k] > best) { best = score[k]; bestK = k; }
    }
    if (best < 0.5) { prev = 0; continue; }
    // The first strong peak, not a multiple of the period: the shortest lag within 10 % of the best.
    for (let k = lo + 1; k < hi; k++) if (score[k] >= best * 0.9 && score[k] >= score[k - 1] && score[k] >= score[k + 1]) { bestK = k; break; }
    // To the full rate: the peak of a parabola through the three scores round it.
    const a = score[bestK - 1] ?? 0, b = score[bestK], c = score[bestK + 1] ?? 0, d = a - 2 * b + c;
    let period = Math.round(2 * (bestK + (d < 0 ? 0.5 * (a - c) / d : 0)));
    // Keep it near the period just before (no jumps of an octave between hops).
    if (prev && (period > prev * 1.6 || period < prev / 1.6)) period = prev;
    out[f] = prev = period;
  }
  // Fill single gaps inside voiced stretches, so a period missing for one hop does not break the voice up.
  for (let f = 1; f < out.length - 1; f++) if (!out[f] && out[f - 1] && out[f + 1]) out[f] = (out[f - 1] + out[f + 1]) >> 1;
  return out;
}

// Pitch marks: in voiced stretches one at the peak of each period, elsewhere every 5 ms. Each with its period and whether it is voiced.
function marks(x, sr, per, hop) {
  const list = [], step = Math.round(0.005 * sr);
  let t = 0;
  while (t < x.length) {
    const p = per[Math.min(per.length - 1, Math.floor(t / hop))];
    if (p) {
      // the largest sample within a third of a period after the expected place
      let m = t, peak = -1;
      for (let i = t; i < Math.min(x.length, t + Math.max(2, Math.floor(p / 3))); i++) { const v = Math.abs(x[i]); if (v > peak) { peak = v; m = i; } }
      list.push({ at: m, period: p, voiced: true });
      t = m + p;
    } else { list.push({ at: t, period: step, voiced: false }); t += step; }
  }
  return list;
}

// TD-PSOLA: pitch times beta, length times stretch, formants kept.
function psola(x, sr, beta, stretch) {
  const hop = Math.round(0.005 * sr), per = periods(x, sr, hop), mk = marks(x, sr, per, hop);
  const n = Math.round(x.length * stretch), out = new Float32Array(n), weight = new Float32Array(n);
  if (!mk.length) return out;
  let ts = 0, k = 0;
  while (ts < n) {
    const ta = ts / stretch;
    while (k + 1 < mk.length && Math.abs(mk[k + 1].at - ta) <= Math.abs(mk[k].at - ta)) k++;
    const { at, period, voiced } = mk[k], half = period;
    // A Hann window two periods wide round the mark, laid down at ts.
    for (let i = -half; i <= half; i++) {
      const src = at + i, dst = Math.round(ts) + i;
      if (src < 0 || src >= x.length || dst < 0 || dst >= n) continue;
      const w = 0.5 + 0.5 * Math.cos(Math.PI * i / (half + 1));
      out[dst] += x[src] * w; weight[dst] += w;
    }
    ts += voiced ? period / beta : period;
  }
  // Divide by the sum of the windows, so closer grains do not make the voice louder.
  for (let i = 0; i < n; i++) if (weight[i] > 0.15) out[i] /= weight[i]; else out[i] *= 1 / 0.15;
  return out;
}

// The woman's voice: the clip (Float32Array, mono) at sampleRate in, the same length and loudness out.
export function womanVoice(pcm, sampleRate, { formant = FORMANT, pitch = PITCH } = {}) {
  if (!pcm.length) return pcm;
  const raised = resample(pcm, formant);
  const out = psola(raised, sampleRate, pitch / formant, pcm.length / raised.length);
  let a = 0, b = 0;
  for (let i = 0; i < pcm.length; i++) a = Math.max(a, Math.abs(pcm[i]));
  for (let i = 0; i < out.length; i++) b = Math.max(b, Math.abs(out[i]));
  if (b > 0) { const g = a / b; for (let i = 0; i < out.length; i++) out[i] *= g; }
  return out;
}
