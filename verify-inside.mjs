import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {createInside,STEPS} from './dist/inside.js';
// The house (dist/inside.js, 5 October 2026) in node: a fake renderer and canvas, a tiny canvas stand-in for the medallions' textures.
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:(o,p)=>/Gradient$/.test(p)?()=>({addColorStop(){}}):()=>{}}),width:0,height:0})};
const canvas={clientWidth:1024,clientHeight:768,getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}};
let draws=0;const renderer={render(scene,camera){assert.ok(scene&&camera);draws++;}};
const inside=createInside({T,renderer,canvas});
const IDS=STEPS.flatMap(s=>s.ids);
assert.equal(IDS.length,20);assert.deepEqual([...STEPS.map(s=>s.ids.length)],[7,6,7],'seven on the low and the back step, six on the middle one');
const list=(unlocked=()=>false)=>IDS.map(id=>({id,icon:id==='colour'?'🎨':'🔹',title:id,text:'',unlocked:unlocked(id)}));
const count=o=>{let n=0;o.traverse(m=>{if(m.isMesh)n++;});return n;};
const slot=id=>inside.slots.find(s=>s.id===id);
const project=(v,camera=inside.camera)=>{const p=v.clone().project(camera);return p;};
const screen=(v,w=canvas.clientWidth,h=canvas.clientHeight)=>{const p=project(v);return [(p.x+1)/2*w,(1-p.y)/2*h];};

// Nineteen hit boxes: invisible (neither renderer draws them), one a place, in the order of the table.
inside.enter(list(),{pigHidden:true});
assert.equal(inside.hitBoxes.length,20);assert.deepEqual(inside.hitBoxes.map(h=>h.userData.id),IDS);assert.ok(inside.hitBoxes.every(h=>h.visible===false&&h.userData.kind==='item'&&h.geometry.parameters.width>1&&h.geometry.parameters.height>1));
assert.equal(new Set(inside.hitBoxes.map(h=>h.uuid)).size,20);
// Locked: a grey medallion with a question mark, never the model; unlocked: the model (or a medallion where there is none).
assert.ok(inside.slots.every(s=>s.content.locked===true&&count(s.holder)<=3),'all locked: only medallions');
inside.refresh(list(id=>['cat','colour','taxi','trex'].includes(id)),{pigHidden:true});
for(const id of ['cat','taxi','trex'])assert.ok(count(slot(id).holder)>12&&!slot(id).content.locked,id+' shows its model ('+count(slot(id).holder)+' parts)');
assert.ok(count(slot('colour').holder)<=3&&slot('colour').content.locked!==true&&slot('colour').content.medal,'a medallion for the colour picker');
assert.ok(count(slot('rocket').holder)<=3&&slot('rocket').content.locked===true,'the rocket is still a question mark');
const box=id=>{const b=new T.Box3();slot(id).holder.updateWorldMatrix(true,true);slot(id).holder.traverseVisible(m=>{if(m.isMesh)b.expandByObject(m,false);});return b.getSize(new T.Vector3());};
for(const id of ['cat','taxi','trex']){const d=box(id);assert.ok(Math.max(d.x,d.y,d.z)<1.25&&Math.max(d.x,d.y,d.z)>.6,id+' fitted to about a metre ('+Math.max(d.x,d.y,d.z).toFixed(2)+')');}
inside.refresh(list(),{pigHidden:true});assert.ok(slot('cat').content.locked===true&&count(slot('cat').holder)<=3,'locked again: the model is gone');
inside.refresh(list(()=>true),{pigHidden:true});
const models=IDS.filter(id=>!['colour','trail','bubbles','horn','hover'].includes(id));assert.equal(models.length,15);
for(const id of models)assert.ok(count(slot(id).holder)>12,id+' has a mini model ('+count(slot(id).holder)+' parts)');
for(const id of ['colour','trail','bubbles','horn','hover'])assert.ok(count(slot(id).holder)<=3&&slot(id).content.medal,id+' is a medallion');
console.log('Inside: 20 invisible hit boxes, question marks where locked, mini models and medallions where unlocked, fitted to a metre: OK');

// Taps: the centre of every place picks it (landscape and portrait), the whole podium is on the screen.
for(const [w,h] of [[1024,768],[768,1024],[820,1180],[390,844],[844,390]]){
 canvas.clientWidth=w;canvas.clientHeight=h;inside.enter(list(),{pigHidden:true});
 for(const s of inside.slots){const v=new T.Vector3();s.hit.getWorldPosition(v);const p=project(v);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`${s.id} on the screen at ${w}×${h}`);
  const [x,y]=screen(v,w,h),hit=inside.pick(x,y);assert.deepEqual({...hit},{type:'item',id:s.id},`a tap on ${s.id} at ${w}×${h}`);}
 // the room's front corners and its wall tops show too
 for(const c of [[-4.5,0,3],[4.5,0,3],[-4.5,3.6,-3.5],[4.5,3.6,-3.5]]){const p=project(new T.Vector3(...c));assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,'the room fits at '+w+'×'+h+': '+c);}}
canvas.clientWidth=1024;canvas.clientHeight=768;inside.enter(list(),{pigHidden:true});
console.log('Inside: a tap at the middle of each of the 20 places picks it, at five screen sizes, the whole room in view: OK');

// The pig hides behind the sofa: its rump is a tap on the pig; walls, the podium and the sofa pick nothing; the door leads out; the floor walks the girl.
{const rump=new T.Vector3();inside.pig.group.getWorldPosition(rump);rump.add(new T.Vector3(0,.3,.25));const [x,y]=screen(rump);assert.deepEqual({...inside.pick(x,y)},{type:'pig'},'the pig while it hides');
 const [dx,dy]=screen(inside.pigHit.position);assert.deepEqual({...inside.pick(dx,dy)},{type:'pig'});
 const door=new T.Vector3();inside.scene.updateMatrixWorld(true);inside.scene.traverse(o=>{if(o.userData.kind==='door')o.getWorldPosition(door);});assert.deepEqual({...inside.pick(...screen(door))},{type:'door'});
 assert.equal(inside.pick(...screen(new T.Vector3(0,2.95,-3.4))),null,'the window');assert.equal(inside.pick(...screen(new T.Vector3(-3.4,2.85,-3.4))),null,'a picture on the wall');
 assert.deepEqual({...inside.pick(...screen(new T.Vector3(-3.55,.8,1.45)))},{type:'bed'},'the sofa is a sofa bed, no floor');assert.equal(inside.pick(5,5),null,'nor is the backdrop');
 // a tap on the floor starts the girl walking at about 1.4 m/s, turned to where she goes
 const girl=inside.girl.group;assert.ok(Math.abs(girl.position.x)<.01&&Math.abs(girl.position.z-1.4)<.01,'she starts on the rug');
 assert.deepEqual({...inside.pick(...screen(new T.Vector3(3,0,2)))},{type:'floor'});let t=0;const frame=dt=>{t+=dt;inside.update(dt,t);};
 for(let i=0;i<30;i++)frame(1/30);assert.ok(Math.abs(girl.position.distanceTo(new T.Vector3(0,0,1.4))-1.4)<.15,'one second at 1.4 m/s ('+girl.position.distanceTo(new T.Vector3(0,0,1.4)).toFixed(2)+' m)');
 assert.ok(new T.Vector3(0,0,-1).applyQuaternion(girl.quaternion).dot(new T.Vector3(3,0,.6).normalize())>.98,'turned to where she walks');
 const legs=inside.girl.legs.map(l=>l.rotation.x);assert.ok(legs.some(a=>Math.abs(a)>.05),'and her legs swing');
 for(let i=0;i<150;i++)frame(1/30);assert.ok(girl.position.distanceTo(new T.Vector3(3,0,2))<.05,'she arrives');assert.ok(inside.girl.legs.every(l=>Math.abs(l.rotation.x)<.01),'and stops');
 // not through the sofa, not into the podium: the target is kept on the free floor
 assert.deepEqual({...inside.pick(...screen(new T.Vector3(-3,0,2.95)))},{type:'floor'});for(let i=0;i<400;i++)frame(1/30);assert.ok(girl.position.x>=-2.7-.01&&girl.position.z>=.6-.01,`clamped to the free floor (${girl.position.x.toFixed(2)}, ${girl.position.z.toFixed(2)})`);
 // an item: she walks to just in front of its place and waves
 assert.deepEqual({...inside.pick(...screen(slot('cat').hit.getWorldPosition(new T.Vector3())))},{type:'item',id:'cat'});for(let i=0;i<30*3;i++)frame(1/30);
 assert.ok(Math.abs(girl.position.x-slot('cat').x)<.05&&Math.abs(girl.position.z-.65)<.05,'in front of the cat');assert.ok(inside.girl.arms[1].rotation.z>1.5,'waving');assert.ok(Math.abs(Math.cos(girl.rotation.y)-1)<.05,'facing the podium');
 const before=draws;frame(1/30);assert.equal(draws,before+1,'every frame is drawn once');}
console.log('Inside: the pig hides behind the sofa, the door leads out, the girl walks where you tap (not through the sofa) and waves at a place: OK');

// Found, the pig hops out onto the rug and stands there; a tap on it is then a tap on its place.
{let t=100;const frame=dt=>{t+=dt;inside.update(dt,t);};const items=list();inside.refresh(items.map(i=>i.id==='pig'?{...i,unlocked:true}:i),{pigHidden:false});
 let top=0;for(let i=0;i<60;i++){frame(1/30);top=Math.max(top,inside.pig.group.position.y);}assert.ok(top>.2,'it hops');assert.ok(inside.pig.group.position.x>-1&&inside.pig.group.position.x<2&&Math.abs(inside.pig.group.position.y)<.01,'and stands on the rug');
 const at=inside.pig.group.getWorldPosition(new T.Vector3());at.y+=.3;assert.deepEqual({...inside.pick(...screen(at))},{type:'item',id:'pig'});
 assert.ok(count(slot('pig').holder)>12,'and the pig stands on its place on the podium');
 inside.enter(items.map(i=>i.id==='pig'?{...i,unlocked:true}:i),{pigHidden:false});assert.ok(inside.pig.group.position.x>-1,'entering later, it is already out');
 inside.enter(items,{pigHidden:true});assert.ok(inside.pig.group.position.x<-3.9,'and hiding if not found');}
console.log('Inside: the pig hops out when found, stands on the rug, and a tap on it is a tap on its place: OK');

// Bedtime (4 November 2026): the sofa is a sofa bed. sleep() walks her to it; she lays the throw pillows at the head end, pulls the seat out, the back falls flat and
// the duvet comes; she lies down under it with her eyes shut, the camera glides in and she dreams; wake() gets her up, and the sofa is a sofa again.
{let t=200;const frame=dt=>{t+=dt;inside.update(dt,t);},run=(seconds,dt=1/30)=>{for(let i=0;i<Math.round(seconds/dt);i++)frame(dt);};
 const items=list(id=>['colour','cat','dog','horn'].includes(id));inside.enter(items,{pigHidden:true});const bed=inside.bed,sb=inside.sofaBed,girl=inside.girl,cam=inside.camera.position.clone();
 const allMeshes=[];inside.scene.traverse(o=>{if(o.isMesh)allMeshes.push(o);});assert.ok(allMeshes.every(m=>!m.material.transparent),'no see-through meshes: the software renderer would skip them');
 assert.ok(inside.dream.zs.every(z=>z.isSprite),'the Z\'s are sprites, which the software renderer draws as pictures');
 assert.equal(inside.asleep,false);assert.equal(sb.duvet.visible,false,'no duvet on a sofa');assert.equal(sb.seat.position.x,0);
 assert.equal(inside.sleep(),true);assert.equal(inside.sleep(),false,'once is enough');assert.equal(inside.asleep,true);
 // she walks over to the sofa and takes hold of the seat; until then the sofa is a sofa
 run(.5);assert.equal(bed.u,0);assert.ok(girl.group.position.x<-.3,'on her way');
 const floorTap=inside.pick(...screen(new T.Vector3(1,0,2)));assert.equal(floorTap,null,'on her way to bed, the floor is no tap');
 let walked=0;while(bed.u===0&&walked<150){frame(1/30);walked++;}assert.ok(bed.u>0&&walked>40,'she has walked over and started making the bed ('+(walked/30+.5).toFixed(1)+' s)');assert.ok(Math.abs(Math.cos(girl.group.rotation.y))<.2&&Math.sin(girl.group.rotation.y)>.9,'facing the sofa');
 // the pillows first, then the seat comes out with her, then the back falls flat, then the duvet; each step only moves forward
 const at=[];while(bed.u<1){frame(1/30);at.push({u:bed.u,seat:sb.seat.position.x,tip:-sb.back.rotation.z,x:girl.group.position.x,p1:sb.p1.position.x});}
 assert.ok(at.length>80&&at.length<110,'about 3.2 s ('+(at.length/30).toFixed(1)+' s)');
 const near=u=>at.find(a=>a.u>=u);assert.ok(near(.2).p1>.2&&near(.2).seat===0&&near(.2).tip===0,'the pillows are laid down before the seat moves');
 assert.ok(near(.45).seat>.25&&near(.45).tip===0,'the seat comes out before the back falls');assert.ok(Math.abs(near(.45).x-(near(.2).x+near(.45).seat))<.01,'and she walks backwards with it');
 assert.ok(near(.7).tip>.6&&near(.7).seat>.33,'then the back falls');
 {const first=at.findIndex(a=>a.seat>.349);assert.ok(first>0&&at.slice(first).some(a=>a.seat<.34),'the seat stops with a jolt: it springs back a little and out again');}assert.ok(at.some((a,i)=>i&&a.tip<at[i-1].tip),'the back bounces once');
 for(let i=1;i<at.length;i++){assert.ok(Math.abs(at[i].seat-at[i-1].seat)<.06&&Math.abs(at[i].tip-at[i-1].tip)<.25,'smooth at '+at[i].u.toFixed(2));}
 assert.ok(Math.abs(sb.seat.position.x-.35)<.001&&Math.abs(sb.back.rotation.z+Math.PI/2)<.001,'out 0.35 m, the back flat');assert.equal(sb.duvet.visible,true,'and the duvet is there');
 inside.scene.updateMatrixWorld(true);const flat=new T.Box3().setFromObject(sb.back),seatTop=new T.Box3().setFromObject(sb.seat).max.y;assert.ok(Math.abs(flat.max.y-.65)<.01&&Math.abs(seatTop-.65)<.01,'the back lies level with the cushions ('+flat.max.y.toFixed(3)+', '+seatTop.toFixed(3)+')');
 for(const l of sb.seatLegs)assert.ok(Math.abs(l.rotation.z)<.01&&l.visible,'the seat stands on its own legs');
 // she lies down: on her back, her head on the pillows at the back end, her eyes shut, the duvet up to her shoulders
 run(1.6);inside.scene.updateMatrixWorld(true);assert.equal(bed.k,1);assert.equal(girl.asleep,true,'eyes shut');assert.ok(girl.group.rotation.x>1.1,'lying on her back');
 const head=girl.head.getWorldPosition(new T.Vector3());assert.ok(head.x<-3&&head.x>-3.6&&head.z>.8&&head.z<1.1&&head.y>.9&&head.y<1.1,'head on the pillows ('+head.toArray().map(v=>v.toFixed(2))+')');
 const pillows=new T.Box3().setFromObject(sb.p1).union(new T.Box3().setFromObject(sb.p2));assert.ok(pillows.containsPoint(new T.Vector3(head.x,pillows.max.y-.01,head.z)),'the pillows are under her head');
 const duvet=new T.Box3().setFromObject(sb.cover);assert.ok(duvet.max.y>1&&duvet.min.z<1.2+.05&&duvet.max.z>2,'the duvet covers her from the shoulders down ('+duvet.min.z.toFixed(2)+'..'+duvet.max.z.toFixed(2)+')');
 // asleep: only the sofa and the dream answer taps
 assert.equal(inside.pick(...screen(new T.Vector3(1,0,2))),null,'no walking in her sleep');assert.equal(inside.pick(...screen(slot('cat').hit.getWorldPosition(new T.Vector3()))),null,'nor the podium');
 assert.deepEqual({...inside.pick(...screen(new T.Vector3(-3.3,.9,1.9)))},{type:'bed'},'the sofa bed wakes her');
 // the camera has glided in, and night has fallen in the window
 run(2);assert.ok(inside.camera.position.distanceTo(new T.Vector3(-3.3,.8,1.6))<cam.distanceTo(new T.Vector3(-3.3,.8,1.6))*.75,'closer to the bed');
 // the dream: Z's, then the bubble; in it the car, the rainbow and the unlocked models (cat, dog), three at a time, each a tap that names it
 assert.ok(inside.dream.zs.some(z=>z.visible),'Z\'s rise');assert.equal(inside.dream.group.visible,true,'the bubble is there');assert.deepEqual(inside.dream.list,['car','arc','cat','dog'],'the car, the rainbow, the cat and the dog (no medallions)');
 const shown=inside.dream.slots.filter(s=>s.holder.visible);assert.equal(shown.length,3,'three at a time');assert.equal(new Set(shown.map(s=>s.id)).size,3,'all different');
 for(const s of shown.filter(s=>s.show>.9)){const p=s.hit.getWorldPosition(new T.Vector3());assert.deepEqual({...inside.pick(...screen(p))},{type:'dream',id:s.id},'a tap on '+s.id+' in the dream');}
 const seen=new Set(shown.map(s=>s.id));run(10);for(const s of inside.dream.slots)if(s.holder.visible)seen.add(s.id);assert.equal(seen.size,4,'after a while she has dreamt of all four');
 // the comet, now and then: tapped, it is gone until the next
 let comet=false;for(let i=0;i<200&&!comet;i++){frame(1/30);comet=inside.dream.targets().includes(inside.dream.cometHit);}assert.ok(comet,'a comet comes');
 assert.deepEqual({...inside.pick(...screen(inside.dream.cometHit.getWorldPosition(new T.Vector3())))},{type:'comet'});assert.ok(!inside.dream.targets().includes(inside.dream.cometHit),'caught, it is gone');
 // the bubble, the bed and her head are on the screen, under the header and over the title, at every size
 for(const [w,h] of [[1024,768],[768,1024],[820,1180],[390,844],[844,390]]){canvas.clientWidth=w;canvas.clientHeight=h;frame(1/30);const top=1-2*90/h,bottom=-1+2*75/h;
  const e=inside.camera.matrixWorld.elements,right=new T.Vector3(e[0],e[1],e[2]),up=new T.Vector3(e[4],e[5],e[6]),b=inside.dream.group.position;
  for(const [x,y] of [[1.08,0],[-1.08,0],[0,.74],[0,-.74]]){const p=b.clone().addScaledVector(right,x*.75).addScaledVector(up,y*.75).project(inside.camera);assert.ok(Math.abs(p.x)<1&&p.y<top&&p.y>bottom,`the bubble's edge on the screen at ${w}×${h}`);}
  for(const v of [girl.head.getWorldPosition(new T.Vector3()),new T.Vector3(-2.7,.65,2.5),new T.Vector3(-4,.65,.4)]){const p=v.clone().project(inside.camera);assert.ok(Math.abs(p.x)<1&&p.y<top&&p.y>bottom,`her and the bed on the screen at ${w}×${h}`);}}
 canvas.clientWidth=1024;canvas.clientHeight=768;frame(1/30);
 // up again: the dream goes at once, she climbs out, and the sofa is made again the other way round: the duvet, the back, the seat, the pillows
 assert.equal(inside.wake(),true);assert.equal(inside.wake(),false);assert.equal(inside.asleep,false);frame(1/30);assert.equal(inside.dream.group.visible,false,'the dream is gone');assert.equal(girl.asleep,false,'eyes open');
 run(1.3);assert.equal(bed.k,0,'out of bed');const back=[];while(bed.u>0){frame(1/30);back.push({u:bed.u,seat:sb.seat.position.x,tip:-sb.back.rotation.z,duvet:sb.duvet.visible});}
 assert.ok(back.length>70&&back.length<90,'about 2.6 s ('+(back.length/30).toFixed(1)+' s)');const when=u=>back.find(a=>a.u<=u);
 assert.ok(!when(.74).duvet&&when(.6).seat>.34&&when(.6).tip<.9,'the duvet goes first, then the back is lifted while the seat is still out');assert.ok(when(.3).tip<.06&&when(.3).seat<.3,'then the seat goes in');
 for(let i=1;i<back.length;i++)assert.ok(Math.abs(back[i].seat-back[i-1].seat)<.06&&Math.abs(back[i].tip-back[i-1].tip)<.25,'smooth back at '+back[i].u.toFixed(2));
 assert.ok(Math.abs(sb.seat.position.x)<1e-9&&Math.abs(sb.back.rotation.z)<1e-9,'a sofa again');assert.equal(sb.duvet.visible,false);assert.ok(Math.abs(sb.p1.position.x+.2)<.001&&Math.abs(sb.p2.position.z-.55)<.001,'the pillows lean on the back again');
 run(2);assert.ok(inside.camera.position.distanceTo(cam)<.01,'and the camera is back where it was');
 assert.deepEqual({...inside.pick(...screen(new T.Vector3(1,0,2)))},{type:'floor'},'she walks again');run(3);
 // a change of mind halfway: the same motion runs backwards, with no jump
 inside.sleep();while(bed.u<.6)frame(1/30);inside.wake();let last=sb.seat.position.x,lastTip=-sb.back.rotation.z;
 while(bed.u>0){frame(1/30);assert.ok(Math.abs(sb.seat.position.x-last)<.06&&Math.abs(-sb.back.rotation.z-lastTip)<.25,'no jump going back');last=sb.seat.position.x;lastTip=-sb.back.rotation.z;}
 // coming in again, she is always awake and the sofa a sofa
 inside.sleep();run(9);inside.enter(items,{pigHidden:true});assert.equal(inside.asleep,false);assert.equal(bed.u,0);assert.equal(bed.view,0);assert.ok(Math.abs(sb.seat.position.x)<1e-9);assert.equal(girl.asleep,false);assert.ok(inside.camera.position.distanceTo(cam)<.01);}
console.log('Inside: bedtime on the sofa bed (pillows, seat, back, duvet, and back again), asleep under the duvet, the camera, the dream and its taps, the comet: OK');

// Jumping on the bed (9 November 2026): jump() walks her to the sofa and pulls the bed out as at bedtime, but by day; she climbs up and bounces seven times with her
// arms up and laughing, the cushions giving under her, spins round on the highest bounce, hops down beside the bed, and the sofa is made again. game.js hears each moment.
// sleep() in the middle of it puts her straight to bed from where she is, with no jump in her position.
{let t=500;const heard=[];const house=createInside({T,renderer,canvas,on:(name)=>heard.push([name,t])});const frame=dt=>{t+=dt;house.update(dt,t);},run=(seconds,dt=1/30)=>{for(let i=0;i<Math.round(seconds/dt);i++)frame(dt);};
 const items=list(id=>['colour','cat'].includes(id));canvas.clientWidth=1024;canvas.clientHeight=768;house.enter(items,{pigHidden:true});
 const bed=house.bed,sb=house.sofaBed,girl=house.girl,J=house.JUMP,cam=house.camera.position.clone(),at=()=>girl.group.position.clone();
 const shot=v=>{const p=v.clone().project(house.camera);return [(p.x+1)/2*canvas.clientWidth,(1-p.y)/2*canvas.clientHeight];};
 assert.equal(house.jump(),true);assert.equal(house.jump(),false,'once is enough');assert.equal(house.jumping,true);assert.equal(house.asleep,false,'jumping is not sleeping');
 run(.3);assert.equal(house.pick(...shot(new T.Vector3(1,0,2))),null,'while she jumps, the floor is no tap');assert.deepEqual({...house.pick(...shot(new T.Vector3(-3.55,.55,1.45)))},{type:'bed'},'the sofa still is');
 // she walks over and pulls the bed out, the same as at bedtime, but it stays day
 let n=0;while(bed.play<0&&n<400){frame(1/30);n++;}assert.ok(n<300,'the bed is out ('+(n/30+.3).toFixed(1)+' s)');assert.equal(bed.u,1);assert.ok(Math.abs(sb.seat.position.x-.35)<.001&&Math.abs(sb.back.rotation.z+Math.PI/2)<.001,'the bed pulled out');
 assert.equal(sb.duvet.visible,true,'with the duvet at the foot end');assert.equal(bed.night,0,'by day: no night');assert.equal(heard.length,0);
 // the jump, frame by frame
 let prev=at(),top=0,low=9,turned=0,lastYaw=girl.group.rotation.y,arms=9,laughing=0,squash=1,frames=0,worst=0,onScreen=true;
 while(house.jumping&&frames<400){frame(1/30);frames++;const p=at();worst=Math.max(worst,p.distanceTo(prev));prev=p;
  if(bed.play>J.climb&&bed.play<J.off){top=Math.max(top,p.y);low=Math.min(low,p.y);arms=Math.min(arms,Math.abs(girl.arms[0].rotation.z),Math.abs(girl.arms[1].rotation.z));if(girl.laughing)laughing++;squash=Math.min(squash,sb.cushions[0].scale.y);
   assert.ok(Math.abs(p.x-J.x)<1e-9&&Math.abs(p.z-J.z)<1e-9,'she bounces on one spot');const y=girl.group.rotation.y;turned+=Math.atan2(Math.sin(y-lastYaw),Math.cos(y-lastYaw));}
  lastYaw=girl.group.rotation.y;}
 assert.ok(frames>150&&frames<180,'the jump takes about 5.5 s ('+(frames/30).toFixed(1)+' s)');assert.ok(worst<.3,'no jump in her position from one frame to the next ('+worst.toFixed(3)+' m)');
 assert.ok(top>J.y+.75&&top<J.y+.83,'up to 0.82 m over the bed ('+(top-J.y).toFixed(2)+')');assert.ok(low>J.y-.03,'her feet never sink into the bed ('+(low-J.y).toFixed(3)+')');
 assert.ok(squash<.75,'the cushions give as she lands ('+squash.toFixed(2)+')');assert.ok(arms>1.9,'both arms up all the time ('+arms.toFixed(2)+')');assert.ok(laughing>100,'laughing');assert.ok(Math.abs(turned-2*Math.PI)<.2,'and one spin, all the way round ('+turned.toFixed(2)+')');
 assert.deepEqual(heard.map(h=>h[0]),['boing','boing','boing','boing','boing','boing','spin','boing','down','done'],'seven boings, the spin on the sixth bounce, then down and done');
 {const gaps=heard.filter(h=>h[0]==='boing').map(h=>h[1]).map((v,i,a)=>i?v-a[i-1]:J.period);assert.ok(gaps.every(g=>Math.abs(g-J.period)<.04),'a boing every '+J.period+' s');}
 // down beside the bed, then the sofa is made again by itself and the camera goes back
 assert.equal(house.jumping,false);assert.ok(Math.abs(at().x-(-2.47))<.02&&Math.abs(at().z-1.55)<.02&&Math.abs(at().y)<1e-9,'down beside the bed');assert.equal(girl.laughing,false);
 for(const s of sb.cushions)assert.ok(Math.abs(s.scale.y-1)<1e-9,'the cushions full again');
 run(2.7);assert.equal(bed.u,0,'a sofa again');assert.equal(sb.duvet.visible,false);run(2);assert.ok(house.camera.position.distanceTo(cam)<.01,'the camera back where it was');
 assert.deepEqual({...house.pick(...shot(new T.Vector3(1,0,2)))},{type:'floor'},'she walks again');run(2);
 // her head at the top of the highest bounce is on the screen, under the header and over the title, at five sizes
 for(const [w,h] of [[1024,768],[768,1024],[820,1180],[390,844],[844,390]]){canvas.clientWidth=w;canvas.clientHeight=h;house.enter(items,{pigHidden:true});house.jump();while(bed.play<0)frame(1/30);
  run(J.climb+(J.spin+J.press+(1-J.press)/2)*J.period-bed.play,1/60);house.scene.updateMatrixWorld(true);const top=1-2*90/h,bottom=-1+2*75/h;
  for(const v of [girl.head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.15,0)),new T.Vector3(J.x,J.y,J.z)]){const p=v.clone().project(house.camera);assert.ok(Math.abs(p.x)<1&&p.y<top&&p.y>bottom,`her head and feet on the screen at ${w}×${h}`);}}
 canvas.clientWidth=1024;canvas.clientHeight=768;
 // sleep() in the middle of a bounce: she lies down from where she is in the air, smoothly, under the duvet with her head on the pillows, and gets up beside the bed
 for(const when of [J.climb*.5,1.2,J.climb+(J.spin+.6)*J.period,J.off+J.down*.5]){house.enter(items,{pigHidden:true});house.jump();while(bed.play<0)frame(1/30);run(when-bed.play,1/60);
  const from=at();assert.equal(house.sleep(),true,'to bed at '+when.toFixed(2)+' s');assert.equal(house.jumping,false);assert.equal(house.asleep,true);
  let last=from,step=0;for(let i=0;i<60;i++){frame(1/30);step=Math.max(step,at().distanceTo(last));last=at();}assert.ok(step<.15,'from the jump into bed with no jump ('+step.toFixed(3)+' m a frame)');
  house.scene.updateMatrixWorld(true);assert.equal(bed.k,1);assert.equal(girl.asleep,true);assert.equal(girl.laughing,false);const head=girl.head.getWorldPosition(new T.Vector3());
  assert.ok(head.x<-3&&head.x>-3.6&&head.z>.8&&head.z<1.1&&head.y>.9&&head.y<1.1,'head on the pillows ('+head.toArray().map(v=>v.toFixed(2))+')');for(const c of sb.cushions)assert.ok(Math.abs(c.scale.y-1)<1e-9);
  run(2);assert.ok(house.dream.group.visible,'and she dreams');assert.equal(house.wake(),true);last=at();step=0;for(let i=0;i<45;i++){frame(1/30);step=Math.max(step,at().distanceTo(last));last=at();}
  assert.ok(step<.15,'getting up with no jump');assert.equal(bed.k,0);assert.ok(Math.abs(at().x-(-2.47))<.02&&Math.abs(at().z-1.55)<.02,'beside the bed');run(3);assert.equal(bed.u,0,'and the sofa made again');}
 // on her way or making the bed when told to sleep: she carries on and lies down as at bedtime
 house.enter(items,{pigHidden:true});house.jump();run(.5);assert.equal(bed.u,0);house.sleep();run(12);assert.equal(bed.k,1);assert.equal(house.dream.group.visible,true);
 house.enter(items,{pigHidden:true});house.jump();while(bed.u<.5)frame(1/30);house.sleep();run(6);assert.equal(bed.k,1);
 // no jump while asleep or while the bed is still out; coming in again in the middle of a jump, she is standing and the sofa a sofa
 assert.equal(house.jump(),false,'not while asleep');house.wake();run(.6);assert.equal(house.jump(),false,'not while she climbs out');
 house.enter(items,{pigHidden:true});house.jump();while(bed.play<1)frame(1/30);house.enter(items,{pigHidden:true});assert.equal(house.jumping,false);assert.equal(bed.u,0);assert.equal(bed.play,-1);frame(1/30);assert.ok(Math.abs(at().y)<1e-9&&Math.abs(sb.seat.position.x)<1e-9);}
console.log('Inside: jumping on the sofa bed (the bed pulled out first, by day; seven bounces with the cushions giving, arms up, laughing, one spin, down again and a sofa again), on the screen at five sizes, and to bed from any moment of it: OK');
