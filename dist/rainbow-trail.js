// Rainbow trail (a reward after the second trip to the kindergarten): a band of seven stripes hovering over the
// road behind the car. Points are laid down from the rear bumper as the car moves and fade with age and distance,
// so the trail shrinks away when the car stops.
export function createRainbowTrail({T,scene,max=180,life=2.8,length=55,width=1.5,spacing=.6,hover=.3}){
 const colours=['#ff4b4b','#ff9b3d','#ffd94a','#5ccf66','#41a7f4','#5b6cf0','#a65fe6'].map(c=>new T.Color(c));
 const positions=new Float32Array(max*14*3),colourData=new Float32Array(max*14*4),index=[];
 for(let i=0;i<max-1;i++)for(let s=0;s<7;s++){const a=i*14+s*2,b=a+14;index.push(a,b,a+1,a+1,b,b+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('color',new T.BufferAttribute(colourData,4).setUsage(T.DynamicDrawUsage));geometry.setIndex(index);geometry.setDrawRange(0,0);
 const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide}));mesh.name='Rainbow trail';mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=2;scene.add(mesh);
 let on=false;const points=[];
 function clear(){points.length=0;geometry.setDrawRange(0,0);}
 function setOn(value){if(!!value===on)return;on=!!value;mesh.visible=on;clear();} // already on: kept as it is (a visit to KIWI applies the rewards again)
 function update(dt,pos,facing){
  if(!on)return;const h=Math.hypot(facing.x,facing.z)||1,fx=facing.x/h,fz=facing.z/h,rear=[pos.x-fx*2.35,pos.y,pos.z-fz*2.35];
  for(const p of points)p.age+=dt;while(points.length&&points[0].age>life)points.shift();
  const last=points.at(-1),gap=last?Math.hypot(rear[0]-last.x,rear[2]-last.z):Infinity;
  if(gap>8)points.length=0; // The car was moved (restart, recovery): start a new trail.
  if(gap>spacing){points.push({x:rear[0],y:rear[1],z:rear[2],age:0});if(points.length>max)points.shift();}
  const n=points.length;let along=0;
  for(let i=n-1;i>=0;i--){const p=points[i],q=points[Math.min(n-1,i+1)],o=points[Math.max(0,i-1)];if(i<n-1)along+=Math.hypot(q.x-p.x,q.z-p.z);
   let dx=q.x-o.x,dz=q.z-o.z;const l=Math.hypot(dx,dz);if(l<1e-4){dx=fx;dz=fz;}else{dx/=l;dz/=l;}
   // Fades out towards the tail, and in over the first few points behind the bumper.
   const fade=Math.max(0,Math.min(1-p.age/life,1-along/length)),alpha=.85*fade*Math.min(1,(n-i)/3);
   for(let s=0;s<7;s++)for(let e=0;e<2;e++){const k=i*14+s*2+e,offset=-width/2+(s+e)*width/7,c=colours[s];
    positions.set([p.x-dz*offset,p.y+hover,p.z+dx*offset],k*3);colourData.set([c.r,c.g,c.b,alpha],k*4);}}
  geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;geometry.setDrawRange(0,Math.max(0,n-1)*42);
 }
 return {setOn,update,clear,mesh,points,isOn:()=>on};
}
