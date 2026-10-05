import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {createInside,STEPS} from './dist/inside.js';
// The house (dist/inside.js, 5 October 2026) in node: a fake renderer and canvas, a tiny canvas stand-in for the medallions' textures.
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:(o,p)=>/Gradient$/.test(p)?()=>({addColorStop(){}}):()=>{}}),width:0,height:0})};
const canvas={clientWidth:1024,clientHeight:768,getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}};
let draws=0;const renderer={render(scene,camera){assert.ok(scene&&camera);draws++;}};
const inside=createInside({T,renderer,canvas});
const IDS=STEPS.flatMap(s=>s.ids);
assert.equal(IDS.length,19);assert.deepEqual([...STEPS.map(s=>s.ids.length)],[7,6,6],'seven on the low step, six on each of the others');
const list=(unlocked=()=>false)=>IDS.map(id=>({id,icon:id==='colour'?'🎨':'🔹',title:id,text:'',unlocked:unlocked(id)}));
const count=o=>{let n=0;o.traverse(m=>{if(m.isMesh)n++;});return n;};
const slot=id=>inside.slots.find(s=>s.id===id);
const project=(v,camera=inside.camera)=>{const p=v.clone().project(camera);return p;};
const screen=(v,w=canvas.clientWidth,h=canvas.clientHeight)=>{const p=project(v);return [(p.x+1)/2*w,(1-p.y)/2*h];};

// Nineteen hit boxes: invisible (neither renderer draws them), one a place, in the order of the table.
inside.enter(list(),{pigHidden:true});
assert.equal(inside.hitBoxes.length,19);assert.deepEqual(inside.hitBoxes.map(h=>h.userData.id),IDS);assert.ok(inside.hitBoxes.every(h=>h.visible===false&&h.userData.kind==='item'&&h.geometry.parameters.width>1&&h.geometry.parameters.height>1));
assert.equal(new Set(inside.hitBoxes.map(h=>h.uuid)).size,19);
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
const models=IDS.filter(id=>!['colour','trail','bubbles','horn','hover'].includes(id));assert.equal(models.length,14);
for(const id of models)assert.ok(count(slot(id).holder)>12,id+' has a mini model ('+count(slot(id).holder)+' parts)');
for(const id of ['colour','trail','bubbles','horn','hover'])assert.ok(count(slot(id).holder)<=3&&slot(id).content.medal,id+' is a medallion');
console.log('Inside: 19 invisible hit boxes, question marks where locked, mini models and medallions where unlocked, fitted to a metre: OK');

// Taps: the centre of every place picks it (landscape and portrait), the whole podium is on the screen.
for(const [w,h] of [[1024,768],[768,1024],[820,1180],[390,844],[844,390]]){
 canvas.clientWidth=w;canvas.clientHeight=h;inside.enter(list(),{pigHidden:true});
 for(const s of inside.slots){const v=new T.Vector3();s.hit.getWorldPosition(v);const p=project(v);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`${s.id} on the screen at ${w}×${h}`);
  const [x,y]=screen(v,w,h),hit=inside.pick(x,y);assert.deepEqual({...hit},{type:'item',id:s.id},`a tap on ${s.id} at ${w}×${h}`);}
 // the room's front corners and its wall tops show too
 for(const c of [[-4.5,0,3],[4.5,0,3],[-4.5,3.6,-3.5],[4.5,3.6,-3.5]]){const p=project(new T.Vector3(...c));assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,'the room fits at '+w+'×'+h+': '+c);}}
canvas.clientWidth=1024;canvas.clientHeight=768;inside.enter(list(),{pigHidden:true});
console.log('Inside: a tap at the middle of each of the 19 places picks it, at five screen sizes, the whole room in view: OK');

// The pig hides behind the sofa: its rump is a tap on the pig; walls, the podium and the sofa pick nothing; the door leads out; the floor walks the girl.
{const rump=new T.Vector3();inside.pig.group.getWorldPosition(rump);rump.add(new T.Vector3(0,.3,.25));const [x,y]=screen(rump);assert.deepEqual({...inside.pick(x,y)},{type:'pig'},'the pig while it hides');
 const [dx,dy]=screen(inside.pigHit.position);assert.deepEqual({...inside.pick(dx,dy)},{type:'pig'});
 const door=new T.Vector3();inside.scene.updateMatrixWorld(true);inside.scene.traverse(o=>{if(o.userData.kind==='door')o.getWorldPosition(door);});assert.deepEqual({...inside.pick(...screen(door))},{type:'door'});
 assert.equal(inside.pick(...screen(new T.Vector3(0,2.95,-3.4))),null,'the window');assert.equal(inside.pick(...screen(new T.Vector3(-3.4,2.85,-3.4))),null,'a picture on the wall');
 assert.equal(inside.pick(...screen(new T.Vector3(-3.55,.8,1.45))),null,'the sofa is no floor');assert.equal(inside.pick(5,5),null,'nor is the backdrop');
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
