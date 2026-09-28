# Kyvatnet and Lianvatnet are OSM multipolygon relations, which prepare-map.py (ways only) leaves out.
# This fetches their outlines from Overpass and adds them as water areas, and widens the terrain grid so both lakes
# lie on the ground. Where the terrain grid is widened, heights continue from the nearest measured edge value:
# the lakes are scenery beside the roads, not surveyed (run fetch-terrain.py for measured heights).
import json,math,subprocess,sys
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
def height(x,z):
 a=max(0,min(th['nx']-1.001,(x-th['x0'])/step));b=max(0,min(th['nz']-1.001,(z-th['z0'])/step));i=int(a);j=int(b);u=a-i;v=b-j;h=th['heights'];n=th['nx']
 return (h[j*n+i]*(1-u)+h[j*n+i+1]*u)*(1-v)+(h[(j+1)*n+i]*(1-u)+h[(j+1)*n+i+1]*u)*v
for l in lakes:l['level']=round(min(height(*p) for p in l['p']),2) # water surface: the lowest shore point
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
