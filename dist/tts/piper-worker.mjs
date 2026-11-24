// Norsk nevral opplesning i en Web Worker: espeak-ng (fonemer) + ONNX Runtime (Piper-stemmen «talesyntese»).
// Alt kjører på enheten. Filene lagres i Cache Storage etter første nedlasting, så neste gang går det uten nett.
import * as ort from './ort.wasm.bundle.min.mjs';
import createEspeak from './espeak-nb.mjs';
import { textToIdSentences, normalize, trimSilence } from './piper-core.mjs';
import { womanVoice } from './voice-shift.mjs';

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1';
const CACHE = 'sofia-tts-' + VERSION;
const BASE = new URL('./', import.meta.url);
// Omtrentlige størrelser (byte) brukes bare til fremdriften når serveren ikke oppgir lengden.
const FILES = {
  config: ['no_NO-talesyntese-medium.onnx.json', 6256],
  espeakWasm: ['espeak-nb.wasm', 303108],
  espeakData: ['espeak-nb.data', 714955],
  ortWasm: ['ort-wasm-simd-threaded.wasm', 14848852],
  graph: ['no_NO-talesyntese-medium.graph.onnx', 752472],
  weights: ['no_NO-talesyntese-medium.weights.f16', 31241856],
};
// Navnet grafen bruker for vektfilen («external data», se src/fp16-weights.py).
const WEIGHTS_NAME = 'no_NO-talesyntese-medium.weights';

let espeak = null, session = null, config = null;
const jobs = [];
const cancelled = new Set();
let busy = false, running = null;

const post = (msg, transfer) => self.postMessage(msg, transfer || []);

async function openCache() {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('sofia-tts-') && k !== CACHE).map(k => caches.delete(k)));
    return await caches.open(CACHE);
  } catch { return null; } // Privat surfing o.l.: last ned uten å lagre.
}

async function loadAll() {
  const cache = await openCache();
  const loaded = {}, total = {};
  for (const [key, [, size]] of Object.entries(FILES)) { loaded[key] = 0; total[key] = size; }
  let last = 0;
  const report = () => {
    const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
    const value = Math.min(1, sum(loaded) / sum(total));
    if (value - last >= 0.01 || value === 1) { last = value; post({ type: 'progress', value }); }
  };
  const fetchFile = async key => {
    const [name] = FILES[key];
    const url = new URL(name + '?v=' + VERSION, BASE).href;
    const hit = cache && await cache.match(url).catch(() => null);
    if (hit) { const buf = await hit.arrayBuffer(); loaded[key] = total[key] = buf.byteLength; report(); return buf; }
    const res = await fetch(url);
    if (!res.ok) throw new Error(name + ': HTTP ' + res.status);
    const length = Number(res.headers.get('content-length')) || 0;
    if (length && !res.headers.get('content-encoding')) total[key] = length;
    let buf;
    if (res.body?.getReader) {
      const reader = res.body.getReader(), parts = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value); size += value.byteLength; loaded[key] = Math.min(size, total[key]); report();
      }
      const all = new Uint8Array(size);
      let at = 0;
      for (const p of parts) { all.set(p, at); at += p.byteLength; }
      buf = all.buffer;
    } else buf = await res.arrayBuffer();
    loaded[key] = total[key] = buf.byteLength; report();
    // Response tar en kopi av bytene; venter til den er lagret, så kopien kan frigjøres før neste steg.
    if (cache) await cache.put(url, new Response(buf, { headers: { 'Content-Type': 'application/octet-stream' } })).catch(() => {});
    return buf;
  };
  const entries = await Promise.all(Object.keys(FILES).map(async k => [k, await fetchFile(k)]));
  return Object.fromEntries(entries);
}

// float16 -> float32. Float16Array der nettleseren har den, ellers en tabell over alle 65 536 verdier.
function halfToFloat(buf) {
  if (typeof Float16Array === 'function') return new Float32Array(new Float16Array(buf));
  const table = new Float32Array(65536);
  for (let h = 0; h < 65536; h++) {
    const sign = h & 0x8000 ? -1 : 1, exp = (h >> 10) & 31, frac = h & 1023;
    table[h] = exp === 0 ? sign * frac * 2 ** -24 : exp === 31 ? (frac ? NaN : sign * Infinity) : sign * (1 + frac / 1024) * 2 ** (exp - 15);
  }
  const half = new Uint16Array(buf), out = new Float32Array(half.length);
  for (let i = 0; i < half.length; i++) out[i] = table[half[i]];
  return out;
}

async function init() {
  const t0 = performance.now();
  const files = await loadAll();
  config = JSON.parse(new TextDecoder().decode(files.config));
  espeak = await createEspeak({
    wasmBinary: files.espeakWasm,
    getPreloadedPackage: () => files.espeakData,
    locateFile: f => new URL(f, BASE).href,
    print: () => {}, printErr: () => {},
  });
  const status = espeak.ccall('ph_init', 'number', ['string'], [config.espeak?.voice || 'nb']);
  if (status !== 0) throw new Error('espeak-ng: ' + status);
  ort.env.wasm.wasmBinary = files.ortWasm;
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  post({ type: 'starting' }); // nå begynner den minnekrevende delen
  const weights = halfToFloat(files.weights);
  files.weights = null;
  session = await ort.InferenceSession.create(new Uint8Array(files.graph), {
    executionProviders: ['wasm'], graphOptimizationLevel: 'all',
    externalData: [{ path: WEIGHTS_NAME, data: new Uint8Array(weights.buffer) }],
  });
  await synthesize(textToIdSentences(espeak, 'Hei.', config)[0], 1); // første kjøring er treg: gjør den nå
  post({ type: 'ready', sampleRate: config.audio?.sample_rate || 22050, ms: Math.round(performance.now() - t0) });
  work();
}

async function synthesize(ids, lengthScale) {
  const inf = config.inference || {};
  const feeds = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale ?? 0.667, (inf.length_scale ?? 1) * lengthScale, inf.noise_w ?? 0.8]), [3]),
  };
  const out = await session.run(feeds);
  const tensor = out[session.outputNames[0]];
  const audio = new Float32Array(tensor.data); // egen kopi som kan overføres til hovedtråden
  for (const t of Object.values(out)) t.dispose?.();
  // «Talesyntese» er en mannsstemme; voice-shift.mjs gjør den om til en damestemme (24. november 2026).
  const sr = config.audio?.sample_rate || 22050;
  return womanVoice(trimSilence(normalize(audio), sr), sr);
}

async function work() {
  if (busy) return;
  busy = true;
  try {
    while (jobs.length) {
      // Det som skal leses nå går foran forhåndslaging av bokstaver.
      const i = jobs.findIndex(j => !j.low);
      const job = jobs.splice(i < 0 ? 0 : i, 1)[0];
      running = job.id;
      try {
        const sentences = textToIdSentences(espeak, job.text, config);
        for (const ids of sentences) {
          if (cancelled.has(job.id)) break;
          const pcm = await synthesize(ids, job.lengthScale || 1);
          if (cancelled.has(job.id)) break;
          if (pcm.length) post({ type: 'chunk', id: job.id, pcm }, [pcm.buffer]);
          await new Promise(r => setTimeout(r, 0)); // la «cancel» komme frem mellom setningene
        }
        post({ type: cancelled.delete(job.id) ? 'cancelled' : 'done', id: job.id });
      } catch (err) {
        cancelled.delete(job.id);
        post({ type: 'error', id: job.id, message: String(err?.message || err) });
      }
      running = null;
      await new Promise(r => setTimeout(r, 0)); // slipp til «cancel»-meldinger mellom jobbene
    }
  } finally { busy = false; running = null; }
}

self.onmessage = e => {
  const m = e.data || {};
  if (m.type === 'init') init().catch(err => post({ type: 'failed', message: String(err?.message || err) }));
  else if (m.type === 'speak') { jobs.push(m); if (session) work(); }
  else if (m.type === 'cancel') {
    const i = jobs.findIndex(j => j.id === m.id);
    if (i >= 0) { jobs.splice(i, 1); post({ type: 'cancelled', id: m.id }); } else if (running === m.id) cancelled.add(m.id);
  }
};
