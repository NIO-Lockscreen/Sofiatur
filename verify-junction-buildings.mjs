import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './dist/vendor/three.js';
import {addBuildingRoof} from './dist/building-roofs.js';
import {createJunctionBuildings} from './dist/junction-buildings.js';
import {junctionObservations} from './dist/junction-observations.js';
const data=JSON.parse(fs.readFileSync('dist/map.json')),j=createJunctionBuildings(data);
// 164 junctions in the original box (with Ludvig's driveway at Bøckmans veg 102 since 2 October 2026), 54 more on the way south to Stavset (map_fixes.SOUTH).
assert.equal(j.nodes.filter(n=>n.p[1]<730).length,164);assert.equal(j.nodes.length,218);assert.ok(j.near.size>1100);
for(const id of Object.keys(junctionObservations))assert.ok(data.buildings.some(b=>b.id===id),'Reference building exists '+id);
// Every style sourced from a listing is documented with the photos used (older entries carry a photo label instead of a URL).
const matches=JSON.parse(fs.readFileSync('docs/junction-photo-matches.json'));
for(const [id,s] of Object.entries(junctionObservations))if(s.source.startsWith('http'))assert.ok(matches.some(m=>m.id.includes(id)&&m.source===s.source&&m.photos.length),'Documented photo match '+id);
for(const shape of ['gabled','hipped','skillion','flat'])for(const p of [[[-8,-4],[8,-4],[8,4],[-8,4]],[[-8,-4],[8,-4],[8,0],[0,0],[0,4],[-8,4]]]){
 const triangles=[],tri=(b,a,c,d)=>triangles.push([a,c,d]),quad=()=>{},polygonArea=Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2);
 const top=addBuildingRoof({T,p,cx:0,cz:0,y:100,h:6,style:{roofShape:shape,roofRise:3},t:{},area:polygonArea,b:{},tri,quad,colour:'#fff',roofcolour:'#555'});
 const area=triangles.reduce((sum,[a,b,c])=>sum+Math.abs((b[0]-a[0])*(c[2]-a[2])-(c[0]-a[0])*(b[2]-a[2]))/2,0);
 assert.ok(Math.abs(area-polygonArea)<.001,shape+' roof seals full footprint without overlapping planes');
 for(const triangle of triangles)for(const vertex of triangle){assert.ok(vertex.every(Number.isFinite));assert.ok(vertex[1]>=106&&vertex[1]<=109.001);}
 if(shape==='hipped'&&p.length===4)for(const v of p)assert.equal(top(v),106);
}
console.log(`Junction scenery: ${j.nodes.length} locations, ${j.near.size} nearby footprints; ${Object.keys(junctionObservations).length} photo matches; sealed gabled/hipped/skillion/flat roofs.`);
