import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
// The new Norwegian voice (dist/voice.js and dist/tts/, 24 November 2026): the same woman's voice as in the space game, made on the iPad.
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// ---- The speaker: clips one after the other, the music down while it speaks, and the iPad's own voice whenever the new one cannot read ----
{const {createVoice,TALK_PACE,SENTENCE_GAP}=await import('./dist/voice.js');
 let now=0;const started=[],stopped=[],jobs=[],ducks=[],fellBack=[];
 class Source{connect(){}start(at){this.at=at;started.push(this);}stop(){stopped.push(this);}}
 const ctx={state:'running',get currentTime(){return now;},destination:{},createGain:()=>({gain:{value:1},connect(){}}),createBuffer:(c,len,sr)=>{const d=new Float32Array(len);return {duration:len/sr,getChannelData:()=>d};},createBufferSource:()=>new Source()};
 class FakePiper{constructor(){this.status='off';this.sampleRate=1000;}get ready(){return this.status==='ready';}onChange(fn){this.fn=fn;}load(){this.status='ready';this.fn?.(this);}fail(r){this.failed=r;}
  speak(text,opts){const job={text,opts,cancelled:false,cancel(){job.cancelled=true;}};jobs.push(job);return job;}}
 let switchOn=true;const v=createVoice({on:()=>switchOn,duck:on=>ducks.push(on),fallback:t=>fellBack.push(t),neural:new FakePiper()});
 assert.equal(v.speak('Ikke klar'),false,'not ready: the iPad reads');
 v.neural.load();assert.equal(v.speak('Ingen lyd ennå'),false,'before the first touch there is no sound: the iPad reads');
 v.context=ctx;assert.equal(v.speak('Hei Sofia! Nå kjører vi.'),true,'ready and sound: the new voice reads');assert.equal(jobs.at(-1).opts.lengthScale,TALK_PACE);
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
 // A worker that never answers: the iPad reads after a while, and two in a row switch the new voice off for now.
 v.stallMs=10;v.speak('Ingen svar');const stuck=jobs.at(-1);await wait(40);assert.ok(stuck.cancelled);assert.equal(fellBack.at(-1),'Ingen svar');assert.equal(v.neural.failed,undefined);
 v.speak('Igjen ingen svar');await wait(40);assert.equal(fellBack.at(-1),'Igjen ingen svar');assert.equal(v.neural.failed,'stalled');
 assert.match(v.note(true),/damestemme/);assert.match(v.note(false),/iPadens egen stemme/);
 console.log('Voice: the new voice reads once it is ready and there is sound, sentence after sentence with the music down; the iPad reads before, when it is off, on errors and stalls; sound on pause is woken: OK');}

// ---- The worker's guard: only a real crash while the voice starts counts, and it takes two in a row before it waits for the switch; failures are tried again ----
{const store=new Map(),on={},timers=[];
 Object.assign(globalThis,{localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},Worker:class{postMessage(){}terminate(){}},caches:{},AudioContext:function(){}});
 const doc={hidden:false,addEventListener:(t,f)=>on[t]=f};globalThis.document=doc;globalThis.addEventListener=(t,f)=>on[t]=f;
 const realTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms)=>timers.push({fn,ms});
 const {PiperVoice}=await import('./dist/voice.js');const crashes=()=>PiperVoice.crashes();
 let p=new PiperVoice();p.load();p.message({type:'starting'});assert.equal(crashes(),1);
 p=new PiperVoice();p.load();assert.equal(p.status,'loading','one crash: it starts by itself');p.message({type:'starting'});
 p=new PiperVoice();p.load();assert.equal(p.error,'crash','two in a row: it waits for the switch');p.load({force:true});p.message({type:'starting'});p.message({type:'ready'});assert.equal(crashes(),0);
 p=new PiperVoice();p.load();p.message({type:'starting'});on.pagehide();assert.equal(crashes(),0,'closing the page while it starts is no crash');
 p=new PiperVoice();p.load();p.message({type:'starting'});doc.hidden=true;on.visibilitychange();assert.equal(crashes(),0,'nor hiding it');doc.hidden=false;on.visibilitychange();assert.equal(crashes(),1);p.message({type:'ready'});
 p=new PiperVoice();p.load();p.fail('nett');assert.equal(timers.at(-1).ms,20000);timers.at(-1).fn();assert.equal(p.status,'loading');p.fail('nett');assert.equal(timers.at(-1).ms,40000);
 globalThis.setTimeout=realTimeout;for(const k of ['localStorage','Worker','caches','AudioContext','document','addEventListener'])delete globalThis[k];
 console.log('Voice: a start the page did not survive counts, two in a row before it waits; closing or hiding the page is no crash; failures are tried again after 20 and 40 s: OK');}

// ---- The files: everything the worker loads is in dist/tts, the phonemes are Piper's, and the woman's voice is a woman's ----
{const worker=fs.readFileSync('dist/tts/piper-worker.mjs','utf8'),files=[...worker.matchAll(/\['([\w.-]+)', \d+\]/g)].map(m=>m[1]);
 assert.equal(files.length,6);for(const f of [...files,'piper-core.mjs','voice-shift.mjs','ort.wasm.bundle.min.mjs','espeak-nb.mjs','licenses/espeak-ng-GPL-3.0.txt','licenses/onnxruntime-web-MIT.txt','licenses/talesyntese-MODEL_CARD.md'])assert.ok(fs.existsSync('dist/tts/'+f),f);
 assert.match(worker,/import \{ womanVoice \} from '\.\/voice-shift\.mjs'/);assert.ok(fs.existsSync('tts/build-espeak.sh')&&fs.existsSync('tts/src/bridge.c')&&fs.existsSync('tts/src/no_listx'),'the espeak-ng source changes are kept (GPL)');
 const core=await import('./dist/tts/piper-core.mjs'),createEspeak=(await import('./dist/tts/espeak-nb.mjs')).default,data=fs.readFileSync('dist/tts/espeak-nb.data');
 const espeak=await createEspeak({wasmBinary:fs.readFileSync('dist/tts/espeak-nb.wasm'),getPreloadedPackage:()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),print(){},printErr(){}});
 assert.equal(espeak.ccall('ph_init','number',['string'],['nb']),0);const config=JSON.parse(fs.readFileSync('dist/tts/no_NO-talesyntese-medium.onnx.json','utf8'));
 for(const c of JSON.parse(fs.readFileSync('tts/src/piper-fixture.json','utf8')).cases)assert.deepEqual(core.textToIdSentences(espeak,c.text,config),c.ids,c.text);
 const {womanVoice,PITCH}=await import('./dist/tts/voice-shift.mjs'),sr=22050,x=new Float32Array(sr);for(let i=0;i<sr;i+=Math.round(sr/120))for(let j=0;j<60&&i+j<sr;j++)x[i+j]=Math.exp(-j/12)*Math.sin(j*.6);
 const y=womanVoice(x,sr),lag=a=>{const r=[];let best=0;for(let k=40;k<300;k++){let c=0,e0=0,e1=0;for(let i=3000;i<6000;i++){c+=a[i]*a[i+k];e0+=a[i]*a[i];e1+=a[i+k]*a[i+k];}r[k]=c/Math.sqrt(e0*e1);best=Math.max(best,r[k]);}for(let k=41;k<299;k++)if(r[k]>=best*.9&&r[k]>=r[k-1]&&r[k]>=r[k+1])return k;};
 assert.equal(y.length,x.length);assert.ok(Math.abs(lag(x)/lag(y)-PITCH)<.1,'the pitch goes up '+PITCH+' times: '+(sr/lag(x)).toFixed(0)+' -> '+(sr/lag(y)).toFixed(0)+' Hz');
 console.log('Voice: every file the worker loads is in dist/tts, the phonemes are the same as Python Piper\'s, and the voice is raised to a woman\'s: OK');}

// ---- The game: say() lets the new voice read when it can, and the iPad's own voice otherwise; the switch in the menu is saved and on from the start ----
{const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
 const launch=async(storage,ready)=>{const els=new Map();let callbacks=[],now=0;const canvasContext=new Proxy({},{get:()=>()=>{}}),device=[],neural=[],loads=[];
  const element=id=>{if(!els.has(id))els.set(id,{hidden:false,textContent:'',value:'',style:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},addEventListener(){},getContext(){return canvasContext}});return els.get(id);};
  const tts={cancel(){},speak:u=>device.push(u.text),getVoices:()=>[]};const createVoice=({on})=>({start(){},load:o=>loads.push(o),stop(){},note:s=>s?'på':'av',speak:t=>{if(!ready||!on())return false;neural.push(t);return true;}});
  const env={T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,createVoice,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},
   window:{addEventListener(){}},SpeechSynthesisUtterance:class{constructor(t){this.text=t;}},speechSynthesis:tts,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),createWorld:()=>({height:()=>160,update(){},resetCamera(){},setTurnArrow(){}})};
  env.window.speechSynthesis=tts;Object.defineProperty(env,'localStorage',{get:()=>storage});const ctx=vm.createContext(env);
  const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={say,voiceOn:()=>voiceOn};})()`,ctx);for(let i=0;i<12;i++){await Promise.resolve();const q=callbacks.splice(0);q.forEach(cb=>cb(now+=45));}await init;
  return {test:env.test,element,device,neural,loads};};
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
 let g=await launch(storage,true);assert.equal(g.test.voiceOn(),true,'on from the start');assert.equal(g.element('voice').value,'on');assert.equal(g.element('voiceNote').textContent,'på');
 g.test.say('Hei Sofia!');assert.deepEqual(g.neural,['Hei Sofia!']);assert.deepEqual(g.device,[],'the new voice reads, not the iPad');
 g=await launch(storage,false);g.test.say('Ikke klar ennå');assert.deepEqual(g.device,['Ikke klar ennå'],'not ready: the iPad reads');
 g=await launch(storage,true);g.element('voice').onchange({target:{value:'off'}});g.test.say('Av');assert.deepEqual(g.device,['Av'],'switched off: the iPad reads');
 g=await launch(storage,true);assert.equal(g.element('voice').value,'off','the choice is saved');g.element('voice').onchange({target:{value:'on'}});assert.ok(g.loads.length===1&&g.loads[0].force===true,'switching it on starts it at once');
 g=await launch(storage,true);assert.equal(g.test.voiceOn(),true);
 console.log('Voice in the game: say() uses the new voice when it is ready and the iPad\'s voice otherwise; "Stemme" in the menu is on from the start and saved: OK');}
