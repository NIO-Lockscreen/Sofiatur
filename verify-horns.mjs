import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createMusic,HORNS} from './dist/music.js';

// The horn's sound effects (3 October 2026): a real recording for each of the nine rides, CC0 from Freesound (docs/sounds.md), played by music.js.
const RIDES=['car','cat','dog','duck','rocket','unicorn','firetruck','balloon','trex'];
assert.deepEqual(Object.keys(HORNS),RIDES,'one sound for each ride');
const docs=fs.readFileSync('docs/sounds.md','utf8');
for(const ride of RIDES){const file='dist/'+HORNS[ride],b=fs.readFileSync(file);
 // MP3: an ID3 tag or an MPEG frame sync at the start; small (the nine together under 250 KB).
 assert.ok(b.slice(0,3).toString()==='ID3'||(b[0]===0xff&&(b[1]&0xe0)===0xe0),file+' is an MP3');assert.ok(b.length>3000&&b.length<45000,file+': '+b.length+' bytes');
 assert.ok(docs.includes('`'+HORNS[ride].slice(7)+'`'),file+' is credited in docs/sounds.md');}
assert.ok(RIDES.reduce((n,r)=>n+fs.statSync('dist/'+HORNS[r]).size,0)<250000,'all nine under 250 KB');
assert.equal((docs.match(/https:\/\/freesound\.org\/s\/\d+\//g)||[]).length>=9,true,'each source linked');assert.ok(docs.includes('Creative Commons 0'));
console.log('Horn sounds: nine MP3 files, small, each credited with its CC0 source: OK');

// Playing: with Web Audio (a stand-in here) the clips load from the tap; horn() plays the ride's clip, one at a time, and is false while a clip is not
// loaded (the game then says the word) or failed to load.
{const started=[],stopped=[],requested=[];let resumed=0;
 class Context{constructor(){this.state='suspended';this.destination={};this.currentTime=0;this.sampleRate=44100;}resume(){resumed++;this.state='running';}suspend(){}
  createGain(){return {gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},connect(n){return n;}};}createBiquadFilter(){return {frequency:{},connect(n){return n;}};}
  createDynamicsCompressor(){return {connect(n){return n;}};}createConvolver(){return {connect(n){return n;}};}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)};}
  createBufferSource(){const s={buffer:null,connect(){},start(){started.push(s.buffer.name);},stop(){stopped.push(s.buffer.name);}};return s;}
  decodeAudioData(data,ok,no){const name=new TextDecoder().decode(data);if(name==='broken')no(new Error('bad'));else ok({name});}}
 globalThis.AudioContext=Context;globalThis.document={addEventListener(){},hidden:false};
 const fetch=async url=>{requested.push(url);const ride=Object.keys(HORNS).find(k=>HORNS[k]===url);return url.includes('missing')?{ok:false,status:404}:{ok:true,arrayBuffer:async()=>new TextEncoder().encode(ride==='cat'?'broken':ride).buffer};};
 const music=createMusic({fetch,horns:{...HORNS,unicorn:'sounds/missing.mp3'}});
 assert.equal(music.horn('dog'),false,'Not loaded yet: false (the game says "Voff voff!")');
 const flush=()=>new Promise(r=>setTimeout(r,0));await flush();await flush();
 assert.equal(music.horn('dog'),true,'Loaded on first use: the next press plays it');assert.deepEqual(started,['dog']);
 music.preloadHorns();await flush();await flush();assert.equal(new Set(requested).size,9,'the tap on the start button loads them all');assert.ok(resumed>0,'and starts the audio (iOS)');
 assert.equal(music.horn('trex'),true);assert.deepEqual(started,['dog','trex'],'the T. rex roars');assert.deepEqual(stopped,['dog'],'one at a time: the bark stops for the roar');
 assert.equal(music.horn('cat'),false,'a clip that fails to decode: false (the voice says it)');assert.equal(music.horn('unicorn'),false,'one that fails to download too');
 assert.equal(requested.filter(u=>u.includes('missing')).length,1,'and it is not fetched again on every press');
 delete globalThis.AudioContext;assert.equal(createMusic().horn('car'),false,'Without Web Audio: false');}
console.log('Horn sounds: loaded from the tap, played one at a time, false while missing (the voice instead): OK');

// The game: the horn plays the ride's sound when the sound is on, says the word while the clip is not there, and the start button loads them.
{const g=fs.readFileSync('dist/game.js','utf8');
 assert.ok(g.includes("const ride=arrivals>=(MODEL_AT[model]||0)?model:'car';if(sound&&!music.horn?.(ride))say(HONK[ride]);"),'honk() plays the ride\'s sound, the word as fallback');
 assert.ok(g.includes("if(sound&&arrivals>=HORN_AT)music.preloadHorns?.();"),'start() loads the horns once the horn is unlocked');}
console.log('Horn sounds: the game plays them on the horn: OK');
