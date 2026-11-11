// Rainbow trail (a reward after the second trip to the kindergarten): a band of seven stripes hovering over the
// road behind the car. Points are laid down from the rear bumper as the car moves and fade with age and distance,
// so the trail shrinks away when the car stops. Two things changed on 11 October 2026: the band always starts at the bumper itself (a live end; it used to
// start at the last point laid down, which lagged the bumper by 0 to 0.6 m and jumped forward at every new point, so the front edge flickered), and its height
// is the road's under the bumper, not under the car's middle (on a 19 % downhill that road is 45 cm higher and the band lay buried in it).
export function createRainbowTrail({T,scene,max=180,life=2.8,length=55,width=1.5,spacing=.6,hover=.3}){
 const colours=['#ff4b4b','#ff9b3d','#ffd94a','#5ccf66','#41a7f4','#5b6cf0','#a65fe6'].map(c=>new T.Color(c));
 const positions=new Float32Array(max*14*3),colourData=new Float32Array(max*14*4),index=[];
 for(let i=0;i<max-1;i++)for(let s=0;s<7;s++){const a=i*14+s*2,b=a+14;index.push(a,b,a+1,a+1,b,b+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('color',new T.BufferAttribute(colourData,4).setUsage(T.DynamicDrawUsage));geometry.setIndex(index);geometry.setDrawRange(0,0);
 const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide}));mesh.name='Rainbow trail';mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=2;scene.add(mesh);
 let on=false;const points=[],pool=[],head={x:0,y:0,z:0,age:0};
 // 11 November 2026: update() allocates nothing any more. It used to build two literal arrays per vertex (several thousand a frame with the full trail), spread the points into a list and
 // make a fresh rear array, and the garbage collector hitched on the iPad while this favourite reward was on screen. Now it writes into the typed arrays by index and recycles the point objects.
 function clear(){while(points.length)pool.push(points.pop());geometry.setDrawRange(0,0);}
 function setOn(value){if(!!value===on)return;on=!!value;mesh.visible=on;clear();} // already on: kept as it is (a visit to KIWI applies the rewards again)
 function update(dt,pos,facing){
  if(!on)return;const h=Math.hypot(facing.x,facing.z)||1,fx=facing.x/h,fz=facing.z/h,rx=pos.x-fx*2.35,ry=pos.y-Math.max(-.6,Math.min(.6,facing.y/h))*2.35,rz=pos.z-fz*2.35; // facing.y/h: the slope, so the band lies on the road under the bumper
  let cut=0;for(let i=0;i<points.length;i++)points[i].age+=dt;while(cut<points.length&&points[cut].age>life)cut++;
  if(cut){for(let i=0;i<cut;i++)pool.push(points[i]);const m=points.length-cut;for(let i=0;i<m;i++)points[i]=points[i+cut];points.length=m;}
  const last=points.length?points[points.length-1]:null,gap=last?Math.hypot(rx-last.x,rz-last.z):Infinity;
  if(gap>8)clear(); // The car was moved (restart, recovery): start a new trail.
  if(gap>spacing){const p=pool.pop()||{x:0,y:0,z:0,age:0};p.x=rx;p.y=ry;p.z=rz;p.age=0;points.push(p);if(points.length>max-1)pool.push(points.shift());}
  const np=points.length,n=np?np+1:0;if(np){head.x=rx;head.y=ry;head.z=rz;}let along=0; // the points, then the live end at the bumper (head), as one list without copying
  for(let i=n-1;i>=0;i--){const p=i<np?points[i]:head,q=Math.min(n-1,i+1)<np?points[Math.min(n-1,i+1)]:head,o=points[Math.max(0,i-1)];if(i<n-1)along+=Math.hypot(q.x-p.x,q.z-p.z);
   let dx=q.x-o.x,dz=q.z-o.z;const l=Math.hypot(dx,dz);if(i===n-1||l<1e-4){dx=fx;dz=fz;}else{dx/=l;dz/=l;}
   // Fades out towards the tail, and in over the first metre and a half behind the bumper (by distance, not by how many points there are).
   const fade=Math.max(0,Math.min(1-p.age/life,1-along/length)),alpha=.85*fade*Math.min(1,(along+spacing)/(3*spacing));
   for(let s=0;s<7;s++)for(let e=0;e<2;e++){const k=i*14+s*2+e,offset=-width/2+(s+e)*width/7,c=colours[s],a=k*3,b=k*4;
    positions[a]=p.x-dz*offset;positions[a+1]=p.y+hover;positions[a+2]=p.z+dx*offset;colourData[b]=c.r;colourData[b+1]=c.g;colourData[b+2]=c.b;colourData[b+3]=alpha;}}
  geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;geometry.setDrawRange(0,along>.05?(n-1)*42:0); // nothing to see while the car stands and only the point laid just now is left
 }
 return {setOn,update,clear,mesh,points,isOn:()=>on};
}
