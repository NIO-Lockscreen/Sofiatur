# Fetch Statens vegvesen NVDB objects along the roads of the map (30 September 2026): guard rails, fences, noise barriers, walls,
# trees, bushes, street furniture, lamps, signs, accesses. NVDB (https://nvdbapiles.atlas.vegvesen.no, NLOD licence) answers in
# EPSG:5973 (ETRS89 / UTM 33 + NN2000 height); the geometry is converted here to the game's local metres (x east, z south of
# home; origin and scale as in map.json) and written, with the properties that are used, to nvdb-roadside.json, which
# add-roadside.py reads. Run: python3 fetch-nvdb.py [out.json]   (needs network access; about two minutes)
import json,math,sys,re,time,urllib.request,urllib.parse
from pathlib import Path

D=json.loads(Path('dist/map.json').read_text());lon0,lat0=D['origin'];sx=111320*math.cos(math.radians(lat0))
OUT=Path(sys.argv[1] if len(sys.argv)>1 else 'nvdb-roadside.json')
API='https://nvdbapiles.atlas.vegvesen.no'
HEAD={'Accept':'application/vnd.vegvesen.nvdb-v3-rev1+json','X-Client':'sofiatur'}

# --- EPSG:25833 / 5973 (GRS80, UTM zone 33: central meridian 15 E, scale 0.9996, false easting 500 000) <-> lon/lat (Kruger series) -------
a_=6378137.0;f_=1/298.257222101;n_=f_/(2-f_);A_=a_/(1+n_)*(1+n_**2/4+n_**4/64);K0=.9996;E0=500000.0;L0=math.radians(15)
al=[n_/2-2*n_**2/3+5*n_**3/16,13*n_**2/48-3*n_**3/5,61*n_**3/240]
be=[n_/2-2*n_**2/3+37*n_**3/96,n_**2/48+n_**3/15,17*n_**3/480]
de=[2*n_-2*n_**2/3-2*n_**3,7*n_**2/3-8*n_**3/5,56*n_**3/15]
def to_utm(lon,lat):
 p=math.radians(lat);dl=math.radians(lon)-L0;q=2*math.sqrt(n_)/(1+n_)
 t=math.sinh(math.atanh(math.sin(p))-q*math.atanh(q*math.sin(p)))
 xi=math.atan2(t,math.cos(dl));eta=math.atanh(math.sin(dl)/math.sqrt(1+t*t))
 xi2=xi+sum(al[j]*math.sin(2*(j+1)*xi)*math.cosh(2*(j+1)*eta) for j in range(3));eta2=eta+sum(al[j]*math.cos(2*(j+1)*xi)*math.sinh(2*(j+1)*eta) for j in range(3))
 return E0+K0*A_*eta2,K0*A_*xi2
def from_utm(E,N):
 xi=N/(K0*A_);eta=(E-E0)/(K0*A_)
 xi1=xi-sum(be[j]*math.sin(2*(j+1)*xi)*math.cosh(2*(j+1)*eta) for j in range(3));eta1=eta-sum(be[j]*math.cos(2*(j+1)*xi)*math.sinh(2*(j+1)*eta) for j in range(3))
 chi=math.asin(math.sin(xi1)/math.cosh(eta1));p=chi+sum(de[j]*math.sin(2*(j+1)*chi) for j in range(3))
 return math.degrees(L0+math.atan2(math.sinh(eta1),math.cos(xi1))),math.degrees(p)
def to_local(E,N):
 lon,lat=from_utm(E,N);return round((lon-lon0)*sx,2),round((lat0-lat)*111320,2)

# The region: a box round everything the game draws (roads run x -410..2780, z -1170..1870)
X0,X1,Z0,Z1=-450,2800,-1200,1900
ll=lambda x,z:(lon0+x/sx,lat0-z/111320)
corners=[to_utm(*ll(x,z)) for x in (X0,X1) for z in (Z0,Z1)]
BOX=(min(c[0] for c in corners),min(c[1] for c in corners),max(c[0] for c in corners),max(c[1] for c in corners))

# type id: (key, properties kept)
# Names are NVDB's own property names (Norwegian).
TYPES={5:('rekkverk',['Rekkverkstype','Bruksområde','Skinneutrustning','Stolpeavstand']),
 7:('gjerde',['Type','Bruksområde','Høyde, gjennomsnitt','Overflatebehandling']),
 3:('skjerm',['Bruksområde','Materiale skjerm','Farge','Høyde','Utforming topp']),
 62:('stottekonstruksjon',['Type','Høyde, synlig, gjennomsnitt','Høyde, synlig, maksimal','Bruksområde','Forblending']),
 199:('trær',['Treslag, norsk navn','Treslag, botanisk navn','Løvfellende/vintergrønne','Type/gruppering','Høyde','Kronediameter','Antall']),
 511:('busker',['Norsk navn','Type','Areal','Løvfellende/Vintergrønne']),
 27:('renovasjon',['Type']),28:('utemobler',['Type','Materialtype']),451:('sykkelparkering',[]),
 46:('avkjorsel',['Bruksområde'])}
# Fetched and not used: Belysningspunkt (87) and Lysmast (181), the road authority's lamps (the street details draw the OSM lamps, and the lights are someone
# else's); Skiltplate (96), signs: only 5 of them stand in the map region (the municipal streets have none in NVDB); Rekkverksende (14).
def get(url):
 for k in range(5):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers=HEAD),timeout=90) as r:return json.load(r)
  except Exception as e:
   print('retry',k,e,file=sys.stderr);time.sleep(2*(k+1))
 raise SystemExit('NVDB did not answer: '+url)
def wkt(s):
 """List of [E,N,height] lists for a POINT/LINESTRING/POLYGON/MULTI* wkt (only the first ring of a polygon), and the kind."""
 kind=s.split('(')[0].replace('Z','').replace('M','').strip().upper()
 groups=re.findall(r'\(([^()]+)\)',s)
 out=[[tuple(float(v) for v in p.split()) for p in g.split(',')] for g in groups]
 return kind,out
KEEP={}
result={'source':'Statens vegvesen, Nasjonal vegdatabank (NVDB), https://nvdbapiles.atlas.vegvesen.no, NLOD 2.0; fetched 30 September 2026; EPSG:5973 converted to local metres','types':{}}
for tid,(key,props) in TYPES.items():
 url=f"{API}/vegobjekter/{tid}?"+urllib.parse.urlencode({'kartutsnitt':','.join(f'{v:.1f}' for v in BOX),'srid':'5973','inkluder':'egenskaper,geometri','antall':'1000'})
 items=[];pages=0
 while url:
  d=get(url);pages+=1
  for o in d['objekter']:
   g=o.get('geometri')
   if not g or 'wkt' not in g:continue
   kind,rings=wkt(g['wkt'])
   pts=[[*to_local(p[0],p[1]),round(p[2],1) if len(p)>2 else None] for p in rings[0]]
   ev={e['navn']:e.get('verdi') for e in o.get('egenskaper',[]) if e.get('navn') in props}
   items.append({'id':o['id'],'k':kind,'p':pts,**({'e':ev} if ev else {})})
  url=(d.get('metadata',{}).get('neste') or {}).get('href') if d.get('metadata',{}).get('returnert',0)>=1000 else None
 result['types'][key]={'typeid':tid,'objects':items}
 print(f'{tid:4} {key:20} {len(items):5} objects ({pages} pages)')
OUT.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
print('wrote',OUT,OUT.stat().st_size,'bytes')
