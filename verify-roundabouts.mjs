import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),els=new Map();let callbacks=[],now=0;
const canvasContext=new Proxy({},{get:()=>()=>{}});
const element=id=>{if(!els.has(id))els.set(id,{hidden:false,textContent:'',style:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},addEventListener(){},getContext(){return canvasContext}});return els.get(id);};
const env={T,roundaboutChoices,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},window:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),createWorld:()=>({height:()=>160,update(){},resetCamera(){},setTurnArrow(){}})};
env.createFreeDrive=createFreeDrive;env.createMusic=createMusic;
const ctx=vm.createContext(env);
const code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={read:gameState,enter(e){current=e.to;previous=e.from;active=null;paused=false;state='decision';maxKmh=200;position.copy(point(current));heading.copy(endDirection(e,false));showDecision();},getActive:()=>active};})()`,ctx);
function frame(){now+=45;const q=callbacks.splice(0);q.forEach(cb=>cb(now));}
for(let i=0;i<12;i++){await Promise.resolve();frame();}await init;
const ringNodes=new Set(data.edges.filter(e=>e.roundabout).map(e=>e.from));
const entries=data.edges.filter(e=>!e.roundabout&&ringNodes.has(e.to)&&!ringNodes.has(e.from));
const adjacency=new Map();for(const e of data.edges){if(!adjacency.has(e.from))adjacency.set(e.from,[]);adjacency.get(e.from).push(e);}
function ring(n){const nodes=new Set();while(!nodes.has(n)){nodes.add(n);const next=(adjacency.get(n)||[]).find(e=>e.roundabout);if(!next)break;n=next.to;}return nodes;}
// A blindvei exit only leads back into the circle; home, the kindergarten and the car parks the game treats as places
// to go (KIWI, Dalgård ishall, Rema 1000 Stavset, Bunnpris) count as destinations.
const places=new Set([data.goal,data.start,'kiwi-parkering','ishall-parkering','rema-parkering','bunnpris-parkering']);
function leadsOn(from,blocked){const seen=new Set([...blocked,from]),todo=[from];while(todo.length){const n=todo.pop();if(places.has(n))return true;for(const e of adjacency.get(n)||[])if(!seen.has(e.to)){seen.add(e.to);todo.push(e.to);}}return false;}
let tested=0,automatic=0;
for(const entry of entries){
 env.test.enter(entry);
 if(env.test.read().state==='driving'){
  // Only one exit leads on; the car drives through the circle without asking.
  const plan=env.test.getActive().e;assert.ok(plan.roundaboutPlan);assert.ok(element('worldArrows').children.every(b=>b.className.includes('ahead')),'Only arrows for the next junction are shown');assert.equal(element('undoRoundabout').hidden,true);
  assert.ok(leadsOn(plan.to,ring(entry.to)),'Automatic exit is not a blindvei');automatic++;continue;
 }
 const exits=env.test.read().choices;
 assert.ok(exits.length>=2,'Every entrance with a choice offers exits');
 assert.equal(element('worldArrows').children.length,exits.length,'Every exit has a touch button, including shared directions');
 for(let i=0;i<exits.length;i++){
  env.test.enter(entry);const before=env.test.read();element('worldArrows').children[i].onclick();assert.equal(element('undoRoundabout').hidden,false);
  const plan=env.test.getActive().e;
  assert.ok(plan.roundaboutPlan);assert.ok(exits.some(e=>e.id===plan.id&&e.exitNumber===plan.exitNumber));
  assert.ok(exits.find(e=>e.id===plan.id).recommended||leadsOn(plan.to,ring(entry.to)),`${plan.name} exit is not a blindvei`);
  for(let j=1;j<plan.segments.length;j++)assert.equal(plan.segments[j-1].to,plan.segments[j].from,'Continuous directed path');
  const control=env.test.getActive();let frames=0;
  element('pause').onclick();const old=env.test.read().travelledMetres;for(let j=0;j<10;j++)frame();assert.equal(env.test.read().travelledMetres,old);element('pause').onclick();
  while(env.test.getActive()===control&&frames++<15000){frame();if(env.test.getActive()===control)assert.equal(env.test.read().state,'driving','No intermediate stop inside circle');}
  assert.ok(frames<15000,'Reaches selected exit');assert.equal(env.test.read().currentNode,plan.to,'Arrives at selected road');element('undoRoundabout').onclick();assert.equal(env.test.read().currentNode,entry.to);assert.equal(env.test.read().state,'decision');assert.equal(env.test.read().travelledMetres,before.travelledMetres);assert.equal(element('worldArrows').children.length,exits.length);assert.equal(element('undoRoundabout').hidden,true);element('worldArrows').children[i].onclick();for(let j=0;j<8;j++)frame();element('undoRoundabout').onclick();assert.equal(env.test.read().currentNode,entry.to);assert.equal(env.test.read().state,'decision');tested++;
 }
}
console.log(`Roundabouts: ${tested} exits from ${entries.length-automatic} entrances passed; touch, pause, directed route and automatic traversal and undo verified. ${automatic} entrances with one exit that is not a blindvei drive through automatically.`);

// Exit arrows follow the exit numbers round the circle: right, then straight on, then left, then back.
const order={Høyre:0,'Rett frem':1,Venstre:2,Snu:3};let entrances=0;
for(const entry of entries){env.test.enter(entry);const s=env.test.read();if(s.state!=='decision')continue;entrances++;
 const byNumber=[...s.choices].sort((a,b)=>a.exitNumber-b.exitNumber).map(c=>order[c.direction]);
 for(let i=1;i<byNumber.length;i++)assert.ok(byNumber[i]>=byNumber[i-1],`Arrows in exit order at ${entry.to}: ${s.choices.map(c=>c.exitNumber+' '+c.direction).join(', ')}`);}
// The KIWI roundabout on the way to the kindergarten, entered at a slant: Odd Husbys veg carries straight on, General
// Bangs veg is the first turn to the left (the user's description), and the car drives past the
// splitter island without asking again; the next question is the KIWI parking entrance.
env.test.enter(data.edges.find(e=>e.to==='105852'&&e.name==='Gamle Oslovei'));const kiwi=env.test.read().choices;
assert.deepEqual(kiwi.map(c=>`${c.exitNumber}. ${c.direction} ${c.street}`),['1. Rett frem Odd Husbys veg','2. Venstre General Bangs veg','3. Snu Gamle Oslovei']);
element('worldArrows').children[kiwi.findIndex(c=>c.street==='General Bangs veg')].onclick();const bangs=env.test.getActive().e;
assert.equal(bangs.to,'6673481580','Past the splitter island to the next real junction (KIWI entrance)');let ringTop=0;
for(let i=0;i<5000&&env.test.read().state==='driving';i++){frame();if(env.test.getActive()?.e===bangs)ringTop=Math.max(ringTop,env.test.read().speedKmh);}
assert.equal(env.test.read().currentNode,'6673481580','Next stop is the KIWI entrance, not the splitter island');assert.ok(ringTop>=44,`Circle speed ${ringTop} km/h`);
console.log(`Exit arrows in exit order at ${entrances} entrances; KIWI roundabout straight/left/back, straight through the splitter island: OK`);
