# Sofias biltur — Byåsen

Private static browser game. Touch-first Norwegian UI, on-rails driving with real branching roads and pauses at junctions. Main trip: Herlofsons veg 3A → parking access by Skjermvegen barnehage, about 3.1 km.

## Run

`npm install` then `npm run dev`. The published static entry point is `dist/index.html`. Dependencies used at runtime are bundled locally; there are no map or elevation requests from the player's browser. Vite is used only for development.

## Data and representation

- Road centre lines, building footprints, mapped business/school/kindergarten names: OpenStreetMap API extract, 24 September 2026, ODbL. Source bbox: `10.325,63.393,10.369,63.406`. Attribution is present in the UI. Derived data is in `dist/map.json`.
- Address coordinate: Kartverket address API, Herlofsons veg 3A.
- Terrain: Kartverket elevation API DTM1. 2,560 measured points in a 40 m grid. The same bilinear interpolation drives roads, terrain and vehicle altitude. The rendered terrain mesh samples that surface at 8 m intervals. Height precision is therefore limited by the 40 m source sampling, especially banks and driveways.
- Mapped buildings are extruded on their actual footprints. Storey counts are read if available; missing heights, colours, roofs and windows are stylized. Vegetation is procedural. These are not photogrammetric/faithful facade reconstructions.
- Google Maps driving directions were inspected to validate the primary route; Street View at the starting street was inspected for visual reference. No Google imagery is copied into the game.
- The game uses the physical kindergarten at Skjermvegen 78B. Municipal organizational contact information lists Adolf Andreassens veg 6, which is not used as the destination.
- Private driveways are scenery rather than route choices, except home/destination access. One-way streets are directed; destination-only roads have a route penalty. Map-boundary branches without a legal route back to the goal are not offered.

## Renderer

Three.js 0.170.0, MIT license in `dist/vendor/THREE-LICENSE.txt`. iPad uses WebGL2 with capped resolution, batched geometry, distance culling, and local shadows. If WebGL is disabled, a lower-resolution software 3D rasterizer provides a fallback. The cloud QA browser lacks WebGL; hardware rendering and physical iPad performance remain unverified.

## Validation

`node verify-game.mjs` runs the actual game state machine with a mocked renderer and DOM. It covers start, invalid choices, pause, complete 3 km route, victory, replay, and an alternate route. Browser UI start/choice/pause controls were checked with the software renderer. WebMCP is feature-detected; the cloud browser does not expose modelContext, so browser registration validation is unavailable.

## Rebuilding geographic data

Download the documented OSM bbox to `byasen.osm`, then run `python prepare-map.py` and `python fetch-terrain.py`. The terrain script uses the public Kartverket API with up to 50 points per request, 6 concurrent requests, and caches responses. Source downloads and transient cache files are ignored by Git. No API keys are needed.

## Roundabout controls
At each roundabout entry the game offers every exit that is not a blindvei once, numbered in travel order; if only one exit leads on, the car drives through the circle by itself. Direction arrows use the outgoing road relative to the approach, and no exit is visually recommended. Selecting an exit creates one continuous path through the directed OSM roundabout; speed is capped at 25 km/h inside the circle. “Angre rundkjøring” restores the last entrance, distance counter and choices, during or after the turn. Restart and arrival clear the undo point.

Run `node verify-roundabouts.mjs` for every mapped entrance and exit, including touch selection, pause, automatic traversal and undo.

## Driving and transit update · 26 September 2026

Free driving is available in settings: automatic acceleration up to 90 km/h, A/D or arrows to steer, Space to drift, Down/S to brake. Q and the recovery button snap to the nearest road with the tangent closest to the previous body heading, independently of OSM node order. The guided trip accelerates to 200 km/h between decisions.

The user-marked Ugla school through road uses OSM ways 1366229200, 89285927 and the southern portion of 89285932, connecting Per Sivles veg to Uglavegen without a decision for the school-yard spur. Existing OSM building footprints remain approximate extrusions.

OSM bridge/layer tags are retained for Gråkallbanen. Munkvoll bridge 14012126 over Byåsveien/Fv6650 has a grey steel deck, railings, concrete abutments and roadside V supports based on the supplied Street View image. Deck height and approach banks are visual estimates, constrained to clear the road; the terrain grid does not survey bridge geometry. The other mapped tram bridge is also elevated. Bus shelters follow their nearest road tangent with the open side toward the kerb; their entire footprint is outside neighbouring carriageways.

`node verify-transit.mjs` checks bridge clearance/approach continuity, all 19 bus shelters and both directions through Ugla. `node verify-free-drive.mjs` checks recovery orientation in both directions and node orders, speed, drift and collisions. Local software renders check the scene; physical iPad/WebGL appearance remains unverified.

## Junction scenery · 27 September 2026

See `docs/junction-references.md` and `docs/junction-photo-matches.json` for scope and provenance. All mapped branching junctions receive a nearby detail pass; 24 footprints have new photo-informed overrides. This is not complete photographic reconstruction of every intersection. Run `node verify-junction-buildings.mjs` for footprint/roof validation.

## Blindveier · 28 September 2026
Dead ends are no longer offered as choices. A road counts as a blindvei when neither the kindergarten nor home can be reached from it without turning around or driving back through the same junction; this includes no-through residential loops and roads that end at the map edge. Home and the kindergarten entrance stay selectable. When only one road is left, for example a right turn where straight ahead is a blindvei, the car drives on by itself. The main trip now has 17 choices instead of 26.

Run `node verify-dead-ends.mjs` to explore every junction reachable from home and check that no offered road is a dead end.
