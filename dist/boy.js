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
 let phase=0;
 // speed in m/s; wave 0..1 lifts the right arm and waves it (standing by the parked car).
 function update(dt,speed,time,wave=0){
  const run=Math.min(1,speed/2.5);phase+=dt*Math.min(16,4+speed*.9);
  const s=Math.sin(phase)*.9*run;legs[0].rotation.x=s;legs[1].rotation.x=-s;arms[0].rotation.x=-s*.9;arms[1].rotation.x=s*.9;
  arms[0].rotation.z=-.08;arms[1].rotation.z=.08;
  body.position.y=Math.abs(Math.cos(phase))*.06*run;body.rotation.x=-.18*run;torso.scale.y=.34+Math.sin(time*2.2)*.006*(1-run);
  head.rotation.y=Math.sin(time*.9)*.25*(1-run);
  if(wave>0){arms[1].rotation.x=-.2*wave;arms[1].rotation.z=2.6*wave+Math.sin(time*9)*.35*wave;}
 }
 update(0,0,0);
 return {group,update};
}

// The follower: a track of the car's path (a point every 0.4 m) and the boy that runs along it.
export function createBoy({T,scene}){
 const model=createBoyModel(T),group=model.group;group.visible=false;scene.add(group);
 const track=[],MAX=160,yaw=new T.Euler(0,0,0,'YXZ');let on=false,behind=6,wave=0,run=0,lastX=null,lastZ=null;
 function clear(){track.length=0;behind=6;wave=0;lastX=lastZ=null;}
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
  // Six metres behind while the car drives, three by its rear when it stops; he never falls further back than the track reaches.
  const want=v>.8?6:3.1;behind+=(want-behind)*Math.min(1,dt*(v>.8?.8:1.6));
  const p=along(Math.min(behind,Math.max(0,track.length*.4-.5)));
  const stopped=v<.3&&Math.abs(behind-3.1)<.25;wave+=((stopped?1:0)-wave)*Math.min(1,dt*3);
  // Standing, he steps out beside the car's rear corner (right-hand side, towards the kerb) and turns to the car.
  const side=wave*1.1;group.position.set(p.x-p.dz*side,p.y,p.z+p.dx*side);
  yaw.set(0,Math.atan2(-p.dx,-p.dz)+wave*.6,0);group.quaternion.setFromEuler(yaw);
  // Running pace: the car's speed while it drives, a jog while he catches up.
  run+=((v>.8?v:Math.abs(want-behind)>.3?2.2:0)-run)*Math.min(1,dt*4);model.update(dt,run,time,wave);
 }
 // An easter egg (3 October 2026): driving as the T. rex with Ludvig running after it, the T. rex carries him by the back of his shirt in the
 // right corner of its mouth, its head turned a little to the right, so he dangles beside its face where the chase camera sees him: facing out,
 // swinging, still running with his legs in the air. anchor and quat: the T. rex's grip (its world position and rotation).
 const fwd=new T.Vector3(),scruff=new T.Vector3();
 function hold(anchor,quat,dt,time){
  if(!on)return;fwd.set(0,0,-1).applyQuaternion(quat);
  yaw.set(Math.sin(time*5.3)*.1,Math.atan2(-fwd.x,-fwd.z)-Math.PI/2,Math.sin(time*3.1)*.12);group.quaternion.setFromEuler(yaw);
  scruff.set(0,.86,.12).applyQuaternion(group.quaternion);group.position.copy(anchor).sub(scruff);
  run+=(9-run)*Math.min(1,dt*4);model.update(dt,run,time,0);
 }
 return {setOn,update,clear,hold,group,track,isOn:()=>on};
}
