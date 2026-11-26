import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './dist/vendor/three.js';
import {createInside,STEPS} from './dist/inside.js';
import {MEAL,BITES} from './dist/meal.js';
import {DISHES,FOOD_CART,FLOOR_FOOD,FOOD_LIMIT,foodFloorSpots,cleanFood,foodSlot,orderFood,eatFood,pickFood,foodCount,foodChoices} from './dist/food.js';
import {FRIEND} from './dist/friends.js';
import {VAC} from './dist/vacuum.js';
import {clearFloor} from './dist/food.js';
import {FRIEND_BOWL} from './dist/friends.js';
// The white mobile on the table and the food Sofia orders on it (25 November 2026): dist/food.js in dist/meal.js and dist/inside.js with a fake renderer
// and canvas, as in verify-meal.mjs, and what game.js does with it.
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:(o,p)=>/Gradient$/.test(p)?()=>({addColorStop(){}}):()=>{}}),width:0,height:0})};
const canvas={clientWidth:1024,clientHeight:768,getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}};
const events=[];const inside=createInside({T,renderer:{render(){}},canvas,on:name=>events.push(name)});
const list=STEPS.flatMap(s=>s.ids).map(id=>({id,icon:'🔹',title:id,text:'',unlocked:false}));
const screen=v=>{const p=v.clone().project(inside.camera);return [(p.x+1)/2*canvas.clientWidth,(1-p.y)/2*canvas.clientHeight];};
let t=0;const frame=(dt=1/30)=>{t+=dt;inside.update(dt,t);},run=(s,dt=1/30)=>{for(let i=0;i<Math.round(s/dt);i++)frame(dt);};
const girl=inside.girl.group,meal=inside.meal,st=meal.st,steps=()=>events.filter(e=>e.startsWith('meal:')).map(e=>e.slice(5));
const phoneAt=new T.Vector3(MEAL.phone.x,MEAL.table.h+.01,MEAL.phone.z);

// The list (26 November 2026): four dishes; six on the trolley, then the floor up to a limit nobody is told; each dish in its own place (an eaten one leaves
// its place empty for the next), the one farthest out eaten first, each kind once to choose from.
assert.deepEqual(DISHES.map(d=>d.id),['pizza','burger','sushi','egg']);assert.deepEqual(DISHES.map(d=>d.word),['Pizza','Burger','Sushi','Egg']);assert.equal(FOOD_CART,6);
assert.deepEqual(DISHES.filter(d=>d.hand).map(d=>d.id),['pizza','burger','sushi'],'the egg is eaten with the spoon');
let food=[];for(const id of ['pizza','sushi','pizza','kake','egg','burger','burger','egg','pizza'])food=orderFood(food,id);
assert.deepEqual(food,['pizza','sushi','pizza','egg','burger','burger','egg','pizza'],'in order, nothing unknown; after six on the floor');
assert.deepEqual(foodChoices(food).map(d=>d.id+d.n),['pizza1','egg1'],'while there is food on the floor, only that');assert.deepEqual(foodChoices(food.slice(0,6)).map(d=>d.id+d.n),['pizza2','burger2','sushi1','egg1'],'then the trolley');
assert.equal(pickFood(food,'pizza'),7,'the one farthest out');assert.equal(pickFood(food,'pizza',0),7,'a tap on a pizza on the trolley takes the one on the floor');assert.equal(pickFood(food,'burger',4),4,'one only on the trolley is that one');
food=eatFood(food,1);assert.equal(food[1],null,'an empty place');assert.equal(foodSlot(food),1);food=orderFood(food,'egg');assert.equal(food[1],'egg','the first empty place is taken');
assert.equal(eatFood(eatFood(food,7),6).length,6,'no empty places at the end');assert.equal(foodCount([null,'egg']),1);
assert.deepEqual(cleanFood(['egg','kake',7,'sushi']),['egg',null,null,'sushi']);assert.deepEqual(cleanFood('pizza'),[]);assert.equal(cleanFood(Array(FOOD_LIMIT+9).fill('egg')).length,FOOD_LIMIT);
food=[];for(let i=0;i<FOOD_LIMIT+5;i++)food=orderFood(food,'egg');assert.equal(food.length,FOOD_LIMIT,'full at the limit');assert.equal(foodSlot(food),-1);
assert.ok(FLOOR_FOOD.length>=100,'room to fill the floor: '+FLOOR_FOOD.length);assert.equal(FOOD_LIMIT,FOOD_CART+FLOOR_FOOD.length);
const near=f=>Math.hypot(f.x-MEAL.cart.x,f.z-MEAL.cart.z);for(let i=1;i<FLOOR_FOOD.length;i++)assert.ok(near(FLOOR_FOOD[i])>=near(FLOOR_FOOD[i-1]),'nearest the trolley first');
for(const f of FLOOR_FOOD){assert.ok(Math.abs(f.x)<4.3&&f.z>.2&&f.z<2.95,'on the floor in front of the podium');assert.ok(f.y===0||f.y===.04);
 for(const [x,z,r,what] of [[MEAL.table.x,MEAL.table.z,.55,'table'],[MEAL.chair.x,MEAL.chair.z,.3,'her chair'],[FRIEND.chair.x,FRIEND.chair.z,.3,'his chair'],[MEAL.bag.x,MEAL.bag.z,.3,'her backpack'],[FRIEND.bag.x,FRIEND.bag.z,.3,'his backpack'],
[-3.55,1.45,.55,'sofa'],[4.05,.4,.4,'lamp'],[4,2.6,.4,'plant'],[-4.2,2.65,.5,'the pig hiding'],[3.95,1.5,.4,'door mat'],[.95,1.95,.3,'the pig on the rug']])assert.ok(Math.hypot(f.x-x,f.z-z)>r,`clear of the ${what} (${f.x.toFixed(2)}, ${f.z.toFixed(2)})`);}
for(const f of FLOOR_FOOD)assert.ok(Math.abs(f.x-MEAL.cart.x)>.49+.1||Math.abs(f.z-MEAL.cart.z)>.19+.1,`clear of the trolley (${f.x.toFixed(2)}, ${f.z.toFixed(2)})`);
for(let i=0;i<FLOOR_FOOD.length;i++)for(let j=i+1;j<FLOOR_FOOD.length;j++)assert.ok(Math.hypot(FLOOR_FOOD[i].x-FLOOR_FOOD[j].x,FLOOR_FOOD[i].z-FLOOR_FOOD[j].z)>.22,'a dish\'s room each');
assert.ok(FLOOR_FOOD.some(f=>f.y>0)&&FLOOR_FOOD.some(f=>f.y===0),'some on the rug');assert.deepEqual(foodFloorSpots({x0:0,x1:1,z0:0,z1:0,gap:.5,from:[1,0]}).map(f=>Math.round(f.x*2)+0),[2,1,0]);
console.log('Food: four dishes, six on the trolley and then the floor up to a limit nobody is told, each in its own place, the farthest out eaten first: OK');

// The mobile lies on the table, on the screen (and not under the room's title, at the bottom in the middle) and picked by a tap at five screen sizes;
// only at home, not at Ludvig's. Its screen lights up now and then, and stays lit while it is open.
for(const [w,h] of [[1024,768],[768,1024],[820,1180],[390,844],[844,390]]){canvas.clientWidth=w;canvas.clientHeight=h;inside.enter(list,{pigHidden:true});
 const [x,y]=screen(phoneAt);assert.ok(x>0&&x<w&&y>0&&y<h,`the mobile on the screen at ${w}×${h}`);assert.ok(Math.abs(x-w/2)>165||y<h-80,`not under the title at ${w}×${h} (${x.toFixed(0)}, ${y.toFixed(0)})`);
 assert.deepEqual({...inside.pick(x,y)},{type:'phone'},`a tap on the mobile at ${w}×${h}`);
 inside.enter([],{pigHidden:true,place:'ludvig',friends:{ludvig:true}});assert.equal(meal.homeThings.visible,false,'not at Ludvig\'s');assert.notEqual(inside.pick(x,y)?.type,'phone');}
canvas.clientWidth=1024;canvas.clientHeight=768;inside.enter(list,{pigHidden:true});
{const lit=[];for(let i=0;i<180;i++){frame();lit.push(meal.phone.group.children[0].children[1].material.color.b);}assert.ok(Math.max(...lit)>.9&&Math.min(...lit)<.3,'the screen lights up now and then');
 meal.setPhoneOpen(true);frame();assert.ok(meal.phone.group.children[0].children[1].material.color.b>.95,'lit while open');meal.setPhoneOpen(false);}
// At a meal (26 November 2026) a tap on the mobile is the mobile, a tap on the glass a drink, and anything else the meal's.
{inside.enter(list,{pigHidden:true});run(.2);assert.ok(inside.startMeal('spoon'));for(let i=0;i<200&&st.step!=='eat';i++)frame();assert.equal(st.step,'eat');
 for(const [w,h] of [[1024,768],[390,844],[844,390]]){canvas.clientWidth=w;canvas.clientHeight=h;run(.05);const [x,y]=screen(phoneAt);assert.ok(x>0&&x<w&&y>0&&y<h,`the mobile on the screen at the meal at ${w}×${h}`);
  assert.deepEqual({...inside.pick(x,y)},{type:'phone'},`the mobile at the meal at ${w}×${h}`);assert.deepEqual({...inside.pick(...screen(new T.Vector3(MEAL.bowl.x,MEAL.table.h+.05,MEAL.bowl.z)))},{type:'meal'});
  assert.deepEqual({...inside.pick(...screen(new T.Vector3(MEAL.glass.x,MEAL.table.h+.05,MEAL.glass.z)))},{type:'glass'});}
 canvas.clientWidth=1024;canvas.clientHeight=768;inside.finishMeal();run(2);assert.equal(st.kind,null);
 assert.ok(!/homeFree=\(\)=>[^;]*meal\.active/.test(fs.readFileSync('dist/game.js','utf8')),'game.js opens the mobile at a meal too');}
console.log('Food: the white mobile on the table, on the screen and picked at five screen sizes, at home only, its screen lighting up now and then, and at a meal too: OK');

// The trolley: there while it has food on it, the dishes in order (the top shelf first), the ones still on their way not yet; each dish picked by a tap;
// she walks round it while it stands there, and not when it is gone.
{inside.enter(list,{pigHidden:true});meal.setFood([]);run(.2);assert.equal(meal.cart.group.visible,false,'no trolley without food');
 const cartIn=()=>meal.obstacles.some(r=>Math.abs((r.x0+r.x1)/2-MEAL.cart.x)<.01&&Math.abs((r.z0+r.z1)/2-MEAL.cart.z)<.01);assert.ok(!cartIn(),'nothing in the way');
 const ids=()=>meal.cartList().map(o=>o.id);
 meal.setFood(['pizza','burger'],[1]);run(.2);assert.equal(meal.cart.group.visible,true);assert.deepEqual(ids(),['pizza'],'the burger is still on its way');
 meal.setFood(['pizza','burger','sushi','egg','pizza']);run(.6);assert.deepEqual(ids(),['pizza','burger','sushi','egg','pizza']);assert.ok(cartIn(),'in the way while it is there');
 assert.equal(meal.onCart.length,5);const ys=meal.onCart.map(d=>d.group.position.y);assert.ok(ys[0]===ys[1]&&ys[1]===ys[2]&&ys[3]<ys[0],'the top shelf first');
 for(const [i,{id,slot}] of meal.cartList().entries()){const p=meal.onCart[i].group.getWorldPosition(new T.Vector3());p.y+=.04;const [x,y]=screen(p);assert.ok(x>0&&x<1024&&y>0&&y<768,'on the screen');
  assert.deepEqual({...inside.pick(x,y)},{type:'dish',id,slot},`a tap on the ${id} on the trolley`);}
 // an empty place stays empty: the others do not move
 const was=meal.onCart.map(d=>d.group.position.clone());meal.setFood(['pizza',null,'sushi','egg','pizza']);run(.6);assert.deepEqual(meal.cartList().map(o=>o.slot),[0,2,3,4]);
 assert.ok(meal.onCart.every((d,i)=>d.group.position.equals(was[[0,2,3,4][i]])),'each in its own place');
 for(const [x,z] of [[MEAL.cart.x,MEAL.cart.z+.4],[MEAL.cart.x+.2,MEAL.cart.z-.45],[-2.7,2.6]]){const [sx,sy]=screen(new T.Vector3(x,0,z));inside.pick(sx,sy);
  for(let i=0;i<240;i++){frame();const r=meal.obstacles.find(r=>Math.abs((r.x0+r.x1)/2-MEAL.cart.x)<.01);assert.ok(!(girl.position.x>r.x0+.02&&girl.position.x<r.x1-.02&&girl.position.z>r.z0+.02&&girl.position.z<r.z1-.02),`round the trolley to (${x}, ${z})`);}}
 inside.enter([],{pigHidden:true,place:'ludvig',friends:{ludvig:true}});run(.1);assert.ok(!cartIn(),'not in the way at Ludvig\'s');
 inside.enter(list,{pigHidden:true});meal.setFood([]);run(.1);assert.ok(!cartIn()&&!meal.cart.group.visible,'gone when it is all eaten');}
console.log('Food: the trolley with the dishes in order, those on their way not yet, each picked by a tap, in the way only while it is there: OK');

// Eating a dish: it stands where the bowl stood (the bowl away), five bites with one fewer piece each, 'taken' once at the first bite, the trolley without it.
// Pizza, the burger and sushi with her fingers: the spoon stays on the table, the bite is in her hand by her mouth. The egg with the spoon.
const mouth=()=>inside.girl.head.localToWorld(new T.Vector3(0,-.043,-.116));
for(const id of ['pizza','burger','sushi','egg']){inside.enter(list,{pigHidden:true});meal.setFood([id,'egg']);events.length=0;run(.3);
 assert.ok(inside.startMeal('spoon',id,0));assert.deepEqual(meal.cartList(),[{id:'egg',slot:1}],'taken to the table');for(let i=0;i<200&&st.step!=='eat';i++)frame();assert.equal(st.step,'eat');
 const dish=meal.dish;assert.equal(dish.id,id);assert.ok(dish.group.visible,'on the table');assert.ok(!meal.food.parent.visible,'the bowl is away');
 assert.ok(dish.group.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(MEAL.bowl.x,MEAL.table.h,MEAL.bowl.z))<.01,'where the bowl stood');
 // how much is left: pieces of pizza and sushi (meshes showing), the burger's and the egg's height above the table
 const showing=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
 const shown=()=>{let n=0,top=0;dish.group.updateMatrixWorld(true);dish.group.traverse(o=>{if(o.isMesh&&showing(o)){n++;if(/BoxGeometry|ExtrudeGeometry|CylinderGeometry/.test(o.geometry.type)&&o.scale.x<.05)return;o.geometry.computeBoundingBox();top=Math.max(top,o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).max.y);}});
  return id==='pizza'||id==='sushi'?n:Math.round((top-MEAL.table.h)*1e4);},sizes=[shown()];
 inside.mealTap();run(.42);
 if(id==='egg'){assert.ok(meal.spoon.localToWorld(new T.Vector3(0,.125,0)).distanceTo(mouth())<.08,'the egg on the spoon at her mouth');assert.equal(meal.handBite,null);}
 else{const restAt=meal.spoon.position.clone();assert.ok(Math.abs(restAt.y-(MEAL.table.h+.008))<1e-6,'the spoon stays on the table');assert.ok(meal.handBite.visible,'a bite in her hand');
  assert.ok(meal.handBite.getWorldPosition(new T.Vector3()).distanceTo(mouth())<.12,`the ${id} at her mouth (${meal.handBite.getWorldPosition(new T.Vector3()).distanceTo(mouth()).toFixed(3)} m)`);}
 run(.8);assert.deepEqual(steps().filter(s=>s==='taken'),['taken'],'taken at the first bite');assert.equal(st.taken,true);
 meal.setFood([null,'egg']);run(.05);assert.deepEqual(meal.cartList(),[{id:'egg',slot:1}]);sizes.push(shown());
 for(let n=2;n<=BITES;n++){inside.mealTap();run(1.25);sizes.push(dish.group.visible?shown():0);}
 for(let i=1;i<=BITES;i++)assert.ok(sizes[i]<sizes[i-1],`the ${id}: less after each bite: ${sizes.join(' ')}`);
 assert.deepEqual(steps().filter(s=>s==='taken'),['taken'],'only once');assert.ok(steps().includes('full'));run(2.5);assert.equal(st.kind,null);assert.ok(!dish.group.visible,'gone when she is up');assert.ok(meal.food.parent.visible,'the bowl back');}
// «Ferdig» before the first bite: the dish is not taken, and is on the trolley again.
inside.enter(list,{pigHidden:true});meal.setFood(['pizza']);events.length=0;inside.startMeal('spoon','pizza');for(let i=0;i<200&&st.step!=='eat';i++)frame();
inside.finishMeal();run(1.5);assert.equal(st.kind,null);assert.ok(!steps().includes('taken'));assert.deepEqual(meal.cartList(),[{id:'pizza',slot:0}],'back on the trolley');
// Not a dish she does not have, and the bowl as before without one.
inside.startMeal('spoon','burger');assert.equal(st.dish,null,'only what is on the trolley');run(.1);inside.finishMeal();run(.5);
console.log('Food: a dish where the bowl stood, five bites, pizza, burger and sushi in her hand and the egg on the spoon, off the trolley at the first bite, back if she stops before: OK');

// The floor (26 November 2026): after six on the trolley, each dish in its place on the floor; a full floor is one mesh per colour; a tap on the floor is still
// a walk, and she walks through the food (it is not in the way); chosen at «Spise», the one farthest out is eaten, from the floor; not at Ludvig's.
{inside.enter(list,{pigHidden:true});const all=Array.from({length:FOOD_LIMIT},(_,i)=>DISHES[(i*7+3)%4].id);meal.setFood(all.slice(0,9),[8]);run(.2);
 assert.equal(meal.cartList().length,6);assert.deepEqual(meal.floorList().map(o=>o.slot),[6,7],'two on the floor, the third still on its way');
 const obstacles=meal.obstacles.length;meal.setFood(all);run(.2);assert.equal(meal.floorList().length,FLOOR_FOOD.length,'the whole floor');assert.equal(meal.obstacles.length,obstacles,'the food on the floor is not in the way');
 const meshes=()=>{const out=[];meal.floor.traverse(o=>{if(o.isMesh)out.push(o);});return out;};
 assert.ok(meshes().length<=5*20&&meal.floor.children.length===5,'one mesh per colour, in pieces of 24 places: '+meshes().length+' meshes in '+meal.floor.children.length);
 const tris=meshes().reduce((n,m)=>n+m.geometry.attributes.position.count/3,0);assert.ok(tris<FLOOR_FOOD.length*700,'coarse on the floor: '+tris+' triangles');
 const box=new T.Box3();for(const m of meshes()){m.geometry.computeBoundingBox();box.union(m.geometry.boundingBox);}assert.ok(box.min.y>-.01&&box.max.y<.2,'lying on the floor: '+box.min.y.toFixed(3)+' to '+box.max.y.toFixed(3));
 // a tap on a dish on the floor: she walks there, through the food
 const f=FLOOR_FOOD[30],[sx,sy]=screen(new T.Vector3(f.x,.02,f.z));assert.deepEqual({...inside.pick(sx,sy)},{type:'floor'},'a walk');run(6);
 assert.ok(Math.hypot(girl.position.x-f.x,girl.position.z-f.z)<.3,'she is there, in the food ('+girl.position.x.toFixed(2)+', '+girl.position.z.toFixed(2)+')');
 // chosen: the one farthest out; it leaves the floor at the first bite and its place is empty
 events.length=0;const last=FOOD_LIMIT-1;assert.ok(inside.startMeal('spoon',all[last]));assert.equal(st.slot,pickFood(all,all[last]));const slot=st.slot;
 run(.2);assert.ok(!meal.floorList().some(o=>o.slot===slot),'off the floor to the table');for(let i=0;i<300&&st.step!=='eat';i++)frame();inside.mealTap();run(1.2);assert.deepEqual(steps().filter(s=>s==='taken'),['taken']);
 inside.finishMeal();run(2);const after=[...all];after[slot]=null;meal.setFood(after);run(.2);assert.ok(!meal.floorList().some(o=>o.slot===slot));
 inside.enter([],{pigHidden:true,place:'ludvig',friends:{ludvig:true}});run(.1);assert.equal(meal.homeThings.visible,false,'not at Ludvig\'s');
 inside.enter(list,{pigHidden:true});meal.setFood([]);run(.2);assert.equal(meshes().length,0,'an empty floor');}
console.log('Food: after six the floor, each dish in its place, one mesh per colour, walked through, the farthest out eaten first, not at Ludvig\'s: OK');

// The robot vacuum (26 November 2026): in its dock in front of the podium, on the screen and tapped at five sizes (at home only), the eyes on its lid; it
// drives out, sucks up every dish on the floor (game.js takes each off the list at 'suck:'), leaves the trolley, stays in the room, goes round the furniture,
// and backs into its dock facing out; a clean floor gets a round; home when asked.
{const v=meal.vacuum,robot=v.robot;
 for(const [w,h] of [[1024,768],[768,1024],[820,1180],[390,844],[844,390]]){canvas.clientWidth=w;canvas.clientHeight=h;inside.enter(list,{pigHidden:true});
  const [x,y]=screen(new T.Vector3(VAC.dock.x,.06,VAC.dock.z));assert.ok(x>0&&x<w&&y>0&&y<h,`the robot vacuum on the screen at ${w}×${h}`);assert.deepEqual({...inside.pick(x,y)},{type:'vacuum'},`tapped at ${w}×${h}`);}
 canvas.clientWidth=1024;canvas.clientHeight=768;
 inside.enter([],{pigHidden:true,place:'ludvig',friends:{ludvig:true}});{const [x,y]=screen(new T.Vector3(VAC.dock.x,.06,VAC.dock.z));assert.notEqual(inside.pick(x,y)?.type,'vacuum','not at Ludvig\'s');}
 inside.enter(list,{pigHidden:true});robot.updateMatrixWorld(true);
 const eyes=[];robot.traverse(o=>{if(o.isMesh&&o.material.color?.getHexString()==='7b4fe0')eyes.push(o.getWorldPosition(new T.Vector3()));});
 assert.equal(eyes.length,2,'two eyes');assert.ok(eyes.every(e=>e.y>.075&&e.z>robot.position.z),'on top of the lid, at the front');
 let food=Array.from({length:FOOD_CART+40},(_,i)=>DISHES[i%4].id);meal.setFood(food);events.length=0;run(.2);
 assert.ok(v.start(true));assert.equal(v.st.mode,'out');let n=0;
 for(;n<6000&&v.st.mode!=='dock';n++){frame();for(const e of events.splice(0)){const m=/^meal:suck:(\d+)$/.exec(e);if(m){food=eatFood(food,+m[1]);meal.setFood(food);}}
  assert.ok(Math.abs(robot.position.x)<4.4&&robot.position.z>.1&&robot.position.z<3,'in the room, in front of the podium');
  for(const r of meal.obstacles)assert.ok(!(robot.position.x>r.x0+.05&&robot.position.x<r.x1-.05&&robot.position.z>r.z0+.05&&robot.position.z<r.z1-.05),'round the furniture');}
 assert.equal(v.st.mode,'dock');assert.equal(food.length,FOOD_CART,'the floor clean, the trolley left');assert.equal(v.st.cleaned,40);assert.ok(n/30<90,'forty dishes in '+(n/30).toFixed(0)+' s');
 assert.ok(Math.hypot(robot.position.x-VAC.dock.x,robot.position.z-VAC.dock.z)<1e-9&&robot.rotation.y===0,'back in its dock, facing out');
 events.length=0;assert.ok(v.start(false));assert.equal(v.st.round.length,5,'a round of a clean floor');run(1.5);assert.ok(v.home());assert.equal(v.home(),false,'once');run(20);assert.equal(v.st.mode,'dock','home when asked');
 assert.deepEqual(events.filter(e=>e.startsWith('meal:vacuum:')&&!/hum|slurp/.test(e)),['meal:vacuum:round','meal:vacuum:home','meal:vacuum:back']);
 // while it sucks a dish up, that dish is not on the floor; coming in again, it is in its dock
 food=Array.from({length:FOOD_CART+3},(_,i)=>DISHES[i%4].id);meal.setFood(food);v.start(true);for(let i=0;i<900&&v.suckSlot<0;i++)frame();assert.ok(v.suckSlot>=FOOD_CART);assert.ok(!meal.floorList().some(o=>o.slot===v.suckSlot));
 inside.enter(list,{pigHidden:true});assert.equal(v.st.mode,'dock');assert.deepEqual(clearFloor(['egg',null,'pizza',null,null,null,'sushi']),['egg',null,'pizza']);
 const g=fs.readFileSync('dist/game.js','utf8');assert.ok(/function goOutside\(\)\{if\(state!=='inside'\)return;closeFood\(\);vacuumAway\(\);/.test(g)&&/food=clearFloor\(food\);saveFood\(\);v\.reset\(\);/.test(g)&&/if\(cleanedAway\)\{cleanedAway=false;line\+=' Mens du var ute/.test(g),'out of the house: a clean floor, and she is told');}
console.log('Food: the robot vacuum, eyes on its lid, sucks up the floor round the furniture and backs into its dock; a round of a clean floor; home when asked; at home only: OK');

// With Ludvig at the table he gets one just like it where his bowl stands, and eats it the way she does.
{inside.enter(list,{pigHidden:true,friends:{ludvig:true,duckling:true}});meal.setFood(['sushi']);run(.3);inside.startMeal('spoon','sushi');for(let i=0;i<300&&st.step!=='eat';i++)frame();
 const spots=[];inside.scene.traverse(o=>{if(o.isGroup&&Math.hypot(o.position.x-FRIEND_BOWL.x,o.position.z-FRIEND_BOWL.z)<.01&&Math.abs(o.position.y-MEAL.table.h)<.01)spots.push(o);});
 const hisDish=spots.find(o=>o.rotation.y!==0),hisBowl=spots.find(o=>o.rotation.y===0);
 assert.ok(hisDish?.children.length===1&&hisDish.children[0].visible,'his own sushi where his bowl stands');assert.equal(hisBowl.visible,false,'his bowl put away');
 inside.mealTap();run(3);inside.finishMeal();run(2.5);assert.equal(st.kind,null);assert.ok(!hisDish.children[0].visible&&hisBowl.visible,'and his bowl back afterwards');}
console.log('Food: with Ludvig at the table he eats a dish like hers: OK');

// game.js: saved under sofiatur.mat, «Spise» and the table ask only when there is something to choose (and only at home), a tap on the mobile opens it,
// a dish on the trolley is eaten, the windows wait a moment after the tap that opened them, and Esc puts them away.
{const g=fs.readFileSync('dist/game.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');
 assert.ok(/localStorage\.setItem\('sofiatur\.mat',JSON\.stringify\(food\)\)/.test(g)&&/cleanFood\(JSON\.parse\(localStorage\.getItem\('sofiatur\.mat'\)\)\)/.test(g),'saved and read back');
 assert.ok(/if\(step==='taken'\)\{food=eatFood\(food,inside\.meal\.st\.slot\);saveFood\(\);/.test(g),'out of its place at the first bite');
 assert.ok(!/import \{[^}]*FOOD_LIMIT/.test(g)&&!/av \$\{FOOD/.test(g),'the limit is not shown');
 assert.ok(/\$\('eatSpoon'\)\.onclick=\(\)=>chooseMeal\(\);/.test(g)&&/hit\.type==='table'\)chooseMeal\(true\)/.test(g)&&/const list=place==='home'\?foodChoices\(food\):\[\];if\(!list\.length\)\{startMeal\('spoon'\);return;\}/.test(g),'«Spise» asks only when there is food, at home');
 assert.ok(/hit\.type==='phone'\)openPhone\(true\)/.test(g)&&/hit\.type==='dish'\)startMeal\('spoon',hit\.id,hit\.slot\)/.test(g),'taps on the mobile and the trolley');
 assert.ok(/if\(fromTap\)guardTap\(\$\('phone'\)\)/.test(g)&&/if\(fromTap\)guardTap\(\$\('dishes'\)\)/.test(g),'the windows wait for the tap that opened them');
 assert.ok(/e\.key==='Escape'\)closeFood\(\)/.test(g),'Esc');for(const id of ['phone','orderGrid','phoneSent','phoneFull','phoneCount','phoneClose','dishes','dishChoices','dishesClose'])assert.ok(html.includes(`id="${id}"`),id);
 assert.ok(!/^for\(const d of DISHES\)/m.test(g),'nothing from food.js at the top level (the other tests run game.js without its imports)');}
console.log('Food: game.js saves the order, asks what to eat only when there is a choice, and the windows wait for the tap that opened them: OK');
