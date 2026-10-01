import {segmentIndex,streetSegments} from './transit-geometry.js';
import {fitPath} from './street-details.js';
// Footbridges and pedestrian underpasses (data.footbridges, add-footbridges.py reads them from OpenStreetMap; tags, sizes and what is
// approximate: docs/footbridges.md). Nothing here has its heights in the data: a bridge deck is placed from what the game draws, the
// road under it (surface.heightAt) and the ground as it is seen (surface.groundTop), and a dip under a road is cut into the ground mesh
// below the same two. planFootbridges() is the geometry (no drawing, for the test); addFootbridges() draws it with world.js's helpers.
export const CLEARANCE=4.7; // m from the road to the underside of a deck (Norwegian standard for a footbridge over a road: 4.7 m)
export const DECK_T=.45; // the slab and its edge beams
export const MAX_SLOPE=1/8,RAMP_SLOPE=1/10; // the steepest allowed, and what a ramp is built to (1:10)
export const TUNNEL_H=2.8,ROOF_T=.6,WALL_T=.35; // clear height of an underpass, roof slab, retaining and portal walls
export const LIFT=.24; // paths lie this far over the ground (street-details.js PATH_LIFT for a cycleway)
const FILL_H=1.6; // a ramp lower than this over the ground is closed with concrete sides, higher ones stand on piers
const COL={CONCRETE:'#b6b7b0',EDGE:'#c8c9c2',UNDER:'#cbccc4',DARK:'#22272a',INSIDE:'#3c4144',CEIL:'#2a2e30',ASPHALT:'#6d7573',RAIL:'#8f989b',TIMBER:'#8c6d4b',TIMBER_DARK:'#6f5339',STEP:'#c2c2bb',PIER:'#aeb0a9',LAMP:'#f7f2cc',BLUE:'#1f57a8',WHITE:'#f1f1e8',POLE:'#7f898d'};
export const COLOURS=COL;
const unit=(x,z)=>{const l=Math.hypot(x,z)||1;return [x/l,z/l];};

// ---- stations along a polyline ------------------------------------------------------------------------------------------------
function stationsOf(pts,step=1){
 const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
 const total=cum.at(-1),n=Math.max(2,Math.round(total/step)),X=[],Z=[],S=[];let j=0;
 for(let k=0;k<=n;k++){const s=total*k/n;while(j<pts.length-2&&cum[j+1]<s)j++;const l=cum[j+1]-cum[j]||1,f=Math.max(0,Math.min(1,(s-cum[j])/l));X.push(pts[j][0]+(pts[j+1][0]-pts[j][0])*f);Z.push(pts[j][1]+(pts[j+1][1]-pts[j][1])*f);S.push(s);}
 const NX=[],NZ=[],TX=[],TZ=[];
 for(let i=0;i<=n;i++){const a=Math.max(0,i-2),b=Math.min(n,i+2),[tx,tz]=unit(X[b]-X[a],Z[b]-Z[a]);TX.push(tx);TZ.push(tz);NX.push(-tz);NZ.push(tx);}
 return {X,Z,S,NX,NZ,TX,TZ,n,total,cum,at:arc=>{let k=0;while(k<n&&S[k]<arc-1e-6)k++;return k;}};
}
// The deck's own points with `len0` m of the path before it and `len1` m after it (run-outs: points from the deck end outwards), and straight
// on beyond a run-out that is shorter.
function layout(b,len0,len1){
 const walk=(from,run,len)=>{const out=[];let cur=from,left=len,dir=null;
  for(const q of run){if(left<=.01)break;const l=Math.hypot(q[0]-cur[0],q[1]-cur[1]);dir=unit(q[0]-cur[0],q[1]-cur[1]);
   if(l<=left){out.push([q[0],q[1]]);left-=l;cur=q;}else{out.push([cur[0]+dir[0]*left,cur[1]+dir[1]*left]);left=0;}}
  if(left>.01){const d=dir||unit(from[0]-(run[0]||from)[0],from[1]-(run[0]||from)[1]);out.push([cur[0]+d[0]*left,cur[1]+d[1]*left]);}
  return out;};
 const p=b.p;return [...walk(p[0],b.a,len0).reverse(),...p,...walk(p.at(-1),b.b,len1)].map(q=>[q[0],q[1]]);
}
const nearestOnLine=(pts,x,z)=>{let best=null;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz||1e-9,t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)),px=a[0]+t*dx,pz=a[1]+t*dz,d=Math.hypot(x-px,z-pz);if(!best||d<best.d)best={d,x:px,z:pz,i,t};}return best;};

// ---- a bridge: the deck's plan and height at every metre -----------------------------------------------------------------------
// kinds: road (the deck crosses a drawn road: flat over it at CLEARANCE, straight ramps of 1:10 down to the paths, on to the paths' run-out
// where the OSM way is too short), span (over a gully or a stream: the two path levels joined, never lower than the ground), beside (a deck
// next to a road bridge, level with it and clear of its edge).
export function planBridge(b,surface,roadsById){
 const ground=surface.groundTop,top=surface.heightAt,w=b.w;
 let pts=layout(b,0,0);
 let st=stationsOf(pts),ia=0,ib=0,plateau=0,crossing=[];
 const sample=()=>st.X.map((x,i)=>ground(x,st.Z[i]));
 let G=sample();
 if(b.k==='beside'){ // shift away from the road bridge's edge, and follow its deck
  const road=roadsById.get(b.beside),hw=road.width/2,need=hw+.35+.4+.45+w/2,off=st.X.map((x,i)=>{const n=nearestOnLine(road.p,x,st.Z[i]);return Math.max(0,need-n.d);});
  for(let pass=0;pass<4;pass++)for(let i=1;i<off.length-1;i++)off[i]=(off[i-1]+off[i]+off[i+1])/3;
  pts=st.X.map((x,i)=>{const n=nearestOnLine(road.p,x,st.Z[i]),d=unit(x-n.x,st.Z[i]-n.z);return [x+d[0]*off[i],st.Z[i]+d[1]*off[i]];});
  st=stationsOf(pts);G=sample();
 }
 if(b.k==='road'){
  let e0=0,e1=0;
  for(let iter=0;iter<6;iter++){
   const R=st.X.map((x,i)=>{let r=null;for(const o of [-w/2,0,w/2])for(const dl of [-1.5,0,1.5]){const h=top(x+st.NX[i]*o+st.TX[i]*dl,st.Z[i]+st.NZ[i]*o+st.TZ[i]*dl);if(h!==null&&(r===null||h>r))r=h;}return r;});
   crossing=[];R.forEach((r,i)=>{if(r!==null)crossing.push(i);});
   if(!crossing.length)break;
   ia=Math.max(0,crossing[0]-2);ib=Math.min(st.n,crossing.at(-1)+2);plateau=Math.max(...crossing.map(i=>R[i]))+CLEARANCE+DECK_T;
   const y0=G[0]+LIFT,y1=G[st.n]+LIFT,need0=(plateau-y0)/RAMP_SLOPE-(st.S[ia]-st.S[0]),need1=(plateau-y1)/RAMP_SLOPE-(st.S[st.n]-st.S[ib]);
   const add0=Math.min(90-e0,Math.max(0,need0)),add1=Math.min(90-e1,Math.max(0,need1));
   if(add0<.5&&add1<.5)break;
   if(add0>=.5)e0+=add0+1;if(add1>=.5)e1+=add1+1;
   pts=layout(b,e0,e1);st=stationsOf(pts);G=sample();
  }
 }
 const n=st.n,Y=new Array(n+1).fill(0);
 if(b.k==='road'&&crossing.length){
  const y0=G[0]+LIFT,y1=G[n]+LIFT;
  for(let i=0;i<=n;i++){let y;if(i<ia)y=y0+(plateau-y0)*(st.S[i]-st.S[0])/((st.S[ia]-st.S[0])||1);else if(i>ib)y=y1+(plateau-y1)*(st.S[n]-st.S[i])/((st.S[n]-st.S[ib])||1);else y=plateau;Y[i]=Math.max(y,G[i]+LIFT);}
 }else if(b.k==='beside'){
  const road=roadsById.get(b.beside);
  for(let i=0;i<=n;i++){const q=nearestOnLine(road.p,st.X[i],st.Z[i]),h=top(q.x,q.z);Y[i]=Math.max(h===null?0:h,G[i]+LIFT);}
  for(let pass=0;pass<3;pass++)for(let i=1;i<n;i++)Y[i]=Math.max(G[i]+LIFT,(Y[i-1]+Y[i]+Y[i+1])/3);
 }else{
  // the two path levels joined, but no steeper than 1:9 (a stream in a steep gully: the deck is a little off the path at the lower end)
  const y0=G[0]+LIFT,y1=G[n]+LIFT,dy=Math.max(-st.total/9,Math.min(st.total/9,y1-y0)),ym=(y0+y1)/2;
  for(let i=0;i<=n;i++)Y[i]=Math.max(ym-dy/2+dy*st.S[i]/st.total,G[i]+(i>0&&i<n?.3:LIFT));
  for(let i=1;i<=n;i++)Y[i]=Math.max(Y[i],Y[i-1]-(st.S[i]-st.S[i-1])/9);for(let i=n-1;i>=0;i--)Y[i]=Math.max(Y[i],Y[i+1]-(st.S[i+1]-st.S[i])/9);
 }
 // where the deck is closed with concrete sides (low over the ground) and where it stands on piers
 const solid=Y.map((y,i)=>{for(let k=Math.max(0,i-3);k<=Math.min(n,i+3);k++)if(Y[k]-G[k]>FILL_H)return false;return true;});
 let maxSlope=0;for(let i=1;i<=n;i++)maxSlope=Math.max(maxSlope,Math.abs(Y[i]-Y[i-1])/(st.S[i]-st.S[i-1]));
 // mapped steps that leave the deck or its ramp (OSM highway=steps): a flight from the deck's level down to the path at its foot, where that is a real climb
 const stairs=[];
 for(const sp of b.steps||[]){const att=nearestOnLine(pts,sp.at[0],sp.at[1]);if(!att||att.d>3)continue;
  const i=Math.min(n,Math.round(st.at(0)+(st.cum[att.i]+att.t*Math.hypot(pts[att.i+1][0]-pts[att.i][0],pts[att.i+1][1]-pts[att.i][1]))/(st.total/n))),top=Y[i],foot=sp.p.at(-1),bottom=ground(foot[0],foot[1])+LIFT,drop=top-bottom;
  if(drop<.6)continue;
  const side=(sp.p[1][0]-sp.p[0][0])*st.NX[i]+(sp.p[1][1]-sp.p[0][1])*st.NZ[i]>0?1:-1;
  stairs.push({id:sp.id,p:sp.p,at:i,top,bottom,drop,n:Math.max(3,Math.round(drop/.16)),side,length:sp.p.reduce((l,q,k)=>k?l+Math.hypot(q[0]-sp.p[k-1][0],q[1]-sp.p[k-1][1]):0,0)});}
 return {...b,st,G,Y,ia,ib,plateau,solid,maxSlope,crossing,n,stairs,ramp:b.k==='road'?{a:st.S[ia]-st.S[0],b:st.S[n]-st.S[ib]}:null};
}

// ---- an underpass: the floor's level along the way in, the culvert, and the trench to its mouth -------------------------------------
// The culvert's floor is as high as it can be with its roof (ROOF_T over TUNNEL_H) under the ground as it is seen (the verge, the road),
// the floor then falls or rises at most RAMP_SLOPE-ish away from the mouths until it meets the path on the ground again.
export function planTunnel(t,surface){
 const ground=surface.groundTop,W=t.w;
 let e0=0,e1=0,m=RAMP_SLOPE,res=null;
 for(let grow=0;grow<4;grow++){
  const pts=layoutTunnel(t,70+e0,70+e1),st=stationsOf(pts),G=st.X.map((x,i)=>ground(x,st.Z[i])),n=st.n;
  // the culvert: from the first OSM node to the second (the two ends of the tunnel way)
  const arc0=st.cum[pts.findIndex(q=>q[0]===t.p[0][0]&&q[1]===t.p[0][1])],ic0=st.at(arc0),ic1=st.at(arc0+Math.hypot(t.p[1][0]-t.p[0][0],t.p[1][1]-t.p[0][1]));
  const Fc=[];for(let i=ic0;i<=ic1;i++){let cap=1e9;for(const o of [-W/2-.6,0,W/2+.6])cap=Math.min(cap,ground(st.X[i]+st.NX[i]*o,st.Z[i]+st.NZ[i]*o));Fc.push(cap-.14-ROOF_T-TUNNEL_H);}
  // The floor rises from the culvert at the same slope on both sides (1:10), or as steep as 1:8 where a road runs beside the path out there: the trench
  // must be closed before it, for the walls and the hole in the ground would cut the road.
  const wide=W/2+.9+WALL_T+.3,bad=st.X.map((x,i)=>[-wide,0,wide].some(o=>{const px=x+st.NX[i]*o,pz=st.Z[i]+st.NZ[i]*o,r=surface.heightAt(px,pz);return r!==null&&Math.abs(r-surface.meshAt(px,pz))<2;}));
  const floor=(mA,mB)=>{const mc=Math.min(mA,mB),f=new Array(n+1);
   for(let i=ic0;i<=ic1;i++){let v=1e9;for(let j=ic0;j<=ic1;j++)v=Math.min(v,Fc[j-ic0]+mc*Math.abs(st.S[i]-st.S[j]));f[i]=v;}
   for(let i=ic0-1;i>=0;i--)f[i]=f[i+1]+mA*(st.S[i+1]-st.S[i]);
   for(let i=ic1+1;i<=n;i++)f[i]=f[i-1]+mB*(st.S[i]-st.S[i-1]);
   return f.map((v,i)=>Math.min(v,G[i]+LIFT));};
  let limA=0,limB=n;for(let i=ic0-5;i>=0;i--)if(bad[i]){limA=Math.min(ic0-6,i+2);break;}for(let i=ic1+5;i<=n;i++)if(bad[i]){limB=Math.max(ic1+6,i-2);break;}
  let mA=RAMP_SLOPE,mB=RAMP_SLOPE,F=floor(mA,mB);
  for(let k=0;k<8&&mA<.12;k++){if(F[limA]>=G[limA]+LIFT-.004)break;mA=Math.min(.12,mA*1.06);F=floor(mA,mB);}
  for(let k=0;k<8&&mB<.12;k++){if(F[limB]>=G[limB]+LIFT-.004)break;mB=Math.min(.12,mB*1.06);F=floor(mA,mB);}
  m=Math.max(mA,mB);
  // the trench is where the floor lies below the ground; the culvert is the part under the road
  let t0=ic0;while(t0>0&&F[t0-1]<G[t0-1]-.05)t0--;let t1=ic1;while(t1<n&&F[t1+1]<G[t1+1]-.05)t1++;
  // where the path leaves the ground: the first station out from the trench at which the floor is under the path on the ground
  let p0=t0;while(p0>0&&F[p0-1]<G[p0-1]+LIFT-.004)p0--;let p1=t1;while(p1<n&&F[p1+1]<G[p1+1]+LIFT-.004)p1++;
  res={...t,st,G,F,ic0,ic1,t0,t1,p0,p1,n,slope:m};
  // still open at a run-out's end (the ground climbs faster than the path may): run the path on, straight, and try again
  if(t0>0&&t1<n)break;
  if(t0===0)e0+=30;if(t1===n)e1+=30;
 }
 let maxSlope=0;for(let i=res.t0+1;i<=res.t1;i++)maxSlope=Math.max(maxSlope,Math.abs(res.F[i]-res.F[i-1])/(res.st.S[i]-res.st.S[i-1]));
 res.maxSlope=maxSlope;
 // A trench that would cut a road (the path runs beside one, too close for walls and a hole in the ground) is not built: the path then just ends at the road, as before.
 res.blocked=trenchHoles(res).some(h=>h.some(p=>{const r=surface.heightAt(p[0],p[1]);return r!==null&&Math.abs(r-surface.meshAt(p[0],p[1]))<2;}));
 return res;
}
// The ways on from the mouths are smoothed (corners cut, twice) so that the walls of a trench do not kink where a path turns sharply.
const chaikin=(pts,iters=2)=>{let q=pts;for(let k=0;k<iters;k++){const r=[q[0]];for(let i=0;i<q.length-1;i++){const a=q[i],b=q[i+1];if(i>0)r.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25]);if(i<q.length-2)r.push([a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}r.push(q.at(-1));q=r;}return q;};
function layoutTunnel(t,len0,len1){
 // 80 m is far enough: the run-out is cut to what is used afterwards anyway
 const smooth=(node,run)=>run.length>1?chaikin([node,...run]).slice(1):run;
 return layout({p:t.p,a:smooth(t.p[0],t.a),b:smooth(t.p.at(-1),t.b)},len0,len1);}

// Half the clear width of the trench at station i: the culvert's, wider by up to .9 m over the last 4 m before a mouth (the wing walls).
export const trenchHalf=(U,i)=>{const d=i<=U.ic0?U.ic0-i:i-U.ic1;return U.w/2+(d<4?.9*(1-d/4):0);};
// The hole in the ground over a trench, as triangles (a twisted quad at a sharp bend is still cut out whole): out to the outer face of the walls.
export function trenchHoles(U){
 const {st}=U,out=[];
 for(const [a,z] of [[U.t0,U.ic0],[U.ic1,U.t1]])for(let i=a;i<z;){
  // 3 m pieces, 1 m ones in the last 5 m before a mouth (where the wing walls flare); a straight cut across a gentle bend is within a few cm
  const near=Math.min(Math.abs(i-U.ic0),Math.abs(i-U.ic1))<6,j=Math.min(z,i+(near?1:3)),li=trenchHalf(U,i)+WALL_T,lj=trenchHalf(U,j)+WALL_T,
   L0=[st.X[i]+st.NX[i]*li,st.Z[i]+st.NZ[i]*li],R0=[st.X[i]-st.NX[i]*li,st.Z[i]-st.NZ[i]*li],L1=[st.X[j]+st.NX[j]*lj,st.Z[j]+st.NZ[j]*lj],R1=[st.X[j]-st.NX[j]*lj,st.Z[j]-st.NZ[j]*lj];
  out.push([L0,L1,R1],[L0,R1,R0]);i=j;}
 return out;
}
export function planFootbridges({data,surface}){
 const fb=data.footbridges||{bridges:[],tunnels:[]},roads=new Map(data.roads.map(r=>[String(r.id),r]));
 return {bridges:fb.bridges.map(b=>planBridge(b,surface,roads)),tunnels:fb.tunnels.map(t=>planTunnel(t,surface))};
}

// ---- polygons: the ground mesh with the trenches cut out -------------------------------------------------------------------------
function clipHalf(poly,ax,az,bx,bz,left){ // part of a convex polygon on the left (or right) of the line a-b
 const out=[],s=p=>{const c=(bx-ax)*(p[1]-az)-(bz-az)*(p[0]-ax);return left?c:-c;};
 for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],sp=s(p),sq=s(q);
  if(sp>=0)out.push(p);
  if((sp>=0)!==(sq>=0)){const f=sp/(sp-sq);out.push([p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f]);}}
 return out;
}
// polygon minus a convex quad (corners in any order): convex pieces
function minusConvex(poly,quad){
 const area=quad.reduce((a,p,i)=>a+p[0]*quad[(i+1)%quad.length][1]-quad[(i+1)%quad.length][0]*p[1],0),q=area<0?quad.slice().reverse():quad,pieces=[];let rest=poly;
 for(let i=0;i<q.length&&rest.length>=3;i++){const a=q[i],b=q[(i+1)%q.length],out=clipHalf(rest,a[0],a[1],b[0],b[1],false);if(out.length>=3)pieces.push(out);rest=clipHalf(rest,a[0],a[1],b[0],b[1],true);}
 return pieces;
}
// Cut the quads out of the ground mesh that world.js drew on the 8 m lattice (two triangles a cell): those triangles are found in the
// buckets by their corners, removed, and what is left of them is put back with the height of their own plane, so the ground is the same
// everywhere but in the holes.
function pushTri(b,A,B,C,cs){ // as world.js's triV(), with one stored colour (r,g,b) per corner
 if(b.n+9>b.p.length){const p=new Float32Array(b.p.length*2),q=new Float32Array(b.p.length*2);p.set(b.p);q.set(b.c);b.p=p;b.c=q;}
 const n=b.n,p=b.p,k=b.c;p[n]=A[0];p[n+1]=A[1];p[n+2]=A[2];p[n+3]=B[0];p[n+4]=B[1];p[n+5]=B[2];p[n+6]=C[0];p[n+7]=C[1];p[n+8]=C[2];
 for(let v=0;v<3;v++){k[n+3*v]=cs[v][0];k[n+3*v+1]=cs[v][1];k[n+3*v+2]=cs[v][2];}b.n=n+9;}
export function cutGround({holes,bucket,terrain,step=8}){
 const cells=new Map();
 for(const q of holes){const x0=Math.min(...q.map(p=>p[0])),x1=Math.max(...q.map(p=>p[0])),z0=Math.min(...q.map(p=>p[1])),z1=Math.max(...q.map(p=>p[1]));
  for(let j=Math.floor((z0-terrain.z0)/step);j<=Math.floor((z1-terrain.z0)/step);j++)for(let i=Math.floor((x0-terrain.x0)/step);i<=Math.floor((x1-terrain.x0)/step);i++){const k=i+','+j;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(q);}}
 const byBucket=new Map();let removed=0,emitted=0;
 for(const k of cells.keys()){const [i,j]=k.split(',').map(Number),b=bucket(terrain.x0+i*step,terrain.z0+j*step);if(!byBucket.has(b))byBucket.set(b,new Set());byBucket.get(b).add(k);}
 const idx=v=>{const r=Math.round(v);return Math.abs(v-r)<2e-3?r:null;};
 for(const [b,keys] of byBucket){
  const found=[];
  for(let o=0;o+9<=b.n;o+=9){const p=b.p;let i0=1e9,i1=-1e9,j0=1e9,j1=-1e9,ok=true;
   for(let v=0;v<3&&ok;v++){const fi=idx((p[o+3*v]-terrain.x0)/step),fj=idx((p[o+3*v+2]-terrain.z0)/step);if(fi===null||fj===null){ok=false;break;}i0=Math.min(i0,fi);i1=Math.max(i1,fi);j0=Math.min(j0,fj);j1=Math.max(j1,fj);}
   if(ok&&i1-i0===1&&j1-j0===1&&keys.has(i0+','+j0))found.push([o,i0+','+j0]);}
  // remember the triangles, then compact the bucket without them
  const tris=found.map(([o,k])=>({k,v:[0,1,2].map(v=>[b.p[o+3*v],b.p[o+3*v+1],b.p[o+3*v+2]]),c:[0,1,2].map(v=>[b.c[o+3*v],b.c[o+3*v+1],b.c[o+3*v+2]])}));
  for(let f=found.length-1;f>=0;f--){const o=found[f][0],last=b.n-9;if(o!==last){for(let u=0;u<9;u++){b.p[o+u]=b.p[last+u];b.c[o+u]=b.c[last+u];}}b.n=last;}
  removed+=tris.length;
  for(const T of tris){
   let pieces=[T.v.map(p=>[p[0],p[2]])];
   for(const q of cells.get(T.k)){const next=[];for(const pc of pieces)next.push(...minusConvex(pc,q));pieces=next;}
   const [A,B,C]=T.v,den=(B[2]-C[2])*(A[0]-C[0])+(C[0]-B[0])*(A[2]-C[2]),bary=(x,z)=>{const u=((B[2]-C[2])*(x-C[0])+(C[0]-B[0])*(z-C[2]))/den,v=((C[2]-A[2])*(x-C[0])+(A[0]-C[0])*(z-C[2]))/den;return [u,v,1-u-v];},
    yAt=(x,z)=>{const w=bary(x,z);return w[0]*A[1]+w[1]*B[1]+w[2]*C[1];},colourAt=(x,z)=>{const w=bary(x,z);return [0,1,2].map(i=>w[0]*T.c[0][i]+w[1]*T.c[1][i]+w[2]*T.c[2][i]);}; // the ground is painted per corner (look.js)
   for(const pc of pieces){if(pc.length<3||Math.abs(pc.reduce((a,p,i)=>a+p[0]*pc[(i+1)%pc.length][1]-pc[(i+1)%pc.length][0]*p[1],0))<.004)continue;const V=pc.map(p=>[p[0],yAt(p[0],p[1]),p[1]]);
    for(let f=1;f+1<V.length;f++){if(Math.abs((V[f][0]-V[0][0])*(V[f+1][2]-V[0][2])-(V[f+1][0]-V[0][0])*(V[f][2]-V[0][2]))<.002)continue;pushTri(b,V[0],V[f],V[f+1],[V[0],V[f],V[f+1]].map(p=>colourAt(p[0],p[2])));emitted++;}}
  }
 }
 return {removed,emitted};
}

// A path ribbon on the ground, mitred, in 2 m pieces, LIFT over the ground as it is seen.
function pathStrip(bucket,quad,line,width,colour,ground,onRoad){
 const q=[line[0]];for(let i=0;i<line.length-1;i++){const a=line[i],c=line[i+1],k=Math.max(1,Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/2));for(let j=1;j<=k;j++)q.push([a[0]+(c[0]-a[0])*j/k,a[1]+(c[1]-a[1])*j/k]);}
 const sides=q.map((v,i)=>{const d1=unit(v[0]-(q[i-1]||v)[0],v[1]-(q[i-1]||v)[1]),d2=unit((q[i+1]||v)[0]-v[0],(q[i+1]||v)[1]-v[1]),a=i?d1:d2,c=q[i+1]?d2:d1,n1=[-a[1],a[0]],n2=[-c[1],c[0]],m=unit(n1[0]+n2[0],n1[1]+n2[1]),s=Math.min(1.6,1/Math.max(.1,m[0]*n1[0]+m[1]*n1[1]))*width/2;
  const l=[v[0]+m[0]*s,v[1]+m[1]*s],r=[v[0]-m[0]*s,v[1]-m[1]*s];return [[l[0],ground(l[0],l[1])+LIFT,l[1]],[r[0],ground(r[0],r[1])+LIFT,r[1]]];});
 for(let i=0;i<q.length-1;i++){const c=[sides[i][0],sides[i][1],sides[i+1][1],sides[i+1][0]];if(onRoad&&(c.some(p=>onRoad(p[0],p[1],p[2]))||onRoad((q[i][0]+q[i+1][0])/2,(sides[i][0][1]+sides[i+1][1][1])/2,(q[i][1]+q[i+1][1])/2)))continue;quad(bucket(q[i][0],q[i][1]),...c,colour);}
}

// ---- drawing ---------------------------------------------------------------------------------------------------------------------
export function addFootbridges({data,surface,terrain=data.terrain,bucket,quad,box,index,segments}){
 const out={bridges:[],tunnels:[],ground:null,triangles:0};if(!data.footbridges)return out;
 const plan=planFootbridges({data,surface});out.bridges=plan.bridges;out.tunnels=plan.tunnels;
 const ground=surface.groundTop,segs=segments||streetSegments(data.roads),roadIndex=segmentIndex(segs);
 // Is (x,z) far enough from every carriageway for a path `half` m wide beside it (kerb band .7 and a 0.4 m gap, as street-details.js)?
 const offRoad=(x,z,half)=>![...roadIndex.near(x,z,14)].some(([a,b,ww])=>{const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz||1e-9,tt=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l));return Math.hypot(x-a[0]-tt*dx,z-a[1]-tt*dz)<ww/2+1.1+half;});
 // a point at height y on the drawn road (not under it, where a path may run under a bridge deck)
 const onCarriageway=(x,z,y)=>{const r=surface.heightAt(x,z);return r!==null&&y>r-1.2;};
 // a thin bar between two points, as a box turned to the bar's direction
 const bar=(b,a,c,w,h,colour)=>{const dx=c[0]-a[0],dz=c[2]-a[2],l=Math.hypot(dx,dz);box(b,(a[0]+c[0])/2,(a[1]+c[1])/2,(a[2]+c[2])/2,l+.02,h,w,colour,Math.atan2(-dz,dx));};
 // trees and the like keep off what is drawn here
 const register=(pts,w)=>{for(let i=0;i<pts.length-1;i++){const a=pts[i],c=pts[i+1],len=Math.hypot(c[0]-a[0],c[1]-a[1]),seg=[a,c,w-5];for(let d=0;d<=len;d+=12){const tt=len?d/len:0;index(a[0]+(c[0]-a[0])*tt,a[1]+(c[1]-a[1])*tt,{road:seg});}index(c[0],c[1],{road:seg});}};

 // ---- footbridges ------------------------------------------------------------------------------------------------------------------
 for(const B of plan.bridges){
  const {st,G,Y,solid,w,n}=B,timber=B.k==='span'&&w<3,deck=timber?COL.TIMBER:COL.ASPHALT,face=timber?COL.TIMBER_DARK:COL.CONCRETE,rail=timber?COL.TIMBER_DARK:COL.RAIL,T=timber?.22:DECK_T;
  const at=(i,o,h)=>[st.X[i]+st.NX[i]*o,Y[i]+h,st.Z[i]+st.NZ[i]*o],step=2;
  const hw=w/2,edge=timber?0:.4;
  for(let i=0;i<n;i+=step){const j=Math.min(n,i+step),bk=bucket(st.X[i],st.Z[i]);
   // top: asphalt between concrete edge strips
   if(edge){quad(bk,at(i,-hw+edge,0),at(j,-hw+edge,0),at(j,hw-edge,0),at(i,hw-edge,0),deck);for(const s of [-1,1])quad(bk,at(i,s*(hw-edge),.01),at(j,s*(hw-edge),.01),at(j,s*hw,.01),at(i,s*hw,.01),COL.EDGE);}
   else quad(bk,at(i,-hw,0),at(j,-hw,0),at(j,hw,0),at(i,hw,0),deck);
   // sides and underside: concrete fascia the thickness of the slab; down to the ground where the ramp is low
   const low=solid[i]&&solid[j];
   for(const s of [-1,1]){const gi=G[i]-.15,gj=G[j]-.15;quad(bk,at(i,s*hw,0),at(j,s*hw,0),[st.X[j]+st.NX[j]*s*hw,low?gj:Y[j]-T,st.Z[j]+st.NZ[j]*s*hw],[st.X[i]+st.NX[i]*s*hw,low?gi:Y[i]-T,st.Z[i]+st.NZ[i]*s*hw],face);}
   if(!low)quad(bk,at(i,-hw,-T),at(j,-hw,-T),at(j,hw,-T),at(i,hw,-T),timber?COL.TIMBER_DARK:COL.UNDER);
   // railings: posts every 2 m, a top rail and two lower ones
   for(const s of [-1,1]){const o=s*(hw-.07),a0=at(i,o,0),a1=at(j,o,0);
    if(B.stairs.some(q=>q.side===s&&Math.abs(q.at-i)<=2))continue; // the gap where the steps leave the deck
    box(bk,a0[0],a0[1]+.58,a0[2],.07,1.16,.07,rail);
    const top0=at(i,o,1.14),top1=at(j,o,1.14);bar(bk,top0,top1,.09,.07,rail);
    for(const h of [.78,.42])quad(bk,at(i,o,h),at(j,o,h),at(j,o,h+.04),at(i,o,h+.04),rail);}
  }
  // the mapped steps: from the deck's edge, along the OSM way, a riser every 16 cm
  for(const q of B.stairs){
   const pl=q.p,cum=[0];for(let k=1;k<pl.length;k++)cum.push(cum[k-1]+Math.hypot(pl[k][0]-pl[k-1][0],pl[k][1]-pl[k-1][1]));
   const at=a=>{let k=0;while(k<pl.length-2&&cum[k+1]<a)k++;const l=cum[k+1]-cum[k]||1,f=Math.max(0,Math.min(1,(a-cum[k])/l));return [pl[k][0]+(pl[k+1][0]-pl[k][0])*f,pl[k][1]+(pl[k+1][1]-pl[k][1])*f,unit(pl[k+1][0]-pl[k][0],pl[k+1][1]-pl[k][1])];};
   const a0=hw,len=cum.at(-1)-a0,tread=len/q.n,riser=q.drop/q.n,sw=1.0,bk=bucket(pl[0][0],pl[0][1]);
   const P=(a,o,y)=>{const [x,z,d]=at(a);return [x-d[1]*o,y,z+d[0]*o];};
   for(let k=0;k<q.n;k++){const s0=a0+k*tread,s1=s0+tread,y=q.top-(k+1)*riser;
    quad(bk,P(s0,-sw,y),P(s1,-sw,y),P(s1,sw,y),P(s0,sw,y),COL.STEP);
    quad(bk,P(s0,-sw,y+riser),P(s0,-sw,y),P(s0,sw,y),P(s0,sw,y+riser),COL.EDGE);}
   // side walls down to the ground and rails on both sides, every 2 m
   for(const o of [-sw,sw]){for(let k=0;k<q.n;k+=2){const s0=a0+k*tread,s1=a0+Math.min(q.n,k+2)*tread,ya=q.top-k*riser,yb=q.top-Math.min(q.n,k+2)*riser,pa=P(s0,o,ya),pb=P(s1,o,yb);
     quad(bk,pa,pb,[pb[0],Math.min(ground(pb[0],pb[2]),yb)-.1,pb[2]],[pa[0],Math.min(ground(pa[0],pa[2]),ya)-.1,pa[2]],COL.CONCRETE);
     box(bk,pa[0],pa[1]+.55,pa[2],.07,1.1,.07,COL.RAIL);bar(bk,[pa[0],pa[1]+1.07,pa[2]],[pb[0],pb[1]+1.07,pb[2]],.09,.07,COL.RAIL);quad(bk,[pa[0],pa[1]+.6,pa[2]],[pb[0],pb[1]+.6,pb[2]],[pb[0],pb[1]+.65,pb[2]],[pa[0],pa[1]+.65,pa[2]],COL.RAIL);}}
   register(Array.from({length:Math.ceil(len/8)+1},(_,k)=>{const [x,z]=at(a0+Math.min(len,k*8));return [x,z];}),2*sw+3);
  }
  // piers: heavy ones just outside the road (where the deck crosses one), light ones under the ramps wherever they are open
  const piers=[];
  const free=(x,z)=>surface.heightAt(x,z)===null&&![...roadIndex.near(x,z,6)].some(([a,b,ww])=>{const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz||1e-9,tt=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l));return Math.hypot(x-a[0]-tt*dx,z-a[1]-tt*dz)<ww/2+1.6;});
  const gap=B.k==='road'?7.5:B.k==='beside'?13:1e9,cand=[];
  if(!timber){
   if(B.k==='road'&&B.crossing.length){let i=B.ia;while(i>0&&!free(st.X[i],st.Z[i]))i--;cand.push([i,true]);let lo=i;i=B.ib;while(i<n&&!free(st.X[i],st.Z[i]))i++;cand.push([i,true]);
    for(const [from,dir] of [[lo,-1],[i,1]]){let last=st.S[from];for(let k=from+dir;k>0&&k<n;k+=dir)if(Math.abs(st.S[k]-last)>=gap&&!solid[k]&&free(st.X[k],st.Z[k])){cand.push([k,false]);last=st.S[k];}}}
   else{let last=-gap/2;for(let k=1;k<n;k++)if(st.S[k]-last>=gap&&!solid[k]&&free(st.X[k],st.Z[k])){cand.push([k,false]);last=st.S[k];}}
  }
  for(const [i,heavy] of cand){const g0=Math.min(G[i],ground(st.X[i]+st.NX[i]*hw,st.Z[i]+st.NZ[i]*hw),ground(st.X[i]-st.NX[i]*hw,st.Z[i]-st.NZ[i]*hw))-.6,top=Y[i]-T,bk=bucket(st.X[i],st.Z[i]),ang=Math.atan2(-st.TZ[i],st.TX[i]);
   if(top-g0<.8)continue;
   // a cap beam across the deck under the slab, then a wall (heavy) or two columns
   box(bk,st.X[i],top-.3,st.Z[i],.7,.6,w-.3,COL.PIER,ang);
   if(heavy)box(bk,st.X[i],(g0+top-.6)/2,st.Z[i],.6,top-.6-g0,w-1,COL.PIER,ang);
   else for(const s of [-1,1]){const x=st.X[i]+st.NX[i]*s*(hw-.65),z=st.Z[i]+st.NZ[i]*s*(hw-.65),gg=Math.min(g0,ground(x,z)-.6);box(bk,x,(gg+top-.6)/2,z,.5,top-.6-gg,.5,COL.PIER,ang);}
   piers.push([st.X[i],st.Z[i]]);}
  B.piers=piers;
  // ends: a low concrete end beam where the deck meets the path
  for(const i of [0,n]){const bk=bucket(st.X[i],st.Z[i]);box(bk,st.X[i],Y[i]-.15,st.Z[i],.3,.3,w,COL.EDGE,Math.atan2(-st.TZ[i],st.TX[i]));}
  register(st.X.map((x,i)=>[x,st.Z[i]]).filter((_,i)=>i%6===0||i===n),w+3);
 }

 // ---- underpasses ----------------------------------------------------------------------------------------------------------------------
 const holes=[];
 for(const U of plan.tunnels){
  if(U.blocked){const half=(U.hw==='cycleway'?3:2.2)/2,pts=[];for(let i=0;i<=U.n;i++)if(i<U.ic0||i>U.ic1)pts.push([U.st.X[i],U.st.Z[i]]);
   for(const line of fitPath(pts.filter((_,k)=>k<U.ic0),half,roadIndex).concat(fitPath(pts.filter((_,k)=>k>=U.ic0),half,roadIndex)))pathStrip(bucket,quad,line,half*2,COL.ASPHALT,ground,onCarriageway);continue;}
  const {st,G,F,ic0,ic1,t0,t1,w,n}=U,u0=w/2,hwAt=i=>trenchHalf(U,i);
  const at=(i,o,y)=>[st.X[i]+st.NX[i]*o,y,st.Z[i]+st.NZ[i]*o];
  const trench=[[t0,ic0],[ic1,t1]];
  for(const [a,z] of trench)for(let i=a;i<z;i++){const j=i+1,bk=bucket(st.X[i],st.Z[i]);
   const li=hwAt(i),lj=hwAt(j);
   // floor, walls and their tops
   quad(bk,at(i,-li,F[i]),at(j,-lj,F[j]),at(j,lj,F[j]),at(i,li,F[i]),COL.ASPHALT);
   for(const s of [-1,1]){const gi=ground(...[st.X[i]+st.NX[i]*s*(li+WALL_T),st.Z[i]+st.NZ[i]*s*(li+WALL_T)])+.08,gj=ground(...[st.X[j]+st.NX[j]*s*(lj+WALL_T),st.Z[j]+st.NZ[j]*s*(lj+WALL_T)])+.08;
    quad(bk,at(i,s*li,F[i]),at(j,s*lj,F[j]),at(j,s*lj,gj),at(i,s*li,gi),COL.CONCRETE);
    quad(bk,at(i,s*li,gi),at(j,s*lj,gj),at(j,s*(lj+WALL_T+.2),gj),at(i,s*(li+WALL_T+.2),gi),COL.EDGE); // the coping reaches a little over the cut edge of the ground
    // a railing on the rim where the wall is high
    if(gi-F[i]>1.1&&i%2===0){const o=s*(li+WALL_T-.1),a0=at(i,o,gi),a1=at(Math.min(n,i+2),o,ground(st.X[Math.min(n,i+2)]+st.NX[Math.min(n,i+2)]*s*(li+WALL_T),st.Z[Math.min(n,i+2)]+st.NZ[Math.min(n,i+2)]*s*(li+WALL_T))+.08);
     box(bk,a0[0],a0[1]+.55,a0[2],.07,1.1,.07,COL.RAIL);bar(bk,[a0[0],a0[1]+1.08,a0[2]],[a1[0],a1[1]+1.08,a1[2]],.09,.07,COL.RAIL);quad(bk,[a0[0],a0[1]+.6,a0[2]],[a1[0],a1[1]+.6,a1[2]],[a1[0],a1[1]+.64,a1[2]],[a0[0],a0[1]+.64,a0[2]],COL.RAIL);}}
  }
  holes.push(...trenchHoles(U));
  // the culvert: dark inside, and at each mouth a headwall with the opening and a lintel
  for(let i=ic0;i<ic1;i+=3){const j=Math.min(ic1,i+3),bk=bucket(st.X[i],st.Z[i]);
   quad(bk,at(i,-u0,F[i]),at(j,-u0,F[j]),at(j,u0,F[j]),at(i,u0,F[i]),'#4a4f52');
   quad(bk,at(i,-u0,F[i]+TUNNEL_H),at(j,-u0,F[j]+TUNNEL_H),at(j,u0,F[j]+TUNNEL_H),at(i,u0,F[i]+TUNNEL_H),COL.CEIL);
   for(const s of [-1,1])quad(bk,at(i,s*u0,F[i]),at(j,s*u0,F[j]),at(j,s*u0,F[j]+TUNNEL_H),at(i,s*u0,F[i]+TUNNEL_H),COL.INSIDE);
   // a lamp on the ceiling every 6 m (the first ones can be seen from outside)
   if((i-ic0)%6===0){const c=at(i,0,F[i]+TUNNEL_H-.04);box(bk,c[0],c[1],c[2],.9,.08,.3,COL.LAMP,Math.atan2(-st.TZ[i],st.TX[i]));}}
  for(const i of [ic0,ic1]){const bk=bucket(st.X[i],st.Z[i]),li=hwAt(i),tl=ground(st.X[i]+st.NX[i]*(li+WALL_T),st.Z[i]+st.NZ[i]*(li+WALL_T))+.08,tr=ground(st.X[i]-st.NX[i]*(li+WALL_T),st.Z[i]-st.NZ[i]*(li+WALL_T))+.08;
   // the headwall: two pillars beside the opening and a lintel over it, up to the ground; the opening is black
   const yTop=o=>tl+(tr-tl)*((o+li+WALL_T)/(2*(li+WALL_T)));
   quad(bk,at(i,-u0,F[i]+TUNNEL_H),at(i,u0,F[i]+TUNNEL_H),at(i,u0,yTop(u0)),at(i,-u0,yTop(-u0)),COL.CONCRETE);
   for(const s of [-1,1]){const o0=s*u0,o1=s*(li+WALL_T);quad(bk,at(i,o0,F[i]),at(i,o1,F[i]),at(i,o1,yTop(o1)),at(i,o0,yTop(o0)),COL.CONCRETE);}
   quad(bk,at(i,-u0,F[i]),at(i,u0,F[i]),at(i,u0,F[i]+TUNNEL_H),at(i,-u0,F[i]+TUNNEL_H),COL.DARK);}
  // A blue sign for the path (gang- og sykkelveg) on the rim by each mouth, facing the road: the dip can be seen from a car passing over it.
  for(const [i,inw] of [[ic0,1],[ic1,-1]]){const k=Math.max(0,Math.min(n,i-inw*3)),o=hwAt(k)+WALL_T+.75,x=st.X[k]+st.NX[k]*o,z=st.Z[k]+st.NZ[k]*o,y=ground(x,z),bk=bucket(x,z),fx=st.TX[k]*inw,fz=st.TZ[k]*inw,lx=st.NX[k],lz=st.NZ[k];
   box(bk,x,y+1.1,z,.09,2.2,.09,COL.POLE);
   const P=(a,v)=>[x+lx*a+fx*.07,y+2.05+v,z+lz*a+fz*.07],c=P(0,0);
   for(let q=0;q<8;q++){const a0=q/8*Math.PI*2,a1=(q+1)/8*Math.PI*2;quad(bk,c,P(Math.cos(a0)*.38,Math.sin(a0)*.38),P(Math.cos(a1)*.38,Math.sin(a1)*.38),P(Math.cos(a1)*.38,Math.sin(a1)*.38),COL.BLUE);}
   const W=(a,v)=>[x+lx*a+fx*.085,y+2.05+v,z+lz*a+fz*.085]; // a cyclist and a walker, as two white bars side by side
   quad(bk,W(-.2,-.2),W(-.08,-.2),W(-.08,.2),W(-.2,.2),COL.WHITE);quad(bk,W(.05,-.15),W(.2,-.15),W(.2,.12),W(.05,.12),COL.WHITE);}
  // the path: the floor from where it leaves the ground (p0, p1) to the culvert, and on the ground along the run-out beyond (street.paths lost it to the dip),
  // kept off the carriageways as street-details.js keeps its paths
  const half=(U.hw==='cycleway'?3:2.2)/2;
  for(const [a,z] of [[U.p0,ic0],[ic1,U.p1]])for(let i=a;i<z;i++){const j=i+1,bk=bucket(st.X[i],st.Z[i]),li=i<t0||i>=t1?half:hwAt(i),lj=j<=t0||j>t1?half:hwAt(j);
   if((i<t0||i>=t1)&&![[i,-half],[i,half],[j,-half],[j,half]].some(([k,o])=>{const q=at(k,o,F[k]);return onCarriageway(q[0],q[2],q[1]);}))quad(bk,at(i,-half,F[i]),at(j,-half,F[j]),at(j,half,F[j]),at(i,half,F[i]),COL.ASPHALT);}
  for(const [a,z] of [[0,U.p0],[U.p1,n]]){const pts=[];for(let i=a;i<=z;i++)pts.push([st.X[i],st.Z[i]]);
   if(pts.length>1)for(const line of fitPath(pts,half,roadIndex))pathStrip(bucket,quad,line,half*2,COL.ASPHALT,ground,onCarriageway);}
  register(st.X.map((x,i)=>[x,st.Z[i]]).filter((_,i)=>i>=t0&&i<=t1&&i%5===0),w+4);
 }
 if(holes.length){out.ground=cutGround({holes,bucket,terrain});
  // the ground triangles are found by their corners on world.js's 8 m lattice: if the ground is built differently the holes are not cut and the dips are hidden
  if(out.ground.removed<plan.tunnels.filter(u=>!u.blocked).length*4)console.warn('footbridges.js: the ground mesh was not found on the 8 m lattice; the underpasses will be under the ground');}
 return out;
}
