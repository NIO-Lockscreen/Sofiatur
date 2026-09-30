import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {createLakes,SHORE} from './dist/lakes.js';
import {createDuck} from './dist/duck.js';
// Lianvannet and Kyvannet (30 September 2026): real ground round them, a shore without walls, a road down to the water
// at Lianvannet and the big duck on it.
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),t=data.terrain;
const {lakes,rawHeight,duckCircle,lakeAt}=createLakes(data),lian=lakes.find(l=>l.name==='Lianvannet');

// 1. The terrain beyond the measured grid (west of x=-200, north of z=-680) is Mapzen, not the edge value copied on:
// along each row west of the edge the heights vary, and the lakes' water levels lie within the ground round them.
const at=(x,z)=>t.heights[(z-t.z0)/t.step*t.nx+(x-t.x0)/t.step];let rows=0;
for(let z=-600;z<=800;z+=40){const west=[];for(let x=t.x0;x<=-240;x+=40)west.push(at(x,z));if(new Set(west).size>=4)rows++;}
assert.ok(rows>=34,`Rows west of the measured grid vary (${rows} of 36)`);
for(const l of lakes){const near=[];for(let x=t.x0;x<t.x0+(t.nx-1)*t.step;x+=40)for(let z=t.z0;z<t.z0+(t.nz-1)*t.step;z+=40){const d=Math.min(...l.p.map(p=>Math.hypot(p[0]-x,p[1]-z)));if(d<60)near.push(at(x,z));}
 near.sort((a,b)=>a-b);assert.ok(l.level>=near[0]-.01&&l.level<=near[Math.floor(near.length*.6)],`${l.name} level ${l.level} m lies within the ground round it`);}
console.log(`Terrain west and north of the measured grid from Mapzen (${rows} rows vary); lake levels: ${lakes.map(l=>l.name+' '+l.level+' m').join(', ')}: OK`);

// 2. The shore: on the outline the ground is at the water level, 3 m out in the lake it is under the water, 3 m inland
// above it (except where the ground beside the lake lies lower than the water, at the outlet: there it dips gently away);
// along lines straight out from the shore the ground rises without a wall (no 2 m step steeper than 55 %).
let checked=0,steepest=0,outlet=0;const {gridHeight}=createLakes(data);
for(const l of lakes)for(let i=0;i<l.p.length;i++){const a=l.p[i],b=l.p[(i+1)%l.p.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<4)continue;
 const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,nx=(b[1]-a[1])/len,nz=-(b[0]-a[0])/len; // one of the two normals: which side is water?
 const side=s=>lakeAt(mx+nx*3*s,mz+nz*3*s)===l&&!lakeAt(mx-nx*3*s,mz-nz*3*s),sign=side(1)?1:side(-1)?-1:0;if(!sign)continue; // narrow necks and sharp corners aside
 const wx=nx*sign,wz=nz*sign;
 assert.ok(Math.abs(rawHeight(mx,mz)-l.level)<.25,`${l.name}: ground at the water on the shore (${(rawHeight(mx,mz)-l.level).toFixed(2)} m)`);
 assert.ok(rawHeight(mx+wx*3,mz+wz*3)<l.level-.04,`${l.name}: under water 3 m out`);if(gridHeight(mx-wx*3,mz-wz*3)<l.level)outlet++;else assert.ok(rawHeight(mx-wx*3,mz-wz*3)>l.level,`${l.name}: above the water 3 m in`);
 for(let s=0;s<SHORE;s+=2){const h0=rawHeight(mx-wx*s,mz-wz*s),h1=rawHeight(mx-wx*(s+2),mz-wz*(s+2));steepest=Math.max(steepest,Math.abs(h1-h0)/2);}checked++;}
assert.ok(checked>150,`${checked} shore segments checked`);assert.ok(steepest<.55,`The bank rises without a wall (steepest ${Math.round(steepest*100)} % over 2 m)`);
assert.ok(outlet<checked*.1,`Ground below the water beside the lake only at the outlet (${outlet} of ${checked} segments)`);
console.log(`Shore: ${checked} segments meet the water at its level, under water 3 m out, above it 3 m in (${outlet} at the outlet dip away); steepest bank ${Math.round(steepest*100)} %: OK`);

// 3. The road down to the water: the turning circle at the end of Vetle Vislies veg is a place in the map, 10 m or so from
// Lianvannet and at most 2.5 m above its water; Per Sivles veg leads on from it.
const [lx,lz]=data.nodes[data.lakeside];assert.ok(data.edges.some(e=>e.to===data.lakeside&&e.name==='Vetle Vislies veg')&&data.edges.some(e=>e.from===data.lakeside&&e.name==='Per Sivles veg'));
const shore=Math.min(...lian.p.map(p=>Math.hypot(p[0]-lx,p[1]-lz)));assert.ok(shore<15,`Turning circle ${shore.toFixed(1)} m from the water`);
assert.ok(rawHeight(lx,lz)-lian.level<2.5,`Turning circle ${(rawHeight(lx,lz)-lian.level).toFixed(1)} m above the water`);
console.log(`Vetle Vislies veg ends at the turning circle ${shore.toFixed(1)} m from Lianvannet, ${(rawHeight(lx,lz)-lian.level).toFixed(1)} m above the water: OK`);

// 4. The duck: a mallard far bigger than the car (the ET5 is 4.79 m long), swimming round a circle in open water near the
// turning circle; it bobs and dips but keeps its place on the water.
const circle=duckCircle(),[cx,cz]=circle.centre,{shoreDistance}=createLakes(data);
assert.equal(lakeAt(cx,cz)?.name,'Lianvannet');assert.ok(shoreDistance(circle.lake,cx,cz)>=circle.R+10,'Open water all round the circle');
const far=Math.hypot(cx-lx,cz-lz);assert.ok(far<90,`Circle ${far.toFixed(0)} m from the turning circle`);
for(let a=0;a<Math.PI*2;a+=.2)assert.equal(lakeAt(cx+Math.cos(a)*circle.R,cz+Math.sin(a)*circle.R)?.name,'Lianvannet','The circle stays on the water');
const duck=createDuck(T);for(let i=0;i<300;i++)duck.update(1/30,i/30);duck.group.updateMatrixWorld(true);
const box=new T.Box3().setFromObject(duck.group.children[0]),size=box.getSize(new T.Vector3()); // the bird, not its ripples
assert.ok(size.z>9&&size.z<14,`Duck ${size.z.toFixed(1)} m long, two to three times the car`);assert.ok(size.y>4,`Duck ${size.y.toFixed(1)} m tall`);assert.ok(box.min.y<0&&box.min.y>-2,'It floats: the body is partly under the water line');
console.log(`Duck ${size.z.toFixed(1)} m long and ${size.y.toFixed(1)} m tall, circling ${circle.R} m round a point ${far.toFixed(0)} m from the turning circle in open water: OK`);
