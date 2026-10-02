# Schoolyard (1 October 2026): the school grounds of Dalgård skole and how one arrives there, added to dist/map.json as one key, `schoolyard`
# (dist/schoolyard.js draws it; sources, what is measured, seen in photographs or estimated: docs/dalgard-references.md):
#   site        the school's grounds, OSM relation 6579902 (nine boundary ways joined into one ring); kinder: the kindergarten's grounds next to it
#   paved       the asphalt yard: the site less buildings, lawns (landuse=grass), playgrounds, the grass pitch and the roads (shapely, ODbL data)
#   surfaces    the fall surfaces of the playgrounds (sand, gravel, rubber, artificial turf) with the OSM way each comes from
#   equipment   playground equipment, one entry per OSM node or area tagged playground=* (swing, slide, climbingframe, balancebeam, seesaw,
#               sandpit, playhouse, tunnel_tube, structure)
#   objects     the statue "Nusse på gyngehest", its boulder, the campus board, the picnic tables in the courtyard, the amphitheatre, benches by the court
#   courts      the asphalt ball court (OSM w1112589245) and the grass pitch Trondsløkka (w1249412407): centre, angle, length, width
#   signs       Statens vegvesen NVDB road signs (Skiltplate, NLOD) within the area, grouped on one pole per position, facing the traffic they are for
# and puts NVDB speed humps (Fartsdempere) and the raised junction areas of 2024 into data.street.tables, where street-details.js draws them.
# Needs shapely (pip install shapely). The NVDB answer is kept in nvdb-school.json (fetched when it is missing: python3 add-schoolyard.py [nvdb-school.json]).
# Run after add-roadside.py; running it again replaces what it added.
import json,math,re,sys,time,urllib.request,collections
import xml.etree.ElementTree as ET
from pathlib import Path
try:
 from shapely.geometry import Polygon,LineString,Point,MultiPolygon
 from shapely.ops import unary_union,linemerge,polygonize
except ImportError:
 sys.exit('add-schoolyard.py needs shapely: pip install shapely')

M=Path('dist/map.json');D=json.loads(M.read_text());lon0,lat0=D['origin'];sx=111320*math.cos(math.radians(lat0))
NVDB_FILE=Path(sys.argv[1] if len(sys.argv)>1 else 'nvdb-school.json')
BOX=(480,280,930,700) # x0,z0,x1,z1: the school and about 200 m round it
inbox=lambda p,b=BOX:b[0]<=p[0]<=b[2] and b[1]<=p[1]<=b[3]
R=lambda v,k=1:round(v,k)

# --- OpenStreetMap (byasen.osm) -------------------------------------------------------------------------------------------------
osm=ET.parse('byasen.osm').getroot()
tags=lambda e:{t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
N={n.attrib['id']:(round((float(n.attrib['lon'])-lon0)*sx,2),round((lat0-float(n.attrib['lat']))*111320,2)) for n in osm.iter('node')}
NT={n.attrib['id']:tags(n) for n in osm.iter('node') if n.find('tag') is not None}
W={w.attrib['id']:{'p':[N[n.attrib['ref']] for n in w.findall('nd') if n.attrib['ref'] in N],'t':tags(w)} for w in osm.iter('way')}
REL={r.attrib['id']:{'m':[(m.attrib['type'],m.attrib['ref'],m.attrib['role']) for m in r.findall('member')],'t':tags(r)} for r in osm.iter('relation')}
def ring_of(rel):
 """The outer ways of a relation joined into polygons (shapely)."""
 lines=[LineString(W[ref]['p']) for typ,ref,role in REL[rel]['m'] if typ=='way' and role=='outer' and ref in W and len(W[ref]['p'])>1]
 polys=list(polygonize(linemerge(lines)))
 return max(polys,key=lambda p:p.area) if polys else None
def poly_of_way(i):
 p=W[i]['p'];return Polygon(p) if len(p)>=4 and p[0]==p[-1] else None
site=ring_of('6579902');assert site is not None,'school grounds relation 6579902 did not close'
kinder=ring_of('6846714')
if kinder is None: # its two boundary ways do not close on their own: the hull of the fence, as far as it is inside the box
 kinder=Polygon([p for i in ('440958730','463622198') for p in W[i]['p']]).convex_hull
site=site.buffer(0)
# playgrounds, lawns, pitches of the area: closed OSM ways with the tags
def way_polys(pred):
 out=[]
 for i,w in W.items():
  if pred(w['t']) and w['p'] and inbox(w['p'][0]):
   pg=poly_of_way(i)
   if pg is not None and pg.is_valid and pg.area>.5:out.append((i,w['t'],pg))
 return out
grass=way_polys(lambda t:t.get('landuse')=='grass' or t.get('natural') in ('scrub','wood'))
play=way_polys(lambda t:t.get('leisure')=='playground')
for rid in ('18774345','18749998'): # playground relations of the area (the second lies elsewhere)
 if rid in REL:
  pg=ring_of(rid)
  if pg is not None and inbox(list(pg.centroid.coords)[0]):play.append(('r'+rid,REL[rid]['t'],pg))
pitches=way_polys(lambda t:t.get('leisure')=='pitch')
buildings=[Polygon(b['p'][:-1]).buffer(0) for b in D['buildings'] if len(b['p'])>3 and inbox(b['p'][0],(500,260,950,720))]
roads=[]
width_of=lambda r:r.get('width') or (3.5 if r['type']=='service' else 5.2 if r['type']=='residential' else 6.5)
for r in D['roads']:
 if any(inbox(p,(470,270,940,710)) for p in r['p']) and r['type'] not in ('footway','path','cycleway','steps','pedestrian'):
  roads.append(LineString(r["p"]).buffer(width_of(r)/2+1.35,cap_style=1))

# --- The asphalt yard ---------------------------------------------------------------------------------------------------------------
nonpaved=unary_union([g for _,_,g in grass]+[g for _,_,g in play]+[g for i,t,g in pitches if t.get('surface')!='asphalt']+buildings+roads)
yard=site.difference(nonpaved)
yard=yard.buffer(-.7).buffer(.7).simplify(.25) # no slivers narrower than 1.4 m: the paths through the lawns are the roadside's
parts=[g for g in (yard.geoms if isinstance(yard,MultiPolygon) else [yard]) if g.area>25]
def ring(g):return [[R(x,2),R(z,2)] for x,z in list(g.exterior.coords)[:-1]]
paved=[{'p':ring(g),'h':[[[R(x,2),R(z,2)] for x,z in list(h.coords)[:-1]] for h in g.interiors if Polygon(h).area>2]} for g in parts]

# --- Playground fall surfaces and equipment --------------------------------------------------------------------------------------------
def rect(pg):
 """Centre, angle (radians, x east, z south: direction of the long side), length and width of the smallest rectangle round a polygon."""
 r=pg.minimum_rotated_rectangle;c=list(r.exterior.coords)[:4];a=math.hypot(c[1][0]-c[0][0],c[1][1]-c[0][1]),math.hypot(c[2][0]-c[1][0],c[2][1]-c[1][1])
 i=0 if a[0]>=a[1] else 1;dx,dz=c[i+1][0]-c[i][0],c[i+1][1]-c[i][1]
 return {'c':[R(r.centroid.x),R(r.centroid.y)],'a':R(math.atan2(dz,dx),3),'l':R(max(a),1),'w':R(min(a),1)}
inside_equipment=lambda p:site.buffer(8).contains(Point(p)) or kinder.buffer(8).contains(Point(p))
equipment=[]
for i,n in NT.items():
 k=n.get('playground')
 if k and inside_equipment(N[i]):equipment.append({'k':k,'p':list(N[i]),'o':'n'+i})
for i,w in W.items():
 k=w['t'].get('playground')
 if k and w['p'] and inside_equipment(w['p'][0]):
  pg=poly_of_way(i)
  if pg is not None and pg.area>.5:
   r=rect(pg);equipment.append({'k':k,'p':r['c'],'a':r['a'],'l':r['l'],'w':r['w'],'area':1,'o':'w'+i})
# an area and a node for the same piece (the mapper tagged both): keep the area, which knows the direction and size
equipment=[e for e in equipment if 'area' in e or not any('area' in a and a['k']==e['k'] and math.hypot(a['p'][0]-e['p'][0],a['p'][1]-e['p'][1])<4 for a in equipment)]
equipment.sort(key=lambda e:(e['k'],e['p']))
surfaces=[]
for i,t,pg in play:
 if not (site.buffer(8).intersects(pg) or kinder.buffer(8).intersects(pg)) or pg.area<6:continue
 ins=[e for e in equipment if pg.buffer(.6).contains(Point(e['p']))]
 kinds={e['k'] for e in ins}
 # what lies under the equipment: sand in a sandpit, red rubber under the swings of the school (the aerial shows the red square at (778,510)), artificial turf and
 # timber edging at the kindergarten (photograph), gravel under climbing frames and balance beams (photographs), otherwise gravel
 kind='sand' if kinds=={'sandpit'} else 'rubber' if t.get('surface')=='tartan' or (i in ('r18774345',)) else 'turf' if kinder.buffer(2).contains(pg.centroid) and 'swing' in kinds else 'gravel'
 surfaces.append({'k':kind,'p':[[R(x,2),R(z,2)] for x,z in list(pg.exterior.coords)[:-1]],'o':str(i)})

# --- Courts ------------------------------------------------------------------------------------------------------------------------------
courts={}
for i,t,pg in pitches:
 if i=='1112589245':courts['ball']=dict(rect(pg),o='w'+i,p=[[R(x,2),R(z,2)] for x,z in list(pg.exterior.coords)[:-1]])
 if i=='1249412407':courts['grass']=dict(rect(pg),o='w'+i,p=[[R(x,2),R(z,2)] for x,z in list(pg.exterior.coords)[:-1]])

# --- Objects seen in photographs or mapped ------------------------------------------------------------------------------------------------
objects=[]
for i,n in NT.items():
 p=N[i]
 if not inbox(p,(560,360,900,600)):continue
 if n.get('tourism')=='artwork' and n.get('artwork_type')=='statue':objects.append({'k':'statue','p':list(p),'o':'n'+i})
 elif n.get('natural')=='stone':objects.append({'k':'stone','p':list(p),'o':'n'+i})
 elif n.get('tourism')=='information' and n.get('information')=='map':objects.append({'k':'board','p':list(p),'o':'n'+i})
 elif n.get('leisure')=='picnic_table':
  # the roadside leaves out what stands inside a footprint: the picnic tables in A-bygget's courtyard
  b=[g for g in buildings if g.contains(Point(p))]
  if b:objects.append({'k':'picnic','p':list(p),'o':'n'+i})
for i,w in W.items():
 t=w['t']
 if t.get('leisure')=='bleachers' and w['p'] and inbox(w['p'][0],(560,360,900,600)):
  pg=poly_of_way(i)
  if pg is not None:objects.append({'k':'bleachers','p':[[R(x,2),R(z,2)] for x,z in list(pg.exterior.coords)[:-1]],'o':'w'+i,'theatre':t.get('theatre:type')=='open_air'})

# Car parks and the 15-minute drop-off bays along Dalgårdvegen (OSM amenity=parking): bay lines and a few parked cars are drawn on them
lots=[]
for i,w in W.items():
 t=w['t']
 if t.get('amenity')=='parking' and len(w['p'])>3 and w['p'][0]==w['p'][-1] and inbox(w['p'][0],(560,360,900,600)):
  lots.append({'p':[[R(x,2),R(z,2)] for x,z in w['p'][:-1]],'k':'street' if t.get('parking')=='street_side' else 'lot','o':'w'+i})
lots.sort(key=lambda l:l['o'])
# A bicycle rack in the courtyard inside the passage from the car park: ESTIMATED place. The 2003 photograph through the passage (Trondheim byarkiv) shows bicycles parked
# on the left, a few metres before the entrance; the school says pupils may cycle (Skolemiljøet på Dalgård skole og ressurssenter, § 16 Trafikk).
court=[Polygon(h) for b in D['buildings'] if b['id']=='r1318241' for h in b.get('holes',[])]
if court and court[0].contains(Point(681,430.5)):objects.append({'k':'bikes','p':[681,430.5],'est':1})

# --- NVDB: road signs and speed humps -------------------------------------------------------------------------------------------------------
a_=6378137.0;f_=1/298.257222101;n_=f_/(2-f_);A_=a_/(1+n_)*(1+n_**2/4+n_**4/64);K0=.9996;E0=500000.0;L0=math.radians(15)
al=[n_/2-2*n_**2/3+5*n_**3/16,13*n_**2/48-3*n_**3/5,61*n_**3/240]
be=[n_/2-2*n_**2/3+37*n_**3/96,n_**2/48+n_**3/15,17*n_**3/480]
def to_utm(lon,lat):
 p=math.radians(lat);dl=math.radians(lon)-L0;q=2*math.sqrt(n_)/(1+n_)
 t=math.sinh(math.atanh(math.sin(p))-q*math.atanh(q*math.sin(p)))
 xi=math.atan2(t,math.cos(dl));eta=math.atanh(math.sin(dl)/math.sqrt(1+t*t))
 xi2=xi+sum(al[j]*math.sin(2*(j+1)*xi)*math.cosh(2*(j+1)*eta) for j in range(3));eta2=eta+sum(al[j]*math.cos(2*(j+1)*xi)*math.sinh(2*(j+1)*eta) for j in range(3))
 return E0+K0*A_*eta2,K0*A_*xi2
def from_utm(E,Nn):
 xi=Nn/(K0*A_);eta=(E-E0)/(K0*A_)
 de=[2*n_-2*n_**2/3-2*n_**3,7*n_**2/3-8*n_**3/5,56*n_**3/15]
 xi1=xi-sum(be[j]*math.sin(2*(j+1)*xi)*math.cosh(2*(j+1)*eta) for j in range(3));eta1=eta-sum(be[j]*math.cos(2*(j+1)*xi)*math.sinh(2*(j+1)*eta) for j in range(3))
 chi=math.asin(math.sin(xi1)/math.cosh(eta1));p=chi+sum(de[j]*math.sin(2*(j+1)*chi) for j in range(3))
 return math.degrees(L0+math.atan2(math.sinh(eta1),math.cos(xi1))),math.degrees(p)
to_local=lambda E,Nn:[round((from_utm(E,Nn)[0]-lon0)*sx,2),round((lat0-from_utm(E,Nn)[1])*111320,2)]
def nvdb(type_id,props):
 ll=lambda x,z:(lon0+x/sx,lat0-z/111320);cs=[to_utm(*ll(x,z)) for x in (BOX[0],BOX[2]) for z in (BOX[1],BOX[3])]
 box=f'{min(c[0] for c in cs):.1f},{min(c[1] for c in cs):.1f},{max(c[0] for c in cs):.1f},{max(c[1] for c in cs):.1f}'
 for url,head in ((f'https://nvdbapiles.atlas.vegvesen.no/vegobjekter/api/v4/vegobjekter/{type_id}?kartutsnitt={box}&srid=5973&inkluder=egenskaper,lokasjon,geometri&antall=1000',{'Accept':'application/json','X-Client':'sofiatur'}),
  (f'https://nvdbapiles.atlas.vegvesen.no/vegobjekter/{type_id}?kartutsnitt={box}&srid=5973&inkluder=egenskaper,lokasjon,geometri&antall=1000',{'Accept':'application/vnd.vegvesen.nvdb-v3-rev1+json','X-Client':'sofiatur'})):
  for k in range(3):
   try:
    with urllib.request.urlopen(urllib.request.Request(url,headers=head),timeout=90) as r:d=json.load(r)
    out=[]
    for o in d.get('objekter',[]):
     wkt=[e.get('verdi') for e in o.get('egenskaper',[]) if str(e.get('verdi','')).startswith(('POINT','POLYGON'))]
     g=o.get('geometri',{}).get('wkt') or (wkt[0] if wkt else '')
     nums=[float(v) for v in re.findall(r'-?\d+\.?\d*',g.split('(',1)[1])] if '(' in g else []
     step=3 if ' Z' in g.split('(')[0] else 2 # E N (Z) values
     pts=[(nums[i],nums[i+1]) for i in range(0,len(nums)-1,step)] if g.startswith('POLYGON') else [(nums[0],nums[1])]
     e={x['navn']:x.get('verdi') for x in o.get('egenskaper',[]) if x['navn'] in props}
     out.append({'id':o['id'],'p':[to_local(*q) for q in pts],'e':e})
    return out
   except Exception as ex:
    print('NVDB retry',type_id,k,ex,file=sys.stderr);time.sleep(2*(k+1))
 sys.exit('NVDB did not answer')
if NVDB_FILE.exists():NV=json.loads(NVDB_FILE.read_text())
else:
 NV={'source':'Statens vegvesen, Nasjonal vegdatabank (NVDB), NLOD; fetched '+time.strftime('%Y-%m-%d')+' for the box x %d..%d, z %d..%d'%BOX,
  'signs':nvdb(96,('Skiltnummer','Tekst','Ansiktsside, rettet mot')),'humps':nvdb(103,('Type','Profil','Etableringsår')),'speed':nvdb(105,('Fartsgrense',))}
 NVDB_FILE.write_text(json.dumps(NV,ensure_ascii=False,separators=(',',':')))
# nearest drawn road to a point: (distance, road id, unit tangent along the road's order, side: + when the point lies to the driver's right of that tangent)
road_lines=[(str(r['id']),r,[tuple(p) for p in r['p']]) for r in D['roads'] if r['type'] not in ('footway','path','cycleway','steps','pedestrian') and any(inbox(p,(440,240,970,740)) for p in r['p'])]
def nearest_road(x,z):
 best=None
 for rid,r,p in road_lines:
  for a,b in zip(p,p[1:]):
   dx,dz=b[0]-a[0],b[1]-a[1];l2=dx*dx+dz*dz or 1e-9;t=max(0,min(1,((x-a[0])*dx+(z-a[1])*dz)/l2));qx,qz=a[0]+t*dx,a[1]+t*dz;d=math.hypot(x-qx,z-qz)
   if best is None or d<best[0]:
    l=math.sqrt(l2);tx,tz=dx/l,dz/l;best=(d,rid,(tx,tz),((x-qx)*-tz+(z-qz)*tx),(qx,qz))
 return best
KEEP={'142','808.161','372','552','834','302','366','368','522','362.30','362.40','362.50','527.3','516'}
groups=collections.OrderedDict()
for s in NV['signs']:
 nr=str(s['e'].get('Skiltnummer','')).split(' ')[0]
 if nr not in KEEP or nr=='516':continue # gangfelt signs are drawn with the crossings (street-details.js)
 p=s['p'][0]
 if not inbox(p,(500,290,920,690)):continue
 groups.setdefault((round(p[0]*2)/2,round(p[1]*2)/2),[]).append((nr,s))
signs=[]
for (x,z),lst in groups.items():
 near=nearest_road(x,z)
 if near is None or near[0]>14:continue
 d,rid,t,side,q=near
 # the sign stands on the driver's right: of the two directions along the road the one that has the sign on its right is the traffic it is for
 serve=t if side>0 else (-t[0],-t[1])
 plates=[]
 for nr,s in lst:
  e=s['e'];plates.append({'t':nr,**({'x':e['Tekst']} if e.get('Tekst') and nr in ('808.161',) else {})})
 order=['366','142','362.30','362.40','362.50','522','552','372','302','368','808.161','834','527.3']
 plates.sort(key=lambda p:order.index(p['t']) if p['t'] in order else 99)
 signs.append({'p':[R(x,2),R(z,2)],'n':[R(-serve[0],3),R(-serve[1],3)],'r':rid,'pl':plates,'o':'nvdb96:'+','.join(str(s['id']) for _,s in lst)})
# --- Speed humps and raised junction areas -> data.street.tables (the kinds street-details.js knows: hump, table) --------------------------------------
D['street']['tables']=[t for t in D['street']['tables'] if not str(t.get('o','')).startswith('nvdb103:')]
tables=[];
def centroid(p):return (sum(q[0] for q in p)/len(p),sum(q[1] for q in p)/len(p))
for h in NV['humps']:
 c=h['p'][0] if len(h['p'])==1 else centroid(h['p'])
 if not inbox(c,(500,290,920,690)):continue
 near=nearest_road(*c)
 if near is None or near[0]>8:continue
 kind='hump' if len(h['p'])==1 else 'table'
 tables.append({'p':[R(near[4][0],2),R(near[4][1],2)] if kind=='hump' else [R(c[0],2),R(c[1],2)],'d':[R(near[2][0],3),R(near[2][1],3)],'r':near[1],'k':kind,'o':'nvdb103:'+str(h['id'])})
D['street']['tables'].extend(tables)

# The chain-link fence along the school's west side (OSM w463622207, tagged chain_link only; the roadside gives mesh fences 1.8 m) is about 1.2-1.5 m in the photograph of the campus
# board (dlight/Interiørfoto 2015): the playground behind it is seen over it.
for b in D['roadside']['barriers']:
 if 'w463622207' in str(b.get('o','')).split('+') and b['k']=='fence':b['h']=1.3
D['schoolyard']={'site':ring(site),'kinder':ring(kinder),'paved':paved,'surfaces':surfaces,'equipment':equipment,'objects':objects,'courts':courts,'signs':signs,'lots':lots,
 'source':'OpenStreetMap (ODbL, byasen.osm), Statens vegvesen NVDB (NLOD); equipment, surfaces and objects as seen in the photographs of docs/dalgard-references.md'}
M.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
print('site %.0f m2, paved %d parts %.0f m2, %d surfaces, %d equipment (%s), %d objects, %d signs on %d poles, %d humps/tables, %d car parks'%(site.area,len(paved),sum(Polygon(p['p']).area for p in paved),len(surfaces),len(equipment),
 dict(collections.Counter(e['k'] for e in equipment)),len(objects),sum(len(s['pl']) for s in signs),len(signs),len(tables),len(lots)))
