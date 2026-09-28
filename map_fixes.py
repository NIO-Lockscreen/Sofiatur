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


if __name__ == '__main__':
    # Apply to the built map in place (the terrain and everything else are kept as they are).
    import json
    from pathlib import Path
    path = Path('dist/map.json')
    data = json.loads(path.read_text())
    merged = merge_close_junctions(data['edges'])
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    print(len(merged), 'junction links merged:', merged)
