// The Norwegian voice (26 November 2026, the same as in Sofia's space game, SofiaSpace): Piper «talesyntese» (no_NO-talesyntese-medium,
// Nasjonalbiblioteket, CC0), read in advance at the model's own pitch. Everything the game can say is made as clips, one sentence each, by
// tts/make-voice.mjs and packed in dist/tts/voice/talesyntese.mp3 (MP3) with a list in dist/tts/voice/talesyntese.json. The game downloads the
// pack once (about 7 MB, kept in Cache Storage) and plays the clips; it makes no speech itself. A line with a sentence that has no clip, and
// every line when «Stemme» in the menu is set to the iPad's own voice, is read by the device's own voice (iPad or browser).
// Before: 24 November 2026 Piper «talesyntese» made on the iPad and raised with TD-PSOLA (it crackled), 25 November Canora Norwegian «ingrid»
// read in advance. Both are gone; the «ingrid» pack and the old Piper files are deleted from Cache Storage.
// game.js: say() asks speak(text) first and uses the device voice when it says no.
import {sentences,spoken} from './tts/clips.mjs';
export {sentences,spoken};

const CACHE='sofiatur-stemme',VOICE_NAME='talesyntese';
// A short pause between sentences (the pace is in the clips: a little slower than ordinary reading, for a five-year-old).
export const SENTENCE_GAP=.22;

// The clips: the list, the pack, and the clips already unpacked.
export class ClipVoice{
 constructor(base=new URL('./tts/voice/',import.meta.url).href){this.base=base;this.status='off';this.progress=0;this.sampleRate=22050;this.index=null;this.pack=null;this.cache=new Map();this.cacheBytes=0;this.listeners=new Set();this.error='';this.retries=0;this.decoder=null;this.missed=new Set();this.badClips=0;this.failedAt=0;
  // The net back, or the page shown again: a voice that failed is tried at once (25 November 2026: it must never need switching off and on).
  try{globalThis.addEventListener?.('online',()=>this.retry());globalThis.document?.addEventListener?.('visibilitychange',()=>{if(!globalThis.document.hidden)this.retry();});}catch{}}
 static supported(){try{return typeof fetch==='function'&&!!(globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext)&&!!(globalThis.AudioContext||globalThis.webkitAudioContext);}catch{return false;}}
 get ready(){return this.status==='ready';}
 onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 set(status){this.status=status;for(const fn of this.listeners)try{fn(this);}catch{}}
 // The list is fetched again every time (so new clips come along), the pack only when it is new (its address has the pack's hash). Offline,
 // what is kept is used.
 async load(){if(this.status==='loading'||this.status==='ready')return;if(!ClipVoice.supported())return this.set('unsupported');
  if(this.index&&this.pack){this.error='';return this.set('ready');} // loaded already (after a rest)
  this.progress=0;this.error='';this.set('loading');
  try{let cache=null;try{cache=await caches.open(CACHE);}catch{}
   const indexUrl=this.base+VOICE_NAME+'.json';let res=null;
   try{res=await fetch(indexUrl,{cache:'no-cache'});if(!res.ok)res=null;}catch{}
   if(res)cache?.put(indexUrl,res.clone()).catch(()=>{});else res=await cache?.match(indexUrl);
   if(!res)throw new Error('no list');
   const index=await res.json(),packUrl=this.base+VOICE_NAME+'.mp3?v='+index.hash;
   let buf=null;const hit=await cache?.match(packUrl).catch(()=>null);
   if(hit)buf=await hit.arrayBuffer();
   else{const r=await fetch(packUrl);if(!r.ok)throw new Error(VOICE_NAME+'.mp3: HTTP '+r.status);const total=+r.headers.get('content-length')||index.bytes||1;
    if(r.body?.getReader){const reader=r.body.getReader(),parts=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;parts.push(value);size+=value.byteLength;this.progress=Math.min(.99,size/total);this.set('loading');}
     const all=new Uint8Array(size);let at=0;for(const p of parts){all.set(p,at);at+=p.byteLength;}buf=all.buffer;}else buf=await r.arrayBuffer();
    if(cache){for(const k of await cache.keys().catch(()=>[]))if(k.url!==packUrl&&k.url!==indexUrl)cache.delete(k).catch(()=>{});await cache.put(packUrl,new Response(buf,{headers:{'Content-Type':'audio/mpeg'}})).catch(()=>{});}}
   dropOldVoices();this.index=index;this.pack=new Uint8Array(buf);this.sampleRate=index.sampleRate||22050;this.progress=1;this.retries=0;this.set('ready');}
  catch(err){this.fail(err);}}
 // A failed download (the net gone) is tried again by itself with no limit: after 10, 20, 40 … seconds (at most 2 minutes apart), and at once when
 // the net comes back, the page is shown again or something is to be said. A stall ('stalled') or clips that will not unpack ('decode'): the
 // iPad's voice reads for 30 seconds, then the new voice is back by itself. Before 25 November 2026 it gave up after two tries.
 fail(err){this.error=String(err?.message||err||'');this.failedAt=Date.now();this.set('failed');clearTimeout(this.retryTimer);
  const rest=this.error==='stalled'||this.error==='decode',wait=rest?30000:Math.min(120000,10000*2**this.retries++);
  this.retryTimer=setTimeout(()=>{if(this.status==='failed'){this.badClips=0;this.load();}},wait);}
 retry(){if(this.status==='failed'&&this.error!=='stalled'&&this.error!=='decode'){clearTimeout(this.retryTimer);this.load();}}
 // Something is to be said: not started, or failed more than five seconds ago, and it starts now.
 ensure(){if(this.status==='off'||this.status==='failed'&&this.error!=='stalled'&&this.error!=='decode'&&Date.now()-this.failedAt>5000)this.load();}
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
  // A clip that will not unpack: the iPad reads that line. Three in a row: a rest of 30 seconds (fail('decode')).
  (async()=>{for(const s of list){if(job.finished)return;let pcm;try{pcm=await this.decode(s);this.badClips=0;}catch{if(!job.finished){if(++this.badClips>=3)this.fail('decode');job.fail();}return;}if(job.finished)return;job.chunks.push(pcm);job.onchunk?.(pcm);}
   if(!job.finished){job.finished=true;job.ondone?.();}})();
  return job;}
 prewarm(texts){(async()=>{for(const t of texts)for(const s of sentences(t))if(this.ready&&this.index.clips[s]&&!this.cache.has(s))try{await this.decode(s);}catch{return;}})();}
 remember(key,pcm){if(this.cache.has(key))return;this.cache.set(key,pcm);this.cacheBytes+=pcm.byteLength;
  for(const [k,v] of this.cache){if(this.cacheBytes<=24e6)break;this.cache.delete(k);this.cacheBytes-=v.byteLength;}}
}
// What the first Piper voice left in Cache Storage when it ran on the iPad (sofia-tts-*, 48 MB) is deleted. The «ingrid» pack was in the same
// cache as the clips now, and goes when the new pack is stored.
export function dropOldVoices(){try{globalThis.caches?.keys?.().then(keys=>{for(const k of keys)if(/^sofia-tts-/.test(k))globalThis.caches.delete(k).catch(()=>{});}).catch(()=>{});}catch{}}
// Silence before and after a clip is taken off (MP3 adds a little), leaving 20 ms.
export function trimQuiet(pcm,sr,threshold=.003,keep=.02){let a=0,b=pcm.length;while(a<b&&Math.abs(pcm[a])<threshold)a++;while(b>a&&Math.abs(pcm[b-1])<threshold)b--;const k=Math.round(keep*sr);return pcm.slice(Math.max(0,a-k),Math.min(pcm.length,b+k));}

// The game's side: plays the clips in Web Audio one after the other, turns the music down while it speaks, and hands a line to the device voice when
// the Piper voice cannot read it or is switched off. on(): whether to use the new voice (sound on and the switch on); switchOn(): the switch alone (the voice is loaded
// whether the sound is on or not); duck(on): the music; fallback(text): the device voice; onChange(): the status changed (for the note in the menu).
// Its own AudioContext is made, and woken again, by any touch or key.
export function createVoice({on=()=>true,switchOn=()=>true,duck=()=>{},fallback=()=>{},onChange=()=>{},neural=ClipVoice.supported()?new ClipVoice():null,delay=2500}={}){
 let context=null,out=null,current=null,generation=0,stalls=0,hiddenAt=0;
 const v={neural,stallMs:8000,wakeMs:350,waitMs:3000,get context(){return context;},set context(c){context=c;out=null;},get speaking(){return !!current;}};
 neural?.onChange(()=>onChange(v));
 function unlock(){if(!on())return;try{if(!context){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;context=new C();}if(context.state!=='running'&&context.state!=='closed')context.resume?.().catch?.(()=>{});}catch{}}
 // On an iPad only lifting the finger (pointerup, touchend, click) counts as a tap that may start sound, not pointerdown (25 November 2026).
 try{for(const type of ['pointerdown','pointerup','touchend','click','keydown'])globalThis.document?.addEventListener?.(type,unlock,true);globalThis.document?.addEventListener?.('visibilitychange',()=>{if(globalThis.document.hidden)hiddenAt=Date.now();});}catch{}
 // Start the download a little after the game has started, when the map and the 3D scene have loaded: whenever the switch is on, with the sound
 // on or off (before 25 November 2026 it waited for the switch if the sound was off just then).
 v.start=()=>{if(!neural)return;setTimeout(()=>{if(switchOn()&&!globalThis.navigator?.connection?.saveData)neural.load();},delay);};
 v.load=(opts)=>neural?.load(opts);
 v.ready=()=>!!neural?.ready&&on();
 v.unlock=unlock;
 v.stop=()=>{generation++;const c=current;current=null;if(c){clearTimeout(c.timer);c.job?.cancel();for(const s of c.sources||[])try{s.stop();}catch{}duck(false);}};
 // Reads text with the new voice and says true, or says false (switched off, no sound yet, not started) so the caller uses the device voice.
 v.speak=text=>{v.stop();if(!neural||!on()||!context)return false;
  if(!neural.ready){neural.ensure?.();if(neural.status!=='loading')return false;}
  const gen=generation,item={text},t0=Date.now();current=item;
  const go=()=>{if(gen!==generation||current!==item)return;
   // Still loading (from Cache Storage, or the first download): wait up to three seconds for it, then the iPad reads.
   if(!neural.ready){if(neural.status==='loading'&&Date.now()-t0<v.waitMs){item.timer=setTimeout(go,150);return;}current=null;fallback(text);return;}
   if(context.state==='running')return play(item,gen);
   // Sound on pause (iOS: 'interrupted' after a call, another app or the device voice): wake it, and read with the new voice if it wakes within a moment.
   let settled=false;const wake=()=>{if(settled)return;settled=true;if(gen!==generation||current!==item)return;if(context.state==='running'&&v.ready())play(item,gen);else{current=null;fallback(text);}};
   try{context.resume?.().then?.(wake,wake);}catch{}item.timer=setTimeout(wake,v.wakeMs);};
  go();return true;};
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
 v.note=switchOn=>{const n=neural;if(!switchOn)return 'Av: iPadens eller nettleserens egen stemme leser.';
  if(!n||n.status==='unsupported')return 'Denne nettleseren kan ikke bruke Piper-stemmen. iPadens egen stemme leser i stedet.';
  if(n.ready)return 'Piper-stemmen er klar: «talesyntese» fra Nasjonalbiblioteket, lest inn på forhånd, så den virker også uten nett.';
  if(n.status==='loading')return `Laster ned Piper-stemmen: ${Math.round(n.progress*100)} % (ca. 7 MB, bare første gang). Imens leser iPadens egen stemme.`;
  if(n.status==='failed'&&(n.error==='stalled'||n.error==='decode'))return 'Piper-stemmen tar en liten pause, så iPadens egen stemme leser. Den er tilbake av seg selv om et halvt minutt.';
  if(n.status==='failed')return 'Piper-stemmen kunne ikke startes nå, så iPadens egen stemme leser. Den prøves igjen av seg selv.';
  return 'Piper-stemmen lastes ned om et øyeblikk.';};
 return v;
}
