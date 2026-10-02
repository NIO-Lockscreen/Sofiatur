import {createRoadGeometry,KERB,KERB_DROP} from './road-geometry.js';
// The drawn road, built from the shared road geometry (road-geometry.js): continuous level ribbons along every road, a paved
// patch with curb returns at every junction, a kerb band along the outer edges. The world renders exactly these primitives and
// the car rides on them, so it cannot sink below the road where the terrain bends between two map nodes.
// The ground follows the road: vertices of the 8 m ground grid are lowered where they would poke through, and verge strips slope from the
// kerb edge down to the ground where the road stands above it.
// Primitives are kept as plain numbers (class, road index, corner count, corners as x,y,z); paint() hands them to the renderer and
// quads/extra/verges give them as objects {road,kerb,x,z,corners} for checks. Classes: 0 asphalt, 1 kerb band, 2 island grass, 3 verge, 4 steep patch triangle.
const QS=[[.5,.6],[.5,1],[.2,1],[.8,1]],GRID=8,SLOPE=.6,CLEAR=.16; // ground grid, verge batter (rise per metre out), how far below the kerb top the ground must lie
const WARP=4,STEEP=1,WEDGE=24,CUT_AT=[1.2,3.6];
const FILL_FLAT=4,FILL_SLOPE=.18,FILL_REACH=12,FILL_MAX=3.5,FILL_LAKE=20; // raising the ground beside a road: flat shoulder, then the fall per metre, its reach, the most it is raised, and how far it stays off a lake
const inPoly=(p,x,z)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [ax,az]=p[j],[bx,bz]=p[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
const edgeDist=(p,x,z)=>{let m=Infinity;for(let i=0;i<p.length-1;i++){const [ax,az]=p[i],[bx,bz]=p[i+1],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));m=Math.min(m,Math.hypot(x-ax-t*dx,z-az-t*dz));}return m;}; // ribbon tilt length at a steep corner, its slope limit, wedge reach from the node, and the lateral offsets checked beside an arm
// Least-squares plane through the patches of one cluster (node levels and every arm's mouth level): the fans' heights follow it, so overlapping patches
// (the lanes of a split road meeting a roundabout) lie in one plane and the surface shades smoothly.
function fitPlane(list){
 const pts=[];for(const pt of list){pts.push([pt.x,pt.z,pt.level,3]);for(const m of pt.mouths)pts.push([(m.R[0]+m.L[0])/2,(m.R[1]+m.L[1])/2,m.arm.mouthY,1]);}
 const sw=pts.reduce((a,p)=>a+p[3],0),mx=pts.reduce((a,p)=>a+p[0]*p[3],0)/sw,mz=pts.reduce((a,p)=>a+p[1]*p[3],0)/sw,my=pts.reduce((a,p)=>a+p[2]*p[3],0)/sw;
 let a=1e-3,b=0,c=1e-3,d=0,e=0;for(const [x,z,y,w] of pts){const dx=x-mx,dz=z-mz,dy=y-my;a+=w*dx*dx;b+=w*dx*dz;c+=w*dz*dz;d+=w*dx*dy;e+=w*dz*dy;}
 const det=a*c-b*b,gx=(d*c-e*b)/det,gz=(a*e-b*d)/det;return (x,z)=>my+gx*(x-mx)+gz*(z-mz);
}
// Patches within 9 m of each other form a cluster.
function clusterPlanes(patches){
 const parent=new Map(patches.map(p=>[p,p])),find=p=>{while(parent.get(p)!==p)p=parent.get(p);return p;},cells=new Map();
 for(const p of patches){const k=Math.floor(p.x/9)+','+Math.floor(p.z/9);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(p);}
 for(const p of patches)for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const q of cells.get((Math.floor(p.x/9)+i)+','+(Math.floor(p.z/9)+j))||[])if(q!==p&&Math.hypot(p.x-q.x,p.z-q.z)<9)parent.set(find(q),find(p));
 const groups=new Map();for(const p of patches){const r=find(p);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(p);}
 const plane=new Map();for(const l of groups.values()){const f=fitPlane(l);for(const p of l)plane.set(p,f);}return plane;
}
export function createRoadSurface(roads,height,data,tune={}){
 const geo=createRoadGeometry(data||{roads,edges:[],nodes:{}},height,tune),R=geo.roads;
 // Steep corners: where two neighbouring arms leave at levels too far apart for the short curb return between them (a step face), the corner takes the mean of the
 // two levels and each arm's ribbon tilts into it over its first WARP metres: a slope instead of a wall. wL/wR: level change of an arm's left/right mouth corner.
 for(const pt of geo.patches){for(const a of pt.arms)a.wL=a.wR=0;
  // A lane that ends on a roundabout tilts into the ring's plane over its last metres: its mouth corners take the plane's level.
  if(pt.round){for(const a of pt.arms){if(!a.mouth||!a.chain)continue;const pl=pt.round.plane,X=pt.x+a.d[0]*a.t,Z=pt.z+a.d[1]*a.t;a.wL=pl(X-a.d[1]*a.w,Z+a.d[0]*a.w)-a.mouthY;a.wR=pl(X+a.d[1]*a.w,Z-a.d[0]*a.w)-a.mouthY;}continue;}
  for(const ch of pt.chains){const q=ch.pts;let len=0;for(let k=1;k<q.length;k++)len+=Math.hypot(q[k][0]-q[k-1][0],q[k][1]-q[k-1][1]);
   if(ch.A!==ch.B&&Math.abs(ch.B.mouthY-ch.A.mouthY)>(tune.steep??STEEP)*Math.max(len,.3)){const m=(ch.A.mouthY+ch.B.mouthY)/2;ch.A.wL=m-ch.A.mouthY;ch.B.wR=m-ch.B.mouthY;}}}
 const ease=x=>{x=Math.max(0,Math.min(1,x));return 1-x*x*(3-2*x);};
 const warpLen=rb=>Math.max(.5,Math.min(WARP,(rb.s1-rb.s0)/2)),warped=(a)=>a&&(a.wL||a.wR);
 // Level change of a ribbon's two edges at station s: [towards its +normal side, towards the other]. The start arm's left mouth corner is on the +normal side, the end arm's right one.
 const ew=[0,0];
 function edgeWarp(rb,s){let p=0,m=0;if(warped(rb.arm0)||warped(rb.arm1)){const L=warpLen(rb);
  if(warped(rb.arm0)){const f=ease((s-rb.s0)/L);p+=f*rb.arm0.wL;m+=f*rb.arm0.wR;}
  if(warped(rb.arm1)){const f=ease((rb.s1-s)/L);p+=f*rb.arm1.wR;m+=f*rb.arm1.wL;}}
  ew[0]=p;ew[1]=m;}
 // Primitives are numbers in growing typed arrays: class, road, corner count, corners (x,y,z each). Drawn triangles (not verges) are also kept apart, nine numbers each with their road,
 // and indexed by the 8 m cells their bounding box touches (buildGrid, once everything is drawn) for heightAt.
 const store=()=>({a:new Float64Array(4096),n:0}),stores={ribbon:store(),patch:store(),verge:store()};
 let T9=new Float64Array(9*8192),TR=new Int32Array(8192),TN=0;
 const grow=(st,k)=>{const b=new Float64Array(Math.max(st.a.length*2,st.n+k));b.set(st.a.subarray(0,st.n));st.a=b;};
 function addTri(ri,x0,y0,z0,x1,y1,z1,x2,y2,z2){if(TN+9>T9.length){const b=new Float64Array(T9.length*2);b.set(T9);T9=b;const r=new Int32Array(TR.length*2);r.set(TR);TR=r;}
  T9[TN]=x0;T9[TN+1]=y0;T9[TN+2]=z0;T9[TN+3]=x1;T9[TN+4]=y1;T9[TN+5]=z1;T9[TN+6]=x2;T9[TN+7]=y2;T9[TN+8]=z2;TR[TN/9]=ri;TN+=9;}
 function tri(st,cls,ri,x0,y0,z0,x1,y1,z1,x2,y2,z2){if(st.n+12>st.a.length)grow(st,12);const a=st.a,n=st.n;a[n]=cls;a[n+1]=ri;a[n+2]=3;a[n+3]=x0;a[n+4]=y0;a[n+5]=z0;a[n+6]=x1;a[n+7]=y1;a[n+8]=z1;a[n+9]=x2;a[n+10]=y2;a[n+11]=z2;st.n=n+12;if(cls!==3)addTri(ri,x0,y0,z0,x1,y1,z1,x2,y2,z2);}
 function quad(st,cls,ri,x0,y0,z0,x1,y1,z1,x2,y2,z2,x3,y3,z3,flip){if(st.n+15>st.a.length)grow(st,15);const a=st.a,n=st.n;a[n]=flip?cls+8:cls;a[n+1]=ri;a[n+2]=4;a[n+3]=x0;a[n+4]=y0;a[n+5]=z0;a[n+6]=x1;a[n+7]=y1;a[n+8]=z1;a[n+9]=x2;a[n+10]=y2;a[n+11]=z2;a[n+12]=x3;a[n+13]=y3;a[n+14]=z3;st.n=n+15;
  if(cls===3)return;if(flip){addTri(ri,x1,y1,z1,x2,y2,z2,x3,y3,z3);addTri(ri,x1,y1,z1,x3,y3,z3,x0,y0,z0);}else{addTri(ri,x0,y0,z0,x1,y1,z1,x2,y2,z2);addTri(ri,x0,y0,z0,x2,y2,z2,x3,y3,z3);}}
 // Cells of 8 m over a list of boxes: a compressed index (cell -> list of item ids) with the grid origin and size. box(id) returns [x0,z0,x1,z1].
 function gridOf(count,box){let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;const b=new Float64Array(4*count+4);
  for(let t=0;t<count;t++){box(t,b,4*t);x0=Math.min(x0,b[4*t]);z0=Math.min(z0,b[4*t+1]);x1=Math.max(x1,b[4*t+2]);z1=Math.max(z1,b[4*t+3]);}
  if(!count)x0=z0=x1=z1=0;
  const GX=Math.floor(x0/8),GZ=Math.floor(z0/8),GW=Math.floor(x1/8)-GX+1,GH=Math.floor(z1/8)-GZ+1,start=new Int32Array(GW*GH+1);
  const each=fn=>{for(let t=0;t<count;t++){const i0=Math.floor(b[4*t]/8)-GX,i1=Math.floor(b[4*t+2]/8)-GX,j1=Math.floor(b[4*t+3]/8)-GZ;for(let j=Math.floor(b[4*t+1]/8)-GZ;j<=j1;j++)for(let i=i0;i<=i1;i++)fn(j*GW+i,t);}};
  each(c=>{start[c+1]++;});for(let c=0;c<GW*GH;c++)start[c+1]+=start[c];
  const ids=new Int32Array(start[GW*GH]),fill=start.slice(0,GW*GH);each((c,t)=>{ids[fill[c]++]=t;});
  return {GX,GZ,GW,GH,start,ids,box:b};}
 let grid=null; // of the drawn triangles
 function buildGrid(){grid=gridOf(TN/9,(t,b,o)=>{const q=9*t;b[o]=Math.min(T9[q],T9[q+3],T9[q+6]);b[o+1]=Math.min(T9[q+2],T9[q+5],T9[q+8]);b[o+2]=Math.max(T9[q],T9[q+3],T9[q+6]);b[o+3]=Math.max(T9[q+2],T9[q+5],T9[q+8]);});
  // Per cell: the first road with a drawn triangle in it, and whether there are several: a verge asks heightAt only where a road other than its own could be.
  const {GW,GH,start,ids}=grid;grid.multi=new Uint8Array(GW*GH);grid.first=new Int32Array(GW*GH).fill(-1);for(let c=0;c<GW*GH;c++){let r=-1;for(let k=start[c];k<start[c+1];k++){const v=TR[ids[k]];if(r<0){r=v;grid.first[c]=v;}else if(v!==r){grid.multi[c]=1;break;}}}}
 // The ground grid: terrain heights at its vertices (cached) and how far each is lowered.
 const tr=data?.terrain,LX=tr?Math.round((tr.nx-1)*tr.step/GRID)+1:0,LZ=tr?Math.round((tr.nz-1)*tr.step/GRID)+1:0,delta=tr?new Float32Array(LX*LZ):null,tv=tr?new Float32Array(LX*LZ).fill(NaN):null;
 const vT=idx=>{if(Number.isNaN(tv[idx]))tv[idx]=height(tr.x0+(idx%LX)*GRID,tr.z0+Math.floor(idx/LX)*GRID);return tv[idx];};
 const ci=[],cw=[],cl=[]; // constraints: the ground under (x,z) must lie below a limit; three vertices and their weights
 function need(x,z,limit){if(!tr)return;const fx=(x-tr.x0)/GRID,fz=(z-tr.z0)/GRID,i=Math.floor(fx),j=Math.floor(fz);if(i<0||j<0||i>LX-2||j>LZ-2)return;
  const u=fx-i,v=fz-j,a=j*LX+i;let b,d,wa,wb,wc;if(u>=v){b=a+1;d=a+LX+1;wa=1-u;wb=u-v;wc=v;}else{b=a+LX+1;d=a+LX;wa=1-v;wb=u;wc=v-u;}
  if(wa*(vT(a)+delta[a])+wb*(vT(b)+delta[b])+wc*(vT(d)+delta[d])>limit+1e-4){ci.push(a,b,d);cw.push(wa,wb,wc);cl.push(limit);}}
 // Ground beside a road (2 October 2026). The 40 m terrain is too coarse for the streets: the road's own smoothed profile ran more than a metre above
 // the ground 5 m beyond the kerb along a quarter of all road metres, a bank and a ditch where the street really lies level with its gardens (the ditch
 // under the noise screens at the KIWI roundabout). Each grid vertex near a road is raised towards that road's level: CLEAR below it up to FILL_FLAT
 // beyond the kerb, then falling FILL_SLOPE per metre, so it meets the terrain again where a road really runs on a bank. Not by a bridge, nor at a lake.
 // delta starts with the raise; the lowering below still keeps the ground under every road surface.
 if(tr){const lakes=(data.areas||[]).filter(a=>a.type==='water'&&a.level!=null&&a.p?.length>2).map(a=>{const xs=a.p.map(v=>v[0]),zs=a.p.map(v=>v[1]);return {p:a.p,x0:Math.min(...xs)-FILL_LAKE,x1:Math.max(...xs)+FILL_LAKE,z0:Math.min(...zs)-FILL_LAKE,z1:Math.max(...zs)+FILL_LAKE};});
  const nearLake=(x,z)=>lakes.some(l=>x>l.x0&&x<l.x1&&z>l.z0&&z<l.z1&&(inPoly(l.p,x,z)||edgeDist(l.p,x,z)<FILL_LAKE));
  const raise=new Float32Array(LX*LZ),under=new Uint8Array(LX*LZ); // under: beneath or beside a bridge deck, where the valley stays as it is
  for(const r of R){if(!r.bridge||!r.pts)continue;const reach=r.hw+8;for(const [x,z] of r.pts){const i0=Math.max(0,Math.ceil((x-reach-tr.x0)/GRID)),i1=Math.min(LX-1,Math.floor((x+reach-tr.x0)/GRID)),j0=Math.max(0,Math.ceil((z-reach-tr.z0)/GRID)),j1=Math.min(LZ-1,Math.floor((z+reach-tr.z0)/GRID));
   for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)if(Math.hypot(tr.x0+i*GRID-x,tr.z0+j*GRID-z)<=reach)under[j*LX+i]=1;}}
  for(const r of R){if(r.bridge||!r.pts)continue;const reach=r.hw+FILL_FLAT+FILL_REACH;
   for(let k=0;k<r.pts.length;k+=2){const [x,z]=r.pts[k],y=r.y[k],i0=Math.max(0,Math.ceil((x-reach-tr.x0)/GRID)),i1=Math.min(LX-1,Math.floor((x+reach-tr.x0)/GRID)),j0=Math.max(0,Math.ceil((z-reach-tr.z0)/GRID)),j1=Math.min(LZ-1,Math.floor((z+reach-tr.z0)/GRID));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const d=Math.hypot(tr.x0+i*GRID-x,tr.z0+j*GRID-z);if(d>reach)continue;const a=j*LX+i,up=y-CLEAR-Math.max(0,d-r.hw-FILL_FLAT)*FILL_SLOPE-vT(a);if(up>raise[a])raise[a]=up;}}}
  for(let a=0;a<LX*LZ;a++)if(raise[a]>0&&!under[a]&&!nearLake(tr.x0+(a%LX)*GRID,tr.z0+Math.floor(a/LX)*GRID))delta[a]=Math.min(raise[a],FILL_MAX);}
 // A carriageway quad between two sections is a little twisted on a steep bend; it is split along the diagonal that leaves the two halves closer to one plane (flip: the other diagonal).
 const nrm=new Float64Array(12);
 function tilt(k,ax,ay,az,bx,by,bz,cx,cy,cz){const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az,nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;nrm[k]=nx/l;nrm[k+1]=ny/l;nrm[k+2]=nz/l;}
 function asphalt(ri,x0,y0,z0,x1,y1,z1,x2,y2,z2,x3,y3,z3){
  tilt(0,x0,y0,z0,x1,y1,z1,x2,y2,z2);tilt(3,x0,y0,z0,x2,y2,z2,x3,y3,z3);tilt(6,x1,y1,z1,x2,y2,z2,x3,y3,z3);tilt(9,x1,y1,z1,x3,y3,z3,x0,y0,z0);
  const flip=nrm[0]*nrm[3]+nrm[1]*nrm[4]+nrm[2]*nrm[5]<nrm[6]*nrm[9]+nrm[7]*nrm[10]+nrm[8]*nrm[11];quad(stores.ribbon,0,ri,x0,y0,z0,x1,y1,z1,x2,y2,z2,x3,y3,z3,flip);return flip;}
 // A triangle of a patch: drawn, and the ground below its corners, middle and edge midpoints kept lower.
 function fan(ri,x0,y0,z0,x1,y1,z1,x2,y2,z2){
  const ux=x1-x0,uy=y1-y0,uz=z1-z0,vx=x2-x0,vy=y2-y0,vz=z2-z0,wall=Math.hypot(uy*vz-uz*vy,ux*vy-uy*vx)>.7*Math.abs(uz*vx-ux*vz); // steep (over 35 degrees): a step between two roads' levels at a tight corner, drawn a little lighter to make up for the side lighting
  tri(stores.patch,wall?4:0,ri,x0,y0,z0,x1,y1,z1,x2,y2,z2);
  need(x0,z0,y0-CLEAR);need(x1,z1,y1-CLEAR);need(x2,z2,y2-CLEAR);need((x0+x1+x2)/3,(z0+z1+z2)/3,(y0+y1+y2)/3-CLEAR);need((x0+x1)/2,(z0+z1)/2,(y0+y1)/2-CLEAR);need((x1+x2)/2,(z1+z2)/2,(y1+y2)/2-CLEAR);}
 // Mouth of a lane that ends on a roundabout ring (road-geometry.js gives such a node no patch): the lane's ribbon stops square at the ring's outer edge and tilts into the ring's plane over its last metres.
 // Rows of quads in the ring's plane carry the lane's width on to the circle, and on each side a curb return (an arc tangent to the lane's edge and to the ring's outer circle, radius as large as R_MAX allows,
 // but opening no more than the room beside the lane leaves for the splitter island, ISLAND_MIN between the kerb bands) flares the entry and the exit. Kerb bands follow every edge that lies outside the circle.
 const R_MAX=5,OPEN_MAX=2.6,ISLAND_MIN=2.4,REACH=11;
 function laneAt(c,s){const n=c.s.length;let q=s<0?0:s>c.len?c.len:s,lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;if(c.s[m]<=q)lo=m;else hi=m;}
  const dx=c.x[hi]-c.x[lo],dz=c.z[hi]-c.z[lo],l=Math.hypot(dx,dz)||1,f=Math.max(0,Math.min(1,(q-c.s[lo])/((c.s[hi]-c.s[lo])||1)));return [c.x[lo]+dx*f+dx/l*(s-q),c.z[lo]+dz*f+dz/l*(s-q),dx/l,dz/l];}
 function mouth(pt,a){
  const g=pt.round,c=a.chain,plane=g.plane;if(!c||!plane)return;
  const sN=c.s[a.ci],sg=a.sign,Ro=g.R+g.hw,hw=a.w,ri=a.ri,tc=Math.max(.3,a.t),rb=geo.ribbons.find(r=>r.arm0===a||r.arm1===a),Lw=rb?warpLen(rb):1;
  const P=u=>{const q=laneAt(c,sN+sg*u);return {x:q[0],z:q[1],dx:q[2]*sg,dz:q[3]*sg};}; // the lane's centre line u metres from the node, and its direction away from the node
  const mm=plane(pt.x+a.d[0]*a.t,pt.z+a.d[1]*a.t)-a.mouthY,avail=(sg>0?c.len-sN:sN)-.5;
  // The level at a point: the ring's plane from the cut inwards, from there out the lane's own level, eased into the plane by the same blend as the ribbon's tilt (so it meets the ribbon's edge exactly).
  const lev=(x,z,u)=>{if(u<=tc)return plane(x,z);const p=P(u);return c.at(sN+sg*u)+ease((u-(a.t-.03))/Lw)*(plane(x,z)-plane(p.x,p.z)+mm);};
  const uOf=(x,z)=>Math.max(0,(x-pt.x)*a.d[0]+(z-pt.z)*a.d[1]);
  const pv=(x,z,u=uOf(x,z))=>[x,lev(x,z,u),z];
  const qf=(p0,p1,p2,p3)=>{fan(ri,...p0,...p1,...p2);fan(ri,...p0,...p2,...p3);};
  // Room at the ring on each side (0 left, 1 right of the lane as it leaves the node): the gap to the nearest other lane, less the narrowest island, shared between the two.
  const axis=[pt.x+a.d[0]*tc,pt.z+a.d[1]*tc],room=[Infinity,Infinity];
  for(const q of geo.patches){if(q.round!==g)continue;for(const b of q.arms){if(b===a||!b.mouth)continue;const tb=Math.max(.3,b.t),bx=q.x+b.d[0]*tb,bz=q.z+b.d[1]*tb,
    arc=Ro*Math.abs(Math.atan2((axis[0]-g.cx)*(bz-g.cz)-(axis[1]-g.cz)*(bx-g.cx),(axis[0]-g.cx)*(bx-g.cx)+(axis[1]-g.cz)*(bz-g.cz)));
    if(arc>Ro*1.1)continue;const side=(bx-axis[0])*-a.d[1]+(bz-axis[1])*a.d[0]>0?0:1;room[side]=Math.min(room[side],arc-hw-b.w);}}
  const open=room.map(r=>Math.max(0,Math.min(OPEN_MAX,(r-ISLAND_MIN)/2)));
  // Rows across the lane's width from just before the cut to the ring: until both edges and the middle lie inside the ring's asphalt.
  const us=[tc+.5,tc];for(let u=tc;u>0;){u=Math.max(0,u-.4);us.push(u);const p=P(u);if([-hw,0,hw].every(o=>Math.hypot(p.x-p.dz*o-g.cx,p.z+p.dx*o-g.cz)<=Ro-.25))break;}
  const rows=us.map(u=>({u,p:P(u)})),V=(r,o)=>pv(r.p.x-r.p.dz*o,r.p.z+r.p.dx*o,r.u);
  for(let j=0;j+1<rows.length;j++)qf(V(rows[j],hw),V(rows[j],-hw),V(rows[j+1],-hw),V(rows[j+1],hw));
  // Kerb band along a polyline of asphalt-edge points [x,y,z] with outward normals [nx,nz]; only the stretches outside the circle.
  const kerb=(pts,nrm)=>{let run=[];const flush=()=>{if(run.length>1)edges.push(run);run=[];};
   for(let k=0;k+1<pts.length;k++){const q0=pts[k],q1=pts[k+1];if(Math.hypot(q0[0]-g.cx,q0[2]-g.cz)<Ro+.05||Math.hypot(q1[0]-g.cx,q1[2]-g.cz)<Ro+.05){flush();continue;}
    // The band's inner edge (0.3 m under the asphalt) and outer edge take the level of the surface at their own places, 9 cm down: on a tilted ring a level band would rise above the asphalt.
    const at=(q,n,o)=>{const x=q[0]+n[0]*o,z=q[2]+n[1]*o;return [x,pv(x,z)[1]-KERB_DROP,z];},i0=at(q0,nrm[k],-.3),i1=at(q1,nrm[k+1],-.3),o0=at(q0,nrm[k],KERB),o1=at(q1,nrm[k+1],KERB);
    quad(stores.patch,1,ri,...i0,...o0,...o1,...i1);need(o0[0],o0[2],o0[1]+KERB_DROP-CLEAR);
    if(!run.length)run.push({x:o0[0],z:o0[2],y:o0[1],nx:nrm[k][0],nz:nrm[k][1]});run.push({x:o1[0],z:o1[2],y:o1[1],nx:nrm[k+1][0],nz:nrm[k+1][1]});}
   flush();};
  for(const [side,sgn] of [[0,1],[1,-1]]){
   // The lane's own edge carried on past the cut to the circle: kerb where it lies outside.
   const edge=rows.map(r=>V(r,sgn*hw)),en=rows.map(r=>[-r.p.dz*sgn,r.p.dx*sgn]);kerb(edge,en);
   // Curb return: the largest radius whose arc starts on the lane's edge within REACH m of the cut and opens no more than the room allows.
   if(open[side]<.35)continue;
   for(const r of [R_MAX,4,3,2.2,1.5]){
    let uS=tc+4,fit=null;
    for(let it=0;it<4&&uS>tc&&uS<tc+REACH+4;it++){const p=P(uS),ex=p.x-p.dz*sgn*hw,ez=p.z+p.dx*sgn*hw,wx=-p.dx,wz=-p.dz,nx=-p.dz*sgn,nz=p.dx*sgn,Ax=ex+nx*r-g.cx,Az=ez+nz*r-g.cz,b=Ax*wx+Az*wz,disc=b*b-(Ax*Ax+Az*Az-(Ro+r)*(Ro+r));
     if(disc<0){fit=null;break;}const v=-b-Math.sqrt(disc);uS-=v;fit={p,ex,ez,wx,wz,nx,nz,v};if(Math.abs(v)<.02)break;}
    if(!fit||uS<=tc+.3||uS>tc+REACH||uS>avail)continue;
    // Tangent point on the edge at station uS, arc centre Q (on the outward side), tangent point T on the circle.
    const p=P(uS),tx=p.x-p.dz*sgn*hw,tz=p.z+p.dx*sgn*hw,qx=tx+-p.dz*sgn*r,qz=tz+p.dx*sgn*r,k=Ro/(Ro+r),Tx=g.cx+(qx-g.cx)*k,Tz=g.cz+(qz-g.cz)*k;
    if(Math.hypot(Tx-tx,Tz-tz)<.2)continue;
    // How far the curb return opens the mouth: T's distance from the lane's edge line.
    const grow=Math.abs((Tx-tx)*-p.dz*sgn+(Tz-tz)*p.dx*sgn);if(grow>open[side]+.05)continue;
    // The corner where the edge line meets the circle: the fan's apex.
    const Ex=tx,Ez=tz,wx=-p.dx,wz=-p.dz,Bx=Ex-g.cx,Bz=Ez-g.cz,bb=Bx*wx+Bz*wz,dd=bb*bb-(Bx*Bx+Bz*Bz-Ro*Ro);if(dd<0)continue;const vc=-bb-Math.sqrt(dd),Xc=[Ex+wx*vc,Ez+wz*vc];
    let a0=Math.atan2(tz-qz,tx-qx),a1=Math.atan2(Tz-qz,Tx-qx),sw=a1-a0;while(sw>Math.PI)sw-=2*Math.PI;while(sw<-Math.PI)sw+=2*Math.PI;
    const n=Math.max(3,Math.ceil(Math.abs(sw)*r/.5)),arc=[],an=[];for(let j=0;j<=n;j++){const ang=a0+sw*j/n,x=qx+r*Math.cos(ang),z=qz+r*Math.sin(ang);arc.push(pv(x,z));an.push([-Math.cos(ang),-Math.sin(ang)]);} // outward = towards the arc's centre
    const apex=pv(Xc[0],Xc[1]);for(let j=0;j+1<arc.length;j++)fan(ri,...apex,...arc[j],...arc[j+1]);
    kerb(arc,an);break;}}
 }
 // Stretch of a chain between stations s0 and s1: its dense samples, thinned wherever a straight chord keeps within 2 cm sideways and 1.2 cm in level.
 function stations(c,rb){
  const S=[],I=[],X=[],Z=[],Y=[],at=s=>{let i=rb.i0;while(i<rb.i1-1&&c.s[i+1]<=s)i++;const f=Math.max(0,Math.min(1,(s-c.s[i])/((c.s[i+1]-c.s[i])||1)));S.push(s);I.push(i);X.push(c.x[i]+(c.x[i+1]-c.x[i])*f);Z.push(c.z[i]+(c.z[i+1]-c.z[i])*f);Y.push(c.at(s));};
  at(rb.s0);for(let i=rb.i0;i<=rb.i1;i++)if(c.s[i]>rb.s0+.05&&c.s[i]<rb.s1-.05){S.push(c.s[i]);I.push(i);X.push(c.x[i]);Z.push(c.z[i]);Y.push(c.at(c.s[i]));}at(rb.s1);
  const out=[0],n=S.length,L=warpLen(rb),zones=[];let a=0;if(warped(rb.arm0))zones.push([rb.s0,rb.s0+L]);if(warped(rb.arm1))zones.push([rb.s1-L,rb.s1]); // a tilting end keeps its dense stations
  while(a<n-1){let b=a+1;for(let e=Math.min(n-1,a+5);e>a+1;e--){if(S[e]-S[a]>8||zones.some(z=>S[e]>z[0]&&S[a]<z[1]))continue;let ok=true;const dx=X[e]-X[a],dz=Z[e]-Z[a],l=Math.hypot(dx,dz)||1,ds=S[e]-S[a]||1;
    for(let k=a+1;k<e&&ok;k++)if(Math.abs((X[k]-X[a])*dz-(Z[k]-Z[a])*dx)/l>.02||Math.abs(Y[k]-(Y[a]+(Y[e]-Y[a])*(S[k]-S[a])/ds))>.012)ok=false;
    if(ok){b=e;break;}}
   out.push(b);a=b;}
  const r={I:out.map(k=>I[k]),S:out.map(k=>S[k]),X:out.map(k=>X[k]),Z:out.map(k=>Z[k]),Y:out.map(k=>Y[k])},last=r.X.length-1;
  // Where a ribbon meets a patch its end section is the patch mouth exactly (square to the arm, 3 cm inside), so nothing can open between them.
  if(rb.arm0){const a=rb.arm0;r.X[0]=a.node.x+a.d[0]*(a.t-.03);r.Z[0]=a.node.z+a.d[1]*(a.t-.03);}
  if(rb.arm1){const a=rb.arm1;r.X[last]=a.node.x+a.d[0]*(a.t-.03);r.Z[last]=a.node.z+a.d[1]*(a.t-.03);}
  return r;
 }
 // Left/right cross-section directions at each station: mitre joins, so consecutive strips share their corners and leave no wedge.
 function sections(st,rb){
  const n=st.X.length,dx=[],dz=[],NX=[],NZ=[],MF=[];for(let k=0;k+1<n;k++){const ex=st.X[k+1]-st.X[k],ez=st.Z[k+1]-st.Z[k],l=Math.hypot(ex,ez)||1;dx.push(ex/l);dz.push(ez/l);}
  const loop=rb.c.closed&&!rb.arm0&&!rb.arm1&&rb.i0===0&&rb.i1===rb.c.x.length-1; // a roundabout ring is one closed ribbon: its ends meet with one cross-section
  for(let k=0;k<n;k++){const a=loop&&k===0?n-2:Math.max(0,k-1),b=loop&&k===n-1?0:Math.min(n-2,k);let tx=dx[a]+dx[b],tz=dz[a]+dz[b];const tl=Math.hypot(tx,tz);if(tl<1e-6){tx=dx[b];tz=dz[b];}else{tx/=tl;tz/=tl;}NX.push(-tz);NZ.push(tx);MF.push(Math.min(2,1/Math.max(.5,tx*dx[b]+tz*dz[b])));}
  if(rb.arm0){NX[0]=-rb.arm0.d[1];NZ[0]=rb.arm0.d[0];MF[0]=1;}
  if(rb.arm1){NX[n-1]=rb.arm1.d[1];NZ[n-1]=-rb.arm1.d[0];MF[n-1]=1;}
  return {NX,NZ,MF};
 }
 const ribs=[];
 for(const rb of geo.ribbons){const c=rb.c,st=stations(c,rb),sc=sections(st,rb),hw=rb.hw,n=st.X.length,ka=hw+KERB,bridge=c.bridge,wp=[],wm=[];for(let k=0;k<n;k++){edgeWarp(rb,st.S[k]);wp.push(ew[0]);wm.push(ew[1]);}
  // A roundabout ring lies in its plane (level along the centre line, tilted across like the plane), so its quads are flat.
  if(c.plane)for(let k=0;k<n;k++){const f=sc.MF[k],X=st.X[k],Z=st.Z[k],y=c.plane(X,Z);st.Y[k]=y;wp[k]+=c.plane(X+sc.NX[k]*f*hw,Z+sc.NZ[k]*f*hw)-y;wm[k]+=c.plane(X-sc.NX[k]*f*hw,Z-sc.NZ[k]*f*hw)-y;}
  ribs.push({st,sc,hw,bridge,wp,wm,roads:c.ri,plane:c.plane});
  for(let k=0;k+1<n;k++){const ri=c.ri[Math.min(st.I[k]+1,c.ri.length-1)],ax=st.X[k],az=st.Z[k],ay=st.Y[k],bx=st.X[k+1],bz=st.Z[k+1],by=st.Y[k+1],fa=sc.MF[k],fb=sc.MF[k+1],anx=sc.NX[k]*fa,anz=sc.NZ[k]*fa,bnx=sc.NX[k+1]*fb,bnz=sc.NZ[k+1]*fb,d=KERB_DROP,pa=wp[k],ma=wm[k],pb=wp[k+1],mb=wm[k+1];
   const k0x=ax+anx*ka,k0z=az+anz*ka,k1x=ax-anx*ka,k1z=az-anz*ka,k2x=bx-bnx*ka,k2z=bz-bnz*ka,k3x=bx+bnx*ka,k3z=bz+bnz*ka,pl=c.plane; // the kerb band of a ring lies in the ring's plane, 9 cm down
   // Where the ribbon tilts (pa differs from ma) the kerb band under it continues the same tilt out to its edges, so it stays 9 cm under the asphalt on both sides.
   const rk=ka/hw,ca=(pa+ma)/2,da=(pa-ma)/2*rk,cb=(pb+mb)/2,db=(pb-mb)/2*rk;
   const fl=asphalt(ri,ax+anx*hw,ay+pa,az+anz*hw,ax-anx*hw,ay+ma,az-anz*hw,bx-bnx*hw,by+mb,bz-bnz*hw,bx+bnx*hw,by+pb,bz+bnz*hw);
   // the kerb band under it is split on the same diagonal, or its twisted halves could rise above the asphalt
   quad(stores.ribbon,1,ri,k0x,pl?pl(k0x,k0z)-d:ay-d+ca+da,k0z,k1x,pl?pl(k1x,k1z)-d:ay-d+ca-da,k1z,k2x,pl?pl(k2x,k2z)-d:by-d+cb-db,k2z,k3x,pl?pl(k3x,k3z)-d:by-d+cb+db,k3z,fl);
   if(!bridge&&tr){const len=Math.hypot(bx-ax,bz-az),m=Math.max(1,Math.ceil(len/2));
    for(let q=0;q<=m;q++){const t=q/m,y=ay+(by-ay)*t-CLEAR,cx=ax+(bx-ax)*t,cz=az+(bz-az)*t,nx=anx+(bnx-anx)*t,nz=anz+(bnz-anz)*t,u=pa+(pb-pa)*t,v=ma+(mb-ma)*t;
     if(pl){for(const [ox,oz] of [[0,0],[nx*ka,nz*ka],[-nx*ka,-nz*ka]])need(cx+ox,cz+oz,pl(cx+ox,cz+oz)-CLEAR);}else{need(cx,cz,y+(u+v)/2);need(cx+nx*ka,cz+nz*ka,y+u);need(cx-nx*ka,cz-nz*ka,y+v);}}}}}
 // Junction patches: a fan from the node over the outline, heights blended from the node level to each arm's mouth level; kerb bands along the curb returns.
 const edges=[]; // outer kerb edges of the patches: points, outward normals and heights
 const planes=clusterPlanes(geo.patches.filter(p=>!p.round));
 for(const pt of geo.patches){if(pt.round){for(const a of pt.arms)if(a.mouth)mouth(pt,a);continue;}const P=pt.level,plane=planes.get(pt),ri=pt.arms.reduce((best,a)=>R[a.ri].hw>R[best.ri].hw?a:best,pt.arms[0]).ri,X=pt.x,Z=pt.z;
  for(const m of pt.mouths){const a=m.arm;fan(ri,X,P,Z,m.R[0],a.mouthY+a.wR,m.R[1],m.L[0],a.mouthY+a.wL,m.L[1]);}
  // Each arm's own strip from the node to its mouth, under the fan (6 cm at the mouth, 45 cm at the node, where the fans around may dip): it only shows where an acute corner leaves the fan short.
  for(const a of pt.arms){if(a.t<.2)continue;const w=a.w,px=-a.d[1]*w,pz=a.d[0]*w,ex=X+a.d[0]*a.t,ez=Z+a.d[1]*a.t,d=.06,e=.45;quad(stores.patch,0,a.ri,X-px,P-e,Z-pz,X+px,P-e,Z+pz,ex+px,a.mouthY+a.wL-d,ez+pz,ex-px,a.mouthY+a.wR-d,ez-pz);}
  for(const ch of pt.chains){const q=ch.pts,n=q.length,cum=[0];for(let k=1;k<n;k++)cum.push(cum[k-1]+Math.hypot(q[k][0]-q[k-1][0],q[k][1]-q[k-1][1]));
   const yA=ch.A.mouthY+ch.A.wL-plane(q[0][0],q[0][1]),yB=ch.B.mouthY+ch.B.wR-plane(q[n-1][0],q[n-1][1]),h=cum.map((d,k)=>{const u=cum[n-1]>.01?d/cum[n-1]:0;return plane(q[k][0],q[k][1])+yA*(1-u)+yB*u;}),nr=q.map((p,k)=>{if(k===0)return ch.nA;if(k===n-1)return ch.nB;
    const e0x=q[k][0]-q[k-1][0],e0z=q[k][1]-q[k-1][1],e1x=q[k+1][0]-q[k][0],e1z=q[k+1][1]-q[k][1],l0=Math.hypot(e0x,e0z)||1,l1=Math.hypot(e1x,e1z)||1,ax=e0z/l0,az=-e0x/l0,bx=e1z/l1,bz=-e1x/l1;let mx=ax+bx,mz=az+bz;const ml=Math.hypot(mx,mz)||1;mx/=ml;mz/=ml;const f=Math.min(2,1/Math.max(.5,mx*ax+mz*az));return [mx*f,mz*f];});
   const eg=[];
   for(let k=0;k<n;k++){const l=Math.hypot(nr[k][0],nr[k][1])||1;eg.push({x:q[k][0]+nr[k][0]*KERB,z:q[k][1]+nr[k][1]*KERB,y:h[k]-KERB_DROP,nx:nr[k][0]/l,nz:nr[k][1]/l});}
   for(let k=0;k+1<n;k++){fan(ri,X,P,Z,q[k][0],h[k],q[k][1],q[k+1][0],h[k+1],q[k+1][1]);
    quad(stores.patch,1,ri,q[k][0]-nr[k][0]*.3,h[k]-KERB_DROP,q[k][1]-nr[k][1]*.3,eg[k].x,eg[k].y,eg[k].z,eg[k+1].x,eg[k+1].y,eg[k+1].z,q[k+1][0]-nr[k+1][0]*.3,h[k+1]-KERB_DROP,q[k+1][1]-nr[k+1][1]*.3);need(eg[k].x,eg[k].z,h[k]-CLEAR);}
   if(!R[ch.A.ri].bridge&&!R[ch.B.ri].bridge)edges.push(eg);}}
 // Roundabout islands: a grass disc inside each ring, level with the ring's inner kerb; the ring's centre and size also keep verges off the island.
 const rings=[];
 for(const r of R){if(!r.ring)continue;const pts=r.pts,n=pts.length-1;let cx=0,cz=0;for(let i=0;i<n;i++){cx+=pts[i][0];cz+=pts[i][1];}cx/=n;cz/=n;
  const plane=geo.rings.find(g=>g.ri===r.ri)?.plane; // the island's rim lies in the ring's plane, as the ring's inner kerb does
  const ex=[],ey=[],ez=[];for(let i=0;i<=n;i++){const a=pts[(i+n-1)%n],b=pts[(i+1)%n],p=pts[i%n],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;let nx=-dz/l,nz=dx/l;if(nx*(cx-p[0])+nz*(cz-p[1])<0){nx=-nx;nz=-nz;}const X=p[0]+nx*(r.hw+KERB),Z=p[1]+nz*(r.hw+KERB);ex.push(X);ey.push((plane?plane(X,Z):r.y[i%n])-KERB_DROP);ez.push(Z);}
  const yc=ey.reduce((a,v)=>a+v,0)/ey.length;
  for(let i=0;i<n;i++){tri(stores.patch,2,r.ri,cx,yc,cz,ex[i],ey[i],ez[i],ex[i+1],ey[i+1],ez[i+1]);need(ex[i],ez[i],ey[i]-CLEAR);need((cx+ex[i]+ex[i+1])/3,(cz+ez[i]+ez[i+1])/3,(yc+ey[i]+ey[i+1])/3-CLEAR);need((cx+ex[i])/2,(cz+ez[i])/2,(yc+ey[i])/2-CLEAR);}
  rings.push({cx,cz,radius:Math.max(...ex.map((x,i)=>Math.hypot(x-cx,ez[i]-cz)))});}
 const inner=(x,z,nx,nz)=>{for(const g of rings){const dx=x-g.cx,dz=z-g.cz,r=g.radius+4;if(dx*dx+dz*dz<r*r&&-dx*nx-dz*nz>0)return true;}return false;};
 // Junction wedges: beside an arm, within WEDGE m of its node and 5 m of its kerb, wherever the point lies between this arm and its neighbour (arms 8 to 100 degrees apart),
 // the ground stays just below that arm's level. Otherwise a hillside between two roads rises over both and hides the side road from the one you drive on.
 const armLevel=(pt,a,s)=>s<a.t?pt.level+(a.mouthY-pt.level)*s/a.t:a.chain?a.chain.at(a.chain.s[a.ci]+a.sign*s):a.mouthY;
 if(tr)for(const pt of geo.patches){const arms=pt.arms,m=arms.length,ang=arms.map(a=>Math.atan2(a.d[1],a.d[0]));
  for(let i=0;i<m;i++){const A=arms[i],B=arms[(i+1)%m];let th=ang[(i+1)%m]-ang[i];if(th<=1e-6)th+=Math.PI*2;if(th<.14||th>1.75)continue;
   for(const [arm,other,side] of [[A,B,1],[B,A,-1]]){if(R[arm.ri].bridge)continue; // under a deck the valley stays
    const nx=-arm.d[1]*side,nz=arm.d[0]*side;
    // no further than the arm's road goes: past the end of a short stub the ground is no longer beside it (a 4 m stub of Anders Wigens veg dug a 3 m pit by the KIWI roundabout)
    const reach=arm.chain?Math.min(WEDGE,(arm.sign>0?arm.chain.len-arm.chain.s[arm.ci]:arm.chain.s[arm.ci])+2):WEDGE;
    for(let s=0;s<=reach;s+=4){const y=armLevel(pt,arm,s)-CLEAR;for(const e of CUT_AT){const o=arm.w+KERB+e,x=pt.x+arm.d[0]*s+nx*o,z=pt.z+arm.d[1]*s+nz*o,dx=x-pt.x,dz=z-pt.z;
     const vl=Math.hypot(dx,dz)*.02;if(A.d[0]*dz-A.d[1]*dx<vl||dx*B.d[1]-dz*B.d[0]<vl)continue; // not between the two arms
     const along=dx*other.d[0]+dz*other.d[1];if(along>-1&&Math.abs(dx*other.d[1]-dz*other.d[0])<other.w+KERB+.2)continue; // on the other arm's kerb band
     need(x,z,y);}}}}}
 // Lower the ground grid: every violated constraint pulls its three vertices down by its excess (one pass is enough, lowering never undoes an earlier constraint).
 if(tr)for(let k=0;k<cl.length;k++){const a=ci[3*k],b=ci[3*k+1],d=ci[3*k+2],wa=cw[3*k],wb=cw[3*k+1],wc=cw[3*k+2],e=wa*(tv[a]+delta[a])+wb*(tv[b]+delta[b])+wc*(tv[d]+delta[d])-cl[k];
  if(e>0){const s=wa*wa+wb*wb+wc*wc;delta[a]-=e*wa/s;delta[b]-=e*wb/s;delta[d]-=e*wc/s;}}
 // Ground height as the mesh draws it (triangles of the 8 m grid), and as a smooth field: terrain plus the bilinear lowering.
 function meshAt(x,z){if(!tr)return height(x,z);const fx=(x-tr.x0)/GRID,fz=(z-tr.z0)/GRID,i=Math.floor(fx),j=Math.floor(fz);if(i<0||j<0||i>LX-2||j>LZ-2)return height(x,z);
  const u=fx-i,v=fz-j,a=j*LX+i;let b,d,wa,wb,wc;if(u>=v){b=a+1;d=a+LX+1;wa=1-u;wb=u-v;wc=v;}else{b=a+LX+1;d=a+LX;wa=1-v;wb=u;wc=v-u;}
  return wa*(vT(a)+delta[a])+wb*(vT(b)+delta[b])+wc*(vT(d)+delta[d]);}
 function lowerAt(x,z){if(!tr)return 0;const fx=(x-tr.x0)/GRID,fz=(z-tr.z0)/GRID,i=Math.floor(fx),j=Math.floor(fz);if(i<0||j<0||i>LX-2||j>LZ-2)return 0;const u=fx-i,v=fz-j,a=j*LX+i;
  return (delta[a]*(1-u)+delta[a+1]*u)*(1-v)+(delta[a+LX]*(1-u)+delta[a+LX+1]*u)*v;}
if(tr)buildGrid();
 const onRoad=(x,z,y)=>{const i=Math.floor(x/8)-grid.GX,j=Math.floor(z/8)-grid.GZ;if(i<0||i>=grid.GW||j<0||j>=grid.GH)return false;const c=j*grid.GW+i,f=grid.first[c];if(f<0||!grid.multi[c]&&own[f]===1)return false;
  const top=heightAt(x,z);return top!==null&&top<y+2;}; // a road surface well above the verge is a bridge deck over it: no hit
 // Verges: from each kerb edge outward until a batter of SLOPE meets the ground; none where the ground is within 10 cm of the kerb top, and none over another road.
 const own=new Uint8Array(R.length); // the roads whose surface the edges being verged belong to (none for a patch outline)
 function verge(ex,ey,ez,enx,enz){ // outer kerb edge points with outward normals
  const n=ex.length,px=[],py=[],pz=[],pd=[];
  for(let k=0;k<n;k++){const x=ex[k],z=ez[k],g0=meshAt(x,z);if(ey[k]-g0<.1||inner(x,z,enx[k],enz[k])){px.push(x);py.push(ey[k]);pz.push(z);pd.push(0);continue;}
   let reach=8;if(k>0&&k<n-1){const ax=x-ex[k-1],az=z-ez[k-1],bx=ex[k+1]-x,bz=ez[k+1]-z,cr=ax*bz-az*bx,la=Math.hypot(ax,az),lb=Math.hypot(bx,bz),lc=Math.hypot(ex[k+1]-ex[k-1],ez[k+1]-ez[k-1]);
    // Bending towards the outward normal (a loop's inside): the batter would cross itself, so stay within 60 % of the bend radius.
    if(la>.01&&lb>.01&&Math.abs(cr)>1e-6&&((ex[k-1]+ex[k+1])/2-x)*enx[k]+((ez[k-1]+ez[k+1])/2-z)*enz[k]>0)reach=Math.max(.5,Math.min(8,.6*la*lb*lc/(2*Math.abs(cr))));}
   let d=.5;for(;d<=reach;d+=d<1?.5:1){if(onRoad(x+enx[k]*d,z+enz[k]*d,ey[k])){d=Math.max(0,d-(d<1.5?.5:1));break;}if(ey[k]-SLOPE*d<=meshAt(x+enx[k]*d,z+enz[k]*d)+.03)break;}d=Math.min(d,reach);
   if(d<=0){px.push(x);py.push(ey[k]);pz.push(z);pd.push(0);continue;}
   const qx=x+enx[k]*d,qz=z+enz[k]*d;px.push(qx);py.push(meshAt(qx,qz)-.02);pz.push(qz);pd.push(d);}
  // A strip between two edge points must not cover a road either (one end stopped short, the other ran on): halve both ends while a sample inside it lies on one.
  const put=(k,d)=>{if(d<.25)d=0;pd[k]=d;if(d>0){px[k]=ex[k]+enx[k]*d;pz[k]=ez[k]+enz[k]*d;py[k]=meshAt(px[k],pz[k])-.02;}else{px[k]=ex[k];py[k]=ey[k];pz[k]=ez[k];}};
  for(let k=0;k+1<n;k++)for(let it=0;it<4&&(pd[k]>0||pd[k+1]>0);it++){let hit=false;
   for(const [u,v] of QS){const ax=ex[k]+(ex[k+1]-ex[k])*u,az=ez[k]+(ez[k+1]-ez[k])*u,bx=px[k]+(px[k+1]-px[k])*u,bz=pz[k]+(pz[k+1]-pz[k])*u;if(onRoad(ax+(bx-ax)*v,az+(bz-az)*v,ey[k])){hit=true;break;}}
   if(!hit)break;if(it===3){put(k,0);put(k+1,0);}else{put(k,pd[k]/2);put(k+1,pd[k+1]/2);}}
  for(let k=0;k+1<n;k++)if(pd[k]>0||pd[k+1]>0)quad(stores.verge,3,0,ex[k],ey[k],ez[k],px[k],py[k],pz[k],px[k+1],py[k+1],pz[k+1],ex[k+1],ey[k+1],ez[k+1]);
 }
 if(tr){for(const rib of ribs){if(rib.bridge)continue;const {st,sc,hw,wp,wm}=rib,n=st.X.length;for(const ri of rib.roads)own[ri]=1;
   for(const side of [1,-1]){const ex=[],ey=[],ez=[],nx=[],nz=[];for(let k=0;k<n;k++){const o=(hw+KERB)*side*sc.MF[k];ex.push(st.X[k]+sc.NX[k]*o);ez.push(st.Z[k]+sc.NZ[k]*o);ey.push(rib.plane?rib.plane(ex[k],ez[k])-KERB_DROP:st.Y[k]-KERB_DROP+(side>0?wp[k]:wm[k]));nx.push(sc.NX[k]*side);nz.push(sc.NZ[k]*side);}verge(ex,ey,ez,nx,nz);}for(const ri of rib.roads)own[ri]=0;}
  for(const e of edges)verge(e.map(p=>p.x),e.map(p=>p.y),e.map(p=>p.z),e.map(p=>p.nx),e.map(p=>p.nz));}
 // Centre-line dashes on marked roads: 1.5 m pieces every 9 m along each chain, wherever a ribbon (not a patch) lies, just above the asphalt.
 const dashes=[],byChain=new Map();for(const rb of geo.ribbons){if(!byChain.has(rb.c))byChain.set(rb.c,[]);byChain.get(rb.c).push(rb);}
 for(const [c,list] of byChain){if(!c.ri.some(ri=>R[ri].road.mark)||c.plane)continue;let i=0; // a roundabout ring has no centre line
  const pos=sv=>{while(i<c.s.length-2&&c.s[i+1]<=sv)i++;while(i>0&&c.s[i]>sv)i--;const f=Math.max(0,Math.min(1,(sv-c.s[i])/((c.s[i+1]-c.s[i])||1))),dx=c.x[i+1]-c.x[i],dz=c.z[i+1]-c.z[i],l=Math.hypot(dx,dz)||1;return {x:c.x[i]+dx*f,z:c.z[i]+dz*f,nx:-dz/l*.065,nz:dx/l*.065,y:c.at(sv)+.04};};
  for(let sv=3;sv+1.5<c.len-2;sv+=9){if(!list.some(rb=>sv>=rb.s0+.5&&sv+1.5<=rb.s1-.5))continue;if(!R[c.ri[Math.min(c.ri.length-1,Math.round(sv/c.len*(c.ri.length-1)))]].road.mark)continue;
   const a=pos(sv),b=pos(sv+1.5);dashes.push([[a.x+a.nx,a.y,a.z+a.nz],[a.x-a.nx,a.y,a.z-a.nz],[b.x-b.nx,b.y,b.z-b.nz],[b.x+b.nx,b.y,b.z+b.nz]]);}}
 // Highest drawn road at (x,z), or null off the road. With near (a level), the highest surface no more than 1.5 m above it, if there is one: a road under a bridge deck stays on its road.
 function heightAt(x,z,near){if(!grid)buildGrid();const i=Math.floor(x/8)-grid.GX,j=Math.floor(z/8)-grid.GZ;if(i<0||i>=grid.GW||j<0||j>=grid.GH)return null;const c=j*grid.GW+i,ids=grid.ids,box=grid.box;let top=null;
  for(let k=grid.start[c],e=grid.start[c+1];k<e;k++){const t=ids[k],b4=4*t;if(x<box[b4]-.001||x>box[b4+2]+.001||z<box[b4+1]-.001||z>box[b4+3]+.001)continue;const o=t*9,px=T9[o],py=T9[o+1],pz=T9[o+2],qx=T9[o+3],qy=T9[o+4],qz=T9[o+5],rx=T9[o+6],ry=T9[o+7],rz=T9[o+8],d=(qz-rz)*(px-rx)+(rx-qx)*(pz-rz);if(Math.abs(d)<1e-9)continue;
   const u=((qz-rz)*(x-rx)+(rx-qx)*(z-rz))/d,v=((rz-pz)*(x-rx)+(px-rx)*(z-rz))/d,w=1-u-v;if(u<-2e-4||v<-2e-4||w<-2e-4)continue;const y=u*py+v*qy+w*ry;if(near!==undefined&&y>near+1.5)continue;if(top===null||y>top)top=y;}return top===null&&near!==undefined?heightAt(x,z):top;}
 // The ground as it is seen: the ground mesh, or the verge strip over it where there is one (the verges are indexed on first use).
 let vgrid=null;
 function groundTop(x,z){let top=meshAt(x,z);if(!vgrid){const a=stores.verge.a;vgrid=gridOf(stores.verge.n/15,(t,b,o)=>{const q=15*t+3;b[o]=Math.min(a[q],a[q+3],a[q+6],a[q+9]);b[o+1]=Math.min(a[q+2],a[q+5],a[q+8],a[q+11]);b[o+2]=Math.max(a[q],a[q+3],a[q+6],a[q+9]);b[o+3]=Math.max(a[q+2],a[q+5],a[q+8],a[q+11]);});}
  const i=Math.floor(x/8)-vgrid.GX,j=Math.floor(z/8)-vgrid.GZ;if(i<0||i>=vgrid.GW||j<0||j>=vgrid.GH)return top;const c=j*vgrid.GW+i,a=stores.verge.a;
  for(let k=vgrid.start[c];k<vgrid.start[c+1];k++){const q=vgrid.ids[k]*15+3;
   for(let h=0;h<2;h++){const p0=q,p1=q+(h?6:3),p2=q+(h?9:6),d=(a[p1+2]-a[p2+2])*(a[p0]-a[p2])+(a[p2]-a[p1])*(a[p0+2]-a[p2+2]);if(Math.abs(d)<1e-9)continue;
    const u=((a[p1+2]-a[p2+2])*(x-a[p2])+(a[p2]-a[p1])*(z-a[p2+2]))/d,v=((a[p2+2]-a[p0+2])*(x-a[p2])+(a[p0]-a[p2])*(z-a[p2+2]))/d,w=1-u-v;if(u<-1e-6||v<-1e-6||w<-1e-6)continue;const y=u*a[p0+1]+v*a[p1+1]+w*a[p2+1];if(y>top)top=y;}}
  return top;}
 // The car's centre line along an edge path: the road geometry's plan, at the height of the drawn surface (which tilts into a steep junction and may lie over another road).
 // Checked every half metre, and each sample takes the highest surface of its neighbours too, so the line has risen before a step in the surface, not after it.
 const edgeLine=(path,lift=0)=>{const line=geo.edgeLine(path,lift),pts=[];
  for(let i=0;i<line.length;i++){const q=line[i],p=line[i-1],n=p?Math.max(1,Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])/.5)):1;
   for(let k=1;k<=n;k++){const t=k/n;pts.push(p?[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,p[2]+(q[2]-p[2])*t]:q);}}
  const need=pts.map(p=>{const top=heightAt(p[0],p[1],p[2]-lift);return top===null?-1e9:top+lift+.02;});
  return pts.map((p,i)=>{const y=Math.max(need[i],i>0?need[i-1]:-1e9,i+1<pts.length?need[i+1]:-1e9);return [p[0],p[1],y>-1e8?y:p[2]];});};
 // paint(fn): fn(cls,road,n,c,flip) once per primitive (n corners, c = x,y,z per corner, reused; flip: a quad split along its other diagonal, corners 1,2,3,0).
 const scratch=new Float64Array(12);
 function paint(fn,which=['ribbon','patch','verge']){for(const w of which){const s=stores[w].a,N=stores[w].n;for(let o=0;o<N;){const cls=s[o]&7,flip=(s[o]&8)>0,ri=s[o+1],n=s[o+2];for(let k=0;k<n*3;k++)scratch[k]=s[o+3+k];fn(cls,R[ri].road,n,scratch,flip,w);o+=3+n*3;}}}
 const view=w=>{const out=[];paint((cls,road,n,c,flip)=>{const corners=[];for(let k=0;k<n;k++)corners.push([c[3*k],c[3*k+1],c[3*k+2]]);out.push({road,kerb:cls===1||cls===4,grass:cls===2,flip,x:c[0],z:c[2],corners});},[w]);return out;};
 const lazy=(w)=>{let v=null;return {get:()=>v||(v=view(w))};};
 const surface={dashes,heightAt,meshAt,lowerAt,groundTop,edgeLine,paint,geometry:geo};
 Object.defineProperties(surface,{quads:lazy('ribbon'),extra:lazy('patch'),verges:lazy('verge')});
 return surface;
}
