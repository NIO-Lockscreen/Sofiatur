import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {createInside,STEPS} from './dist/inside.js';
import {MEAL,BITES,PUMP,DRINK} from './dist/meal.js';
import {FRIEND,FRIEND_BOWL} from './dist/friends.js';
import {setSantaSeason} from './dist/santa-hat.js';
setSantaSeason(false);
// Friends in the house (25 November 2026): Ludvig and the little yellow duckling come in with Sofia (dist/friends.js in dist/inside.js), with a fake renderer and
// canvas as in verify-inside.mjs and verify-meal.mjs. They follow her and copy her: walking, at the table with the spoon and with PEG, and jumping on the bed.
// Visiting Ludvig, the room is his. The wiring in game.js (who comes in, always jumping with a friend, the visit) is in verify-rewards.mjs.
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:(o,p)=>/Gradient$/.test(p)?()=>({addColorStop(){}}):()=>{}}),width:0,height:0})};
const canvas={clientWidth:1024,clientHeight:768,getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}};
const events=[];const inside=createInside({T,renderer:{render(){}},canvas,on:name=>events.push(name)});
const list=STEPS.flatMap(s=>s.ids).map(id=>({id,icon:'🔹',title:id,text:'',unlocked:true}));
const screen=v=>{const p=v.clone().project(inside.camera);return [(p.x+1)/2*canvas.clientWidth,(1-p.y)/2*canvas.clientHeight];};
let t=0;const frame=(dt=1/30)=>{t+=dt;inside.update(dt,t);},run=(s,dt=1/30)=>{for(let i=0;i<Math.round(s/dt);i++)frame(dt);},until=(f,s=20)=>{for(let i=0;i<s*30&&!f();i++)frame();assert.ok(f(),'waited for '+f);};
const {friends,meal}=inside,st=meal.st,girl=inside.girl.group,boy=friends.ludvig.group,duck=friends.duck.group,L=friends.L,D=friends.D;
const flat=o=>new T.Vector3(o.position.x,0,o.position.z),apart=(a,b)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const inRect=(r,x,z)=>x>r.x0+.02&&x<r.x1-.02&&z>r.z0+.02&&z<r.z1-.02,rects=()=>meal.obstacles;
const head=o=>o.localToWorld(new T.Vector3(0,.1,0));
{const meshes=[];inside.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.ok(meshes.every(m=>!m.material.transparent),'no see-through meshes: the software renderer would skip them');}

// Alone: no Ludvig, no duckling, none of his things; the obstacles are the table and her backpack only.
inside.enter(list,{pigHidden:true});frame();
assert.equal(boy.visible,false);assert.equal(duck.visible,false);assert.equal(friends.things.visible,false);assert.equal(rects().length,2);assert.deepEqual(friends.company,{ludvig:false,duck:false});
{const [x,y]=screen(new T.Vector3(FRIEND.bag.x,.2,FRIEND.bag.z));const hit=inside.pick(x,y);assert.notEqual(hit?.type,'bag','his backpack is not there to tap');}
console.log('Friends: alone, Sofia has the room to herself, without his chair, his backpack and their obstacles: OK');

// With both: they come in beside her and wave when she waves; then they follow her about, round the table and the backpacks, never through them,
// Ludvig about 0.8 m behind her and the duckling behind him; never on top of her; standing, they face the way she faces.
inside.enter(list,{pigHidden:true,friends:{ludvig:true,duckling:true}});frame();
assert.equal(boy.visible,true);assert.equal(duck.visible,true);assert.equal(friends.things.visible,true);assert.equal(rects().length,4,'his chair and his backpack are in the way too');
assert.ok(apart(boy,girl)>.5&&apart(boy,girl)<1.2,'Ludvig beside her');assert.ok(apart(duck,boy)>.3&&apart(duck,girl)<1.6,'the duckling beside them');
{const s=new T.Box3().setFromObject(duck).getSize(new T.Vector3());assert.ok(s.y>.2&&s.y<.36,'the duckling is small in the room ('+s.y.toFixed(2)+' m)');}
run(.6);assert.ok(friends.ludvig.arms[1].rotation.z>1,'Ludvig waves with her');
for(const [x,z] of [[3.2,.9],[-1.8,2.6],[3.2,2.85],[0,.8],[1.2,2.7],[-2.4,1.0],[1.0,.9],[3.4,1.5]]){const [sx,sy]=screen(new T.Vector3(x,0,z));assert.equal(inside.pick(sx,sy)?.type,'floor',`a floor tap at (${x}, ${z})`);
 for(let i=0;i<150;i++){frame();for(const o of [girl,boy,duck])for(const r of rects())assert.ok(!inRect(r,o.position.x,o.position.z),`${o.name} not through the furniture on the way to (${x}, ${z}): at (${o.position.x.toFixed(2)}, ${o.position.z.toFixed(2)})`);
  assert.ok(apart(boy,girl)>.3,`Ludvig never on top of her (${apart(boy,girl).toFixed(2)} m on the way to (${x}, ${z}))`);}
 assert.ok(apart(boy,girl)<1.3,`Ludvig caught up (${apart(boy,girl).toFixed(2)} m at (${x}, ${z}))`);assert.ok(apart(boy,girl)>.42,'and stands a little apart');assert.ok(apart(duck,girl)<2.1,'the duckling too');
 const dyaw=Math.atan2(Math.sin(boy.rotation.y-girl.rotation.y),Math.cos(boy.rotation.y-girl.rotation.y));assert.ok(Math.abs(dyaw)<.35,`he faces the way she faces (${dyaw.toFixed(2)})`);}
console.log('Friends: Ludvig and the duckling come in beside her, wave with her, follow her about round the furniture, keep a little apart and face the way she faces: OK');

// At the table with the spoon: Ludvig sits on his own chair, facing the table, his legs under it; a moment after each of her spoonfuls he takes one from his bowl
// to his mouth, his food gets less, he drinks when she drinks, pats his tummy when she is full, and gets up with her. The duckling sits on the table.
inside.enter(list,{pigHidden:true,friends:{ludvig:true,duckling:true}});run(.3);events.length=0;
assert.ok(inside.startMeal('spoon'));until(()=>st.step==='eat');until(()=>L.seat===1,3);
assert.ok(Math.hypot(boy.position.x-FRIEND.chair.x,boy.position.z-FRIEND.chair.z)<.01&&boy.position.y<0,'Ludvig on his chair');
assert.ok(Math.abs(Math.atan2(Math.sin(boy.rotation.y-FRIEND.yaw),Math.cos(boy.rotation.y-FRIEND.yaw)))<.01,'facing the table');assert.ok(friends.ludvig.legs.every(l=>l.rotation.x>1.1),'his legs under it');
until(()=>D.table===1,3);assert.ok(Math.abs(duck.position.y-(MEAL.table.h-.085*FRIEND.duckSize))<.01,'the duckling sits on the table');
assert.ok(Math.hypot(duck.position.x-MEAL.table.x,duck.position.z-MEAL.table.z)<MEAL.table.r-.1,'on it, not at its edge');assert.ok(friends.duck.legs.every(l=>!l.visible),'its legs tucked in');
const lmouth=()=>friends.ludvig.head.localToWorld(new T.Vector3(0,-.055,-.122)),ltip=()=>friends.spoon.localToWorld(new T.Vector3(0,.125,0));
assert.ok(friends.food.visible,'his bowl is full');const heap=()=>friends.food.scale.y;let was=heap();
for(let n=1;n<=BITES;n++){assert.equal(inside.mealTap(),'bite');run(FRIEND.delay-.05);assert.equal(L.bite,-1,'he waits a moment');run(.45);
 assert.ok(ltip().distanceTo(lmouth())<.07,`his spoon at his mouth (${ltip().distanceTo(lmouth()).toFixed(3)} m)`);assert.ok(friends.ludvig.laughing,'his mouth open');
 run(.7);assert.equal(L.bites,n,'he has eaten as many as she has');if(n<BITES){assert.ok(heap()<was,'his food is less');was=heap();}
 if(n===2){assert.equal(inside.mealDrink(),'drink');run(FRIEND.delay+1);const lip=friends.glass.localToWorld(new T.Vector3(0,.045,0));assert.ok(lip.distanceTo(lmouth())<.09,`his glass at his mouth (${lip.distanceTo(lmouth()).toFixed(3)} m)`);
  const hand=friends.ludvig.arms[1].localToWorld(new T.Vector3(0,-.31,0));assert.ok(hand.distanceTo(friends.glass.position)<.1,'in his hand');run(DRINK);assert.ok(friends.glass.position.distanceTo(new T.Vector3(friends.glass.position.x,MEAL.table.h+.045,friends.glass.position.z))<1e-6,'and back on the table');}}
assert.equal(st.step,'full');assert.equal(friends.food.visible,false,'his bowl empty too');run(.6);
{const [l,r]=friends.ludvig.arms;assert.ok(l.rotation.x>.3&&r.rotation.x>.3,'he pats his tummy');}
until(()=>!st.kind,4);until(()=>L.seat===0,2);run(2.5);assert.ok(boy.position.y===0&&apart(boy,girl)<1.4,'up again and with her');until(()=>D.table===0,3);assert.equal(duck.position.y,0,'the duckling down from the table');
console.log('Friends: at the table Ludvig sits on his own chair and copies her spoonfuls and drinks a moment later from his own bowl and glass, is full with her and gets up with her; the duckling sits on the table: OK');

// With PEG: his backpack flies onto his back with hers, his tube clicks onto his tummy, he turns to show it, his pump runs with hers (drops, a green light),
// he dances a moment after she does, and his backpack goes back on the floor beside hers.
inside.enter(list,{pigHidden:true,friends:{ludvig:true,duckling:true}});run(.3);inside.startMeal('peg');until(()=>st.step==='plug');run(.3);
const lback=()=>friends.ludvig.group.children[0].localToWorld(new T.Vector3(0,.52,.19));
{const colours=bag=>{const c=[];bag.traverse(o=>{if(o.isMesh)c.push(o.material.color.getHexString());});return c;};assert.deepEqual(colours(friends.pack.bag),colours(meal.bag),'his backpack is exactly the same as hers');}
assert.ok(friends.pack.bag.position.distanceTo(lback())<.01,'his backpack on his back');assert.ok(friends.worn.visible,'with its straps');
until(()=>st.step==='ready');run(.9);assert.ok(friends.tube.group.visible&&friends.tube.plug.visible,'his tube on, clicked onto his tummy');
{const face=new T.Vector3(0,0,1).applyQuaternion(friends.pack.bag.quaternion),toCam=inside.camera.position.clone().sub(friends.pack.bag.position).normalize();assert.ok(face.dot(toCam)>.2,'turned round, showing it');}
inside.mealTap();run(1);assert.equal(friends.tube.drops.filter(d=>d.visible).length,7,'drops in his tube');
assert.ok(['5be37a','2a7a3a'].includes(friends.pack.light.color.getHexString()),'his pump light green');
assert.equal(inside.mealTap(),'dance');run(FRIEND.delay-.05);assert.equal(L.dance,-1,'he waits a moment');let top=0;for(let i=0;i<40;i++){frame();top=Math.max(top,boy.position.y);}assert.ok(top>.2,'then dances too');
until(()=>!st.kind,PUMP+8);frame();assert.ok(Math.hypot(friends.pack.bag.position.x-FRIEND.bag.x,friends.pack.bag.position.z-FRIEND.bag.z)<.01&&Math.abs(friends.pack.bag.position.y)<.01,'his backpack back on the floor');
assert.ok(!friends.worn.visible&&!friends.tube.group.visible);
console.log('Friends: with PEG Ludvig puts on his own backpack, his tube goes on, his pump runs with hers and he dances after her; then it goes back on the floor: OK');

// On the bed: they wait by it while she pulls it out, then jump with her, a moment after her bounces: Ludvig beside her with his arms up, laughing and spinning
// on her spin, the duckling with small hops at the foot end; then they hop down, and the sofa is a sofa again.
inside.enter(list,{pigHidden:true,friends:{ludvig:true,duckling:true}});run(.3);assert.ok(inside.jump());until(()=>inside.bed.play>=0,12);
assert.ok(Math.hypot(boy.position.x-FRIEND.bedWait.x,boy.position.z-FRIEND.bedWait.z)<.05,'Ludvig waits by the bed');
let ltop=0,dtop=0,lmin=9,laughed=false,spun=0,lastYaw=boy.rotation.y;
while(inside.bed.jumping||L.jump){frame();ltop=Math.max(ltop,boy.position.y);dtop=Math.max(dtop,duck.position.y);laughed||=friends.ludvig.laughing;
 if(L.jump&&L.jump.s>inside.JUMP.climb&&L.jump.s<inside.JUMP.off)lmin=Math.min(lmin,boy.position.y);const d=Math.atan2(Math.sin(boy.rotation.y-lastYaw),Math.cos(boy.rotation.y-lastYaw));spun+=d;lastYaw=boy.rotation.y;}
assert.ok(ltop>inside.JUMP.y+.6,'Ludvig jumps high ('+ltop.toFixed(2)+' m)');assert.ok(lmin>=inside.JUMP.y-.03,'on the bed, not in it');assert.ok(laughed,'laughing');assert.ok(Math.abs(spun)>Math.PI*1.6,'he spins round once ('+spun.toFixed(2)+')');
assert.ok(dtop>inside.JUMP.y+.1&&dtop<inside.JUMP.y+.5,'the duckling hops on the bed ('+dtop.toFixed(2)+' m)');
run(.2);assert.equal(boy.position.y,0);assert.ok(Math.hypot(boy.position.x-FRIEND.bedWait.x,boy.position.z-FRIEND.bedWait.z)<.05,'and hops down');assert.equal(duck.position.y,0);
until(()=>inside.bed.u===0,6);run(2);assert.ok(apart(boy,girl)<1.4,'then follows her again');
// at five screen sizes, at the top of the highest bounce both of them are on the screen, under the header and over the title
for(const [w,h] of [[1024,768],[768,1024],[820,1180],[390,844],[844,390]]){canvas.clientWidth=w;canvas.clientHeight=h;inside.enter(list,{pigHidden:true,friends:{ludvig:true,duckling:true}});
 inside.jump();until(()=>inside.bed.play>=0,12);const J=inside.JUMP,peak=J.climb+(J.spin+J.press+(1-J.press)/2)*J.period+FRIEND.jumpDelay;until(()=>L.jump&&L.jump.s>=peak-FRIEND.jumpDelay,8);run(.05);
 for(const [who,o,top] of [['Ludvig',friends.ludvig.head,.2],['Sofia',inside.girl.head,.15],['the duckling',friends.duck.head,.1]]){const [x,y]=screen(o.localToWorld(new T.Vector3(0,top,0)));
  assert.ok(x>0&&x<w&&y>95&&y<h-80,`${who} on the screen at the top of the jump at ${w}×${h} (${x.toFixed(0)}, ${y.toFixed(0)})`);}}
canvas.clientWidth=1024;canvas.clientHeight=768;
console.log('Friends: on the bed Ludvig and the duckling jump with Sofia a moment after her (Ludvig laughing, spinning on her spin), on the screen at five sizes, then hop down and follow her: OK');

// At a meal the camera keeps all of them in view, at five screen sizes.
for(const [w,h] of [[1024,768],[768,1024],[820,1180],[390,844],[844,390]]){canvas.clientWidth=w;canvas.clientHeight=h;
 for(const kind of ['spoon','peg']){inside.enter(list,{pigHidden:true,friends:{ludvig:true,duckling:true}});inside.startMeal(kind);until(()=>st.step===(kind==='spoon'?'eat':'ready'),12);run(2.5);
  for(const [who,o] of [['Ludvig',friends.ludvig.head],['Sofia',inside.girl.head],['the duckling',friends.duck.head]]){const [x,y]=screen(o.localToWorld(new T.Vector3(0,.1,0)));
   assert.ok(x>0&&x<w&&y>60&&y<h-60,`${who} in view at the ${kind} meal at ${w}×${h} (${x.toFixed(0)}, ${y.toFixed(0)})`);}}}
canvas.clientWidth=1024;canvas.clientHeight=768;
console.log('Friends: the camera keeps Sofia, Ludvig and the duckling in view at both kinds of meal, at five screen sizes: OK');

// Visiting Ludvig: the room is his (other walls, his pictures and toys; no podium, no pig, no brushing chart), he is there without being asked, and the taps
// on her table, her backpack, his chair and his backpack start meals; a tap where the podium would be is no podium tap.
inside.enter([],{pigHidden:true,place:'ludvig'});frame();
assert.equal(inside.place,'ludvig');assert.equal(inside.home.visible,false);assert.equal(inside.away.visible,true);assert.equal(meal.wallArt.visible,false);assert.deepEqual(friends.company,{ludvig:true,duck:false});assert.equal(boy.visible,true);
for(const [p,type] of [[new T.Vector3(MEAL.table.x,MEAL.table.h,MEAL.table.z),'table'],[new T.Vector3(MEAL.bag.x,.2,MEAL.bag.z),'bag'],[new T.Vector3(FRIEND.chair.x,.4,FRIEND.chair.z),'table'],[new T.Vector3(FRIEND.bag.x,.2,FRIEND.bag.z),'bag']]){
 const [x,y]=screen(p);assert.equal(inside.pick(x,y)?.type,type,`a tap at (${p.x}, ${p.z}) at Ludvig's`);}
for(const s of inside.slots){const [x,y]=screen(new T.Vector3(s.x,s.base+.6,s.z));const hit=inside.pick(x,y);assert.ok(hit?.type!=='item','no podium at Ludvig\'s');}
{const [x,y]=screen(inside.pigHit.position);assert.notEqual(inside.pick(x,y)?.type,'pig','no pig at Ludvig\'s');}
inside.enter([],{pigHidden:true,place:'ludvig',friends:{duckling:true}});frame();assert.equal(duck.visible,true,'the duckling comes along to Ludvig\'s');
inside.enter(list,{pigHidden:true});frame();assert.equal(inside.place,'home');assert.equal(inside.home.visible,true);assert.equal(inside.away.visible,false);assert.equal(meal.wallArt.visible,true);assert.equal(boy.visible,false,'and at home he comes in only with her');
console.log('Friends: visiting Ludvig the room is his, with him in it, and meals start from her things and his; no podium and no pig there: OK');

// Coming in again in the middle of a meal or a jump: everyone on the floor, his backpack on the floor, his chair empty.
inside.enter(list,{pigHidden:true,friends:{ludvig:true,duckling:true}});inside.startMeal('peg');run(5);inside.enter(list,{pigHidden:true,friends:{ludvig:true,duckling:true}});frame();
assert.equal(boy.position.y,0);assert.equal(duck.position.y,0);assert.ok(Math.hypot(friends.pack.bag.position.x-FRIEND.bag.x,friends.pack.bag.position.z-FRIEND.bag.z)<.01);
inside.startMeal('spoon');run(5);inside.enter(list,{pigHidden:true,friends:{ludvig:true}});frame();assert.equal(L.seat,0);assert.equal(boy.position.y,0);assert.equal(duck.visible,false);
inside.jump();run(6);inside.enter(list,{pigHidden:true,friends:{ludvig:true}});frame();assert.equal(L.jump,null);assert.equal(boy.position.y,0);
console.log('Friends: coming in again starts afresh, everyone on the floor: OK');
