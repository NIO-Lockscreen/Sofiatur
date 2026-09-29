import {createRoadGeometry,KERB,KERB_DROP} from './road-geometry.js';
// The drawn road, built from the shared road geometry (road-geometry.js): continuous level ribbons along every road, a paved
// patch with curb returns at every junction, a kerb band along the outer edges. The world renders exactly these primitives and
// the car rides on them, so it cannot sink below the road where the terrain bends between two map nodes.
// The ground follows the road: vertices of the 8 m ground grid are lowered where they would poke through, and verge strips slope from the
// kerb edge down to the ground where the road stands above it.
// Primitives are kept as plain numbers (class, road index, corner count, corners as x,y,z); paint() hands them to the renderer and
// quads/extra/verges give them as objects {road,kerb,x,z,corners} for checks. Classes: 0 asphalt, 1 kerb band, 2 island grass, 3 verge, 4 steep patch triangle.
const GRID=8,SLOPE=.6,CLEAR=.16; // ground grid, verge batter (rise per metre out), how far below the kerb top the ground must lie
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
 const stores={ribbon:[],patch:[],verge:[]},tris=[],cells=new Map();
 const cellKey=(i,j)=>(i+4096)*8192+j+4096;
 // Every drawn triangle of a road surface is indexed by the 8 m cells its bounding box touches, for heightAt.
 function indexTri(x0,y0,z0,x1,y1,z1,x2,y2,z2){const id=tris.length/9;tris.push(x0,y0,z0,x1,y1,z1,x2,y2,z2);
  const i0=Math.floor(Math.min(x0,x1,x2)/8),i1=Math.floor(Math.max(x0,x1,x2)/8),j0=Math.floor(Math.min(z0,z1,z2)/8),j1=Math.floor(Math.max(z0,z1,z2)/8);
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const k=cellKey(i,j);let l=cells.get(k);if(!l){l=[];cells.set(k,l);}l.push(id);}}
 function tri(store,cls,ri,x0,y0,z0,x1,y1,z1,x2,y2,z2){store.push(cls,ri,3,x0,y0,z0,x1,y1,z1,x2,y2,z2);if(cls!==3)indexTri(x0,y0,z0,x1,y1,z1,x2,y2,z2);}
 function quad(store,cls,ri,x0,y0,z0,x1,y1,z1,x2,y2,z2,x3,y3,z3,flip){store.push(flip?cls+8:cls,ri,4,x0,y0,z0,x1,y1,z1,x2,y2,z2,x3,y3,z3);
  if(cls===3)return;if(flip){indexTri(x1,y1,z1,x2,y2,z2,x3,y3,z3);indexTri(x1,y1,z1,x3,y3,z3,x0,y0,z0);}else{indexTri(x0,y0,z0,x1,y1,z1,x2,y2,z2);indexTri(x0,y0,z0,x2,y2,z2,x3,y3,z3);}}
 // The ground grid: terrain heights at its vertices (cached) and how far each is lowered.
 const tr=data?.terrain,LX=tr?Math.round((tr.nx-1)*tr.step/GRID)+1:0,LZ=tr?Math.round((tr.nz-1)*tr.step/GRID)+1:0,delta=tr?new Float32Array(LX*LZ):null,tv=tr?new Float32Array(LX*LZ).fill(NaN):null;
 const vT=idx=>{if(Number.isNaN(tv[idx]))tv[idx]=height(tr.x0+(idx%LX)*GRID,tr.z0+Math.floor(idx/LX)*GRID);return tv[idx];};
 const ci=[],cw=[],cl=[]; // constraints: the ground under (x,z) must lie below a limit; three vertices and their weights
 function need(x,z,limit){if(!tr)return;const fx=(x-tr.x0)/GRID,fz=(z-tr.z0)/GRID,i=Math.floor(fx),j=Math.floor(fz);if(i<0||j<0||i>LX-2||j>LZ-2)return;
  const u=fx-i,v=fz-j,a=j*LX+i;let b,d,wa,wb,wc;if(u>=v){b=a+1;d=a+LX+1;wa=1-u;wb=u-v;wc=v;}else{b=a+LX+1;d=a+LX;wa=1-v;wb=u;wc=v-u;}
  if(wa*vT(a)+wb*vT(b)+wc*vT(d)>limit+1e-4){ci.push(a,b,d);cw.push(wa,wb,wc);cl.push(limit);}}
 // A carriageway quad between two sections is a little twisted on a steep bend; it is split along the diagonal that leaves the two halves closer to one plane (flip: the other diagonal).
 function asphalt(ri,x0,y0,z0,x1,y1,z1,x2,y2,z2,x3,y3,z3){
  const tilt=(ax,ay,az,bx,by,bz,cx,cy,cz)=>{const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az,nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;return [nx/l,ny/l,nz/l];};
  const a=tilt(x0,y0,z0,x1,y1,z1,x2,y2,z2),b=tilt(x0,y0,z0,x2,y2,z2,x3,y3,z3),c=tilt(x1,y1,z1,x2,y2,z2,x3,y3,z3),d=tilt(x1,y1,z1,x3,y3,z3,x0,y0,z0);
  quad(stores.ribbon,0,ri,x0,y0,z0,x1,y1,z1,x2,y2,z2,x3,y3,z3,a[0]*b[0]+a[1]*b[1]+a[2]*b[2]<c[0]*d[0]+c[1]*d[1]+c[2]*d[2]);}
 // A triangle of a patch: drawn, and the ground below its corners, middle and edge midpoints kept lower.
 function fan(ri,x0,y0,z0,x1,y1,z1,x2,y2,z2){
  const ux=x1-x0,uy=y1-y0,uz=z1-z0,vx=x2-x0,vy=y2-y0,vz=z2-z0,wall=Math.hypot(uy*vz-uz*vy,ux*vy-uy*vx)>.4*Math.abs(uz*vx-ux*vz); // steep: a step between two roads' levels at a tight corner, drawn a little lighter to make up for the side lighting
  tri(stores.patch,wall?4:0,ri,x0,y0,z0,x1,y1,z1,x2,y2,z2);
  need(x0,z0,y0-CLEAR);need(x1,z1,y1-CLEAR);need(x2,z2,y2-CLEAR);need((x0+x1+x2)/3,(z0+z1+z2)/3,(y0+y1+y2)/3-CLEAR);need((x0+x1)/2,(z0+z1)/2,(y0+y1)/2-CLEAR);need((x1+x2)/2,(z1+z2)/2,(y1+y2)/2-CLEAR);}
 // Stretch of a chain between stations s0 and s1: its dense samples, thinned wherever a straight chord keeps within 2 cm sideways and 1.2 cm in level.
 function stations(c,rb){
  const S=[],I=[],X=[],Z=[],Y=[],at=s=>{let i=rb.i0;while(i<rb.i1-1&&c.s[i+1]<=s)i++;const f=Math.max(0,Math.min(1,(s-c.s[i])/((c.s[i+1]-c.s[i])||1)));S.push(s);I.push(i);X.push(c.x[i]+(c.x[i+1]-c.x[i])*f);Z.push(c.z[i]+(c.z[i+1]-c.z[i])*f);Y.push(c.at(s));};
  at(rb.s0);for(let i=rb.i0;i<=rb.i1;i++)if(c.s[i]>rb.s0+.05&&c.s[i]<rb.s1-.05){S.push(c.s[i]);I.push(i);X.push(c.x[i]);Z.push(c.z[i]);Y.push(c.at(c.s[i]));}at(rb.s1);
  const out=[0],n=S.length;let a=0;
  while(a<n-1){let b=a+1;for(let e=Math.min(n-1,a+5);e>a+1;e--){if(S[e]-S[a]>8)continue;let ok=true;const dx=X[e]-X[a],dz=Z[e]-Z[a],l=Math.hypot(dx,dz)||1,ds=S[e]-S[a]||1;
    for(let k=a+1;k<e&&ok;k++)if(Math.abs((X[k]-X[a])*dz-(Z[k]-Z[a])*dx)/l>.02||Math.abs(Y[k]-(Y[a]+(Y[e]-Y[a])*(S[k]-S[a])/ds))>.012)ok=false;
    if(ok){b=e;break;}}
   out.push(b);a=b;}
  const r={I:out.map(k=>I[k]),X:out.map(k=>X[k]),Z:out.map(k=>Z[k]),Y:out.map(k=>Y[k])},last=r.X.length-1;
  // Where a ribbon meets a patch its end section is the patch mouth exactly (square to the arm, 3 cm inside), so nothing can open between them.
  if(rb.arm0){const a=rb.arm0;r.X[0]=a.node.x+a.d[0]*(a.t-.03);r.Z[0]=a.node.z+a.d[1]*(a.t-.03);}
  if(rb.arm1){const a=rb.arm1;r.X[last]=a.node.x+a.d[0]*(a.t-.03);r.Z[last]=a.node.z+a.d[1]*(a.t-.03);}
  return r;
 }
 // Left/right cross-section directions at each station: mitre joins, so consecutive strips share their corners and leave no wedge.
 function sections(st,rb){
  const n=st.X.length,dx=[],dz=[],NX=[],NZ=[],MF=[];for(let k=0;k+1<n;k++){const ex=st.X[k+1]-st.X[k],ez=st.Z[k+1]-st.Z[k],l=Math.hypot(ex,ez)||1;dx.push(ex/l);dz.push(ez/l);}
  for(let k=0;k<n;k++){const a=Math.max(0,k-1),b=Math.min(n-2,k);let tx=dx[a]+dx[b],tz=dz[a]+dz[b];const tl=Math.hypot(tx,tz);if(tl<1e-6){tx=dx[b];tz=dz[b];}else{tx/=tl;tz/=tl;}NX.push(-tz);NZ.push(tx);MF.push(Math.min(2,1/Math.max(.5,tx*dx[b]+tz*dz[b])));}
  if(rb.arm0){NX[0]=-rb.arm0.d[1];NZ[0]=rb.arm0.d[0];MF[0]=1;}
  if(rb.arm1){NX[n-1]=rb.arm1.d[1];NZ[n-1]=-rb.arm1.d[0];MF[n-1]=1;}
  return {NX,NZ,MF};
 }
 const ribs=[];
 for(const rb of geo.ribbons){const c=rb.c,st=stations(c,rb),sc=sections(st,rb),hw=rb.hw,n=st.X.length,ka=hw+KERB,bridge=c.bridge;ribs.push({st,sc,hw,bridge});
  for(let k=0;k+1<n;k++){const ri=c.ri[Math.min(st.I[k]+1,c.ri.length-1)],ax=st.X[k],az=st.Z[k],ay=st.Y[k],bx=st.X[k+1],bz=st.Z[k+1],by=st.Y[k+1],fa=sc.MF[k],fb=sc.MF[k+1],anx=sc.NX[k]*fa,anz=sc.NZ[k]*fa,bnx=sc.NX[k+1]*fb,bnz=sc.NZ[k+1]*fb,d=KERB_DROP;
   quad(stores.ribbon,1,ri,ax+anx*ka,ay-d,az+anz*ka,ax-anx*ka,ay-d,az-anz*ka,bx-bnx*ka,by-d,bz-bnz*ka,bx+bnx*ka,by-d,bz+bnz*ka);
   asphalt(ri,ax+anx*hw,ay,az+anz*hw,ax-anx*hw,ay,az-anz*hw,bx-bnx*hw,by,bz-bnz*hw,bx+bnx*hw,by,bz+bnz*hw);
   if(!bridge&&tr){const len=Math.hypot(bx-ax,bz-az),m=Math.max(1,Math.ceil(len/2));
    for(let q=0;q<=m;q++){const t=q/m,y=ay+(by-ay)*t-CLEAR,cx=ax+(bx-ax)*t,cz=az+(bz-az)*t,nx=anx+(bnx-anx)*t,nz=anz+(bnz-anz)*t;need(cx,cz,y);need(cx+nx*ka,cz+nz*ka,y);need(cx-nx*ka,cz-nz*ka,y);}}}}
 // Junction patches: a fan from the node over the outline, heights blended from the node level to each arm's mouth level; kerb bands along the curb returns.
 const edges=[]; // outer kerb edges of the patches: points, outward normals and heights
 const planes=clusterPlanes(geo.patches);
 for(const pt of geo.patches){const P=pt.level,plane=planes.get(pt),ri=pt.arms.reduce((best,a)=>R[a.ri].hw>R[best.ri].hw?a:best,pt.arms[0]).ri,X=pt.x,Z=pt.z;
  for(const m of pt.mouths)fan(ri,X,P,Z,m.R[0],m.arm.mouthY,m.R[1],m.L[0],m.arm.mouthY,m.L[1]);
  // Each arm's own strip from the node to its mouth, 4 cm under the fan: it only shows where an acute corner leaves the fan short.
  for(const a of pt.arms){if(a.t<.2)continue;const w=a.w,px=-a.d[1]*w,pz=a.d[0]*w,ex=X+a.d[0]*a.t,ez=Z+a.d[1]*a.t,d=.06;quad(stores.patch,0,a.ri,X-px,P-d,Z-pz,X+px,P-d,Z+pz,ex+px,a.mouthY-d,ez+pz,ex-px,a.mouthY-d,ez-pz);}
  for(const ch of pt.chains){const q=ch.pts,n=q.length,cum=[0];for(let k=1;k<n;k++)cum.push(cum[k-1]+Math.hypot(q[k][0]-q[k-1][0],q[k][1]-q[k-1][1]));
   const yA=ch.A.mouthY-plane(q[0][0],q[0][1]),yB=ch.B.mouthY-plane(q[n-1][0],q[n-1][1]),h=cum.map((d,k)=>{const L=Math.max(.2,Math.min(4,cum[n-1]/2));return plane(q[k][0],q[k][1])+yA*Math.max(0,1-d/L)+yB*Math.max(0,1-(cum[n-1]-d)/L);}),nr=q.map((p,k)=>{if(k===0)return ch.nA;if(k===n-1)return ch.nB;
    const e0x=q[k][0]-q[k-1][0],e0z=q[k][1]-q[k-1][1],e1x=q[k+1][0]-q[k][0],e1z=q[k+1][1]-q[k][1],l0=Math.hypot(e0x,e0z)||1,l1=Math.hypot(e1x,e1z)||1,ax=e0z/l0,az=-e0x/l0,bx=e1z/l1,bz=-e1x/l1;let mx=ax+bx,mz=az+bz;const ml=Math.hypot(mx,mz)||1;mx/=ml;mz/=ml;const f=Math.min(2,1/Math.max(.5,mx*ax+mz*az));return [mx*f,mz*f];});
   const eg=[];
   for(let k=0;k<n;k++){const l=Math.hypot(nr[k][0],nr[k][1])||1;eg.push({x:q[k][0]+nr[k][0]*KERB,z:q[k][1]+nr[k][1]*KERB,y:h[k]-KERB_DROP,nx:nr[k][0]/l,nz:nr[k][1]/l});}
   for(let k=0;k+1<n;k++){fan(ri,X,P,Z,q[k][0],h[k],q[k][1],q[k+1][0],h[k+1],q[k+1][1]);
    quad(stores.patch,1,ri,q[k][0]-nr[k][0]*.3,h[k]-KERB_DROP,q[k][1]-nr[k][1]*.3,eg[k].x,eg[k].y,eg[k].z,eg[k+1].x,eg[k+1].y,eg[k+1].z,q[k+1][0]-nr[k+1][0]*.3,h[k+1]-KERB_DROP,q[k+1][1]-nr[k+1][1]*.3);need(eg[k].x,eg[k].z,h[k]-CLEAR);}
   edges.push(eg);}}
 // Roundabout islands: a grass disc inside each ring, level with the ring's inner kerb; the ring's centre and size also keep verges off the island.
 const rings=[];
 for(const r of R){if(!r.ring)continue;const pts=r.pts,n=pts.length-1;let cx=0,cz=0;for(let i=0;i<n;i++){cx+=pts[i][0];cz+=pts[i][1];}cx/=n;cz/=n;
  const ex=[],ey=[],ez=[];for(let i=0;i<=n;i++){const a=pts[(i+n-1)%n],b=pts[(i+1)%n],p=pts[i%n],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;let nx=-dz/l,nz=dx/l;if(nx*(cx-p[0])+nz*(cz-p[1])<0){nx=-nx;nz=-nz;}ex.push(p[0]+nx*(r.hw+KERB));ey.push(r.y[i%n]-KERB_DROP);ez.push(p[1]+nz*(r.hw+KERB));}
  const yc=ey.reduce((a,v)=>a+v,0)/ey.length;
  for(let i=0;i<n;i++){tri(stores.patch,2,r.ri,cx,yc,cz,ex[i],ey[i],ez[i],ex[i+1],ey[i+1],ez[i+1]);need(ex[i],ez[i],ey[i]-CLEAR);need((cx+ex[i]+ex[i+1])/3,(cz+ez[i]+ez[i+1])/3,(yc+ey[i]+ey[i+1])/3-CLEAR);need((cx+ex[i])/2,(cz+ez[i])/2,(yc+ey[i])/2-CLEAR);}
  rings.push({cx,cz,radius:Math.max(...ex.map((x,i)=>Math.hypot(x-cx,ez[i]-cz)))});}
 const inner=(x,z,nx,nz)=>{for(const g of rings){const dx=x-g.cx,dz=z-g.cz,r=g.radius+4;if(dx*dx+dz*dz<r*r&&-dx*nx-dz*nz>0)return true;}return false;};
 // Lower the ground grid: every violated constraint pulls its three vertices down by its excess (one pass is enough, lowering never undoes an earlier constraint).
 if(tr)for(let k=0;k<cl.length;k++){const a=ci[3*k],b=ci[3*k+1],d=ci[3*k+2],wa=cw[3*k],wb=cw[3*k+1],wc=cw[3*k+2],e=wa*(tv[a]+delta[a])+wb*(tv[b]+delta[b])+wc*(tv[d]+delta[d])-cl[k];
  if(e>0){const s=wa*wa+wb*wb+wc*wc;delta[a]-=e*wa/s;delta[b]-=e*wb/s;delta[d]-=e*wc/s;}}
 // Ground height as the mesh draws it (triangles of the 8 m grid), and as a smooth field: terrain plus the bilinear lowering.
 function meshAt(x,z){if(!tr)return height(x,z);const fx=(x-tr.x0)/GRID,fz=(z-tr.z0)/GRID,i=Math.floor(fx),j=Math.floor(fz);if(i<0||j<0||i>LX-2||j>LZ-2)return height(x,z);
  const u=fx-i,v=fz-j,a=j*LX+i;let b,d,wa,wb,wc;if(u>=v){b=a+1;d=a+LX+1;wa=1-u;wb=u-v;wc=v;}else{b=a+LX+1;d=a+LX;wa=1-v;wb=u;wc=v-u;}
  return wa*(vT(a)+delta[a])+wb*(vT(b)+delta[b])+wc*(vT(d)+delta[d]);}
 function lowerAt(x,z){if(!tr)return 0;const fx=(x-tr.x0)/GRID,fz=(z-tr.z0)/GRID,i=Math.floor(fx),j=Math.floor(fz);if(i<0||j<0||i>LX-2||j>LZ-2)return 0;const u=fx-i,v=fz-j,a=j*LX+i;
  return (delta[a]*(1-u)+delta[a+1]*u)*(1-v)+(delta[a+LX]*(1-u)+delta[a+LX+1]*u)*v;}
 // Verges: from each kerb edge outward until a batter of SLOPE meets the ground; none where the ground is within 10 cm of the kerb top.
 function verge(ex,ey,ez,enx,enz){ // outer kerb edge points with outward normals
  const n=ex.length,px=[],py=[],pz=[],pd=[];
  for(let k=0;k<n;k++){const x=ex[k],z=ez[k],g0=meshAt(x,z);if(ey[k]-g0<.1||inner(x,z,enx[k],enz[k])){px.push(x);py.push(ey[k]);pz.push(z);pd.push(0);continue;}
   let reach=8;if(k>0&&k<n-1){const ax=x-ex[k-1],az=z-ez[k-1],bx=ex[k+1]-x,bz=ez[k+1]-z,cr=ax*bz-az*bx,la=Math.hypot(ax,az),lb=Math.hypot(bx,bz),lc=Math.hypot(ex[k+1]-ex[k-1],ez[k+1]-ez[k-1]);
    // Bending towards the outward normal (a loop's inside): the batter would cross itself, so stay within 60 % of the bend radius.
    if(la>.01&&lb>.01&&Math.abs(cr)>1e-6&&((ex[k-1]+ex[k+1])/2-x)*enx[k]+((ez[k-1]+ez[k+1])/2-z)*enz[k]>0)reach=Math.max(.5,Math.min(8,.6*la*lb*lc/(2*Math.abs(cr))));}
   let d=.5;for(;d<=reach;d+=.5)if(ey[k]-SLOPE*d<=meshAt(x+enx[k]*d,z+enz[k]*d)+.03)break;d=Math.min(d,reach);
   const qx=x+enx[k]*d,qz=z+enz[k]*d;px.push(qx);py.push(meshAt(qx,qz)-.02);pz.push(qz);pd.push(d);}
  for(let k=0;k+1<n;k++)if(pd[k]>0||pd[k+1]>0)quad(stores.verge,3,0,ex[k],ey[k],ez[k],px[k],py[k],pz[k],px[k+1],py[k+1],pz[k+1],ex[k+1],ey[k+1],ez[k+1]);
 }
 if(tr){for(const rib of ribs){if(rib.bridge)continue;const {st,sc,hw}=rib,n=st.X.length;
   for(const side of [1,-1]){const ex=[],ey=[],ez=[],nx=[],nz=[];for(let k=0;k<n;k++){const o=(hw+KERB)*side*sc.MF[k];ex.push(st.X[k]+sc.NX[k]*o);ez.push(st.Z[k]+sc.NZ[k]*o);ey.push(st.Y[k]-KERB_DROP);nx.push(sc.NX[k]*side);nz.push(sc.NZ[k]*side);}verge(ex,ey,ez,nx,nz);}}
  for(const e of edges)verge(e.map(p=>p.x),e.map(p=>p.y),e.map(p=>p.z),e.map(p=>p.nx),e.map(p=>p.nz));}
 // Centre-line dashes on marked roads: 1.5 m pieces every 9 m along each chain, wherever a ribbon (not a patch) lies, just above the asphalt.
 const dashes=[],byChain=new Map();for(const rb of geo.ribbons){if(!byChain.has(rb.c))byChain.set(rb.c,[]);byChain.get(rb.c).push(rb);}
 for(const [c,list] of byChain){if(!c.ri.some(ri=>R[ri].road.mark))continue;let i=0;
  const pos=sv=>{while(i<c.s.length-2&&c.s[i+1]<=sv)i++;while(i>0&&c.s[i]>sv)i--;const f=Math.max(0,Math.min(1,(sv-c.s[i])/((c.s[i+1]-c.s[i])||1))),dx=c.x[i+1]-c.x[i],dz=c.z[i+1]-c.z[i],l=Math.hypot(dx,dz)||1;return {x:c.x[i]+dx*f,z:c.z[i]+dz*f,nx:-dz/l*.065,nz:dx/l*.065,y:c.at(sv)+.04};};
  for(let sv=3;sv+1.5<c.len-2;sv+=9){if(!list.some(rb=>sv>=rb.s0+.5&&sv+1.5<=rb.s1-.5))continue;if(!R[c.ri[Math.min(c.ri.length-1,Math.round(sv/c.len*(c.ri.length-1)))]].road.mark)continue;
   const a=pos(sv),b=pos(sv+1.5);dashes.push([[a.x+a.nx,a.y,a.z+a.nz],[a.x-a.nx,a.y,a.z-a.nz],[b.x-b.nx,b.y,b.z-b.nz],[b.x+b.nx,b.y,b.z+b.nz]]);}}
 // Highest drawn road at (x,z), or null off the road.
 function heightAt(x,z){const l=cells.get(cellKey(Math.floor(x/8),Math.floor(z/8)));if(!l)return null;let top=null;
  for(let k=0;k<l.length;k++){const o=l[k]*9,px=tris[o],py=tris[o+1],pz=tris[o+2],qx=tris[o+3],qy=tris[o+4],qz=tris[o+5],rx=tris[o+6],ry=tris[o+7],rz=tris[o+8],d=(qz-rz)*(px-rx)+(rx-qx)*(pz-rz);if(Math.abs(d)<1e-9)continue;
   const u=((qz-rz)*(x-rx)+(rx-qx)*(z-rz))/d,v=((rz-pz)*(x-rx)+(px-rx)*(z-rz))/d,w=1-u-v;if(u<-2e-4||v<-2e-4||w<-2e-4)continue;const y=u*py+v*qy+w*ry;if(top===null||y>top)top=y;}return top;}
 // The car's centre line along an edge path: the road geometry's, lifted onto the drawn surface wherever another road's surface lies higher. Checked every half metre,
 // and each sample takes the highest surface of its neighbours too, so the line has risen before a step in the surface, not after it.
 const edgeLine=(path,lift=0)=>{const line=geo.edgeLine(path,lift),pts=[];
  for(let i=0;i<line.length;i++){const q=line[i],p=line[i-1],n=p?Math.max(1,Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])/.5)):1;
   for(let k=1;k<=n;k++){const t=k/n;pts.push(p?[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,p[2]+(q[2]-p[2])*t]:q);}}
  const need=pts.map(p=>{const top=heightAt(p[0],p[1]);return top===null?-1e9:top+lift+.02;});
  return pts.map((p,i)=>[p[0],p[1],Math.max(p[2],need[i],i>0?need[i-1]:-1e9,i+1<pts.length?need[i+1]:-1e9)]);};
 // paint(fn): fn(cls,road,n,c,flip) once per primitive (n corners, c = x,y,z per corner, reused; flip: a quad split along its other diagonal, corners 1,2,3,0).
 const scratch=new Float64Array(12);
 function paint(fn,which=['ribbon','patch','verge']){for(const w of which){const s=stores[w];for(let o=0;o<s.length;){const cls=s[o]&7,flip=(s[o]&8)>0,ri=s[o+1],n=s[o+2];for(let k=0;k<n*3;k++)scratch[k]=s[o+3+k];fn(cls,R[ri].road,n,scratch,flip);o+=3+n*3;}}}
 const view=w=>{const out=[];paint((cls,road,n,c,flip)=>{const corners=[];for(let k=0;k<n;k++)corners.push([c[3*k],c[3*k+1],c[3*k+2]]);out.push({road,kerb:cls===1||cls===4,grass:cls===2,flip,x:c[0],z:c[2],corners});},[w]);return out;};
 const lazy=(w)=>{let v=null;return {get:()=>v||(v=view(w))};};
 const surface={dashes,heightAt,meshAt,lowerAt,edgeLine,paint,geometry:geo};
 Object.defineProperties(surface,{quads:lazy('ribbon'),extra:lazy('patch'),verges:lazy('verge')});
 return surface;
}
