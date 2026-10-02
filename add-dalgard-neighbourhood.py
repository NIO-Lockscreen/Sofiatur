# Street furniture round Dalgård skole that the photos show and the open data lacks (1 October 2026).
# Odd Husbys veg between Dalgårdvegen and the Drivhusvegen end was rebuilt in 2023-25 (Dalgårdstunet, Odd Husbys veg 4-8): OSM has the new
# houses and the road but no street lamps and no street trees. FINN 462751345 (photo 20, Odd Husbys veg looking at no. 4) and
# FINN 464171086 (photo 3, no. 6) show tall galvanised lamp posts with one arm and rows of young rowans on the grass strip between
# the sidewalk and the houses. Positions here are ESTIMATED: stations along the road's centre line, the offset from the photos
# (the strip beyond the sidewalk), not surveyed. Adds trees to data.roadside.trees and lamps to data.street.lamps of dist/map.json
# and records what it added in data.dalgardNeighbourhood so that running it again replaces it. Run last, after add-roadside.py.
import json,math,hashlib
from pathlib import Path
M=Path('dist/map.json');D=json.loads(M.read_text())
ROAD='233587696'            # Odd Husbys veg (tertiary, 6.8 m) from the Drivhusvegen end towards Dalgårdvegen
FROM_TO=((615.0,311.0),(512.0,422.0))
TREE_STEP,LAMP_STEP=11.0,34.0
KERB=0.7;SIDEWALK=2.2;GAP=0.4
# take away what an earlier run added
old=D.get('dalgardNeighbourhood')
if old:
 D['roadside']['trees']=[t for t in D['roadside']['trees'] if t not in old['trees']]
 D['street']['lamps']=[l for l in D['street']['lamps'] if l not in old['lamps']]
road=next(r for r in D['roads'] if str(r['id'])==ROAD);P=road['p'];W=road.get('width') or 6.8
def proj(p,a,b):
 dx,dz=b[0]-a[0],b[1]-a[1];l2=dx*dx+dz*dz or 1;t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l2));q=(a[0]+t*dx,a[1]+t*dz);return t,q,math.hypot(p[0]-q[0],p[1]-q[1])
def nearest_index(p):
 best=(1e9,0)
 for i in range(1,len(P)):
  d=proj(p,P[i-1],P[i])[2]
  if d<best[0]:best=(d,i)
 return best[1]
# arc length of the part of the road between the two ends
i0,i1=nearest_index(FROM_TO[0]),nearest_index(FROM_TO[1])
pts=P[min(i0,i1)-1:max(i0,i1)+1] if min(i0,i1)>0 else P[:max(i0,i1)+1]
if math.hypot(pts[0][0]-FROM_TO[0][0],pts[0][1]-FROM_TO[0][1])>math.hypot(pts[-1][0]-FROM_TO[0][0],pts[-1][1]-FROM_TO[0][1]):pts=pts[::-1]
def at(s):
 for i in range(1,len(pts)):
  l=math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])
  if s<=l:t=s/l;return (pts[i-1][0]+t*(pts[i][0]-pts[i-1][0]),pts[i-1][1]+t*(pts[i][1]-pts[i-1][1])),((pts[i][0]-pts[i-1][0])/l,(pts[i][1]-pts[i-1][1])/l)
  s-=l
 return None
total=sum(math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]) for i in range(1,len(pts)))
# the side the long blocks (OSM 1383932241, 1383932240) are on
b1=next(b for b in D['buildings'] if b['id']=='1383932241');c=[sum(v[0] for v in b1['p'][:-1])/(len(b1['p'])-1),sum(v[1] for v in b1['p'][:-1])/(len(b1['p'])-1)]
(m0,d0)=at(total/2);side=1 if ((c[0]-m0[0])*(-d0[1])+(c[1]-m0[1])*d0[0])>0 else -1
off=W/2+KERB+GAP+SIDEWALK+0.9           # trunk on the strip beyond the sidewalk
inside=lambda poly,x,z:sum(1 for i in range(len(poly)-1) if (poly[i][1]>z)!=(poly[i+1][1]>z) and x<(poly[i+1][0]-poly[i][0])*(z-poly[i][1])/(poly[i+1][1]-poly[i][1])+poly[i][0])%2==1
def free(x,z,clear):
 for b in D['buildings']:
  p=b['p']
  if min(v[0] for v in p)-clear>x or max(v[0] for v in p)+clear<x or min(v[1] for v in p)-clear>z or max(v[1] for v in p)+clear<z:continue
  if inside(p,x,z):return False
  for i in range(len(p)-1):
   if proj((x,z),p[i],p[i+1])[2]<clear:return False
 for r in D['roads']:
  w=(r.get('width') or 4)/2+KERB+0.5
  if r['id']==road['id'] and False:continue
  q=r['p']
  for i in range(1,len(q)):
   if proj((x,z),q[i-1],q[i])[2]<w and not (r['id']==road['id']):return False
 return True
trees=[];lamps=[]
h=lambda x,z:int(hashlib.md5(f'{x:.1f},{z:.1f}'.encode()).hexdigest()[:6],16)/0xffffff
s=TREE_STEP/2
while s<total:
 (p,d)=at(s);x,z=p[0]+side*-d[1]*off,p[1]+side*d[0]*off
 if free(x,z,1.6):trees.append([round(x,1),round(z,1),'r',round(4.2+1.4*h(x,z),1)])
 s+=TREE_STEP
s=LAMP_STEP/2
while s<total:
 (p,d)=at(s);x,z=p[0]+side*-d[1]*(off-0.9),p[1]+side*d[0]*(off-0.9)
 if free(x,z,1.0):lamps.append([round(x,2),round(z,2)])
 s+=LAMP_STEP
D['roadside']['trees']+=trees
D['street']['lamps']+=lamps
D['dalgardNeighbourhood']={'note':'estimated from photos, see add-dalgard-neighbourhood.py and docs/dalgard-neighbourhood.md','road':ROAD,'trees':trees,'lamps':lamps}
M.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
print(len(trees),'trees',len(lamps),'lamps along',round(total),'m of Odd Husbys veg, side',side,'offset',round(off,1))
