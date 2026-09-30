import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createDrivingLines} from './dist/driving-line.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));
const code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
// Starts a fresh game (as after a page reload) with the given browser storage; returns its elements and a test hook.
async function launch(localStorage){
 const els=new Map();let callbacks=[],now=0;const canvasContext=new Proxy({},{get:()=>()=>{}});
 const element=id=>{if(!els.has(id))els.set(id,{hidden:false,textContent:'',value:'',style:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},addEventListener(){},getContext(){return canvasContext}});return els.get(id);};
 const env={T,roundaboutChoices,createDrivingLines,createFreeDrive,createMusic,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},window:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),createWorld:()=>({height:()=>160,update(){},resetCamera(){},setTurnArrow(){}})};
 if(localStorage)Object.defineProperty(env,'localStorage',{get:localStorage});
 const ctx=vm.createContext(env);
 const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={enter(e){current=e.to;previous=e.from;active=null;state='decision';position.copy(point(current));heading.copy(endDirection(e,false));showDecision();return state==='driving'?[active.e]:choices;},settings:()=>({musicOn,showDeadEnds,chooseAhead})};})()`,ctx);
 for(let i=0;i<12;i++){await Promise.resolve();const q=callbacks.splice(0);q.forEach(cb=>cb(now+=45));}await init;return {element,test:env.test};
}
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
const vetle=data.edges.find(e=>e.from==='1223193460'&&e.to==='1223193479'); // Kystadhaugen: straight on is a blindvei

// Defaults: music on, blindveier on (since 29 September 2026), choosing ahead off.
let game=await launch(()=>storage);assert.deepEqual({...game.test.settings()},{musicOn:true,showDeadEnds:true,chooseAhead:false});
assert.equal(game.element('music').value,'on');assert.equal(game.element('deadEnds').value,'on');assert.equal(game.element('chooseAhead').value,'off');
assert.ok(game.test.enter(vetle).some(c=>c.name==='Kystadhaugen'),'Blindveier are offered by default');
game.element('music').onchange({target:{value:'off'}});game.element('deadEnds').onchange({target:{value:'off'}});game.element('chooseAhead').onchange({target:{value:'on'}});

// After a reload the choices are back, in the menu and in the game.
game=await launch(()=>storage);assert.deepEqual({...game.test.settings()},{musicOn:false,showDeadEnds:false,chooseAhead:true});
assert.equal(game.element('music').value,'off');assert.equal(game.element('deadEnds').value,'off');assert.equal(game.element('chooseAhead').value,'on');
assert.ok(!game.test.enter(vetle).some(c=>c.name==='Kystadhaugen'),'Saved blindvei setting off skips the dead end');
game.element('deadEnds').onchange({target:{value:'on'}});game=await launch(()=>storage);assert.equal(game.test.settings().showDeadEnds,true);
console.log('Music, blindvei and choosing-ahead settings survive a reload: OK');

// A value saved before the default changed (no version) does not count for blindveier: they are on. Music and choosing ahead are kept.
store.set('sofiatur.innstillinger',JSON.stringify({music:'off',deadEnds:'off',ahead:'on'}));game=await launch(()=>storage);
assert.deepEqual({...game.test.settings()},{musicOn:false,showDeadEnds:true,chooseAhead:true});assert.equal(game.element('deadEnds').value,'on');
console.log('Blindveier saved off before they became the default are on again; other settings kept: OK');

// Blocked storage (e.g. private browsing) or a damaged entry falls back to the defaults.
game=await launch(()=>{throw new Error('SecurityError');});assert.deepEqual({...game.test.settings()},{musicOn:true,showDeadEnds:true,chooseAhead:false});game.element('music').onchange({target:{value:'off'}});
store.set('sofiatur.innstillinger','{not json');game=await launch(()=>storage);assert.deepEqual({...game.test.settings()},{musicOn:true,showDeadEnds:true,chooseAhead:false});
console.log('Blocked or damaged storage falls back to defaults: OK');
