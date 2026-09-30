# Kyvatnet and Lianvatnet are OSM multipolygon relations, which prepare-map.py (ways only) leaves out.
# This fetches their outlines from Overpass and adds them as water areas, and widens the terrain grid so both lakes
# lie on the ground.
# Terrain (30 September 2026): the measured grid ends at x=-200 (west) and z=-680 (north). Beyond it the heights used to
# continue from the nearest measured edge value, which left the lakes in flat terraces with walls at the shore. They
# now come from Mapzen terrain tiles through OpenTopoData (dataset 'mapzen', about 30 m resolution, whole metres), like
# the rows south to Stavset (add-stavset.py), because Kartverket's height service still did not answer. At the edge the
# difference to the measured grid is carried over and fades out within 160 m, so the ground has no step there.
# The water surface comes from EU-DEM, which is flat on lakes (see below).
import json,math,subprocess,sys,time
from pathlib import Path
LAKES={'5258705':'Kyvannet','3672373':'Lianvannet'} # OSM relation -> name shown in the game (local usage)
M=Path('dist/map.json');D=json.loads(M.read_text());lon0,lat0=D['origin'];sx=111320*math.cos(math.radians(lat0))
src=Path(sys.argv[1]) if len(sys.argv)>1 else None
if src:raw=json.loads(src.read_text())
else:
 q='[out:json][timeout:90];('+''.join(f'relation({r});' for r in LAKES)+');out geom;'
 r=subprocess.run(['curl','-sS','--max-time','120','https://maps.mail.ru/osm/tools/overpass/api/interpreter','--data-urlencode','data='+q],capture_output=True,check=True);raw=json.loads(r.stdout)
local=lambda g:[round((g['lon']-lon0)*sx,2),round((lat0-g['lat'])*111320,2)]
def rings(members):
 """Join member ways end to end into closed rings."""
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
lakes=[]
for rel in raw['elements']:
 outer=rings([m for m in rel['members'] if m['role']=='outer' and 'geometry' in m])
 holes=rings([m for m in rel['members'] if m['role']=='inner' and 'geometry' in m])
 ring=max(outer,key=len)
 lakes.append({'type':'water','name':LAKES[str(rel['id'])],'osm':rel['id'],'p':ring,'holes':holes})
# Widen the terrain grid (40 m) to cover the lakes with a margin; new points take the nearest existing value.
t=D['terrain'];step=t['step']
xs=[p[0] for l in lakes for p in l['p']];zs=[p[1] for l in lakes for p in l['p']]
x0=min(t['x0'],math.floor((min(xs)-80)/step)*step);z0=min(t['z0'],math.floor((min(zs)-80)/step)*step)
x1=max(t['x0']+(t['nx']-1)*step,math.ceil((max(xs)+80)/step)*step);z1=max(t['z0']+(t['nz']-1)*step,math.ceil((max(zs)+80)/step)*step)
nx=(x1-x0)//step+1;nz=(z1-z0)//step+1
old=lambda i,j:t['heights'][min(t['nz']-1,max(0,j))*t['nx']+min(t['nx']-1,max(0,i))]
heights=[old((x0+i*step-t['x0'])//step,(z0+j*step-t['z0'])//step) for j in range(nz) for i in range(nx)]
if (x0,z0,nx,nz)!=(t['x0'],t['z0'],t['nx'],t['nz']):
 D['terrain']={**t,'x0':x0,'z0':z0,'nx':nx,'nz':nz,'heights':heights,'extended':'Grid widened to the west and north for the lakes; heights there continue from the nearest measured edge value.'}
th=D['terrain']
# Mapzen heights beyond the measured grid, offset to its edge (see the top). Cached in terrain-cache/ (not committed).
WEST_EDGE,NORTH_EDGE,FADE=-200,-680,160
n=th['nx'];cols=[th['x0']+i*step for i in range(n)];rows=[th['z0']+j*step for j in range(th['nz'])]
need=[(x,z) for z in rows for x in cols if x<=WEST_EDGE or z<=NORTH_EDGE] # the edge itself too, for the offset
cache=Path('terrain-cache/mapzen-lakes.json');got=json.loads(cache.read_text()) if cache.exists() else {}
todo=[p for p in need if f'{p[0]},{p[1]}' not in got]
for k in range(0,len(todo),100):
 chunk=todo[k:k+100];loc='|'.join(f'{lat0-z/111320:.7f},{lon0+x/sx:.7f}' for x,z in chunk)
 for attempt in range(5):
  r=subprocess.run(['curl','-sS','--max-time','60','-G','https://api.opentopodata.org/v1/mapzen','--data-urlencode','locations='+loc],capture_output=True)
  try:res=json.loads(r.stdout);assert res['status']=='OK';break
  except (ValueError,AssertionError,KeyError):time.sleep(3*(attempt+1))
 else:raise SystemExit('OpenTopoData did not answer')
 for (x,z),p in zip(chunk,res['results']):got[f'{x},{z}']=p['elevation']
 cache.parent.mkdir(exist_ok=True);cache.write_text(json.dumps(got));time.sleep(1.1) # at most one call a second
at=lambda x,z:(z-th['z0'])//step*n+(x-th['x0'])//step
measured=lambda x,z:th['heights'][at(x,z)];mapzen=lambda x,z:got[f'{x},{z}']
for x,z in need:
 if x>=WEST_EDGE and z>=NORTH_EDGE:continue # the measured edge stays
 ex,ez=max(x,WEST_EDGE),max(z,NORTH_EDGE) # nearest measured point on the edge
 off=measured(ex,ez)-mapzen(ex,ez);w=max(0,1-math.hypot(ex-x,ez-z)/FADE)
 th['heights'][at(x,z)]=round(mapzen(x,z)+off*w,2)
th.pop('extended',None);th['lakes']=f'West of x={WEST_EDGE} and north of z={NORTH_EDGE}: Mapzen terrain (OpenTopoData), offset to the measured edge, fading out within {FADE} m.'
def height(x,z):
 a=max(0,min(th['nx']-1.001,(x-th['x0'])/step));b=max(0,min(th['nz']-1.001,(z-th['z0'])/step));i=int(a);j=int(b);u=a-i;v=b-j;h=th['heights'];n=th['nx']
 return (h[j*n+i]*(1-u)+h[j*n+i+1]*u)*(1-v)+(h[(j+1)*n+i]*(1-u)+h[(j+1)*n+i+1]*u)*v
def inside(ring,x,z):
 c=False
 for (ax,az),(bx,bz) in zip(ring[-1:]+ring[:-1],ring):
  if (az>z)!=(bz>z) and x<(bx-ax)*(z-az)/(bz-az)+ax:c=not c
 return c
# Water surface: EU-DEM (OpenTopoData dataset 'eudem25m'), which is flat on lakes, at the grid points inside the lake;
# the median, but no higher than the low rim of the shore (the 5th percentile of the ground along the outline, every
# 5 m), since water cannot stand above the ground round it. Mapzen is not flat on water (Lianvannet from 219 m in the
# north to 214 m in the south lobe, where the ground round it lies lower: a level from it left pits beside the water).
# EU-DEM has Lianvannet at 211.9 m all over, within its shore; for Kyvannet it says 187.5 m, above the measured shore
# (184-186 m), so the rim decides there. Cached in terrain-cache/eudem-lakes.json.
cache=Path('terrain-cache/eudem-lakes.json');hydro=json.loads(cache.read_text()) if cache.exists() else {}
for l in lakes:
 wet=[(x,z) for z in rows for x in cols if inside(l['p'],x,z) and not any(inside(h,x,z) for h in l['holes'])]
 todo=[p for p in wet if f'{p[0]},{p[1]}' not in hydro]
 for k in range(0,len(todo),100):
  chunk=todo[k:k+100];loc='|'.join(f'{lat0-z/111320:.7f},{lon0+x/sx:.7f}' for x,z in chunk)
  for attempt in range(5):
   r=subprocess.run(['curl','-sS','--max-time','60','-G','https://api.opentopodata.org/v1/eudem25m','--data-urlencode','locations='+loc],capture_output=True)
   try:res=json.loads(r.stdout);assert res['status']=='OK';break
   except (ValueError,AssertionError,KeyError):time.sleep(3*(attempt+1))
  else:raise SystemExit('OpenTopoData did not answer')
  for (x,z),p in zip(chunk,res['results']):hydro[f'{x},{z}']=p['elevation']
  cache.write_text(json.dumps(hydro));time.sleep(1.1)
 levels=sorted(hydro[f'{x},{z}'] for x,z in wet if hydro.get(f'{x},{z}') is not None)
 rim=[];ring=l['p']
 for (ax,az),(bx,bz) in zip(ring,ring[1:]+ring[:1]):
  n=max(1,int(math.hypot(bx-ax,bz-az)/5));rim+=[height(ax+(bx-ax)*k/n,az+(bz-az)*k/n) for k in range(n)]
 rim.sort();low=rim[len(rim)//20]
 l['level']=round(min(levels[len(levels)//2],low) if len(levels)>=3 else low,2)
# Name label inside each lake, 40 m in from the shore point nearest to a road the car can drive.
road_nodes=[D['nodes'][n] for e in D['edges'] for n in (e['from'],e['to'])]
for l in lakes:
 shore=min(l['p'],key=lambda p:min((p[0]-q[0])**2+(p[1]-q[1])**2 for q in road_nodes))
 cx=sum(p[0] for p in l['p'])/len(l['p']);cz=sum(p[1] for p in l['p'])/len(l['p']);d=math.hypot(cx-shore[0],cz-shore[1])
 l['label']=[round(shore[0]+(cx-shore[0])*40/d,2),round(shore[1]+(cz-shore[1])*40/d,2)]
D['areas']=[a for a in D['areas'] if a.get('osm') not in {l['osm'] for l in lakes}]+lakes
M.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
for l in lakes:print(l['name'],len(l['p']),'points',len(l['holes']),'islands','level',l['level'])
print('terrain x',x0,x1,'z',z0,z1,'grid',nx,'x',nz)
