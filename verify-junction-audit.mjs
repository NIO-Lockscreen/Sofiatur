import fs from 'node:fs';
import assert from 'node:assert/strict';
import {roadWidth} from './dist/transit-geometry.js';
import {fitCircle} from './dist/road-geometry.js';
// Junction audit, 29 September 2026: carriageway widths (road_widths.py) and roundabout islands (map_fixes.ROUNDABOUT_ISLANDS) in dist/map.json.
const data=JSON.parse(fs.readFileSync('dist/map.json','utf8')),byId=new Map(data.roads.map(r=>[String(r.id),r]));

// roadWidth() uses the measured width and keeps the class defaults for roads without one.
assert.equal(roadWidth({type:'residential',width:4.2}),4.2);
assert.equal(roadWidth({type:'residential'}),5.2);assert.equal(roadWidth({type:'tertiary'}),6.5);assert.equal(roadWidth({type:'service'}),3.5);

// Every OSM way the main trip and the detour to Stavset drive on has a measured width (home to the kindergarten; home, Stavset and
// Byåsveien back through the roundabouts at Lysverkvegen and Kystadlia; KIWI, the ice rink and Bunnpris).
const trip={1488489450:'Herlofsons veg',20806746:'Herlofsons veg',19799295:'Per Sivles veg',1469314806:'Per Sivles veg',1469314805:'Per Sivles veg',5058125:'Uglavegen',2330774:'Gamle Oslovei',
 709873316:'Gamle Oslovei',709873318:'General Bangs veg',5058124:'General Bangs veg',176064627:'KIWI ring',18911623:'ring at Arnt Smistads veg',5122253:'Arnt Smistads veg',1214625239:'Selsbakkvegen',93039000:'Selsbakkvegen',
 23496916:'Nordre Hallsetveg',1214632503:'Adolf Andreassens veg',233587697:'Odd Husbys veg',233587696:'Odd Husbys veg',1424849192:'Odd Husbys veg',176064616:'Stavset ring',18939310:'Enromvegen',23500234:'Nedre Stavsetvegen',
 23500238:'Enromvegen',1424849191:'Odd Husbys veg',5048102:'Odd Husbys veg',17863893:'Dalgårdvegen',1368394282:'Dalgårdvegen',23500239:'Byåsveien',22898263:'Kystadbrua',156512394:'Byåsveien',1443998970:'Byåsveien',
 18661699:'Lysverkvegen ring',1443998969:'Byåsveien',22898473:'Byåsveien',1443998976:'Byåsveien',22898628:'Kystadlia ring',1443998972:'Byåsveien',22898627:'Byåsveien',22898259:'Dalgårdbrua',22898260:'Byåsveien'};
for(const [id,name] of Object.entries(trip)){const r=byId.get(id);assert.ok(r,`${name} (${id}) is a road of the map`);assert.ok(r.width>=3&&r.width<=11,`${name} (${id}) has a measured width (${r.width})`);}
// Widths are plausible everywhere; a carriageway beside a splitter island is one lane.
for(const r of data.roads)if(r.width!==undefined)assert.ok(r.width>=2.5&&r.width<=11,`${r.name} ${r.id}: ${r.width} m`);
for(const id of ['709873314','709873316','709873317','709873318','1368394281','1368394282','1443998975','1443998976','1424849189','1424849195'])assert.ok(byId.get(id).width<=4.5,`splitter carriageway ${id}`);
console.log(`Road widths: ${data.roads.filter(r=>r.width!==undefined).length} roads have one, all ${Object.keys(trip).length} ways of the trips included; roadWidth() uses it: OK`);

// The roundabout islands, as the roads are drawn (ring radius - half the width - the 0.7 m kerb band), are the measured grass islands.
const measured={176064627:12,18911623:10,176064616:22,18661699:10.3,22898628:10,176064583:6,727900565:7.4,727900566:13.4};
let spread=0,radiusError=0,centreOffset=0;
for(const [id,island] of Object.entries(measured)){
 // 30 September 2026: the ring is a true circle (least squares, not the centroid of its unevenly spaced nodes), every node on it, and the island the street details draw is centred on it.
 const road=byId.get(id),ring=road.p.slice(0,-1),{cx,cz,R}=fitCircle(ring),dist=ring.map(p=>Math.hypot(p[0]-cx,p[1]-cz));
 spread=Math.max(spread,Math.max(...dist)-Math.min(...dist));
 const drawn=2*(R-roadWidth(road)/2-.7);
 assert.ok(Math.abs(drawn-island)<.3,`Roundabout ${id} at (${cx.toFixed(0)}, ${cz.toFixed(0)}): island ${drawn.toFixed(1)} m, measured ${island} m`);
 radiusError=Math.max(radiusError,Math.abs(R-(island/2+.7+roadWidth(road)/2)));
 const st=data.street.roundabouts.find(q=>Math.hypot(q.p[0]-cx,q.p[1]-cz)<6);assert.ok(st,`Roundabout ${id} has its island in the street details`);centreOffset=Math.max(centreOffset,Math.hypot(st.p[0]-cx,st.p[1]-cz));
 assert.equal(st.r,id,'the island belongs to the ring way (the same on every run)');}
assert.ok(spread<.05,`ring nodes on one circle (spread ${(spread*100).toFixed(1)} cm; the OSM rings at Stabells veg and Stavset were 30 and 38 cm out)`);
assert.ok(radiusError<.03,`ring radius = island/2 + kerb band + half the width (${(radiusError*100).toFixed(1)} cm)`);
assert.ok(centreOffset<.05,`island centre = ring centre (${(centreOffset*100).toFixed(1)} cm)`);
console.log(`Roundabout islands: 8 rings, drawn island within 0.3 m of the measured grass island, nodes on one circle to ${(spread*100).toFixed(1)} cm, radius to ${(radiusError*100).toFixed(1)} cm, island centred to ${(centreOffset*100).toFixed(1)} cm: OK`);
