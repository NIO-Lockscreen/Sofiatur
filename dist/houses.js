// Houses and other ordinary buildings (30 September 2026). Everything is generated from the OSM footprint, its tags, an optional
// photo-matched style record (building-details.js, junction-observations.js) and a random generator seeded by the OSM id, so
// a building looks the same on every run. All geometry goes into the shared vertex-coloured buckets (no meshes per house).
//
// Level of detail follows the drivable network, not the camera (the game is on rails): a wall that a road within ~26 m can
// see gets everything (siding, corner boards, window frames with mullions and sills, door with steps and canopy); up to ~52 m
// frames and glass; beyond that plain glass. Roofs always get eaves overhang; buildings near the road also get fascia and
// barge boards, ridge cap, seams or tile courses, roof lights and chimneys. Garden-side verandas and block balconies are
// procedural (seeded) unless the style record says otherwise.
import {addBuildingRoof} from './building-roofs.js';
import {seedOf,rng,pick,shade,mix,stripeTone,luminance,normHex,kindOf,lookFor,GARAGE_TYPES,DOORS} from './house-looks.js';

// Buildings that another module adds its own facade parts to (signs, stair towers, shop doors): no extra doors on these.
const LEAN=new Set(['1312240278','89233555','89233524','89233532','191198632']);
const GLASS_DAY=['#b8cdd3','#a9c0c8','#c7d4d6','#8fb0ba'];

export function createHouses({T,scene,data,height,bucket,tri,quad,box,groundPoly,junctionBuildings,buildingStyles,groundColour=null,onRoad=()=>false}){
 // ---- colour buffers: a triangle with a colour per corner (window glass fades from sky reflection to dark) ----
 const colours=new Map();const C=h=>{let c=colours.get(h);if(!c){c=new T.Color(h);colours.set(h,c);}return c;};
 function vtri(b,p,q,r,cp,cq,cr){let n=b.n;if(n+9>b.p.length){const a=new Float32Array(b.p.length*2),c=new Float32Array(b.p.length*2);a.set(b.p);c.set(b.c);b.p=a;b.c=c;}
  const P=b.p,K=b.c,x=C(cp),y=C(cq),z=C(cr);P[n]=p[0];P[n+1]=p[1];P[n+2]=p[2];P[n+3]=q[0];P[n+4]=q[1];P[n+5]=q[2];P[n+6]=r[0];P[n+7]=r[1];P[n+8]=r[2];
  K[n]=x.r;K[n+1]=x.g;K[n+2]=x.b;K[n+3]=y.r;K[n+4]=y.g;K[n+5]=y.b;K[n+6]=z.r;K[n+7]=z.g;K[n+8]=z.b;b.n=n+9;}
 function ftri(b,p,q,r,cp,cq,cr){let n=b.n;if(n+9>b.p.length){const a=new Float32Array(b.p.length*2),c=new Float32Array(b.p.length*2);a.set(b.p);c.set(b.c);b.p=a;b.c=c;}
  const P=b.p,K=b.c;P.set(p,n);P.set(q,n+3);P.set(r,n+6);K.set(cp,n);K.set(cq,n+3);K.set(cr,n+6);b.n=n+9;}
 const LAWN=new T.Color('#6f8e57'),lawn=[LAWN.r,LAWN.g,LAWN.b],soil=(x,z,dark=1)=>{const c=groundColour?groundColour(x,z,[0,0,0]):lawn.slice();return [c[0]*dark,c[1]*dark,c[2]*dark];};
 // a, c at the bottom, e, d at the top (same order as quad): bottom colour low, top colour high
 const gquad=(b,a,c,d,e,low,high)=>{vtri(b,a,c,d,low,low,high);vtri(b,a,d,e,low,high,high);};

 // ---- where the car can go: samples every 6 m along the drivable edges, for level of detail and for which wall faces a road ----
 const CELL=40,pathGrid=new Map(),cellKey=(i,j)=>(i+2048)*4096+(j+2048);
 {const seen=new Set();for(const e of data.edges){const pts=e.path.map(n=>data.nodes[n]);
   for(let i=1;i<pts.length;i++){const a=pts[i-1],c=pts[i],len=Math.hypot(c[0]-a[0],c[1]-a[1]),k=a[0]<c[0]||(a[0]===c[0]&&a[1]<c[1])?a[0]+','+a[1]+'|'+c[0]+','+c[1]:c[0]+','+c[1]+'|'+a[0]+','+a[1];
    if(seen.has(k))continue;seen.add(k);
    for(let d=0;d<=len;d+=6){const x=a[0]+(c[0]-a[0])*d/(len||1),z=a[1]+(c[1]-a[1])*d/(len||1),key=cellKey(Math.floor(x/CELL),Math.floor(z/CELL));let cell=pathGrid.get(key);if(!cell)pathGrid.set(key,cell=[]);cell.push(x,z);}}}}
 const paths={
  nearest(x,z,r){let best=Infinity;const i0=Math.floor((x-r)/CELL),i1=Math.floor((x+r)/CELL),j0=Math.floor((z-r)/CELL),j1=Math.floor((z+r)/CELL);
   for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const c=pathGrid.get(cellKey(i,j));if(c)for(let k=0;k<c.length;k+=2){const d=Math.hypot(c[k]-x,c[k+1]-z);if(d<best)best=d;}}return best;},
  // nearest sample in front of the wall (within about 75 degrees of its normal)
  front(x,z,nx,nz,r){let best=Infinity;const i0=Math.floor((x-r)/CELL),i1=Math.floor((x+r)/CELL),j0=Math.floor((z-r)/CELL),j1=Math.floor((z+r)/CELL);
   for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const c=pathGrid.get(cellKey(i,j));if(c)for(let k=0;k<c.length;k+=2){const dx=c[k]-x,dz=c[k+1]-z,d=Math.hypot(dx,dz);if(d<best&&d>.01&&dx*nx+dz*nz>d*.25)best=d;}}return best;}
 };

 // ---- other buildings: a garage takes the colours of the house beside it; verandas keep off neighbours ----
 let others=null;
 function neighbours(){
  if(others)return others;const grid=new Map(),list=[];
  for(const b of data.buildings){const p=b.p.slice(0,-1);if(p.length<3)continue;const cx=p.reduce((s,v)=>s+v[0],0)/p.length,cz=p.reduce((s,v)=>s+v[1],0)/p.length;let area=0;for(let i=0;i<p.length;i++)area+=p[i][0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*p[i][1];area=Math.abs(area/2);
   const kind=kindOf(b.t,area,['garage','garages','shed','carport'].includes(b.t.building)||area<35||!!(b.mk&&GARAGE_TYPES.includes(b.mk[0])),b.mk),garage=kind==='garage',o={b,p,cx,cz,area,garage,kind};list.push(o);const key=cellKey(Math.floor(cx/30),Math.floor(cz/30));if(!grid.has(key))grid.set(key,[]);grid.get(key).push(o);}
  const near=(x,z,r)=>{const out=[];for(let i=Math.floor((x-r)/30);i<=Math.floor((x+r)/30);i++)for(let j=Math.floor((z-r)/30);j<=Math.floor((z+r)/30);j++)for(const o of grid.get(cellKey(i,j))||[])out.push(o);return out;};
  return others={near};
 }
 const lookCache=new Map();
 const styleOf=building=>({...buildingStyles[building.id],...junctionBuildings.style(building)});
 function lookOfBuilding(o){let l=lookCache.get(o.b.id);if(!l){l=lookFor({id:o.b.id,t:o.b.t,style:styleOf(o.b),kind:o.kind,area:o.area});lookCache.set(o.b.id,l);}return l;}
 function ownerLook(building,cx,cz){
  let best=null,bd=16;for(const o of neighbours().near(cx,cz,16)){if(o.garage||o.b.id===building.id||o.kind==='public')continue;const d=Math.hypot(o.cx-cx,o.cz-cz);if(d<bd){bd=d;best=o;}}
  return best?lookOfBuilding(best):null;
 }
 const insidePoly=(poly,x,z)=>{let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [ax,az]=poly[j],[bx,bz]=poly[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)ins=!ins;}return ins;};
 const isConvex=poly=>{let s=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],c=poly[(i+2)%poly.length],z=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(z)<1e-6)continue;if(s&&Math.sign(z)!==s)return false;s=Math.sign(z);}return true;};

 const stats={buildings:0,lod:[0,0,0],doors:0,windows:0,chimneys:0,verandas:0,balconies:0,seams:0,tris:{}};

 function add({building,p,cx,cz,area,wallBase,houseBounds}){
  const id=String(building.id),t=building.t,style=styleOf(building);
  const kind=kindOf(t,area,['garage','garages','shed','carport'].includes(t.building)||area<35||!!(building.mk&&GARAGE_TYPES.includes(building.mk[0])),building.mk),garage=kind==='garage';
  // Storeys: style record, OSM tag, else a block's flats counted in Matrikkelen (about 62 m2 of flat per 0.78 of the floor plate) or the default.
  const units=building.mk?building.mk[1]:0;
  const unitLevels=(kind==='block'&&units>=3&&!t['building:levels'])?Math.max(2,Math.min(5,Math.round(units*62/(.78*area)))):0;
  const levels=style.levels||(parseFloat(t['building:levels'])||(unitLevels||((t.building==='apartments'||area>800)?3:garage?1:2)));
  const h=style.height||Math.min(26,parseFloat(t.height)||levels*2.65+(garage?.1:.5));
  const heights=p.map(v=>height(...v)).sort((a,b)=>a-b);
  const y=style.base==='low'?heights[Math.floor(heights.length*.25)]:Math.max(...heights),base=Math.min(...p.map(v=>height(...v)))-.4;
  // Sokkel (2 October 2026). The floor lies at the ground on the uphill side, so on a slope the wall below it showed as one tall grey
  // concrete face (median 1.6 m, a tenth over 4 m, up to 13 m: the terrain is exaggerated 1.45 times). As built on Byåsen's slopes: a
  // concrete plinth only PLINTH high along the ground, above it a basement storey (sokkeletasje) clad like the house or in rendered
  // concrete, with windows; at most one storey of it (two under a block), and below that the ground is filled up to a terrace round the
  // house: a flat shelf by the wall, then a grass bank down to the natural ground, or a retaining wall where a road is in the way.
  const SOKKEL=garage?1.25:kind==='block'?5.6:3,PLINTH=.45,SHELF=.7,BATTER=1.6,FILL_MAX=7,padY=y+.5-SOKKEL;
  const visGround=(x,z,o)=>Math.max(height(x,z),padY-Math.max(0,o-SHELF)/BATTER); // the ground as drawn, o metres out from a wall
  wallBase.set(id,{y,h});
  const b=bucket(cx,cz);
  houseBounds.push([Math.min(...p.map(v=>v[0]))-2,Math.min(...p.map(v=>v[1]))-2,Math.max(...p.map(v=>v[0]))+2,Math.max(...p.map(v=>v[1]))+2]);
  groundPoly(p,'#6f8e57',.105);

  stats.buildings++;
  const look=lookFor({id,t,style,kind,area,neighbour:garage?ownerLook(building,cx,cz):null});
  const r=rng(seedOf(id)^0x9e3779b9);
  const near=paths.nearest(cx,cz,100),bl=near<30?2:near<62?1:0;stats.lod[bl]++;
  const lean=LEAN.has(id);
  const wallCol=look.wall,trim=look.trim,frameCol=look.frame,plinthCol=look.plinth;
  // the basement storey: clad like the house on most timber houses, otherwise rendered concrete a little lighter than the plinth
  const rs=rng(seedOf(id)^0x51ed27),sokkelCol=(look.panel==='h'||look.panel==='v')&&rs()<.65?wallCol:mix(plinthCol,'#f2efe6',.3);
  const sgn=p.reduce((s,a,i)=>{const c=p[(i+1)%p.length];return s+a[0]*c[1]-c[0]*a[1];},0)>0?1:-1;
  const walls=[];
  for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<.3)continue;
   const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len,w={i,a,c,len,dx,dz,nx:sgn*dz,nz:-sgn*dx,mx:(a[0]+c[0])/2,mz:(a[1]+c[1])/2};
   w.sd=bl?paths.front(w.mx,w.mz,w.nx,w.nz,62):Infinity;w.lod=bl===0?0:w.sd<26?2:w.sd<52?1:0;walls.push(w);}
  const F=(w,u,yy,o=0)=>[w.a[0]+w.dx*u+w.nx*o,yy,w.a[1]+w.dz*u+w.nz*o];
  const panel=(w,u,y0,width,hh,col,o)=>quad(b,F(w,u-width/2,y0,o),F(w,u+width/2,y0,o),F(w,u+width/2,y0+hh,o),F(w,u-width/2,y0+hh,o),col);
  const gpanel=(w,u,y0,width,hh,low,high,o)=>gquad(b,F(w,u-width/2,y0,o),F(w,u+width/2,y0,o),F(w,u+width/2,y0+hh,o),F(w,u-width/2,y0+hh,o),low,high);
  const top0=y+h; // wall top
  let mark0=b.n;const mark=name=>{stats.tris[name]=(stats.tris[name]||0)+(b.n-mark0)/9;mark0=b.n;};

  // ---- the front wall: the long wall that faces the nearest road ----
  let front=null;
  for(const w of walls){if(w.len<(garage?3:4)||!isFinite(w.sd)||w.sd>58)continue;if(!front||w.sd-w.len*.15<front.sd-front.len*.15)front=w;}
  // terraces: a door for every flat (Matrikkelen counts them), otherwise one metre of wall per 5.8
  const unitCount=kind==='terrace'&&front?Math.max(2,Math.min(14,units>1?units:Math.round(front.len/5.8))):1;

  // ---- plinth and basement storey, then the terrace fill outside it ----
  // samples along the wall: its ends, split where the ground bends away from a straight line (by 12 cm, every 2 m at most)
  const at=(w,u)=>{const o=F(w,u,0,.3);return {P:F(w,u,0,0),g:Math.max(height(o[0],o[2]),padY),u};};
  function samples(w,A,C,depth){const M=at(w,(A.u+C.u)/2);if(depth>=3||C.u-A.u<2||Math.abs(M.g-(A.g+C.g)/2)<.12)return [A];return [...samples(w,A,M,depth+1),...samples(w,M,C,depth+1)];}
  function sokkel(w){
   const top=y+.5,end=at(w,w.len),pts=[...samples(w,at(w,0),end,bl===0?3:0),end],k=pts.length-1;
   w.sokkel=pts;w.exposed=Math.max(...pts.map(q=>top-q.g));
   if(w.exposed<PLINTH+.12){quad(b,[w.a[0],base,w.a[1]],[w.c[0],base,w.c[1]],[w.c[0],top,w.c[1]],[w.a[0],top,w.a[1]],plinthCol);return;}
   for(let j=0;j<k;j++){const A=pts[j],C=pts[j+1],ca=Math.min(top,A.g+PLINTH),cc=Math.min(top,C.g+PLINTH);
    quad(b,[A.P[0],base,A.P[2]],[C.P[0],base,C.P[2]],[C.P[0],cc,C.P[2]],[A.P[0],ca,A.P[2]],plinthCol);
    if(ca<top-.02||cc<top-.02)quad(b,[A.P[0],ca,A.P[2]],[C.P[0],cc,C.P[2]],[C.P[0],top,C.P[2]],[A.P[0],top,A.P[2]],sokkelCol);}
   // a trim board between the basement storey and the floor above, where the basement is clad like the house
   if(sokkelCol===wallCol&&w.exposed>PLINTH+.8&&w.lod>=1)panel(w,w.len/2,top-.08,w.len,.16,trim,.03);
  }
  const fills=[]; // per wall: the outer edge of the fill at each sample (or null where the ground needs none)
  function fill(w){
   const pts=w.sokkel;if(!pts||!pts.some(q=>height(q.P[0],q.P[2])<padY-.05)){fills.push(null);return;}
   const out=pts.map(q=>{const g0=height(q.P[0],q.P[2]);if(g0>=padY-.05)return null;
    let o=SHELF,top=padY,ground=g0,wall=false;
    for(;o<=FILL_MAX;o+=.5){const X=F(w,q.u,0,o),gn=height(X[0],X[2]),sY=padY-(o-SHELF)/BATTER;top=sY;ground=gn;
     if(sY<=gn+.02){top=gn;break;}
     const Y=F(w,q.u,0,o+1.2);if(onRoad(Y[0],Y[2])){wall=true;break;}}
    if(o>FILL_MAX){o=FILL_MAX;wall=true;}
    const X=F(w,q.u,0,o);return {inner:F(w,q.u,padY,.02),shelf:F(w,q.u,padY,SHELF),outer:[X[0],top,X[2]],foot:[X[0],ground-.05,X[2]],wall:wall&&top-ground>.1};});
   fills.push(out);
   for(let j=0;j<out.length-1;j++){const A=out[j],C=out[j+1];if(!A&&!C)continue;
    const a=A||{inner:F(w,pts[j].u,padY,.02),shelf:F(w,pts[j].u,padY,SHELF),outer:F(w,pts[j].u,padY,SHELF),foot:null,wall:false},
     c=C||{inner:F(w,pts[j+1].u,padY,.02),shelf:F(w,pts[j+1].u,padY,SHELF),outer:F(w,pts[j+1].u,padY,SHELF),foot:null,wall:false};
    const col=v=>soil(v[0],v[2]),dim=v=>soil(v[0],v[2],.9);
    ftri(b,a.inner,c.inner,c.shelf,col(a.inner),col(c.inner),col(c.shelf));ftri(b,a.inner,c.shelf,a.shelf,col(a.inner),col(c.shelf),col(a.shelf));
    ftri(b,a.shelf,c.shelf,c.outer,col(a.shelf),col(c.shelf),dim(c.outer));ftri(b,a.shelf,c.outer,a.outer,col(a.shelf),dim(c.outer),dim(a.outer));
    if(a.wall&&c.wall)quad(b,a.foot,c.foot,c.outer,a.outer,'#a8a79f');}
   stats.fills=(stats.fills||0)+1;
  }

  // ---- walls, plinth, cladding ----
  const horizontal=look.panel==='h',vertical=look.panel==='v',brick=look.panel==='brick',boards=horizontal||vertical;
  const tone=boards||brick?stripeTone(wallCol,style.siding||style.horizontalSiding?1:.8):wallCol;
  for(const w of walls){
   const {a,c}=w;
   sokkel(w);
   quad(b,[a[0],y+.5,a[1]],[c[0],y+.5,c[1]],[c[0],top0,c[1]],[a[0],top0,a[1]],wallCol);
   if(style.sections&&w.len>25){for(let j=0;j<4;j++)panel(w,w.len*(j+.5)/4,y+.5,w.len/4,h-.5,style.sections[j],.04);}
   if(style.upperWall)panel(w,w.len/2,y+h*.65,w.len,h*.35,style.upperWall,.08);
   if(style.lowerWall)panel(w,w.len/2,y+.5,w.len,Math.min(2.25,h-.5),style.lowerWall,.08);
   if(style.floorBands)for(let f=1;f<levels;f++)panel(w,w.len/2,y+.35+f*2.65,w.len,.42,style.floorBands,.18);
   if(style.flat&&style.parapet)panel(w,w.len/2,top0-.65,w.len,.65,style.parapet,.19);
   mark('walls');
   // Cladding: alternating tone stripes, outward side only. Vertical boards every .8 m, horizontal every .58 m (1.1 m further away).
   if(w.lod>=1&&w.len>1&&top0-y-.6>1){
    if(vertical&&w.lod===2){for(let u=.3;u<w.len-.3;u+=.8)panel(w,u+.15,y+.6,.34,top0-y-.6,tone,.02);}
    else if(horizontal){const step=w.lod===2?.58:1.1;for(let yy=y+.62;yy<top0-.2;yy+=step)panel(w,w.len/2,yy,w.len-.1,step*.46,tone,.02);}
    else if(brick&&w.lod===2){for(let yy=y+.7;yy<top0-.1;yy+=.34)panel(w,w.len/2,yy,w.len-.1,.05,tone,.02);}
   }
   mark('stripes');
   // terraces: a vertical joint and a slightly different tone for every other dwelling
   if(kind==='terrace'&&w.len>9&&w.lod>=1){const n=w===front?unitCount:Math.max(2,Math.round(w.len/5.8));
    for(let k=1;k<n;k++)panel(w,w.len*k/n,y+.5,.12,h-.5,shade(trim,.92),.05);
    if(w.lod===2)for(let k=1;k<n;k+=2)panel(w,w.len*(k+.5)/n,y+.5,w.len/n-.14,h-.5,luminance(wallCol)>.42?shade(wallCol,.94):mix(wallCol,'#ffffff',.07),.03);}
   // white corner boards on timber houses
   if(w.lod===2&&boards&&w.len>2)panel(w,w.len-.07,y+.5,.14,h-.5,trim,.04);
   mark('corners');
  }
  for(const w of walls)fill(w);
  for(let i=0;i<walls.length;i++){const A=fills[i],C=fills[(i+1)%walls.length];if(!A||!C)continue;const a=A.at(-1),c=C[0];if(!a||!c)continue;
   const P=walls[i].sokkel.at(-1).P,corner=[P[0],padY,P[2]],col=v=>soil(v[0],v[2]);ftri(b,corner,a.outer,c.outer,col(corner),col(a.outer),col(c.outer));}
  mark('sokkel fill');

  // ---- windows ----
  const big=kind==='public';
  const slotsOf=w=>{
   const len=w.len;
   if(kind==='terrace'&&front&&len>9){const n=w===front?unitCount:Math.max(2,Math.round(len/5.8)),uw=len/n,out=[];for(let k=0;k<n;k++)out.push(uw*k+uw*.3,uw*k+uw*.72);return out;}
   const spacing=kind==='block'?3.3:kind==='public'?3.1:3.7,n=Math.floor(len/spacing),out=[];for(let j=1;j<=n;j++)out.push(len*j/(n+1));return out;
  };
  // which ground-floor slots hold a door
  const doorSlots=new Set();let doorU=null;
  if(front&&!garage&&!lean){
   const slots=slotsOf(front);
   if(kind==='terrace'&&front.len>9){for(let k=0;k<unitCount;k++)doorSlots.add(2*k);}
   else if(kind==='block'&&front.len>12){const M=Math.max(1,Math.round(front.len/15));for(let m=0;m<M;m++){const target=front.len*(m+.5)/M;let bi=-1,bd=1e9;slots.forEach((u,k)=>{const d=Math.abs(u-target);if(d<bd){bd=d;bi=k;}});if(bi>=0)doorSlots.add(bi);}}
   else if(slots.length)doorSlots.add(slots.length===1?0:(r()<.5?Math.floor((slots.length-1)/2):r()<.5?0:slots.length-1));
   else if(front.len>=2.4)doorU=front.len/2;
  }
  const glassBot=look.glass||'#5a7680',glassTone=look.glass?mix(look.glass,'#ffffff',.3):null;
  function window(w,u,f,lod){
   const ww=big?1.5:1.05,wh=1.25,y0=y+1.35+f*2.65;if(y0+wh>top0-.2)return;
   stats.windows++;
   if(lod===0){panel(w,u,y0,ww,wh,glassBot==='#5a7680'?'#6f8c96':glassBot,.06);return;}
   panel(w,u,y0-.1,ww+.2,wh+.2,frameCol,.05);
   const roll=r(),low=roll<.12?'#2f4148':roll<.3?'#cfc6ae':glassBot,high=glassTone||(roll<.12?'#3f535a':roll<.3?'#e3dcc8':GLASS_DAY[Math.floor(r()*GLASS_DAY.length)]);
   gpanel(w,u,y0,ww,wh,low,high,.07);
   if(lod===2){panel(w,u,y0,.05,wh,frameCol,.09);if(r()<.25)panel(w,u,y0+wh*.52,ww,.045,frameCol,.095);panel(w,u,y0-.17,ww+.32,.07,shade(trim,.94),.12);}
  }
  for(const w of walls){
   if(garage)continue;
   if(style.windowBand&&w.len>8){for(let f=0;f<levels;f++){const hy=y+.9+f*2.65;if(hy+1.8>top0-.5)continue;panel(w,w.len/2,hy,w.len-1.1,1.8,style.glass||'#52676d',.22);for(let d=.55;d<w.len-.5;d+=2.1)panel(w,d,hy,.1,1.8,trim,.25);}continue;}
   const slots=slotsOf(w);
   slots.forEach((u,k)=>{for(let f=0;f<levels;f++){if(f===0&&w===front&&doorSlots.has(k))continue;window(w,u,f,w.lod);}});
  }
  // a small window or two on some garages (not on the door wall)
  if(garage&&area>=35&&r()<.3){const w=walls.filter(q=>q!==front&&q.len>3).sort((x,z)=>z.len-x.len)[0];if(w)window(w,w.len/2,0,Math.min(1,w.lod));}

  mark('windows');
  // ---- door, steps, canopy; garage door ----
  const doorDrop=(w,u)=>{const o=F(w,u,0,.9),g=visGround(o[0],o[2],.9);return Math.max(base+.25,Math.min(y+.5,g+.14));};
  function addStep(w,u,y0,wide){
   const o=F(w,u,0,1),g=visGround(o[0],o[2],1),drop=y0-g;if(drop<.12)return;
   const hw=wide/2,dep=.85;
   const n=drop>.35?Math.min(4,Math.ceil(drop/.19)):1,tread=.32;
   // landing at door level, then steps down to the ground
   const conc='#b5b7b2',dark='#9b9d98';
   const landing=[F(w,u-hw,y0-.02,0),F(w,u+hw,y0-.02,0),F(w,u+hw,y0-.02,dep),F(w,u-hw,y0-.02,dep)];
   quad(b,...landing,conc);
   let off=dep,top=y0-.02;const stepH=(y0-.02-g)/n;
   for(let k=0;k<n;k++){const next=top-stepH;
    quad(b,F(w,u-hw,top,off),F(w,u+hw,top,off),F(w,u+hw,next,off),F(w,u-hw,next,off),dark);
    if(k<n-1){quad(b,F(w,u-hw,next,off),F(w,u+hw,next,off),F(w,u+hw,next,off+tread),F(w,u-hw,next,off+tread),conc);off+=tread;}
    top=next;}
  }
  function canopy(w,u,y0){
   const cw=2.1,dep=1.15;
   quad(b,F(w,u-cw/2,y0+2.62,.04),F(w,u+cw/2,y0+2.62,.04),F(w,u+cw/2,y0+2.38,dep),F(w,u-cw/2,y0+2.38,dep),style.roof&&style.canopy?style.roof:look.roof);
   panel(w,u-cw/2+.06,y0,.07,2.4,trim,dep-.08);panel(w,u+cw/2-.06,y0,.07,2.4,trim,dep-.08);
   quad(b,F(w,u-cw/2,y0+2.36,dep),F(w,u+cw/2,y0+2.36,dep),F(w,u+cw/2,y0+2.46,dep),F(w,u-cw/2,y0+2.46,dep),trim);
  }
  function door(w,u,lod,colour=look.door){
   const y0=doorDrop(w,u),dw=1.0,dh=2.1;stats.doors++;
   panel(w,u,y0,dw+.24,dh+.14,trim,.06);panel(w,u,y0,dw,dh,colour,.08);
   if(lod>=1&&r()<.55)panel(w,u+(r()<.5?-.3:.3),y0+.95,.28,.95,'#9db4bb',.09);
   if(lod===2){addStep(w,u,y0,dw+.6);if(style.canopy||r()<.35)canopy(w,u,y0);panel(w,u+.36,y0+1.0,.05,.14,'#c9ccc8',.1);}
  }
  function garageDoor(w,u,wide,lod){
   const y0=doorDrop(w,u),dw=wide?4.6:2.5,dh=2.1;stats.doors++;
   panel(w,u,y0,dw+.3,dh+.2,trim,.06);const leaf=luminance(look.door)>.8?'#d9d6cc':look.door;panel(w,u,y0,dw,dh,leaf,.08);
   if(lod>=1)for(let k=1;k<=3;k++)panel(w,u,y0+k*.5,dw,.03,shade(leaf,.78),.09);
   if(wide&&lod>=1)panel(w,u,y0,.05,dh,trim,.09);
  }
  if(front&&!lean){
   if(garage){const wide=front.len>=6.6;garageDoor(front,front.len/2,wide,front.lod);}
   else{
    if(doorU!==null)door(front,doorU,front.lod);
    const slots=slotsOf(front);for(const k of doorSlots)if(slots[k]!==undefined)door(front,slots[k],front.lod,kind==='terrace'?pick(r,DOORS):look.door);
   }
  }

  mark('doors');
  // ---- roof ----
  const pitched=!look.flat,overhang=pitched?(garage?.3:kind==='block'?.45:.5):(garage?.25:.4);
  const fascia=bl>=1?(pitched?trim:mix(trim,look.roof,.4)):null;
  const tile=pitched&&!look.metal;
  const toneRoof=stripeTone(look.roof,1.25);
  let lights=pitched&&bl===2&&area>=60&&r()<.3?1:0;
  const onPlane=(bl===2&&pitched&&area>=40)?(polygon,index,topFn,fr)=>{
   const {nx,nz,cx:ox,cz:oz}=fr,ax=nz,az=-nx,f=v=>(v[0]-ox)*nx+(v[1]-oz)*nz,g=v=>(v[0]-ox)*ax+(v[1]-oz)*az;
   if(polygon.length<3||!isConvex(polygon))return;
   const fs=polygon.map(f),gs=polygon.map(g),fmin=Math.min(...fs),fmax=Math.max(...fs),gmin=Math.min(...gs),gmax=Math.max(...gs);
   const chord=(axis,val)=>{const pts=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],c=polygon[(i+1)%polygon.length],va=axis(a)-val,vc=axis(c)-val;if((va<0)!==(vc<0)||va===0){const tt=va/(va-vc||1);pts.push([a[0]+(c[0]-a[0])*tt,a[1]+(c[1]-a[1])*tt]);}}
    if(pts.length<2)return null;return [pts[0],pts[pts.length-1]];};
   const lift=(v)=>[v[0],topFn(v)+.03,v[1]];
   // tile courses run along the eaves, sheet-metal seams run down the slope
   if(tile){for(let c0=fmin+.5;c0+.3<fmax-.1;c0+=1.1){const A=chord(f,c0),B=chord(f,c0+.3);if(A&&B){quad(b,lift(A[0]),lift(A[1]),lift(B[1]),lift(B[0]),toneRoof);stats.seams++;}}}
   else{for(let s0=gmin+.6;s0+.08<gmax-.2;s0+=1.2){const A=chord(g,s0),B=chord(g,s0+.08);if(A&&B){quad(b,lift(A[0]),lift(A[1]),lift(B[1]),lift(B[0]),toneRoof);stats.seams++;}}}
   if(lights&&index===0&&polygon.length>=3){const pc=polygon.reduce((s,v)=>[s[0]+v[0]/polygon.length,s[1]+v[1]/polygon.length],[0,0]);
    if(Math.abs(fmax-fmin)>2.2&&Math.abs(gmax-gmin)>3){lights=0;const shift=(fmax-fmin)*.12*(r()<.5?1:-1),cc=[pc[0]+nx*shift,pc[1]+nz*shift];const pt=(du,dv,o)=>{const v=[cc[0]+ax*du+nx*dv,cc[1]+az*du+nz*dv];return [v[0],topFn(v)+o,v[1]];};
     quad(b,pt(-.5,-.65,.035),pt(.5,-.65,.035),pt(.5,.65,.035),pt(-.5,.65,.035),trim);quad(b,pt(-.4,-.55,.05),pt(.4,-.55,.05),pt(.4,.55,.05),pt(-.4,.55,.05),'#6d8a99');}}
  }:null;
  const roofTop=addBuildingRoof({T,p,cx,cz,y,h,style,t,area,b,tri,quad,colour:wallCol,roofcolour:look.roof,overhang,fascia,onPlane});

  mark('roof');
  // ---- a window in every gable end near the road, and small windows in a tall plinth on a slope ----
  if(roofTop.shape==='gabled'&&!garage&&bl>=1){
   for(const w of walls){if(w.lod<1||w.len<3.2)continue;const gh=roofTop([w.mx,w.mz])-top0,wh=Math.min(.9,gh-.75);if(gh<1.6||wh<.45)continue;
    const y0=top0+.3;panel(w,w.len/2,y0-.08,.92,wh+.16,frameCol,.05);gpanel(w,w.len/2,y0,.76,wh,glassBot,GLASS_DAY[0],.07);stats.windows++;}
  }
  if(bl>=1&&!garage){
   for(const w of walls){if(w.lod<1||w.len<4||!(w.exposed>1.7))continue;
    slotsOf(w).forEach((u,k)=>{if(w===front&&doorSlots.has(k))return;const o=F(w,u,0,.4),g=visGround(o[0],o[2],.4),drop=y+.5-g;if(drop<1.7)return;
     if(drop<2.4){const y0=g+.7,wh=Math.min(.7,drop-.7-.25);if(wh<.4)return;panel(w,u,y0-.07,.98,wh+.14,frameCol,.05);panel(w,u,y0,.84,wh,'#4a5f66',.07);stats.windows++;return;}
     // a full basement storey (two under a block on a steep slope): windows like the floor above, sill 0.9 m over the floor
     for(let f=0;f<2;f++){const y0=g+.9+f*2.8,wh=Math.min(1.25,y+.5-.35-y0);if(wh<.6)break;
      panel(w,u,y0-.08,1.06,wh+.16,frameCol,.05);gpanel(w,u,y0,.9,wh,glassBot,GLASS_DAY[0],.07);stats.windows++;}});}
  }
  mark('gable+plinth windows');
  // ---- ridge cap and chimneys ----
  const ridge=roofTop.ridge;
  if(ridge&&bl>=1&&area>=40){
   const dx=ridge.b[0]-ridge.a[0],dz=ridge.b[1]-ridge.a[1],len=Math.hypot(dx,dz),sx=-dz/len*.13,sz=dx/len*.13,capTone=stripeTone(look.roof,1.6);
   for(const s of [-1,1])quad(b,[ridge.a[0]+sx*s,ridge.y-.05,ridge.a[1]+sz*s],[ridge.b[0]+sx*s,ridge.y-.05,ridge.b[1]+sz*s],[ridge.b[0],ridge.y+.09,ridge.b[1]],[ridge.a[0],ridge.y+.09,ridge.a[1]],capTone);
  }
  if(ridge&&!garage&&area>55&&(style.chimney||(bl>=1&&r()<(kind==='house'?.55:kind==='semi'?.45:kind==='terrace'?.35:0)))){
   const dx=ridge.b[0]-ridge.a[0],dz=ridge.b[1]-ridge.a[1],len=Math.hypot(dx,dz),angle=Math.atan2(-dz,dx);
   const count=len>15?2:1,material=r(),col=material<.3?'#9b5a45':material<.55?'#e3e0d6':material<.8?'#a6a8a4':'#3b3e40';
   for(let k=0;k<count;k++){const f=count===1?.28+r()*.44:(k?.72:.26)+(r()-.5)*.1,x=ridge.a[0]+dx*f,z=ridge.a[1]+dz*f,wx=.6,wz=r()<.3?.9:.6,yb=ridge.y-.8,yt=ridge.y+.95;
    box(b,x,(yb+yt)/2,z,wx,yt-yb,wz,col,angle);box(b,x,yt+.06,z,wx+.14,.12,wz+.14,shade(col,.8),angle);stats.chimneys++;}
  }

  mark('ridge+chimney');
  // ---- penthouse (style) ----
  if(style.penthouse){
   const glass=style.glass||'#52676d',pp=p.map(v=>[cx+(v[0]-cx)*.69,cz+(v[1]-cz)*.69]),bottom=y+h+.1,topP=bottom+2.6;
   for(let i=0;i<pp.length;i++){const a=pp[i],c=pp[(i+1)%pp.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<.1)continue;const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;
    quad(b,[a[0],bottom,a[1]],[c[0],bottom,c[1]],[c[0],topP,c[1]],[a[0],topP,a[1]],style.penthouse);
    const nx=sgn*dz,nz=-sgn*dx,at=(d,yy,o=.03)=>[a[0]+dx*d+nx*o,yy,a[1]+dz*d+nz*o];
    if(len>3)quad(b,at(.5,bottom+.25),at(len-.5,bottom+.25),at(len-.5,topP-.3),at(.5,topP-.3),glass);
    for(let d=.5;d<len;d+=2.5)quad(b,at(d,bottom+.2,.06),at(d+.075,bottom+.2,.06),at(d+.075,topP-.15,.06),at(d,topP-.15,.06),'#414947');
    const u=p[i],v=p[(i+1)%p.length];quad(b,[u[0],bottom,u[1]],[v[0],bottom,v[1]],[v[0],bottom+.85,v[1]],[u[0],bottom+.85,u[1]],'#a7baba');}
   for(const f of T.ShapeUtils.triangulateShape(pp.map(v=>new T.Vector2(...v)),[]))tri(b,...f.map(i=>[pp[i][0],topP+.08,pp[i][1]]),style.roof||'#3b4040');
  }
  // ---- school entrance lettering (style) ----
  if(style.schoolEntrance)for(const w of walls){if(Math.abs(w.a[0]-556.06)<.1&&Math.abs(w.c[0]-566.4)<.1){
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=180;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,180);ctx.fillStyle='#283333';ctx.font='bold 104px Arial';ctx.textBaseline='middle';ctx.fillText('UGLA SKOLE',190,95);ctx.fillStyle='#e9ebe5';ctx.beginPath();ctx.arc(95,88,65,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#354440';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(95,45);ctx.lineTo(95,88);ctx.lineTo(124,102);ctx.stroke();
   const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(7.4,1.0),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));sign.position.set(...F(w,w.len*.6,top0-.45,.28));sign.rotation.y=Math.atan2(w.nx,w.nz);sign.name='Ugla school entrance clock and lettering';scene.add(sign);}}

  mark('penthouse+sign');
  // ---- balconies on blocks, verandas on houses ----
  const balconyRoll=r(),verandaRoll=r();
  const balconyWalls=[];
  if(style.balconies){for(const w of walls)if(w.len>12&&(style.balconies==='south'?w.nz>.65:w.nx<-.65))balconyWalls.push(w);}
  else if(style.balconies!==false&&kind==='block'&&levels>=3&&balconyRoll<.6&&bl>=1){const cand=walls.filter(w=>w!==front&&w.len>12).sort((x,z)=>z.len-x.len)[0];if(cand)balconyWalls.push(cand);}
  for(const w of balconyWalls){
   const spacing=style.balconies&&style.balconies!==true?7:6;
   for(let f=1;f<levels;f++){const yy=y+.5+f*2.65-.08;
    for(let u=2.4;u<w.len-2.4;u+=spacing){const bw=2.6,dep=1.45,rail=mix(trim,'#b9bec0',.45);stats.balconies++;
     quad(b,F(w,u-bw/2,yy,0),F(w,u+bw/2,yy,0),F(w,u+bw/2,yy,dep),F(w,u-bw/2,yy,dep),shade(wallCol,.92));
     quad(b,F(w,u-bw/2,yy-.17,dep),F(w,u+bw/2,yy-.17,dep),F(w,u+bw/2,yy,dep),F(w,u-bw/2,yy,dep),shade(wallCol,.85));
     quad(b,F(w,u-bw/2,yy,dep),F(w,u+bw/2,yy,dep),F(w,u+bw/2,yy+.95,dep),F(w,u-bw/2,yy+.95,dep),rail);
     for(const s of [-1,1])quad(b,F(w,u+s*bw/2,yy,0),F(w,u+s*bw/2,yy,dep),F(w,u+s*bw/2,yy+.95,dep),F(w,u+s*bw/2,yy+.95,0),rail);
    }}
  }
  if((kind==='house'||kind==='semi')&&!garage&&bl===2&&style.veranda!==false&&(style.veranda||verandaRoll<.3)&&!lean){
   // Prefer the wall furthest from the road (the garden side); keep the deck clear of neighbours and of the road.
   const cand=walls.filter(w=>w!==front&&w.len>=6).sort((x,z)=>(z.sd===Infinity?200:z.sd)-(x.sd===Infinity?200:x.sd))[0];
   if(cand){const w=cand,dw=Math.min(w.len-1.4,3.4+r()*1.6),dd=2.3,u0=(w.len-dw)/2,yD=y+.62;
    const centre=F(w,u0+dw/2,0,dd/2+.3),tip=F(w,u0+dw/2,0,dd+.6);
    const clear=!neighbours().near(centre[0],centre[2],10).some(o=>o.b.id!==building.id&&(insidePoly(o.p,centre[0],centre[2])||insidePoly(o.p,tip[0],tip[2])||insidePoly(o.p,F(w,u0,0,dd)[0],F(w,u0,0,dd)[2])||insidePoly(o.p,F(w,u0+dw,0,dd)[0],F(w,u0+dw,0,dd)[2])))&&paths.nearest(tip[0],tip[2],30)>4.5;
    const gA=F(w,u0,0,dd),gB=F(w,u0+dw,0,dd),drop=yD-Math.min(height(gA[0],gA[2]),height(gB[0],gB[2]));
    if(clear&&drop<3.2){
     stats.verandas++;const deck=r()<.5?'#a88c66':'#8a6a4c',rail=r()<.5?trim:mix(wallCol,'#ffffff',.25),hr=.95;
     quad(b,F(w,u0,yD,0),F(w,u0+dw,yD,0),F(w,u0+dw,yD,dd),F(w,u0,yD,dd),deck);
     quad(b,F(w,u0,yD-.22,dd),F(w,u0+dw,yD-.22,dd),F(w,u0+dw,yD,dd),F(w,u0,yD,dd),shade(deck,.8));
     for(const s of [0,1])quad(b,F(w,u0+s*dw,yD-.22,0),F(w,u0+s*dw,yD-.22,dd),F(w,u0+s*dw,yD,dd),F(w,u0+s*dw,yD,0),shade(deck,.7));
     // solid board railing on the two sides and the front, with an opening at the steps on the front corner
     quad(b,F(w,u0,yD,dd),F(w,u0+dw*.72,yD,dd),F(w,u0+dw*.72,yD+hr,dd),F(w,u0,yD+hr,dd),rail);
     for(const s of [0,1])quad(b,F(w,u0+s*dw,yD,0),F(w,u0+s*dw,yD,dd),F(w,u0+s*dw,yD+hr,dd),F(w,u0+s*dw,yD+hr,0),rail);
     for(const s of [0,.72,1]){const q=F(w,u0+s*dw,0,dd);box(b,q[0],(yD-drop-.1+yD+hr)/2,q[2],.13,drop+.1+hr,.13,trim);}
    }}
  }
 mark('balcony+veranda');
 }
 return {add,stats,paths};
}
