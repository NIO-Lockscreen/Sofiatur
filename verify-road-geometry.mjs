import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {createRoadSurface} from './dist/road-surface.js';
import {addStreetDetails,PATH_COLOURS} from './dist/street-details.js';
import {fillet,bendRadius,maxGrade,pointKey} from './dist/road-geometry.js';
import {roadWidth} from './dist/transit-geometry.js';
import {KIWI_CHARGERS} from './dist/building-details.js';
// The drawn road (road-surface.js) measured as a driver would meet it: level across, smooth along, no gaps at bends or junctions, ground below it.
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),terrain=data.terrain;
function rawHeight(x,z){const a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/terrain.step)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/terrain.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return (h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
const height=(x,z)=>160+(rawHeight(x,z)-160)*1.45,surface=createRoadSurface(data.roads,height,data),geo=surface.geometry,R=geo.roads;
const pct=(list,p)=>{const a=list.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*p))];};
const chainAt=(c,s)=>{let lo=0,hi=c.s.length-1;s=Math.max(0,Math.min(c.len,s));while(hi-lo>1){const m=(lo+hi)>>1;if(c.s[m]<=s)lo=m;else hi=m;}const f=(s-c.s[lo])/((c.s[hi]-c.s[lo])||1),dx=c.x[hi]-c.x[lo],dz=c.z[hi]-c.z[lo],l=Math.hypot(dx,dz)||1;return {x:c.x[lo]+dx*f,z:c.z[lo]+dz*f,tx:dx/l,tz:dz/l,i:lo};};

// 1. Fillets: a pure function, tangent to both segments, spaced at most 2 m, radius as chosen (or limited to 45 % of the shorter segment).
{const a=[0,0],v=[100,0],b=[100,100],p1=fillet(a,v,b,'tertiary'),p2=fillet(a,v,b,'tertiary');
 assert.deepEqual(p1,p2,'fillet is a pure function of (prev, vertex, next, type)');
 assert.ok(Math.abs(p1[0][1])<1e-9&&Math.abs(p1.at(-1)[0]-100)<1e-9,'arc starts on the first segment and ends on the second');
 assert.ok(Math.abs(p1[0][0]-(100-bendRadius('tertiary')))<1e-6,'tangent length = radius for a right angle');
 for(let i=1;i<p1.length;i++)assert.ok(Math.hypot(p1[i][0]-p1[i-1][0],p1[i][1]-p1[i-1][1])<=2.001,'arc samples at most 2 m apart');
 const mid=p1[Math.floor(p1.length/2)],c=[100-bendRadius('tertiary'),bendRadius('tertiary')];assert.ok(Math.abs(Math.hypot(mid[0]-c[0],mid[1]-c[1])-bendRadius('tertiary'))<1e-6,'points lie on a circle of the bend radius');
 const tight=fillet([0,0],[10,0],[10,10],'secondary');assert.ok(Math.abs(tight[0][0]-5.5)<1e-6,'tangent length limited to 45 % of the adjacent segment');
 assert.equal(fillet([0,0],[10,0],[20,0],'service').length,1,'a straight vertex stays as it is');console.log('Fillets: pure, tangent, circular, limited by the segments: OK');}

// 2. Fixed points never move: edge ends (junctions, road ends, parking places) and roundabout rings appear in the dense centre lines.
{const dense=new Map();for(const r of R)for(const p of r.pts)dense.set(pointKey(p),1);let ends=0;const fixed=new Set();
 for(const e of data.edges){for(const n of [e.path[0],e.path.at(-1)])fixed.add(n);if(e.roundabout)for(const n of e.path)fixed.add(n);}
 for(const n of fixed){const p=data.nodes[n];if(!p)continue;const onRoad=data.roads.some(r=>r.p.some(q=>pointKey(q)===pointKey(p)));if(!onRoad)continue;ends++;assert.ok(dense.has(pointKey(p)),`fixed node ${n} keeps its position`);}
 assert.ok(ends>300);console.log(`Fixed points: ${ends} edge ends and ring nodes exactly where the map has them: OK`);}

// 3. Car centre line follows the same smoothed road: every edge line passes its nodes and has no gaps.
{let checked=0;for(const e of data.edges){const line=geo.edgeLine(e.path);checked++;assert.ok(line.length>=2,`edge ${e.id} has a line`);
  for(let i=1;i<line.length;i++)assert.ok(Math.hypot(line[i][0]-line[i-1][0],line[i][1]-line[i-1][1])<=2.2,`edge ${e.id}: samples at most 2 m apart`);
  for(const n of [e.path[0],e.path.at(-1)]){const q=data.nodes[n];assert.ok(line.some(p=>Math.hypot(p[0]-q[0],p[1]-q[1])<.02),`edge ${e.id} passes its end node`);}}
 console.log(`Edge lines: ${checked} edges, continuous and through their nodes: OK`);}

// 4. Cross slope: the carriageway is level across (ribbons), sampled with the drawn surface both sides of the centre line. Where a ribbon meets a steep junction corner
// (a neighbouring arm leaves at a level the short curb return cannot reach) its first 4 m tilt into the patch instead of ending in a step face: those throat samples are
// counted apart, and may tilt, but only gently.
{const slopes=[],throat=[];
 for(const rb of geo.ribbons){const c=rb.c,off=rb.hw-.15,tilted=a=>a&&(a.wL||a.wR);for(let s=rb.s0+.5;s<rb.s1-.5;s+=3){const p=chainAt(c,s),nx=-p.tz,nz=p.tx,l=surface.heightAt(p.x+nx*off,p.z+nz*off),r=surface.heightAt(p.x-nx*off,p.z-nz*off);if(l===null||r===null)continue;
  const v=Math.abs(l-r)/(2*off)*100;(tilted(rb.arm0)&&s-rb.s0<4||tilted(rb.arm1)&&rb.s1-s<4?throat:slopes).push(v);}}
 const p99=pct(slopes,.99),within=slopes.filter(v=>v<=3).length/slopes.length;
 assert.ok(within>=.99,`carriageway cross slope <= 3 % on 99 % of samples (${(within*100).toFixed(2)} %)`);
 assert.ok(throat.length<slopes.length*.03&&pct(throat,.99)<=30,`throats of steep corners are few (${throat.length}) and tilt gently (99th percentile ${pct(throat,.99).toFixed(1)} %)`);
 console.log(`Cross slope: ${slopes.length} samples, ${(within*100).toFixed(2)} % at most 3 %, 99th percentile ${p99.toFixed(2)} % (median ${pct(slopes,.5).toFixed(2)} %); ${throat.length} throat samples tilt into a steep corner, 99th percentile ${pct(throat,.99).toFixed(1)} %: OK`);}

// 5. Profile: grade changes per 8 m on the drawn surface along every road, and the grade itself.
{let len=0,kinks=0,steep=0;const grades=[];
 for(const c of geo.chains){if(c.len<12)continue;const h=[];for(let s=0;s<=c.len;s+=4){const p=chainAt(c,s),y=surface.heightAt(p.x,p.z);h.push(y===null?NaN:y);}
  for(let i=0;i+2<h.length;i++){if(Number.isNaN(h[i])||Number.isNaN(h[i+1])||Number.isNaN(h[i+2]))continue;const g0=(h[i+1]-h[i])/4,g1=(h[i+2]-h[i+1])/4;len+=4;grades.push(Math.abs(g0));if(Math.abs(g1-g0)>.06)kinks++;if(Math.abs(g0)>.3)steep++;}}
 const share=1-kinks*4/len;assert.ok(share>=.99,`no profile kinks over 6 % per 8 m on 99 % of the road length (${(share*100).toFixed(2)} %)`);
 assert.ok(steep*4/len<.01,'grades over 30 % are rare');console.log(`Profile: ${(share*100).toFixed(2)} % of ${(len/1000).toFixed(1)} km without kinks over 6 % per 8 m; grade median ${(pct(grades,.5)*100).toFixed(1)} %, 99th ${(pct(grades,.99)*100).toFixed(1)} %, max ${(Math.max(...grades)*100).toFixed(1)} %: OK`);}

// 6. No gaps: every point within width/2 - 0.1 m of a smoothed centre line is drawn.
{let n=0,gaps=0;const worst=[];
 for(const c of geo.chains){const hw=R[c.ri[0]].hw;for(let s=0;s<=c.len;s+=1.5){const p=chainAt(c,s),w=R[c.ri[Math.min(p.i,c.ri.length-1)]].hw-.1;for(const side of [-1,0,1]){const y=surface.heightAt(p.x-p.tz*w*side,p.z+p.tx*w*side);n++;if(y===null){gaps++;if(worst.length<5)worst.push([p.x.toFixed(1),p.z.toFixed(1)]);}}}}
 assert.ok(gaps/n<=.0005,`no gaps at bends or junctions (${gaps} of ${n} samples uncovered, e.g. ${worst.map(w=>w.join(',')).join(' ')})`);console.log(`Coverage: ${n} samples within half a width of the centre lines, ${gaps} uncovered: OK`);}

// 7. Junction patches cover the area between the arms near the node, and meet the arms without a step.
{let nodes=0,uncovered=0,holes=0,steps=0,mouths=0,worstStep=0;
 for(const pt of geo.patches){nodes++;const before=uncovered;
  // Any point within 2 m of the node that lies on one of the arms' carriageways (half a width either side of its axis, ahead of the node) must be drawn.
  for(let a=0;a<360;a+=20)for(const r of [.5,1.2,2]){const x=Math.cos(a*Math.PI/180)*r,z=Math.sin(a*Math.PI/180)*r;if(!pt.arms.some(m=>x*m.d[0]+z*m.d[1]>=-.1&&Math.abs(x*m.d[1]-z*m.d[0])<=m.w-.1))continue;if(surface.heightAt(pt.x+x,pt.z+z)===null)uncovered++;}
  for(const ch of pt.chains)for(let k=0;k+1<ch.pts.length;k++){const p=[(ch.pts[k][0]+ch.pts[k+1][0])/2,(ch.pts[k][1]+ch.pts[k+1][1])/2],dx=pt.x-p[0],dz=pt.z-p[1],l=Math.hypot(dx,dz)||1;if(l<.5)continue;if(surface.heightAt(p[0]+dx/l*.25,p[1]+dz/l*.25)===null)uncovered++;}
  if(uncovered>before)holes++;
  for(const m of pt.mouths){const a=m.arm;if(!a.chain||a.t<.3)continue;const c=a.chain,s=c.s[a.ci]+a.sign*a.t,q=chainAt(c,s),ux=a.sign*q.tx,uz=a.sign*q.tz; // along the road, away from the node
   const inside=surface.heightAt(q.x-ux*.03,q.z-uz*.03),outside=surface.heightAt(q.x+ux*.03,q.z+uz*.03);if(inside===null||outside===null)continue;mouths++;const d=Math.abs(inside-outside);worstStep=Math.max(worstStep,d);if(d>.03)steps++;}}
 assert.ok(holes<=nodes*.01,`patches cover the hub and the corners of the junctions (${holes} of ${nodes} patches leave a hole, ${uncovered} points)`);
 assert.ok(steps/mouths<=.01,`heights continuous where arms meet junction patches (${steps} of ${mouths} mouths step by more than 3 cm, worst ${(worstStep*100).toFixed(1)} cm)`);
 console.log(`Junctions: ${nodes-holes} of ${nodes} patches cover their hubs and curb returns completely (${holes} leave a small notch); ${mouths} arm mouths, ${steps} step more than 3 cm (worst ${(worstStep*100).toFixed(1)} cm): OK`);}

// 8. The ground lies below the carriageway wherever the road is drawn.
{let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const all=[...surface.quads.filter(q=>!q.kerb),...surface.extra.filter(q=>!q.kerb&&!q.grass)];let n=0,bad=0,worst=-9;
 for(let k=0;k<200000;k++){const q=all[Math.floor(rnd()*all.length)],c=q.corners;let a=rnd(),b=rnd();if(a+b>1){a=1-a;b=1-b;}const x=c[0][0]+(c[1][0]-c[0][0])*a+(c[2][0]-c[0][0])*b,z=c[0][2]+(c[1][2]-c[0][2])*a+(c[2][2]-c[0][2])*b;if(x>terrain.x0+(terrain.nx-1)*terrain.step-8||z>terrain.z0+(terrain.nz-1)*terrain.step-8)continue; // beyond the ground mesh there is no ground to poke through
  const top=surface.heightAt(x,z);if(top===null)continue;n++;const gap=surface.meshAt(x,z)-top;worst=Math.max(worst,gap);if(gap>-.02)bad++;}
 assert.ok(bad/n<=.0005,`ground below the carriageway (${bad} of ${n} samples within 2 cm, closest ${worst.toFixed(3)} m)`);console.log(`Ground: ${n} samples on the carriageway, ${bad} not below it (closest ${worst.toFixed(3)} m): OK`);}

// 9. The bridge keeps a straight deck between its ends, and roundabout rings are round and level enough to drive.
{const bridges=geo.roads.filter(r=>r.bridge);assert.ok(bridges.length>=2,'Kystadbrua and Dalgårdbrua are bridges');
 // Along each deck's own centre line the level rises or falls evenly with the distance travelled (a curved deck, like Dalgårdbrua, too).
 for(const bridge of bridges){const n=bridge.pts.length,L=bridge.s[n-1],y0=bridge.y[0],y1=bridge.y[n-1];let worst=0;
  for(let i=0;i<n;i++)worst=Math.max(worst,Math.abs(bridge.y[i]-(y0+(y1-y0)*bridge.s[i]/L)));
  assert.ok(worst<.06,`${bridge.road.name}: the deck is a straight ramp between its ends (${worst.toFixed(3)} m)`);}
 const rings=R.filter(r=>r.ring);assert.ok(rings.length>=8,'roundabout rings found');
 for(const r of rings){const n=r.pts.length-1;let cx=0,cz=0;for(let i=0;i<n;i++){cx+=r.pts[i][0];cz+=r.pts[i][1];}cx/=n;cz/=n;const rad=r.pts.slice(0,n).map(p=>Math.hypot(p[0]-cx,p[1]-cz));
  for(let i=0;i<n;i++){const p=r.pts[i],q=r.pts[i+1],k=r.pts[(i+2)%n];const turn=Math.abs(Math.atan2((q[0]-p[0])*(k[1]-q[1])-(q[1]-p[1])*(k[0]-q[0]),(q[0]-p[0])*(k[0]-q[0])+(q[1]-p[1])*(k[1]-q[1])));assert.ok(turn<3*2*Math.PI/n,`ring bends evenly (${(turn*180/Math.PI).toFixed(1)} degrees at sample ${i}, on average ${(360/n).toFixed(1)}): round, no polygon corners`);}
  const ys=[];for(let i=0;i<n;i+=4)ys.push(surface.heightAt(r.pts[i][0],r.pts[i][1]));assert.ok(ys.every(v=>v!==null),'ring is drawn all round');}
 console.log(`Bridge deck straight, ${rings.length} rings round: OK`);}

// 10. Junction wedges: within 24 m of a node, beside an arm (up to 5 m beyond its kerb) and between it and its neighbour arm (8 to 100 degrees apart), the ground lies at most 0.3 m above that arm's road.
{let seed=11;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};let n=0,bad=0,worst=-9;
 for(const pt of geo.patches){const arms=pt.arms,m=arms.length;
  for(let i=0;i<m;i++){const A=arms[i],B=arms[(i+1)%m];let th=Math.atan2(B.d[1],B.d[0])-Math.atan2(A.d[1],A.d[0]);if(th<=1e-6)th+=Math.PI*2;if(th<.14||th>1.75)continue;
   for(const [arm,side] of [[A,1],[B,-1]]){if(R[arm.ri].bridge)continue;const nx=-arm.d[1]*side,nz=arm.d[0]*side;
    for(let k=0;k<12;k++){const s=rnd()*24,o=arm.w+.7+.3+rnd()*4.4,x=pt.x+arm.d[0]*s+nx*o,z=pt.z+arm.d[1]*s+nz*o,dx=x-pt.x,dz=z-pt.z;
     if(A.d[0]*dz-A.d[1]*dx<.02*Math.hypot(dx,dz)||dx*B.d[1]-dz*B.d[0]<.02*Math.hypot(dx,dz)||surface.heightAt(x,z)!==null)continue; // outside the wedge, or on a road
     const level=surface.heightAt(pt.x+arm.d[0]*s,pt.z+arm.d[1]*s);if(level===null)continue;n++;const gap=surface.meshAt(x,z)-level;worst=Math.max(worst,gap);if(gap>.3)bad++;}}}}
 assert.ok(n>10000&&bad/n<=.002,`ground in junction wedges at most 0.3 m above the arms (${bad} of ${n} samples, worst ${worst.toFixed(2)} m)`);console.log(`Wedges: ${n} ground samples between arms within 24 m of a node, ${bad} more than 0.3 m above the arm's road (worst ${worst.toFixed(2)} m): OK`);}

// 11. Sidewalks and gang- og sykkelvei lie on the visible ground: the ground mesh, or the verge strip over it. street-details.js is given surface.groundTop; the ground is found again here, by brute force.
{const globalDocument=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}}),width:0,height:0})};
 const lower=(x,z)=>height(x,z)+surface.lowerAt(x,z),roadTop=(x,z)=>surface.heightAt(x,z)??lower(x,z)+.39,quads=[];
 addStreetDetails({T,scene:new T.Scene(),data,height:lower,roadTop,bucket:()=>({}),tri(){},quad:(b,a,c,d,e,colour)=>{if(PATH_COLOURS.has(colour))quads.push([a,c,d,e]);},box(){},ribbon(){},groundPoly(){},ground:surface.groundTop});
 const cells=new Map(),vq=surface.verges;for(let q=0;q<vq.length;q++){const c=vq[q].corners,xs=c.map(p=>p[0]),zs=c.map(p=>p[2]);for(let i=Math.floor(Math.min(...xs)/8);i<=Math.floor(Math.max(...xs)/8);i++)for(let j=Math.floor(Math.min(...zs)/8);j<=Math.floor(Math.max(...zs)/8);j++){const k=i*4096+j;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(q);}}
 const inTri=(x,z,a,b,d)=>{const dd=(b[2]-d[2])*(a[0]-d[0])+(d[0]-b[0])*(a[2]-d[2]);if(Math.abs(dd)<1e-9)return null;const u=((b[2]-d[2])*(x-d[0])+(d[0]-b[0])*(z-d[2]))/dd,v=((d[2]-a[2])*(x-d[0])+(a[0]-d[0])*(z-d[2]))/dd,w=1-u-v;if(u<-1e-6||v<-1e-6||w<-1e-6)return null;return u*a[1]+v*b[1]+w*d[1];};
 const visible=(x,z)=>{let top=surface.meshAt(x,z);for(const q of cells.get(Math.floor(x/8)*4096+Math.floor(z/8))||[]){const c=vq[q].corners;for(const t of [[c[0],c[1],c[2]],[c[0],c[2],c[3]]]){const y=inTri(x,z,...t);if(y!==null&&y>top)top=y;}}return top;};
 const above=[],end=[terrain.x0+(terrain.nx-1)*terrain.step-8,terrain.z0+(terrain.nz-1)*terrain.step-8];
 for(const q of quads)for(const [u,v] of [[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]]){const P=k=>q[0][k]*(1-u)*(1-v)+q[1][k]*u*(1-v)+q[2][k]*u*v+q[3][k]*(1-u)*v,x=P(0),z=P(2);if(x>end[0]||z>end[1])continue;above.push(P(1)-visible(x,z));}
 globalThis.document=globalDocument;
 const hidden=above.filter(v=>v<.05).length/above.length,proud=above.filter(v=>v>.5).length/above.length,med=pct(above,.5);
 assert.ok(quads.length>5000&&hidden<=.01&&proud<=.01&&med>.15&&med<.3,`paths lie on the visible ground (${(hidden*100).toFixed(2)} % hidden, ${(proud*100).toFixed(2)} % stand out, median ${med.toFixed(3)} m above it)`);
 console.log(`Paths: ${quads.length} path pieces, ${above.length} samples: ${(hidden*100).toFixed(2)} % under the visible ground, ${(proud*100).toFixed(2)} % more than 0.5 m over it, median ${med.toFixed(3)} m above it (the lift): OK`);}

// 12. No verge strip lies above a carriageway: sampled inside every strip, the drawn road below is not more than 5 cm under the strip (a bridge deck over it does not count).
{let bad=0;
 for(const q of surface.verges){const c=q.corners;let hit=false;
  for(const [u,v] of [[.5,.3],[.5,.6],[.5,.9],[.2,.5],[.8,.5],[.2,.9],[.8,.9]]){const P=k=>{const ax=c[0][k]+(c[3][k]-c[0][k])*u,bx=c[1][k]+(c[2][k]-c[1][k])*u;return ax+(bx-ax)*v;},y=P(1),top=surface.heightAt(P(0),P(2));if(top!==null&&y>top+.05&&y-top<8){hit=true;break;}}
  if(hit)bad++;}
 assert.ok(bad<=surface.verges.length*.001,`no verge above a carriageway (${bad} of ${surface.verges.length} strips)`);console.log(`Verges: ${surface.verges.length} strips, ${bad} lie over a carriageway: OK`);}

// 13. Bridges: the valley stays under a deck (the ground is not lowered there), no junction patch or verge runs along a deck, and a road under a deck keeps its own level.
{const bridges=R.filter(r=>r.bridge);let checked=0;
 for(const b of bridges){const n=b.pts.length,L=b.s[n-1];
  for(let s=10;s<=L-10;s+=4){let i=0;while(i<n-2&&b.s[i+1]<s)i++;const f=(s-b.s[i])/((b.s[i+1]-b.s[i])||1),x=b.pts[i][0]+(b.pts[i+1][0]-b.pts[i][0])*f,z=b.pts[i][1]+(b.pts[i+1][1]-b.pts[i][1])*f;
   checked++;assert.ok(Math.abs(surface.lowerAt(x,z))<.02,`${b.road.name}: the ground under the deck at ${s.toFixed(0)} m is not lowered (${surface.lowerAt(x,z).toFixed(2)} m)`);
   for(const q of surface.verges)if(Math.abs(q.x-x)<b.hw+2&&Math.abs(q.z-z)<b.hw+2)assert.fail(`${b.road.name}: a verge runs along the deck at ${s.toFixed(0)} m`);}}
 for(const pt of geo.patches)for(const a of pt.arms)if(R[a.ri].bridge)assert.equal(a.t,0,'a junction patch stops at the abutment: no setback onto a deck');
 assert.ok(bridges.length>=2&&checked>40);console.log(`Bridges: ${bridges.length} decks, ${checked} sample points under them with the ground untouched, no patch or verge on a deck: OK`);}
// The chargers at KIWI Dalgård stand beside the car park's bays, off every drawn road (they stood in Drivhusvegen, the way in).
{for(const [x,z] of KIWI_CHARGERS)for(let dx=-1;dx<=1;dx+=.5)for(let dz=-1;dz<=1;dz+=.5)assert.equal(surface.heightAt(x+dx,z+dz),null,`KIWI charger at (${x}, ${z}) is off the road`);
 console.log('KIWI chargers stand beside the parking bays, at least 1 m from any drawn road: OK');}
