import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {createInside,STEPS} from './dist/inside.js';
import {MEAL,BITES,PUMP} from './dist/meal.js';
import {createToothGame} from './dist/teeth.js';
// Mealtime and tooth brushing in the house (23 November 2026): dist/meal.js in dist/inside.js with a fake renderer and canvas, as in verify-inside.mjs,
// and the brushing game (dist/teeth.js) on a canvas stand-in.
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:(o,p)=>/Gradient$/.test(p)?()=>({addColorStop(){}}):()=>{}}),width:0,height:0})};
const canvas={clientWidth:1024,clientHeight:768,getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}};
const events=[];const renderer={render(){}};
const inside=createInside({T,renderer,canvas,on:name=>events.push(name)});
const list=STEPS.flatMap(s=>s.ids).map(id=>({id,icon:'🔹',title:id,text:'',unlocked:false}));
const screen=v=>{const p=v.clone().project(inside.camera);return [(p.x+1)/2*canvas.clientWidth,(1-p.y)/2*canvas.clientHeight];};
let t=0;const frame=(dt=1/30)=>{t+=dt;inside.update(dt,t);},run=(s,dt=1/30)=>{for(let i=0;i<Math.round(s/dt);i++)frame(dt);};
const girl=inside.girl.group,meal=inside.meal,st=meal.st,rects=meal.obstacles,inRect=(r,x,z)=>x>r.x0+.02&&x<r.x1-.02&&z>r.z0+.02&&z<r.z1-.02;
const steps=()=>events.filter(e=>e.startsWith('meal:')).map(e=>e.slice(5));
// Everything solid: the software renderer skips see-through meshes.
{const meshes=[];inside.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.ok(meshes.every(m=>!m.material.transparent),'no see-through meshes');}

// A tap on the table and on the backpack picks them, at five screen sizes; the whole table and backpack are on the screen.
for(const [w,h] of [[1024,768],[768,1024],[820,1180],[390,844],[844,390]]){canvas.clientWidth=w;canvas.clientHeight=h;inside.enter(list,{pigHidden:true});
 for(const [p,type] of [[new T.Vector3(MEAL.table.x,MEAL.table.h,MEAL.table.z),'table'],[new T.Vector3(MEAL.bag.x,.2,MEAL.bag.z),'bag']]){const [x,y]=screen(p);assert.ok(x>0&&x<w&&y>0&&y<h,`${type} on the screen at ${w}×${h}`);assert.deepEqual({...inside.pick(x,y)},{type},`a tap on the ${type} at ${w}×${h}`);}}
canvas.clientWidth=1024;canvas.clientHeight=768;inside.enter(list,{pigHidden:true});
console.log('Meal: the table and the PEG backpack are on the screen and picked by a tap at five screen sizes: OK');

// She walks round the table and the backpack, never through them: taps behind them, and every walk there and back.
for(const [x,z] of [[2.2,2.95],[3.3,2.9],[1.2,2.9],[3.4,1.0],[2.2,1.0],[0,1.4],[3.1,2.4]]){inside.route&&0;const [sx,sy]=screen(new T.Vector3(x,0,z));const hit=inside.pick(sx,sy);
 for(let i=0;i<300;i++){frame();for(const r of rects)assert.ok(!inRect(r,girl.position.x,girl.position.z),`not through the table or the backpack on the way to (${x}, ${z}): at (${girl.position.x.toFixed(2)}, ${girl.position.z.toFixed(2)}) (${hit?.type})`);}}
assert.ok(inside.route(0,1.4,3.2,2.9).length>1,'a straight line through the table goes round it');assert.equal(inside.route(0,1.4,-1,2).length,1,'and a clear one does not');
console.log('Meal: she walks round the table and the backpack to wherever you tap: OK');

// With the spoon: she walks to the chair, sits facing the room with her legs under the table, a tap is a spoonful (the spoon goes from the bowl to her mouth),
// the bowl empties over five, she pats her full tummy, and gets up. A tap anywhere during the meal is the next spoonful; the bed and the podium wait.
inside.enter(list,{pigHidden:true});events.length=0;run(.5);
assert.ok(inside.startMeal('spoon'));assert.equal(inside.startMeal('peg'),false,'one meal at a time');assert.equal(inside.sleep(),false,'no bed in the middle of a meal');assert.equal(inside.jump(),false);
assert.deepEqual({...inside.pick(512,384)},{type:'meal'});
for(let i=0;i<150&&st.step==='walk';i++){frame();for(const r of rects)assert.ok(!inRect(r,girl.position.x,girl.position.z),'round the table to the chair');}
assert.equal(st.step,'sit');run(.7);assert.equal(st.step,'eat');
assert.ok(Math.abs(girl.position.x-MEAL.chair.x)<.01&&Math.abs(girl.position.z-MEAL.chair.z)<.01&&girl.position.y<0,'on the chair');assert.ok(Math.abs(Math.cos(girl.rotation.y)+1)<.01,'facing the room');
assert.ok(inside.girl.legs.every(l=>l.rotation.x>1.1),'legs forward under the table');assert.ok(meal.st.bites===0);
const mouth=()=>inside.girl.head.localToWorld(new T.Vector3(0,-.043,-.116)),tip=()=>meal.spoon.localToWorld(new T.Vector3(0,.125,0));
assert.equal(inside.mealTap(),'bite');run(.4);assert.ok(tip().distanceTo(mouth())<.06,'the spoon at her mouth ('+tip().distanceTo(mouth()).toFixed(3)+' m)');assert.ok(inside.girl.laughing,'mouth open');
run(.7);assert.equal(st.bites,1);const bowl=new T.Vector3(MEAL.bowl.x,MEAL.table.h+.04,MEAL.bowl.z);inside.mealTap();run(.05);assert.ok(tip().distanceTo(bowl)<.08,'and in the bowl ('+tip().distanceTo(bowl).toFixed(3)+' m)');
run(1.2);for(let i=0;i<10;i++){inside.mealTap();run(.3);}run(4);assert.equal(st.bites,BITES,'five spoonfuls, extra taps queued no further');
assert.ok(steps().includes('full'));run(2.5);assert.equal(st.kind,null,'up from the table');assert.equal(steps().at(-1),'end');assert.equal(steps().filter(s=>s==='bite').length,BITES);
assert.ok(Math.abs(girl.position.y)<1e-6,'standing on the floor again');run(.5);for(const r of rects)assert.ok(!inRect(r,girl.position.x,girl.position.z));
assert.equal(inside.pick(...screen(new T.Vector3(MEAL.table.x,MEAL.table.h,MEAL.table.z))).type,'table','the table can be tapped again');
// «Ferdig» in the middle: she gets up; on the way there: nothing more happens.
inside.startMeal('spoon');run(4);assert.equal(st.step,'eat');inside.mealTap();run(.2);inside.finishMeal();assert.equal(st.step,'up');run(1);assert.equal(st.kind,null);
inside.startMeal('spoon');run(.2);inside.finishMeal();assert.equal(st.kind,null,'stopped on the way');
console.log('Meal: with the spoon she sits on her chair facing the room, the spoon goes from the bowl to her open mouth, five spoonfuls, a full tummy, and «Ferdig» on the way or in the middle: OK');

// With the PEG backpack: she walks to it, puts it on (it flies from the floor to her back), the tube is clicked on, she turns round to show the backpack,
// a tap starts the pump, drops run down the tube for PUMP seconds while a tap makes her dance, three beeps, the tube comes off and the backpack goes back.
inside.enter(list,{pigHidden:true});events.length=0;inside.startMeal('peg');for(let i=0;i<200&&st.step==='walk';i++)frame();assert.equal(st.step,'pick');
const back=()=>inside.girl.group.children[0].localToWorld(new T.Vector3(0,.42,.148));run(1.3);assert.equal(st.step,'plug');assert.ok(meal.bag.position.distanceTo(back())<.01,'the backpack on her back');
assert.ok(meal.worn.visible,'with its straps');run(1);assert.equal(st.step,'ready');assert.ok(meal.tubeOn.visible,'the tube on');run(1);
const bagFace=new T.Vector3(0,0,1).applyQuaternion(meal.bag.quaternion),toCam=inside.camera.position.clone().sub(meal.bag.position).normalize();assert.ok(bagFace.dot(toCam)>.3,'turned round, showing the backpack');
assert.equal(inside.mealTap(),'pump');assert.equal(st.step,'pump');run(1);const drops=meal.tubeOn.children.filter(o=>o.visible&&o.geometry.type==='SphereGeometry');assert.equal(drops.length,7,'drops in the tube');
assert.equal(inside.mealTap(),'dance');let top=0;for(let i=0;i<40;i++){frame();top=Math.max(top,girl.position.y);}assert.ok(top>.2,'she dances with the backpack on');
run(PUMP-2);assert.equal(st.step,'beep');assert.ok(steps().includes('beep'));run(1.6+.8+1.2);assert.equal(st.kind,null);assert.ok(Math.abs(meal.bag.position.x-MEAL.bag.x)<.01&&Math.abs(meal.bag.position.y)<.01,'the backpack back on the floor');
assert.ok(!meal.worn.visible&&!meal.tubeOn.visible);assert.deepEqual(steps().filter(s=>!['bite','dance'].includes(s)),['pick','plug','ready','pump','beep','unplug','drop','end']);
// «Ferdig» while the pump runs: three beeps and the rest; while it waits: the tube comes off.
inside.startMeal('peg');run(6);assert.equal(st.step,'ready');inside.finishMeal();assert.equal(st.step,'unplug');run(2.5);assert.equal(st.kind,null);
inside.startMeal('peg');run(6);inside.mealTap();run(2);inside.finishMeal();assert.equal(st.step,'beep');run(4);assert.equal(st.kind,null);
// Coming in again in the middle of a meal: no meal, the backpack on the floor.
inside.startMeal('peg');run(4);inside.enter(list,{pigHidden:true});assert.equal(st.kind,null);frame();assert.ok(Math.abs(meal.bag.position.x-MEAL.bag.x)<.01);
console.log('Meal: with the PEG backpack she puts it on, the tube goes on, she shows the backpack, the pump runs with drops in the tube while she dances, beeps and the backpack goes back; «Ferdig» at each step: OK');

// The camera glides in to the meal and out again.
{inside.enter(list,{pigHidden:true});frame();const room=inside.camera.position.clone();inside.startMeal('spoon');run(4);const near=inside.camera.position.distanceTo(new T.Vector3(MEAL.table.x,.8,MEAL.table.z));
 assert.ok(near<room.distanceTo(new T.Vector3(MEAL.table.x,.8,MEAL.table.z))*.6,'closer to the table');inside.finishMeal();run(4);assert.ok(inside.camera.position.distanceTo(room)<.1,'and back to the room');}
// The brushing chart: a star for each time, ten places.
{const lit=()=>meal.chart.children.filter(o=>o.geometry?.type==='ShapeGeometry'&&o.material.color.getHexString()==='2fbfbc').length;inside.setBrushed(3);assert.equal(lit(),3);inside.setBrushed(14);assert.equal(lit(),10);inside.setBrushed(0);assert.equal(lit(),0);}
console.log('Meal: the camera glides in to the table and back, and the brushing chart shows a star for each brushing: OK');

// Tooth brushing (dist/teeth.js): toothpaste first, every tooth needs a few seconds however wild the brushing, germs let go, rinse, done once.
{const said=[],sounds=[];let done=0,clock=0;const c={clientWidth:1024,clientHeight:600};const game=createToothGame({canvas:c,say:x=>said.push(x),sound:n=>sounds.push(n),onDone:()=>done++,insets:()=>({top:0,bottom:90})});
 const go=(sec,fn)=>{for(let i=0;i<Math.round(sec*60);i++){fn&&fn(clock);game.update(1/60);clock+=1/60;}};game.start({seed:11,loop:false});const L=game.layout(),C=game.teeth.map(x=>game.centre(x));
 assert.ok(L.bottom<=600-90&&L.cup.y<L.bottom&&L.tube.y<L.bottom,'clear of the title at the bottom');game.press(L.tube.x,L.tube.y);go(1.6);assert.equal(game.step,'brush');
 const s0=clock;for(const row of [0,1])for(const [i,j] of [[0,2],[2,5],[5,7]]){const a=C[row*8+i],b=C[row*8+j];game.press(a.x,a.y);const t0=clock;
  while(clock-t0<8&&!game.teeth.slice(row*8+i,row*8+j+1).every(x=>x.clean))go(1/60,cl=>{const k=(Math.sin((cl-t0)*Math.PI*4)+1)/2;game.move(a.x+(b.x-a.x)*k,a.y+(b.y-a.y)*k);});game.release();}
 assert.equal(game.step,'rinse');assert.ok(clock-s0>15&&clock-s0<45,'brushed in '+(clock-s0).toFixed(1)+' s');assert.equal(sounds.filter(n=>n==='pop').length,6);
 game.press(L.cup.x,L.cup.y-L.cup.h*.4);go(6);assert.equal(game.step,'done');assert.equal(done,1);go(4);assert.equal(done,1);}
console.log('Teeth: toothpaste, every tooth brushed clean in well under a minute, the germs gone, rinse and done once, clear of the title: OK');
