# Findings of the junction building audit (30 September 2026), read by audit-junction-buildings.py to write docs/junction-buildings.md.
# GENERAL_INTRO is a format string, GENERAL the table of what was wrong and what was done in general, FINDINGS notes for single junctions.

GENERAL_INTRO='''Every junction of the drivable network ({junctions} nodes where three or more roads meet, a roundabout, or the start) was checked against reality for the
buildings within 60 m: {main} are on the main trip from Herlofsons veg to the kindergarten (junctions within 25 m of the fastest route), {stavset} on the detour south
to Stavset, {detour} on the other branches. Method, in the order it was done:

1. **Missing buildings.** `fetch-matrikkel.py` downloads Kartverket's building register (Matrikkelen, one point per registered building with type, status and
   number of dwellings; CC BY 4.0). A registered building with no OSM footprint within 6 m is a candidate. {registered} registered buildings (in use or finished)
   lie within 60 m of a junction; {before} of them had no footprint, {now} still have none (forest clearings, building sites, sheds in deep shade, points that belong to a
   neighbour's footprint: looked at one by one, none of those is drawn). Two causes: the OSM extract stops at the edges of its boxes while the game shows
   more (`add-buildings.py`: {osm} footprints from a new OSM download, {strips}), and houses and garages built after the OSM building import ({mk} drawn from the register
   by `audit-buildings.py`, as a typical rectangle of the registered type on the register's point, turned like the neighbours; the outline is not surveyed).
2. **Kind of building.** Where the register and OSM disagree (a row of houses mapped as building=house, a garage mapped as building=yes, flats mapped as a
   detached house) the register wins in `dist/house-looks.js` (`kindOf`): {mismatch} buildings near junctions. Dwellings counted in the register give a door for
   every dwelling in a terrace and the storeys of a block that OSM gives no `building:levels` (about 62 m2 of flat per 0.78 of the floor plate).
3. **Roofs, walls, colours.** Looked at on the Esri aerial photo with the game's footprints, ridge lines and roof colours laid over it (viewing only: nothing was
   traced, sampled or committed from the photo). Every house within 34 m of the main trip and the Stavset detour (403 buildings, 56 views) was compared; {eye} roofs
   whose colour or shape was clearly different got a record in `buildingStyles` with the source `aerial-esri-2026-09-30`. Buildings with a photo-matched record
   from the earlier passes ({photo} records: listing photos, Statens vegvesen road images) keep it. Wall colours cannot be seen from above and stay seeded.
4. **Road images.** Statens vegvesen's road images (Vegbilder, NLOD) only cover the county roads (Byåsveien, Bøckmans veg, Selsbakkvegen); the earlier pass used them
   for the school frontage and the houses by Selsbakkvegen (docs/building-references.md). This pass looked at the image nearest to four spots (Byåsveien at the big
   roundabout, at Kystadlia and at Dalgård, Bøckmans veg west of the Palermo lights): at Kystadlia and Dalgård the road is lined by hedges and fences and the houses
   are set well back (as drawn), at the roundabout a dark timber house and a grey-brown tiled roof stand behind trees, and at Palermo a red timber house and a brown
   one stand above a retaining wall, which gave two style records (`169707663`, `169707648`). Web photos beyond the listing photos of the earlier passes were not searched again.

Not verified: wall colours and storeys of buildings without a photo match are still estimates (seeded per building), as is everything on the back of a house.
'''

# (finding, where, what was done, source)
GENERAL=[
 ('OSM extract ends at the edge of its boxes; the game shows buildings out to x -220..2220, z -700..820','West strip x -220..-113, east strip x 2083..2220 (round the kindergarten), z 720..820 east of x 1253','`add-buildings.py --fetch` downloads the strips again (and the southern and Lianvannet boxes of `fetch-osm.py`, for houses just outside the Stavset and Lianvannet cut) and keeps the building ways and four building multipolygons (outer ring) inside the game area or within 70 m of a drivable road: 430 footprints not in the first extract (324 in the strips, 106 beside the cut), in `data/osm-extra-buildings.json`','OpenStreetMap contributors (ODbL), OSM API 30.9.2026'),
 ('Houses and garages built after the OSM building import have no footprint','100 registered buildings within 60 m of junctions had no footprint; 35 are left after the OSM download and the 53 drawn','`audit-buildings.py --write` writes `data/building-additions.json` (position, registered type, size of the typical footprint, angle of the nearest neighbour); `add-buildings.py` adds them with `"add":"matrikkel"`. Each was checked on the aerial photo; 4 sites with a building permit (IG) and 1 with temporary occupancy (MB) are drawn as buildings','Matrikkelen - Bygningspunkt (Kartverket, CC BY 4.0); Esri aerial, viewed'),
 ('Large building by Lianvannet missing (registered 719)','(-266, 127)','Drawn as a T-shaped outline estimated by eye, 2 storeys, pitched roof','Matrikkelen; Esri aerial, viewed'),
 ('OSM kind disagrees with the register (house or apartments for what is a terrace or a semi-detached house; building=yes; garage tagged as house)','1 104 buildings got a register note `mk` in `dist/map.json` (units > 1, building=yes, or a different kind)','`kindOf` uses the register: doors and unit joints per dwelling in terraces, flats in blocks, garage doors on garages','Matrikkelen'),
 ('Blocks without `building:levels` drawn with the default 3 storeys','Flats counted in the register, e.g. 4 flats in a 216 m2 footprint','Storeys from dwellings and footprint (2 to 5), only where OSM has no levels or height','Matrikkelen'),
 ('Adolf Andreassens veg 2A/2B (OSM 186841243, 186841244) by the kindergarten had grey-brown roofs','(1906, 297), (1874, 273)','Red-orange tile roofs, as the aerial photo shows (the balcony listing photo that gave the walls does not show the roof)','Esri aerial, viewed; DNB listing for the walls (earlier)'),
 ('Roof colour or shape clearly different from the aerial photo along the trip','112 buildings: 63 dark, 23 light grey, 15 red-orange, 11 brown; 2 roof shapes (a house with a pitched roof tagged flat, a flat light roof tagged pitched)','Records in `buildingStyles` (`dist/building-details.js`, source `aerial-esri-2026-09-30`); garages take their house\'s roof','Esri World Imagery, viewed 30.9.2026'),
 ('Red timber house with a black tiled roof and a brown timber house west of the Palermo lights drawn as grey boxes','Bøckmans veg, OSM 169707663 and 169707648 (1474, 144), (1458, 165)','Style records: red boards, black tile, white frames, canopy and chimneys; brown lap siding with red-brown tile','Statens vegvesen road image Vegbilder_2025.2025-07-14T09.11.26_FV06650_S2D1_m03570_Planar_1 (NLOD), viewed'),
 ('Terraced houses drawn as one box','268 terraces, e.g. Hallset, Olav Duuns veg, Kystad','Joints and alternating tones for every dwelling, a door for every dwelling, a chimney for some','Matrikkelen (dwellings)'),
 ('Houses looked alike: grey boxes with dark squares for windows, no doors, no chimneys, no eaves','All 5 500 buildings','`dist/houses.js`: seeded palettes, board cladding, white frames with mullions and sills, doors with steps and canopies, eaves, fascia and barge boards, ridge cap, tile courses or seams, roof lights, chimneys, gable and plinth windows, verandas and balconies (procedural, ~30% of houses and ~60% of blocks, unless a record says otherwise)','Photos of Byåsen houses (listings, Statens vegvesen) as reference only'),
]

FINDINGS={}
