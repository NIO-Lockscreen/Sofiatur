// Feedback sounds at key moments, the sticker row and the arrival state on the finish card (11 November 2026).
import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as T from './dist/vendor/three.js';
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));const terrain=data.terrain;
function height(x,z){let a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/40)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/40)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return(h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
const context=new Proxy({},{get:(o,p)=>p==='measureText'?()=>({width:20}):()=>{}});
async function launch({save,noStickers}={}){
 const elements=new Map(),tools=new Map(),effects=[],store=new Map(),raf=[];let now=0;if(save)store.set('sofiatur.fremgang',JSON.stringify(save));
 function element(id){if(!elements.has(id)){const e={id,hidden:false,textContent:'',style:{},classes:new Set(),dataset:{},children:[],attrs:{},events:new Map(),
  classList:{add:c=>e.classes.add(c),remove:c=>e.classes.delete(c),toggle:(c,on)=>{if(on===undefined?!e.classes.has(c):on)e.classes.add(c);else e.classes.delete(c);}},
  append(...v){e.children.push(...v)},replaceChildren(){e.children=[]},setAttribute(k,v){e.attrs[k]=v},getContext(){return context},addEventListener(t,fn){e.events.set(t,fn)},showModal(){e.open=true},close(){e.open=false},getBoundingClientRect(){return {left:300,right:740,top:80,bottom:700}},width:700,height:520};elements.set(id,e);}return elements.get(id);}
 const document={getElementById:id=>id==='stickers'&&noStickers?null:element(id),createElement:t=>({tagName:t,style:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(){},addEventListener(){}}),body:element('body'),addEventListener(){},modelContext:{registerTool:t=>tools.set(t.name,t)}};
 const env={document,window:{addEventListener(){}},location:{reload(){}},console,T,roundaboutChoices,createDrivingLines,createFreeDrive,
  createInside:()=>({enter(){},update(){},refresh(){}}),createMusic:()=>({effect:n=>effects.push(n),duck(){},play(){},stop(){}}),createWorld:()=>({height,resetCamera(){},setTurnArrow(){},update(){},cameraYaw:()=>0}),fetch:async()=>({ok:true,json:async()=>data}),setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>raf.push(cb),performance:{now:()=>now},Promise,Math,Map,Set,Number,Infinity,Error,JSON,Object};
 Object.defineProperty(env,'localStorage',{get:()=>({getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)})});
 const ctx=vm.createContext(env);const code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
 const init=vm.runInContext(`(async()=>{${code}\n globalThis.t={pick(h){pickColour(h)},inside(){goInside()},outside(){goOutside()},sound(v){sound=v}};})()`,ctx);
 for(let i=0;i<12;i++){await Promise.resolve();raf.splice(0).forEach(cb=>cb(now));}await init;
 const step=()=>{now+=45;raf.splice(0).forEach(cb=>cb(now));},read=()=>tools.get('read_drive_state').execute();
 // Drive one whole trip, always taking the recommended road; returns how many manual choices were made.
 function trip(){tools.get('start_drive').execute();let n=0;for(let i=0;i<200000&&read().state!=='finished';i++){const s=read();if(s.state==='decision'){tools.get('choose_road').execute({edgeId:s.choices.find(c=>c.recommended).id});n++;}step();}assert.equal(read().state,'finished');return n;}
 return {element,effects,trip,read,step,g:ctx.t,count:n=>effects.filter(e=>e===n).length};}
const sticks=g=>g.element('stickers').children;
// First trip
{const g=await launch();const n=g.trip();assert.ok(n>=1);
 assert.equal(g.count('tap'),n,'one tap per manual choice, none for the automatic roads');assert.equal(g.count('fanfare'),1,'exactly one fanfare');
 assert.ok(g.effects.lastIndexOf('tap')<g.effects.indexOf('fanfare'),'the fanfare comes at the arrival, after the last tap');assert.equal(g.effects.at(-1),'fanfare');
 assert.ok(g.element('body').classes.has('arrived'),'body.arrived at the finish');
 const s=sticks(g);assert.equal(s.length,13);assert.equal(g.element('stickers').hidden,false);assert.match(g.element('stickers').attrs['aria-label'],/^1 av 13/);
 assert.equal(s[0].className,'sticker new');assert.equal(s[0].textContent,'🎨');for(let i=1;i<13;i++){assert.equal(s[i].className,'sticker locked');assert.equal(s[i].textContent,'');}
 assert.equal(g.element('speed').textContent,'0');assert.equal(g.element('slope').textContent,'Fremme!');
 g.step();g.step();assert.equal(g.element('speed').textContent,'0','still 0 while parked');
 g.element('again').onclick();assert.ok(!g.element('body').classes.has('arrived'),'reset removes body.arrived');
 const before=g.effects.length;g.g.pick('#d32f2f');assert.equal(g.effects.slice(before).join(),'pick','a colour pick plays pick');
 g.g.inside();assert.equal(g.effects.at(-1),'door');const k=g.count('door');g.g.inside();assert.equal(g.count('door'),k,'no second door when not in the intro');
 g.g.outside();assert.equal(g.count('door'),k+1);g.g.outside();assert.equal(g.count('door'),k+1,'no door when not inside');
 // second arrival: two earned, only the second new
 g.trip();const s2=sticks(g);assert.equal(s2.length,13);assert.deepEqual(s2.map(x=>x.className),['sticker','sticker new',...Array(11).fill('sticker locked')]);assert.equal(s2[1].textContent,'🐱');assert.match(g.element('stickers').attrs['aria-label'],/^2 av 13/);assert.equal(g.count('fanfare'),2);}
// Many trips: all earned, none new
{const g=await launch({save:{arrivals:14}});g.trip();const s=sticks(g);assert.equal(s.length,13);assert.ok(s.every(x=>x.className==='sticker'&&x.textContent),'all 13 earned, none new');assert.match(g.element('stickers').attrs['aria-label'],/^13 av 13/);}
// Sound off: nothing recorded
{const g=await launch();g.g.sound(false);g.trip();g.g.pick('#d32f2f');assert.deepEqual(g.effects,[],'no effects with the sound off');assert.equal(sticks(g).length,13,'the stickers are still filled');}
// No #stickers in the markup
{const g=await launch({noStickers:true});g.trip();assert.ok(g.element('body').classes.has('arrived'));assert.equal(g.element('slope').textContent,'Fremme!');}
console.log('Celebration: sounds, stickers, arrived state, speed box, missing stickers row: OK');
