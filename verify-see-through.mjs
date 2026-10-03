import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {createSeeThrough,HIDE_MAX} from './dist/see-through.js';

// See-through buildings (see-through.js): a building the camera is inside, or that stands between the camera and the car, fades out; the rest stay.
const base=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
const st=createSeeThrough({T,base}),square=(x,z,w,d)=>[[x,z],[x+w,z],[x+w,z+d],[x,z+d]];
const A=st.add(square(0,0,10,10)),B=st.add(square(30,-5,8,10)),C=st.add(square(80,0,10,10)); // ids 1, 2, 3; ground at y = 0
assert.deepEqual([A,B,C],[1,2,3]);
// claim(): what stands up off the ground near the footprint is the building's; the yard drawn with it, at ground level, is not; nor what lies far off.
const wall=(id,x0,z0,x1,z1,h)=>[st.claim(id,[x0,0,z0],[x1,0,z1],[x1,h,z1],0),st.claim(id,[x0,0,z0],[x1,h,z1],[x0,h,z0],0)];
for(const [id,[x,z,w,d]] of [[A,[0,0,10,10]],[B,[30,-5,8,10]],[C,[80,0,10,10]]])for(const [a,c] of [[[x,z],[x+w,z]],[[x+w,z],[x+w,z+d]],[[x+w,z+d],[x,z+d]],[[x,z+d],[x,z]]])assert.deepEqual(wall(id,a[0],a[1],c[0],c[1],6),[true,true]);
assert.equal(st.claim(A,[5,6,5],[6,8.5,5],[5,6,6],0),true,'the roof');assert.equal(st.buildings[A-1].top,8.5,'its top');
assert.equal(st.claim(A,[-2,.07,-2],[12,.07,-2],[12,.07,12],0),false,'the yard round it, on the ground, stays');
assert.equal(st.claim(A,[20,1,20],[21,3,20],[20,3,21],0),false,'something well outside its footprint stays');
st.index();
const v=(x,y,z)=>new T.Vector3(x,y,z),ids=a=>[...a].sort();
// select(): the camera inside A; the line to the car through B below its roof; over B's roof it is clear; B right by the car is left alone.
assert.deepEqual(st.select(v(5,3,5),v(20,1,5)),[A],'The camera inside a building');
assert.deepEqual(st.select(v(10.5,3,5),v(20,1,5)),[A],'or just outside its wall (the near plane)');
assert.deepEqual(st.select(v(20,4,0),v(50,1,0)),[B],'A building between the camera and the car');
assert.deepEqual(st.select(v(20,14,0),v(50,12,0)),[],'The line passes over its roof');
assert.deepEqual(st.select(v(34,4,-20),v(34,1,-5.6)),[],'The building right beside the car (its wall 0.6 m from it) stays');assert.deepEqual(st.select(v(34,4,-20),v(34,1,-3)),[B],'and with the car inside it (a garage, a canopy) it fades');
assert.deepEqual(st.select(v(5,3,5),v(50,1,0)),[A,B],'Two in the way, the nearest first');
assert.deepEqual(st.select(v(60,4,30),v(95,1,30)),[],'Nothing in the way');
console.log('See-through: which triangles are a building\'s, and which buildings are in the way: OK');

// update(): those in the way fade out within a quarter of a second (the uniforms carry their ids and how far), the meshes holding them switch to the
// see-through material; when the camera has left they fade back in and are dropped.
const mA={name:'chunk A'},mB={name:'chunk B'},mC={name:'chunk C'};st.attach(A,mA);st.attach(B,mB);st.attach(C,mC);
let active=st.update(.1,v(5,3,5),v(20,1,5));assert.ok(active.has(mA)&&!active.has(mB),'A\'s chunk draws see-through');assert.equal(st.hideId.value[0],A);assert.ok(Math.abs(st.hideFade.value[0]-.5)<1e-9,'half faded after 0.1 s');
active=st.update(.15,v(5,3,5),v(20,1,5));assert.equal(st.hideFade.value[0],1,'gone after a quarter of a second');
active=st.update(.1,v(60,4,30),v(95,1,30));assert.ok(active.has(mA),'Left behind, A fades back in');assert.ok(st.hideFade.value[0]<1&&st.hideFade.value[0]>0);
for(let i=0;i<5;i++)active=st.update(.1,v(60,4,30),v(95,1,30));assert.equal(active.size,0,'and is dropped');assert.ok(st.hideId.value.every(x=>x===0)&&st.hideFade.value.every(x=>x===0));
// Never more than HIDE_MAX at once, those in the way first.
{const many=createSeeThrough({T,base});const row=[];for(let i=0;i<12;i++){const id=many.add(square(i*6,0,4,4));row.push(id);many.claim(id,[i*6,0,0],[i*6+4,0,0],[i*6+4,9,0],0);}many.index();
 many.update(.3,v(-3,3,2),v(80,1,2));assert.deepEqual(many.hideId.value,row.slice(0,HIDE_MAX),'the first '+HIDE_MAX+' along the line');}
console.log('See-through: fading out and back in, the chunks that switch material, at most '+HIDE_MAX+' at once: OK');

// The shader: the plain material's Lambert shader plus the building id per corner and the dissolve (a 4×4 ordered dither, then discard).
{const shader={uniforms:{},vertexShader:T.ShaderLib.lambert.vertexShader,fragmentShader:T.ShaderLib.lambert.fragmentShader};st.material.onBeforeCompile(shader);
 assert.ok(shader.vertexShader.includes('attribute float buildingId;')&&shader.vertexShader.includes('#include <begin_vertex>\n vBuildingId=buildingId;'),'the id goes from the corners to the fragments');
 assert.ok(shader.fragmentShader.includes(`uniform float hideId[${HIDE_MAX}];`)&&/void main\(\) \{\n float hide=0\.;[\s\S]*discard;/.test(shader.fragmentShader),'the fragments of a hidden building are discarded');
 assert.equal(shader.uniforms.hideId,st.hideId);assert.equal(shader.uniforms.hideFade,st.hideFade);assert.notEqual(st.material,base);assert.equal(st.material.side,T.DoubleSide);assert.equal(st.material.vertexColors,true);
 assert.equal(st.material.customProgramCacheKey(),'see-through','its own program');}
console.log('See-through: the shader discards the hidden buildings\' fragments: OK');

// Cheap: on the real map's 5658 footprints (6 m walls), 2000 camera lines take well under a millisecond each.
{const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),real=createSeeThrough({T,base});
 for(const b of data.buildings){const p=b.p.slice(0,-1);if(p.length<3)continue;const id=real.add(p),[x,z]=p[0],[x1,z1]=p[1];real.claim(id,[x,0,z],[x1,0,z1],[x1,6,z1],0);}real.index();
 let found=0;const t0=performance.now();for(let i=0;i<2000;i++){const x=Math.random()*2000,z=Math.random()*1800-500,a=Math.random()*6.28;found+=real.select(v(x-14*Math.cos(a),7.8,z-14*Math.sin(a)),v(x,1.2,z)).length;}
 const ms=(performance.now()-t0)/2000;assert.ok(ms<.5,ms.toFixed(3)+' ms a frame');assert.ok(found>0,'and it finds buildings in the way ('+found+')');
 console.log(`See-through: ${ms.toFixed(3)} ms a frame on the real map (${found} buildings found in 2000 random camera lines): OK`);}

// world.js: buildings go to their chunk's twin with their id; the twin meshes carry it; each frame the line from the camera to the car picks the
// buildings to fade; the see-through shader is compiled in the warm-up (no stall the first time).
{const w=fs.readFileSync('dist/world.js','utf8');
 assert.ok(w.includes("drawing=seeThrough?seeThrough.add(p):0;")&&w.includes(" drawing=0;\n"),'each building is drawn with its id, nothing after the loop');
 assert.ok(w.includes("tg.setAttribute('buildingId',")&&w.includes('seeThrough.attach(id,tm)')&&w.includes('seeThrough?.index();'),'the twin meshes carry the ids');
 assert.ok(w.includes('seeThrough.update(dt,camera.position,seeAt.set(pos.x,pos.y+1.2,pos.z))'),'each frame, the camera\'s line to the car');
 assert.ok(/for\(const m of buildingMeshes\)m\.material=seeThrough\.material;renderer\.compile/.test(w),'compiled in the warm-up');}
console.log('See-through: wired into world.js (ids, twin meshes, each frame, warm-up): OK');
