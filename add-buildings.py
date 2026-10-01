# Missing buildings (30 September 2026): adds building footprints that the OSM extract behind dist/map.json lacks, and notes
# from Matrikkelen (the official building register) what each building is. Run after prepare-map.py and the other add-*.py
# (pipeline order: prepare-map.py, add-lakes.py, add-dalgard.py, add-stavset.py, add-street-details.py, add-buildings.py).
# Running it again replaces what it added (buildings marked "add") and changes nothing else.
#
#   python3 add-buildings.py            use data/osm-extra-buildings.json (committed) and data/building-additions.json
#   python3 add-buildings.py --fetch    download the OSM strips again first (OSM API, no key)
#
# 1. OSM strips. prepare-map.py reads byasen.osm, which fetch-osm.py built from three boxes; the game shows buildings out
#    to x -220..2220, z -700..820 (local metres), wider than the boxes. Strips with no OSM data at all (plus buildings just outside the Stavset and Lianvannet cut, beside roads that lie inside it): x -220..-113 (west
#    edge of the first box), x 2083..2220 (east edge, round the kindergarten), z 720..820 east of x 1253 (between the first
#    box and the southern one), and z -700..-350 west of x -113. OSM_BOXES below cover them; the building ways (and the
#    few building multipolygons, as their outer ring) found there go to data/osm-extra-buildings.json and from there
#    into dist/map.json. OpenStreetMap contributors, ODbL, downloaded 30 September 2026.
# 2. Matrikkelen. fetch-matrikkel.py writes data/matrikkel-bygningspunkt.json (Kartverket, CC BY 4.0): one point per registered
#    building with its type and number of dwellings. audit-buildings.py lists the points with no OSM footprint near them; the
#    ones that a look at the aerial photo (viewing only) showed to be real houses, garages or blocks are in
#    data/building-additions.json with the registered type; this script draws each as a rectangle of the typical size of that type,
#    turned like the nearest neighbour, centred on the register's point. Not surveyed outlines: the point, type and orientation
#    are real, the exact corners are not. Those buildings carry "add":"matrikkel" and the bygningsnummer in "ref".
# 3. "mk": [bygningstype, dwellings] on buildings where Matrikkelen says more than OSM does (terraces and flats: number of
#    dwellings; buildings tagged building=yes: the registered type). houses.js uses it for doors per dwelling, storeys of
#    blocks and the kind of building.
import json,math,subprocess,sys,xml.etree.ElementTree as ET
from pathlib import Path
from map_fixes import in_added
from building_lib import type_class,osm_class,inside,centre

OSM_BOXES=['10.3685,63.3915,10.3765,63.4065',  # east: x 2059..2458
           '10.3520,63.3915,10.3690,63.3936',  # south-east: z 694..820 east of the southern box
           '10.3210,63.3915,10.3256,63.4065',  # west: x -300..-75
           '10.321,63.3858,10.3525,63.3935',   # the southern box of fetch-osm.py again: houses just outside the Stavset polygon (map_fixes.SOUTH)
           '10.3195,63.3978,10.3262,63.4025']  # the Lianvannet box of fetch-osm.py again: houses just outside map_fixes.WEST
RELATIONS=['13884651','20573247','20821136','20821140']  # building multipolygons the importer dropped (outer ring only)
TAGS=['building','building:levels','building:material','building:facade:material','height','name','roof:shape','roof:colour','roof:direction','roof:height','roof:levels','roof:material','roof:angle','building:colour','amenity','shop']
M=Path('dist/map.json');EXTRA=Path('data/osm-extra-buildings.json');ADD=Path('data/building-additions.json');MK=Path('data/matrikkel-bygningspunkt.json')
D=json.loads(M.read_text());lon0,lat0=D['origin'];sx=111320*math.cos(math.radians(lat0));sz=111320
def local(n):return [round((float(n.attrib['lon'])-lon0)*sx,2),round((lat0-float(n.attrib['lat']))*sz,2)]
def api(url):
    return subprocess.run(['curl','-sS','--fail','--max-time','300',url],capture_output=True,check=True).stdout
ROAD_POINTS=[tuple(v) for v in D['nodes'].values()]
def near_road(cx,cz,r=70):
    return any(abs(x-cx)<r and abs(z-cz)<r and math.hypot(x-cx,z-cz)<r for x,z in ROAD_POINTS)
def in_game(p):
    # the game area as prepare-map.py cut it, and what stands within 70 m of a drivable road just outside it (the cut runs along the
    # Stavset and Lianvannet polygons, leaving gaps beside roads that lie inside them)
    cx,cz=centre(p);return (-220<cx<2220 and -700<cz<820) or in_added(cx,cz) or near_road(cx,cz)

def fetch():
    buildings={}
    roots=[ET.fromstring(api('https://api.openstreetmap.org/api/0.6/map?bbox='+b)) for b in OSM_BOXES]+[ET.fromstring(api('https://api.openstreetmap.org/api/0.6/relation/%s/full'%r)) for r in RELATIONS]
    for root in roots:
        nodes={n.attrib['id']:local(n) for n in root.findall('node')};ways={w.attrib['id']:w for w in root.findall('way')}
        for w in ways.values():
            tags={x.attrib['k']:x.attrib['v'] for x in w.findall('tag')}
            ids=[n.attrib['ref'] for n in w.findall('nd')]
            if 'building' in tags and ids and all(i in nodes for i in ids) and len(ids)>3:
                p=[nodes[i] for i in ids]
                if in_game(p):buildings[w.attrib['id']]={'id':w.attrib['id'],'p':p,'t':{k:v for k,v in tags.items() if k in TAGS}}
        for rel in root.findall('relation'):
            tags={x.attrib['k']:x.attrib['v'] for x in rel.findall('tag')}
            if 'building' not in tags:continue
            for m in rel.findall('member'):
                if m.attrib['type']=='way' and m.attrib['role']=='outer' and m.attrib['ref'] in ways:
                    ids=[n.attrib['ref'] for n in ways[m.attrib['ref']].findall('nd')]
                    if all(i in nodes for i in ids) and len(ids)>3:
                        p=[nodes[i] for i in ids];bid='r'+rel.attrib['id']
                        if in_game(p) and bid not in buildings:buildings[bid]={'id':bid,'p':p,'t':{k:v for k,v in tags.items() if k in TAGS}}
    out={'source':'OpenStreetMap contributors, ODbL, OSM API 0.6, downloaded 2026-09-30; building ways and multipolygon outer rings inside the game area that the first extract lacks','boxes':OSM_BOXES,'relations':RELATIONS,'buildings':sorted(buildings.values(),key=lambda b:b['id'])}
    EXTRA.parent.mkdir(exist_ok=True);EXTRA.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
    print('fetched',len(out['buildings']),'building footprints from OSM')

def rectangle(x,z,length,width,angle):
    c,s=math.cos(angle),math.sin(angle)
    pts=[(-length/2,-width/2),(length/2,-width/2),(length/2,width/2),(-length/2,width/2)]
    p=[[round(x+u*c-v*s,2),round(z+u*s+v*c,2)] for u,v in pts];p.append(p[0]);return p

def apply():
    if not EXTRA.exists():fetch()
    extra=json.loads(EXTRA.read_text())
    D['buildings']=[b for b in D['buildings'] if 'add' not in b]
    have={b['id'] for b in D['buildings']};added={'osm':0,'matrikkel':0}
    for b in extra['buildings']:
        if b['id'] not in have:D['buildings'].append({**b,'add':'osm'});have.add(b['id']);added['osm']+=1
    mk=json.loads(MK.read_text())['rows'] if MK.exists() else []
    if ADD.exists():
        for a in json.loads(ADD.read_text())['buildings']:
            bid='m'+str(a['ref'])
            if bid in have:continue
            p=[*a['polygon'],a['polygon'][0]] if 'polygon' in a else rectangle(a['x'],a['z'],a['length'],a['width'],math.radians(a['angle']))
            tags={'building':a['building'],**({'building:levels':str(a['levels'])} if a.get('levels') else {}),**({'roof:shape':a['roof']} if a.get('roof') else {})}
            D['buildings'].append({'id':bid,'p':p,'t':tags,'add':'matrikkel','ref':a['ref'],'mk':[a['type'],a.get('units',1)]});have.add(bid);added['matrikkel']+=1
    # Matrikkelen notes on the buildings of the map: the register point that falls inside a footprint
    cell={}
    for row in mk:cell.setdefault((int(row[1]//50),int(row[2]//50)),[]).append(row)
    noted=0
    for b in D['buildings']:
        if b.get('add')=='matrikkel':continue
        b.pop('mk',None)
        p=b['p'][:-1];cx,cz=centre(p);rows=[]
        for i in range(int(cx//50)-1,int(cx//50)+2):
            for j in range(int(cz//50)-1,int(cz//50)+2):
                rows+=[r for r in cell.get((i,j),[]) if inside(p,r[1],r[2]) and r[4] in ('TB','FA','MB','MF')]
        if not rows:continue
        units=sum(r[5] for r in rows);types=sorted({r[3] for r in rows})
        t=b['t'].get('building')
        if len(types)==1 and (units>1 or t in ('yes','residential','construction') or osm_class(t)!=type_class(types[0])):b['mk']=[types[0],units];noted+=1
    M.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
    print('added',added,'| Matrikkelen notes on',noted,'buildings | buildings now',len(D['buildings']))

if '--fetch' in sys.argv:fetch()
apply()
