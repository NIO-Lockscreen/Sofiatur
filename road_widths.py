"""Carriageway widths in metres by OSM way id, for the road data ("width" on each road in map.json, used by
roadWidth() in dist/transit-geometry.js; roads that are not listed keep the defaults there).

How they were measured (Junction audit, 29 September 2026). The Esri aerial photo (0.27 m per pixel) shows the whole
paved surface, sidewalk, verge and parking included, without kerb contrast, so it cannot give the carriageway on its
own: on Uglavegen, Gamle Oslovei, General Bangs veg, Arnt Smistads veg and Byåsveien, where cross-sections were
compared, the paved surface is 2-5 m wider than the value below, never narrower. The carriageway widths therefore
come from Statens vegvesen's road database (NVDB, open data
under NLOD): "Vegbredde, totalt" for municipal (KV/PV) roads, which the road owner has estimated in half-metre
steps, and "Vegbredde, beregnet" (computed from the road area, per 100 m) for Byåsveien (FV6650) and Bøckmans veg
(FV6656). The value of a way is the mean of the NVDB values along it, matched by position (within 5 m) and by street
name. Where NVDB and the aerial disagree it is said in a comment. Splitter-island carriageways and roundabout rings
are set from the aerial and the tags: one lane each, and the ring widths as noted.

Rebuild: `prepare-map.py` calls map_fixes.apply_road_widths(); nothing here needs a network."""

ROAD_WIDTHS = {
    # Roundabout rings
    '18661699': 8.2,  # ring at Lysverkvegen (NVDB FV6650 m4844-5324)
    '18911623': 8.3,  # ring at General Bangs veg / Arnt Smistads veg / Byåsveien (NVDB FV6650 m3399-3863)
    '22898628': 7.0,  # ring at Kystadlia: NVDB FV6650 m4365-4844 says 7.8 for the road; the ring is compact, and 7.8 lets the
                      # drawn ring overlap the steep splitter approach so that verify-road-height finds the car 11 cm low
    '176064583': 7.7,  # ring at Bøckmans veg / Byåsveien by Munkvoll (NVDB FV6650)
    '176064616': 8.2,  # ring at Stavset senter (NVDB FV6650 m5324-5787)
    '176064627': 6.5,  # KIWI ring (KV2020/KV2140/KV5410 6.0-6.8)
    '727900565': 6.4,  # ring on Byåsveien (NVDB FV6650 m2948-3399)
    '727900566': 7.5,  # ring on Byåsveien, no NVDB width there; the class value of a secondary road ring
    # Adolf Andreassens veg (KV1004)
    '24575743': 4.5,
    '1214632503': 4.5,
    # Alette Beyers veg (KV1009)
    '23496918': 6.4,
    # Anders Hovdens veg (KV1031)
    '18938064': 4.1,
    '18938095': 5.0,
    '1469314814': 5.0,
    # Anders Wigens veg (KV1037)
    '18938401': 6.5,
    # Arne Garborgs veg (KV1062)
    '17862623': 5.5,
    # Arnebyvegen (KV1058)
    '25015943': 5.0,
    # Arnt Smistads veg (KV1068)
    '5122253': 6.0,
    # Bekkefaret (KV1099)
    '35023290': 5.0,
    # Beret Anna Ophaugs veg (KV1111)
    '22726497': 5.4,
    # Bernt Lies veg (KV1126)
    '35023283': 4.5,
    # Bjørnebyvegen (KV1149)
    '18664049': 5.0,
    '173682802': 5.0,
    # Bragstads veg (PV8721)
    '25015944': 4.0,
    '1469752226': 4.0,
    # Brænnes veg (KV1020)
    '163742324': 5.4,
    '176871523': 3.9,
    # Byåsveien (FV6650)
    '22898260': 8.3,
    '22898473': 9.0,
    '22898627': 8.2,
    '22903314': 8.6,
    '23436735': 8.0,
    '23470466': 8.9,
    '23499965': 8.8,
    '23500237': 9.2,
    '23500239': 7.9,
    '156512394': 9.9,
    '1174714396': 8.5,
    '1174714397': 8.6,
    '1489801517': 9.3,
    # one-way carriageways beside splitter islands (a single lane each):
    '176064581': 4.5,
    '727900564': 4.5,
    '1099493492': 4.5,
    '1099493493': 4.5,
    '1099493494': 4.5,
    '1099493497': 4.5,
    '1099493498': 4.5,
    '1099493499': 4.5,
    '1424849189': 4.5,
    '1424849190': 4.5,
    '1424849194': 4.5,
    '1424849195': 4.5,
    '1443998967': 4.5,
    '1443998968': 4.5,
    '1443998969': 4.5,
    '1443998970': 4.5,
    '1443998971': 4.5,
    '1443998972': 4.5,
    '1443998975': 4.5,
    '1443998976': 4.5,
    # Bøckmans veg (FV6656)
    '697301988': 7.3,
    '1099493496': 6.1,
    # one-way carriageways beside splitter islands (a single lane each):
    '22903047': 4.0,
    '1099493495': 4.0,
    # Catharine Lysholms veg (PV1150)
    '35023273': 4.3,
    # Dalgårdbrua (FV6650)
    '22898259': 7.7,
    # Dalgårdvegen (KV8733)
    '17863893': 6.2,
    '1376170446': 6.5,
    # one-way carriageways beside splitter islands (a single lane each):
    '1368394281': 4.0,
    '1368394282': 4.0,
    # Dalstien (KV8734, PV8734)
    '35023280': 4.4,
    '1420490651': 3.5,
    # Enromvegen (KV1615)
    '23500236': 7.0,
    # one-way carriageways beside splitter islands (a single lane each):
    '18939310': 4.0,
    '23500238': 4.0,
    # Ferstadbakken (KV1740)
    '23436736': 5.0,
    # Finn Bergs veg (KV1760)
    '22796786': 4.0,
    # Freidigstien (KV1880)
    '163595863': 4.0,
    # Gabriel Scotts veg (KV1970)
    '160676275': 5.0,
    # Gamle Oslovei (KV2020)
    '2330774': 6.5,
    '112484574': 6.5,
    '226355577': 6.5,
    '697301989': 6.5,
    # one-way carriageways beside splitter islands (a single lane each):
    '709873316': 4.0,
    '709873317': 4.0,
    # General Bangs veg (KV2140)
    '5058124': 6.0,
    # one-way carriageways beside splitter islands (a single lane each):
    '709873314': 4.0,
    '709873318': 4.0,
    # Granlivegen (KV2310)
    '25725261': 4.5,
    '526429416': 4.5,
    # Hans Aanruds veg (KV2680)
    '22734301': 4.5,
    # Harald Langhelles veg (KV2730)
    '22796792': 5.0,
    # Havsteinekra (KV2801)
    '170049777': 5.0,
    '700193128': 5.0,
    # Henry Gleditsch veg (KV2875)
    '22796781': 5.0,
    # Herlofsons veg
    '20806746': 4.0,  # NVDB KV5880 m389-430: 4.0 (the same road system as Per Sivles veg)
    '1488489450': 4.0,  # the short way from Herlofsons veg to the start; the same gravel road
    # Inge Krokanns veg (KV3230)
    '87973705': 5.0,
    # Ivar Aasens veg (KV3280)
    '135207912': 5.5,
    # Ivar Mortensons veg (KV3270)
    '106278844': 5.0,
    # Jacob B. Bulls veg (KV3300)
    '106278845': 6.0,
    # Jens Tvedts veg (KV3400)
    '106278842': 4.5,
    # Jon Sivertsens veg (KV3520)
    '1262944235': 5.0,
    # Kaptein Mitlids veg (KV3630)
    '23087049': 4.5,
    # Konrad Dahls veg (KV3910)
    '18747533': 5.0,
    # Kristofer Uppdals veg (KV4030)
    '23484806': 4.5,
    # Kvernhusstien (KV4100)
    '5148133': 5.0,
    # Kystad allé
    '20807817': 4.3,  # NVDB KV4129 (spelled Kystad alle there): 4.3
    # Kystadbrua (FV6650)
    '22898263': 8.2,  # Kystadbrua: NVDB FV6650 Vegbredde totalt 8.2; the computed 9.9 includes the bridge kerbs
    # Kystadhaugen (KV4125)
    '106278846': 7.0,
    # Kystadlia (KV4128)
    '146500536': 7.5,
    # one-way carriageways beside splitter islands (a single lane each):
    '1443998973': 4.0,
    '1443998974': 4.0,
    # Kystadvegen (KV4130)
    '23525147': 4.5,
    '284525071': 4.5,
    '1442479221': 4.5,
    # Kyvannsvegen (KV4140)
    '5058126': 5.5,
    '1469159658': 5.5,
    # Laura Hangerås' veg (KV4252)
    '22898261': 5.0,
    # Litavegen (KV4428)
    '23500235': 5.5,
    # Lysverkvegen (KV4535)
    '18747091': 6.3,
    # Michel Grendahls veg (KV4820)
    '23087050': 6.0,
    # Midelfarts veg (KV4830)
    '23087051': 5.0,
    '617247452': 5.0,
    # Munkvollvegen (KV4930)
    '437188901': 4.5,
    # Nedre Ferstadveg (KV5080)
    '5148132': 4.5,
    '35023278': 4.5,
    '163742345': 4.5,
    # Nedre Stavsetvegen (KV5105)
    '23500234': 5.0,
    # Nils Uhlin Hansens veg (KV5195)
    '186297613': 6.0,
    # Nordre Hallsetveg (KV5310)
    '23496916': 5.5,
    # O.J. Aalmos veg (KV5435)
    '22898237': 7.0,
    '55379617': 7.0,
    # Odd Husbys veg (KV5410)
    '233587696': 6.8,
    # one-way carriageways beside splitter islands (a single lane each):
    '5048102': 4.0,
    '233587697': 4.0,
    '1424849191': 4.0,
    '1424849192': 4.0,
    # Ola Setroms veg (KV5440)
    '25725827': 5.8,
    '25725830': 5.0,
    # Olaf Bulls veg (KV5445)
    '22726364': 5.5,
    # Olaf Grilstads veg (KV5450)
    '5148134': 5.5,
    'olaf-grilstads-link': 5.5,
    # Olav Aukrusts veg (KV5470)
    '87973706': 5.1,
    # Olav Duuns veg (KV5480)
    '17923167': 5.5,
    # Olav Nygards veg (KV5520)
    '22899284': 4.8,
    # Ole Rølvaags veg (KV5580)
    '22898236': 5.0,
    # Oskar Braatens veg (KV5700)
    '18661787': 5.5,
    # Otto Skirstads veg (KV5750)
    '22796788': 5.0,
    '22796790': 5.6,
    # Overlege Bratts veg (KV5765)
    '32267393': 6.0,
    # Per Lykkes veg (KV5850)
    '22796785': 6.0,
    # Per Sivles veg (KV5880)
    '19799393': 6.5,
    '19799295': 3.5,  # NVDB KV5880 m0-389: 3.0 (an estimate); on the aerial a gravel track of about 3.5 m between the verges
    '1469314805': 3.5,  # as above
    '1469314806': 3.5,  # as above
    # Peter Wanviks veg (PV5920)
    '23484813': 4.0,
    # Pilegrimsstien (KV5950)
    '23484810': 4.0,
    # Rudolf Nilsens veg (KV6330)
    '18938868': 5.0,
    # Selsbakkvegen (KV6540)
    '22902689': 7.0,
    '24575912': 5.0,
    '93039000': 7.0,
    '1214625239': 7.0,
    # Sigrid Johansens veg (KV6590)
    '1270686640': 4.5,
    # Skavlans veg (KV6730)
    '23436731': 5.5,
    # Skjermvegen (KV6740)
    '23087068': 6.0,
    '1215115292': 6.0,
    # Solbakkestien (KV6910)
    '35023275': 4.0,
    # Stabells veg (KV6990)
    '22796867': 6.5,
    # Stampestien (KV7010)
    '23484808': 5.0,
    # Stolpstuvegen (KV7122)
    '23525144': 6.0,
    # Storhaugstien (KV7130)
    '23484812': 4.6,
    # Uglabakken (PV7802)
    '366664992': 4.0,
    # Uglagjerdet (KV7805)
    '23436730': 4.0,
    # Uglahaugstien (KV7810)
    '5148131': 4.0,
    # Uglamarkstien (KV7820)
    '23484805': 4.5,
    # Uglavegen (KV7830)
    '5058125': 6.0,
    '1469159659': 5.6,
    # Underhaugsvegen (KV7860)
    '221087501': 4.0,
    # Vegmesterstien (KV8030)
    '23436733': 5.5,
    '1550495366': 5.5,
    # Vestmarkbakken (KV8105)
    '18747647': 5.0,
    # Vetle Vislies veg (KV8120)
    '19378629': 4.5,
    '1469175087': 4.5,
    # Vilhelm Krags veg (KV8170)
    '22898239': 5.0,
    # Vognhallvegen (KV8250)
    '48534646': 6.0,
    # Vådanvegen (KV8300)
    '432708309': 6.0,
    # William Farres veg (KV8200)
    '23436732': 4.5,
    # Øvre Ferstadveg (KV8470)
    '35023276': 4.0,
    # Øvre Stavsetvegen (KV8495)
    '23525143': 5.3,
    '1365577817': 5.3,
}
