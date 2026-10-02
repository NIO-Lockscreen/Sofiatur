import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {SKY,FOG,SUN,HEMI,RENDER,ROAD,PATH,WATER,GROUND,lin,vnoise,skyColour,hillElevation,configureRenderer,createLights,createSky,createWater,createGround,createRoadPainter,createLook} from './dist/look.js';
import {createLakes} from './dist/lakes.js';

// The look of the world (dist/look.js, 30 September 2026): renderer and output settings, sun and sky light, shadows, fog, the sky with
// clouds and the distant hills, the colour of the ground, the road, the kerbs and the water. Nothing here needs WebGL: the settings are
// read from a stand-in renderer, the colours from the real map, and the real world is built with the software renderer.
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),terrain=data.terrain;
const lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
const sat=c=>{const m=Math.max(...c);return m?(m-Math.min(...c))/m:0;};
const stat=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return {mean:m,sd:Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)};};
globalThis.devicePixelRatio=3;

// 1. Renderer and output settings.
{const r={ratio:0,shadowMap:{},setPixelRatio(v){this.ratio=v;}};configureRenderer(T,r);
 assert.equal(r.toneMapping,T.ACESFilmicToneMapping,'filmic tone mapping');assert.equal(r.outputColorSpace,T.SRGBColorSpace,'sRGB output');
 assert.ok(r.toneMappingExposure>=.9&&r.toneMappingExposure<=1.3,'exposure '+r.toneMappingExposure);
 assert.ok(r.shadowMap.enabled&&r.shadowMap.type===T.PCFSoftShadowMap,'soft shadows on');
 assert.ok(r.ratio<=1.6&&r.ratio>0,'pixel ratio capped for the iPad: '+r.ratio);
 console.log('Renderer: ACES filmic, sRGB, exposure',r.toneMappingExposure,', soft shadows, pixel ratio',r.ratio,': OK');}

// 2. Lights: a warm low sun from the west-south-west, a cool sky light, a 2048 shadow map that follows the car in whole texels.
{const scene=new T.Scene(),{sun,hemi,follow,direction:d}=createLights(T,scene);
 assert.ok(sun.castShadow&&sun.shadow.mapSize.x>=2048&&sun.shadow.mapSize.y>=2048,'shadow map at least 2048');
 const sc=sun.color,hs=hemi.color;assert.ok(sc.r>sc.b+.15,'the sun is warm');assert.ok(hs.b>hs.r+.05,'the sky light is cool');assert.ok(hemi.groundColor.g>=hemi.groundColor.b,'the ground bounce is warm (olive)');
 assert.ok(SUN.elevation>=25&&SUN.elevation<=45,'a low afternoon sun: '+SUN.elevation+' degrees');assert.ok(d[0]<-.4&&d[2]>.2&&d[1]>.4&&d[1]<.75,'sun in the west-south-west, well above the horizon');
 assert.ok(sun.intensity>hemi.intensity,'the sun is the main light');assert.ok(sun.shadow.bias<0&&sun.shadow.normalBias>0,'shadow bias set');
 // Shadow box moves in whole texels of the light's own grid.
 const half=RENDER.shadowHalf,texel=2*half/RENDER.shadowSize;let rx=d[2],rz=-d[0];const rl=Math.hypot(rx,rz);rx/=rl;rz/=rl;
 for(const [x,y,z] of [[123.456,200,-987.654],[1800.1,260.3,300.7],[-200.77,190,-90.2]]){follow(x,y,z,.6,.8);const t=sun.target.position,a=t.x*rx+t.z*rz;
  assert.ok(Math.abs(a/texel-Math.round(a/texel))<1e-6,'shadow box snapped to texels');assert.ok(Math.hypot(t.x-x-.6*RENDER.shadowAhead,t.z-z-.8*RENDER.shadowAhead)<=texel*2,'and still on the car, a little ahead of it');
  assert.ok(Math.abs(sun.position.x-t.x-d[0]*SUN.distance)<1e-6&&Math.abs(sun.position.y-t.y-d[1]*SUN.distance)<1e-6,'the sun keeps its direction');}
 const src=fs.readFileSync('dist/look.js','utf8'),body=src.slice(src.indexOf('function follow('),src.indexOf('return {hemi,sun,follow'));assert.ok(!/\bnew\b/.test(body),'follow() allocates nothing');
 console.log('Lights: warm sun',SUN.elevation,'degrees up from bearing',SUN.azimuth,', cool sky light, shadow map',sun.shadow.mapSize.x,', snapped to texels: OK');}

// 3. Sky, fog and horizon: the fog is the colour of the sky at the horizon, and the horizon stays that colour all the way round.
{const scene=new T.Scene(),look=createLook({T,scene}),fog=scene.fog,want=new T.Color(SKY.horizon);
 assert.ok(fog&&fog.isFog,'the scene has fog');assert.ok(Math.abs(fog.color.r-want.r)+Math.abs(fog.color.g-want.g)+Math.abs(fog.color.b-want.b)<1e-6,'fog colour = horizon colour of the sky');
 assert.ok(fog.near>=60&&fog.far<=560&&fog.far>fog.near+200,'fog from '+fog.near+' to '+fog.far+' m: ends inside the 680 m the chunks are drawn at, with room for their size');
 const c=[0,0,0],lw=lin(SKY.horizon);let bearings=0;
 for(let b=0;b<360;b+=7.5){for(const e of [-60,-5,0,1]){skyColour(e,b,c);assert.ok(Math.abs(c[0]-lw[0])+Math.abs(c[1]-lw[1])+Math.abs(c[2]-lw[2])<1e-6,`horizon band has the fog colour at ${e} degrees, bearing ${b}`);}bearings++;}
 const zen=skyColour(85,0,[0,0,0]),hor=lin(SKY.horizon),mid=skyColour(15,60,[0,0,0]);assert.ok(zen[2]-zen[0]>hor[2]-hor[0]+.1,'the zenith is bluer than the horizon');assert.ok(lum(zen)<lum(hor),'and darker');assert.ok(lum(mid)<lum(hor)&&lum(mid)>lum(zen),'a gradient in between');
 const toSun=skyColour(14,SUN.azimuth,[0,0,0]),away=skyColour(14,SUN.azimuth+180,[0,0,0]);assert.ok(toSun[0]/toSun[2]>away[0]/away[2]+.03,'the sky is warmer towards the sun');
 const sky=look.sky,tris=sky.triangles();assert.ok(sky.group.parent===scene,'the sky is in the scene');assert.ok(tris>3000&&tris<=15000,'sky, hills and clouds: '+tris+' triangles (a few thousand)');
 assert.equal(sky.hillMeshes.length,3,'three layers of hills');assert.ok(sky.clouds.geometry.attributes.position.count/3>1500,'clouds are real geometry');
 const orders=sky.hillMeshes.map(m=>m.renderOrder);assert.ok(orders.every((o,i)=>i===0||o>orders[i-1])&&sky.domeMesh.renderOrder<orders[0]&&sky.clouds.renderOrder>orders[0]&&sky.clouds.renderOrder<orders.at(-1),'drawn behind the world, far to near, clouds between the hills');
 sky.group.traverse(o=>{if(o.isMesh){assert.equal(o.material.fog,false,'sky is not fogged');assert.equal(o.material.depthWrite,false,'sky writes no depth');assert.ok(o.material.vertexColors&&o.frustumCulled===false,'vertex colours, never culled');}});
 // Hills: Bymarka and the Byåsen ridge in the west-north-west stand highest, the north is low (the fjord); all within a few degrees.
 const e=(l,b)=>hillElevation(l,b);for(let l=0;l<3;l++){const vs=[];for(let b=0;b<360;b+=2)vs.push(e(l,b));assert.ok(Math.min(...vs)>=.05&&Math.max(...vs)<8,'hill elevations in degrees, layer '+l+': '+Math.max(...vs).toFixed(1));}
 const west=[292,296,300].map(b=>e(1,b)),north=[0,10,20].map(b=>e(1,b));assert.ok(Math.max(...west)>2.4*Math.max(...north),'Bymarka (WNW) stands higher than the ridge to the north');
 // The sky follows the camera; the clouds drift.
 const eye=new T.Vector3(1234,250,-321);look.update(10,eye,new T.Vector3(1200,240,-300),0,-1);const a=sky.clouds.rotation.y;look.update(20,eye,new T.Vector3(1200,240,-300),0,-1);
 assert.ok(sky.group.position.distanceTo(eye)<1e-9,'the sky rides with the camera');assert.ok(sky.clouds.rotation.y>a,'the clouds drift');
 console.log('Sky:',tris,'triangles, fog =',SKY.horizon,'at the horizon over',bearings,'bearings, zenith bluer, warm towards the sun, 3 hill layers, clouds drift: OK');}

// 4. Ground colours on the real map: vary by land cover, slope and noise; darker at buildings and in forest; the lake bed by depth.
const {lakes,lakeAt,shoreDistance,rawHeight}=createLakes(data),step=8,nx=Math.round((terrain.nx-1)*terrain.step/step)+1,nz=Math.round((terrain.nz-1)*terrain.step/step)+1,gh=new Float32Array(nx*nz);
const waterY=l=>160+(l.level-160)*1.45+.12;
for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)gh[j*nx+i]=160+(rawHeight(terrain.x0+i*step,terrain.z0+j*step)-160)*1.45;
const started=performance.now(),ground=createGround({data,gh,nx,nz,step,x0:terrain.x0,z0:terrain.z0,lakes,shoreDistance,waterY}),groundMs=performance.now()-started,col=ground.colours;
{assert.equal(col.length,3*nx*nz);const at=(i,j)=>[col[3*(j*nx+i)],col[3*(j*nx+i)+1],col[3*(j*nx+i)+2]];
 assert.ok(col.every(v=>v>=0&&v<=1.2&&Number.isFinite(v)),'every ground colour is a finite linear colour');
 const V=[];for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=terrain.x0+i*step,z=terrain.z0+j*step,q=j*nx+i,c=at(i,j);
  const dx=(gh[j*nx+Math.min(nx-1,i+1)]-gh[j*nx+Math.max(0,i-1)])/(step*2),dz=(gh[Math.min(nz-1,j+1)*nx+i]-gh[Math.max(0,j-1)*nx+i])/(step*2);V.push({x,z,q,c,slope:Math.hypot(dx,dz),lake:lakeAt(x,z)});}
 // Buildings: distance from each vertex to the nearest footprint vertex is enough for a statistical check.
 const cells=new Map();for(const b of data.buildings)for(const p of b.p){const k=Math.floor(p[0]/16)+','+Math.floor(p[1]/16);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(p);}
 const near=(x,z,r)=>{let best=1e9;const i0=Math.floor(x/16),j0=Math.floor(z/16),n=Math.ceil(r/16);for(let a=-n;a<=n;a++)for(let b=-n;b<=n;b++)for(const p of cells.get((i0+a)+','+(j0+b))||[])best=Math.min(best,Math.hypot(p[0]-x,p[1]-z));return best;};
 const dry=V.filter(v=>!v.lake),built=dry.filter(v=>near(v.x,v.z,60)<12&&v.slope<.35),flat=built.map(v=>lum(v.c));
 // A lot of different colours, not four (the old ground had four colours in 40 m squares), with both fine and coarse variation.
 const quant=new Set(dry.map(v=>v.c.map(x=>Math.round(x*64)).join(',')));assert.ok(quant.size>400,'distinct ground colours: '+quant.size);
 const lawn=dry.filter(v=>v.slope<.3&&near(v.x,v.z,80)<25).map(v=>lum(v.c)),ls=stat(lawn);assert.ok(ls.sd/ls.mean>.12,'lawn brightness varies by more than 12 %: '+(ls.sd/ls.mean).toFixed(3));
 // Neighbouring vertices differ a little, vertices 40 m apart differ more (patches, not a grid of flat squares).
 let near1=0,far1=0,n=0;for(let j=6;j<nz-6;j+=5)for(let i=6;i<nx-6;i+=5){const q=j*nx+i;if(V[q].lake||V[q+5].lake)continue;near1+=Math.abs(lum(V[q].c)-lum(V[q+1].c));far1+=Math.abs(lum(V[q].c)-lum(V[q+5].c));n++;}
 assert.ok(far1/n>near1/n*1.6,'the ground changes over tens of metres more than over 8 m');
 // Forest floor (inside OSM wood polygons) is darker and cooler than lawn near houses; steep ground is greyer than flat ground; ground at the foot of buildings is darker.
 const inRing=(ring,x,z)=>{let s=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)s=!s;}return s;};
 const woods=data.areas.filter(a=>a.type==='wood'||a.type==='forest'),inWood=dry.filter(v=>woods.some(w=>inRing(w.p,v.x,v.z))&&v.slope<.4);
 assert.ok(inWood.length>50,'wood polygons cover ground vertices: '+inWood.length);const w=stat(inWood.map(v=>lum(v.c))),hm=stat(flat);assert.ok(w.mean<hm.mean*.8,`forest floor ${w.mean.toFixed(3)} darker than lawn near houses ${hm.mean.toFixed(3)}`);
 const steep=dry.filter(v=>v.slope>.7&&near(v.x,v.z,80)<40),level=dry.filter(v=>v.slope<.25&&near(v.x,v.z,80)<30);assert.ok(steep.length>20,'steep settled ground exists: '+steep.length);
 assert.ok(stat(steep.map(v=>sat(v.c))).mean<stat(level.map(v=>sat(v.c))).mean*.92,'steep ground shows rock and earth: less saturated');
 const foot=dry.filter(v=>v.slope<.35&&near(v.x,v.z,40)<3.5),away=dry.filter(v=>v.slope<.35&&near(v.x,v.z,60)>14&&near(v.x,v.z,60)<24&&built.length);
 const dark=stat(foot.map(v=>lum(v.c))).mean,out=stat(away.map(v=>lum(v.c))).mean;assert.ok(dark<out*.93,`darker at the foot of buildings (${dark.toFixed(3)} against ${out.toFixed(3)})`);
 // Lake beds: darker and bluer where deeper, and the shore is tinted.
 const bed=V.filter(v=>v.lake).map(v=>({depth:waterY(v.lake)-gh[v.q],c:v.c})).filter(v=>v.depth>0);assert.ok(bed.length>500,'lake bed vertices: '+bed.length);
 const shallow=bed.filter(v=>v.depth<.4),deep=bed.filter(v=>v.depth>2.8);assert.ok(shallow.length>20&&deep.length>20,'shallow and deep water');
 const sh=stat(shallow.map(v=>lum(v.c))).mean,dp=stat(deep.map(v=>lum(v.c))).mean;assert.ok(dp<sh*.6,'the lake bed darkens with depth');assert.ok(deep.every(v=>v.c[2]>v.c[0]),'deep water is blue');
 // sample() is exact at the vertices and in between.
 const s=[0,0,0];ground.sample(terrain.x0+40*step,terrain.z0+30*step,s);const c0=at(40,30);assert.ok(Math.abs(s[0]-c0[0])+Math.abs(s[1]-c0[1])+Math.abs(s[2]-c0[2])<1e-5,'sample() at a vertex');
 ground.sample(terrain.x0+40.5*step,terrain.z0+30*step,s);const c1=at(41,30);assert.ok(Math.abs(s[1]-(c0[1]+c1[1])/2)<1e-5,'and halfway');
 console.log(`Ground: ${nx*nz} vertices painted in ${groundMs.toFixed(0)} ms; ${quant.size} distinct colours, lawn varies ${(ls.sd/ls.mean*100).toFixed(0)} %, forest floor ${(w.mean/hm.mean*100).toFixed(0)} % of lawn, darker at buildings ${((1-dark/out)*100).toFixed(0)} %, steep ground greyer, lake bed by depth: OK`);}

// 5. Road, kerb and path colours.
{const old=lin('#737d7b'),a=lin(ROAD.asphalt),k=lin(ROAD.kerb);assert.ok(lum(a)<lum(old)*.8,'asphalt darker than before');assert.ok(a[2]-a[0]>old[2]-old[0]+.005,'and bluer');
 assert.ok(lum(k)/lum(a)>2.2,'the kerb band reads against the asphalt: '+(lum(k)/lum(a)).toFixed(2));assert.ok(lum(lin(PATH.sidewalk))>lum(a)*1.8&&lum(lin(PATH.cycleway))<lum(lin(PATH.sidewalk)),'sidewalks lighter than asphalt, cycleways darker');
 const paint=createRoadPainter(ground),out=new Float32Array(12),corners=new Float32Array(12),vals=[],g=[0,0,0];
 for(let i=0;i<400;i++){const x=200+i*3.7,z=-100+i*1.3;corners.set([x,0,z,x+4,0,z,x+4,0,z+5,x,0,z+5]);paint(0,false,4,corners,out);vals.push(lum([out[0],out[1],out[2]]));}
 const as=stat(vals);assert.ok(as.sd/as.mean>.03&&as.sd/as.mean<.25,'asphalt varies subtly: '+(as.sd/as.mean).toFixed(3));
 corners.set([300,0,50,304,0,50,304,0,55,300,0,55]);paint(3,false,4,corners,out);ground.sample(300,50,g);assert.ok(Math.abs(out[0]-g[0]*.96)<1e-6,'a verge takes the colour of the ground beside it');
 paint(0,true,4,corners,out);const gv=[out[0],out[1],out[2]];paint(0,false,4,corners,out);assert.ok(gv[0]/gv[2]>out[0]/out[2]+.1,'gravel roads are warmer than asphalt');
 const dash=lin(ROAD.dash);assert.ok(dash[0]>dash[2]*1.5,'Norwegian centre lines are yellow');
 console.log('Roads: asphalt',ROAD.asphalt,'(darker, bluer), kerb',ROAD.kerb,', contrast',(lum(k)/lum(a)).toFixed(1),': OK');}

// 6. Water: see-through, reflects the sky at a low angle, glitters in the sun.
{const w=createWater(T),m=w.material;assert.ok(m.transparent&&m.opacity<1&&m.opacity>.6&&m.depthWrite===false,'see-through water over a coloured bed');assert.ok(m.specular.r>.8&&m.shininess>60,'sun glitter');
 const shader={uniforms:{},vertexShader:'#include <common>\n#include <worldpos_vertex>',fragmentShader:'#include <common>\n#include <normal_fragment_maps>\n#include <opaque_fragment>'};m.onBeforeCompile(shader);
 assert.ok(shader.vertexShader.includes('vWorld')&&shader.fragmentShader.includes('fres')&&shader.fragmentShader.includes('time')&&shader.uniforms.time,'fresnel sky reflection and moving ripples are in the shader');
 const mesh=w.build([0,10,0,10,10,0,0,10,10]);assert.equal(mesh.geometry.attributes.normal.getY(0),1,'flat water has up normals');w.update(3.5);assert.equal(shader.uniforms.time.value,3.5,'time reaches the shader');
 const bed=WATER.bed,l=c=>lum(lin(c));assert.ok(l(bed.sand)>l(bed.shallow)&&l(bed.shallow)>l(bed.mid)&&l(bed.mid)>l(bed.deep),'bed colours darken with depth');
 console.log('Water: see-through, fresnel and glitter shader, bed by depth: OK');}

// 7. The real world, built with the software renderer and stand-in DOM: the look is wired into world.js and the budget holds.
{const src=fs.readFileSync('dist/world.js','utf8');
 for(const s of ["from './look.js'",'createLook({T,scene})','createGround(','createRoadPainter(','mood.configureRenderer(renderer)','mood.update(time,camera.position','mood.water.build(','mood.environment()','=mood.staticMaterial'])assert.ok(src.includes(s),'world.js uses '+s);
 for(const s of ["'#bfdfed'",'toneMappingExposure=1.28','new T.HemisphereLight','PCFSoftShadowMap'])assert.ok(!src.includes(s),'world.js no longer has '+s);
 assert.ok(/c\.mesh\.visible=d<680/.test(src)&&FOG.far+113<=680+1,'chunks are drawn to 680 m, fog is opaque before their corners can show');
 const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}),set:(t,k,v)=>{t[k]=v;return true;}});
 const canvas=()=>({width:0,height:0,style:{},getContext:k=>k==='2d'?ctx:null,addEventListener(){},clientWidth:1280,clientHeight:800});
 globalThis.document={createElement:canvas};globalThis.window={addEventListener(){}};globalThis.devicePixelRatio=2;
 const {createWorld}=await import('./dist/world.js');const t0=performance.now(),world=createWorld(canvas(),data),ms=performance.now()-t0;
 const scene=world.scene,r=world.renderer;assert.equal(r.toneMapping,T.ACESFilmicToneMapping);assert.equal(r.outputColorSpace,T.SRGBColorSpace);assert.ok(r.shadowMap.enabled);
 assert.ok(scene.fog&&Math.abs(scene.fog.color.r-new T.Color(SKY.horizon).r)<1e-6,'the world has the sky-coloured fog');assert.ok(scene.environment,'the car keeps its reflection map');
 const lights=[];scene.traverse(o=>{if(o.isLight)lights.push(o);});assert.ok(lights.some(o=>o.isHemisphereLight)&&lights.some(o=>o.isDirectionalLight&&o.castShadow&&o.shadow.mapSize.x>=2048),'sun with shadows and sky light');
 let skyGroup=null,water=null,chunks=0,tris=0,skyTris=0;scene.traverse(o=>{if(o.name==='Himmel')skyGroup=o;if(o.name==='Vann')water=o;if(o.isMesh&&o.geometry?.attributes?.position){const n=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;tris+=n;}});
 skyGroup.traverse(o=>{if(o.isMesh)skyTris+=o.geometry.attributes.position.count/3;});
 scene.traverse(o=>{if(o.isMesh&&o.material.isMeshLambertMaterial&&o.material.vertexColors)chunks++;});
 assert.ok(skyGroup&&skyGroup.parent===scene,'the world has a sky');assert.equal(skyGroup.visible,false,'the software rasteriser draws no sky');assert.ok(water&&water.material.transparent,'the world has see-through water');assert.ok(chunks>20,'static chunks use the shared material: '+chunks);
 // Ground chunks carry many different colours (per-vertex).
 const seen=new Set();scene.traverse(o=>{if(o.isMesh&&o.material.isMeshLambertMaterial&&o.geometry.attributes.color&&seen.size<5000){const c=o.geometry.attributes.color;for(let i=0;i<c.count&&seen.size<5000;i+=33)seen.add(Math.round(c.getX(i)*80)+','+Math.round(c.getY(i)*80)+','+Math.round(c.getZ(i)*80));}});assert.ok(seen.size>1000,'vertex colours in the chunks vary: '+seen.size);
 // A few frames: no exceptions, the sky follows the camera, the shadow box follows the car.
 r.render=()=>{};const pos=new T.Vector3(900,230,120),tan=new T.Vector3(1,0,0);for(let i=0;i<5;i++)world.update(1/30,pos,tan,10,'follow',false,i/30,tan);
 assert.ok(skyGroup.position.distanceTo(world.camera.position)<1e-6,'the sky is at the camera');const sun=lights.find(o=>o.isDirectionalLight);assert.ok(Math.hypot(sun.target.position.x-pos.x,sun.target.position.z-pos.z)<RENDER.shadowAhead+3,'the shadow box is at the car');
 console.log(`World: look wired in, ${Math.round(tris)} triangles of which the sky ${skyTris}, ${chunks} chunks, ${seen.size} sampled colours, built in ${ms.toFixed(0)} ms: OK`);}
console.log('verify-look: all checks passed');
