import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';

// The arrival confetti (dist/world.js, rebuilt 11 November 2026): 140 pieces in seven colours as seven InstancedMeshes, a burst from above the car when `finished` turns
// true and then a gentle loop; gone when `finished` goes false. The real world is built with the software renderer and a stand-in DOM, as in verify-look.mjs.
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));
const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}),set:(t,k,v)=>{t[k]=v;return true;}});
const canvas=()=>({width:0,height:0,style:{},getContext:k=>k==='2d'?ctx:null,addEventListener(){},clientWidth:1280,clientHeight:800});
globalThis.document={createElement:canvas};globalThis.window={addEventListener(){}};globalThis.devicePixelRatio=2;
const {createWorld}=await import('./dist/world.js'),world=createWorld(canvas(),data);world.renderer.render=()=>{};
const meshes=[];world.scene.traverse(o=>{if(o.name==='Confetti')meshes.push(o);});
const pos=new T.Vector3(900,230,120),tan=new T.Vector3(1,0,0),step=(finished,time)=>world.update(1/30,pos,tan,0,'follow',finished,time,tan);
const live=()=>meshes.filter(m=>m.visible).reduce((n,m)=>n+m.count,0);
const pieces=()=>{const out=[];for(const m of meshes)for(let i=0;i<m.count;i++){const e=m.instanceMatrix.array,o=i*16;out.push({x:e[o+12],y:e[o+13],z:e[o+14],colour:m.material.color.getHexString()});}return out;};

// 1. Cheap: at most seven draw objects, one material each, no shadows.
assert.ok(meshes.length>=1&&meshes.length<=7,'at most seven draw objects: '+meshes.length);assert.ok(meshes.every(m=>m.isInstancedMesh&&!m.castShadow&&!m.receiveShadow),'instanced, no shadows');
assert.equal(world.scene.children.filter(o=>o.name==='Confetti').length,meshes.length);
assert.equal(new Set(meshes.map(m=>m.material)).size,meshes.length,'one material per colour, not per piece');
const total=meshes.reduce((n,m)=>n+m.instanceMatrix.count,0);assert.ok(total>=130&&total<=150,'about 140 pieces: '+total);
const colours=new Set(meshes.map(m=>m.material.color.getHexString()));assert.ok(colours.size>=6,'at least six distinct colours: '+colours.size);
for(const c of ['ffd66c','6ad2c9','e99584','fff5cf'])assert.ok(colours.has(c),'keeps the palette colour #'+c);

// 2. Not finished: nothing to draw.
for(let i=0;i<3;i++)step(false,i/30);assert.equal(live(),0,'zero live instances when not finished');assert.ok(meshes.every(m=>!m.visible),'hidden when not finished');

// 3. Finished: all pieces live; the first frame of the burst has every piece above the car, near its axis, and then they spread out within the radius.
const T0=40;step(true,T0);assert.equal(live(),total,'all pieces live when finished');assert.ok(meshes.every(m=>m.visible));
{const p=pieces();assert.equal(p.length,total);assert.ok(p.every(q=>q.y>pos.y+8),'at the first frame every piece is high above the car');assert.ok(p.every(q=>Math.hypot(q.x-pos.x,q.z-pos.z)<1),'and bunched over it');}
let maxR=0,minY=1e9,spread1=0;
for(let f=1;f<=900;f++){const time=T0+f/30;step(true,time);const p=pieces();assert.equal(p.length,total);for(const q of p){assert.ok(Number.isFinite(q.x+q.y+q.z),'finite');const r=Math.hypot(q.x-pos.x,q.z-pos.z);maxR=Math.max(maxR,r);minY=Math.min(minY,q.y);}
 if(f===36)spread1=p.reduce((s,q)=>s+Math.hypot(q.x-pos.x,q.z-pos.z),0)/p.length;
 if(f>=1&&f<=10)assert.ok(p.every(q=>q.y>pos.y+7),'still all up in the air during the first third of a second');}
assert.ok(maxR<=8,'pieces stay within 8 m of the car: '+maxR.toFixed(2));assert.ok(maxR>6,'and use the width: '+maxR.toFixed(2));assert.ok(spread1>3,'spread out after about a second: mean radius '+spread1.toFixed(2));
assert.ok(minY>pos.y-.5,'nothing falls through the road: '+(minY-pos.y).toFixed(2));
{const p=pieces(),ys=p.map(q=>q.y-pos.y);assert.ok(Math.min(...ys)<2&&Math.max(...ys)>6,'after 30 s the loop still fills the height: '+Math.min(...ys).toFixed(1)+'..'+Math.max(...ys).toFixed(1));}

// 4. Not finished again: gone. The next arrival starts a fresh burst.
step(false,T0+31);assert.equal(live(),0,'gone when finished goes false');
step(true,T0+100);{const p=pieces();assert.equal(live(),total);assert.ok(p.every(q=>q.y>pos.y+8&&Math.hypot(q.x-pos.x,q.z-pos.z)<1),'a second arrival restarts the burst');}

// 5. Deterministic: the same time since the burst gives the same pieces.
{step(true,T0+100.5);const a=pieces();step(false,T0+101);step(true,T0+300);step(true,T0+300.5);const b=pieces();assert.deepEqual(a,b,'same time since the burst, same picture');}

// 6. Allocation free per frame, and in the warm-up. Read from the source: a heap measurement over the whole world update depends on when the garbage collector runs
// and on the load on the machine, and failed now and then.
{const src=fs.readFileSync('dist/world.js','utf8'),a=src.indexOf('function confettiUpdate'),body=src.slice(a,src.indexOf('\n }\n',a));assert.ok(!/Math\.random|\bnew\b|\[\s*[\d.'"-]|=>|\{\s*\w+\s*:/.test(body),'confettiUpdate: no Math.random, no new, no array or object literal, no closure');
 const w=src.slice(src.indexOf('Warm-up (2 October'));assert.ok(w.indexOf('confettiShow(true)')>0&&w.indexOf('confettiShow(true)')<w.indexOf('renderer.compile'),'the warm-up compiles the confetti shader too');}
console.log('verify-confetti: '+meshes.length+' draw objects, '+total+' pieces, '+colours.size+' colours, burst, loop, restart, max radius '+maxR.toFixed(2)+' m: OK');
