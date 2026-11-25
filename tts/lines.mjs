// Finds every sentence the game can say, in its own source (25 November 2026). Used by make-voice.mjs and the tests.
//
// Every string in the listed files that reads like speech (letters, and a space or a full stop) is split into sentences (clips.mjs).
// Strings joined with + and template strings are put together first, so 'Vi passerer '+name+'!' is one sentence with a hole in it,
// «Vi passerer {name}!». A sentence with a hole is filled in from voice-lines.mjs: `values` gives the values of an expression,
// `patterns` the whole sentences for a pattern (when the holes depend on each other). Holes are filled in only inside the calls in `calls`
// (say and the like) and in the patterns listed in `said`. A hole that stands alone between sentences
// (a fact read after «Se, Sofia!») needs nothing: its text is a string of its own somewhere and is found as such. `extra` adds lines
// that are put together in other ways, and `skip` leaves out strings that are never read (labels, titles). An unknown hole stops the
// build with its file and pattern, so a new line is never left without a clip by mistake.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { sentences } from '../dist/tts/clips.mjs';

const REGEX_BEFORE = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^',
  'return', 'typeof', 'case', 'do', 'else', 'in', 'of', '=>', '&&', '||', '??', '===', '!==', '==', '!=']);

// A small JavaScript tokenizer: strings, template strings (with the source of each ${hole}), names, punctuation; comments and regular
// expressions are skipped.
export function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length, esc = c => (c === 'n' ? '\n' : c === 't' ? '\t' : c);
  const str = q => { let s = ''; i++; while (i < n && src[i] !== q) { if (src[i] === '\\') { s += esc(src[i + 1]); i += 2; } else s += src[i++]; } i++; return s; };
  const tpl = () => {
    const parts = [''], holes = [];
    i++;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { parts[parts.length - 1] += esc(src[i + 1]); i += 2; }
      else if (src[i] === '$' && src[i + 1] === '{') { i += 2; const from = i; skip(); holes.push(src.slice(from, i - 1)); parts.push(''); }
      else parts[parts.length - 1] += src[i++];
    }
    i++;
    return { parts, holes };
  };
  const skip = () => { // to the } that closes a ${
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (c === "'" || c === '"') { str(c); continue; }
      if (c === '`') { tpl(); continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
      if (c === '{') depth++;
      else if (c === '}') { if (!depth) { i++; return; } depth--; }
      i++;
    }
  };
  while (i < n) {
    const c = src[i], start = i;
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === "'" || c === '"') { const value = str(c); toks.push({ type: 'str', value, start, end: i }); continue; }
    if (c === '`') { const t = tpl(); toks.push({ type: 'tpl', ...t, start, end: i }); continue; }
    if (c === '/') {
      const p = toks.at(-1);
      if (!p || (p.type === 'punct' || p.type === 'id') && REGEX_BEFORE.has(p.value)) {
        i++;
        let cls = false;
        while (i < n && src[i] !== '\n') { const d = src[i]; if (d === '\\') { i += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; i++; }
        i++;
        while (/[a-z]/.test(src[i] || '')) i++;
        continue;
      }
    }
    if (/[\w$]/.test(c)) { while (i < n && /[\w$]/.test(src[i])) i++; toks.push({ type: 'id', value: src.slice(start, i), start, end: i }); continue; }
    const op = ['===', '!==', '...', '?.', '=>', '&&', '||', '??', '==', '!=', '<=', '>=', '+=', '-=', '++', '--'].find(o => src.startsWith(o, i)) || c;
    i += op.length;
    toks.push({ type: 'punct', value: op, start, end: i });
  }
  return toks;
}

const OPEN = { '(': ')', '[': ']', '{': '}' }, CLOSE = { ')': '(', ']': '[', '}': '{' };
const isText = t => t && (t.type === 'str' || t.type === 'tpl');
// The operand of a + that ends at token j (going left) or starts at token j (going right): names, member access, calls, brackets.
function operandLeft(toks, j) {
  let k = j;
  for (;;) {
    const t = toks[k];
    if (!t) return k + 1;
    if (t.type === 'punct' && CLOSE[t.value]) { let d = 0; for (; k >= 0; k--) { const v = toks[k].value; if (toks[k].type === 'punct' && CLOSE[v]) d++; else if (toks[k].type === 'punct' && OPEN[v] && !--d) break; } k--; continue; }
    if (t.type === 'id' || isText(t)) { k--; if (toks[k]?.type === 'punct' && (toks[k].value === '.' || toks[k].value === '?.')) { k--; continue; } return k + 1; }
    return k + 1;
  }
}
function operandRight(toks, j) {
  let k = j;
  for (;;) {
    const t = toks[k];
    if (!t) return k - 1;
    if (t.type === 'punct' && OPEN[t.value]) { let d = 0; for (; k < toks.length; k++) { const v = toks[k].value; if (toks[k].type === 'punct' && OPEN[v]) d++; else if (toks[k].type === 'punct' && CLOSE[v] && !--d) break; } k++; }
    else if (t.type === 'id' || isText(t)) k++;
    else return k - 1;
    const nx = toks[k];
    if (nx?.type === 'punct' && (nx.value === '.' || nx.value === '?.' || nx.value === '(' || nx.value === '[')) { if (nx.value !== '(' && nx.value !== '[') k++; continue; }
    return k - 1;
  }
}

const HOLE = (k) => '' + k + '';
const speechLike = s => /\p{L}{2}/u.test(s) && (/\s/.test(s.trim()) || /[.!?…]$/.test(s.trim()));
const clean = s => s.replace(/\s+/g, ' ').trim();

// The strings of one source: [{text, holes, speech}] where text has placeholders for the holes, holes is the source of each, and speech
// says whether the string is inside a call to one of `calls` (say, speak, …).
export function pieces(src, calls = new Set(), inherited = false) {
  const toks = tokenize(src), used = new Set(), out = [];
  // For every token: inside the brackets of a call to a speech function?
  const inCall = new Array(toks.length).fill(inherited), stack = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    inCall[i] = inherited || stack.some(Boolean);
    if (t.type === 'punct' && OPEN[t.value]) { const prev = toks[i - 1]; stack.push(t.value === '(' && prev?.type === 'id' && calls.has(prev.value)); }
    else if (t.type === 'punct' && CLOSE[t.value]) stack.pop();
  }
  const textOf = (t, holes) => {
    if (t.type === 'str') return t.value;
    let s = t.parts[0];
    t.holes.forEach((h, k) => { holes.push(clean(h)); s += HOLE(holes.length - 1) + t.parts[k + 1]; });
    return s;
  };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'tpl') for (const h of t.holes) out.push(...pieces(h, calls, inCall[i])); // strings inside ${...}
    if (!isText(t) || used.has(i)) continue;
    // Walk out along + to the whole chain.
    let a = i, b = i;
    for (;;) { if (toks[a - 1]?.value !== '+' || toks[a - 1].type !== 'punct') break; const l = operandLeft(toks, a - 2); if (l > a - 2) break; a = l; }
    for (;;) { if (toks[b + 1]?.value !== '+' || toks[b + 1].type !== 'punct') break; const r = operandRight(toks, b + 2); if (r < b + 2) break; b = r; }
    // The operands: split a..b at the + outside brackets.
    const holes = [], operands = [];
    let text = '', from = a, depth = 0;
    for (let k = a; k <= b + 1; k++) {
      const t = toks[k];
      if (k <= b && t.type === 'punct' && OPEN[t.value]) depth++;
      else if (k <= b && t.type === 'punct' && CLOSE[t.value]) depth--;
      else if (k > b || (!depth && t.type === 'punct' && t.value === '+')) { operands.push([from, k - 1]); from = k + 1; }
    }
    for (const [x, y] of operands) {
      if (x === y && isText(toks[x])) { text += textOf(toks[x], holes); used.add(x); }
      else { holes.push(clean(src.slice(toks[x].start, toks[y].end))); text += HOLE(holes.length - 1); }
    }
    out.push({ text, holes, speech: inCall[a] });
  }
  return out;
}

// Sentences of a piece; a sentence with holes becomes a pattern «… {expr} …».
function split(piece) {
  const closed = [], open = [];
  // A hole right after a full stop starts a new sentence (its text starts with a space or a capital letter when the game runs).
  for (const s of sentences(piece.text.replace(/([.!?…]["»”')\]]*)(?=\uE000)/gu, '$1 '))) {
    if (!//.test(s)) { closed.push(s); continue; }
    const rest = s.replace(/\d+/g, '').trim();
    if (!/[\p{L}\p{N}\p{P}]/u.test(rest)) continue; // only holes: their text is found where it is written («{fact} {reward}»)
    open.push({ pattern: s.replace(/(\d+)/g, (_, k) => '{' + piece.holes[+k] + '}'), holes: [...s.matchAll(/(\d+)/g)].map(m => piece.holes[+m[1]]), text: s });
  }
  return { closed, open };
}

// A hole that is just a choice between two strings, cond?'a':'b' (in brackets or not), has those two as its values.
function choice(expr) {
  const m = /^\(?[^'"`?]*\?\s*(?:'([^'\\]*)'|"([^"\\]*)")\s*:\s*(?:'([^'\\]*)'|"([^"\\]*)")\s*\)?$/.exec(expr);
  return m ? [m[1] ?? m[2], m[3] ?? m[4]] : null;
}

function product(lists) { return lists.reduce((acc, l) => acc.flatMap(a => l.map(x => [...a, x])), [[]]); }

// All sentences: sorted, without repeats.
export async function gameSentences(root, config, report = {}) {
  const all = new Set(), unknown = [], ignored = report.ignored = [];
  const calls = new Set(config.calls || ['say']);
  // Never read: CSS (fonts, sizes, selectors), markup and arrows between street names.
  const code = s => /\dpx\b|sans-serif|^[#.][\w-]|[{}<>=→]|^\(/.test(s);
  const listed = s => (config.skip || []).some(r => (r instanceof RegExp ? r.test(s) : r === s));
  const skip = s => code(s) || listed(s);
  const add = text => { for (const s of sentences(text)) if (!skip(s)) all.add(s); };
  const values = typeof config.values === 'function' ? await config.values(root) : config.values || {};
  const patterns = typeof config.patterns === 'function' ? await config.patterns(root) : config.patterns || {};
  for (const file of config.files) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    for (const piece of pieces(src, calls)) {
      const plain = piece.text.replace(/\d+/g, ' ');
      // Strings that do not read like speech are left out, unless they are said (say(name+'!')) with holes in them.
      if (!(piece.speech && piece.holes.length) && (!speechLike(plain) || skip(clean(plain)))) continue;
      const { closed, open } = split(piece);
      for (const s of closed) if (speechLike(s) && !skip(s)) all.add(s);
      for (const o of open) {
        if (listed(o.pattern) || /^[a-z]+-\{[^}]*\}$/.test(o.pattern)) continue; // and ids such as 'flyby-'+id
        if (patterns[o.pattern]) { for (const t of patterns[o.pattern]) add(t); continue; }
        // Holes are filled in only inside say() and the like: a label with a planet's name in it is not read, and filling in every
        // label would make thousands of clips.
        // `said` lists the patterns that are read although they are built outside say() (a reward's text, read later).
        if (!piece.speech && !(config.said || []).includes(o.pattern)) { ignored.push(`${file}: ${o.pattern}`); continue; }
        const lists = o.holes.map(h => values[h] || choice(h));
        if (lists.some(l => !l)) {
          // Inside a call to say(): it must be filled in. Elsewhere (a label, a title) it is most likely never read; make-voice.mjs --open lists these.
          (piece.speech ? unknown : ignored).push(`${file}: ${o.pattern}   (no values for ${o.holes.filter(h => !values[h] && !choice(h)).join(', ')})`);
          continue;
        }
        for (const combo of product(lists)) { let k = 0; add(o.text.replace(/\d+/g, () => String(combo[k++]))); }
      }
    }
  }
  const extra = typeof config.extra === 'function' ? await config.extra(root) : config.extra || [];
  for (const t of extra) add(t);
  if (unknown.length) throw new Error('Sentences with holes that voice-lines.mjs does not fill in:\n  ' + unknown.join('\n  '));
  return [...all].sort((x, y) => x.localeCompare(y, 'nb'));
}

// The value of `const name=…` in a game file (a list or an object of plain data), for voice-lines.mjs. `scope` holds names it uses.
export function constFrom(root, file, name, scope = {}) {
  const src = fs.readFileSync(path.join(root, file), 'utf8'), m = new RegExp('\\bconst\\s+' + name + '\\s*=\\s*').exec(src);
  if (!m) throw new Error(`${file}: no const ${name}`);
  const toks = tokenize(src.slice(m.index + m[0].length));
  let depth = 0, end = 0;
  for (const t of toks) {
    if (t.type === 'punct' && OPEN[t.value]) depth++;
    else if (t.type === 'punct' && CLOSE[t.value]) depth--;
    if (!depth) { end = t.end; break; }
  }
  return vm.runInNewContext('(' + src.slice(m.index + m[0].length, m.index + m[0].length + end) + ')', { ...scope });
}
