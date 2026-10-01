import {roadWidth,streetSegments,segmentIndex,projectPoint} from './transit-geometry.js';
import {ROAD as ROAD_LOOK,PATH as PATH_LOOK} from './look.js'; // the colours of the road, kerbs and paths are decided in look.js
// Street details drawn the Norwegian way, from data.street (add-street-details.py reads them from OpenStreetMap; tags and
// what is approximate: docs/street-details.md): gangfelt with signs, haitenner at give-way points, stop lines, raised and
// painted traffic islands, turning circles, speed tables, sidewalks and gang- og sykkelvei, street lamps. Everything on the
// road stands on roadTop() and everything beside it on ground() (the ground as it is seen: the world passes the verge strips over the ground mesh, else height), so the road surface can change without touching this.
const WHITE='#f1f1e8',KERB=PATH_LOOK.kerbStone,PAVING=PATH_LOOK.paving,GRASS=ROAD_LOOK.island,POLE='#7f898d',BLUE='#1f57a8',RED='#c62330';
const ROAD=ROAD_LOOK.asphalt,GRAVEL=ROAD_LOOK.gravel,ROAD_KERB=ROAD_LOOK.kerb; // as world.js draws the road
export const COLOURS={WHITE,KERB,TABLE:'#858c89'}; // for the test
const MARK=.06; // markings float this far above the asphalt, over the centre-line dashes (4 cm): enough for the depth buffer at a distance, not enough to see
export const PATH_WIDTH={sidewalk:2.2,cycleway:3},KERB_BAND=.7,PATH_GAP=.4; // road-surface.js draws a kerb band .7 m wider than the carriageway on each side
const PATH_LIFT={sidewalk:.22,cycleway:.24},PATH_COLOUR={sidewalk:PATH_LOOK.sidewalk,cycleway:PATH_LOOK.cycleway};
const SURFACE={gravel:'#a49d8b',fine_gravel:'#a49d8b',compacted:'#a8a08b',unpaved:'#a39a83',dirt:'#9b8d72',ground:'#9b8d72',paving_stones:'#b3afa4',cobblestone:'#a7a398',sett:'#a7a398',concrete:'#bdbcb4'};
export const PATH_COLOURS=new Set([...Object.values(PATH_COLOUR),...Object.values(SURFACE)]); // for the test
const TABLE={table:{top:3,ramp:1.5,h:.09},hump:{top:0,ramp:1.8,h:.08}}; // a raised band across the road; the car does not bump
const unit=(x,z)=>{const l=Math.hypot(x,z)||1;return [x/l,z/l];};
const inRing=(ring,x,z)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
// Douglas-Peucker on a flat list x0,z0,x1,z1,...: the fewest points that keep the line within tol metres, as [x,z] pairs.
function simplify(f,tol){const n=f.length/2,keep=new Uint8Array(n),todo=[[0,n-1]];keep[0]=keep[n-1]=1;
 while(todo.length){const [i,j]=todo.pop();if(j-i<2)continue;const ax=f[2*i],az=f[2*i+1],dx=f[2*j]-ax,dz=f[2*j+1]-az,l2=dx*dx+dz*dz||1e-9;let far=0,at=0;
  for(let k=i+1;k<j;k++){const px=f[2*k]-ax,pz=f[2*k+1]-az,t=Math.max(0,Math.min(1,(px*dx+pz*dz)/l2)),ex=px-t*dx,ez=pz-t*dz,d=ex*ex+ez*ez;if(d>far){far=d;at=k;}}
  if(far>tol*tol){keep[at]=1;todo.push([i,at],[at,j]);}}
 const out=[];for(let i=0;i<n;i++)if(keep[i])out.push([f[2*i],f[2*i+1]]);return out;}

// A path (sidewalk, cycleway) kept off the carriageway: samples every metre are pushed out to half a road + kerb band + gap +
// half the path from the nearest road; where the line runs over a carriageway (a crossing, a junction) it is cut. Returns
// polylines with at least 4 m of length.
export function fitPath(points,halfWidth,index){
 // The road segments within reach of the path, gathered once (a lookup per sample would cost most of the world's build time).
 const cand=new Set(),reach=10;
 for(let i=0;i<points.length;i++){const a=points[i],b=points[i+1]||a,k=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8));for(let j=0;j<k;j++)for(const s of index.near(a[0]+(b[0]-a[0])*j/k,a[1]+(b[1]-a[1])*j/k,reach))cand.add(s);}
 const segs=[...cand].map(([a,b,w])=>{const need=w/2+KERB_BAND+PATH_GAP+halfWidth,dx=b[0]-a[0],dz=b[1]-a[1],m=need+.5;
  return {ax:a[0],az:a[1],dx,dz,l2:dx*dx+dz*dz||1e-9,half:w/2+.05,need,x0:Math.min(a[0],b[0])-m,x1:Math.max(a[0],b[0])+m,z0:Math.min(a[1],b[1])-m,z1:Math.max(a[1],b[1])+m};});
 // The sample (x,z) moved out of the kerb zones; false where it lies on a carriageway or cannot be moved clear.
 let x=0,z=0;
 const fit=()=>{for(let pass=0;pass<3;pass++){let moved=false;
   for(const s of segs){if(x<s.x0||x>s.x1||z<s.z0||z>s.z1)continue;
    const t=Math.max(0,Math.min(1,((x-s.ax)*s.dx+(z-s.az)*s.dz)/s.l2)),qx=s.ax+t*s.dx,qz=s.az+t*s.dz,d=Math.sqrt((x-qx)*(x-qx)+(z-qz)*(z-qz));
    if(d<s.half)return false;if(d<s.need){const f=(s.need-d)/d;x+=(x-qx)*f;z+=(z-qz)*f;moved=true;}}
   if(!moved)return true;}
  for(const s of segs){const t=Math.max(0,Math.min(1,((x-s.ax)*s.dx+(z-s.az)*s.dz)/s.l2));if(Math.hypot(x-s.ax-t*s.dx,z-s.az-t*s.dz)<s.need-.02)return false;}return true;};
 const runs=[];let run=[];
 for(let i=0;i<points.length;i++){const a=points[i],b=points[i+1]||a,k=i<points.length-1?Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]))):1; // samples every metre
  for(let j=0;j<k;j++){x=a[0]+(b[0]-a[0])*j/k;z=a[1]+(b[1]-a[1])*j/k;if(fit())run.push(x,z);else{runs.push(run);run=[];}}}
 runs.push(run);
 return runs.filter(r=>r.length>=4).map(r=>simplify(r,.08)).filter(r=>r.reduce((l,p,i)=>i?l+Math.hypot(p[0]-r[i-1][0],p[1]-r[i-1][1]):0,0)>=4);
}
// Trees stay off the paths: world.js's clear() keeps 4 m from a road's edge, from a path only 1.5 m (its width is passed as w-5).
// The island in the middle of a roundabout is one more such segment, a point with the island's diameter as its width.
export function indexStreetDetails({paths,central},index){for(const [a,b,w] of [...paths,...central.map(c=>[c.p,c.p,2*c.rad])]){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),seg=[a,b,w-5];for(let d=0;d<=len;d+=15){const t=len?d/len:0;index(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,{road:seg});}index(b[0],b[1],{road:seg});}}

export function addStreetDetails({T,scene,data,height,roadTop,bucket,quad,tri,box,ribbon,groundPoly,segments,ground=height}){
 const S=data.street,out={paths:[],lamps:[],bars:[],islands:[],turning:[],central:[],signs:0};if(!S)return out;
 const roads=new Map(data.roads.map(r=>[String(r.id),r])),widthOf=id=>roadWidth(roads.get(id)||{type:'residential'});
 const segs=segments||streetSegments(data.roads),index=segmentIndex(segs); // the drawn (smoothed) centre lines when world.js passes them
 // Speed tables and humps raise everything painted on them: raise(x,z) is the height of the band at that point.
 const bands=new Map(),cellOf=(i,j)=>i+','+j;
 for(const t of S.tables){const k=cellOf(Math.floor(t.p[0]/16),Math.floor(t.p[1]/16));if(!bands.has(k))bands.set(k,[]);bands.get(k).push(t);}
 function raise(x,z){let h=0;const i=Math.floor(x/16),j=Math.floor(z/16);
  for(let a=-1;a<=1;a++)for(let c=-1;c<=1;c++)for(const t of bands.get(cellOf(i+a,j+c))||[]){const k=TABLE[t.k],dx=x-t.p[0],dz=z-t.p[1],u=Math.abs(dx*t.d[0]+dz*t.d[1]),v=Math.abs(dz*t.d[0]-dx*t.d[1]);
   if(v>widthOf(t.r)/2+.01)continue;const e=u-k.top/2;h=Math.max(h,e<=0?k.h:e<k.ramp?k.h*(1-e/k.ramp):0);}
  return h;}
 const top=(x,z,lift=MARK)=>roadTop(x,z)+raise(x,z)+lift;
 // A thin four-sided pole, tapering to r1.
 function pole(b,x,z,y0,h,r0,r1,colour){const c=[[1,1],[-1,1],[-1,-1],[1,-1]];for(let i=0;i<4;i++){const [ax,az]=c[i],[bx,bz]=c[(i+1)%4];quad(b,[x+ax*r0,y0,z+az*r0],[x+bx*r0,y0,z+bz*r0],[x+bx*r1,y0+h,z+bz*r1],[x+ax*r1,y0+h,z+az*r1],colour);}}
 // A flat shape on a sign face: (s along the face, v up) to a point, the face looking along (nx,nz) from a pole at (x,z).
 const face=(x,z,nx,nz,y0,off)=>(s,v)=>[x-nz*s+nx*off,y0+v,z+nx*s+nz*off];
 // The road signs are on the driver's right, facing the traffic they are for: gangfelt (blue square, white triangle), vikeplikt (red-rimmed triangle on its point).
 function sign(kind,x,z,nx,nz){const b=bucket(x,z),y=ground(x,z);pole(b,x,z,y,2.5,.045,.04,POLE);out.signs++;
  if(kind==='gangfelt'){const f=face(x,z,nx,nz,y+1.95,.07),g=face(x,z,nx,nz,y+1.95,.085);quad(b,f(-.32,0),f(.32,0),f(.32,.64),f(-.32,.64),BLUE);tri(b,g(-.2,.1),g(.2,.1),g(0,.52),WHITE);}
  else{const f=face(x,z,nx,nz,y+1.85,.07),g=face(x,z,nx,nz,y+1.85,.085);tri(b,f(-.5,.9),f(.5,.9),f(0,0),RED);tri(b,g(-.29,.74),g(.29,.74),g(0,.24),WHITE);}}
 // A row of white haitenner across a lane: triangles with their points towards the driver, who comes along -d.
 function teeth(x,z,d,r,half,base=.6,pitch=.72,h=.75){const k=Math.max(1,Math.floor(2*half/pitch));
  for(let i=0;i<k;i++){const s=(i-(k-1)/2)*pitch,cx=x+r[0]*s,cz=z+r[1]*s;if(S.islands.some(o=>inRing(o.p,cx,cz)))continue; // none on an island
   const P=(u,v)=>{const px=cx+d[0]*u+r[0]*v,pz=cz+d[1]*u+r[1]*v;return [px,top(px,pz),pz];};
   tri(bucket(cx,cz),P(-h/2,0),P(h/2,-base/2),P(h/2,base/2),WHITE);}}
 const stopLine=(x,z,d,r,half)=>{const P=(u,v)=>{const px=x+d[0]*u+r[0]*v,pz=z+d[1]*u+r[1]*v;return [px,top(px,pz),pz];};quad(bucket(x,z),P(-.2,-half),P(-.2,half),P(.2,half),P(.2,-half),WHITE);};
 const right=d=>[-d[1],d[0]]; // the driver's right, with x east and z south

 // ---- Crossings: gangfelt, 0.5 m stripes with 0.5 m gaps side by side across the carriageway ------------------------------
 for(const c of S.crossings){
  const [px,pz]=c.p,[nx,nz]=c.n,tx=nz,tz=-nx,w=widthOf(c.r),b=bucket(px,pz);
  const P=(u,v)=>{const x=px+tx*u+nx*v,z=pz+tz*u+nz*v;return [x,top(x,z),z];}; // u along the road, v across it
  if(c.z){const k=Math.max(1,Math.floor((w-.3+.5)/1)),span=k-.5,pieces=[-2,0,2].some(u=>raise(px+tx*u,pz+tz*u)>0)?6:1; // on a speed table the stripes follow the ramps
   for(let i=0;i<k;i++){const v0=-span/2+i,v1=v0+.5;out.bars.push([px+nx*(v0+.25),pz+nz*(v0+.25),c.r]);
    for(let m=0;m<pieces;m++){const u0=-1.5+3*m/pieces,u1=-1.5+3*(m+1)/pieces;quad(b,P(u0,v0),P(u0,v1),P(u1,v1),P(u1,v0),WHITE);}}
   for(const s of [1,-1]){const q=[px+nx*s*(w/2+1.3)-tx*s*2.4,pz+nz*s*(w/2+1.3)-tz*s*2.4];sign('gangfelt',q[0],q[1],-tx*s,-tz*s);}}
  else for(const u of [-1.5,1.5])quad(b,P(u-.15,-w/2+.2),P(u-.15,w/2-.2),P(u+.15,w/2-.2),P(u+.15,-w/2+.2),WHITE); // crossing at signals: two lines
 }

 // ---- Give way and stop: haitenner or a stop line across the lane entering the junction, and the sign beside it ------------
 for(const g of S.give_way){const [x,z]=g.p,d=g.d,r=right(d),w=widthOf(g.r),cx=x+r[0]*w/4,cz=z+r[1]*w/4;teeth(cx,cz,d,r,w/4-.15);sign('vikeplikt',x-d[0]*.8+r[0]*(w/2+1.2),z-d[1]*.8+r[1]*(w/2+1.2),-d[0],-d[1]);}
 for(const g of [...S.stop,...S.traffic_signals]){const [x,z]=g.p,d=g.d,r=right(d),w=widthOf(g.r);stopLine(x+r[0]*w/4,z+r[1]*w/4,d,r,w/4-.1);}

 // ---- Speed tables and humps: a gentle band with white triangles on both ramps (a table with a crossing has the stripes instead) --
 for(const t of S.tables){
  const k=TABLE[t.k],w=widthOf(t.r),[dx,dz]=t.d,nx=-dz,nz=dx,b=bucket(...t.p),half=k.top/2,ramp=k.ramp;
  const lift=u=>{const e=Math.abs(u)-half;return e<=0?k.h:e<ramp?k.h*(1-e/ramp):0;};
  const P=(u,v)=>{const x=t.p[0]+dx*u+nx*v,z=t.p[1]+dz*u+nz*v;return [x,roadTop(x,z)+.02+lift(u),z];};
  const us=k.top?[-half-ramp,-half,half,half+ramp]:[-ramp,0,ramp];
  for(let i=0;i<us.length-1;i++)for(const [v0,v1] of [[-w/2,0],[0,w/2]])quad(b,P(us[i],v0),P(us[i],v1),P(us[i+1],v1),P(us[i+1],v0),COLOURS.TABLE);
  if(!S.crossings.some(c=>Math.hypot(c.p[0]-t.p[0],c.p[1]-t.p[1])<3))for(const s of [-1,1]){const u=s*(half+ramp/2),x=t.p[0]+dx*u,z=t.p[1]+dz*u;teeth(x,z,[-dx*s,-dz*s],[nx,nz],(w-.6)/2,.7,.85,ramp-.4);}
 }

 // ---- Turning circles: a round asphalt area at the end of a cul-de-sac, with a light kerb -------------------------------------
 for(const c of S.turning_circles){
  const [px,pz]=c.p,R=c.rad,y0=roadTop(px,pz),h0=height(px,pz),gravel=['gravel','compacted','unpaved'].includes((roads.get(c.r)||{}).surface);
  const Y=(x,z,l)=>y0+(height(x,z)-h0)+l,ring=(r,l)=>Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2,x=px+Math.cos(a)*r,z=pz+Math.sin(a)*r;return [x,Y(x,z,l),z];}),b=bucket(px,pz);
  const mid=ring(R*.5,.03),edge=ring(R,.03),kerb=ring(R+.7,-.09),colour=gravel?GRAVEL:ROAD;
  for(let i=0;i<24;i++){const j=(i+1)%24;tri(b,[px,y0+.03,pz],mid[i],mid[j],colour);quad(b,mid[i],mid[j],edge[j],edge[i],colour);quad(b,edge[i],edge[j],kerb[j],kerb[i],ROAD_KERB);}
  out.turning.push({p:c.p,rad:R});
 }

 // ---- Traffic islands ----------------------------------------------------------------------------------------------------------
 // Raised .12 m with a light kerb wall and a .25 m rim, grass or paving inside; flush ones (f) are white hatching with an outline.
 const subdivide=(a,b,c,fn,max=4)=>{const e=[[a,b],[b,c],[c,a]],l=e.map(([p,q])=>Math.hypot(p[0]-q[0],p[1]-q[1])),m=Math.max(...l);if(m<=max){fn(a,b,c);return;}
  const i=l.indexOf(m),[p,q]=e[i],o=[c,a,b][i],mid=[(p[0]+q[0])/2,(p[1]+q[1])/2];subdivide(p,mid,o,fn,max);subdivide(mid,q,o,fn,max);};
 function raisedIsland(poly,inside,base=roadTop,lift=.12){
  const pts=poly.map(v=>new T.Vector2(v[0],v[1])),Y=(v,l)=>[v[0],base(v[0],v[1])+l,v[1]],b=bucket(poly[0][0],poly[0][1]);
  for(const f of T.ShapeUtils.triangulateShape(pts,[]))subdivide(poly[f[0]],poly[f[1]],poly[f[2]],(p,q,r)=>tri(b,Y(p,lift),Y(q,lift),Y(r,lift),inside));
  for(let i=0;i<poly.length;i++){const a=poly[i],c=poly[(i+1)%poly.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<.05)continue;
   let [ux,uz]=unit(c[0]-a[0],c[1]-a[1]),nx=-uz,nz=ux;if(!inRing(poly,(a[0]+c[0])/2+nx*.06,(a[1]+c[1])/2+nz*.06)){nx=-nx;nz=-nz;}
   const k=Math.max(1,Math.ceil(len/4));
   for(let j=0;j<k;j++){const p=[a[0]+(c[0]-a[0])*j/k,a[1]+(c[1]-a[1])*j/k],q=[a[0]+(c[0]-a[0])*(j+1)/k,a[1]+(c[1]-a[1])*(j+1)/k],pi=[p[0]+nx*.25,p[1]+nz*.25],qi=[q[0]+nx*.25,q[1]+nz*.25];
    quad(b,[p[0],height(...p)-.03,p[1]],[q[0],height(...q)-.03,q[1]],Y(q,lift),Y(p,lift),KERB);
    quad(b,Y(p,lift+.005),Y(q,lift+.005),Y(qi,lift+.005),Y(pi,lift+.005),'#dedcd3');}}}
 function paintedIsland(poly){
  const b=bucket(poly[0][0],poly[0][1]),P=v=>[v[0],roadTop(v[0],v[1])+MARK,v[1]];
  for(let i=0;i<poly.length;i++){const a=poly[i],c=poly[(i+1)%poly.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]),[ux,uz]=unit(c[0]-a[0],c[1]-a[1]);
   for(let d=0;d<len;d+=6){const e=Math.min(len,d+6),p=[a[0]+ux*d,a[1]+uz*d],q=[a[0]+ux*e,a[1]+uz*e];quad(b,P([p[0]-uz*.1,p[1]+ux*.1]),P([p[0]+uz*.1,p[1]-ux*.1]),P([q[0]+uz*.1,q[1]-ux*.1]),P([q[0]-uz*.1,q[1]+ux*.1]),WHITE);}}
  // Hatching at 45°: chords of the polygon along each hatch line, .35 m stripes every 1.2 m.
  const s2=Math.SQRT1_2,cs=poly.map(v=>v[0]*s2-v[1]*s2),lo=Math.min(...cs),hi=Math.max(...cs);
  for(let c=lo+.8;c<hi-.4;c+=1.2){const xs=[];for(let i=0;i<poly.length;i++){const a=poly[i],e=poly[(i+1)%poly.length],ca=a[0]*s2-a[1]*s2,ce=e[0]*s2-e[1]*s2;if((ca>c)!==(ce>c)){const f=(c-ca)/(ce-ca),x=a[0]+(e[0]-a[0])*f,z=a[1]+(e[1]-a[1])*f;xs.push([x,z,x*s2+z*s2]);}}
   xs.sort((p,q)=>p[2]-q[2]);
   for(let i=0;i+1<xs.length;i+=2){const p=xs[i],q=xs[i+1],len=Math.hypot(q[0]-p[0],q[1]-p[1]);if(len<.6)continue;const [ux,uz]=unit(q[0]-p[0],q[1]-p[1]),a=[p[0]+ux*.25,p[1]+uz*.25],e=[q[0]-ux*.25,q[1]-uz*.25];
    const k=Math.max(1,Math.ceil(len/4));for(let j=0;j<k;j++){const f0=j/k,f1=(j+1)/k,m=[a[0]+(e[0]-a[0])*f0,a[1]+(e[1]-a[1])*f0],n=[a[0]+(e[0]-a[0])*f1,a[1]+(e[1]-a[1])*f1];
     quad(b,P([m[0]-uz*.17,m[1]+ux*.17]),P([m[0]+uz*.17,m[1]-ux*.17]),P([n[0]+uz*.17,n[1]-ux*.17]),P([n[0]-uz*.17,n[1]+ux*.17]),WHITE);}}}}
 for(const i of S.islands){if(i.f)paintedIsland(i.p);else raisedIsland(i.p,i.s==='paving_stones'?PAVING:i.s==='cobblestone'?'#a9a59a':GRASS);out.islands.push({p:i.p,flush:!!i.f});}
 // Roundabouts: a kerbed, grass-topped island in the middle of every circle wide enough (add-street-details.py has the rings).
 for(const r of S.roundabouts||[]){const w=widthOf(r.r),ri=r.rad-w/2-KERB_BAND-.25,n=Math.max(12,Math.round(ri*3));if(ri<1.6)continue;
  raisedIsland(Array.from({length:n},(_,i)=>[r.p[0]+Math.cos(i/n*Math.PI*2)*ri,r.p[1]+Math.sin(i/n*Math.PI*2)*ri]),GRASS);out.central.push({p:r.p,rad:ri});}

 // ---- Sidewalks and gang- og sykkelvei ------------------------------------------------------------------------------------------
 // A ribbon with mitred corners on the ground (the visible ground: a verge slope where the road has one), in 4 m pieces, each split lengthways where the middle would
 // otherwise sink into a bend of the ground or stand over it.
 function strip(p,width,colour,lift){
  const q=[p[0]];for(let i=0;i<p.length-1;i++){const a=p[i],c=p[i+1],k=Math.max(1,Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/4));for(let j=1;j<=k;j++)q.push([a[0]+(c[0]-a[0])*j/k,a[1]+(c[1]-a[1])*j/k]);}
  const sides=q.map((v,i)=>{const d1=unit(v[0]-(q[i-1]||v)[0],v[1]-(q[i-1]||v)[1]),d2=unit((q[i+1]||v)[0]-v[0],(q[i+1]||v)[1]-v[1]),a=i?d1:d2,c=q[i+1]?d2:d1,n1=[-a[1],a[0]],n2=[-c[1],c[0]],m=unit(n1[0]+n2[0],n1[1]+n2[1]),s=Math.min(1.6,1/Math.max(.1,m[0]*n1[0]+m[1]*n1[1]))*width/2;
   const l=[v[0]+m[0]*s,v[1]+m[1]*s],r=[v[0]-m[0]*s,v[1]-m[1]*s];return [[l[0],ground(...l)+lift,l[1]],[r[0],ground(...r)+lift,r[1]],[v[0],ground(...v)+lift,v[1]]];});
  for(let i=0;i<q.length-1;i++){const [l0,r0,c0]=sides[i],[l1,r1,c1]=sides[i+1],b=bucket(...q[i]);
   if(Math.abs(c0[1]-(l0[1]+r0[1])/2)>.04||Math.abs(c1[1]-(l1[1]+r1[1])/2)>.04){quad(b,l0,c0,c1,l1,colour);quad(b,c0,r0,r1,c1,colour);}else quad(b,l0,r0,r1,l1,colour);}}
 for(const p of S.paths){const width=PATH_WIDTH[p.t]||2.2;
  for(const line of fitPath(p.p,width/2,index)){strip(line,width,SURFACE[p.s]||PATH_COLOUR[p.t],PATH_LIFT[p.t]);for(let i=0;i<line.length-1;i++)out.paths.push([line[i],line[i+1],width]);}}

 // ---- Street lamps: a grey pole with an arm over the road side and a lamp head --------------------------------------------------
 // A lamp that OSM puts on a carriageway (or its kerb) stands on the verge instead, at half a road + kerb band + .4 m.
 for(const [ox,oz] of S.lamps){let x=ox,z=oz;
  for(let pass=0;pass<3;pass++){let moved=false;
   for(const [a,b,w] of index.near(x,z,10)){const pr=projectPoint([x,z],a,b),min=w/2+KERB_BAND+.4;if(pr.distance>=min)continue;moved=true;
    const [ux,uz]=pr.distance>.01?unit(x-pr.x,z-pr.z):unit(-(b[1]-a[1]),b[0]-a[0]);x+=ux*(min-pr.distance);z+=uz*(min-pr.distance);}
   if(!moved)break;}
  let near=null;for(const [a,b,w] of index.near(x,z,20)){const pr=projectPoint([x,z],a,b);if(pr.distance<16&&(!near||pr.distance<near.distance))near=pr;}
  const y=ground(x,z),b=bucket(x,z),H=7.6;pole(b,x,z,y,H,.1,.06,POLE);
  if(near){const [ax,az]=unit(near.x-x,near.z-z),angle=Math.atan2(-az,ax),ex=x+ax*2,ez=z+az*2,py=y+H-.1,lx=-az*.14,lz=ax*.14;
   // The arm reaches 2 m out over the verge; the head hangs at its end with a pale plate underneath.
   box(b,x+ax,py,z+az,2,.08,.08,POLE,angle);box(b,ex,py-.06,ez,.9,.14,.34,'#6d777b',angle);
   quad(b,[ex-ax*.4-lx,py-.14,ez-az*.4-lz],[ex+ax*.4-lx,py-.14,ez+az*.4-lz],[ex+ax*.4+lx,py-.14,ez+az*.4+lz],[ex-ax*.4+lx,py-.14,ez-az*.4+lz],'#f7f1cb');}
  else box(b,x,y+H+.08,z,.34,.16,.34,'#6d777b'); // beside nothing but a car park or a path: a lamp head on the pole
  out.lamps.push([x,z]);}
 return out;
}
