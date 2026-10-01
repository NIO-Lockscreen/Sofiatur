import {KERB_BAND} from './street-details.js';
// Trees and shrubs (30 September 2026). Five low-poly species, drawn as instanced meshes (one per species and 160 m chunk, so the world's
// distance and shadow culling treat them like its other chunks): s spruce, p pine, b birch, r rowan (and other small garden trees),
// l large broadleaf (lime, maple, ash, oak), and x shrubs. Where they stand comes from data.roadside (docs/roadside.md):
//   - the trees OSM and NVDB know (species, height), kept off the carriageway with a crown that fits between the road and the trunk,
//   - forest: AR5 cells (coniferous, deciduous, mixed) plus OSM wood polygons, dense where the road or a house is near and thin far off,
//   - shrubs in OSM scrub and NVDB shrub fields,
//   - garden trees round the houses, a few per plot, never on a road, path, driveway, pitch or another building.
// Nothing random depends on the order in which things are placed: every choice is a hash of the position, so adding an object somewhere
// does not reshuffle the trees elsewhere.
export const SPECIES={s:{name:'gran',h:14},p:{name:'furu',h:12},b:{name:'bjørk',h:11},r:{name:'rogn',h:6.5},l:{name:'lind/lønn',h:11},x:{name:'busk',h:2}};
const hash=(x,z,k=0)=>{let h=Math.imul((x*8.3|0)+k*374761393,668265263)^Math.imul((z*8.3|0)+k*2246822519,374761393);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};

// ---- Models: unit height, flat shaded with vertex colours ---------------------------------------------------------------------------
export function createTreeGeometries(T){
 const make=fn=>{const p=[],c=[],col=new T.Color();
  const v=(x,y,z,hex)=>{col.set(hex);p.push(x,y,z);c.push(col.r,col.g,col.b);};
  fn({tri:(a,b,d,ca,cb=ca,cd=ca)=>{v(...a,ca);v(...b,cb);v(...d,cd);}});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.computeVertexNormals();g.computeBoundingSphere();return g;};
 // A cone (or cylinder, r1 > 0) of `sides` faces from y0 up by h.
 const ring=(cx,y,cz,r,sides,rot)=>Array.from({length:sides},(_,i)=>{const a=rot+i/sides*Math.PI*2;return [cx+Math.cos(a)*r,y,cz+Math.sin(a)*r];});
 const cone=(m,cx,y0,cz,r0,r1,h,sides,rot,c0,c1)=>{const a=ring(cx,y0,cz,r0,sides,rot),b=ring(cx,y0+h,cz,r1,sides,rot);
  for(let i=0;i<sides;i++){const j=(i+1)%sides;if(r1<=0)m.tri(a[i],a[j],[cx,y0+h,cz],c0,c0,c1);else{m.tri(a[i],a[j],b[j],c0,c0,c1);m.tri(a[i],b[j],b[i],c0,c1,c1);}}};
 // A lens: a ring of `sides` points with a point above and below (a rounded crown in 12 triangles).
 const lens=(m,cx,cy,cz,r,h,sides,rot,cLow,cMid,cTop)=>{const a=ring(cx,cy,cz,r,sides,rot);
  for(let i=0;i<sides;i++){const j=(i+1)%sides;m.tri(a[j],a[i],[cx,cy-h*.42,cz],cMid,cMid,cLow);m.tri(a[i],a[j],[cx,cy+h*.58,cz],cMid,cMid,cTop);}};
 const ico0=new T.IcosahedronGeometry(1,0),ico=(ico0.index?ico0.toNonIndexed():ico0).attributes.position;
 const blob=(m,cx,cy,cz,rx,ry,rz,cLow,cTop)=>{for(let i=0;i<ico.count;i+=3){const P=[0,1,2].map(k=>[cx+ico.getX(i+k)*rx,cy+ico.getY(i+k)*ry,cz+ico.getZ(i+k)*rz]);
  const cs=P.map(q=>{const t=Math.max(0,Math.min(1,(q[1]-(cy-ry))/(2*ry)));return t<.5?cLow:cTop;});m.tri(P[0],P[1],P[2],cs[0],cs[1],cs[2]);}};
 const trunk=(m,x,z,y0,h,r0,r1,sides,c)=>cone(m,x,y0,z,r0,r1,h,sides,.4,c,c);
 return {
  // Spruce: three tiers of six-sided cones, darker below, on a thin trunk (24 triangles)
  s:make(m=>{trunk(m,0,0,0,.2,.026,.02,3,'#5a4330');
   [[.07,.42,.25],[.32,.4,.19],[.57,.42,.125]].forEach(([y0,h,r],i)=>cone(m,0,y0,0,r,0,h,6,i*.7,['#4a8058','#4f875e','#558d64'][i],['#62a070','#68a676','#6eac7c'][i]));}),
  // Pine: a reddish trunk and two flat, broad crowns, one above the other (48 triangles)
  p:make(m=>{trunk(m,0,0,0,.62,.034,.02,4,'#8b6a4b');
   blob(m,0,.78,0,.29,.13,.29,'#4f7d5c','#6b9c74');blob(m,.16,.58,.05,.17,.09,.17,'#4f7d5c','#689a71');}),
  // Birch: a white trunk and two tall pale crowns (32 triangles)
  b:make(m=>{trunk(m,0,0,0,.62,.026,.012,4,'#e4e1d5');
   lens(m,0,.68,0,.17,.38,6,.2,'#86b257','#97c062','#a8ce70');lens(m,.08,.9,.03,.12,.26,6,.7,'#8cb85c','#9fc568','#b0d277');}),
  // Rowan: a short trunk, a round crown and a side lobe (38 triangles)
  r:make(m=>{trunk(m,0,0,0,.42,.034,.024,3,'#6d5b49');blob(m,0,.66,0,.3,.26,.3,'#72a24d','#89ba5c');lens(m,.14,.5,.06,.16,.2,6,.3,'#6d9d4a','#7fb055','#91c063');}),
  // Large broadleaf: a thicker trunk and a broad crown with a lobe (40 triangles)
  l:make(m=>{trunk(m,0,0,0,.44,.05,.034,4,'#62503f');blob(m,0,.7,0,.37,.3,.37,'#5a9050','#6fa85f');lens(m,.23,.56,.05,.2,.26,6,.5,'#548b4b','#66995b','#78ac6b');}),
  // Shrub: a rounded lump on the ground (12 triangles)
  x:make(m=>{lens(m,0,.3,0,.5,.62,6,.2,'#4f8541','#5e9a4c','#70ad5a');})};
}

// ---- Placing them --------------------------------------------------------------------------------------------------------------------
const POOL={1:[['s',.78],['p',.07],['b',.15]],2:[['b',.55],['r',.2],['l',.15],['s',.1]],3:[['s',.45],['b',.33],['p',.04],['r',.1],['l',.08]],4:[['x',1]]}; // AR5 classes: 1 barskog, 2 lauvskog, 3 blandingsskog, 4 scrub
const GARDEN=[['b',.3],['r',.25],['l',.2],['s',.2],['p',.05]];
const VERGE=[['b',.35],['s',.3],['r',.2],['l',.1],['p',.05]];
const pick=(pool,u)=>{let a=0;for(const [k,w] of pool){a+=w;if(u<a)return k;}return pool[pool.length-1][0];};
const CROWN={s:.25,p:.23,b:.2,r:.3,l:.43,x:.5}; // widest crown radius as a fraction of the height (before the width factor)
const FOREST_AREA=[[35,80],[80,190],[160,520],[1e9,1400]]; // m² per tree by distance from the nearest road or building
const CHUNK=320;

export function addTrees({T,scene,data,ground,idx,segments,clear,lakeAt=()=>false,onSurface=()=>false,offWays=()=>true,inBuilding=()=>false,density=1,gardenDensity=1}){
 const S=data.roadside||{},out={list:[],counts:{},chunks:[],forestCells:0};
 const geo=createTreeGeometries(T),material=new T.MeshLambertMaterial({vertexColors:true});
 const timing=out.timing={};let lapAt=performance.now();const lap=k=>{const n=performance.now();timing[k]=Math.round(n-lapAt);lapAt=n;};
 const inst=[],spacing=new Map(),cellKey=(x,z)=>Math.floor(x/4)*65536+Math.floor(z/4);
 // Distance from (x,z) to the nearest road edge (along a road segment of the smoothed centre lines).
 const edgeDist=(x,z,reach=14)=>{let best=1e9;for(const [a,b,w] of idx.near(x,z,reach)){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));best=Math.min(best,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)-w/2-KERB_BAND);}return best;};
 const crowded=(x,z,r)=>{const i=Math.floor(x/4),j=Math.floor(z/4);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const t of spacing.get((i+a)*65536+j+b)||[])if(Math.hypot(t[0]-x,t[1]-z)<(t[2]+r)*.62)return true;return false;};
 // A crown must not reach further over the road than `slack` m beyond its edge: narrower first, then lower; false if the tree cannot stand there.
 function fitCrown(x,z,sp,h,wf,slack){const g=edgeDist(x,z,14);if(g>=14)return [h,wf];const allowed=Math.max(0,g+slack),r=CROWN[sp]*h*wf;if(r<=allowed)return [h,wf];
  const f=allowed/r;if(f>=.7)return [h,wf*f];if(f<.55)return null;return [h*f/.7,wf*.7];}
 function plant(x,z,sp,h,wf,src,slack){
  if(slack!==undefined){const c=fitCrown(x,z,sp,h,wf,slack);if(!c)return false;[h,wf]=c;}
  const r=CROWN[sp]*h*wf,k=cellKey(x,z);if(!spacing.has(k))spacing.set(k,[]);spacing.get(k).push([x,z,r]);
  inst.push({x,z,sp,h,wf,rot:hash(x,z,7)*6.283,tint:hash(x,z,9),y:ground(x,z)-.15});out.list.push({x,z,sp,h,r,src});out.counts[src]=(out.counts[src]||0)+1;return true;}
 const heightFor=(sp,u,boost=1)=>SPECIES[sp].h*boost*(.72+.62*u);

 // 1. The trees OSM and NVDB know. A tree beside the road gets a crown that fits: radius at most the gap from the kerb to the trunk less 0.3 m.
 for(const [x,z,sp,h0] of S.trees||[]){
  if(lakeAt(x,z)||onSurface(x,z)||!offWays(x,z,.7))continue;const gap=edgeDist(x,z);if(gap<1.3)continue;
  const h=Math.max(1.5,Math.min(h0,SPECIES[sp].h*1.9)),wf=1+.2*(hash(x,z,3)-.5);
  plant(x,z,sp,h,wf,'mapped',-.1);
 }

 lap('mapped trees');
 // 2. Forest and scrub: a raster of classes (AR5, then OSM wood and scrub polygons where AR5 has none), sampled where a road or a house is near.
 const A=S.ar5,cell=A?A.cell:5,x0=A?A.x0:-450,z0=A?A.z0:-1200,nx=A?A.nx:650,nz=A?A.nz:620,cls=new Uint8Array(nx*nz);
 if(A)A.rows.forEach((row,j)=>{let i=0;for(const run of row.split(' ')){const c=run.indexOf(':'),k=+run.slice(0,c),n=+run.slice(c+1);if(k)cls.fill(k,j*nx+i,j*nx+i+n);i+=n;}});
 const inRing=(ring,x,z)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
 // Rasterize polygons (outer ring and holes, even-odd) row by row: the crossings of each row with the edges, sorted, are the spans inside.
 function rasterize(areas,cls_fn,only0,into=cls){for(const f of areas){const rings=[f.p,...(f.holes||[])];let az=1e9,bz=-1e9;for(const [,z] of f.p){az=Math.min(az,z);bz=Math.max(bz,z);}
  const j0=Math.max(0,Math.floor((az-z0)/cell)),j1=Math.min(nz-1,Math.floor((bz-z0)/cell)),k=cls_fn(f);
  for(let j=j0;j<=j1;j++){const z=z0+(j+.5)*cell,xs=[];for(const ring of rings)for(let a=0,b=ring.length-1;a<ring.length;b=a++){const [ax,az2]=ring[b],[bx,bz2]=ring[a];if((az2>z)!==(bz2>z))xs.push(ax+(bx-ax)*(z-az2)/(bz2-az2));}
   xs.sort((p,q)=>p-q);for(let t=0;t+1<xs.length;t+=2){const i0=Math.max(0,Math.ceil((xs[t]-x0)/cell-.5)),i1=Math.min(nx-1,Math.floor((xs[t+1]-x0)/cell-.5));for(let i=i0;i<=i1;i++)if(!only0||!into[j*nx+i])into[j*nx+i]=k;}}}}
 rasterize(S.forest||[],f=>({s:1,b:2,m:3})[f.s]||3,true);rasterize(S.scrub||[],()=>4,true);
 // Where no tree grows: pitches, running tracks, playgrounds, meadows, recreation grounds and car parks (the map's areas and the car parks added here)
 const blk=new Uint8Array(nx*nz);rasterize(data.areas.filter(a=>['pitch','track','playground','meadow','recreation_ground','parking'].includes(a.type)),()=>1,false,blk);rasterize(S.parking||[],()=>1,false,blk);
 const blocked=(x,z)=>{const i=Math.floor((x-x0)/cell),j=Math.floor((z-z0)/cell);if(i<1||j<1||i>=nx-1||j>=nz-1)return false;for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++)if(blk[(j+b)*nx+i+a])return true;return false;}; // the cell and its neighbours: a margin of 5 to 10 m
 // Shrub fields from NVDB: a patch of shrubs on the polygon, or along the line
 // Distance field (16 m cells, chamfer) from roads and buildings: forest is thick where it is seen.
 const GC=16,gw=Math.ceil(nx*cell/GC),gh=Math.ceil(nz*cell/GC),dist=new Float32Array(gw*gh).fill(9999),mark=(x,z)=>{const i=Math.floor((x-x0)/GC),j=Math.floor((z-z0)/GC);if(i>=0&&j>=0&&i<gw&&j<gh)dist[j*gw+i]=0;};
 for(const [a,b] of segments){const l=Math.hypot(b[0]-a[0],b[1]-a[1]),k=Math.max(1,Math.ceil(l/8));for(let i=0;i<=k;i++)mark(a[0]+(b[0]-a[0])*i/k,a[1]+(b[1]-a[1])*i/k);}
 for(const b of data.buildings){const p=b.p;for(let i=0;i<p.length;i+=2)mark(p[i][0],p[i][1]);}
 const D1=GC,D2=GC*1.414;for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){const k=j*gw+i;let d=dist[k];if(i)d=Math.min(d,dist[k-1]+D1);if(j){d=Math.min(d,dist[k-gw]+D1);if(i)d=Math.min(d,dist[k-gw-1]+D2);if(i<gw-1)d=Math.min(d,dist[k-gw+1]+D2);}dist[k]=d;}
 for(let j=gh-1;j>=0;j--)for(let i=gw-1;i>=0;i--){const k=j*gw+i;let d=dist[k];if(i<gw-1)d=Math.min(d,dist[k+1]+D1);if(j<gh-1){d=Math.min(d,dist[k+gw]+D1);if(i<gw-1)d=Math.min(d,dist[k+gw+1]+D2);if(i)d=Math.min(d,dist[k+gw-1]+D2);}dist[k]=d;}
 const seen=(x,z)=>{const i=Math.floor((x-x0)/GC),j=Math.floor((z-z0)/GC);return i<0||j<0||i>=gw||j>=gh?9999:dist[j*gw+i];};
 lap('raster and distance field');let cells=0;
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=cls[j*nx+i];if(!k)continue;const cx=x0+(i+.5)*cell,cz=z0+(j+.5)*cell,d=seen(cx,cz);if(d>2000)continue;
  const area=k===4?(d<60?45:d<140?140:1e9):FOREST_AREA.find(f=>d<f[0])[1],lambda=cell*cell/area*density;if(lambda<=0)continue;
  let n=Math.floor(lambda);if(hash(cx,cz,1)<lambda-n)n++;if(!n)continue;cells++;
  for(let t=0;t<n;t++){const x=cx+(hash(cx,cz,10+t)-.5)*cell,z=cz+(hash(cx,cz,20+t)-.5)*cell;
   if(lakeAt(x,z)||blocked(x,z)||!offWays(x,z,1.5)||d<70&&(!clear(x,z)||onSurface(x,z)))continue;const sp=pick(POOL[k],hash(x,z,2));if(crowded(x,z,CROWN[sp]*SPECIES[sp].h*.8))continue;
   plant(x,z,sp,k===4?1.2+1.6*hash(x,z,4):heightFor(sp,hash(x,z,4),k===1?1.12:1),.85+.4*hash(x,z,5),k===4?'scrub':'forest',d<70?.4:undefined);}}
 out.forestCells=cells;lap('forest');
 // NVDB shrub fields: a shrub every 2.2 m along a strip, every 9 m² on a polygon
 for(const f of S.shrubs||[]){
  if(f.line){for(let i=0;i<f.line.length-1;i++){const a=f.line[i],b=f.line[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]),k=Math.max(1,Math.round(l/2.2));for(let t=0;t<k;t++){const x=a[0]+(b[0]-a[0])*(t+.5)/k,z=a[1]+(b[1]-a[1])*(t+.5)/k;if(clear(x,z)&&!onSurface(x,z)&&edgeDist(x,z)>.8)plant(x,z,'x',.9+.6*hash(x,z,4),.9+.3*hash(x,z,5),'shrub');}}continue;}
  let ax=1e9,az=1e9,bx=-1e9,bz=-1e9;for(const [x,z] of f.p){ax=Math.min(ax,x);az=Math.min(az,z);bx=Math.max(bx,x);bz=Math.max(bz,z);}
  for(let x=ax+1.5;x<bx;x+=3)for(let z=az+1.5;z<bz;z+=3){const px=x+(hash(x,z,1)-.5)*1.5,pz=z+(hash(x,z,2)-.5)*1.5;if(inRing(f.p,px,pz)&&!onSurface(px,pz)&&edgeDist(px,pz)>.8)plant(px,pz,'x',.9+.6*hash(px,pz,4),.9+.3*hash(px,pz,5),'shrub');}
 }

 lap('shrub fields');
 // 3. Garden trees: a few round every house, in a ring 5 to 24 m from its middle. Flats get more, garages and sheds none.
 for(const b of data.buildings){const p=b.p,n0=p.length-1;if(n0<3)continue;let cx=0,cz=0,area=0;for(let i=0;i<n0;i++){cx+=p[i][0];cz+=p[i][1];area+=p[i][0]*p[i+1][1]-p[i+1][0]*p[i][1];}cx/=n0;cz/=n0;area=Math.abs(area/2);
  if(area<40||['garage','garages','shed','carport','roof','service','hut','greenhouse'].includes(b.t.building))continue;
  const u=hash(cx,cz,30),n=Math.round(gardenDensity*(area>350?4+5*u:u<.15?0:u<.4?1:u<.65?2:u<.85?3:4));
  const reach=Math.sqrt(area)/2;
  for(let t=0,got=0;t<n*4&&got<n;t++){const a=hash(cx,cz,40+t)*6.283,r=reach+4+hash(cx,cz,50+t)*20,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r; // up to four tries per tree
   if(!clear(x,z)||blocked(x,z)||onSurface(x,z)||edgeDist(x,z)<4.2)continue;const sp=pick(GARDEN,hash(x,z,2)),h=heightFor(sp,hash(x,z,4),.92);if(crowded(x,z,CROWN[sp]*h*.8))continue;
   if(plant(x,z,sp,h,.85+.4*hash(x,z,5),'garden',.4))got++;}}

 // 3b. Trees on the unbuilt strips beside the roads (banks, verges, the ends of plots): a seeded one in about eighteen 12 m cells of a hundred, within 45 m of a road
 // and outside AR5 forest (which has its own). Not from data: fill, as the garden trees are.
 for(let gz=z0;gz<z0+nz*cell;gz+=12)for(let gx=x0;gx<x0+nx*cell;gx+=12){if(hash(gx,gz,80)>.18)continue;const x=gx+12*hash(gx,gz,81),z=gz+12*hash(gx,gz,82);if(seen(x,z)>45)continue;
  const i=Math.floor((x-x0)/cell),j=Math.floor((z-z0)/cell);if(i<0||j<0||i>=nx||j>=nz||cls[j*nx+i]||blocked(x,z))continue;
  if(!clear(x,z)||onSurface(x,z)||!offWays(x,z,1.5)||lakeAt(x,z)||edgeDist(x,z)<4.2)continue;const sp=pick(VERGE,hash(x,z,2)),h=heightFor(sp,hash(x,z,4),.85);if(crowded(x,z,CROWN[sp]*h*.8))continue;
  plant(x,z,sp,h,.85+.4*hash(x,z,5),'verge',.4);}
 // 4. Garden shrubs by the walls of houses within 45 m of a road: one to three, a metre and a half out from a wall.
 for(const b of data.buildings){const p=b.p,n0=p.length-1;if(n0<3)continue;let cx=0,cz=0,area=0;for(let i=0;i<n0;i++){cx+=p[i][0];cz+=p[i][1];area+=p[i][0]*p[i+1][1]-p[i+1][0]*p[i][1];}cx/=n0;cz/=n0;area=Math.abs(area/2);
  if(area<40||area>450||['garage','garages','shed','carport','roof','service','hut','greenhouse'].includes(b.t.building)||seen(cx,cz)>45)continue;
  const u=hash(cx,cz,60),n=u<.25?0:u<.55?1:u<.85?2:3;
  for(let t=0;t<n;t++){const e=Math.floor(hash(cx,cz,61+t)*n0),a=p[e],c=p[e+1],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<2.5)continue;
   const f=.15+.7*hash(cx,cz,70+t),ux=(c[0]-a[0])/len,uz=(c[1]-a[1])/len;let nx=-uz,nz=ux;const mx=a[0]+(c[0]-a[0])*f,mz=a[1]+(c[1]-a[1])*f;
   if(inBuilding(mx+nx*.5,mz+nz*.5)){nx=-nx;nz=-nz;}const x=mx+nx*1.5,z=mz+nz*1.5;
   if(inBuilding(x,z)||blocked(x,z)||onSurface(x,z)||!offWays(x,z,.8)||edgeDist(x,z)<1.6||lakeAt(x,z))continue;plant(x,z,'x',.75+.7*hash(x,z,4),.9+.35*hash(x,z,5),'garden shrub');}}
 lap('gardens');
 // ---- Instances: one mesh per species and chunk ---------------------------------------------------------------------------------------------
 const groups=new Map(),dummy=new T.Color();
 for(const t of inst){const k=Math.floor(t.x/CHUNK)*4096+Math.floor(t.z/CHUNK)+'|'+t.sp;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t);}
 let triangles=0;
 for(const [k,list] of groups){const sp=list[0].sp,g=geo[sp],mesh=new T.InstancedMesh(g,material,list.length),m=mesh.instanceMatrix.array,perTree=g.attributes.position.count/3;
  list.forEach((t,i)=>{const c=Math.cos(t.rot),s=Math.sin(t.rot),sxz=t.h*t.wf,sy=t.h,o=i*16;
   m[o]=c*sxz;m[o+1]=0;m[o+2]=-s*sxz;m[o+3]=0;m[o+4]=0;m[o+5]=sy;m[o+6]=0;m[o+7]=0;m[o+8]=s*sxz;m[o+9]=0;m[o+10]=c*sxz;m[o+11]=0;m[o+12]=t.x;m[o+13]=t.y;m[o+14]=t.z;m[o+15]=1;
   const v=.97+.22*t.tint;mesh.setColorAt(i,dummy.setRGB(v*(1+.05*(hash(t.x,t.z,11)-.5)),v,v*(1+.06*(hash(t.x,t.z,12)-.5))));});
  mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();mesh.matrixAutoUpdate=false;mesh.updateMatrix();mesh.receiveShadow=true;mesh.castShadow=false;scene.add(mesh);
  out.chunks.push({mesh,x:Math.floor(list[0].x/CHUNK)*CHUNK+CHUNK/2,z:Math.floor(list[0].z/CHUNK)*CHUNK+CHUNK/2,trees:true});triangles+=perTree*list.length;}
 lap('instances');out.triangles=triangles;out.instances=inst.length;
 return out;
}
