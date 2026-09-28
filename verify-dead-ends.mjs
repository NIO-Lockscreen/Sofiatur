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
const env={T,roundaboutChoices,createFreeDrive,createMusic,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},window:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),createWorld:()=>({height:()=>160,update(){},resetCamera(){},setTurnArrow(){}})};
const ctx=vm.createContext(env);
const code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
// enter(e) arrives at the end of road e (home when null) and returns the offered roads, or the road the car took by itself.
const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={read:gameState,enter(e){current=e?e.to:data.start;previous=e?e.arrivalFrom??e.from:null;active=null;paused=false;state='decision';maxKmh=200;position.copy(point(current));heading.copy(e?endDirection(e,false):endDirection(optimal.get(current)));showDecision();return state==='driving'?[active.e]:choices;},drive(e){current=e.from;previous=null;active=null;paused=false;state='decision';position.copy(point(current));heading.copy(endDirection(e));choices=[];choose(e.id,false);},active:()=>active};})()`,ctx);
function frame(){now+=45;const q=callbacks.splice(0);q.forEach(cb=>cb(now));}
for(let i=0;i<12;i++){await Promise.resolve();frame();}await init;

// Independent check: from the chosen road, the kindergarten or home is reachable without driving back through the junction.
const adjacency=new Map();for(const e of data.edges){if(!adjacency.has(e.from))adjacency.set(e.from,[]);adjacency.get(e.from).push(e);}
// KIWI's parking and the car park at Dalgård ishall count as places to go, like home and the kindergarten.
const destinations=new Set([data.goal,data.start,'kiwi-parkering','ishall-parkering']);
function leadsOn(from,blocked){const seen=new Set([...blocked,from]),todo=[from];if(blocked.includes(from))return false;while(todo.length){const n=todo.pop();if(destinations.has(n))return true;for(const e of adjacency.get(n)||[])if(!seen.has(e.to)){seen.add(e.to);todo.push(e.to);}}return false;}
function ring(n){const nodes=[];while(!nodes.includes(n)){nodes.push(n);const next=(adjacency.get(n)||[]).find(e=>e.roundabout);if(!next)break;n=next.to;}return nodes;}

// Explore every junction reachable from home, following every offered road and every automatic drive.
const seen=new Set(),queue=[null];let decisions=0,automatic=0,offered=0;
while(queue.length){
 const e=queue.shift(),key=e?e.id:'home';if(seen.has(key))continue;seen.add(key);if(e?.to===data.goal)continue;
 const roads=env.test.enter(e),s=env.test.read();
 if(s.state==='driving'){automatic++;queue.push(roads[0]);continue;}
 assert.equal(s.state,'decision');decisions++;
 // The school parking is reached only from the Palermo lights, where every road is offered on purpose.
 assert.ok(s.currentNode===data.start||['kiwi-parkering','ishall-parkering','skoleparkering-8'].includes(s.currentNode)||s.choices.some(c=>c.direction!=='Snu'),`Led into a blindvei at ${s.currentNode}`);
 for(const c of roads){
  const shown=s.choices.find(x=>x.id===c.id);offered++;
  if(!shown.recommended&&s.currentNode!=='91783986')assert.ok(leadsOn(c.to,c.roundaboutPlan?ring(s.currentNode):[s.currentNode]),`${c.name} at ${s.currentNode} is a blindvei`);
  if(s.currentNode!=='91783986'||leadsOn(c.to,[s.currentNode]))queue.push(c); // extra Palermo roads are checked below
 }
}
const ishallRoad=data.edges.find(e=>e.to==='ishall-parkering');assert.ok(seen.has(ishallRoad.id),'Dalgård ishall can be reached with blindveier off');
console.log(`Blindveier: ${decisions} reachable junctions offer ${offered} roads, none a dead end; ${automatic} single-road junctions drive on automatically; Dalgård ishall reachable.`);

// Vetle Vislies veg: straight ahead is a blindvei, so the car turns right onto Herlofsons veg by itself.
const vetle=data.edges.find(e=>e.from==='201494485'&&e.to==='201497757');
let [taken]=env.test.enter(vetle);assert.equal(env.test.read().state,'driving');assert.equal(taken.name,'Herlofsons veg');assert.equal(taken.to,'254330189');assert.ok(element('worldArrows').children.every(b=>b.className.includes('ahead')),'Only arrows for the next junction are shown');
// Nordre Hallsetveg ahead is a blindvei, so the car follows Adolf Andreassens veg toward the kindergarten.
[taken]=env.test.enter(data.edges.find(e=>e.from==='91783985'&&e.to==='254465339'));assert.equal(env.test.read().state,'driving');assert.equal(taken.name,'Adolf Andreassens veg');
console.log('Right-or-blindvei junctions drive on automatically: OK');

// Home and the kindergarten are dead ends too, but stay selectable.
const home=env.test.enter(data.edges.find(e=>e.from==='206324584'&&e.to==='13644489026'));assert.equal(env.test.read().state,'decision');assert.ok(home.some(c=>c.to===data.start),'Home can still be chosen');
const gate=data.edges.find(e=>e.to===data.goal);const kindergarten=env.test.enter(data.edges.find(e=>e.to===gate.from&&e.from!==data.goal));assert.equal(env.test.read().state,'decision');assert.ok(kindergarten.some(c=>c.to===data.goal),'The kindergarten entrance can be chosen');
console.log('Home and kindergarten entrances remain choices: OK');

// Speed: with blindveier off the car keeps its speed through the automatic right turn and first slows for the next real choice.
function approach(e){env.test.drive(e);const speeds=[];let crossed=null;
 for(let i=0;i<4000&&env.test.read().state==='driving';i++){frame();speeds.push(env.test.read().speedKmh);if(!crossed&&env.test.active()?.e!==e)crossed=speeds.at(-2);}
 return {crossed,beforeChoice:speeds.at(-2),state:env.test.read().state};}
let run=approach(vetle);
assert.ok(run.crossed>=150,`Keeps speed into the automatic turn (${run.crossed} km/h)`);assert.equal(run.state,'decision');assert.ok(run.beforeChoice<=15,`Slows for the next real choice (${run.beforeChoice} km/h)`);
console.log(`Blindveier off: ${run.crossed} km/h through the automatic turn, ${run.beforeChoice} km/h before the next choice: OK`);

// Setting on: dead ends are offered again and the car slows at every junction, as before.
element('deadEnds').onchange({target:{value:'on'}});
const withDeadEnds=env.test.enter(vetle);assert.equal(env.test.read().state,'decision');assert.ok(withDeadEnds.some(c=>c.name==='Vetle Vislies veg'),'Blindvei offered when the setting is on');
run=approach(vetle);assert.equal(run.state,'decision');assert.ok(run.beforeChoice<=15,'Slows for the blindvei choice');
let roundaboutExits=0;for(const e of data.edges.filter(x=>!x.roundabout&&adjacency.get(x.to)?.some(y=>y.roundabout)&&!adjacency.get(x.from)?.some(y=>y.roundabout))){const exits=env.test.enter(e);assert.equal(env.test.read().state,'decision','Every roundabout entrance asks again');roundaboutExits+=exits.length;}
// Switching off while a blindvei choice is shown applies when the game resumes.
env.test.enter(vetle);element('pause').onclick();element('deadEnds').onchange({target:{value:'off'}});assert.equal(env.test.read().state,'decision');element('pause').onclick();
assert.equal(env.test.read().state,'driving');assert.equal(env.test.active().e.name,'Herlofsons veg');
console.log(`Setting on offers blindveier again (${roundaboutExits} roundabout exits); switching off applies on resume: OK`);

// Olaf Grilstads veg runs from the Myrahallen junction (Konrad Dahls veg / Per Sivles veg) to Kyvannsvegen and can be chosen from both ends.
element('deadEnds').onchange({target:{value:'off'}});
const olafFrom=(from,to,end)=>{const roads=env.test.enter(data.edges.find(e=>e.from===from&&e.to===to)),s=env.test.read();const olaf=roads.find(c=>c.name==='Olaf Grilstads veg'&&c.to===end);assert.ok(olaf,`Olaf Grilstads veg offered at ${to} (from ${from}): ${roads.map(c=>c.name).join(', ')}`);return `${s.choices.find(c=>c.id===olaf.id)?.direction??'automatisk'}`;};
const fromPerSivles=olafFrom('3706544739','13047829215','35682728'),fromKonradDahls=olafFrom('192622682','13047829215','35682728'),fromKyvannsvegen=olafFrom('1866474268','35682728','13047829215');
console.log(`Olaf Grilstads veg from Per Sivles veg (${fromPerSivles}), Konrad Dahls veg (${fromKonradDahls}) and Kyvannsvegen (${fromKyvannsvegen}): OK`);

// Junctions a few metres apart are asked as one: at Gamle Oslovei (from the south) Kyvannsvegen up towards
// Myra barnehage is offered as a left turn in the junction where the car stops, next to Nedre Ferstadveg.
const oslovei=env.test.enter(data.edges.find(e=>e.to==='34036717'&&e.name==='Gamle Oslovei')),osloveiState=env.test.read();
const osloveiRoads=Object.fromEntries(osloveiState.choices.map(c=>[c.direction,c.street]));
assert.equal(osloveiRoads.Venstre,'Kyvannsvegen');assert.equal(osloveiRoads['Rett frem'],'Gamle Oslovei');assert.equal(osloveiRoads['Høyre'],'Nedre Ferstadveg');
assert.ok(oslovei.find(c=>c.name==='Kyvannsvegen').path.includes('9316519359'),'The car still drives through both points');
const junctionOf=new Map();for(const e of data.edges){if(!junctionOf.has(e.from))junctionOf.set(e.from,new Set());junctionOf.get(e.from).add(e.to);}
const short=data.edges.filter(e=>!e.roundabout&&!e.stub&&e.length<12&&junctionOf.get(e.from)?.size>2&&junctionOf.get(e.to)?.size>2&&![...adjacency.get(e.from),...adjacency.get(e.to)].some(x=>x.roundabout));
assert.deepEqual(short.map(e=>e.id),[],'No two junctions under 12 m apart ask separately');
console.log(`Gamle Oslovei: ${osloveiState.choices.map(c=>c.direction+' '+c.street).join(', ')}; no junction pairs under 12 m: OK`);

// The Palermo traffic lights offer left, straight on and right from every road in, also with blindveier off.
element('deadEnds').onchange({target:{value:'off'}});
for(const e of data.edges.filter(e=>e.to==='91783986')){env.test.enter(e);const dirs=env.test.read().choices.map(c=>c.direction);
 for(const d of ['Venstre','Rett frem','Høyre'])assert.ok(dirs.includes(d),`${d} from ${e.name} at the Palermo lights: ${dirs}`);}
// KIWI: just after the roundabout the parking can be chosen; it is not a blindvei.
env.test.enter(data.edges.find(e=>e.to==='6673481580'&&e.from==='5119347221'));const kiwiChoices=env.test.read().choices;
assert.ok(kiwiChoices.some(c=>c.street==='KIWI'&&c.direction==='Høyre'),`KIWI offered: ${kiwiChoices.map(c=>c.direction+' '+c.street)}`);
// Dalgårdvegen runs all the way down to Dalgård ishall: from the Granlivegen junction it is offered towards the hall,
// and where the service road turns off to the car park, 'Dalgård ishall' is a choice.
const granli=env.test.enter(data.edges.find(e=>e.name==='Anders Wigens veg'&&e.to==='195972167'));
assert.ok(granli.some(c=>c.name==='Dalgårdvegen'&&c.to==='280511856'),`Dalgårdvegen towards the ice rink offered: ${granli.map(c=>c.name+' '+c.to)}`);
env.test.enter(data.edges.find(e=>e.name==='Dalgårdvegen'&&e.from==='280511856'&&e.to==='1727120658'));const ishall=env.test.read().choices;
assert.ok(ishall.some(c=>c.street==='Dalgård ishall'),`Dalgård ishall offered: ${ishall.map(c=>c.direction+' '+c.street)}`);
console.log(`Palermo lights: left, straight on and right from all ${data.edges.filter(e=>e.to==='91783986').length} roads in; KIWI parking offered after the roundabout; Dalgårdvegen to Dalgård ishall (${ishall.map(c=>c.direction+' '+c.street).join(', ')}): OK`);
