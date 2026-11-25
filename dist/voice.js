// The new Norwegian voice (25 November 2026, the same as in Sofia's space game, SofiaSpace): a real woman's voice, Canora Norwegian «ingrid»
// (EmpirioLabs, Apache 2.0), read in advance. Everything the game can say is made as clips, one sentence each, by tts/make-voice.mjs and packed
// in dist/tts/voice/ingrid.mp3 (MP3) with a list in dist/tts/voice/ingrid.json. The game downloads the pack once (about 11 MB, kept in Cache
// Storage) and plays the clips; it makes no speech itself. A line with a sentence that has no clip is read by the device's own voice.
// Before 25 November 2026 the speech was made on the iPad with Piper «talesyntese» (a man's voice) and raised with TD-PSOLA; it crackled and
// did not sound like a woman. «ingrid» is too heavy to run on an iPad (three times slower than real time in the browser), but read in advance
// it is both natural and a real woman's voice.
// game.js: say() asks speak(text) first and uses the device voice when it says no.
import {sentences,spoken} from './tts/clips.mjs';
export {sentences,spoken};

const CACHE='sofiatur-stemme';
// A short pause between sentences (the pace is in the clips: a little slower than ordinary reading, for a five-year-old).
export const SENTENCE_GAP=.22;

// The clips: the list, the pack, and the clips already unpacked.
export class ClipVoice{
 constructor(base=new URL('./tts/voice/',import.meta.url).href){this.base=base;this.status='off';this.progress=0;this.sampleRate=24000;this.index=null;this.pack=null;this.cache=new Map();this.cacheBytes=0;this.listeners=new Set();this.error='';this.retries=0;this.decoder=null;this.missed=new Set();}
 static supported(){try{return typeof fetch==='function'&&!!(globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext)&&!!(globalThis.AudioContext||globalThis.webkitAudioContext);}catch{return false;}}
 get ready(){return this.status==='ready';}
 onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 set(status){this.status=status;for(const fn of this.listeners)try{fn(this);}catch{}}
 // The list is fetched again every time (so new clips come along), the pack only when it is new (its address has the pack's hash). Offline,
 // what is kept is used.
 async load(){if(this.status==='loading'||this.status==='ready')return;if(!ClipVoice.supported())return this.set('unsupported');this.progress=0;this.error='';this.set('loading');
  try{let cache=null;try{cache=await caches.open(CACHE);}catch{}
   const indexUrl=this.base+'ingrid.json';let res=null;
   try{res=await fetch(indexUrl,{cache:'no-cache'});if(!res.ok)res=null;}catch{}
   if(res)cache?.put(indexUrl,res.clone()).catch(()=>{});else res=await cache?.match(indexUrl);
   if(!res)throw new Error('no list');
   const index=await res.json(),packUrl=this.base+'ingrid.mp3?v='+index.hash;
   let buf=null;const hit=await cache?.match(packUrl).catch(()=>null);
   if(hit)buf=await hit.arrayBuffer();
   else{const r=await fetch(packUrl);if(!r.ok)throw new Error('ingrid.mp3: HTTP '+r.status);const total=+r.headers.get('content-length')||index.bytes||1;
    if(r.body?.getReader){const reader=r.body.getReader(),parts=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;parts.push(value);size+=value.byteLength;this.progress=Math.min(.99,size/total);this.set('loading');}
     const all=new Uint8Array(size);let at=0;for(const p of parts){all.set(p,at);at+=p.byteLength;}buf=all.buffer;}else buf=await r.arrayBuffer();
    if(cache){for(const k of await cache.keys().catch(()=>[]))if(/ingrid\.mp3/.test(k.url)&&k.url!==packUrl)cache.delete(k).catch(()=>{});await cache.put(packUrl,new Response(buf,{headers:{'Content-Type':'audio/mpeg'}})).catch(()=>{});}}
   this.index=index;this.pack=new Uint8Array(buf);this.sampleRate=index.sampleRate||24000;this.progress=1;this.retries=0;this.set('ready');}
  catch(err){this.fail(err);}}
 // A failed download (the net gone) is tried again by itself, twice, after 20 and 40 seconds.
 fail(err){this.error=String(err?.message||err||'');this.set('failed');
  if(this.error!=='stalled'&&this.error!=='decode'&&this.retries<2){clearTimeout(this.retryTimer);this.retryTimer=setTimeout(()=>{if(this.status==='failed')this.load();},20000*++this.retries);}}
 has(text){const s=sentences(text);return s.length>0&&s.every(x=>this.cache.has(x));}
 // Does every sentence of the text have a clip?
 covers(text){const s=sentences(text);return !!this.index&&s.length>0&&s.every(x=>this.index.clips[x]);}
 decode(sentence){const hit=this.cache.get(sentence);if(hit){this.cache.delete(sentence);this.cache.set(sentence,hit);return Promise.resolve(hit);}
  const [at,len]=this.index.clips[sentence],bytes=this.pack.slice(at,at+len).buffer;
  if(!this.decoder){const C=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;this.decoder=new C(1,1,this.sampleRate);}
  return new Promise((done,fail)=>{const p=this.decoder.decodeAudioData(bytes,done,fail);p?.catch?.(()=>{});}).then(buf=>{const pcm=trimQuiet(buf.getChannelData(0),buf.sampleRate);this.sampleRate=buf.sampleRate;this.remember(sentence,pcm);return pcm;});}
 // One clip per sentence: onchunk for each, ondone at the end. A sentence without a clip gives onerror (and the device's voice reads the line).
 speak(text){const job={chunks:[],finished:false,onchunk:null,ondone:null,onerror:null,cancel(){job.finished=true;},fail(){if(!job.finished){job.finished=true;job.onerror?.();}}};
  const list=sentences(text);
  if(!this.ready||!list.length||!list.every(s=>this.index.clips[s])){for(const s of list)if(this.ready&&!this.index.clips[s]&&!this.missed.has(s)){this.missed.add(s);console.info('No clip for: «'+s+'» (node tts/make-voice.mjs)');}queueMicrotask(()=>job.fail());return job;}
  job.cached=list.every(s=>this.cache.has(s));
  (async()=>{for(const s of list){if(job.finished)return;let pcm;try{pcm=await this.decode(s);}catch{if(!job.finished){this.fail('decode');job.fail();}return;}if(job.finished)return;job.chunks.push(pcm);job.onchunk?.(pcm);}
   if(!job.finished){job.finished=true;job.ondone?.();}})();
  return job;}
 prewarm(texts){(async()=>{for(const t of texts)for(const s of sentences(t))if(this.ready&&this.index.clips[s]&&!this.cache.has(s))try{await this.decode(s);}catch{return;}})();}
 remember(key,pcm){if(this.cache.has(key))return;this.cache.set(key,pcm);this.cacheBytes+=pcm.byteLength;
  for(const [k,v] of this.cache){if(this.cacheBytes<=24e6)break;this.cache.delete(k);this.cacheBytes-=v.byteLength;}}
}
// Silence before and after a clip is taken off (MP3 adds a little), leaving 20 ms.
export function trimQuiet(pcm,sr,threshold=.003,keep=.02){let a=0,b=pcm.length;while(a<b&&Math.abs(pcm[a])<threshold)a++;while(b>a&&Math.abs(pcm[b-1])<threshold)b--;const k=Math.round(keep*sr);return pcm.slice(Math.max(0,a-k),Math.min(pcm.length,b+k));}

// The game's side: plays the clips in Web Audio one after the other, turns the music down while it speaks, and hands a line to the device voice when
// the new voice cannot read it. on(): whether to use the new voice (sound on and the switch on); duck(on): the music; fallback(text): the device voice;
// onChange(): the status changed (for the note in the menu). Its own AudioContext is made, and woken again, by any touch or key.
export function createVoice({on=()=>true,duck=()=>{},fallback=()=>{},onChange=()=>{},neural=ClipVoice.supported()?new ClipVoice():null,delay=2500}={}){
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
 function play(item,gen){const ctx=context,job=neural.speak(item.text),cur=Object.assign(item,{job,sources:[],end:0,done:false,timer:0,since:Date.now()});
  if(!out){out=ctx.createGain();out.gain.value=.95;out.connect(ctx.destination);}
  const live=()=>gen===generation&&current===cur;
  const finish=()=>{if(!live())return;clearTimeout(cur.timer);current=null;duck(false);};
  const check=()=>{if(cur.done&&ctx.currentTime>=cur.end-.03)finish();};
  // Watchdog: no sentence for eight seconds (the browser may have stopped the unpacking) and the device voice reads the line; after two in a row the
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
  if(n.ready)return 'Den nye norske stemmen er klar: en ekte damestemme («ingrid» fra Canora Norwegian), lest inn på forhånd, så den virker også uten nett.';
  if(n.status==='loading')return `Laster ned den nye stemmen: ${Math.round(n.progress*100)} % (ca. 11 MB, bare første gang). Imens leser iPadens egen stemme.`;
  if(n.status==='failed')return 'Den nye stemmen kunne ikke startes nå, så iPadens egen stemme leser. Den prøves igjen om litt.';
  return 'Den nye stemmen lastes ned om et øyeblikk.';};
 return v;
}
