// Ludvig, a little boy who runs after the car (2 October 2026): unlocked by visiting him at Bøckmans veg 102, and on the start
// screen an alternative to the rainbow trail. He follows the car's own track a few metres behind it, so he takes the same bends and stays on the
// road; he runs with swinging arms and legs at the car's pace, catches up when the car stops, stands by its rear corner
// and waves. About 1.15 m tall; forward is −z and the ground is y = 0, as for the car and the cat.
export function createBoyModel(T){
 const group=new T.Group();group.name='Ludvig';
 const skin=new T.MeshStandardMaterial({color:'#f1c3a0',roughness:.8}),hair=new T.MeshStandardMaterial({color:'#b98a4e',roughness:.9});
 const shirt=new T.MeshStandardMaterial({color:'#2f7fd6',roughness:.85}),stripe=new T.MeshStandardMaterial({color:'#f6d34a',roughness:.85});
 const shorts=new T.MeshStandardMaterial({color:'#2c3e57',roughness:.9}),shoe=new T.MeshStandardMaterial({color:'#e8453c',roughness:.7}),dark=new T.MeshBasicMaterial({color:'#1d2226'});
 const sphere=new T.SphereGeometry(1,16,12),limb=new T.CylinderGeometry(1,.85,1,10),box=new T.BoxGeometry(1,1,1);
 function part(g,m,[x,y,z],[sx,sy,sz],parent){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;}
 const body=new T.Group();group.add(body);
 // Torso with a yellow stripe, shorts; head with hair, eyes and a smile.
 const torso=part(limb,shirt,[0,.72,0],[.17,.34,.12],body);part(limb,stripe,[0,.74,0],[.172,.06,.122],body);part(limb,shorts,[0,.5,0],[.165,.12,.115],body);
 const head=new T.Group();head.position.set(0,1.0,0);body.add(head);
 part(sphere,skin,[0,0,0],[.13,.14,.13],head);part(sphere,hair,[0,.05,.02],[.137,.11,.135],head);part(sphere,hair,[0,.02,-.07],[.12,.06,.08],head);
 for(const s of [-1,1]){part(sphere,dark,[s*.045,.005,-.12],[.017,.022,.01],head);part(sphere,skin,[s*.13,-.01,0],[.025,.035,.025],head);}
 part(box,dark,[0,-.055,-.122],[.05,.012,.008],head);
 // Legs from the hips and arms from the shoulders, each in a group that swings.
 const legs=[-1,1].map(s=>{const hip=new T.Group();hip.position.set(s*.075,.46,0);body.add(hip);
  part(limb,skin,[0,-.2,0],[.05,.4,.05],hip);part(box,shoe,[0,-.42,-.03],[.09,.07,.17],hip);return hip;});
 const arms=[-1,1].map(s=>{const sh=new T.Group();sh.position.set(s*.2,.88,0);body.add(sh);
  part(limb,shirt,[0,-.06,0],[.045,.12,.045],sh);part(limb,skin,[0,-.2,0],[.038,.18,.038],sh);part(sphere,skin,[0,-.31,0],[.04,.04,.04],sh);return sh;});
 let phase=0,dangling=false;
 // speed in m/s; wave 0..1 lifts the right arm and waves it (standing by the parked car).
 function update(dt,speed,time,wave=0){
  const run=Math.min(1,speed/2.5);phase+=dt*Math.min(16,4+speed*.9);dangling=false;
  const s=Math.sin(phase)*.9*run;legs[0].rotation.x=s;legs[1].rotation.x=-s;arms[0].rotation.x=-s*.9;arms[1].rotation.x=s*.9;
  arms[0].rotation.z=-.08;arms[1].rotation.z=.08;legs[0].rotation.z=legs[1].rotation.z=head.rotation.x=head.rotation.z=0;
  body.position.y=Math.abs(Math.cos(phase))*.06*run;body.rotation.x=-.18*run;torso.scale.y=.34+Math.sin(time*2.2)*.006*(1-run);
  head.rotation.y=Math.sin(time*.9)*.25*(1-run);
  if(wave>0){arms[1].rotation.x=-.2*wave;arms[1].rotation.z=2.6*wave+Math.sin(time*9)*.35*wave;}
 }
 // A simple ragdoll, for hanging in the T. rex's mouth (3 October 2026): each leg, arm and the head is a damped spring that tries to hang straight
 // down (dx, dz: the tilt of "down" in the body's frame), so they lag and flop when he swings. The legs still kick, the arms flail a little.
 const joints=[...legs,...arms,head].map(o=>({o,x:0,z:0,vx:0,vz:0}));
 function dangle(dt,time,dx,dz,kick=1){
  if(!dangling){dangling=true;for(const j of joints){j.x=j.o.rotation.x;j.z=j.o.rotation.z;j.vx=j.vz=0;}}
  phase+=dt*11;const s=Math.sin(phase)*.55*kick;body.position.y=0;body.rotation.x=0;head.rotation.y=0;torso.scale.y=.34;
  joints.forEach((j,i)=>{const leg=i<2,arm=i===2||i===3,side=i%2?1:-1,f=leg||arm?1:.6,lim=leg||arm?1.6:.6;
   const tx=dx*f+(leg?(i?-s:s):arm?Math.sin(time*6.1+i)*.25*kick:0),tz=dz*f+(arm?side*.35:0),k=leg?55:arm?40:90,c=leg?4.5:arm?3.2:9;
   j.vx+=(k*(tx-j.x)-c*j.vx)*dt;j.vz+=(k*(tz-j.z)-c*j.vz)*dt;j.x=Math.max(-lim,Math.min(lim,j.x+j.vx*dt));j.z=Math.max(-lim,Math.min(lim,j.z+j.vz*dt));
   j.o.rotation.x=j.x;j.o.rotation.z=j.z;});
 }
 update(0,0,0);
 return {group,update,dangle,legs,arms,head};
}

// The follower: a track of the car's path (a point every 0.4 m) and the boy that runs along it.
// createModel: what runs (Ludvig; the running duck of duck-runner.js is the same follower with another model).
// extra: metres further behind than the others keep (the duckling that follows the small duck, 7 October 2026), driving and standing.
export function createBoy({T,scene,createModel=createBoyModel,extra=0}){
 const model=createModel(T),group=model.group;group.visible=false;scene.add(group);
 const track=[],MAX=160,yaw=new T.Euler(0,0,0,'YXZ');let on=false,behind=6+extra,wave=0,run=0,lastX=null,lastZ=null,hanging=false;
 function clear(){track.length=0;behind=6+extra;wave=0;lastX=lastZ=null;hanging=false;}
 function setOn(value){if(!!value===on)return;on=!!value;group.visible=on;clear();} // already on: he keeps his place (a visit to KIWI applies the rewards again)
 // The point `d` metres back along the track from the car, and the direction there (towards the car).
 function along(d){let rest=d;for(let i=track.length-1;i>0;i--){const a=track[i-1],b=track[i],l=Math.hypot(b.x-a.x,b.z-a.z);if(l>=rest){const f=l>0?rest/l:0;return {x:b.x+(a.x-b.x)*f,y:b.y+(a.y-b.y)*f,z:b.z+(a.z-b.z)*f,dx:(b.x-a.x)/(l||1),dz:(b.z-a.z)/(l||1)};}rest-=l;}
  const a=track[0],b=track[1]||track[0],l=Math.hypot(b.x-a.x,b.z-a.z)||1;return {x:a.x,y:a.y,z:a.z,dx:(b.x-a.x)/l,dz:(b.z-a.z)/l};}
 // pos: the car (its ground is 8 cm under pos.y), facing: its direction, speed in m/s.
 function update(dt,pos,facing,speed,time,{held=false}={}){
  if(!on)return;const v=Math.abs(speed),gap=lastX===null?Infinity:Math.hypot(pos.x-lastX,pos.z-lastZ);
  if(gap>12)clear(); // the car was moved (a new trip, recovery): start again right behind it
  if(!track.length){const h=Math.hypot(facing.x,facing.z)||1;for(let k=12;k>=0;k--)track.push({x:pos.x-facing.x/h*k*.5,y:pos.y-.08,z:pos.z-facing.z/h*k*.5});}
  if(gap>.4||lastX===null){track.push({x:pos.x,y:pos.y-.08,z:pos.z});lastX=pos.x;lastZ=pos.z;if(track.length>MAX)track.shift();}
  if(held){behind=3.1;wave=0;return;} // in the T. rex's mouth (hold() places him); afterwards he runs on from right behind the car
  hanging=false;
  // Six metres behind while the car drives, three by its rear when it stops; he never falls further back than the track reaches.
  const want=v>.8?6+extra:3.1+extra;behind+=(want-behind)*Math.min(1,dt*(v>.8?.8:1.6));
  const p=along(Math.min(behind,Math.max(0,track.length*.4-.5)));
  const stopped=v<.3&&Math.abs(behind-3.1-extra)<.25;wave+=((stopped?1:0)-wave)*Math.min(1,dt*3);
  // Standing, he steps out beside the car's rear corner (right-hand side, towards the kerb) and turns to the car.
  const side=wave*1.1;group.position.set(p.x-p.dz*side,p.y,p.z+p.dx*side);
  yaw.set(0,Math.atan2(-p.dx,-p.dz)+wave*.6,0);group.quaternion.setFromEuler(yaw);
  // Running pace: the car's speed while it drives, a jog while he catches up.
  run+=((v>.8?v:Math.abs(want-behind)>.3?2.2:0)-run)*Math.min(1,dt*4);model.update(dt,run,time,wave);
 }
 // An easter egg (3 October 2026): driving as the T. rex with Ludvig running after it, the T. rex carries him by the back of his shirt in the
 // right corner of its mouth, its head turned a little to the right, so he dangles beside its face where the chase camera sees him, facing out,
 // his legs still running in the air. anchor and quat: the T. rex's grip (its world position and rotation).
 // A simple ragdoll: his body is a weight on a string from the scruff to his centre of mass (position-based: gravity, damping relative to the
 // mouth, then the string's length, in steps of at most 1/60 s), so he swings on when the T. rex stops, trails when it sets off and swings out
 // in bends; he cannot swing into its face or over the top. His limbs and head flop after the swing (createBoyModel's dangle).
 const SCRUFF=new T.Vector3(0,.86,.12),COM=new T.Vector3(0,.48,0),L=SCRUFF.distanceTo(COM),UP=new T.Vector3(0,1,0);
 const lean=new T.Quaternion().setFromUnitVectors(SCRUFF.clone().sub(COM).normalize(),UP); // he leans so the scruff is right over his centre of mass
 const fwd=new T.Vector3(),out=new T.Vector3(),mass=new T.Vector3(),vel=new T.Vector3(),prev=new T.Vector3(),pivot=new T.Vector3(),pivotVel=new T.Vector3(),at=new T.Vector3(),rel=new T.Vector3();
 const X=new T.Vector3(),Y=new T.Vector3(),Z=new T.Vector3(),basis=new T.Matrix4(),inverse=new T.Quaternion(),down=new T.Vector3();
 function hold(anchor,quat,dt,time){
  if(!on||dt<=0)return;fwd.set(0,0,-1).applyQuaternion(quat);out.set(-fwd.z,0,fwd.x).normalize(); // out: to the T. rex's right, away from its face
  if(!hanging||mass.distanceTo(anchor)>3){hanging=true;mass.copy(anchor);mass.y-=L;vel.set(0,0,0);pivot.copy(anchor);}
  pivotVel.subVectors(anchor,pivot).divideScalar(dt);
  const n=Math.min(6,Math.ceil(dt*60-1e-6)),h=dt/n; // the mouth moves on evenly through the steps
  for(let i=0;i<n;i++){at.copy(pivot).addScaledVector(pivotVel,h*(i+1));prev.copy(mass);vel.y-=9.81*h;vel.sub(pivotVel).multiplyScalar(1-1.5*h).add(pivotVel);mass.addScaledVector(vel,h);
   rel.subVectors(mass,at);const into=-rel.dot(out);if(into>.08)rel.addScaledVector(out,into-.08);if(rel.y>-.2*L)rel.y=-.2*L;
   rel.setLength(L);mass.addVectors(at,rel);vel.subVectors(mass,prev).divideScalar(h);}
  pivot.copy(anchor);
  Y.subVectors(anchor,mass).normalize();Z.copy(out).addScaledVector(Y,-Y.dot(out)).normalize().negate();X.crossVectors(Y,Z);
  group.quaternion.setFromRotationMatrix(basis.makeBasis(X,Y,Z)).multiply(lean);group.position.copy(anchor).sub(rel.copy(SCRUFF).applyQuaternion(group.quaternion));
  down.set(0,-1,0).applyQuaternion(inverse.copy(group.quaternion).invert());const dx=Math.atan2(-down.z,-down.y),dz=Math.atan2(down.x,-down.y);
  for(let i=0;i<n;i++)model.dangle(h,time,dx,dz);run=2.2;
 }
 return {setOn,update,clear,hold,group,track,model,isOn:()=>on};
}
