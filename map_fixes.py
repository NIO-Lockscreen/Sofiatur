import collections


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
    for e in [e for e in data['edges'] if entrance in e['path'][1:-1]]:
        k = e['path'].index(entrance)
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
    data['edges'] += new


if __name__ == '__main__':
    # Apply to the built map in place (the terrain and everything else are kept as they are).
    import json
    from pathlib import Path
    path = Path('dist/map.json')
    data = json.loads(path.read_text())
    merged = merge_close_junctions(data['edges'])
    add_school_parking_spur(data)
    add_kiwi_parking(data)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    print(len(merged), 'junction links merged:', merged)
