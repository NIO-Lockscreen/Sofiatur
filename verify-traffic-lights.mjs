import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './dist/vendor/three.js';
import {createTrafficLights} from './dist/traffic-lights.js';
import {streetSegments,projectPoint} from './dist/transit-geometry.js';
const data=JSON.parse(fs.readFileSync('dist/map.json')),roads=streetSegments(data.roads),scene=new T.Scene();
const lights=createTrafficLights({T,scene,height:()=>100,data}),centre=data.nodes['91783986'];
const inside=(poly,x,z)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [ax,az]=poly[j],[bx,bz]=poly[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};

// One signal per road into the junction, beside the carriageway, facing the cars coming in.
assert.deepEqual(lights.signals.map(s=>s.road).sort(),['Byåsen skole','Bøckmans veg','Bøckmans veg','Selsbakkvegen']);
for(const s of lights.signals){for(const [a,b,w] of roads)assert.ok(projectPoint([s.x,s.z],a,b).distance>w/2+.5,`${s.road} signal clear of the road`);
 for(const b of data.buildings)assert.ok(!inside(b.p,s.x,s.z),`${s.road} signal outside buildings`);
 assert.ok(s.facing[0]*(s.x-centre[0])+s.facing[1]*(s.z-centre[1])>8,'Signal stands on its road, before the junction');}
const lamp=colour=>{const found=[];scene.traverse(o=>{if(o.isMesh&&o.material.color?.getHexString()===colour)found.push(o);});return found.length;};

// Red while the car is on its way, red and amber on arrival, then green at the junction; amber and red after it leaves.
const pos=new T.Vector3(centre[0]-200,0,centre[1]),step=(x,t=.05)=>{pos.x=x;lights.update(t,pos);return lights.state();};
assert.equal(step(centre[0]-200),'red');assert.equal(lamp('ff3b2f'),4);assert.equal(lamp('3ee27a'),0);
assert.equal(step(centre[0]-60),'red');assert.equal(step(centre[0]-30),'red');
assert.equal(step(centre[0]-20),'redAmber');assert.equal(lamp('ffb627'),4);
assert.equal(step(centre[0]-10,.5),'green');assert.equal(lamp('3ee27a'),4);assert.equal(lamp('ff3b2f'),0);
assert.equal(step(centre[0],2),'green','Stays green while the car waits at the junction');
assert.equal(step(centre[0]+30),'amber');assert.equal(step(centre[0]+40,1),'red');
console.log(`Palermo traffic lights: ${lights.signals.length} signals beside the roads; red on the way, red+amber, green at the junction, amber and red after: OK`);
