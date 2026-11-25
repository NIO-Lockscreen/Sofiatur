import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './dist/vendor/three.js';
import {createInside,STEPS} from './dist/inside.js';
import {MEAL,BITES} from './dist/meal.js';
import {DISHES,FOOD_MAX,cleanFood,orderFood,eatFood,foodChoices} from './dist/food.js';
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

// The list: four dishes, at most six on the trolley, in order, one of a kind taken at a time, and each kind once to choose from.
assert.deepEqual(DISHES.map(d=>d.id),['pizza','burger','sushi','egg']);assert.deepEqual(DISHES.map(d=>d.word),['Pizza','Burger','Sushi','Egg']);assert.equal(FOOD_MAX,6);
assert.deepEqual(DISHES.filter(d=>d.hand).map(d=>d.id),['pizza','burger','sushi'],'the egg is eaten with the spoon');
let food=[];for(const id of ['pizza','sushi','pizza','kake','egg','burger','burger','egg','pizza'])food=orderFood(food,id);
assert.deepEqual(food,['pizza','sushi','pizza','egg','burger','burger'],'in order, nothing unknown, full at six');
assert.deepEqual(foodChoices(food).map(d=>d.id+d.n),['pizza2','burger2','sushi1','egg1']);
assert.deepEqual(eatFood(food,'pizza'),['sushi','pizza','egg','burger','burger']);assert.deepEqual(eatFood(food,'kake'),food);
assert.deepEqual(cleanFood(['egg','kake',7,'sushi']),['egg','sushi']);assert.deepEqual(cleanFood('pizza'),[]);assert.equal(cleanFood(Array(9).fill('egg')).length,6);
console.log('Food: four dishes, six on the trolley, in order, one taken at a time, each kind once to choose from: OK');

// The mobile lies on the table, on the screen (and not under the room's title, at the bottom in the middle) and picked by a tap at five screen sizes;
// only at home, not at Ludvig's. Its screen lights up now and then, and stays lit while it is open.
for(const [w,h] of [[1024,768],[768,1024],[820,1180],[390,844],[844,390]]){canvas.clientWidth=w;canvas.clientHeight=h;inside.enter(list,{pigHidden:true});
 const [x,y]=screen(phoneAt);assert.ok(x>0&&x<w&&y>0&&y<h,`the mobile on the screen at ${w}×${h}`);assert.ok(Math.abs(x-w/2)>165||y<h-80,`not under the title at ${w}×${h} (${x.toFixed(0)}, ${y.toFixed(0)})`);
 assert.deepEqual({...inside.pick(x,y)},{type:'phone'},`a tap on the mobile at ${w}×${h}`);
 inside.enter([],{pigHidden:true,place:'ludvig',friends:{ludvig:true}});assert.equal(meal.homeThings.visible,false,'not at Ludvig\'s');assert.notEqual(inside.pick(x,y)?.type,'phone');}
canvas.clientWidth=1024;canvas.clientHeight=768;inside.enter(list,{pigHidden:true});
{const lit=[];for(let i=0;i<180;i++){frame();lit.push(meal.phone.group.children[0].children[1].material.color.b);}assert.ok(Math.max(...lit)>.9&&Math.min(...lit)<.3,'the screen lights up now and then');
 meal.setPhoneOpen(true);frame();assert.ok(meal.phone.group.children[0].children[1].material.color.b>.95,'lit while open');meal.setPhoneOpen(false);}
console.log('Food: the white mobile on the table, on the screen and picked at five screen sizes, at home only, its screen lighting up now and then: OK');

// The trolley: there while it has food on it, the dishes in order (the top shelf first), the ones still on their way not yet; each dish picked by a tap;
// she walks round it while it stands there, and not when it is gone.
{inside.enter(list,{pigHidden:true});meal.setFood([]);run(.2);assert.equal(meal.cart.group.visible,false,'no trolley without food');
 const cartIn=()=>meal.obstacles.some(r=>Math.abs((r.x0+r.x1)/2-MEAL.cart.x)<.01&&Math.abs((r.z0+r.z1)/2-MEAL.cart.z)<.01);assert.ok(!cartIn(),'nothing in the way');
 meal.setFood(['pizza','burger'],['burger']);run(.2);assert.equal(meal.cart.group.visible,true);assert.deepEqual(meal.cartList(),['pizza'],'the burger is still on its way');
 meal.setFood(['pizza','burger','sushi','egg','pizza']);run(.6);assert.deepEqual(meal.cartList(),['pizza','burger','sushi','egg','pizza']);assert.ok(cartIn(),'in the way while it is there');
 assert.equal(meal.onCart.length,5);const ys=meal.onCart.map(d=>d.group.position.y);assert.ok(ys[0]===ys[1]&&ys[1]===ys[2]&&ys[3]<ys[0],'the top shelf first');
 for(const [i,id] of meal.cartList().entries()){const p=meal.onCart[i].group.getWorldPosition(new T.Vector3());p.y+=.04;const [x,y]=screen(p);assert.ok(x>0&&x<1024&&y>0&&y<768,'on the screen');
  assert.deepEqual({...inside.pick(x,y)},{type:'dish',id},`a tap on the ${id} on the trolley`);}
 for(const [x,z] of [[MEAL.cart.x,MEAL.cart.z+.4],[MEAL.cart.x+.2,MEAL.cart.z-.45],[-2.7,2.6]]){const [sx,sy]=screen(new T.Vector3(x,0,z));inside.pick(sx,sy);
  for(let i=0;i<240;i++){frame();const r=meal.obstacles.find(r=>Math.abs((r.x0+r.x1)/2-MEAL.cart.x)<.01);assert.ok(!(girl.position.x>r.x0+.02&&girl.position.x<r.x1-.02&&girl.position.z>r.z0+.02&&girl.position.z<r.z1-.02),`round the trolley to (${x}, ${z})`);}}
 inside.enter([],{pigHidden:true,place:'ludvig',friends:{ludvig:true}});run(.1);assert.ok(!cartIn(),'not in the way at Ludvig\'s');
 inside.enter(list,{pigHidden:true});meal.setFood([]);run(.1);assert.ok(!cartIn()&&!meal.cart.group.visible,'gone when it is all eaten');}
console.log('Food: the trolley with the dishes in order, those on their way not yet, each picked by a tap, in the way only while it is there: OK');

// Eating a dish: it stands where the bowl stood (the bowl away), five bites with one fewer piece each, 'taken' once at the first bite, the trolley without it.
// Pizza, the burger and sushi with her fingers: the spoon stays on the table, the bite is in her hand by her mouth. The egg with the spoon.
const mouth=()=>inside.girl.head.localToWorld(new T.Vector3(0,-.043,-.116));
for(const id of ['pizza','burger','sushi','egg']){inside.enter(list,{pigHidden:true});meal.setFood([id,'egg']);events.length=0;run(.3);
 assert.ok(inside.startMeal('spoon',id));assert.deepEqual(meal.cartList(),['egg'],'taken to the table');for(let i=0;i<200&&st.step!=='eat';i++)frame();assert.equal(st.step,'eat');
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
 meal.setFood(['egg']);run(.05);assert.deepEqual(meal.cartList(),['egg']);sizes.push(shown());
 for(let n=2;n<=BITES;n++){inside.mealTap();run(1.25);sizes.push(dish.group.visible?shown():0);}
 for(let i=1;i<=BITES;i++)assert.ok(sizes[i]<sizes[i-1],`the ${id}: less after each bite: ${sizes.join(' ')}`);
 assert.deepEqual(steps().filter(s=>s==='taken'),['taken'],'only once');assert.ok(steps().includes('full'));run(2.5);assert.equal(st.kind,null);assert.ok(!dish.group.visible,'gone when she is up');assert.ok(meal.food.parent.visible,'the bowl back');}
// «Ferdig» before the first bite: the dish is not taken, and is on the trolley again.
inside.enter(list,{pigHidden:true});meal.setFood(['pizza']);events.length=0;inside.startMeal('spoon','pizza');for(let i=0;i<200&&st.step!=='eat';i++)frame();
inside.finishMeal();run(1.5);assert.equal(st.kind,null);assert.ok(!steps().includes('taken'));assert.deepEqual(meal.cartList(),['pizza'],'back on the trolley');
// Not a dish she does not have, and the bowl as before without one.
inside.startMeal('spoon','burger');assert.equal(st.dish,null,'only what is on the trolley');run(.1);inside.finishMeal();run(.5);
console.log('Food: a dish where the bowl stood, five bites, pizza, burger and sushi in her hand and the egg on the spoon, off the trolley at the first bite, back if she stops before: OK');

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
 assert.ok(/if\(step==='taken'\)\{food=eatFood\(food,inside\.meal\.st\.dish\);saveFood\(\);/.test(g),'off the list at the first bite');
 assert.ok(/\$\('eatSpoon'\)\.onclick=\(\)=>chooseMeal\(\);/.test(g)&&/hit\.type==='table'\)chooseMeal\(true\)/.test(g)&&/const list=place==='home'\?foodChoices\(food\):\[\];if\(!list\.length\)\{startMeal\('spoon'\);return;\}/.test(g),'«Spise» asks only when there is food, at home');
 assert.ok(/hit\.type==='phone'\)openPhone\(true\)/.test(g)&&/hit\.type==='dish'\)startMeal\('spoon',hit\.id\)/.test(g),'taps on the mobile and the trolley');
 assert.ok(/if\(fromTap\)guardTap\(\$\('phone'\)\)/.test(g)&&/if\(fromTap\)guardTap\(\$\('dishes'\)\)/.test(g),'the windows wait for the tap that opened them');
 assert.ok(/e\.key==='Escape'\)closeFood\(\)/.test(g),'Esc');for(const id of ['phone','orderGrid','phoneSent','phoneFull','phoneCount','phoneClose','dishes','dishChoices','dishesClose'])assert.ok(html.includes(`id="${id}"`),id);
 assert.ok(!/^for\(const d of DISHES\)/m.test(g),'nothing from food.js at the top level (the other tests run game.js without its imports)');}
console.log('Food: game.js saves the order, asks what to eat only when there is a choice, and the windows wait for the tap that opened them: OK');
