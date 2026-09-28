// Piecewise planar roof surfaces, clipped to the actual mapped footprint.
// Each plane occupies the region where it is the lowest roof plane.
export function addBuildingRoof({T,p,cx,cz,y,h,style,t,area,b,tri,quad,colour,roofcolour}){
 let longest=0,li=0;for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len>longest){longest=len;li=i;}}
 const shape=style.flat?'flat':style.roofShape||(style.gabled?'gabled':t['roof:shape'])||(area<450&&t.building!=='apartments'?'gabled':'flat');
 if(shape==='flat'||!['gabled','hipped','skillion','half-hipped'].includes(shape)){for(const f of T.ShapeUtils.triangulateShape(p.map(v=>new T.Vector2(...v)),[]))tri(b,...f.map(i=>[p[i][0],y+h+.05,p[i][1]]),roofcolour);return ()=>y+h+.05;}
 const a=p[li],c=p[(li+1)%p.length];let nx=-(c[1]-a[1])/longest,nz=(c[0]-a[0])/longest;
 const direction=style.roofDirection??parseFloat(t['roof:direction']);if(Number.isFinite(direction)){nx=Math.sin(direction*Math.PI/180);nz=-Math.cos(direction*Math.PI/180);}
 const cross=v=>(v[0]-cx)*nx+(v[1]-cz)*nz,along=v=>(v[0]-cx)*nz-(v[1]-cz)*nx;
 const low=Math.min(...p.map(cross)),high=Math.max(...p.map(cross)),half=Math.max(.1,(high-low)/2),u0=Math.min(...p.map(along)),u1=Math.max(...p.map(along));
 const rise=style.roofRise||parseFloat(t['roof:height'])||Math.min(3.2,half*.62);
 let planes=shape==='skillion'?[v=>(cross(v)-low)/(2*half)]:[v=>(cross(v)-low)/half,v=>(high-cross(v))/half];
 if(shape==='hipped'||shape==='half-hipped'){const run=Math.max(.1,Math.min(half,(u1-u0)/2));planes.push(v=>(along(v)-u0)/run,v=>(u1-along(v))/run);}
 const top=v=>y+h+rise*Math.max(0,Math.min(...planes.map(f=>f(v))));
 for(const plane of planes){let polygon=p.slice();for(const other of planes){if(other===plane)continue;const result=[];for(let i=0;i<polygon.length;i++){const v=polygon[i],w=polygon[(i+1)%polygon.length],sv=other(v)-plane(v),sw=other(w)-plane(w);if(sv>=-1e-8)result.push(v);if((sv>=-1e-8)!==(sw>=-1e-8)){const f=sv/(sv-sw);result.push([v[0]+(w[0]-v[0])*f,v[1]+(w[1]-v[1])*f]);}}polygon=result;if(polygon.length<3)break;}
  if(polygon.length>=3)for(const f of T.ShapeUtils.triangulateShape(polygon.map(v=>new T.Vector2(...v)),[]))tri(b,...f.map(i=>[polygon[i][0],top(polygon[i]),polygon[i][1]]),roofcolour);
 }
 // Insert every plane intersection on the facade, keeping gable infill sealed.
 for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],cuts=[0,1];for(let j=0;j<planes.length;j++)for(let k=j+1;k<planes.length;k++){const sa=planes[j](a)-planes[k](a),sc=planes[j](c)-planes[k](c),f=sa/(sa-sc);if(f>0&&f<1)cuts.push(f);}cuts.sort((a,b)=>a-b);for(let j=1;j<cuts.length;j++){const at=f=>[a[0]+(c[0]-a[0])*f,a[1]+(c[1]-a[1])*f],v=at(cuts[j-1]),w=at(cuts[j]);quad(b,[v[0],y+h,v[1]],[w[0],y+h,w[1]],[w[0],top(w),w[1]],[v[0],top(v),v[1]],colour);}}
 return top;
}
