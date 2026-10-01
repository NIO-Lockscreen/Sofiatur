# Junction by junction check of the buildings (30 September 2026). Writes docs/junction-buildings.md (the table) from dist/map.json,
# data/matrikkel-bygningspunkt.json and the findings recorded in junction_findings.py.
#
#   python3 audit-junction-buildings.py            print the numbers
#   python3 audit-junction-buildings.py --write    write docs/junction-buildings.md
#
# Junctions are the nodes of the drivable network where three or more roads meet (or a roundabout, or the start), the same set as
# createJunctionBuildings() in dist/junction-buildings.js: 217. For each, the footprints within 60 m of the node are compared
# with Matrikkelen (Kartverket's building register, CC BY 4.0): registered buildings without an OSM footprint ("no footprint before"),
# how many of them the game still lacks ("now": add-buildings.py), buildings where the register and OSM disagree on the kind
# (house, semi-detached, terrace, block, garage), roofs judged by eye on the aerial photo (dist/building-details.js) and the
# photo-matched buildings of the earlier passes.
import json,math,sys,collections,heapq,subprocess
from pathlib import Path
from building_lib import type_class,osm_class,inside,seg_dist,centre
from junction_findings import FINDINGS,GENERAL,GENERAL_INTRO

D=json.loads(Path('dist/map.json').read_text());MK=json.loads(Path('data/matrikkel-bygningspunkt.json').read_text())['rows']
nodes=D['nodes'];out=collections.defaultdict(list)
for e in D['edges']:out[e['from']].append(e)
J=[n for n,es in out.items() if len({e['to'] for e in es})>2 or any(e.get('roundabout') for e in es) or n==D['start']]
names={}
for n in J:
    c=collections.Counter()
    for e in out[n]:
        if e['name'] and e['name']!='Lokalvei':c[e['name']]+=1
    names[n]=' / '.join(k for k,_ in c.most_common(3)) or 'Lokalvei'
# the main trip: cheapest path home to the kindergarten by the game's edge costs
def path(a,b):
    dist={a:0};prev={};q=[(0,a)]
    while q:
        d,n=heapq.heappop(q)
        if n==b:break
        if d>dist[n]:continue
        for e in out[n]:
            nd=d+e.get('cost',e['length'])
            if nd<dist.get(e['to'],1e30):dist[e['to']]=nd;prev[e['to']]=(n,e);heapq.heappush(q,(nd,e['to']))
    p=[b];es=[]
    while p[-1]!=a:n,e=prev[p[-1]];p.append(n);es.append(e)
    return p[::-1],es[::-1]
main_nodes,main_edges=path(D['start'],D['goal'])
main_pts=[nodes[n] for e in main_edges for n in e['path']]
stavset_names={'Odd Husbys veg','Byåsveien','Dalgårdvegen','Enromvegen','Nedre Stavsetvegen','Lysverkvegen','Kystadlia','Rittmestervegen'}
def route_of(n):
    p=nodes[n]
    if any(math.hypot(p[0]-q[0],p[1]-q[1])<25 for q in main_pts):return 'hovedtur'
    if p[1]>730 or any(e['name'] in stavset_names for e in out[n]) and p[0]<1500 and p[1]>380:return 'Stavset'
    return 'avstikker'

B=D['buildings']
def index(blist):
    cell={}
    for i,b in enumerate(blist):
        xs=[p[0] for p in b['p']];zs=[p[1] for p in b['p']]
        for cx in range(int(min(xs)//50),int(max(xs)//50)+1):
            for cz in range(int(min(zs)//50),int(max(zs)//50)+1):cell.setdefault((cx,cz),[]).append(i)
    return cell
def near_dist(blist,cell,x,z):
    best=1e9
    for i in {i for a in range(int(x//50)-1,int(x//50)+2) for c in range(int(z//50)-1,int(z//50)+2) for i in cell.get((a,c),[])}:
        p=blist[i]['p']
        if inside(p,x,z):return 0
        for k in range(len(p)-1):best=min(best,seg_dist(x,z,p[k],p[k+1]))
    return best
orig=[b for b in B if 'add' not in b]   # as prepare-map.py made them (before the OSM strips and additions)
oi=index(orig);ai=index(B)
# photo-matched or by-eye styled buildings, from the JavaScript style records
ids=json.loads(subprocess.run(['node','--input-type=module','-e',"import {buildingStyles as s} from './dist/building-details.js';import {junctionObservations as o} from './dist/junction-observations.js';console.log(JSON.stringify({eye:Object.entries(s).filter(([k,v])=>v.source==='aerial-esri-2026-09-30').map(([k])=>k),photo:[...Object.entries(s).filter(([k,v])=>v.source!=='aerial-esri-2026-09-30').map(([k])=>k),...Object.keys(o)]}))"],capture_output=True,check=True).stdout)
EYE=set(ids['eye']);PHOTO=set(ids['photo'])
rows=[]
for n in J:
    x,z=nodes[n];rec={'node':n,'x':round(x),'z':round(z),'name':names[n],'route':route_of(n)}
    near=[b for b in B if any(math.hypot(v[0]-x,v[1]-z)<60 for v in b['p'])]
    rec['footprints']=len(near)
    pts=[r for r in MK if math.hypot(r[1]-x,r[2]-z)<60 and r[4] in ('TB','FA','MB','MF')]
    rec['registered']=len(pts)
    rec['missing_before']=sum(1 for r in pts if near_dist(orig,oi,r[1],r[2])>6)
    rec['missing_now']=sum(1 for r in pts if near_dist(B,ai,r[1],r[2])>6)
    rec['mismatch']=[(b['id'],b['t'].get('building'),b['mk'][0]) for b in near if b.get('mk') and 'add' not in b and osm_class(b['t'].get('building'))!=type_class(b['mk'][0]) and osm_class(b['t'].get('building'))!='public']
    rec['eye']=sum(1 for b in near if b['id'] in EYE);rec['photo']=sum(1 for b in near if b['id'] in PHOTO)
    rec['osm_added']=sum(1 for b in near if b.get('add')=='osm');rec['mk_added']=sum(1 for b in near if b.get('add')=='matrikkel')
    rec['kinds']=dict(collections.Counter(f"{osm_class(t)}→{type_class(c)}" for _,t,c in rec['mismatch']))
    rows.append(rec)

def text(r):
    out=[]
    if r['osm_added']:out.append(f"{r['osm_added']} footprints were missing from the OSM extract (edge of its boxes) and are added from a new OSM download")
    if r['mk_added']:out.append(f"{r['mk_added']} registered buildings without a footprint are drawn from the register")
    if r['missing_now']:out.append(f"{r['missing_now']} registered points still have no footprint (forest, building sites, sheds in shade: not drawn)")
    if r['kinds']:out.append('register and OSM disagree on '+', '.join(f"{n}× {k.replace('→',' as ')}" for k,n in sorted(r['kinds'].items(),key=lambda kv:-kv[1])[:3])+'; the register wins')
    if r['eye']:out.append(f"{r['eye']} roofs re-coloured or re-shaped by eye on the aerial")
    return '; '.join(out) or 'Checked, nothing to change'
def sources(r):
    s=['Matrikkelen (Kartverket)']
    if r['osm_added']:s.append('OSM API 30.9.2026')
    if r['eye']:s.append('Esri aerial, viewed')
    if r['photo']:s.append(f"{r['photo']} listing/road photo matches of earlier passes")
    return ', '.join(s)

if '--write' not in sys.argv:
    print(len(J),'junctions;',collections.Counter(r['route'] for r in rows))
    print('registered buildings within 60 m:',sum(r['registered'] for r in rows),'| no footprint before',sum(r['missing_before'] for r in rows),'| now',sum(r['missing_now'] for r in rows),'| kind mismatches',sum(len(r['mismatch']) for r in rows))
else:
    json.dump(rows,open('/tmp/junction-rows.json','w'))
    tot=lambda k:sum(r[k] for r in rows)
    strips=collections.Counter()
    for b in B:
        if b.get('add')=='osm':
            cx,cz=centre(b['p'][:-1]);strips['west (x < -113)' if cx<-113 else 'east (x > 2083)' if cx>2083 else 'south-east (z > 720)' if cz>720 else 'other']+=1
    L=['# Junction buildings, 30 September 2026\n']
    L.append(GENERAL_INTRO.format(junctions=len(J),main=sum(1 for r in rows if r['route']=='hovedtur'),stavset=sum(1 for r in rows if r['route']=='Stavset'),detour=sum(1 for r in rows if r['route']=='avstikker'),
        registered=tot('registered'),before=tot('missing_before'),now=tot('missing_now'),mismatch=sum(len(r['mismatch']) for r in rows),
        osm=sum(1 for b in B if b.get('add')=='osm'),mk=sum(1 for b in B if b.get('add')=='matrikkel'),eye=len(EYE),photo=len(PHOTO),strips=', '.join(f"{k}: {v}" for k,v in strips.items())))
    L.append('## What was wrong, what was done\n')
    L.append('| Finding | Where | What was done | Source |\n| --- | --- | --- | --- |')
    for f in GENERAL:L.append('| '+' | '.join(f)+' |')
    L.append('\n## Junction by junction\n')
    L.append('Position in local metres (x east, z south of home). Route: hovedtur = on the main trip from home to the kindergarten, Stavset = on the detour south to Stavset, avstikker = the other junctions of the network. Counts are within 60 m of the junction node. "Register" is the number of registered buildings (in use or finished); "No footprint" is how many of them had no OSM footprint within 6 m before and how many still have none.\n')
    L.append('| Junction | Position | Streets | Route | Footprints | Register | No footprint | What was wrong, what was done | Source |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for r in sorted(rows,key=lambda r:({'hovedtur':0,'Stavset':1,'avstikker':2}[r['route']],r['x'],r['z'])):
        note=FINDINGS.get(r['node'],'')
        L.append(f"| {r['node']} | ({r['x']}, {r['z']}) | {r['name']} | {r['route']} | {r['footprints']} | {r['registered']} | {r['missing_before']} → {r['missing_now']} | {note+(' ' if note else '')}{text(r)} | {sources(r)} |")
    Path('docs/junction-buildings.md').write_text('\n'.join(L)+'\n')
    print('wrote docs/junction-buildings.md',len(rows),'rows')
