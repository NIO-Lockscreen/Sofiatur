import {drawSign,createFacades} from './munkvoll.js';
// Dalgård: the school, the sports grounds at Dalgård idrettspark and Extra at Dalgårdstunet by the school (Bunnpris
// Ugla, across Odd Husbys veg: stavset.js). Footprints, pitches and car parks are OSM (add-dalgard.py); roof forms, colours and signs follow
// the photographs and the aerial listed in docs/dalgard-references.md. Dimensions are visual estimates.

// Dalgård skole: brown brick, one storey, large low-pitched hipped roofs in light grey metal with dark timber
// eaves, square glass roof lanterns on B-bygget and the southern wings, a brown-roofed hall to the north-east.
// All walls in the OSM outlines run at 42°, so the roofs are laid out as wings in that frame: u along 42°
// (south-east), v across (south-west), from (700,450). Overlapping hipped wings meet in hips and valleys.
const ANGLE=42*Math.PI/180,AX=Math.cos(ANGLE),AZ=Math.sin(ANGLE),O=[700,450];
const uv=(u,v)=>[O[0]+u*AX-v*AZ,O[1]+u*AZ+v*AX],local=(x,z)=>{const dx=x-O[0],dz=z-O[1];return [dx*AX+dz*AZ,-dx*AZ+dz*AX];};
const EAVE=4,OVERHANG=.7,SLOPE=.3,MAX_RISE=2.2;
export const schoolWings={
 // A-bygget: wings round the courtyard, the south-west extension, the link to the southern wings, the hall.
 r1318241:[{u:[-55,-37.9],v:[-20.8,35.5]},{u:[-55,-23.6],v:[21.4,35.5]},{u:[-37.9,5],v:[4.4,21.4]},{u:[-55,5],v:[-20.8,-6.5]},
  {u:[-11.6,5.1],v:[-24.1,21.4]},{u:[5,12.5],v:[-5,-1.3],eave:3.4,maxRise:.8},{u:[-26.8,-3.1],v:[-45.6,-20.7],eave:6.2,slope:.4,maxRise:3.6,roof:'#6d4c3e',seam:'#5b3f33'}],
 // B-bygget (OSM: one storey, 6 m, hipped metal roof 2 m) with its lantern over the inner rings, and the link to A.
 r20722521:[{u:[-18.1,11.3],v:[27,52.8],lantern:[-8.9,1.6,33.4,42.9]},{u:[-11.1,3.1],v:[21.4,28.8]}],
 // The southern wings: two square blocks with a lantern each, joined by lower links.
 r20516148:[{u:[12.5,19.8],v:[-12.5,-1],eave:3.6,maxRise:1},{u:[19.7,48.8],v:[-14,22.4],lantern:[30.3,38.3,.2,8.2]},{u:[48.9,60.8],v:[-15.7,-2.7],eave:3.6,maxRise:1},{u:[59.4,86.8],v:[-15.7,15.9],lantern:[69.1,77.1,-3.9,4.1]}]
};
const BRICK='#8b4935',BRICK_LINE='#6f3829',TIMBER='#3d2b22',ROOF='#b7bcbd',SEAM='#9aa0a1',GLASS='#4b5d63';
// For tests: the wing frame (u,v) of a map point, and the eave overhang round every wing.
export const schoolFrame={local,uv,overhang:OVERHANG};
let schoolBase=null;

export function addDalgardSchool({T,scene,data,building,height,bucket,tri,quad,box,groundPoly}){
 const id=String(building.id),wings=schoolWings[id];if(!wings)return null;
 const school=data.buildings.filter(b=>schoolWings[b.id]),outline=b=>b.p.slice(0,-1);
 // One floor level for the whole school: the middle of the ground heights round all three buildings.
 if(schoolBase===null){const hs=school.flatMap(b=>outline(b).map(v=>height(...v))).sort((a,b)=>a-b);schoolBase=hs[Math.floor(hs.length/2)];}
 const y=schoolBase,p=outline(building),holes=(building.holes||[]).map(h=>h.slice(0,-1));
 const cx=p.reduce((s,v)=>s+v[0],0)/p.length,cz=p.reduce((s,v)=>s+v[1],0)/p.length,b=bucket(cx,cz);
 const within=(w,x,z,m=0)=>{const [u,v]=local(x,z);return u>w.u[0]-m&&u<w.u[1]+m&&v>w.v[0]-m&&v<w.v[1]+m;};
 const allWings=Object.values(schoolWings).flat(),eaveOf=w=>w.eave??EAVE;
 // A wall runs up to the underside of the highest roof above it.
 const wallTop=(x,z)=>{let top=0;for(const w of allWings)if(within(w,x,z,.2))top=Math.max(top,eaveOf(w)+OVERHANG*(w.slope??SLOPE));return y+(top||EAVE+OVERHANG*SLOPE);};
 const inRing=(ring,x,z)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
 const inside=(x,z)=>school.some(s=>inRing(outline(s),x,z)&&!(s.holes||[]).some(h=>inRing(h.slice(0,-1),x,z)));
 // Walls where two buildings meet are inside the school and left out.
 const key=(a,c)=>a.join()+'|'+c.join(),shared=new Set();
 for(const s of school)if(s!==building){const q=outline(s);for(let i=0;i<q.length;i++)shared.add(key(q[(i+1)%q.length],q[i]));}
 const rings=[p,...(id==='r1318241'?holes:[])]; // B-bygget's inner rings carry its lantern, not a courtyard
 for(const ring of rings)for(let i=0;i<ring.length;i++){
  const a=ring[i],c=ring[(i+1)%ring.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<.3||shared.has(key(a,c)))continue;
  const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;let nx=-dz,nz=dx;const mx=(a[0]+c[0])/2,mz=(a[1]+c[1])/2;if(inside(mx+nx*.3,mz+nz*.3)){nx=-nx;nz=-nz;}
  const top=wallTop(mx-nx*.5,mz-nz*.5),at=(d,h,o=0)=>[a[0]+dx*d+nx*o,h,a[1]+dz*d+nz*o];
  quad(b,[a[0],height(...a)-.5,a[1]],[c[0],height(...c)-.5,c[1]],[c[0],y+.35,c[1]],[a[0],y+.35,a[1]],'#8f8c84');
  quad(b,at(0,y+.35),at(len,y+.35),at(len,top),at(0,top),BRICK);
  for(let h=y+.75;h<top-.2;h+=.5)quad(b,at(0,h,.03),at(len,h,.03),at(len,h+.04,.03),at(0,h+.04,.03),BRICK_LINE);
  // Window bands with dark brown frames, as in the entrance photograph.
  const n=Math.floor((len-1)/3.3);for(let k=0;k<n;k++){const d=len*(k+.5)/n;quad(b,at(d-.85,y+.95,.05),at(d+.85,y+.95,.05),at(d+.85,y+2.55,.05),at(d-.85,y+2.55,.05),TIMBER);quad(b,at(d-.72,y+1.05,.08),at(d+.72,y+1.05,.08),at(d+.72,y+2.45,.08),at(d-.72,y+2.45,.08),GLASS);quad(b,at(d-.04,y+1.05,.1),at(d+.04,y+1.05,.1),at(d+.04,y+2.45,.1),at(d-.04,y+2.45,.1),TIMBER);}
 }
 if(id==='r1318241')for(const h of holes)groundPoly(h,'#a8a093',.12); // paved courtyard
 // Hipped wing roofs: four planes rising from the eaves to a ridge, or to a flat top where the pitch is capped.
 const P=(u,v,h)=>{const [x,z]=uv(u,v);return [x,h,z];};
 for(const w of wings){
  const slope=w.slope??SLOPE,maxRise=w.maxRise??MAX_RISE,e=y+eaveOf(w),colour=w.roof||ROOF,seam=w.seam||SEAM;
  const u0=w.u[0]-OVERHANG,u1=w.u[1]+OVERHANG,v0=w.v[0]-OVERHANG,v1=w.v[1]+OVERHANG,d=Math.min((u1-u0)/2,(v1-v0)/2,maxRise/slope),rise=d*slope;
  const outer=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]],inner=[[u0+d,v0+d],[u1-d,v0+d],[u1-d,v1-d],[u0+d,v1-d]];
  for(let i=0;i<4;i++){const a=outer[i],c=outer[(i+1)%4],ia=inner[i],ic=inner[(i+1)%4];quad(b,P(...a,e),P(...c,e),P(...ic,e+rise),P(...ia,e+rise),colour);
   // Standing seams straight up the slope, and the dark timber fascia along eaves not hidden under another wing.
   const du=c[0]-a[0],dv=c[1]-a[1],len=Math.hypot(du,dv),tu=du/len,tv=dv/len,iu=-tv,iv=tu; // (iu,iv) points up the slope
   for(let s=1.2;s<len-.6;s+=1.2){const m=Math.min(d,s,len-s),bu=a[0]+tu*s,bv=a[1]+tv*s;quad(b,P(bu,bv,e+.03),P(bu+tu*.07,bv+tv*.07,e+.03),P(bu+tu*.07+iu*m,bv+tv*.07+iv*m,e+rise*m/d+.03),P(bu+iu*m,bv+iv*m,e+rise*m/d+.03),seam);}
   const mid=[(a[0]+c[0])/2,(a[1]+c[1])/2],[mx,mz]=uv(...mid);if(!allWings.some(o=>o!==w&&within(o,mx,mz,OVERHANG-.05)))quad(b,P(...a,e+.02),P(...c,e+.02),P(...c,e-.3),P(...a,e-.3),TIMBER);
  }
  if(d<Math.min((u1-u0)/2,(v1-v0)/2))quad(b,...inner.map(q=>P(...q,e+rise)),colour);
  if(w.lantern){const [la,lb,va,vb]=w.lantern,t=e+rise,corners=[[la,va],[lb,va],[lb,vb],[la,vb]],apex=P((la+lb)/2,(va+vb)/2,t+2.1);
   for(let i=0;i<4;i++){const a=corners[i],c=corners[(i+1)%4];quad(b,P(...a,t),P(...c,t),P(...c,t+1.1),P(...a,t+1.1),'#7d949b');quad(b,P(...a,t+1.1),P(...c,t+1.1),P(...c,t+1.25),P(...a,t+1.25),TIMBER);tri(b,P(...a,t+1.25),P(...c,t+1.25),apex,'#5a6a70');
    const [x,,z]=P(...a,t);box(b,x,t+.62,z,.18,1.25,.18,TIMBER);}}
 }
 // Main entrance on the north-west front, towards the car park by Anders Wigens veg: a gabled timber porch and the name.
 if(id==='r1318241'){
  const n=[-AX,-AZ]; // outward normal of the north-west front
  const door=(o,h,along=0)=>{const [x,z]=uv(-55-o,8+along);return [x,y+h,z];};
  for(const k of [-2,2])for(const o of [.4,3.2]){const [x,yy,z]=door(o,1.55,k);box(b,x,yy,z,.22,3.1,.22,TIMBER);}
  const ridge=[door(-.2,4.25,0),door(3.6,4.25,0)],left=[door(-.2,3.1,-2.6),door(3.6,3.1,-2.6)],right=[door(-.2,3.1,2.6),door(3.6,3.1,2.6)];
  quad(b,left[0],left[1],ridge[1],ridge[0],ROOF);quad(b,right[0],right[1],ridge[1],ridge[0],ROOF);tri(b,left[1],right[1],ridge[1],TIMBER);
  quad(b,door(.08,.1,-1.1),door(.08,.1,1.1),door(.08,2.5,1.1),door(.08,2.5,-1.1),'#5c7a80');
  const [sx,sz]=uv(-55.12,-6);drawSign(T,scene,'DALGÅRD SKOLE',[sx,y+2.95,sz],n,5.2,.62,'#f1e9d6',TIMBER);
 }
 const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);
 return {bounds:[Math.min(...xs)-3,Math.min(...zs)-3,Math.max(...xs)+3,Math.max(...zs)+3]};
}

// Sports grounds and car parks from add-dalgard.py: artificial turf, tartan and asphalt draped over the terrain,
// white pitch markings and goals, lane lines on the running track. Returns their extents, kept free of trees.
const SURFACE={artificial_turf:'#3f9447',grass:'#6fa857',tartan:'#b0533c',asphalt:'#7e837f'};
export function addSportsGrounds({T,data,height,bucket,tri,box,ribbon}){
 const bounds=[],white='#f1f3ec';
 function drape(poly,holes,colour,lift){const all=[...poly,...holes.flat()];
  const split=(a,c,e)=>{const l=Math.max(Math.hypot(a[0]-c[0],a[1]-c[1]),Math.hypot(c[0]-e[0],c[1]-e[1]),Math.hypot(e[0]-a[0],e[1]-a[1]));
   if(l>8){const m=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2],ac=m(a,c),ce=m(c,e),ea=m(e,a);split(a,ac,ea);split(ac,c,ce);split(ea,ce,e);split(ac,ce,ea);return;}
   tri(bucket(a[0],a[1]),...[a,c,e].map(q=>[q[0],height(...q)+lift,q[1]]),colour);};
  for(const f of T.ShapeUtils.triangulateShape(poly.map(v=>new T.Vector2(...v)),holes.map(h=>h.map(v=>new T.Vector2(...v)))))split(all[f[0]],all[f[1]],all[f[2]]);}
 const loop=(ring,width,lift=.17)=>ribbon([...ring,ring[0]],width,white,lift);
 for(const a of data.areas){
  if(!a.osm||!['pitch','track','parking'].includes(a.type))continue;
  const holes=a.holes||[];bounds.push([Math.min(...a.p.map(v=>v[0]))-1,Math.min(...a.p.map(v=>v[1]))-1,Math.max(...a.p.map(v=>v[0]))+1,Math.max(...a.p.map(v=>v[1]))+1]);
  if(a.type==='parking'){drape(a.p,[],'#83877f',.07);continue;}
  drape(a.p,holes,SURFACE[a.surface]||SURFACE.grass,.1);
  if(a.type==='track'){for(const h of holes)laneLines(h,a.p);continue;}
  if(a.p.length===4&&/soccer/.test(a.sport)&&a.surface!=='asphalt')soccer(a.p);else loop(a.p,.1);
 }
 // A football pitch in a four-corner outline: touch and goal lines, halfway line, centre circle, penalty areas, goals.
 function soccer(q){
  const c=[q.reduce((s,v)=>s+v[0],0)/4,q.reduce((s,v)=>s+v[1],0)/4],s1=[q[1][0]-q[0][0],q[1][1]-q[0][1]],s2=[q[2][0]-q[1][0],q[2][1]-q[1][1]];
  const [long,short]=Math.hypot(...s1)>=Math.hypot(...s2)?[s1,s2]:[s2,s1],L=Math.hypot(...long),W=Math.hypot(...short),e1=[long[0]/L,long[1]/L],e2=[short[0]/W,short[1]/W];
  const at=(x,z)=>[c[0]+e1[0]*x+e2[0]*z,c[1]+e1[1]*x+e2[1]*z],hl=L/2-1,hw=W/2-1,line=pts=>ribbon(pts.map(v=>at(...v)),.12,white,.17);
  line([[-hl,-hw],[hl,-hw],[hl,hw],[-hl,hw],[-hl,-hw]]);line([[0,-hw],[0,hw]]);
  const r=Math.min(9.15,W*.14),circle=[];for(let i=0;i<=24;i++)circle.push([Math.cos(i/24*Math.PI*2)*r,Math.sin(i/24*Math.PI*2)*r]);line(circle);
  const pd=Math.min(16.5,L*.16),pw=Math.min(40.3,W*.6),gd=pd*.33,gw=pw*.45,gw2=Math.min(7.32,W*.11),gh=Math.min(2.44,1.2+W*.02),angle=Math.atan2(-e2[1],e2[0]);
  for(const k of [-1,1]){line([[k*hl,-pw/2],[k*(hl-pd),-pw/2],[k*(hl-pd),pw/2],[k*hl,pw/2]]);line([[k*hl,-gw/2],[k*(hl-gd),-gw/2],[k*(hl-gd),gw/2],[k*hl,gw/2]]);
   const b=bucket(...at(k*hl,0));
   for(const z of [-gw2/2,gw2/2]){const [x,zz]=at(k*(hl+.1),z);box(b,x,height(x,zz)+.1+gh/2,zz,.12,gh,.12,white);}
   const [x,zz]=at(k*(hl+.1),0);box(b,x,height(x,zz)+.1+gh,zz,gw2+.12,.12,.12,white,angle);}
 }
 // Lane lines of the running track: the inner kerb offset outward lane by lane (1.22 m), while inside the track.
 function laneLines(inner,outer){
  const inRing=(ring,x,z)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
  const n=inner.length,normals=inner.map((v,i)=>{const a=inner[(i+n-1)%n],c=inner[(i+1)%n],dx=c[0]-a[0],dz=c[1]-a[1],l=Math.hypot(dx,dz)||1;let nx=dz/l,nz=-dx/l;if(inRing(inner,v[0]+nx*.5,v[1]+nz*.5)){nx=-nx;nz=-nz;}return [nx,nz];});
  loop(inner,.1);
  for(let k=1;k<=6;k++){const ring=inner.map((v,i)=>[v[0]+normals[i][0]*1.22*k,v[1]+normals[i][1]*1.22*k]);if(ring.every(v=>inRing(outer,...v)))loop(ring,.07);}
 }
 return bounds;
}

// Shop fronts and signs, on the walls the generic builder put up (see building-details.js for their colours).
export function addDalgardDetails({T,scene,data,wallBase,bucket,quad,box}){
 const wall=createFacades({data,wallBase,bucket,quad});
 // Extra Ugla: ground floor of Dalgårdstunet hus A (2024). Glazed shop front with bronze panels towards Anders
 // Wigens veg and the square between the two houses, the red Extra name with its round yellow and red badge.
 const street=wall('1312240278',[589.3,442.7]),square=wall('1312240278',[565.6,457.5]);
 for(const f of [street,square]){if(!f)continue;const run=f===street?Math.min(30,f.len-2):f.len-2;
  f.panel(1+run/2,.25,run,3.35,'#6f5c49',.1);for(let d=1.4;d<1+run-.4;d+=2.6){f.panel(d+1.2,.4,2.2,2.9,'#35444a',.14);f.panel(d+1.2,3.02,2.3,.08,'#2c2f31',.16);}
  extra(f.at(f===street?7:f.len/2,4.25,.2),f.normal,7.2,1.8);}
 // Dalgård ishall: the name on the west front, facing the car park where the road from Dalgårdvegen ends.
 const hall=wall('89233555',[902.8,584.9]);if(hall)drawSign(T,scene,'DALGÅRD ISHALL',hall.at(hall.len/2,Math.min(hall.h-1.2,5.4),.2),hall.normal,12,1.4,'#ffffff','#1f4b7a');
 function extra(at,normal,w,h){
  const c=document.createElement('canvas');c.width=512;c.height=128;const q=c.getContext('2d');q.clearRect(0,0,512,128);
  q.fillStyle='#ffd21f';q.beginPath();q.arc(64,64,54,0,Math.PI*2);q.fill();q.strokeStyle='#d8141c';q.lineWidth=11;q.stroke();
  q.fillStyle='#d8141c';q.font='bold 64px sans-serif';q.textAlign='center';q.textBaseline='middle';q.fillText('X',64,68);
  q.font='italic bold 96px sans-serif';q.textAlign='left';q.fillText('Extra',138,70,360);
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide,transparent:true}));
  m.name='Extra';m.position.set(...at);m.rotation.y=Math.atan2(normal[0],normal[1]);scene.add(m);}
}
