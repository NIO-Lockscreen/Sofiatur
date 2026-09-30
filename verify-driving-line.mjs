import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines,A_LAT} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
import {createRoadSurface} from './dist/road-surface.js';
import {roadWidth} from './dist/transit-geometry.js';
// The car's line (dist/driving-line.js): right-hand lane, arcs through junctions, speed from curvature. The whole main trip and the
// detour to Stavset (home -> Rema 1000 at Stavset senter -> the kindergarten) are driven in the game state machine on the real drawn
// road, and the recorded path of the car is measured: radius, lateral acceleration, the side of the road, the drawn surface.
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),els=new Map();let callbacks=[],now=0,frames=[],currentEdge=()=>null;
const canvasContext=new Proxy({},{get:()=>()=>{}});
const element=id=>{if(!els.has(id))els.set(id,{hidden:false,textContent:'',value:'',style:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},addEventListener(){},getContext(){return canvasContext},showModal(){},close(){}});return els.get(id);};
// Same terrain and drawn road as world.js.
const terrain=data.terrain;
function rawHeight(x,z){const a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/terrain.step)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/terrain.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return (h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
const height=(x,z)=>160+(rawHeight(x,z)-160)*1.45,surface=createRoadSurface(data.roads,height,data),carHeight=(x,z)=>(surface.heightAt(x,z)??height(x,z)+.39)+.08,roadLine=p=>surface.edgeLine(p,.08);
const env={T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},window:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),
 createWorld:()=>({height,rawHeight,carHeight,roadLine,surfaceTop:surface.heightAt,update(dt,pos,tan,vel){frames.push({x:pos.x,y:pos.y,z:pos.z,tx:tan.x,ty:tan.y,tz:tan.z,v:Math.abs(vel),back:vel<0,e:currentEdge()});},resetCamera(){},setTurnArrow(){}})};
const ctx=vm.createContext(env);
const code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={read:gameState,start,choose:id=>choose(id,true),edge:()=>active?{id:active.e.id,plan:!!active.e.roundaboutPlan}:null,choices:()=>choices,lines:()=>drivingLines()};})()`,ctx);
function frame(){now+=45;const q=callbacks.splice(0);q.forEach(cb=>cb(now));}
for(let i=0;i<12;i++){await Promise.resolve();frame();}await init;
currentEdge=()=>env.test.edge();
const DT=.045;

// ---- Driving --------------------------------------------------------------------------------------------------------
// The road that leads to a goal fastest: at every junction the offered road with the shortest way on from where it ends.
const reverse=new Map();for(const e of data.edges){if(!reverse.has(e.to))reverse.set(e.to,[]);reverse.get(e.to).push(e);}
function distancesTo(goal){const d=new Map([[goal,0]]),todo=[goal];while(todo.length){todo.sort((a,b)=>d.get(b)-d.get(a));const n=todo.pop();for(const e of reverse.get(n)||[]){const nd=d.get(n)+e.length;if(nd<(d.get(e.from)??Infinity)){d.set(e.from,nd);todo.push(e.from);}}}return d;}
// Drives from the game's present state until the car stands at `stopAt` (a node) or the trip is finished; returns the frames.
function drive(pick,stopAt){
 frames=[];
 for(let i=0;i<60000;i++){const s=env.test.read();
  if(s.state==='finished'||(stopAt&&s.state==='decision'&&s.currentNode===stopAt))break;
  if(s.state==='decision')env.test.choose(pick(env.test.choices()).id);
  frame();}
 return frames;
}
const trips={};
// Main trip: at every junction the recommended road.
env.test.start();
trips.main=drive(cs=>cs.find(c=>c.id===env.test.read().choices.find(x=>x.recommended)?.id)||cs[0]);
assert.equal(env.test.read().state,'finished','The main trip reaches the kindergarten');
// Stavset detour: to Rema 1000 (rema-parkering), then back to the kindergarten. Restart from the start screen after the reward.
element('again').onclick();if(env.test.read().state==='intro')env.test.start();
let d=distancesTo('rema-parkering');
const there=drive(cs=>cs.reduce((a,c)=>!a||(d.get(c.to)??1e9)+c.length<(d.get(a.to)??1e9)+a.length?c:a,null),'rema-parkering');
assert.equal(env.test.read().currentNode,'rema-parkering','The detour reaches Rema 1000 at Stavset');
d=distancesTo(data.goal);
const back=drive(cs=>cs.reduce((a,c)=>!a||(d.get(c.to)??1e9)+c.length<(d.get(a.to)??1e9)+a.length?c:a,null));
assert.equal(env.test.read().state,'finished','The way back reaches the kindergarten');
trips.detour=[...there,...back];trips.thereFrames=there.length;

// ---- Measuring ------------------------------------------------------------------------------------------------------
// Path radius from three frames 1.5 m apart along the path each way (Menger), lateral acceleration v^2/R.
function measure(F){
 const n=F.length,cum=[0],still=[0];for(let i=1;i<n;i++){cum.push(cum[i-1]+Math.hypot(F[i].x-F[i-1].x,F[i].z-F[i-1].z));still.push(still[i-1]+(F[i].v<.05||F[i].back!==F[i-1].back?1:0));}
 const W=1.5,rows=[];let a=0,b=0;
 for(let i=0;i<n;i++){while(a<i&&cum[i]-cum[a+1]>=W)a++;if(b<i)b=i;while(b<n-1&&cum[b]-cum[i]<W)b++;
  if(cum[i]-cum[a]<W*.8||cum[b]-cum[i]<W*.8||still[b]-still[a]>0){rows.push(null);continue;} // not measured across a stop or a change between forward and backward driving (the cusp of a three-point turn): no lateral acceleration there
  const ax=F[a].x,az=F[a].z,bx=F[i].x,bz=F[i].z,cx=F[b].x,cz=F[b].z,cr=Math.abs((bx-ax)*(cz-az)-(bz-az)*(cx-ax)),l=Math.hypot(bx-ax,bz-az)*Math.hypot(cx-bx,cz-bz)*Math.hypot(cx-ax,cz-az),k=l>1e-12?2*cr/l:0;
  rows.push({R:k>1e-9?1/k:1e9,lat:F[i].v*F[i].v*k,cum:cum[i],i});}
 return {cum,rows};
}
// Bends of the road itself: where the drawn centre line of an edge is tighter than 6 m (measured like the car's path), no car can turn wider than
// the road bends; the car is held to its own limit there (3 m at least) instead of 5 m. tightBends(edge) lists them as [x,z,radius].
const centreLines=new Map();
function tightBends(id){let t=centreLines.get(id);if(t)return t;t=[];const C=roadLine(edgeById.get(id).path),cum=[0];for(let i=1;i<C.length;i++)cum.push(cum[i-1]+Math.hypot(C[i][0]-C[i-1][0],C[i][1]-C[i-1][1]));
 for(let i=0,a=0,b=0;i<C.length;i++){while(cum[i]-cum[a]>1.5)a++;while(b<C.length-1&&cum[b]-cum[i]<1.5)b++;if(cum[i]-cum[a]<1.2||cum[b]-cum[i]<1.2)continue;
  const ax=C[a][0],az=C[a][1],bx=C[i][0],bz=C[i][1],cx=C[b][0],cz=C[b][1],cr=Math.abs((bx-ax)*(cz-az)-(bz-az)*(cx-ax)),l=Math.hypot(bx-ax,bz-az)*Math.hypot(cx-bx,cz-bz)*Math.hypot(cx-ax,cz-az),R=cr>1e-9?l/(2*cr):1e9;if(R<6)t.push([bx,bz,R]);}
 centreLines.set(id,t);return t;}
// Standing starts: the first 30 m of the trip and after the car has been parked at a parking place (the car leaves it from a stop on the node).
function exempt(F,cum,restarts){return i=>restarts.some(r=>cum[i]>=cum[r]&&cum[i]-cum[r]<30);}
const roadOf=new Map();for(const r of data.roads)for(let i=0;i+1<r.p.length;i++){const a=r.p[i]+'',b=r.p[i+1]+'';roadOf.set(a+'|'+b,r);roadOf.set(b+'|'+a,r);}
const edgeById=new Map(data.edges.map(e=>[e.id,e])),driven=new Set();for(const e of data.edges)for(let i=1;i<e.path.length;i++)driven.add(e.path[i-1]+'>'+e.path[i]);
// The side of the road, independently of driving-line.js: two-way roads (the road is driven both ways in the graph) are driven a quarter of the carriageway to the right, except
// single-lane service roads under 4.6 m; one-way roads stay in the middle.
function expectedOffset(e){const mid=Math.floor((e.path.length-1)/2),r=roadOf.get(data.nodes[e.path[mid]]+'|'+data.nodes[e.path[mid+1]]);if(!r||e.roundabout||!driven.has(e.path[mid+1]+'>'+e.path[mid]))return 0;const w=roadWidth(r);return r.type==='service'&&w<4.6?0:w/4;}
function signedOffset(x,z,C){let best=1e9,val=0;for(let i=0;i+1<C.length;i++){const dx=C[i+1][0]-C[i][0],dz=C[i+1][1]-C[i][1],l2=dx*dx+dz*dz||1e-9,t=Math.max(0,Math.min(1,((x-C[i][0])*dx+(z-C[i][1])*dz)/l2)),px=C[i][0]+t*dx,pz=C[i][1]+t*dz,dd=Math.hypot(x-px,z-pz);if(dd<best){best=dd;const l=Math.sqrt(l2);val=(x-px)*(-dz/l)+(z-pz)*(dx/l);}}return val;} // positive: right of the travel direction

// Sharp turns: where the car turns through more than 110 degrees onto another road (an acute junction: the arms leave almost side by side, a hairpin
// of the road network) it turns like a U-turn, no tighter than 3.5 m but not 5. sharpZone(F,cum) marks the first 30 m of the line after such a turn.
function sharpZone(F,cum){const zone=new Uint8Array(F.length),lines=env.test.lines();let prev=null;
 for(let i=0;i<F.length;){const e=F[i].e;let j=i;while(j<F.length&&F[j].e?.id===e?.id&&F[j].e?.plan===e?.plan)j++;
  if(e&&!e.plan&&prev&&!prev.plan&&edgeById.get(prev.id).to===edgeById.get(e.id).from&&lines.connection(edgeById.get(prev.id),edgeById.get(e.id)).phi>1.9)for(let k=i;k<j&&cum[k]-cum[i]<30;k++)zone[k]=1;
  if(e)prev=e;i=j;}
 return zone;}
const summary=[];
for(const [name,F] of [['main trip',trips.main],['detour to Stavset',trips.detour]]){
 const {cum,rows}=measure(F),n=F.length;
 // Restarts: frame 0 and the frame after the stop at rema-parkering (the detour's first leg ends there).
 const restarts=[0];if(name.startsWith('detour'))restarts.push(trips.thereFrames);
 const inStart=exempt(F,cum,restarts),sharp=sharpZone(F,cum);
 let offAt=null,minR=1e9,minAt=null,maxLat=0,latAt=null,jump=0,into=0,off=0,peak=0,sharpR=1e9,startR=1e9;const bends=new Map();
 for(let i=0;i<n;i++){const r=rows[i];peak=Math.max(peak,F[i].v);
  if(r&&F[i].v>.3){if(r.lat>maxLat){maxLat=r.lat;latAt=F[i];}
   if(sharp[i]&&r.R<sharpR)sharpR=r.R;if(inStart(i)&&r.R<startR)startR=r.R;
   if(!inStart(i)&&!sharp[i]){const bend=F[i].e&&!F[i].e.plan?tightBends(F[i].e.id).find(t=>Math.hypot(t[0]-F[i].x,t[1]-F[i].z)<4):null;
    if(bend){const key=Math.round(bend[0]/6)+','+Math.round(bend[1]/6),k=bends.get(key)||bends.set(key,{x:bend[0],z:bend[1],road:1e9,car:1e9}).get(key);k.road=Math.min(k.road,bend[2]);k.car=Math.min(k.car,r.R);}
    else if(r.R<minR){minR=r.R;minAt=F[i];}}}
  if(i){const a=Math.atan2(F[i-1].tx*F[i].tz-F[i-1].tz*F[i].tx,F[i-1].tx*F[i].tx+F[i-1].tz*F[i].tz);jump=Math.max(jump,Math.abs(a));
   const step=Math.hypot(F[i].x-F[i-1].x,F[i].z-F[i-1].z);assert.ok(step<=(Math.max(F[i].v,F[i-1].v)+.4)*DT+.05,`No jump in position (${step.toFixed(2)} m at ${F[i].x.toFixed(0)},${F[i].z.toFixed(0)})`);}
  const top=surface.heightAt(F[i].x,F[i].z);if(top===null){off++;offAt??=`(${F[i].x.toFixed(1)},${F[i].z.toFixed(1)}) on edge ${F[i].e?.id}`;}else into=Math.min(into,F[i].y-top);}
 if(bends.size)console.log(`${name}: ${bends.size} spots where the road's own centre line is tighter than 6 m (car radius there): ${[...bends.values()].map(b=>`(${b.x.toFixed(0)},${b.z.toFixed(0)}) road ${b.road.toFixed(1)} m, car ${b.car.toFixed(1)} m`).join('; ')}`);
 assert.ok(minR>=5,`${name}: path radius ${minR.toFixed(2)} m at (${minAt?.x.toFixed(0)},${minAt?.z.toFixed(0)}), at least 5 m outside the standing starts`);
 assert.ok(sharpR>=3.5,`${name}: through sharp turns (over 110 degrees) the car turns no tighter than 3.5 m (${sharpR.toFixed(2)} m)`);
 assert.ok(startR>=3.5,`${name}: the standing starts (home, and leaving a parking place, often by a U-turn) turn no tighter than 3.5 m (${startR.toFixed(2)} m)`);
 for(const b of bends.values())assert.ok(b.car>=Math.min(3,b.road+.5),`${name}: at (${b.x.toFixed(0)},${b.z.toFixed(0)}) the road itself bends ${b.road.toFixed(1)} m; the car turns no tighter than 3 m or the road plus half a metre (${b.car.toFixed(2)} m)`);
 assert.ok(maxLat<=3,`${name}: lateral acceleration ${maxLat.toFixed(2)} m/s2 at (${latAt?.x.toFixed(0)},${latAt?.z.toFixed(0)}), at most 3`);
 assert.ok(jump<12*Math.PI/180,`${name}: no heading jump (largest ${(jump*57.3).toFixed(1)} degrees in one frame)`);
 assert.equal(off,0,`${name}: the car stays on the drawn road (${off} frames off it, the first at ${offAt})`);
 assert.ok(into>-.05,`${name}: the car is never more than 5 cm into the drawn road (${(-into*100).toFixed(1)} cm)`);
 // The side of the road, mid-way along every road driven (22 m from each end of its line): two-way roads a quarter of the width to the right, others in the middle.
 // Sampled every metre along the road, not every frame: frames crowd where the car is slow (in bends, which a lane may cut), and the car is fast on the straights.
 let visits=0,twoWay=0,centred=0,worst=0,worstAt=null,rightSide=true,wrongSide='';const lanes=new Map();
 for(let i=0;i<n;){const e=F[i].e;let j=i;while(j<n&&(F[j].e?.id===e?.id&&F[j].e?.plan===e?.plan))j++;
  if(e&&!e.plan){const edge=edgeById.get(e.id),len=cum[j-1]-cum[i];
   if(len>50){const C=lanes.get(e.id)||lanes.set(e.id,roadLine(edge.path)).get(e.id),exp=expectedOffset(edge),offs=[];
    let last=-1e9;for(let k=i;k<j;k++)if(cum[k]-cum[i]>=22&&cum[j-1]-cum[k]>=22&&cum[k]-last>=1){last=cum[k];offs.push(signedOffset(F[k].x,F[k].z,C));}
    if(offs.length>=5){visits++;if(exp>0)twoWay++;else centred++;offs.sort((p,q)=>p-q);const med=offs[offs.length>>1];
     if(Math.abs(med-exp)>worst){worst=Math.abs(med-exp);worstAt=`${edge.name} #${edge.id}: ${med.toFixed(2)} m, expected ${exp.toFixed(2)}`;}
     if(exp>0&&med<.2){rightSide=false;wrongSide=`${edge.name} #${edge.id}: ${med.toFixed(2)} m`;}}}}
  i=j;}
 assert.ok(twoWay>=8&&centred>=1,`${name}: enough roads measured for the side of the road (${twoWay} two-way, ${centred} centred)`);
 assert.ok(worst<=.9,`${name}: side of the road, median offset within 0.9 m of a quarter width on every two-way road and of the middle elsewhere: a lane may cut bends by up to 0.8 m (worst ${worstAt})`);
 assert.ok(rightSide,`${name}: every two-way road is driven on the right of its centre line (${wrongSide})`);
 summary.push(`${name}: ${(n*DT).toFixed(0)} s, min radius ${minR.toFixed(1)} m (${sharpR<1e9?`sharp turns ${sharpR.toFixed(1)} m, `:''}${startR<1e9?`standing starts ${startR.toFixed(1)} m, `:''}${bends.size?`${bends.size} of the road's own tight bends, tightest car ${Math.min(...[...bends.values()].map(b=>b.car)).toFixed(1)} m`:''}), ${(cum[n-1]).toFixed(0)} m, average ${(cum[n-1]/(n*DT)*3.6).toFixed(0)} km/h, peak ${(peak*3.6).toFixed(0)} km/h; min radius ${minR.toFixed(1)} m, max lateral acceleration ${maxLat.toFixed(2)} m/s2, ${visits} roads checked for their side (${twoWay} two-way, worst ${worst.toFixed(2)} m off)`);
}
console.log(summary.join('\n'));

// ---- Every junction of the map ---------------------------------------------------------------------------------------
// The lines join up: the line of road b after road a starts where the line of a (after any road) ends, in the same direction, and every line is finite.
const lines=env.test.lines(),adjacency=new Map();for(const e of data.edges){if(!adjacency.has(e.from))adjacency.set(e.from,[]);adjacency.get(e.from).push(e);}
let pairs=0,sharp=0,u=0,checked=0;const p=new T.Vector3(),q=new T.Vector3(),t1=new T.Vector3(),t2=new T.Vector3();
for(const a of data.edges){const outs=adjacency.get(a.to)||[],ins=reverse.get(a.from)||[];
 for(const b of outs){const L=lines.line(a,b);pairs++;assert.ok(L.len>0&&Number.isFinite(L.len)&&L.cap.every(Number.isFinite),`Line ${a.id}>${b.id} is finite`);
  const c=lines.connection(a,b);if(c.uturn)u++;else if(c.rmin<5)sharp++;
  const before=ins.find(x=>x.to===a.from);if(!before||checked>400)continue;checked++;
  const P=lines.line(before,a);P.at(P.len,p);L.at(0,q);P.tangent(P.len,t1);L.tangent(0,t2);
  assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<.02&&Math.abs(p.y-q.y)<.05,`Line ${before.id}>${a.id} ends where ${a.id}>${b.id} starts`);
  assert.ok(t1.x*t2.x+t1.z*t2.z>.9,`... in the same direction, within the error of a half-metre chord where the lane itself turns sharply (${a.id}>${b.id})`);}}
console.log(`Junctions: ${pairs} road pairs have finite lines (${checked} checked for continuity); ${u} U-turns, ${sharp} other turns tighter than 5 m where the roads are short or meet sharply (the trips' turns are all 5 m or more)`);
console.log(`Speed limit: sqrt(${A_LAT} m/s2 x radius) along every line, braking ahead of it; the tests above: OK`);
