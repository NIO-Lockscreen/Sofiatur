import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as T from './dist/vendor/three.js';
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));const elements=new Map();const tools=new Map(),listeners=new Map();let raf=[],now=0,cameraYaw=0;
const context=new Proxy({},{get:(o,p)=>p==='measureText'?()=>({width:20}):()=>{}});
function element(id){if(!elements.has(id))elements.set(id,{id,hidden:false,textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},dataset:{},children:[],events:new Map(),append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},setAttribute(){},getContext(){return context},addEventListener(type,fn){this.events.set(type,fn);},showModal(){this.open=true},close(){this.open=false;this.events.get('close')?.();},getBoundingClientRect(){return {left:300,right:740,top:80,bottom:700};},width:700,height:520});return elements.get(id);}
const document={getElementById:element,createElement:t=>({ ...element('new'+Math.random()),tagName:t}),body:element('body'),addEventListener(){},modelContext:{registerTool:t=>tools.set(t.name,t)}};
const terrain=data.terrain;function height(x,z){let a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/40)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/40)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return(h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
const env={document,window:{addEventListener:(name,fn)=>listeners.set(name,fn)},location:{reload(){}},console,T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,createWorld:()=>({height,resetCamera(){},setTurnArrow(){},update(){},cameraYaw:()=>cameraYaw}),fetch:async()=>({ok:true,json:async()=>data}),setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>raf.push(cb),performance:{now:()=>now},Promise,Math,Map,Set,Number,Infinity,Error};
const ctx=vm.createContext(env);const source=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');const init=vm.runInContext(`(async()=>{${source}})()`,ctx);for(let i=0;i<12;i++){await Promise.resolve();const q=raf.splice(0);q.forEach(cb=>cb(now));}await init;assert.equal(element('start').disabled,false);const read=()=>tools.get('read_drive_state').execute();const act=(name,input)=>tools.get(name).execute(input);
function step(){now+=45;const q=raf.splice(0);q.forEach(cb=>cb(now));}
// The start button drives the car out of the parking place: leaving it is the only road, so no arrow is shown for it.
assert.equal(element('fullscreen').hidden,true,'No fullscreen button where the browser has no Fullscreen API');
assert.equal(read().state,'intro');act('start_drive');assert.equal(read().state,'driving');assert.equal(read().currentNode,data.start);assert.equal(element('worldArrows').children.length,0,'No arrow to tap at the start');assert.equal(read().travelledMetres,0);
for(let i=0;i<3000&&read().state==='driving';i++)step();assert.equal(read().state,'decision','The first real choice comes at the first junction');assert.ok(read().travelledMetres>5);
const before=read();assert.throws(()=>act('choose_road',{edgeId:-1}));assert.equal(read().currentNode,before.currentNode);assert.equal('paused' in read(),false,'The game has no pause');console.log('Start button drives out without an arrow, first junction asks, invalid choice: OK');
// The arrows turn with the camera: with the camera turned round the car, every arrow moves round the middle by as much (the same distance out) and its
// glyph turns with it; a quarter turn puts the straight-on arrow to the right, half a turn (looking at the car from the front) at the bottom.
{const buttons=element('worldArrows').children,polar=b=>{const x=(parseFloat(b.style.left)-50)/23,y=(66-parseFloat(b.style.top))/18;return [Math.atan2(x,y),Math.hypot(x,y)];};
 assert.ok(buttons.length>=2);const start=buttons.map(polar),tops=buttons.map(b=>b.style.top);
 for(const turn of [Math.PI/2,Math.PI,-2]){cameraYaw=turn;step();buttons.forEach((b,i)=>{const [a,r]=polar(b),d=Math.atan2(Math.sin(a-start[i][0]-turn),Math.cos(a-start[i][0]-turn));
  assert.ok(Math.abs(d)<.01&&Math.abs(r-start[i][1])<.01,`Arrow ${i} turned with the camera by ${turn.toFixed(2)}`);assert.equal(b.children[0].style.transform,`rotate(${turn.toFixed(3)}rad)`,'and its glyph turns');});
  const straight=buttons.find(b=>b.className.includes('straight'));if(straight&&turn===Math.PI/2)assert.ok(parseFloat(straight.style.left)>70,'A quarter turn: straight on sits to the right');if(straight&&turn===Math.PI)assert.ok(parseFloat(straight.style.top)>80,'Half a turn: straight on at the bottom');}
 cameraYaw=0;step();assert.deepEqual(buttons.map(b=>b.style.top),tops,'Behind the car again, as before');assert.ok(buttons.every(b=>!b.children[0].style.transform));}
console.log('The arrows turn with the camera: OK');
// The settings menu: opened only by its button (the map credit at the bottom left, where a tap meant for the speed box or the steering opened it, is
// plain text now); a tap outside it (press and release on the backdrop) closes it, a tap inside or a drag out of it does not.
{const menu=element('menu'),html=fs.readFileSync('dist/index.html','utf8'),tap=(down,up)=>{menu.events.get('pointerdown')({target:menu,...down});menu.events.get('click')({target:menu,...up});};
 assert.ok(!/<button id="about"/.test(html)&&/<span id="about" class="credit">Kart: OpenStreetMap/.test(html),'The map credit is text, not a button');assert.equal(element('about').onclick,undefined);
 element('settings').onclick();assert.equal(menu.open,true,'The gear opens the menu');
 tap({clientX:500,clientY:300},{clientX:500,clientY:300});assert.equal(menu.open,true,'A tap inside it (on its padding) keeps it open');
 menu.events.get('pointerdown')({target:element('closeMenu'),clientX:520,clientY:90});menu.events.get('click')({target:element('closeMenu'),clientX:520,clientY:90});assert.equal(menu.open,true,'so does a tap on something in it');
 tap({clientX:500,clientY:300},{clientX:100,clientY:300});assert.equal(menu.open,true,'and a drag out of it');
 tap({clientX:100,clientY:300},{clientX:100,clientY:300});assert.equal(menu.open,false,'A tap outside closes it');
 element('settings').onclick();tap({clientX:500,clientY:760},{clientX:500,clientY:760});assert.equal(menu.open,false,'below it too');
 // The three round buttons top right draw their icons (SVG), no text glyphs (iPadOS drew the gear as an emoji off the middle).
 const nav=html.match(/<nav>(.*?)<\/nav>/)[1];assert.ok(!/[♫♪⚙]/.test(nav)&&(nav.match(/<svg /g)||[]).length===4,'drawn icons in the round buttons');
 element('sound').onclick();assert.ok(!element('sound').textContent,'the sound button keeps its icon');element('sound').onclick();
 // The horn button on the drive screen too (the 📯 emoji sat off the middle on the iPad): a drawn icon, centred with a grid.
 const css=fs.readFileSync('dist/style.css','utf8'),horn=html.match(/<button id="horn"[^>]*>(.*?)<\/button>/)[1];
 assert.ok(/^<svg /.test(horn)&&!/[\u{1F300}-\u{1FAFF}]/u.test(horn),'the horn button draws its icon');assert.ok(/\.horn\{display:grid;place-items:center;padding:0/.test(css),'centred with a grid');}
console.log('The settings menu opens only from its button and closes with a tap outside; drawn, centred icons: OK');
// No zooming on the iPad: the viewport cannot be zoomed by focusing a field, taps never double-tap zoom (the card and the menu still scroll), Safari's
// pinch is cancelled, and a page zoomed in all the same gets its viewport set again.
{const html=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/style.css','utf8'),src=fs.readFileSync('dist/game.js','utf8');
 assert.ok(html.includes('content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"'),'the viewport');
 assert.ok(css.includes('html,body{touch-action:manipulation;')&&css.includes('.welcome,dialog{touch-action:pan-y}')&&/#world\{[^}]*touch-action:none/.test(css),'no double-tap zoom; the card and the menu scroll; the map keeps its drags');
 assert.ok(src.includes("for(const t of ['gesturestart','gesturechange'])document.addEventListener(t,e=>e.preventDefault(),{passive:false});")&&src.includes('if(vv.scale>1.01)'),'pinch cancelled, zoom put back');}
console.log('No zooming on the iPad (viewport, double tap, pinch, zoom put back): OK');
let choices=0,peak=0;while(read().state!=='finished'&&choices<180){let s=read();if(s.state==='decision'){const e=s.choices.find(c=>c.recommended);assert.ok(e,'Every junction has route home');act('choose_road',{edgeId:e.id});choices++;if(choices===2){listeners.get('blur')();const old=read().travelledMetres;for(let i=0;i<20;i++)step();assert.ok(read().travelledMetres>old,'Losing focus does not stop the game');console.log('The game keeps running without focus: OK');}}
 for(let i=0;i<600&&read().state==='driving';i++){step();peak=Math.max(peak,read().speedKmh);assert.ok(read().speedKmh<=200);}}
assert.equal(read().state,'finished');assert.ok(read().travelledMetres>2900&&read().travelledMetres<3400);assert.equal(element('finish').hidden,false);console.log('Full route arrival: OK',read(),{choices});
assert.ok(peak>=195,`Automatic acceleration reaches 200 km/h on the longest stretches without any speed selector (peak ${peak} km/h; the curvature limit of the line holds the car back in bends: verify-driving-line.mjs)`);
// The first arrival unlocks the colour picker: the button leads to the start screen, where it is shown.
assert.equal(element('unlock').hidden,false);assert.match(element('again').textContent,/farge/);
element('again').onclick();assert.equal(read().state,'intro');assert.equal(element('welcome').hidden,false);assert.equal(element('rewards').hidden,false);
act('start_drive');assert.equal(read().state,'driving');assert.equal(read().travelledMetres,0);console.log('Replay via the start screen after the first reward: OK');
for(let j=0;j<5000&&read().state==='driving';j++)step();
let off=false;for(let k=0;k<8&&!off;k++){const s=read();const other=s.choices.find(c=>!c.recommended);if(other){act('choose_road',{edgeId:other.id});off=true;}else act('choose_road',{edgeId:s.choices[0].id});for(let j=0;j<5000&&read().state==='driving';j++)step();}assert.ok(off);assert.ok(read().choices.some(c=>c.recommended));console.log('Detour retains route guidance: OK');
element('driveMode').onchange({target:{value:'free'}});assert.equal(read().state,'free');assert.equal(element('worldArrows').hidden,true);assert.equal(element('freeControls').hidden,false);for(let i=0;i<25;i++)step();
const key=(type,code)=>listeners.get(type)({code,key:code==='Space'?' ':code,preventDefault(){},repeat:false});key('keydown','Space');key('keydown','ArrowRight');for(let i=0;i<8;i++)step();assert.equal(read().drifting,true);key('keyup','Space');key('keyup','ArrowRight');step();assert.equal(read().drifting,false);
const pointer=(id,type,n)=>element(id).events.get(type)({pointerId:n,preventDefault(){}});pointer('freeLeft','pointerdown',1);pointer('freeDrift','pointerdown',2);step();assert.equal(read().drifting,true);pointer('freeDrift','pointercancel',2);pointer('freeLeft','pointerup',1);step();assert.equal(read().drifting,false);pointer('freeBrake','pointerdown',3);const beforeBrake=read().speedKmh;for(let i=0;i<10;i++)step();assert.ok(read().speedKmh<beforeBrake);pointer('freeBrake','pointerup',3);
key('keydown','ArrowLeft');listeners.get('blur')();let moved=read().position;for(let i=0;i<20;i++)step();assert.notDeepEqual(read().position,moved,'The car keeps driving after focus loss');for(const code of ['KeyP','Escape']){key('keydown',code);moved=read().position;for(let i=0;i<20;i++)step();assert.notDeepEqual(read().position,moved,code+' does not pause');}key('keydown','KeyQ');assert.equal(read().speedKmh,0);
const [qx,qz]=read().position;let roadDistance=Infinity;for(const r of data.roads)for(let i=1;i<r.p.length;i++){const [ax,az]=r.p[i-1],[bx,bz]=r.p[i],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((qx-ax)*dx+(qz-az)*dz)/(dx*dx+dz*dz||1)));roadDistance=Math.min(roadDistance,Math.hypot(qx-ax-t*dx,qz-az-t*dz));}assert.ok(roadDistance<.001,'Q snaps the car to a road');
element('driveMode').onchange({target:{value:'route'}});assert.equal(read().state,'driving');assert.equal(element('freeControls').hidden,true);assert.equal(read().currentNode,data.start);console.log('Mode switch, Space drift, key release, focus loss and P/Esc keep driving, recovery and return to route: OK');
// Starting over (the menu's "Begynn turen på nytt") leads to the start screen, with the car to choose, in both ways of driving; the start button then drives.
element('restart').onclick();assert.equal(read().state,'intro','Restart in route driving');assert.equal(element('welcome').hidden,false);assert.equal(element('rewards').hidden,false,'with the car to choose');assert.equal(element('freeControls').hidden,true);
act('start_drive');assert.equal(read().state,'driving','The start button drives');
element('driveMode').onchange({target:{value:'free'}});assert.equal(read().state,'free');for(let i=0;i<10;i++)step();
element('restart').onclick();assert.equal(read().state,'intro','Restart in free driving does not start at once');assert.equal(element('welcome').hidden,false);assert.equal(element('rewards').hidden,false);assert.equal(element('freeControls').hidden,true);
act('start_drive');assert.equal(read().state,'free','and the start button starts free driving');assert.equal(element('freeControls').hidden,false);
element('driveMode').onchange({target:{value:'route'}});assert.equal(read().state,'driving');
console.log('Starting over leads to the start screen, with the car to choose, in both ways of driving: OK');
