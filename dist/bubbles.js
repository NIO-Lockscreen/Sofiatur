// Soap bubbles behind the car (the reward for the ninth trip, 3 October 2026; on the start screen an alternative to the rainbow trail
// and Ludvig). Bubbles are blown from the back of the car, drift up and sideways in the wind, wobble, and pop after a few seconds.
// One instanced mesh of see-through, slightly shiny spheres, so they cost one draw call.
export function createBubbles({T,scene,max=56,rate=9}){
 const material=new T.MeshStandardMaterial({color:'#ffffff',transparent:true,opacity:.5,roughness:.05,metalness:.2,emissive:'#d8ecff',emissiveIntensity:.35,depthWrite:false});
 // each bubble a pale rainbow tint, as soap film shimmers
 const TINTS=['#ffd6ec','#d6ecff','#e6dcff','#d8ffe8','#fff4cc'].map(c=>new T.Color(c));
 const mesh=new T.InstancedMesh(new T.SphereGeometry(1,14,10),material,max);for(let i=0;i<max;i++)mesh.setColorAt(i,TINTS[i%TINTS.length]);mesh.name='Såpebobler';mesh.frustumCulled=false;mesh.visible=false;mesh.count=0;mesh.renderOrder=2;scene.add(mesh);
 const bubbles=[],m=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3();let on=false,carry=0,seed=1;
 const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 function clear(){bubbles.length=0;mesh.count=0;carry=0;}
 function setOn(value){if(!!value===on)return;on=!!value;mesh.visible=on;clear();} // already on: kept as it is (a visit to KIWI applies the rewards again)
 function update(dt,pos,facing){
  if(!on)return;const h=Math.hypot(facing.x,facing.z)||1,fx=facing.x/h,fz=facing.z/h;
  carry+=dt*rate;while(carry>=1&&bubbles.length<max){carry--;const side=(rnd()-.5)*1.4;
   bubbles.push({x:pos.x-fx*2.4-fz*side,y:pos.y+.6+rnd()*.5,z:pos.z-fz*2.4+fx*side,vx:-fx*(.5+rnd())+(rnd()-.5)*.8,vy:.5+rnd()*.7,vz:-fz*(.5+rnd())+(rnd()-.5)*.8,r:.22+rnd()*.3,age:0,life:2.2+rnd()*2.2,ph:rnd()*6});}
  if(carry>=1)carry=0;
  let n=0;for(let i=bubbles.length-1;i>=0;i--){const b=bubbles[i];b.age+=dt;if(b.age>b.life){bubbles.splice(i,1);continue;}
   b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.vy*=1-.15*dt;b.vx*=1-.4*dt;b.vz*=1-.4*dt;
   // grows a little, wobbles, and pops (shrinks fast) at the end
   const pop=b.age>b.life-.12?Math.max(0,(b.life-b.age)/.12):1,r=b.r*(1+.35*b.age/b.life)*pop,w=1+.08*Math.sin(b.age*9+b.ph);
   p.set(b.x+Math.sin(b.age*2+b.ph)*.15,b.y,b.z);s.set(r*w,r/w,r*w);m.compose(p,q,s);mesh.setMatrixAt(n++,m);}
  mesh.count=n;mesh.instanceMatrix.needsUpdate=true;
 }
 return {setOn,update,clear,mesh,bubbles,isOn:()=>on};
}
