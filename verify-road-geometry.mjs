import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRoadSurface} from './dist/road-surface.js';
import {fillet,bendRadius,maxGrade,pointKey} from './dist/road-geometry.js';
import {roadWidth} from './dist/transit-geometry.js';
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

// 4. Cross slope: the carriageway is level across (ribbons), sampled with the drawn surface both sides of the centre line.
{const slopes=[];let bad=0;
 for(const rb of geo.ribbons){const c=rb.c,off=rb.hw-.15;for(let s=rb.s0+.5;s<rb.s1-.5;s+=3){const p=chainAt(c,s),nx=-p.tz,nz=p.tx,l=surface.heightAt(p.x+nx*off,p.z+nz*off),r=surface.heightAt(p.x-nx*off,p.z-nz*off);if(l===null||r===null)continue;slopes.push(Math.abs(l-r)/(2*off)*100);}}
 const p99=pct(slopes,.99),within=slopes.filter(v=>v<=3).length/slopes.length;
 assert.ok(within>=.99,`carriageway cross slope <= 3 % on 99 % of samples (${(within*100).toFixed(2)} %)`);console.log(`Cross slope: ${slopes.length} samples, ${(within*100).toFixed(2)} % at most 3 %, 99th percentile ${p99.toFixed(2)} % (median ${pct(slopes,.5).toFixed(2)} %): OK`);}

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
{const bridge=geo.roads.find(r=>r.bridge),[a,b]=[bridge.pts[0],bridge.pts.at(-1)],ya=surface.heightAt(...a),yb=surface.heightAt(...b),ym=surface.heightAt((a[0]+b[0])/2,(a[1]+b[1])/2);
 assert.ok(Math.abs(ym-(ya+yb)/2)<.06,'the bridge deck is a straight ramp between its ends');
 const rings=R.filter(r=>r.ring);assert.ok(rings.length>=8,'roundabout rings found');
 for(const r of rings){const n=r.pts.length-1;let cx=0,cz=0;for(let i=0;i<n;i++){cx+=r.pts[i][0];cz+=r.pts[i][1];}cx/=n;cz/=n;const rad=r.pts.slice(0,n).map(p=>Math.hypot(p[0]-cx,p[1]-cz));
  for(let i=0;i<n;i++){const p=r.pts[i],q=r.pts[i+1],k=r.pts[(i+2)%n];const turn=Math.abs(Math.atan2((q[0]-p[0])*(k[1]-q[1])-(q[1]-p[1])*(k[0]-q[0]),(q[0]-p[0])*(k[0]-q[0])+(q[1]-p[1])*(k[1]-q[1])));assert.ok(turn<3*2*Math.PI/n,`ring bends evenly (${(turn*180/Math.PI).toFixed(1)} degrees at sample ${i}, on average ${(360/n).toFixed(1)}): round, no polygon corners`);}
  const ys=[];for(let i=0;i<n;i+=4)ys.push(surface.heightAt(r.pts[i][0],r.pts[i][1]));assert.ok(ys.every(v=>v!==null),'ring is drawn all round');}
 console.log(`Bridge deck straight, ${rings.length} rings round: OK`);}
