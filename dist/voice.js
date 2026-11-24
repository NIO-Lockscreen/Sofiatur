// The new Norwegian voice (24 November 2026, the same as in Sofia's space game, SofiaSpace): a woman's voice made on the device. Piper «talesyntese»
// (Nasjonalbiblioteket, CC0) runs in a Web Worker (tts/piper-worker.mjs) with espeak-ng for the phonemes and ONNX Runtime Web for the sound, and
// tts/voice-shift.mjs turns the man's voice into a woman's (formants up 1.18, pitch up 1.7). The first time about 48 MB are downloaded and kept in
// Cache Storage; after that it works without the net. Until it is ready, when it is switched off, and whenever it fails, the device's own voice reads.
// game.js: say() asks speak(text) first and uses the device voice when it says no.

// VERSION belongs to the files in Cache Storage (a new value downloads 48 MB again); CODE to the code in the worker.
const VERSION='1',CODE='2',GUARD='sofiatur-stemme-starter';
// A little slower than ordinary reading, for a five-year-old (Piper's length_scale), and a short pause between sentences.
export const TALK_PACE=1.12,SENTENCE_GAP=.22;

// The worker, its files and the clips already made.
export class PiperVoice{
 constructor(base=new URL('./tts/',import.meta.url).href){this.base=base;this.status='off';this.progress=0;this.sampleRate=22050;this.worker=null;this.jobs=new Map();this.seq=0;this.cache=new Map();this.cacheBytes=0;this.listeners=new Set();this.error='';this.retries=0;this.guardFrom=null;this.starting=false;
  // Closing or hiding the page while the voice starts is no crash, so it is not counted; back before it is ready, it counts again.
  const away=()=>{if(this.guardFrom!=null)this.unguard();},back=()=>{if(this.starting&&this.guardFrom==null)this.guard(true);};
  try{globalThis.addEventListener?.('pagehide',away);globalThis.document?.addEventListener?.('visibilitychange',()=>globalThis.document.hidden?away():back());}catch{}}
 static supported(){try{return typeof Worker==='function'&&typeof WebAssembly==='object'&&typeof BigInt64Array==='function'&&typeof caches!=='undefined'&&!!(globalThis.AudioContext||globalThis.webkitAudioContext);}catch{return false;}}
 get ready(){return this.status==='ready';}
 onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 set(status){this.status=status;for(const fn of this.listeners)try{fn(this);}catch{}}
 // A start the page did not survive (an older iPad out of memory) is counted; only after two in a row the voice waits for the switch in the menu.
 static crashes(){try{const v=JSON.parse(localStorage.getItem(GUARD)||'0');return v&&typeof v==='object'?Math.max(0,+v.n||0):v?1:0;}catch{return 0;}}
 static crashedBefore(){return PiperVoice.crashes()>=2;}
 guard(on){try{if(on){if(this.guardFrom==null)this.guardFrom=PiperVoice.crashes();localStorage.setItem(GUARD,JSON.stringify({n:this.guardFrom+1,at:Date.now()}));}else{this.guardFrom=null;localStorage.removeItem(GUARD);}}catch{}}
 unguard(){try{this.guardFrom?localStorage.setItem(GUARD,JSON.stringify({n:this.guardFrom,at:Date.now()})):localStorage.removeItem(GUARD);}catch{}this.guardFrom=null;}
 load({force=false}={}){if(this.status==='loading'||this.status==='ready')return;if(!PiperVoice.supported())return this.set('unsupported');if(!force&&PiperVoice.crashedBefore()){this.error='crash';return this.set('failed');}this.progress=0;this.error='';
  try{this.worker=new Worker(this.base+'piper-worker.mjs?v='+VERSION+'&c='+CODE,{type:'module'});}catch(err){return this.fail(err);}
  this.worker.onmessage=e=>this.message(e.data||{});this.worker.onerror=e=>{e.preventDefault?.();this.fail(e.message||'worker');};this.set('loading');this.worker.postMessage({type:'init'});}
 // A failure (the net gone halfway through the download, a worker that stopped) is tried again by itself, twice, after 20 and 40 seconds.
 fail(err){this.error=String(err?.message||err||'');this.starting=false;this.guard(false);try{this.worker?.terminate();}catch{}this.worker=null;for(const job of this.jobs.values())job.fail();this.jobs.clear();this.set('failed');
  if(this.error!=='crash'&&this.retries<2){clearTimeout(this.retryTimer);this.retryTimer=setTimeout(()=>{if(this.status==='failed')this.load({force:true});},20000*++this.retries);}}
 message(m){const job=m.id!=null?this.jobs.get(m.id):null;switch(m.type){
  case 'progress':this.progress=m.value;this.set('loading');break;
  case 'starting':this.starting=true;if(!globalThis.document?.hidden)this.guard(true);break;
  case 'ready':this.starting=false;this.guard(false);this.sampleRate=m.sampleRate||22050;this.loadMs=m.ms;this.progress=1;this.set('ready');break;
  case 'failed':this.fail(m.message);break;
  case 'chunk':if(job){job.chunks.push(m.pcm);job.onchunk?.(m.pcm);}break;
  case 'done':if(job){this.jobs.delete(m.id);this.remember(job.key,job.chunks);job.finished=true;job.ondone?.();}break;
  case 'cancelled':this.jobs.delete(m.id);break;
  case 'error':if(job){this.jobs.delete(m.id);job.fail();}break;}}
 // One clip per sentence: onchunk for each as soon as it is made, ondone at the end.
 speak(text,{lengthScale=1,low=false}={}){const key=lengthScale+'|'+text,job={key,chunks:[],finished:false,onchunk:null,ondone:null,onerror:null,cancel:()=>{},fail(){if(!job.finished){job.finished=true;job.onerror?.();}}};
  const hit=this.cache.get(key);if(hit){this.cache.delete(key);this.cache.set(key,hit);job.chunks=hit;job.cached=true;queueMicrotask(()=>{if(job.finished)return;for(const c of hit)job.onchunk?.(c);job.finished=true;job.ondone?.();});job.cancel=()=>{job.finished=true;};return job;}
  if(!this.ready||!this.worker){queueMicrotask(()=>job.fail());return job;}
  const id=++this.seq;this.jobs.set(id,job);this.worker.postMessage({type:'speak',id,text,lengthScale,low});
  job.cancel=()=>{if(job.finished)return;job.finished=true;this.jobs.delete(id);this.worker?.postMessage({type:'cancel',id});};return job;}
 prewarm(texts,opts={}){for(const text of texts)if(!this.cache.has((opts.lengthScale||1)+'|'+text))this.speak(text,{...opts,low:true});}
 has(text,lengthScale=1){return this.cache.has(lengthScale+'|'+text);}
 remember(key,chunks){const bytes=chunks.reduce((n,c)=>n+c.byteLength,0);if(!bytes||bytes>4e6||this.cache.has(key))return;this.cache.set(key,chunks);this.cacheBytes+=bytes;
  for(const [k,v] of this.cache){if(this.cacheBytes<=24e6)break;this.cache.delete(k);this.cacheBytes-=v.reduce((n,c)=>n+c.byteLength,0);}}
}

// The game's side: plays the clips in Web Audio one after the other, turns the music down while it speaks, and hands a line to the device voice when
// the new voice cannot read it. on(): whether to use the new voice (sound on and the switch on); duck(on): the music; fallback(text): the device voice;
// onChange(): the status changed (for the note in the menu). Its own AudioContext is made, and woken again, by any touch or key.
export function createVoice({on=()=>true,duck=()=>{},fallback=()=>{},onChange=()=>{},neural=PiperVoice.supported()?new PiperVoice():null,delay=2500}={}){
 let context=null,out=null,current=null,generation=0,stalls=0,hiddenAt=0;
 const v={neural,stallMs:8000,wakeMs:350,get context(){return context;},set context(c){context=c;out=null;},get speaking(){return !!current;}};
 neural?.onChange(()=>onChange(v));
 function unlock(){if(!on())return;try{if(!context){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;context=new C();}if(context.state!=='running'&&context.state!=='closed')context.resume?.().catch?.(()=>{});}catch{}}
 try{for(const type of ['pointerdown','keydown'])globalThis.document?.addEventListener?.(type,unlock,true);globalThis.document?.addEventListener?.('visibilitychange',()=>{if(globalThis.document.hidden)hiddenAt=Date.now();});}catch{}
 // Start the download a little after the game has started, when the map and the 3D scene have loaded.
 v.start=()=>{if(!neural)return;setTimeout(()=>{if(on()&&!globalThis.navigator?.connection?.saveData)neural.load();},delay);};
 v.load=(opts)=>neural?.load(opts);
 v.ready=()=>!!neural?.ready&&on();
 v.unlock=unlock;
 v.stop=()=>{generation++;const c=current;current=null;if(c){clearTimeout(c.timer);c.job?.cancel();for(const s of c.sources||[])try{s.stop();}catch{}duck(false);}};
 // Reads text with the new voice and says true, or says false (not ready, switched off, no sound yet) so the caller uses the device voice.
 v.speak=text=>{v.stop();if(!v.ready()||!context)return false;const gen=generation,item={text,waking:context.state!=='running'};current=item;
  if(!item.waking){play(item,gen);return true;}
  // Sound on pause (iOS: 'interrupted' after a call, another app or the device voice): wake it, and read with the new voice if it wakes within a moment.
  let settled=false;const go=()=>{if(settled)return;settled=true;if(gen!==generation||current!==item)return;if(context.state==='running'&&v.ready())play(item,gen);else{current=null;fallback(text);}};
  try{context.resume?.().then?.(go,go);}catch{}setTimeout(go,v.wakeMs);return true;};
 function play(item,gen){const ctx=context,job=neural.speak(item.text,{lengthScale:TALK_PACE}),cur=Object.assign(item,{job,sources:[],end:0,done:false,timer:0,since:Date.now()});
  if(!out){out=ctx.createGain();out.gain.value=.95;out.connect(ctx.destination);}
  const live=()=>gen===generation&&current===cur;
  const finish=()=>{if(!live())return;clearTimeout(cur.timer);current=null;duck(false);};
  const check=()=>{if(cur.done&&ctx.currentTime>=cur.end-.03)finish();};
  // Watchdog: no sentence for eight seconds (the browser may have stopped the worker) and the device voice reads the line; after two in a row the
  // new voice is switched off for now (and tried again by itself later). Time with the page hidden does not count.
  const stall=()=>{if(!live())return;if(globalThis.document?.hidden||hiddenAt>cur.since){cur.since=Date.now();cur.timer=setTimeout(stall,v.stallMs);return;}
   job.cancel();if(++stalls>=2)neural.fail('stalled');if(cur.sources.length){cur.done=true;check();cur.timer=setTimeout(finish,Math.max(0,cur.end-ctx.currentTime)*1000+700);}else{current=null;duck(false);fallback(cur.text);}};
  cur.timer=setTimeout(stall,v.stallMs);
  job.onchunk=pcm=>{if(!live()||!pcm.length)return;if(!cur.sources.length)duck(true);const buf=ctx.createBuffer(1,pcm.length,neural.sampleRate);buf.getChannelData(0).set(pcm);const src=ctx.createBufferSource();src.buffer=buf;src.connect(out);
   const at=Math.max(ctx.currentTime+.02,cur.end+(cur.sources.length?SENTENCE_GAP:0));src.start(at);cur.end=at+buf.duration;src.onended=check;cur.sources.push(src);clearTimeout(cur.timer);cur.since=Date.now();cur.timer=setTimeout(stall,v.stallMs);};
  job.ondone=()=>{if(!live())return;stalls=0;cur.done=true;check();clearTimeout(cur.timer);cur.timer=setTimeout(finish,Math.max(0,cur.end-ctx.currentTime)*1000+700);};
  // The new voice failing before anything was said: the device voice reads the same line.
  job.onerror=()=>{if(!live())return;clearTimeout(cur.timer);if(cur.sources.length){cur.done=true;check();return;}current=null;duck(false);fallback(cur.text);};}
 // The line under the switch in the menu.
 v.note=switchOn=>{const n=neural;if(!switchOn)return 'Av: iPadens egen stemme leser.';
  if(!n||n.status==='unsupported')return 'Denne nettleseren kan ikke bruke den nye stemmen. iPadens egen stemme leser i stedet.';
  if(n.ready)return 'Den nye norske stemmen er klar: en damestemme som lages her på iPaden (Piper «talesyntese» fra Nasjonalbiblioteket, gjort lysere), og som virker også uten nett.';
  if(n.status==='loading')return n.progress>=1?'Den nye stemmen gjøres klar … Imens leser iPadens egen stemme.':`Laster ned den nye stemmen: ${Math.round(n.progress*100)} % (ca. 48 MB, bare første gang). Imens leser iPadens egen stemme.`;
  if(n.status==='failed'&&n.error==='crash')return 'Den nye stemmen ble ikke startet, fordi siden stoppet to ganger mens den startet (kanskje for lite minne). Slå den av og på for å prøve igjen.';
  if(n.status==='failed')return 'Den nye stemmen kunne ikke startes nå, så iPadens egen stemme leser. Den prøves igjen om litt.';
  return 'Den nye stemmen lastes ned om et øyeblikk.';};
 return v;
}
