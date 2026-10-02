# Roadside: fences, walls, barriers, driveways, trees and furniture beside the roads

30 September 2026. `add-roadside.py` reads open data and adds one key, `roadside`, to `dist/map.json`; `dist/roadside.js` and
`dist/trees.js` draw it. Local coordinates are metres east (x) and south (z) of home (see `prepare-map.py`). Nothing here is
surveyed on site: positions are the sources', shapes and sizes are visual estimates, and what comes from no source at all is said
so below.

## Sources and licences

| Source | What | Licence | Where in the repository |
|---|---|---|---|
| OpenStreetMap, `byasen.osm` (24 and 28 September 2026) | barriers, driveways, paths, trees, wood and scrub areas, benches, bins, masts, pylons, car parks | ODbL, © OpenStreetMap contributors | read by `add-roadside.py` (the extract is not committed) |
| Statens vegvesen, Nasjonal vegdatabank NVDB (`nvdbapiles.atlas.vegvesen.no`, fetched 30 September 2026) | Skjerm (noise screens), Rekkverk (guard rails), Gjerde (fences), Støttekonstruksjon (retaining walls), Trær, Busker, Utemøbler, Renovasjon, Sykkelparkering, Avkjørsel | NLOD 2.0 | `fetch-nvdb.py` writes `nvdb-roadside.json` (EPSG:5973 converted to local metres), committed so the map can be rebuilt offline |
| NIBIO AR5 (`wms.nibio.no/cgi-bin/ar5`, layer Treslag, fetched 30 September 2026) | where there is forest, and whether it is coniferous, deciduous or mixed | NLOD / CC BY 4.0 | `fetch-ar5.py` writes `ar5-skog.json` (5 m cells), committed |

The aerial photo (Esri) was only looked at, to compare; nothing was traced from it. The AR5 layer is a thematic map, not a photograph: the
script asks the WMS for the layer as a picture and reads the class from the exact colour of the layer's legend, then samples it into cells.
Statens vegvesen's road images (Vegbilder) cover county roads only: the WFS has no image within 100 m of the Gamle Oslovei junction
for 2022-2025, so the fences there could not be checked against a photo.

## What the sources have, and how many were used

Counted in the map region (the original box, `map_fixes.SOUTH` and `WEST`) and beside a drawn road. Numbers from `add-roadside.py`.

**Barriers** (618 lines, 25.7 km): OSM 356 lines, NVDB 262 pieces.
- fence 255: picket (paling, wood) 118, mesh (chain link, net) 42, rail (bars, railings, steel, pipe) 61, glass 19, wire 9, board 6
- hedge 69 (OSM `barrier=hedge`, 1.7 km)
- wall 10 and retaining wall 165 (OSM `retaining_wall` 19, NVDB Støttekonstruksjon 159 objects, of which 6 are an OSM line too; NVDB gives the visible height and the material)
- noise barrier 77 (OSM `wall=noise_barrier` 30, NVDB Skjerm 95, 27 of which are the same as an OSM line; 5.1 km)
- guard rail 42 (OSM 2, NVDB Rekkverk, 1 of them the same as OSM: steel beam or steel tube on timber or steel posts; bridge railings are left to the bridges)

Where NVDB and OSM have the same object (an NVDB line within 3.5 m of an OSM line of the same family) the OSM line is kept and takes
NVDB's height, material and colour; only the stretches NVDB has and OSM has not are added. 34 OSM noise barriers, 2 guard rails, 3
fences and 3 retaining walls took NVDB's values. The OSM noise barriers and guard rails agree with NVDB to a median 0.18 m and 0.07 m,
which means OSM took them from NVDB: they are one source, not two. Garden fences and hedges are OSM only.

**Ways that were not drawn** (762 lines, 45 km): footway 303, path 177, driveway 121, service road 88, steps 34, car park aisle 16,
track 14, pedestrian street 9. OSM has 400 `service=driveway` ways; 250 of them were already roads of the map (they are in `data.roads`),
the rest were missing. Sidewalks and cycleways are drawn by the street details, crossings, bridges and tunnels are left to the others.

**Trees** (891 individually mapped): OSM `natural=tree` 665 (species on 24, `leaf_type` on 172), `tree_row` 80 trees (6 rows), NVDB Trær 146
(species, height; rowan, lime, Norway maple, downy birch, larch, willow). Wood and forest areas: OSM 29 (35 ha, 17 ways and 14
multipolygon relations), scrub 53 areas, NVDB shrub fields 54. AR5: 245 ha of forest in the box round the map (124 ha coniferous, 71 ha
deciduous, 50 ha mixed), 191 ha of it within 330 m of a drawn road or a house, which is what is kept.

**Furniture** (253): bench 80, bin 49, post box 7, recycling 10, picnic table 16, bicycle stand 43, flagpole 4, communication mast 6 and
lighting mast 19 (Dalgård's floodlights), 8 towers of the power line (6 lattice towers and 2 portals; OSM `power=tower`, NVE; all drawn as lattice towers), playground node 11.
The playgrounds in `data.areas` (56) get their equipment from the area. 47 car parks (3.1 ha) were mapped but not drawn.

**Not used, and why.** NVDB Belysningspunkt (693) and Lysmast (525) are the road authority's lamps: the street details draw the 118 OSM
lamps and the lights belong to someone else; `fetch-nvdb.py` can fetch them (types 87 and 181) if wanted: they are left out of the committed cache to keep it small. NVDB Skiltplate
(signs) have only 5 objects inside the map region (the municipal streets have none), so signs are not drawn. The matrikkel
property boundaries and FKB (Gjerde, Mur, Hekk in the digital map base) need a login to download. Real garden fences and hedges are
mapped only where an OSM contributor has drawn them: most houses have none in the data, and none are invented.

## How it is drawn

- **Everything keeps off the carriageway.** A line is pushed out to half the road + the 0.7 m kerb band + 0.3 m from every drawn centre line
  (the same `fitPath` as the sidewalks) and cut where it runs over a road; what is left over at junctions is cut where the road surface's own
  `heightAt` (with a 0.1 m probe, since the surface has a skirt 0.25 m beyond the kerb band) says it is on the road. Fences and hedges
  leave a gap where a driveway or path comes through.
- **Barriers** are merged into the world's chunks: picket fences 0.5 m boards on posts, glass fences on posts with a panel, mesh (chain-link) fences and rail fences on posts with rails (a mesh fence is posts, a top and a bottom rail and a thin wire pair every 1.5 m, see-through, since 1 October 2026), 
  hedges a trapezoid with an uneven top, noise barriers solid timber (colour from NVDB: red, brown, untreated) with a dark cap, retaining walls stone or
  concrete with a cap, guard rails a steel beam or two pipes on timber or steel posts every 2 m. Height is the OSM or NVDB value, else a
  default by kind.
- **Driveways and paths** are ribbons on the visible ground (`groundTop`), cut at buildings and roads. Steps get a stripe every 0.85 m.
  About 40 % of the driveways longer than 7 m and 2.6 m wide have a parked car at the house end (a seeded choice, not data); car parks that
  were not drawn get a surface, bay lines and cars on about half the bays.
- **Trees.** Five species as instanced low-poly models (spruce, pine, birch, rowan, large broadleaf; 24 to 48 triangles) and shrubs (12), in one
  `InstancedMesh` per species and 320 m chunk, with a size, a width and a tint of their own. They are chunks of the world: the same distance
  and shadow rules. Mapped trees stand where OSM and NVDB put them. Forest: AR5 cells and OSM wood areas, one tree per 80 m² within 35 m of a
  road or house, 190 m² to 80 m, 520 m² to 160 m, 1,400 m² beyond; species by AR5 type (coniferous: 78 % spruce, 7 % pine, 15 % birch;
  deciduous: 55 % birch, 20 % rowan, 15 % broadleaf, 10 % spruce; mixed in between). Scrub and shrub fields: shrubs. Gardens: not from data,
  a seeded 0 to 4 trees round each house (flats 4 to 9, a ring 5 to 24 m out), a seeded tree in about 18 of 100 12 m cells of the unbuilt strips within 45 m of a road outside AR5 forest (banks, verges, ends of plots), and 1 to 3 shrubs by the walls of houses within 45 m of a road. No tree that is placed (not mapped) stands on a
  road, a path or driveway, a pitch, running track, playground, meadow or car park (with a margin of one to two cells), in a building or in water, and a crown may reach at most 0.4 m over the edge of a road
  (so the car never meets one; street trees are narrower still). Every choice is a hash of the position, so the same trees grow on every run.
- **Power line:** the pylons and the wires between them (three conductors per side, a sag of 3.5 %) from the OSM line.
- The software fallback renderer draws instanced meshes too (each instance within 260 m as a mesh of its own).

## What is approximate

Heights of fences and hedges without a tag are defaults; the pylon, mast and playground models are generic; garden trees, foundation shrubs,
parked cars and playground equipment are plausible fill, not data; tree positions in AR5 forest are random within the class; AR5 and OSM
woods are years old; where OSM and NVDB differ by a metre or two the OSM line is drawn. NVDB gives the *visible* height of a retaining wall:
the game draws it standing on the smoothed ground, so a wall that holds back a bank in reality stands free here.

## Numbers (30 September 2026, headless Chromium with SwiftShader)

- Drawn trees 17,837 in the test, 17,729 in the game (its house bounds also cover the landmarks): mapped 720, forest 7,436 (AR5 and OSM woods), scrub 776, NVDB shrub fields 59, garden 4,646, unbuilt strips by the roads 1,755, shrubs by house walls 2,445.
  The 3 random loops before drew 10,479 trees (6,304 cones and 4,175 round ones, 297,500 triangles).
- Triangles of the whole scene, instances counted: 1,898,764 before, 2,224,235 now (+17.1 %); merged 128,000 (barriers 67,000, driveways and paths 27,000, furniture
  18,000, cars and car parks 15,000) and 499,000 in instances. The toolkit's `tris()` counts an instanced mesh once: 1,859,907 before, 1,706,124 now.
- Building the world, main-thread CPU time (CDP `ThreadTime`, alternating runs): 2,755 ms before and 2,803 ms now (median of five, +1.7 %; minimum to minimum +7.7 %).
  `addRoadside` takes 0.6 to 1.0 s of it; the old trees took about 1 s.
- Draw calls per frame at chase height (renderer.info): 59 to 150 at the junction, 62 to 144 at Dalgård, 28 to 52 at Lianvannet; triangles per frame +28 %, +14 %, +33 %.
- `dist/map.json` grows by 316 kB (barriers 79 kB, ways 100 kB, AR5 57 kB, trees and areas 70 kB).

## Tests

`node verify-roadside.mjs`: counts by kind; that the fences at Gamle Oslovei / Uglavegen are drawn (the red timber noise barrier 1.0 m, the
steel pipe guard rail, the 1.7 m untreated screen north of the junction, retaining walls); that nothing (barrier samples every 0.5 m, ways,
furniture, the corners of parked cars, every tree) is on the road surface (`heightAt`), in a building or in a path; crowns at most 0.4 m
over a road edge; the same trees on every run; species and sizes; and the budget (triangles at most 20 % more than before, counting
instances).
