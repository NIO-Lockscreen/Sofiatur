# Roundabouts · 30 September 2026

All eight roundabouts of the map were looked at one by one, in the real renderer and against the Esri aerial photo, because some looked
crooked (skjeive). The aerial photo is for viewing only and is not in the repository, nor are the images made from it; the street network
and the carriageway widths are OpenStreetMap (ODbL) and Statens vegvesen NVDB (NLOD), as in `docs/junction-audit.md`.

| Roundabout | Local position (x east, z south, m) | OSM ring way |
| --- | --- | --- |
| Munkvoll (Byåsveien / Bøckmans veg) | 1503, 153 | 176064583 |
| Byåsveien by Midelfarts veg | 1502, -215 | 727900565 |
| Byåsveien by Stabells veg | 1547, -479 | 727900566 |
| Byåsveien by Arnt Smistads veg | 1339, 324 | 18911623 |
| KIWI Dalgård | 660, 281 | 176064627 |
| Kystadlia | 984, 1014 | 22898628 |
| Lysverkvegen | 564, 1262 | 18661699 |
| Stavset | 84, 1328 | 176064616 |

## Method

For each roundabout: a top-down view of 90 m (north up), a driver's view from every entry (the car 25 m before the ring on the approach,
facing it, chase camera: 30 views), and the aerial photo of the same 90 m at the same scale; then numbers from the drawn surface
(`createRoadSurface`, the same triangles the game draws and the car rides on): the circle through the ring (least squares), the spread of the
nodes round it, how flat the drawn asphalt is, how the flat-shaded triangles of the ring lie against one another, the island against the
measured one, and the angle at which each lane meets the ring.

**A note on the top-down view.** The recipe `[x - 0.01, H, z + 0.01, x, 0, z]` (toolkit README) does not give a north-up picture: with those
offsets the camera's up vector resolves to north-east, so the picture is turned 45° and cannot be laid beside the aerial photo. These
images use `[x, H, z + 0.01, x, 0, z]`, which is north up. (The first comparisons of this work were made with the turned recipe, and the
arm directions looked wrong until that was found.)

## The analysis

Every ring in the OSM data is a circle to within 0.4 m (six within 2 cm: the mapper drew them with a circle tool), the arms leave the ring
where the real roads do, and the islands are the measured ones: what looked crooked was the way the road surface was built round a circle.
Verdicts: *before* = what the game showed, *after* = now.

| Roundabout | Ring, island, centre against the aerial | Lanes: angle to the radial, place, splitter islands | What looked crooked | Before | After |
| --- | --- | --- | --- | --- | --- |
| **Munkvoll** | Ring R 7.55 m, 7.7 m wide (NVDB). Island drawn 6.0 m; on the aerial the grass is 4-4.5 m inside a paved apron (about 9 m across), so the drawn island, grass and kerb, is about 1.5 m large. Centre within 0.3 m of the island's. | 6 road ends, 32-51° off radial, on the aerial roads. The two lanes of the north pair meet the ring 5.4 m apart: the island between them is a narrow nose. Splitter islands are where the aerial has them. | Spokes on the ring (triangle normals 12° rms, up to 43° apart, ring 15 cm rms and 31 cm worst from its plane), kinked kerb at all six mouths, lanes ending in a flat cut, dashes on the ring, 12-sided island rim. | fix | good |
| **Byåsveien by Midelfarts veg** | Ring R 7.6 m, 6.4 m wide. Island 7.4 m, aerial 7.2 m. Centre within 0.3 m. | 7 road ends: two lane pairs (north, south) 36-55° off radial, and three two-way roads (Midelfarts veg, Vegmesterstien, Munkvollvegen) 2-17° off radial. Zebra crossings lie where the aerial has them. | Spokes (11° rms, 29° worst), patches over the ring at seven nodes, kinks. | fix | good |
| **Byåsveien by Stabells veg** | Ring R 11.15 m, 7.5 m wide. Island 13.4 m, aerial 12.7 m. Centre within 0.5 m (eye). | 4 two-way roads, 1-6° off radial: radial, as on the aerial. | The only ring that was not round: its OSM nodes lay 0.30 m in and out of the circle (egg shape); spokes (8° rms, 29° worst); wide 9 m arms ended in flat cuts. | fix | good |
| **Byåsveien by Arnt Smistads veg** | Ring R 9.85 m, 8.3 m wide. Island 10.0 m, aerial grass 8.5-9 m plus kerb. Centre within 0.3 m. | 4 two-way roads, 2-19° off radial, as on the aerial. | Spokes (9° rms, 27° worst), kinked patches. The arms' islands are small painted (flush) slivers from OSM, 1.5-3.3 m² each; the aerial has kerbed splitter islands about 12 m long (open). | fix | good (islands open) |
| **KIWI Dalgård** | Ring R 9.95 m, 6.5 m wide. Island 12.0 m, aerial 12.0 m; centre within 0.3 m. | 6 one-way lane ends (three pairs), 35-73° off radial: the roads do run onto a wide paved apron at a slant (the road to General Bangs veg leaves at 73°); on the aerial. Splitter islands as the aerial (NVDB `Kanalisert veg`). | Spokes (11.6° rms; a folded quad 90° off), patches with kinks and a notch in the east kerb, the lanes' flat cuts. | fix | good (apron not drawn) |
| **Kystadlia** | Ring R 9.2 m, 7.0 m wide (NVDB 7.8, held at 7.0, see `road_widths.py`). Island 10.0 m, aerial 10 m. Centre within 0.3 m. | 6 lane ends, 33-57° off radial; the south lanes leave 75° apart round a large island. | The worst: the ring stands on a 21 % slope and was a level strip round it (plane residual 14 cm rms, 29 cm worst; triangle normals 14° rms, a fold of 90°): the strongest spokes. | fix | good |
| **Lysverkvegen** | Ring R 9.95 m, 8.2 m wide. Island 10.3 m, aerial 10.3 m. Centre within 0.3 m. | 4 roads: the west and east lane pairs (23-49° off radial) with long splitter islands as on the aerial, Lysverkvegen (north-west) and Rittmestervegen (south) 4-9° off radial. | Spokes (9.5° rms, 28° worst), kinked patches at six nodes. | fix | good |
| **Stavset** | Ring R 15.8 m, 8.2 m wide (the outer edge of the paved ring matches the aerial to the metre). Island 22.0 m, aerial 21 m. Centre within 0.6 m. | 8 lane ends, 20-62° off radial; four splitter islands as on the aerial. | The ring was 0.38 m out of round (egg), a folded quad 90° off, spokes (10.7° rms). | fix | good |

## The numbers

Before in brackets. `spread` is the largest minus the smallest distance of the ring's nodes from the least-squares circle; `plane` is the
centre line of the ring against its best plane (rms / worst, m); `normals` are the angles between the ring's flat-shaded asphalt triangles
and their mean (rms / worst, degrees: the spokes). The drawn asphalt of every ring now lies exactly in its plane (0.00 mm over 2 312
quad corners), so its normals are one direction. The centre line the car's line is made from is a 2 m station sampling of that plane
(the figures here, up to 4.7 cm: chord against arc on a slope).

| Roundabout | Radius (m) | Node spread (m) | Island drawn / measured (m) | Island centre off ring centre (m) | Centre line against plane (m) | Normals (°) |
| --- | --- | --- | --- | --- | --- | --- |
| Munkvoll | 7.55 | 0.012 (0.011) | 6.00 / 6.0 | 0.01 (0.10) | 0.035 / 0.044 (0.151 / 0.307) | 0 / 0 (12.1 / 43.4) |
| Midelfarts veg | 7.60 | 0.009 (0.012) | 7.40 / 7.4 | 0.00 (0.02) | 0.003 / 0.006 (0.074 / 0.177) | 0 / 0 (11.3 / 28.9) |
| Stabells veg | 11.15 | 0.012 (0.298) | 13.39 / 13.4 | 0.00 (0.06) | 0.018 / 0.020 (0.029 / 0.059) | 0 / 0 (8.2 / 28.8) |
| Arnt Smistads veg | 9.85 | 0.010 (0.012) | 9.99 / 10.0 | 0.01 (0.04) | 0.024 / 0.028 (0.040 / 0.084) | 0 / 0 (9.2 / 26.9) |
| KIWI Dalgård | 9.95 | 0.009 (0.011) | 11.99 / 12.0 | 0.00 (0.07) | 0.008 / 0.011 (0.098 / 0.240) | 0 / 0 (11.6 / 90) |
| Kystadlia | 9.20 | 0.010 (0.013) | 10.00 / 10.0 | 0.00 (0.03) | 0.039 / 0.047 (0.141 / 0.291) | 0 / 0 (13.9 / 90) |
| Lysverkvegen | 9.95 | 0.010 (0.015) | 10.30 / 10.3 | 0.00 (0.02) | 0.012 / 0.014 (0.070 / 0.138) | 0 / 0 (9.5 / 27.7) |
| Stavset | 15.80 | 0.008 (0.377) | 21.99 / 22.0 | 0.00 (0.05) | 0.002 / 0.004 (0.048 / 0.097) | 0 / 0 (10.7 / 90) |

(The node spread after is the 1 cm that `map.json` keeps in its coordinates. The island centre is the centre the street details draw the
island on, against the circle's centre.) The ring planes tilt 5-21 % (Kystadlia the steepest, 11° from level).

Lane angles and places: the arms were checked against the aerial (the map's road centre lines laid on it) and are where the real roads are,
to about 10° and 1 m, which is what the photo allows; they were not moved. The data fit moves the 149 ring nodes by at most 0.32 m (7 cm on average, along the radius)
and keeps each node's angle; nodes and edges are the same (2,484 and 813), so every lane's bearing changes by under 1° and the exit order, arrows and choices are unchanged: all 30
entrances give the same labels as before (`verify-roundabouts.mjs`, and the labels of every entrance compared before and after).

## What was changed

**Data** (`map_fixes.py`, `prepare-map.py`, `add-street-details.py`; rebuild order as before, `prepare-map.py` first, `add-street-details.py` last).
`fit_roundabouts` fits the ring as a circle by least squares (`fit_circle`: the node centroid is pulled up to 0.5 m off the centre by the
uneven spacing, the bounding box too), scales the radius to the measured island as before, and puts every ring node on the circle at its
own angle. The street details take the same circle for the island and the give-way points (they used the bounding box and a road found by
a nondeterministic nearest-road search: the island at Stabells veg took its width from Byåsveien one run and from the ring the next). One-way
roads and rings get no centre-line dashes (`mark`); the splitter lanes and the rings used to have dashes down the middle.

**Road geometry** (`dist/road-geometry.js`, the shared code, kept small):
- no junction patch where a lane meets a ring. A patch is a straight strip round the node, and a straight strip cannot follow a circle of 7
  to 16 m: it bulged and kinked at every arm. The ring is one closed ribbon, each lane ends square at the ring's outer edge (`arm.t`: where
  both its corners are outside the circle), and `mouth()` in `road-surface.js` draws the rest;
- each ring lies in one plane, the best fit through the smoothed ground under it, and the lanes' levels at the ring (node and cut) are taken
  from it. A ribbon that is level across, round a circle on a slope, is a twisted strip (a quad whose halves tilt differently), and the flat
  shading showed that as spokes;
- `fitCircle` is exported; `geometry.rings` lists centre, radius and plane of each ring.

**Road surface** (`dist/road-surface.js`): the ring ribbon takes its plane (tilted across, flat in each quad) and its two ends meet with
one cross-section; the island rim and the kerb band lie in the plane; no dashes on rings. `mouth()`: rows of quads in the ring's plane carry
a lane's width to the ring, and a curb return on each side, an arc tangent to the lane's edge and to the ring's outer circle (radius up to
5 m, less where the splitter island beside it would be narrower than 2.4 m between its kerb bands), flares the entry or the exit. Lanes tilt
into the ring's plane over their last 4 m with the mechanism that already tilted lanes into steep junction corners. Also fixed in the
shared code: a ribbon's kerb under-layer (9 cm lower, wider than the asphalt) is now split on the same diagonal as its asphalt and follows
the asphalt's tilt out to its edges; before, a strongly tilted lane showed its kerb through the asphalt in pale slabs.

**Street details** (`dist/street-details.js`): the island rim has a point every 0.8 m (48 at least) instead of 12 to 17; a one-way entry is
given way across its whole width, a two-way arm in its right lane.

**Game** (`dist/game.js`): `roundaboutLabels` measures the bearings from the least-squares centre of the ring (`circleCentre`) instead of the
node centroid. No label changes.

**Tests.** `verify-road-geometry.mjs` (item 14): rings round to 10 cm, island centre = ring centre, the ring's asphalt in its plane (flat to
5 mm), island rim in the plane 9 cm down, no kerb band above the asphalt on rings and in lane mouths, no holes at the mouths, no spokes
(normals within 2°); the cross-slope test (item 4) leaves the rings out, since they tilt across. `verify-junction-audit.mjs`: nodes on one
circle to 5 cm, radius to 3 cm of island/2 + kerb + half the width, island centred to 5 cm, the island belongs to the ring way.

**Budget.** Triangles 1,859,907 -> 1,863,779 (+0.21 %). World build time (headless Chromium, three loads each): 3.3-5.0 s before (mean 3.8 s), 2.9-3.9 s after
(mean 3.4 s): no measurable change (the runs differ by about 5 %). `verify-street-details.mjs` budget: street details +1.69 % triangles, 85 ms to draw.

## Open points

- **Aprons.** Munkvoll, KIWI and Arnt Smistads veg have mountable aprons round the island on the aerial that are not drawn (the island is
  drawn as measured, grass and kerb; at Munkvoll the grass itself is about 4-4.5 m against the drawn 6.0).
- **Painted slivers at Arnt Smistads veg and Stabells veg.** The arms are one two-way way through the splitter island, so the islands are
  small hatched (flush) shapes from OSM; real kerbed splitter islands about 12 m long would need the two directions drawn apart.
- **Kystadlia width.** NVDB gives the ring 7.8 m, the game 7.0 (`road_widths.py`): with 7.8 the old patches overlapped the steep approach.
  That reason is gone with the patches; raising it would move the ring's outer edge 0.4 m and was left for a measurement.
- **Aerial shift.** The aerial photo lies about 1.3 m south-east of OSM (`docs/junction-audit.md`); the centres here were compared by eye
  (about 0.3 m) with that in mind.
- **Lane pairs whose nodes are 3-6 m apart on the ring** (north pair at Munkvoll, KIWI, Lysverkvegen, Kystadlia) have a nose of a metre or
  two at the ring; the real splitter islands are wider there. The nodes are where OSM has them.
