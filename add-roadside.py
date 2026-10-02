# Roadside (30 September 2026): the prominent things beside the roads that prepare-map.py leaves out, read from open data and added to
# dist/map.json as one key, `roadside` (dist/roadside.js draws it; sources, tags, counts and what is approximate: docs/roadside.md):
#   barriers   fences, hedges, walls, retaining walls, noise barriers and guard rails: OpenStreetMap (byasen.osm) plus Statens vegvesen's
#              road database NVDB (nvdb-roadside.json from fetch-nvdb.py), where NVDB agrees with OSM the OSM line is kept and takes
#              NVDB's height and material
#   ways       driveways, car park aisles, footpaths, paths, steps and tracks that are not drawn as roads or as sidewalks/cycleways
#   trees      individual trees: OSM natural=tree and tree_row, NVDB Trær (species, height); `forest`: OSM wood/forest/scrub areas;
#              `ar5`: forest and its type (coniferous/deciduous/mixed) in cells of 5 m, from NIBIO's AR5 (ar5-skog.json, fetch-ar5.py)
#   furniture  benches, bins, post boxes, recycling, picnic tables, bicycle stands, flagpoles, masts and pylons (OSM, NVDB)
#   parking    car parks that are not drawn yet; playgrounds come from the areas of the map
# Run after add-street-details.py (it needs `street` to leave the sidewalks and cycleways alone); running it again replaces `roadside`.
# Usage: python3 add-roadside.py [nvdb-roadside.json] [ar5-skog.json]
import json,math,collections,sys,re
import xml.etree.ElementTree as ET
from pathlib import Path
from map_fixes import in_added

M=Path('dist/map.json');D=json.loads(M.read_text());lon0,lat0=D['origin'];sx=111320*math.cos(math.radians(lat0))
NVDB_FILE=Path(sys.argv[1] if len(sys.argv)>1 else 'nvdb-roadside.json');AR5_FILE=Path(sys.argv[2] if len(sys.argv)>2 else 'ar5-skog.json')
in_region=lambda x,z:-220<x<2220 and -700<z<820 or in_added(x,z)
osm=ET.parse('byasen.osm').getroot()
tags=lambda e:{t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
N={n.attrib['id']:(round((float(n.attrib['lon'])-lon0)*sx,2),round((lat0-float(n.attrib['lat']))*111320,2)) for n in osm.iter('node')}
NT={n.attrib['id']:tags(n) for n in osm.iter('node') if n.find('tag') is not None}
WAYS={}
for w in osm.iter('way'):
 ids=[n.attrib['ref'] for n in w.findall('nd')]
 if all(i in N for i in ids):WAYS[w.attrib['id']]={'ids':ids,'t':tags(w)}
R=lambda v,k=1:round(v,k)
pts_of=lambda w:[N[i] for i in w['ids']]
length=lambda p:sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(p,p[1:]))
def num(v,default=None):
 try:return float(re.match(r'[-+]?\d+(?:[.,]\d+)?',str(v)).group(0).replace(',','.'))
 except Exception:return default

# --- Drawn roads, buildings, a grid of both -------------------------------------------------------------------------------
ROADS={str(r['id']):r for r in D['roads']}
CELL=32;grid=collections.defaultdict(list)
for rid,r in ROADS.items():
 p=r['p']
 for k in range(len(p)-1):
  a,b=p[k],p[k+1]
  for gx in range(int(min(a[0],b[0])//CELL),int(max(a[0],b[0])//CELL)+1):
   for gz in range(int(min(a[1],b[1])//CELL),int(max(a[1],b[1])//CELL)+1):grid[gx,gz].append((rid,k))
def project(x,z,a,b):
 dx,dz=b[0]-a[0],b[1]-a[1];l=dx*dx+dz*dz or 1e-9;t=max(0,min(1,((x-a[0])*dx+(z-a[1])*dz)/l))
 return a[0]+t*dx,a[1]+t*dz,t
def nearest_road(x,z,limit=6):
 """(distance, road id, segment index, unit tangent) of the drawn road segment nearest to (x,z), or None."""
 best=None;seen=set()
 for gx in range(int((x-limit)//CELL),int((x+limit)//CELL)+1):
  for gz in range(int((z-limit)//CELL),int((z+limit)//CELL)+1):
   for rid,k in grid.get((gx,gz),()):
    if (rid,k) in seen:continue
    seen.add((rid,k));p=ROADS[rid]['p'];a,b=p[k],p[k+1];px,pz,t=project(x,z,a,b);d=math.hypot(x-px,z-pz)
    if d<=limit and (best is None or d<best[0]):
     l=math.hypot(b[0]-a[0],b[1]-a[1]) or 1;best=(d,rid,k,((b[0]-a[0])/l,(b[1]-a[1])/l))
 return best
BUILD=[[tuple(v) for v in b['p'][:-1]] for b in D['buildings'] if len(b['p'])>3]
bgrid=collections.defaultdict(list)
for i,p in enumerate(BUILD):
 for gx in range(int(min(v[0] for v in p)//CELL),int(max(v[0] for v in p)//CELL)+1):
  for gz in range(int(min(v[1] for v in p)//CELL),int(max(v[1] for v in p)//CELL)+1):bgrid[gx,gz].append(i)
def inside(p,x,z):
 c=False
 for i in range(len(p)):
  a,b=p[i-1],p[i]
  if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:c=not c
 return c
def in_building(x,z):
 return any(inside(BUILD[i],x,z) for i in bgrid.get((int(x//CELL),int(z//CELL)),()))
def near_drawn(x,z,limit=60):
 return nearest_road(x,z,limit) is not None
def resample(p,step):
 out=[tuple(p[0])]
 for a,b in zip(p,p[1:]):
  l=math.hypot(b[0]-a[0],b[1]-a[1]);k=max(1,int(math.ceil(l/step)))
  for j in range(1,k+1):out.append((a[0]+(b[0]-a[0])*j/k,a[1]+(b[1]-a[1])*j/k))
 return out
def simplify(p,tol):
 if len(p)<3:return p
 keep=[0,len(p)-1];todo=[(0,len(p)-1)];ks={0,len(p)-1}
 while todo:
  i,j=todo.pop();ax,az=p[i];dx,dz=p[j][0]-ax,p[j][1]-az;l2=dx*dx+dz*dz or 1e-9;far=0;at=None
  for k in range(i+1,j):
   t=max(0,min(1,((p[k][0]-ax)*dx+(p[k][1]-az)*dz)/l2));d=math.hypot(p[k][0]-ax-t*dx,p[k][1]-az-t*dz)
   if d>far:far=d;at=k
  if far>tol and at is not None:ks.add(at);todo+=[(i,at),(at,j)]
 return [p[k] for k in sorted(ks)]
def runs_where(p,keep,step=1.0,minlen=2.0):
 """Cut polyline p into runs where keep(x,z) holds (samples every `step` m); runs shorter than minlen are dropped."""
 out=[];cur=[]
 for q in resample(p,step):
  if keep(*q):cur.append(q)
  else:
   if len(cur)>1 and length(cur)>=minlen:out.append(cur)
   cur=[]
 if len(cur)>1 and length(cur)>=minlen:out.append(cur)
 return out
class LineIndex:
 """Distances to a set of polylines (a grid of segments)."""
 def __init__(self,lines,cell=16):
  self.lines=lines;self.cell=cell;self.g=collections.defaultdict(list)
  for li,p in enumerate(lines):
   for k in range(len(p)-1):
    a,b=p[k],p[k+1]
    for gx in range(int(min(a[0],b[0])//cell),int(max(a[0],b[0])//cell)+1):
     for gz in range(int(min(a[1],b[1])//cell),int(max(a[1],b[1])//cell)+1):self.g[gx,gz].append((li,k))
 def dist(self,x,z,limit=6):
  best=(1e9,None);c=self.cell;seen=set()
  for gx in range(int((x-limit)//c),int((x+limit)//c)+1):
   for gz in range(int((z-limit)//c),int((z+limit)//c)+1):
    for li,k in self.g.get((gx,gz),()):
     if (li,k) in seen:continue
     seen.add((li,k));p=self.lines[li];px,pz,_=project(x,z,p[k],p[k+1]);d=math.hypot(x-px,z-pz)
     if d<best[0]:best=(d,li)
  return best

# --- Relations: multipolygon rings --------------------------------------------------------------------------------------------
def rings_of(rel):
 """Outer and inner rings (lists of [x,z]) of a multipolygon relation, stitched from its member ways."""
 out={'outer':[],'inner':[]}
 for role in out:
  segs=[list(WAYS[m.attrib['ref']]['ids']) for m in rel.findall('member') if m.attrib['type']=='way' and m.attrib.get('role',role if role=='outer' else '')==role and m.attrib['ref'] in WAYS]
  while segs:
   ring=segs.pop(0)
   while ring[0]!=ring[-1]:
    for i,s in enumerate(segs):
     if s[0]==ring[-1]:ring+=s[1:];segs.pop(i);break
     if s[-1]==ring[-1]:ring+=s[::-1][1:];segs.pop(i);break
     if s[-1]==ring[0]:ring=s[:-1]+ring;segs.pop(i);break
     if s[0]==ring[0]:ring=s[::-1][:-1]+ring;segs.pop(i);break
    else:break
   if ring[0]==ring[-1] and len(ring)>3:out[role].append([list(N[i]) for i in ring[:-1]])
 return out
RELS=[(r.attrib['id'],tags(r),r) for r in osm.iter('relation')]
def poly_area(p):return sum(p[i][0]*p[(i+1)%len(p)][1]-p[(i+1)%len(p)][0]*p[i][1] for i in range(len(p)))/2
centroid=lambda p:(sum(v[0] for v in p)/len(p),sum(v[1] for v in p)/len(p))

# --- Barriers ----------------------------------------------------------------------------------------------------------------------
# kinds: fence (styles picket, board, mesh, rail, wire, glass), hedge, wall (stone, concrete), retaining (stone, concrete), noise (timber,
# glass, metal), guardrail (beam, tube). h: height in metres, c: colour when known. o: where it comes from ('w<osm way>', 'n<nvdb type>:<id>').
FENCE_STYLE={'chain_link':'mesh','net':'mesh','wire':'wire','electric':'wire','bars':'rail','railing':'rail','steel':'rail','metal':'rail','roundpole':'rail','post_and_rail':'rail',
 'paling':'picket','wood':'picket','panel':'board','glass':'glass','hedge':'hedge'}
HEIGHT={'picket':1.1,'board':1.6,'mesh':1.8,'rail':1.1,'wire':1.0,'glass':1.0,'hedge':1.5,'stone':1.0,'concrete':1.0,'noise':2.0,'beam':.75,'tube':.85}
barriers=[]
def add_barrier(kind,sub,p,h,o,c=None,**extra):
 p=[tuple(q) for q in p]
 if len(p)<2 or length(p)<1.5:return
 e={'k':kind,'t':sub,'p':[[R(q[0]),R(q[1])] for q in simplify(p,.25)],'h':R(h,2),'o':o};
 if c:e['c']=c
 e.update(extra);barriers.append(e)
def osm_barrier(i,w):
 t=w['t'];b=t.get('barrier')
 if not b or b in ('gate','lift_gate','kerb','chain','entrance','swing_gate','block','bollard','cycle_barrier'):return None
 if t.get('bridge') not in (None,'no') or t.get('tunnel') not in (None,'no'):return None
 mat=t.get('material') or t.get('fence_type') or t.get('wall')
 h=num(t.get('height'))
 if b=='fence':
  ft=t.get('fence_type') or t.get('material') or ''
  if t.get('wall')=='noise_barrier':return ('noise','timber',h or 2.0)
  sub=FENCE_STYLE.get(ft,'picket')
  if sub=='hedge':return ('hedge','hedge',h or 1.4)
  return ('fence',sub,h or HEIGHT[sub])
 if b=='hedge':return ('hedge','hedge',h or 1.5)
 if b=='guard_rail':return ('guardrail','beam',h or .75)
 if b in ('wall','retaining_wall'):
  if t.get('wall')=='noise_barrier':return ('noise',{'glass':'glass','metal':'metal','steel':'metal','concrete':'concrete'}.get(mat,'timber'),h or 2.2)
  sub='stone' if mat in ('stone','dry_stone','granite','brick') or t.get('wall') in ('dry_stone',) else 'concrete'
  return ('retaining' if b=='retaining_wall' else 'wall',sub,h or (1.2 if b=='retaining_wall' else 1.0))
 return None
OSM_COLOUR={'white':'#ece8dc','brown':'#7b5a44','black':'#2b2f33','red':'#b4482f','green':'#3f6f4f','grey':'#8a8d8b','gray':'#8a8d8b','yellow':'#d4b24a','blue':'#2f5f9f','beige':'#c9b99a'} # OSM colour=* on a fence (1 October 2026: the brown paling fence by the ball court at Dalgård skole was drawn in a random colour)
FAMILY={'noise':'noise','guardrail':'guardrail','fence':'fence','hedge':'fence','wall':'wall','retaining':'wall'}
osm_lines=collections.defaultdict(list);osm_entries=collections.defaultdict(list);explicit_h=set() # family -> polylines and the barrier drawn from each
for i,w in WAYS.items():
 c=osm_barrier(i,w)
 if not c:continue
 p=pts_of(w)
 if not any(in_region(*q) for q in p):continue
 n=len(barriers);add_barrier(c[0],c[1],p,c[2],'w'+i,OSM_COLOUR.get((w['t'].get('colour') or '').lower()))
 if len(barriers)==n:continue
 fam=FAMILY[c[0]];osm_lines[fam].append(p);osm_entries[fam].append(barriers[-1])
 if num(w['t'].get('height')) is not None:explicit_h.add(id(barriers[-1]))
n_osm=len(barriers)

# NVDB: noise barriers (Skjerm), guard rails (Rekkverk), fences (Gjerde), retaining structures (Støttekonstruksjon). Where an NVDB object runs along the
# same OSM line (within 3.5 m) it is the same thing: the OSM line stays and, unless OSM gives a height, takes NVDB's height, material and colour; only
# the stretches of the NVDB object that OSM has no line for are added.
NV=json.loads(NVDB_FILE.read_text())['types'] if NVDB_FILE.exists() else {}
COLOURS={'rød':'#9a3f33','blå':'#3d5f8f','brun':'#6f4f38','ubehandlet':'#a88a62','kvit':'#e8e6de','hvit':'#e8e6de','grønn':'#4f7a52','grå':'#8f9594','svart':'#3a3c3d'}
def colour_of(s):
 s=(s or '').lower()
 for k,v in COLOURS.items():
  if k in s:return v
 return None
fam_index={f:LineIndex(ls) for f,ls in osm_lines.items()}
def cover(p,family,tol=3.5):
 """(runs of p that no OSM line of the family is within tol m of, {OSM line index: samples along it})"""
 idx=fam_index.get(family);samples=resample(p,1.0)
 if not idx:return [samples],collections.Counter()
 hits=collections.Counter();runs=[];cur=[]
 for x,z in samples:
  d,li=idx.dist(x,z,tol)
  if d<=tol:
   hits[li]+=1
   if len(cur)>1 and length(cur)>=3:runs.append(cur)
   cur=[]
  else:cur.append((x,z))
 if len(cur)>1 and length(cur)>=3:runs.append(cur)
 return runs,hits
nv_count=collections.Counter();nv_dup=collections.Counter();nv_enriched=collections.Counter()
def nvdb_items(key):
 for o in NV.get(key,{}).get('objects',[]):
  p=[(q[0],q[1]) for q in o['p']]
  if o['k'] not in ('LINESTRING','POLYGON') or len(p)<2:continue
  if not any(in_region(*q) for q in p):continue
  if not any(near_drawn(*q,25) for q in resample(p,8)):continue # along a drawn road, as NVDB objects are
  yield o,p
def nvdb_barrier(key,label,family,o,p,kind,sub,h,colour,**extra):
 runs,hits=cover(p,family)
 for run in runs:add_barrier(kind,sub,run,h,f"n{NV[key]['typeid']}:{o['id']}",colour,**extra);nv_count[label]+=1
 if hits:
  li,n=hits.most_common(1)[0];e=osm_entries[family][li]
  if n>=3:
   if id(e) not in explicit_h:e['h']=R(h,2)
   e['t']=sub
   if colour:e['c']=colour
   e['o']+=f"+n{NV[key]['typeid']}:{o['id']}";nv_enriched[label]+=1
 if not runs:nv_dup[label]+=1
for o,p in nvdb_items('skjerm'):
 e=o.get('e',{});mat=e.get('Materiale skjerm','Tre');sub={'Tre':'timber','Pleksiglass':'glass','Plast':'glass','Metall':'metal'}.get(mat,'timber')
 noise=e.get('Bruksområde')=='Støyskjerm'
 nvdb_barrier('skjerm','skjerm','noise',o,p,'noise' if noise else 'fence',sub if noise else 'glass',num(e.get('Høyde'),2.0),colour_of(e.get('Farge')))
for o,p in nvdb_items('rekkverk'):
 e=o.get('e',{});typ=e.get('Rekkverkstype','')
 if 'Brurekkverk' in typ or 'Plassering på bru' in e:continue # bridges draw their own railings
 if 'Betong' in typ:nvdb_barrier('rekkverk','rekkverk','wall',o,p,'wall','concrete',.9,None)
 else:nvdb_barrier('rekkverk','rekkverk','guardrail',o,p,'guardrail','tube' if 'rør' in typ else 'beam',.8,None,post='tre' if 'trestolper' in typ else 'stål')
for o,p in nvdb_items('gjerde'):
 e=o.get('e',{});typ=e.get('Type','');h=num(e.get('Høyde, gjennomsnitt'),1.2)
 sub='mesh' if 'Flettverk' in typ else 'rail' if 'rør' in typ or 'Gelender' in e.get('Bruksområde','') else 'picket'
 nvdb_barrier('gjerde','gjerde','fence',o,p,'fence',sub,h,{'Galvanisert':'#9ca2a2','Lakkert':'#4a5258','Malt':'#6d5a48','Impregnert':'#7b6a52','Beiset':'#6b4f3a'}.get(e.get('Overflatebehandling')) if sub!='mesh' else None)
for o,p in nvdb_items('stottekonstruksjon'):
 e=o.get('e',{});typ=e.get('Type','');h=num(e.get('Høyde, synlig, gjennomsnitt')) or num(e.get('Høyde, synlig, maksimal'),1.2)*.7
 if o['k']=='POLYGON':p=p+[p[0]] if p[0]!=p[-1] else p
 nvdb_barrier('stottekonstruksjon','støttekonstruksjon','wall',o,p,'retaining','stone' if 'Naturstein' in typ else 'concrete',max(.5,min(h,3.5)),None)

# --- Paths and driveways not drawn yet ----------------------------------------------------------------------------------------------
# Whatever the map already draws (roads, sidewalks and cycleways of the street details, crossings) is left alone. The rest is scenery.
drawn_ids=set(ROADS)|{p['o'][1:] for p in D.get('street',{}).get('paths',[])}
WIDTH={'driveway':3.0,'aisle':5.0,'service':3.5,'track':3.0,'footway':1.8,'path':1.0,'steps':1.6,'pedestrian':3.0,'alley':3.0}
ways_out=[]
for i,w in WAYS.items():
 t=w['t'];hw=t.get('highway')
 if hw not in ('service','footway','path','steps','track','pedestrian') or i in drawn_ids:continue
 if t.get('footway')=='crossing' or t.get('cycleway')=='crossing' or 'crossing' in t or t.get('indoor') or t.get('tunnel','no')!='no' or t.get('bridge','no')!='no' or t.get('layer') not in (None,'0'):continue
 if t.get('access') in ('no',) and hw!='service':continue
 if hw=='service':
  kind={'driveway':'driveway','parking_aisle':'aisle','alley':'alley','drive-through':'aisle','yard':'service'}.get(t.get('service'),'service')
  if t.get('service') in ('siding','emergency_access'):continue
 else:kind=hw
 kind={'alley':'service'}.get(kind,kind)
 p=pts_of(w)
 if not any(in_region(*q) for q in p):continue
 width=num(t.get('width')) or WIDTH[kind];width=max(.8,min(width,8))
 if kind=='path' and not num(t.get('width')):width=1.0
 s=t.get('surface')
 runs=runs_where(p,lambda x,z:not in_building(x,z),1.0,3.0)
 for run in runs:
  if not any(near_drawn(*q,120) for q in run[::8]):continue # far from every road: never seen
  ways_out.append({'k':kind,'w':R(width),**({'s':s} if s and s not in ('asphalt','paved') else {}),'p':[[R(q[0]),R(q[1])] for q in simplify(run,.15)],'o':'w'+i})

# --- Trees, forest, scrub -------------------------------------------------------------------------------------------------------------
# species: s spruce, p pine, b birch, r rowan and other small garden trees, l large broadleaf (lime, maple, ash, oak, horse chestnut, elm)
def species_of_osm(t):
 sp=(t.get('species') or t.get('genus') or '').lower()
 if sp.startswith('picea'):return 's'
 if sp.startswith('pinus'):return 'p'
 if sp.startswith('betula'):return 'b'
 if sp.startswith(('quercus','fraxinus','tilia','acer','ulmus','fagus','aesculus')):return 'l'
 if sp.startswith(('sorbus','prunus','malus','salix','alnus','crataegus')):return 'r'
 lt=t.get('leaf_type')
 if lt=='needleleaved':return 's'
 return None
def species_of_nvdb(e):
 b=(e.get('Treslag, botanisk navn') or '').lower();n=(e.get('Treslag, norsk navn') or '').lower()
 if b.startswith('picea') or 'gran' in n:return 's'
 if b.startswith('larix') or 'lerk' in n:return 's'
 if b.startswith('pinus') or 'furu' in n:return 'p'
 if b.startswith('betula') or 'bjørk' in n:return 'b'
 if b.startswith(('sorbus','prunus','malus','salix','alnus','crataegus')):return 'r'
 if e.get('Løvfellende/vintergrønne')=='Vintergrønne':return 's'
 return 'l'
HEIGHT_OF={'s':12,'p':11,'b':11,'r':6.5,'l':11}
trees=[];tree_src=collections.Counter()
def add_tree(x,z,sp,h,src):
 if not in_region(x,z) and not near_drawn(x,z,80):return
 if in_building(x,z):return
 trees.append([R(x),R(z),sp,R(h)]);tree_src[src]+=1
import random
rng=random.Random(30092026)
for n,t in NT.items():
 if t.get('natural')!='tree':continue
 x,z=N[n];sp=species_of_osm(t) or rng.choice('bbbrrl')
 h=num(t.get('height')) or HEIGHT_OF[sp]*rng.uniform(.8,1.15)
 add_tree(x,z,sp,h,'osm_tree')
for i,w in WAYS.items():
 if w['t'].get('natural')!='tree_row':continue
 p=pts_of(w);sp=species_of_osm(w['t']) or rng.choice('bbl')
 for x,z in resample(p,6.5):add_tree(x,z,sp,HEIGHT_OF[sp]*rng.uniform(.85,1.1),'osm_tree_row')
for o in NV.get('trær',{}).get('objects',[]):
 e=o.get('e',{});x,z=o['p'][0][:2]
 if not (in_region(x,z) or near_drawn(x,z,40)):continue
 sp=species_of_nvdb(e);h=num(e.get('Høyde'))
 add_tree(x,z,sp,h if h and h>=1 else HEIGHT_OF[sp]*rng.uniform(.75,1.05),'nvdb')
# Shrub fields (NVDB Busker): polygons and lines become shrub areas
shrubs=[]
for o in NV.get('busker',{}).get('objects',[]):
 p=[(q[0],q[1]) for q in o['p']]
 if not any(in_region(*q) or near_drawn(*q,40) for q in p):continue
 if o['k']=='POLYGON':shrubs.append({'p':[[R(q[0]),R(q[1])] for q in p[:-1]],'o':f"n511:{o['id']}"})
 else:shrubs.append({'line':[[R(q[0]),R(q[1])] for q in simplify(p,.3)],'o':f"n511:{o['id']}"})
# Forest, wood and scrub areas from OSM (ways and multipolygon relations)
forest=[];scrub=[]
def leaf(t):
 lt=t.get('leaf_type');return {'needleleaved':'s','broadleaved':'b','mixed':'m'}.get(lt,'m')
def area_kind(t):
 if t.get('natural') in ('wood',) or t.get('landuse')=='forest':return 'forest'
 if t.get('natural') in ('scrub','shrubbery') or t.get('landuse')=='shrubs':return 'scrub'
 return None
for i,w in WAYS.items():
 k=area_kind(w['t'])
 if not k or w['ids'][0]!=w['ids'][-1]:continue
 p=[list(q) for q in pts_of(w)[:-1]]
 if len(p)<3 or not any(in_region(*q) or near_drawn(*q,80) for q in p):continue
 e={'p':[[R(q[0]),R(q[1])] for q in simplify(p+[p[0]],.4)[:-1]],'s':leaf(w['t']),'o':'w'+i}
 (forest if k=='forest' else scrub).append(e)
for rid,t,rel in RELS:
 k=area_kind(t)
 if not k or t.get('type')!='multipolygon':continue
 rings=rings_of(rel)
 for ring in rings['outer']:
  if len(ring)<3 or not any(in_region(*q) or near_drawn(*q,80) for q in ring):continue
  holes=[h for h in rings['inner'] if inside(ring,*h[0])]
  e={'p':[[R(q[0]),R(q[1])] for q in simplify(ring+[ring[0]],.4)[:-1]],'s':leaf(t),'o':'r'+rid}
  if holes:e['holes']=[[[R(q[0]),R(q[1])] for q in simplify(h+[h[0]],.4)[:-1]] for h in holes]
  (forest if k=='forest' else scrub).append(e)
# AR5: forest type per 5 m cell, only near drawn roads and buildings (a cell further than 330 m from both is never seen)
ar5=None
if AR5_FILE.exists():
 A=json.loads(AR5_FILE.read_text());cell=A['cell'];nx,nz=A['nx'],A['nz'];near=collections.defaultdict(int)
 for rid,r in ROADS.items():
  for x,z in resample(r['p'],40):
   for dx in range(-9,10):
    for dz in range(-9,10):near[int((x-A['x0'])//(cell*40/5*0+40))+dx,int((z-A['z0'])//40)+dz]=1
 rows=[];kept=0;total=0
 for j,row in enumerate(A['rows']):
  cells=[];
  for run in row.split():
   k,n=run.split(':');cells+=[int(k)]*int(n)
  z=A['z0']+(j+.5)*cell
  for i,k in enumerate(cells):
   if k:
    total+=1;x=A['x0']+(i+.5)*cell
    if not near.get((int((x-A['x0'])//40),int((z-A['z0'])//40))):cells[i]=0
    else:kept+=1
  runs=[];prev=cells[0];count=0
  for k in cells:
   if k==prev:count+=1
   else:runs.append(f'{prev}:{count}');prev=k;count=1
  runs.append(f'{prev}:{count}');rows.append(' '.join(runs))
 ar5={'x0':A['x0'],'z0':A['z0'],'cell':cell,'nx':nx,'nz':nz,'rows':rows,'classes':A['classes'],'source':A['source']}
 print(f'AR5: {kept} of {total} forest cells kept ({kept*cell*cell/10000:.0f} ha)')

# --- Furniture ----------------------------------------------------------------------------------------------------------------------------
# bench, bin, postbox, recycling, picnic, bicycle, flagpole, mast (h, lighting or communication), pylon (power towers), play (a playground's own node)
furn=[];furn_src=collections.Counter()
def add_furn(kind,x,z,src,h=None,**extra):
 if not (in_region(x,z) or near_drawn(x,z,60)):return
 if in_building(x,z) and kind not in ('mast','pylon'):return
 for f in furn:
  if f['k']==kind and abs(f['p'][0]-x)<2.5 and abs(f['p'][1]-z)<2.5:return # the same thing from OSM and NVDB
 e={'k':kind,'p':[R(x),R(z)],'o':src};
 if h:e['h']=R(h)
 e.update(extra);furn.append(e);furn_src[kind]+=1
NODE_KIND=lambda t:'bench' if t.get('amenity')=='bench' else 'bin' if t.get('amenity') in ('waste_basket','waste_disposal') else 'postbox' if t.get('amenity') in ('post_box','letter_box') else 'recycling' if t.get('amenity')=='recycling' else 'picnic' if t.get('leisure')=='picnic_table' else 'bicycle' if t.get('amenity')=='bicycle_parking' else 'flagpole' if t.get('man_made')=='flagpole' else 'mast' if t.get('man_made') in ('mast','tower') and t.get('tower:type') in ('communication','lighting') else 'pylon' if t.get('power')=='tower' else 'play' if t.get('leisure')=='playground' else None
for n,t in NT.items():
 k=NODE_KIND(t)
 if not k:continue
 if k=='recycling' and t.get('recycling_type')=='centre':continue
 x,z=N[n];extra={}
 if k=='mast':extra['m']='l' if t.get('tower:type')=='lighting' else 'c'
 if k=='pylon':extra['m']='portal' if t.get('design')=='portal' else 'lattice'
 add_furn(k,x,z,'n'+n,num(t.get('height')),**extra)
for i,w in WAYS.items():
 t=w['t']
 if t.get('amenity')=='bench' and w['ids'][0]!=w['ids'][-1]:
  p=pts_of(w);mid=p[len(p)//2];add_furn('bench',*mid,'w'+i)
 elif t.get('amenity')=='bicycle_parking':
  p=pts_of(w);c=centroid(p);add_furn('bicycle',*c,'w'+i)
for key,kind,prop in (('utemobler','bench','Type'),('renovasjon','bin','Type'),('sykkelparkering','bicycle',None)):
 for o in NV.get(key,{}).get('objects',[]):
  x,z=o['p'][0][:2];t=o.get('e',{}).get(prop) if prop else None
  if key=='utemobler' and t not in ('Benk','Sittegruppe med bord'):continue
  add_furn('picnic' if t=='Sittegruppe med bord' else kind,x,z,f"n{NV[key]['typeid']}:{o['id']}")
# power lines: a wire from pylon to pylon, read from the way (power=line)
lines=[]
for i,w in WAYS.items():
 if w['t'].get('power')=='line':
  p=pts_of(w)
  if any(in_region(*q) or near_drawn(*q,200) for q in p):lines.append({'p':[[R(q[0]),R(q[1])] for q in p],'o':'w'+i})

# --- Car parks ----------------------------------------------------------------------------------------------------------------------------------
# amenity=parking areas at ground level that the map does not draw yet (data.areas has a few), with their capacity when mapped
drawn_parking=[a['p'] for a in D['areas'] if a['type']=='parking']
parking=[]
def add_parking(p,t,o):
 if len(p)<3 or abs(poly_area(p))<120 or not near_drawn(*centroid(p),60):return
 c=centroid(p)
 if any(inside(q,*c) for q in drawn_parking):return
 if t.get('parking') in ('underground','multi-storey','rooftop') or t.get('access') in ('private',) and False:return
 e={'p':[[R(q[0]),R(q[1])] for q in p],'o':o}
 if t.get('capacity'):e['cap']=int(num(t['capacity'],0))
 if t.get('surface'):e['s']=t['surface']
 parking.append(e)
for i,w in WAYS.items():
 if w['t'].get('amenity')=='parking' and w['ids'][0]==w['ids'][-1]:
  p=[list(q) for q in pts_of(w)[:-1]]
  if any(in_region(*q) for q in p):add_parking(p,w['t'],'w'+i)
for rid,t,rel in RELS:
 if t.get('amenity')=='parking' and t.get('type')=='multipolygon':
  for ring in rings_of(rel)['outer']:
   if any(in_region(*q) for q in ring):add_parking(ring,t,'r'+rid)

D['roadside']={'barriers':barriers,'ways':ways_out,'trees':trees,'forest':forest,'scrub':scrub,'shrubs':shrubs,'ar5':ar5,'furniture':furn,'power_lines':lines,'parking':parking,
 'source':'OpenStreetMap (ODbL), byasen.osm; Statens vegvesen NVDB (NLOD 2.0), nvdb-roadside.json; NIBIO AR5 (NLOD / CC BY 4.0), ar5-skog.json; see docs/roadside.md'}
M.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
kinds=collections.Counter((b['k'],b['t']) for b in barriers)
print(f"barriers {len(barriers)} ({n_osm} OSM, {len(barriers)-n_osm} NVDB pieces; NVDB objects that are the same as an OSM line: {dict(nv_dup)}, OSM lines that took NVDB's height and material: {dict(nv_enriched)}), {sum(length([tuple(q) for q in b['p']]) for b in barriers)/1000:.1f} km")
print(' by kind',dict(collections.Counter(b['k'] for b in barriers)));print(' styles',dict(kinds))
print(f"ways {len(ways_out)} ({dict(collections.Counter(p['k'] for p in ways_out))}), {sum(length(p['p']) for p in ways_out)/1000:.1f} km")
print(f"trees {len(trees)} {dict(tree_src)} species {dict(collections.Counter(t[2] for t in trees))}; forest areas {len(forest)} ({sum(abs(poly_area(f['p'])) for f in forest)/10000:.0f} ha), scrub {len(scrub)}, shrub fields {len(shrubs)}")
print(f"furniture {len(furn)} {dict(furn_src)}; power lines {len(lines)}; car parks not drawn yet {len(parking)} ({sum(abs(poly_area(p['p'])) for p in parking)/10000:.1f} ha); roadside data {len(json.dumps(D['roadside'],separators=(',',':')))} bytes")
