# Dalgård: sources and uncertainty

Local coordinates: metres east (x) and south (z) of home (see `prepare-map.py`). Colours are visual estimates from the
sources below; no photo is copied into the game.

## Dalgård skole (`dist/dalgard.js`, `add-dalgard.py`)

**Footprints.** OSM multipolygon relations 1318241 (A-bygget, with its courtyard as inner ring), 20722521 (B-bygget;
tags: one storey, height 6 m, hipped metal roof 2 m, brick) and 20516148 (the southern wings, two member ways joined into
one ring). © OpenStreetMap contributors, ODbL. `prepare-map.py` reads ways only, so `add-dalgard.py` adds them.

**Form and materials.**
- Wikipedia (no), *Dalgård skole*: built 1977/78 to drawings by Einar Myklebust, rebuilt and extended in 1998 by HUS
  arkitekter; one storey plus basement, brown brick facades and large, gently sloping roofs.
- Wikimedia Commons, *Dalgård skole 2021.jpg*, Cato Edvardsen (Beagle84), 10 September 2021, CC BY-SA 4.0. Taken from
  about (576, 641) looking north-east over the school: long low buildings with light grey metal roofs, glass roof
  lanterns, brown-red brick.
- Trondheim byarkiv on Flickr, *Dalgård skole (2003)*, <https://www.flickr.com/photos/trondheim_byarkiv/36780447445>:
  red-brown brick with darker bricks, dark stained timber roof structure and window frames, an entrance under a small
  timber gable.
- Esri World Imagery (zoom 17–18, viewed only) over the school: the layout of the roofs. A ring of hipped roofs round
  A-bygget's courtyard, a brown-roofed hall to the north-east of it (a sports centre for swimming is mapped there, OSM
  node 2939571128), square roof lanterns on B-bygget and on both southern blocks.

**Model.** All outline walls run at 42°, so the roofs are laid out as rectangular wings in that frame (`schoolWings`).
Each wing has a hipped roof with 0.7 m eaves, pitch 0.3, rising at most 2.2 m (flat on top where wide). Overlapping
wings meet in hips and valleys. Eaves are 4 m over one floor level for the whole school (the middle of the ground heights
round it), with a concrete plinth down to the ground. The north-east hall has 6.2 m eaves and a brown roof. The links
between the blocks are lower. Walls follow the OSM outlines, including the courtyard. Walls shared by two buildings are
left out. Window bands have dark brown frames.

**Uncertain.** Eave and ridge heights (only B-bygget is tagged), lantern sizes (from the aerial), the courtyard (paved
here; the aerial shows something brown in it) and the entrance. The porch and the name board sit on the north-west front
towards the car park by Anders Wigens veg. The 2003 photograph shows such an entrance, but not where on the school it is.

## Extra Ugla and Dalgårdstunet

**Footprints.** OSM 1312240278 (hus A, `building=retail`) and 1312240279 (hus B). Extra Ugla: OSM node 12146218152,
Anders Wigens veg 2.

**Sources.**
- OBOS / Dalgårdstunet, sales prospectus *Trinn 1* (15 August 2023),
  <https://dalgaardstunet.no/wp-content/uploads/2023/08/DT_Prospekt_leil_T1_230815.pdf>, 3D illustrations on pp. 6–7 and
  28–29. Hus A is light sand render with dark vertical windows over a glazed ground floor, five storeys. Hus B has
  gold-khaki cladding and balconies along its long side, four storeys. On the ground floor, the red Extra name with its
  round yellow and red badge faces the street and the square between the houses.
- FINN 427472756 (Anders Wigens veg 4B, 2024): exterior photos. Light sand render, anthracite windows, bronze-brown
  panels on the ground floor, flat roofs with terraces. The listing states that Coop Extra is in the same building.

**Model.** Colours and storeys in `building-details.js`. Shop front (bronze panels, dark glass) and two Extra signs
(`dalgard.js`): towards Anders Wigens veg and towards the square. The Extra badge is drawn, not copied. Window sizes
are the generic builder's.

## Bunnpris Ugla

**Footprints.** OSM 191198632 (retail, two storeys) and 1037053709 (retail). Shop: OSM node 5455086990, Odd Husbys veg 22.

**Sources.** The chain's logo is black letters with a yellow outline (Wikimedia Commons, *Bunnpris Logo.png*). Its shop
signs are black letters on yellow (Commons, *Bunnpris store in Trondheim.jpg*). No photograph of the Ugla shop front
was found: its light walls and dark roofs come from the aerial only. The sign is above a glazed entrance on the wall
facing the car park.

## Dalgård idrettspark and Dalgård ishall

**Grounds.** From OSM with their surfaces:
- the running track, relation 17382112 (tartan, with Byåsen Arena, relation 18194305, inside it)
- Dalgård kunstgressbane 89233502, Byåsen mini kunstgress 89233480, and pitches 423825299 and 423825300 (artificial turf)
- Dalgård tennisbane 89247085 (tartan) and Dalgård padelanlegg, relation 18968858
- the school's ball court 1112589245 (asphalt) and Trondsløkka 1249412407
- seven car parks

Earlier, pitches were not drawn at all and trees grew on them. Football pitches get standard markings scaled to their
size and two goals. The track gets lane lines 1.22 m apart.

**The road down to the hall.** Dalgårdvegen ends in a turning circle beside Dalgård ishall (OSM 89233555; the user
calls it *Dalgård idrettshall*). The car park at the hall is reached by service road 1368418204 and the aisle along the
hall's west side, OSM 160676281. That aisle and two other parking aisles, 325373939 and 1364102244, were missing in the
extract. `map_fixes.add_ishall_parking` adds a junction on Dalgårdvegen and a 33 m road, *Dalgård ishall*. It ends at a
parking place in the middle of the car park, 13 m from the hall. The game treats it as a place to go, like KIWI, so it
is offered with blindveier hidden. The name board on the hall's west front is stylised: its position and colours were
not checked against a photograph.
