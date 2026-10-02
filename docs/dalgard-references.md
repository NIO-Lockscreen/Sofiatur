# Dalgård: sources and uncertainty

Local coordinates: metres east (x) and south (z) of home (see `prepare-map.py`). Colours are visual estimates from the
sources below; no photo is copied into the game.

## Dalgård skole (`dist/dalgard.js`, `add-dalgard.py`)

Reworked on 2 October 2026 from many more pictures (the earlier model rested on the 2003 entrance photograph, the 2021
photograph at web size and the aerial). Everything below is either **mapped** (OSM), **seen** (a picture, named) or
**estimated** (marked as such).

### Footprints (mapped)

OSM multipolygon relations 1318241 (A-bygget, with its courtyard as inner ring), 20722521 (B-bygget; tags: one storey,
height 6 m, hipped metal roof 2 m, brick; two inner rings carry its roof light) and 20516148 (the southern wings, C and D,
two member ways joined into one ring). `prepare-map.py` reads ways only, so `add-dalgard.py` adds them. The other four
school buildings are plain OSM ways that `prepare-map.py` already keeps: 89247055 (E-bygget, 779 m²), 89247040 (F-bygget,
`building=school`, one level, metal, flat), 709881957 (G-bygget, brick, flat) and 191360470 (untagged, 692 m²: the
dormitory, see below). © OpenStreetMap contributors, ODbL.

Check against the Esri aerial (viewed only, zoom 18) with the outlines drawn over it: all seven outlines follow the roof
edges to 1–2 m, all walls lie on the 42° grid, no school building is missing and none is mis-placed, so `add-dalgard.py`
needed no change. The Matrikkelen building points (`data/matrikkel-bygningspunkt.json`, Kartverket, CC BY 4.0) agree:
type 613 (school building) at A-bygget (182362093), B-bygget (182758590), the southern wings (10574900), E-bygget (21049816)
and G-bygget (300748801, status FA); type 619 (other teaching building) at F-bygget (21052353); and type 529 (other
overnight accommodation, 3 units) at 779.4, 429.2, inside 191360470: this is the dormitory (*Internatet*), building
182362115. Each point lies inside the OSM outline of its building. The
previous model drew E, F, G and the dormitory with the ordinary house builder (two storeys, beige walls, gabled roofs);
`addDalgardSchool` now returns their bounds, so `world.js` skips `houses.js` for them, as for the three main buildings.

### What the pictures show (seen)

- **Wikimedia Commons, *Dalgård skole 2021.jpg***, Cato Edvardsen (Beagle84), 10 September 2021, CC BY-SA 4.0,
  <https://commons.wikimedia.org/wiki/File:Dalg%C3%A5rd_skole_2021.jpg>, viewed at 3840 px. Taken from the slope to the
  south-west, about (560, 668) local metres and about 40 m above the school, looking north-east (a 2× telephoto, about 45°
  across). Seen: the hall's roof is **one brown (rose-brown) standing-seam plane** rising to the north-east, with a
  brick wall at its south-east end and a vent; A-bygget's and B-bygget's roofs are light silver-grey standing seam with many
  hips and valleys; B-bygget has a small dark roof opening, not a tall lantern; the southern wings and E-bygget have
  **black timber boxes with white flat tops** (about 8 m square, about 2.3 m high, with a small vent hat) on grey roofs; the
  yard-side walls of the southern wings and E are **dark charcoal timber** with window ribbons and light fascias, not
  brick; low flat-roofed dark pavilions with light fascias east of them (F); a glazed entrance foyer with a flat canopy
  towards the yard between A and the southern wings.
- **Trondheim byarkiv (Byantikvaren, *Skoler i Trondheim 2003*), four photographs of 2003**, Flickr (CC BY 2.0 on Commons):
  BC041 <https://www.flickr.com/photos/trondheim_byarkiv/36780447445>, BC042 …/35945900244, BC043 …/36780447145, BC044
  (*Internatet*) …/35945899834. BC041: a covered passage under heavy dark-stained timber trusses between red-brown brick
  walls with dark headers, brick paving, and at its end a glass entrance under a small timber gable between brick piers.
  BC042: a tall brick gable wall with a **mono-pitch top** and slit windows, a concrete band at floor level, entrance doors and
  concrete steps, a low link with a deep dark timber soffit. BC043: a glazed link between blocks with dark timber posts and
  fascia, maroon standing-seam roofs (before the roofs were renewed in light grey), red brick with blue window frames, and a
  black timber-clad box with a flat metal top over a brick block. BC044: the dormitory, **stepped red brick units with
  mono-pitch roofs, chimneys and small concrete terraces**, a maroon metal roof on a link.
- **NRK Trøndelag, *Dalgård skole stenges***, 9 July 2009, photo Jon Arne Hoff Johansen / NRK,
  <https://www.nrk.no/trondelag/dalgard-skole-stenges-1.6689891>: the **name "DALGÅRD SKOLE" in silver capital letters
  directly on the brick gable** (no board), about 0.5 m high and 4 m wide, above a low brick wall with a "Hovedinngang" label
  and a door to the left; the gable top slopes up to the left. The article also says the school was finished in 1998 and
  stands on a bog (repaired in 2005 and 2009), which is why the cracks closed half of it.
- **FINN 427472756** (Anders Wigens veg 4 B, a top-floor flat on Dalgårdstunet hus A, 2025), photograph 4 of the listing
  (roof terrace, view east), <https://www.finn.no/realestate/homes/ad.html?finnkode=427472756>: an elevated view of the
  school from the west (about (603, 432), 17–19 m above the ground) showing the brown hall roof, a brick gable wall at its
  west end with white lettering in three lines, **DALGÅRD SKOLE / OG RESSURSSENTER / UNIVERSITETSSKOLE**, light roofs and
  the car park by Anders Wigens veg.
- **Trondheim kommune**, *Internkontrollsystem … Dalgård skole* (February 2018),
  <https://www.trondheim.kommune.no/globalassets/10-bilder-og-filer/02-skoler/skoler-a-f/dalgard-skole-og-ressurssenter/skolens-styringsdokumenter/internkontr.-system-forskrift-for-miljorettet-helsevern-i-bh-og-skoler-dalgard-skole-080218.pdf>:
  "one main building with parts A, B, C and D, building E and the pavilions F and G"; the fire instruction (*Branninstruks
  2017–2018*, same folder) names the assembly points "Håndballbanen, south of the B wing" and "the gravel yard between the
  buildings (D1, E, F)". User-council minutes 2017–2024 (same site, *Brukerråd*): G is a pavilion/hut ("brakke") in
  "Lilleskogen", built 2017, torn down because of water damage and rebuilt from January 2019; E-bygget was renovated in
  2018 and had a roof leak repaired in 2022; windows and insulation were renewed on the building with the team offices;
  the school wants F to become two storeys (not built).
- **Wikipedia (no) and the Strinda historielag wiki** (text only): built 1977/78 to drawings by Einar Myklebust (Arkiplan),
  rebuilt and extended 1998 by HUS arkitekter; "one storey plus basement, brown brick facades and large, gently sloping
  roofs, more varied than most of its time, the mono-pitch roofs (pulttak) especially clear in the dormitory".
- **Esri World Imagery** (zoom 18, viewed only): roof layout and the placement of the lanterns; in particular the staircase
  outline of the dormitory (191360470) with light roofs and dark brick ends, E-bygget's lantern box in its south-west part.

Searched without result: Commons has only the five files above for the school; Statens vegvesen Vegbilder cover only
Byåsveien about 460 m away; KartaView has nothing here; the Mapillary API needs a key; DigitaltMuseum has only the bronze
*Nusse på gyngehest* (TKK.50002372, Astrid Dahlsveen, also Flickr 17070429240) that stands in the grounds; the Strinda
historielag wiki and norgeskart sit behind a bot check.

### Model (`dist/dalgard.js`)

All outline walls run at 42°, so roofs are laid out as wings in that frame (`schoolWings`, `schoolExtras`). Floor level: the
median ground height round A, B and the southern wings (E, F, G and the dormitory lie 2–4 m lower and use their own).
- **Brick** (A, B, hall, dormitory, G): `#9b5a40`, courses `#7a4533` every 0.5 m, concrete plinth, dark brown frames and
  fascia, window bands 3.3 m apart. **Charcoal timber** (southern wings, E, F): `#383c3e`, dark frames, light fascia.
- **A, B**: hipped light-grey roofs (pitch 0.3, at most 2.2 m rise); B's roof light is a low dark glass pyramid.
- **Hall**: one mono-pitch brown plane (eave 4.2 m on the south-west side, 9.7 m at the north-east edge, slope 0.21) with
  trapezoid brick gables. On its north-west gable (wall at u = −25): the name in light letters (three lines, 4.4 m wide, no
  board), a glazed double door under it and a low timber canopy on two posts (the main entrance, after the 2009 photograph).
  The old porch and name board on A's north-west front, which had no photographic basis, are gone.
- **Entrance A1** (OSM node 12631332162 at 677.5, 432.2, found in the schoolyard work): on the courtyard side, in the north-east
  face of the 6 m wide bay that projects 2.5 m into the courtyard (wing frame u −31.4…−25.4, v 1.9, visible as a notch in the
  courtyard ring). Glazed double door between two brick piers under a small timber gable, as at the end of the covered
  passage in the 2003 photograph BC041. The passage itself (from the north-west car park) is not modelled; the hall's
  gable door of the 2009 photograph stays as a second entrance.
- **Southern wings and E**: three black timber boxes 2.3 m high with light flat tops and a vent; E has a flat entrance
  foyer on its south-west side (outline) and its roof split in two hipped wings to follow the outline.
- **F**: flat dark roof with light coping; **G**: brick, flat dark roof; **dormitory**: 12 mono-pitch bands that follow the
  staircase outline, in three groups on common planes (north-east walls 5.6 m, south-west walls 2.6–4.3 m), light roofs.

### Uncertain

Heights (nothing tagged except B: eaves 3.2–4.2 m, hall 9.7 m are read off the pictures against door heights), the roof
pitch of the hall (0.21, from the photographs' perspective), roof colours (light grey vs maroon before the renewal), the
colour and material of G (OSM says brick; it is a pavilion), E's and F's walls on their far sides (only the yard sides are
seen), where exactly the covered passage of BC041 (reaching A1 from the car park) and the glazed link of BC043 are (not modelled), the entrance steps of
BC042 (not modelled), the interior courtyard (paved here), and whether the black boxes on E and the southern wings are one,
two or three (the aerial shows one on E, one on each southern block).

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

## Schoolyard and the way there (`dist/schoolyard.js`, `add-schoolyard.py`, `nvdb-school.json`; 1 October 2026)

Local coordinates as above. Pictures were only viewed; none is copied into the game or traced. "Measured" means open data (OpenStreetMap ODbL, NVDB NLOD),
"seen" means read from a photograph, "estimated" means chosen here.

**Measured (open data).**
- The school grounds are OSM relation 6579902 (*Dalgård skole og ressurssenter*, nine boundary ways: the north edge by the car park, the chain-link fence on the
  west side, the brown paling fence by the ball court, the south edge along Dalgårdvegen, the east edge). The kindergarten's grounds next to it are relation 6846714
  (Læringsverkstedet Dalgårdtunet; its playground is the one at x 807-880, z 510-575).
- 30 pieces of playground equipment are OSM nodes or areas tagged `playground=*` (swing 8, climbingframe 5, balancebeam 4, sandpit 4, playhouse 3, slide 2,
  structure 2, seesaw 1, tunnel_tube 1) with 18 `leisure=playground` surfaces; lawns are `landuse=grass`; the ball court is way 1112589245 (`sport=soccer;handball`,
  asphalt, 44.4 x 22.0 m, i.e. a 40 x 20 m handball court with a margin) and Trondsløkka way 1249412407 (grass, 21 x 13 m). Statue, boulder, campus board,
  picnic tables in A-bygget's courtyard (the roadside leaves out what stands inside a footprint), the two amphitheatre/bleacher polygons, ten car parks and
  drop-off pockets (`parking=street_side`, `maxstay=15 minutes`) are OSM too. `byasen.osm` was compared with a fresh Overpass answer for the area: no differences.
- NVDB (nvdbapiles.atlas.vegvesen.no, fetched 2026-10-02, kept in `nvdb-school.json`): 73 sign plates of type 96 Skiltplate within the area (the earlier note that the
  municipal streets have none was wrong), 15 speed humps and raised junction areas (type 103, the five *Opphøyd kryssområde* were built 2024 at Anders Wigens veg 2 /
  Odd Husbys veg), the speed limits (type 105: 30 km/h in every street round the school, 40 on Odd Husbys veg). Signs are grouped on one pole per position and
  turned to face the traffic they are for (the driver's right-hand side of the nearest road). Drawn: Barn (142) with Skole *Dalgård skole* (808.161) at Uglagjerdet
  (586, 334), Parkering forbudt (372), Parkering with the 15-minute plate (552, 834), Innkjøring forbudt (302), 30 zone (366, 368), Gang- og sykkelveg (522),
  Fartsgrense (362.xx), Blindveg (527.3). Gangfelt signs come with the crossings (`street-details.js`). Humps and raised areas are added to `data.street.tables`.
- Statens vegvesen Vegbilder: no coverage (only Byåsveien and Selsbakkvegen, east of x 1400). KartaView returns nothing here, Mapillary needs a token.

**Seen in photographs.**
- Trondheim byarkiv (Byantikvaren, *Skoler i Trondheim 2003*, CC BY 2.0), Flickr: *Dalgård skole (2003)* BC041 <https://www.flickr.com/photos/trondheim_byarkiv/36780447445>
  (the brick-paved covered passage with the main entrance, taken in the passage's north end at about (690, 418) looking south-west), BC042 `.../35945900244` (a brick gable with
  outdoor stair and picnic benches on asphalt, a dark-brown rail; viewpoint not known), BC043 `.../36780447145` (a glazed link between brick blocks with a lamp on a pole and
  dark timber railings; viewpoint not known), BC044 *Internatet* `.../35945899834` (brick pavilions on a lawn with tubular football goals). They show the asphalt yard with
  timber picnic sets, concrete steps, a mushroom lamp on a pole, bicycles parked beside the passage (-> the rack, below). The caption also says that the bronze statue
  *Nusse på gyngehest* by Astrid Dahlsveen stands outside the school (Bratberg, *Trondheim byleksikon*, 2008).
- dlight / Interiørfoto, *Dalgård skole* archive photographs, 2015 (watermarked previews, rights with the photographer, viewed only):
  <https://www.dlight.no/downloads/arkiv-bilder-interiorfoto-3-1145/> (arkiv-10059, *Dalgård skole og uteplass*: a wide grey asphalt yard with faint white lines and arcs, stone-set
  kerb against lawn, a flagpole with a green flag in front of a row of birches with small football goals, slim lamp poles, a dark timber shed; taken in the yard, viewpoint not
  known), arkiv-10060 (a dark-green steel climbing frame with yellow rungs and red end plates, rope-and-tyre hangers, a low plank seesaw and grey gravel in timber edging, the southern
  wing behind: most likely the playground at (749, 528) looking north), arkiv-10061 (the campus board, blue frame, green plan with red buildings, legend A1 Administrasjon, A4 Barnehage,
  C3 Helsestasjon, D3 Skolefritid, E Internat, at the west chain-link fence about 1.2-1.5 m high; behind it a green frame, a wooden tunnel, a plank bench with red legs, a seesaw on
  springs, gravel: the west playground at (589-607, 482-491), taken at about (578, 468) looking south-east), arkiv-10058 (Dalgårdtunet barnehage: white timber building, a red nest swing in a
  green steel frame on artificial turf in timber edging, a white flagpole, a ball lamp: the swing at (834, 573) and the flagpole at (828, 570)).
- Wikimedia Commons *Dalgård skole 2021.jpg* (already above): a line of slim lamp poles along Dalgårdvegen, a red slide in the west playground, big trees on the lawns.
- digitaltmuseum.no, Trondheim kommunes kunstsamling TKK.50002372, *Nusse på gyngehest* (Astrid Dahlsveen, 1979; the photograph is in the museum's API, id 019EGLhUuwRN5): a
  bronze boy on a rocking horse on a rough concrete plinth, on a lawn beside a kerbed road, a timber fence behind.
- Trondheim kommune, *Odd Husbys veg og Anders Wigens veg ... detaljregulering r20200008* (plan description, 2020): Dalgård barneskole is one storey; Anders Wigens veg by the school's main
  entrance is busy in the rush hour (1500 to 2200 trips a day with the plan); Odd Husbys veg has speed humps, a cycle path on its north side and a pavement on its south side; a new
  shortcut between Ugla skole and Dalgård skole; the nearest ballbinge is at the school.
- *Skolemiljøet på Dalgård skole og ressurssenter* (Trondheim kommune): the yard has zones for ball games, nature, quiet activities and equipment; entry and exit are in a separate zone and
  the yard is traffic free; pupils may cycle; the waste containers stand in their own place at the entrance (the six recycling containers at (688, 390) are the OSM ones).
  A search summary of Trondheim kommune's pages says that since 15 August 2022 drop-off and pick-up is along Dalgårdvegen in turn pockets, not in Anders Wigens veg (not re-read on the
  page): the five `maxstay=15 minutes` pockets along Dalgårdvegen are drawn with a car in some of them.
- Esri World Imagery (viewed only, with a metre grid): the asphalt is grey between the lawns (the yard polygon agrees); the red rubber square at (778, 510) under the swings; the bowl of Trondsløkka.

**Model.** The yard is the school grounds less buildings, lawns, playgrounds, the grass pitch and the roads (1.35 m off the centre line's kerb band), opened by 0.7 m so no sliver is
narrower than 1.4 m (`shapely`, 15 200 m2 in eight parts, 11 000 m2 after the holes), draped on the ground 7 cm up in two greys. Footpath ribbons of the roadside inside it, and the roadside's generic
playground equipment inside the grounds, are skipped (`owns()`). Fall surfaces: gravel in timber edging (school playgrounds), sand (sandpits), red rubber (relation 18774345, the swings), artificial
turf (kindergarten swings). Equipment is built from boxes and planes in the colours of the photographs (dark-green steel, yellow rungs, red); the court has handball lines (40 x 20 m, 6 m and
9 m lines, 7 m mark) and two 3 x 2 m goals, Trondsløkka two 3 m goals. Car parks get bay lines and cars on about 40 % of the bays; the pockets an outline and some cars. The OSM brown
paling fence by the court is now drawn brown (`add-roadside.py` reads `colour=*`), and the west chain-link fence is 1.3 m instead of 1.8 m (`add-schoolyard.py`).

**Estimated.** Equipment is set parallel to the school's 42° walls (no direction is mapped, except for the area-tagged ones) and its size and colours come from the photographs; the court's
line set (standard handball, not photographed beyond faint arcs); the amphitheatre as three low steps and the bleachers by the court as two (OSM gives only the footprints); the bicycle rack
with seven bikes in the courtyard at (681, 430.5) (the 2003 photograph shows bicycles beside the passage, not where exactly); the statue's pose and size; the two goals on Trondsløkka; the car
park bays and cars; sign sizes (0.5-0.6 m); which of the unmapped, non-grass ground in the grounds is asphalt (all of it here).

**Not found / not drawn.** The flagpole with the green flag of the school (seen in arkiv-10059, no position known); the lamp type (the OSM lamps are drawn by `street-details.js` as before);
painted games on the asphalt; a "Hjertesone" sign (none in NVDB); school bus stops (the AtB stop *Dalgård* at (550, 392) is drawn by the transit code); the doors and entrance porch (the main
entrance A1 is OSM node 12631332162 at (677.5, 432.2) on the courtyard side, reached by the covered passage from the north-west car park, not on the north-west front, see the school buildings).

## The neighbourhood (1 October 2026, agent H)

Full table of buildings, pictures, matches and certainty: `docs/dalgard-neighbourhood.md`. Pictures were viewed, not copied or sampled. Sources used:
- **FINN real estate ads** (https://www.finn.no/realestate/homes/ad.html?finnkode=NNN; broker text and photos belong to the brokers; only what they show is recorded here): 247003441 and 283657321 (EiendomsMegler 1 projects, Dalgårdstunet: drone photos of the corner of Anders Wigens veg with Extra and the building site of Odd Husbys veg 4, courtyard photos), 461130887 (Anders Wigens veg 4B, street photo at the zebra crossing, courtyard), 466013507 (Anders Wigens veg 4A), 464171086 and 473864059 (Odd Husbys veg 6B: street photo with bus shelter, courtyard), 462751345 (Odd Husbys veg 4C: street photo and balcony side), 459746591 (Anders Wigens veg 28C: drone photos, garden side; also a drone photo of the whole area looking north-east, photo 18), 465103210 (Odd Husbys veg 26), 451662725 (Uglagjerdet 7: houses, fence, street, the 2022 terraces in the background). Looked at and not used for a record: 432523496 (Odd Husbys veg 36C), 470697431, 406697433, 470707033 (apartments further away).
- **DNB Eiendom** listings: Anders Wigens veg 28H (sold, photo 23 of the block from the garden side), Granlivegen 4A and 12A (viewed; the address does not tell which of several nearby footprints it is, so no record).
- **Voll Arkitekter**, *Rekkehus på Dalgård*, https://vollark.no/portfolio_page/rekkehus-pa-dalgard/ (architect's illustrations of the terraces at Uglagjerdet 11-19 and 46-52: dark red, green, charcoal vertical timber, flat roofs).
- **bolig.ai**: Anders Wigens veg 22A and 24D built 2006.
- **Kartverket, Adresser** (https://ws.geonorge.no/adresser/v1/punktsok, CC BY 4.0, 1 October 2026): the registered addresses, `data/dalgard-addresses.json`.
- **Esri World Imagery** (viewed only, imagery of 2023-24): six red-orange roofs.
- Not available: Vegbilder (county roads only; nearest image 363 m away), Wikimedia Commons (nothing of these streets), Mapillary (token), KartaView (restricted).

**Uncertain.** Wall colours (estimates by eye, different light), the storeys of blocks (counted on facades), which drone-photo building is which footprint (judged from layout), Anders Wigens veg 22 and 24 and Uglagjerdet 1-3 (by analogy only), the unit colours of the terraces, and the placing of the lamps and trees on Odd Husbys veg (a rule with offsets from the photos).
