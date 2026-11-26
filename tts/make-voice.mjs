// Makes the game's voice: every sentence the game can say, read by Piper «talesyntese» (no_NO-talesyntese-medium, Nasjonalbiblioteket,
// CC0) and packed as MP3 clips (26 November 2026). The voice is used as the model makes it: no pitch or formant shift (from 24 to 25
// November 2026 it was raised with TD-PSOLA on the iPad, which crackled).
//
//   node tts/make-voice.mjs            find the sentences, render the new ones, pack tts/voice/ (needs python3 + numpy + onnxruntime, ffmpeg)
//   node tts/make-voice.mjs --check    only check that every sentence has a clip (the tests run this)
//   node tts/make-voice.mjs --list     print the sentences
//   node tts/make-voice.mjs --ipa ord  print the phonemes the voice gets for a text (with PHONEME_FIXES)
//
// The sentences come from the game's own source (lines.mjs): every string in it that reads like speech, split into sentences the
// way the player splits them (clips.mjs). A sentence with a hole in it (a planet's name, a number) is filled in from the values in
// voice-lines.mjs, which also has the few lines put together in other ways. A sentence the game says without a clip is read by
// the device's own voice, so a missing clip is never silent, but `npm test` fails until it is made.
//
// Text to phonemes is the game's espeak-ng build with its pronunciation list (espeak-nb.*, src/no_listx), the same espeak-ng version
// Piper 1.8 uses, and phonemes to ids is piper-core.mjs (the tests check it against Python Piper). The model (63 MB) is downloaded once to
// tts/.voice-cache/, with the clips already rendered.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { gameSentences } from './lines.mjs';
import { spoken } from '../dist/tts/clips.mjs';
import { startEspeak, textToIdSentences, fixPhonemes, ipa } from './piper-core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, process.env.VOICE_ROOT || '..');
const CACHE = path.join(HERE, '.voice-cache');
// lengthScale: a little slower than ordinary reading, for a five-year-old (the same pace as when the voice ran on the iPad). It stretches
// the sounds in time; the pitch is the model's own.
export const VOICE = {
  name: 'talesyntese', file: 'no_NO-talesyntese-medium', lengthScale: 1.12, bitrate: '48k', sampleRate: 22050,
  // The model as it was on 26 November 2026 (piper-voices revision 5ec43b1), so the clips can be made again the same way.
  url: 'https://huggingface.co/rhasspy/piper-voices/resolve/5ec43b186ef915a195d3ddbcfd9916e76c503c3f/no/no_NO/talesyntese/medium/',
  sha256: 'f5f33d4e2a67cbef7cc5bab6d4b773a815e6a5cb02438509ea9b7493696f539f',
};
// Phonemes changed after espeak-ng, for words espeak gets wrong (26 November 2026). The voice was trained with this espeak-ng, so the
// rest stays as espeak says it: «Sofia» from no_listx (sʊfˈiːʲɑ), ʲ between vowels («Vi er» viːʲ ˌɛːr: 1617 times in the training data),
// and the small words it has learned («igjen»).
// - The food on the mobile: espeak reads «pizza» with a z (pˈɪzɑ; z is in the training data 5 times), «burger» as written (bˈʉrɡər),
//   «sushi» as «sus-hi» (sˈʉshiː), stresses «mobil» on the first syllable and gives «trillebordet» a long e in the middle. Here as
//   Norwegians say them: «pitsa», «børger», «sushi» with sj, «mobil» stressed last.
// - In Sofiatur: «ishall» has a short i (ˈɪshɑl, «i sal»); is-hall is ˈiːshˌɑl. KIWI is read with kj (xˈiːviː, «kjivi»); the shop is «kivi».
export const PHONEME_FIXES = [['pˈɪzaːn', 'pˈɪtsɑən'], ['pˈɪzɑ', 'pˈɪtsɑ'], ['bˈʉrɡeːrən', 'bˈœrɡərən'], ['bˈʉrɡər', 'bˈœrɡər'], ['sˈʉshiː', 'sˈʉːʃiː'],
  ['mˈuːbiːl', 'mʊbˈiːl'], ['trˈɪlleːbˌuːrda', 'trˈɪləbˌuːrda'], ['ˈɪshɑl', 'ˈiːshˌɑl'], ['xˈiːviː', 'kˈiːviː']];

const config = (await import(path.join(HERE, 'voice-lines.mjs'))).default;
const OUT = path.join(ROOT, config.out || 'tts/voice');
export const voiceConfig = () => JSON.parse(fs.readFileSync(path.join(HERE, VOICE.file + '.onnx.json'), 'utf8'));

export async function allSentences() { return gameSentences(ROOT, config); }

function readIndex() { try { return JSON.parse(fs.readFileSync(path.join(OUT, VOICE.name + '.json'), 'utf8')); } catch { return null; } }

export async function missing() {
  const index = readIndex(), have = new Set(Object.keys(index?.clips || {}));
  return (await allSentences()).filter(s => !have.has(s));
}

async function download(file, sha256) {
  const to = path.join(CACHE, 'model', file);
  const ok = f => !sha256 || createHash('sha256').update(fs.readFileSync(f)).digest('hex') === sha256;
  if (fs.existsSync(to) && ok(to)) return to;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  const url = (process.env.PIPER_URL || VOICE.url) + file;
  console.log('Downloading ' + url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + ': HTTP ' + res.status);
  fs.writeFileSync(to + '.part', Buffer.from(await res.arrayBuffer()));
  if (!ok(to + '.part')) throw new Error(file + ': not the model the clips were made with (sha256)');
  fs.renameSync(to + '.part', to);
  return to;
}

async function build() {
  const sentences = await allSentences(), voice = voiceConfig();
  const model = await download(VOICE.file + '.onnx', VOICE.sha256);
  const espeak = await startEspeak(HERE);
  fs.mkdirSync(CACHE, { recursive: true });
  const jobsFile = path.join(CACHE, 'jobs.json');
  const jobs = sentences.map(key => ({ key, ids: textToIdSentences(espeak, spoken(key), voice, PHONEME_FIXES) }));
  const empty = jobs.filter(j => !j.ids.length);
  if (empty.length) throw new Error('No phonemes for: ' + empty.map(j => j.key).join(' | '));
  fs.writeFileSync(jobsFile, JSON.stringify(jobs));
  const r = spawnSync('python3', [path.join(HERE, 'render-voice.py'), jobsFile, path.join(CACHE, 'wav'), '--model', model,
    '--config', path.join(HERE, VOICE.file + '.onnx.json'), '--length-scale', String(VOICE.lengthScale)],
    { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'inherit'] });
  if (r.status !== 0) throw new Error('render-voice.py failed');
  const rendered = JSON.parse(r.stdout);
  // MP3, one per sentence, joined into one file: each clip is a whole MP3 stream (with its own header), so the game can decode
  // any byte range on its own. An MP3 is made once per WAV and kept in the cache.
  const parts = [], clips = {};
  let offset = 0;
  for (const { key, wav } of rendered) {
    const mp3 = wav.replace(/\.wav$/, '.' + VOICE.bitrate + '.mp3');
    if (!fs.existsSync(mp3)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', VOICE.bitrate, '-ar', String(VOICE.sampleRate), '-ac', '1', mp3]);
    const bytes = fs.readFileSync(mp3);
    clips[key] = [offset, bytes.length];
    parts.push(bytes);
    offset += bytes.length;
  }
  const pack = Buffer.concat(parts), hash = createHash('sha1').update(pack).digest('hex').slice(0, 12);
  fs.mkdirSync(OUT, { recursive: true });
  // The voice before 26 November 2026 («ingrid») goes.
  for (const old of ['ingrid.mp3', 'ingrid.json']) fs.rmSync(path.join(OUT, old), { force: true });
  fs.writeFileSync(path.join(OUT, VOICE.name + '.mp3'), pack);
  const index = { voice: 'Piper «talesyntese» (no_NO-talesyntese-medium, Nasjonalbiblioteket, CC0)', lengthScale: VOICE.lengthScale, sampleRate: VOICE.sampleRate, bitrate: VOICE.bitrate, hash, bytes: pack.length, clips };
  fs.writeFileSync(path.join(OUT, VOICE.name + '.json'), JSON.stringify(index, null, 0).replace(/\],"/g, '],\n"'));
  console.log(`Packed ${Object.keys(clips).length} sentences: ${(pack.length / 1e6).toFixed(1)} MB in ${path.relative(ROOT, path.join(OUT, VOICE.name + '.mp3'))} (${hash}).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const at = process.argv.indexOf('--ipa');
  if (at > 0) { const espeak = await startEspeak(HERE), text = process.argv.slice(at + 1).join(' '); console.log(fixPhonemes(ipa(espeak, spoken(text)), PHONEME_FIXES)); }
  else if (process.argv.includes('--list')) console.log((await allSentences()).join('\n'));
  else if (process.argv.includes('--check')) {
    const miss = await missing();
    if (miss.length) { console.error(`${miss.length} sentences have no clip. Run: node tts/make-voice.mjs\n` + miss.map(s => '  ' + s).join('\n')); process.exit(1); }
    console.log('Every sentence has a clip.');
  } else await build();
}
