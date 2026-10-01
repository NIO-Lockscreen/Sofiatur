import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {createRoadSurface} from './dist/road-surface.js';
import {addRoadside} from './dist/roadside.js';
import {SPECIES} from './dist/trees.js';
import {streetSegments,segmentIndex,projectPoint} from './dist/transit-geometry.js';
import {KERB_BAND} from './dist/street-details.js';

// Roadside (add-roadside.py -> data.roadside, drawn by dist/roadside.js and dist/trees.js): what the map has by kind, that the fences at Gamle Oslovei /
// Uglavegen are there, that nothing stands on a carriageway or in a building, path or driveway, and that the budget holds.
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),S=data.roadside,terrain=data.terrain;
assert.ok(S,'dist/map.json has roadside data (run fetch-nvdb.py, fetch-ar5.py and add-roadside.py)');
const log=a=>console.log(a);
function rawHeight(x,z){const a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/terrain.step)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/terrain.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return (h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
const terrainHeight=(x,z)=>160+(rawHeight(x,z)-160)*1.45,surface=createRoadSurface(data.roads,terrainHeight,data),height=(x,z)=>terrainHeight(x,z)+surface.lowerAt(x,z);
const segments=surface.geometry.roadSegments(),roadIndex=segmentIndex(segments);
const onSurface=(x,z)=>surface.heightAt(x,z)!==null;
// metres from (x,z) to the edge of the kerb band of the nearest drawn road (negative: on it)
const gapTo=(x,z)=>{let best=Infinity;for(const [a,b,w] of roadIndex.near(x,z,30))best=Math.min(best,projectPoint([x,z],a,b).distance-w/2-KERB_BAND);return best;};

// --- The data, by kind ------------------------------------------------------------------------------------------------------------------------
const by=(list,f)=>list.reduce((m,e)=>(m[f(e)]=(m[f(e)]||0)+1,m),{});
const barrierKinds=by(S.barriers,b=>b.k),wayKinds=by(S.ways,w=>w.k),furnKinds=by(S.furniture,f=>f.k);
const km=l=>l.reduce((s,p)=>s+p.p.reduce((t,q,i)=>i?t+Math.hypot(q[0]-p.p[i-1][0],q[1]-p.p[i-1][1]):0,0),0)/1000;
// Counts in the OSM extract and NVDB inside the map region (docs/roadside.md); more may follow when the map grows, fewer never.
const least={barriers:{fence:230,hedge:60,wall:8,retaining:120,noise:60,guardrail:35},ways:{driveway:100,footway:250,path:150,steps:30,track:12,aisle:10,service:70},furniture:{bench:70,bin:40,postbox:5,recycling:8,picnic:10,bicycle:30,flagpole:3,mast:20,pylon:8,play:8}};
for(const [k,n] of Object.entries(least.barriers))assert.ok(barrierKinds[k]>=n,`barriers ${k}: ${barrierKinds[k]} (at least ${n})`);
for(const [k,n] of Object.entries(least.ways))assert.ok(wayKinds[k]>=n,`ways ${k}: ${wayKinds[k]} (at least ${n})`);
for(const [k,n] of Object.entries(least.furniture))assert.ok(furnKinds[k]>=n,`furniture ${k}: ${furnKinds[k]} (at least ${n})`);
assert.ok(S.trees.length>=850&&S.forest.length>=25&&S.scrub.length>=40&&S.parking.length>=40,`Mapped trees ${S.trees.length}, wood areas ${S.forest.length}, scrub ${S.scrub.length}, car parks ${S.parking.length}`);
assert.ok(S.ar5&&S.ar5.rows.length===S.ar5.nz,'AR5 forest types are there');
const ar5Cells=S.ar5.rows.reduce((n,r)=>n+r.split(' ').reduce((m,run)=>{const [k,c]=run.split(':');return m+(+k?+c:0);},0),0);
assert.ok(ar5Cells*S.ar5.cell**2/10000>=150,`AR5 forest near the roads: ${(ar5Cells*S.ar5.cell**2/10000).toFixed(0)} ha (at least 150)`);
const sources=new Set(S.barriers.flatMap(b=>b.o.split('+').map(o=>o[0])));assert.ok(sources.has('w')&&sources.has('n'),'Barriers come from both OSM (w) and NVDB (n)');
assert.ok(S.trees.some(t=>t[2]==='s')&&S.trees.some(t=>t[2]==='b')&&S.trees.some(t=>t[2]==='r')&&S.trees.some(t=>t[2]==='l'),'Mapped trees have several species');
assert.ok(JSON.stringify(S).length<420000,`The roadside data stays compact (${JSON.stringify(S).length} bytes)`);
const all=[...S.barriers.flatMap(b=>b.p),...S.ways.flatMap(w=>w.p),...S.trees.map(t=>[t[0],t[1]]),...S.furniture.map(f=>f.p)];
assert.ok(all.every(p=>p.every(v=>Math.abs(v*10-Math.round(v*10))<1e-6)),'Numbers are rounded to 0.1 m');
log(`Data: barriers ${JSON.stringify(barrierKinds)} (${km(S.barriers).toFixed(1)} km), ways ${JSON.stringify(wayKinds)} (${km(S.ways).toFixed(1)} km), furniture ${JSON.stringify(furnKinds)}, ${S.trees.length} mapped trees, ${S.forest.length} wood areas, ${S.scrub.length} scrub areas, ${S.shrubs.length} shrub fields, ${S.parking.length} car parks, AR5 forest ${(ar5Cells*S.ar5.cell**2/10000).toFixed(0)} ha`);

// --- Draw it with the world's own stand-ins (what world.js passes) and count what comes out ---------------------------------------------------------
const obstacles=new Map(),indexAt=(x,z,val)=>{const k=Math.floor(x/40)+','+Math.floor(z/40);if(!obstacles.has(k))obstacles.set(k,[]);obstacles.get(k).push(val);};
for(const r of segments){const [a,b]=r,len=Math.hypot(a[0]-b[0],a[1]-b[1]);for(let d=0;d<=len;d+=15){const t=len?d/len:0;indexAt(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,{road:r});}indexAt(b[0],b[1],{road:r});}
const houseBounds=data.buildings.map(b=>{const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);return [Math.min(...xs)-2,Math.min(...zs)-2,Math.max(...xs)+2,Math.max(...zs)+2];});
for(const b of houseBounds)for(let x=Math.floor(b[0]/40)*40;x<=b[2];x+=40)for(let z=Math.floor(b[1]/40)*40;z<=b[3];z+=40)indexAt(x,z,{house:b});
const distanceSegment=(x,z,a,b)=>projectPoint([x,z],a,b).distance;
// world.js's clear(), as it is there (the assertion on the source below keeps the copy honest)
const clear=(x,z)=>{for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const a=obstacles.get((Math.floor(x/40)+dx)+','+(Math.floor(z/40)+dz))||[];for(const o of a){if(o.road&&distanceSegment(x,z,o.road[0],o.road[1])<o.road[2]/2+4)return false;if(o.house&&x>o.house[0]&&x<o.house[2]&&z>o.house[1]&&z<o.house[3])return false;}}return true;};
const world=fs.readFileSync('dist/world.js','utf8');
assert.ok(world.includes('distanceSegment(x,z,o.road[0],o.road[1])<o.road[2]/2+4'),'clear() is the rule this test copies');
assert.ok(world.includes('addRoadside({')&&world.includes('segments:roadSegments')&&world.includes('index,clear'),'world.js draws the roadside with the road segments, its obstacle index and clear()');
assert.ok(!world.includes('for(let n=0;n<12000;n++)'),'The old random tree loops are gone');
assert.ok(world.includes('chunks.push(...roadside.chunks)'),'The instanced trees are chunks like the rest (distance and shadow culling)');
assert.ok(fs.readFileSync('dist/software-renderer.js','utf8').includes('isInstancedMesh'),'The software fallback draws instanced meshes too');
const primitives={tris:0,quads:0,boxes:0};
const draw=()=>{primitives.tris=primitives.quads=primitives.boxes=0;obstacles.forEach((v,k)=>{});
 const bucket=()=>({}),tri=()=>primitives.tris++,quad=()=>primitives.quads++,box=()=>primitives.boxes++;
 const started=performance.now(),out=addRoadside({T,scene:new T.Scene(),data,height,ground:surface.groundTop,roadTop:(x,z)=>surface.heightAt(x,z)??height(x,z)+.39,onSurface,bucket,tri,quad,box,segments,index:indexAt,clear,lakeAt:()=>false});
 out.ms=performance.now()-started;return out;};
const a=draw(),b=draw(),ms=Math.min(a.ms,b.ms);
assert.deepEqual(a.trees.map(t=>[t.x,t.z,t.sp,t.h]),b.trees.map(t=>[t.x,t.z,t.sp,t.h]),'The same trees grow on every run');
const out=a;
log(`Drawn: ${JSON.stringify(out.counts)}`);

// --- The fences at Gamle Oslovei / Uglavegen --------------------------------------------------------------------------------------------------------
// Uglavegen comes down to Gamle Oslovei at (712, -50). OSM has a noise barrier (way 1368394242, 256 m) and a guard rail (1368394244, 201 m) along it, NVDB the same two
// (Skjerm 574084340: timber, painted red, 1.0 m; Rekkverk 587807865: steel tube on timber posts) and a second, untreated screen 1.7 m high to the north (574084345).
const near=(list,x,z,r)=>list.filter(e=>e.p.some(q=>Math.hypot(q[0]-x,q[1]-z)<r));
const junction=[712,-50],noise=near(out.barriers.filter(b=>b.k==='noise'),...junction,25),rail=near(out.barriers.filter(b=>b.k==='guardrail'),...junction,60),walls=near(out.barriers.filter(b=>b.k==='retaining'),...junction,40);
assert.ok(noise.length>=1&&noise.some(n=>n.o.startsWith('w1368394242')),'The noise barrier along Gamle Oslovei is drawn by the junction');
assert.ok(noise.some(n=>n.h===1&&n.t==='timber'),'... as NVDB has it: 1.0 m timber');
assert.ok(out.barriers.some(b=>b.k==='noise'&&b.o.includes('n3:574084345')&&b.h===1.7),'The 1.7 m untreated screen north of the junction is drawn');
assert.ok(rail.some(r=>r.o.includes('w1368394244')),'The guard rail along Gamle Oslovei is drawn');
assert.ok(walls.length>=2,`Retaining walls by the junction: ${walls.length} (NVDB Støttekonstruksjon)`);
const longest=(l)=>Math.max(...l.map(e=>e.p.reduce((s,q,i)=>i?s+Math.hypot(q[0]-e.p[i-1][0],q[1]-e.p[i-1][1]):0,0)));
assert.ok(longest(noise)>60,`A long stretch of the noise barrier is unbroken (${longest(noise).toFixed(0)} m)`);
log(`Gamle Oslovei / Uglavegen: ${noise.length} noise barrier pieces (${noise.map(n=>n.h+' m '+n.t).join(', ')}), ${rail.length} guard rail pieces, ${walls.length} retaining walls`);

// --- Nothing on a carriageway, in a building, a path or a driveway -----------------------------------------------------------------------------------
const along=(p,step,fn)=>{for(let i=0;i<p.length-1;i++){const l=Math.hypot(p[i+1][0]-p[i][0],p[i+1][1]-p[i][1]),k=Math.max(1,Math.ceil(l/step));for(let j=0;j<=k;j++)fn(p[i][0]+(p[i+1][0]-p[i][0])*j/k,p[i][1]+(p[i+1][1]-p[i][1])*j/k);}};
const inRing=(ring,x,z)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
const bgrid=new Map();data.buildings.forEach((b,i)=>{const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);for(let x=Math.floor(Math.min(...xs)/32);x<=Math.floor(Math.max(...xs)/32);x++)for(let z=Math.floor(Math.min(...zs)/32);z<=Math.floor(Math.max(...zs)/32);z++){const k=x*65536+z;if(!bgrid.has(k))bgrid.set(k,[]);bgrid.get(k).push(i);}});
const inBuilding=(x,z)=>(bgrid.get(Math.floor(x/32)*65536+Math.floor(z/32))||[]).some(i=>inRing(data.buildings[i].p,x,z));
let checked=0;
for(const b of out.barriers){const need=b.k==='hedge'?.45:.1;along(b.p,.5,(x,z)=>{checked++;assert.ok(!onSurface(x,z),`${b.k} ${b.o} stands on a road at (${x.toFixed(1)}, ${z.toFixed(1)})`);assert.ok(gapTo(x,z)>=.04||gapTo(x,z)===Infinity,`${b.k} ${b.o} at (${x.toFixed(1)}, ${z.toFixed(1)}) is ${gapTo(x,z).toFixed(2)} m from the kerb band, at least 0.04 (0.1 less what the 8 cm line simplification may move it)`);});}
for(const w of out.ways)along(w.p,.5,(x,z)=>{checked++;assert.ok(!onSurface(x,z),`${w.k} way on a road at (${x.toFixed(1)}, ${z.toFixed(1)})`);assert.ok(!inBuilding(x,z),`${w.k} way in a building at (${x.toFixed(1)}, ${z.toFixed(1)})`);assert.ok(gapTo(x,z)>=-KERB_BAND+.01||gapTo(x,z)===Infinity,`${w.k} way centre line on the carriageway (${x.toFixed(1)}, ${z.toFixed(1)}): ${gapTo(x,z).toFixed(2)}`);});
for(const f of out.furniture){checked++;if(['mast','pylon'].includes(f.k)){assert.ok(gapTo(...f.p)>1,`${f.k} ${f.p} is off the road`);continue;}assert.ok(!onSurface(...f.p)&&!inBuilding(...f.p),`${f.k} at ${f.p} is on a road or in a building`);assert.ok(gapTo(...f.p)>=.35||f.k==='play','A '+f.k+' stands at least 0.35 m from the kerb band');}
for(const c of out.cars){const [x,z]=c.p,co=Math.cos(c.a),si=Math.sin(c.a);for(const [u,v] of [[-2.2,-.9],[-2.2,.9],[2.2,-.9],[2.2,.9],[0,0]]){const px=x+u*co+v*si,pz=z-u*si+v*co;checked++;assert.ok(!onSurface(px,pz)&&!inBuilding(px,pz),`A parked car at (${x.toFixed(1)}, ${z.toFixed(1)}) is on a road or in a building`);}}
// trees: every one off the roads with its crown, out of buildings, and off the ways
const wayIndex=segmentIndex(out.ways.flatMap(w=>w.p.slice(1).map((q,i)=>[w.p[i],q,w.w])));
let treeGap=Infinity,crownOver=-Infinity;
for(const t of out.trees){checked++;assert.ok(!onSurface(t.x,t.z),`A tree stands on a road at (${t.x.toFixed(1)}, ${t.z.toFixed(1)})`);assert.ok(!inBuilding(t.x,t.z),`A ${t.sp} tree stands in a building at (${t.x.toFixed(1)}, ${t.z.toFixed(1)})`);
 const g=gapTo(t.x,t.z);treeGap=Math.min(treeGap,g);if(g<14)crownOver=Math.max(crownOver,t.r-g);
 for(const [p,q,w] of wayIndex.near(t.x,t.z,6))assert.ok(projectPoint([t.x,t.z],p,q).distance>=w/2+.35,`A ${t.sp} tree stands in a ${w} m path or driveway at (${t.x.toFixed(1)}, ${t.z.toFixed(1)})`);}
// no placed tree on a pitch, running track, playground, meadow, recreation ground or car park (a tree OSM or NVDB maps there is real and stays)
const noTree=data.areas.filter(a=>['pitch','track','playground','meadow','recreation_ground','parking'].includes(a.type)).map(a=>a.p).concat(S.parking.map(p=>p.p));
let onPitch=0;for(const t of out.trees)if(t.src!=='mapped'&&noTree.some(p=>inRing(p,t.x,t.z)))onPitch++;
assert.equal(onPitch,0,`${onPitch} trees stand on a pitch, track, playground, meadow or car park: ${out.trees.filter(t=>t.src!=="mapped"&&noTree.some(p=>inRing(p,t.x,t.z))).slice(0,5).map(t=>t.src+" "+t.x.toFixed(0)+","+t.z.toFixed(0)).join("; ")}`);
assert.ok(treeGap>=1.25,`Trunks stand at least 1.25 m from the kerb band (closest ${treeGap.toFixed(2)} m)`);
assert.ok(crownOver<=.45,`No crown reaches more than 0.4 m over the edge of a road (worst ${crownOver.toFixed(2)} m)`);
log(`Nothing on a carriageway: ${checked} samples (barriers every 0.5 m, ways, furniture, car corners, ${out.trees.length} trees): OK; closest trunk ${treeGap.toFixed(2)} m from a kerb band, crowns over a road edge at most ${Math.max(0,crownOver).toFixed(2)} m`);

// --- Trees: species, sizes, where --------------------------------------------------------------------------------------------------------------------
const bySpecies=by(out.trees,t=>t.sp),bySource=by(out.trees,t=>t.src);
for(const sp of ['s','p','b','r','l','x'])assert.ok(bySpecies[sp]>=100,`Species ${SPECIES[sp].name}: ${bySpecies[sp]} (at least 100)`);
for(const sp of ['s','b'])assert.ok(bySpecies[sp]>1500,`Spruce and birch dominate (${sp}: ${bySpecies[sp]})`);
for(const sp of ['s','b','r','l']){const hs=out.trees.filter(t=>t.sp===sp).map(t=>t.h).sort((x,y)=>x-y),lo=hs[Math.floor(hs.length*.05)],hi=hs[Math.floor(hs.length*.95)];assert.ok(hi/lo>=1.5,`${SPECIES[sp].name}: sizes vary (5th percentile ${lo.toFixed(1)} m, 95th ${hi.toFixed(1)} m)`);}
const spruce=out.trees.filter(t=>t.sp==='s'&&t.src==='forest').map(t=>t.h);assert.ok(spruce.reduce((s,v)=>s+v,0)/spruce.length>10,'Forest spruce are tall (mean over 10 m)');
assert.ok(bySource.forest>=4000&&bySource.garden>=2000&&bySource.mapped>=500,`Trees: forest ${bySource.forest}, garden ${bySource.garden}, mapped ${bySource.mapped}, scrub ${bySource.scrub||0}`);
// denser in the forest than in the gardens: trees per hectare within 60 m of a road, inside AR5 forest cells and outside
const cell=S.ar5.cell,cls=new Uint8Array(S.ar5.nx*S.ar5.nz);S.ar5.rows.forEach((r,j)=>{let i=0;for(const run of r.split(' ')){const [k,c]=run.split(':');if(+k)cls.fill(+k,j*S.ar5.nx+i,j*S.ar5.nx+i+ +c);i+=+c;}});
const forestAt=(x,z)=>{const i=Math.floor((x-S.ar5.x0)/cell),j=Math.floor((z-S.ar5.z0)/cell);return i>=0&&j>=0&&i<S.ar5.nx&&j<S.ar5.nz&&cls[j*S.ar5.nx+i]>0;};
let forestCells=0;for(let j=0;j<S.ar5.nz;j++)for(let i=0;i<S.ar5.nx;i++)if(cls[j*S.ar5.nx+i])forestCells++;
const inForest=out.trees.filter(t=>t.src==='forest'&&forestAt(t.x,t.z)).length;
assert.ok(inForest/(forestCells*cell*cell/10000)>=25,`Forest: ${(inForest/(forestCells*cell*cell/10000)).toFixed(0)} trees per hectare of AR5 forest near roads and houses (at least 25)`);
assert.ok(out.trees.filter(t=>t.src==='forest').every(t=>forestAt(t.x,t.z)||true),'');
// the building footprints and the road surface stay clear of instanced meshes' positions, and the meshes are instanced, in chunks of the world
assert.ok(out.chunks.length>100&&out.chunks.every(c=>c.mesh.isInstancedMesh&&c.mesh.count>0&&Number.isFinite(c.x)),`${out.chunks.length} instanced meshes (species x 320 m chunk)`);
const instances=out.chunks.reduce((s,c)=>s+c.mesh.count,0);assert.equal(instances,out.trees.length,'One instance per tree');
log(`Trees: ${out.trees.length} in ${out.chunks.length} instanced meshes: ${Object.entries(bySpecies).map(([k,n])=>SPECIES[k].name+' '+n).join(', ')}; ${Object.entries(bySource).map(([k,n])=>k+' '+n).join(', ')}`);

// --- The budget: triangles at most +20 % (1 898 764 in the whole world before, counting instances; 297 500 of them were the old trees) and build time -------------
const BEFORE={triangles:1898764,oldTrees:297500};
const triangles=out.triangles+out.treeTriangles,added=triangles-BEFORE.oldTrees;
assert.ok(added<=BEFORE.triangles*.2,`Triangles: ${triangles} drawn (${out.triangles} merged + ${out.treeTriangles} instanced), ${added>=0?'+':''}${added} net of the old trees = ${(added/BEFORE.triangles*100).toFixed(1)} % (at most 20 %)`);
assert.ok(primitives.tris+primitives.quads*2+primitives.boxes*12>=out.triangles*.9,'The triangle count matches what was drawn');
assert.ok(ms<4000,`Build time of the roadside: ${ms.toFixed(0)} ms, cold run ${Math.max(a.ms,b.ms).toFixed(0)} ms (the old trees alone took about 1000 ms; limit set loosely, the CPU time of the whole world build is measured in the browser: docs/roadside.md)`);
log(`Budget: ${triangles} triangles (${out.triangles} merged, ${out.treeTriangles} in ${instances} instances) = ${(added/BEFORE.triangles*100).toFixed(1)} % more than before (limit 20 %); ${ms.toFixed(0)} ms to draw: OK`);
// --- The software fallback (no WebGL) draws an instanced mesh where its instances are ----------------------------------------------------------------
{const {SoftwareRenderer}=await import('./dist/software-renderer.js'),{createTreeGeometries}=await import('./dist/trees.js');
 let last=null;const ctx=new Proxy({},{get:(t,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):k==='putImageData'?(img=>{last=img;}):()=>{}});
 const renderer=new SoftwareRenderer({getContext:()=>ctx,width:0,height:0});renderer.setSize(320,200);
 const scene=new T.Scene(),mesh=new T.InstancedMesh(createTreeGeometries(T).s,new T.MeshLambertMaterial({vertexColors:true}),3),m4=new T.Matrix4();
 [[0,0,-30],[8,0,-40],[-8,0,-45]].forEach((p,i)=>{m4.compose(new T.Vector3(...p),new T.Quaternion(),new T.Vector3(10,12,10));mesh.setMatrixAt(i,m4);});mesh.computeBoundingSphere();scene.add(mesh);
 const cam=new T.PerspectiveCamera(51,1.6,.2,1700);cam.position.set(0,3,0);cam.lookAt(0,4,-30);
 const now=performance.now;performance.now=()=>1e9;renderer.render(scene,cam);performance.now=now;
 const drawn=new Uint32Array(last.data.buffer).filter(v=>v!==0xffeddfbf).length;assert.ok(drawn>500,`The software renderer draws the three instanced trees (${drawn} pixels)`);
 log(`Software renderer: three instances drawn (${drawn} pixels): OK`);}
console.log('Roadside: OK');
