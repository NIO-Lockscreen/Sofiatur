import {roundaboutChoices} from './dist/roundabouts.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as T from './dist/vendor/three.js';
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));const elements=new Map();const tools=new Map(),listeners=new Map();let raf=[],now=0,turnArrow=null;
const context=new Proxy({},{get:(o,p)=>p==='measureText'?()=>({width:20}):()=>{}});
function element(id){if(!elements.has(id))elements.set(id,{id,hidden:false,textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},dataset:{},children:[],events:new Map(),append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},setAttribute(){},getContext(){return context},addEventListener(type,fn){this.events.set(type,fn);},showModal(){this.open=true},close(){this.open=false;this.events.get('close')?.();},width:700,height:520});return elements.get(id);}
const document={getElementById:element,createElement:t=>({ ...element('new'+Math.random()),tagName:t}),body:element('body'),addEventListener(){},modelContext:{registerTool:t=>tools.set(t.name,t)}};
const terrain=data.terrain;function height(x,z){let a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/40)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/40)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return(h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
const env={document,window:{addEventListener:(name,fn)=>listeners.set(name,fn)},location:{reload(){}},console,T,roundaboutChoices,createFreeDrive,createMusic,createWorld:()=>({height,resetCamera(){},setTurnArrow(info){turnArrow=info;},update(){}}),fetch:async()=>({ok:true,json:async()=>data}),setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>raf.push(cb),performance:{now:()=>now},Promise,Math,Map,Set,Number,Infinity,Error};
const ctx=vm.createContext(env);const source=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');const init=vm.runInContext(`(async()=>{${source}\n globalThis.replan=planAhead;})()`,ctx);for(let i=0;i<12;i++){await Promise.resolve();const q=raf.splice(0);q.forEach(cb=>cb(now));}await init;
const read=()=>tools.get('read_drive_state').execute(),act=(name,input)=>tools.get(name).execute(input);
function step(n=1){for(let i=0;i<n;i++){now+=45;const q=raf.splice(0);q.forEach(cb=>cb(now));}}
const recommended=list=>list.find(c=>c.recommended)?.id??list[0].id;
// Blindveier are on by default (29 September 2026); the queue below is tested with them off, as the car then only stops at real choices.
element('deadEnds').onchange({target:{value:'off'}});

// Choosing ahead is a menu option, off by default: then no arrows show while driving and the car stops at the junction.
act('start_drive');for(let i=0;i<400&&read().state==='driving';i++){step();assert.equal(read().upcoming.length,0,'No arrows ahead while the option is off');}
assert.equal(read().state,'decision','The car stops at the next junction');
element('chooseAhead').onchange({target:{value:'on'}});element('restart').onclick();assert.equal(read().state,'intro');
console.log('Choosing ahead is off by default: OK');

const waitUpcoming=()=>{for(let i=0;i<3000&&read().state==='driving'&&!read().upcoming.length;i++)step();return read();};

// A picked road lights up first; arrows for the next junction appear only once it is within 250 m; a tap queues it.
// Stop at the junction just outside home first: from there the next choices are a few hundred metres away.
act('start_drive');for(let i=0;i<400&&read().state==='driving';i++)step();
assert.equal(read().state,'decision');act('choose_road',{edgeId:recommended(read().choices)});step();
let s=read();assert.equal(s.state,'driving');assert.equal(s.upcoming.length,0,'The picked arrow shows first');assert.equal(element('worldArrows').children.length,1);
s=waitUpcoming();assert.ok(s.upcoming.length>=2,'Arrows for the next junction while driving');assert.ok(s.upcomingMetres<=250&&s.upcomingMetres>150,`Arrows appear as the junction comes within 250 m (${s.upcomingMetres} m)`);
assert.ok(element('worldArrows').children.length===s.upcoming.length&&element('worldArrows').children.every(b=>b.className.includes('ahead')));
const first=recommended(s.upcoming),firstJunction=s.upcoming;act('choose_road',{edgeId:first});
s=read();assert.equal(s.queued.map(q=>q.id).join(),String(first));assert.ok(turnArrow?.symbol,'Queued turn floats over the car');assert.match(element('turnHint').textContent,/^Neste: /);
assert.equal(s.upcoming.length,0,'Confirmation before any new arrows');assert.throws(()=>act('choose_road',{edgeId:firstJunction.find(c=>c.id!==first).id}),'A second tap right after a pick is ignored');
step(20);s=read();assert.ok(!s.upcoming.length||s.upcoming.map(c=>c.id).join()!==firstJunction.map(c=>c.id).join(),'Next arrows belong to the junction after');
console.log(`Picked arrow lights up, arrows ahead from ${firstJunction.length&&250} m, queue and hint: OK`);

// Drive the whole trip queuing the recommended road at every junction: no stop after the start, at most two queued,
// and the car keeps its speed into every queued junction.
element('again').onclick();
let stops=0,queuedTurns=0,crossings=[],roundaboutUndo=false,maxQueued=0,farthest=0,replanned=false;
for(let i=0;i<20000&&read().state!=='finished';i++){
 s=read();if(s.state==='decision'){stops++;act('choose_road',{edgeId:recommended(s.choices)});continue;}
 if(s.upcoming.length){farthest=Math.max(farthest,s.upcomingMetres);
  if(s.upcoming.some(c=>c.roundabout)&&!replanned){
   // Passing a junction the car takes by itself rebuilds the roundabout exits; a tap on the arrow must still count.
   env.replan();replanned=true;const i=s.upcoming.findIndex(c=>c.recommended);element('worldArrows').children[i].onclick();assert.equal(read().queued.at(-1).id,s.upcoming[i].id,'Roundabout exit queued after a replan');queuedTurns++;}
  else{act('choose_road',{edgeId:recommended(s.upcoming)});queuedTurns++;}}
 s=read();maxQueued=Math.max(maxQueued,s.queued.length);if(s.queued.length===2)assert.equal(s.upcoming.length,0,'No arrows once two are queued');
 const head=s.queued[0]?.id;step();const after=read();
 if(head!==undefined&&after.queued[0]?.id!==head){crossings.push(after.speedKmh);if(!element('undoRoundabout').hidden)roundaboutUndo=true;}
}
s=read();assert.equal(s.state,'finished');assert.equal(stops,0,'No stop at queued junctions');assert.ok(s.travelledMetres>2900&&s.travelledMetres<3400);
assert.ok(crossings.length>=10,`Queued junctions crossed (${crossings.length})`);assert.ok(crossings.every(kmh=>kmh>=20),'Never stops at a queued junction');
assert.ok(replanned,'A roundabout exit was queued');assert.ok(roundaboutUndo,'A queued roundabout exit can still be undone');assert.equal(maxQueued,2,'Two junctions can be queued');assert.ok(farthest<=250,'Arrows only within 250 m');
console.log(`Whole trip on queued choices: ${queuedTurns} queued, up to ${maxQueued} at once, 0 stops, crossing speeds ${crossings.join('/')} km/h: OK`);

// Keyboard arrows queue as well; undoing a roundabout or restarting clears the queue.
element('again').onclick();if(read().state==='intro')act('start_drive'); // the first arrival unlocks a reward and returns to the start screen
waitUpcoming();
const keyFor={Venstre:'ArrowLeft',Høyre:'ArrowRight','Rett frem':'ArrowUp',Snu:'ArrowDown'},pick=read().upcoming[0];
listeners.get('keydown')({key:keyFor[pick.direction],code:keyFor[pick.direction],repeat:false,preventDefault(){}});assert.equal(read().queued.map(q=>q.id).join(),String(pick.id));
element('again').onclick();assert.equal(read().queued.length,0);assert.equal(turnArrow,null);
console.log('Keyboard queue and reset: OK');

// Switching the option off while driving drops the queued road; the car stops at that junction again.
element('again').onclick();if(read().state==='intro')act('start_drive');s=waitUpcoming();act('choose_road',{edgeId:recommended(s.upcoming)});assert.equal(read().queued.length,1);
element('chooseAhead').onchange({target:{value:'off'}});assert.equal(read().queued.length,0);assert.equal(turnArrow,null);
for(let i=0;i<3000&&read().state==='driving';i++){step();assert.equal(read().upcoming.length,0);}assert.equal(read().state,'decision');
console.log('Switching choosing ahead off while driving clears the queue: OK');
