export const roadWidth=road=>road.type==='service'?3.5:road.type==='residential'?5.2:6.5;
export function projectPoint(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(l||1))),x=a[0]+t*dx,z=a[1]+t*dz;return {x,z,t,distance:Math.hypot(p[0]-x,p[1]-z)};}
export function streetSegments(roads){return roads.flatMap(r=>r.p.slice(1).map((p,i)=>[r.p[i],p,roadWidth(r)]));}
// Grid of segments by the cells their bounding boxes cover: near(x,z,r) returns every segment that passes within r metres
// (plus a few farther ones), so proximity checks look at nearby roads instead of all of them.
export function segmentIndex(segments,cell=32){
 const grid=new Map(),key=(i,j)=>i*65536+j;
 for(const s of segments){const [a,b]=s;for(let i=Math.floor(Math.min(a[0],b[0])/cell);i<=Math.floor(Math.max(a[0],b[0])/cell);i++)for(let j=Math.floor(Math.min(a[1],b[1])/cell);j<=Math.floor(Math.max(a[1],b[1])/cell);j++){const k=key(i,j);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(s);}}
 return {near(x,z,r){const found=new Set();for(let i=Math.floor((x-r)/cell);i<=Math.floor((x+r)/cell);i++)for(let j=Math.floor((z-r)/cell);j<=Math.floor((z+r)/cell);j++)for(const s of grid.get(key(i,j))||[])found.add(s);return found;}};
}
const indexes=new WeakMap();const indexFor=segments=>{if(!indexes.has(segments))indexes.set(segments,segmentIndex(segments));return indexes.get(segments);};
// Local u runs along the kerb, local v runs away from the carriageway.
// Check the full shelter/sign footprint against all neighbouring road segments.
export function placeBusStop(stop,segments){
 let nearest=null;for(const [a,b,width] of segments){const q=projectPoint(stop.p,a,b),len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len>.01&&(!nearest||q.distance<nearest.distance))nearest={...q,a,b,width,len};}
 if(!nearest)return null;const q=nearest,dx=(q.b[0]-q.a[0])/q.len,dz=(q.b[1]-q.a[1])/q.len,side=((stop.p[0]-q.x)*-dz+(stop.p[1]-q.z)*dx)<0?-1:1,tx=dx*side,tz=dz*side,nx=-tz,nz=tx;
 for(let extra=0;extra<=18;extra+=1)for(const along of [0,-4,4,-8,8]){
  const offset=q.width/2+2.1+extra,x=q.x+nx*offset+tx*along,z=q.z+nz*offset+tz*along;
  const point=(u,v)=>[x+tx*u+nx*v,z+tz*u+nz*v];
  // Enclosing circle prevents even curved/junction road edges crossing the shelter.
  let safe=true;for(const [a,b,w] of indexFor(segments).near(x,z,6))if(projectPoint([x,z],a,b).distance<=w/2+2.65){safe=false;break;}
  if(safe)return {x,z,angle:Math.atan2(-tz,tx),point,footprint:[point(-2.5,-1),point(2,-1),point(2,1),point(-2.5,1)]};
 }
 return null;
}
// DTM is ground elevation, not bridge-deck elevation. Keep a separate rail profile.
// Deck clearance is a visual estimate from the reference, not surveyed engineering.
export function createRailProfiles(rails,height,roads){
 const bridges=rails.filter(r=>r.bridge).map(rail=>{
  let level=Math.max(height(...rail.p[0]),height(...rail.p.at(-1)))+.35;
  for(let i=1;i<rail.p.length;i++){const a=rail.p[i-1],b=rail.p[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<=len;d+=1){const x=a[0]+(b[0]-a[0])*d/len,z=a[1]+(b[1]-a[1])*d/len;if(roads.some(([c,e,w])=>projectPoint([x,z],c,e).distance<w/2+1.2))level=Math.max(level,height(x,z)+6.8);}}
  return {rail,level};
 });
 const deck=new Map(bridges.map(b=>[b.rail.id,b.level]));
 function railHeight(rail,x,z){if(deck.has(rail.id))return deck.get(rail.id);let lift=0;for(const b of bridges)for(const end of [b.rail.p[0],b.rail.p.at(-1)]){const d=Math.hypot(x-end[0],z-end[1]);if(d<60)lift=Math.max(lift,(b.level-height(...end))*Math.pow(1-d/60,2));}return height(x,z)+lift;}
 return {bridges,railHeight};
}
