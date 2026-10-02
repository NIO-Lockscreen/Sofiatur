import {projectPoint,streetSegments,segmentIndex} from './transit-geometry.js';
import {KERB_BAND} from './street-details.js';
import {drawSign} from './munkvoll.js';
// Schoolyard (1 October 2026): the grounds of Dalgård skole and the signs on the roads that lead to it. add-schoolyard.py reads them from OpenStreetMap
// (the grounds, playgrounds, equipment, pitches) and NVDB (road signs; the speed humps go to data.street.tables) into data.schoolyard; docs/dalgard-references.md
// says what each piece comes from (measured / seen in a photograph / estimated). Everything is merged into the world's chunks (bucket/tri/quad/box).
//   asphalt yard   the school's asphalt: the site less buildings, lawns, playgrounds and roads (the aerial and the 2015 photographs show grey asphalt everywhere between the lawns)
//   playgrounds    fall surfaces with timber edging (gravel, sand, red rubber, artificial turf) and each piece of equipment at its mapped place
//   ball court     handball court lines (the court is 44 x 22 m, tagged soccer;handball) with two handball goals; two small goals on Trondsløkka
//   objects        the bronze statue "Nusse på gyngehest" on its plinth and a boulder, the campus board, picnic tables and a bicycle rack in the courtyard, the amphitheatre
//   signs          NVDB road signs on one pole per position, facing the traffic they are for: Barn and Skole, parking, no entry, 30 zone, shared path
// owns(x,z,kind) tells roadside.js what is drawn here instead: kind 'play' (its generic playground equipment) and 'way' (footpath ribbons inside the asphalt).
const hash=(x,z,k=0)=>{let h=Math.imul((x*8.3|0)+k*374761393,668265263)^Math.imul((z*8.3|0)+k*2246822519,374761393);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
const inRing=(ring,x,z)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
const unit=(x,z)=>{const l=Math.hypot(x,z)||1;return [x/l,z/l];};
export const LOOK={asphalt:['#898c85','#868983'],sand:'#d9c58a',gravel:'#a3a097',rubber:'#a94a3c',turf:'#4d8f4a',edging:'#b2a891',line:'#f1f3ec',
 green:'#2f6b46',yellow:'#cfc83a',red:'#c8352c',timber:'#9a7b55',darkTimber:'#6e5238',steel:'#7d8486',bronze:'#3a372f',concrete:'#9a9890',blue:'#1f57a8',white:'#f1f1e8',pole:'#7f898d'};
const bounds=ring=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const [x,z] of ring){a=Math.min(a,x);b=Math.min(b,z);c=Math.max(c,x);d=Math.max(d,z);}return [a,b,c,d];};

export function createSchoolyard({T,scene,data,ground,bucket,tri,quad,box,ribbon:ribbonOf,segments,onSurface=()=>false}){
 const Y=data.schoolyard,out={counts:{},triangles:0,parts:{},owns:()=>false,paved:[]};if(!Y)return out;
 let nTri=0;out.ms={};const part=(k,f)=>{const n0=nTri,t0=performance.now();f();out.parts[k]=(out.parts[k]||0)+nTri-n0;out.ms[k]=Math.round(performance.now()-t0);};
 const T3=(b,a,c,d,col)=>{nTri++;tri(b,a,c,d,col);},Q=(b,a,c,d,e,col)=>{nTri+=2;quad(b,a,c,d,e,col);},B=(b,x,y,z,wx,wy,wz,col,ang=0)=>{nTri+=12;box(b,x,y,z,wx,wy,wz,col,ang);};
 const count=k=>out.counts[k]=(out.counts[k]||0)+1;
 const ribbon=(pts,w,col,lift,g)=>{for(let i=0;i<pts.length-1;i++)nTri+=2*Math.max(1,Math.ceil(Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1])/8));ribbonOf(pts,w,col,lift,g);};
 const segs=segments||streetSegments(data.roads),idx=segmentIndex(segs);
 // ---- What this module draws instead of roadside.js ------------------------------------------------------------------------------------------
 const pavedParts=Y.paved.map(g=>({p:g.p,h:g.h,b:bounds(g.p)}));
 const sb=bounds(Y.site),kb=bounds(Y.kinder),near=(b,x,z,m)=>x>b[0]-m&&x<b[2]+m&&z>b[1]-m&&z<b[3]+m;
 const inPaved=(x,z)=>pavedParts.some(g=>near(g.b,x,z,0)&&inRing(g.p,x,z)&&!g.h.some(h=>inRing(h,x,z)));
 out.owns=(x,z,kind)=>{if(kind==='way')return near(sb,x,z,0)&&inPaved(x,z);if(kind==='play')return near(sb,x,z,6)&&inRing(Y.site,x,z)||near(kb,x,z,6)&&inRing(Y.kinder,x,z);return false;};
 out.inPaved=inPaved;
 // ---- Triangulated surfaces draped on the ground (edges cut to 9 m) ------------------------------------------------------------------------------
 const subdivide=(a,b,c,fn,max)=>{const e=[[a,b],[b,c],[c,a]],l=e.map(([p,q])=>Math.hypot(p[0]-q[0],p[1]-q[1])),m=Math.max(...l);if(m<=max){fn(a,b,c);return;}const i=l.indexOf(m),[p,q]=e[i],o=[c,a,b][i],mid=[(p[0]+q[0])/2,(p[1]+q[1])/2];subdivide(p,mid,o,fn,max);subdivide(mid,q,o,fn,max);};
 function drape(poly,holes,lift,colour,max=9){
  const all=[...poly,...holes.flat()],faces=T.ShapeUtils.triangulateShape(poly.map(v=>new T.Vector2(...v)),holes.map(h=>h.map(v=>new T.Vector2(...v))));
  const memo=new Map(),G=(x,z)=>{const k=Math.round(x*40)*262147+Math.round(z*40);let h=memo.get(k);if(h===undefined){h=ground(x,z);memo.set(k,h);}return h;}; // the corners of neighbouring triangles are the same points
  for(const f of faces)subdivide(all[f[0]],all[f[1]],all[f[2]],(a,c,d)=>{const Yv=v=>[v[0],G(v[0],v[1])+lift,v[1]],col=typeof colour==='function'?colour((a[0]+c[0]+d[0])/3,(a[1]+c[1]+d[1])/3):colour;T3(bucket(a[0],a[1]),Yv(a),Yv(c),Yv(d),col);},max);}
 part('asphalt',()=>{for(const g of pavedParts){drape(g.p,g.h,.07,(x,z)=>LOOK.asphalt[hash(x,z,31)<.5?0:1],9);count('paved');}});
 part('surfaces',()=>{for(const s of Y.surfaces){drape(s.p,[],.09,LOOK[s.k]||LOOK.gravel,6);ribbon([...s.p,s.p[0]],.16,LOOK.edging,.12,ground);count('surface');}});
 // ---- Local frame: u along the direction ang (x east, z south: (cos, -sin)), v across ---------------------------------------------------------------
 const F=(x,z,ang)=>(u,v)=>[x+u*Math.cos(ang)+v*Math.sin(ang),z-u*Math.sin(ang)+v*Math.cos(ang)];
 const SCHOOL=-42*Math.PI/180; // the walls of the school run at 42°: the equipment is set parallel to them (its direction is not mapped)
 function boxAt(b,x,z,ang,u,v,y0,wu,wh,wv,col){const [px,pz]=F(x,z,ang)(u,v);B(b,px,ground(px,pz)+y0+wh/2,pz,wu,wh,wv,col,ang);} // each piece stands on the ground under it
 // A thin plane between two points (a rung, a chain): two sides.
 function strip(b,x,z,ang,u0,v0,y0,u1,v1,y1,w,col){const f=F(x,z,ang),g=ground(x,z),[ax,az]=f(u0,v0),[cx,cz]=f(u1,v1);let dx=cz-az,dz=-(cx-ax);const l=Math.hypot(dx,dz);if(l<1e-6){dx=Math.cos(ang);dz=-Math.sin(ang);}const k=w/2/(l<1e-6?1:l),nx=dx*k,nz=dz*k;
  Q(b,[ax-nx,g+y0,az-nz],[cx-nx,g+y1,cz-nz],[cx+nx,g+y1,cz+nz],[ax+nx,g+y0,az+nz],col);}
 const kinderAt=(x,z)=>inRing(Y.kinder,x,z);
 const MODEL={
  swing(x,z,ang,e){const b=bucket(x,z),w=Math.min(5,Math.max(3,(e.l||4)*.55)),nest=kinderAt(x,z);
   for(const sd of [-1,1]){const u=sd*w/2;for(const v of [-.7,.7])strip(b,x,z,ang,u,v,0,u,0,2.3,.1,LOOK.green);}
   boxAt(b,x,z,ang,0,0,2.2,w+.3,.12,.14,LOOK.red);
   if(nest){const [cx,cz]=F(x,z,ang)(0,0),y=ground(x,z)+.55;for(let i=0;i<8;i++){const a0=i/8*Math.PI*2,a1=(i+1)/8*Math.PI*2;T3(b,[cx,y,cz],[cx+Math.cos(a0)*.6,y,cz+Math.cos(a0-Math.PI/2)*.6],[cx+Math.cos(a1)*.6,y,cz+Math.cos(a1-Math.PI/2)*.6],LOOK.red);}
    for(const k of [-.45,.45])strip(b,x,z,ang,k,0,.55,k*.6,0,2.2,.04,'#9a2b24');}
   else for(const k of [-1,1]){const u=k*Math.min(1.1,w/4);boxAt(b,x,z,ang,u,0,.55,.5,.05,.2,LOOK.darkTimber);for(const o of [-.22,.22])strip(b,x,z,ang,u+o,0,.58,u+o,0,2.2,.03,LOOK.steel);}},
  slide(x,z,ang){const b=bucket(x,z);
   for(const [u,v] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]])boxAt(b,x,z,ang,u,v,0,.1,1.9,.1,LOOK.green);
   boxAt(b,x,z,ang,0,0,1.5,1.1,.08,1.1,LOOK.timber);
   const f=F(x,z,ang),g=ground(x,z),P=(u,v,y)=>{const [px,pz]=f(u,v);return [px,g+y,pz];};
   Q(b,P(.55,-.5,1.55),P(.55,.5,1.55),P(2.9,.5,.2),P(2.9,-.5,.2),'#c9a227');Q(b,P(.55,-.5,1.55),P(2.9,-.5,.2),P(2.9,-.5,.5),P(.55,-.5,1.9),'#b0911f');Q(b,P(.55,.5,1.55),P(.55,.5,1.9),P(2.9,.5,.5),P(2.9,.5,.2),'#b0911f');
   const r=[P(-.65,-.65,1.9),P(.65,-.65,1.9),P(.65,.65,1.9),P(-.65,.65,1.9)],top=P(0,0,2.7);for(let i=0;i<4;i++)T3(b,r[i],r[(i+1)%4],top,LOOK.red);},
  climbingframe(x,z,ang){const b=bucket(x,z);
   for(const u of [-1.4,1.4])for(const v of [-.12,.12])boxAt(b,x,z,ang,u,v,0,.12,2.5,.1,LOOK.green);
   boxAt(b,x,z,ang,0,0,2.4,3,.1,.34,'#1f4f9a');
   for(let k=0;k<6;k++){const y=.3+k*.36;strip(b,x,z,ang,-1.4,-.12,y,1.4,-.12,y,.07,LOOK.yellow);strip(b,x,z,ang,-1.4,.12,y,1.4,.12,y,.07,LOOK.yellow);}
   for(const u of [-1.4,1.4])strip(b,x,z,ang,u,-.13,.2,u,-.13,2.4,.12,LOOK.red);},
  balancebeam(x,z,ang){const b=bucket(x,z);boxAt(b,x,z,ang,0,0,.3,3.2,.2,.25,LOOK.timber);for(const u of [-1.3,1.3])boxAt(b,x,z,ang,u,0,0,.2,.3,.3,LOOK.red);},
  seesaw(x,z,ang){const b=bucket(x,z);boxAt(b,x,z,ang,0,0,.1,.3,.35,.3,LOOK.steel);boxAt(b,x,z,ang,0,0,.45,2.3,.07,.28,LOOK.timber);for(const u of [-1,1])boxAt(b,x,z,ang,u,0,0,.2,.2,.2,LOOK.red);},
  sandpit(x,z,ang,e){const b=bucket(x,z),l=e.area?Math.min(5,e.l):3,w=e.area?Math.min(5,e.w):3;
   for(const [u,v,wu,wv] of [[0,-w/2,l,.14],[0,w/2,l,.14],[-l/2,0,.14,w],[l/2,0,.14,w]])boxAt(b,x,z,ang,u,v,0,wu,.3,wv,LOOK.timber);
   const f=F(x,z,ang),P=(u,v)=>{const [px,pz]=f(u,v);return [px,ground(px,pz)+.2,pz];};Q(b,P(-l/2,-w/2),P(l/2,-w/2),P(l/2,w/2),P(-l/2,w/2),LOOK.sand);},
  playhouse(x,z,ang){const b=bucket(x,z);for(const [u,v,wu,wv] of [[0,-.9,2,.1],[0,.9,2,.1],[-.95,0,.1,1.8]])boxAt(b,x,z,ang,u,v,0,wu,1.7,wv,LOOK.timber);boxAt(b,x,z,ang,.95,-.6,0,.1,1.7,.6,LOOK.timber);boxAt(b,x,z,ang,.95,.6,0,.1,1.7,.6,LOOK.timber);
   const f=F(x,z,ang),g=ground(x,z),P=(u,v,y)=>{const [px,pz]=f(u,v);return [px,g+y,pz];};
   Q(b,P(-1.2,-1.1,1.7),P(1.2,-1.1,1.7),P(1.2,0,2.5),P(-1.2,0,2.5),LOOK.red);Q(b,P(-1.2,1.1,1.7),P(-1.2,0,2.5),P(1.2,0,2.5),P(1.2,1.1,1.7),LOOK.red);T3(b,P(-1.2,-1.1,1.7),P(-1.2,0,2.5),P(-1.2,1.1,1.7),'#8a2f27');T3(b,P(1.2,-1.1,1.7),P(1.2,1.1,1.7),P(1.2,0,2.5),'#8a2f27');},
  tunnel_tube(x,z,ang){const b=bucket(x,z),f=F(x,z,ang),g=ground(x,z),n=8,r=.55,L=1.6;
   const ring=u=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,[px,pz]=f(u,Math.cos(a)*r);return [px,g+.55+Math.sin(a)*r,pz];});const A=ring(-L),C=ring(L);
   for(let i=0;i<n;i++){const j=(i+1)%n;Q(b,A[i],A[j],C[j],C[i],i%2?'#7a5a42':'#6e5238');}},
  structure(x,z,ang){const b=bucket(x,z);MODEL.slide(x,z,ang+Math.PI/2);for(const [u,v] of [[-.8,-.8],[.8,-.8],[-.8,.8],[.8,.8]])boxAt(b,x,z,ang,u,v,0,.12,2.4,.12,LOOK.green);boxAt(b,x,z,ang,0,0,1.6,1.8,.08,1.8,LOOK.timber);
   const f=F(x,z,ang),g=ground(x,z),P=(u,v,y)=>{const [px,pz]=f(u,v);return [px,g+y,pz];},top=P(0,0,3.3),r=[P(-1,-1,2.4),P(1,-1,2.4),P(1,1,2.4),P(-1,1,2.4)];for(let i=0;i<4;i++)T3(b,r[i],r[(i+1)%4],top,LOOK.red);
   Q(b,P(-.8,-.8,.2),P(-.8,.8,.2),P(-.8,.8,1.6),P(-.8,-.8,1.6),'#b23a2f');}
 };
 part('equipment',()=>{for(const e of Y.equipment){const m=MODEL[e.k];if(!m)continue;const ang=e.area?-e.a:SCHOOL+(hash(e.p[0],e.p[1],33)<.5?0:Math.PI/2*(e.k==='slide'?1:0));m(e.p[0],e.p[1],ang,e);count(e.k);}});
 // ---- Handball court: 40 x 20 m inside the 44 x 22 m asphalt, with two goals; Trondsløkka's small goals -----------------------------------------
 part('courts',()=>{
  const C=Y.courts.ball;if(C){const ang=-C.a,f=F(C.c[0],C.c[1],ang),line=pts=>ribbon(pts.map(q=>f(...q)),.1,LOOK.line,.15,ground),L=20,Wd=10;
   line([[-L,-Wd],[L,-Wd],[L,Wd],[-L,Wd],[-L,-Wd]]);line([[0,-Wd],[0,Wd]]);
   for(const s of [-1,1]){const g0=s*L,dir=-s; // goal line at s*L; the court lies towards -s
    const six=[...arcAround(g0,-1.5,6,dir,true),[g0+dir*6,-1.5],[g0+dir*6,1.5],...arcAround(g0,1.5,6,dir,false)];
    line(six);
    // 9 m free-throw line: dashes
    const nine=[...arcAround(g0,-1.5,9,dir,true),[g0+dir*9,-1.5],[g0+dir*9,1.5],...arcAround(g0,1.5,9,dir,false)];for(let i=0;i<nine.length-1;i+=2)line([nine[i],nine[i+1]]);
    line([[g0+dir*7-.15,0],[g0+dir*7+.15,0]]);
    // the goal: 3 m wide, 2 m high, white posts
    const [gx,gz]=f(g0+s*.1,0),gg=ground(gx,gz),b=bucket(gx,gz);
    for(const v of [-1.5,1.5]){const [px,pz]=f(g0+s*.1,v);B(b,px,ground(px,pz)+1,pz,.1,2,.1,'#f4f4f0',ang);}
    const [mx,mz]=f(g0+s*.1,0);B(b,mx,gg+2,mz,.1,.1,3.1,'#f4f4f0',ang);
    const [bx,bz]=f(g0+s*.9,0),[b1x,b1z]=f(g0+s*.1,-1.5),[b2x,b2z]=f(g0+s*.1,1.5),[c1x,c1z]=f(g0+s*.9,-1.5),[c2x,c2z]=f(g0+s*.9,1.5);
    Q(b,[b1x,gg+2,b1z],[b2x,gg+2,b2z],[c2x,gg+.9,c2z],[c1x,gg+.9,c1z],'#d8dcd8');count('goal');}
   count('court');}
  function arcAround(g0,v0,r,dir,first){ // quarter circle of radius r round the goal post at v0, from the goal line out to the line parallel to it
   const pts=[];for(let i=0;i<=8;i++){const a=i/8*Math.PI/2,du=Math.sin(a)*r*(1),dv=Math.cos(a)*r;pts.push([g0+dir*du,v0+(v0<0?-dv:dv)]);}
   return first?pts:pts.slice().reverse();}
  const G=Y.courts.grass;if(G){const ang=-G.a,f=F(G.c[0],G.c[1],ang);for(const s of [-1,1]){const u=s*(G.l/2-.6);for(const v of [-1.5,1.5]){const [px,pz]=f(u,v);B(bucket(px,pz),px,ground(px,pz)+.65,pz,.09,1.3,.09,'#f4f4f0',ang);}const [mx,mz]=f(u,0);B(bucket(mx,mz),mx,ground(mx,mz)+1.3,mz,.09,.09,3.1,'#f4f4f0',ang);count('goal');}}
 });
 // ---- Car parks: bay lines and a few cars; the 15-minute drop-off pockets along Dalgårdvegen (OSM amenity=parking, parking=street_side) ---------------------------------
 const CARS=['#d9dcdc','#2b2f33','#9ea5a9','#8a2027','#24476f','#46534b','#c7c2b4','#1f2a36'];
 function car(x,z,ang,key){const b=bucket(x,z),g=ground(x,z),c=CARS[Math.floor(key*CARS.length)],f=F(x,z,ang),[cx,cz]=f(-.15,0);B(b,x,g+.55,z,4.4,.7,1.8,c,ang);B(b,cx,g+1.15,cz,2.2,.5,1.6,'#27323a',ang);count('car');}
 const carFits=(x,z,ang)=>{const f=F(x,z,ang);for(const [u,v] of [[-2.2,-.9],[-2.2,.9],[2.2,-.9],[2.2,.9],[0,0]]){const [px,pz]=f(u,v);if(onSurface(px,pz))return false;}return true;};
 part('lots',()=>{for(const l of Y.lots||[]){const p=l.p,n=p.length;let L0=0,ang=0,sa=0;for(let i=0;i<n;i++){const a=p[i],c=p[(i+1)%n],len=Math.hypot(c[0]-a[0],c[1]-a[1]);sa+=a[0]*c[1]-c[0]*a[1];if(len>L0){L0=len;ang=Math.atan2(-(c[1]-a[1]),c[0]-a[0]);}}
  if(Math.abs(sa/2)<20)continue;const f=F(0,0,ang),inv=(x,z)=>[x*Math.cos(ang)-z*Math.sin(ang),x*Math.sin(ang)+z*Math.cos(ang)];
  let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(const [x,z] of p){const [u,v]=inv(x,z);u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);}
  const Pt=(u,v,lift)=>{const [x,z]=f(u,v);return [x,ground(x,z)+lift,z];};
  if(l.k==='street'){ // a pocket 6 m deep along the road: its outline and a car in some of them
   ribbon([...p,p[0]],.1,LOOK.line,.13,ground);const uc=(u0+u1)/2,vc=(v0+v1)/2;for(const u of [-1,1]){const [x,z]=f(uc+u*(u1-u0)/4,vc);if(hash(x,z,41)<.35&&carFits(x,z,ang))car(x,z,ang,hash(x,z,42));}count('pocket');continue;}
  if(v1-v0<11){continue;}
  // bays of 2.6 x 5 m in back-to-back rows, 6 m aisles between the pairs; a row where it lies inside the car park and off every road
  for(let v=v0+2.6;v<v1-2;v+=16)for(const rowV of [v,v+5.1])for(let u=u0+1.4;u<u1-1.4;u+=2.6){
   const [x,z]=f(u,rowV),[ax,az]=f(u,rowV-2.3),[bx,bz]=f(u,rowV+2.3);if(!inRing(p,x,z)||!inRing(p,ax,az)||!inRing(p,bx,bz)||onSurface(x,z))continue;
   const b=bucket(x,z);Q(b,Pt(u-1.3-.05,rowV-2.45,.09),Pt(u-1.3+.05,rowV-2.45,.09),Pt(u-1.3+.05,rowV+2.45,.09),Pt(u-1.3-.05,rowV+2.45,.09),LOOK.line);
   if(hash(x,z,43)<.4&&carFits(x,z,ang-Math.PI/2))car(x,z,ang-Math.PI/2,hash(x,z,44));}
  count('lot');}});
 // ---- Objects ---------------------------------------------------------------------------------------------------------------------------------------
 const nearestRoad=(x,z,reach=40)=>{let best=null;for(const [a,b,w] of idx.near(x,z,reach)){const q=projectPoint([x,z],a,b);if(!best||q.distance<best.d)best={d:q.distance,x:q.x,z:q.z,w};}return best;};
 const toRoad=(x,z)=>{const r=nearestRoad(x,z);return r?Math.atan2(-(r.z-z),r.x-x):SCHOOL;}; // local u axis towards the nearest road
 part('objects',()=>{for(const o of Y.objects){const [x,z]=o.p;
  if(o.k==='statue'){const ang=toRoad(x,z)+Math.PI/2,b=bucket(x,z);
   // bronze boy on a rocking horse on a concrete plinth (Astrid Dahlsveen, 1979; photograph by Trondheim byarkiv/TKK): about 1.7 m in all
   boxAt(b,x,z,ang,0,0,0,1,.7,.7,LOOK.concrete);boxAt(b,x,z,ang,0,0,.7,.95,.08,.5,'#6f6c63');
   boxAt(b,x,z,ang,-.05,0,.78,.8,.38,.2,LOOK.bronze);boxAt(b,x,z,ang,.4,0,1.05,.28,.28,.12,LOOK.bronze);boxAt(b,x,z,ang,.45,0,1.1,.12,.38,.1,LOOK.bronze);
   boxAt(b,x,z,ang,.02,0,1.16,.26,.5,.2,LOOK.bronze);boxAt(b,x,z,ang,.04,0,1.5,.22,.24,.2,LOOK.bronze);boxAt(b,x,z,ang,-.38,0,.82,.12,.12,.14,LOOK.bronze);
   count('statue');}
  else if(o.k==='stone'){const b=bucket(x,z),g=ground(x,z),top=[x+.1,g+1.1,z-.05],r=[[x-.9,z-.6],[x+.8,z-.8],[x+1.0,z+.5],[x-.2,z+.9],[x-1,z+.3]];
   for(let i=0;i<r.length;i++){const a=r[i],c=r[(i+1)%r.length];T3(b,[a[0],g-.1,a[1]],[c[0],g-.1,c[1]],top,i%2?'#8d8a82':'#7f7c75');}count('stone');}
  else if(o.k==='board'){const ang=toRoad(x,z),b=bucket(x,z),f=F(x,z,ang),g=ground(x,z),P=(v,y,d=0)=>{const [px,pz]=f(d,v);return [px,g+y,pz];};
   // the campus board by the west gate: blue frame, white panel, green plan with red buildings (photograph 2015)
   for(const v of [-.6,.6])boxAt(b,x,z,ang,0,v,0,.09,1.7,.09,LOOK.blue);boxAt(b,x,z,ang,.04,0,1.45,.07,.14,1.36,LOOK.blue);
   Q(b,P(-.62,.8,.07),P(.62,.8,.07),P(.62,1.4,.07),P(-.62,1.4,.07),'#efece0');Q(b,P(-.6,.85,.08),P(-.15,.85,.08),P(-.15,1.38,.08),P(-.6,1.38,.08),'#2f9a55');
   Q(b,P(-.55,1.0,.09),P(-.3,1.0,.09),P(-.3,1.15,.09),P(-.55,1.15,.09),'#d8322a');Q(b,P(-.5,1.15,.09),P(-.4,1.15,.09),P(-.4,1.3,.09),P(-.5,1.3,.09),'#d8322a');count('board');}
  else if(o.k==='picnic'){const b=bucket(x,z),y0=.12;const f=F(x,z,SCHOOL),g=ground(x,z)+y0;
   {const [px,pz]=f(0,0);B(b,px,g+.76,pz,1.9,.06,.8,LOOK.timber,SCHOOL);}
   for(const v of [-.62,.62]){const [px,pz]=f(0,v);B(b,px,g+.46,pz,1.9,.05,.28,LOOK.timber,SCHOOL);}
   for(const u of [-.7,.7]){const [px,pz]=f(u,0);B(b,px,g+.38,pz,.08,.76,1.5,LOOK.darkTimber,SCHOOL);}count('picnic');}
  else if(o.k==='bikes'){const ang=SCHOOL,b=bucket(x,z),f=F(x,z,ang),g=ground(x,z)+.12;
   boxAt(b,x,z,ang,0,0,.12-.12+.12,3.6,.05,.4,LOOK.steel);
   for(let i=-3;i<=3;i++){const [px,pz]=f(i*.5,0);B(b,px,g+.5,pz,.05,.1,1.7,'#4a5258',ang);B(b,px,g+.9,pz+0,.05,.06,.5,'#2b2f33',ang);B(b,px,g+.3,pz,.04,.5,.04,'#6a7074',ang);}count('bikes');}
  else if(o.k==='bleachers'){const p=o.p,c=[p.reduce((s,q)=>s+q[0],0)/p.length,p.reduce((s,q)=>s+q[1],0)/p.length],b=bucket(c[0],c[1]);
   const steps=o.theatre?3:2,rise=o.theatre?.3:.4;
   for(let k=0;k<steps;k++){const s0=1-.22*k,s1=1-.22*(k+1),r0=p.map(q=>[c[0]+(q[0]-c[0])*s0,c[1]+(q[1]-c[1])*s0]),r1=p.map(q=>[c[0]+(q[0]-c[0])*s1,c[1]+(q[1]-c[1])*s1]);
    for(let i=0;i<p.length;i++){const j=(i+1)%p.length,Pz=(q,y)=>[q[0],ground(q[0],q[1])+y,q[1]];
     Q(b,Pz(r0[i],rise*k),Pz(r0[j],rise*k),Pz(r0[j],rise*(k+1)),Pz(r0[i],rise*(k+1)),'#8f8d85');Q(b,Pz(r0[i],rise*(k+1)),Pz(r0[j],rise*(k+1)),Pz(r1[j],rise*(k+1)),Pz(r1[i],rise*(k+1)),k%2?'#bdb9ac':'#c7c3b6');}}
   if(steps){const s=1-.22*steps;const top=p.map(q=>[c[0]+(q[0]-c[0])*s,c[1]+(q[1]-c[1])*s]);const faces=T.ShapeUtils.triangulateShape(top.map(v=>new T.Vector2(...v)),[]);for(const f of faces)T3(b,...f.map(i=>[top[i][0],ground(top[i][0],top[i][1])+rise*steps,top[i][1]]),'#bdb9ac');}count('bleachers');}}});
 // ---- Road signs ----------------------------------------------------------------------------------------------------------------------------------------
 // Round, triangular and square plates from flat quads and triangles: the sign's own frame (s along the face, v up) as in street-details.js.
 function disc(b,fp,c,r,col,off,n=12){const P=(a,k)=>fp(c[0]+Math.cos(a)*r*k,c[1]+Math.sin(a)*r*k,off);for(let i=0;i<n;i++){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;T3(b,P(0,0),P(a0,1),P(a1,1),col);}}
 function bar(b,fp,s0,v0,s1,v1,w,col,off){const dx=s1-s0,dv=v1-v0,l=Math.hypot(dx,dv)||1,nx=-dv/l*w/2,nv=dx/l*w/2;Q(b,fp(s0-nx,v0-nv,off),fp(s1-nx,v1-nv,off),fp(s1+nx,v1+nv,off),fp(s0+nx,v0+nv,off),col);}
 const SEG={0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgedc',7:'abc',8:'abcdefg',9:'abcdfg'};
 function digit(b,fp,d,s,v,h,col,off){const w=h*.55,t=h*.14,seg={a:[s,v+h/2,s+w,v+h/2,0],g:[s,v,s+w,v,0],d:[s,v-h/2,s+w,v-h/2,0],f:[s,v+h/4,s,v+h/4,1],e:[s,v-h/4,s,v-h/4,1],b:[s+w,v+h/4,s+w,v+h/4,1],c:[s+w,v-h/4,s+w,v-h/4,1]};
  for(const k of SEG[d]){const [a0,a1,b0,b1,vert]=seg[k];if(vert)bar(b,fp,a0,a1-h/4,b0,b1+h/4,t,col,off);else bar(b,fp,a0-t/2,a1,b0+t/2,b1,t,col,off);}}
 const speed=(b,fp,y,d1,d2)=>{disc(b,fp,[0,y],.3,'#c62330',.075);disc(b,fp,[0,y],.235,LOOK.white,.082);digit(b,fp,d1,-.15,y,.26,'#111',.09);digit(b,fp,d2,.01,y,.26,'#111',.09);};
 const SIGN={
  '372':(b,fp,y)=>{disc(b,fp,[0,y],.3,'#c62330',.075);disc(b,fp,[0,y],.26,LOOK.blue,.082);bar(b,fp,-.2,y-.2,.2,y+.2,.05,'#c62330',.09);},
  '302':(b,fp,y)=>{disc(b,fp,[0,y],.3,'#c62330',.075);bar(b,fp,-.21,y,.21,y,.09,LOOK.white,.085);},
  '552':(b,fp,y)=>{Q(b,fp(-.28,y-.28,.075),fp(.28,y-.28,.075),fp(.28,y+.28,.075),fp(-.28,y+.28,.075),LOOK.blue);bar(b,fp,-.09,y-.18,-.09,y+.18,.06,LOOK.white,.085);bar(b,fp,-.09,y+.15,.07,y+.15,.06,LOOK.white,.085);bar(b,fp,.1,y+.04,.1,y+.12,.06,LOOK.white,.085);bar(b,fp,-.09,y-.0,.07,y-.0,.06,LOOK.white,.085);},
  '834':(b,fp,y)=>{Q(b,fp(-.3,y-.12,.075),fp(.3,y-.12,.075),fp(.3,y+.12,.075),fp(-.3,y+.12,.075),LOOK.white);bar(b,fp,-.22,y+.04,.22,y+.04,.05,'#222',.085);bar(b,fp,-.22,y-.05,.12,y-.05,.05,'#222',.085);},
  '366':(b,fp,y)=>speed(b,fp,y,3,0),
  '368':(b,fp,y)=>{disc(b,fp,[0,y],.3,'#2a2a2a',.075);disc(b,fp,[0,y],.26,LOOK.white,.082);for(const k of [-.1,0,.1])bar(b,fp,-.2,y+k-.1,.2,y+k+.1,.03,'#2a2a2a',.09);},
  '522':(b,fp,y)=>{disc(b,fp,[0,y],.3,LOOK.blue,.075);bar(b,fp,-.2,y-.2,.2,y+.2,.03,LOOK.white,.085);Q(b,fp(-.18,y+.02,.085),fp(-.08,y+.02,.085),fp(-.08,y+.2,.085),fp(-.18,y+.2,.085),LOOK.white);Q(b,fp(.08,y-.2,.085),fp(.18,y-.2,.085),fp(.18,y-.02,.085),fp(.08,y-.02,.085),LOOK.white);},
  '527.3':(b,fp,y)=>{Q(b,fp(-.28,y-.28,.075),fp(.28,y-.28,.075),fp(.28,y+.28,.075),fp(-.28,y+.28,.075),LOOK.blue);bar(b,fp,-.2,y+.1,.2,y+.1,.1,LOOK.white,.085);bar(b,fp,0,y+.1,0,y-.2,.1,'#c62330',.085);},
  '142':(b,fp,y)=>{T3(b,fp(-.5,y-.28,.075),fp(.5,y-.28,.075),fp(0,y+.58,.075),'#c62330');T3(b,fp(-.34,y-.2,.082),fp(.34,y-.2,.082),fp(0,y+.42,.082),LOOK.white);
   Q(b,fp(-.15,y-.14,.09),fp(-.04,y-.14,.09),fp(-.04,y+.17,.09),fp(-.15,y+.17,.09),'#111');Q(b,fp(.03,y-.14,.09),fp(.12,y-.14,.09),fp(.12,y+.02,.09),fp(.03,y+.02,.09),'#111');},
 };
 SIGN['362.30']=(b,fp,y)=>speed(b,fp,y,3,0);SIGN['362.40']=(b,fp,y)=>speed(b,fp,y,4,0);SIGN['362.50']=(b,fp,y)=>speed(b,fp,y,5,0);
  const HALF={'142':.43,'808.161':.21,'834':.12,'552':.28,'527.3':.28}; // half the height of each plate; discs .3
 part('signs',()=>{for(const s of Y.signs){let [x,z]=s.p;const [nx,nz]=s.n,r=nearestRoad(x,z,12);
  // beside the road: moved out to half the carriageway, the kerb band and a margin where NVDB's point lies closer
  if(r){const need=r.w/2+KERB_BAND+.4;if(r.d<need){const [ux,uz]=unit(x-r.x,z-r.z);x+=ux*(need-r.d);z+=uz*(need-r.d);}}
  const b=bucket(x,z),g=ground(x,z),R=.045,plates=s.pl.filter(p=>SIGN[p.t]||p.t==='808.161'),total=plates.reduce((t,p)=>t+2*(HALF[p.t]||.3)+.05,0),H=Math.max(2.3,total+1.5);
  const c=[[1,1],[-1,1],[-1,-1],[1,-1]];for(let i=0;i<4;i++){const [ax,az]=c[i],[bx,bz]=c[(i+1)%4];Q(b,[x+ax*R,g,z+az*R],[x+bx*R,g,z+bz*R],[x+bx*R*.9,g+H,z+bz*R*.9],[x+ax*R*.9,g+H,z+az*R*.9],LOOK.pole);}
  const fp=(sv,v,off)=>[x-nz*sv+nx*off,g+v,z+nx*sv+nz*off];
  let top=H+.05;
  for(const p of plates){const hh=HALF[p.t]||.3,y=top-hh-.0;top-=2*hh+.05;
   if(p.t==='808.161'){drawSign(T,scene,[['SKOLE','#111',.8],[p.x||'Dalgård skole','#111',.6]],[x+nx*.09,g+y,z+nz*.09],[nx,nz],.9,.42,'#111','#f4f2ea');nTri+=2;continue;}
   SIGN[p.t](b,fp,p.t==='142'?y-.15:y);count('sign');}
  count('pole');}});
 // ---- Tree keep-out: the sign poles and equipment are small; nothing else to register ----------------------------------------------------------------
 out.triangles=nTri;return out;
}
