import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
// The new Norwegian voice (dist/voice.js and dist/tts/, 25 November 2026): the same woman's voice as in the space game, «ingrid», read in advance as clips.
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// ---- The speaker: clips one after the other, the music down while it speaks, and the iPad's own voice whenever the new one cannot read ----
{const {createVoice,SENTENCE_GAP}=await import('./dist/voice.js');
 let now=0;const started=[],stopped=[],jobs=[],ducks=[],fellBack=[];
 class Source{connect(){}start(at){this.at=at;started.push(this);}stop(){stopped.push(this);}}
 const ctx={state:'running',get currentTime(){return now;},destination:{},createGain:()=>({gain:{value:1},connect(){}}),createBuffer:(c,len,sr)=>{const d=new Float32Array(len);return {duration:len/sr,getChannelData:()=>d};},createBufferSource:()=>new Source()};
 class FakeClips{constructor(){this.status='off';this.sampleRate=1000;}get ready(){return this.status==='ready';}onChange(fn){this.fn=fn;}load(){this.status='ready';this.fn?.(this);}fail(r){this.failed=r;}
  speak(text,opts){const job={text,opts,cancelled:false,cancel(){job.cancelled=true;}};jobs.push(job);return job;}}
 let switchOn=true;const v=createVoice({on:()=>switchOn,duck:on=>ducks.push(on),fallback:t=>fellBack.push(t),neural:new FakeClips()});
 assert.equal(v.speak('Ikke klar'),false,'not ready: the iPad reads');
 v.neural.load();assert.equal(v.speak('Ingen lyd ennå'),false,'before the first touch there is no sound: the iPad reads');
 v.context=ctx;assert.equal(v.speak('Hei Sofia! Nå kjører vi.'),true,'ready and sound: the new voice reads');
 jobs.at(-1).onchunk(new Float32Array(1500));assert.deepEqual(ducks,[true],'the music goes down when it starts');jobs.at(-1).onchunk(new Float32Array(500));
 assert.ok(Math.abs(started[1].at-(started[0].at+1.5+SENTENCE_GAP))<1e-9,'the sentences follow each other with a short pause');
 jobs.at(-1).ondone();now=started[1].at+.5;started[1].onended();assert.deepEqual(ducks,[true,false],'and up again when it is done');assert.equal(v.speaking,false);
 assert.equal(v.speak('Først dette'),true);jobs.at(-1).onchunk(new Float32Array(300));const first=jobs.at(-1);
 assert.equal(v.speak('Så dette'),true);assert.ok(first.cancelled&&stopped.includes(started.at(-1)),'a new line cuts the one before at once');
 v.stop();assert.ok(jobs.at(-1).cancelled);assert.equal(v.speaking,false);
 assert.equal(v.speak('Feil'),true);jobs.at(-1).onerror();assert.equal(fellBack.at(-1),'Feil','fails before a word: the iPad reads the line');
 switchOn=false;assert.equal(v.speak('Av'),false,'switched off (or the sound off): the iPad reads');switchOn=true;
 // Sound on pause (iOS): woken first; read by the new voice if it wakes in time, else by the iPad.
 let resumed=0;ctx.state='interrupted';ctx.resume=()=>{resumed++;ctx.state='running';return Promise.resolve();};const n=jobs.length;
 assert.equal(v.speak('Vekket'),true);assert.equal(jobs.length,n,'waits for the sound');await wait(5);assert.equal(jobs.at(-1).text,'Vekket','read once it is awake');assert.equal(resumed,1);
 ctx.state='suspended';ctx.resume=()=>new Promise(()=>{});v.wakeMs=10;v.speak('Sover');await wait(30);assert.equal(fellBack.at(-1),'Sover','the iPad reads when the sound does not wake');
 ctx.state='suspended';v.speak('Avbrutt');v.stop();await wait(30);assert.notEqual(fellBack.at(-1),'Avbrutt','stopped while waking: nothing');ctx.state='running';
 // Unpacking that never answers: the iPad reads after a while, and two in a row switch the new voice off for now.
 v.stallMs=10;v.speak('Ingen svar');const stuck=jobs.at(-1);await wait(40);assert.ok(stuck.cancelled);assert.equal(fellBack.at(-1),'Ingen svar');assert.equal(v.neural.failed,undefined);
 v.speak('Igjen ingen svar');await wait(40);assert.equal(fellBack.at(-1),'Igjen ingen svar');assert.equal(v.neural.failed,'stalled');
 assert.match(v.note(true),/damestemme/);assert.match(v.note(false),/iPadens egen stemme/);
 console.log('Voice: the new voice reads once it is ready and there is sound, sentence after sentence with the music down; the iPad reads before, when it is off, on errors and stalls; sound on pause is woken: OK');}

// ---- The clips: every sentence the game can say has one, the pack is whole, PEG is read «pegg», and the player plays them in order ----
{const clips=await import('./dist/tts/clips.mjs'),make=await import('./tts/make-voice.mjs'),crypto=await import('node:crypto');
 const miss=await make.missing();assert.deepEqual(miss,[],'sentences without a clip (run node tts/make-voice.mjs): '+miss.slice(0,5).join(' | '));
 const index=JSON.parse(fs.readFileSync('dist/tts/voice/ingrid.json','utf8')),pack=fs.readFileSync('dist/tts/voice/ingrid.mp3'),keys=Object.keys(index.clips);
 assert.equal(crypto.createHash('sha1').update(pack).digest('hex').slice(0,12),index.hash,'the list belongs to this pack');assert.equal(pack.length,index.bytes);
 for(const [k,[at,len]] of Object.entries(index.clips)){assert.ok(at>=0&&len>400&&at+len<=pack.length,k);const h=pack.subarray(at,at+3);assert.ok(h[0]===0xff&&(h[1]&0xe0)===0xe0||h.toString()==='ID3','an MP3 stream starts at '+k);}
 for(const k of keys)assert.deepEqual(clips.sentences(k),[k],'a clip is one sentence: '+k);
 assert.deepEqual(clips.sentences('Hurra Sofia! Du fant barnehagen!Og se! 🦆 En stor, snill edderkopp.'),['Hurra Sofia!','Du fant barnehagen!','Og se!','En stor, snill edderkopp.']);
 assert.equal(clips.spoken('Mat gjennom PEG-slangen.'),'Mat gjennom pegg-slangen.','PEG is said «pegg»');
 assert.equal(clips.spoken('FOR VARMT FOR EN AND. HURRA, SOFIA! Hemmelig KIWI-bil'),'For varmt for en and. Hurra, sofia! Hemmelig KIWI-bil','headings in capitals are read as words, short names stay');assert.ok(keys.includes('Nå skal Sofia få mat gjennom PEG-slangen.'),'the PEG line has a clip');
 for(const f of ['tts/build-espeak.sh','tts/src/bridge.c','tts/src/no_listx','tts/src/g2p_no.py','tts/espeak-nb.wasm','tts/licenses/espeak-ng-GPL-3.0.txt','dist/tts/licenses/canora-norwegian-Apache-2.0.txt','dist/tts/licenses/canora-norwegian-NOTICE.txt'])assert.ok(fs.existsSync(f),f);
 const {ClipVoice}=await import('./dist/voice.js'),logged=[],timers=[],store=new Map();let online=true,decodes=0;
 const files={'ingrid.json':JSON.stringify({hash:'abc',bytes:3000,sampleRate:24000,clips:{'Hei Sofia!':[0,1000],'Vi er framme!':[1000,1500],'Hurra!':[2500,500]}}),'ingrid.mp3':new Uint8Array(3000)};
 const respond=body=>({ok:true,headers:{get:()=>null},clone(){return respond(body);},json:async()=>JSON.parse(body),arrayBuffer:async()=>(body.buffer||new TextEncoder().encode(body).buffer).slice(0)});
 class Offline{constructor(ch,len,sr){this.sr=sr;}decodeAudioData(buf,done,fail){decodes++;if(buf.byteLength===7)return fail(new Error('bad'));const d=new Float32Array(buf.byteLength).fill(.5);done({sampleRate:this.sr,getChannelData:()=>d});}}
 const saved={};for(const k of ['fetch','caches','OfflineAudioContext','AudioContext','setTimeout'])saved[k]=globalThis[k];const realInfo=console.info;console.info=m=>logged.push(m);
 Object.assign(globalThis,{OfflineAudioContext:Offline,AudioContext:function(){},setTimeout:(fn,ms)=>timers.push({fn,ms}),
  fetch:async url=>{if(!online)throw new Error('offline');const f=new URL(url).pathname.split('/').pop();return f in files?respond(files[f]):{ok:false,status:404};},
  caches:{open:async()=>({put:async(k,r)=>store.set(k,r),match:async k=>store.get(k),keys:async()=>[...store.keys()].map(url=>({url})),delete:async k=>store.delete(k.url||k)})}});
 try{const base='https://spill.example/tts/voice/',v=new ClipVoice(base);assert.equal(ClipVoice.supported(),true);await v.load();assert.equal(v.status,'ready');
  const play=(voice,t)=>new Promise(done=>{const job=voice.speak(t),lens=[];job.onchunk=c=>lens.push(c.length);job.ondone=()=>done(lens);job.onerror=()=>done('error');});
  assert.deepEqual(await play(v,'Vi er framme! Hurra!'),[1500,500],'one chunk per sentence, in order');assert.ok(v.covers('Hei Sofia!')&&!v.covers('Hei Sofia! Ny setning.'));
  assert.equal(await play(v,'Vi er framme! Ny setning her.'),'error','a sentence without a clip: the whole line goes to the iPad');assert.ok(logged.some(m=>m.includes('Ny setning her.')));
  const d0=decodes;await play(v,'Hurra!');assert.equal(decodes,d0,'a clip is unpacked once');
  for(let i=0;i<9;i++)v.remember('lang '+i,new Float32Array(9e5));assert.ok(v.cacheBytes<=24e6&&!v.cache.has('lang 0')&&v.cache.has('lang 8'),'the clip memory stays under 24 MB');
  online=false;const v2=new ClipVoice(base);await v2.load();assert.equal(v2.status,'ready','offline from the cache');
  store.clear();const v3=new ClipVoice(base);await v3.load();assert.equal(v3.status,'failed');assert.equal(timers.at(-1).ms,20000);online=true;timers.at(-1).fn();await new Promise(r=>saved.setTimeout(r,5));assert.equal(v3.status,'ready','tried again after 20 s');
  const v4=new ClipVoice(base);await v4.load();v4.index.clips['Hei Sofia!']=[0,7];const n0=timers.length;assert.equal(await play(v4,'Hei Sofia!'),'error','a clip that will not decode: the iPad reads');
  assert.equal(v4.error,'decode');assert.equal(timers.length,n0,'and it is not tried again');}
 finally{Object.assign(globalThis,saved);console.info=realInfo;}
 console.log('Voice: '+keys.length+' sentences with clips ('+(pack.length/1e6).toFixed(1)+' MB), the pack whole, PEG read «pegg»; the player plays the clips in order, once unpacked, offline from the cache, tries a failed download again and lets the iPad read anything missing: OK');}

// ---- The game: say() lets the new voice read when it can, and the iPad's own voice otherwise; the switch in the menu is saved and on from the start ----
{const {spoken}=await import('./dist/tts/clips.mjs'),data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
 const launch=async(storage,ready)=>{const els=new Map();let callbacks=[],now=0;const canvasContext=new Proxy({},{get:()=>()=>{}}),device=[],neural=[],loads=[];
  const element=id=>{if(!els.has(id))els.set(id,{hidden:false,textContent:'',value:'',style:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},addEventListener(){},getContext(){return canvasContext}});return els.get(id);};
  const tts={cancel(){},speak:u=>device.push(u.text),getVoices:()=>[]};const createVoice=({on})=>({start(){},load:o=>loads.push(o),stop(){},note:s=>s?'på':'av',speak:t=>{if(!ready||!on())return false;neural.push(t);return true;}});
  const env={T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,createVoice,spoken,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},
   window:{addEventListener(){}},SpeechSynthesisUtterance:class{constructor(t){this.text=t;}},speechSynthesis:tts,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),createWorld:()=>({height:()=>160,update(){},resetCamera(){},setTurnArrow(){}})};
  env.window.speechSynthesis=tts;Object.defineProperty(env,'localStorage',{get:()=>storage});const ctx=vm.createContext(env);
  const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={say,voiceOn:()=>voiceOn};})()`,ctx);for(let i=0;i<12;i++){await Promise.resolve();const q=callbacks.splice(0);q.forEach(cb=>cb(now+=45));}await init;
  return {test:env.test,element,device,neural,loads};};
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
 let g=await launch(storage,true);assert.equal(g.test.voiceOn(),true,'on from the start');assert.equal(g.element('voice').value,'on');assert.equal(g.element('voiceNote').textContent,'på');
 g.test.say('Hei Sofia!');assert.deepEqual(g.neural,['Hei Sofia!']);assert.deepEqual(g.device,[],'the new voice reads, not the iPad');
 g=await launch(storage,false);g.test.say('Ikke klar ennå');assert.deepEqual(g.device,['Ikke klar ennå'],'not ready: the iPad reads');g.test.say('Mat gjennom PEG-slangen.');assert.equal(g.device.at(-1),'Mat gjennom pegg-slangen.','the iPad says PEG as a word too');
 g=await launch(storage,true);g.element('voice').onchange({target:{value:'off'}});g.test.say('Av');assert.deepEqual(g.device,['Av'],'switched off: the iPad reads');
 g=await launch(storage,true);assert.equal(g.element('voice').value,'off','the choice is saved');g.element('voice').onchange({target:{value:'on'}});assert.ok(g.loads.length===1&&g.loads[0].force===true,'switching it on starts it at once');
 g=await launch(storage,true);assert.equal(g.test.voiceOn(),true);
 console.log('Voice in the game: say() uses the new voice when it is ready and the iPad\'s voice otherwise; "Stemme" in the menu is on from the start and saved: OK');}
