// Soothing background music, generated with Web Audio: soft pad chords, a low bass and a
// music-box melody in F major pentatonic. No audio files for the music; silent where Web Audio is missing.
// The horn's sound effects (3 October 2026): real recordings, one per ride, instead of the voice saying "Tut tut!" (CC0, from Freesound; sources
// and what was done to them in docs/sounds.md).
export const HORNS={car:'sounds/horn-car.mp3',cat:'sounds/horn-cat.mp3',dog:'sounds/horn-dog.mp3',duck:'sounds/horn-duck.mp3',rocket:'sounds/horn-rocket.mp3',
 unicorn:'sounds/horn-unicorn.mp3',firetruck:'sounds/horn-firetruck.mp3',balloon:'sounds/horn-balloon.mp3',trex:'sounds/horn-trex.mp3'};
export function createMusic({fetch=globalThis.fetch,horns:files=HORNS}={}){
 const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!Context)return {play(){},stop(){},duck(){},preloadHorns(){},horn(){return false;}};
 const beat=60/66,level=.75;
 // Fmaj7 Dm7 Bbmaj7 C | Fmaj7 Am7 Bbmaj7 Csus4, one chord per bar.
 const chords=[[53,57,60,64],[50,53,57,60],[46,50,53,57],[48,52,55,60],[53,57,60,64],[45,48,52,55],[46,50,53,57],[48,53,55,60]];
 const scale=[65,67,69,72,74,77,79,81,84],rhythms=[[0,1,2,3],[0,2,3],[0,1.5,2,3],[0,2],[0,1,2],[0,3],[0,.5,1,2]];
 const hz=m=>440*2**((m-69)/12);
 let ctx=null,master,dry,wet,timer=null,wanted=false,bar=0,nextBar=0,note=3,seed=7;
 const random=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
 function setup(){
  ctx=new Context();master=ctx.createGain();master.gain.value=0;const soften=ctx.createBiquadFilter();soften.type='lowpass';soften.frequency.value=5200;
  const limiter=ctx.createDynamicsCompressor();master.connect(soften).connect(limiter).connect(ctx.destination);
  dry=ctx.createGain();dry.gain.value=.8;dry.connect(master);
  // Room: a short stereo noise tail, plus a slow echo on the melody.
  const reverb=ctx.createConvolver(),length=Math.floor(ctx.sampleRate*2.8),impulse=ctx.createBuffer(2,length,ctx.sampleRate);
  for(let c=0;c<2;c++){const d=impulse.getChannelData(c);for(let i=0;i<length;i++)d[i]=(Math.random()*2-1)*(1-i/length)**3;}
  reverb.buffer=impulse;wet=ctx.createGain();wet.gain.value=.45;wet.connect(reverb).connect(master);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)ctx.suspend();else if(wanted)ctx.resume();});
  // iOS can interrupt audio (calls, other apps); the next touch resumes it.
  document.addEventListener('pointerdown',()=>{if(wanted&&ctx.state!=='running')ctx.resume();});
 }
 function tone(freq,start,length,peak,{type='sine',attack=.02,release=1.2,cutoff=0,echo=0}={}){
  const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=type;osc.frequency.value=freq;
  env.gain.setValueAtTime(0,start);env.gain.linearRampToValueAtTime(peak,start+attack);env.gain.setTargetAtTime(0,start+length,release/4);
  let out=osc;if(cutoff){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=cutoff;out=osc.connect(f);}
  out.connect(env);env.connect(dry);if(echo){const send=ctx.createGain();send.gain.value=echo;env.connect(send).connect(wet);}
  osc.start(start);osc.stop(start+length+release*1.6);
 }
 function scheduleBar(time){
  const chord=chords[bar%chords.length],length=beat*4;
  for(const m of chord)for(const detune of [-4,4]){tone(hz(m)*2**(detune/1200),time,length,.022,{type:'triangle',attack:1.4,release:2.4,cutoff:1100,echo:.9});}
  tone(hz(chord[0]-12),time,length*.9,.07,{type:'triangle',attack:.08,release:1.6,cutoff:420,echo:.3});
  // Music box: a gentle random walk, landing on a chord tone at the start of each bar; every eighth bar rests.
  if(bar%8!==7)for(const at of rhythms[Math.floor(random()*rhythms.length)]){
   if(at===0){const tones=scale.map((m,i)=>[m,i]).filter(([m])=>chord.some(c=>(c-m)%12===0));note=tones.reduce((a,b)=>Math.abs(b[1]-note)<Math.abs(a[1]-note)?b:a)[1];}
   else note=Math.max(1,Math.min(scale.length-2,note+[-2,-1,-1,1,1,2][Math.floor(random()*6)]));
   const start=time+at*beat,f=hz(scale[note]);
   tone(f,start,.05,.05,{attack:.008,release:2.2,echo:.8});tone(f*2,start,.03,.012,{attack:.005,release:1.1,echo:.8});
  }
  bar++;
 }
 function tick(){while(nextBar<ctx.currentTime+1.2){scheduleBar(nextBar);nextBar+=beat*4;}}
 function fade(to,seconds){const now=ctx.currentTime;master.gain.cancelScheduledValues(now);master.gain.setValueAtTime(master.gain.value,now);master.gain.linearRampToValueAtTime(to,now+seconds);}
 // The horns: loaded (fetched and decoded) when first wanted, from a tap (iOS only starts audio after a gesture); played straight to the speakers, past
 // the music's filter, one at a time. horn(name) is false while that clip is not loaded (yet), or failed to load: the game then says the word.
 const horns=new Map();let hornOut=null,hornSource=null;
 function hornContext(){if(!ctx)setup();if(ctx.state!=='running')ctx.resume();if(!hornOut){hornOut=ctx.createGain();hornOut.gain.value=.9;hornOut.connect(ctx.destination);}return ctx;}
 function loadHorn(name){if(horns.has(name)||!files[name])return;horns.set(name,null);
  fetch(files[name]).then(r=>{if(!r.ok)throw new Error(r.status);return r.arrayBuffer();}).then(data=>new Promise((ok,no)=>ctx.decodeAudioData(data,ok,no))).then(b=>horns.set(name,b),()=>horns.set(name,false));}
 return {
  preloadHorns(){hornContext();for(const name in files)loadHorn(name);},
  horn(name){hornContext();const b=horns.get(name);if(!b){loadHorn(name);return false;}try{hornSource?.stop();}catch{}const s=ctx.createBufferSource();s.buffer=b;s.connect(hornOut);s.start();hornSource=s;return true;},
  // Call from a tap or click: browsers only start audio after a user gesture.
  play(){wanted=true;if(!ctx)setup();ctx.resume();fade(level,2.5);if(!timer){nextBar=Math.max(nextBar,ctx.currentTime+.1);tick();timer=setInterval(tick,300);}},
  stop(){if(!ctx||!wanted)return;wanted=false;fade(0,1);clearInterval(timer);timer=null;setTimeout(()=>{if(!wanted)ctx.suspend();},1200);},
  // Lower the music while the voice speaks.
  duck(on){if(ctx&&wanted)fade(on?level*.35:level,on?.25:1.2);}
 };
}
