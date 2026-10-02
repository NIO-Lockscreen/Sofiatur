import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './dist/vendor/three.js';
import {addDalgardSchool,addSportsGrounds,addDalgardDetails,schoolWings,schoolExtras,schoolFrame} from './dist/dalgard.js';
import {streetSegments,projectPoint} from './dist/transit-geometry.js';

// Canvas-backed signs only need a 2D context that accepts drawing calls.
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}}),width:0,height:0})};
const data=JSON.parse(fs.readFileSync('dist/map.json')),t=data.terrain;
function height(x,z){const a=Math.max(0,Math.min(t.nx-1.001,(x-t.x0)/t.step)),b=Math.max(0,Math.min(t.nz-1.001,(z-t.z0)/t.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=t.heights;return 160+(((h[j*t.nx+i]*(1-u)+h[j*t.nx+i+1]*u)*(1-v)+(h[(j+1)*t.nx+i]*(1-u)+h[(j+1)*t.nx+i+1]*u)*v)-160)*1.45;}
let points=[],ribbons=[],boxes=0;const scene=new T.Scene(),bucket=()=>({}),tri=(b,...v)=>points.push(...v.slice(0,3)),quad=(b,...v)=>points.push(...v.slice(0,4));
const box=(b,x,y,z)=>{boxes++;points.push([x,y,z]);},groundPoly=()=>{},ribbon=(p,w)=>ribbons.push({p,w});
const named=name=>{const found=[];scene.traverse(o=>{if(o.name===name)found.push(o);});return found;};
const inRing=(poly,x,z)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [ax,az]=poly[j],[bx,bz]=poly[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
const building=id=>data.buildings.find(b=>String(b.id)===id);
const insideAny=(x,z,skip)=>data.buildings.some(b=>b!==skip&&inRing(b.p,x,z)&&!(b.holes||[]).some(h=>inRing(h,x,z)));

// Dalgård skole: A-bygget with its courtyard, B-bygget and the southern wings, from the OSM relations.
const school=['r1318241','r20722521','r20516148'].map(building);
assert.ok(school.every(Boolean),'All three school buildings in the map');
assert.equal(school[0].holes.length,1,'A-bygget keeps its courtyard');assert.equal(school[0].t.name,'A-bygget');assert.equal(school[1].t.name,'B-bygget');
// Every corner of every outline lies under a wing roof of its own building, and every wing stands on the school.
const within=(w,x,z,m)=>{const [u,v]=schoolFrame.local(x,z);return u>w.u[0]-m&&u<w.u[1]+m&&v>w.v[0]-m&&v<w.v[1]+m;};
for(const b of school){for(const [x,z] of b.p)assert.ok(schoolWings[b.id].some(w=>within(w,x,z,schoolFrame.overhang)),`${b.id} corner (${x},${z}) under a roof`);
 for(const w of schoolWings[b.id]){const [x,z]=schoolFrame.uv((w.u[0]+w.u[1])/2,(w.v[0]+w.v[1])/2);assert.ok(school.some(s=>inRing(s.p,x,z)),`${b.id} wing centred on the school`);}}
// The courtyard stays open: no roof over its middle.
const court=school[0].holes[0],cc=court.slice(0,-1).reduce((s,v)=>[s[0]+v[0]/(court.length-1),s[1]+v[1]/(court.length-1)],[0,0]);
assert.ok(!schoolWings.r1318241.some(w=>within(w,...cc,0)),'Courtyard open to the sky');
const drawn=[];for(const b of school){points=[];const r=addDalgardSchool({T,scene,data,building:b,height,bucket,tri,quad,box,groundPoly});assert.ok(r&&points.length>800,`${b.id} modelled (${points.length} vertices)`);drawn.push(...points);}
const base=Math.min(...drawn.map(p=>p[1]).filter(y=>y>100)),floor=[...school.flatMap(b=>b.p.map(v=>height(...v)))].sort((a,b)=>a-b);
const top=Math.max(...drawn.map(p=>p[1])),mid=floor[Math.floor(floor.length/2)];
// Entrance A1 (OSM node 12631332162 at 677.5, 432.2, reported by the schoolyard work): on the courtyard side, glazed doors under a small
// timber gable (2003 photograph BC041), facing into the courtyard; the old porch and board on the north-west front are gone.
const a1=[677.5,432.2],a1y=floor[Math.floor(floor.length/2)];
assert.ok(drawn.some(p=>Math.hypot(p[0]-a1[0],p[2]-a1[1])<1.6&&p[1]-a1y>2.3&&p[1]-a1y<3),'Doors at the courtyard entrance');
assert.ok(drawn.some(p=>Math.hypot(p[0]-a1[0],p[2]-a1[1])<2.8&&p[1]-a1y>3.9&&p[1]-a1y<4.6),'Gable canopy at the courtyard entrance');
assert.ok(inRing(court,a1[0]+.669*1.5,a1[1]-.743*1.5)&&!insideAny(a1[0]+.669*1.5,a1[1]-.743*1.5),'The entrance faces the open courtyard');
assert.ok(!drawn.some(p=>{const [u,v]=schoolFrame.local(p[0],p[2]);return u<-55.9&&u>-60&&p[1]-a1y>-1&&p[1]-a1y<6;}),'No porch on the north-west front');

assert.ok(top<mid+6.2+3.7&&top>mid+6,'One-storey school; the hall to the north-east is the highest part');
const [sign]=named('DALGÅRD SKOLE OG RESSURSSENTER UNIVERSITETSSKOLE');assert.ok(sign,'School name on the hall gable (photographs of 2009 and 2025)');
assert.ok(!insideAny(sign.position.x-Math.cos(42*Math.PI/180)*2,sign.position.z-Math.sin(42*Math.PI/180)*2),'The name faces the car park outside');
{ // The letters are on the hall's north-west gable: within 0.3 m of an outline wall of A-bygget, below the top of the gable.
 const ring=school[0].p,[ax,az]=[sign.position.x,sign.position.z];let best=1e9;
 for(let i=0;i<ring.length-1;i++){const [px,pz]=ring[i],[qx,qz]=ring[i+1],dx=qx-px,dz=qz-pz,t=Math.max(0,Math.min(1,((ax-px)*dx+(az-pz)*dz)/(dx*dx+dz*dz||1)));best=Math.min(best,Math.hypot(ax-px-t*dx,az-pz-t*dz));}
 assert.ok(best<.3,`Letters on the wall (${best.toFixed(2)} m)`);
 const [u,v]=schoolFrame.local(ax,az);assert.ok(u<-24.9&&u>-25.4&&v<-30.6&&v>-45.6,`On the hall gable (u ${u.toFixed(1)}, v ${v.toFixed(1)})`);
 assert.ok(sign.position.y-height(ax,az)>3&&sign.position.y-height(ax,az)<7.5,'Letters at reading height under the gable top');}
assert.ok(addDalgardSchool({T,scene,data,building:building('1312240278'),height,bucket,tri,quad,box,groundPoly})===null,'Other buildings keep the generic builder');
console.log(`Dalgård skole: A-bygget (courtyard), B-bygget and the southern wings, ${Object.values(schoolWings).flat().length} wings (hipped, one mono-pitch hall) covering every wall, ${Object.values(schoolWings).flat().filter(w=>w.lantern).length} roof lanterns: OK`);

// The pavilions E and F, the 2018 building G and the dormitory (stepped brick units) belong to the school and are drawn here,
// not by houses.js (addDalgardSchool returns bounds, so world.js skips the generic builder). Each one: every corner under a wing
// of its own, everything drawn within 1.5 m of its footprint (roof overhangs), standing on the ground, one storey.
const extraIds=Object.keys(schoolExtras);assert.deepEqual(extraIds.sort(),['191360470','709881957','89247040','89247055'],'E, F, G and the dormitory');
const distToRing=(ring,x,z)=>{let best=1e9;for(let i=0;i<ring.length-1;i++){const [px,pz]=ring[i],[qx,qz]=ring[i+1],dx=qx-px,dz=qz-pz,t=Math.max(0,Math.min(1,((x-px)*dx+(z-pz)*dz)/(dx*dx+dz*dz||1)));best=Math.min(best,Math.hypot(x-px-t*dx,z-pz-t*dz));}return best;};
let extraTriangles=0;
for(const id of extraIds){const b=building(id),w=schoolExtras[id].wings;assert.ok(b,`${id} in the map`);
 for(const [x,z] of b.p)assert.ok(w.some(q=>within(q,x,z,.35)),`${id} corner (${x},${z}) under a roof`);
 points=[];const r=addDalgardSchool({T,scene,data,building:b,height,bucket,tri,quad,box,groundPoly});assert.ok(r&&points.length>150,`${id} modelled (${points.length} vertices)`);
 extraTriangles+=points.length;
 const gs=b.p.map(v=>height(...v)),spread=Math.max(...gs)-Math.min(...gs),low=Math.min(...points.map(p=>p[1])),topY=Math.max(...points.map(p=>p[1]));
 assert.ok(spread<2.6,`${id} stands on gently sloping ground (${spread.toFixed(1)} m)`);
 assert.ok(low<Math.min(...gs)+.1&&low>Math.min(...gs)-1,`${id} plinth reaches the ground (${(low-Math.min(...gs)).toFixed(2)} m)`);
 assert.ok(topY-Math.max(...gs)<8.5&&topY-Math.min(...gs)>3,`${id} one storey with its roof (${(topY-Math.min(...gs)).toFixed(1)} m)`);
 for(const p of points){const inRingNow=inRing(b.p,p[0],p[2]);assert.ok(inRingNow||distToRing(b.p,p[0],p[2])<1.5,`${id} vertex (${p[0].toFixed(1)},${p[2].toFixed(1)}) outside the footprint`);}
 for(const p of points)assert.ok(!insideAny(p[0],p[2],b)||p[1]<height(p[0],p[2])-.2||distToRing(b.p,p[0],p[2])<.4,`${id} nothing inside another building (${p[0].toFixed(1)},${p[2].toFixed(1)})`);}
const dormitory=schoolExtras['191360470'].wings;assert.ok(dormitory.every(w=>w.mono&&w.slope<.2&&w.eave<3),'Dormitory: low mono-pitch units');
const hallWing=schoolWings.r1318241.find(w=>w.mono);assert.ok(hallWing&&hallWing.roof==='#7b5d55','The hall has one brown mono-pitch roof (photographs of 2021 and 2025)');
const lanternBoxes=Object.values(schoolWings).flat().filter(w=>w.lantern&&w.box).length+extraIds.flatMap(i=>schoolExtras[i].wings).filter(w=>w.lantern&&w.box).length;assert.equal(lanternBoxes,3,'Black timber lantern boxes on the southern wings and on E');
assert.ok(!schoolWings.r1318241.some(w=>w.u[0]<-60),'No stray wings');
console.log(`School pavilions: E, F, G and the dormitory modelled here (${extraTriangles} vertices), mono-pitch hall, ${lanternBoxes} black lantern boxes: OK`);

// Sports grounds: turf pitches with markings and goals, the tartan running track round Byåsen Arena, car parks.
const areas=data.areas.filter(a=>a.osm&&['pitch','track','parking'].includes(a.type));
const track=areas.find(a=>a.name==='Dalgård friidrettsanlegg'),arena=areas.find(a=>a.name==='Byåsen Arena');
assert.equal(track.surface,'tartan');assert.equal(track.holes.length,1);assert.ok(arena.p.every(v=>inRing(track.holes[0],...v)),'Byåsen Arena inside the track');
for(const name of ['Dalgård kunstgressbane','Byåsen mini kunstgress','Dalgård tennisbane','Dalgård padelanlegg'])assert.ok(areas.some(a=>a.name===name&&a.surface),name);
assert.ok(areas.filter(a=>a.type==='parking').length>=7,'Car parks at the ice rink and the school');
assert.ok(!data.areas.some(a=>!a.osm&&a.type==='pitch'&&Math.hypot(a.p[0][0]-983,a.p[0][1]-493)<60),'No untagged copy of the pitches left');
points=[];ribbons=[];boxes=0;const bounds=addSportsGrounds({T,data,height,bucket,tri,box,ribbon});
assert.equal(bounds.length,areas.filter(a=>['pitch','track','parking'].includes(a.type)).length,'Every ground kept free of trees');
for(const a of areas)assert.ok(bounds.some(b=>a.p.every(([x,z])=>x>=b[0]&&x<=b[2]&&z>=b[1]&&z<=b[3])),`${a.name||a.osm} inside its tree-free extent`);
const soccer=areas.filter(a=>a.p.length===4&&/soccer/.test(a.sport)&&a.surface!=='asphalt');
assert.equal(boxes,soccer.length*6,'Two goals (posts and crossbar) on every football pitch');
assert.ok(points.every(p=>Math.abs(p[1]-height(p[0],p[2])-.1)<.02||Math.abs(p[1]-height(p[0],p[2])-.07)<.02||p[1]>height(p[0],p[2])),'Surfaces lie on the ground');
const lanes=ribbons.filter(r=>r.w===.07).length;assert.ok(lanes>=4,`Lane lines on the track (${lanes})`);
console.log(`Dalgård idrettspark: ${areas.length} grounds (track with ${lanes} lane lines, ${soccer.length} football pitches with goals, tennis, padel, car parks), all clear of trees: OK`);

// Shop signs: Extra on Dalgårdstunet towards Anders Wigens veg and the square, the ice rink's name (Bunnpris: verify-stavset.mjs).
const wallBase=new Map(['1312240278','1312240279','89233555'].map(id=>[id,{y:Math.max(...building(id).p.map(v=>height(...v))),h:id==='1312240278'?16.4:id==='89233555'?9:7}]));
points=[];addDalgardDetails({T,scene,data,wallBase,bucket,quad,box});
const streets=streetSegments(data.roads);
const facing=(sign,owner)=>{const n=new T.Vector3(0,0,1).applyEuler(sign.rotation);assert.ok(!insideAny(sign.position.x+n.x*3,sign.position.z+n.z*3),`${sign.name} faces out of ${owner}`);
 assert.ok(inRing(building(owner).p,sign.position.x-n.x*1.5,sign.position.z-n.z*1.5),`${sign.name} on ${owner}`);return n;};
const extra=named('Extra');assert.equal(extra.length,2,'Extra on the street side and the square');for(const s of extra)facing(s,'1312240278');
const street=extra.find(s=>{const n=new T.Vector3(0,0,1).applyEuler(s.rotation);return streets.some(([a,b])=>projectPoint([s.position.x+n.x*9,s.position.z+n.z*9],a,b).distance<6);});
assert.ok(street,'One Extra sign looks onto Anders Wigens veg');
assert.equal(named('BUNNPRIS').length,0,'Bunnpris is drawn with its shop (stavset.js)');const [ishall]=named('DALGÅRD ISHALL');facing(ishall,'89233555');
console.log('Signs: Extra (street and square), Dalgård ishall, each on the outside of its building: OK');

// Dalgårdvegen runs down to Dalgård ishall: a road to a parking place in the car park beside the hall.
const park=data.nodes['ishall-parkering'],spur=data.edges.find(e=>e.to==='ishall-parkering');
assert.equal(spur.name,'Dalgård ishall');assert.ok(spur.length<45,'Short road from Dalgårdvegen');
assert.ok(data.edges.some(e=>e.name==='Dalgårdvegen'&&e.to===spur.from)&&data.edges.some(e=>e.name==='Dalgårdvegen'&&e.from===spur.from),'Turns off Dalgårdvegen');
const hall=building('89233555').p,wallDistance=Math.min(...hall.slice(0,-1).map((a,i)=>projectPoint(park,a,hall[i+1]).distance));
assert.ok(wallDistance>6&&wallDistance<20,`Parks beside the hall (${wallDistance.toFixed(1)} m)`);
for(const n of spur.path)assert.ok(!insideAny(...data.nodes[n]),'Road clear of buildings');
assert.ok(data.pois.some(p=>p.name==='Dalgård skole'&&p.type==='school')&&data.pois.some(p=>p.name==='Dalgård ishall'),'Name labels');
console.log(`Road to Dalgård ishall: ${spur.length} m from Dalgårdvegen to a parking place ${wallDistance.toFixed(1)} m from the hall: OK`);
