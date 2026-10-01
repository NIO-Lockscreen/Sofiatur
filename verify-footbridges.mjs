import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRoadSurface} from './dist/road-surface.js';
import {streetSegments,segmentIndex} from './dist/transit-geometry.js';
import {planFootbridges,addFootbridges,trenchHoles,CLEARANCE,DECK_T,LIFT,MAX_SLOPE,TUNNEL_H,ROOF_T,COLOURS} from './dist/footbridges.js';

// Footbridges and pedestrian underpasses (add-footbridges.py -> data.footbridges, drawn by dist/footbridges.js). The heights are not in the
// data: they come from the road surface and the ground as the game draws them, which this test builds in the same way as world.js.
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),FB=data.footbridges,terrain=data.terrain;
assert.ok(FB,'dist/map.json has footbridges (run add-footbridges.py)');
function rawHeight(x,z){const a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/terrain.step)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/terrain.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return h[j*terrain.nx+i]*(1-u)*(1-v)+h[j*terrain.nx+i+1]*u*(1-v)+h[(j+1)*terrain.nx+i]*(1-u)*v+h[(j+1)*terrain.nx+i+1]*u*v;}
const height=(x,z)=>160+(rawHeight(x,z)-160)*1.45,surface=createRoadSurface(data.roads,height,data);
const roads=new Map(data.roads.map(r=>[String(r.id),r])),segments=streetSegments(data.roads),index=segmentIndex(segments);

// --- The data: the two crossings at Rema 1000 Stavset, and what else is mapped -------------------------------------------------------------
const bridge=id=>FB.bridges.find(b=>b.id===id),tunnel=id=>FB.tunnels.find(t=>t.id===id);
const rb=bridge('w191325644'),ru=tunnel('w191325643');
assert.ok(rb,'Footbridge OSM 191325644 over Byåsveien at Rema 1000 Stavset');assert.equal(rb.k,'road','it crosses a drawn road');
assert.ok(Math.hypot(rb.p[0][0]-203.43,rb.p[0][1]-1248.28)<.05&&Math.hypot(rb.p.at(-1)[0]-215.85,rb.p.at(-1)[1]-1285.43)<.05,'the deck lies where OSM puts it');
assert.ok(ru,'Cycleway tunnel OSM 191325643 under Byåsveien at the Stavset roundabout');
assert.ok(Math.hypot(ru.p[0][0]-53.47,ru.p[0][1]-1336.59)<.05&&Math.hypot(ru.p[1][0]-70.34,ru.p[1][1]-1354.01)<.05,'the underpass lies where OSM puts it');
assert.ok(ru.over.length>=1,'it passes under drawn roads');
const least={bridges:6,tunnels:6};
assert.ok(FB.bridges.length>=least.bridges&&FB.tunnels.length>=least.tunnels,`${FB.bridges.length} footbridges and ${FB.tunnels.length} underpasses (at least ${least.bridges} and ${least.tunnels})`);
assert.ok(JSON.stringify(FB).length<14000,'The data stays compact');
assert.ok(FB.bridges.some(b=>b.id==='w101187272'),'the cycle bridge beside Kystadbrua');
for(const id of ['w1410709998','w289753479','w289753482','w289753483'])assert.ok(bridge(id),`path bridge ${id}`);
for(const b of FB.bridges)for(const s of b.steps)assert.ok(/^w\d+$/.test(s.id),'steps are mapped ways (OSM highway=steps)');

// --- Plan: what the deck and the floor do, measured on the drawn road and ground -------------------------------------------------------
const t0=performance.now(),plan=planFootbridges({data,surface}),planMs=performance.now()-t0;
const report=[];
for(const B of plan.bridges){
 const {st,Y,G,n}=B;let clear=Infinity,at=null;
 for(let i=0;i<=n;i++){
  assert.ok(Number.isFinite(Y[i]),'finite deck height');
  assert.ok(Y[i]>=G[i]+LIFT-1e-6,`${B.id}: deck at ${i} m is ${(Y[i]-G[i]).toFixed(2)} m over the ground`);
  // the drawn road under the deck, at its centre and across its width: the underside must clear it
  for(const o of [-B.w/2,0,B.w/2])for(const dl of [-1.5,0,1.5]){const r=surface.heightAt(st.X[i]+st.NX[i]*o+st.TX[i]*dl,st.Z[i]+st.NZ[i]*o+st.TZ[i]*dl);
   if(r!==null&&B.k==='road'){const c=Y[i]-DECK_T-r;if(c<clear){clear=c;at=[st.X[i],st.Z[i]];}}}}
 if(B.k==='road'){
  assert.ok(B.crossing.length>0,`${B.id} crosses a drawn road`);
  assert.ok(clear>=4.2,`${B.id}: the deck clears the road by ${clear.toFixed(2)} m at ${at} (needs 4.2 m)`);
  assert.ok(B.maxSlope<=MAX_SLOPE+1e-4,`${B.id}: ramps 1:${(1/B.maxSlope).toFixed(1)} (no steeper than 1:8)`);
  // the ends meet the paths: the deck's first and last metre is at the level of the path on the ground
  for(const i of [0,n])assert.ok(Math.abs(Y[i]-(G[i]+LIFT))<.03,`${B.id}: the deck's end meets the path (${(Y[i]-G[i]-LIFT).toFixed(3)} m off)`);
 }else assert.ok(B.maxSlope<=MAX_SLOPE+1e-4||B.k==='beside','a deck over a gully is no steeper than 1:8: '+B.id+' 1:'+(1/B.maxSlope).toFixed(1));
 for(const q of B.stairs){assert.ok(/^w\d+$/.test(q.id),'mapped steps');assert.ok(q.drop/q.n<=.2,`${q.id}: risers of ${(100*q.drop/q.n).toFixed(0)} cm`);}
 report.push(`${B.id} ${B.k}: ${st.total.toFixed(0)} m, clearance ${B.k==='road'?clear.toFixed(2)+' m':'-'}, steepest 1:${(1/B.maxSlope).toFixed(1)}${B.stairs.length?', steps '+B.stairs.map(q=>q.id+' '+(q.drop).toFixed(1)+' m').join(','):''}`);
}
const built=plan.tunnels.filter(u=>!u.blocked),blocked=plan.tunnels.filter(u=>u.blocked);
assert.ok(built.length>=5,`${built.length} underpasses built (${blocked.map(u=>u.id)} left as they were: a road runs too close beside the path)`);
assert.ok(!plan.tunnels.find(u=>u.id==='w191325643').blocked,'the underpass at Rema is built');
for(const U of built){
 const {st,F,G,ic0,ic1,t0,t1}=U;
 assert.ok(ic1>ic0&&t0<=ic0&&t1>=ic1,'trench and culvert in order');
 assert.ok(U.maxSlope<=MAX_SLOPE+1e-4,`${U.id}: the path down is 1:${(1/U.maxSlope).toFixed(1)} (no steeper than 1:8)`);
 // the path is back on the ground at both ends of what is drawn here
 assert.ok(Math.abs(F[0]-(G[0]+LIFT))<.03&&Math.abs(F[st.n]-(G[st.n]+LIFT))<.03,`${U.id}: the path is on the ground again at both ends`);
 let under=0,head=Infinity,roof=Infinity;
 for(let i=ic0;i<=ic1;i++){
  const r=surface.heightAt(st.X[i],st.Z[i]);
  if(r!==null){under++;head=Math.min(head,r-(F[i]+TUNNEL_H));assert.ok(F[i]<r-3,`${U.id}: the floor lies ${(r-F[i]).toFixed(2)} m under the road`);}
  // the roof slab lies under the ground as it is seen (the road and its verges) across the culvert's width
  for(const o of [-U.w/2-.6,0,U.w/2+.6])roof=Math.min(roof,surface.groundTop(st.X[i]+st.NX[i]*o,st.Z[i]+st.NZ[i]*o)-(F[i]+TUNNEL_H+ROOF_T));
 }
 assert.ok(under>=3,`${U.id}: it passes under a drawn road (${under} m)`);
 assert.ok(head>=.5,`${U.id}: ${head.toFixed(2)} m between the ceiling and the road`);assert.ok(roof>=.1,`${U.id}: the roof lies ${roof.toFixed(2)} m under the ground`);
 report.push(`${U.id}: culvert ${(st.S[ic1]-st.S[ic0]).toFixed(0)} m, trench ${(st.S[ic0]-st.S[t0]).toFixed(0)} + ${(st.S[t1]-st.S[ic1]).toFixed(0)} m, path down 1:${(1/U.maxSlope).toFixed(1)}, ceiling ${head.toFixed(1)} m under the road`);
}

// --- Draw it with stand-ins for world.js's helpers, including a ground mesh on the 8 m lattice for the holes to be cut from -----------------
const tiles=new Map(),bucket=(x,z)=>{const i=Math.floor(x/160),j=Math.floor(z/160),k=i*4096+j;let b=tiles.get(k);if(!b){b={p:new Float32Array(2304),c:new Float32Array(2304),n:0};tiles.set(k,b);}return b;};
const log={quads:[],tris:[],boxes:[]};
const put=(b,a,c,d,col=.2)=>{if(b.n+9>b.p.length){const p=new Float32Array(b.p.length*2),q=new Float32Array(b.p.length*2);p.set(b.p);q.set(b.c);b.p=p;b.c=q;}b.p.set([...a,...c,...d],b.n);b.c.fill(col,b.n,b.n+9);b.n+=9;};
const quad=(b,a,c,d,e,colour)=>{log.quads.push({v:[a,c,d,e],colour});put(b,a,c,d);put(b,a,d,e);},box=(b,x,y,z,wx,wy,wz,colour)=>{log.boxes.push({p:[x,y,z],d:[wx,wy,wz],colour});for(let k=0;k<6;k++){put(b,[x,y,z],[x,y,z],[x,y,z]);put(b,[x,y,z],[x,y,z],[x,y,z]);}};
// the ground, only near the underpasses (as world.js builds it: two triangles a cell, corners on the lattice)
const groundAt=(x,z)=>surface.meshAt(x,z);let groundTris=0;
const cells=new Set();for(const U of built)for(let i=U.t0;i<=U.t1;i++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)cells.add(Math.floor((U.st.X[i]-terrain.x0)/8)+dx+','+(Math.floor((U.st.Z[i]-terrain.z0)/8)+dz));
for(const k of cells){const [i,j]=k.split(',').map(Number),x=terrain.x0+i*8,z=terrain.z0+j*8,A=[x,groundAt(x,z),z],B=[x+8,groundAt(x+8,z),z],C=[x+8,groundAt(x+8,z+8),z+8],D=[x,groundAt(x,z+8),z+8],b=bucket(x,z);put(b,A,B,C,.5);put(b,A,C,D,.5);groundTris+=2;}
// area (seen from above) of the triangles that lie on the ground surface: how much ground there is
const groundArea=()=>{let s=0,k=0;for(const b of tiles.values())for(let o=0;o+9<=b.n;o+=9){const p=b.p,cx=(p[o]+p[o+3]+p[o+6])/3,cz=(p[o+2]+p[o+5]+p[o+8])/3,cy=(p[o+1]+p[o+4]+p[o+7])/3;
 if(b.c[o]!==.5)continue;s+=Math.abs((p[o+3]-p[o])*(p[o+8]-p[o+2])-(p[o+6]-p[o])*(p[o+5]-p[o+2]))/2;k++;}return [s,k];};
const [before]=groundArea();
const registered=[],registerIndex=(x,z,v)=>registered.push([x,z,v.road]);
const t1=performance.now(),out=addFootbridges({data,surface,terrain,bucket,quad,box,index:registerIndex,segments}),drawMs=performance.now()-t1;
const triangles=log.quads.length*2+log.boxes.length*12;
assert.ok(out.ground.removed>=2*built.length,`ground triangles were cut out of the mesh (${out.ground.removed})`);

// --- The holes are cut out of the ground and nothing else: the mesh outside them is the same surface ---------------------------------------
const [after,groundLeft0]=groundArea();
// Every ground triangle that is left lies on the original surface (the same plane), and none has its middle inside a trench.
const inTri=(q,x,z)=>{const s=(a,b)=>(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]),d1=s(q[0],q[1]),d2=s(q[1],q[2]),d3=s(q[2],q[0]);return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0));};
const holes=built.flatMap(trenchHoles);
let leftInHole=0,groundLeft=0;
for(const b of tiles.values())for(let o=0;o+9<=b.n;o+=9){const p=b.p;if(Math.abs(p[o+1]-p[o+4])>8)continue;
 const cx=(p[o]+p[o+3]+p[o+6])/3,cz=(p[o+2]+p[o+5]+p[o+8])/3;
 if(b.c[o]!==.5)continue;groundLeft++;
 if(holes.some(q=>inTri(q,cx,cz)))leftInHole++;}
assert.equal(leftInHole,0,'no ground surface is left inside a trench');
const triArea=q=>Math.abs((q[1][0]-q[0][0])*(q[2][1]-q[0][1])-(q[2][0]-q[0][0])*(q[1][1]-q[0][1]))/2,holeArea=holes.reduce((a,q)=>a+triArea(q),0);
assert.ok(Math.abs(before-after-holeArea)<.03*holeArea+1,`the ground lost ${(before-after).toFixed(0)} m2 and the trenches are ${holeArea.toFixed(0)} m2`);
assert.ok(groundLeft>.8*groundTris,`the ground round the holes is still there (${groundLeft} of ${groundTris} triangles, most of them cut up)`);

// --- No path is drawn on a carriageway at a tunnel, and what street.paths still has keeps out of the trenches ------------------------------
const roadTop=(x,z)=>surface.heightAt(x,z);
for(const q of log.quads.filter(q=>q.colour===COLOURS.ASPHALT))for(const [x,y,z] of q.v){const r=roadTop(x,z);
 if(r!==null&&y>r-1&&y<r+3)assert.fail(`a path (asphalt) at ${x.toFixed(1)},${z.toFixed(1)} lies on a carriageway (${(y-r).toFixed(2)} m over it)`);}
const S=data.street;let samples=0;
for(const U of built){const {st,t0,t1}=U;
 for(const p of S.paths)for(let k=0;k<p.p.length-1;k++){const a=p.p[k],b=p.p[k+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  for(let d=0;d<=len;d+=1){const x=a[0]+(b[0]-a[0])*d/(len||1),z=a[1]+(b[1]-a[1])*d/(len||1);samples++;
   // the stretch of the trench and its walls: no surface path within 1.5 m of the centre line there
   let best=1e9;for(let i=t0;i<=t1;i++)if(i<U.ic0||i>U.ic1)best=Math.min(best,Math.hypot(st.X[i]-x,st.Z[i]-z));
   assert.ok(best>1.6,`street path ${p.o} at ${x.toFixed(1)},${z.toFixed(1)} runs ${best.toFixed(2)} m from the ${U.id} trench`);}}}
assert.ok(S.paths_cut==='footbridges','street.paths was cut by add-footbridges.py');

// --- The crossings at Rema: what is drawn there ----------------------------------------------------------------------------------------------
const RB=plan.bridges.find(b=>b.id==='w191325644'),RU=plan.tunnels.find(t=>t.id==='w191325643');
// the drawn deck (asphalt quads of the bridge) clears the drawn road under it by at least 4.2 m
let drawnClear=Infinity;
for(const q of log.quads.filter(q=>q.colour===COLOURS.ASPHALT))for(const [x,y,z] of q.v){if(Math.hypot(x-RB.st.X[0],z-RB.st.Z[0])>250)continue;const r=roadTop(x,z);if(r!==null&&y>r+1)drawnClear=Math.min(drawnClear,y-DECK_T-r);}
assert.ok(drawnClear>=4.2&&drawnClear<Infinity,`drawn deck over Byåsveien clears it by ${drawnClear.toFixed(2)} m`);
// the dark opening of the underpass faces the path, on both sides of the road, under the roads
const dark=log.quads.filter(q=>q.colour===COLOURS.DARK);assert.ok(dark.length>=2*built.length,'an opening at both mouths of every underpass');
for(const [x,z] of [ru.p[0],ru.p[1]])assert.ok(dark.some(q=>Math.hypot(q.v[0][0]-x,q.v[0][2]-z)<4),`a dark opening at the mouth near ${x},${z}`);

// --- Nothing stands in a house, and the trees keep off -------------------------------------------------------------------------------------
const inRing=(ring,x,z)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
const near=(ring,x,z,m)=>{const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);if(x<Math.min(...xs)-m||x>Math.max(...xs)+m||z<Math.min(...zs)-m||z>Math.max(...zs)+m)return false;if(inRing(ring,x,z))return true;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz||1e-9,t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l));if(Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<m)return true;}return false;};
for(const B of plan.bridges)for(let i=0;i<=B.n;i+=2)for(const o of [-B.w/2,0,B.w/2]){const x=B.st.X[i]+B.st.NX[i]*o,z=B.st.Z[i]+B.st.NZ[i]*o;
 for(const h of data.buildings)if(near(h.p,x,z,1.0))assert.fail(`${B.id}: the deck at ${x.toFixed(1)},${z.toFixed(1)} is within 1 m of building ${h.id||''}`);}
for(const U of built)for(let i=U.t0;i<=U.t1;i+=2)for(const o of [-U.w/2-1.5,0,U.w/2+1.5]){const x=U.st.X[i]+U.st.NX[i]*o,z=U.st.Z[i]+U.st.NZ[i]*o;
 for(const h of data.buildings)if(near(h.p,x,z,.5))assert.fail(`${U.id}: the trench at ${x.toFixed(1)},${z.toFixed(1)} is within .5 m of building ${h.id||''}`);}
for(const B of plan.bridges)for(let i=0;i<=B.n;i+=4){const x=B.st.X[i],z=B.st.Z[i];assert.ok(registered.some(([rx,rz,seg])=>{const [a,b]=seg;const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz||1e-9,t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<.7;}),`${B.id}: trees keep off the deck at ${x.toFixed(0)},${z.toFixed(0)}`);}

// --- Budget: world build time and triangles (+3 % of the 1 859 907 the world had before, 55 797) and the time this takes here --------------------------------------
assert.ok(triangles<=50000,`${triangles} triangles drawn by footbridges.js (at most 50 000, the rest of the +3 % is for what the holes leave behind: ${out.ground.emitted} added, ${out.ground.removed} removed)`);
assert.ok(triangles+out.ground.emitted-out.ground.removed<=55000,'Net triangles within +3 % of the world');
assert.ok(planMs+drawMs<1500,`Plan and draw take ${(planMs+drawMs).toFixed(0)} ms`);
console.log(`Footbridges: ${plan.bridges.length} bridges, ${plan.tunnels.length} underpasses: ${triangles} triangles (+${out.ground.emitted-out.ground.removed} in the ground), plan ${planMs.toFixed(0)} ms, draw ${drawMs.toFixed(0)} ms, ${samples} path samples checked, deck clearance at Rema ${drawnClear.toFixed(2)} m: OK`);
for(const l of report)console.log('  '+l);
