# Footbridges and pedestrian underpasses (30 September 2026): the paths of byasen.osm that go over or under a road and that
# add-street-details.py skips ("bridges and tunnels are not modelled"). This reads the extract and adds one key, `footbridges`,
# to dist/map.json: dist/footbridges.js draws it, measuring the drawn road and ground (surface.heightAt, groundTop) for the
# heights. What is OSM and what is an estimate: docs/footbridges.md. Run after add-street-details.py (it also cuts the paths
# that the dips of the underpasses replace out of `street.paths`, so run it again after every run of add-street-details.py).
import json,math,collections
import xml.etree.ElementTree as ET
from pathlib import Path
from map_fixes import in_added

M=Path('dist/map.json');D=json.loads(M.read_text());lon0,lat0=D['origin'];sx=111320*math.cos(math.radians(lat0))
in_region=lambda x,z:-220<x<2220 and -700<z<820 or in_added(x,z)
osm=ET.parse('byasen.osm').getroot()
tags=lambda e:{t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
N={n.attrib['id']:(round((float(n.attrib['lon'])-lon0)*sx,2),round((lat0-float(n.attrib['lat']))*111320,2)) for n in osm.iter('node')}
WAYS={}
for w in osm.iter('way'):
 ids=[n.attrib['ref'] for n in w.findall('nd')]
 if all(i in N for i in ids):WAYS[w.attrib['id']]={'ids':ids,'t':tags(w)}
R=lambda v,k=2:round(v,k)
unit=lambda dx,dz:(dx/(math.hypot(dx,dz) or 1),dz/(math.hypot(dx,dz) or 1))
PATHS=('footway','cycleway','path')
lengthOf=lambda pts:sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(pts,pts[1:]))
def crossed(a,b,c,d):
 rx,rz,sx_,sz=b[0]-a[0],b[1]-a[1],d[0]-c[0],d[1]-c[1];den=rx*sz-rz*sx_
 if abs(den)<1e-9:return None
 t=((c[0]-a[0])*sz-(c[1]-a[1])*sx_)/den;u=((c[0]-a[0])*rz-(c[1]-a[1])*rx)/den
 if 0<=t<=1 and 0<=u<=1:return t
 return None
def seg_dist(p,a,b):
 dx,dz=b[0]-a[0],b[1]-a[1];l=dx*dx+dz*dz or 1e-9;t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l));return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz),t
def poly_dist(p,pts):
 best=(1e9,0,0)
 for i,(a,b) in enumerate(zip(pts,pts[1:])):
  d,t=seg_dist(p,a,b)
  if d<best[0]:best=(d,i,t)
 return best

# --- Graph of the paths: to follow a bridge or a tunnel out to where the ground is level again --------------------------------
walkable=lambda w:w['t'].get('highway') in PATHS and w['t'].get('footway')!='crossing' and w['t'].get('cycleway')!='crossing' and 'crossing' not in w['t'] and not w['t'].get('indoor') and w['t'].get('tunnel')!='building_passage'
node_ways=collections.defaultdict(list) # OSM node -> (way id, index in the way)
for i,w in WAYS.items():
 if w['t'].get('highway') in PATHS+('steps',):
  for k,n in enumerate(w['ids']):node_ways[n].append((i,k))
def runout(node,heading,limit,skip,straight=None):
 """Follow the paths on from `node` (arriving with the unit vector `heading`) for `limit` m, always taking the way that goes straightest on;
 stops at a turn sharper than 80 degrees (and, with `straight`, where the path leaves the first heading by more than acos(straight)), a bridge, a tunnel or a crossing. Returns points [x,z] (the first is the node) and the pieces used
 as (way id, from index, to index, length walked)."""
 pts=[list(N[node])];used=[];left=limit;seen=set(skip);d=heading
 while left>.01:
  best=None
  for wid,k in node_ways[node]:
   w=WAYS[wid]
   if wid in seen or not walkable(w) or w['t'].get('bridge') or w['t'].get('tunnel'):continue
   for step in (1,-1):
    if not 0<=k+step<len(w['ids']):continue
    v=unit(N[w['ids'][k+step]][0]-N[node][0],N[w['ids'][k+step]][1]-N[node][1]);c=v[0]*d[0]+v[1]*d[1]
    if straight is not None and v[0]*heading[0]+v[1]*heading[1]<straight:continue
    if best is None or c>best[0]:best=(c,wid,k,step)
  if best is None or best[0]<.17:break
  c,wid,k,step=best;ids=WAYS[wid]['ids'];seen.add(wid);j=k;walked=0
  while 0<=j+step<len(ids) and left>.01:
   a,b=N[ids[j]],N[ids[j+step]];l=math.hypot(b[0]-a[0],b[1]-a[1])
   if l<=left:pts.append(list(b));left-=l;walked+=l;j+=step;d=unit(b[0]-a[0],b[1]-a[1])
   else:f=left/l;pts.append([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);walked+=left;left=0;d=unit(b[0]-a[0],b[1]-a[1]);break
  used.append((wid,k,j,round(walked,2)))
  node=ids[j]
  if left>.01 and j+step not in range(len(ids)):pass
 return pts,used

# --- Drawn roads, to know what a bridge crosses and what a tunnel passes under ---------------------------------------------------
ROADS={str(r['id']):r for r in D['roads']}
def crossings_with_roads(pts,bridges=False):
 found=[]
 for a,b in zip(pts,pts[1:]):
  for rid,r in ROADS.items():
   if bool(r.get('bridge'))!=bridges:continue
   p=r['p']
   if max(a[0],b[0])<min(q[0] for q in p)-2 or min(a[0],b[0])>max(q[0] for q in p)+2 or max(a[1],b[1])<min(q[1] for q in p)-2 or min(a[1],b[1])>max(q[1] for q in p)+2:continue
   for c,d in zip(p,p[1:]):
    t=crossed(a,b,c,d)
    if t is not None:found.append(rid)
 return sorted(set(found))

# Widths of the decks (m, all of it: path, edge beams): Statens vegvesen's bridge register (NVDB, object 60, NLOD) gives the Stavset
# footbridge ("Stavset Gangbru", concrete slab bridge of 1997, 37 m, longest span 17 m, 4.34 m wide); the others are by kind.
NVDB={'191325644':{'w':4.34,'name':'Stavset Gangbru'},'191325643':{'w':5.0,'name':'Stavset (kulvert)'}}
def deck_width(i,t):
 if i in NVDB:return NVDB[i]['w']
 if t.get('width'):
  try:return max(1.6,min(6,float(t['width'])+.8))
  except ValueError:pass
 return {'cycleway':3.6,'footway':2.6,'path':2.0}[t['highway']]

def attach_steps(line,skip):
 """Mapped steps (highway=steps) that start on the line (within 2 m): [{'id','p'}] with the points from the attached end outwards."""
 out=[]
 for i,w in WAYS.items():
  if w['t'].get('highway')!='steps' or i in skip or w['t'].get('bridge'):continue
  pts=[list(N[n]) for n in w['ids']]
  if not any(in_region(*p) for p in pts):continue
  for rev in (False,True):
   q=pts[::-1] if rev else pts
   d,k,t=poly_dist(q[0],line)
   if d<2:
    out.append({'id':'w'+i,'p':[[R(v[0]),R(v[1])] for v in q],'n':int(w['t'].get('step_count',0)) or None,'at':[R(q[0][0]),R(q[0][1])]});break
 return out

bridges=[];tunnels=[];skipped=[]
for i,w in sorted(WAYS.items()):
 t=w['t'];hw=t.get('highway')
 if hw not in PATHS:continue
 pts=[list(N[n]) for n in w['ids']]
 if not any(in_region(*p) for p in pts):continue
 if t.get('bridge')=='yes':
  if t.get('surface')=='fibre_reinforced_polymer_grate' or lengthOf(pts)<3:skipped.append((i,'stair landing or too short'));continue
  a,b=w['ids'][0],w['ids'][-1]
  # a bridge that joins no other path (a mapping leftover on a lawn) is not drawn
  if len(node_ways[a])<2 and len(node_ways[b])<2:skipped.append((i,'joins no path'));continue
  over=crossings_with_roads(pts);beside=None
  # parallel to a road bridge (Kystadbrua, Dalgårdbrua): its own deck next to the road's, at the road deck's level
  for rid,r in ROADS.items():
   if r.get('bridge') and not over and all(poly_dist(p,r['p'])[0]<14 for p in pts):beside=rid;break
  if any(r.get('bridge') and any(poly_dist(p,r['p'])[0]<r['width']/2+.5 for p in pts) for r in ROADS.values()):skipped.append((i,'lies under or in a road bridge'));continue
  kind='road' if over else 'beside' if beside else 'span'
  d0=unit(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]);d1=unit(pts[-1][0]-pts[-2][0],pts[-1][1]-pts[-2][1])
  lim=80 if kind=='road' else 0
  ra,ua=runout(a,(-d0[0],-d0[1]),lim,{i},.8) if lim else ([list(N[a])],[])
  rb,ub=runout(b,d1,lim,{i},.8) if lim else ([list(N[b])],[])
  line=ra[::-1][:-1]+pts+rb[1:]
  e={'id':'w'+i,'k':kind,'w':R(deck_width(i,t),2),'p':[[R(v[0]),R(v[1])] for v in pts],'a':[[R(v[0]),R(v[1])] for v in ra[1:]],'b':[[R(v[0]),R(v[1])] for v in rb[1:]],
     'hw':hw,'steps':attach_steps(line,{i})}
  if t.get('surface'):e['s']=t['surface']
  if kind=='road':e['over']=over
  if beside:e['beside']=beside
  if i in NVDB:e['name']=NVDB[i]['name']
  bridges.append(e)
 elif t.get('tunnel') in ('yes','culvert'):
  if len(pts)<2:continue
  over=crossings_with_roads(pts)
  if not over:skipped.append((i,'under nothing that is drawn (a tram bridge, or a road left out of the game)'));continue
  a,b=w['ids'][0],w['ids'][-1]
  d0=unit(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]);d1=unit(pts[-1][0]-pts[-2][0],pts[-1][1]-pts[-2][1])
  # the way down: layer=-1 paths on either side are the mapped approach (they come first when they are the straightest way on)
  ra,ua=runout(a,(-d0[0],-d0[1]),70,{i});rb,ub=runout(b,d1,70,{i})
  line=ra[::-1][:-1]+pts+rb[1:]
  e={'id':'w'+i,'w':R(4.4 if hw=='cycleway' else 3.2,1),'p':[[R(v[0]),R(v[1])] for v in pts],'a':[[R(v[0]),R(v[1])] for v in ra[1:]],'b':[[R(v[0]),R(v[1])] for v in rb[1:]],'hw':hw,
     'ua':ua,'ub':ub,'over':over}
  if t.get('surface'):e['s']=t['surface']
  if i in NVDB:e['name']=NVDB[i]['name']
  tunnels.append(e)

# --- The paths the dips replace: cut out of street.paths. A path in a cutting is drawn by dist/footbridges.js along the whole run-out. ---
def split_by_arc(pts,k,step,walked):
 """The two pieces of a polyline that a walk from vertex k in direction step, `walked` m long, did not cover (original orientation, None if gone)."""
 n=len(pts);before=pts[:k+1] if step==1 else pts[k:]
 before=before if len(before)>=2 else None
 left=walked;idx=k
 while 0<=idx+step<n:
  a,b=pts[idx],pts[idx+step];l=math.hypot(b[0]-a[0],b[1]-a[1])
  if l<=left+1e-6:left-=l;idx+=step;continue
  f=left/l;cut=[R(a[0]+(b[0]-a[0])*f),R(a[1]+(b[1]-a[1])*f)]
  after=[cut]+pts[idx+1:] if step==1 else pts[:idx]+[cut]
  return before,after if len(after)>=2 else None
 return before,None
cut_len=0;S=D.get('street')
if S and S.get('paths_cut'):print('street.paths already cut by an earlier run (add-street-details.py writes them afresh)');S=None
if S:
 pieces={}
 for e in tunnels:
  for used in (e['ua'],e['ub']):
   for wid,k,j,walked in used:pieces[wid]=(k,1 if j>k else -1,walked)
 new=[]
 for p in S['paths']:
  key=p['o'][1:] if p['o'].startswith('w') else None
  if key not in pieces:new.append(p);continue
  k,step,walked=pieces[key];before,after=split_by_arc(p['p'],k,step,walked);cut_len+=walked
  for q in (before,after):
   if q:new.append({**p,'p':q})
 S['paths']=new
 # Other paths that touch a cutting (a sidewalk that passes the mouth of an underpass, a path that joins the approach) lose what lies within 3.4 m of the
 # first 50 m of the way down: the walls and the hole in the ground would be under them. Pieces under 4 m go.
 def first(run,length):
  out=[];left=length
  for a,b in zip(run,run[1:]):
   l=math.hypot(b[0]-a[0],b[1]-a[1])
   if l<=left:out.append((a,b));left-=l
   else:f=left/l;out.append((a,[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]));break
  return out
 cuts=[(a,b) for e in tunnels for run in ([e['p'][0]]+e['a'],[e['p'][1]]+e['b']) for a,b in first(run,50)]
 near_cut=lambda x,z:any(seg_dist((x,z),a,b)[0]<3.4 for a,b in cuts)
 kept=[];trimmed=0
 def cut_polyline(pts,bad):
  """None if no point of the line is bad; else the pieces of it that are not (vertices kept, cut points every .5 m)."""
  samples=[]  # (x,z,vertex?)
  for k,(a,b) in enumerate(zip(pts,pts[1:])):
   l=math.hypot(b[0]-a[0],b[1]-a[1]);m=max(1,int(l/.5))
   for j in range(0 if k==0 else 1,m+1):samples.append((a[0]+(b[0]-a[0])*j/m,a[1]+(b[1]-a[1])*j/m,j==m or (k==0 and j==0)))
  flags=[bad(x,z) for x,z,_ in samples]
  if not any(flags):return None
  pieces=[];cur=[]
  for (x,z,v),f in zip(samples,flags):
   if f:
    if len(cur)>=2:pieces.append(cur)
    cur=[]
   elif v or not cur:cur.append([R(x),R(z)])
  if len(cur)>=2:pieces.append(cur)
  return pieces
 for p in new:
  pieces=cut_polyline(p['p'],near_cut)
  if pieces is None:kept.append(p);continue
  trimmed+=1
  for q in pieces:
   if lengthOf(q)>=4:kept.append({**p,'p':q})
 S['paths']=kept;S['paths_cut']='footbridges'

D['footbridges']={'bridges':bridges,'tunnels':tunnels,'source':'OpenStreetMap (ODbL), byasen.osm; widths of the Stavset footbridge from Statens vegvesen NVDB (NLOD); see docs/footbridges.md'}
M.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
print(f"footbridges: {len(bridges)} bridges ({collections.Counter(b['k'] for b in bridges)}), {len(tunnels)} underpasses, {sum(len(e['steps']) for e in bridges)} mapped steps attached; cut {cut_len:.0f} m of path out of street.paths; data {len(json.dumps(D['footbridges'],separators=(',',':')))} bytes")
for i,why in skipped:print('  not drawn',i,why)
