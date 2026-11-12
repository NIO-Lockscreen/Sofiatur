import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {createLakes} from './dist/lakes.js';
import {createRoadSurface} from './dist/road-surface.js';
import {createHouses} from './dist/houses.js';
import {createJunctionBuildings} from './dist/junction-buildings.js';
import {buildingStyles} from './dist/building-details.js';
import {addStreetDetails} from './dist/street-details.js';
import {ROAD} from './dist/look.js';
// The ground by Lianvannet (12 November 2026): the terraces round houses on steep ground, the turning circle by the duck, and the
// cuttings beside roads, with the real terrain, roads and houses as world.js builds them.
globalThis.document=globalThis.document||{createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}}),width:0,height:0})};
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));
const {rawHeight,lakeAt}=createLakes(data),terrain=(x,z)=>160+(rawHeight(x,z)-160)*1.45; // world.js: exaggeration 1.45 over 160 m
const surface=createRoadSurface(data.roads,terrain,data),height=(x,z)=>terrain(x,z)+surface.lowerAt(x,z);
const nearLake=(x,z)=>x>-300&&x<-60&&z>-250&&z<120; // the slope from Herlofsons veg down to Lianvannet
const buckets=new Map(),bucket=(x,z)=>{const k=Math.floor(x/160)*4096+Math.floor(z/160);let b=buckets.get(k);if(!b)buckets.set(k,b={p:new Float32Array(2304),c:new Float32Array(2304),n:0});return b;};
const grow=b=>{const p=new Float32Array(b.p.length*2),c=new Float32Array(b.p.length*2);p.set(b.p);c.set(b.c);b.p=p;b.c=c;};
const tri=(b,a,c,d)=>{if(b.n+9>b.p.length)grow(b);b.p.set([...a,...c,...d],b.n);b.n+=9;},quad=(b,a,c,d,e,colour)=>{tri(b,a,c,d,colour);tri(b,a,d,e,colour);},box=()=>{};

// 1. Terraces round houses on steep ground. The bank below a house's shelf steepens (grass at 1:1.6, then 1:1.1, then 1:0.75) before a wall
// is needed, a steep site has a deeper basement, and the gap under a bank is closed down to the ground. The walls left are low: there were
// 1 616 pieces (10.3 km, 317 over 4 m, up to 12.1 m) and 40 of the 78 by Lianvannet were over 4 m.
{const houses=createHouses({T,scene:{add(){}},data,height,bucket,tri,quad,box,groundPoly:()=>{},junctionBuildings:createJunctionBuildings(data),buildingStyles,
  groundColour:(x,z,o)=>{o[0]=o[1]=o[2]=.3;return o;},onRoad:(x,z)=>surface.heightAt(x,z)!==null});
 const wallBase=new Map(),houseBounds=[];
 for(const building of data.buildings){const p=building.p.slice(0,-1);if(p.length<3||building.t.building==='roof')continue;
  const cx=p.reduce((a,b)=>a+b[0],0)/p.length,cz=p.reduce((a,b)=>a+b[1],0)/p.length;let area=0;for(let i=0;i<p.length;i++)area+=p[i][0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*p[i][1];area=Math.abs(area/2);if(area<4)continue;
  houses.add({building,p,cx,cz,area,wallBase,houseBounds});}
 const walls=houses.stats.gardenWalls,over=(list,h)=>list.filter(w=>w[2]>h).length,len=list=>list.reduce((s,w)=>s+w[3],0),lake=walls.filter(w=>nearLake(w[0],w[1]));
 assert.ok(walls.length>200,'Garden walls are still built where a road is in the way');
 assert.ok(over(walls,4)<=25,`Few walls over 4 m on the whole map (${over(walls,4)}, was 317)`);assert.ok(Math.max(...walls.map(w=>w[2]))<10,'none over 10 m (was 12.1)');
 assert.ok(len(walls)<5000,`${(len(walls)/1000).toFixed(1)} km of wall (was 10.3 km)`);
 assert.ok(over(lake,4)<=3,`By Lianvannet ${over(lake,4)} pieces over 4 m (was 40)`);assert.ok(Math.max(...lake.map(w=>w[2]))<6,'and none over 6 m');
 assert.ok(houses.stats.steepBanks>0,'The steepest banks are used');
 console.log(`Terraces: ${walls.length} pieces of garden wall (${(len(walls)/1000).toFixed(1)} km, ${over(walls,4)} over 4 m, the highest ${Math.max(...walls.map(w=>w[2])).toFixed(1)} m); by Lianvannet ${lake.length}, ${over(lake,4)} over 4 m: OK`);}

// 2. The turning circle by the duck (OSM node 201496265): a disc in the plane of its two roads, no steeper than they make it, never below a road
// or the ground, the ground kept under it, a bank of stones from its edge down towards the water and boulders along the top.
{const c=data.street.turning_circles.find(t=>t.o==='n'+data.lakeside),R=c.rad,[px,pz]=c.p,shared=surface.turning.find(t=>t.o===c.o);
 assert.ok(shared,'road-surface.js fits the plane');const slope=Math.hypot(shared.B,shared.C);assert.ok(slope>.05&&slope<.25,`The disc slopes ${Math.round(slope*100)} % with its roads (Per Sivles veg climbs from it)`);
 const plane=(x,z)=>shared.y0+shared.B*(x-px)+shared.C*(z-pz);let ground=-Infinity;
 for(let r=0;r<=R+.7;r+=.5)for(let i=0;i<64;i++){const a=i/64*Math.PI*2,x=px+Math.cos(a)*r,z=pz+Math.sin(a)*r;ground=Math.max(ground,surface.meshAt(x,z)-plane(x,z));}
 assert.ok(ground<-.1,`The ground under the disc lies below its plane (${ground.toFixed(2)} m)`);
 const disc=[],roadTop=(x,z)=>surface.heightAt(x,z)??height(x,z)+.39;
 const log=(b,a,cc,d,e,colour)=>{if(colour===ROAD.gravel||colour===ROAD.asphalt)for(const v of e?[a,cc,d,e]:[a,cc,d])if(Math.hypot(v[0]-px,v[2]-pz)<=R+.01)disc.push(v);};
 const out=addStreetDetails({T,scene:new T.Scene(),data,height,roadTop,bucket,quad:(b,a,cc,d,e,colour)=>{log(b,a,cc,d,e,colour);quad(b,a,cc,d,e,colour);},tri:(b,a,cc,d,colour)=>{log(b,a,cc,d,null,colour);tri(b,a,cc,d,colour);},box,ribbon(){},groundPoly(){},
  ground:surface.groundTop,surfaceAt:(x,z)=>surface.heightAt(x,z),lakeAt,turning:surface.turning});
 assert.ok(disc.length>500,'The disc is drawn');let under=Infinity,low=Infinity;
 for(const [x,y,z] of disc){const s=surface.heightAt(x,z);if(s!==null)under=Math.min(under,y-s);low=Math.min(low,y-surface.groundTop(x,z));}
 assert.ok(under>.02,`Every disc vertex lies over the roads in it (${under.toFixed(3)} m at least)`);assert.ok(low>.02,`and over the ground (${low.toFixed(3)} m)`);
 const t=out.turning.find(q=>q.p===c.p);assert.ok(t.foot>=10,`A bank down from ${t.foot} of its 48 kerb points`);assert.ok(t.boulders>=3,`${t.boulders} boulders along the stones by the water`);
 const lift=disc.map(([x,y,z])=>y-plane(x,z));assert.ok(Math.max(...lift)<.8,'The disc keeps close to its plane');
 console.log(`Turning circle by Lianvannet: a disc sloping ${Math.round(slope*100)} % with its roads, over the roads by ${(under*100).toFixed(0)} cm and the ground by ${(low*100).toFixed(0)} cm at least, ground kept ${(-ground).toFixed(2)} m under its plane, a bank from ${t.foot} kerb points and ${t.boulders} boulders: OK`);
 for(const q of data.street.turning_circles){const s=surface.turning.find(v=>v.o===q.o);assert.ok(s,'every turning circle has a plane');assert.ok(Math.hypot(s.B,s.C)<.3,`${q.o} slopes less than 30 %`);}}

// 3. Cuttings: beside a road that lies below the ground, the ground at the 8 m grid's vertices rises no more than 0.9 per metre beyond a 1.5 m
// shoulder (it rose up to 5 m in one mesh step beside Per Sivles veg and the lane beside it, a near vertical green face).
{const tr=data.terrain;let worst=-Infinity,checked=0;
 for(const r of surface.geometry.roads){if(r.bridge||!r.pts||!r.pts.some(p=>nearLake(p[0],p[1])))continue;
  for(let k=0;k<r.pts.length;k+=2){const [x,z]=r.pts[k],y=r.y[k];if(!nearLake(x,z))continue;
   for(let gx=Math.ceil((x-r.hw-10-tr.x0)/8)*8+tr.x0;gx<=x+r.hw+10;gx+=8)for(let gz=Math.ceil((z-r.hw-10-tr.z0)/8)*8+tr.z0;gz<=z+r.hw+10;gz+=8){const d=Math.hypot(gx-x,gz-z);if(d>r.hw+10||d<r.hw+1.5)continue;
    const ok=y+.3+(d-r.hw-1.5)*.9;worst=Math.max(worst,surface.meshAt(gx,gz)-ok);checked++;}}}
 assert.ok(checked>500,`${checked} vertices beside the roads by Lianvannet`);assert.ok(worst<.02,`None stands above a 1:1.1 cut slope (${worst.toFixed(2)} m)`);
 console.log(`Cuttings by Lianvannet: ${checked} ground vertices beside the roads, none above a 1:1.1 slope from a 1.5 m shoulder: OK`);}
