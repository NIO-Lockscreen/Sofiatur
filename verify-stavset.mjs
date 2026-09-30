import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
import {addStavset,addStavsetDetails,addBridges,bunnprisFrame} from './dist/stavset.js';
import {roadWidth,projectPoint} from './dist/transit-geometry.js';

// The detour south: Odd Husbys veg past Bunnpris Ugla down to the roundabout at Stavset senter, into Rema 1000's car
// park, and back north on Byåsveien through the roundabouts at Lysverkvegen and Kystadlia to the kindergarten.
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),els=new Map();let callbacks=[],now=0;
const canvasContext=new Proxy({},{get:()=>()=>{}});
const element=id=>{if(!els.has(id))els.set(id,{hidden:false,textContent:'',style:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},addEventListener(){},getContext(){return canvasContext}});return els.get(id);};
const env={T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},window:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),createWorld:()=>({height:()=>160,carHeight:()=>160,update(){},resetCamera(){},setTurnArrow(){}})};
const ctx=vm.createContext(env);
const code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={read:gameState,enter(e){current=e?e.to:data.start;previous=e?e.arrivalFrom??e.from:null;active=null;state='decision';maxKmh=200;position.copy(point(current));heading.copy(e?endDirection(e,false):endDirection(optimal.get(current)));showDecision();return state==='driving'?[active.e]:choices;},choose(id){choose(id,false);},active:()=>active};})()`,ctx);
function frame(){now+=45;const q=callbacks.splice(0);q.forEach(cb=>cb(now));}
for(let i=0;i<12;i++){await Promise.resolve();frame();}await init;

// --- The map reaches Stavset ----------------------------------------------------------------------------------------
const t=data.terrain,zEnd=t.z0+(t.nz-1)*t.step;
assert.ok(data.south?.length>=6&&data.bounds[3]>=1470&&zEnd>=1470,'Map and terrain reach Stavset');
const rema=data.pois.find(p=>p.name==='Rema 1000 Stavset');assert.ok(rema,'Rema 1000 Stavset is on the map');
// No step in the ground where the measured grid ends (z=840) and where the plot at Stavset senter is levelled.
// The ground is no steeper across the seam than within the measured rows just north of it.
const H=(i,j)=>t.heights[j*t.nx+i],seam=(840-t.z0)/t.step,step=(j0,j1)=>{let m=0;for(let j=j0;j<j1;j++)for(let i=0;i<t.nx;i++)m=Math.max(m,Math.abs(H(i,j+1)-H(i,j)));return m;};
const across=step(seam,seam+3),measured=step(seam-5,seam);
assert.ok(across<=measured,`Ground continuous across the seam (${across.toFixed(1)} m per 40 m, measured rows up to ${measured.toFixed(1)})`);
const plot=[120,160,200].flatMap(x=>[1320,1360,1400].map(z=>H((x-t.x0)/t.step,(z-t.z0)/t.step)));assert.ok(plot.every(h=>h===plot[0]),'Stavset senter stands on a level plot');
console.log(`Map: south to z=${data.bounds[3]}, terrain to z=${zEnd}; at most ${across.toFixed(1)} m per 40 m across the seam at z=840 (measured rows: ${measured.toFixed(1)}): OK`);

// --- Driving the detour with blindveier off -------------------------------------------------------------------------
// At every junction take the offered road nearest the next stop: the stop must always be among the offered roads.
const reverse=new Map();for(const e of data.edges){if(!reverse.has(e.to))reverse.set(e.to,[]);reverse.get(e.to).push(e);}
function distancesTo(goal){const d=new Map([[goal,0]]),todo=[goal];while(todo.length){todo.sort((a,b)=>d.get(b)-d.get(a));const n=todo.pop();for(const e of reverse.get(n)||[]){const nd=d.get(n)+e.length;if(nd<(d.get(e.from)??Infinity)){d.set(e.from,nd);todo.push(e.from);}}}return d;}
const rings=new Map();for(const e of data.edges)if(e.roundabout)rings.set(e.from,e);
const ringOf=n=>{const s=new Set();while(n&&!s.has(n)){s.add(n);n=rings.get(n)?.to;}return s;};
function drive(from,goal){const d=distancesTo(goal),streets=[],circles=[];let e=from,steps=0,asked=0;
 while((e?e.to:data.start)!==goal&&steps++<200){const roads=env.test.enter(e),s=env.test.read();if(s.state==='decision')asked++;
  const next=roads.reduce((a,c)=>!a||d.get(c.to)+c.length<d.get(a.to)+a.length?c:a,null);
  assert.ok(next&&d.has(next.to),`A road on towards ${goal} is offered at ${s.currentNode}`);
  if(next.roundaboutPlan)circles.push(next.from);
  if(streets.at(-1)!==next.name)streets.push(next.name);e=next;}
 assert.ok(steps<200,'Arrives');return {last:e,streets,circles,asked};}
const out=drive(null,'rema-parkering');
assert.ok(out.streets.includes('Odd Husbys veg')&&out.streets.at(-1)==='Rema 1000',`Down Odd Husbys veg to Rema: ${out.streets.join(' → ')}`);
const stavset=ringOf(data.edges.find(e=>e.roundabout&&Math.hypot(data.nodes[e.from][0]-84,data.nodes[e.from][1]-1328)<20).from);
assert.ok(out.circles.some(n=>stavset.has(n)),'Through the roundabout at Stavset senter');
const back=drive(out.last,data.goal);
const circleNear=(x,z)=>ringOf(data.edges.find(e=>e.roundabout&&Math.hypot(data.nodes[e.from][0]-x,data.nodes[e.from][1]-z)<16).from);
for(const [name,x,z] of [['Stavset',84,1328],['Lysverkvegen',565,1262],['Kystadlia',982,1015]])assert.ok(back.circles.some(n=>circleNear(x,z).has(n)),`Back north through the ${name} roundabout`);
assert.ok(back.streets.includes('Byåsveien'),'On Byåsveien');
console.log(`Detour: ${out.streets.join(' → ')} (${out.asked} questions)`);
console.log(`Back: ${back.streets.join(' → ')} (${back.asked} questions), through the Stavset, Lysverkvegen and Kystadlia roundabouts: OK`);

// Driving into the car park at Rema (and at Bunnpris) is announced on arrival.
for(const [goal,text] of [['rema-parkering','Rema 1000'],['bunnpris-parkering','Bunnpris']]){
 const e=data.edges.find(x=>x.to===goal);env.test.enter(data.edges.find(x=>x.to===e.from&&!x.roundabout));env.test.choose(e.id);
 for(let i=0;i<4000&&env.test.read().state==='driving';i++)frame();
 assert.equal(env.test.read().currentNode,goal);assert.ok(element('toast').textContent.includes(text),`Arrival at ${text} announced: ${element('toast').textContent}`);}
const bp=drive(null,'bunnpris-parkering');assert.equal(bp.streets.at(-1),'Bunnpris');
console.log(`Car parks at Rema 1000 Stavset and Bunnpris Ugla are places to drive to (Bunnpris via ${bp.streets.slice(-2).join(' → ')}): OK`);

// The T-junction where Olav Duuns veg meets Odd Husbys veg: Odd Husbys veg to the left and right, no way into the Bunnpris
// car park (there is none there; a driveway drawn along the footway from 29 to 30 September 2026 is gone). The car park is
// reached from the end of Granlivegen, as mapped.
const tj=data.edges.find(e=>e.name==='Olav Duuns veg'&&e.from==='253815085'&&e.to==='185588577');
env.test.enter(tj);const tjChoices=env.test.read().choices;
assert.ok(!tjChoices.some(c=>c.street==='Bunnpris'),`No way into Bunnpris at the T-junction: ${tjChoices.map(c=>c.direction+' '+c.street).join(', ')}`);
assert.ok(tjChoices.some(c=>c.direction==='Høyre'&&c.street==='Odd Husbys veg')&&tjChoices.some(c=>c.direction==='Venstre'&&c.street==='Odd Husbys veg'),'Odd Husbys veg to the left and right');
assert.ok(!data.roads.some(r=>r.id==='bunnpris-innkjoring')&&!Object.keys(data.nodes).some(n=>n.startsWith('bunnpris-i'))&&!data.edges.some(e=>e.from==='185588577'&&e.path.includes('bunnpris-parkering')),'Only the mapped way in');
console.log(`Olav Duuns veg / Odd Husbys veg: ${tjChoices.map(c=>c.direction+' '+c.street).join(', ')}; Bunnpris only from Granlivegen: OK`);

// Roundabout arrows at Stavset follow the exit numbers, and the way back to where the car came from reads as a U-turn.
const entries=data.edges.filter(e=>!e.roundabout&&stavset.has(e.to)&&!stavset.has(e.from));const order={Høyre:0,'Rett frem':1,Venstre:2,Snu:3},seen=[];
for(const entry of entries){const roads=env.test.enter(entry),s=env.test.read();if(s.state!=='decision')continue;
 const byNumber=[...s.choices].sort((a,b)=>a.exitNumber-b.exitNumber);
 for(let i=1;i<byNumber.length;i++)assert.ok(order[byNumber[i].direction]>=order[byNumber[i-1].direction],`Exit order from ${entry.name}`);
 const u=byNumber.at(-1);if(roads.find(r=>r.id===u.id).segments.some(x=>x.to===entry.from))assert.equal(u.direction,'Snu',`Back to ${entry.name} is a U-turn`);
 seen.push(`${entry.name}: ${byNumber.map(c=>`${c.exitNumber}. ${c.direction} ${c.street}`).join(', ')}`);}
assert.ok(seen.length>=3,'Stavset roundabout entrances ask');console.log('Stavset roundabout:\n  '+seen.join('\n  '));

// --- The buildings ------------------------------------------------------------------------------------------------
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}}),width:0,height:0})};
function height(x,z){const a=Math.max(0,Math.min(t.nx-1.001,(x-t.x0)/t.step)),b=Math.max(0,Math.min(t.nz-1.001,(z-t.z0)/t.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=t.heights;return 160+(((h[j*t.nx+i]*(1-u)+h[j*t.nx+i+1]*u)*(1-v)+(h[(j+1)*t.nx+i]*(1-u)+h[(j+1)*t.nx+i+1]*u)*v)-160)*1.45;}
let points=[];const scene=new T.Scene(),bucket=()=>({}),tri=(b,...v)=>points.push(...v.slice(0,3)),quad=(b,...v)=>points.push(...v.slice(0,4)),box=(b,x,y,z)=>points.push([x,y,z]);
const building=id=>data.buildings.find(b=>String(b.id)===id),named=name=>{const f=[];scene.traverse(o=>{if(o.name===name)f.push(o);});return f;};
const inRing=(poly,x,z)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [ax,az]=poly[j],[bx,bz]=poly[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
const normal=o=>new T.Vector3(0,0,1).applyEuler(o.rotation),nearRoad=(x,z,type)=>Math.min(...data.roads.filter(r=>!type||r.type!=='service').flatMap(r=>r.p.slice(1).map((p,i)=>projectPoint([x,z],r.p[i],p).distance)));
for(const id of ['1037053709','89061195']){points=[];const r=addStavset({T,scene,building:building(id),height,bucket,tri,quad,box});assert.ok(r&&points.length>200,`${id} modelled (${points.length} vertices)`);assert.ok(points.every(p=>p.every(Number.isFinite)));
 for(const [x,z] of building(id).p)assert.ok(x>=r.bounds[0]&&x<=r.bounds[2]&&z>=r.bounds[1]&&z<=r.bounds[3],'Footprint inside the tree-free extent');}
assert.equal(addStavset({T,scene,building:building('191198632'),height,bucket,tri,quad,box}),null,'The old house keeps the generic builder');
// Bunnpris: the big letters on the gable look onto Odd Husbys veg, the road south to Stavset; the car park is on the canopy side.
const [letters]=named('BUNNPRIS'),n=normal(letters);
assert.ok(!inRing(building('1037053709').p,letters.position.x+n.x,letters.position.z+n.z),'BUNNPRIS on the outside of the gable');
const odd=data.roads.filter(r=>r.name==='Odd Husbys veg');assert.ok(odd.some(r=>r.p.slice(1).some((p,i)=>projectPoint([letters.position.x+n.x*16,letters.position.z+n.z*16],r.p[i],p).distance<6)),'The gable faces Odd Husbys veg');
const lot=data.areas.find(a=>a.osm==='w207829382'),[ux,uz]=bunnprisFrame.u,canopy=[bunnprisFrame.o[0]+ux*5+uz*6,bunnprisFrame.o[1]+uz*5-ux*6];
assert.ok(inRing(lot.p,...canopy),'The canopy side opens onto the car park');assert.ok(named('Man-Fre 9-22 Lørdag 10-22 Søndag 10-22').length===1,'Opening hours under the letters');
const bpPark=data.nodes['bunnpris-parkering'];assert.ok(inRing(lot.p,...bpPark)&&Math.hypot(bpPark[0]-canopy[0],bpPark[1]-canopy[1])<9,'Parking place in front of the canopy');
// Stavset senter: STAVSET SENTER and the REMA 1000 logo over the entrance facing the car park, a second logo towards Byåsveien.
const [logo]=named('REMA 1000'),[title]=named('STAVSET SENTER'),[roadLogo]=named('REMA 1000 (Byåsveien)'),lotS=data.areas.find(a=>a.osm==='w89061200');
for(const s of [logo,title])assert.ok(s,'Sign exists');const ln=normal(logo);
assert.ok(inRing(lotS.p,logo.position.x+ln.x*14,logo.position.z+ln.z*14),'REMA 1000 over the entrance looks onto the car park');
assert.ok(title.position.y>logo.position.y+2,'STAVSET SENTER above the logo');
const remaPark=data.nodes['rema-parkering'];assert.ok(Math.hypot(remaPark[0]-logo.position.x,remaPark[1]-logo.position.z)<16&&inRing(lotS.p,...remaPark),'Parking place right in front of Rema');
const rn=normal(roadLogo);assert.ok(data.roads.some(r=>r.name==='Byåsveien'&&r.p.slice(1).some((p,i)=>projectPoint([roadLogo.position.x+rn.x*18,roadLogo.position.z+rn.z*18],r.p[i],p).distance<12)),'Second logo faces Byåsveien');
console.log('Bunnpris Ugla: gable with BUNNPRIS and opening hours towards Odd Husbys veg, canopy and parking place on the car park side: OK');
console.log('Stavset senter: STAVSET SENTER and REMA 1000 over the entrance, parking place in front of it, second logo towards Byåsveien: OK');

// Details: parking bays inside the car parks, and the railings along the bridges (Kystadbrua, Dalgårdbrua).
const ribbons=[];const wallBase=new Map([['191198632',{y:height(486,510),h:5.8}]]);
addStavsetDetails({T,scene,data,wallBase,height,bucket,quad,box,ribbon:(p,w)=>ribbons.push(p)});
assert.ok(ribbons.length>30&&ribbons.every(p=>inRing(lotS.p,...p[0])||inRing(lot.p,...p[0])),`Parking bays inside the car parks (${ribbons.length})`);
points=[];addBridges({data,roadTop:(x,z)=>height(x,z)+.39,roadWidth,bucket,quad,box});const bridge=data.roads.find(r=>r.bridge);
assert.ok(['Kystadbrua','Dalgårdbrua'].includes(bridge.name));assert.ok(points.length>100&&points.every(p=>nearRoad(p[0],p[2])>=roadWidth(bridge)/2),'Railings beside the carriageway');
console.log(`Details: ${ribbons.length} parking bays, the goods door at Bunnpris, bridges with railings: OK`);
// Dalgårdbrua: Byåsveien crosses the Dalgård valley on a bridge; the deck runs straight between its ends, far above the
// valley floor, on piers (the user: "you don't drive down into a valley, you drive on a bridge").
const dal=data.roads.find(r=>r.name==='Dalgårdbrua');assert.ok(dal?.bridge,'Dalgårdbrua is a bridge (OSM bridge=yes)');
const [d0,d1]=[dal.p[0],dal.p.at(-1)],dl=Math.hypot(d1[0]-d0[0],d1[1]-d0[1]),deck=(x,z)=>{const t=Math.max(0,Math.min(1,((x-d0[0])*(d1[0]-d0[0])+(z-d0[1])*(d1[1]-d0[1]))/dl/dl));return height(...d0)+(height(...d1)-height(...d0))*t+.39;};
let clearance=0;for(let k=1;k<20;k++){const x=d0[0]+(d1[0]-d0[0])*k/20,z=d0[1]+(d1[1]-d0[1])*k/20;clearance=Math.max(clearance,deck(x,z)-height(x,z));}
const {piers}=addBridges({data:{roads:[dal]},roadTop:deck,roadWidth,bucket,quad,box,height});
assert.ok(clearance>10,`The deck spans the valley (${clearance.toFixed(1)} m above its floor)`);assert.ok(piers.length>=4,`Piers under Dalgårdbrua (${piers.length})`);
console.log(`Dalgårdbrua: ${Math.round(dl)} m bridge, up to ${clearance.toFixed(1)} m above the valley, ${piers.length} piers: OK`);
