import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as T from './dist/vendor/three.js';
// The trip progress track in the header pill (11 November 2026): hidden on the start screen and in free driving, 0 % at the start, grows to 100 % at the kindergarten, clamps when a detour makes the way longer than the first estimate.
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));
async function launch({free}={}){
 const elements=new Map(),tools=new Map(),raf=[];let now=0;const context=new Proxy({},{get:(o,p)=>p==='measureText'?()=>({width:20}):()=>{}});
 function element(id){if(!elements.has(id))elements.set(id,{id,hidden:false,textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},dataset:{},children:[],events:new Map(),append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},setAttribute(){},getContext(){return context},addEventListener(t,fn){this.events.set(t,fn)},showModal(){this.open=true},close(){this.open=false},getBoundingClientRect(){return {left:300,right:740,top:80,bottom:700}},width:700,height:520});return elements.get(id);}
 const document={getElementById:element,createElement:t=>({...element('new'+Math.random()),tagName:t}),body:element('body'),addEventListener(){},modelContext:{registerTool:t=>tools.set(t.name,t)}};
 const terrain=data.terrain;const height=(x,z)=>{let a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/40)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/40)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return(h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;};
 const env={document,window:{addEventListener(){}},location:{reload(){}},console,T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,createWorld:()=>({height,resetCamera(){},setTurnArrow(){},update(){},hop(){},cameraYaw:()=>0}),fetch:async()=>({ok:true,json:async()=>data}),setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>raf.push(cb),performance:{now:()=>now},Promise,Math,Map,Set,Number,Infinity,Error};
 const ctx=vm.createContext(env);const source=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
 const init=vm.runInContext(`(async()=>{${source}})()`,ctx);for(let i=0;i<12;i++){await Promise.resolve();raf.splice(0).forEach(cb=>cb(now));}await init;
 const step=()=>{now+=45;raf.splice(0).forEach(cb=>cb(now));},read=()=>tools.get('read_drive_state').execute(),act=(n,i)=>tools.get(n).execute(i);
 const track=()=>element('tripTrack'),pct=()=>{const w=element('tripFill').style.width;assert.match(w,/^\d+%$/,'width is a whole percentage');return parseInt(w);};
 if(free){element('driveMode').onchange({target:{value:'free'}});}
 return {element,track,pct,step,read,act};}
// Guided trip
{const g=await launch();assert.equal(g.track().hidden,true,'hidden on the start screen');
 g.act('start_drive');assert.equal(g.track().hidden,false,'shown after the start');assert.equal(g.pct(),0,'0 % at the start');
 let last=0,passed50=-1,n=0,i=0;
 for(;i<200000&&g.read().state!=='finished';i++){const s=g.read();if(s.state==='decision')g.act('choose_road',{edgeId:s.choices.find(c=>c.recommended).id});g.step();
  const p=g.pct();assert.ok(p>=0&&p<=100);assert.ok(p>=last,`never decreases (${last} -> ${p})`);;assert.equal(g.track().hidden,false);last=p;
  if(passed50<0&&p>=50)passed50=g.read().travelledMetres;n++;}
 assert.equal(g.read().state,'finished');const total=g.read().travelledMetres;
 assert.ok(passed50>0&&passed50/total>.3&&passed50/total<.7,`passes 50 % around the middle (${passed50}/${total} m)`);
 assert.equal(g.track().hidden,false,'still shown at the kindergarten');assert.equal(g.pct(),100,'full at the kindergarten');
 g.step();g.step();assert.equal(g.pct(),100);assert.equal(g.track().hidden,false);
 g.element('again').onclick();assert.equal(g.track().hidden,true,'hidden again after "Kjør en gang til"');
 g.act('start_drive');assert.equal(g.track().hidden,false);assert.equal(g.pct(),0,'0 % on the next trip');}
// Free driving
{const g=await launch({free:true});assert.equal(g.read().mode,'free');assert.equal(g.track().hidden,true,'hidden when free driving starts');
 for(let i=0;i<120;i++)g.step();assert.equal(g.track().hidden,true,'stays hidden while free driving');}
// A detour: the wrong road at the first junction makes the way longer than the initial estimate
{const g=await launch();g.act('start_drive');let wrong=false,worst=100,seen=0;
 for(let i=0;i<4000&&g.read().state!=='finished';i++){const s=g.read();if(s.state==='decision'){const c=wrong?s.choices.find(c=>c.recommended):s.choices.find(c=>!c.recommended)||s.choices[0];wrong=true;g.act('choose_road',{edgeId:c.id});}g.step();const p=g.pct();assert.ok(p>=0&&p<=100,'within 0..100 on a detour');worst=Math.min(worst,p);seen++;}
 assert.ok(seen>100);}
console.log('Progress track: hidden/shown/0 %/monotonic/50 %/100 %/reset/free driving/detour clamp: OK');
