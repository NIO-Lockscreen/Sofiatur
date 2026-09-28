import fs from 'node:fs';
import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync('dist/map.json'));
assert.equal(d.goal,'sofia-kindergarten-gate');
assert.deepEqual(d.nodes[d.goal],[1856,260]);
assert.ok(!d.edges.some(e=>e.path.includes('12248428844')),'Old apartment parking must not remain the goal or a driving choice');
const hallset=d.edges.find(e=>e.from==='91783985'&&e.to==='254465339');
assert.ok(hallset,'Nordre Hallsetveg should be one uninterrupted segment up to Adolf Andreassens veg');
for(const id of ['12248428860','11835520910','267186671','12248428855','12248428840','254465338']){
 assert.ok(hallset.path.includes(id));assert.ok(!d.edges.some(e=>e.from===id),'Small access lane must not cause a decision');
}
const up=d.edges.find(e=>e.from==='254465339'&&e.to==='11253710556');
assert.equal(up.name,'Adolf Andreassens veg');
assert.ok(d.edges.some(e=>e.from===up.to&&e.to===d.goal));
assert.ok(d.roads.some(r=>r.p.some(([x,z])=>x===1834.32&&z===340.99)),'Old driveway remains visible scenery');
assert.ok(d.rails.length>=30);assert.ok(d.rails.some(r=>r.id==='169239018'),'Munkvoll loop is present');
assert.ok(d.stops.some(s=>s.name==='Munkvoll (3)'&&!s.tram));
for(const r of d.rails)for(const p of r.p)assert.ok(p.every(Number.isFinite));
console.log('User-marked east goal, uninterrupted Hallset road, Adolf approach, 31 rail ways, bus/tram stops: OK');
