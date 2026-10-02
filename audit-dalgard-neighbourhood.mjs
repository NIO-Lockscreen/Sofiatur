// Lists every building within RADIUS m of Dalgård skole's site with how the game draws it now (kind, storeys, wall, roof, which
// record decides it) and the registered address nearest to it (data/dalgard-addresses.json, Kartverket). 1 October 2026.
//   node audit-dalgard-neighbourhood.mjs [radius] [--json]
// The table is the working list for the photo check (docs/dalgard-neighbourhood.md): a building is "checked" when a style
// record in dist/dalgard-neighbourhood.js says what a photo showed.
import fs from 'node:fs';
import {buildingStyles} from './dist/building-details.js';
import {junctionObservations} from './dist/junction-observations.js';
import {neighbourhoodStyles} from './dist/dalgard-neighbourhood.js';
import {kindOf,lookFor,GARAGE_TYPES} from './dist/house-looks.js';

const radius=parseFloat(process.argv[2])||200,asJson=process.argv.includes('--json');
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8'));
const addr=JSON.parse(fs.readFileSync('data/dalgard-addresses.json','utf8')).rows;
const SCHOOL=[635,398,775,518];
const distToSchool=p=>Math.min(...p.map(v=>Math.hypot(Math.max(SCHOOL[0]-v[0],0,v[0]-SCHOOL[2]),Math.max(SCHOOL[1]-v[1],0,v[1]-SCHOOL[3]))));
const area=p=>{let s=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];s+=p[i][0]*q[1]-q[0]*p[i][1];}return Math.abs(s/2);};
const out=[];
for(const b of data.buildings){
 const p=b.p.slice(0,-1);if(p.length<3)continue;const d=distToSchool(p);if(d>radius)continue;
 const cx=p.reduce((s,v)=>s+v[0],0)/p.length,cz=p.reduce((s,v)=>s+v[1],0)/p.length,a=area(p);
 const garageTag=['garage','garages','shed','carport'].includes(b.t.building)||a<35||!!(b.mk&&GARAGE_TYPES.includes(b.mk[0]));
 const kind=kindOf(b.t,a,garageTag,b.mk);
 const style={...buildingStyles[b.id],...(junctionObservations[b.id]||{}),...(neighbourhoodStyles[b.id]||{})};
 const look=lookFor({id:b.id,t:b.t,style,kind,area:a});
 // nearest registered addresses (within 14 m of the footprint centre or of any corner)
 const near=addr.map(r=>[Math.min(Math.hypot(r[1]-cx,r[2]-cz),...p.map(v=>Math.hypot(r[1]-v[0],r[2]-v[1]))),r[0]]).filter(r=>r[0]<14).sort((x,y)=>x[0]-y[0]).slice(0,4).map(r=>r[1]);
 const record=neighbourhoodStyles[b.id]?'N:'+(neighbourhoodStyles[b.id].source||''):junctionObservations[b.id]?'J':buildingStyles[b.id]?'B:'+(buildingStyles[b.id].source||''):'';
 out.push({id:b.id,x:Math.round(cx),z:Math.round(cz),d:Math.round(d),kind,area:Math.round(a),levels:style.levels||parseFloat(b.t['building:levels'])||null,flat:look.flat,wall:look.wall,roof:look.roof,panel:look.panel,addr:near,record,mk:b.mk||null,t:b.t.building});
}
out.sort((x,y)=>x.d-y.d);
if(asJson)console.log(JSON.stringify(out));
else for(const o of out)console.log([o.id,o.x+','+o.z,o.d+'m',o.kind,o.area+'m2',o.levels||'-',o.flat?'flat':'pitched',o.wall,o.roof,o.panel,o.addr.join(' / '),o.record].join('\t'));
