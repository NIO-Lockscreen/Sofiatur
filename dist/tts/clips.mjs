// How the game's speech is cut into clips (one per sentence) and what is read for the written text. Used by make-voice.mjs when the
// clips are made, and by the player (voice.js).

// The sentences of a text: split after . ! ? … (and a closing quote or bracket) followed by a space or a capital letter («Hurra!Og se»,
// where two strings are joined without a space). Emoji and symbols are not read.
export function sentences(text) {
  const t = String(text ?? '').replace(/[\p{Extended_Pictographic}\p{So}\u{FE0F}\u{200D}\u{20E3}]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  // (No lookbehind: Safari has it only from iOS 16.4.)
  return t.replace(/([.!?…]["»”')\]]*)(?:\s+|(?=\p{Lu}))/gu, '$1\n').split('\n').map(s => s.trim()).filter(s => /[\p{L}\d]/u.test(s));
}

// What is read for what is written (25 November 2026): PEG (the feeding tube) is said as a word, «pegg», not spelled P-E-G; and words in
// capitals (a heading, «FOR VARMT FOR EN AND», «KOMETKRAFT!») are read as words, not spelled. Short ones alone (KIWI, NAV) stay as they are.
export function spoken(text) {
  return String(text ?? '').replace(/\bPEG\b/g, 'pegg')
    .replace(/(^|[^\p{L}])(\p{Lu}{2,}(?:(?:,? |-)\p{Lu}{2,})+|\p{Lu}{6,})(?!\p{L})/gu, (m, pre, w) => pre + w[0] + w.slice(1).toLowerCase());
}
