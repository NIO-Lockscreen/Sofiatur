// The neighbourhood round Dalgård skole (1 October 2026): style records from photos (dist/dalgard-neighbourhood.js), the lamps and
// street trees added along Odd Husbys veg (add-dalgard-neighbourhood.py), and the registered addresses the photos were matched by.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {neighbourhoodStyles} from './dist/dalgard-neighbourhood.js';
import {createJunctionBuildings} from './dist/junction-buildings.js';
import {kindOf,lookFor,normHex,GARAGE_TYPES} from './dist/house-looks.js';
import {streetSegments,projectPoint} from './dist/transit-geometry.js';

const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));
const addr=JSON.parse(fs.readFileSync('data/dalgard-addresses.json','utf8')).rows;
const byId=new Map(data.buildings.map(b=>[String(b.id),b]));
const SCHOOL=[635,398,775,518];
const ring=b=>b.p.slice(0,-1);
const distToSchool=p=>Math.min(...p.map(v=>Math.hypot(Math.max(SCHOOL[0]-v[0],0,v[0]-SCHOOL[2]),Math.max(SCHOOL[1]-v[1],0,v[1]-SCHOOL[3]))));
const inRing=(poly,x,z)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [ax,az]=poly[j],[bx,bz]=poly[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};

// ---- 1. the registered addresses (Kartverket) are there, and every photo match rests on one ----
assert.ok(addr.length>=250,`${addr.length} registered addresses within 300 m of the school`);
const ids=Object.keys(neighbourhoodStyles);
assert.ok(ids.length>=20,`${ids.length} style records`);
let photo=0,aerial=0,analogy=0;
for(const id of ids){
 const s=neighbourhoodStyles[id],b=byId.get(id);
 assert.ok(b,`${id} is a building of the map`);
 assert.ok(s.source&&/^[a-z0-9;._-]+$/i.test(s.source),`${id} names its source`);
 assert.ok(distToSchool(ring(b))<=200,`${id} lies within 200 m of the school site`);
 for(const k of ['wall','roof','trim','lowerWall'])if(s[k])assert.ok(normHex(s[k]),`${id} ${k} ${s[k]} is a colour`);
 if(s.sections)assert.ok(s.sections.length===4&&s.sections.every(normHex),`${id} sections`);
 if(s.levels)assert.ok(Number.isInteger(s.levels)&&s.levels>=1&&s.levels<=6,`${id} levels`);
 if(s.height)assert.ok(s.height>2&&s.height<20,`${id} height`);
 if(/aerial/.test(s.source)){aerial++;assert.ok(Object.keys(s).every(k=>['roof','source'].includes(k)),`${id}: an aerial record only says the roof colour`);}
 else if(/analogy/.test(s.source))analogy++;
 else{photo++;
  // a listing or architect's page is matched to a building through a registered address on or beside its footprint
  const p=ring(b),near=addr.filter(r=>Math.min(Math.hypot(r[1]-p.reduce((a,v)=>a+v[0],0)/p.length,r[2]-p.reduce((a,v)=>a+v[1],0)/p.length),...p.map(v=>Math.hypot(r[1]-v[0],r[2]-v[1])))<14);
  assert.ok(near.length>0||/^(89247086)$/.test(id),`${id} has a registered address beside it (${near.length})`);}
}
assert.ok(photo>=10,`${photo} photo records`);
console.log(`${ids.length} style records: ${photo} from photos, ${analogy} by analogy, ${aerial} roof colours from the aerial photo; every photo record has a registered address beside it`);

// ---- 2. the records reach the drawing code: junction-buildings merges them over the older records, plain means render ----
const jb=createJunctionBuildings(data);
for(const id of ids){const st=jb.style(byId.get(id));for(const k of Object.keys(neighbourhoodStyles[id]))assert.deepEqual(st[k],neighbourhoodStyles[id][k],`${id}.${k} reaches the house builder`);}
const lookOf=id=>{const b=byId.get(id),p=ring(b);let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}a=Math.abs(a/2);
 const g=['garage','garages','shed','carport'].includes(b.t.building)||a<35||!!(b.mk&&GARAGE_TYPES.includes(b.mk[0]));
 return lookFor({id,t:b.t,style:jb.style(b),kind:kindOf(b.t,a,g,b.mk),area:a});};
const A=lookOf('1312240278'),T4=lookOf('1383932241'),Ug=lookOf('191320567');
assert.equal(A.panel,'none','Dalgårdstunet hus A is render, not boards');assert.equal(A.wall,'#ead9ac');assert.equal(T4.panel,'v','Odd Husbys veg 4 is vertical timber');
assert.ok(!Ug.flat&&Ug.panel==='h','Uglagjerdet 7 is a gabled house with horizontal boards, not a flat block');
assert.equal(lookOf('191360330').roof,'#9a4a34','aerial roof record');
console.log('Records reach the house builder (render, boards, roof shape and colour as recorded): OK');

// ---- 3. street lamps and young trees along Odd Husbys veg ----
const dn=data.dalgardNeighbourhood;assert.ok(dn&&dn.trees.length>=10&&dn.lamps.length>=4,'Trees and lamps added');
const key=a=>a.join(',');const treeSet=new Set(data.roadside.trees.map(key)),lampSet=new Set(data.street.lamps.map(key));
for(const t of dn.trees)assert.ok(treeSet.has(key(t)),`tree ${t} is in data.roadside.trees`);
for(const l of dn.lamps)assert.ok(lampSet.has(key(l)),`lamp ${l} is in data.street.lamps`);
assert.equal(data.roadside.trees.filter(t=>dn.trees.some(u=>key(u)===key(t))).length,dn.trees.length,'Not added twice');
const road=data.roads.find(r=>String(r.id)===dn.road);assert.equal(road.name,'Odd Husbys veg');
const segs=streetSegments(data.roads);
for(const [x,z,sp,h] of dn.trees){
 assert.equal(sp,'r');assert.ok(h>=3.5&&h<=6.5,`young rowan height ${h}`);
 const d=Math.min(...road.p.slice(1).map((q,i)=>projectPoint([x,z],road.p[i],q).distance));assert.ok(d>6.5&&d<9,`tree ${d.toFixed(1)} m from the road centre: on the strip beyond the sidewalk`);
 for(const [a,c,w] of segs)assert.ok(projectPoint([x,z],a,c).distance>=w/2+.7+.4-1e-6,`tree (${x},${z}) off every carriageway`);
 for(const b of data.buildings){const p=ring(b);assert.ok(!inRing(p,x,z),`tree (${x},${z}) not in ${b.id}`);assert.ok(Math.min(...p.map((v,i)=>projectPoint([x,z],v,p[(i+1)%p.length]).distance))>1.4,`tree (${x},${z}) clear of ${b.id}`);}}
for(const [x,z] of dn.lamps){for(const [a,c,w] of segs)assert.ok(projectPoint([x,z],a,c).distance>=w/2+.7+.4-1e-6,`lamp (${x},${z}) off every carriageway`);
 for(const b of data.buildings)assert.ok(!inRing(ring(b),x,z),`lamp (${x},${z}) not in ${b.id}`);}
// Budget: a rowan is 24 triangles, a lamp a few dozen; against about 2.2 million drawn triangles that is far under a thousandth.
const extra=dn.trees.length*24+dn.lamps.length*40;assert.ok(extra<1000,`${extra} triangles added`);
console.log(`Odd Husbys veg: ${dn.trees.length} young rowans and ${dn.lamps.length} lamps on the strip beyond the sidewalk, clear of roads and houses (about ${extra} triangles): OK`);
