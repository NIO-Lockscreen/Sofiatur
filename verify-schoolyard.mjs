import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {createRoadSurface} from './dist/road-surface.js';
import {createSchoolyard,LOOK} from './dist/schoolyard.js';
import {addRoadside} from './dist/roadside.js';
import {streetSegments,segmentIndex,projectPoint} from './dist/transit-geometry.js';
import {KERB_BAND} from './dist/street-details.js';

// Schoolyard (add-schoolyard.py -> data.schoolyard, drawn by dist/schoolyard.js): the grounds of Dalgård skole. The asphalt yard, playgrounds with their equipment,
// the handball court, the statue and the road signs stand where the data puts them: on the ground, never on a carriageway, never in a building, and the
// roadside leaves out what is drawn here instead. NVDB speed humps are in data.street.tables. The budget is a third of the Dalgård project's.
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}}),width:0,height:0})};
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),Y=data.schoolyard,terrain=data.terrain;
assert.ok(Y,'dist/map.json has schoolyard data (run add-schoolyard.py after add-roadside.py)');
function rawHeight(x,z){const a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/terrain.step)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/terrain.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return (h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
const terrainHeight=(x,z)=>160+(rawHeight(x,z)-160)*1.45,surface=createRoadSurface(data.roads,terrainHeight,data),height=(x,z)=>terrainHeight(x,z)+surface.lowerAt(x,z);
const segments=surface.geometry.roadSegments(),roadIndex=segmentIndex(segments),onSurface=(x,z)=>surface.heightAt(x,z)!==null;
const inRing=(ring,x,z)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
const buildings=data.buildings.filter(b=>b.p.length>3);
const inBuilding=(x,z)=>buildings.some(b=>inRing(b.p,x,z)&&!(b.holes||[]).some(h=>inRing(h,x,z)));
const gapTo=(x,z)=>{let best=Infinity;for(const [a,b,w] of roadIndex.near(x,z,30))best=Math.min(best,projectPoint([x,z],a,b).distance-w/2-KERB_BAND);return best;}; // metres to the kerb band of the nearest road (negative: on it)
const keys=['site','kinder','paved','surfaces','equipment','objects','courts','signs'];for(const k of keys)assert.ok(Y[k]!==undefined,`schoolyard.${k}`);
assert.ok(JSON.stringify(Y).length<60000,`The schoolyard data stays compact (${JSON.stringify(Y).length} bytes)`);

// --- The data: grounds, yard, equipment ---------------------------------------------------------------------------------------------------------------
const school=buildings.filter(b=>['r1318241','r20722521','r20516148'].includes(String(b.id)));
assert.equal(school.length,3,'the three school buildings');
assert.ok(school.every(b=>b.p.some(q=>inRing(Y.site,q[0],q[1])||Math.hypot(q[0]-700,q[1]-460)<90)),'The school buildings stand on the grounds');
const area=r=>Math.abs(r.reduce((s,p,i)=>s+p[0]*r[(i+1)%r.length][1]-r[(i+1)%r.length][0]*p[1],0)/2);
const pavedArea=Y.paved.reduce((s,g)=>s+area(g.p)-g.h.reduce((t,h)=>t+area(h),0),0);
assert.ok(area(Y.site)>25000&&area(Y.site)<40000,`The school grounds are ${area(Y.site).toFixed(0)} m2 (OSM relation 6579902)`);
assert.ok(pavedArea>11000&&pavedArea<20000,`Asphalt yard ${pavedArea.toFixed(0)} m2`);
const ball=Y.courts.ball,grass=Y.courts.grass;
assert.ok(ball&&Math.abs(ball.l-44)<3&&Math.abs(ball.w-22)<3,`The ball court is a 40 x 20 m handball court with a margin (${ball.l} x ${ball.w} m)`);
assert.ok(inRing(Y.site,...ball.c),'The court is on the school grounds');
assert.ok(grass&&grass.l>15&&grass.l<30,'Trondsløkka is a small pitch');
const kinds={};for(const e of Y.equipment)kinds[e.k]=(kinds[e.k]||0)+1;
const least={swing:7,slide:2,climbingframe:5,balancebeam:4,sandpit:4,playhouse:3,seesaw:1,tunnel_tube:1,structure:2};
for(const [k,n] of Object.entries(least))assert.ok(kinds[k]>=n,`equipment ${k}: ${kinds[k]} (at least ${n})`);
for(const e of Y.equipment){const [x,z]=e.p;
 assert.ok(inRing(Y.site,x,z)||inRing(Y.kinder,x,z),`${e.k} ${e.o} lies on the school or kindergarten grounds`);
 assert.ok(!inBuilding(x,z),`${e.k} ${e.o} is not inside a building`);
 assert.ok(gapTo(x,z)>1.2,`${e.k} ${e.o} stands off the carriageway (${gapTo(x,z).toFixed(1)} m)`);}
// every drawn object stands beside the roads, outside buildings; the picnic tables and the bicycle rack in the courtyard stand inside the footprint's inner ring
for(const o of Y.objects){if(o.k==='bleachers'){assert.ok(o.p.every(q=>gapTo(...q)>.5&&!inBuilding(...q)),`bleachers ${o.o} stand clear`);continue;}
 const [x,z]=o.p;assert.ok(gapTo(x,z)>.5,`${o.k} ${o.o} is off the carriageway`);if(o.k==='picnic'||o.k==='bikes'){assert.ok(school[0].holes.some(h=>inRing(h,x,z)),`${o.k} in A-bygget's courtyard`);}else assert.ok(!inBuilding(x,z),`${o.k} ${o.o} is not inside a building`);}
const objectKinds=new Set(Y.objects.map(o=>o.k));for(const k of ['statue','stone','board','picnic','bikes','bleachers'])assert.ok(objectKinds.has(k),`object ${k}`);
const statue=Y.objects.find(o=>o.k==='statue');assert.ok(Math.hypot(statue.p[0]-679.2,statue.p[1]-395.4)<1,'The statue is at its OSM place by the north-west car park');
// the asphalt: clear of every carriageway and kerb band, outside buildings, on the grounds, with the lawns left out
for(const g of Y.paved){assert.ok(g.p.every(q=>inRing(Y.site,...q)||Math.abs(gapTo(...q))<30),'yard vertices are on the grounds');
 for(const q of g.p)assert.ok(gapTo(...q)>.05,`yard vertex (${q[0]},${q[1]}) is off the kerb band (${gapTo(...q).toFixed(2)} m)`);}
let sampled=0,onRoad=0,inHouse=0;
for(const g of Y.paved){const xs=g.p.map(q=>q[0]),zs=g.p.map(q=>q[1]);for(let x=Math.min(...xs);x<=Math.max(...xs);x+=3)for(let z=Math.min(...zs);z<=Math.max(...zs);z+=3){if(!inRing(g.p,x,z)||g.h.some(h=>inRing(h,x,z)))continue;sampled++;if(gapTo(x,z)<.05)onRoad++;if(inBuilding(x,z))inHouse++;}}
assert.ok(sampled>1000&&onRoad===0&&inHouse===0,`${sampled} sample points of the yard: ${onRoad} on a carriageway, ${inHouse} in a building`);

// --- Signs and speed humps ----------------------------------------------------------------------------------------------------------------------------
const plates=Y.signs.reduce((n,s)=>n+s.pl.length,0),types=new Set(Y.signs.flatMap(s=>s.pl.map(p=>p.t)));
assert.ok(Y.signs.length>=30&&plates>=38,`NVDB signs: ${plates} plates on ${Y.signs.length} poles`);
for(const t of ['142','808.161','372','552','302','366']){assert.ok(types.has(t),`sign ${t} is there`);}
const school142=Y.signs.find(s=>s.pl.some(p=>p.t==='808.161'));assert.equal(school142.pl.find(p=>p.t==='808.161').x,'Dalgård skole','The school sign names Dalgård skole');
assert.ok(school142.pl.some(p=>p.t==='142'),'Barn and Skole on one pole');
for(const s of Y.signs){const [x,z]=s.p;let by=false,close=false;for(const [a,b] of roadIndex.near(x,z,14)){const q=projectPoint([x,z],a,b);if(q.distance>14)continue;close=true;const l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;if(Math.abs((s.n[0]*(b[0]-a[0])+s.n[1]*(b[1]-a[1]))/l)>.9)by=true;}
 assert.ok(close,`sign ${s.o} stands by a road`);assert.ok(by,`sign ${s.o} faces along a road, into the traffic it is for`);}
const humps=data.street.tables.filter(t=>String(t.o).startsWith('nvdb103:'));
assert.ok(humps.length>=12&&humps.some(t=>t.k==='hump')&&humps.some(t=>t.k==='table'),`NVDB speed humps and raised junction areas in data.street.tables (${humps.length})`);
for(const h of humps){const road=data.roads.find(r=>String(r.id)===h.r);assert.ok(road,`hump ${h.o} is on a drawn road`);
 let best=1e9;for(let i=0;i<road.p.length-1;i++)best=Math.min(best,projectPoint(h.p,road.p[i],road.p[i+1]).distance);assert.ok(best<6,`hump ${h.o} lies on road ${h.r} (${best.toFixed(1)} m)`);assert.ok(Math.abs(Math.hypot(...h.d)-1)<.01,'direction is a unit vector');}

// --- Draw it with stand-ins and count ----------------------------------------------------------------------------------------------------------------
let verts=[],tris=0,quads=0,boxes=0,ribbons=[];const scene=new T.Scene();
const bucket=()=>({}),tri=(b,...v)=>{tris++;verts.push(...v.slice(0,3));},quad=(b,...v)=>{quads++;verts.push(...v.slice(0,4));},box=(b,x,y,z,wx,wy,wz)=>{boxes++;verts.push([x-wx/2,y-wy/2,z-wz/2],[x+wx/2,y+wy/2,z+wz/2]);},ribbon=(p,w,c,lift)=>ribbons.push({p,w,c,lift});
const started=performance.now(),yard=createSchoolyard({T,scene,data,ground:surface.groundTop,bucket,tri,quad,box,ribbon,segments,onSurface}),ms=performance.now()-started;
assert.ok(yard.triangles>5000,`The schoolyard is drawn (${yard.triangles} triangles)`);
assert.ok(yard.triangles<=30000,`Budget: at most 30000 triangles (${yard.triangles}); the Dalgård project may add 3 % to 2.5 M, a third of it here`);
assert.ok(ms<250,`Build time ${ms.toFixed(0)} ms (a third of 5 % of a 4.4 s world build is about 75 ms; a verify run without the GPU is slower than the game)`);
// standing on the ground: nothing is sunk more than 0.35 m (a pole's foot corner on a sloping verge, since the ground beside the roads
// is raised towards them, 2 October 2026), and what lies on the ground lies 4-20 cm above it
let low=0;for(const v of verts){if(!Array.isArray(v)||v.length<3)continue;const g=surface.groundTop(v[0],v[2]);if(v[1]<g-.35)low++;}
assert.equal(low,0,'Nothing is sunk into the ground');
const asphaltTop=verts.filter(v=>Array.isArray(v)&&v.length===3&&Math.abs(v[1]-surface.groundTop(v[0],v[2])-.07)<.002);assert.ok(asphaltTop.length>1500,`The asphalt lies 7 cm over the ground (${asphaltTop.length} corners)`);
const counts=yard.counts;for(const [k,n] of Object.entries({paved:Y.paved.length,surface:Y.surfaces.length,statue:1,stone:1,board:1,picnic:3,bikes:1,bleachers:2,court:1,goal:4}))assert.equal(counts[k],n,`drawn ${k}`);
assert.ok(counts.lot>=3&&counts.pocket===5&&counts.car>=8,`Car parks: ${counts.lot} with bay lines, ${counts.pocket} drop-off pockets, ${counts.car} cars`);
assert.equal(counts.pole,Y.signs.length,'a pole for every sign position');assert.ok(counts.sign>=38,`${counts.sign} sign plates`);
for(const k of Object.keys(least))assert.equal(counts[k],Y.equipment.filter(e=>e.k===k).length,`every ${k} is drawn`);
assert.ok(ribbons.some(r=>r.c===LOOK.line&&r.w===.1),'Court lines are drawn');
const sc=[];scene.traverse(o=>{if(o.name)sc.push(o.name);});assert.ok(sc.some(n=>/SKOLE/.test(n)),'The Skole plate is a sign mesh in the scene');

// --- Roadside leaves out what is drawn here --------------------------------------------------------------------------------------------------------
const obstacles=new Map(),indexAt=(x,z,val)=>{const k=Math.floor(x/40)+','+Math.floor(z/40);if(!obstacles.has(k))obstacles.set(k,[]);obstacles.get(k).push(val);};
const run=(skip)=>{const out=addRoadside({T,scene:new T.Scene(),data,height,ground:surface.groundTop,roadTop:(x,z)=>surface.heightAt(x,z)??height(x,z)+.39,onSurface,bucket,tri:()=>{},quad:()=>{},box:()=>{},segments,index:indexAt,clear:()=>true,lakeAt:()=>false,density:.05,skip});return out;};
const before=run(),after=run(yard.owns);
const playIn=o=>o.furniture.filter(f=>f.k==='play'&&(inRing(Y.site,...f.p)||inRing(Y.kinder,...f.p))).length;
assert.ok(playIn(before)>=1&&playIn(after)===0,`Generic playground equipment inside the grounds: ${playIn(before)} before, ${playIn(after)} after`);
const wayIn=o=>o.ways.filter(w=>w.p.some(q=>yard.inPaved(...q))).length;
assert.ok(wayIn(before)>wayIn(after),`Footpath ribbons inside the asphalt: ${wayIn(before)} before, ${wayIn(after)} after`);
assert.ok(after.furniture.length<before.furniture.length&&after.counts.play<=before.counts.play,'Roadside draws less where the schoolyard draws');
assert.ok(yard.owns(...ball.c,'way')&&yard.owns(...Y.equipment[0].p,'play')&&!yard.owns(600,300,'play')&&!yard.owns(...Y.equipment[0].p,'tree'),'owns() answers by kind and place');
console.log(`Schoolyard: asphalt ${pavedArea.toFixed(0)} m2 in ${Y.paved.length} parts, ${Y.surfaces.length} playground surfaces, ${Y.equipment.length} pieces of equipment (${Object.entries(kinds).map(([k,n])=>k+' '+n).join(', ')}), handball court with goals, statue, board, ${plates} NVDB sign plates on ${Y.signs.length} poles, ${humps.length} humps: ${yard.triangles} triangles in ${ms.toFixed(0)} ms (${JSON.stringify(yard.parts)}, ms ${JSON.stringify(yard.ms)}): OK`);
