# Street details: OSM tags used and what is approximate

Local coordinates: metres east (x) and south (z) of home (see `prepare-map.py`). `add-street-details.py` reads
`byasen.osm` (OSM API, 24 and 28 September 2026, © OpenStreetMap contributors, ODbL) and adds the key `street` to
`dist/map.json`; `dist/street-details.js` draws it. Only what lies in the map region (the original box plus
`map_fixes.SOUTH`) is kept, and everything on a road only if that road is drawn. Nothing here is surveyed on site:
positions are OSM's, shapes and dimensions are visual estimates of Norwegian practice, not taken from a standard.

## What is read, and how

**Crossings** (`street.crossings`, 65). Ways `highway=footway|cycleway|path` with `footway=crossing`, `cycleway=crossing`
or a `crossing` tag, cut against the drawn roads where they meet them, plus `highway=crossing` nodes on drawn roads. Each
becomes a position, the direction across the road (perpendicular to the road segment there, not the skew of the
footway) and `z`. Marking is read from `crossing` and `crossing:markings`: `zebra`, `marked` and `crossing:markings=zebra|yes`
are zebra, drawn as 0.5 m stripes with 0.5 m gaps, 3 m along the road, side by side across the carriageway. 63 crossings
are zebra. A crossing at traffic signals without zebra markings (`crossing=traffic_signals`) gets two lines instead (2).
`crossing=unmarked|informal`, `crossing:markings=no` and a bare `highway=crossing` are left out: 59 places are mapped
but nothing is painted. Approximate: 18 zebra crossings rest on `crossing=uncontrolled` with no `crossing:markings`, which
is the older tagging for a marked crossing without signals; if OSM means an unmarked one there, the stripes are wrong.
A footway and a cycleway side by side, or a node on a way, give one crossing (within 3.5 m). Blue gangfelt signs stand
on both sides, facing the traffic they are for.

**Give way and stop** (`give_way`, 11 from OSM, `stop`, 0). `highway=give_way|stop` nodes on drawn roads, with the
direction of the traffic that gives way: `direction=forward|backward` if tagged; otherwise the direction towards the
nearest junction on the same way within 60 m, or into the end of the way. A node at the junction itself is moved 5 m
back along its way. Drawn as a row of white haitenner across the right-hand lane (a stop line for `stop`) and a
vikeplikt sign. Not OSM: every arm that enters one of the 8 roundabouts (22 arms, `o: "roundabout"`) also gets haitenner,
because OSM maps only a few of them and a Norwegian roundabout is always entered giving way; they lie on the arm just
before the circle (half a road plus 1.6 m from its centre line), and are left out where a mapped point is within 12 m.
An arm that is a one-way lane (the entry beside a splitter island, `ow: 1`) is given way across its whole width; a two-way road in its right-hand lane (30 September 2026).

**Traffic signals** (`traffic_signals`, 1 node, 4 legs). The Palermo junction (`highway=traffic_signals`, node 91783986).
A stop line 7.5 m out on every road that leads into it. The signals themselves are `dist/traffic-lights.js`.

**Traffic islands** (`islands`, 15 ways in the region give 14 drawn pieces). `area:highway=traffic_island` polygons,
`surface=paving_stones|cobblestone` gives paving, otherwise grass. Raised about 0.12 m (estimate) with a light kerb
wall and a 0.25 m rim. The car drives along the road centre lines, and OSM's islands lie beside them, or half over them
(the arms of the roundabout at Byåsveien / Arnt Smistads veg, where the road is one two-way way through the island):
a raised island is cut back to 1.2 m from every centre line, and cut through where a zebra crossing runs over it, like the
pedestrian gap in the real island. Where that leaves under half of it, the island is drawn flush instead (`f: 1`, 5 of
the 14): white outline and 45° hatching, which the car can drive over. Approximate: the half-plane cuts are right for these
long thin islands, but they are not exact polygon differences. Island `w1364525018` is too small once cut and is left out.
`traffic_calming=island` (one node, the refuge at a crossing on Odd Husbys veg) is not drawn: the car would drive through it.

**Roundabouts** (`roundabouts`, 8). Not OSM: OSM has no polygon for the middle of a circle. The ring is the game's
roundabout edges (`edges[].roundabout`); centre and `rad` = the least-squares circle through its nodes (30 September 2026; the
bounding box was off by up to half a metre when the nodes are unevenly spaced), `r` = the ring's own OSM way.
The island is a grass-topped, kerbed disc of radius `rad` - half the road - 0.7 m kerb band - 0.25 m, raised 0.12 m over
the road (its rim has a point every 0.8 m, at least 48: it was a 12 to 17-gon), and kept free of trees.

**Turning circles** (`turning_circles`, 15 of 19 nodes). `highway=turning_circle` at the end of a drawn way (the others
lie on ways left out of the game or in the middle of a way). OSM puts the node in the middle of the turning area, so the
disc is centred there: radius 8.5 m, or 1.5 m short of the nearest building, at least 5.5 m (`rad`). Level with the road end
(`roadTop` there) and parallel to the terrain, with a light kerb band round it, like the road's.

**Speed tables and humps** (`tables`, 23 tables and 7 humps). `traffic_calming=table|hump|bump` on nodes within 5 m of a
drawn road, and on the two crossing ways tagged `traffic_calming=table` (a raised crossing). A table is a 6 m long band
(3 m flat, 1.5 m ramps) raised 0.09 m, a hump 3.6 m and 0.08 m (all estimates). The car does not bump; the road under it is
unchanged, and the stripes of a crossing on a table follow its ramps. White triangles point at the drivers on both ramps,
except on a table that carries a crossing. Not drawn: `traffic_calming=bump` on whole street ways (Uglavegen; a property of
the street, not a place), and the four `rumble_strip` nodes, which lie on roads left out of the game.

**Sidewalks and gang- og sykkelvei** (`paths`, 99 sidewalks and 123 cycleways, 29.4 km mapped, 27.4 km drawn).
`footway=sidewalk` ways (55), `highway=cycleway` ways, and 44 plain `highway=footway` ways at least 8 m long that run
within 9 m of a drawn road for at least 60 % of their length (sidewalks nobody tagged as such). Crossing ways are crossings
(above); bridges and tunnels are not modelled. Sidewalks are 2.2 m of light paving, cycleways 3 m of asphalt; a `surface`
other than asphalt gives a gravel, paving or dirt colour. They lie on the ground (`height`) with a lift of 0.22 and
0.24 m, so they stand about level with the road's kerb band. Because OSM maps them 1-3 m from the centre line (closer than
the drawn road is wide), they are fitted: pushed out to half the carriageway + the 0.7 m kerb band + 0.4 m + half their
own width, and cut where they run over a carriageway (a crossing or a junction mouth). At least 0.2 m of ground is left
between the kerb band and a path. Trees keep 1.5 m from their edge.

**Street lamps** (`lamps`, 118). `highway=street_lamp` nodes. Only where OSM has them, and OSM's coverage is uneven, so not
every street has lamps. A slim grey pole, 7.6 m (estimate), with a 2 m arm over the nearest road within 16 m and a lamp head
with a pale underside, or a lamp head on the pole beside a car park or a path. A lamp OSM puts on a carriageway or its kerb
stands on the verge (half a road + 0.7 m + 0.4 m from the centre line).

## Drawing

Everything on a road stands on `roadTop(x, z)` (markings 6 cm above it, over the 4 cm centre-line dashes) and
everything beside it on `height(x, z)`, so the road surface can be rewritten without touching this. Everything goes into the
world's chunk buckets, so it adds no draw calls. Colours are the existing road grey and kerb colours plus white
(`#f1f1e8`), the blue and red of the signs and light grey paving.

## Budget

Headless Chromium with SwiftShader WebGL (the measurement used in the earlier sections), before and after this work: triangles 1,689,112 -> 1,703,435 (+0.85 %);
building the world 3.4-3.7 s in both, within the noise of a shared machine. The module draws about 20,600 triangles
(1.2 %) and takes 0.12-0.16 s of the 3.4-3.8 s build, about 4 % (`verify-street-details.mjs` keeps both under 8 %). The rest of the difference is the forest:
trees keep off the paths and the roundabout islands, and the seeded loop that plants them draws random numbers only for trees
that pass `clear()`, so blocking places shifts every tree after them. The forest has the same density and looks different from
before, everywhere on the map. The street data adds 61 kB to a 1.69 MB `map.json`.

## Not done

Stop signs (none in the region), rumble strips, kerb ramps and tactile paving at crossings, bus-stop platforms, fences and
walls along sidewalks, road names on signs, painted cycle symbols, and lamps where OSM has none.
