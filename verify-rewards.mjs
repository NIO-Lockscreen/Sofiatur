import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
import {createBoy} from './dist/boy.js';
import {createRainbowTrail} from './dist/rainbow-trail.js';
import {createCat} from './dist/cat-model.js';
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));
const code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
// Starts a fresh game (as after a page reload) with the given browser storage; the world records paint, boy and model calls.
async function launch(localStorage){
 const els=new Map(),world={colour:null,trail:null,boy:null,skin:null,model:null};let callbacks=[],now=0;const canvasContext=new Proxy({},{get:()=>()=>{}});
 const element=id=>{if(!els.has(id))els.set(id,{hidden:false,textContent:'',value:'',checked:false,style:{},children:[],attrs:{},classes:new Set(),classList:{add(){},remove(){},toggle(c,on){on?this.owner.classes.add(c):this.owner.classes.delete(c);}},setAttribute(k,v){this.attrs[k]=v;},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},addEventListener(){},getContext(){return canvasContext}});const el=els.get(id);el.classList.owner=el;return el;};
 const listeners=new Map();
 const env={T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},window:{addEventListener:(type,fn)=>listeners.set(type,fn)},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),
  createWorld:()=>({height:()=>160,update(){},resetCamera(){},setTurnArrow(){},setCarColour:c=>world.colour=c,setCarSkin:k=>world.skin=k,setCarModel:m=>world.model=m,setTrail:on=>world.trail=on,setBoy:on=>world.boy=on})};
 if(localStorage)Object.defineProperty(env,'localStorage',{get:localStorage});
 const ctx=vm.createContext(env);
 const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={arrive(){start();finish();},park(){parkAtKiwi();},home(){start();current=data.start;state='decision';parkAtHome();},ludvig(){parkAtLudvig();},state:()=>state,progress:()=>({arrivals,carColour,trailOn:behind==='trail',catOn}),behind:()=>behind};})()`,ctx);
 for(let i=0;i<12;i++){await Promise.resolve();const q=callbacks.splice(0);q.forEach(cb=>cb(now+=45));}await init;
 const key=(k,target={tagName:'BODY'})=>listeners.get('keydown')({key:k,repeat:false,target,preventDefault(){}});
 const tick=n=>{for(let i=0;i<n;i++){const q=callbacks.splice(0);q.forEach(cb=>cb(now+=45));}};
 return {element,test:env.test,world,key,tick};
}
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};

// Before the first trip: no colour picker, a teaser, the black car and no trail.
let game=await launch(()=>storage);
assert.equal(game.element('rewards').hidden,true);assert.equal(game.element('rewardTeaser').hidden,false);assert.match(game.element('rewardTeaser').textContent,/overraskelse/);
assert.equal(game.world.colour,'#14171c');assert.equal(game.world.trail,false);

// First arrival: the colour picker unlocks and the button leads to the start screen, where it is shown.
game.test.arrive();assert.equal(game.test.progress().arrivals,1);assert.equal(game.element('unlock').hidden,false);assert.match(game.element('unlock').textContent,/farge/);
game.element('again').onclick();assert.equal(game.element('welcome').hidden,false);assert.equal(game.element('rewards').hidden,false);assert.equal(game.element('trailRow').hidden,true);
const swatches=game.element('carColours').children;assert.equal(swatches.length,12);assert.equal(swatches[10].hidden,true,'The rainbow colour waits for the fourth trip');assert.equal(swatches[11].hidden,true,'The KIWI car is a secret until parked at KIWI');assert.ok(swatches[0].classes.has('on'),'Black is picked to begin with');
swatches[3].onclick();assert.equal(game.world.colour,'#7b4cc2');assert.ok(swatches[3].classes.has('on')&&!swatches[0].classes.has('on'));assert.equal(game.world.trail,false,'No trail yet');
game.element('customColour').oninput({target:{value:'#12AB34'}});assert.equal(game.world.colour,'#12ab34');
swatches[3].onclick();
console.log('First arrival unlocks the colour picker on the start screen: OK');

// The order since 30 September 2026: 1 colour picker, 2 running cat, 3 rainbow trail, 4 rainbow colour.
// After a reload the colour is kept; the second arrival turns the car into a running cat, with a switch back to the car on
// the start screen; the choice is kept after a reload.
game=await launch(()=>storage);assert.equal(game.world.colour,'#7b4cc2');assert.equal(game.element('rewards').hidden,false);assert.match(game.element('rewardTeaser').textContent,/én gang til/);
game.test.arrive();assert.equal(game.test.progress().arrivals,2);assert.equal(game.world.model,'cat');assert.match(game.element('unlock').textContent,/katt/);assert.match(game.element('again').textContent,/katten/);
game.element('again').onclick();assert.equal(game.element('catRow').hidden,false);assert.equal(game.element('cat').checked,true);assert.equal(game.element('trailRow').hidden,true,'The trail waits for the third trip');assert.equal(game.element('rewardTeaser').hidden,false,'More surprises to come');
assert.equal(game.world.trail,false);assert.equal(game.world.colour,'#7b4cc2','A purple cat');
game.element('cat').onchange({target:{checked:false}});assert.equal(game.world.model,'car');game=await launch(()=>storage);assert.equal(game.world.model,'car','Car remembered');
game.element('cat').onchange({target:{checked:true}});game=await launch(()=>storage);assert.equal(game.world.model,'cat','Cat remembered');
console.log('Second arrival turns the car into a running cat; the switch survives a reload: OK');

// Third arrival: the rainbow trail (on by default), with its switch on the start screen, remembered after a reload.
game.test.arrive();assert.equal(game.test.progress().arrivals,3);assert.equal(game.world.trail,true);assert.match(game.element('unlock').textContent,/regnbuespor/);assert.equal(game.world.boy,false,'Ludvig waits for a visit');assert.equal(game.element('ludvigRow').hidden,true);
game.element('again').onclick();assert.equal(game.element('trailRow').hidden,false);assert.equal(game.element('trail').checked,true);assert.equal(game.element('carColours').children[10].hidden,true,'The rainbow colour waits for the fourth trip');
game.element('trail').onchange({target:{checked:false}});assert.equal(game.world.trail,false);
game=await launch(()=>storage);assert.equal(game.world.trail,false,'Trail switch is remembered');assert.equal(game.element('trail').checked,false);game.element('trail').onchange({target:{checked:true}});
console.log('Third arrival unlocks the rainbow trail; the trail switch survives a reload: OK');

// Fourth arrival: the rainbow colour that changes all the time, picked at once and kept after a reload; a colour can still be picked.
game.test.arrive();assert.equal(game.test.progress().arrivals,4);assert.equal(game.world.colour,'rainbow');assert.match(game.element('unlock').textContent,/regnbuebil/);assert.match(game.element('again').textContent,/regnbuebilen/);
game.element('again').onclick();let rainbowButton=game.element('carColours').children[10];assert.equal(rainbowButton.hidden,false);assert.ok(rainbowButton.classes.has('on'));assert.equal(game.element('rewardTeaser').hidden,true,'No teaser once everything is unlocked');
game.element('carColours').children[1].onclick();assert.equal(game.world.colour,'#c62828');rainbowButton.onclick();assert.equal(game.world.colour,'rainbow');
game=await launch(()=>storage);assert.equal(game.world.colour,'rainbow','Rainbow colour remembered');assert.equal(game.world.model,'cat','A rainbow cat');assert.equal(game.world.trail,true);
game.test.arrive();assert.equal(game.element('unlock').hidden,true,'No new reward on later trips');assert.match(game.element('again').textContent,/en gang til/);
console.log('Fourth arrival unlocks the rainbow colour; everything survives a reload: OK');

// Rewards that are not unlocked yet cannot be forced through storage.
store.set('sofiatur.fremgang',JSON.stringify({arrivals:1,colour:'rainbow',model:'cat'}));game=await launch(()=>storage);assert.equal(game.world.colour,'#14171c');assert.equal(game.world.model,'car');assert.equal(game.world.trail,false);
store.set('sofiatur.fremgang',JSON.stringify({arrivals:3,colour:'rainbow',model:'cat'}));game=await launch(()=>storage);assert.equal(game.world.colour,'#14171c','Rainbow colour only after four trips');assert.equal(game.world.model,'cat');
console.log('Locked rewards stay locked: OK');

// Blocked or damaged storage starts from scratch.
game=await launch(()=>{throw new Error('SecurityError');});assert.deepEqual({...game.test.progress()},{arrivals:0,carColour:'#14171c',trailOn:true,catOn:false});assert.equal(game.element('rewards').hidden,true);
store.set('sofiatur.fremgang','{"arrivals":"lots","colour":"red; x"}');game=await launch(()=>storage);assert.deepEqual({...game.test.progress()},{arrivals:0,carColour:'#14171c',trailOn:true,catOn:false});
console.log('Blocked or damaged storage falls back to the locked start: OK');

// Secret: parking at KIWI unlocks the KIWI car, even before the first trip; it shows with black on the start screen.
store.clear();game=await launch(()=>storage);assert.equal(game.element('rewards').hidden,true);game.test.park();
assert.equal(game.world.skin,'kiwi');assert.equal(game.world.colour,'#5fae36');assert.equal(game.element('rewards').hidden,false);
const all=game.element('carColours').children,kiwiButton=all.at(-1);assert.equal(kiwiButton.hidden,false);assert.ok(kiwiButton.classes.has('on'));assert.ok(all.slice(1,-1).every(b=>b.hidden),'Other colours wait for the first trip');
all[0].onclick();assert.equal(game.world.skin,null);assert.equal(game.world.colour,'#14171c');kiwiButton.onclick();
game=await launch(()=>storage);assert.equal(game.world.skin,'kiwi','KIWI car remembered');game.test.park();assert.equal(game.world.skin,'kiwi');
game.element('carColours').children[0].onclick();assert.equal(game.world.skin,null);game.test.park();assert.equal(game.world.skin,'kiwi','Every visit to KIWI puts the KIWI paint back on');assert.equal(game.world.colour,'#5fae36');assert.match(game.element('toast').textContent,/KIWI-bilen/);
console.log('Parking at KIWI unlocks the secret KIWI car, and every later visit switches to it: OK');

// Home and Ludvig: parking at home brings the start screen with the car colours back after a moment; Bøckmans veg 102 is a visit to Ludvig.
store.clear();store.set('sofiatur.fremgang',JSON.stringify({arrivals:1}));game=await launch(()=>storage);game.test.home();
assert.equal(game.test.state(),'decision','Parked at home, the car waits');assert.match(game.element('toast').textContent,/Hjemme/);game.tick(30);assert.equal(game.test.state(),'decision','still home after 1.4 s');
game.tick(40);assert.equal(game.test.state(),'intro','Back on the start screen');assert.equal(game.element('welcome').hidden,false);assert.equal(game.element('rewards').hidden,false,'with the car colours');
console.log('Parking at home brings the colour picker back: OK');

// Ludvig: the first visit to Bøckmans veg 102 unlocks him (even before the first trip), and he runs after the car at once; on the start screen
// he and the rainbow trail are alternatives: switching one on switches the other off, both may be off, and the choice is remembered.
store.clear();game=await launch(()=>storage);assert.equal(game.world.boy,false);assert.equal(game.element('rewards').hidden,true);
game.test.ludvig();assert.match(game.element('toast').textContent,/Du besøker Ludvig/);assert.equal(game.world.boy,true,'Ludvig runs after the car after the first visit');
assert.equal(game.element('rewards').hidden,false);assert.equal(game.element('ludvigRow').hidden,false);assert.equal(game.element('ludvig').checked,true);assert.equal(game.element('trailRow').hidden,true,'No trail before the third trip');
game.test.ludvig();assert.equal(game.world.boy,true);assert.doesNotMatch(game.element('toast').textContent,/Nå løper/,'Later visits only say hello');
store.set('sofiatur.fremgang',JSON.stringify({...JSON.parse(store.get('sofiatur.fremgang')),arrivals:3}));game=await launch(()=>storage);
assert.equal(game.world.boy,true,'Ludvig remembered');assert.equal(game.world.trail,false,'never both');assert.equal(game.element('trailRow').hidden,false);assert.equal(game.element('trail').checked,false);
game.element('trail').onchange({target:{checked:true}});assert.equal(game.world.trail,true);assert.equal(game.world.boy,false,'The trail switches Ludvig off');assert.equal(game.element('ludvig').checked,false);
game.element('ludvig').onchange({target:{checked:true}});assert.equal(game.world.boy,true);assert.equal(game.world.trail,false,'Ludvig switches the trail off');
game.element('ludvig').onchange({target:{checked:false}});assert.equal(game.world.boy,false);assert.equal(game.world.trail,false,'Both off');
game=await launch(()=>storage);assert.equal(game.test.behind(),'none','Both off is remembered');
store.set('sofiatur.fremgang',JSON.stringify({arrivals:3,behind:'ludvig'}));game=await launch(()=>storage);assert.equal(game.world.boy,false,'Ludvig cannot be forced through storage');assert.equal(game.world.trail,true);
console.log('Visiting Ludvig unlocks him; he and the rainbow trail are alternatives on the start screen: OK');

{// The trail: seven stripes laid behind the car while it moves, fading, and gone a moment after it stops.
const scene=new T.Scene(),trail=createRainbowTrail({T,scene}),pos=new T.Vector3(0,100,0),facing=new T.Vector3(0,0,-1);
trail.setOn(true);for(let i=0;i<120;i++){pos.z-=20*.045;trail.update(.045,pos,facing);}
const g=trail.mesh.geometry,drawn=g.drawRange.count/42+1;assert.ok(drawn>55&&drawn<70,`Trail has ${drawn} points (2.8 s at 20 m/s)`);
const p=g.attributes.position.array,newest=(drawn-1)*14;assert.ok(p[newest*3+2]>pos.z+2.3,'Trail starts behind the rear bumper');
const across=[0,13].map(k=>p[(newest+k)*3]);assert.ok(Math.abs(across[1]-across[0]-1.5)<1e-6,'Band is 1.5 m wide');
const alpha=k=>g.attributes.color.array[k*4+3];assert.ok(alpha(newest-14*5)>alpha(14*2),'Brighter near the car than at the tail');
for(let i=0;i<80;i++)trail.update(.045,pos,facing);assert.equal(g.drawRange.count,0,'Trail fades away when the car stands still');
pos.z-=40;trail.update(.045,pos,facing);assert.equal(trail.points.length,1,'A jump (restart) starts a new trail');trail.setOn(false);assert.equal(trail.mesh.visible,false);
console.log('Rainbow trail follows, fades and resets: OK');}
// Ludvig: runs along the car's own track six metres behind it, on the road, facing the car; when the car stops he catches up to
// its rear corner and waves; a jump (a new trip) puts him right behind the car again.
{const scene=new T.Scene(),boy=createBoy({T,scene}),pos=new T.Vector3(0,100.08,0),facing=new T.Vector3(0,0,-1);
 assert.equal(boy.group.visible,false,'Hidden until the reward is on');boy.setOn(true);assert.equal(boy.group.visible,true);
 for(let i=0;i<200;i++){pos.z-=20*.045;boy.update(.045,pos,facing,20,i*.045);}
 const b=boy.group.position;assert.ok(Math.abs(b.x)<.05&&b.z-pos.z>5.5&&b.z-pos.z<6.5,`Six metres behind the car on its track (${(b.z-pos.z).toFixed(2)} m)`);assert.ok(Math.abs(b.y-100)<.01,'On the road under the car');
 const ahead=new T.Vector3(0,0,-1).applyQuaternion(boy.group.quaternion);assert.ok(ahead.z<-.99,'Running towards the car');
 for(let i=0;i<200;i++){pos.x+=20*.045*.6;pos.z-=20*.045*.8;facing.set(.6,0,-.8);boy.update(.045,pos,facing,20,9+i*.045);}
 const back=Math.hypot(b.x-pos.x,b.z-pos.z),off=Math.abs((b.x-pos.x)*.8+(b.z-pos.z)*.6);assert.ok(back>5.5&&back<6.5&&off<.1,'Round the bend on the track');
 for(let i=0;i<160;i++)boy.update(.045,pos,facing,0,18+i*.045);
 const d=Math.hypot(b.x-pos.x,b.z-pos.z);assert.ok(d>2.8&&d<4,`Caught up with the parked car (${d.toFixed(2)} m)`);const side=(b.x-pos.x)*.8+(b.z-pos.z)*.6;assert.ok(side>.9,'Standing by its right rear corner');
 pos.x+=300;boy.update(.045,pos,facing,0,30);assert.ok(Math.hypot(b.x-pos.x,b.z-pos.z)<7,'A jump starts him again right behind the car');
 boy.setOn(false);assert.equal(boy.group.visible,false);}
console.log('Ludvig runs after the car, round bends, catches up when it stops and waves: OK');

// Debug keys for testing the unlocks: X counts one more trip to the kindergarten, Z one fewer (saved like a real count).
store.clear();game=await launch(()=>storage);
for(let i=0;i<4;i++)game.key('x');assert.equal(game.test.progress().arrivals,4);assert.equal(game.world.colour,'rainbow');assert.equal(game.world.trail,true);assert.equal(game.world.model,'cat');
assert.equal(game.element('catRow').hidden,false);assert.equal(game.element('carColours').children[10].hidden,false);assert.match(game.element('toast').textContent,/4 · regnbuebil/);
game.key('X');assert.equal(game.test.progress().arrivals,5);game.key('z');
game.key('z');assert.equal(game.test.progress().arrivals,3);assert.equal(game.world.colour,'#14171c','Rainbow colour locked again below 4');assert.equal(game.element('carColours').children[10].hidden,true);assert.equal(game.world.model,'cat');
game.key('Z');assert.equal(game.test.progress().arrivals,2);assert.equal(game.world.trail,false,'Trail locked again below 3');assert.equal(game.element('trailRow').hidden,true);assert.equal(game.world.model,'cat');
game=await launch(()=>storage);assert.equal(game.test.progress().arrivals,2,'The count is saved');
game.key('z');assert.equal(game.world.model,'car','Cat locked again below 2');assert.equal(game.element('catRow').hidden,true);
for(let i=0;i<4;i++)game.key('z');assert.equal(game.test.progress().arrivals,0,'Never below 0');assert.equal(game.element('rewards').hidden,true);
game.key('x',{tagName:'INPUT'});assert.equal(game.test.progress().arrivals,0,'Not while typing in a field');
console.log('Debug keys: X and Z count trips up and down, unlocking and locking the rewards: OK');

// The cat wears the KIWI logo on both flanks with the KIWI skin (world.js shows it): hidden to begin with, one on each side,
// just outside the fur and facing out, the size of the logo on the car's doors.
{const logo=new T.MeshBasicMaterial(),cat=createCat(T,{logos:{kiwi:logo}});cat.group.updateMatrixWorld(true);
 assert.equal(cat.skins.kiwi.length,2);assert.ok(cat.skins.kiwi.every(m=>!m.visible&&m.material===logo),'Hidden until the KIWI skin is chosen');
 const sides=cat.skins.kiwi.map(m=>{m.geometry.computeBoundingBox();const b=m.geometry.boundingBox,n=m.geometry.attributes.normal;let out=0;for(let i=0;i<n.count;i++)out+=Math.sign(n.getX(i))*Math.sign(b.min.x+b.max.x);return {b,out:out/n.count};});
 assert.ok(sides[0].b.max.x<-.45&&sides[1].b.min.x>.45,'One logo on each flank');assert.ok(sides.every(s=>s.out>.99),'Both face out');
 assert.ok(sides.every(({b})=>b.max.z-b.min.z>1.1&&b.max.y-b.min.y>.35),'The size of the logo on the doors');
 assert.deepEqual(Object.keys(createCat(T).skins),[],'No logos without a skin');}
console.log('The cat wears the KIWI logo on both flanks with the KIWI skin: OK');
