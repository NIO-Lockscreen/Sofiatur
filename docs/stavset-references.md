# Stavset and Bunnpris Ugla: sources and uncertainty

Local coordinates: metres east (x) and south (z) of home (see `prepare-map.py`). Colours are visual estimates from the
sources below; no photo is copied into the game.

## The map south to Stavset (`map_fixes.SOUTH`, `fetch-osm.py`, `add-stavset.py`)

**Extent.** The original OSM box ended about 730 m south of home. The detour runs down Odd Husbys veg to the roundabout
at Stavset senter (84, 1328) and back north on Byåsveien (Fv6650) through the roundabouts at Lysverkvegen (565, 1262)
and Kystadlia (982, 1015), where it meets the part of Byåsveien that was already in the map. The polygon
`map_fixes.SOUTH` covers that loop with 100–150 m on each side and the Kystad houses inside it. Roads, buildings, areas,
bus stops and shops inside it are taken from OSM like the rest of the map; roads leaving it end at its edge, like at the
edge of the original box, and are blindveier.

**Data.** OSM API, 28 September 2026, two boxes: `10.325,63.393,10.369,63.406` (the original) and
`10.321,63.3858,10.3525,63.3935` (south). One API call returns at most 50 000 nodes, so `fetch-osm.py` fetches both
and merges them. © OpenStreetMap contributors, ODbL. Before extending, the original box was downloaded again and run
through `prepare-map.py`, `add-lakes.py` and `add-dalgard.py`: it gave the same roads, buildings, areas and terrain as
the committed map (only the order of the edges differed; they are now sorted, so ids are stable between runs).

**Corrections to OSM.**
- Byåsveien's two lanes at the Kystadlia roundabout (ways 1443998971 and 1443998972) part at a splitter island but
  have no oneway tag, so the car could leave the circle up the lane coming in. They are one-way in their drawing
  direction (`prepare-map.py`).
- Kystadbrua (22898263, bridge, layer 2) carries Byåsveien over the Kystad valley, and Dalgårdbrua (192 m) over the
  Dalgård valley north of the Kystadlia roundabout. Both carry OSM's bridge tag: the deck is a straight ramp between the
  bridge ends, with edge beams, railings and piers where it stands more than 3 m above the ground.

**Terrain.** Kartverket's height service (`ws.geonorge.no/hoydedata`) and its WCS both answered 504 Gateway Timeout on
28 September 2026. South of the last measured row (z = 840) the 40 m grid takes Mapzen terrain tiles through
OpenTopoData (`api.opentopodata.org/v1/mapzen`, about 30 m resolution, heights in whole metres), 1 482 points in 15
calls. Against 100 points of the measured grid Mapzen is 0.1 m low on average, with a 5.3 m standard deviation (EU-DEM
25 m: 0.4 m and 8.6 m; ASTER: 7.5 m and 5.1 m). At the seam the difference to the measured row is carried over and
fades out within 160 m. Across the seam the ground is no steeper than within the measured rows (8.8 m against up to
12.5 m per 40 m). Stavset senter and its car park stand on a level plot: the nine grid points under them get their
mean (171.56 m), and the ground ramps to its neighbours within 40 m. `fetch-terrain.py` covers the whole grid when the
height service works again; `add-stavset.py` then levels the plot again and keeps the measured heights.

## Bunnpris Ugla (`dist/stavset.js`)

**Location, checked.** OSM node 5455086990 (*Bunnpris Ugla*, ref:bunnpris 7600) lies between two footprints: the
single-storey shop 1037053709 (`building=retail`, 16.5 × 11.2 m) and the two-storey 191198632 behind it. The shop's short
north-west side faces Odd Husbys veg, 16 m away, the road south to Stavset; its long north-east side faces the customer
car park 207829382. Earlier the sign was on the old house's north-east wall, towards the aisle from Granlivegen. That
did not match the photos: the shop is 1037053709, the old house 191198632.

**Sources.** Two photographs from the user, 28 September 2026:
1. From the car park: the long side with a canopy on dark red posts over the entrance (grey roller shutter), yellow
   Bunnpris posters in black frames, a red post box and black bins; the gable with BUNNPRIS and the hours board at the
   right; behind, a white two-and-a-half-storey house with vertical boards, dark red window frames and a dark tiled
   roof, and a smaller BUNNPRIS sign on the roof in front of it; at the left a low annex with a garage door and a
   VAREMOTTAK sign.
2. The gable towards the road: yellow BUNNPRIS letters with a black outline, the black board *Man-Fre 9-22, Lørdag
   10-22, Søndag 10-22* (Sunday in pink), a large yellow *Billig middag hver dag* poster, the gable in light horizontal
   boards over white render, the black roof with dark red barge boards running on over the canopy to the left.

OSM's opening hours (weekdays and Saturdays to 20:00) differ from the board in the photo; the model shows the board.

**Model.** Walls white render to 3.4 m, light boards above. Gable roof in black, 3 m rise, ridge 4.1 m from the car park
side, so it sits over wall and canopy together as in photo 2; the car park side runs on 3.6 m over the entrance for the
first 9.6 m, on two red posts. Letters, hours board and poster on the gable; posters, glass doors, post box, bins,
trolleys, a flower rack and the yellow *Åpent søndag* board under the canopy; the smaller sign on the roof in front of
the old house. The old house uses the generic builder with white vertical boards, dark red window frames and a dark
tiled gable roof (`building-details.js`); the goods door with VAREMOTTAK is on its north-east wall. **Uncertain:** the
depth of the canopy, the positions of the posts and the doors, the roof pitch and the old house's form (its OSM outline
also covers the lower annexes).

**At the T-junction.** Olav Duuns veg meets Odd Husbys veg at OSM node 185588577, 30 m from the shop (30° right of straight ahead for a car coming down Olav Duuns veg). The car park polygon starts 5 m from that junction and a footway (455263297) leads from the aisle up to the road, so the car park is open towards the junction. The game has a driveway along that line, from the junction through (469.8, 476.7) and (471.5, 478.0) to the middle of the aisle: the road *Bunnpris* is straight ahead there and ends at the same parking place. The driveway itself is not a mapped road (only the footway is); it follows the footway and the car park's corner.

**The car park.** Drawn as asphalt with parking bays. The mapped way in is from the end of Granlivegen (link 1364292850,
aisle 23390718); the road *Bunnpris* ends at a parking place in the aisle in front of the canopy
(`map_fixes.add_bunnpris_parking`), a place to drive to like KIWI. From the photo the car park also seems open towards
Odd Husbys veg, but no entrance is mapped there, so none is drawn.

## Stavset senter with Rema 1000 (`dist/stavset.js`)

**Footprints and places.** Stavset senter, OSM 89061195 (`building=retail`, one storey, 75 m along the car park);
customer car park 89061200 and its aisle 89061191; Rema 1000 Stavset, node 193629076; Byåsen bakeri 4412162790, Apotek
1 4412193890, Fiinbeck & Fia 4412194594, Mester Grønn 4412243289; trolley shelter 1362384532; the Circle K canopy
154610024.

**Sources.**
- The user's photo 3 (spring, recent): Rema 1000's entrance is a black block with big white STAVSET SENTER letters on
  top, a white portal with a leaning left pillar, REMA 1000 in large letters over the doors, glass fronts with a blue
  band (*Bare lave priser*) and granite blocks in front. To the right the other shops continue under a white edge.
- The user's photo 4 (older, from the grass bank south-west of the car park): the whole centre, light walls with blue
  trim and pilasters, low grey metal roofs, Byåsen Bakeri at the west end, the pharmacy right of the entrance, Mester
  Grønn at the east end, the car park in front.
- REMA 1000's logo as published on rema.no: rounded red REMA (#D71F2E) and blue 1000 (#023EA5). The game draws it on a
  white panel; the file itself is not used.

**Model.** Walls follow the footprint, 5.4 m, light render with a blue band and blue pilasters; glazed shop fronts in
blue frames on the walls facing the car park; a low hipped grey roof (3.2 m rise) over the whole outline. The entrance
front between footprint points 5 and 8 is made straight (it bends by less than 0.5 m) and drawn as the black block, 8.3
m high, with the portal, the letters and a 7.6 m REMA 1000 logo over the doors, and granite blocks. Shop signs sit on
the fronts nearest the mapped shops; the pharmacy's sign is placed right of the entrance as in photo 4, not at its
mapped node, which lies inside the building. **Stylised, not from a photograph:** the second REMA 1000 logo (9 m) on
the north wall facing Byåsveien, so the shop can be seen from the road; the shop sign colours of Byåsen Bakeri,
Fiinbeck & Fia and Mester Grønn; the trolley shelter's form. The floor level is the car park's at the entrance, on the
levelled plot.

**The road into the car park.** The car park is reached from Nedre Stavsetvegen by the service road along the centre's
east side (18939739). `map_fixes.add_rema_parking` gives Nedre Stavsetvegen a junction there; the road *Rema 1000*
follows the service road and the aisle round its loop to a parking place 8 m past the loop's west end, in front of the
entrance. It is a place to drive to. From the Stavset roundabout the way is Enromvegen (one-way, south) and Nedre
Stavsetvegen; back out it is Nedre Stavsetvegen and Enromvegen's northbound lane into the roundabout, then Byåsveien.

**Fuel canopy.** Roofs without walls (`building=roof`: the Circle K canopy here, Uno-X Munkvoll and five bicycle and
bus shelters elsewhere) are now drawn as a roof on posts at their corners instead of a closed box.
