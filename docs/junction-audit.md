# Junction audit · 29 September 2026

Every junction of the main trip (home to the kindergarten, 23 junctions) and of the detour to Stavset, plus the landmarks
named in the brief, was compared with the Esri World Imagery aerial photo (zoom 18, 0.27 m per pixel) and with the Statens
vegvesen road database (NVDB, open data, NLOD). The aerial photos are for viewing only and are not in the repository; the
side-by-side images (aerial | game) are kept outside it.

**Method.** For each junction a north-up crop of about 140 m was stitched from the aerial tiles and set beside a top-down render of
the same square from the real renderer, then the roads that meet, one-way pairs, islands, widths and the choices the game offers
were compared. The choices are the ones the game asks for when the car arrives on the route's road, read from `gameState().choices`
with a VM harness like the one in `verify-dead-ends.mjs` (Blindveier on, the default). NVDB was used as a second, independent
witness for the road network: its car roads (`Enkel bilveg`, `Kanalisert veg`, `Rundkjøring`) were laid over the game's graph.
Result: every public street of the region is in the game's graph, and the game has no street that NVDB lacks, except the
traced kindergarten lane and the parking places the game adds on purpose. One-way status agrees on every NVDB one-way
segment that lies on a road of the game (81 of them; the only exception is the small oval at Anders Wigens veg, see below).

**The aerial is shifted about 1.3 m south-east of OSM** everywhere (the eight roundabout islands all lie 0.3-1.3 m east and 0.1-1.7 m
south of their ring centres), so overlays look slightly off; positions in this file are OSM/game positions.

**Two positions in the brief are not what the coordinates say.** The Palermo traffic lights (Bøckmans veg / Selsbakkvegen, node
91783986) are at (1573, 144), not (1640, 470); (1665, 464) and (1632, 379) are two Selsbakkvegen junctions on the way north. And
(940, 330) is not a roundabout: it is the double T where Olaf Bulls veg meets Hans Aanruds veg. The big roundabout is the one at
(1339, 324) where General Bangs veg, Arnt Smistads veg and Byåsveien meet.

## What was fixed (data)

| Fix | Where |
| --- | --- |
| Carriageway widths on 191 ways (every road of the trips and the detour, and the streets beside them), `road.width` in `map.json` | `road_widths.py`, `map_fixes.apply_road_widths`, called by `prepare-map.py`; `roadWidth()` in `dist/transit-geometry.js` uses `road.width` when there is one |
| Roundabout rings pulled 1-2.5 m inwards so the island is the measured one (8 rings) | `map_fixes.ROUNDABOUT_ISLANDS`, `map_fixes.fit_roundabouts`, called by `prepare-map.py` |
| One-way carriageways beside splitter islands are one lane wide (4.0-4.5 m) instead of the class default, so the islands between them show | `road_widths.py` |

No street was added, removed or re-connected: the junction topology in the game agreed with OSM and NVDB everywhere it could be
checked (see the open points). New test: `verify-junction-audit.mjs`. `verify-road-height.mjs` is unchanged; it constrained the
Kystadlia ring to 7.0 m (see the comment in `road_widths.py`).

**How the widths were measured.** The aerial shows the whole paved surface (carriageway, sidewalk, verge, parking) without kerb
contrast; at Uglavegen, Gamle Oslovei, General Bangs veg, Arnt Smistads veg and Byåsveien it is 2-5 m wider than the values below and
never narrower, but it cannot give the carriageway by itself. The carriageway widths are therefore NVDB's: "Vegbredde, totalt" for
municipal roads (estimated by the road owner in half-metre steps) and "Vegbredde, beregnet" (computed from the road area, per 100 m)
for Byåsveien (FV6650) and Bøckmans veg (FV6656), averaged along each way. Where the aerial suggested something else it is noted.

| Road | Before (class default) | Now | Note |
| --- | --- | --- | --- |
| Herlofsons veg (gravel) | 5.2 | 4.0 | NVDB KV5880 m389-430 |
| Per Sivles veg west of Uglavegen (gravel) | 5.2 | 3.5 | NVDB 3.0 (estimate); the aerial shows a gravel track of about 3.5 m between verges |
| Uglavegen | 5.2 | 6.0 (5.6 at the far end) | NVDB KV7830; OSM `lanes=2` |
| Gamle Oslovei | 6.5 | 6.5 | NVDB KV2020; halves at the KIWI roundabout 4.0 |
| General Bangs veg | 6.5 | 6.0 | NVDB KV2140; halves at the KIWI roundabout 4.0 |
| Arnt Smistads veg | 6.5 | 6.0 | NVDB KV1068 |
| Selsbakkvegen | 6.5 / 5.2 | 7.0 north, 5.0 south-east | NVDB KV6540 |
| Nordre Hallsetveg / Adolf Andreassens veg | 5.2 | 5.5 / 4.5 | NVDB KV5310 / KV1004 |
| Odd Husbys veg | 6.5 | 6.8 | NVDB KV5410; halves at the roundabouts 4.0 |
| Enromvegen / Nedre Stavsetvegen | 6.5 / 5.2 | 7.0 / 5.0 | NVDB KV1615 / KV5105; Enromvegen's two mouths 4.0 each |
| Dalgårdvegen | 5.2 | 6.2 (6.5 further down) | NVDB KV8733; the two one-way lanes at the island 4.0 each |
| Olav Duuns veg / Granlivegen | 5.2 | 5.5 / 4.5 | NVDB KV5480 / KV2310 |
| Byåsveien | 6.5 | 7.9-9.0 by section | NVDB FV6650 (computed); Kystadbrua 8.2, Dalgårdbrua 7.7; one-way lanes at splitter islands 4.5 |
| Side streets (Ivar Aasens veg 5.5, Kristofer Uppdals veg 4.5, Arne Garborgs veg 5.5, Dalstien 4.4, Olaf Bulls veg 5.5, Ferstadbakken 5.0, Nedre Ferstadveg 4.5, Underhaugsvegen 4.0, Uglahaugstien 4.0, Bøckmans veg 6.1-7.3, ...) | 5.2 | as listed | NVDB, all of `road_widths.py` |
| Roundabout rings: KIWI 6.5, Arnt Smistads 8.3, Stavset 8.2, Lysverkvegen 8.2, Kystadlia 7.0, Munkvoll 7.7, two on Byåsveien 6.4 / 7.5 | 6.5 / 7.5 | as listed | NVDB FV6650 for the ring roads; Kystadlia limited to 7.0 (NVDB 7.8), see `road_widths.py` |

**Roundabout islands** (grass island found by colour in the aerial, checked by eye at 1:60; diameter in metres):

| Roundabout | Game before | Aerial | Game now |
| --- | --- | --- | --- |
| KIWI Dalgård (660, 281) | 15.9 | 12 | 12 |
| General Bangs veg / Arnt Smistads veg / Byåsveien (1339, 324) | 14.9 | 10 | 10 |
| Stavset senter (84, 1328) | 24.3 | 22 | 22 |
| Lysverkvegen (565, 1262) | 15.1 | 10.3 | 10.3 |
| Kystadlia (982, 1015) | 14.9 | 10 | 10 |
| Munkvoll (1501, 153) | 9.9 | 6 | 6 |
| Byåsveien (1503, -215) | 11.9 | 7.4 | 7.4 |
| Byåsveien (1547, -479) | 20.1 | 13.4 | 13.4 |

## Junction by junction

Positions are local metres (x east, z south of home). "Game" is what the car is asked when it arrives on the route's road.
Owner A is the road surface and junction shape work, B the street details from OSM tags (crossings, lamps).

| Junction | The game shows | The aerial shows | Verdict | Fix / owner |
| --- | --- | --- | --- | --- |
| 13644489026 (-25, -12) | T on Herlofsons veg: left (south, to Per Sivles veg), right (north); the start is the third arm | T on a narrow gravel road; private drives west (a loop), north-east and west | Topology right; road drawn too wide (5.2) | Width 4.0, data |
| 206324584 (13, 63) | Bend where Per Sivles veg runs east and west: straight (east), right (west) | Same, hidden under forest | Right; road too wide | Width 3.5, data |
| 206324576 + 254330194 (234, 68) / (239, 59) | One four-way: left Kristofer Uppdals veg, straight Per Sivles veg, right Ivar Aasens veg (two OSM nodes 10 m apart, asked as one) | Two T's 10 m apart: Uppdals and Per Sivles from the north-east meet one node, Ivar Aasens veg and Per Sivles from the west the other | Right; the merge is a fair simplification | Widths 3.5 / 4.5 / 5.5, data; corner shapes: A |
| 206324162 + 11066940226 (326, -32) / (337, -15) | Per Sivles veg meets Uglavegen: left / right Uglavegen; 20 m on, left Per Sivles veg (east, gravel), straight Uglavegen | Same two junctions 20 m apart; Konrad Dahls veg joins 19 m further north-west (not on the route) | Right | Uglavegen 6.0, data |
| 10581501595 (385, 54) | Straight Uglavegen, right Uglavegen (the south-west spur) | T with a residential spur ending in a loop | Right | none |
| 34036663 (438, 98) | Straight Uglavegen, right Arne Garborgs veg | T; Arne Garborgs veg from the south-west | Right | Width 5.5 (Arne Garborgs veg), data |
| 34036661 (525, 117) + 34036660 (559, 122) | Left Ved Ugla skole (school access), straight; then straight, right Nordahl Griegs veg (20 m on it forks: Uglahaugstien, destination only) | Two T's 34 m apart; the school road is a paved service road; Nordahl Griegs veg forks | Right | none |
| 34036706 (712, -50) | Left / right Gamle Oslovei | Uglavegen joins Gamle Oslovei in a Y with a small triangular island between the two roads | Topology right | Island drawing: A |
| 35682669 (674, 243) | Straight Gamle Oslovei, right Uglahaugstien | T; Uglahaugstien is narrow (NVDB KV7810, 4.0) | Right | Width 4.0, data |
| KIWI roundabout (660, 281) | Entered at a slant: #1 Odd Husbys veg "rett frem", #2 General Bangs veg "venstre", #3 Gamle Oslovei "snu"; each arm is a pair of one-way lanes | Compact ring with a 12 m island and a paved apron; the three arms have splitter islands (NVDB: `Kanalisert veg`); Anders Wigens veg ends at the flats' car park and is not connected | Topology and one-way pairs right; island drawn 16 m instead of 12 m; the pairs were drawn 6.5 m each, so their islands vanished | Island and halves 4.0, data (fixed); apron ring, arm flares, crossings: A / B |
| 6673481580 KIWI entrance (769, 193) | Straight General Bangs veg, right KIWI | An open entrance about 15 m wide into the customer car park | Right; the drawn spur (3.5 m) is narrower than the real opening | Opening width: A |
| 34036645 Dalstien (839, 151) | Left Dalstien, straight | T. Olaf Bulls veg's west end lies 12 m east of it but ends at a house (NVDB `PV5445` ends there too) | Right: not an arm | none |
| 34036644 (930, 115) | Straight, right Olaf Bulls veg | T | Right | Olaf Bulls veg 5.5, data |
| 253815133 (993, 118) | Left Ferstadbakken, straight | T | Right | none |
| 34036640 (1140, 194) + 2301428234 (1192, 228) | Left Nedre Ferstadveg, straight; then straight, right Underhaugsvegen | Two T's 61 m apart | Right | Widths 4.5 / 4.0, data |
| Big roundabout (1339, 324) | #1 Byåsveien (right), #2 Arnt Smistads veg (straight, recommended), #3 Byåsveien (left) | Ring with a 10 m island; all four arms have kerbed splitter islands and zebra crossings; the ring and its flares are one paved area about 30 m across | Topology right; island drawn 15.9 m instead of 10 m; arms drawn as plain roads without islands | Island, ring 8.3, data (fixed); splitter islands: A; crossings: B |
| 1974499038 (1415, 402) | The car drives on by itself (only Arnt Smistads veg leads on) | A crossing with a zebra crossing: O.J. Aalmos veg leaves south-west (one-way, out of the junction), Vognhallvegen comes in from the north-east through a paved link | OSM and NVDB agree: the link to Vognhallvegen is a cycleway (`Gang- og sykkelveg`, no cars); O.J. Aalmos veg is one-way away and leads to the southern district from which the goal cannot be reached, so it is not offered | none; open point below |
| 35336635 (1604, 561) | Left Selsbakkvegen (north, recommended), straight Selsbakkvegen (east), right Erika Lies veg | Four-way with zebra crossings | Right | Selsbakkvegen 7.0, data; crossings: B |
| 8910717121 (1665, 464) | Straight Selsbakkvegen, right Selsbakkvegen | Y: the road north (7.0) and the residential road south-east (5.0) | Right | Widths, data |
| 91783985 (1632, 379) | Straight Selsbakkvegen, right Nordre Hallsetveg | T | Right | none |
| Palermo lights 91783986 (1573, 144) | Four arms: Bøckmans veg both ways, Selsbakkvegen, the school parking road; every road offered | Four-way with crossings; the roundabout at (1501, 153) 72 m west; tram depot yard beside it | Right | Bøckmans veg 7.3 / 6.1, data; crossings: B |
| 254465339 (1928, 326) | Left Adolf Andreassens veg (recommended), straight Nordre Hallsetveg | Five arms: Nordre Hallsetveg west and east, Adolf Andreassens veg north, a paved service road south and one running parallel 9 m south-west | Right by design: the Hallset access lanes are scenery only (`prepare-map.py`); both are drawn | none |
| 11253710556 (1917, 251) | Left Barnehagens innkjøring (recommended), straight Adolf Andreassens veg | T; the lane to the gate is a paved courtyard beside a car park; NVDB has no road there | Traced lane, as documented; nothing to compare | none |
| Olav Duuns veg / Odd Husbys veg (465, 475) | From the south-west: left Olav Duuns veg, straight. From the north-east: straight, right Olav Duuns veg. Down Olav Duuns veg: left and right Odd Husbys veg | T; the Bunnpris car park lies ahead but has no way in from here (30 September 2026) | Right | Odd Husbys veg 6.8, Olav Duuns veg 5.5, data |
| Dalgårdvegen splitter island (505, 440) | From the south-west: straight, right Dalgårdvegen. From the north-east there is no entry; 10 m on the node offers left Dalgårdvegen | Channelised road (NVDB `Kanalisert veg`): the south-west lane goes in, the north-east lane comes out, a kerbed island between | Right, including the one-way directions | Lanes 4.0 each, data; island shape, bell-mouth: A |
| Stavset roundabout (84, 1328) | From the north: #1 Byåsveien (right), #2 Enromvegen (straight), #3 Byåsveien (left), Snu | Four arms, each with a splitter island; island 22 m | Right; island drawn 24.3 m | Ring 8.2 and island, halves 4.0-4.5, data |
| Lysverkvegen roundabout (565, 1262) | From the east: #1 Lysverkvegen (right), #2 Byåsveien (straight), #3 Rittmestervegen (left), Snu | Four arms; the east and west arms have long splitter islands; island 10.3 m | Right; island drawn 15.1 m | Island, halves 4.5, data |
| Kystadlia roundabout (982, 1015) | From the south-west, the way north: #1 Kystadlia (right), #2 Byåsveien north (straight, recommended), Snu; from the north: #1 Byåsveien south-west (straight), #2 Kystadlia (left), Snu | Three arms; north and south-west split around islands; island 10 m | Right; island drawn 14.9 m | Island, halves 4.5, ring 7.0, data |
| Big "roundabout" (940, 330) | Double T on Olaf Bulls veg: north, south-west (Hans Aanruds veg), east | Same | Not a roundabout | none |

## Open points and notes for the integrator

- **Rendering, for A.** The ring roads are drawn as strips round a polygon, so the outer edge of every roundabout is a saw tooth
  (wedge gaps at the bends) and each arm ends in a flat cut on the ring; the aerial shows smooth kerbs and flared mouths.
  The big roundabout, KIWI and Munkvoll have mountable aprons round the island that the game does not draw. Splitter
  islands: the big roundabout and the Lysverkvegen north/south arms have them in reality but OSM maps those arms as one two-way way,
  so nothing in the data makes an island. The Y at Gamle Oslovei (712, -50) has a triangular island; the Dalgårdvegen island is a kerbed
  triangle and the mouth is 12-15 m wide. After merging, check that the 4.0-4.5 m lanes leave a visible island at each splitter.
- **Details, for B.** Zebra crossings on all four arms of the big roundabout, at Lysverkvegen north, at 1974499038 (Arnt Smistads
  veg), 35336635 and Palermo; bus shelters and lamps as OSM has them.
- **Vognhallvegen** (1434, 388): the aerial shows a paved 17 m link to Arnt Smistads veg; OSM tags it `cycleway` and NVDB
  `Gang- og sykkelveg` (pedestrians and bicycles), so cars cannot use it and the game rightly leaves Vognhallvegen as a dead end.
- **Anders Wigens veg** (672, 372): NVDB has the small oval in front of Extra as a one-way loop; OSM and the game have it two-way
  (it is a paved square on the aerial). Not on any trip; left as it is.
- **Olaf Bulls veg** (945, 360): a short public spur (NVDB `KV5445`) leaves the junction to the south-east; OSM has it as an unnamed
  service way, so it is drawn but not offered. Not on a trip.
- **Ring radius.** The correction is a scale of the ring nodes about the ring centre, 0.3-2.9 m (about 2 m on most), so the exit order and arrows
  are unchanged (`verify-roundabouts.mjs`). If A draws islands from explicit measured radii instead, drop `fit_roundabouts`.
  Since 30 September 2026 `fit_roundabouts` fits the circle by least squares and puts every ring node on it, and the roundabouts have their own
  surface (no junction patches on the ring, one plane, curb returns): see `docs/roundabouts.md`.
- The tests that could have been affected all pass: `node verify-*.mjs` (16 scripts plus `verify-junction-audit.mjs`).
