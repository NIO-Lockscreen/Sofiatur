// Tekst -> Piper-fonem-ID-er, på samme måte som piper1-gpl 1.8 gjør det for espeak-stemmer
// (phonemize_espeak.py og phoneme_ids.py). Brukes av piper-worker.mjs og av testene.
export const BOS = '^', EOS = '$', PAD = '_';

// Bort med det som ikke skal leses: emoji og symboler (★ ☀ ♥ ✦ ⌂ ✓), og [[ ]] som Piper ellers tolker som rå fonemer.
export function cleanText(text) {
  return String(text ?? '')
    .replace(/\[\[|\]\]/g, ' ')
    .replace(/[\p{Extended_Pictographic}\p{So}\u{FE0F}\u{200D}\u{20E3}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Utdata fra ph_text() i src/bridge.c: «fonemer \x1f skilletegn \x1f S|C \x1e» per ledd.
export function parseClauses(raw) {
  return String(raw).split('\x1e').filter(Boolean).map(part => {
    const [phonemes = '', terminator = '', kind = 'C'] = part.split('\x1f');
    return { phonemes, terminator, endOfSentence: kind === 'S' };
  });
}

// Pipers _merge_known_vowel_clusters: ['a','ɪ'] -> 'aɪ' når stemmen er trent med samlede diftonger.
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

// Ledd -> setninger med fonemer (ett lydklipp per setning, som Piper).
export function clausesToSentences(clauses, clusters) {
  const sentences = [];
  let current = [];
  const close = () => { if (current.length) sentences.push(mergeVowelClusters(current, clusters)); current = []; };
  for (const { phonemes, terminator, endOfSentence } of clauses) {
    // Fjern språkbytte-merker som (en) ... (no), behold skilletegnet som et eget «fonem».
    let text = phonemes.replace(/\([^)]+\)/g, '') + terminator;
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
    if (!id) continue; // Piper hopper også over ukjente fonemer
    ids.push(...id, ...idMap[PAD]);
  }
  ids.push(...idMap[EOS]);
  return ids;
}

// espeak-modulen (src/bridge.c) + stemmens config -> én liste med fonem-ID-er per setning.
export function textToIdSentences(espeak, text, config) {
  const clean = cleanText(text);
  if (!clean) return [];
  const ptr = espeak.stringToNewUTF8(clean);
  let raw;
  try { raw = espeak.UTF8ToString(espeak._ph_text(ptr)); } finally { espeak._free(ptr); }
  return clausesToSentences(parseClauses(raw), config.vowel_clusters)
    .map(ph => phonemesToIds(ph, config.phoneme_id_map))
    .filter(ids => ids.length > 3);
}

// Toppnormalisering som Pipers normalize_audio, med litt luft til toppen.
export function normalize(audio, peak = 0.92) {
  let max = 0;
  for (let i = 0; i < audio.length; i++) { const a = Math.abs(audio[i]); if (a > max) max = a; }
  if (max < 1e-8) return audio.fill(0);
  const k = peak / max;
  for (let i = 0; i < audio.length; i++) audio[i] *= k;
  return audio;
}

// Klipp bort stillheten Piper legger før og etter, så bokstavene kommer med en gang (litt luft beholdes).
export function trimSilence(audio, sampleRate = 22050, threshold = 0.008, lead = 0.03, tail = 0.09) {
  let a = 0, b = audio.length - 1;
  while (a < b && Math.abs(audio[a]) < threshold) a++;
  while (b > a && Math.abs(audio[b]) < threshold) b--;
  if (b <= a) return audio.slice(0, 0);
  return audio.slice(Math.max(0, a - Math.round(lead * sampleRate)), Math.min(audio.length, b + 1 + Math.round(tail * sampleRate)));
}
