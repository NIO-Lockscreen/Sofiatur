import assert from 'node:assert/strict';
import {createMusic,HORNS} from './dist/music.js';

// The game's sound effects (11 November 2026): synthesized with Web Audio in music.js. A stand-in AudioContext records every oscillator and its gain envelope.
const T0=10,r=x=>+(x-T0).toFixed(6);
function stage(){const oscs=[];let resumed=0;
 class Context{constructor(){this.state='suspended';this.destination={};this.currentTime=T0;this.sampleRate=44100;}resume(){resumed++;this.state='running';return Promise.reject(new Error('no gesture'));}suspend(){}
  createGain(){const ev=[];return {ev,gain:{value:1,setValueAtTime(v,t){ev.push(['set',v,t]);},exponentialRampToValueAtTime(v,t){ev.push(['exp',v,t]);},linearRampToValueAtTime(v,t){ev.push(['lin',v,t]);},setTargetAtTime(){},cancelScheduledValues(){}},connect(n){return n;}};}
  createBiquadFilter(){return {frequency:{},connect(n){return n;}};}createDynamicsCompressor(){return {connect(n){return n;}};}createConvolver(){return {connect(n){return n;}};}createBuffer(){return {getChannelData:()=>new Float32Array(1)};}
  createOscillator(){const o={type:null,fr:[],frequency:{setValueAtTime(v,t){o.fr.push(['set',v,t]);},exponentialRampToValueAtTime(v,t){o.fr.push(['exp',v,t]);}},connect(n){o.g=n;return n;},start(t){o.t0=t;},stop(t){o.t1=t;}};oscs.push(o);return o;}}
 globalThis.AudioContext=Context;globalThis.document={addEventListener(){},hidden:false};
 return {oscs,resumed:()=>resumed};}
// What an effect schedules: for each oscillator its waveform, frequency, start, stop (seconds after the call), gain envelope, peak and the time its tone has faded.
const schedule=(st,music,name)=>{st.oscs.length=0;music.effect(name);return st.oscs.map(o=>{const ev=o.g.ev.map(([k,v,t])=>[k,v,r(t)]);return {type:o.type,freq:o.fr.map(([k,v,t])=>[k,v,r(t)]),start:r(o.t0),stop:r(o.t1),gain:ev,peak:Math.max(...ev.map(e=>e[1])),end:ev[ev.length-1][2]};});};
const total=s=>Math.max(...s.map(o=>o.end)),first=s=>Math.min(...s.map(o=>o.start)),peak=s=>Math.max(...s.map(o=>o.peak));
const st=stage(),music=createMusic();
const NAMES=['tap','pick','fanfare','reward','door'],S={};for(const n of NAMES){S[n]=schedule(st,music,n);assert.ok(S[n].length>0,n+' schedules sound');}
for(const n of NAMES)for(const o of S[n]){assert.ok(o.peak<=.08+1e-9,n+': partial peak '+o.peak);assert.ok(o.start>=0&&o.stop>o.end&&o.end>o.start,n+': sane times');assert.ok(['sine','triangle'].includes(o.type),n+': soft waveform');
 assert.ok(o.gain[1][2]-o.start>=.008-1e-9,n+': attack not a click');assert.ok(o.freq[0][1]>=300&&o.freq[0][1]<=4000,n+': pitch range');}
const within=(n,lo,hi)=>{const t=total(S[n]);assert.ok(t>=lo&&t<=hi,n+' lasts '+t+' s, wanted '+lo+'-'+hi);assert.ok(Math.max(...S[n].map(o=>o.stop))<=hi+.06,n+' oscillators stop soon after');};
within('tap',.12,.18);within('pick',.06,.09);within('fanfare',1.8,2.3);within('reward',.8,1);within('door',.6,.8);
// No clipping: the most that sounds at once, by the sum of the peaks, stays well under 1 (the effects go through a .9 gain).
for(const n of NAMES){let worst=0;for(const o of S[n]){const t=o.start+.01;worst=Math.max(worst,S[n].filter(p=>p.start<=t&&p.end>=t).reduce((a,p)=>a+p.peak,0));}assert.ok(worst<.5,n+' summed peaks '+worst);}
console.log('Sound effects: tap, pick, fanfare, reward and door schedule soft tones of the right length, no partial above .08: OK');

// The fanfare: the three stars at +.15, +.45 and +.75 s (the finish card pops its stars then), rising; the flourish from 1.05 s.
{const f=S.fanfare,main=f.filter(o=>o.peak>=.04).sort((a,b)=>a.start-b.start),stars=[.15,.45,.75].map(t=>main.find(o=>Math.abs(o.start-t)<.005));
 assert.ok(stars.every(Boolean),'a star note at each of .15, .45, .75 s');assert.ok(f.every(o=>o.start<.14||o.start>=.145),'nothing sounds before the first star');
 assert.ok(stars[0].freq[0][1]<stars[1].freq[0][1]&&stars[1].freq[0][1]<stars[2].freq[0][1],'the stars rise in pitch');
 const run=main.filter(o=>o.start>=1.04&&o.start<1.28);assert.deepEqual(run.map(o=>Math.round(o.freq[0][1])),[698,880,1047,1397],'F-A-C-F arpeggio from 1.05 s');assert.ok(Math.abs(run[0].start-1.05)<.005);
 const chord=f.filter(o=>o.type==='triangle');assert.equal(chord.length,4,'a sustained four-note F chord');assert.ok(chord.every(o=>o.end>=2&&o.start>1.2),'held to about 2 s');
 assert.ok(f.some(o=>o.freq[0][1]>1700&&o.start>1.3),'sparkle on top');}
console.log('Fanfare: stars at +0.15/+0.45/+0.75 s rising, then the F-A-C-F run into an F chord with sparkle: OK');

// Relations between the sounds.
assert.ok(peak(S.pick)<peak(S.tap),'pick is quieter than tap');assert.ok(total(S.reward)<total(S.fanfare)-.5,'reward is shorter than the fanfare');
assert.ok(Math.round(S.door[0].freq[0][1])===880&&Math.round(S.door.find(o=>o.start>.2).freq[0][1])===698,'door: A5 then F5');
const rw=S.reward.filter(o=>o.peak>=.05);assert.ok(rw.length===3&&rw[0].freq[0][1]<rw[1].freq[0][1]&&rw[1].freq[0][1]<rw[2].freq[0][1],'reward: three rising notes');
console.log('Pick is softer than tap, reward shorter than the fanfare and rising, door is A then F: OK');

// Unknown names are silent; many quick calls are fine and every oscillator is stopped.
for(const n of ['','nope','constructor','toString','__proto__',undefined,null,5])assert.equal(schedule(st,music,n).length,0,'unknown '+String(n)+' is silent');
st.oscs.length=0;for(let i=0;i<200;i++)for(const n of NAMES)music.effect(n);assert.ok(st.oscs.length>1000&&st.oscs.every(o=>o.t1>o.t0),'200 rounds: all stopped');
console.log('Unknown names are silent; 1000 quick calls throw nothing and every oscillator has a stop: OK');

// The four older effects are unchanged: the schedule captured before this change (frequency, start, stop, gain envelope, per oscillator).
const BASE=JSON.parse(String.raw`{"lullaby":[{"type":"sine","freq":[["set",440,0]],"start":0,"stop":0.67,"gain":[["set",0.0001,0],["exp",0.05,0.015],["exp",0.0001,0.62]]},{"type":"sine","freq":[["set",880,0]],"start":0,"stop":0.45,"gain":[["set",0.0001,0],["exp",0.012,0.015],["exp",0.0001,0.4]]},{"type":"sine","freq":[["set",440,0.36]],"start":0.36,"stop":1.03,"gain":[["set",0.0001,0.36],["exp",0.05,0.375],["exp",0.0001,0.98]]},{"type":"sine","freq":[["set",880,0.36]],"start":0.36,"stop":0.81,"gain":[["set",0.0001,0.36],["exp",0.012,0.375],["exp",0.0001,0.76]]},{"type":"sine","freq":[["set",523.25,0.72]],"start":0.72,"stop":1.39,"gain":[["set",0.0001,0.72],["exp",0.05,0.735],["exp",0.0001,1.34]]},{"type":"sine","freq":[["set",1046.5,0.72]],"start":0.72,"stop":1.17,"gain":[["set",0.0001,0.72],["exp",0.012,0.735],["exp",0.0001,1.12]]},{"type":"sine","freq":[["set",440,1.3]],"start":1.3,"stop":1.97,"gain":[["set",0.0001,1.3],["exp",0.05,1.315],["exp",0.0001,1.92]]},{"type":"sine","freq":[["set",880,1.3]],"start":1.3,"stop":1.75,"gain":[["set",0.0001,1.3],["exp",0.012,1.315],["exp",0.0001,1.7]]},{"type":"sine","freq":[["set",440,1.66]],"start":1.66,"stop":2.33,"gain":[["set",0.0001,1.66],["exp",0.05,1.675],["exp",0.0001,2.28]]},{"type":"sine","freq":[["set",880,1.66]],"start":1.66,"stop":2.11,"gain":[["set",0.0001,1.66],["exp",0.012,1.675],["exp",0.0001,2.06]]},{"type":"sine","freq":[["set",523.25,2.02]],"start":2.02,"stop":2.69,"gain":[["set",0.0001,2.02],["exp",0.05,2.035],["exp",0.0001,2.64]]},{"type":"sine","freq":[["set",1046.5,2.02]],"start":2.02,"stop":2.47,"gain":[["set",0.0001,2.02],["exp",0.012,2.035],["exp",0.0001,2.42]]},{"type":"sine","freq":[["set",440,2.6]],"start":2.6,"stop":3.27,"gain":[["set",0.0001,2.6],["exp",0.05,2.615],["exp",0.0001,3.22]]},{"type":"sine","freq":[["set",880,2.6]],"start":2.6,"stop":3.05,"gain":[["set",0.0001,2.6],["exp",0.012,2.615],["exp",0.0001,3]]},{"type":"sine","freq":[["set",523.25,2.96]],"start":2.96,"stop":3.63,"gain":[["set",0.0001,2.96],["exp",0.05,2.975],["exp",0.0001,3.58]]},{"type":"sine","freq":[["set",1046.5,2.96]],"start":2.96,"stop":3.41,"gain":[["set",0.0001,2.96],["exp",0.012,2.975],["exp",0.0001,3.36]]},{"type":"sine","freq":[["set",698.46,3.32]],"start":3.32,"stop":3.99,"gain":[["set",0.0001,3.32],["exp",0.05,3.335],["exp",0.0001,3.94]]},{"type":"sine","freq":[["set",1396.92,3.32]],"start":3.32,"stop":3.77,"gain":[["set",0.0001,3.32],["exp",0.012,3.335],["exp",0.0001,3.72]]},{"type":"sine","freq":[["set",659.26,3.9]],"start":3.9,"stop":4.57,"gain":[["set",0.0001,3.9],["exp",0.05,3.915],["exp",0.0001,4.52]]},{"type":"sine","freq":[["set",1318.52,3.9]],"start":3.9,"stop":4.35,"gain":[["set",0.0001,3.9],["exp",0.012,3.915],["exp",0.0001,4.3]]},{"type":"sine","freq":[["set",587.33,4.26]],"start":4.26,"stop":4.93,"gain":[["set",0.0001,4.26],["exp",0.05,4.275],["exp",0.0001,4.88]]},{"type":"sine","freq":[["set",1174.66,4.26]],"start":4.26,"stop":4.71,"gain":[["set",0.0001,4.26],["exp",0.012,4.275],["exp",0.0001,4.66]]},{"type":"sine","freq":[["set",587.33,4.62]],"start":4.62,"stop":5.29,"gain":[["set",0.0001,4.62],["exp",0.05,4.635],["exp",0.0001,5.24]]},{"type":"sine","freq":[["set",1174.66,4.62]],"start":4.62,"stop":5.07,"gain":[["set",0.0001,4.62],["exp",0.012,4.635],["exp",0.0001,5.02]]},{"type":"sine","freq":[["set",523.25,4.98]],"start":4.98,"stop":6.23,"gain":[["set",0.0001,4.98],["exp",0.05,4.995],["exp",0.0001,6.18]]},{"type":"sine","freq":[["set",1046.5,4.98]],"start":4.98,"stop":5.43,"gain":[["set",0.0001,4.98],["exp",0.012,4.995],["exp",0.0001,5.38]]}],"sparkle":[{"type":"sine","freq":[["set",1319,0]],"start":0,"stop":0.21,"gain":[["set",0.0001,0],["exp",0.05,0.015],["exp",0.0001,0.16]]},{"type":"sine","freq":[["set",1568,0.05]],"start":0.05,"stop":0.26,"gain":[["set",0.0001,0.05],["exp",0.05,0.065],["exp",0.0001,0.21]]},{"type":"sine","freq":[["set",2093,0.1]],"start":0.1,"stop":0.31,"gain":[["set",0.0001,0.1],["exp",0.05,0.115],["exp",0.0001,0.26]]}],"pop":[{"type":"sine","freq":[["set",520,0],["exp",1150,0.09]],"start":0,"stop":0.14,"gain":[["set",0.0001,0],["exp",0.08,0.015],["exp",0.0001,0.09]]}],"boing":[{"type":"sine","freq":[["set",210,0],["exp",640,0.42]],"start":0,"stop":0.47,"gain":[["set",0.0001,0],["exp",0.07,0.015],["exp",0.0001,0.42]]}]}`);
for(const n in BASE){const now=schedule(st,music,n).map(({type,freq,start,stop,gain})=>({type,freq,start,stop,gain}));assert.deepEqual(now,BASE[n],n+' is exactly as before');}
console.log('lullaby, sparkle, pop and boing: oscillator schedule identical to the baseline: OK');

// Without Web Audio: effect() is a no-op for every name.
{delete globalThis.AudioContext;const m=createMusic();for(const n of [...NAMES,'lullaby','sparkle','pop','boing','x'])assert.equal(m.effect(n),undefined);m.play();m.stop();m.duck(true);m.preloadHorns();assert.equal(m.horn('car'),false);}
console.log('Without Web Audio: effect() does nothing for any name: OK');

// Horns: a failed download is tried again on a later press (after the pause), once at a time, and then plays; resume() rejections are harmless.
{const st2=stage(),started=[],requested=[],unhandled=[];process.on('unhandledRejection',e=>unhandled.push(e));
 const AC=globalThis.AudioContext;globalThis.AudioContext=class extends AC{createBufferSource(){const s={buffer:null,connect(){},start(){started.push(s.buffer.name);},stop(){}};return s;}decodeAudioData(d,ok){ok({name:new TextDecoder().decode(d)});}};
 let online=false,release=null;const fetch=async url=>{requested.push(url);if(release)await new Promise(r=>release=r);return online?{ok:true,arrayBuffer:async()=>new TextEncoder().encode('dog').buffer}:{ok:false,status:503};};
 let now=1e6;const realNow=Date.now;Date.now=()=>now;
 const m=createMusic({fetch,horns:{dog:HORNS.dog,cat:HORNS.cat}});const flush=()=>new Promise(r=>setTimeout(r,0));
 assert.equal(m.horn('dog'),false);await flush();await flush();assert.equal(requested.length,1,'first press fetches');
 assert.equal(m.horn('dog'),false);await flush();assert.equal(requested.length,1,'not again at once (an offline tablet is not hammered)');
 now+=6000;online=true;assert.equal(m.horn('dog'),false,'still false while it loads: the voice says the word');await flush();await flush();assert.equal(requested.length,2,'a later press retries');
 assert.equal(m.horn('dog'),true,'and now it plays');assert.deepEqual(started,['dog']);
 // preloadHorns retries a failed clip too, and with a request in flight a second press does not fetch again.
 now+=6000;online=false;m.preloadHorns();await flush();await flush();const n1=requested.filter(u=>u===HORNS.cat).length;
 now+=6000;release=()=>{};m.horn('cat');m.horn('cat');m.preloadHorns();assert.equal(requested.filter(u=>u===HORNS.cat).length,n1+1,'one request in flight per clip');
 release();await flush();await flush();Date.now=realNow;assert.ok(st2.resumed()>0,'resume called');assert.deepEqual(unhandled,[],'rejected resume() promise is not unhandled');}
console.log('Horns: a failed download is retried on a later press (not hammered, one in flight) and then plays; resume() is safe: OK');
