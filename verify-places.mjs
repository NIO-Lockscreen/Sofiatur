// Places to park (2 October 2026): drive back home and park there (the start screen with the car colours comes back), and drive
// to Ludvig at Bøckmans veg 102, a parking place on the main trip. The real game state machine in a stand-in DOM, as verify-game.mjs.
import {roundaboutChoices} from './dist/roundabouts.js';import {createDrivingLines} from './dist/driving-line.js';import {createFreeDrive} from './dist/free-drive.js';import {createMusic} from './dist/music.js';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as T from './dist/vendor/three.js';
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));
assert.ok(data.nodes['ludvig-parkering'],'Bøckmans veg 102 has a parking place');assert.ok(data.roads.some(r=>r.id==='ludvig-innkjorsel'),'and a drawn driveway');
const [lx,lz]=data.nodes['ludvig-parkering'];assert.ok(Math.hypot(lx-1785.6,lz-118.4)<1.5,'on the gravel in front of the garage west of 102C-D, where the user marked it');
assert.equal(data.roads.find(r=>r.id==='ludvig-innkjorsel').surface,'gravel','a gravel driveway');
const inside=(p,x,z)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [ax,az]=p[j],[bx,bz]=p[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
for(const b of data.buildings)for(const [dx,dz] of [[0,0],[0,2.4],[0,-2.4],[1,0],[-1,0]])assert.ok(!inside(b.p,lx+dx,lz+dz),'The parked car stands clear of the houses ('+b.id+')');
{const {LUDVIG_YARD,ludvigStyles,addLudvig}=await import('./dist/ludvig.js');assert.ok(inside(LUDVIG_YARD,lx,lz),'The car parks on the gravel yard');
 for(const id of ['189462739','1036716392','1036716393','189462749','1036716586'])assert.ok(ludvigStyles[id]?.source,'Style record from the photos for '+id);
 assert.ok(ludvigStyles['189462739'].wall==='#efeee9'&&ludvigStyles['189462749'].flat,'102C-D white, the garage flat-roofed');
 let quads=0;const r=addLudvig({data,wallBase:new Map([['189462739',{y:120,h:4.3}]]),ground:()=>118,bucket:()=>({}),quad:()=>quads++,box:()=>{},onRoad:(x,z)=>z<106});
 assert.ok(r.triangles>100&&quads>50,'The yard, the bed and the terrace are drawn ('+r.triangles+' triangles)');}
function launch(){
 const elements=new Map(),tools=new Map(),listeners=new Map();let raf=[],now=0;const context=new Proxy({},{get:(o,p)=>p==='measureText'?()=>({width:20}):()=>{}});
 const element=id=>{if(!elements.has(id))elements.set(id,{id,hidden:false,textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},dataset:{},children:[],events:new Map(),append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},setAttribute(){},getContext(){return context},addEventListener(type,fn){this.events.set(type,fn);},showModal(){this.open=true},close(){this.open=false;this.events.get('close')?.();},width:700,height:520});return elements.get(id);};
 const document={getElementById:element,createElement:t=>({...element('new'+Math.random()),tagName:t}),body:element('body'),addEventListener(){},modelContext:{registerTool:t=>tools.set(t.name,t)}};
 const terrain=data.terrain,height=(x,z)=>{let a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/40)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/40)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return(h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;};
 const store=new Map([['sofiatur.fremgang',JSON.stringify({arrivals:1})]]);
 const env={document,window:{addEventListener:(name,fn)=>listeners.set(name,fn)},location:{reload(){}},console,T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))},
  createWorld:()=>({height,resetCamera(){},setTurnArrow(){},update(){},setCarColour(){},setCarSkin(){},setCarModel(){},setBoy(){}}),fetch:async()=>({ok:true,json:async()=>data}),setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>raf.push(cb),performance:{now:()=>now},Promise,Math,Map,Set,Number,Infinity,Error};
 const ctx=vm.createContext(env);const source=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
 const init=vm.runInContext(`(async()=>{${source}})()`,ctx);
 return (async()=>{for(let i=0;i<12;i++){await Promise.resolve();const q=raf.splice(0);q.forEach(cb=>cb(now));}await init;
  const read=()=>tools.get('read_drive_state').execute(),act=(name,input)=>tools.get(name).execute(input),step=()=>{now+=45;const q=raf.splice(0);q.forEach(cb=>cb(now));};
  return {read,act,step,element,drive(){for(let i=0;i<6000&&read().state==='driving';i++)step();}};})();
}
// Shortest way (by length) from a node to a target node over the graph, as the next edge to take.
const out=new Map();for(const e of data.edges){if(!out.has(e.from))out.set(e.from,[]);out.get(e.from).push(e);}
function towards(target){const dist=new Map([[target,0]]),q=[target];while(q.length){q.sort((a,b)=>dist.get(a)-dist.get(b));const n=q.shift();for(const e of data.edges)if(e.to===n){const d=dist.get(n)+e.length;if(d<(dist.get(e.from)??Infinity)){dist.set(e.from,d);q.push(e.from);}}}return dist;}

// Home: out to the first junction, then back the shortest way; the car parks at home and the start screen comes back with the colours.
{const g=await launch(),home=towards(data.start);g.act('start_drive');g.drive();assert.equal(g.read().state,'decision');let n=0,homeArrow=false;
 while(g.read().state==='decision'&&g.read().currentNode!==data.start&&n++<20){const s=g.read();const best=s.choices.map(c=>({c,e:data.edges.find(e=>e.id===c.id)})).filter(k=>k.e).sort((a,b)=>(home.get(a.e.to)??1e9)+a.e.length-(home.get(b.e.to)??1e9)-b.e.length)[0];if(best.e.to===data.start){const names=g.element('worldArrows').children.map(b=>b.children[1].textContent),i=s.choices.findIndex(c=>c.id===best.c.id);
  assert.equal(names[i],'Hjem','The arrow into home is called Hjem ('+names.join(', ')+')');assert.ok(s.choices[i].street,'its road keeps its name');homeArrow=true;}
  g.act('choose_road',{edgeId:best.c.id});g.drive();}
 assert.ok(homeArrow,'There was an arrow home');assert.equal(g.read().currentNode,data.start,'Back home');assert.equal(g.read().state,'decision','The car parks at home and waits');assert.match(g.element('toast').textContent,/Hjemme/);
 for(let i=0;i<70;i++)g.step();assert.equal(g.read().state,'intro','The start screen comes back');assert.equal(g.element('welcome').hidden,false);assert.equal(g.element('rewards').hidden,false,'with the car colours');
 g.act('start_drive');assert.equal(g.read().state,'driving','and a new trip drives out of the drive again by itself');
 console.log('Drive back home (the arrow says Hjem) and park; the start screen with the car colours comes back: OK');}

// Ludvig: Bøckmans veg 102 lies off the main trip, near the kindergarten; drive there the shortest way and park.
{const g=await launch(),to=towards('ludvig-parkering');g.act('start_drive');g.drive();let n=0,offered=false;
 while(g.read().state==='decision'&&g.read().currentNode!=='ludvig-parkering'&&n++<80){const s=g.read();const known=s.choices.map(c=>({c,e:data.edges.find(e=>e.id===c.id)})).filter(k=>k.e).sort((a,b)=>(to.get(a.e.to)??1e9)+a.e.length-(to.get(b.e.to)??1e9)-b.e.length),best=known[0]||{c:s.choices.find(c=>c.recommended)}; // a roundabout's exits are plans, not edges: take the recommended one there
 if(best.c.street==='Ludvig')offered=true;g.act('choose_road',{edgeId:best.c.id});g.drive();}
 assert.ok(offered,'Ludvig is offered as a road at Bøckmans veg');assert.equal(g.read().currentNode,'ludvig-parkering');assert.equal(g.read().state,'decision','The car parks at Ludvig\'s and waits');assert.match(g.element('toast').textContent,/Du besøker Ludvig/);
 const on=g.read().choices.find(c=>c.recommended);assert.ok(on,'The way on to the kindergarten');g.act('choose_road',{edgeId:on.id});g.drive();assert.notEqual(g.read().currentNode,'ludvig-parkering');
 console.log('Ludvig at Bøckmans veg 102: offered at Bøckmans veg, the car parks and the game says "Du besøker Ludvig": OK');}
