// Arcade driving: body heading and travel direction separate while drifting.
// carHeight(x,z) is where the car sits: on the drawn road, or on the terrain off it.
export function createFreeDrive(data,carHeight){
 const grid=new Map(),cell=32,car={x:0,z:0,yaw:0,course:0,speed:0,drifting:false};
 for(const b of data.buildings){const p=b.p,minX=Math.min(...p.map(v=>v[0]))-2,maxX=Math.max(...p.map(v=>v[0]))+2,minZ=Math.min(...p.map(v=>v[1]))-2,maxZ=Math.max(...p.map(v=>v[1]))+2;for(let x=Math.floor(minX/cell);x<=Math.floor(maxX/cell);x++)for(let z=Math.floor(minZ/cell);z<=Math.floor(maxZ/cell);z++){const k=x+','+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(p);}}
 function blocked(x,z){const [a,b,c,d]=data.bounds;if(x<a+5||x>c-5||z<b+5||z>d-5)return true;for(const p of grid.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [ax,az]=p[j],[bx,bz]=p[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));if(Math.hypot(x-ax-t*dx,z-az-t*dz)<1.15)return true;}if(inside)return true;}return false;}
 const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function reset(x,z,yaw,speed=0){Object.assign(car,{x,z,yaw,course:yaw,speed,drifting:false});}
 function step(dt,input){let distance=0;const n=Math.max(1,Math.ceil(dt/.012));for(let i=0;i<n;i++){const t=dt/n,steer=Number(!!input.right)-Number(!!input.left);car.drifting=!!input.drift&&car.speed>5;
  car.speed=Math.max(0,Math.min(90/3.6,car.speed+(input.brake?-22:car.drifting?4:8)*t));
  car.yaw=wrap(car.yaw+steer*(car.drifting?1.55:1.15/(1+car.speed/40))*Math.min(1,car.speed/4)*t);
  car.course=wrap(car.course+wrap(car.yaw-car.course)*(1-Math.exp(-(car.drifting?1.15:11)*t)));
  const dx=Math.sin(car.course)*car.speed*t,dz=-Math.cos(car.course)*car.speed*t,nx=car.x+dx,nz=car.z+dz;
  if(blocked(nx,nz)){car.speed=0;car.drifting=false;break;}car.x=nx;car.z=nz;distance+=Math.hypot(dx,dz);
 }return distance;}
 function recover(){let best=null;for(const road of data.roads)for(let i=1;i<road.p.length;i++){const a=road.p[i-1],b=road.p[i],dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;if(!l)continue;const t=Math.max(0,Math.min(1,((car.x-a[0])*dx+(car.z-a[1])*dz)/l)),x=a[0]+t*dx,z=a[1]+t*dz,dist=Math.hypot(x-car.x,z-car.z);let yaw=Math.atan2(dx,-dz);if(Math.cos(yaw-car.yaw)<0)yaw=wrap(yaw+Math.PI);if((!best||dist<best.dist)&&!blocked(x,z))best={x,z,dist,yaw};}if(best)reset(best.x,best.z,best.yaw);return !!best;}
 return {car,reset,step,recover,blocked,get altitude(){return carHeight(car.x,car.z);}};
}
