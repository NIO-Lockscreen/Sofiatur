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

### Second pass: the rest of the detour network

The same method for the remaining detour junctions, ordered by how many choices away from the fastest route they are: Per Sivles veg, Konrad Dahls veg and Olaf Grilstads veg around Myrahallen, Uglavegen, Leikåsvegen, Bragstads veg, Arnebyvegen, Ivar Aasens veg, Nordahl Griegs veg, Olav Duuns veg, Olav Aukrusts veg, Uglahaugstien, Uglagjerdet, Kvernhusstien and Nedre Ferstadveg (25 junctions). 58 listings were found for 69 footprints; 47 listings had usable exterior or drone photos, giving styles for 55 footprints. Listings with interior photos only (Olav Duuns veg 3B, Arnebyvegen 15A) were left out. Balconies are described below but not drawn, since the photos rarely show which side of the footprint they face; accent panels (for example the oiled-wood boxes on Per Sivles veg 7) are also left out, because the model can only paint a full band along every wall.

- **Leikåsvegen 8** — OSM 188005871. https://www.finn.no/realestate/homes/ad.html?finnkode=122262893 Match: medium.
- **Per Sivles veg 7E** — OSM 188008402. https://www.finn.no/realestate/homes/ad.html?finnkode=137663179 Match: medium.
- **Per Sivles veg 7C** — OSM 188008393. https://www.finn.no/realestate/homes/ad.html?finnkode=258056589 Match: medium.
- **Uglavegen 29D** — OSM 188006411, 1037054314. https://www.finn.no/realestate/homes/ad.html?finnkode=146159048 Match: high.
- **Konrad Dahls veg 15A** — OSM 188008369. https://www.finn.no/realestate/homes/ad.html?finnkode=155846468 Match: high.
- **Per Sivles veg 6B** — OSM 188008371. https://www.finn.no/realestate/homes/ad.html?finnkode=254489257 Match: high.
- **Uglavegen 30F** — OSM 927828760. https://www.finn.no/realestate/homes/ad.html?finnkode=303408677 Match: high.
- **Konrad Dahls veg 10** — OSM 188007938. https://www.finn.no/realestate/homes/ad.html?finnkode=312535705 Match: high.
- **Per Sivles veg 8B** — OSM 188008422. https://www.finn.no/realestate/homes/ad.html?finnkode=324982597 Match: high.
- **Uglavegen 31A** — OSM 188006398. https://www.finn.no/realestate/homes/ad.html?finnkode=341901171 Match: high.
- **Konrad Dahls veg 5** — OSM 188008372. https://www.finn.no/realestate/homes/ad.html?finnkode=353346521 Match: high.
- **Uglavegen 28C** — OSM 188006428. https://www.finn.no/realestate/homes/ad.html?finnkode=368881851 Match: high.
- **Per Sivles veg 23** — OSM 188007017. https://www.finn.no/realestate/homes/ad.html?finnkode=373286388 Match: high.
- **Ivar Aasens veg 4** — OSM 188007088. https://www.finn.no/realestate/homes/ad.html?finnkode=464970804 Match: high.
- **Konrad Dahls veg 7B** — OSM 927826924, 1037053384. https://www.finn.no/realestate/homes/ad.html?finnkode=90947573 Match: medium.
- **Olav Duuns veg 1A/1B** — OSM 191319148, 1037054015. https://www.finn.no/realestate/homes/ad.html?finnkode=432666996 Match: high.
- **Uglavegen 34** — OSM 187112157. https://www.finn.no/realestate/homes/ad.html?finnkode=226593716 Match: high.
- **Per Sivles veg 3A** — OSM 1037054290, 1037054288. https://www.finn.no/realestate/homes/ad.html?finnkode=230695035 Match: high.
- **Konrad Dahls veg 30B** — OSM 187113869. https://www.finn.no/realestate/homes/ad.html?finnkode=250871992 Match: high.
- **Uglavegen 42B** — OSM 173680399. https://www.finn.no/realestate/homes/ad.html?finnkode=252342308 Match: high.
- **Bragstads veg 2B** — OSM 1469752222. https://www.finn.no/realestate/homes/ad.html?finnkode=270143281 Match: high.
- **Olav Duuns veg 1D** — OSM 191319140. https://www.finn.no/realestate/homes/ad.html?finnkode=348180707 Match: high.
- **Vetle Vislies veg 3** — OSM 187112093. https://www.finn.no/realestate/homes/ad.html?finnkode=370296637 Match: high.
- **Leikåsvegen 2B** — OSM 927828762. https://www.finn.no/realestate/homes/ad.html?finnkode=371415363 Match: medium.
- **Bragstads veg 2A** — OSM 1469752223. https://www.finn.no/realestate/homes/ad.html?finnkode=376091969 Match: high.
- **Per Sivles veg 30** — OSM 188005903. https://www.finn.no/realestate/homes/ad.html?finnkode=76455005 Match: medium.
- **Bragstads veg 26A** — OSM 187112199. https://www.finn.no/realestate/homes/ad.html?finnkode=477195226 Match: medium.
- **Nedre Ferstadveg 44** — OSM 191320630. https://www.finn.no/realestate/homes/ad.html?finnkode=109049243 Match: high.
- **Nordahl Griegs veg 2A** — OSM 1037054445. https://www.finn.no/realestate/homes/ad.html?finnkode=139176542 Match: high.
- **Uglavegen 10B** — OSM 191319195. https://www.finn.no/realestate/homes/ad.html?finnkode=148157894 Match: high.
- **Uglahaugstien 19A** — OSM 191320636. https://www.finn.no/realestate/homes/ad.html?finnkode=192723019 Match: high.
- **Uglahaugstien 19B** — OSM 1037054331. https://www.finn.no/realestate/homes/ad.html?finnkode=258047168 Match: high.
- **Arnebyvegen 4A** — OSM 187112180, 1037053812. https://www.finn.no/realestate/homes/ad.html?finnkode=356145008 Match: high.
- **Uglavegen 20A** — OSM 188008385. https://www.finn.no/realestate/homes/ad.html?finnkode=356955251 Match: high.
- **Nordahl Griegs veg 4B** — OSM 191319200. https://www.finn.no/realestate/homes/ad.html?finnkode=360029652 Match: high.
- **Olav Duuns veg 16B** — OSM 1469325676, 1469325677. https://www.finn.no/realestate/homes/ad.html?finnkode=245430025 Match: high.
- **Olav Duuns veg 21** — OSM 191318188. https://www.finn.no/realestate/homes/ad.html?finnkode=286543544 Match: high.
- **Olav Aukrusts veg 16** — OSM 1469325670. https://www.finn.no/realestate/homes/ad.html?finnkode=353979479 Match: high.
- **Olav Duuns veg 14** — OSM 1469325674. https://www.finn.no/realestate/homes/ad.html?finnkode=354250969 Match: high.
- **Olav Duuns veg 25B** — OSM 191318157. https://www.finn.no/realestate/homes/ad.html?finnkode=308963444 Match: high.
- **Olav Duuns veg 25** — OSM 191318179. https://www.finn.no/realestate/homes/ad.html?finnkode=314019275 Match: high.
- **Olav Duuns veg 26A/26B** — OSM 188007924. https://www.finn.no/realestate/homes/ad.html?finnkode=465091733 Match: high.
- **Uglagjerdet 13** — OSM 1163311167. https://www.finn.no/realestate/homes/ad.html?finnkode=355180154 Match: high.
- **Uglahaugstien 6/8** — OSM 191320586, 1037053978. https://www.finn.no/realestate/homes/ad.html?finnkode=112842813 Match: high.
- **Uglahaugstien 2/4** — OSM 191320606, 1037053962. https://www.finn.no/realestate/homes/ad.html?finnkode=259752013 Match: high.
- **Kvernhusstien 7** — OSM 191364523. https://www.finn.no/realestate/homes/ad.html?finnkode=159689281 Match: high.
- **Nedre Ferstadveg 30** — OSM 455267653. https://www.finn.no/realestate/homes/ad.html?finnkode=305335394 Match: high.
