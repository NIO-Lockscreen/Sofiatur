// Piecewise planar roof surfaces, clipped to the actual mapped footprint.
// Each plane occupies the region where it is the lowest roof plane.
//
// Options added on 30 September 2026 (all off by default, so older callers draw exactly what they drew before):
//  overhang   eaves overhang in metres. The roof polygon is the footprint pushed outwards (eaves side `overhang`, gable
//             ends 0.6 of it, hipped roofs all round) and the planes simply continue past the walls, so the eaves drop a
//             little below the wall top like a real roof. Falls back to no overhang when the offset polygon is not simple.
//  fascia     colour of the fascia board along the roof edge (eaves board and barge boards on the gables).
//  onPlane    called as onPlane(polygon,index,top,frame) for every clipped roof plane (convex or not), so the caller can
//             add seams or roof lights on it; frame = {nx,nz,low,high,u0,u1,half,cx,cz,shape}.
// The returned top(v) gives the roof height above footprint point v; it carries .ridge ({a,b,y} or null), .shape, .rise
// and .eaves (the offset polygon that was used, or the footprint).

// The footprint pushed outwards by dist[i] along edge i (p[i] to p[i+1]), mitred at the corners. Returns null when that
// does not give a simple polygon of about the right size (very concave or very small footprints).
export function offsetPolygon(p,dist){
 const n=p.length;if(n<3||n>24)return null;
 const s=p.reduce((sum,a,i)=>{const c=p[(i+1)%n];return sum+a[0]*c[1]-c[0]*a[1];},0)>0?1:-1;
 const lines=p.map((a,i)=>{const c=p[(i+1)%n],len=Math.hypot(c[0]-a[0],c[1]-a[1])||1,dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len,d=dist[i]??dist,nx=s*dz,nz=-s*dx;return {x:a[0]+nx*d,z:a[1]+nz*d,dx,dz,d};});
 const out=[];
 for(let j=0;j<n;j++){
  const l0=lines[(j+n-1)%n],l1=lines[j],det=l0.dx*l1.dz-l0.dz*l1.dx;let x,z;
  if(Math.abs(det)<1e-6){x=l1.x;z=l1.z;}
  else{const t=((l1.x-l0.x)*l1.dz-(l1.z-l0.z)*l1.dx)/det;x=l0.x+l0.dx*t;z=l0.z+l0.dz*t;}
  const limit=3*Math.max(l0.d,l1.d,.01),m=Math.hypot(x-p[j][0],z-p[j][1]);
  if(m>limit){x=p[j][0]+(x-p[j][0])*limit/m;z=p[j][1]+(z-p[j][1])*limit/m;}
  out.push([x,z]);
 }
 const area=q=>Math.abs(q.reduce((sum,a,i)=>{const c=q[(i+1)%q.length];return sum+a[0]*c[1]-c[0]*a[1];},0)/2);
 const a0=area(p),a1=area(out);if(!(a1>=a0*.98&&a1<=a0*2.6))return null;
 for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;if(cross(out[i],out[(i+1)%n],out[j],out[(j+1)%n]))return null;}
 return out;
}
function cross(a,b,c,d){const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0;}

export function addBuildingRoof({T,p,cx,cz,y,h,style,t,area,b,tri,quad,colour,roofcolour,overhang=0,fascia=null,onPlane=null}){
 let longest=0,li=0;for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len>longest){longest=len;li=i;}}
 const shape=style.flat?'flat':style.roofShape||(style.gabled?'gabled':t['roof:shape'])||(area<450&&t.building!=='apartments'?'gabled':'flat');
 if(shape==='flat'||!['gabled','hipped','skillion','half-hipped'].includes(shape)){
  // Flat roof: a slab that sticks out a little, with a fascia band round its edge.
  let slab=p;if(overhang>0){const o=offsetPolygon(p,p.map(()=>overhang*.45));if(o)slab=o;}
  for(const f of T.ShapeUtils.triangulateShape(slab.map(v=>new T.Vector2(...v)),[]))tri(b,...f.map(i=>[slab[i][0],y+h+.05,slab[i][1]]),roofcolour);
  if(fascia)for(let i=0;i<slab.length;i++){const a=slab[i],c=slab[(i+1)%slab.length];quad(b,[a[0],y+h-.18,a[1]],[c[0],y+h-.18,c[1]],[c[0],y+h+.05,c[1]],[a[0],y+h+.05,a[1]],fascia);}
  const top=()=>y+h+.05;top.ridge=null;top.shape='flat';top.rise=0;top.eaves=slab;return top;
 }
 const a=p[li],c=p[(li+1)%p.length];let nx=-(c[1]-a[1])/longest,nz=(c[0]-a[0])/longest;
 const direction=style.roofDirection??parseFloat(t['roof:direction']);if(Number.isFinite(direction)){nx=Math.sin(direction*Math.PI/180);nz=-Math.cos(direction*Math.PI/180);}
 const cross=v=>(v[0]-cx)*nx+(v[1]-cz)*nz,along=v=>(v[0]-cx)*nz-(v[1]-cz)*nx;
 const low=Math.min(...p.map(cross)),high=Math.max(...p.map(cross)),half=Math.max(.1,(high-low)/2),u0=Math.min(...p.map(along)),u1=Math.max(...p.map(along));
 const rise=style.roofRise||parseFloat(t['roof:height'])||Math.min(3.2,half*.62);
 let planes=shape==='skillion'?[v=>(cross(v)-low)/(2*half)]:[v=>(cross(v)-low)/half,v=>(high-cross(v))/half];
 const hip=shape==='hipped'||shape==='half-hipped',run=Math.max(.1,Math.min(half,(u1-u0)/2));
 if(hip)planes.push(v=>(along(v)-u0)/run,v=>(u1-along(v))/run);
 // Roof polygon: the footprint, or pushed out by the overhang.
 let outline=p;
 if(overhang>0){
  const dist=p.map((q,i)=>{const r=p[(i+1)%p.length],len=Math.hypot(r[0]-q[0],r[1]-q[1])||1,along_=Math.abs(((r[0]-q[0])*nx+(r[1]-q[1])*nz)/len);return hip||along_<.5?overhang:overhang*.6;});
  outline=offsetPolygon(p,dist)||p;
 }
 const lower=outline===p?0:-.6;
 const top=v=>y+h+rise*Math.max(lower,Math.min(...planes.map(f=>f(v))));
 planes.forEach((plane,index)=>{let polygon=outline.slice();for(const other of planes){if(other===plane)continue;const result=[];for(let i=0;i<polygon.length;i++){const v=polygon[i],w=polygon[(i+1)%polygon.length],sv=other(v)-plane(v),sw=other(w)-plane(w);if(sv>=-1e-8)result.push(v);if((sv>=-1e-8)!==(sw>=-1e-8)){const f=sv/(sv-sw);result.push([v[0]+(w[0]-v[0])*f,v[1]+(w[1]-v[1])*f]);}}polygon=result;if(polygon.length<3)break;}
  if(polygon.length>=3){for(const f of T.ShapeUtils.triangulateShape(polygon.map(v=>new T.Vector2(...v)),[]))tri(b,...f.map(i=>[polygon[i][0],top(polygon[i]),polygon[i][1]]),roofcolour);
   if(onPlane)onPlane(polygon,index,top,{nx,nz,low,high,u0,u1,half,cx,cz,shape});}
 });
 // Split an edge where two planes meet, so gable infill and fascia follow the roof line exactly.
 const cuts=(a,c)=>{const list=[0,1];for(let j=0;j<planes.length;j++)for(let k=j+1;k<planes.length;k++){const sa=planes[j](a)-planes[k](a),sc=planes[j](c)-planes[k](c),f=sa/(sa-sc);if(f>0&&f<1)list.push(f);}return list.sort((x,z)=>x-z);};
 const at=(a,c,f)=>[a[0]+(c[0]-a[0])*f,a[1]+(c[1]-a[1])*f];
 // Insert every plane intersection on the facade, keeping gable infill sealed.
 for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],list=cuts(a,c);for(let j=1;j<list.length;j++){const v=at(a,c,list[j-1]),w=at(a,c,list[j]);quad(b,[v[0],y+h,v[1]],[w[0],y+h,w[1]],[w[0],top(w),w[1]],[v[0],top(v),v[1]],colour);}}
 // Fascia board along the roof edge: the eaves board and the barge boards on the gables.
 if(fascia){const fw=overhang>0?.2:.16;for(let i=0;i<outline.length;i++){const a=outline[i],c=outline[(i+1)%outline.length],list=cuts(a,c);for(let j=1;j<list.length;j++){const v=at(a,c,list[j-1]),w=at(a,c,list[j]);quad(b,[v[0],top(v)-fw,v[1]],[w[0],top(w)-fw,w[1]],[w[0],top(w)+.02,w[1]],[v[0],top(v)+.02,v[1]],fascia);}}}
 // The ridge line, where the two main planes meet (none on a skillion roof, none when it would leave the footprint).
 top.ridge=null;top.shape=shape;top.rise=rise;top.eaves=outline;
 if(shape!=='skillion'){
  const mid=(low+high)/2,s0=hip?u0+run:u0,s1=hip?u1-run:u1,point=s=>[cx+nx*mid+nz*s,cz+nz*mid-nx*s];
  const inside=v=>{let ins=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [ax,az]=p[j],[bx,bz]=p[i];if((az>v[1])!==(bz>v[1])&&v[0]<(bx-ax)*(v[1]-az)/(bz-az)+ax)ins=!ins;}return ins;};
  if(s1-s0>.8&&[.04,.25,.5,.75,.96].every(f=>inside(point(s0+(s1-s0)*f))))top.ridge={a:point(s0),b:point(s1),y:y+h+rise};
 }
 return top;
}
