import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {roundaboutChoices} from './dist/roundabouts.js';
import {createFreeDrive} from './dist/free-drive.js';
import {createMusic} from './dist/music.js';
import {createRoadSurface} from './dist/road-surface.js';
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),els=new Map();let callbacks=[],now=0;const frames=[];
const canvasContext=new Proxy({},{get:()=>()=>{}});
const element=id=>{if(!els.has(id))els.set(id,{hidden:false,textContent:'',style:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},addEventListener(){},getContext(){return canvasContext}});return els.get(id);};
// Same terrain and drawn road as world.js.
const terrain=data.terrain;
function rawHeight(x,z){const a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/terrain.step)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/terrain.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return (h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
const height=(x,z)=>160+(rawHeight(x,z)-160)*1.45,surface=createRoadSurface(data.roads,height),carHeight=(x,z)=>(surface.heightAt(x,z)??height(x,z)+.39)+.08;
const env={T,roundaboutChoices,createFreeDrive,createMusic,console,performance:{now:()=>now},document:{getElementById:element,createElement:()=>element(Symbol()),body:element('body'),addEventListener(){}},window:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>callbacks.push(cb),fetch:async()=>({ok:true,json:async()=>data}),
 createWorld:()=>({height,rawHeight,carHeight,update(dt,pos){frames.push([pos.x,pos.y,pos.z]);},resetCamera(){},setTurnArrow(){}})};
const ctx=vm.createContext(env);
const code=fs.readFileSync('dist/game.js','utf8').replace(/^import .*?;\n/gm,'');
const init=vm.runInContext(`(async()=>{${code}\n globalThis.test={read:gameState,drive(e){current=e.from;previous=null;active=null;paused=false;state='decision';position.copy(point(current));heading.copy(endDirection(e));choices=[];queue=[];choose(e.id,false);},active:()=>active};})()`,ctx);
function frame(){now+=45;const q=callbacks.splice(0);q.forEach(cb=>cb(now));}
for(let i=0;i<12;i++){await Promise.resolve();frame();}await init;

// Drive every road and compare the car with the drawn road under it, frame by frame.
let worst=0,worstAt=null,checked=0,roads=0;
for(const e of data.edges){if(e.roundabout)continue;env.test.drive(e);if(env.test.read().state!=='driving')continue;roads++;frames.length=0;
 for(let i=0;i<4000&&env.test.active()?.e===e;i++)frame();
 for(const [x,y,z] of frames){const top=surface.heightAt(x,z);if(top===null)continue;checked++;if(y-top<worst){worst=y-top;worstAt=`${e.name} #${e.id}`;}}}
assert.ok(checked>20000,`Enough samples (${checked})`);
assert.ok(worst>-.05,`Car stays on the drawn road (lowest ${worst.toFixed(3)} m at ${worstAt})`);
console.log(`Road height: ${roads} roads, ${checked} frames, the car is never more than ${(-Math.min(0,worst)*100).toFixed(1)} cm into the drawn road: OK`);

// Free driving uses the same road surface.
const free=createFreeDrive(data,carHeight);let freeWorst=0;
for(const road of data.roads.slice(0,120))for(const [x,z] of road.p){free.reset(x,z,0);const top=surface.heightAt(x,z);if(top!==null)freeWorst=Math.min(freeWorst,free.altitude-top);}
assert.ok(freeWorst>=0,'Free driving sits on the drawn road');console.log('Free drive rides on the drawn road: OK');
