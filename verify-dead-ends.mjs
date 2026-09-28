import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createFreeDrive} from './dist/free-drive.js';
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),els=new Map();let callbacks=[],now=0;
const canvasContext=new Proxy({},{get:()=>()=>{}});
const element=id=>{if(!els.has(id))els.set(id,{hidden:false,textContent:'',style:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},addEventListener(){},getContext(){return canvasContext}});return els.get(id);};
const env={T,roundaboutChoices,createFreeDrive,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},window:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),createWorld:()=>({height:()=>160,update(){},resetCamera(){},setTurnArrow(){}})};
const ctx=vm.createContext(env);
const code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
// enter(e) arrives at the end of road e (home when null) and returns the offered roads, or the road the car took by itself.
const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={read:gameState,enter(e){current=e?e.to:data.start;previous=e?e.arrivalFrom??e.from:null;active=null;paused=false;state='decision';maxKmh=200;position.copy(point(current));heading.copy(e?endDirection(e,false):endDirection(optimal.get(current)));showDecision();return state==='driving'?[active.e]:choices;}};})()`,ctx);
function frame(){now+=45;const q=callbacks.splice(0);q.forEach(cb=>cb(now));}
for(let i=0;i<12;i++){await Promise.resolve();frame();}await init;

// Independent check: from the chosen road, the kindergarten or home is reachable without driving back through the junction.
const adjacency=new Map();for(const e of data.edges){if(!adjacency.has(e.from))adjacency.set(e.from,[]);adjacency.get(e.from).push(e);}
function leadsOn(from,blocked){const seen=new Set([...blocked,from]),todo=[from];if(blocked.includes(from))return false;while(todo.length){const n=todo.pop();if(n===data.goal||n===data.start)return true;for(const e of adjacency.get(n)||[])if(!seen.has(e.to)){seen.add(e.to);todo.push(e.to);}}return false;}
function ring(n){const nodes=[];while(!nodes.includes(n)){nodes.push(n);const next=(adjacency.get(n)||[]).find(e=>e.roundabout);if(!next)break;n=next.to;}return nodes;}

// Explore every junction reachable from home, following every offered road and every automatic drive.
const seen=new Set(),queue=[null];let decisions=0,automatic=0,offered=0;
while(queue.length){
 const e=queue.shift(),key=e?e.id:'home';if(seen.has(key))continue;seen.add(key);if(e?.to===data.goal)continue;
 const roads=env.test.enter(e),s=env.test.read();
 if(s.state==='driving'){automatic++;queue.push(roads[0]);continue;}
 assert.equal(s.state,'decision');decisions++;
 assert.ok(s.currentNode===data.start||s.choices.some(c=>c.direction!=='Snu'),`Led into a blindvei at ${s.currentNode}`);
 for(const c of roads){
  const shown=s.choices.find(x=>x.id===c.id);offered++;
  if(!shown.recommended)assert.ok(leadsOn(c.to,c.roundaboutPlan?ring(s.currentNode):[s.currentNode]),`${c.name} at ${s.currentNode} is a blindvei`);
  queue.push(c);
 }
}
console.log(`Blindveier: ${decisions} reachable junctions offer ${offered} roads, none a dead end; ${automatic} single-road junctions drive on automatically.`);

// Vetle Vislies veg: straight ahead is a blindvei, so the car turns right onto Herlofsons veg by itself.
const vetle=data.edges.find(e=>e.from==='201494485'&&e.to==='201497757');
let [taken]=env.test.enter(vetle);assert.equal(env.test.read().state,'driving');assert.equal(taken.name,'Herlofsons veg');assert.equal(taken.to,'254330189');assert.equal(element('worldArrows').children.length,0);
// Nordre Hallsetveg ahead is a blindvei, so the car follows Adolf Andreassens veg toward the kindergarten.
[taken]=env.test.enter(data.edges.find(e=>e.from==='91783985'&&e.to==='254465339'));assert.equal(env.test.read().state,'driving');assert.equal(taken.name,'Adolf Andreassens veg');
console.log('Right-or-blindvei junctions drive on automatically: OK');

// Home and the kindergarten are dead ends too, but stay selectable.
const home=env.test.enter(data.edges.find(e=>e.from==='206324584'&&e.to==='13644489026'));assert.equal(env.test.read().state,'decision');assert.ok(home.some(c=>c.to===data.start),'Home can still be chosen');
const gate=data.edges.find(e=>e.to===data.goal);const kindergarten=env.test.enter(data.edges.find(e=>e.to===gate.from&&e.from!==data.goal));assert.equal(env.test.read().state,'decision');assert.ok(kindergarten.some(c=>c.to===data.goal),'The kindergarten entrance can be chosen');
console.log('Home and kindergarten entrances remain choices: OK');
