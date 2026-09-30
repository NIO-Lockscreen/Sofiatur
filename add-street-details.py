# Street details (29 September 2026): what makes a Norwegian junction recognisable and that prepare-map.py leaves out,
# although byasen.osm has it: zebra crossings, give-way and stop lines, traffic islands, turning circles at the end of
# cul-de-sacs, speed tables and humps, sidewalks and gang- og sykkelvei, street lamps. This reads the extract and adds one
# key, `street`, to dist/map.json (dist/street-details.js draws it); tags and what is approximate: docs/street-details.md.
# Only what lies in the map region (the original box plus map_fixes.SOUTH and WEST) and on, or beside, a drawn road is
# kept. Run after add-stavset.py; running it again replaces `street`.
import json,math,collections
import xml.etree.ElementTree as ET
from pathlib import Path
from map_fixes import in_added

M=Path('dist/map.json');D=json.loads(M.read_text());lon0,lat0=D['origin'];sx=111320*math.cos(math.radians(lat0))
in_region=lambda x,z:-220<x<2220 and -700<z<820 or in_added(x,z)
osm=ET.parse('byasen.osm').getroot()
tags=lambda e:{t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
N={n.attrib['id']:(round((float(n.attrib['lon'])-lon0)*sx,2),round((lat0-float(n.attrib['lat']))*111320,2)) for n in osm.iter('node')}
NT={n.attrib['id']:tags(n) for n in osm.iter('node') if n.find('tag') is not None}
WAYS={}
for w in osm.iter('way'):
 ids=[n.attrib['ref'] for n in w.findall('nd')]
 if all(i in N for i in ids):WAYS[w.attrib['id']]={'ids':ids,'t':tags(w)}
R=lambda v,k=2:round(v,k)

# --- Drawn roads and a grid of their segments ---------------------------------------------------------------------------
ROADS={str(r['id']):r for r in D['roads']}
drawn={i:WAYS[i] for i in ROADS if i in WAYS} # the OSM ways behind the drawn roads (a few are made up by the other scripts)
node_roads=collections.defaultdict(set) # OSM node -> drawn roads through it
for i,w in drawn.items():
 for n in w['ids']:node_roads[n].add(i)
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
def nearest_road(x,z,limit=6,skip=()):
 """(distance, road id, segment, unit tangent) of the drawn road segment nearest to (x,z), or None."""
 best=None;seen=set()
 for gx in range(int((x-limit)//CELL),int((x+limit)//CELL)+1):
  for gz in range(int((z-limit)//CELL),int((z+limit)//CELL)+1):
   for rid,k in grid.get((gx,gz),()):
    if (rid,k) in seen or rid in skip:continue
    seen.add((rid,k));p=ROADS[rid]['p'];a,b=p[k],p[k+1];px,pz,t=project(x,z,a,b);d=math.hypot(x-px,z-pz)
    if d<=limit and (best is None or d<best[0]):
     l=math.hypot(b[0]-a[0],b[1]-a[1]) or 1;best=(d,rid,k,((b[0]-a[0])/l,(b[1]-a[1])/l))
 return best
def unit(dx,dz):
 l=math.hypot(dx,dz) or 1;return dx/l,dz/l
def crossed(a,b,c,d):
 """Where segments a-b and c-d meet, or None (touching ends count)."""
 rx,rz,sx_,sz=b[0]-a[0],b[1]-a[1],d[0]-c[0],d[1]-c[1];den=rx*sz-rz*sx_
 if abs(den)<1e-9:return None
 t=((c[0]-a[0])*sz-(c[1]-a[1])*sx_)/den;u=((c[0]-a[0])*rz-(c[1]-a[1])*rx)/den
 if -1e-6<=t<=1+1e-6 and -1e-6<=u<=1+1e-6:return a[0]+t*rx,a[1]+t*rz
 return None
def poly_area(p):
 return sum(p[i][0]*p[(i+1)%len(p)][1]-p[(i+1)%len(p)][0]*p[i][1] for i in range(len(p)))/2

# --- Crossings -----------------------------------------------------------------------------------------------------------
# Norwegian gangfelt: white stripes along the traffic, side by side across the carriageway. Marked crossings are zebra
# (crossing=zebra/marked, crossing:markings=zebra/yes; crossing=uncontrolled without crossing:markings is old tagging for
# a marked crossing without signals); a crossing at traffic signals without zebra markings gets two lines instead (z=0).
# crossing=unmarked/informal, crossing:markings=no and a bare highway=crossing are left out: nothing is painted there.
def marking(t):
 c,m=t.get('crossing'),t.get('crossing:markings')
 if c in ('unmarked','informal') or m=='no':return None
 if c=='zebra' or m=='zebra' or c=='marked' or m=='yes':return 1
 if c=='uncontrolled':return 1
 if c=='traffic_signals':return 0
 return None
crossings=[];unmarked=[];assumed=[] # unmarked: where a crossing is mapped but nothing is painted; assumed: marked by old tagging, no crossing:markings
old_tagging=lambda t:t.get('crossing')=='uncontrolled' and 'crossing:markings' not in t
def add_crossing(x,z,tan,z_,rid,osm_id):
 for c in crossings:
  if math.hypot(c['p'][0]-x,c['p'][1]-z)<3.5:
   c['z']=max(c['z'],z_);return c # the footway and the cycleway side by side, or the node on the way: one crossing
 n=unit(-tan[1],tan[0]);c={'p':[R(x),R(z)],'n':[R(n[0],3),R(n[1],3)],'z':z_,'r':rid,'o':osm_id};crossings.append(c);return c
tables=[];table_at=lambda x,z:any(math.hypot(t['p'][0]-x,t['p'][1]-z)<5 for t in tables)
HALF={'service':1.75,'residential':2.6} # half the carriageway by class, as roadWidth() in dist/transit-geometry.js (6.5 m otherwise)
half=lambda r:r['width']/2 if r.get('width') else HALF.get(r['type'],3.25) # a measured width (road_widths.py) wins, as in roadWidth()
CROSS_WAYS=[(i,w) for i,w in WAYS.items() if w['t'].get('highway') in ('footway','cycleway','path') and (w['t'].get('footway')=='crossing' or w['t'].get('cycleway')=='crossing' or 'crossing' in w['t'])]
for i,w in CROSS_WAYS:
 pts=[N[n] for n in w['ids']]
 if not any(in_region(*p) for p in pts):continue
 mark=marking(w['t']);src=w['t']
 if mark is None:  # the crossing node on the way may say what the way does not
  for n in w['ids']:
   if NT.get(n,{}).get('highway')=='crossing':mark=marking(NT[n]);src=NT[n];break
 for a,b in zip(pts,pts[1:]):
  for rid,r in ROADS.items():
   p=r['p']
   if max(a[0],b[0])<min(q[0] for q in p)-1 or min(a[0],b[0])>max(q[0] for q in p)+1 or max(a[1],b[1])<min(q[1] for q in p)-1 or min(a[1],b[1])>max(q[1] for q in p)+1:continue
   for k in range(len(p)-1):
    x=crossed(a,b,p[k],p[k+1])
    if x and in_region(*x):
     if mark is not None:
      c=add_crossing(*x,unit(p[k+1][0]-p[k][0],p[k+1][1]-p[k][1]),mark,rid,'w'+i)
      if old_tagging(src):assumed.append(tuple(c['p']))
      if w['t'].get('traffic_calming')=='table' and not table_at(*x):tables.append({'p':c['p'],'d':[R(c['n'][1],3),R(-c['n'][0],3)],'k':'table','r':rid,'o':'w'+i})
     else:unmarked.append(x)
for n,t in NT.items():
 if t.get('highway')!='crossing' or n not in node_roads or not in_region(*N[n]):continue
 mark=marking(t)
 if mark is None:unmarked.append(N[n]);continue
 x,z=N[n];q=nearest_road(x,z,1.5,skip=set())
 if q:
  c=add_crossing(x,z,q[3],mark,q[1],'n'+n)
  if old_tagging(t):assumed.append(tuple(c['p']))

# --- Speed tables and humps ---------------------------------------------------------------------------------------------
# traffic_calming on a node within 5 m of a drawn road (the four rumble_strip nodes lie on roads left out of the game);
# the same tag on a whole street way (Uglavegen: bump) is a property of the street, not a place, and is not drawn.
KIND={'table':'table','hump':'hump','bump':'hump'}
for n,t in NT.items():
 k=KIND.get(t.get('traffic_calming'))
 if not k or not in_region(*N[n]):continue
 x,z=N[n];q=nearest_road(x,z,5)
 if q and not table_at(x,z):tables.append({'p':[R(x),R(z)],'d':[R(q[3][0],3),R(q[3][1],3)],'k':k,'r':q[1],'o':'n'+n})

# --- Give way, stop, traffic signals -------------------------------------------------------------------------------------
# The node lies on the minor road, some metres before the junction. direction=forward/backward gives the way it controls;
# without it the traffic that reaches the nearest junction on the same way is the one that gives way. A node at the
# junction itself is moved 5 m back along its way so the marking is on the lane, not in the middle of the crossing.
def walk(ids,i,step,dist):
 """Point `dist` m from node ids[i] along the way in direction step (+1/-1), or the way's end."""
 pts=[N[n] for n in ids];j=i;left=dist
 while 0<=j+step<len(pts):
  a,b=pts[j],pts[j+step];l=math.hypot(b[0]-a[0],b[1]-a[1])
  if l>=left:f=left/l if l else 0;return (a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f)
  left-=l;j+=step
 return pts[j]
def is_junction(n,rid):return len(node_roads.get(n,()))>1 and node_roads[n]!={rid}
give=[];stops=[];signals=[]
for n,t in NT.items():
 kind=t.get('highway')
 if kind not in ('give_way','stop') or n not in node_roads or not in_region(*N[n]):continue
 for rid in sorted(node_roads[n]):
  ids=drawn[rid]['ids'];i=ids.index(n);last=len(ids)-1;step=None;d=t.get('direction')
  if d in ('forward','backward'):step=1 if d=='forward' else -1
  elif i==0:step=-1
  elif i==last:step=1
  else: # nearest junction node along the way, up to 60 m
   best=None
   for s in (1,-1):
    dist=0;j=i
    while 0<=j+s<len(ids) and dist<60:
     dist+=math.hypot(N[ids[j+s]][0]-N[ids[j]][0],N[ids[j+s]][1]-N[ids[j]][1]);j+=s
     if is_junction(ids[j],rid):
      if best is None or dist<best[0]:best=(dist,s)
      break
   if best:step=best[1]
  if step is None:continue
  # the way's own direction of travel at the node: with step=+1 traffic runs along the way, with -1 against it
  a=N[ids[i-step]] if 0<=i-step<=last else N[ids[i]];b=N[ids[i]] if 0<=i-step<=last else N[ids[i+step]]
  dx,dz=unit(b[0]-a[0],b[1]-a[1])
  x,z=N[n]
  if len(node_roads[n])>1 or i in (0,last):x,z=walk(ids,i,-step,5.0)
  e={'p':[R(x),R(z)],'d':[R(dx,3),R(dz,3)],'r':rid,'o':'n'+n};(give if kind=='give_way' else stops).append(e)
for n,t in NT.items():
 if t.get('highway')!='traffic_signals' or n not in node_roads or not in_region(*N[n]):continue
 # a signal node at a junction: a stop line 7.5 m out on every road that leads into it
 for rid in sorted(node_roads[n]):
  ids=drawn[rid]['ids'];i=ids.index(n);oneway=drawn[rid]['t'].get('oneway')
  for step in (-1,1): # step: which side of the node the approach comes from
   if not 0<=i+step<len(ids):continue
   if (oneway in ('yes','1','true') and step==1) or oneway=='-1' and step==-1:continue
   x,z=walk(ids,i,step,7.5);dx,dz=unit(N[n][0]-x,N[n][1]-z);signals.append({'p':[R(x),R(z)],'d':[R(dx,3),R(dz,3)],'r':rid,'o':'n'+n})

# --- Roundabouts ---------------------------------------------------------------------------------------------------------------
# Every circle gets a kerbed island in the middle (dist/street-details.js) and haitenner on each arm that enters it: in Norway a
# roundabout is always entered giving way to the traffic in the circle, but OSM only maps a few of the give-way points. The circle
# is the ring of the game's roundabout edges: centre = middle of its bounding box, rad = mean distance of its nodes from it.
parent={}
def find(n):
 while parent.setdefault(n,n)!=n:parent[n]=parent[parent[n]];n=parent[n]
 return n
for e in D['edges']:
 if e.get('roundabout'):
  for n in e['path']:parent[find(n)]=find(e['path'][0])
groups=collections.defaultdict(set)
for n in list(parent):groups[find(n)].add(n)
roundabouts=[]
for ring in groups.values():
 pts=[D['nodes'][n] for n in ring if n in D['nodes']]
 if len(pts)<6:continue
 cx,cz=(min(p[0] for p in pts)+max(p[0] for p in pts))/2,(min(p[1] for p in pts)+max(p[1] for p in pts))/2
 rad=sum(math.hypot(p[0]-cx,p[1]-cz) for p in pts)/len(pts);q=nearest_road(*pts[0],3)
 if not in_region(cx,cz) or not q or not 3<=rad<=40:continue
 roundabouts.append({'p':[R(cx),R(cz)],'rad':R(rad,1),'r':q[1]})
 back=half(ROADS[q[1]])+1.6 # from the ring's centre line to the line the arm gives way at
 for e in D['edges']:
  if e['to'] not in ring or e['from'] in ring or e.get('roundabout'):continue
  path=[D['nodes'][n] for n in e['path']][::-1];left=back # walk back from the ring along the arm
  for a,b in zip(path,path[1:]):
   l=math.hypot(b[0]-a[0],b[1]-a[1])
   if l>=left:
    f=left/l;x,z=a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f;d=unit(a[0]-b[0],a[1]-b[1]);arm=nearest_road(x,z,3)
    if arm and not any(math.hypot(g['p'][0]-x,g['p'][1]-z)<12 for g in give):give.append({'p':[R(x),R(z)],'d':[R(d[0],3),R(d[1],3)],'r':arm[1],'o':'roundabout'})
    break
   left-=l

# --- Traffic islands ------------------------------------------------------------------------------------------------------
# area:highway=traffic_island polygons. The car drives along the road centre lines, and OSM's splitter islands lie beside,
# often half over, them (the arms of the roundabout at Byåsveien / Arnt Smistads veg): a raised island is cut back to 1.2 m
# from every centre line and cut through where a zebra crossing runs over it, like the pedestrian gap in the real island.
# Where that leaves under half of it (the road is drawn as one two-way way through the island), the island becomes a
# flush one, f=1: painted with white hatching, which the car can drive over. Pieces under 2 m² (or a tenth of the island)
# are dropped. Cutting is by half-planes: right for these long thin islands.
CLEAR=1.2
def inside(p,x,z):
 c=False
 for i in range(len(p)):
  a,b=p[i-1],p[i]
  if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:c=not c
 return c
def clip(p,a,b,keep,off):
 """Part of polygon p ([x,z] points) where keep*(signed distance to the line a-b) >= off (Sutherland-Hodgman)."""
 ux,uz=unit(b[0]-a[0],b[1]-a[1]);s=lambda q:keep*((q[0]-a[0])*-uz+(q[1]-a[1])*ux)-off;out=[]
 for i in range(len(p)):
  q,r=p[i-1],p[i];sq,sr=s(q),s(r)
  if (sq<0)!=(sr<0):f=sq/(sq-sr);out.append([q[0]+(r[0]-q[0])*f,q[1]+(r[1]-q[1])*f])
  if sr>=0:out.append(r)
 return out
def seg_poly_dist(a,b,p):
 """Distance from segment a-b to polygon p (0 if they touch or overlap)."""
 if inside(p,*a) or inside(p,*b):return 0
 best=99
 for i in range(len(p)):
  c,d=p[i-1],p[i]
  if crossed(a,b,c,d):return 0
  for q in (c,d):px,pz,_=project(q[0],q[1],a,b);best=min(best,math.hypot(q[0]-px,q[1]-pz))
  for q in (a,b):px,pz,_=project(q[0],q[1],c,d);best=min(best,math.hypot(q[0]-px,q[1]-pz))
 return best
centroid=lambda p:(sum(v[0] for v in p)/len(p),sum(v[1] for v in p)/len(p))
def back_off_roads(p):
 for r in ROADS.values():
  for a,b in zip(r['p'],r['p'][1:]):
   if len(p)<3:return p
   if seg_poly_dist(a,b,p)<CLEAR:
    cx,cz=centroid(p);ux,uz=unit(b[0]-a[0],b[1]-a[1]);p=clip(p,a,b,1 if (cx-a[0])*-uz+(cz-a[1])*ux>=0 else -1,CLEAR)
 return p
def gap_for_crossings(pieces):
 for c in crossings:
  x,z=c['p'];nx,nz=c['n'];tx,tz=nz,-nx;h=half(ROADS[c['r']])+.5;a,b=[x-nx*h,z-nz*h],[x+nx*h,z+nz*h];out=[]
  for p in pieces:
   if len(p)>=3 and seg_poly_dist(a,b,p)<.5: # the crossing runs over this piece: keep what lies 1.8 m clear of it on either side
    out+=[q for q in (clip(p,[x,z],[x+tx,z+tz],keep,1.8) for keep in (1,-1)) if len(q)>=3]
   else:out.append(p)
  pieces=out
 return pieces
islands=[];skipped=[]
for i,w in WAYS.items():
 if w['t'].get('area:highway')!='traffic_island':continue
 p=[list(N[n]) for n in w['ids']]
 if p[0]==p[-1]:p=p[:-1]
 if len(p)<3 or not in_region(*centroid(p)):continue
 whole=abs(poly_area(p));pieces=[q for q in gap_for_crossings([back_off_roads(p)]) if abs(poly_area(q))>=max(2,.1*whole)];flush=sum(abs(poly_area(q)) for q in pieces)<.5*whole
 if flush:pieces=[q for q in gap_for_crossings([p]) if abs(poly_area(q))>=max(1.2,.05*whole)]
 for piece in pieces:
  if poly_area(piece)<0:piece.reverse() # one winding for all
  e={'p':[[R(v[0]),R(v[1])] for v in piece],'o':'w'+i}
  if w['t'].get('surface'):e['s']=w['t']['surface']
  if flush:e['f']=1
  islands.append(e)
 if not pieces:skipped.append(i)

# --- Turning circles -----------------------------------------------------------------------------------------------------
# highway=turning_circle sits at the end of a cul-de-sac, in the middle of the turning area. r: radius in metres, 8.5 unless a
# building stands closer (then 1.5 m short of it, at least 5.5).
buildings=[[(v[0],v[1]) for v in b['p']] for b in D['buildings']]
def building_gap(x,z):
 best=99
 for p in buildings:
  if x<min(v[0] for v in p)-10 or x>max(v[0] for v in p)+10 or z<min(v[1] for v in p)-10 or z>max(v[1] for v in p)+10:continue
  if inside(p,x,z):return 0
  for a,b in zip(p,p[1:]+p[:1]):
   px,pz,_=project(x,z,a,b);best=min(best,math.hypot(x-px,z-pz))
 return best
turning=[]
for n,t in NT.items():
 if t.get('highway')!='turning_circle' or n not in node_roads or not in_region(*N[n]):continue
 x,z=N[n];rid=sorted(node_roads[n])[0];ids=drawn[rid]['ids'];i=ids.index(n)
 if i==len(ids)-1:dx,dz=unit(N[n][0]-N[ids[i-1]][0],N[n][1]-N[ids[i-1]][1])
 elif i==0:dx,dz=unit(N[n][0]-N[ids[1]][0],N[n][1]-N[ids[1]][1])
 else:continue # in the middle of a way: not a road end
 turning.append({'p':[R(x),R(z)],'d':[R(dx,3),R(dz,3)],'r':rid,'o':'n'+n,'rad':R(max(5.5,min(8.5,building_gap(x,z)-1.5)),1)})

# --- Sidewalks and gang- og sykkelvei ------------------------------------------------------------------------------------
# footway=sidewalk and highway=cycleway (crossing ways are crossings, above). A plain highway=footway that runs beside a
# drawn road (within 9 m for most of its length) is a sidewalk that nobody tagged as one. Nothing is cut or moved here:
# dist/street-details.js keeps them off the carriageway when it draws them.
def near_road_frac(pts,limit=9):
 hit=0;total=0
 for a,b in zip(pts,pts[1:]):
  l=math.hypot(b[0]-a[0],b[1]-a[1]);k=max(1,int(l//3))
  for s in range(k):
   f=(s+.5)/k;x,z=a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f;total+=l/k
   if nearest_road(x,z,limit):hit+=l/k
 return hit/total if total else 0
paths=[];counts=collections.Counter()
for i,w in WAYS.items():
 t=w['t'];hw=t.get('highway')
 if hw not in ('footway','cycleway') or 'crossing' in t or t.get('footway')=='crossing' or t.get('cycleway')=='crossing':continue
 pts=[N[n] for n in w['ids']]
 if not any(in_region(*p) for p in pts) or t.get('indoor') or t.get('tunnel','no')!='no' or t.get('bridge','no')!='no':continue # bridges and tunnels are not modelled
 if hw=='cycleway':kind='cycleway'
 elif t.get('footway')=='sidewalk':kind='sidewalk'
 elif not t.get('footway') and sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(pts,pts[1:]))>=8 and near_road_frac(pts)>=.6:kind='sidewalk';counts['unlabelled']+=1
 else:continue
 e={'t':kind,'p':[[R(p[0]),R(p[1])] for p in pts],'o':'w'+i}
 if t.get('surface') and t['surface'] not in ('asphalt','paved'):e['s']=t['surface']
 paths.append(e)

# --- Street lamps ----------------------------------------------------------------------------------------------------------
lamps=[[R(N[n][0]),R(N[n][1])] for n,t in NT.items() if t.get('highway')=='street_lamp' and in_region(*N[n])]

D['street']={'crossings':crossings,'give_way':give,'stop':stops,'traffic_signals':signals,'islands':islands,'turning_circles':turning,'roundabouts':roundabouts,'tables':tables,'paths':paths,'lamps':lamps,
 'source':'OpenStreetMap (ODbL), byasen.osm; see docs/street-details.md'}
M.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
zebra=sum(c['z'] for c in crossings)
old_style=len(set(assumed))
places=[]
for x,z in unmarked: # the same crossing is found once per way and node: count places
 if not any(math.hypot(x-c['p'][0],z-c['p'][1])<3.5 for c in crossings) and not any(math.hypot(x-p[0],z-p[1])<3.5 for p in places):places.append((x,z))
print(f"crossings {len(crossings)}: {zebra} zebra, {len(crossings)-zebra} with lines at signals; {old_style} places rest on crossing=uncontrolled without crossing:markings, the old tagging for a marked crossing, {len(places)} places mapped but unmarked, left out")
print(f"give way {len(give)} ({sum(g['o']=='roundabout' for g in give)} at roundabout arms), stop {len(stops)}, signal stop lines {len(signals)}, islands {len(islands)} pieces from {len({i['o'] for i in islands})} ways ({sum(bool(i.get('f')) for i in islands)} painted, left out: {skipped}), roundabouts {len(roundabouts)}, turning circles {len(turning)}")
print('tables and humps',dict(collections.Counter(t['k'] for t in tables)),'| paths',dict(collections.Counter(p['t'] for p in paths)),f"({counts['unlabelled']} unlabelled footways beside roads) | lamps {len(lamps)} | street data {len(json.dumps(D['street'],separators=(',',':')))} bytes")
