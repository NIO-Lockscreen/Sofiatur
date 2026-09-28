# Munkvoll and destination corrections · 25 September 2026

All additions are original stylised game geometry. Reference photos are not
redistributed as textures. Footprints/rail positions are OpenStreetMap ODbL;
terrain remains Kartverket DTM. Heights and facade details are visual estimates,
not an architectural survey or a guarantee of present-day conditions.

## User-provided references

- Marked map `image(20260925-131504).png`: remove apartment-access choices on
  Nordre Hallsetveg; continue to Adolf Andreassens veg, then use the short westbound
  kindergarten entrance. Goal is now local `[1856,260]`, not `[1823.36,287.17]`.
  The short entrance lane is missing from this OSM extract; its approximate line
  is traced from the user's map, explicitly tagged in `map.source.goal`.
- Garage photograph `image(20260925-132355).png`, Google Street View August 2020:
  two long grey garage rows along the east side of Adolf Andreassens veg; dark
  hipped standing-seam roofs, numbered grey sectional doors, pale bottom seals,
  small lamps. Applied to OSM 186841224 and 186841235. Door count and roof rise
  are visual approximations, while footprints are mapped.
- Kindergarten photograph `image(20260925-132431).png`, screenshot dated 2016:
  weathered vertical timber upstairs, darker warm timber downstairs, flat metal
  roof edge, large dark-framed upper windows, lower single-storey wing, continuous
  timber porch with posts/beams/gutters and broad low steps. Model's upper-storey
  footprint is estimated from this photo and the mapped outline.

## Munkvoll exterior imagery

- Palermo, Bøckmans veg 110: official address
  <https://palermotrondheim.no/kontaktinfo/>.
  Exterior photo gallery <https://restaurantguru.com/Palermo-Trondheim> and image
  <https://img02.restaurantguru.com/ca57-Restaurant-Palermo-Trondheim-exterior.jpg>.
  Observed grey vertical timber, taller main block, lower entrance/dining wings,
  dark tiled gables, green awning, black serif wordmark and access ramp.
  Applied to OSM 89233446. Photo dates unverified; logo is represented by text.
- Pizzabakeren Byåsen, Selsbakkvegen 2C: location
  <https://wolt.com/en/nor/trondheim/restaurant/pizzabakeren-bysen>.
  Exterior gallery <https://restaurantguru.com/Pizzabakeren-Trondheim> and image
  <https://img02.restaurantguru.com/c20b-Restaurant-Pizzabakeren-Byasen-exterior.jpg>.
  Small cream hut with red gabled roof/trim, glazed central door and windows,
  yellow/brown sign and gravel forecourt beside the tracks. OSM 186840391.
- Museum frontage (2 July 2023, Reinhard Dietrich, CC BY-SA 4.0):
  <https://commons.wikimedia.org/wiki/File:Stra%C3%9Fenbahnmuseum_Trondheim.jpg>.
  Dark vertical timber, pale corrugated pitched roof, repeated tall silver-framed
  glazed bays and white museum wordmark on dark sign. OSM 89233421.
- Old three-door hall (2 July 2023, Reinhard Dietrich, CC BY-SA 4.0):
  <https://commons.wikimedia.org/wiki/File:Wagenhalle_Museum.jpg>.
  Charcoal timber, white gable trim, red sliding doors numbered 11–13. OSM 89233428.
- Crossing (May 2013, Ezzex, CC BY-SA 4.0):
  <https://commons.wikimedia.org/wiki/File:Munkvoll_p%C3%A5_By%C3%A5sen,_Trondheim_(01).JPG>.
  Museum west of Selsbakkvegen, Palermo opposite, black/yellow overhead clearance
  bar, crossbucks, signal posts and a black-framed shelter. Old spatial reference;
  gantry and signal placement are approximate, not verified current equipment.
- Yard/spurs (25 August 2006, HuBar, CC BY-SA 2.5):
  <https://commons.wikimedia.org/wiki/File:Trondheim_tram_5.jpg>.
  Tracks are taken from the OSM extract, not guessed from the old photograph.

## Transit and NIO

31 OSM railway ways, including Munkvoll loop/switches/depot approaches; actual
gauge tags, paired steel rails, sleepers, overhead wires. 25 mapped bus/tram stop
points. Shelters are simplified visual props, not exact reconstructions of every
stop. They do not add driving prompts. Clearance equipment is decorative.

Original ET5 sedan model references the supplied black ET5 photo and NIO's own
Norwegian product page <https://www.eu.nio.com/no_NO/et5>, including Deep Black:
<https://cdn-udp-public.eu.nio.com/www-nio/cdn-static/mynio/nextjs/images/et5-refresh/colors/et5-exterior-colors-item-9-desktop.jpg>.
Nominal 4.79 m body, 1.96 m width, 2.888 m wheelbase, fastback/panoramic glass roof,
three roof sensor pods, flush handles, thin split DRLs, rear light ribbon,
ducktail and split-spoke wheels. Dimensions from NIO ET5 specification/owner
manual; model is a hand-built stylisation, not licensed manufacturer CAD.

## Verification

`verify-game.mjs`, `verify-roundabouts.mjs`, `verify-camera.mjs`, and
`verify-local-landmarks.mjs`. Local scene renders inspect initial house-facing
camera, ET5 front/rear, Munkvoll, garages and kindergarten. No physical iPad test.
