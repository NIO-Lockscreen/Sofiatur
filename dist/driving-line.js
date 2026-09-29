import {roadWidth} from './transit-geometry.js';
// The car's line through the streets, as a pure geometric model (no three.js). Built on the drawn road's centre lines
// (`roadLine(path)`: [x,z,y] samples along an edge's node path, see road-geometry.js / road-surface.js):
//  - LANES. On a two-way road the car drives a quarter of the carriageway width right of the centre line; on one-way roads,
//    roundabout rings and single-lane service roads it stays centred. Where a lane ends at home, the kindergarten gate or a
//    parking place it eases to the centre so the car stops on the node.
//  - CONNECTORS. At every node the car leaves the lane of the road it came along some metres before the node and joins the
//    lane of the next road some metres after it, on a smooth cubic curve whose radius is as large as the roads allow
//    (around 7 m for a right-angle turn between residential streets, more for gentle turns, never under about 5 m).
//    The setback is the same for every road that can follow, so the car can wait at one stop line ("stopX").
//  - SPEED. Every line carries its curvature; the speed limit along it is sqrt(A_LAT / curvature), brought back
//    along the line by a braking curve (profile()).
// All lengths are metres, all speeds m/s.
export const A_LAT=2.5;      // lateral acceleration the car keeps to
export const STEP=.5;        // spacing of the samples of every line
const FAIR=2.2;              // Gaussian smoothing of a lane, in metres: kinks in the OSM geometry are not driven as corners
const WINDOW=1.5;            // curvature is measured over this far either side (3 m chord)
const CUT=.8;               // how far a lane may cut a bend, at most (metres from the lane; less on narrow roads, where the car stays .5 m off the kerb)
const RAMP=9;                // a lane eases between the centre and its offset over this many metres at home, gate and parking
const MIN_R=5.5;             // the smallest radius a connector aims for (a little over the 5 m the tests hold)
const CUSP=.8;               // speed through the cusp of a three-point turn
const TOP=60;                // no curvature limit above this speed
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---- paths: samples with cumulative distance --------------------------------------------------------------------
export function pathOf(pts){
 const n=pts.length,x=new Float64Array(n),z=new Float64Array(n),y=new Float64Array(n),s=new Float64Array(n);
 for(let i=0;i<n;i++){x[i]=pts[i][0];z[i]=pts[i][1];y[i]=pts[i][2]||0;if(i)s[i]=s[i-1]+Math.hypot(x[i]-x[i-1],z[i]-z[i-1]);}
 return {n,x,z,y,s,len:s[n-1]};
}
function locate(p,sv){let lo=0,hi=p.n-1;if(sv<=0)return 0;if(sv>=p.len)return p.n-2;while(hi-lo>1){const m=(lo+hi)>>1;if(p.s[m]<=sv)lo=m;else hi=m;}return lo;}
export function sampleAt(p,sv,out={}){
 if(p.n===1){out.x=p.x[0];out.z=p.z[0];out.y=p.y[0];return out;}
 const i=locate(p,sv),d=p.s[i+1]-p.s[i],f=d>1e-9?clamp((sv-p.s[i])/d,0,1):0;
 out.x=p.x[i]+(p.x[i+1]-p.x[i])*f;out.z=p.z[i]+(p.z[i+1]-p.z[i])*f;out.y=p.y[i]+(p.y[i+1]-p.y[i])*f;return out;
}
const A_=[{},{}];
// Unit direction [x,z] at station sv: the chord from 0.6 m before to 0.6 m after (one-sided at the ends).
export function directionAt(p,sv,half=.6){
 const a=sampleAt(p,Math.max(0,sv-half),A_[0]),b=sampleAt(p,Math.min(p.len,sv+half),A_[1]),l=Math.hypot(b.x-a.x,b.z-a.z)||1;return [(b.x-a.x)/l,(b.z-a.z)/l];
}
function resample(p,step=STEP){const n=Math.max(1,Math.round(p.len/step)),pts=[],o={};for(let k=0;k<=n;k++){sampleAt(p,p.len*k/n,o);pts.push([o.x,o.z,o.y]);}return pts;}
// The lane: the centre line moved to the right by off(s) metres (right of the driver is (-dz,dx) with x east and z south).
function offsetPath(p,off){
 const pts=[];for(let i=0;i<p.n;i++){const a=Math.max(0,i-2),b=Math.min(p.n-1,i+2),dx=p.x[b]-p.x[a],dz=p.z[b]-p.z[a],l=Math.hypot(dx,dz)||1,o=off(p.s[i]);
  pts.push([p.x[i]-dz/l*o,p.z[i]+dx/l*o,p.y[i]]);}return pts;
}
// Gaussian smoothing of x and z with the ends held (the line is continued past them by point reflection, which keeps end point and end direction).
function fair(pts,sigma){
 const n=pts.length;if(n<5||sigma<=0)return pts;const K=Math.ceil(2.5*sigma/STEP),w=[];for(let k=0;k<=K;k++)w.push(Math.exp(-(k*STEP)*(k*STEP)/(2*sigma*sigma)));
 const at=(i,c)=>{if(i<0)return 2*pts[0][c]-pts[Math.min(n-1,-i)][c];if(i>n-1)return 2*pts[n-1][c]-pts[Math.max(0,2*(n-1)-i)][c];return pts[i][c];};
 return pts.map((q,i)=>{let sx=0,sz=0,sw=0;for(let k=-K;k<=K;k++){const wk=w[Math.abs(k)];sx+=wk*at(i+k,0);sz+=wk*at(i+k,1);sw+=wk;}return [sx/sw,sz/sw,q[2]];});
}
// Relaxes a lane towards the straightest line the road allows: every sample may move at most cmax(i) metres from where it was, and bends open
// out as far as that. The first and last two samples stay, so the ends keep their place and direction.
function relax(pts,cmax,iters=260){
 const n=pts.length;if(n<7)return pts;
 const x=Float64Array.from(pts,q=>q[0]),z=Float64Array.from(pts,q=>q[1]),x0=x.slice(),z0=z.slice();
 for(let it=0;it<iters;it++)for(let i=2;i<n-2;i++){const c=cmax(i);if(c<=0)continue;
  let nx=x[i]+.5*(.5*(x[i-1]+x[i+1])-x[i]),nz=z[i]+.5*(.5*(z[i-1]+z[i+1])-z[i]);const dx=nx-x0[i],dz=nz-z0[i],d=Math.hypot(dx,dz);
  if(d>c){nx=x0[i]+dx/d*c;nz=z0[i]+dz/d*c;}x[i]=nx;z[i]=nz;}
 return pts.map((q,i)=>[x[i],z[i],q[2]]);
}
// Smallest radius among the samples i0..i1 of arrays x,z spaced d apart, measured over WINDOW either side.
function minRadius(x,z,d,i0=0,i1=x.length-1){
 const w=Math.max(1,Math.round(WINDOW/d));let k=0;
 for(let i=Math.max(i0,w);i<=Math.min(i1,x.length-1-w);i++){const ax=x[i-w],az=z[i-w],bx=x[i],bz=z[i],cx=x[i+w],cz=z[i+w],cr=Math.abs((bx-ax)*(cz-az)-(bz-az)*(cx-ax));
  const l=Math.hypot(bx-ax,bz-az)*Math.hypot(cx-bx,cz-bz)*Math.hypot(cx-ax,cz-az);if(l>1e-12)k=Math.max(k,2*cr/l);}
 return k>1e-9?1/k:1e9;
}
// A cubic Bezier from P0 (direction d0) to P3 (direction d3), handles h0 and h3 long, sampled every .25 m. Heights run linearly.
function bezier(P0,d0,P3,d3,h0,h3){
 const x=[P0.x,P0.x+d0[0]*h0,P3.x-d3[0]*h3,P3.x],z=[P0.z,P0.z+d0[1]*h0,P3.z-d3[1]*h3,P3.z];
 const L=Math.hypot(x[1]-x[0],z[1]-z[0])+Math.hypot(x[2]-x[1],z[2]-z[1])+Math.hypot(x[3]-x[2],z[3]-z[2]),n=Math.max(6,Math.ceil(L/.25)),out=[];
 for(let k=0;k<=n;k++){const t=k/n,u=1-t,a=u*u*u,b=3*u*u*t,c=3*u*t*t,e=t*t*t;out.push([a*x[0]+b*x[1]+c*x[2]+e*x[3],a*z[0]+b*z[1]+c*z[2]+e*z[3],P0.y+(P3.y-P0.y)*t]);}
 return out;
}

// ---- turning round by reversing ---------------------------------------------------------------------------------
// A U-turn on a road too narrow for a loop is a three-point turn (forward and left, back and right, forward and left) or, from a stand at the end of
// a road, a two-point turn (back and right, forward and left): arcs of the car's turning radius joined at cusps, where the car changes direction.
// The local frame has x along the heading d0 at P0 and y to the left. Both kinds of arc turn the heading counter-clockwise: forward with the wheel to the
// left, backward with the wheel to the right. Returns the points [x,z,y,reverse] of the manoeuvre from P0 to its end, the end heading and length.
function reverseArcs(P0,d0,R,pattern,angles){
 const left=[d0[1],-d0[0]],out=[];let px=0,py=0,th=0,len=0;
 for(let k=0;k<pattern.length;k++){const fwd=pattern[k]>0,to=angles[k],n=Math.max(2,Math.ceil((to-th)*R/.25));
  const nl=a=>[-Math.sin(a),Math.cos(a)],c0=nl(th),cx=fwd?px+R*c0[0]:px-R*c0[0],cy=fwd?py+R*c0[1]:py-R*c0[1];
  for(let i=1;i<=n;i++){const a=th+(to-th)*i/n,q=nl(a),x=fwd?cx-R*q[0]:cx+R*q[0],y=fwd?cy-R*q[1]:cy+R*q[1];len+=Math.hypot(x-px,y-py);px=x;py=y;
   out.push([P0.x+d0[0]*x+left[0]*y,P0.z+d0[1]*x+left[1]*y,P0.y,fwd?0:1]);}
  th=to;}
 return {pts:out,x:px,y:py,len};
}
// ---- the lines of a road network ---------------------------------------------------------------------------------
// opts: data (map.json), roadLine(nodePath) -> [[x,z,y]], carHeight(x,z), adjacency (Map node -> outgoing edges),
//       surfaceTop(x,z,near) -> height of the drawn road there (the highest no more than 1.5 m above `near`) or null,
//       centred(node) -> true where the car stops on the node itself (home, gate, parking places),
//       laneShare (default .25: the lane lies this fraction of the carriageway width right of the centre)
export function createDrivingLines(opts){
 const {data,roadLine,carHeight,surfaceTop=null,adjacency,centred=()=>false,laneShare=.25}=opts;
 // Two-way roads are the ones whose node pairs run in both directions in the graph.
 const pairs=new Set();for(const e of data.edges)for(let i=1;i<e.path.length;i++)pairs.add(e.path[i-1]+'>'+e.path[i]);
 const roadOf=new Map(),pk=n=>data.nodes[n][0]+','+data.nodes[n][1];
 for(const r of data.roads)for(let i=0;i+1<r.p.length;i++){const a=r.p[i][0]+','+r.p[i][1],b=r.p[i+1][0]+','+r.p[i+1][1];roadOf.set(a+'|'+b,r);roadOf.set(b+'|'+a,r);}
 const infos=new Map();
 function info(e){
  let v=infos.get(e);if(v)return v;
  let rev=0,len=0,wsum=0;const types={};
  for(let i=1;i<e.path.length;i++){const a=e.path[i-1],b=e.path[i],l=Math.hypot(data.nodes[b][0]-data.nodes[a][0],data.nodes[b][1]-data.nodes[a][1]);len+=l;if(pairs.has(b+'>'+a))rev+=l;
   const r=roadOf.get(pk(a)+'|'+pk(b));if(r){wsum+=roadWidth(r)*l;types[r.type]=(types[r.type]||0)+l;}}
  const type=Object.keys(types).sort((a,b)=>types[b]-types[a])[0]||'residential',width=len>0&&wsum>0?wsum/Math.max(1e-9,Object.values(types).reduce((a,b)=>a+b,0)):roadWidth({type}),twoWay=!e.roundabout&&len>0&&rev/len>=.5;
  v={width,type,twoWay,offset:twoWay&&!(type==='service'&&width<4.6)?width*laneShare:0};infos.set(e,v);return v;
 }
 // The lane of one graph edge (a road between two nodes), as a path from its first node to its last.
 // The lane of one graph edge (a road between two nodes), as a path from its first node to its last: the centre line moved to the side and
 // smoothed (lane0). The connectors at the junctions are fitted to lane0; lane() is lane0 with the bends between the junctions opened out.
 const lanes0=new Map(),lanes=new Map(),incoming=new Map();
 for(const e of data.edges){if(!incoming.has(e.to))incoming.set(e.to,[]);incoming.get(e.to).push(e);}
 function lane0(e){
  let L=lanes0.get(e);if(L)return L;
  const c=pathOf(roadLine(e.path)),I=info(e),o=I.offset,a=centred(e.from),b=centred(e.to),len=c.len;
  const ease=t=>t*t*(3-2*t),profile=s=>o*Math.min(a?ease(clamp(s/Math.min(RAMP,len/2),0,1)):1,b?ease(clamp((len-s)/Math.min(RAMP,len/2),0,1)):1);
  const base=pathOf(resample(c)),pts=offsetPath(base,profile);
  L=pathOf(e.roundabout?pts:fair(pts,FAIR));L.edge=e;L.width=I.width;L.offset=o;L.plain=true;lanes0.set(e,L);return L;
 }
 // Bends open out along the middle of a road, every sample staying within `cut` metres of lane0 (the road's width less .5 m to the kerb). Near a junction the lane stays as
 // it is: as far as any connector there reaches, and a little more. Near home, the gate and parking places only the last metres are left.
 function lane(e){
  let L=lanes.get(e);if(L)return L;
  const L0=lane0(e);if(e.roundabout||L0.len<20){lanes.set(e,L0);return L0;}
  const I=info(e),a=centred(e.from),b=centred(e.to),cut=clamp(I.width/2-.5-I.offset,.3,opts.cut??CUT),len=L0.len,n=L0.n;
  const reachStart=a?1:Math.max(2.5,...(incoming.get(e.from)||[]).map(x=>connection(x,e).xb))+2,reachEnd=b?1:stopX(e)+2;
  const pts=relax(Array.from({length:n},(_,i)=>[L0.x[i],L0.z[i],L0.y[i]]),i=>{const s=L0.s[i],d=Math.min((s-reachStart)/6,(len-s-reachEnd)/6);return d<=0?0:cut*Math.min(1,d);});
  L=pathOf(pts);L.edge=e;L.width=I.width;L.offset=I.offset;lanes.set(e,L);return L;
 }
 // ---- connectors between the lanes of two consecutive edges --------------------------------------------------
 const connections=new Map();
 const P0={},P3={};
 // Radius wanted for a turn of phi radians between roads of widths wa and wb: about the tangent length of a right-angle turn
 // between residential streets (7.5 m) for sharp turns, larger where the roads bend only slightly.
 function wanted(phi,wa,wb,sharp){const T0=5+.5*Math.max(wa,wb);return clamp(T0/Math.tan(Math.max(.05,phi)/2),sharp?4:MIN_R+.5,35);}
 function connection(A,B){
  const key=A.id+'>'+B.id;let c=connections.get(key);if(c)return c;
  const LA=lane0(A),LB=lane0(B),dA=directionAt(LA,LA.len),dB=directionAt(LB,0);
  sampleAt(LA,LA.len,P0);const ea={x:P0.x,z:P0.z};sampleAt(LB,0,P3);const sb={x:P3.x,z:P3.z};
  const dot=dA[0]*dB[0]+dA[1]*dB[1],phi=Math.acos(clamp(dot,-1,1)),uturn=phi>2.5,sharp=phi>1.9;
  // Continuing on the same lane: nothing to connect.
  if(Math.hypot(ea.x-sb.x,ea.z-sb.z)<.06&&phi<.03){c={xa:0,xb:0,pts:null,rmin:1e9,uturn:false,phi,off:0};connections.set(key,c);return c;}
  // A reversal (B runs back along A) turns round by reversing.
  if(phi>2.9&&B.to===A.from){c={...reverseTurn(A,B,LA,LB,dA),uturn:true,phi,wanted:0};connections.set(key,c);return c;}
  // The connector starts xa before the end of A and ends xb after the start of B (2 m or more where the roads are long enough, never over
  // 45 % of a road, so the two ends of a short road do not meet). At a node where the car stops (home, gate, parking place) it starts on the node.
  // A U-turn starts no earlier than the stop line the other roads need.
  const fixA=centred(A.to),want=uturn?3.5:wanted(phi,LA.width,LB.width,sharp),hard=uturn?2:sharp?3.6:MIN_R;
  const cap=uturn?(stopFor(A,false)||14):sharp?12:22,xTop=Math.max(.5,fixA?Math.min(.45*LB.len,cap):Math.min(.45*LA.len,.45*LB.len,cap));
  const topA=Math.max(.5,fixA?0:Math.min(.45*LA.len,cap)),topB=Math.max(.5,Math.min(.45*LB.len,cap));
  let best=null;const top=[]; // the best few on the drawn road at the coarse check
  // Radius and surface check of one connector (starts xa before the end of A, ends xb after the start of B, Bezier handles h0 and h3).
  // Curvature is measured over the connector and 1.5 m of lane either side, on samples .25 m apart.
  const evaluate=(xa,xb,h0,h3,a,b,da,db)=>{
   const pts=bezier(a,da,b,db,h0,h3),t0=sampleAt(LA,Math.max(0,LA.len-xa-WINDOW),{}),t1=sampleAt(LB,Math.min(LB.len,xb+WINDOW),{});
   const X=[t0.x,...pts.map(q=>q[0]),t1.x],Z=[t0.z,...pts.map(q=>q[1]),t1.z],loc=pathOf(X.map((v,i)=>[v,Z[i],0])),n=Math.max(2,Math.round(loc.len/.25)),rx=[],rz=[];
   for(let k=0;k<=n;k++){const o=sampleAt(loc,loc.len*k/n,{});rx.push(o.x);rz.push(o.z);}
   const rmin=minRadius(rx,rz,loc.len/n);let off=0;if(surfaceTop)for(const q of pts)if(surfaceTop(q[0],q[1])===null)off++;
   // Cost: staying on the drawn road first, then the radius (hard: the least acceptable, want: what the turn deserves), then a short setback.
   const cost=30*off+6*Math.max(0,hard-rmin)+.6*Math.max(0,want-rmin)+.03*(xa+xb)/2;
   if(!best||cost<best.cost)best={xa,xb,pts,rmin,off,cost,h0,h3};
   if(off===0&&(top.length<8||cost<top.at(-1).cost)){top.push({xa,xb,pts,rmin,off,cost,h0,h3});top.sort((p,q)=>p.cost-q.cost);if(top.length>8)top.pop();}
   return off===0&&rmin>=want;};
  const frames=(xa,xb)=>{const a=sampleAt(LA,LA.len-xa,{}),b=sampleAt(LB,xb,{});return [a,b,directionAt(LA,LA.len-xa),directionAt(LB,xb),Math.hypot(b.x-a.x,b.z-a.z)];};
  const tryConnector=(xa,xb)=>{const [a,b,da,db,chord]=frames(xa,xb);let good=false;for(const k of uturn?[1,1.5,2,3,4.5,6,8]:[.25,.35,.45,.55,.65]){const h=uturn?k:k*chord;if(evaluate(xa,xb,h,h,a,b,da,db))good=true;}return good;};
  // Equal setbacks, shortest first: the first that gives the radius wanted on the drawn road is taken.
  let done=false;
  for(let x=Math.min(2,xTop);x<=xTop+1e-9&&!done;x+=.5)done=tryConnector(fixA?0:x,x);
  // Otherwise unequal setbacks (a long approach can start its arc early and join a short road late), a metre apart.
  if(!done&&!(best.off===0&&best.rmin>=hard))for(let xa=fixA?0:Math.min(2,topA);xa<=topA+1e-9&&!done;xa+=fixA?99:1)for(let xb=Math.min(2,topB);xb<=topB+1e-9&&!done;xb+=1)if(Math.abs(xa-xb)>=1)done=tryConnector(xa,xb);
  // Still short of the radius wanted: the two handles of the best one, separately.
  if(!done&&!uturn&&best.rmin<want){const {xa,xb}=best,[a,b,da,db,chord]=frames(xa,xb);for(let i=3;i<=18&&!done;i++)for(let j=3;j<=18&&!done;j++)done=evaluate(xa,xb,chord*i*.05,chord*j*.05,a,b,da,db);}
  // The surface has notches narrower than the .25 m of the check above: the best few are checked again every 5 cm and the one with the least of its way off the road wins.
  if(surfaceTop&&best.pts){const pool=top.includes(best)?top:[...top,best];let pick=null;
   for(const cd of pool){const P=pathOf(cd.pts);let fine=0;for(let sv=0;sv<=P.len;sv+=.05){sampleAt(P,sv,P0);if(surfaceTop(P0.x,P0.z)===null)fine++;}
    const cost=cd.cost+20*fine;if(!pick||cost<pick.cost)pick={...cd,cost};}
   best=pick;}
  c={...best,uturn,phi,wanted:want};connections.set(key,c);return c;
 }
  // The turn-round of a car that has come along A and leaves along B, back the way it came. It starts xa before the end of A (a stand on the node itself at home,
 // the gate and parking places) and ends on lane B; the candidates (turning radius, pattern, setback, angles) are ranked by length, and among the best
 // by how much of the way lies off the drawn road.
 function reverseTurn(A,B,LA,LB,dA){
  const fixA=centred(A.to),cap=stopFor(A,false),xas=fixA?[0]:[2.5,4,6,9,13].filter(x=>x<=.45*LA.len&&(!cap||x<=cap+1e-9)),cands=[];
  if(!xas.length)xas.push(Math.min(.45*LA.len,cap||2.5));
  for(const xa of xas){
   const P0=sampleAt(LA,LA.len-xa,{}),d0=directionAt(LA,LA.len-xa),left=[d0[1],-d0[0]];
   for(const R of [3.6,4.2,5]){
    // The frame of lane B a few metres on: heading dB (relative to d0: thB, near 180 degrees) and the point Q.
    const Q=sampleAt(LB,Math.min(LB.len*.45,4),{}),dB=directionAt(LB,Math.min(LB.len*.45,4)),qx=(Q.x-P0.x)*d0[0]+(Q.z-P0.z)*d0[1],qy=(Q.x-P0.x)*left[0]+(Q.z-P0.z)*left[1];
    let thB=Math.atan2(dB[0]*left[0]+dB[1]*left[1],dB[0]*d0[0]+dB[1]*d0[1]);if(thB<0)thB+=2*Math.PI;
    const err=(x,y)=>(x-qx)*-Math.sin(thB)+(y-qy)*Math.cos(thB); // sideways distance from lane B
    // Three-point turn: angles (t1,t2,thB); two-point turn (from a stand): (t1,thB).
    for(let t1=.5;t1<=1.8;t1+=.1){let bestT2=null;
     for(let t2=t1+.25;t2<=thB-.12;t2+=.03){const r=reverseArcs(P0,d0,R,[1,-1,1],[t1,t2,thB]),e=Math.abs(err(r.x,r.y));if(!bestT2||e<bestT2.e)bestT2={e,t2,len:r.len};}
     if(bestT2&&bestT2.e<.6)cands.push({xa,R,pattern:[1,-1,1],angles:[t1,bestT2.t2,thB],cost:.3*bestT2.len+.6*xa+8*bestT2.e});}
    for(let t1=.4;t1<=thB-.3;t1+=.05){const r=reverseArcs(P0,d0,R,[-1,1],[t1,thB]),e=Math.abs(err(r.x,r.y));
     if(e<.6)cands.push({xa,R,pattern:[-1,1],angles:[t1,thB],cost:.3*r.len+.6*xa+8*e+2});}
   }}
  cands.sort((p,q)=>p.cost-q.cost);
  let best=null;
  for(const cd of cands.slice(0,14)){
   const P0=sampleAt(LA,LA.len-cd.xa,{}),d0=directionAt(LA,LA.len-cd.xa),r=reverseArcs(P0,d0,cd.R,cd.pattern,cd.angles),end=r.pts.at(-1),th=cd.angles.at(-1),left=[d0[1],-d0[0]];
   // Heading at the end in world terms, then a short smooth run onto lane B, a few metres past where the car stands.
   const hd=[Math.cos(th)*d0[0]+Math.sin(th)*left[0],Math.cos(th)*d0[1]+Math.sin(th)*left[1]];
   let bx=0,bd=1e9;for(let x=0;x<=Math.min(LB.len*.45,30);x+=.5){const q=sampleAt(LB,x,{}),dd=Math.hypot(q.x-(end[0]+hd[0]*3),q.z-(end[1]+hd[1]*3));if(dd<bd){bd=dd;bx=x;}}
   const xb=bx,Qb=sampleAt(LB,xb,{}),db=directionAt(LB,xb),tail=bezier({x:end[0],z:end[1],y:P0.y},hd,Qb,db,.4*Math.hypot(Qb.x-end[0],Qb.z-end[1]),.4*Math.hypot(Qb.x-end[0],Qb.z-end[1]));
   const pts=[[P0.x,P0.z,P0.y,0],...r.pts,...tail.slice(1).map(q=>[q[0],q[1],q[2],0])];
   // Heights: linear from the stand to lane B.
   const n=pts.length;for(let i=0;i<n;i++)pts[i][2]=P0.y+(Qb.y-P0.y)*i/(n-1);
   let off=0;if(surfaceTop)for(const q of pts)if(surfaceTop(q[0],q[1])===null)off++;
   const cost=30*off+cd.cost;if(!best||cost<best.cost)best={xa:cd.xa,xb,pts,rmin:cd.R,off,cost};}
  return best||{xa:0,xb:0,pts:null,rmin:0,off:0};
 }
 // Where the car waits before the node at the end of A: at the start of the earliest connector of any road that can follow.
 // A U-turn only counts where it is the only way on.
 const stops=new Map();
 // The stop line: the earliest connector start among the roads that can follow (nonU=false: only if that is all there is).
 function stopFor(A,orU=true){
  if(centred(A.to))return 0;
  const all=adjacency.get(A.to)||[],turn=[],back=[];
  for(const b of all){const dA=directionAt(lane0(A),lane0(A).len),dB=directionAt(lane0(b),0);(dA[0]*dB[0]+dA[1]*dB[1]<Math.cos(2.5)?back:turn).push(b);}
  let m=0;for(const b of turn)m=Math.max(m,connection(A,b).xa);
  if(m>0||!orU)return m;
  for(const b of back)m=Math.max(m,connection(A,b).xa);return m;
 }
 function stopX(A){let x=stops.get(A);if(x===undefined){x=stopFor(A);x=x>0?Math.max(x,Math.min(2.5,.45*lane0(A).len)):0;stops.set(A,x);}return x;} // at least 2.5 m before the node, but never more than the connectors of a short road leave
 const segs=e=>e.roundaboutPlan?e.segments:[e];
 // The line of edge (or roundabout plan) b, driven after edge a (or from its start node when a is null).
 // It runs from a's stop line to b's own stop line.
 const cache=new Map();
 function line(a,b){
  const key=(a?(a.roundaboutPlan?a.from+'>':'')+a.id:'-')+'/'+(b.roundaboutPlan?b.from+'>':'')+b.id;
  let L=cache.get(key);if(L)return L;
  const seq=[];if(a)seq.push(segs(a).at(-1));seq.push(...segs(b));
  const lns=seq.map(lane),cs=[];for(let j=0;j+1<seq.length;j++)cs.push(connection(seq[j],seq[j+1]));
  const pts=[],addLane=(ln,s0,s1)=>{const o={},k=Math.max(1,Math.ceil((s1-s0)/STEP));for(let i=0;i<=k;i++){sampleAt(ln,s0+(s1-s0)*i/k,o);pts.push([o.x,o.z,o.y]);}};
  for(let j=0;j<seq.length;j++){const ln=lns[j],first=j===0,last=j===seq.length-1;
   const s0=first?(a?ln.len-stopX(seq[0]):0):cs[j-1].xb,s1=last?ln.len-stopX(seq[j]):ln.len-cs[j].xa;
   addLane(ln,s0,Math.max(s0,s1)); // even an empty stretch adds its point, so the connector keeps its first and last
   if(!last&&cs[j].pts)for(const q of cs[j].pts.slice(1,-1))pts.push(q);}
  L=finish(pts);L.a=a;L.b=b;cache.set(key,L);return L;
 }
 // Final line: even samples, level on the drawn road, curvature and its speed limit.
 function finish(raw){
  // Even samples. A three-point turn is resampled run by run (forward, backward, forward), so the cusps stay exact samples (a run starts on the last point of the one before).
  const runs=[];{let cur=[],f=raw[0][3]?1:0;for(let i=0;i<raw.length;i++){const fl=raw[i][3]?1:0;if(i>0&&fl!==f){runs.push({f,pts:cur});cur=[raw[i-1]];f=fl;}cur.push(raw[i]);}runs.push({f,pts:cur});}
  const pts=[],flags=[];for(const run of runs)for(const q of resample(pathOf(run.pts))){pts.push(q);flags.push(run.f);}
  const n=pts.length,p2=pathOf(pts),rev=Uint8Array.from(flags),anyRev=runs.length>1;
  // Level: each sample rides on the highest drawn surface among itself and its neighbours (as world.roadLine does), so the car has risen before a step.
  const need=pts.map(q=>{if(surfaceTop){const t=surfaceTop(q[0],q[1],q[2]-.1);return t===null?-1e9:t+.1;}return carHeight?carHeight(q[0],q[1])+.02:-1e9;}); // near the sample's own level: under a bridge the car stays on its road
  // The two ends take only their own surface, so that a line ends at exactly the height where the next one starts.
  for(let i=0;i<n;i++)p2.y[i]=i===0||i===n-1?Math.max(pts[i][2],need[i]):Math.max(pts[i][2],need[i],need[i-1],need[i+1]);
  const w=Math.round(WINDOW/STEP),kappa=new Float32Array(n),cap=new Float32Array(n);
  for(let i=0;i<n;i++){const a=Math.max(0,i-w),c=Math.min(n-1,i+w),b=i;
   if(anyRev){let same=true;for(let k=a;k<=c;k++)if(rev[k]!==rev[i]){same=false;break;}if(!same)continue;} // not measured across a cusp
   const ax=p2.x[a],az=p2.z[a],bx=p2.x[b],bz=p2.z[b],cx=p2.x[c],cz=p2.z[c],cr=Math.abs((bx-ax)*(cz-az)-(bz-az)*(cx-ax)),l=Math.hypot(bx-ax,bz-az)*Math.hypot(cx-bx,cz-bz)*Math.hypot(cx-ax,cz-az);
   kappa[i]=l>1e-12?2*cr/l:0;}
  // A stretch is as tight as its tightest sample within half a metre either side; at a cusp the car all but stops.
  for(let i=0;i<n;i++){let m=0;for(let j=Math.max(0,i-1);j<=Math.min(n-1,i+1);j++)m=Math.max(m,kappa[j]);cap[i]=Math.min(TOP,Math.sqrt(A_LAT/Math.max(m,1e-9)));
   if(anyRev)for(let j=Math.max(0,i-2);j<=Math.min(n-1,i+2);j++)if(rev[j]!==rev[i]){cap[i]=Math.min(cap[i],CUSP);break;}}
  p2.kappa=kappa;p2.cap=cap;p2.rev=rev;
  // Position, unit direction of the car's body (with the slope) and speed limit at distance sv; `out` may be a THREE.Vector3 or any object with x,y,z.
  // The body points along the way of travel, or against it while reversing. The chord for the direction stays within one run of forward or backward driving.
  const put=(out,x,y,z)=>{if(out.set)out.set(x,y,z);else{out.x=x;out.y=y;out.z=z;}return out;},A={},B={};
  p2.at=(sv,out)=>{sampleAt(p2,sv,A);return put(out,A.x,A.y,A.z);};
  p2.tangent=(sv,out)=>{let lo=0,hi=p2.len;const i=locate(p2,sv),r=rev[i];
   if(anyRev){let a=i,c=i+1;while(a>0&&rev[a-1]===r)a--;while(c<n-1&&rev[c+1]===r)c++;lo=p2.s[a];hi=p2.s[c];}
   let from=Math.max(lo,sv-.5),to=Math.min(hi,sv+.5);if(to-from<.3){from=Math.max(0,sv-.5);to=Math.min(p2.len,sv+.5);}
   sampleAt(p2,from,A);sampleAt(p2,to,B);const dx=B.x-A.x,dy=B.y-A.y,dz=B.z-A.z,l=Math.hypot(dx,dy,dz)||1,sg=r?-1:1;return put(out,sg*dx/l,sg*dy/l,sg*dz/l);};
  p2.reversing=sv=>rev[locate(p2,sv)]===1;
  p2.limit=(lim,sv)=>limitAt(p2,lim,sv);
  return p2;
 }
 // The speed the car may have at each sample so that it can still brake for what lies ahead: limit(i)=min(cap(i), sqrt(limit(i+1)^2+2 a ds)).
 // vEnd is the limit at the end of the line, `extra(s)` an additional cap (the roundabout's).
 function profile(L,vEnd,decel,extra){
  const n=L.n,lim=new Float32Array(n);lim[n-1]=Math.min(L.cap[n-1],vEnd);
  for(let i=n-2;i>=0;i--){const ds=L.s[i+1]-L.s[i];lim[i]=Math.min(L.cap[i],Math.sqrt(lim[i+1]*lim[i+1]+2*decel*ds));if(extra)lim[i]=Math.min(lim[i],extra(L.s[i]));}
  if(extra)lim[n-1]=Math.min(lim[n-1],extra(L.s[n-1]));
  return lim;
 }
 return {lane,lane0,connection,stopX,line,profile,info,segs};
}
// Speed limit at station sv from a profile (linear between samples).
export function limitAt(L,lim,sv){const i=locate(L,sv),d=L.s[i+1]-L.s[i],f=d>1e-9?clamp((sv-L.s[i])/d,0,1):0;return lim[i]+(lim[i+1]-lim[i])*f;}
