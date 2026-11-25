// The espeak-ng program's `espeak-ng -q --ipa -v nb` for render-voice.py, but with the game's own espeak-ng build (tts/espeak-nb.*, built by tts/build-espeak.sh, with the
// pronunciation list tts/src/no_listx). One line of text in on stdin, one line of IPA out: the clauses of a line joined by spaces.
import fs from 'node:fs';
import createEspeak from './espeak-nb.mjs';

const here = new URL('./', import.meta.url);
const data = fs.readFileSync(new URL('espeak-nb.data', here));
const espeak = await createEspeak({
  wasmBinary: fs.readFileSync(new URL('espeak-nb.wasm', here)),
  getPreloadedPackage: () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  print() {}, printErr() {},
});
if (espeak.ccall('ph_init', 'number', ['string'], ['nb']) !== 0) throw new Error('espeak-ng did not start');
// src/bridge.c gives «phonemes \x1f terminator \x1f S|C \x1e» per clause.
const ipa = text => {
  const p = espeak.stringToNewUTF8(text);
  try { return espeak.UTF8ToString(espeak._ph_text(p)).split('\x1e').map(c => c.split('\x1f')[0].trim()).filter(Boolean).join(' '); }
  finally { espeak._free(p); }
};
const lines = fs.readFileSync(0, 'utf8').split('\n');
if (lines.at(-1) === '') lines.pop();
process.stdout.write(lines.map(l => (l.trim() ? ipa(l) : '')).join('\n') + '\n');
