# The neighbourhood round Dalgård skole, 1 October 2026

What was checked against pictures within about 200 m of the school site (not the school buildings or grounds): 353 OSM buildings (193 of them
houses, flats or shops that are not garages and stand within 45 m of a drivable road), the street scene along Anders Wigens veg, Dalgårdvegen,
Odd Husbys veg, Uglagjerdet, Granlivegen, Magnus Åldstedts veg and the roads to the north-east. `node audit-dalgard-neighbourhood.mjs` prints the
list: id, position, kind, storeys, wall and roof as drawn, the registered addresses beside the building and which record decides its look.

Local coordinates are metres east (x) and south (z) of home. Pictures were looked at, never copied, traced or sampled into the repository.

## How buildings were matched to pictures

1. `fetch-dalgard-addresses.py` downloads the registered road addresses within 300 m of the school (Kartverket, Adresser, CC BY 4.0,
   `data/dalgard-addresses.json`, 303 addresses). A listing names its address, the address point lies on or beside exactly one footprint (or on a
   block's footprint with all its entrance letters), and that gives the OSM building. `verify-dalgard-neighbourhood.mjs` checks that every
   photo record has a registered address within 14 m of its footprint.
2. The listing's exterior photos, drone photos and street photos were viewed, and what they show was written as a style record in
   `dist/dalgard-neighbourhood.js`: the same keys as `buildingStyles` in `building-details.js` (wall, roof, levels, height, flat, siding,
   brick, lowerWall, sections, balconies ...). `junction-buildings.js` merges them over the older records, so they win. One new key, `plain`
   (render: no boards or stripes), is read in `house-looks.js`.
3. Roof colours of buildings with no photo were compared with the Esri aerial photo (viewed only): the game's roof colour was drawn as a chip on
   the aerial photo, and six roofs that are clearly red-orange tile but drawn grey were recorded (`source: aerial-esri-2026-10-01`). Roofs in
   shadow or of uncertain colour were left alone.

## What the pictures showed (and what was changed)

| Building (OSM id, address) | Seen | Record | Source | How sure |
|---|---|---|---|---|
| 1312240278, Dalgårdstunet hus A, Anders Wigens veg 2-4, Coop Extra | pale cream-yellow render, four storeys and a set-back fifth with a roof terrace, dark flat roof, grey-brown glazed ground floor, balconies with glass and dark rails | wall `#ead9ac`, render (was drawn as grey-green boards), dark roof, lower wall grey-brown | FINN 247003441 (drone photos 25, 26, 35), FINN 461130887 (photo 21, taken from the street at the zebra crossing), FINN 466013507 | colour: estimate; form: photographed |
| 1312240279, hus B | yellow-ochre render in the courtyard photos, balcony galleries towards the street, red Extra sign along its base | wall `#dcc487` (was khaki `#b6a26b` from the sales illustration) | FINN 461130887 (photo 22), FINN 247003441 (photos 26, 32, 34) | which of the two corner buildings is hus B in the drone photos is judged from the footprints; colour estimate |
| 1383932240, Odd Husbys veg 6A, 6B, 8 | warm beige render, four floors over terraces behind low concrete walls, bus shelter at the kerb, olive-grey wing at the west end | wall `#d6c9b6`, four storeys, render (was rust `#a8695a`) | FINN 464171086 (photo 3), FINN 473864059 (photos 24, 25) | beige: seen; the olive wing is not drawn (position unknown) |
| 1383932241, Odd Husbys veg 4A-4M | long block of taupe-brown vertical timber, four floors stepping down, glass balconies, roof terraces, ground-floor terraces with timber screens | wall `#8d7a68`, vertical boards, four storeys (was cream with horizontal boards) | FINN 462751345 (photos 17-21; photo 20 is from the street) | seen |
| 191360366 (Anders Wigens veg 26-28), 191360336 (22), 1037053955 (24) | dark grey-brown vertical timber, flat roofs with light grey roofing, long balconies with white-grey rails, ground-floor terraces behind grey fences; built 2005-06 | wall `#766c60`, roof `#8e9190`, two storeys (were cream, three storeys) | 28: FINN 459746591 (photos 0, 9, 10, 19), DNB listing of 28H (photo 23); 22 and 24: by analogy (same estate and year, bolig.ai) | 28 seen; 22 and 24 by analogy |
| 89247086, Anders Wigens veg 1 (dentist) | low building, pale grey metal hip roof, brick walls | roof `#a2a7a9` (was black), brick | FINN 247003441 (photo 25) | seen |
| 191320567, 191320565, Uglagjerdet 1-7 | cream timber houses with horizontal boards, gabled dark roofs, red-painted fence along the gravel road | gabled, `#e8e0c8` boards, dark roof (were flat blocks) | FINN 451662725 (Uglagjerdet 7, photos 0, 32-35); Uglagjerdet 1-3 by analogy | no. 7 seen |
| 1163311167 (Uglagjerdet 11-19), 1163311168 (46-52) | three-floor terraces (2022), flat roofs, vertical timber in dark red, green and charcoal | three storeys, flat, charcoal with four panels of red, green, charcoal, red | Voll arkitekter, *Rekkehus på Dalgård* (illustrations), FINN 451662725 (photos 30, 32) | form and colours seen; which unit has which colour is not known |
| 191198604, 1037053286 (Odd Husbys veg 26, 26A) | dark grey vertical boards, blue-grey tile roof, white window frames | as seen | FINN 465103210 | seen |
| 191360330, 191360341, 1037053351, 191198626, 191198659, 191360421 | red-orange tile roofs | roof `#9a4a34` | Esri aerial photo, viewed | roof colour only |

Buildings without a record keep the seeded look (docs/junction-buildings.md). Not photographed: most houses on Granlivegen, Magnus Åldstedts veg,
Sigurd Hoels veg, Hans Aanruds veg, Bernt Lies veg and Olaf Bulls veg, the borettslag blocks at Dalgårdvegen 1 and Drivhusvegen 5 and 7, the
blocks east of the school. Olav Duuns veg only touches the 200 m zone at its eastern end (four buildings, no photo found).

## Sources searched

| Source | Result |
|---|---|
| FINN ads (`finn.no/realestate/.../ad.html?finnkode=`), found by searching the streets and addresses; also the ads of DNB Eiendom | Used: the codes above. Active ads in these streets were listed with `q=<street>`; some sold ads stay on FINN for months. Listings of other brokers (Eiendomsmegler 1, Partners) load their photos by script and could not be read. |
| Statens vegvesen Vegbilder (WFS, 2021-25) | Only county road 6650 (Byåsveien); its nearest image is 363 m from the school site. Municipal streets are not covered. |
| Wikimedia Commons | Nothing of these streets (only the school and the Byåsen school of 1964). |
| Mapillary, KartaView | Mapillary's API needs a token (HTTP 500 without); KartaView's API answers "restricted access". Not used. |
| Voll arkitekter, vollark.no | Illustrations of the 2022 terraces at Uglagjerdet. |
| bolig.ai | Year built of Anders Wigens veg 22-24 (2006). |
| Esri World Imagery | Viewed only; it shows the construction site of Odd Husbys veg 4 in 2023-24. |

## Street scene against the pictures

- **Lamps and trees along Odd Husbys veg** (added): the 2023-25 houses and the street are in OSM but not its lamps and trees. FINN 462751345
  (photo 20) and FINN 464171086 (photo 3) show tall galvanised lamps with one arm and rows of young rowans on the grass strip between the sidewalk and
  the houses. `add-dalgard-neighbourhood.py` adds 15 rowans (4.2 to 5.6 m) every 11 m and 5 lamps every 34 m along 164 m of the road, on the house side,
  7.6 m from the centre line (beyond the sidewalk). The stations are estimates (the data has no positions), the offset is from the photos. About 560
  triangles. `verify-dalgard-neighbourhood.mjs` checks them: off every carriageway, not in or beside a house.
- Street lamps elsewhere: OSM has 41 inside the zone, including four along Anders Wigens veg between the Dalgårdstunet corner and the school, which
  the photos show too. Kerbs, sidewalks and zebra crossings at the Dalgårdstunet corner agree with FINN 461130887 (photo 21) and
  FINN 247003441 (photo 26): crossing with a refuge, sidewalk on both sides.
- **Chain-link fences** (changed): the OSM chain-link fence way 463622207 (1.8 m) round the plot south of Dalgårdstunet, and every other `mesh` fence,
  was drawn as an opaque panel that hid the houses behind it from the road; FINN 461130887 (photo 21) shows a see-through fence there. `roadside.js`
  now draws a mesh fence as posts, a top and a bottom rail and a thin wire pair every 1.5 m (glass fences keep their panel): +1,472 merged triangles
  for the whole map. A photo | before | after sheet of this view: `scratchpad/dalgard/H/cmp-corner-sheet.jpg`.
- **Not changed, found:** (1) parked cars along the kerb of Anders Wigens veg beside the Extra building (photo 21) are not drawn (only driveways and car
  parks get cars). (2) Mature broadleaf trees (lime) along the east side of Anders Wigens veg near the zebra crossing (photos 21, 25, 26) are not in OSM and
  were not added: the positions cannot be told from the photos. (3) The aerial photo shows the Odd Husbys veg 4 site under construction in 2023-24; the
  buildings are drawn finished. (4) Dalgårdstunet hus A is drawn as one even five-storey slab; the photos show four storeys with balconies stepping back
  and a set-back fifth storey on part of it (the generic house builder has no stepped storeys).
- **Terrain.** The drawn ground is Kartverket's DTM1, which predates the 2023-25 building work. The photos show at the Dalgårdstunet corner a street
  at one level and a courtyard 2 to 3 m higher behind a ramp and steps, and a basement garage entrance towards Odd Husbys veg; the drawn ground has
  none of it, so the tall grey bases under the new blocks follow the DTM's slope and are not the real retaining walls. Not changed (the integrator is changing
  how house bases are drawn on slopes, `dist/houses.js`).

## Uncertain

Colours are estimates by eye from photographs taken in different light; walls in shade look darker. Storeys of the blocks are counted from the
facades. The match of a drone photo's buildings to OSM footprints is a judgement from the footprints and street layout. Everything on the back of
a building and every unit colour in the terraces is a guess. Trees and lamps on Odd Husbys veg are placed by rule, not surveyed.

## Pipeline

`add-dalgard-neighbourhood.py` runs last, after `add-roadside.py` (it edits `data.roadside.trees` and `data.street.lamps`, and records what it added
in `data.dalgardNeighbourhood` so that running it again replaces it). `fetch-dalgard-addresses.py` needs network and writes
`data/dalgard-addresses.json` (committed, so nothing else needs it).
