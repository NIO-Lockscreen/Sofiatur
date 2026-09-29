# Stavset: the strip south of the original box (map_fixes.SOUTH), which prepare-map.py takes from byasen.osm
# (fetch-osm.py). This adds what the game needs on top of that:
# - terrain south of z=840, where the measured Kartverket grid ends (see below), with a level plot under Stavset senter;
# - the customer car parks at Stavset senter and Bunnpris Ugla with their aisles, and a road into each of them
#   (map_fixes.add_rema_parking, map_fixes.add_bunnpris_parking): both are places to drive to.
# Run after prepare-map.py, add-lakes.py and add-dalgard.py; running it again replaces what it added.
#
# Terrain: Kartverket's height service (ws.geonorge.no/hoydedata) did not answer on 28 September 2026. The new rows
# come from Mapzen terrain tiles through OpenTopoData (dataset 'mapzen', about 30 m resolution, 1 m steps), sampled
# on the same 40 m grid. Against 100 measured points of the existing grid it is off by 0.1 m on average (5.3 m
# standard deviation). At the seam the difference to the last measured row is carried over and fades out within
# 160 m, so the ground has no step there. fetch-terrain.py covers the whole grid, if measured heights are wanted.
import json,math,subprocess,time,xml.etree.ElementTree as ET
from pathlib import Path
from map_fixes import add_rema_parking,add_bunnpris_parking,in_south,SOUTH
M=Path('dist/map.json');D=json.loads(M.read_text());lon0,lat0=D['origin'];sx=111320*math.cos(math.radians(lat0))

# --- Terrain -------------------------------------------------------------------------------------------------------
t=D['terrain'];step=t['step'];SEAM=840;FADE=160
z_end=math.ceil((max(z for x,z in SOUTH)+80)/step)*step
last=t['z0']+(t['nz']-1)*step
if last<z_end:
 assert last==SEAM,last
 rows=list(range(SEAM,z_end+step,step));cols=[t['x0']+i*step for i in range(t['nx'])]
 points=[(x,z) for z in rows for x in cols];cache=Path('terrain-cache/mapzen-south.json')
 if cache.exists():heights=json.loads(cache.read_text())
 else:
  heights=[]
  for k in range(0,len(points),100):
   loc='|'.join(f'{lat0-z/111320:.7f},{lon0+x/sx:.7f}' for x,z in points[k:k+100])
   for attempt in range(5):
    r=subprocess.run(['curl','-sS','--max-time','60','-G','https://api.opentopodata.org/v1/mapzen','--data-urlencode','locations='+loc],capture_output=True)
    try:res=json.loads(r.stdout);assert res['status']=='OK';break
    except (ValueError,AssertionError,KeyError):time.sleep(3*(attempt+1))
   else:raise SystemExit('OpenTopoData did not answer')
   heights+=[p['elevation'] for p in res['results']];time.sleep(1.1) # at most one call a second
  cache.parent.mkdir(exist_ok=True);cache.write_text(json.dumps(heights))
 grid={p:h for p,h in zip(points,heights)}
 seam={x:t['heights'][(t['nz']-1)*t['nx']+i]-grid[(x,SEAM)] for i,x in enumerate(cols)}
 new=[round(grid[(x,z)]+seam[x]*max(0,1-(z-SEAM)/FADE),2) for z in rows[1:] for x in cols]
 D['terrain']={**t,'nz':t['nz']+len(rows)-1,'heights':t['heights']+new,
  'south':f'Rows south of z={SEAM}: Mapzen terrain (OpenTopoData), offset to the measured row at z={SEAM}, fading out within {FADE} m.'}
# Stavset senter and its car park stand on a levelled plot; the coarse terrain falls 4 m along the shop front. The nine
# grid points under the centre and the car park get their mean height; the ground ramps to its neighbours within 40 m.
t=D['terrain'];plot=[(z-t['z0'])//step*t['nx']+(x-t['x0'])//step for z in (1320,1360,1400) for x in (120,160,200)]
level=round(sum(t['heights'][k] for k in plot)/len(plot),2)
for k in plot:t['heights'][k]=level

# --- Roads, car parks ----------------------------------------------------------------------------------------------
osm=ET.parse('byasen.osm').getroot()
nodes={n.attrib['id']:[round((float(n.attrib['lon'])-lon0)*sx,2),round((lat0-float(n.attrib['lat']))*111320,2)] for n in osm.iter('node')}
ways={w.attrib['id']:[n.attrib['ref'] for n in w.findall('nd')] for w in osm.iter('way')}
# Road bridges (Kystadbrua over the Kystad valley, Dalgårdbrua over Dalgård) carry OSM's bridge tag; prepare-map.py marks them.
PARKING={'89061200':'Stavset senter','207829382':'Bunnpris Ugla'}
D['areas']=[a for a in D['areas'] if a.get('osm') not in {'w'+w for w in PARKING}]
for wid,name in PARKING.items():D['areas'].append({'type':'parking','name':name,'osm':'w'+wid,'p':[nodes[n] for n in ways[wid][:-1]],'holes':[]})
AISLES=['89061191','23390718'] # the loop through Stavset senter's car park; the aisle along Bunnpris' front
known={str(r['id']) for r in D['roads']}
for wid in AISLES:
 if wid not in known:D['roads'].append({'id':wid,'p':[nodes[n] for n in ways[wid]],'name':'','type':'service','surface':'asphalt','mark':False})
add_rema_parking(D,{n:nodes[n] for w in ('18939739','89061191') for n in ways[w]},ways['18939739'],ways['89061191'])
add_bunnpris_parking(D,{n:nodes[n] for w in ('1364292850','23390718') for n in ways[w]},ways['1364292850'],ways['23390718'])
M.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
t=D['terrain'];print('terrain z',t['z0'],t['z0']+(t['nz']-1)*t['step'],'rows',t['nz'],'| edges',len(D['edges']),'| roads',len(D['roads']))
