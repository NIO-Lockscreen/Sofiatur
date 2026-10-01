import xml.etree.ElementTree as ET,json,math,heapq,collections
from map_fixes import merge_close_junctions,add_school_parking_spur,add_kiwi_parking,in_added,SOUTH,LAKESIDE,apply_road_widths,fit_roundabouts
from pathlib import Path
r=ET.parse('byasen.osm').getroot(); lat0=63.39945456;lon0=10.32727325
sx=111320*math.cos(math.radians(lat0)); sz=111320
nodes={n.attrib['id']:{'x':(float(n.attrib['lon'])-lon0)*sx,'z':(lat0-float(n.attrib['lat']))*sz,'lat':float(n.attrib['lat']),'lon':float(n.attrib['lon']),'tags':{t.attrib['k']:t.attrib['v'] for t in n.findall('tag')}} for n in r.findall('node')}
ways=[]
for w in r.findall('way'):
 ids=[n.attrib['ref'] for n in w.findall('nd')];t={x.attrib['k']:x.attrib['v'] for x in w.findall('tag')}
 if all(i in nodes for i in ids):ways.append({'id':w.attrib['id'],'ids':ids,'tags':t})
roads=[w for w in ways if w['tags'].get('highway') in ['residential','living_street','tertiary','secondary','primary','unclassified','service','tertiary_link','secondary_link','primary_link']]
# Junction audit (29 September 2026): the OSM roundabout rings lie 1-2.5 m outside the middle of the carriageway, which drew
# the islands 4-7 m too wide; the ring nodes are pulled in to the island measured on the aerial (map_fixes.ROUNDABOUT_ISLANDS).
# Roundabouts (30 September 2026): the ring is fitted as a true circle (least squares) and every ring node put on it.
fit_roundabouts(nodes,ways)
# User-marked kindergarten entrance: east access, not the apartment parking to the south.
# This short access lane is missing in the extract. Placement traced from user's map,
# not presented as a surveyed OSM way. Keep the real north/south street connected.
nodes['sofia-kindergarten-gate']={'x':1856.0,'z':260.0,'tags':{}}
nodes['sofia-kindergarten-bend']={'x':1879.0,'z':256.5,'tags':{}}
entrance={'id':'sofia-kindergarten-access','ids':['11253710556','sofia-kindergarten-bend','sofia-kindergarten-gate'],'tags':{'highway':'service','name':'Barnehagens innkjøring','surface':'asphalt'}}
ways.append(entrance);roads.append(entrance)
# Olaf Grilstads veg meets Konrad Dahls veg and Per Sivles veg at Myrahallen, but in the extract its way stops 28 m
# short of the junction (only a parking service road links them). Close the gap so the street can be driven from both ends.
olaf_link={'id':'olaf-grilstads-link','ids':['35682743','11254607435'],'tags':{'highway':'residential','name':'Olaf Grilstads veg','surface':'asphalt'}}
ways.append(olaf_link);roads.append(olaf_link)
for w in roads:
 if w['id'] in ['1214632503','24575743']:w['tags']['name']='Adolf Andreassens veg'
# Byåsveien's lanes at the Kystadlia roundabout part at a splitter island, but these two ways carry no oneway tag: in to
# the circle (1443998971) and out of it (1443998972), each in its drawing direction. Without it the car could leave the
# circle up the lane that comes in.
for w in roads:
 if w['id'] in ['1443998971','1443998972']:w['tags']['oneway']='yes'
# Include named roads and public access roads; small Hallset access lanes are scenery only.
graph=collections.defaultdict(list)
school_access={'1366229200','89285927','89285932'}
for w in roads:
 t=w['tags']; centerx=sum(nodes[n]['x'] for n in w['ids'])/len(w['ids']); centerz=sum(nodes[n]['z'] for n in w['ids'])/len(w['ids'])
 if t.get('highway')=='service' and 1450<centerx<2160 and 220<centerz<490 and w['id']!=entrance['id']:continue
 if t.get('highway')=='service' and w['id'] not in school_access and t.get('name')!='Herlofsons veg' and math.hypot(centerx-(10.3644442-lon0)*sx,centerz-(lat0-63.3972874)*sz)>140:continue
 drive=t.get('service')=='driveway' or t.get('access') in ['private','no'] or t.get('motor_vehicle')=='no'
 if drive and t.get('name')!='Herlofsons veg':continue
 # Only the through route past Ugla: leave its school-yard spur as scenery.
 ids=w['ids'][:3] if w['id']=='89285932' else w['ids']
 if w['id'] in school_access:t['name']='Ved Ugla skole'
 for a,b in zip(ids,ids[1:]):
  d=math.hypot(nodes[a]['x']-nodes[b]['x'],nodes[a]['z']-nodes[b]['z'])
  if t.get('oneway')!='-1':graph[a].append((b,d,w['id']))
  if t.get('oneway') not in ['yes','1','true'] and t.get('junction')!='roundabout':graph[b].append((a,d,w['id']))
start=min(graph,key=lambda n:math.hypot(nodes[n]['x'],nodes[n]['z']))
gx=(10.3644442-lon0)*sx;gz=(lat0-63.3972874)*sz
near=sorted(graph,key=lambda n:math.hypot(nodes[n]['x']-gx,nodes[n]['z']-gz))[:8]
print('start',start,nodes[start]); print('goal candidates',[(n,round(math.hypot(nodes[n]['x']-gx,nodes[n]['z']-gz))) for n in near])
end='sofia-kindergarten-gate'
byid={w['id']:w for w in ways}
def pathfind(start,end):
 dist={start:0};prev={};q=[(0,start)]
 while q:
  d,n=heapq.heappop(q)
  if n==end:break
  if d!=dist[n]:continue
  for b,c,w in graph[n]:
   dd=d+c*(8 if byid[w]['tags'].get('motor_vehicle')=='destination' else 1)
   if dd<dist.get(b,1e30):dist[b]=dd;prev[b]=(n,w);heapq.heappush(q,(dd,b))
 path=[end];wids=[]
 while path[-1]!=start:
  a,w=prev[path[-1]];path.append(a);wids.append(w)
 return list(reversed(path)),list(reversed(wids)),dist[end]
route,rw,length=pathfind(start,end); byid={w['id']:w for w in ways}
print('ROUTE',round(length),[(byid[w]['tags'].get('name','access'),w) for i,w in enumerate(rw) if not i or w!=rw[i-1]])
# Only roads within the chosen Byåsen district extent (and the regions added south and west, map_fixes). Keep a full
# connected subgraph around route.
valid={n for n in graph if -180<nodes[n]['x']<2180 and -620<nodes[n]['z']<730 or in_added(nodes[n]['x'],nodes[n]['z'])}
# retain component reachable from start via bidirectional adjacency
und=collections.defaultdict(set)
for a in valid:
 for b,d,w in graph[a]:
  if b in valid:und[a].add(b);und[b].add(a)
seen={start};todo=[start]
while todo:
 a=todo.pop()
 for b in und[a]:
  if b not in seen:seen.add(b);todo.append(b)
# junctions degree !=2 and named road transition; directed roundabout legal decision nodes
critical={n for n in seen if len(und[n])!=2}|{start,end}|({LAKESIDE}&seen)
# collapse graph chains to edges; retain orientation legality by walking outbound
edges=[]
for a in sorted(critical): # sorted: the same edge ids on every run
 for b,d,wid in graph[a]:
  if b not in seen:continue
  path=[a,b];total=d;names=[byid[wid]['tags'].get('name','Lokalvei')];cur=b;prev=a;wids=[wid]
  while cur not in critical:
   opts=[e for e in graph[cur] if e[0]!=prev and e[0] in seen]
   if not opts:break
   c,dd,ww=opts[0];path.append(c);total+=dd;wids.append(ww);prev,cur=cur,c
  if cur not in critical:critical_dummy=0;continue
  edges.append({'from':a,'to':cur,'path':path,'length':round(total,2),'name':collections.Counter(byid[x]['tags'].get('name','Lokalvei') for x in wids).most_common(1)[0][0],'restricted':any(byid[x]['tags'].get('motor_vehicle')=='destination' for x in wids),'roundabout':any(byid[x]['tags'].get('junction')=='roundabout' for x in wids)})
for i,e in enumerate(edges):e['id']=i
# street scenery, building footprints, real mapped POIs
buildings=[];areas=[];pois=[]
for w in ways:
 pts=[nodes[n] for n in w['ids']];cx=sum(p['x'] for p in pts)/len(pts);cz=sum(p['z'] for p in pts)/len(pts);t=w['tags']
 if not(-220<cx<2220 and -700<cz<820 or in_added(cx,cz)):continue
 poly=[[round(p['x'],2),round(p['z'],2)] for p in pts]
 if 'building' in t:buildings.append({'id':w['id'],'p':poly,'t':{k:v for k,v in t.items() if k in ['building','building:levels','building:material','building:facade:material','height','name','roof:shape','roof:colour','roof:direction','roof:height','roof:levels','roof:material','roof:angle','building:colour','amenity','shop']}})
 if t.get('landuse') in ['forest','grass','meadow','recreation_ground','allotments'] or t.get('natural') in ['water','wood'] or t.get('leisure') in ['pitch','park','playground']:areas.append({'p':poly,'type':t.get('natural',t.get('landuse',t.get('leisure'))),'name':t.get('name','')})
 if t.get('name') and (t.get('shop') or t.get('amenity') in ['school','kindergarten','fuel']):pois.append({'x':round(cx,2),'z':round(cz,2),'name':t['name'],'type':t.get('shop',t.get('amenity'))})
for n,p in nodes.items():
 t=p['tags']
 if (-220<p['x']<2220 and -700<p['z']<820 or in_added(p['x'],p['z'])) and t.get('name') and (t.get('shop') or t.get('amenity') in ['school','kindergarten','fuel']):pois.append({'x':round(p['x'],2),'z':round(p['z'],2),'name':t['name'],'type':t.get('shop',t.get('amenity'))})
nodeout={n:[round(nodes[n]['x'],2),round(nodes[n]['z'],2)] for e in edges for n in e['path']}
roadout=[{'id':w['id'],'p':[[round(nodes[n]['x'],2),round(nodes[n]['z'],2)] for n in w['ids']],'name':w['tags'].get('name',''),'type':w['tags']['highway'],'surface':w['tags'].get('surface','asphalt'),'mark':w['tags'].get('lane_markings')!='no' and w['tags']['highway'] in ['secondary','primary'] and w['tags'].get('oneway') not in ['yes','1','true','-1'] and w['tags'].get('junction')!='roundabout',**({'bridge':True} if w['tags'].get('bridge') not in [None,'no'] else {})} for w in roads if any(n in nodeout for n in w['ids']) or any(1450<nodes[n]['x']<2160 and 220<nodes[n]['z']<490 for n in w['ids'])]
data={'origin':[lon0,lat0],'nodes':nodeout,'edges':edges,'start':start,'goal':end,'home':[0,0],'destination':[round(gx,2),round(gz,2)],'routeLength':round(length),'roads':roadout,'buildings':buildings,'areas':areas,'pois':pois,'bounds':[-220,-700,2220,1470],'south':[list(p) for p in SOUTH],'source':{'map':'© OpenStreetMap contributors, ODbL','terrain':'Kartverket DTM1, CC BY 4.0','roadWidth':'Statens vegvesen NVDB (Vegbredde), NLOD','date':'2026-09-24'}}
data['rails']=[{'id':w['id'],'type':w['tags']['railway'],'bridge':w['tags'].get('bridge') not in [None,'no'],'layer':int(w['tags'].get('layer','0')),'gauge':float(w['tags'].get('gauge','1000').split(';')[0])/1000,'p':[[round(nodes[n]['x'],2),round(nodes[n]['z'],2)] for n in w['ids']]} for w in ways if w['tags'].get('railway') in ['tram','rail','light_rail'] and any(-220<nodes[n]['x']<2220 and -700<nodes[n]['z']<820 or in_added(nodes[n]['x'],nodes[n]['z']) for n in w['ids'])]
data['stops']=[{'id':n,'p':[round(p['x'],2),round(p['z'],2)],'name':p['tags'].get('name','Holdeplass'),'tram':p['tags'].get('railway')=='tram_stop'} for n,p in nodes.items() if (-220<p['x']<2220 and -700<p['z']<820 or in_added(p['x'],p['z'])) and (p['tags'].get('highway')=='bus_stop' or p['tags'].get('railway')=='tram_stop')]
data['source']['goal']='East entrance traced from user-marked map, 2026-09-25; approximate geometry.'
if LAKESIDE in nodeout:data['lakeside']=LAKESIDE # the turning circle by Lianvannet: a place to drive to (game.js, world.js)
preferred={'Herlofsons veg','Per Sivles veg','Uglavegen','Gamle Oslovei','General Bangs veg','Arnt Smistads veg','Selsbakkvegen','Nordre Hallsetveg','Lokalvei'}
for e in edges:e['cost']=round(e['length']*(8 if e.get('restricted') else 1 if e['name'] in preferred else 1.8),2)
merge_close_junctions(edges) # junctions a few metres apart are asked as one
if Path('dist/map.json').exists():
 old=json.loads(Path('dist/map.json').read_text())
 if 'terrain' in old:data['terrain']=old['terrain']
apply_road_widths(data) # carriageway widths from road_widths.py (Junction audit, 29 September 2026)
add_school_parking_spur(data);add_kiwi_parking(data) # extra arms: Palermo lights, KIWI parking (Dalgård ishall: add-dalgard.py)
Path('dist/map.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print('counts',len(edges),len(buildings),len(roadout),len(pois));print('POIS',pois)
