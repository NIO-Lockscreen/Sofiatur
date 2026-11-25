// Friends in the house (25 November 2026). The user: if Ludvig runs after the car, he comes in with Sofia at home, and so does the little yellow duckling;
// both join in jumping and playing on the bed, and with a friend along it is always jumping (game.js); you steer Sofia and Ludvig copies her; he has PEG
// too; at a meal Ludvig sits beside her and the duckling sits on the table. Visiting Ludvig, they eat at his place (inside.js, place 'ludvig').
// Ludvig is boy.js's model (1.15 m) and the duckling duck-runner.js's, at FRIEND.duckSize in the room (about 27 cm). What they do, each frame (update):
// - Walking about, they follow in her footsteps (a trail of where she has walked, so they go round the table the way she did): Ludvig 0.8 m behind her, the
//   duckling half a metre behind him (or her). They keep half a metre from her and step aside if she walks at them. Standing, they face the way she faces,
//   and they wave (the duckling flaps) when she waves.
// - At the table: Ludvig has his own chair round the table to her right, his own bowl, spoon (in his left hand) and glass. He sits down when she does,
//   takes a spoonful a moment after each of hers, drinks when she drinks, pats his tummy when she is full and gets up with her. The duckling flutters up
//   onto the table and sits there for the meal (with the spoon or PEG), pecking when they eat and flapping when they are full.
// - With PEG: his backpack (the same as hers, in green) stands on the floor beside hers. With her he puts it on, clicks his tube onto the button on his
//   tummy, turns to show it, his pump runs and blinks with hers, and he dances a moment after she does.
// - On the bed: while she pulls the bed out they wait beside it; then they climb up and jump with her, a moment after each of her bounces: Ludvig beside her
//   at the head end, his arms up, laughing, spinning on the same bounce as she does, the duckling with small hops at the foot end. Then they hop down.
import {createBoyModel} from './boy.js';
import {createDucklingModel} from './duck-runner.js';
import {MEAL,TIME,BITE,DRINK,BITES,FOODS,meshKit,aimArm,createPegBag,createPegTube,pumpLight} from './meal.js';

const ease=k=>k*k*(3-2*k),mix=(a,b,k)=>a+(b-a)*k,turn=(from,to,k)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*k,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const towards=(fx,fz,tx,tz)=>Math.atan2(-(tx-fx),-(tz-fz)); // the yaw that looks from (fx, fz) at (tx, tz); forward is −z
// Ludvig's places: his chair round the table from hers (facing the middle of the table), where he stands before he hops onto it, his backpack on the floor
// beside hers and where he stands to put it on; by the sofa bed, where he waits while she pulls it out and where he jumps (at the head end, beside her).
// The duckling: where it waits by the bed and jumps (at the foot end), where it sits on the table, and where it hops down to after a meal.
export const FRIEND={chair:{x:1.6,z:1.98},side:{x:1.34,z:2.46},bag:{x:3.55,z:2.6},stand:{x:3.62,z:2.0},bedWait:{x:-2.22,z:.95},bedJump:{x:-3.0,z:1.0},
 duckWait:{x:-2.12,z:2.25},duckJump:{x:-3.05,z:2.3},table:{x:2.45,z:2.42,yaw:Math.PI+.35},duckDown:{x:1.2,z:2.75},duckSize:.6,lag:.8,duckLag:.5,gap:.5,delay:.35,jumpDelay:.14};
FRIEND.yaw=towards(FRIEND.chair.x,FRIEND.chair.z,MEAL.table.x,MEAL.table.z);
// Ludvig's body (boy.js): his shoulders, his mouth, how far his hand is from his shoulder, his hips; and how low he sits on his chair.
const BOY={shoulders:[[-.2,.88,0],[.2,.88,0]],mouth:[0,.945,-.125],arm:.31,seatY:MEAL.seat-.44};
// His bowl and glass in his own coordinates as he sits (he faces −z): the bowl in front of him, the glass by his right hand. In the room: atChair(x, z).
const BOWL_AT=[0,-.36],GLASS_AT=[.17,-.33];
function atChair(lx,lz){const c=Math.cos(FRIEND.yaw),s=Math.sin(FRIEND.yaw);return {x:FRIEND.chair.x+lx*c+lz*s,z:FRIEND.chair.z-lx*s+lz*c};}
export const FRIEND_BOWL=atChair(...BOWL_AT),FRIEND_GLASS=atChair(...GLASS_AT);

export function createFriends({T,scene,girl,meal,bed,JUMP,route,outside}){
 const {std,add,box,cyl,ball,rod}=meshKit(T);
 const ludvig=createBoyModel(T),duck=createDucklingModel(T);ludvig.group.rotation.order='YXZ';scene.add(ludvig.group,duck.group);duck.group.scale.setScalar(FRIEND.duckSize);
 const body=ludvig.group.children[0],things=new T.Group();scene.add(things); // things: his chair, bowl, spoon, glass and backpack, there only while he is
 // ---- His chair (blue), turned to the table ----
 const {seat}=MEAL,chair=new T.Group();chair.position.set(FRIEND.chair.x,0,FRIEND.chair.z);chair.rotation.y=FRIEND.yaw;things.add(chair);
 {const blue=std('#6fb2e8'),blue2=std('#4f8fc8');box(.4,.04,.38,blue,0,seat-.02,0,chair);box(.4,.34,.04,blue,0,seat+.19,.19,chair);box(.3,.08,.045,std('#cfe7fa'),0,seat+.3,.19,chair);
  for(const [x,z] of [[-.17,-.16],[.17,-.16],[-.17,.16],[.17,.16]])cyl(.02,.02,seat-.04,blue2,x,(seat-.04)/2,z,chair);}
 // ---- His bowl (with the same food as hers), his spoon and his glass ----
 const tb=MEAL.table,bowl=new T.Group();bowl.position.set(FRIEND_BOWL.x,tb.h,FRIEND_BOWL.z);things.add(bowl);cyl(.1,.07,.07,std('#9fd36b',.5),0,.035,0,bowl);cyl(.105,.105,.012,std('#c4ea98',.5),0,.07,0,bowl);
 cyl(.09,.09,.002,std('#78b84a',.5),0,.077,0,bowl,32);const food=add(new T.SphereGeometry(1,24,10,0,Math.PI*2,0,Math.PI/2),std('#efe0bb'),0,.077,0,bowl),dots=[0,1,2,3,4].map(()=>ball(.014,std('#4b5fae'),0,.077,0,bowl));food.visible=false;
 const spoon=new T.Group();things.add(spoon);{const silver=std('#c9ced8',.35);cyl(.006,.007,.11,silver,0,.055,0,spoon,8);ball(1,silver,0,.125,0,spoon).scale.set(.02,.026,.008);}
 const bite=ball(1,std('#efe0bb'),0,.128,-.008,spoon);bite.scale.set(.016,.018,.012);
 const Y=new T.Vector3(0,1,0),restSpoon=()=>{spoon.position.set(FRIEND_BOWL.x-.1,tb.h+.008,FRIEND_BOWL.z+.13);spoon.quaternion.setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2);spoon.rotateOnWorldAxis(Y,FRIEND.yaw+1.2);bite.visible=false;};restSpoon();
 const GLASS_H=.09,glassAt=new T.Vector3(FRIEND_GLASS.x,tb.h+GLASS_H/2,FRIEND_GLASS.z),glass=new T.Group();glass.position.copy(glassAt);things.add(glass);
 cyl(.04,.035,GLASS_H,std('#8fd3ff'),0,0,0,glass);cyl(.033,.033,.003,std('#9fd8f0',.3),0,GLASS_H/2+.001,0,glass);
 // ---- His PEG backpack: the same as hers (meal.js), green, on the floor beside hers; on his back the straps and the tube round to the button on his tummy ----
 const pack=createPegBag(T,{front:'#3fa34d',pocket:'#368f42',sides:'#2d6b8f',sidePocket:'#245673',loops:'#f4d22a',cord:'#e8742c'});things.add(pack.bag);
 const worn=new T.Group();body.add(worn);worn.visible=false;{const black=std('#1c1c22');for(const s of [-1,1]){rod([s*.1,.89,.15],[s*.13,.92,.01],.014,black,worn);rod([s*.13,.92,.01],[s*.12,.7,-.12],.014,black,worn);}}
 const tube=createPegTube(T,body,new T.CubicBezierCurve3(new T.Vector3(.13,.62,.16),new T.Vector3(.33,.48,.05),new T.Vector3(.24,.52,-.2),new T.Vector3(.045,.66,-.115)));
 // ---- Taps: his chair is the table's (a meal with the spoon), his backpack a meal with PEG, his glass a drink (inside.js pick, only while he is in) ----
 const hitMat=new T.MeshBasicMaterial({color:'#ff00ff'}),hits=[[box(.5,.66,.5,hitMat,FRIEND.chair.x,.33,FRIEND.chair.z,things),'table'],[box(.36,.5,.3,hitMat,FRIEND.bag.x,.25,FRIEND.bag.z,things),'bag'],[box(.17,.2,.17,hitMat,glassAt.x,tb.h+.08,glassAt.z,things),'glass']]
  .map(([o,kind])=>{o.visible=false;o.userData.kind=kind;o.userData.friend=true;return o;});
 // Where nobody walks while he is in: his chair (by the table) and his backpack.
 const obstacles=[{x0:FRIEND.chair.x-.26,x1:FRIEND.chair.x+.24,z0:FRIEND.chair.z-.26,z1:FRIEND.chair.z+.24},{x0:FRIEND.bag.x-.3,x1:FRIEND.bag.x+.3,z0:FRIEND.bag.z-.25,z1:FRIEND.bag.z+.3}];

 // ---- Who is in, and where they are ----
 const with_={ludvig:false,duck:false};
 const L={x:0,z:0,y:0,yaw:Math.PI,seat:0,from:null,bite:-1,drink:-1,dance:-1,bites:0,queue:[],jump:null,wave:0}; // seat 0 standing .. 1 on his chair; jump: his own clock on the bed
 const D={x:0,z:0,y:0,yaw:Math.PI,table:0,from:null,peck:-1,jump:null};                                       // table 0 on the floor .. 1 sitting on the table
 const trail=[];let clock=0,last={bite:-1,drink:-1,dance:-1,step:'',kind:null};
 function enter(company,sofia){with_.ludvig=!!company?.ludvig;with_.duck=!!company?.duck;ludvig.group.visible=things.visible=with_.ludvig;duck.group.visible=with_.duck;
  // they come in beside her, in a row behind her to her right, facing the room as she does; the trail runs through them to her, so they follow her from there
  const yaw=sofia.yaw,dir={x:-.95,z:-.15};Object.assign(L,{x:sofia.x+dir.x*FRIEND.lag,z:sofia.z+dir.z*FRIEND.lag,y:0,yaw,seat:0,from:null,bite:-1,drink:-1,dance:-1,bites:0,queue:[],jump:null,wave:0});
  const behind=with_.ludvig?FRIEND.lag+FRIEND.duckLag:FRIEND.duckLag+.05;Object.assign(D,{x:sofia.x+dir.x*behind,z:sofia.z+dir.z*behind,y:0,yaw,table:0,from:null,peck:-1,jump:null});
  trail.length=0;const pts=[D,with_.ludvig?L:null,sofia].filter(Boolean);for(const p of pts)record(p.x,p.z,true);
  last={bite:-1,drink:-1,dance:-1,step:'',kind:null};restSpoon();food.visible=false;for(const d of dots)d.visible=false;glass.position.copy(glassAt);glass.quaternion.identity();
  for(const l of duck.legs)l.visible=true;ludvig.setLaugh(false);ludvig.update(0,0,0);place();ludvig.group.rotation.x=0;duck.update(0,0,0);duck.group.position.set(D.x,0,D.z);duck.group.rotation.y=D.yaw;dressPack(0);}
 // Her footsteps: a point every 5 cm (with the path length to it), the last 20 m.
 function record(x,z,force=false){const p=trail.at(-1);if(!p){trail.push({x,z,s:0});return;}const d=Math.hypot(x-p.x,z-p.z);if(d<.05&&!force)return;if(d<1e-6)return;trail.push({x,z,s:p.s+d});if(trail.length>400)trail.shift();}
 // The point `back` metres of path behind her (she is the live end of the trail).
 function behindHer(back,sx,sz){const end=trail.at(-1),total=end.s+Math.hypot(sx-end.x,sz-end.z),s=Math.max(trail[0].s,total-back);let i=trail.length-1,b={x:sx,z:sz,s:total},a=trail[i];
  while(a.s>s&&i>0){b=a;a=trail[--i];}const l=b.s-a.s,f=l>1e-6?clamp((s-a.s)/l,0,1):1;return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};}
 // One step towards (x, z), round the table and the backpacks (inside.js route); returns how far it went.
 function step(f,x,z,dt,speed){const w=route(f.x,f.z,x,z)[0]||{x,z},dx=w.x-f.x,dz=w.z-f.z,d=Math.hypot(dx,dz);if(d<1e-4)return 0;const s=Math.min(d,speed*dt);f.x+=dx/d*s;f.z+=dz/d*s;
  if(s>1e-4)f.yaw=turn(f.yaw,Math.atan2(-dx,-dz),Math.min(1,dt*10));return s;}
 const far=(f,p)=>Math.hypot(f.x-p.x,f.z-p.z);
 // Walking about: after her, the given distance back along her footsteps, a little faster than she walks when they have fallen behind, keeping clear of her
 // and of each other. Standing, they turn the way she faces. Returns their walking speed (for the legs).
 function follow(f,back,dt,sofia,gap,others){const t=behindHer(back,sofia.x,sofia.z),d=far(f,t),x0=f.x,z0=f.z,near=far(f,sofia);let moved=0;
  if(d>.03){moved=step(f,t.x,t.z,dt,d>1?2.4:d>.3?1.8:1.2);if(near<gap+.3&&far(f,sofia)<near){f.x=x0;f.z=z0;moved=0;}} // never towards her once close (she may be walking back along her own footsteps)
  // Out of her way: in front of her as she walks, they step aside (away from her line); otherwise just a little further off. And apart from each other.
  const hx=-Math.sin(sofia.yaw),hz=-Math.cos(sofia.yaw);
  for(const [o,g] of [[sofia,gap],...others]){let dx=f.x-o.x,dz=f.z-o.z;const e=Math.hypot(dx,dz);if(!(e<g&&e>1e-4))continue;dx/=e;dz/=e;
   if(o===sofia&&sofia.moving&&dx*hx+dz*hz>0){const side=Math.sign(dx*hz-dz*hx)||1;dx=dx*.4+hz*side;dz=dz*.4-hx*side;const l=Math.hypot(dx,dz);dx/=l;dz/=l;}
   const k=Math.min(g-e+.05,dt*3.5);f.x+=dx*k;f.z+=dz*k;moved+=k*.5;}
  [f.x,f.z]=outside(clamp(f.x,-2.95,3.75),clamp(f.z,.3,2.97)); // the floor clear of the sofa, the podium and the plant (her footsteps go round the table's corners, out to 2.94)
  if(moved<dt*.15)f.yaw=turn(f.yaw,sofia.yaw,Math.min(1,dt*5));return moved/Math.max(dt,1e-4);}
 // A hop from where it stands to (x, y, z) over k (0..1), with an arc.
 const hop=(f,a,b,k,h)=>{const e=ease(k);f.x=mix(a.x,b.x,e);f.z=mix(a.z,b.z,e);f.y=mix(a.y||0,b.y||0,e)+Math.sin(k*Math.PI)*h;};

 // ---- Ludvig at the table, with the spoon: his bites and drinks come a moment after hers ----
 const SH=BOY.shoulders,MOUTH=BOY.mouth,BOWL=[BOWL_AT[0],tb.h+.05-BOY.seatY,BOWL_AT[1]],GLASS={table:[GLASS_AT[0],tb.h+GLASS_H/2-BOY.seatY,GLASS_AT[1]],mouth:[0,MOUTH[1]-.02,MOUTH[2]-.065]};
 const AIM_MOUTH=[-.03,.905,-.255],REST=[-.05,-.2,-.38],va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3(),hand=new T.Vector3(),tilt=new T.Quaternion(),X=new T.Vector3(1,0,0);
 const lift=b=>b<0?0:b<.4?ease(b/.4):b<.6?1:b<1?1-ease((b-.6)/.4):0;
 function seatedPose(time){const g=ludvig.group,[l,r]=ludvig.arms;g.position.set(FRIEND.chair.x,BOY.seatY,FRIEND.chair.z);g.rotation.set(0,FRIEND.yaw,0);body.position.y=0;body.rotation.x=0;
  for(const leg of ludvig.legs)leg.rotation.x=1.35+Math.sin(time*2.4+(leg===ludvig.legs[0]?1:3))*.08;
  const full=meal.st.kind==='spoon'&&meal.st.step==='full'&&L.bite<0&&L.drink<0;
  if(full){const pat=Math.abs(Math.sin(time*9))*.04;aimArm(l,.12,-.15+pat,-.15);aimArm(r,-.12,-.15+pat,-.15);ludvig.setLaugh(true);restSpoon();return;}
  // the spoon in his left hand, from the bowl to his mouth and back
  const b=L.bite,k=lift(b),scoop=b>=0&&b<.15?Math.sin(b/.15*Math.PI)*.04:0;
  const to=[mix(BOWL[0],AIM_MOUTH[0],k),mix(BOWL[1]-scoop,AIM_MOUTH[1],k),mix(BOWL[2],AIM_MOUTH[2],k)];aimArm(l,to[0]-SH[0][0],to[1]-SH[0][1],to[2]-SH[0][2]);
  g.updateMatrixWorld(true);l.localToWorld(va.set(0,-.33,0));const target=vc.set(mix(BOWL[0],MOUTH[0],k),mix(BOWL[1]-.03,MOUTH[1],k),mix(BOWL[2],MOUTH[2],k));body.localToWorld(target);
  spoon.position.copy(va);spoon.quaternion.setFromUnitVectors(Y,vb.copy(target).sub(va).normalize());bite.visible=b>=.1&&b<.52;
  // the glass in his right hand: he reaches for it, lifts it to his mouth, tips it, and puts it back
  const d=L.drink,up=d<.35?0:d<.8?ease((d-.35)/.45):d<1.4?1:d<1.8?1-ease((d-1.4)/.4):0,held=d>=.35&&d<1.8,free=d<0?1:d<.35?1-ease(d/.35):d>=1.8?ease(Math.min(1,(d-1.8)/.2)):0;
  const c=GLASS.table.map((v,i)=>mix(v,GLASS.mouth[i],up)),grip=[.05,0,0],want=[c[0]+grip[0]-SH[1][0],c[1]-SH[1][1],c[2]-SH[1][2]],len=Math.hypot(...want);
  const dir=want.map((v,i)=>mix(v/len,REST[i]*(i?1:-1)/Math.hypot(...REST),free));aimArm(r,...dir);r.scale.y=mix(clamp(len/BOY.arm,.7,1.25),1,free); // shorter as if bent at the elbow, longer to reach
  if(held){g.updateMatrixWorld(true);r.localToWorld(hand.set(0,-BOY.arm,0));body.worldToLocal(hand);hand.x-=grip[0];glass.position.copy(body.localToWorld(hand));body.getWorldQuaternion(glass.quaternion);glass.quaternion.multiply(tilt.setFromAxisAngle(X,up*.8));}
  else{glass.position.copy(glassAt);glass.quaternion.identity();}
  ludvig.setLaugh(b>=.36&&b<.58||d>=.7&&d<1.45);}
 // ---- Ludvig with his backpack: the same steps as hers, at the same moments (her meal's st), his dance a moment after hers ----
 const bagAt=new T.Vector3(),bagQ=new T.Quaternion(),floorQ=new T.Quaternion();
 function dressPack(time){const st=meal.st,k=st.kind,s=st.step,c=Math.min(1,st.s/(TIME[s]??Infinity));
  const wearing=k==='peg'&&['plug','ready','pump','beep','unplug'].includes(s),carry=k==='peg'&&(s==='pick'||s==='drop')?(s==='pick'?ease(clamp((c-.25)/.6,0,1)):1-ease(clamp((c-.1)/.6,0,1))):wearing?1:0;
  worn.visible=carry>=1;pack.handle.visible=carry<.5;
  if(carry<=0){pack.bag.position.set(FRIEND.bag.x,0,FRIEND.bag.z);pack.bag.quaternion.identity();}
  else{ludvig.group.updateMatrixWorld(true);body.localToWorld(bagAt.set(0,.52,.19));body.getWorldQuaternion(bagQ);if(carry>=1){pack.bag.position.copy(bagAt);pack.bag.quaternion.copy(bagQ);}
   else{pack.bag.position.set(mix(FRIEND.bag.x,bagAt.x,carry),mix(0,bagAt.y,carry)+Math.sin(carry*Math.PI)*.35,mix(FRIEND.bag.z,bagAt.z,carry));pack.bag.quaternion.copy(floorQ.identity()).slerp(bagQ,carry);}}
  pack.light.color.set(k==='peg'?pumpLight(s,time):'#3a3a40');tube.dress(k==='peg'?(s==='plug'?c:s==='unplug'?1-c:['ready','pump','beep'].includes(s)?1:0):0,k==='peg'&&s==='pump',time);}
 const TO_BAG=towards(FRIEND.stand.x,FRIEND.stand.z,FRIEND.bag.x,FRIEND.bag.z);
 function pegYaw(){const st=meal.st,s=st.step,c=st.s;let yaw=TO_BAG;
  if(s==='ready')yaw=turn(TO_BAG,.55,ease(Math.min(1,c/.7)));if(s==='pump')yaw=turn(.55,TO_BAG,ease(Math.min(1,c/.7)));return yaw;}

 // ---- On the bed: his own clock, a moment behind hers; the same climb, bounces, spin and climb down, at his place beside her ----
 function bedPose(from,s,at,wait,heights,spin){const c0=JUMP.climb,off=JUMP.off; // facing the bed while they wait by it and after they hop down (π/2)
  if(s<c0){const c=ease(s/c0);return {x:mix(from.x,at.x,c),y:JUMP.y*c+Math.sin(c*Math.PI)*.4*heights.k,z:mix(from.z,at.z,c),yaw:turn(from.yaw,JUMP.yaw,c),arms:c,air:true};}
  if(s<off){const n=Math.floor((s-c0)/JUMP.period),q=(s-c0)/JUMP.period-n;if(q<JUMP.press)return {x:at.x,y:JUMP.y-.02*Math.sin(q/JUMP.press*Math.PI),z:at.z,yaw:JUMP.yaw,arms:1,air:false};
   const a=(q-JUMP.press)/(1-JUMP.press);return {x:at.x,y:JUMP.y+JUMP.heights[n]*heights.k*4*a*(1-a),z:at.z,yaw:JUMP.yaw+(spin&&n===JUMP.spin?ease(a)*Math.PI*2:0),arms:1,air:true,lean:Math.sin(a*Math.PI*2)*.08};}
  const c=ease(Math.min(1,(s-off)/JUMP.down));return {x:mix(at.x,wait.x,c),y:JUMP.y*(1-c)+Math.sin(c*Math.PI)*.35*heights.k,z:mix(at.z,wait.z,c),yaw:turn(JUMP.yaw,Math.PI/2,c),arms:1-c,air:c<1};}
 // The jump starts for them when hers does (bed.play from 0), and runs its own length after that, so they finish their last bounce and climb down.
 function jumpClock(f,dt,delay){if(bed.play>=0&&!f.jump)f.jump={s:-delay,from:{x:f.x,z:f.z,yaw:f.yaw}};if(!f.jump)return null;f.jump.s+=dt;if(f.jump.s>=JUMP.end){f.jump=null;return null;}return f.jump.s;}

 // ---- Every frame, after Sofia has been posed: sofia {x, z, yaw, wave, free} is where she stands on the floor ----
 function update(dt,time,sofia){if(!with_.ludvig&&!with_.duck)return;clock+=dt;if(sofia.free)record(sofia.x,sofia.z);
  const st=meal.st,kind=st.kind;
  // what she just did, for him to copy a moment later
  if(kind==='spoon'){if(last.bite<0&&st.bite>=0)L.queue.push({at:clock+FRIEND.delay,what:'bite'});if(last.drink<0&&st.drink>=0)L.queue.push({at:clock+FRIEND.delay,what:'drink'});}
  if(kind==='peg'&&last.dance<0&&st.dance>=0)L.queue.push({at:clock+FRIEND.delay,what:'dance'});
  if((st.bite>=0&&last.bite<0)||(kind==='spoon'&&st.step==='eat'&&last.step!=='eat'))D.peck=0;
  if(!kind){L.queue.length=0;L.bite=L.drink=-1;if(last.kind)L.bites=0;}
  if(kind==='spoon'&&last.kind!=='spoon')L.bites=0;
  last={bite:st.bite,drink:st.drink,dance:st.dance,step:st.step,kind};
  if(with_.ludvig)updateLudvig(dt,time,sofia);else{ludvig.group.visible=false;}
  if(with_.duck)updateDuck(dt,time,sofia);
  // his bowl: the same food as hers, a heap that is smaller after each of his spoonfuls
  const left=kind==='spoon'&&['walk','sit','eat','full'].includes(st.step)?Math.max(0,1-(L.bites+(L.bite>=.1&&L.bite<.5?1:0))/BITES):0,r=.085*(.5+.5*left);
  const h=.007+.03*left;food.visible=with_.ludvig&&left>0;food.scale.set(r,h,r);dots.forEach((d,i)=>{const a=i*2.4+.7;d.visible=food.visible&&i<Math.ceil(5*left);d.position.set(Math.cos(a)*.5*r,.077+.82*h,Math.sin(a)*.5*r);});
  if(st.food>=0){const f=FOODS[st.food];food.material.color.set(f.color);bite.material.color.set(f.color);for(const d of dots)d.material.color.set(f.dots);}}

 function updateLudvig(dt,time,sofia){const st=meal.st,kind=st.kind,step=st.step,g=ludvig.group;ludvig.group.visible=true;
  // the copies waiting for their moment
  for(let i=0;i<L.queue.length;i++){const q=L.queue[i];if(clock<q.at)continue;
   if(q.what==='dance'){if(L.dance<0){L.dance=0;L.queue.splice(i--,1);}continue;}
   if(L.seat<1||L.bite>=0||L.drink>=0)continue;if(q.what==='bite'&&L.bites<BITES)L.bite=0;else if(q.what==='drink')L.drink=0;L.queue.splice(i--,1);}
  if(L.bite>=0){const was=L.bite;L.bite+=dt;if(was<.5&&L.bite>=.5){L.bites++;D.peck=0;}if(L.bite>=BITE)L.bite=-1;}
  if(L.drink>=0){L.drink+=dt;if(L.drink>=DRINK)L.drink=-1;}
  if(L.dance>=0){L.dance+=dt;if(L.dance>=1.3)L.dance=-1;}
  let speed=0,wave=0,laugh=false,armsUp=-1,lean=0;g.rotation.x=0;r1();
  const toSeat=kind==='spoon'&&['sit','eat','full'].includes(step);
  // with the spoon: to the side of his chair, then hop onto it when she sits (or as soon as he is there), and down again with her
  if(toSeat||L.seat>0){const atSide=far(L,FRIEND.side)<.05&&L.seat===0;
   if(toSeat&&L.seat===0&&!atSide){speed=stepTo(FRIEND.side,dt,2.2);L.yaw=turn(L.yaw,towards(FRIEND.side.x,FRIEND.side.z,FRIEND.chair.x,FRIEND.chair.z),speed?0:Math.min(1,dt*8));}
   else{L.seat=clamp(L.seat+(toSeat?dt/TIME.sit:-dt/TIME.up),0,1);const e=ease(L.seat),face0=towards(FRIEND.side.x,FRIEND.side.z,FRIEND.chair.x,FRIEND.chair.z);
    if(L.seat>=1){ludvig.update(dt,0,time,0);seatedPose(time);dressPack(time);return;}
    L.x=mix(FRIEND.side.x,FRIEND.chair.x,e);L.z=mix(FRIEND.side.z,FRIEND.chair.z,e);L.y=mix(0,BOY.seatY,e)+Math.sin(e*Math.PI)*.3;L.yaw=turn(face0,FRIEND.yaw,e);
    ludvig.update(dt,0,time);place();if(e>.55)for(const leg of ludvig.legs)leg.rotation.x=1.35*ease((e-.55)/.45);restSpoon();glass.position.copy(glassAt);glass.quaternion.identity();dressPack(time);return;}}
  else if(kind==='spoon'&&step==='walk'){speed=stepTo(FRIEND.side,dt,2);if(!speed)L.yaw=turn(L.yaw,towards(FRIEND.side.x,FRIEND.side.z,FRIEND.chair.x,FRIEND.chair.z),Math.min(1,dt*8));}
  // with PEG: to his backpack, then everything with her
  else if(kind==='peg'){if(far(L,FRIEND.stand)>.04)speed=stepTo(FRIEND.stand,dt,2.2);
   if(!speed){let yaw=step==='walk'?TO_BAG:pegYaw(),y=0;
    if(L.dance>=0){const d=L.dance/1.3;yaw=TO_BAG+ease(d)*Math.PI*2;y=Math.sin(d*Math.PI)*.3;armsUp=2.5*Math.sin(d*Math.PI);laugh=true;}
    L.yaw=step==='walk'?turn(L.yaw,yaw,Math.min(1,dt*8)):yaw;L.y=y;}}
  // on the bed with her
  else{const s=jumpClock(L,dt,FRIEND.jumpDelay);
   if(s!==null){if(s>=0){const p=bedPose(L.jump.from,s,FRIEND.bedJump,FRIEND.bedWait,{k:1},true);L.x=p.x;L.z=p.z;L.y=p.y;L.yaw=p.yaw;lean=p.lean||0;armsUp=2.5*p.arms;laugh=s>=JUMP.climb*.5&&s<JUMP.off+JUMP.down*.5;}
    else{L.y=0;L.yaw=turn(L.yaw,Math.PI/2,Math.min(1,dt*8));}}
   else if(bed.jumping){L.y=0;speed=far(L,FRIEND.bedWait)>.04?stepTo(FRIEND.bedWait,dt,2.2):0;if(!speed)L.yaw=turn(L.yaw,Math.PI/2,Math.min(1,dt*8));}
   // walking about after her
   else{L.y=0;speed=follow(L,FRIEND.lag,dt,sofia,FRIEND.gap,[]);wave=speed<.2?sofia.wave:0;}}
  L.wave+=(wave-L.wave)*Math.min(1,dt*8);
  ludvig.update(dt,speed,time,Math.max(0,L.wave));place();g.rotation.x=lean;
  if(armsUp>=0){const [l,r]=ludvig.arms;l.rotation.x=r.rotation.x=0;l.rotation.z=-.08-armsUp;r.rotation.z=.08+armsUp;}
  else if(kind==='peg'&&(step==='pick'||step==='drop')){const c=Math.min(1,st.s/TIME[step]),reach=Math.sin(c*Math.PI);ludvig.arms[0].rotation.x=ludvig.arms[1].rotation.x=-1.2*reach;}
  ludvig.setLaugh(laugh);restSpoon();glass.position.copy(glassAt);glass.quaternion.identity();dressPack(time);}
 function r1(){for(const a of ludvig.arms)a.scale.y=1;}
 function place(){ludvig.group.position.set(L.x,L.y,L.z);ludvig.group.rotation.y=L.yaw;}
 function stepTo(p,dt,speed){return step(L,p.x,p.z,dt,speed)/Math.max(dt,1e-4);}

 // ---- The duckling: after them on the floor, up on the table at a meal, on the bed with them ----
 function updateDuck(dt,time,sofia){const st=meal.st,kind=st.kind,g=duck.group;g.visible=true;let speed=0,wave=0,sitting=false;
  // at a meal it flutters up onto the table a moment after it starts, and down again when it is over
  const want=kind&&st.step!=='walk'?1:0;
  if(want&&D.table===0&&!D.from)D.from={x:D.x,z:D.z,y:0,yaw:D.yaw};
  if(want||D.table>0){const was=D.table;D.table=clamp(D.table+(want?dt/.9:-dt/.8),0,1);const k=D.table,up={x:FRIEND.table.x,z:FRIEND.table.z,y:tb.h-.085*FRIEND.duckSize},down={...FRIEND.duckDown,y:0};
   if(want){hop(D,D.from,up,k,.55);D.yaw=turn(D.from.yaw,FRIEND.table.yaw,ease(k));}else{hop(D,down,up,k,.45);D.yaw=turn(towards(up.x,up.z,down.x,down.z),FRIEND.table.yaw,ease(k));}
   wave=k<1?1:0;sitting=k>=1;if(k===0){D.from=null;D.y=0;}
   if(sitting){if(D.peck>=0){D.peck+=dt;if(D.peck>.5)D.peck=-1;}const full=kind==='spoon'&&st.step==='full'||kind==='peg'&&st.step==='beep';if(full)wave=1;}
   }
  else{const s=jumpClock(D,dt,FRIEND.jumpDelay*1.7);
   if(s!==null){if(s>=0){const p=bedPose(D.jump.from,s,FRIEND.duckJump,FRIEND.duckWait,{k:.4},false);D.x=p.x;D.z=p.z;D.y=p.y;D.yaw=p.yaw;wave=p.air?1:0;}else{D.y=0;D.yaw=turn(D.yaw,Math.PI/2,Math.min(1,dt*8));}}
   else if(bed.jumping){D.y=0;speed=far(D,FRIEND.duckWait)>.04?step(D,FRIEND.duckWait.x,FRIEND.duckWait.z,dt,1.8)/Math.max(dt,1e-4):0;if(!speed)D.yaw=turn(D.yaw,Math.PI/2,Math.min(1,dt*8));}
   else{D.y=0;const others=with_.ludvig?[[L,.4]]:[];speed=follow(D,with_.ludvig?FRIEND.lag+FRIEND.duckLag:FRIEND.duckLag,dt,sofia,.4,others);wave=speed<.2?sofia.wave:0;}}
  duck.update(dt,speed,time,wave);for(const l of duck.legs)l.visible=!sitting;
  if(sitting&&D.peck>=0)duck.head.rotation.x=.7*Math.sin(Math.min(1,D.peck/.5)*Math.PI);
  g.position.set(D.x,D.y,D.z);g.rotation.y=D.yaw;}

 // What the camera should keep in view at a meal (inside.js fitMeal) and on the bed (fitBed) while they are in.
 function viewPoints(kind){const out=[];if(with_.ludvig)out.push(...(kind==='peg'?[[FRIEND.stand.x+.35,1.25,FRIEND.stand.z],[FRIEND.stand.x-.25,1.25,FRIEND.stand.z],[FRIEND.bag.x+.3,0,FRIEND.bag.z+.2]]:[[FRIEND.chair.x-.3,1.2,FRIEND.chair.z],[FRIEND.side.x,.3,FRIEND.side.z]]));
  if(with_.duck)out.push([FRIEND.table.x,tb.h+.3,FRIEND.table.z]);return out;}
 function bedPoints(){const out=[];if(with_.ludvig)out.push([FRIEND.bedJump.x,JUMP.y+JUMP.heights[JUMP.spin]+1.2,FRIEND.bedJump.z],[FRIEND.bedWait.x,1.2,FRIEND.bedWait.z]);if(with_.duck)out.push([FRIEND.duckJump.x,JUMP.y+.6,FRIEND.duckJump.z]);return out;}
 return {enter,update,viewPoints,bedPoints,hits,obstacles,ludvig,duck,things,pack,worn,tube,spoon,glass,bowl,food,chair,trail,L,D,get company(){return {...with_};},get any(){return with_.ludvig||with_.duck;}};
}
