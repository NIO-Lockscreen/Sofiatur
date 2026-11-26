import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
// The Norwegian voice (dist/voice.js and dist/tts/, 26 November 2026): the same as in the space game, Piper «talesyntese» (no_NO-talesyntese-medium),
// read in advance as clips at the model's own pitch, with «Stemme» in the menu to use the iPad's own voice instead.
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
 assert.match(v.note(true),/Piper-stemmen/);assert.match(v.note(false),/^Av: iPadens eller nettleserens egen stemme leser/);v.neural.status='ready';assert.match(v.note(true),/^Piper-stemmen er klar: «talesyntese»/);
 // Still loading when a line comes (the first seconds after start): it is started if need be, and the line waits up to three seconds for it
 // instead of going to the iPad at once. The download starts whether the sound is on or not: only the switch counts (25 November 2026).
 {const lj=[],fb=[];class Loading{constructor(){this.status='off';this.ensured=0;}get ready(){return this.status==='ready';}onChange(){}ensure(){this.ensured++;if(this.status==='off')this.status='loading';}load(){this.loaded=(this.loaded||0)+1;}fail(){}speak(t){const j={text:t,cancel(){}};lj.push(j);return j;}}
  const n=new Loading(),w=createVoice({on:()=>true,fallback:t=>fb.push(t),neural:n});w.context={...ctx,state:'running'};w.waitMs=300;
  assert.equal(w.speak('Hei Sofia!'),true,'not started yet: started now, and the line waits');assert.equal(n.ensured,1);assert.equal(n.status,'loading');
  await wait(40);n.status='ready';await wait(250);assert.deepEqual(lj.map(j=>j.text),['Hei Sofia!'],'read by the new voice once it is ready');assert.deepEqual(fb,[],'not by the iPad');w.stop();
  n.status='loading';w.speak('Venter lenge');await wait(450);assert.deepEqual(fb,['Venter lenge'],'still loading after the wait: the iPad reads');
  let sw=true;const n2=new Loading(),w2=createVoice({on:()=>false,switchOn:()=>sw,neural:n2,delay:1});w2.start();await wait(20);assert.equal(n2.loaded,1,'loaded with the sound off');
  sw=false;const n3=new Loading(),w3=createVoice({on:()=>false,switchOn:()=>sw,neural:n3,delay:1});w3.start();await wait(20);assert.equal(n3.loaded,undefined,'not with the switch off');
  assert.match(fs.readFileSync('dist/voice.js','utf8'),/'pointerdown','pointerup','touchend','click','keydown'/,'lifting the finger wakes the sound on an iPad');}
 console.log('Voice: the new voice reads once it is ready and there is sound, sentence after sentence with the music down; the iPad reads before, when it is off, on errors and stalls; sound on pause is woken; a line waits a moment for a voice still loading; it loads with the sound off: OK');}

// ---- The clips: every sentence the game can say has one, made by Piper «talesyntese» with the ids Python Piper gives, the pack is whole, PEG is read «pegg»,
// the old voices are gone, and the player plays the clips in order ----
{const clips=await import('./dist/tts/clips.mjs'),make=await import('./tts/make-voice.mjs'),crypto=await import('node:crypto');
 const miss=await make.missing();assert.deepEqual(miss,[],'sentences without a clip (run node tts/make-voice.mjs): '+miss.slice(0,5).join(' | '));
 const index=JSON.parse(fs.readFileSync('dist/tts/voice/talesyntese.json','utf8')),pack=fs.readFileSync('dist/tts/voice/talesyntese.mp3'),keys=Object.keys(index.clips);
 assert.match(index.voice,/^Piper «talesyntese» \(no_NO-talesyntese-medium/);assert.equal(index.sampleRate,22050,'the model\'s own sample rate');assert.equal(index.lengthScale,make.VOICE.lengthScale);
 for(const gone of ['dist/tts/voice/ingrid.mp3','dist/tts/voice/ingrid.json','dist/tts/voice-shift.mjs','dist/tts/piper-worker.mjs','tts/src/g2p_no.py','tts/src/canora-config.json','dist/tts/licenses/canora-norwegian-Apache-2.0.txt'])assert.ok(!fs.existsSync(gone),'the old voices are gone: '+gone);
 // Phonemes to ids as Python Piper 1.8 does it (tts/src/piper-fixture.json), and the game's fixes for words espeak gets wrong.
 {const core=await import('./tts/piper-core.mjs'),espeak=await core.startEspeak('tts'),config=make.voiceConfig();assert.equal(config.dataset,'talesyntese');
  for(const c of JSON.parse(fs.readFileSync('tts/src/piper-fixture.json','utf8')).cases)assert.deepEqual(core.textToIdSentences(espeak,c.text,config),c.ids,'the same ids as Python Piper: '+c.text);
  const said=t=>core.fixPhonemes(core.ipa(espeak,t),make.PHONEME_FIXES);
  for(const [word,expected] of [['Sofia','sʊfˈiːʲɑ'],['ishall','ˈiːshˌɑl'],['KIWI','kˈiːviː'],['pizza','pˈɪtsɑ'],['burger','bˈœrɡər'],['sushi','sˈʉːʃiː'],['mobilen','mʊbˈiːlən'],['Vi er framme!','viːʲ ˌɛːr frˈɑmma'],['igjen','ˈɪjən'],['støvsugeren','stˈœvsʉːɡərən'],['laderen','lˈɑːdərən']])assert.equal(said(word),expected,word);}
 assert.equal(crypto.createHash('sha1').update(pack).digest('hex').slice(0,12),index.hash,'the list belongs to this pack');assert.equal(pack.length,index.bytes);
 for(const [k,[at,len]] of Object.entries(index.clips)){assert.ok(at>=0&&len>400&&at+len<=pack.length,k);const h=pack.subarray(at,at+3);assert.ok(h[0]===0xff&&(h[1]&0xe0)===0xe0||h.toString()==='ID3','an MP3 stream starts at '+k);}
 for(const k of keys)assert.deepEqual(clips.sentences(k),[k],'a clip is one sentence: '+k);
 assert.deepEqual(clips.sentences('Hurra Sofia! Du fant barnehagen!Og se! 🦆 En stor, snill edderkopp.'),['Hurra Sofia!','Du fant barnehagen!','Og se!','En stor, snill edderkopp.']);
 assert.equal(clips.spoken('Mat gjennom PEG-slangen.'),'Mat gjennom pegg-slangen.','PEG is said «pegg»');
 assert.equal(clips.spoken('FOR VARMT FOR EN AND. HURRA, SOFIA! Hemmelig KIWI-bil'),'For varmt for en and. Hurra, sofia! Hemmelig KIWI-bil','headings in capitals are read as words, short names stay');assert.ok(keys.includes('Nå skal Sofia få mat gjennom PEG-slangen.'),'the PEG line has a clip');
 for(const f of ['tts/build-espeak.sh','tts/src/bridge.c','tts/src/no_listx','tts/piper-core.mjs','tts/render-voice.py','tts/no_NO-talesyntese-medium.onnx.json','tts/espeak-nb.wasm','tts/licenses/espeak-ng-GPL-3.0.txt','dist/tts/licenses/talesyntese-MODEL_CARD.md'])assert.ok(fs.existsSync(f),f);
 const {ClipVoice}=await import('./dist/voice.js'),logged=[],timers=[],store=new Map();let online=true,decodes=0;
 const files={'talesyntese.json':JSON.stringify({hash:'abc',bytes:3000,sampleRate:22050,clips:{'Hei Sofia!':[0,1000],'Vi er framme!':[1000,1500],'Hurra!':[2500,500]}}),'talesyntese.mp3':new Uint8Array(3000)};
 const cacheNames=new Set(['sofiatur-stemme','sofia-tts-1','noe-annet']);
 const respond=body=>({ok:true,headers:{get:()=>null},clone(){return respond(body);},json:async()=>JSON.parse(body),arrayBuffer:async()=>(body.buffer||new TextEncoder().encode(body).buffer).slice(0)});
 class Offline{constructor(ch,len,sr){this.sr=sr;}decodeAudioData(buf,done,fail){decodes++;if(buf.byteLength===7)return fail(new Error('bad'));const d=new Float32Array(buf.byteLength).fill(.5);done({sampleRate:this.sr,getChannelData:()=>d});}}
 const saved={};for(const k of ['fetch','caches','OfflineAudioContext','AudioContext','setTimeout'])saved[k]=globalThis[k];const realInfo=console.info;console.info=m=>logged.push(m);
 Object.assign(globalThis,{OfflineAudioContext:Offline,AudioContext:function(){},setTimeout:(fn,ms)=>timers.push({fn,ms}),
  fetch:async url=>{if(!online)throw new Error('offline');const f=new URL(url).pathname.split('/').pop();return f in files?respond(files[f]):{ok:false,status:404};},
  caches:{keys:async()=>[...cacheNames],delete:async n=>cacheNames.delete(n),open:async()=>({put:async(k,r)=>store.set(k,r),match:async k=>store.get(k)?.clone(),keys:async()=>[...store.keys()].map(url=>({url})),delete:async k=>store.delete(k.url||k)})}});
 try{const base='https://spill.example/tts/voice/',v=new ClipVoice(base);assert.equal(ClipVoice.supported(),true);
  // What the old voices left on the iPad: the «ingrid» pack in the same cache, and the Piper files from when the voice ran on the iPad (sofia-tts-*).
  store.set(base+'ingrid.mp3?v=old',respond('x'));store.set(base+'ingrid.json',respond('{}'));
  await v.load();assert.equal(v.status,'ready');assert.equal(v.sampleRate,22050);await new Promise(r=>saved.setTimeout(r,5));
  assert.deepEqual([...store.keys()].sort(),[base+'talesyntese.json',base+'talesyntese.mp3?v=abc'],'the «ingrid» pack is cleared out of the cache');
  assert.deepEqual([...cacheNames],['sofiatur-stemme','noe-annet'],'and the old Piper files');
  const play=(voice,t)=>new Promise(done=>{const job=voice.speak(t),lens=[];job.onchunk=c=>lens.push(c.length);job.ondone=()=>done(lens);job.onerror=()=>done('error');});
  assert.deepEqual(await play(v,'Vi er framme! Hurra!'),[1500,500],'one chunk per sentence, in order');assert.ok(v.covers('Hei Sofia!')&&!v.covers('Hei Sofia! Ny setning.'));
  assert.equal(await play(v,'Vi er framme! Ny setning her.'),'error','a sentence without a clip: the whole line goes to the iPad');assert.ok(logged.some(m=>m.includes('Ny setning her.')));
  const d0=decodes;await play(v,'Hurra!');assert.equal(decodes,d0,'a clip is unpacked once');
  for(let i=0;i<9;i++)v.remember('lang '+i,new Float32Array(9e5));assert.ok(v.cacheBytes<=24e6&&!v.cache.has('lang 0')&&v.cache.has('lang 8'),'the clip memory stays under 24 MB');
  online=false;const v2=new ClipVoice(base);await v2.load();assert.equal(v2.status,'ready','offline from the cache');
  store.clear();const v3=new ClipVoice(base);await v3.load();assert.equal(v3.status,'failed');assert.equal(timers.at(-1).ms,10000);online=true;timers.at(-1).fn();await new Promise(r=>saved.setTimeout(r,5));assert.equal(v3.status,'ready','tried again after 10 s');
  // No limit to the tries (before 25 November 2026: two, and then it had to be switched off and on), and at once when the net is back.
  online=false;store.clear();const v5=new ClipVoice(base);await v5.load();const waits=[timers.at(-1).ms];for(let i=0;i<5;i++){timers.at(-1).fn();await new Promise(r=>saved.setTimeout(r,5));waits.push(timers.at(-1).ms);}
  assert.deepEqual(waits,[10000,20000,40000,80000,120000,120000],'tried again with no limit, at most two minutes apart');
  online=true;v5.retry();await new Promise(r=>saved.setTimeout(r,5));assert.equal(v5.status,'ready','the net back: at once');
  const v6=new ClipVoice(base);v6.ensure();await new Promise(r=>saved.setTimeout(r,5));assert.equal(v6.status,'ready','something to say before it was started: it starts');
  const v4=new ClipVoice(base);await v4.load();assert.equal(v4.status,'ready',v4.error);v4.index.clips['Hei Sofia!']=[0,7];const n0=timers.length;
  assert.equal(await play(v4,'Hei Sofia!'),'error','a clip that will not unpack: the iPad reads that line');assert.equal(v4.status,'ready','and the voice stays on');assert.equal(timers.length,n0);
  await play(v4,'Hei Sofia!');await play(v4,'Hei Sofia!');assert.equal(v4.error,'decode');assert.equal(v4.status,'failed');assert.equal(timers.at(-1).ms,30000,'three in a row: a rest of 30 s');
  v4.ensure();assert.equal(v4.status,'failed','not before the rest is over');timers.at(-1).fn();await new Promise(r=>saved.setTimeout(r,5));assert.equal(v4.status,'ready','then back by itself, without a new download');}
 finally{Object.assign(globalThis,saved);console.info=realInfo;}
 console.log('Voice: '+keys.length+' sentences with Piper «talesyntese» clips ('+(pack.length/1e6).toFixed(1)+' MB), ids as Python Piper, the old voices gone and cleared from the cache, the pack whole, PEG read «pegg»; the player plays the clips in order, once unpacked, offline from the cache, tries a failed download again with no limit, rests and comes back by itself, and lets the iPad read anything missing: OK');}

// ---- The game: say() lets the new voice read when it can, and the iPad's own voice otherwise; the switch in the menu is saved and on from the start ----
{const {spoken}=await import('./dist/tts/clips.mjs'),data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
 const launch=async(storage,ready)=>{const els=new Map();let callbacks=[],now=0;const canvasContext=new Proxy({},{get:()=>()=>{}}),device=[],neural=[],loads=[],starts=[];
  const element=id=>{if(!els.has(id))els.set(id,{hidden:false,textContent:'',value:'',style:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},addEventListener(){},getContext(){return canvasContext}});return els.get(id);};
  const tts={cancel(){},speak:u=>device.push(u.text),getVoices:()=>[]};const createVoice=({on,switchOn})=>({start(){starts.push(switchOn());},load:o=>loads.push(o),stop(){},note:s=>s?'på':'av',speak:t=>{if(!ready||!on())return false;neural.push(t);return true;}});
  const env={T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,createVoice,spoken,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},
   window:{addEventListener(){}},SpeechSynthesisUtterance:class{constructor(t){this.text=t;}},speechSynthesis:tts,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),createWorld:()=>({height:()=>160,update(){},resetCamera(){},setTurnArrow(){}})};
  env.window.speechSynthesis=tts;Object.defineProperty(env,'localStorage',{get:()=>storage});const ctx=vm.createContext(env);
  const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={say,voiceOn:()=>voiceOn};})()`,ctx);for(let i=0;i<12;i++){await Promise.resolve();const q=callbacks.splice(0);q.forEach(cb=>cb(now+=45));}await init;
  return {test:env.test,element,device,neural,loads,starts};};
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
 let g=await launch(storage,true);assert.equal(g.test.voiceOn(),true,'on from the start');assert.deepEqual(g.starts,[true],'and started at once, switched on');assert.equal(g.element('voice').value,'on');assert.equal(g.element('voiceNote').textContent,'på');
 g.test.say('Hei Sofia!');assert.deepEqual(g.neural,['Hei Sofia!']);assert.deepEqual(g.device,[],'the new voice reads, not the iPad');
 g=await launch(storage,false);g.test.say('Ikke klar ennå');assert.deepEqual(g.device,['Ikke klar ennå'],'not ready: the iPad reads');g.test.say('Mat gjennom PEG-slangen.');assert.equal(g.device.at(-1),'Mat gjennom pegg-slangen.','the iPad says PEG as a word too');
 g=await launch(storage,true);g.element('voice').onchange({target:{value:'off'}});g.test.say('Av');assert.deepEqual(g.device,['Av'],'switched off: the iPad reads');
 g=await launch(storage,true);assert.equal(g.element('voice').value,'off','the choice is saved');g.element('voice').onchange({target:{value:'on'}});assert.ok(g.loads.length===1&&g.loads[0].force===true,'switching it on starts it at once');
 g=await launch(storage,true);assert.equal(g.test.voiceOn(),true);
 // Switched off before the new voice («ingrid», or Piper on 26 November 2026): on again, once.
 for(const before of [{v:3,music:'on',voice:'off'},{v:3,music:'on',voice:'off',voiceV:2}]){const old=new Map([['sofiatur.innstillinger',JSON.stringify(before)]]),st={getItem:k=>old.get(k)??null,setItem:(k,v)=>old.set(k,String(v))};
  g=await launch(st,true);assert.equal(g.test.voiceOn(),true,'off from before the Piper voice: on again');assert.equal(g.element('voice').value,'on');}
 assert.match(fs.readFileSync('dist/index.html','utf8'),/<select id="voice"><option value="on">Piper «talesyntese» · norsk stemme<\/option><option value="off">iPadens egen stemme<\/option><\/select>/,'the switch in the menu');
 console.log('Voice in the game: say() uses the new voice when it is ready and the iPad\'s voice otherwise; "Stemme" in the menu is on from the start and saved: OK');}
