# Dalgård: the school's buildings and part of the sports grounds at Dalgård idrettspark are OSM multipolygon
# relations, which prepare-map.py (ways only) leaves out, and the pitches it does keep carry no surface. This fetches
# them from Overpass and adds them to dist/map.json: the three school buildings with their inner rings (A-bygget's
# courtyard, B-bygget's roof lantern), the pitches, the running track and the car parks with the tags the game
# draws them by (sport, surface), and name labels for the school and the ice rink. The car park beside Dalgård ishall
# gets its service roads (missing in the extract) and becomes a place to drive to (map_fixes.add_ishall_parking).
# Run after prepare-map.py and add-lakes.py; running it again replaces what it added. Optional argument: a saved
# Overpass JSON answer.
import json,math,subprocess,sys,time
from pathlib import Path
from map_fixes import add_ishall_parking
SCHOOL=['1318241','20722521','20516148'] # A-bygget, B-bygget and the southern wings (C, D) of Dalgård skole
SPORT_RELATIONS=['17382112','18194305','18968858'] # running track, Byåsen Arena (inside the track), padel courts
SPORT_WAYS=['89233502','89233480','423825299','423825300','89247085','1112589245','1249412407']
PARKING=['89247027','325373937','1375965336','709882419','709882420','1309124363','1309124365']
AISLES=['160676281','325373939','1364102244'] # service road and parking aisles beside Dalgård ishall
M=Path('dist/map.json');D=json.loads(M.read_text());lon0,lat0=D['origin'];sx=111320*math.cos(math.radians(lat0))
src=Path(sys.argv[1]) if len(sys.argv)>1 else None
if src:raw=json.loads(src.read_text())
else:
 # The public mirror often answers a busy error page: try a few times.
 q='[out:json][timeout:90];('+''.join(f'relation({r});' for r in SCHOOL+SPORT_RELATIONS)+''.join(f'way({w});' for w in SPORT_WAYS+PARKING+AISLES)+');out geom;'
 for attempt in range(6):
  r=subprocess.run(['curl','-sS','--max-time','150','https://maps.mail.ru/osm/tools/overpass/api/interpreter','--data-urlencode','data='+q],capture_output=True)
  try:raw=json.loads(r.stdout);break
  except ValueError:time.sleep(5*(attempt+1))
 else:sys.exit('Overpass did not answer; try again later or pass a saved answer')
local=lambda g:[round((g['lon']-lon0)*sx,2),round((lat0-g['lat'])*111320,2)]
def rings(members):
 """Join member ways end to end into closed rings (first point not repeated)."""
 parts=[[local(g) for g in m['geometry']] for m in members];out=[]
 while parts:
  ring=parts.pop(0)
  while ring[0]!=ring[-1]:
   for k,p in enumerate(parts):
    if p[0]==ring[-1]:ring+=p[1:];break
    if p[-1]==ring[-1]:ring+=p[::-1][1:];break
   else:break
   parts.pop(k)
  out.append(ring[:-1] if ring[0]==ring[-1] else ring)
 return out
closed=lambda ring:ring+[ring[0]]
def centre(ring):
 ring=ring[:-1] if ring[0]==ring[-1] else ring
 return (sum(p[0] for p in ring)/len(ring),sum(p[1] for p in ring)/len(ring))
els={(e['type'],str(e['id'])):e for e in raw['elements']}
missing=[k for k in [('relation',r) for r in SCHOOL+SPORT_RELATIONS]+[('way',w) for w in SPORT_WAYS+PARKING+AISLES] if k not in els]
if missing:sys.exit(f'Overpass answer lacks {missing}')
buildings=[];areas=[]
for rid in SCHOOL:
 rel=els[('relation',rid)];outer=rings([m for m in rel['members'] if m['role']=='outer'])
 holes=rings([m for m in rel['members'] if m['role']=='inner'])
 assert len(outer)==1,rid
 buildings.append({'id':'r'+rid,'p':closed(outer[0]),'holes':[closed(h) for h in holes],'t':rel['tags']})
def sport(tags,osm,ring,holes=()):
 kind='track' if tags.get('leisure')=='track' else 'pitch'
 return {'type':kind,'name':tags.get('name',''),'sport':tags.get('sport',''),'surface':tags.get('surface','grass'),'osm':osm,'p':ring,'holes':list(holes)}
for rid in SPORT_RELATIONS:
 rel=els[('relation',rid)];holes=rings([m for m in rel['members'] if m['role']=='inner'])
 for ring in rings([m for m in rel['members'] if m['role']=='outer']):areas.append(sport(rel['tags'],'r'+rid,ring,holes))
for wid in SPORT_WAYS:
 w=els[('way',wid)];ring=[local(g) for g in w['geometry']];areas.append(sport(w['tags'],'w'+wid,ring[:-1] if ring[0]==ring[-1] else ring))
for wid in PARKING:
 w=els[('way',wid)];ring=[local(g) for g in w['geometry']];areas.append({'type':'parking','name':'','osm':'w'+wid,'p':ring[:-1] if ring[0]==ring[-1] else ring,'holes':[]})
# prepare-map.py kept some of these pitches as plain ways without their tags: drop those copies.
new_centres=[centre(a['p']) for a in areas]
dup=lambda a:a['type'] in ('pitch','track') and 'osm' not in a and any(math.hypot(centre(a['p'])[0]-c[0],centre(a['p'])[1]-c[1])<3 for c in new_centres)
ours={a['osm'] for a in areas}
D['areas']=[a for a in D['areas'] if not dup(a) and a.get('osm') not in ours]+areas
D['buildings']=[b for b in D['buildings'] if b['id'] not in {b['id'] for b in buildings}]+buildings
labels=[{'x':713.0,'z':452.0,'name':'Dalgård skole','type':'school'},{'x':916.5,'z':594.0,'name':'Dalgård ishall','type':'sports_centre'}]
D['pois']=[p for p in D['pois'] if p['name'] not in {l['name'] for l in labels}]+labels
known={str(r['id']) for r in D['roads']}
for wid in AISLES:
 if wid not in known:D['roads'].append({'id':wid,'p':[local(g) for g in els[('way',wid)]['geometry']],'name':'','type':'service','surface':'asphalt','mark':False})
add_ishall_parking(D)
M.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
for b in buildings:print(b['id'],b['t'].get('name',''),len(b['p'])-1,'points',len(b['holes']),'inner rings')
for a in areas:print(a['osm'],a['type'],a.get('name') or a.get('sport'),a.get('surface',''),len(a['p']),'points',len(a['holes']),'holes')
