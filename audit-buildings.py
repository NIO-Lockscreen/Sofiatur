# Audit of the building footprints against Matrikkelen (30 September 2026).
#
#   python3 audit-buildings.py            list the registered buildings without an OSM footprint near them (nothing is written)
#   python3 audit-buildings.py --write    write data/building-additions.json from CHOSEN below
#
# Method. data/matrikkel-bygningspunkt.json (fetch-matrikkel.py; Kartverket, CC BY 4.0) has one point per registered building. A
# point that lies inside no OSM footprint and is not within 6 m of one, and has no free OSM footprint (one without a register
# point of its own) within 18 m, is a candidate for a missing building. The candidates (registered as in use, finished or
# under construction) were looked at one by one on the Esri aerial photo with the game's footprints laid over it (viewing
# only; nothing was traced or sampled from the photo). CHOSEN is the list of those where a house, garage or block is plainly
# there and OSM has no outline of it; the rest (forest clearings, building sites, sheds hidden in shade, points that belong to a
# neighbour's footprint) are left out and listed in docs/junction-audit-buildings.md.
# For each chosen building the typical size of its registered type (median of the OSM footprints that carry that type) is placed
# on the register's point and turned like the nearest mapped house (or the nearest road); if it would touch a footprint or a
# road it is moved up to 4 m, else left out. The register's point, type and dwellings are real; the corners are not.
import json,math,sys
from pathlib import Path
from map_fixes import in_added
from building_lib import inside,seg_dist,area,centre

D=json.loads(Path('dist/map.json').read_text());MK=json.loads(Path('data/matrikkel-bygningspunkt.json').read_text())['rows']
B=[b for b in D['buildings'] if b.get('add')!='matrikkel']
cell={}
for i,b in enumerate(B):
    xs=[p[0] for p in b['p']];zs=[p[1] for p in b['p']]
    for cx in range(int(min(xs)//50),int(max(xs)//50)+1):
        for cz in range(int(min(zs)//50),int(max(zs)//50)+1):cell.setdefault((cx,cz),[]).append(i)
def near_buildings(x,z,r=1):
    out=set()
    for i in range(int(x//50)-r,int(x//50)+r+1):
        for j in range(int(z//50)-r,int(z//50)+r+1):out.update(cell.get((i,j),[]))
    return [B[i] for i in out]
def distance_to_building(x,z):
    best=1e9
    for b in near_buildings(x,z):
        p=b['p']
        if inside(p,x,z):return 0
        for k in range(len(p)-1):best=min(best,seg_dist(x,z,p[k],p[k+1]))
    return best
def long_axis(p):
    """Angle (radians, mod pi) of the long side of the smallest rectangle round the footprint."""
    best=None
    for i in range(len(p)-1):
        dx=p[i+1][0]-p[i][0];dz=p[i+1][1]-p[i][1];L=math.hypot(dx,dz)
        if L<.5:continue
        ux,uz=dx/L,dz/L;us=[q[0]*ux+q[1]*uz for q in p];vs=[-q[0]*uz+q[1]*ux for q in p]
        a=(max(us)-min(us))*(max(vs)-min(vs))
        if best is None or a<best[0]:best=(a,math.atan2(dz,dx) if max(us)-min(us)>=max(vs)-min(vs) else math.atan2(dz,dx)+math.pi/2)
    return best[1]%math.pi if best else 0
def road_segments():
    for r in D['roads']:
        for a,b in zip(r['p'],r['p'][1:]):yield a,b,(r.get('width') or (3.5 if r['type']=='service' else 5.2 if r['type']=='residential' else 6.5))

def candidates():
    """Registered buildings (in use, finished, temporary permit or under construction) with no OSM footprint at the point."""
    pts=[r for r in MK if (-220<r[1]<2220 and -700<r[2]<820 or in_added(r[1],r[2]))]
    claimed=set()
    for bn,x,z,ty,st,u in pts:
        for b in near_buildings(x,z):
            if inside(b['p'],x,z) or distance_to_building(x,z)<=6:claimed.add(b['id'])
    free=[b for b in B if b['id'] not in claimed and b['t'].get('building')!='roof']
    out=[]
    for bn,x,z,ty,st,u in pts:
        if distance_to_building(x,z)<=6:continue
        if any(math.hypot(centre(b['p'][:-1])[0]-x,centre(b['p'][:-1])[1]-z)<=18 for b in free if abs(centre(b['p'][:-1])[0]-x)<30):continue
        out.append([bn,x,z,ty,st,u])
    return out

SIZES={111:(12,9.5),112:(13,9.5),121:(15,9.5),122:(15,9.5),136:(19,12),181:(7,5.5)}
# bygningsnummer: (OSM-style building tag, registered type, note). Written to data/building-additions.json by --write.
CHOSEN={
 10564085:('house','Hus uten omriss i OSM ved kanten av det tidligere kartutsnittet'),
 301231598:('garage','Garasje ved veien'),301346406:('house','Byggetomt i flyfoto, byggetillatelse gitt (IG)'),301346408:('house','Byggetomt i flyfoto, byggetillatelse gitt (IG)'),
 301231607:('garage','Garasje skjult av skog ved Herlofsons veg'),301444199:('garage','Garasje ved hus'),301111709:('garage','Garasje ved rekkehus'),
 300759163:('semidetached_house','Tomannsbolig; to registrerte halvdeler, 300759166 er den andre'),
 300728844:('garage','Garasje'),301551464:('garage','Garasje ved hus'),300829950:('garage','Garasje ved veien'),301469011:('garage','Garasje'),
 300775303:('garage','Garasje ved hus'),301284141:('garage','Garasje ved veien'),301037450:('house','Hus under trær'),301059514:('house','Hus'),
 301240671:('garage','Bygning med mørkt tak'),301019838:('house','Hus'),300840907:('house','Rad av tre hus, første'),300840911:('house','Rad av tre hus, andre'),
 301085232:('house','Byggetomt, byggetillatelse gitt (IG)'),301085235:('house','Midlertidig brukstillatelse (MB), byggetomt i flyfoto'),
 300615363:('house','Hus med lyst flatt tak'),301175607:('house','Hus'),300785825:('house','Hus ved Bøckmans veg'),300849953:('house','Hus'),
 300911624:('house','Hus'),300567291:('house','Hus'),300911647:('garage','Garasje'),300752610:('house','Hus'),300846816:('house','Hus'),
 301503435:('garage','Garasje ved veien (IG)'),300830680:('apartments','Bolighus med fire boliger (136), stort mørkt tak'),
 300707395:('semidetached_house','Tomannsbolig; 300707438 er den andre halvdelen'),300707447:('garage','Garasje ved innkjørsel'),
 300713184:('garage','Liten bygning med flatt tak ved veien'),300892635:('garage','Garasje'),300840284:('house','Hus i rekke'),
 301231670:('garage','Garasje'),300776218:('garage','Garasje'),300821679:('garage','Garasje'),300766685:('house','Rekkehus i skygge'),
 300766676:('house','Rekkehus i skygge'),300842459:('house','Rekkehus i skygge'),300842461:('garage','Garasje ved rekke'),
 300782803:('house','Hus'),300782799:('house','Hus'),300678637:('house','Hus'),301277171:('house','Hus'),300754923:('garage','Liten bygning ved hus'),
 300815534:('garage','Garasje'),300782810:('house','Hus'),300782786:('house','Hus'),
 300945597:('house','Langt hus med mørkt tak, registrert som enebolig'),
}
# Buildings whose footprint is given by hand (by eye, from viewing the aerial photo; metres relative to the register point).
SPECIAL={
 10514746:{'building':'yes','levels':2,'roof':'gabled','note':'Stor bygning (registrert 719, helse/omsorg) ved Lianvannet, T-formet tak; omriss anslått for hånd',
           'p':[(-23,-10),(6,-10),(6,27),(-9,27),(-9,3),(-23,3)]},
}
MERGED={300759163:300759166,300707395:300707438}   # two register points, one building: drawn once between them
SIZE_OVERRIDE={300830680:(24,16),300945597:(16,8),300840907:(14,7.5),300840911:(14,7.5),301085232:(9,6.5),301085235:(9,6.5)}
ANGLE_OVERRIDE={300945597:-15,300840907:90,300840911:90,301085232:0,301085235:0}

def overlaps(poly,other):
    if any(inside(other,*v) for v in poly) or any(inside(poly,*v) for v in other[:-1]):return True
    def cross(a,b,c,d):
        o=lambda p,q,r:(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
        return o(a,b,c)*o(a,b,d)<0 and o(c,d,a)*o(c,d,b)<0
    return any(cross(poly[i],poly[(i+1)%len(poly)],other[j],other[j+1]) for i in range(len(poly)) for j in range(len(other)-1))
def rect(x,z,L,W,ang):
    c,s=math.cos(ang),math.sin(ang);return [[x+u*c-v*s,z+u*s+v*c] for u,v in [(-L/2,-W/2),(L/2,-W/2),(L/2,W/2),(-L/2,W/2)]]
def free_spot(x,z,L,W,ang,placed=()):
    for dx,dz in [(0,0),(2,0),(-2,0),(0,2),(0,-2),(3,3),(-3,3),(3,-3),(-3,-3),(4,0),(-4,0),(0,4),(0,-4)]:
        r=rect(x+dx,z+dz,L,W,ang)
        if any(overlaps(r,b['p']) for b in near_buildings(x,z,2)) or any(overlaps(r,q) for q in placed):continue
        if any(min(seg_dist(v[0],v[1],a,b) for v in r)<w/2+.8 for a,b,w in road_segments() if abs((a[0]+b[0])/2-x)<80 and abs((a[1]+b[1])/2-z)<80):continue
        return x+dx,z+dz
    return None
def neighbour_angle(x,z,garage):
    best=None
    for b in near_buildings(x,z,1):
        cx,cz=centre(b['p'][:-1]);a=area(b['p'])
        if a<60 and not garage:continue
        d=math.hypot(cx-x,cz-z)
        if d<35 and (best is None or d<best[0]):best=(d,long_axis(b['p']))
    if best:return best[1]
    bd=None
    for a,b,w in road_segments():
        d=seg_dist(x,z,a,b)
        if d<40 and (bd is None or d<bd[0]):bd=(d,math.atan2(b[1]-a[1],b[0]-a[0]))
    return bd[1] if bd else 0

if '--write' in sys.argv:
    rows={r[0]:r for r in MK};out=[];skipped=[];placed=[]
    for bn,(kind,note) in CHOSEN.items():
        r=rows[bn];ty=r[3];x,z=r[1],r[2]
        if bn in MERGED:o=rows[MERGED[bn]];x,z=(x+o[1])/2,(z+o[2])/2
        L,W=SIZE_OVERRIDE.get(bn) or SIZES[ty]
        ang=math.radians(ANGLE_OVERRIDE[bn]) if bn in ANGLE_OVERRIDE else neighbour_angle(x,z,kind=='garage')
        spot=free_spot(x,z,L,W,ang,placed)
        if not spot:skipped.append((bn,'no free spot'));continue
        placed.append(rect(spot[0],spot[1],L,W,ang)+[rect(spot[0],spot[1],L,W,ang)[0]])
        out.append({'ref':bn,'x':round(spot[0],2),'z':round(spot[1],2),'length':L,'width':W,'angle':round(math.degrees(ang),1),'building':kind,'type':ty,'status':r[4],'units':r[5]+(rows[MERGED[bn]][5] if bn in MERGED else 0),'note':note,**({'levels':3} if kind=='apartments' else {})})
    for bn,s in SPECIAL.items():
        r=rows[bn];out.append({'ref':bn,'x':r[1],'z':r[2],'building':s['building'],'type':r[3],'status':r[4],'units':r[5],'levels':s['levels'],'roof':s['roof'],'note':s['note'],'polygon':[[round(r[1]+a,2),round(r[2]+b,2)] for a,b in s['p']]})
    Path('data/building-additions.json').write_text(json.dumps({'source':'Matrikkelen - Bygningspunkt (Kartverket, CC BY 4.0) for position, type and dwellings; footprints are typical rectangles turned like the neighbours (see audit-buildings.py), looked at on the Esri aerial photo (viewing only)','buildings':out},ensure_ascii=False,indent=0))
    print(len(out),'written;',len(skipped),'skipped',skipped)
else:
    c=candidates();print(len(c),'registered buildings without an OSM footprint near them')
    import collections
    print(collections.Counter((r[3],r[4]) for r in c).most_common(12))
