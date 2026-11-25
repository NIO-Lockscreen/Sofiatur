// What the game says, for the clips (tts/make-voice.mjs, tts/lines.mjs). The sentences themselves are found in the files below; this
// fills in the holes in them and adds the lines that are put together in other ways. A new hole in a sentence inside say() stops the
// voice test (verify-voice.mjs) until it is given here.
import fs from 'node:fs';
import path from 'node:path';
import { constFrom } from './lines.mjs';

export default {
  out: 'dist/tts/voice',
  files: ['dist/game.js', 'dist/teeth.js', 'dist/meal.js', 'dist/inside.js', 'dist/rides.js', 'dist/landmarks.js', 'dist/dream.js', 'dist/voice.js'],
  // Never read: the download size in the voice's note in the settings.
  skip: [/\bMB\b/],
  // Functions whose arguments are read aloud.
  calls: ['say', 'talk'],
  values(root) {
    const foods = constFrom(root, 'dist/meal.js', 'FOODS').map(f => f.name), src = fs.readFileSync(path.join(root, 'dist/game.js'), 'utf8');
    // The names on the podium (trip(id,icon,title,…) and other(id,icon,title,…) in podiumItems), and what Sofia dreams of.
    const titles = [...src.matchAll(/\b(?:trip|other)\('\w+','[^']*','([^']+)'/g)].map(m => m[1]), dreams = Object.values(constFrom(root, 'dist/game.js', 'DREAM_NAMES'));
    // «Du mangler: KIWI, Ludvig og barnehagen.»: the places not visited yet, in this order, two or more joined with «og».
    const places = ['KIWI', 'Ludvig', 'Dalgård ishall', 'Rema 1000', 'barnehagen'], lists = [];
    for (let m = 1; m < 1 << places.length; m++) { const l = places.filter((_, i) => m & (1 << i)); lists.push(l.length > 1 ? l.slice(0, -1).join(', ') + ' og ' + l.at(-1) : l[0]); }
    return {
      'it.title': titles, name: [...titles, ...dreams],
      B: ['bilen', 'anda'], 'capital(B)': ['Bilen', 'Anda'],
      'ORD[n-1]': constFrom(root, 'dist/game.js', 'ORD'),
      list: lists,
      // Roundabouts have up to six exits.
      'e.exitNumber': [1, 2, 3, 4, 5, 6],
      // rideWord(): what Sofia drives, «bilen» or «anda»
      'rideWord()': ['bilen', 'anda'], 'rideWord(false)': ['bil', 'and'],
      f: foods,
      'info.label': ['Venstre', 'Høyre', 'Rett frem', 'Snu'],
    };
  },
  patterns: {
    // A locked trip on the podium: how many more trips to the kindergarten (at most 13).
    "Hint: Kjør til barnehagen {r===1?'én gang til':r+' ganger til'}.": Array.from({ length: 13 }, (_, i) => `Hint: Kjør til barnehagen ${i ? i + 1 + ' ganger til' : 'én gang til'}.`),
    // The brushing chart: one star for each brushing, up to ten; then the walls. After 120 the device's voice reads the number.
    "Nå har du {n} {n===1?'stjerne':'stjerner'} på tannpusskartet.": Array.from({ length: 10 }, (_, i) => `Nå har du ${i + 1} ${i ? 'stjerner' : 'stjerne'} på tannpusskartet.`),
    'Nå har du {n} stjerner på veggene.': Array.from({ length: 109 }, (_, i) => `Nå har du ${i + 12} stjerner på veggene.`),
  },
  // Built outside say() but read later: the rewards' last line, and the podium's texts (read when an item is tapped).
  said: ['Nå kan du velge farge på {B}!', 'Og nå har {B} fått et regnbuespor!', 'Og nå blåser {B} såpebobler!',
    'Denne fikk du da du kom fram til barnehagen for {ORD[n-1]} gang.', "Hint: Kjør til barnehagen {r===1?'én gang til':r+' ganger til'}.", 'Du mangler: {list}.'],
  extra: [],
};
