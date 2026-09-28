# Junction buildings · 27 September 2026

## Scope and fidelity

160 mapped branching/roundabout nodes plus the start were inventoried. 1,175 building footprints within 40 metres of those nodes receive extra joinery, window sashes/sills, corner boards, doors and roof edges. This is a **detail pass at all junctions, not photographic verification of every building**. The main kindergarten route has 26 choice stops. Public street imagery does not cover most municipal residential streets; some corner houses are hidden by trees.

24 individually matched building footprints receive new photo-informed styles. Source pages, individual image URLs, match confidence and limitations are in `junction-photo-matches.json`. Medium-confidence neighbour/campus matches are geographic inferences. Photos are used as references only, not shipped as textures. Unseen facades, window spacing, dimensions and most garden details remain stylised approximations.

## Specific changes

- Per Sivles 37 A/B: pale rendered lower mass, recessed brown timber rooftop volume and terrace balustrades. Three exposed lower tiers downhill plus a roof pavilion; not a uniform four-storey box. Per Sivles 2F: dark timber, shallow roof, pale lower wall and dark trim.
- Herlofsons 3B/3C: dark/white facade divisions and corrected black/red tiled roofs. Existing hand-modelled 3A and garage stay intact.
- Ugla school: low flat concrete entrance connector and flanking school wings, dark strip glazing, grey parapet, school lettering and clock. Exact wing heights and the courtyard are not fully established by the single entrance photograph. Auxiliary school buildings retain mapped/procedural treatment.
- Kristofer Uppdals 23 main house: cream timber and red roof. The address point for 23A falls in a garage; it was not incorrectly applied to that garage. This match is less certain because the original photo URL was not retained.
- General Bangs 28A/38, Arnt Smistads 27D and garage: individual timber colours, pitched roofs, floor counts and trim. General Bangs 38 source was re-downloaded successfully on 27 September after empty earlier downloads; its cream vertical timber and grey-brown tile are directly observed.
- Nordre Hallset 78: cream panels, orange roof and balconies. Hallset 91: corrected pale salmon bands and dark **hipped** roof. Yellow house/garage in the neighbouring aerial are medium-confidence matches.
- Konrad Dahls 2C/3A, Skavlans 5, Dalgård 5 and Vådan 4D: individual photo-supported palettes and roof forms. Vådan photo only establishes the balcony wall colour; no roof correction. Konrad Dahls 5C had no exterior image and receives no photo override.

## Rendering and map data

The OSM importer now retains roof direction/height/material and wall materials. A piecewise planar roof builder supports flat, gabled, hipped and skillion roofs on mapped footprints, including concave plans. No road choices, driving controls, car physics or terrain heights were intentionally changed.

## Verification

`verify-junction-buildings.mjs` checks coverage, known photo IDs and roof sealing/finite geometry for rectangular and concave plans. Full game and roundabout checks cover arrival, detours, driving modes and undo. Local software renders inspect the entrance neighborhood, school and representative junctions. No physical iPad/Safari test has been performed.

## Reference index

- **Konrad Dahls veg 2C** — OSM 188006431. https://partners.no/eiendom/148842 Match: high.
- **Konrad Dahls veg 3A** — OSM 1037053105. https://partners.no/eiendom/143743 Match: high for facade and roof shape; medium for level split.
- **Skavlans veg 5** — OSM 1036716127, 165650302. https://www.finn.no/realestate/homes/ad.html?finnkode=476583255 Match: high for primary and medium-high for paired half.
- **Dalgårdvegen 5** — OSM 191198736, 1037053973. https://www.finn.no/realestate/homes/ad.html?finnkode=422892172 Match: high for primary; medium-high for paired half.
- **Vådanvegen 4D** — OSM 191314912. https://www.eiendomsmegler1.no/boliger/mn-32260204 Match: high for visible wall; medium for whole-building colour.
- **General Bangs veg 28A** — OSM 221087517. https://dnbeiendom.no/bolig/Trøndelag/Trondheim/Vest/General-bangs-veg-28a/818250270 Match: high.
- **Arnt Smistads veg 27D** — OSM 221092498. https://visning.ai/arnt-smistads-veg-27d-7023-trondheim-451802105 Match: high.
- **Garage immediately beside Arnt Smistads veg 27D** — OSM 221092485. https://visning.ai/arnt-smistads-veg-27d-7023-trondheim-451802105 Match: medium.
- **Nordre Hallsetveg 78A apartment block** — OSM 89233415. https://visning.ai/nordre-hallsetveg-78a-7023-trondheim-450764625 Match: high.
- **Nordre Hallsetveg 91B apartment block** — OSM 186839677. https://www.finn.no/realestate/homes/ad.html?finnkode=467865489 Match: high.
- **Yellow detached house immediately west of Hallsetveg 91 block** — OSM 930791650. https://www.finn.no/realestate/homes/ad.html?finnkode=467865489 Match: medium.
- **Yellow garage southeast of yellow house west of Hallsetveg 91** — OSM 1036716294. https://www.finn.no/realestate/homes/ad.html?finnkode=467865489 Match: medium.
- **Per Sivles veg 37A/B** — OSM 709921162, 1037054461. https://www.eiendomsmegler1.no/boliger/mn-35260107 Match: high.
- **Per Sivles veg 2F** — OSM 188008377. https://www.eiendomsmegler1.no/boliger/mn-35230211 Match: high.
- **Herlofsons veg 3C** — OSM 187113248. https://www.finn.no/realestate/homes/ad.html?finnkode=460143047 Match: high.
- **Herlofsons veg 3B** — OSM 187113242. https://www.finn.no/realestate/homes/ad.html?finnkode=460143047 Match: medium-high.
- **Kristofer Uppdals veg 23 main house** — OSM 188007143. Previously retrieved local reference; original URL unavailable. Match: medium.
- **Ugla skole entrance and main block** — OSM 1037053662. https://www.trondheim.kommune.no/org/oppvekst/skoler/ugla-skole/ Match: medium.
- **Ugla school flanking wing** — OSM 89285924. https://www.trondheim.kommune.no/org/oppvekst/skoler/ugla-skole/ Match: medium.
- **Ugla school flanking wing** — OSM 1037053661. https://www.trondheim.kommune.no/org/oppvekst/skoler/ugla-skole/ Match: medium.
- **General Bangs veg38** — OSM 221087561. https://partners.no/eiendom/154218 Match: high.

## Detour junctions · 28 September 2026

Buildings around junctions that are only reached on detours, starting with a right turn at the first junction outside home (eight junctions on Herlofsons veg, Vetle Vislies veg, Kristofer Uppdals veg, Leikåsvegen and Uglavegen). Method: footprints within 40 m of each junction from the map data; addresses from Kartverket's address API (point search) placed in the footprints; each address looked up on hjemla.no for floors, construction year and the FINN code of its latest listing; the FINN listing's exterior and drone photos inspected and matched by address, house form, road and neighbours. Statens vegvesen vegbilder only cover county roads here (Byåsveien), not these municipal streets.

17 footprints in this pass have photo-informed styles: wall and roof colours, roof form and pitch, floors, cladding direction, trim, chimney, door colour. About 40 houses around the same junctions have no FINN listing found and keep the generic detail pass. Horizontal cladding now draws board joints in a darker shade of the wall instead of pale grey lines, which also affects the earlier matches with horizontal boards.

- **Herlofsons veg 9A** — OSM 187112145. https://www.finn.no/realestate/homes/ad.html?finnkode=162387839 Match: high.
- **Kristofer Uppdals veg 10** — OSM 188005884. https://www.finn.no/realestate/homes/ad.html?finnkode=142830992 Match: high.
- **Kristofer Uppdals veg 13C/D** — OSM 1037054342. https://www.finn.no/realestate/homes/ad.html?finnkode=387991136 Match: high.
- **Kristofer Uppdals veg 13A/B** — OSM 188007139. https://www.finn.no/realestate/homes/ad.html?finnkode=387991136 Match: medium.
- **Kristofer Uppdals veg 24A/B** — OSM 188005897. https://www.finn.no/realestate/homes/ad.html?finnkode=366328088 Match: high.
- **Kristofer Uppdals veg 27** — OSM 188005901. https://www.finn.no/realestate/homes/ad.html?finnkode=384849959 Match: high.
- **Kristofer Uppdals veg 29** — OSM 1469247249. https://www.finn.no/realestate/homes/ad.html?finnkode=145051269 Match: high.
- **Uglavegen 32A/B** — OSM 927828764. https://www.finn.no/realestate/homes/ad.html?finnkode=158276376 Match: high.
- **Uglavegen 32A/B** — OSM 1037054278. https://www.finn.no/realestate/homes/ad.html?finnkode=409598490 Match: high.
- **Uglavegen 32C** — OSM 188006432. https://www.finn.no/realestate/homes/ad.html?finnkode=147590794 Match: high.
- **Garage attached to Uglavegen 32C** — OSM 1037053262. https://www.finn.no/realestate/homes/ad.html?finnkode=147590794 Match: medium.
- **Uglavegen 37C** — OSM 187113239. https://www.finn.no/realestate/homes/ad.html?finnkode=147690999 Match: high.
- **Uglavegen 37B** — OSM 1037054279. https://www.finn.no/realestate/homes/ad.html?finnkode=384707717 Match: high.
- **Vetle Vislies veg 1** — OSM 923190359. https://www.finn.no/realestate/homes/ad.html?finnkode=149354923 Match: high.
- **Vetle Vislies veg 10** — OSM 187112201. https://www.finn.no/realestate/homes/ad.html?finnkode=355923397 Match: high.
- **Vetle Vislies veg 4A** — OSM 923190360. https://www.finn.no/realestate/homes/ad.html?finnkode=425286526 Match: high.
- **Vetle Vislies veg 4B** — OSM 1037054286. https://www.finn.no/realestate/homes/ad.html?finnkode=340140975 Match: high.
