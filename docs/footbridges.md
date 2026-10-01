# Footbridges and underpasses: sources and what is approximate

Local coordinates: metres east (x) and south (z) of home. `add-footbridges.py` reads `byasen.osm` (OSM API, 24 and 28 September 2026,
© OpenStreetMap contributors, ODbL) and adds the key `footbridges` to `dist/map.json`; `dist/footbridges.js` draws it. The data holds
plan only: no heights. A deck, a ramp or a dip is placed from what the game draws (`surface.heightAt` for the road, `surface.groundTop`
for the ground as it is seen), so it follows the road and the terrain if they change. Nothing here is surveyed on site.

## What is read

Ways `highway=footway|cycleway|path` with `bridge=yes` (deck) or `tunnel=yes|culvert` (underpass) in the map region, and the mapped
`highway=steps` that start on a deck or on the way up to it.

| OSM way | what | drawn as |
|---|---|---|
| 191325644 | footbridge over Byåsveien at Rema 1000 Stavset, 39 m, steps 1319298906 at its north end | deck over the road, 1:10 ramps, the mapped steps |
| 191325643 | cycleway tunnel under Byåsveien at the Stavset roundabout, 24 m | culvert, trenches to the mouths, portals |
| 101187272 | cycle bridge beside Kystadbrua, 106 m | a deck of its own, level with the road bridge |
| 35086814 | cycle bridge beside Dalgårdbrua, 191 m | the same |
| 289753479, 289753482, 289753483, 1410709998 | small timber bridges (4 to 5 m) on Uglabekkstien and by Lianvannet | deck, rails, abutments |
| 112895868, 1152629239, 160676278, 24575918 | underpasses at Dalgård, on Odd Husbys veg, at Gamle Oslovei's south end and on Dalgårdsveien | as the one at Rema |

Not drawn, and why: 853226902 (a footbridge that OSM puts under the deck of Kystadbrua, in the valley: the road bridge hides it);
1005065718 (a path bridge 9 m south of the map's south edge, outside the map); 1375965342 (a bridge on a lawn that joins no path);
1365577818 to 1365577823 and 1196545225 (a zigzag of steel stairs on a wooded slope, not a bridge); 1374270934 (2 m, under nothing
that is drawn); 963174403 (under a road that is left out of the game); 1368340660 (under the tram line, which the game draws as a
bridge itself); 23087067 (the path runs 2.5 to 3.5 m beside a road for 60 m after the tunnel: a trench would cut the road, so the
path ends at the road as before; `planTunnel` decides this from the drawn road, `blocked`). The `layer=-1` paths near Kystad
(101187198, 101187252, 154610008, 853226901) are ordinary paths in the valley under Kystadbrua and are drawn as paths.

**Statens vegvesen NVDB** (object type 60 *Bru*, NLOD, `nvdbapiles.atlas.vegvesen.no`, 30 September 2026): the footbridge is
*Stavset Gangbru*, a concrete slab bridge (*platebru*) of 1997, 37 m long, longest span 17 m, 4.34 m wide, owned by the municipality;
the underpass is *Stavset*, a cast concrete culvert under Byåsveien (FV6650) in a fill (*bru i fylling*), built 1988, 5.0 m wide.
These give the width of the deck (4.34 m) and the concrete. Nothing in NVDB gives heights of the ground or the underside, so the
clearance is the standard one.

Looks: the aerial photographs (viewed only, never copied: a concrete deck running diagonally over the road, the road in a cut under
it; the underpass under the road's retaining wall south-west of the roundabout) and Trondheim municipality's planning documents
(the footbridge west and the underpass east of Byåsveien at Stavset). A web search found no photograph of either. Colours, railings
and the lamp in the culvert are estimates.

## Footbridges

* **Deck.** A slab `DECK_T` 0.45 m thick, asphalt between concrete edge strips, a steel railing 1.15 m with a top rail and two lower
  rails, posts every 2 m. Width from NVDB (4.34 m) or by kind: cycleway 3.6 m, footway 2.6 m, path 2.0 m (timber).
* **Over a road** (`k: road`). The underside is `CLEARANCE` = 4.7 m over the highest drawn road surface under the deck (sampled at its
  centre and edges, and 1.5 m before and after), flat over the road and 2 stations on either side, then a straight ramp at 1:10 down to the path on
  the ground at each end. If the OSM way is too short for that, the deck goes on along the paths it joins (`a`, `b`: the way on for 80 m,
  only as much as is needed) and then straight on. Rema: 130 m in all, 15 m flat, ramps of 66 m (north) and 49 m (south).
  The end of a ramp is at the level of the path on the ground (path lift 0.24 m), so there is no step.
* **Supports.** Closed concrete sides where the deck is less than 1.6 m over the ground, else piers every 7.5 m: two columns
  under a cap beam, and a heavy pier (a wall the width of the deck) on each side of the road, at least 1.6 m from any carriageway.
* **Steps.** Mapped `highway=steps` that start on the deck's way: a flight of 16 cm risers from the deck's level down to the path at
  the other end of the OSM way, concrete, with rails and a gap in the deck's railing where it leaves. At Rema the drop is 3.7 m over 14 m.
* **Beside a road bridge** (`k: beside`). Its own deck next to the road bridge's, at the height of the road bridge's deck, moved
  out to clear the road bridge's edge beam, piers every 13 m where it stands high.
* **Timber bridges** (`k: span`). The two path levels joined, no steeper than 1:9, never under the ground, abutments at the ends.

## Underpasses

* **Culvert.** 4.4 m wide (cycleway; 3.2 m for a footway), 2.8 m clear, a 0.6 m roof slab, dark inside, a lamp every 6 m. Its floor is
  as high as it can be with the roof 0.14 m under the ground as it is seen (road, verges, ground) across the culvert's width, between
  the two OSM nodes of the tunnel way. At Rema that puts the floor 3.6 to 4.0 m under the ground at the mouths and 2.1 m of cover under the road.
* **The way down.** From each mouth the floor rises along the paths the way joins (the mapped `layer=-1` approach where there is one)
  at 1:10, or up to 1:8.3 where a road runs beside the path, until it is on the ground again (`p0`, `p1`): 37 and 27 m at Rema.
  The path on the ground beyond is drawn by this module (kept off the carriageways by `fitPath` from `street-details.js`, and cut where the road
  surface is), and `add-footbridges.py` cuts what it replaces out of `street.paths` (the first 70 m of the run-out, and other paths within 3.4 m of the first 50 m).
* **Trench.** Retaining walls 0.35 m thick at 2.2 m from the centre line, widening 0.9 m over the last 4 m before a mouth (the wing
  walls), with a coping 8 cm over the ground and a railing where the wall is higher than 1.1 m. The ground mesh has the trench cut out
  of it exactly: `cutGround` finds the two triangles of each 8 m cell of `world.js`'s ground by their corners on the lattice, takes
  them out of the bucket, and puts back what is left of them after taking away the trench's triangles, on the same plane.
  If the ground is ever built differently (`groundStep`, other vertices), the holes are not cut and the console says so.
* **Portal.** A headwall up to the ground: two pillars beside the opening and a lintel over it, the opening black.
* **Not built** where the trench would cut a road (`blocked`): the path then ends at the road, as before.

## Budget and the coupling to world.js

One line in `world.js` after the street details: `addFootbridges({data,surface:roadSurface,bucket,quad,box,index,segments:roadSegments})`.
It registers what it draws with `index` so that trees keep 1.5 m off the decks, ramps and trenches. The holes rely on the
ground being built as in `world.js` (8 m lattice, two triangles a cell, `bucket(x,z)` of the cell's corner); `verify-footbridges.mjs` builds such a ground and checks the cut.

`verify-footbridges.mjs` checks: the two crossings at Rema exist where OSM puts them; every deck is at least 4.2 m over the drawn road
under it (both the plan and the drawn quads) and over the ground; ramps, and the floors of the underpasses, are no steeper than 1:8
and steps are mapped ways with risers of at most 20 cm; decks end at the level of the path; the culverts' floors lie under the roads, with their ceilings
and roofs under them; no path, in `street.paths` or drawn here, lies on a carriageway or in a trench; the holes are cut and the
ground is otherwise unchanged; nothing stands within 1 m of a house; the trees keep off; triangles and time stay in budget.
