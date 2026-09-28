import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRailProfiles,placeBusStop,streetSegments,projectPoint} from './dist/transit-geometry.js';
const data=JSON.parse(fs.readFileSync('dist/map.json')),roads=streetSegments(data.roads);
const t=data.terrain;
function height(x,z){const a=Math.max(0,Math.min(t.nx-1.001,(x-t.x0)/t.step)),b=Math.max(0,Math.min(t.nz-1.001,(z-t.z0)/t.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=t.heights;return 160+(((h[j*t.nx+i]*(1-u)+h[j*t.nx+i+1]*u)*(1-v)+(h[(j+1)*t.nx+i]*(1-u)+h[(j+1)*t.nx+i+1]*u)*v)-160)*1.45;}
const {bridges,railHeight}=createRailProfiles(data.rails,height,roads);
assert.ok(bridges.some(b=>b.rail.id==='14012126'),'Munkvoll bridge retained from OSM');
for(const {rail,level} of bridges){let crossed=0;for(let i=1;i<rail.p.length;i++){const a=rail.p[i-1],b=rail.p[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<l;d+=.5){const p=[a[0]+(b[0]-a[0])*d/l,a[1]+(b[1]-a[1])*d/l];if(roads.some(([c,e,w])=>projectPoint(p,c,e).distance<w/2)){assert.ok(level-.86-height(...p)>5.5,'Road is clear underneath deck');crossed++;}}}assert.ok(crossed);
 for(const p of [rail.p[0],rail.p.at(-1)])for(const other of data.rails.filter(r=>r!==rail&&!r.bridge&&r.p.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<.01)))assert.ok(Math.abs(railHeight(other,...p)-level)<.001,'Bridge approaches join at equal height');
}
let stops=0;for(const stop of data.stops.filter(s=>!s.tram)){const f=placeBusStop(stop,roads);assert.ok(f,stop.name+' has safe placement');for(const p of [...f.footprint,[f.x,f.z]])for(const [a,b,w] of roads)assert.ok(projectPoint(p,a,b).distance>w/2+.1,stop.name+' clear of carriageway');stops++;}
for(const p of [[[0,-100],[0,100]],[[0,100],[0,-100]],[[-100,-100],[100,100]]])for(const side of [-1,1]){const f=placeBusStop({p:[side*8,0]},[[...p,6.5]]),a=f.point(-1,0),b=f.point(1,0),dx=p[1][0]-p[0][0],dz=p[1][1]-p[0][1];assert.ok(Math.abs((b[0]-a[0])*dz-(b[1]-a[1])*dx)<1e-6,'Shelter is parallel to road');}
for(const id of ['1366229200','89285927','89285932'])assert.ok(data.roads.some(r=>r.id===id),'School road rendered '+id);
const schoolEdges=data.edges.filter(e=>e.name==='Ved Ugla skole');assert.equal(schoolEdges.length,2,'School through route has no yard-spur decisions');for(const e of schoolEdges)assert.ok(e.path.includes('1035995277')&&e.path.includes('1035995227'));assert.deepEqual(new Set(schoolEdges.map(e=>e.from)),new Set(['1035995263','34036661']));
console.log(`Transit: ${bridges.length} elevated bridges with clearance and continuous approaches; ${stops} shelters clear of all roads; Ugla through route connected both ways.`);
