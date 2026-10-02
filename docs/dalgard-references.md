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
