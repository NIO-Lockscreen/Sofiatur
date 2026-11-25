// Makes the game's voice: every sentence the game can say, read by Canora Norwegian «ingrid» and packed as MP3 clips (25 November 2026).
//
//   node tts/make-voice.mjs            find the sentences, render the new ones, pack tts/voice/ (needs python3 + numpy + onnxruntime, ffmpeg)
//   node tts/make-voice.mjs --check    only check that every sentence has a clip (the tests run this)
//   node tts/make-voice.mjs --list     print the sentences
//
// The sentences come from the game's own source (lines.mjs): every string in it that reads like speech, split into sentences the
// way the player splits them (clips.mjs). A sentence with a hole in it (a planet's name, a number) is filled in from the values in
// voice-lines.mjs, which also has the few lines put together in other ways. A sentence the game says without a clip is read by
// the device's own voice, so a missing clip is never silent, but `npm test` fails until it is made.
//
// The model (Canora Norwegian, Apache 2.0, 325 MB) is downloaded once to tts/.voice-cache/, with the clips already rendered.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { gameSentences } from './lines.mjs';
import { spoken } from '../dist/tts/clips.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, process.env.VOICE_ROOT || '..');
const CACHE = path.join(HERE, '.voice-cache');
export const VOICE = { name: 'ingrid', speed: 0.9, bitrate: '48k', model: 'onnx/model.onnx', voice: 'voices/ingrid.bin' };

const config = (await import(path.join(HERE, 'voice-lines.mjs'))).default;
const OUT = path.join(ROOT, config.out || 'tts/voice');

export async function allSentences() { return gameSentences(ROOT, config); }

function readIndex() { try { return JSON.parse(fs.readFileSync(path.join(OUT, 'ingrid.json'), 'utf8')); } catch { return null; } }

export async function missing() {
  const index = readIndex(), have = new Set(Object.keys(index?.clips || {}));
  return (await allSentences()).filter(s => !have.has(s));
}

async function download(file) {
  const to = path.join(CACHE, 'model', file);
  if (fs.existsSync(to)) return to;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  // The model as it was on 25 November 2026 (revision 1beb26b), so the clips can be made again the same way.
  const url = (process.env.CANORA_URL || 'https://huggingface.co/empiriolabsai/canora-norwegian/resolve/1beb26bfd5ed3669614e02c874ac1d5209225490/') + file;
  console.log('Downloading ' + url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + ': HTTP ' + res.status);
  fs.writeFileSync(to + '.part', Buffer.from(await res.arrayBuffer()));
  fs.renameSync(to + '.part', to);
  return to;
}

async function build() {
  const sentences = await allSentences();
  const model = await download(VOICE.model), voice = await download(VOICE.voice);
  fs.mkdirSync(CACHE, { recursive: true });
  const jobsFile = path.join(CACHE, 'jobs.json');
  fs.writeFileSync(jobsFile, JSON.stringify(sentences.map(key => ({ key, say: spoken(key) }))));
  const r = spawnSync('python3', [path.join(HERE, 'render-voice.py'), jobsFile, path.join(CACHE, 'wav'), '--model', model, '--voice', voice, '--speed', String(VOICE.speed)],
    { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'inherit'] });
  if (r.status !== 0) throw new Error('render-voice.py failed');
  const rendered = JSON.parse(r.stdout);
  // MP3, one per sentence, joined into one file: each clip is a whole MP3 stream (with its own header), so the game can decode
  // any byte range on its own. An MP3 is made once per WAV and kept in the cache.
  const parts = [], clips = {};
  let offset = 0;
  for (const { key, wav } of rendered) {
    const mp3 = wav.replace(/\.wav$/, '.' + VOICE.bitrate + '.mp3');
    if (!fs.existsSync(mp3)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', VOICE.bitrate, '-ar', '24000', '-ac', '1', mp3]);
    const bytes = fs.readFileSync(mp3);
    clips[key] = [offset, bytes.length];
    parts.push(bytes);
    offset += bytes.length;
  }
  const pack = Buffer.concat(parts), hash = createHash('sha1').update(pack).digest('hex').slice(0, 12);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'ingrid.mp3'), pack);
  const index = { voice: 'Canora Norwegian «ingrid» (EmpirioLabs, Apache 2.0)', speed: VOICE.speed, sampleRate: 24000, bitrate: VOICE.bitrate, hash, bytes: pack.length, clips };
  fs.writeFileSync(path.join(OUT, 'ingrid.json'), JSON.stringify(index, null, 0).replace(/\],"/g, '],\n"'));
  console.log(`Packed ${Object.keys(clips).length} sentences: ${(pack.length / 1e6).toFixed(1)} MB in ${path.relative(ROOT, path.join(OUT, "ingrid.mp3"))} (${hash}).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--list')) console.log((await allSentences()).join('\n'));
  else if (process.argv.includes('--check')) {
    const miss = await missing();
    if (miss.length) { console.error(`${miss.length} sentences have no clip. Run: node tts/make-voice.mjs\n` + miss.map(s => '  ' + s).join('\n')); process.exit(1); }
    console.log('Every sentence has a clip.');
  } else await build();
}
