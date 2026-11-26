// Text -> Piper phoneme ids, the way piper1-gpl 1.8 does it for espeak voices (phonemize_espeak.py and phoneme_ids.py).
// Used by make-voice.mjs when the clips are made (26 November 2026), and by the tests, which check it against ids from Python Piper
// (src/piper-fixture.json). From 22 to 25 November 2026 the same code ran on the iPad in a Web Worker.
export const BOS = '^', EOS = '$', PAD = '_';

// Off with what is not read: emoji and symbols (★ ☀ ♥ ✦ ⌂ ✓), and [[ ]], which Piper would otherwise take as raw phonemes.
export function cleanText(text) {
  return String(text ?? '')
    .replace(/\[\[|\]\]/g, ' ')
    .replace(/[\p{Extended_Pictographic}\p{So}\u{FE0F}\u{200D}\u{20E3}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// What ph_text() in src/bridge.c gives: «phonemes \x1f punctuation \x1f S|C \x1e» per clause.
export function parseClauses(raw) {
  return String(raw).split('\x1e').filter(Boolean).map(part => {
    const [phonemes = '', terminator = '', kind = 'C'] = part.split('\x1f');
    return { phonemes, terminator, endOfSentence: kind === 'S' };
  });
}

// Piper's _merge_known_vowel_clusters: ['a','ɪ'] -> 'aɪ' when the voice was trained with joined diphthongs.
export function mergeVowelClusters(phones, clusters) {
  if (!clusters?.length) return phones;
  const known = new Set(clusters.map(c => c.join('\0')));
  const max = Math.max(...clusters.map(c => c.length));
  const out = [];
  for (let i = 0; i < phones.length;) {
    let match = 0;
    for (let n = Math.min(max, phones.length - i); n > 1; n--) {
      if (known.has(phones.slice(i, i + n).join('\0'))) { match = n; break; }
    }
    if (match) { out.push(phones.slice(i, i + match).join('')); i += match; } else out.push(phones[i++]);
  }
  return out;
}

// A clause's phonemes with the game's fixes ([from, to] pairs, see PHONEME_FIXES in make-voice.mjs) applied.
export function fixPhonemes(phonemes, fixes = []) {
  return fixes.reduce((s, [a, b]) => s.split(a).join(b), phonemes);
}

// Clauses -> sentences of phonemes (one piece of sound per sentence, as Piper does it).
export function clausesToSentences(clauses, clusters, fixes = []) {
  const sentences = [];
  let current = [];
  const close = () => { if (current.length) sentences.push(mergeVowelClusters(current, clusters)); current = []; };
  for (const { phonemes, terminator, endOfSentence } of clauses) {
    // Off with language switches such as (en) ... (no); the punctuation stays as a «phoneme» of its own.
    let text = fixPhonemes(phonemes.replace(/\([^)]+\)/g, ''), fixes) + terminator;
    if (terminator === ',' || terminator === ':' || terminator === ';') text += ' ';
    current.push(...text.normalize('NFD'));
    if (endOfSentence) close();
  }
  close();
  return sentences;
}

export function phonemesToIds(phonemes, idMap) {
  const ids = [...idMap[BOS], ...idMap[PAD]];
  for (const p of phonemes) {
    const id = idMap[p];
    if (!id) continue; // Piper skips unknown phonemes too
    ids.push(...id, ...idMap[PAD]);
  }
  ids.push(...idMap[EOS]);
  return ids;
}

// The phonemes of a text as espeak-ng gives them (the clauses joined by spaces), for the tests and for checking a word.
export function ipa(espeak, text) {
  const ptr = espeak.stringToNewUTF8(cleanText(text));
  try { return parseClauses(espeak.UTF8ToString(espeak._ph_text(ptr))).map(c => c.phonemes).filter(Boolean).join(' '); } finally { espeak._free(ptr); }
}

// The espeak module (src/bridge.c) + the voice's config -> one list of phoneme ids per sentence.
export function textToIdSentences(espeak, text, config, fixes = []) {
  const clean = cleanText(text);
  if (!clean) return [];
  const ptr = espeak.stringToNewUTF8(clean);
  let raw;
  try { raw = espeak.UTF8ToString(espeak._ph_text(ptr)); } finally { espeak._free(ptr); }
  return clausesToSentences(parseClauses(raw), config.vowel_clusters, fixes)
    .map(ph => phonemesToIds(ph, config.phoneme_id_map))
    .filter(ids => ids.length > 3);
}

// The game's espeak-ng build (espeak-nb.*, with the pronunciation list src/no_listx), started in Node.
export async function startEspeak(dir) {
  const fs = await import('node:fs'), path = await import('node:path');
  const createEspeak = (await import('./espeak-nb.mjs')).default;
  const data = fs.readFileSync(path.join(dir, 'espeak-nb.data'));
  const espeak = await createEspeak({
    wasmBinary: fs.readFileSync(path.join(dir, 'espeak-nb.wasm')),
    getPreloadedPackage: () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    print() {}, printErr() {},
  });
  if (espeak.ccall('ph_init', 'number', ['string'], ['nb']) !== 0) throw new Error('espeak-ng did not start');
  return espeak;
}
