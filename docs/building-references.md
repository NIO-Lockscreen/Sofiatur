# Building references — 25 September 2026

The game reconstructs stylised geometry; it does not display or distribute source photos. Footprints and local coordinates are from the existing OpenStreetMap extract. Heights, facade proportions and window placements are visual estimates, not surveyed measurements. Buildings outside the observations below remain procedural approximations. This update does not claim street-photo coverage of all Byåsen.

## KIWI Dalgård, Drivhusvegen 2

OSM building 526443228; parking polygon 526443211. Local building centre approximately (815,194).

Reference: NorgesGruppen's official aerial photograph, published with its 7 September 2017 opening article:
https://www.norgesgruppen.no/presse/nyhetsarkiv/aktuelt/kiwi-apner-norges-gronneste-butikk/
Image: https://www.norgesgruppen.no/globalassets/vare-fokusomrader/riktigere-ressursbruk/kiwi-dalgard-hovedbilde2.jpg
Location checked against: https://www.norgesgruppeneiendom.no/prosjekter/dalgaard-byaasen-i-trondheim/

Observed: charcoal vertical cladding, silver flat roof, solar-panel array, green KIWI signs and diagonal green accents, upper glazing towards the street, tall entrance glazing towards the parking side. Model uses the existing trapezoidal footprint, two authored text signs, solar array and mapped surface parking. The historical photograph is a design reference, not confirmation of every present-day detail.

## Statens vegvesen road photos, 14 July 2025

Public viewer: https://vegbilder.atlas.vegvesen.no/
Metadata service: https://ogckart-sn1.atlas.vegvesen.no/vegbilder_1_0/ows
Layer: vegbilder_1_0:Vegbilder_2025.
Stable image URL: https://vegbilder-proxy.atlas.vegvesen.no/proxy?id= followed by the URL-encoded feature ID below. Temporary signed download URLs are deliberately not retained.

| Observation | Feature ID | Details used |
| --- | --- | --- |
| Selsbakkvegen looking west | Vegbilder_2025.2025-07-14T10.10.26_FV06656_S1D1_m02070_Planar_1 | Main Byåsen school: muted beige/brown brick, two levels, flat roof. |
| Selsbakkvegen looking east | Vegbilder_2025.2025-07-14T10.11.32_FV06656_S1D1_m02052_Planar_2 | White timber apartment frontage, grey/taupe adjoining houses, dark pitched roofs. |
| East of school | Vegbilder_2025.2025-07-14T10.10.20_FV06656_S1D1_m02010_Planar_1 | Red/brown house north of road; white/cream houses and dark roofs. |
| West of school | Vegbilder_2025.2025-07-14T10.11.21_FV06656_S1D1_m02153_Planar_2 | Pale grey/sage commercial frontage, muted green/grey houses. |
| Munkvoll / west school frontage | Vegbilder_2025.2025-07-14T10.10.37_FV06656_S1D1_m02170_Planar_1 | White house with brown tiled roof. |
| Byåsveien northbound | Vegbilder_2025.2025-07-14T08.45.14_FV06650_S2D1_m03421_Planar_2 | Cream/light olive school building. |
| Byåsveien southbound | Vegbilder_2025.2025-07-14T09.11.14_FV06650_S2D1_m03442_Planar_1 | Pale cream/yellow-grey house west of road and grey-brown roof. |

Individual OSM feature IDs and observation-group names are recorded in `dist/building-details.js`. Positions were matched using camera coordinates, compass direction and adjacent footprint arrangement; these are visual interpretations. Road-photo coverage found here did not include Herlofsons veg or the KIWI site itself.

## Home

User-supplied views of Herlofsons veg 3A remain the reference: dark brown timber, charcoal gabled roof, white trims, garage, planted slope and stone wall. Overrides apply to OSM buildings 187113250 and 1037053935.

## Camera and rendering checks

`node verify-camera.mjs` tests pointer controls; existing `verify-game.mjs` and `verify-roundabouts.mjs` cover route completion, choice pauses, roundabout traversal and undo. A local Node canvas render also checks finite scene geometry and visually inspects KIWI/signs and the Selsbakkvegen frontage. This is not a physical iPad Safari test.

## Focused home and preschool revision — 25 September 2026

New landmark models replace the procedural treatment of the home, garage and preschool. Home and garage remain separate OSM footprints. Photo-observed changes: west-facing garage gable, low garage walls, wide timber door plus narrow side door, dark timber house, white roof edges, glazed west gable, timber balcony, small entrance gable and chimney. Door and window spacing, roof rise and elevations are estimates. The driveway apron now connects to the garage; a curved stone edge and shrubs sit on its downhill side. Two nearby house colours are interpreted from the supplied downhill street photo: OSM 187112208 (Herlofsons veg 2C, brown opposite the drive) and 188005702 (dark downhill house). These neighbour matches are less certain than the user's own house.

### Preschool primary reference

Trondheim municipality's facade photograph:
https://www.trondheim.kommune.no/org/oppvekst/barnehager/hallset-bhgr/skjermvegen-bhg/
https://www.trondheim.kommune.no/globalassets/10-bilder-og-filer/01-barnehager/barnehager-h-m/hallset-barnehager/bilder/img_01541-1.jpg

OSM 645815923 at Adolf Andreassens veg 6. Weathered natural timber cladding, two visible levels, flat roof, dark-framed windows, broad low porch roof and timber posts. These are now modelled on its stepped OSM footprint. Precise upper-floor setbacks and every doorway cannot be established from the available facade view. Porch paving and height are approximated, not a surveyed yard model. Arrival remains the existing mapped parking access; the road graph and terrain elevations were not changed.

### Buildings surrounding the preschool

EiendomsMegler 1 listing for Nordre Hallsetveg 89 A, FINN 472143645; exterior images 18 and 19 provide useful drone views of the neighbouring blocks and part of the preschool:
https://www.eiendomsmegler1.no/boliger/mn-35260196
https://www.finn.no/realestate/homes/ad.html?finnkode=472143645

| OSM ID | Building | Model correction |
| --- | --- | --- |
| 186841247 | Nordre Hallsetveg 89 A/B | White horizontal siding, three floors, tiled gable roof, south-facing balconies. |
| 186841219 | Nordre Hallsetveg 85 A/B | White horizontal siding, three floors, tiled gable roof, west-facing balconies. |
| 140872528 | Nordre Hallsetveg 87 | Light grey/white walls, four floors, dark flat roof. |
| 186839677 | Nordre Hallsetveg 91 A–C | Light walls and warm red tiled roof interpreted from neighbouring aerial view. |

Nylander &Partners listing for Nordre Hallsetveg 84 A, FINN 475194787, exterior images 3 and 31:
https://partners.no/eiendom/163586
https://www.finn.no/realestate/homes/ad.html?finnkode=475194787

OSM 89233508: muted rose/beige and terracotta entrance sections, three floors, tiled gable roof; 89233417 in the courtyard background: cream/buff balcony frontage and tiled roof. Both were previously generic flat-roof blocks. Balcony dimensions and facade subdivisions are stylised approximations.

DNB listing for Adolf Andreassens veg 2B:
https://dnbeiendom.no/bolig/Tr%C3%B8ndelag/Trondheim/Vest/Adolf-andreassens-veg-2b/818250431

The public balcony photograph confirms light/white timber frontage for OSM 186841243. It does not document every elevation of that block; no claim of full reconstruction is made.

Mapped parking polygon 1323632156 is surfaced explicitly. Random full-size trees are excluded from the home forecourt, preschool porch area and the photographed lawn/parking courtyard. Sources were inspected as references only; original photographs are not bundled in the published game.
