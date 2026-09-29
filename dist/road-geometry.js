import {roadWidth} from './transit-geometry.js';
// Road plan and profile shared by the drawn road surface (road-surface.js) and the car (game.js): OSM polylines are
// rounded into circular bends, every junction gets a paved patch with curb returns, and the level along each road is a
// smoothed, grade-limited line instead of the coarse terrain grid. Pure geometry: no three.js.
export const KERB=.7,KERB_DROP=.09; // kerb band beyond the carriageway edge on each side, and how far it lies below the asphalt
const BEND={primary:30,secondary:30,trunk:30,tertiary:20,residential:12,unclassified:12,living_street:12,service:6};
const CORNER={primary:8,secondary:8,trunk:8,tertiary:8,residential:5,unclassified:5,living_street:5,service:3};
const GRADE={primary:.26,secondary:.26,trunk:.26,tertiary:.26,unclassified:.28,residential:.28,living_street:.28,service:.32};
export const bendRadius=type=>BEND[type]??12,cornerRadius=type=>CORNER[type]??5,maxGrade=type=>GRADE[type]??.28;
export const pointKey=p=>p[0].toFixed(2)+','+p[1].toFixed(2);
const nk=p=>Math.round(p[0]*100)*4e6+Math.round(p[1]*100); // the same point as a number: cheaper than a string key
const TAU=Math.PI*2,STEP=2; // dense centre-line samples are at most STEP metres apart
// A circular arc of the road's bend radius replaces the sharp vertex v between its neighbours a and b. The tangent length is
// limited to 45 % of the shorter segment, so neighbouring arcs never touch. Returns points at most 2 m apart, tangent points
// included, or [v] when the vertex is nearly straight or too tight to round. A pure function of (a,v,b,type,scale): scale shrinks the radius.
export function fillet(a,v,b,type,scale=1){
 const ux=v[0]-a[0],uz=v[1]-a[1],wx=b[0]-v[0],wz=b[1]-v[1],l1=Math.hypot(ux,uz),l2=Math.hypot(wx,wz);if(l1<.05||l2<.05)return [v];
 const cross=ux*wz-uz*wx,turn=Math.atan2(Math.abs(cross),ux*wx+uz*wz);if(turn<.035)return [v];
 let R=bendRadius(type)*scale,t=R*Math.tan(turn/2);const cap=.45*Math.min(l1,l2);if(t>cap){t=cap;R=t/Math.tan(turn/2);}if(R<1)return [v];
 const sg=cross>0?1:-1,e1x=ux/l1,e1z=uz/l1,tx=v[0]-e1x*t,tz=v[1]-e1z*t,cx=tx-sg*e1z*R,cz=tz+sg*e1x*R,a0=Math.atan2(tz-cz,tx-cx),n=Math.max(1,Math.ceil(R*turn/(R<16?1:STEP))),out=[]; // tight bends every metre: a level strip on a steep tight bend twists more the longer it is
 for(let k=0;k<=n;k++){const an=a0+sg*turn*k/n;out.push([cx+R*Math.cos(an),cz+R*Math.sin(an)]);}
 return out;
}
// Roundabout rings keep every OSM vertex (junctions sit on them): a closed centripetal Catmull-Rom curve passes through all of them.
function ringPoints(p){
 const n=p.length-1,P=i=>p[((i%n)+n)%n],out=[],first=[],last=[],dist=(a,b)=>Math.max(.01,Math.pow(Math.hypot(b[0]-a[0],b[1]-a[1]),.5));
 for(let i=0;i<n;i++){const p0=P(i-1),p1=P(i),p2=P(i+1),p3=P(i+2),d1=dist(p0,p1),d2=dist(p1,p2),d3=dist(p2,p3);
  const m1=[0,1].map(k=>((p1[k]-p0[k])/d1-(p2[k]-p0[k])/(d1+d2)+(p2[k]-p1[k])/d2)*d2),m2=[0,1].map(k=>((p2[k]-p1[k])/d2-(p3[k]-p1[k])/(d2+d3)+(p3[k]-p2[k])/d3)*d2);
  const steps=Math.max(1,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/1));first[i]=last[i]=out.length;
  for(let s=0;s<steps;s++){const u=s/steps,u2=u*u,u3=u2*u;out.push([0,1].map(k=>(2*u3-3*u2+1)*p1[k]+(u3-2*u2+u)*m1[k]+(-2*u3+3*u2)*p2[k]+(u3-u2)*m2[k]));}}
 first[n]=last[n]=out.length;out.push(p[0].slice());return {pts:out,first,last};
}
// Dense plan of one road: fillets at free vertices, fixed vertices (isFixed) untouched, samples at most STEP apart.
// first[i]/last[i] are the dense indices where original vertex i begins and ends (equal for fixed vertices).
// blocked(pts): how many points on the carriageway edges of a path lie inside a building. A bend keeps its full radius unless that would put
// more of the road into a building than the sharp OSM corner does; then a tighter radius is tried, and at last the sharp corner.
export function smoothPlan(p,type,isFixed,ring,blocked){
 if(ring&&p.length>3)return ringPoints(p);
 const pts=[],first=[],last=[],n=p.length;
 const emit=q=>{const l=pts.at(-1);if(l){const d=Math.hypot(q[0]-l[0],q[1]-l[1]);if(d<.05)return;const k=Math.ceil(d/STEP);for(let j=1;j<k;j++)pts.push([l[0]+(q[0]-l[0])*j/k,l[1]+(q[1]-l[1])*j/k]);}pts.push(q);};
 const round=i=>{let out=fillet(p[i-1],p[i],p[i+1],type);if(out.length<2||!blocked)return out;const sharp=[out[0],p[i],out.at(-1)];let base=null;
  for(const sc of [1,.6,.35]){if(sc<1)out=fillet(p[i-1],p[i],p[i+1],type,sc);if(out.length<2)return [p[i]];if(!blocked(out))return out;if(base===null)base=blocked(sharp);if(blocked(out)<=base)return out;}
  return [p[i]];};
 for(let i=0;i<n;i++){const out=i===0||i===n-1||isFixed(p[i])?[p[i]]:round(i);let f=-1;for(const q of out){emit(q.slice());if(f<0)f=pts.length-1;}first[i]=f;last[i]=pts.length-1;}
 return {pts,first,last};
}
const cross2=(a,b)=>a[0]*b[1]-a[1]*b[0];
// Paved patch at a node. Every arm is a strip (half-width w, unit direction d, corner radius rc, longest setback maxT); neighbouring
// arms are joined by a curb return (a circular arc tangent to both carriageway edges), by a straight edge where a road carries on,
// or by a sharp mitre on the outside of a bend. Each arm gets a setback t: the station where its own ribbon starts.
// Returns the mouth of every arm and, per corner, the edge chain from one mouth to the next (with the outward edge normals at its ends).
export function junctionPatch(N,arms){
 const m=arms.length;for(const a of arms)a.ang=Math.atan2(a.d[1],a.d[0]);arms.sort((a,b)=>a.ang-b.ang);
 const P=(a,t,s)=>[N[0]+a.d[0]*t-a.d[1]*a.w*s,N[1]+a.d[1]*t+a.d[0]*a.w*s]; // station t along the arm, s=+1 on its left edge, -1 on its right
 const corners=arms.map((A,i)=>{const B=arms[(i+1)%m];let th=B.ang-A.ang;if(th<=1e-6)th+=TAU;
  const c={A,B,th,kind:'chord',reqA:0,reqB:0},p0=P(A,0,1),p1=P(B,0,-1),den=cross2(A.d,B.d),q=[p1[0]-p0[0],p1[1]-p0[1]];
  if(th<2.62&&Math.abs(den)>1e-4){const tA=cross2(q,B.d)/den,tB=cross2(q,A.d)/den;
   if(tA<=A.maxT&&tB<=B.maxT){const tn=Math.tan(th/2),r=Math.min(A.rc,B.rc,(A.maxT-tA)*tn,(B.maxT-tB)*tn);c.kind='corner';c.tA=tA;c.tB=tB;c.r=r>=.4?r:0;const ext=c.r/tn;c.reqA=Math.max(0,tA+ext);c.reqB=Math.max(0,tB+ext);c.q=[p0[0]+A.d[0]*tA,p0[1]+A.d[1]*tA];}
   else{c.reqA=Math.max(0,Math.min(tA,A.maxT));c.reqB=Math.max(0,Math.min(tB,B.maxT));if(tA<A.maxT+4&&tB<B.maxT+4&&tA>-30&&tB>-30){c.kind='corner';c.r=0;c.q=[p0[0]+A.d[0]*tA,p0[1]+A.d[1]*tA];}}}
  else if(th>3.67&&Math.abs(den)>1e-4){const tA=cross2(q,B.d)/den;if(Math.abs(tA)<30){c.kind='mitre';c.q=[p0[0]+A.d[0]*tA,p0[1]+A.d[1]*tA];}}
  return c;});
 for(const A of arms)A.t=0;for(const c of corners){c.A.t=Math.max(c.A.t,c.reqA);c.B.t=Math.max(c.B.t,c.reqB);}
 for(const A of arms)A.t=Math.min(A.t,A.maxT);
 const chains=[];
 corners.forEach(c=>{const {A,B}=c,chain=[P(A,A.t,1)];
  if(c.kind==='corner'){
   if(c.r>0){const tn=Math.tan(c.th/2),ext=c.r/tn,qa=[c.q[0]+A.d[0]*ext,c.q[1]+A.d[1]*ext],qb=[c.q[0]+B.d[0]*ext,c.q[1]+B.d[1]*ext],u=[A.d[0]+B.d[0],A.d[1]+B.d[1]],ul=Math.hypot(u[0],u[1])||1,k=c.r/Math.sin(c.th/2)/ul,cc=[c.q[0]+u[0]*k,c.q[1]+u[1]*k];
    const a0=Math.atan2(qa[1]-cc[1],qa[0]-cc[0]);let sw=Math.atan2(qb[1]-cc[1],qb[0]-cc[0])-a0;while(sw>Math.PI)sw-=TAU;while(sw<-Math.PI)sw+=TAU;
    const n=Math.max(2,Math.ceil(Math.abs(sw)*c.r/1.2));for(let j=0;j<=n;j++)chain.push([cc[0]+c.r*Math.cos(a0+sw*j/n),cc[1]+c.r*Math.sin(a0+sw*j/n)]);}
   else chain.push(c.q);}
  else if(c.kind==='mitre')chain.push(c.q);
  chain.push(P(B,B.t,-1));
  const pts=[chain[0]];for(const q of chain.slice(1))if(Math.hypot(q[0]-pts.at(-1)[0],q[1]-pts.at(-1)[1])>.02)pts.push(q);if(pts.length<2)pts.push(chain.at(-1));
  chains.push({pts,nA:[-A.d[1],A.d[0]],nB:[B.d[1],-B.d[0]],A:A.src,B:B.src});});
 return {chains,mouths:arms.map(a=>({arm:a.src,R:P(a,a.t,-1),L:P(a,a.t,1)}))};
}
// Where an arm leaves its node: unit direction, and how far the road stays straight along it.
function armDirection(pts,di,dir){let j=di+dir;while(j>0&&j<pts.length-1&&Math.hypot(pts[j][0]-pts[di][0],pts[j][1]-pts[di][1])<.3)j+=dir;const q=pts[Math.max(0,Math.min(pts.length-1,j))],l=Math.hypot(q[0]-pts[di][0],q[1]-pts[di][1])||1;return [(q[0]-pts[di][0])/l,(q[1]-pts[di][1])/l];}
function straightRun(pts,di,dir,d){let run=0;for(let j=di+dir;j>=0&&j<pts.length;j+=dir){const dx=pts[j][0]-pts[di][0],dz=pts[j][1]-pts[di][1],lat=Math.abs(dx*d[1]-dz*d[0]),along=dx*d[0]+dz*d[1];if(lat>.012)break;run=along;}return run;}
// Smoothing spline on a grid of stations gs: minimise the integral of (y-S)^2 + Lam*y''^2 with the pinned entries fixed.
// The normal equations are pentadiagonal; pinned entries become identity rows and a banded LDL' factorisation solves them exactly.
function fitProfile(gs,S,pinned,Lam){
 const n=gs.length,h=new Float64Array(n),m=new Float64Array(n),a0=new Float64Array(n),a1=new Float64Array(n),a2=new Float64Array(n),rhs=new Float64Array(n);
 for(let j=0;j<n-1;j++)h[j]=gs[j+1]-gs[j];
 for(let j=0;j<n;j++){m[j]=((j>0?h[j-1]:0)+(j<n-1?h[j]:0))/2;a0[j]=m[j];rhs[j]=m[j]*S[j];}
 for(let k=1;k<n-1;k++){const s=h[k-1]+h[k],a=2/(h[k-1]*s),c=2/(h[k]*s),b=-(a+c),w=Lam*m[k];
  a0[k-1]+=w*a*a;a1[k-1]+=w*a*b;a2[k-1]+=w*a*c;a0[k]+=w*b*b;a1[k]+=w*b*c;a0[k+1]+=w*c*c;}
 const get=(i,j)=>{if(i>j){const t=i;i=j;j=t;}const d=j-i;return d===0?a0[i]:d===1?a1[i]:a2[i];},set=(i,j,v)=>{if(i>j){const t=i;i=j;j=t;}const d=j-i;if(d===0)a0[i]=v;else if(d===1)a1[i]=v;else a2[i]=v;};
 for(let j=0;j<n;j++)if(pinned[j]){for(let i=Math.max(0,j-2);i<=Math.min(n-1,j+2);i++)if(i!==j){if(!pinned[i])rhs[i]-=get(i,j)*S[j];set(i,j,0);}a0[j]=1;rhs[j]=S[j];}
 const d=new Float64Array(n),l1=new Float64Array(n),l2=new Float64Array(n),x=new Float64Array(n);
 for(let i=0;i<n;i++){if(i>=2)l2[i]=a2[i-2]/d[i-2];if(i>=1)l1[i]=(a1[i-1]-(i>=2?l2[i]*d[i-2]*l1[i-1]:0))/d[i-1];d[i]=a0[i]-(i>=1?l1[i]*l1[i]*d[i-1]:0)-(i>=2?l2[i]*l2[i]*d[i-2]:0);}
 for(let i=0;i<n;i++)x[i]=rhs[i]-(i>=1?l1[i]*x[i-1]:0)-(i>=2?l2[i]*x[i-2]:0);
 for(let i=0;i<n;i++)x[i]/=d[i];
 for(let i=n-1;i>=0;i--)x[i]-=(i+1<n?l1[i+1]*x[i+1]:0)+(i+2<n?l2[i+2]*x[i+2]:0);
 return x;
}
// Forward and backward passes keep neighbouring grid levels within the grade limit; pinned levels stay.
function limitGrade(gs,S,g,pinned){const n=S.length;for(let pass=0;pass<4;pass++){for(let j=1;j<n;j++)if(!pinned[j]){const d=g*(gs[j]-gs[j-1]);S[j]=Math.max(S[j-1]-d,Math.min(S[j-1]+d,S[j]));}for(let j=n-2;j>=0;j--)if(!pinned[j]){const d=g*(gs[j+1]-gs[j]);S[j]=Math.max(S[j+1]-d,Math.min(S[j+1]+d,S[j]));}}}
// Gaussian smoothing of values on a uniform grid (spacing gs[1]-gs[0]), the kernel cut at 2.5 sigma; near the ends it is renormalised.
function gauss(gs,v,sigma){const n=v.length,h=gs[1]-gs[0]||1,r=Math.ceil(sigma*2.5/h),w=new Float64Array(r+1),out=new Float64Array(n);for(let k=0;k<=r;k++)w[k]=Math.exp(-(k*h)*(k*h)/(2*sigma*sigma));
 for(let j=0;j<n;j++){let a=v[j]*w[0],b=w[0];for(let k=1;k<=r;k++){if(j-k>=0){a+=v[j-k]*w[k];b+=w[k];}if(j+k<n){a+=v[j+k]*w[k];b+=w[k];}}out[j]=a/b;}return out;}
const cache=new WeakMap();
// createRoadGeometry(data,height): height(x,z) is the terrain. Computed once per data object.
export function createRoadGeometry(data,height,tune={}){
 const hit=cache.get(data);if(hit&&hit.height===height)return hit.geometry;
 const roads=data.roads,edges=data.edges||[],nodes=data.nodes||{};
 // 1. Points that never move: edge ends (junctions, road ends, parking places), roundabout rings, road ends, vertices shared by several roads.
 const fixed=new Set(),ringKeys=new Set(),cnt=new Map();
 for(const e of edges){for(const n of [e.path[0],e.path.at(-1)])if(nodes[n])fixed.add(nk(nodes[n]));if(e.roundabout)for(const n of e.path)if(nodes[n]){fixed.add(nk(nodes[n]));ringKeys.add(nk(nodes[n]));}}
 for(const r of roads)for(const q of r.p){const k=nk(q);cnt.set(k,(cnt.get(k)||0)+1);}
 const isFixed=q=>{const k=nk(q);return fixed.has(k)||cnt.get(k)>1;};
 // Buildings by 20 m cell: a road bend is not rounded into a house.
 const bcells=new Map(),inPoly=(poly,x,z)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [ax,az]=poly[j],[bx,bz]=poly[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
 for(const b of data.buildings||[]){if(b.t?.building==='roof')continue;const xs=b.p.map(q=>q[0]),zs=b.p.map(q=>q[1]),box=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];
  for(let i=Math.floor(box[0]/20);i<=Math.floor(box[2]/20);i++)for(let j=Math.floor(box[1]/20);j<=Math.floor(box[3]/20);j++){const k=i*4096+j;if(!bcells.has(k))bcells.set(k,[]);bcells.get(k).push({p:b.p,box});}}
 const inBuilding=(x,z)=>{for(const b of bcells.get(Math.floor(x/20)*4096+Math.floor(z/20))||[])if(x>=b.box[0]&&x<=b.box[2]&&z>=b.box[1]&&z<=b.box[3]&&inPoly(b.p,x,z))return true;return false;};
 const hits=(path,hw)=>{let n=0;for(let i=0;i<path.length;i++){const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,nx=-dz/l*hw,nz=dx/l*hw;if(inBuilding(path[i][0]+nx,path[i][1]+nz))n++;if(inBuilding(path[i][0]-nx,path[i][1]-nz))n++;}return n;};
 // 2. Dense plan per road.
 const R=roads.map((road,ri)=>{const type=road.type,width=roadWidth(road),p=road.p,ring=p.length>3&&nk(p[0])===nk(p.at(-1))&&p.every(q=>ringKeys.has(nk(q))),plan=smoothPlan(p,type,isFixed,ring,path=>hits(path,width/2)),n=plan.pts.length,s=new Float64Array(n);
  for(let i=1;i<n;i++)s[i]=s[i-1]+Math.hypot(plan.pts[i][0]-plan.pts[i-1][0],plan.pts[i][1]-plan.pts[i-1][1]);
  return {road,ri,type,width,hw:width/2,pts:plan.pts,first:plan.first,last:plan.last,s,y:new Float64Array(n).fill(NaN),bridge:!!road.bridge,ring};});
 // 3. Nodes: road ends and every vertex several roads share; arms leave a node along a road.
 const reg=new Map(),armOf=new Map();
 for(const r of R){const m=r.road.p.length-1;r.road.p.forEach((q,i)=>{const k=nk(q);if(!(i===0||i===m||cnt.get(k)>1))return;let n=reg.get(k);if(!n){n={key:k,x:q[0],z:q[1],arms:[],kind:'end',links:[]};reg.set(k,n);}
  for(const [dir,di] of [[1,r.last[i]],[-1,r.first[i]]]){if(dir>0?i===m:i===0)continue;const arm={ri:r.ri,dir,di,node:n,key:r.ri+':'+di+':'+dir};n.arms.push(arm);armOf.set(arm.key,arm);}});}
 const cutList=R.map(()=>new Set());for(const n of reg.values())for(const a of n.arms)cutList[a.ri].add(a.di);
 const cuts=cutList.map(c=>[...c].sort((a,b)=>a-b));
 for(const n of reg.values())for(const a of n.arms){const r=R[a.ri],cl=cuts[a.ri],k=cl.indexOf(a.di),other=a.dir>0?cl[k+1]:cl[k-1];
  a.d=armDirection(r.pts,a.di,a.dir);a.straight=straightRun(r.pts,a.di,a.dir,a.d);a.len=other===undefined?0:Math.abs(r.s[other]-r.s[a.di]);a.w=r.hw;
  const on=other===undefined?null:reg.get(nk(r.pts[other]));a.dead=!!on&&on.arms.length===1;}
 // 4. Classify. Arms that carry straight on (within 30 degrees) form a link: the level runs on smoothly through the node. Two arms that
 // carry on at one width need no patch at all; every other node with two or more arms gets a paved patch.
 for(const n of reg.values()){const k=n.arms.length;if(k<2)continue;const pairs=[];
  for(let i=0;i<k;i++)for(let j=i+1;j<k;j++){const dot=n.arms[i].d[0]*n.arms[j].d[0]+n.arms[i].d[1]*n.arms[j].d[1];if(dot<-.87&&R[n.arms[i].ri].bridge===R[n.arms[j].ri].bridge)pairs.push([dot,i,j]);} // a bridge deck is its own profile
  pairs.sort((a,b)=>a[0]-b[0]);const used=new Set();for(const [,i,j] of pairs){if(used.has(i)||used.has(j))continue;used.add(i);used.add(j);n.links.push([n.arms[i],n.arms[j]]);n.arms[i].mate=n.arms[j];n.arms[j].mate=n.arms[i];}
  const [a,b]=n.arms;n.kind=k===2&&n.links.length&&a.d[0]*b.d[0]+a.d[1]*b.d[1]<-.94&&Math.abs(a.w-b.w)<.01?'through':'patch';}
 const patches=[];
 for(const n of reg.values()){for(const a of n.arms)a.t=0;if(n.kind!=='patch')continue;
  const arms=n.arms.map(a=>({d:a.d,w:a.w,rc:cornerRadius(R[a.ri].type),maxT:Math.max(0,Math.min(22,a.straight*.97,a.len*(a.dead?.9:.45))),src:a}));
  const geo=junctionPatch([n.x,n.z],arms);for(const a of arms)a.src.t=a.t;
  patches.push({node:n,x:n.x,z:n.z,arms:arms.map(a=>a.src),chains:geo.chains,mouths:geo.mouths,level:0});n.patch=patches.at(-1);}
 // 5. Pieces between nodes chain up through linked arms; a chain is one continuous carriageway (and one profile).
 const pieces=[],pieceAt=new Map();
 for(const r of R){const cl=cuts[r.ri];for(let k=0;k+1<cl.length;k++)if(cl[k+1]>cl[k]){const p={ri:r.ri,a:cl[k],b:cl[k+1],used:false};pieces.push(p);pieceAt.set(r.ri+':'+p.a+':1',{piece:p,end:'a'});pieceAt.set(r.ri+':'+p.b+':-1',{piece:p,end:'b'});}}
 const endArm=(p,end)=>armOf.get(p.ri+':'+(end==='a'?p.a:p.b)+':'+(end==='a'?1:-1));
 const linkedEnd=(p,end)=>{const m=endArm(p,end)?.mate;return m?pieceAt.get(m.key)||null:null;};
 const chains=[];
 function walk(p,enter){const c={x:[],z:[],ri:[],di:[],occ:[],closed:false};let cur=p,e=enter;
  const occ=(i,arm,sign)=>{let o=c.occ.at(-1);if(!o||o.i!==i){o={i,node:arm.node,arms:[]};c.occ.push(o);}o.arms.push({arm,sign});arm.chain=c;arm.ci=i;arm.sign=sign;};
  for(let guard=0;guard<5000;guard++){cur.used=true;const r=R[cur.ri],fwd=e==='a',from=fwd?cur.a:cur.b,to=fwd?cur.b:cur.a;
   occ(c.x.length?c.x.length-1:0,endArm(cur,e),1);
   for(let i=from;fwd?i<=to:i>=to;i+=fwd?1:-1){if(c.x.length&&i===from)continue;c.x.push(r.pts[i][0]);c.z.push(r.pts[i][1]);c.ri.push(cur.ri);c.di.push(i);}
   const out=fwd?'b':'a';occ(c.x.length-1,endArm(cur,out),-1);const nxt=linkedEnd(cur,out);
   if(!nxt)break;if(nxt.piece.used){c.closed=true;break;}cur=nxt.piece;e=nxt.end;}
  return c;}
 for(const p of pieces){if(p.used)continue;for(const end of ['a','b'])if(!linkedEnd(p,end)&&!p.used)chains.push(walk(p,end));}
 for(const p of pieces)if(!p.used)chains.push(walk(p,'a'));
 // 6. Profile. The target along each chain is the terrain under the centre line plus a lift that keeps the road above the uphill kerb-side ground, lightly smoothed.
 // All roads at a patch node share one level there; a smoothing spline with a grade limit does the rest. Side roads then start along the through road's plane.
 for(const c of chains){const n=c.x.length;c.s=new Float64Array(n);for(let i=1;i<n;i++)c.s[i]=c.s[i-1]+Math.hypot(c.x[i]-c.x[i-1],c.z[i]-c.z[i-1]);c.len=c.s[n-1];
  const r0=R[c.ri[0]];c.type=r0.type;c.g=maxGrade(c.type);c.bridge=c.ri.every(ri=>R[ri].bridge);c.pins=c.occ.filter(o=>o.node.kind==='patch');
  const N=Math.max(2,Math.round(c.len/2)),gs0=new Float64Array(N+1),raw=new Float64Array(N+1),cross=new Float64Array(N+1);let i=0;
  for(let j=0;j<=N;j++){const sv=gs0[j]=c.len*j/N;while(i<n-2&&c.s[i+1]<sv)i++;const f=Math.max(0,Math.min(1,(sv-c.s[i])/((c.s[i+1]-c.s[i])||1))),x=c.x[i]+(c.x[i+1]-c.x[i])*f,z=c.z[i]+(c.z[i+1]-c.z[i])*f;raw[j]=height(x,z);
   if(j%3===0||j===N){const dx=c.x[i+1]-c.x[i],dz=c.z[i+1]-c.z[i],l=Math.hypot(dx,dz)||1,a=R[c.ri[i]].hw+KERB,nx=-dz/l*a,nz=dx/l*a;cross[j]=Math.abs(height(x+nx,z+nz)-height(x-nx,z-nz))/2;}}
  for(let j=0;j<=N;j++){if(!(j%3===0||j===N)){const j0=j-j%3,j1=Math.min(N,j0+3);cross[j]=cross[j0]+(cross[j1]-cross[j0])*(j-j0)/(j1-j0);}raw[j]+=.22+Math.min(.7,.55*cross[j]);}
  const S0=gauss(gs0,raw,6);c.target=sv=>{const u=Math.max(0,Math.min(N-1e-9,sv/c.len*N)),j=Math.floor(u);return S0[j]+(S0[j+1]-S0[j])*(u-j);};}
 // The node level is what the road that carries on through it wants (both roads at a crossing); side roads follow it. Nodes without a through road average their arms.
 for(const c of chains)for(const o of c.pins){const w=o.node.links.length?(o.arms.some(a=>a.arm.mate)?1:0):1;if(w){o.node.sumP=(o.node.sumP||0)+c.target(c.s[o.i]);o.node.numP=(o.node.numP||0)+1;}}
 for(const n of reg.values())if(n.numP)n.P=n.sumP/n.numP;
 // Patch nodes closer than 4 m (the lanes of a split road meeting a roundabout) share one level, so their overlapping ribbons agree.
 const pn=[...reg.values()].filter(n=>n.P!==undefined),cellOf=new Map();for(const n of pn){const k=Math.floor(n.x/4)+','+Math.floor(n.z/4);if(!cellOf.has(k))cellOf.set(k,[]);cellOf.get(k).push(n);}
 const grp=new Map(pn.map(n=>[n,n]));const find=n=>{while(grp.get(n)!==n)n=grp.get(n);return n;};
 for(const n of pn)for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const m of cellOf.get((Math.floor(n.x/4)+i)+','+(Math.floor(n.z/4)+j))||[])if(m!==n&&Math.hypot(m.x-n.x,m.z-n.z)<4)grp.set(find(m),find(n));
 const groups=new Map();for(const n of pn){const r=find(n);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(n);}
 for(const l of groups.values())if(l.length>1){const P=l.reduce((a,n)=>a+n.P,0)/l.length;for(const n of l)n.P=P;}
 const pairs=[];for(const c of chains){const order=c.pins.map(o=>[c.s[o.i],o.node]).sort((a,b)=>a[0]-b[0]);for(let k=0;k+1<order.length;k++){const [sa,A]=order[k],[sb,B]=order[k+1];if(A!==B)pairs.push([A,B,c.g*.85*Math.max(sb-sa,1.5)]);}}
 for(let it=0;it<200;it++){let moved=0;for(const [A,B,lim] of pairs){const d=B.P-A.P;if(Math.abs(d)>lim){const e=(Math.abs(d)-lim)/2*Math.sign(d);A.P+=e;B.P-=e;moved++;}}if(!moved)break;}
 function solve(c,extra){
  const pl=[...c.pins.map(o=>({s:c.s[o.i],v:o.node.P})),...(extra||[])];
  // A closed chain (a ring) meets itself: both ends get the same level.
  if(c.closed){const a=pl.find(p=>p.s<.1),b=pl.find(p=>p.s>c.len-.1),v=a?a.v:b?b.v:(c.target(0)+c.target(c.len))/2;if(!a)pl.push({s:0,v});if(!b)pl.push({s:c.len,v});}
  const bps=[0,c.len,...pl.map(p=>p.s)].sort((a,b)=>a-b).filter((v,i,l)=>i===0||v-l[i-1]>.05),gs=[];
  for(let k=0;k+1<bps.length;k++){const len=bps[k+1]-bps[k],cn=Math.max(1,Math.round(len/2));for(let m=0;m<cn;m++)gs.push(bps[k]+len*m/cn);}gs.push(bps.at(-1));
  const G=gs.length,S=Float64Array.from(gs,c.target),pinned=new Uint8Array(G);
  for(const p of pl){let lo=0,hi=G-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(gs[mid]<=p.s)lo=mid;else hi=mid;}const j=p.s-gs[lo]<gs[hi]-p.s?lo:hi;S[j]=p.v;pinned[j]=1;}
  let y;if(c.bridge)y=Float64Array.from(gs,v=>S[0]+(S[G-1]-S[0])*v/c.len);else{limitGrade(gs,S,c.g,pinned);y=fitProfile(gs,S,pinned,tune.lambda??9000);}
  c.gs=Float64Array.from(gs);c.gy=y;c.at=sv=>{let lo=0,hi=G-1;if(sv<=gs[0])return y[0];if(sv>=gs[hi])return y[hi];while(hi-lo>1){const mid=(lo+hi)>>1;if(gs[mid]<=sv)lo=mid;else hi=mid;}return y[lo]+(y[hi]-y[lo])*(sv-gs[lo])/(gs[hi]-gs[lo]);};
  for(let i=0;i<c.x.length;i++)R[c.ri[i]].y[c.di[i]]=c.at(c.s[i]);
  for(const o of c.occ)for(const {arm} of o.arms)R[arm.ri].y[arm.di]=c.at(c.s[o.i]);}
 for(const c of chains)solve(c);
 const extras=new Map();
 for(const n of reg.values()){if(n.kind!=='patch'||!n.links.length)continue;const [a,b]=n.links[0],c=a.chain;if(!c||b.chain!==c)continue;
  const sN=c.s[a.ci],s0=Math.max(0,sN-3),s1=Math.min(c.len,sN+3),g=(c.at(s1)-c.at(s0))/((s1-s0)||1),u=a.sign===1?a.d:[-a.d[0],-a.d[1]];
  for(const arm of n.arms){if(!arm.chain||arm.t<.5||n.links.some(l=>l.includes(arm))||Math.abs(arm.d[0]*u[0]+arm.d[1]*u[1])<.5)continue;const cc=arm.chain,sp=cc.s[arm.ci]+arm.sign*arm.t;if(sp<=.05||sp>=cc.len-.05)continue;
   if(!extras.has(cc))extras.set(cc,[]);extras.get(cc).push({s:sp,v:n.P+g*(arm.d[0]*u[0]+arm.d[1]*u[1])*arm.t});}}
 const steep=c=>{for(let j=0;j+1<c.gs.length;j++)if(Math.abs(c.gy[j+1]-c.gy[j])>c.g*1.3*(c.gs[j+1]-c.gs[j]))return true;return false;};
 for(const [c,list] of extras){solve(c,list);if(steep(c)){solve(c);}}
 for(const r of R)for(let i=0;i<r.pts.length;i++)if(Number.isNaN(r.y[i]))r.y[i]=height(...r.pts[i])+.3;
 // 7. Ribbons (each reaches 3 cm into the patch it meets, so there is no crack): the stretches of a chain between patch nodes, cut short by the setback of the patch at each end. Patch levels: each arm's mouth level comes from its own road.
 const ribbons=[];
 for(const c of chains){const idx=[0,...c.occ.filter(o=>o.node.kind==='patch').map(o=>o.i),c.x.length-1].sort((a,b)=>a-b).filter((v,i,l)=>i===0||v!==l[i-1]);
  const armOf2=(i,sign)=>{const a=c.occ.find(o=>o.i===i)?.arms.find(a=>a.sign===sign)?.arm;return a&&a.node.kind==='patch'&&a.t>0?a:null;},tOf=(i,sign)=>armOf2(i,sign)?.t||0;
  for(let k=0;k+1<idx.length;k++){const i0=idx[k],i1=idx[k+1],t0=tOf(i0,1),t1=tOf(i1,-1),s0=c.s[i0]+t0-(t0>0?.03:0),s1=c.s[i1]-t1+(t1>0?.03:0);if(s1-s0>.3)ribbons.push({c,i0,i1,s0,s1,hw:R[c.ri[Math.min(i0+1,c.ri.length-1)]].hw,arm0:armOf2(i0,1),arm1:armOf2(i1,-1)});}}
 for(const pt of patches){pt.level=pt.node.P;for(const a of pt.arms)a.mouthY=a.chain?a.chain.at(a.chain.s[a.ci]+a.sign*a.t):pt.level;}
 const geometry={roads:R,nodes:reg,patches,chains,ribbons};
 geometry.edgeLine=(path,lift=0)=>edgeLine(geometry,data,path,lift);
 // The centre lines as straight segments for proximity checks (trees, bus stops): a segment runs as far as the road stays within 30 cm of it.
 geometry.roadSegments=()=>R.flatMap(r=>{const out=[],p=r.pts,n=p.length;let a=0;
  while(a<n-1){let b=a+1;for(let e=Math.min(n-1,a+50);e>b;e--){const dx=p[e][0]-p[a][0],dz=p[e][1]-p[a][1],l=Math.hypot(dx,dz)||1;let ok=true;for(let k=a+1;k<e&&ok;k++)if(Math.abs((p[k][0]-p[a][0])*dz-(p[k][1]-p[a][1])*dx)/l>.3)ok=false;if(ok){b=e;break;}}
   out.push([p[a],p[b],r.width]);a=b;}
  return out;});
 cache.set(data,{height,geometry});return geometry;
}
// The car's centre line along an edge path (node ids): the dense centre-line samples of the roads it runs on, each [x,z,y+lift].
function edgeLine(geo,data,path,lift){
 const R=geo.roads,nodes=data.nodes;
 if(!geo.segMap){geo.segMap=new Map();for(const r of R){const p=r.road.p;for(let i=0;i+1<p.length;i++){geo.segMap.set(nk(p[i])+'|'+nk(p[i+1]),{r,i,fwd:true});geo.segMap.set(nk(p[i+1])+'|'+nk(p[i]),{r,i,fwd:false});}}}
 const out=[],push=(x,z,y)=>{const l=out.at(-1);if(l&&Math.hypot(x-l[0],z-l[1])<.05)return;out.push([x,z,y+lift]);};
 const level=(x,z)=>{let best=1e9,y=0;for(const r of R)for(let i=0;i<r.pts.length;i++){const d=Math.hypot(r.pts[i][0]-x,r.pts[i][1]-z);if(d<best){best=d;y=r.y[i];}}return y;};
 let k=0;
 while(k<path.length-1){const a=nodes[path[k]],b=nodes[path[k+1]],seg=geo.segMap.get(nk(a)+'|'+nk(b));
  if(!seg){const ya=level(...a),yb=level(...b),len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(len/STEP));for(let j=0;j<=n;j++)push(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n,ya+(yb-ya)*j/n);k++;continue;}
  // Extend over consecutive vertices of the same road in the same direction.
  let e=k+1;const {r,i,fwd}=seg;let vi=fwd?i+1:i;
  while(e<path.length-1){const nx=geo.segMap.get(nk(nodes[path[e]])+'|'+nk(nodes[path[e+1]]));if(!nx||nx.r!==r||nx.fwd!==fwd||(fwd?nx.i!==vi:nx.i+1!==vi))break;vi=fwd?nx.i+1:nx.i;e++;}
  const from=fwd?r.last[i]:r.last[i+1],to=r.first[vi];
  if(fwd)for(let j=from;j<=to;j++)push(r.pts[j][0],r.pts[j][1],r.y[j]);else for(let j=from;j>=to;j--)push(r.pts[j][0],r.pts[j][1],r.y[j]);
  k=e;}
 return out;
}
