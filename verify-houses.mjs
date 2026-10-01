import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './dist/vendor/three.js';
import {addBuildingRoof,offsetPolygon} from './dist/building-roofs.js';
import {createHouses} from './dist/houses.js';
import {kindOf,lookFor,normHex,rng,seedOf,typeClass,WALLS,ROOFS} from './dist/house-looks.js';
import {buildingStyles} from './dist/building-details.js';
import {createJunctionBuildings} from './dist/junction-buildings.js';
import {junctionObservations} from './dist/junction-observations.js';
// Houses, 30 September 2026: seeded looks, eaves overhang, the house builder on the real map, the added buildings and their sources,
// and the junction audit table.
const data=JSON.parse(fs.readFileSync('dist/map.json'));

// ---- seeded colours: the same building always gets the same look, and the palettes are used ----
{
 const a=lookFor({id:'187113248',t:{building:'house'},style:{},kind:'house',area:120}),b=lookFor({id:'187113248',t:{building:'house'},style:{},kind:'house',area:120});
 assert.deepEqual(a,b,'a look is seeded by the OSM id');
 assert.notDeepEqual(a,lookFor({id:'187113249',t:{building:'house'},style:{},kind:'house',area:120}),'neighbours differ');
 const r1=rng(seedOf('42')),r2=rng(seedOf('42'));assert.equal(r1(),r2());
 assert.equal(normHex('#abc'),'#aabbcc');assert.equal(normHex('red'),'#9a3f30');assert.equal(normHex('nonsense'),null);
 // a photo-matched or tagged colour is kept
 assert.equal(lookFor({id:'1',t:{building:'house','building:colour':'#112233'},style:{},kind:'house',area:100}).wall,'#112233');
 assert.equal(lookFor({id:'1',t:{building:'house'},style:{wall:'#445566',roof:'#778899',door:'#aa0000'},kind:'house',area:100}).roof,'#778899');
 // a garage next to a house is painted like it
 const house=lookFor({id:'9',t:{building:'house'},style:{},kind:'house',area:150}),garage=lookFor({id:'10',t:{building:'garage'},style:{},kind:'garage',area:30,neighbour:house});
 assert.equal(garage.wall,house.wall);assert.equal(garage.roof,house.roof);
 // register kinds win over OSM
 assert.equal(kindOf({building:'house'},120,false,[131,4]),'terrace');assert.equal(kindOf({building:'yes'},60,false,[181,1]),'garage');
 assert.equal(kindOf({building:'garage'},80,true,[111,1]),'house');assert.equal(kindOf({building:'apartments'},400,false,null),'block');assert.equal(kindOf({building:'house'},120,false,[112,2]),'house');
 assert.equal(typeClass(121),'semi');assert.equal(typeClass(142),'block');assert.equal(typeClass(181),'garage');
}

// ---- eaves: the offset outline, and a roof that sticks out and still seals the footprint ----
{
 const rect=[[-8,-4],[8,-4],[8,4],[-8,4]],area=p=>Math.abs(p.reduce((s,a,i)=>{const c=p[(i+1)%p.length];return s+a[0]*c[1]-c[0]*a[1];},0)/2);
 const o=offsetPolygon(rect,[.5,.5,.5,.5]);assert.ok(Math.abs(area(o)-17*9)<1e-6,'a rectangle grows by the overhang on every side');
 const L=[[-8,-4],[8,-4],[8,0],[0,0],[0,4],[-8,4]];assert.ok(offsetPolygon(L,L.map(()=>.5)),'an L-shape keeps its shape');
 assert.equal(offsetPolygon([[0,0],[2,0],[2,1]],[3,3,3]),null,'no offset when it would not stay a clean, similar outline');
 for(const shape of ['gabled','hipped','skillion','flat'])for(const p of [rect,L]){
  const tris=[],tri=(b,a,c,d)=>tris.push([a,c,d]),quads=[],quad=(b,...q)=>quads.push(q);
  const top=addBuildingRoof({T,p,cx:0,cz:0,y:100,h:6,style:{roofShape:shape,roofRise:3},t:{},area:area(p),b:{},tri,quad,colour:'#fff',roofcolour:'#555',overhang:.5,fascia:'#eee'});
  const roofArea=tris.reduce((s,[a,b,c])=>s+Math.abs((b[0]-a[0])*(c[2]-a[2])-(c[0]-a[0])*(b[2]-a[2]))/2,0);
  assert.ok(roofArea>area(p)*1.05&&roofArea<area(p)*1.6,shape+' roof is larger than the footprint by the overhang ('+roofArea.toFixed(1)+' of '+area(p)+')');
  for(const t of tris)for(const v of t){assert.ok(v.every(Number.isFinite));assert.ok(v[1]>=105.3&&v[1]<=109.2,shape+' height '+v[1]);}
  assert.ok(Math.min(...tris.flat().map(v=>v[1]))<106.06,'eaves lie at or below the wall top');
  assert.ok(quads.length>=p.length,'fascia boards on every edge');
  assert.equal(top.shape,shape);
  if(shape==='gabled'&&p===rect){assert.ok(top.ridge&&Math.abs(top.ridge.y-109)<1e-6&&Math.hypot(top.ridge.b[0]-top.ridge.a[0],top.ridge.b[1]-top.ridge.a[1])>15,'ridge line');}
  if(shape==='skillion'||shape==='flat')assert.equal(top.ridge,null);
 }
}

// ---- the builder on the real map, with the buckets of world.js ----
globalThis.document=globalThis.document||{createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}}),width:0,height:0})};
const colourCache=new Map();const col=c=>{if(!colourCache.has(c))colourCache.set(c,new T.Color(c));return colourCache.get(c);};
function build(){
 const buckets=new Map();
 const bucket=(x,z)=>{const k=Math.floor(x/160)*4096+Math.floor(z/160);let b=buckets.get(k);if(!b){b={p:new Float32Array(2304),c:new Float32Array(2304),n:0};buckets.set(k,b);}return b;};
 const tri=(b,a,c,d,colour)=>{let n=b.n;if(n+9>b.p.length){const p=new Float32Array(b.p.length*2),q=new Float32Array(b.p.length*2);p.set(b.p);q.set(b.c);b.p=p;b.c=q;}const q=col(colour);b.p.set([...a,...c,...d],n);for(let i=n;i<n+9;i+=3){b.c[i]=q.r;b.c[i+1]=q.g;b.c[i+2]=q.b;}b.n=n+9;};
 const quad=(b,a,c,d,e,colour)=>{tri(b,a,c,d,colour);tri(b,a,d,e,colour);};
 const box=(b,cx,cy,cz,wx,wy,wz,colour,angle=0)=>{const pts=[];for(const y of [-.5,.5])for(const z of [-.5,.5])for(const x of [-.5,.5])pts.push([cx+x*wx*Math.cos(angle)+z*wz*Math.sin(angle),cy+y*wy,cz-x*wx*Math.sin(angle)+z*wz*Math.cos(angle)]);for(const f of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])quad(b,...f.map(i=>pts[i]),colour);};
 const height=(x,z)=>100+x*.02+Math.sin(z/40)*3,scene={add(){}},footprints=[];
 const houses=createHouses({T,scene,data,height,bucket,tri,quad,box,groundPoly:p=>footprints.push(p),junctionBuildings:createJunctionBuildings(data),buildingStyles});
 const wallBase=new Map(),houseBounds=[];let drawn=0;
 for(const building of data.buildings){const p=building.p.slice(0,-1);if(p.length<3)continue;
  const cx=p.reduce((a,b)=>a+b[0],0)/p.length,cz=p.reduce((a,b)=>a+b[1],0)/p.length;let area=0;for(let i=0;i<p.length;i++)area+=p[i][0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*p[i][1];area=Math.abs(area/2);if(area<4)continue;
  if(building.t.building==='roof')continue;
  houses.add({building,p,cx,cz,area,wallBase,houseBounds});drawn++;}
 let triangles=0,sum=0;for(const b of buckets.values()){triangles+=b.n/9;for(let i=0;i<b.n;i++){assert.ok(Number.isFinite(b.p[i]),'finite vertex');sum+=b.p[i]*((i%7)+1);}}
 return {houses,triangles,sum,drawn,wallBase,buckets};
}
const t0=Date.now(),first=build(),ms=Date.now()-t0,second=build();
assert.equal(first.triangles,second.triangles,'same triangles on every run');assert.equal(first.sum,second.sum,'same vertices on every run');
const s=first.houses.stats;
// the budget: houses were 997 571 triangles; the whole world may grow by 15 % (1 859 907 -> 2 138 893), all of it here
assert.ok(first.triangles<1330000,'house triangles '+first.triangles);
assert.ok(first.triangles/first.drawn<260,'triangles per building '+first.triangles/first.drawn);
assert.ok(s.doors>.8*s.buildings*.85,'most buildings have a door: '+s.doors+' / '+s.buildings);
assert.ok(s.windows>60000&&s.chimneys>1000&&s.verandas>100&&s.balconies>100&&s.seams>5000,JSON.stringify({w:s.windows,c:s.chimneys,v:s.verandas,b:s.balconies,s:s.seams}));
assert.ok(s.lod[2]>3000&&s.lod[0]>100,'detail levels follow the drivable network '+s.lod);
assert.equal(first.wallBase.size,first.drawn,'wallBase for every building (other modules read it)');
// the palettes: every colour family is used, nothing outside them
{
 const walls=new Map(),roofs=new Map();
 for(const b of data.buildings){const t=b.t,area=100;if(buildingStyles[b.id]||junctionObservations[b.id]||t['building:colour'])continue;
  const kind=kindOf(t,area,false,b.mk),l=lookFor({id:b.id,t,style:{},kind,area});walls.set(l.wall,(walls.get(l.wall)||0)+1);roofs.set(l.roof,(roofs.get(l.roof)||0)+1);}
 assert.ok(walls.size>25&&roofs.size>12,'colours in use '+walls.size+' '+roofs.size);
 for(const c of [...walls.keys(),...roofs.keys()])assert.match(c,/^#[0-9a-f]{6}$/);
 const lum=h=>(parseInt(h.slice(1,3),16)*.299+parseInt(h.slice(3,5),16)*.587+parseInt(h.slice(5,7),16)*.114)/255;
 let total=0,white=0,dark=0,red=0,yellow=0;for(const [c,n] of walls){total+=n;const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);if(lum(c)>.82)white+=n;else if(lum(c)<.3)dark+=n;if(r>g*1.35&&r>b*1.5&&lum(c)<.5)red+=n;if(r>b*1.5&&g>b*1.3&&lum(c)>.6)yellow+=n;}
 for(const [name,n] of Object.entries({white,dark,red,yellow}))assert.ok(n/total>.05,name+' houses are '+(100*n/total).toFixed(1)+' %');
 let greyish=0;for(const [c,n] of walls)if(Math.max(...[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)))-Math.min(...[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)))<18)greyish+=n;
 assert.ok(greyish/total<.55,'not just greys: '+(100*greyish/total).toFixed(0)+' % are');
}

// ---- added buildings and their sources ----
const extra=JSON.parse(fs.readFileSync('data/osm-extra-buildings.json')),additions=JSON.parse(fs.readFileSync('data/building-additions.json'));
assert.match(extra.source,/OpenStreetMap contributors, ODbL/);assert.match(additions.source,/Matrikkelen/);
const byId=new Map(data.buildings.map(b=>[b.id,b]));
const osmAdded=data.buildings.filter(b=>b.add==='osm'),mkAdded=data.buildings.filter(b=>b.add==='matrikkel');
assert.ok(osmAdded.length>=400,'OSM footprints added: '+osmAdded.length);assert.equal(mkAdded.length,additions.buildings.length,'every recorded addition is in the map');
for(const b of osmAdded)assert.ok(extra.buildings.some(e=>e.id===b.id),'documented OSM footprint '+b.id);
const ids=new Set(data.buildings.map(b=>b.id));assert.equal(ids.size,data.buildings.length,'building ids are unique');
const area=p=>Math.abs(p.reduce((s,a,i)=>{const c=p[(i+1)%p.length];return s+a[0]*c[1]-c[0]*a[1];},0)/2);
const inside=(p,x,z)=>{let i=false;for(let a=0,b=p.length-1;a<p.length;b=a++){const [ax,az]=p[b],[bx,bz]=p[a];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)i=!i;}return i;};
const crosses=(a,b,c,d)=>{const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0;};
const overlaps=(p,q)=>p.slice(0,-1).some(v=>inside(q,...v))||q.slice(0,-1).some(v=>inside(p,...v))||p.slice(0,-1).some((v,i)=>q.slice(0,-1).some((w,j)=>crosses(v,p[i+1],w,q[j+1])));
const roadSegments=data.roads.flatMap(r=>r.p.slice(1).map((p,i)=>[r.p[i],p,r.width??(r.type==='service'?3.5:r.type==='residential'?5.2:6.5)]));
const segDist=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);};
for(const a of additions.buildings){
 assert.ok(a.ref&&a.type&&a.status&&a.note&&['house','garage','semidetached_house','apartments','yes'].includes(a.building),'recorded: '+a.ref);
 const b=byId.get('m'+a.ref);assert.ok(b&&b.ref===a.ref&&b.mk[0]===a.type,'in the map: '+a.ref);
 assert.ok(area(b.p)>8&&area(b.p)<900,'plausible size '+a.ref+' '+area(b.p));
 const cx=b.p.slice(0,-1).reduce((s,v)=>s+v[0],0)/(b.p.length-1),cz=b.p.slice(0,-1).reduce((s,v)=>s+v[1],0)/(b.p.length-1);
 for(const o of data.buildings)if(o!==b&&Math.abs(o.p[0][0]-cx)<80&&Math.abs(o.p[0][1]-cz)<80)assert.ok(!overlaps(b.p,o.p),a.ref+' overlaps '+o.id);
 for(const [r0,r1,w] of roadSegments)if(Math.abs(r0[0]-cx)<80&&Math.abs(r0[1]-cz)<80)for(const v of b.p)assert.ok(segDist(v[0],v[1],r0,r1)>w/2,a.ref+' stands on a road');
}
// register notes are well formed
for(const b of data.buildings)if(b.mk)assert.ok(Array.isArray(b.mk)&&b.mk.length===2&&b.mk[0]>=100&&b.mk[0]<1000&&b.mk[1]>=1,'mk of '+b.id);
// the style records: every one has a source, the by-eye ones name a building of the map
for(const [id,st] of Object.entries(buildingStyles)){assert.ok(st.source,'source of style '+id);if(st.source==='aerial-esri-2026-09-30'){assert.ok(byId.has(id),'by-eye record '+id);assert.match(st.roof,/^#[0-9a-f]{6}$/);}}
const eye=Object.values(buildingStyles).filter(s=>s.source==='aerial-esri-2026-09-30').length;assert.ok(eye>=100,'roofs judged by eye: '+eye);

// ---- the junction audit table has a row for every junction ----
const junctions=createJunctionBuildings(data).nodes,table=fs.readFileSync('docs/junction-buildings.md','utf8');
for(const n of junctions)assert.ok(table.includes('| '+n.id+' |'),'audit row for junction '+n.id);
assert.ok(/hovedtur/.test(table)&&/Stavset/.test(table),'main trip and Stavset junctions are marked');
console.log(`Houses: ${first.drawn} buildings, ${first.triangles} triangles (${(first.triangles/first.drawn).toFixed(0)} each; ${ms} ms in Node), ${s.doors} doors, ${s.windows} windows, ${s.chimneys} chimneys, ${s.verandas} verandas, ${s.balconies} balconies; ${osmAdded.length} OSM and ${mkAdded.length} register buildings added; ${eye} roofs by eye; ${junctions.length} junction rows: OK`);
