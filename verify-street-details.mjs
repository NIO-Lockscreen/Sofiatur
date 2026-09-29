import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {addStreetDetails,indexStreetDetails,fitPath,COLOURS,PATH_WIDTH,KERB_BAND,PATH_GAP} from './dist/street-details.js';
import {roadWidth,streetSegments,segmentIndex,projectPoint} from './dist/transit-geometry.js';

// Street details (add-street-details.py -> data.street, drawn by dist/street-details.js): what the map has, that it lies where
// OSM puts it, that nothing stands on a carriageway, that no tree grows in a path, and that it stays within the budget.
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),S=data.street,t=data.terrain;
assert.ok(S,'dist/map.json has street details (run add-street-details.py)');
const roads=new Map(data.roads.map(r=>[String(r.id),r])),segments=streetSegments(data.roads),index=segmentIndex(segments);
const height=(x,z)=>{const a=Math.max(0,Math.min(t.nx-1.001,(x-t.x0)/t.step)),b=Math.max(0,Math.min(t.nz-1.001,(z-t.z0)/t.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=t.heights;return 160+(((h[j*t.nx+i]*(1-u)+h[j*t.nx+i+1]*u)*(1-v)+(h[(j+1)*t.nx+i]*(1-u)+h[(j+1)*t.nx+i+1]*u)*v)-160)*1.45;};
const roadTop=(x,z)=>height(x,z)+.39; // the drawn road is 39 cm above the ground; this test does not depend on how road-surface.js builds it
const distToRoads=(x,z)=>{let best={gap:Infinity};for(const [a,b,w] of index.near(x,z,30)){const d=projectPoint([x,z],a,b).distance;if(d-w/2<best.gap)best={gap:d-w/2,d,w};}return best;};

// --- The data ---------------------------------------------------------------------------------------------------------------
const zebra=S.crossings.filter(c=>c.z),lines=S.crossings.filter(c=>!c.z),osmGive=S.give_way.filter(g=>g.o!=='roundabout'),arms=S.give_way.filter(g=>g.o==='roundabout');
const count={crossings:S.crossings.length,zebra:zebra.length,lines:lines.length,give_way:osmGive.length,roundabout_arms:arms.length,stop:S.stop.length,signal_legs:S.traffic_signals.length,islands:S.islands.length,flush:S.islands.filter(i=>i.f).length,turning:S.turning_circles.length,roundabouts:S.roundabouts.length,
 tables:S.tables.filter(x=>x.k==='table').length,humps:S.tables.filter(x=>x.k==='hump').length,sidewalks:S.paths.filter(p=>p.t==='sidewalk').length,cycleways:S.paths.filter(p=>p.t==='cycleway').length,lamps:S.lamps.length};
// Counts in the OSM extract inside the map region (see docs/street-details.md); more may follow when the map grows, fewer never.
const least={zebra:60,lines:1,give_way:11,roundabout_arms:20,signal_legs:4,islands:13,flush:4,turning:15,roundabouts:8,tables:23,humps:7,sidewalks:95,cycleways:115,lamps:118};
for(const [k,n] of Object.entries(least))assert.ok(count[k]>=n,`${k}: ${count[k]} (at least ${n})`);
assert.ok(JSON.stringify(S).length<90000,'The street data stays compact');
for(const list of [S.crossings,S.give_way,S.stop,S.traffic_signals,S.tables,S.turning_circles])for(const e of list)assert.ok(roads.has(String(e.r)),`${e.o} names a drawn road`);
const all=[...S.crossings.map(c=>c.p),...S.give_way.map(g=>g.p),...S.turning_circles.map(c=>c.p),...S.tables.map(x=>x.p),...S.lamps];
assert.ok(all.every(p=>p.every(v=>v===Math.round(v*100)/100)),'Numbers are rounded to 0.01 m');
for(const c of S.crossings)assert.ok(Math.abs(Math.hypot(...c.n)-1)<.01,'Crossing direction is a unit vector');
for(const g of [...S.give_way,...S.stop,...S.traffic_signals])assert.ok(Math.abs(Math.hypot(...g.d)-1)<.01,'Road direction is a unit vector');

// --- Draw it, with stand-ins for the world's helpers, and count what it makes -------------------------------------------------
const globalDocument=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}}),width:0,height:0})};
function draw(){const log={quads:[],tris:[],boxes:[]};
 const bucket=()=>({}),tri=(b,a,c,d,colour)=>log.tris.push({v:[a,c,d],colour}),quad=(b,a,c,d,e,colour)=>log.quads.push({v:[a,c,d,e],colour}),box=(b,x,y,z,wx,wy,wz,colour)=>log.boxes.push({p:[x,y,z],colour});
 const started=performance.now(),result=addStreetDetails({T,scene:new T.Scene(),data,height,roadTop,bucket,quad,tri,box,ribbon(){},groundPoly(){}});
 return {log,result,ms:performance.now()-started,triangles:log.tris.length+2*log.quads.length+12*log.boxes.length};}
const runs=[draw(),draw(),draw()],{log,result}=runs[0],ms=Math.min(...runs.map(r=>r.ms));
const WHITE=COLOURS.WHITE;

// --- Zebra crossings: 0.5 m stripes, 0.5 m gaps, every stripe on a drawn road, on the asphalt --------------------------------------
assert.equal(result.bars.length,zebra.reduce((n,c)=>n+Math.max(1,Math.floor((roadWidth(roads.get(String(c.r)))-.3+.5)/1)),0),'A stripe for every 1 m of carriageway');
for(const [x,z,r] of result.bars){const road=roads.get(String(r)),near=distToRoads(x,z);assert.ok(near.gap<-.1,`Stripe at ${x.toFixed(1)},${z.toFixed(1)} lies on a drawn road (${near.gap.toFixed(2)} m from the edge of ${road.name||road.type})`);}
const first=zebra[0],bars=result.bars.filter(b=>b[2]===first.r&&Math.hypot(b[0]-first.p[0],b[1]-first.p[1])<4);
for(let i=1;i<bars.length;i++)assert.ok(Math.abs(Math.hypot(bars[i][0]-bars[i-1][0],bars[i][1]-bars[i-1][1])-1)<.01,'Stripes 1 m apart (0.5 m stripe, 0.5 m gap)');
const whites=log.quads.filter(q=>q.colour===WHITE);
for(const q of whites)for(const [x,y,z] of q.v){assert.ok(Number.isFinite(y),'Finite height');const above=y-roadTop(x,z);assert.ok(above>.03&&above<.25,`White paint floats ${above.toFixed(3)} m over the road`);}
const stripe=whites.find(q=>Math.abs(Math.hypot(q.v[1][0]-q.v[0][0],q.v[1][2]-q.v[0][2])-.5)<.02&&Math.abs(Math.hypot(q.v[2][0]-q.v[1][0],q.v[2][2]-q.v[1][2])-3)<.02);assert.ok(stripe,'A stripe is 0.5 m wide and 3 m long');
// Signs by the crossing (blue gangfelt) and at give-way points (red vikeplikt): two per crossing, one per give-way point.
assert.equal(result.signs,zebra.length*2+S.give_way.length,'Signs beside every zebra crossing and give-way point');

// --- Give way, stop lines, tables --------------------------------------------------------------------------------------------------
for(const g of S.give_way){const road=roads.get(String(g.r));assert.ok(distToRoads(...g.p).gap<0,`Give-way point on a drawn road (${road.name})`);}
// The direction is that of the traffic, along the road the point lies on (either way along it).
const tangentAt=([x,z])=>{let best=null;for(const [a,b] of index.near(x,z,10)){const d=projectPoint([x,z],a,b).distance;if(!best||d<best.d){const l=Math.hypot(b[0]-a[0],b[1]-a[1]);best={d,t:[(b[0]-a[0])/l,(b[1]-a[1])/l]};}}return best.t;};
for(const g of [...S.give_way,...S.stop,...S.traffic_signals]){const t=tangentAt(g.p);assert.ok(Math.abs(g.d[0]*t[0]+g.d[1]*t[1])>.85,`Direction of ${g.o} follows its road`);}
for(const x of S.tables)assert.ok(distToRoads(...x.p).gap<0,`Speed ${x.k} on a drawn road`);
assert.ok(S.tables.every(x=>Math.abs(Math.hypot(...x.d)-1)<.01),'Table direction is a unit vector');
// a table is a gentle band: every corner of it within 12 cm of the road, and the white triangles lie on it
const band=log.quads.filter(q=>q.colour===COLOURS.TABLE);assert.ok(band.length>=S.tables.length*4,'Every table is a raised band');
for(const q of band)for(const [x,y,z] of q.v){const above=y-roadTop(x,z);assert.ok(above>=.0&&above<.12,`Table band is ${above.toFixed(3)} m over the road`);}

// --- Islands and turning circles where OSM puts them --------------------------------------------------------------------------------
// Centres of the OSM ways (area:highway=traffic_island) and nodes (highway=turning_circle) as prepare-map.py reads them.
const osmIslands={w1330413738:[674,372],w1364104817:[669,387],w1364292861:[918,669],w1364525016:[1320,339],w1364525017:[1352,339],w1364525019:[1322,312],w1368394251:[671,249],w1368394252:[666,260],w1368394256:[678,280],w1368394257:[633,297],w1368394280:[514,447],w1368394283:[507,440],w1362384529:[226,1352],w1362384533:[158,1381]};
for(const [id,[cx,cz]] of Object.entries(osmIslands)){const pieces=S.islands.filter(i=>i.o===id);assert.ok(pieces.length,`Island ${id} is drawn`);
 for(const i of pieces)assert.ok(i.p.every(v=>Math.hypot(v[0]-cx,v[1]-cz)<20),`Island ${id} stays where OSM puts it`);}
assert.ok(S.islands.every(i=>i.o in osmIslands||i.o==='w1364525018'),'No island that OSM does not have');
const osmTurning={n35682721:[748.12,47.34],n246519010:[1217.74,618.37],n246564579:[1786.99,452.57],n254330217:[926.73,-670.91],n280511864:[847.73,728.66],n410794392:[832.86,-105.86],n410794455:[1458.65,703.2],n1022662611:[243.02,415.85],n1183054532:[826.54,-138.05],n1485073984:[-137.48,-95.19],n1752597704:[1102.41,-422.33],n2301480779:[1284.84,473.94],n12459246707:[1311.97,-252.17],n280511878:[744.32,1083.6],n10578692280:[553.97,1029.39]};
for(const [id,p] of Object.entries(osmTurning)){const c=S.turning_circles.find(c=>c.o===id);assert.ok(c,`Turning circle ${id}`);assert.ok(Math.hypot(c.p[0]-p[0],c.p[1]-p[1])<.05,`Turning circle ${id} where OSM puts it`);}
for(const c of S.turning_circles){const road=roads.get(String(c.r)),ends=[road.p[0],road.p.at(-1)];assert.ok(ends.some(e=>Math.hypot(e[0]-c.p[0],e[1]-c.p[1])<.5),'A turning circle sits at the end of its road');assert.ok(c.rad>=5.5&&c.rad<=8.5,'Radius 5.5 to 8.5 m');}
for(const i of S.islands.filter(i=>!i.f))for(const [a,b] of segments.map(s=>[s[0],s[1]]))for(const v of i.p)assert.ok(projectPoint(v,a,b).distance>1.1,'A raised island keeps 1.2 m from the centre line the car follows');
// Islands drawn raised .12 m over the road; the disc of a turning circle is level with the road end
const kerbs=log.quads.filter(q=>q.colour===COLOURS.KERB);assert.ok(kerbs.length>10,'Raised islands have kerb walls');
for(const q of kerbs)assert.ok(Math.abs(q.v[2][1]-roadTop(q.v[2][0],q.v[2][2])-.12)<.01,'Island top .12 m over the road');
for(const c of S.turning_circles){const centre=log.tris.find(x=>x.v[0][0]===c.p[0]&&x.v[0][2]===c.p[1]);assert.ok(centre,'Turning circle drawn');assert.ok(Math.abs(centre.v[0][1]-roadTop(...c.p)-.03)<.001,'Turning circle level with the road end');}
assert.equal(result.turning.length,S.turning_circles.length);assert.equal(result.islands.length,S.islands.length);

// --- Paths and lamps stay off the carriageway ---------------------------------------------------------------------------------------
const need=(w,hw)=>w/2+KERB_BAND+.2+hw; // a gap of 0.2 m to the kerb band, though fitPath aims for 0.4 and simplifies within 0.1 m
let drawn=0;for(const [a,b,width] of result.paths){const len=Math.hypot(b[0]-a[0],b[1]-a[1]);drawn+=len;
 for(let d=0;d<=len;d+=1){const x=a[0]+(b[0]-a[0])*d/len,z=a[1]+(b[1]-a[1])*d/len,n=distToRoads(x,z);assert.ok(n.gap+n.w/2>=need(n.w,width/2)||n.gap===Infinity,`Path ${width} m wide at ${x.toFixed(1)},${z.toFixed(1)} is ${(n.gap+n.w/2).toFixed(2)} m from a road centre line, needs ${need(n.w,width/2).toFixed(2)}`);}}
const mapped=S.paths.reduce((n,p)=>n+p.p.reduce((l,v,i)=>i?l+Math.hypot(v[0]-p.p[i-1][0],v[1]-p.p[i-1][1]):0,0),0);
assert.ok(drawn>.75*mapped,`Most of the mapped sidewalks and cycleways are drawn (${(drawn/1000).toFixed(1)} of ${(mapped/1000).toFixed(1)} km)`);
assert.ok(result.lamps.length===S.lamps.length,'Every lamp is drawn');
for(const [x,z] of result.lamps){const n=distToRoads(x,z);assert.ok(n.gap>=KERB_BAND+.39,`Lamp at ${x.toFixed(1)},${z.toFixed(1)} stands ${n.gap.toFixed(2)} m from the carriageway`);}
// fitPath on its own: a path 2 m off a 6.5 m road moves out to 3.25 + 0.7 + 0.4 + 1.1 from its centre line, and is cut where it runs over the road
const test={near:()=>[[[0,0],[100,0],6.5]]};
const moved=fitPath([[0,5],[50,5]],1.1,test);assert.ok(moved.length===1&&moved[0].every(p=>Math.abs(p[1]-5.45)<.02),'A path too close to a road is pushed out to the gap');
assert.ok(fitPath([[10,20],[10,-20]],1.1,test).length===2,'A path across the road is cut in two');assert.ok(fitPath([[0,3.6],[6,3.6]],1.1,test).length===1,'A short path just beside the road is kept, pushed out');assert.equal(fitPath([[0,2],[20,2]],1.1,test).length,0,'A path along the carriageway is dropped');
assert.equal(PATH_WIDTH.sidewalk>=2&&PATH_WIDTH.sidewalk<=2.5&&PATH_WIDTH.cycleway===3,true,'Sidewalks 2-2.5 m, gang- og sykkelvei 3 m');

// --- No tree inside a path or the island of a roundabout --------------------------------------------------------------------------------
// world.js keeps trees away with clear(); this is its rule (the assertion on the source keeps the copy honest).
const world=fs.readFileSync('dist/world.js','utf8');
assert.ok(world.includes('indexStreetDetails(addStreetDetails('),'world.js indexes the street details as tree obstacles');
assert.ok(world.includes('distanceSegment(x,z,o.road[0],o.road[1])<o.road[2]/2+4'),'clear() is the rule this test copies');
const obstacles=new Map(),cell=n=>Math.floor(n/40);
indexStreetDetails(result,(x,z,val)=>{const k=cell(x)+','+cell(z);if(!obstacles.has(k))obstacles.set(k,[]);obstacles.get(k).push(val);});
const segDist=(x,z,a,b)=>projectPoint([x,z],a,b).distance;
const clear=(x,z)=>{for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const o of obstacles.get((cell(x)+dx)+','+(cell(z)+dz))||[])if(o.road&&segDist(x,z,o.road[0],o.road[1])<o.road[2]/2+4)return false;return true;};
let checked=0;
for(const [a,b,w] of result.paths){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;
 for(let d=0;d<=len;d+=2)for(const s of [-1,-.5,0,.5,1]){const x=a[0]+(b[0]-a[0])*d/len+nx*s*w/2,z=a[1]+(b[1]-a[1])*d/len+nz*s*w/2;checked++;assert.ok(!clear(x,z),`A tree could stand in a path at ${x.toFixed(1)},${z.toFixed(1)}`);}}
for(const c of result.central)for(let k=0;k<12;k++){const x=c.p[0]+Math.cos(k/12*Math.PI*2)*c.rad*.9,z=c.p[1]+Math.sin(k/12*Math.PI*2)*c.rad*.9;checked++;assert.ok(!clear(x,z),'A tree could stand on a roundabout island');}
assert.ok(checked>5000&&result.central.length>=6,`Checked ${checked} points in paths and ${result.central.length} roundabout islands`);
const outside=[];for(let k=0;k<200;k++){const [a,b,w]=result.paths[k*7%result.paths.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;outside.push(clear(a[0]+nx*(w/2+3),a[1]+nz*(w/2+3)));}
assert.ok(outside.some(v=>v),'Trees are only kept 1.5 m off a path, not 4 m');

// --- The budget: at most 8 % more triangles and 8 % more build time than before (1 689 112 triangles; 3.4-3.7 s to build the world in headless Chromium on 29 September 2026) ---
const BEFORE={triangles:1689112,ms:3500};
assert.ok(runs[0].triangles<=BEFORE.triangles*.08,`Triangles: +${runs[0].triangles} (${(runs[0].triangles/BEFORE.triangles*100).toFixed(2)} %, at most 8 %)`);
assert.ok(ms<=BEFORE.ms*.08,`Build time: ${ms.toFixed(0)} ms (at most ${BEFORE.ms*.08} ms)`);
globalThis.document=globalDocument;

console.log(`Street details: ${count.zebra} zebra crossings (${result.bars.length} stripes on drawn roads) and ${count.lines} with lines, ${count.give_way} give-way points + ${count.roundabout_arms} roundabout arms, ${count.signal_legs} signal stop lines, ${count.islands} islands (${count.flush} painted), ${count.turning} turning circles, ${count.roundabouts} roundabout islands, ${count.tables} speed tables and ${count.humps} humps, ${count.sidewalks} sidewalks and ${count.cycleways} cycleways (${(drawn/1000).toFixed(1)} km drawn), ${count.lamps} lamps, ${result.signs} signs: OK`);
console.log(`Budget: +${runs[0].triangles} triangles (${(runs[0].triangles/BEFORE.triangles*100).toFixed(2)} %), ${ms.toFixed(0)} ms to draw (limit 8 %): OK`);
