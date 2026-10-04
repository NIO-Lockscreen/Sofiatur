import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
import {createBoy} from './dist/boy.js';
import {createDuckRunner} from './dist/duck-runner.js';
import {createDog,createRideDuck,createRocket,createUnicorn,createFireTruck,createBalloon,createTRex,BEACONS} from './dist/rides.js';
import {createBubbles} from './dist/bubbles.js';
import {createRainbowTrail} from './dist/rainbow-trail.js';
import {createCat} from './dist/cat-model.js';
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));
const code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
// Starts a fresh game (as after a page reload) with the given browser storage; the world records paint, boy and model calls.
async function launch(localStorage){
 const els=new Map(),world={colour:null,trail:null,boy:null,bubbles:null,honks:0,skin:null,model:null};let callbacks=[],now=0;const canvasContext=new Proxy({},{get:()=>()=>{}});
 const element=id=>{if(!els.has(id))els.set(id,{hidden:false,textContent:'',value:'',checked:false,style:{},children:[],attrs:{},classes:new Set(),classList:{add(){},remove(){},toggle(c,on){on?this.owner.classes.add(c):this.owner.classes.delete(c);}},setAttribute(k,v){this.attrs[k]=v;},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},addEventListener(){},getContext(){return canvasContext}});const el=els.get(id);el.classList.owner=el;return el;};
 const listeners=new Map();
 const env={T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},window:{addEventListener:(type,fn)=>listeners.set(type,fn)},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),
  createWorld:()=>({height:()=>160,update(){},resetCamera(){},setTurnArrow(){},setCarColour:c=>world.colour=c,setCarSkin:k=>world.skin=k,setCarModel:m=>world.model=m,setTrail:on=>world.trail=on,setBoy:on=>world.boy=on,setDuckRunner:on=>world.duckRunner=on,setBubbles:on=>world.bubbles=on,honk:()=>world.honks++})};
 if(localStorage)Object.defineProperty(env,'localStorage',{get:localStorage});
 const ctx=vm.createContext(env);
 const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={arrive(){start();finish();},park(){parkAtKiwi();},home(){start();current=data.start;state='decision';parkAtHome();},ludvig(){parkAtLudvig();},freeDrive(x,z,v){if(state!=='free'){freeMode=true;start();}free.reset(x,z,0,v);freeVisits();},visit(n){start();active={e:{from:data.start,to:{kiwi:kiwiParking,ludvig:ludvigParking,lake:data.lakeside}[n]},line:{at(l,p){if(n==='lake'){const q=data.nodes[data.lakeside];p.set(q[0],100,q[1]);}},tangent(){}},len:0};arrive();},start(){start();},honkKey(){honk();},state:()=>state,progress:()=>({arrivals,carColour,trailOn:behind==='trail',catOn:model==='cat'}),model:()=>model,behind:()=>behind};})()`,ctx);
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
swatches[3].onclick();
assert.ok(!fs.readFileSync('dist/index.html','utf8').includes('type="color"'),'No free colour wheel, only the ten colours (and the rainbow and KIWI)');
console.log('First arrival unlocks the colour picker on the start screen: OK');
// A colour saved from the old colour wheel becomes the nearest of the ten.
{const keep=store.get('sofiatur.fremgang');store.set('sofiatur.fremgang',JSON.stringify({arrivals:1,colour:'#12AB34'}));const g=await launch(()=>storage);assert.equal(g.world.colour,'#3b9a43','a green from the wheel is green');
 assert.ok(g.element('carColours').children[6].classes.has('on'),'and shows as picked');store.set('sofiatur.fremgang',keep);}

// The order since 30 September 2026: 1 colour picker, 2 running cat, 3 rainbow trail, 4 rainbow colour.
// After a reload the colour is kept; the second arrival turns the car into a running cat, with a switch back to the car on
// the start screen; the choice is kept after a reload.
game=await launch(()=>storage);assert.equal(game.world.colour,'#7b4cc2');assert.equal(game.element('rewards').hidden,false);assert.match(game.element('rewardTeaser').textContent,/én gang til/);
game.test.arrive();assert.equal(game.test.progress().arrivals,2);assert.equal(game.world.model,'cat');assert.match(game.element('unlock').textContent,/katt/);assert.match(game.element('again').textContent,/katten/);
game.element('again').onclick();assert.equal(game.element('modelRow').hidden,false);assert.ok(game.element('model-cat').classes.has('on'));assert.equal(game.element('model-dog').hidden,true,'The dog waits for the fifth trip');assert.equal(game.element('trailRow').hidden,true,'The trail waits for the third trip');assert.equal(game.element('rewardTeaser').hidden,false,'More surprises to come');
assert.equal(game.world.trail,false);assert.equal(game.world.colour,'#7b4cc2','A purple cat');
game.element('model-car').onclick();assert.equal(game.world.model,'car');game=await launch(()=>storage);assert.equal(game.world.model,'car','Car remembered');
game.element('model-cat').onclick();game=await launch(()=>storage);assert.equal(game.world.model,'cat','Cat remembered');
console.log('Second arrival turns the car into a running cat; the switch survives a reload: OK');

// Third arrival: the rainbow trail (on by default), with its switch on the start screen, remembered after a reload.
game.test.arrive();assert.equal(game.test.progress().arrivals,3);assert.equal(game.world.trail,true);assert.match(game.element('unlock').textContent,/regnbuespor/);assert.equal(game.world.boy,false,'Ludvig waits for a visit');assert.equal(game.element('ludvigRow').hidden,true);
game.element('again').onclick();assert.equal(game.element('trailRow').hidden,false);assert.equal(game.element('trail').checked,true);assert.equal(game.element('carColours').children[10].hidden,true,'The rainbow colour waits for the fourth trip');
game.element('trail').onchange({target:{checked:false}});assert.equal(game.world.trail,false);
game=await launch(()=>storage);assert.equal(game.world.trail,false,'Trail switch is remembered');assert.equal(game.element('trail').checked,false);game.element('trail').onchange({target:{checked:true}});
console.log('Third arrival unlocks the rainbow trail; the trail switch survives a reload: OK');

// Fourth arrival: the rainbow colour that changes all the time, picked at once and kept after a reload; a colour can still be picked.
game.test.arrive();assert.equal(game.test.progress().arrivals,4);assert.equal(game.world.colour,'rainbow');assert.match(game.element('unlock').textContent,/regnbuebil/);assert.match(game.element('again').textContent,/regnbuebilen/);
game.element('again').onclick();let rainbowButton=game.element('carColours').children[10];assert.equal(rainbowButton.hidden,false);assert.ok(rainbowButton.classes.has('on'));assert.equal(game.element('rewardTeaser').hidden,false,'More surprises after the fourth trip');
game.element('carColours').children[1].onclick();assert.equal(game.world.colour,'#c62828');rainbowButton.onclick();assert.equal(game.world.colour,'rainbow');
game=await launch(()=>storage);assert.equal(game.world.colour,'rainbow','Rainbow colour remembered');assert.equal(game.world.model,'cat','A rainbow cat');assert.equal(game.world.trail,true);
// Fifth, sixth and seventh arrival (3 October 2026): the dog, the duck and the rocket, each chosen at once and kept after a reload; then no more.
game.test.arrive();assert.equal(game.test.progress().arrivals,5);assert.equal(game.world.model,'dog');assert.match(game.element('unlock').textContent,/hund/);assert.match(game.element('again').textContent,/hunden/);
game.element('again').onclick();assert.equal(game.element('model-dog').hidden,false);assert.ok(game.element('model-dog').classes.has('on'));assert.equal(game.element('model-duck').hidden,true);assert.equal(game.element('rewardTeaser').hidden,false);
game.test.arrive();assert.equal(game.world.model,'duck');assert.match(game.element('unlock').textContent,/and/);game.element('again').onclick();assert.equal(game.element('model-duck').hidden,false);assert.equal(game.element('model-rocket').hidden,true);
game.test.arrive();assert.equal(game.world.model,'rocket');assert.match(game.element('unlock').textContent,/rakett/);game.element('again').onclick();assert.equal(game.element('model-rocket').hidden,false);assert.equal(game.element('rewardTeaser').hidden,false,'More to come after the seventh trip');
game.element('model-dog').onclick();assert.equal(game.world.model,'dog');game=await launch(()=>storage);assert.equal(game.world.model,'dog','The dog remembered');assert.equal(game.world.colour,'rainbow','a rainbow dog');
// Trips 8 to 13 (3 October 2026): the unicorn, soap bubbles (an alternative behind the car), the fire engine, the horn, the hot-air balloon and last the T. rex.
game.test.arrive();assert.equal(game.test.progress().arrivals,8);assert.equal(game.world.model,'unicorn');assert.match(game.element('unlock').textContent,/enhjørning/);game.element('again').onclick();assert.equal(game.element('model-unicorn').hidden,false);assert.equal(game.element('bubblesRow').hidden,true);
game.test.arrive();assert.match(game.element('unlock').textContent,/såpebobler/);assert.equal(game.world.bubbles,true,'Bubbles on at once');assert.equal(game.world.trail,false,'instead of the trail');game.element('again').onclick();assert.equal(game.element('bubblesRow').hidden,false);assert.equal(game.element('bubbles').checked,true);
game.element('trail').onchange({target:{checked:true}});assert.equal(game.world.trail,true);assert.equal(game.world.bubbles,false,'The trail switches the bubbles off');game.element('bubbles').onchange({target:{checked:true}});assert.equal(game.world.bubbles,true);assert.equal(game.world.trail,false);
game.test.arrive();assert.equal(game.world.model,'firetruck');assert.equal(game.world.colour,'#c62828','The fire engine comes red, the standard one');assert.match(game.element('unlock').textContent,/brannbil/);assert.equal(game.element('horn').hidden,true,'The horn waits for the eleventh trip');
game.test.arrive();assert.match(game.element('unlock').textContent,/tute/);assert.equal(game.element('horn').hidden,false,'The horn button');game.element('again').onclick();game.test.start();game.element('horn').onclick();assert.equal(game.world.honks,1,'Honking makes the ride react');
game.test.honkKey();assert.equal(game.world.honks,2,'H honks too');
game.test.arrive();assert.equal(game.world.model,'balloon');assert.match(game.element('unlock').textContent,/luftballong/);game.element('again').onclick();assert.equal(game.element('rewardTeaser').hidden,false);
game.test.arrive();assert.equal(game.test.progress().arrivals,13);assert.equal(game.world.model,'trex');assert.match(game.element('unlock').textContent,/T-rex/);assert.match(game.element('unlock').textContent,/alle overraskelsene/);
game.element('again').onclick();for(const m of ['car','cat','dog','duck','rocket','unicorn','firetruck','balloon','trex'])assert.equal(game.element('model-'+m).hidden,false,m+' in the picker');assert.equal(game.element('rewardTeaser').hidden,true,'No teaser once everything is unlocked');
game=await launch(()=>storage);assert.equal(game.world.model,'trex','The T. rex remembered');assert.equal(game.world.bubbles,true,'and the bubbles');
game.test.arrive();assert.equal(game.element('unlock').hidden,true,'No new reward on later trips');assert.match(game.element('again').textContent,/en gang til/);
store.set('sofiatur.fremgang',JSON.stringify({arrivals:8,model:'trex',behind:'bubbles'}));game=await launch(()=>storage);assert.equal(game.world.model,'car','The T. rex only after thirteen trips');assert.equal(game.world.bubbles,false,'bubbles only after nine');
store.set('sofiatur.fremgang',JSON.stringify({arrivals:5,model:'rocket'}));game=await launch(()=>storage);assert.equal(game.world.model,'car','The rocket only after seven trips');
console.log('Fourth arrival unlocks the rainbow colour, then the dog, duck, rocket, unicorn, soap bubbles, fire engine, horn, hot-air balloon and last the T. rex; everything survives a reload: OK');

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
// Every visit to Ludvig puts him back behind the car, and every visit to KIWI the KIWI paint, Ludvig still running after it (driven there, through arrive()).
game.element('trail').onchange({target:{checked:true}});game.test.visit('ludvig');assert.equal(game.test.behind(),'ludvig');assert.equal(game.world.boy,true,'A visit puts Ludvig back behind the car');assert.equal(game.world.trail,false);assert.match(game.element('toast').textContent,/igjen/);
game.test.visit('kiwi');assert.equal(game.world.skin,'kiwi','The KIWI paint at KIWI');assert.equal(game.world.boy,true,'and Ludvig still runs after it');
game.element('carColours').children[0].onclick();game.element('ludvig').onchange({target:{checked:false}});assert.equal(game.world.skin,null);assert.equal(game.world.boy,false);
for(let k=0;k<3;k++){game.test.visit('ludvig');assert.equal(game.world.boy,true,'Ludvig after visit '+(k+2));game.test.visit('kiwi');assert.equal(game.world.skin,'kiwi','KIWI after visit '+(k+2));assert.equal(game.world.boy,true);game.element('carColours').children[0].onclick();game.element('trail').onchange({target:{checked:true}});}
game.test.visit('kiwi');game.test.visit('ludvig');game=await launch(()=>storage);assert.equal(game.world.skin,'kiwi');assert.equal(game.world.boy,true,'both remembered');
store.set('sofiatur.fremgang',JSON.stringify({arrivals:3,behind:'ludvig'}));game=await launch(()=>storage);assert.equal(game.world.boy,false,'Ludvig cannot be forced through storage');assert.equal(game.world.trail,true);
console.log('Visiting Ludvig unlocks him; he and the rainbow trail are alternatives on the start screen: OK');
// Free driving counts visits too: driving into KIWI's or Ludvig's parking place is a visit, again once the car has been away; home and the
// kindergarten end the drive, so there the car must stop (and the game says so on the way in).
{store.clear();store.set('sofiatur.fremgang',JSON.stringify({arrivals:3}));game=await launch(()=>storage);const node=n=>data.nodes[n],drive=(n,dx,v=12)=>game.test.freeDrive(node(n)[0]+dx,node(n)[1],v);
 drive('kiwi-parkering',3);assert.equal(game.test.state(),'free');assert.equal(game.world.skin,'kiwi','Driving into KIWI puts the KIWI paint on');assert.match(game.element('toast').textContent,/KIWI/);
 game.element('carColours').children[0].onclick();drive('kiwi-parkering',5);assert.equal(game.world.skin,null,'not again while still there');
 drive('kiwi-parkering',45);drive('kiwi-parkering',2);assert.equal(game.world.skin,'kiwi','again after driving away and back');
 drive('ludvig-parkering',2);assert.equal(game.world.boy,true,'Driving into Ludvig\'s yard is a visit');assert.match(game.element('toast').textContent,/Du besøker Ludvig/);
 game.element('trail').onchange({target:{checked:true}});assert.equal(game.world.boy,false);drive('ludvig-parkering',40);drive('ludvig-parkering',-3);assert.equal(game.world.boy,true,'and every visit puts him back behind the car');
 drive(data.lakeside,3);assert.match(game.element('toast').textContent,/Lianvannet/,'Lianvannet too');
 drive(data.goal,5);assert.equal(game.test.state(),'free','Passing the kindergarten does not end the drive');assert.match(game.element('toast').textContent,/Brems for å parkere ved barnehagen/);
 drive(data.goal,5,0);assert.equal(game.test.state(),'finished','Stopping there does');assert.equal(game.test.progress().arrivals,4,'and counts the trip');assert.equal(game.element('freeControls').hidden,true);assert.match(game.element('finishSummary').textContent,/frikjøring/);
 game=await launch(()=>storage);drive(data.start,3,0);assert.equal(game.test.state(),'free','Starting at home is not a visit home');
 drive(data.start,40);drive(data.start,4,0);assert.match(game.element('toast').textContent,/Hjemme/);game.tick(70);assert.equal(game.test.state(),'intro','Stopping at home again brings the start screen back');}
{const f=createFreeDrive(data,()=>100);for(const n of ['kiwi-parkering','ludvig-parkering','ishall-parkering','rema-parkering','bunnpris-parkering',data.lakeside,data.goal,data.start])assert.equal(f.blocked(...data.nodes[n]),false,n+' can be reached in free driving');}
console.log('Free driving counts visits: KIWI, Ludvig, Lianvannet, the kindergarten and home, all within reach: OK');
// The easter egg (4 October 2026): visit the big duck in Lianvannet driving as the duck, honk, and a duck runs after the car. It takes the horn (the eleventh
// trip), the duck (the sixth), a visit to the lake and a honk by the water. It is one more alternative behind the car on the start screen.
{const duckStore=extra=>{store.clear();store.set('sofiatur.fremgang',JSON.stringify({arrivals:11,model:'duck',...extra}));};
 duckStore();let game=await launch(()=>storage);assert.equal(game.world.duckRunner,false,'No duck behind the car to begin with');assert.equal(game.element('duckRunnerRow').hidden,true);
 game.test.start();game.test.honkKey();assert.equal(game.world.duckRunner,false,'Honking away from the lake does nothing');assert.equal(game.world.honks,1);
 game.test.visit('lake');assert.match(game.element('toast').textContent,/Lianvannet/);assert.equal(game.world.duckRunner,false,'Visiting the lake alone does not unlock it');
 game.element('toast').textContent='';game.test.honkKey();assert.equal(game.world.duckRunner,true,'Honking at the lake, driving as the duck, does');assert.match(game.element('toast').textContent,/Anda hørte tuta/);assert.equal(game.test.behind(),'duck');assert.equal(game.world.boy,false);assert.equal(game.world.trail,false);
 assert.equal(game.element('duckRunnerRow').hidden,false);assert.equal(game.element('duckRunner').checked,true);assert.equal(game.element('rewards').hidden,false);
 game.element('toast').textContent='';game.test.honkKey();game.test.honkKey();assert.equal(game.element('toast').textContent,'','Honking again says nothing more while it already runs');
 game=await launch(()=>storage);assert.equal(game.world.duckRunner,true,'Remembered');assert.equal(game.element('duckRunner').checked,true);
 // An alternative to the trail, Ludvig and the bubbles: one at a time, all may be off, the choice is remembered.
 game.element('trail').onchange({target:{checked:true}});assert.equal(game.world.duckRunner,false,'The trail switches it off');assert.equal(game.element('duckRunner').checked,false);
 game.element('duckRunner').onchange({target:{checked:true}});assert.equal(game.world.duckRunner,true);assert.equal(game.world.trail,false,'and it switches the trail off');
 game.test.ludvig();assert.equal(game.world.boy,true);assert.equal(game.world.duckRunner,false,'Ludvig takes its place');game.element('duckRunner').onchange({target:{checked:true}});assert.equal(game.world.boy,false,'and it takes his');
 game.element('bubbles').onchange({target:{checked:true}});assert.equal(game.world.duckRunner,false);game.element('duckRunner').onchange({target:{checked:true}});assert.equal(game.world.bubbles,false);
 game.element('duckRunner').onchange({target:{checked:false}});assert.equal(game.world.duckRunner,false);assert.equal(game.test.behind(),'none','All off');game=await launch(()=>storage);assert.equal(game.test.behind(),'none','All off is remembered');
 // Every honk at the lake puts it back behind the car.
 game.test.visit('lake');game.element('toast').textContent='';game.test.honkKey();assert.equal(game.world.duckRunner,true,'It is back behind the car');assert.match(game.element('toast').textContent,/igjen/);
 // Not driving as the duck, without the horn, or with the duck not unlocked in storage: nothing.
 for(const [what,extra] of [['as the dog',{model:'dog'}],['as the car',{model:'car'}],['as the T. rex',{arrivals:13,model:'trex'}],['before the horn',{arrivals:10}]]){duckStore(extra);game=await launch(()=>storage);game.test.visit('lake');game.test.honkKey();game.test.honkKey();assert.equal(game.world.duckRunner,false,'No duck '+what);assert.equal(game.element('duckRunnerRow').hidden,true);}
 duckStore({behind:'duck'});game=await launch(()=>storage);assert.equal(game.world.duckRunner,false,'It cannot be forced through storage');assert.equal(game.test.behind(),'trail');
 // Free driving: a visit (within 8 m of the turning circle), the horn within 30 m of it; further away, or without a visit, nothing.
 {duckStore();game=await launch(()=>storage);const node=data.nodes[data.lakeside],drive=(dx,v=12)=>game.test.freeDrive(node[0]+dx,node[1],v);
  drive(60);game.test.honkKey();assert.equal(game.world.duckRunner,false,'Honking near the lake without having visited it');
  drive(4);assert.match(game.element('toast').textContent,/Lianvannet/);drive(25);game.test.honkKey();assert.equal(game.world.duckRunner,true,'Honked 25 m from the turning circle, after the visit');
  duckStore();game=await launch(()=>storage);drive(4);drive(45);game.test.honkKey();assert.equal(game.world.duckRunner,false,'Honking 45 m from it, after the visit, does not count');
  drive(20);game.test.honkKey();assert.equal(game.world.duckRunner,false,'and that visit is spent: back within 30 m but not at the circle, nothing');drive(4);game.test.honkKey();assert.equal(game.world.duckRunner,true,'a new visit, then the horn, does');}}
console.log('Easter egg: visiting the duck as the duck and honking sets a duck running after the car; it is one of the alternatives behind it: OK');

{// The trail: seven stripes laid behind the car while it moves, fading, and gone a moment after it stops.
const scene=new T.Scene(),trail=createRainbowTrail({T,scene}),pos=new T.Vector3(0,100,0),facing=new T.Vector3(0,0,-1);
trail.setOn(true);for(let i=0;i<120;i++){pos.z-=20*.045;trail.update(.045,pos,facing);}
const g=trail.mesh.geometry,drawn=g.drawRange.count/42+1;assert.ok(drawn>55&&drawn<70,`Trail has ${drawn} points (2.8 s at 20 m/s)`);
const p=g.attributes.position.array,newest=(drawn-1)*14;assert.ok(p[newest*3+2]>pos.z+2.3,'Trail starts behind the rear bumper');
const across=[0,13].map(k=>p[(newest+k)*3]);assert.ok(Math.abs(across[1]-across[0]-1.5)<1e-6,'Band is 1.5 m wide');
const alpha=k=>g.attributes.color.array[k*4+3];assert.ok(alpha(newest-14*5)>alpha(14*2),'Brighter near the car than at the tail');
for(let i=0;i<80;i++)trail.update(.045,pos,facing);assert.equal(g.drawRange.count,0,'Trail fades away when the car stands still');
for(let i=0;i<10;i++){pos.z-=20*.045;trail.update(.045,pos,facing);}const laid=trail.points.length;trail.setOn(true);assert.equal(trail.points.length,laid,'Switching it on again keeps the trail');
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
 const was=b.clone();boy.setOn(true);boy.update(.045,pos,facing,0,25.3);assert.ok(b.distanceTo(was)<.1,'Switching him on again (a visit to KIWI) keeps him where he is');
 pos.x+=300;boy.update(.045,pos,facing,0,30);assert.ok(Math.hypot(b.x-pos.x,b.z-pos.z)<7,'A jump starts him again right behind the car');
 boy.setOn(false);assert.equal(boy.group.visible,false);}
console.log('Ludvig runs after the car, round bends, catches up when it stops and waves: OK');
// The running duck (the easter egg, duck-runner.js): the same follower as Ludvig with a mallard for a model; it runs six metres behind the car on its
// track, its legs swing and it waddles while it runs, beats its wings half spread, and by the parked car it flaps them.
{const scene=new T.Scene(),duck=createDuckRunner({T,scene}),pos=new T.Vector3(0,100.08,0),facing=new T.Vector3(0,0,-1),lift=()=>Math.max(...duck.model.wings.map(w=>Math.abs(w.rotation.z))),span=()=>duck.model.wings[0].userData.paddle.scale.x;
 assert.equal(duck.group.visible,false,'Hidden until the easter egg is found');duck.setOn(true);assert.equal(duck.group.visible,true);
 assert.ok(lift()<.01&&span()<.06,'Standing, the wings are folded along its flanks');
 let roll=0,swing=0,beat=0,lo=9,hi=-9;for(let i=0;i<200;i++){pos.z-=20*.045;duck.update(.045,pos,facing,20,i*.045);if(i>20){roll=Math.max(roll,Math.abs(duck.model.group.children[0].rotation.z));swing=Math.max(swing,Math.abs(duck.model.legs[0].rotation.x));lo=Math.min(lo,lift());hi=Math.max(hi,lift());}}
 const d=duck.group.position;assert.ok(Math.abs(d.x)<.05&&d.z-pos.z>5.5&&d.z-pos.z<6.5,`Six metres behind the car on its track (${(d.z-pos.z).toFixed(2)} m)`);assert.ok(Math.abs(d.y-100)<.01,'On the road under the car');
 assert.ok(new T.Vector3(0,0,-1).applyQuaternion(duck.group.quaternion).z<-.99,'Running towards the car');
 assert.ok(roll>.1&&swing>.8,'It waddles and its legs swing while it runs');assert.ok(span()>.12&&span()<.2&&hi-lo>.1&&hi<.8,'The wings beat, half spread');
 for(let i=0;i<160;i++)duck.update(.045,pos,facing,0,9+i*.045);
 const g=Math.hypot(d.x-pos.x,d.z-pos.z);assert.ok(g>2.8&&g<4,`Caught up with the parked car (${g.toFixed(2)} m)`);assert.ok((d.x-pos.x)>.9,'standing by its rear corner');assert.ok(span()>.2,'and its wings are spread');
 let top=0;for(let i=0;i<60;i++){duck.update(.045,pos,facing,0,12+i*.045);top=Math.max(top,lift());}assert.ok(top>.5&&top<1,'raised and beating: the duck waves');
 pos.x+=300;duck.update(.045,pos,facing,0,30);assert.ok(Math.hypot(d.x-pos.x,d.z-pos.z)<7,'A jump starts it again right behind the car');
 duck.setOn(false);assert.equal(duck.group.visible,false);
 const box=new T.Box3().setFromObject(duck.model.group);assert.ok(box.max.y-box.min.y>.7&&box.max.y-box.min.y<1.2,'about 0.9 m tall: '+(box.max.y-box.min.y).toFixed(2));
 let meshes=0;duck.model.group.traverse(o=>{if(o.isMesh)meshes++;});assert.ok(meshes<45,'cheap: '+meshes+' meshes');}
console.log('The running duck follows the car, waddles, beats its wings and flaps them by the parked car: OK');

// Debug keys for testing the unlocks: X counts one more trip to the kindergarten, Z one fewer (saved like a real count).
store.clear();game=await launch(()=>storage);
for(let i=0;i<4;i++)game.key('x');assert.equal(game.test.progress().arrivals,4);assert.equal(game.world.colour,'rainbow');assert.equal(game.world.trail,true);assert.equal(game.world.model,'cat');
assert.equal(game.element('modelRow').hidden,false);assert.equal(game.element('carColours').children[10].hidden,false);assert.match(game.element('toast').textContent,/4 · regnbuebil/);
game.key('X');assert.equal(game.test.progress().arrivals,5);game.key('z');
game.key('z');assert.equal(game.test.progress().arrivals,3);assert.equal(game.world.colour,'#14171c','Rainbow colour locked again below 4');assert.equal(game.element('carColours').children[10].hidden,true);assert.equal(game.world.model,'cat');
game.key('Z');assert.equal(game.test.progress().arrivals,2);assert.equal(game.world.trail,false,'Trail locked again below 3');assert.equal(game.element('trailRow').hidden,true);assert.equal(game.world.model,'cat');
game=await launch(()=>storage);assert.equal(game.test.progress().arrivals,2,'The count is saved');
game.key('z');assert.equal(game.world.model,'car','Cat locked again below 2');assert.equal(game.element('modelRow').hidden,true);
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

// The dog, the duck and the rocket: about the car's size (forward −z, on the ground), they take the paint colour, wear the KIWI logo on
// both flanks with the KIWI skin (hidden until it is chosen, facing out), and move: the dog's and duck's legs swing at speed, the rocket hovers
// and its flame grows with the speed.
for(const [name,make] of [['dog',createDog],['duck',createRideDuck],['rocket',createRocket]]){
 const logo=new T.MeshBasicMaterial(),ride=make(T,{logos:{kiwi:logo}});ride.group.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(ride.group),size=box.getSize(new T.Vector3());
 assert.ok(size.z>3&&size.z<6.5&&size.x>1.2&&size.x<3.2&&size.y>1.5&&size.y<3.4,`${name}: about the car's size (${size.toArray().map(v=>v.toFixed(1))})`);
 assert.ok(box.min.y>-.05&&box.min.y<.9,`${name}: on (or just over) the ground (${box.min.y.toFixed(2)})`);
 assert.equal(ride.skins.kiwi.length,2);assert.ok(ride.skins.kiwi.every(m=>!m.visible&&m.material===logo),name+': logos hidden until the KIWI skin');
 const sides=ride.skins.kiwi.map(m=>{m.geometry.computeBoundingBox();const b=m.geometry.boundingBox,n=m.geometry.attributes.normal;let out=0;for(let i=0;i<n.count;i++)out+=Math.sign(n.getX(i))*Math.sign(b.min.x+b.max.x);return {b,out:out/n.count};});
 assert.ok(sides[0].b.max.x<-.4&&sides[1].b.min.x>.4&&sides.every(s=>s.out>.99),name+': one logo on each flank, facing out');
 const pink=new T.Color('#ec6aa8');ride.update(.05,0,1,pink);let painted=false;ride.group.traverse(o=>{if(o.material&&o.material.color&&o.material.color.equals(pink))painted=true;});assert.ok(painted,name+' takes the paint colour');
 const pose=()=>{const v=[];ride.group.traverse(o=>{if(o.isGroup||o.isMesh)v.push(o.rotation.x,o.position.y,o.scale.y);});return v;};
 const still=pose();for(let i=0;i<10;i++)ride.update(.05,14,1+i*.05,pink);const moving=pose();assert.ok(still.some((v,i)=>Math.abs(v-moving[i])>.05),name+' moves at speed');
}
{const rocket=createRocket(T);rocket.update(.05,0,1);const flame=()=>{let len=0;rocket.group.traverse(o=>{if(o.isMesh&&o.material.isMeshBasicMaterial&&o.material.transparent)len=Math.max(len,o.scale.y);});return len;};
 const idle=flame();rocket.update(.05,50,1);assert.ok(flame()>idle*3,'The rocket\'s flame grows with the speed');}
console.log('The dog, the duck and the rocket: car-sized, painted, KIWI logos on both flanks, moving: OK');

// Trips 8 to 13: the unicorn, the fire engine, the hot-air balloon (floating) and the T. rex: their sizes, the KIWI logos,
// the paint, movement, and honk (the T. rex opens its jaws).
for(const [name,make,{x,y,z,minY,paints}] of [['unicorn',createUnicorn,{x:[1,2.5],y:[3,4.2],z:[3.5,5.5],minY:[-.05,.2],paints:true}],['firetruck',createFireTruck,{x:[2,2.6],y:[2.4,3],z:[5,6.5],minY:[-.1,.1],paints:true}],
  ['balloon',createBalloon,{x:[3,4],y:[4.5,6.2],z:[3,4],minY:[.5,1.3],paints:true}],['trex',createTRex,{x:[1.5,2.5],y:[3,4],z:[6,8.5],minY:[-.05,.4],paints:true}]]){
 const logo=new T.MeshBasicMaterial(),ride=make(T,{logos:{kiwi:logo}});ride.group.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(ride.group),size=box.getSize(new T.Vector3()),within=(v,[a,b])=>v>=a&&v<=b;
 assert.ok(within(size.x,x)&&within(size.y,y)&&within(size.z,z)&&within(box.min.y,minY),`${name}: size ${size.toArray().map(v=>v.toFixed(1))}, lowest point ${box.min.y.toFixed(2)}`);
 assert.equal(ride.skins.kiwi.length,2,name+': a KIWI logo on each side');assert.ok(ride.skins.kiwi.every(m=>!m.visible),name+': hidden until the KIWI skin');
 const pink=new T.Color('#ec6aa8');ride.update(.05,0,1,pink);let painted=false;ride.group.traverse(o=>{if(o.material?.color?.equals(pink))painted=true;});assert.equal(painted,paints,name+(paints?' takes the paint colour':' keeps its own colour'));
 const pose=()=>{const v=[];ride.group.traverse(o=>{if(o.isGroup||o.isMesh)v.push(o.rotation.x,o.rotation.y,o.position.y,o.scale.y);});return v;};
 const still=pose();for(let i=0;i<10;i++)ride.update(.05,14,1+i*.05,pink);assert.ok(still.some((v,i)=>Math.abs(v-pose()[i])>.03),name+' moves');
 assert.equal(typeof ride.honk,'function',name+' reacts to the horn');}
{const rex=createTRex(T);rex.update(.05,0,1);const shut=rex.jaw.rotation.x;rex.honk();let widest=0;for(let i=0;i<30;i++){rex.update(.05,0,1+i*.05);widest=Math.max(widest,rex.jaw.rotation.x);}
 assert.ok(widest>shut+.6,'The T. rex opens its jaws wide when it honks ('+widest.toFixed(2)+')');assert.ok(rex.jaw.rotation.x<widest,'and shuts them again');}
{const scene=new T.Scene(),b=createBubbles({T,scene}),pos=new T.Vector3(0,100,0),facing=new T.Vector3(0,0,-1);assert.equal(b.mesh.visible,false);b.setOn(true);
 for(let i=0;i<60;i++){pos.z-=10*.05;b.update(.05,pos,facing);}assert.ok(b.mesh.count>15,'Soap bubbles are blown ('+b.mesh.count+')');assert.ok(b.bubbles.every(q=>q.y>pos.y),'and rise above the car');
 assert.ok(b.bubbles.reduce((a,q)=>a+q.z,0)/b.bubbles.length>pos.z+1,'behind it');for(let i=0;i<120;i++)b.update(.05,pos,facing);assert.ok(b.bubbles.every(q=>q.age<=q.life),'and pop');b.setOn(false);assert.equal(b.mesh.visible,false);}
console.log('Unicorn, fire engine, hot-air balloon and T. rex: sizes, logos, paint, movement, honk; soap bubbles blown, rising and popping: OK');
// The fire engine takes the colour chosen, and its beacons a pair of colours for each: red is the standard fire engine with blue lights, KIWI green
// and white, every colour of the picker its own pair; on the white paint the stripe turns red; the rainbow sends the beacons round the rainbow.
{const truck=createFireTruck(T),colours=fs.readFileSync('dist/game.js','utf8').match(/const carColours=(\[.*?\]\]);/)[1],palette=JSON.parse(colours.replace(/'/g,'"'));
 assert.deepEqual(truck.beaconColours(),['#2a6bff','#2a6bff'],'Red, the standard: blue lights');truck.beacons('kiwi');assert.deepEqual(truck.beaconColours(),['#39d353','#ffffff'],'KIWI: green and white');
 const pairs=new Set();for(const [name,hex] of palette){assert.ok(BEACONS[hex],name+' has its own lights');truck.beacons(hex);pairs.add(truck.beaconColours().join());}
 assert.equal(pairs.size,palette.length,'a different pair for each of the '+palette.length+' colours');
 truck.update(.05,0,1,new T.Color('#eef0ef'));assert.equal('#'+truck.stripe.color.getHexString(),'#c62828','On the white paint the stripe turns red');truck.update(.05,0,1,new T.Color('#1f63c6'));assert.equal('#'+truck.stripe.color.getHexString(),'#f2f1ec','and white again on blue');
 truck.beacons('rainbow');truck.update(.05,0,1);const a=truck.beaconColours().join();truck.update(.05,0,2);assert.notEqual(truck.beaconColours().join(),a,'The rainbow beacons change colour');
 const w=fs.readFileSync('dist/world.js','utf8');assert.ok(w.includes("car.userData.colour=hex;paintBeacons();")&&w.includes("showModel();paintBeacons();}"),'world.js sets the beacons with the colour and the skin');}
console.log('The fire engine takes the colour; its beacons follow it (red: blue, KIWI: green and white, one pair a colour, the rainbow): OK');

// The easter egg: driving as the T. rex with Ludvig running after it, the T. rex carries him in its mouth (by the back of his shirt, beside
// its face, his legs still running), its jaws a little open; his track is still kept, so he runs on behind the car when it is something else again; and the game says so.
{const scene=new T.Scene(),rex=createTRex(T),boy=createBoy({T,scene}),car=new T.Group();car.add(rex.group);scene.add(car);car.position.set(10,100,20);car.updateMatrixWorld(true);
 boy.setOn(true);rex.carrying=true;const pos=new T.Vector3(10,100.08,20),facing=new T.Vector3(0,0,-1),at=new T.Vector3(),q=new T.Quaternion();
 const legs=[];for(let i=0;i<20;i++){rex.update(.05,12,i*.05);car.updateMatrixWorld(true);boy.update(.05,pos,facing,12,i*.05,{held:true});boy.hold(rex.grip.getWorldPosition(at),rex.grip.getWorldQuaternion(q),.05,i*.05);
  boy.group.traverse(o=>{if(o.isGroup&&o!==boy.group&&o.children.length===2&&o.position.y>.4&&o.position.y<.5)legs.push(o.rotation.x);});}
 assert.ok(rex.jaw.rotation.x>=.29,'The T. rex holds its jaws a little open');
 const scruff=new T.Vector3(0,.86,.12).applyQuaternion(boy.group.quaternion).add(boy.group.position);assert.ok(scruff.distanceTo(at)<.05,'Ludvig is held by the back of his shirt in its mouth');
 assert.ok(at.y>pos.y+2.4,'up at the T. rex\'s mouth ('+(at.y-pos.y).toFixed(2)+' m)');const up=new T.Vector3(0,1,0).applyQuaternion(boy.group.quaternion);assert.ok(up.y>.9,'hanging upright');
 const chest=new T.Vector3(0,.7,0).applyQuaternion(boy.group.quaternion).add(boy.group.position);assert.ok(chest.x-car.position.x>.5,'beside its face on its right, where the camera behind sees him ('+(chest.x-car.position.x).toFixed(2)+' m)');
 const box=new T.Box3().setFromObject(boy.group);assert.ok(box.min.y>pos.y+1.2,'his feet well off the ground ('+(box.min.y-pos.y).toFixed(2)+' m)');
 assert.ok(Math.max(...legs)-Math.min(...legs)>.5,'his legs still running in the air');assert.ok(boy.track.length>10,'his track kept');}
// The ragdoll: he hangs from the scruff like a weight on a string. He trails when the T. rex sets off, swings on when it stops, swings out in a
// bend and settles; the same at 30 and 60 frames a second; his arms, legs and head flop after the swing; and it is cheap.
{const swing=fps=>{const scene=new T.Scene(),boy=createBoy({T,scene});boy.setOn(true);const dt=1/fps,q=new T.Quaternion(),a=new T.Vector3(0,103,0),pos=new T.Vector3(0,100.08,0),facing=new T.Vector3(0,0,-1);
  const com=()=>new T.Vector3(0,.48,0).applyQuaternion(boy.group.quaternion).add(boy.group.position).sub(a);let t=0,v=0,back=0,ahead=0,out=0;const arm=[];
  const step=()=>{t+=dt;a.z-=v*dt;pos.z-=v*dt;boy.update(dt,pos,facing,v,t,{held:true});boy.hold(a,q,dt,t);arm.push(boy.model.arms[0].rotation.z);};
  for(;t<1.5;){v=Math.min(12,v+8*dt);step();back=Math.max(back,com().z);}for(;t<4;)step();
  for(;t<6;){v=Math.max(0,v-12*dt);step();ahead=Math.max(ahead,-com().z);}const flop=Math.max(...arm)-Math.min(...arm);for(;t<12;)step();const settled=com().setY(0).length();
  let turn=0;for(let i=0;i<fps*4;i++){t+=dt;turn+=8/15*dt;a.set(15*Math.sin(turn),103,15-15*Math.cos(turn));q.setFromAxisAngle(new T.Vector3(0,1,0),-turn);boy.hold(a,q,dt,t);
   out=Math.max(out,-com().dot(new T.Vector3(0,0,15).sub(a).setY(0).normalize()));}
  return {back,ahead,settled,out,flop,head:Math.abs(boy.model.head.rotation.x)+Math.abs(boy.model.head.rotation.z)};};
 const r=swing(60),slow=swing(30);
 assert.ok(r.back>.15,'He trails when the T. rex sets off ('+r.back.toFixed(2)+' m)');assert.ok(r.ahead>.25,'and swings on when it stops ('+r.ahead.toFixed(2)+' m)');
 assert.ok(r.settled<.02,'then settles under its mouth');assert.ok(r.out>.12,'He swings out in a bend ('+r.out.toFixed(2)+' m)');
 for(const k of ['back','ahead','out'])assert.ok(Math.abs(r[k]-slow[k])<.04,k+': the same at 30 frames a second ('+r[k].toFixed(2)+' / '+slow[k].toFixed(2)+')');
 assert.ok(r.flop>.15,'His arms flop with the swing ('+r.flop.toFixed(2)+' rad)');assert.ok(r.head>.01,'and his head lolls');
 const scene=new T.Scene(),boy=createBoy({T,scene}),q=new T.Quaternion(),a=new T.Vector3(0,103,0);boy.setOn(true);const t0=performance.now();for(let i=0;i<20000;i++){a.z-=.2;boy.hold(a,q,1/60,i/60);}
 const us=(performance.now()-t0)/20000*1000;assert.ok(us<50,'Cheap: '+us.toFixed(1)+' µs a frame');}
console.log('Ludvig\'s ragdoll: trails, swings on, swings out in bends, settles, limbs flop, cheap: OK');
{store.set('sofiatur.fremgang',JSON.stringify({arrivals:13,model:'trex',ludvig:'on',behind:'ludvig'}));const game=await launch(()=>storage);game.test.start();assert.match(game.element('toast').textContent,/T-rexen har tatt Ludvig i munnen/);
 store.set('sofiatur.fremgang',JSON.stringify({arrivals:13,model:'trex',ludvig:'on',behind:'trail'}));const other=await launch(()=>storage);other.test.start();assert.doesNotMatch(other.element('toast').textContent||'',/T-rexen/,'only with Ludvig on');}
console.log('Easter egg: the T. rex carries Ludvig in its mouth, his legs still running: OK');

