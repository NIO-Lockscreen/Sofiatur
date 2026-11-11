// The spider (11 November 2026): unlocked by the arrival at the kindergarten after the hover car, chosen as a ride, saved, on the podium and in the secrets.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),terrain=data.terrain;
const code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
function height(x,z){let a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/40)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/40)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return(h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
const KEY='sofiatur.fremgang',save=o=>store.set(KEY,JSON.stringify(o)),saved=()=>JSON.parse(store.get(KEY));
async function launch(){
 const els=new Map(),world={colour:null,model:null,hover:null},tools=new Map(),spoken=[],inside={last:null,picks:[]};let callbacks=[],now=0;const canvasContext=new Proxy({},{get:()=>()=>{}});
 const element=id=>{if(!els.has(id)){const el={hidden:false,textContent:'',value:'',checked:false,style:{},children:[],attrs:{},classes:new Set(),classList:{add(c){el.classes.add(c)},remove(c){el.classes.delete(c)},toggle(c,on){on?el.classes.add(c):el.classes.delete(c);}},setAttribute(k,v){el.attrs[k]=v;},append(...v){el.children.push(...v)},replaceChildren(){el.children=[]},addEventListener(type,fn){(el.listeners??={})[type]=fn;},close(){el.open=false;},getContext(){return canvasContext}};els.set(id,el);}return els.get(id);};
 const listeners=new Map(),tts={cancel(){},speak:u=>spoken.push(u.text),getVoices:()=>[]};
 const env={T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){},modelContext:{registerTool:t=>tools.set(t.name,t)}},window:{addEventListener:(type,fn)=>listeners.set(type,fn),speechSynthesis:tts},speechSynthesis:tts,SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
  createInside:()=>({enter:(items,o)=>inside.last={items,o},refresh:(items,o)=>inside.last={items,o},update(){},pick:()=>inside.picks.length?inside.picks.shift():null,get asleep(){return false},get jumping(){return false}}),setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),
  createWorld:()=>({height,resetCamera(){},setTurnArrow(){},update(){},hop(){},cameraYaw:()=>0,setCarColour:c=>world.colour=c,setCarModel:m=>world.model=m,setHover:on=>world.hover=on,honk(){}})};
 Object.defineProperty(env,'localStorage',{get:()=>storage});
 const ctx=vm.createContext(env);
 const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={freeDrive(x,z,v){if(state!=='free'){freeMode=true;start();}free.reset(x,z,0,v);freeVisits();},honkKey(){honk();},snap:()=>snapshot()};})()`,ctx);
 for(let i=0;i<12;i++){await Promise.resolve();callbacks.splice(0).forEach(cb=>cb(now+=45));}await init;
 const read=()=>tools.get('read_drive_state').execute(),step=()=>callbacks.splice(0).forEach(cb=>cb(now+=45));
 // one whole trip from home, always taking the recommended road
 function trip(){tools.get('start_drive').execute();for(let i=0;i<200000&&read().state!=='finished';i++){const s=read();if(s.state==='decision')tools.get('choose_road').execute({edgeId:s.choices.find(c=>c.recommended).id});step();}assert.equal(read().state,'finished');}
 const key=(k,target={tagName:'BODY'})=>listeners.get('keydown')({key:k,repeat:false,target,preventDefault(){}});
 const tap=hit=>{inside.picks.push(hit);const c=element('world').listeners;c.pointerdown({clientX:100,clientY:100});c.pointerup({clientX:100,clientY:100});};
 return {element,test:env.test,world,spoken,inside,trip,read,key,tap,items:()=>inside.last.items};
}
const base={arrivals:13,kiwi:'on',ludvig:'on',duck:'on',ishall:'on',rema:'on',taxi:'on',inside:'on',hoverSeen:'off',hover:'on'};
const pigLine=' Og se! En stor, snill edderkopp! Nå kan du ri på den!';

// 1. Everything but the pig: finding the pig unlocks the hover car (not the spider), and the next arrival (a real trip) the spider.
{save({...base,pig:'off'});let g=await launch();assert.equal(g.element('rewardTeaser').textContent,'🔎 3 hemmeligheter mangler fortsatt','the pig, the hover car and the spider');
 g.element('goInside').onclick();assert.equal(g.items().length,20,'20 places on the podium');assert.equal(g.items().at(-1).id,'spider','the spider is last');assert.equal(g.items().at(-1).unlocked,false);
 g.tap({type:'pig'});assert.equal(g.world.hover,true,'the hover car came with the pig');assert.equal(saved().pig,'on');assert.equal(saved().spider,'off','the pig alone does not give the spider');assert.equal(g.world.model,'pig');
 g.element('goOut').onclick();assert.equal(g.element('model-spider').hidden,true);assert.equal(g.element('rewardTeaser').textContent,'🔎 1 hemmelighet mangler fortsatt');
 assert.equal(g.element('secretHint').textContent,'💡 Når bilen kan sveve, venter en venn med åtte bein ved barnehagen.');
 const before=g.spoken.filter(t=>/Hurra Sofia/.test(t)).length;g.trip();
 assert.equal(saved().spider,'on');assert.equal(saved().model,'spider','the ride is switched to the spider');assert.equal(g.world.model,'spider');assert.equal(g.world.colour,'#7b4cc2','purple');
 assert.equal(g.element('unlock').hidden,false);assert.equal(g.element('unlock').textContent,'🕷️ Den aller siste overraskelsen! En stor, snill edderkopp har kommet til barnehagen, og du kan ri på den! Du velger den på startskjermen.');assert.equal(g.element('again').textContent,'Ri på edderkoppen 🕷️');
 const talks=g.spoken.filter(t=>/Hurra Sofia/.test(t));assert.equal(talks.length,before+1,'one arrival sentence');assert.equal(talks.at(-1),'Hurra Sofia! Du fant barnehagen! Så flink du er!'+pigLine,'with the spider line appended, in one go');
 assert.equal(g.spoken.at(-1),talks.at(-1),'nothing spoken after it (say() cancels the earlier speech)');
 g.element('again').onclick();assert.equal(g.element('model-spider').hidden,false,'on the start card');assert.ok(g.element('model-spider').classes.has('on'));assert.equal(g.element('modelRow').hidden,false);
 assert.equal(g.element('rewardTeaser').hidden,true,'no secret missing any more');assert.equal(g.element('secretHint').hidden,true);
 g=await launch();assert.equal(g.world.model,'spider','remembered after a reload');assert.equal(g.world.colour,'#7b4cc2');assert.equal(g.element('model-spider').hidden,false);assert.equal(g.test.snap().spider,'on');
 // the horn: no recording, the voice says it
 g.test.honkKey();assert.equal(g.spoken.at(-1),'Krible, krable!');
 g.element('model-car').onclick();assert.equal(g.world.model,'car');g.element('model-spider').onclick();assert.equal(g.world.model,'spider','the button picks it');assert.equal(g.world.colour,'#7b4cc2');
 // the podium
 g.element('goInside').onclick();const it=g.items();assert.equal(it.length,20);assert.equal(it.at(-1).id,'spider');assert.equal(it.at(-1).unlocked,true);assert.equal(it.at(-1).title,'Edderkoppen');assert.equal(it.at(-1).icon,'🕷️');assert.equal(it.at(-1).text,'Du kjørte til barnehagen etter at du fikk svevebilen.');assert.ok(it.every(i=>i.unlocked));}

// 2. An arrival that itself unlocks the hover car does not unlock the spider; the next one does.
{save({...base,arrivals:12,pig:'on'});let g=await launch();assert.equal(g.world.hover,false);
 g.trip();assert.equal(g.world.hover,true,'the 13th arrival unlocks the hover car');assert.equal(saved().hoverSeen,'on');assert.equal(saved().spider,'off','but not the spider');assert.equal(g.world.model,'trex');assert.doesNotMatch(g.element('unlock').textContent,/edderkopp/);assert.doesNotMatch(g.spoken.at(-1),/edderkopp/);
 g.element('again').onclick();assert.equal(g.element('model-spider').hidden,true);assert.equal(g.element('rewardTeaser').textContent,'🔎 1 hemmelighet mangler fortsatt');
 g.trip();assert.equal(saved().spider,'on','the next arrival');assert.match(g.element('unlock').textContent,/^🕷️ Den aller siste/);assert.match(g.spoken.at(-1),/edderkopp/);
 const n=g.spoken.length;g.element('again').onclick();g.trip();assert.equal(g.element('unlock').hidden,true,'only once');assert.doesNotMatch(g.spoken.at(-1),/edderkopp/);assert.ok(g.spoken.length>n);}

// 3. The hover car unlocked by the last secret (the taxi's last visit) does not give the spider either; free driving to the kindergarten does, after it.
{save({...base,pig:'on',ishall:'off',rema:'off',taxi:'off'});let g=await launch();
 const node=n=>data.nodes[n],drive=(n,dx,v=12)=>g.test.freeDrive(node(n)[0]+dx,node(n)[1],v);
 drive('ishall-parkering',2);drive('rema-parkering',2);
 assert.equal(g.world.hover,true);assert.equal(saved().hoverSeen,'on','the visit unlocked the hover car');assert.equal(saved().spider,'off','and not the spider');}
{save({...base,pig:'off'});const g=await launch();g.element('goInside').onclick();assert.equal(g.items()[17].text,'Hint: Noe rosa gjemmer seg her i huset. Se etter en krøllete hale!');assert.equal(g.items()[18].text,'Hint: Lås opp alt det andre på pallen først, så nær som én. Da skjer det noe fra fremtiden!');}
{save({...base,pig:'on',hoverSeen:'on',spider:'off'});let g=await launch();const goal=data.nodes[data.goal];
 g.test.freeDrive(goal[0]+5,goal[1],0);assert.equal(g.read().state,'finished','stopping at the kindergarten finishes the free drive');
 assert.equal(saved().spider,'on','a free-driving arrival unlocks it too');assert.equal(g.world.model,'spider');assert.equal(g.element('again').textContent,'Ri på edderkoppen 🕷️');assert.match(g.spoken.at(-1),/edderkopp/);assert.match(g.element('finishSummary').textContent,/frikjøring/);}

// 4. Old saves, and a spider forced through storage.
{save({...base,pig:'on',hoverSeen:'on',model:'spider'});let g=await launch();assert.equal(g.test.snap().spider,'off','a save without the field: locked');assert.equal(g.world.model,'car','a spider ride without the unlock is a car');assert.equal(g.element('model-spider').hidden,true);
 g.element('goInside').onclick();assert.equal(g.items().at(-1).unlocked,false);assert.equal(g.items().at(-1).icon,'❓');assert.equal(g.items().at(-1).text,'Hint: Når bilen kan sveve, kjører du til barnehagen én gang til. Da venter en venn med åtte bein!');
 g.key('x');assert.equal(g.items().at(-1).unlocked,true,'X inside the house unlocks the spider (the next locked place)');assert.equal(saved().spider,'on');assert.equal(g.world.model,'spider');assert.equal(g.world.colour,'#7b4cc2');assert.match(g.element('toast').textContent,/edderkopp/);assert.match(g.spoken.at(-1),/edderkopp/);
 g.key('z');assert.equal(g.items().at(-1).unlocked,false,'Z locks it again');assert.equal(saved().spider,'off');assert.equal(g.world.model,'car','a spider ride goes back to the car');assert.equal(saved().model,'car');assert.equal(g.world.hover,true,'the hover car stays');assert.match(g.element('toast').textContent,/Edderkoppen: låst igjen/);
 g.key('x');g.key('x');assert.equal(g.element('toast').textContent,'🛠 Alt er låst opp');
 // Z with the car as the ride: the model is left alone
 g.element('model-car').onclick?.();g.key('z');g.key('x');}
// The save is the snapshot RE-ward uses: it holds the spider.
{save({...base,pig:'on',hoverSeen:'on',spider:'on',model:'spider'});let g=await launch();g.element('goInside').onclick();g.element('goOut').onclick();
 assert.equal(g.test.snap().spider,'on');}
console.log('Spider: unlocked by the arrival after the hover car (guided or free), not by the one that unlocks it; ride, purple, banner, button, one spoken line, start card, secrets, save, podium of 20, horn, X and Z: OK');
