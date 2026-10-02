import collections
import math

from road_widths import ROAD_WIDTHS

# South to Stavset (28 September 2026): Odd Husbys veg down to the roundabout at Stavset senter, and Byåsveien back
# north through the roundabouts at Lysverkvegen and Kystadlia, with the Kystad houses between them. Local metres
# (x east, z south of home); roads, buildings and areas in here are kept, south of the original box.
SOUTH = [(140, 730), (-30, 1017), (-110, 1161), (-130, 1250), (-130, 1470), (380, 1470), (700, 1360), (1100, 1110),
         (1200, 730)]


# West to Lianvannet (30 September 2026): Vetle Vislies veg down to the lake's east shore and Per Sivles veg back along
# it, with the houses and woods between them and the water (fetch-osm.py, west box). Local metres, as SOUTH.
WEST = [(-170, -260), (-340, -260), (-340, 130), (-170, 130)]
# The turning circle by the water where Vetle Vislies veg and Per Sivles veg end (OSM node 201496265): a place to drive
# to, where the car stops by the lake (prepare-map.py ends the edges there; game.js: the big duck).
LAKESIDE = '201496265'


def in_polygon(polygon, x, z):
    inside = False
    for (ax, az), (bx, bz) in zip(polygon[-1:] + polygon[:-1], polygon):
        if (az > z) != (bz > z) and x < (bx - ax) * (z - az) / (bz - az) + ax:
            inside = not inside
    return inside


def in_south(x, z):
    return in_polygon(SOUTH, x, z)


def in_added(x, z):
    """In one of the regions added outside the original box: south to Stavset, west to Lianvannet."""
    return in_polygon(SOUTH, x, z) or in_polygon(WEST, x, z)


def apply_road_widths(data):
    """Junction audit, 29 September 2026: put the carriageway width (m) from road_widths.py on every road of the map
    that has one ('width' on the road; dist/transit-geometry.js roadWidth() uses it, the class defaults apply to the
    rest). Returns how many roads got a width."""
    count = 0
    for road in data['roads']:
        width = ROAD_WIDTHS.get(str(road['id']))
        if width is not None:
            road['width'] = width
            count += 1
    return count


# Roundabouts: diameter (m) of the grass island, measured on the Esri aerial photo (the green area found by colour,
# checked by eye at 1:60), by the OSM ring way. The ring nodes in OSM lie 1-2.5 m further out than the middle of the
# carriageway (the mapper traced the outer part of the circle), so the game drew the islands 4-7 m too wide: Kystadlia
# and Lysverkvegen 15 m instead of 10 m, the KIWI roundabout 16 m instead of 12 m. The aerial is shifted about
# 1.3 m south-east of OSM everywhere (the island centres of all eight rings lie 0.3-1.3 m east and 0.1-1.7 m south of
# the ring centres), so only the radius is corrected here, not the centre.
ROUNDABOUT_ISLANDS = {
    '176064627': 12.0,  # KIWI Dalgård (Gamle Oslovei / General Bangs veg / Odd Husbys veg), ring was R 11.9
    '18911623': 10.0,   # General Bangs veg / Arnt Smistads veg / Byåsveien (1339, 324), ring was R 11.4
    '176064616': 22.0,  # Stavset senter, ring was R 16.1
    '18661699': 10.3,   # Lysverkvegen, ring was R 11.5
    '22898628': 10.0,   # Kystadlia, ring was R 11.4
    '176064583': 6.0,   # Bøckmans veg / Byåsveien at Munkvoll (Palermo), ring was R 8.9
    '727900565': 7.4,   # Byåsveien (1503, -215), ring was R 9.9
    '727900566': 13.4,  # Byåsveien (1547, -479), ring was R 14.0
}
KERB_BAND = .7  # the lighter kerb band drawn along both sides of every road (road-surface.js: width + 1.4 in all)


def fit_circle(points):
    """Least-squares circle (Kasa) through [(x, z), ...]: (centre x, centre z, mean radius). The centroid of the points is
    not the centre when they are unevenly spaced, as the nodes of a mapped roundabout are (the arms hang on some of them)."""
    n = len(points)
    mx = sum(p[0] for p in points) / n
    mz = sum(p[1] for p in points) / n
    suu = suv = svv = suuu = svvv = suvv = svuu = 0.0
    for x, z in points:
        u, v = x - mx, z - mz
        suu += u * u; suv += u * v; svv += v * v
        suuu += u ** 3; svvv += v ** 3; suvv += u * v * v; svuu += v * u * u
    det = suu * svv - suv * suv
    a = (.5 * (suuu + suvv) * svv - .5 * (svvv + svuu) * suv) / det
    b = (.5 * (svvv + svuu) * suu - .5 * (suuu + suvv) * suv) / det
    cx, cz = mx + a, mz + b
    return cx, cz, sum(math.hypot(x - cx, z - cz) for x, z in points) / n


def fit_roundabouts(nodes, ways):
    """Make each measured roundabout's ring a true circle of the measured size (Junction audit 29 September 2026, rounded
    up 30 September 2026): the centre is the least-squares circle through the ring nodes (not their centroid, which the
    uneven node spacing pulls 0.3-0.6 m off), the radius is the one that leaves the measured island inside the drawn ring
    (ring radius - half the drawn width - kerb band), and every ring node moves radially onto that circle, keeping its
    angle, so the arms that hang on the nodes keep their places and the exit order, arrows and choices are unchanged.
    nodes maps OSM node ids to dicts with 'x' and 'z' (local metres), ways is the list of OSM ways ({'id', 'ids', ...});
    the nodes are changed in place. Returns {way id: (old radius, new radius, old spread, centre shift)} where the spread
    is the largest minus the smallest distance of a ring node from the fitted centre before the fit."""
    result = {}
    for way in ways:
        island = ROUNDABOUT_ISLANDS.get(way['id'])
        if island is None:
            continue
        ring = way['ids'][:-1] if way['ids'][0] == way['ids'][-1] else way['ids']
        cx0 = sum(nodes[n]['x'] for n in ring) / len(ring)
        cz0 = sum(nodes[n]['z'] for n in ring) / len(ring)
        cx, cz, radius = fit_circle([(nodes[n]['x'], nodes[n]['z']) for n in ring])
        dist = [math.hypot(nodes[n]['x'] - cx, nodes[n]['z'] - cz) for n in ring]
        target = island / 2 + KERB_BAND + ROAD_WIDTHS[way['id']] / 2
        for n, d in zip(ring, dist):
            nodes[n]['x'] = cx + (nodes[n]['x'] - cx) * target / d
            nodes[n]['z'] = cz + (nodes[n]['z'] - cz) * target / d
        result[way['id']] = (round(radius, 2), round(target, 2), round(max(dist) - min(dist), 2), round(math.hypot(cx - cx0, cz - cz0), 2))
    return result


def merge_close_junctions(edges, limit=12):
    """Two junctions a few metres apart look like one junction on screen, but each asked on its own: at Gamle
    Oslovei the left turn up Kyvannsvegen was only offered 8 m after the junction where the car had stopped.
    The short link between such junctions stops being a choice. Each end offers the other end's roads directly
    instead; the car still drives through both points, and 'stub' marks where the road turns off, so its arrow
    points the right way. Returns the merged (from, to) links."""
    out = collections.defaultdict(list)
    for e in edges:
        out[e['from']].append(e)
    junction = lambda n: len({e['to'] for e in out[n]}) > 2
    ring = lambda n: any(e.get('roundabout') for e in out[n])
    links = [e for e in edges if e['length'] < limit and not e.get('roundabout') and not e.get('stub')
             and junction(e['from']) and junction(e['to']) and not ring(e['from']) and not ring(e['to'])]
    removed = {id(e) for e in links}
    next_id = max(e['id'] for e in edges) + 1
    added = []
    for s in links:
        for y in out[s['to']]:
            if y['to'] == s['from'] or id(y) in removed:
                continue
            c = {'from': s['from'], 'to': y['to'], 'path': s['path'] + y['path'][1:],
                 'length': round(s['length'] + y['length'], 2), 'name': y['name'],
                 'restricted': y.get('restricted', False), 'roundabout': False, 'id': next_id,
                 'stub': len(s['path']) - 1}
            if 'cost' in y:
                c['cost'] = round(s.get('cost', s['length']) + y['cost'], 2)
            next_id += 1
            added.append(c)
    edges[:] = [e for e in edges if id(e) not in removed] + added
    return [(s['from'], s['to']) for s in links]


def _edge(data, path, name, eid):
    pts = [data['nodes'][n] for n in path]
    length = round(sum(((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** .5 for a, b in zip(pts, pts[1:])), 2)
    return {'from': path[0], 'to': path[-1], 'path': path, 'length': length, 'name': name, 'restricted': False,
            'roundabout': False, 'id': eid, 'cost': round(length * 1.8, 2)}


def _next_id(data):
    return max(e['id'] for e in data['edges']) + 1


def _split_at(data, node, eid):
    """Split the edges that pass through node, so it becomes a junction. Returns the new second halves (ids from
    eid on); the first halves replace the original edges."""
    new = []
    for e in [e for e in data['edges'] if node in e['path'][1:-1]]:
        k = e['path'].index(node)
        second = dict(e, path=e['path'][k:], id=eid)
        eid += 1
        first = dict(e, path=e['path'][:k + 1])
        for part in (first, second):
            pts = [data['nodes'][n] for n in part['path']]
            part['length'] = round(sum(((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2) ** .5 for p, q in zip(pts, pts[1:])), 2)
            part['cost'] = round(e['cost'] * part['length'] / e['length'], 2)
            part['from'], part['to'] = part['path'][0], part['path'][-1]
        data['edges'][data['edges'].index(e)] = first
        new.append(second)
    return new


def add_school_parking_spur(data):
    """The Palermo traffic lights have a fourth arm: the service road north to the Byåsen skole parking (OSM way
    169742455). Service roads are left out of the road network, so the junction only had three roads; this adds the
    arm up to the parking, which makes left, straight on and right possible from every approach."""
    if any(e['name'] == 'Byåsen skole' for e in data['edges']):
        return
    road = next(r for r in data['roads'] if str(r['id']) == '169742455')
    junction = next(n for n, p in data['nodes'].items() if p == road['p'][0])
    path = [junction]
    for i, p in enumerate(road['p'][1:9], 1):
        n = f'skoleparkering-{i}'
        data['nodes'][n] = p
        path.append(n)
    eid = _next_id(data)
    data['edges'] += [_edge(data, path, 'Byåsen skole', eid), _edge(data, path[::-1], 'Bøckmans veg', eid + 1)]


def add_kiwi_parking(data):
    """KIWI Dalgård's customer parking (OSM 526443211), reached by Drivhusvegen from General Bangs veg just after the
    roundabout. General Bangs veg gets a junction at the entrance (OSM node 6673481580), and a short road leads to a
    parking place in the lot, where the game unlocks the KIWI paint."""
    if 'kiwi-parkering' in data['nodes']:
        return
    entrance = '6673481580'
    drive = next(r for r in data['roads'] if str(r['id']) == '526443225')
    # Drivhusvegen from its west end at General Bangs veg: (769,193) -> (771,196) -> (775,203) -> (781,208) -> (798,237)
    west = drive['p'][::-1]
    assert data['nodes'][entrance] == west[0]
    a, b = west[3], west[4]
    park = [round(a[0] + (b[0] - a[0]) * .4, 2), round(a[1] + (b[1] - a[1]) * .4, 2)]
    path = [entrance]
    for i, p in enumerate(west[1:4], 1):
        data['nodes'][f'kiwi-{i}'] = p
        path.append(f'kiwi-{i}')
    data['nodes']['kiwi-parkering'] = park
    path.append('kiwi-parkering')
    eid = _next_id(data)
    new = [_edge(data, path, 'KIWI', eid), _edge(data, path[::-1], 'General Bangs veg', eid + 1)]
    eid += 2
    # Split the General Bangs veg edges that pass the entrance, so it becomes a junction.
    new += _split_at(data, entrance, eid)
    data['edges'] += new


def add_ishall_parking(data):
    """Dalgård ishall at the end of Dalgårdvegen. Its car park is reached by a short service road (OSM 1368418204)
    and the parking aisle along the hall's west side (OSM 160676281). Service roads are not in the road network, so
    Dalgårdvegen gets a junction where the service road leaves it, and a road leads to a parking place in front of
    the hall, which the game treats as a place to go (offered even with blindveier hidden). The aisle is missing in
    the extract; add-dalgard.py adds it and then calls this."""
    roads = {str(r['id']): r['p'] for r in data['roads']}
    if 'ishall-parkering' in data['nodes'] or '160676281' not in roads:
        return
    access = roads['1368418204']  # (873,626) -> (877,622) -> (877,621)
    aisle = roads['160676281']    # (877,621) -> (881,610) -> (882,604) -> (887,589)
    entrance = next(n for e in data['edges'] if e['name'] == 'Dalgårdvegen' for n in e['path'][1:-1]
                    if data['nodes'][n] == access[0])
    assert abs(aisle[0][0] - access[-1][0]) + abs(aisle[0][1] - access[-1][1]) < .1
    a, b = aisle[2], aisle[3]  # the parking place: halfway along the hall's west side, in the middle of the car park
    park = [round(a[0] + (b[0] - a[0]) * .5, 2), round(a[1] + (b[1] - a[1]) * .5, 2)]
    path = [entrance]
    for i, p in enumerate(access[1:] + aisle[1:3], 1):
        data['nodes'][f'ishall-{i}'] = p
        path.append(f'ishall-{i}')
    data['nodes']['ishall-parkering'] = park
    path.append('ishall-parkering')
    eid = _next_id(data)
    new = [_edge(data, path, 'Dalgård ishall', eid), _edge(data, path[::-1], 'Dalgårdvegen', eid + 1)]
    new += _split_at(data, entrance, eid + 2)
    data['edges'] += new


def add_ludvig_parking(data):
    """Bøckmans veg 102 (2 October 2026, the user: "a visit to Ludvig"). The four dwellings 102A-D (Kartverket's address
    register: 102A (1824.6, 110.7), 102B (1813.2, 114.2), 102C (1798.6, 117.7), 102D (1791.0, 119.8)) stand just south of
    Bøckmans veg on the main trip, and OSM maps no driveway to them. A short drawn driveway (asphalt, 3 m) leaves Bøckmans
    veg at OSM node 8910717721 and ends in a parking place between the semi-detached 102A-B and the house 102C-D, where the
    game says "Du besøker Ludvig"."""
    if 'ludvig-parkering' in data['nodes'] or '8910717721' not in data['nodes']:
        return
    entrance = '8910717721'  # Bøckmans veg at (1804.7, 101.1)
    x, z = data['nodes'][entrance]
    points = [[round(x + .9, 2), round(z + 4.9, 2)], [round(x + 1.6, 2), round(z + 9.5, 2)]]
    data['roads'].append({'id': 'ludvig-innkjorsel', 'name': '', 'type': 'service', 'surface': 'asphalt', 'mark': False,
                          'width': 3.0, 'p': [[x, z], *points, [round(x + 1.95, 2), round(z + 11.8, 2)]]})
    _add_place(data, entrance, points, 'Ludvig', 'Bøckmans veg', 'ludvig')


def _add_place(data, entrance, points, name, back, prefix):
    """A road from the junction node entrance through points (local x, z) to a parking place at the last point, and
    back. entrance becomes a junction if it lies inside an edge."""
    path = [entrance]
    for i, p in enumerate(points[:-1], 1):
        data['nodes'][f'{prefix}-{i}'] = p
        path.append(f'{prefix}-{i}')
    data['nodes'][f'{prefix}-parkering'] = points[-1]
    path.append(f'{prefix}-parkering')
    eid = _next_id(data)
    new = [_edge(data, path, name, eid), _edge(data, path[::-1], back, eid + 1)]
    new += _split_at(data, entrance, eid + 2)
    data['edges'] += new


def add_rema_parking(data, coords, service, aisle):
    """Rema 1000 Stavset at Stavset senter. Its customer car park (OSM 89061200) lies in front of the shops and is
    reached from Nedre Stavsetvegen by the service road along the centre's east side (OSM 18939739) and a parking
    aisle that loops through the car park (OSM 89061191). Nedre Stavsetvegen gets a junction where the service road
    leaves it; the road follows the service road and the aisle round the loop to a parking place in front of Rema's
    entrance. coords maps the OSM node ids of both ways to local points."""
    if 'rema-parkering' in data['nodes']:
        return
    entrance = service[0]
    assert entrance in data['nodes'], 'Nedre Stavsetvegen passes the service road'
    joint = next(n for n in service if n == aisle[-1])  # the aisle's south end on the service road
    way = service[1:service.index(joint) + 1] + aisle[-2::-1]  # along the service road, then the loop backwards
    turn = way.index(aisle[2])  # the loop's west end, then east along the shop fronts
    a, b = coords[way[turn]], coords[aisle[1]]
    length = ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** .5
    park = [round(a[0] + (b[0] - a[0]) * 8 / length, 2), round(a[1] + (b[1] - a[1]) * 8 / length, 2)]
    _add_place(data, entrance, [coords[n] for n in way[:turn + 1]] + [park], 'Rema 1000', 'Nedre Stavsetvegen', 'rema')


def add_bunnpris_parking(data, coords, link, aisle):
    """Bunnpris Ugla's car park (OSM 207829382) lies between Odd Husbys veg and the shop. The mapped way in is from
    the end of Granlivegen: a short link (OSM 1364292850) and the aisle along the shop front (OSM 23390718). The road
    ends at a parking place in the aisle, in front of the canopy over the entrance."""
    if 'bunnpris-parkering' in data['nodes']:
        return
    end, joint = link[-1], link[0]
    assert end in data['nodes'] and aisle[-1] == joint, 'Granlivegen ends at the link into the car park'
    a, b = coords[joint], coords[aisle[-2]]
    park = [round(a[0] + (b[0] - a[0]) * .45, 2), round(a[1] + (b[1] - a[1]) * .45, 2)]
    _add_place(data, end, [coords[joint], park], 'Bunnpris', 'Granlivegen', 'bunnpris')
    # From 29 to 30 September 2026 a driveway also ran from the T-junction where Olav Duuns veg meets Odd Husbys veg
    # (OSM node 185588577) into the car park, along the mapped footway 455263297. There is no such way in; it is gone.


if __name__ == '__main__':
    # Apply to the built map in place (the terrain and everything else are kept as they are).
    import json
    from pathlib import Path
    path = Path('dist/map.json')
    data = json.loads(path.read_text())
    merged = merge_close_junctions(data['edges'])
    apply_road_widths(data)
    add_school_parking_spur(data)
    add_kiwi_parking(data)
    add_ishall_parking(data)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    print(len(merged), 'junction links merged:', merged)
