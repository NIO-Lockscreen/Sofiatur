# Helpers shared by add-buildings.py, audit-buildings.py and audit-junction-buildings.py (30 September 2026).
import math

def type_class(c):
    """Class of a Matrikkelen building type (SSB bygningstype): house, semi (two dwellings), terrace, block, garage, cabin, public."""
    return 'house' if 111<=c<=113 else 'semi' if c in (121,122,123) else 'terrace' if c in (131,132,133) else 'block' if 141<=c<=146 or c in (135,136,159) else 'garage' if 181<=c<=189 else 'cabin' if 161<=c<=169 else 'public'

def osm_class(t):
    """The same classes for an OSM building tag (anything else is returned as it is)."""
    return {'house':'house','detached':'house','semidetached_house':'semi','terrace':'terrace','apartments':'block','garage':'garage','garages':'garage','shed':'garage','carport':'garage','cabin':'cabin'}.get(t,'public' if t in ('school','kindergarten','civic','commercial','retail','office','warehouse','industrial','hospital','church','chapel') else t)

def inside(p,x,z):
    ins=False
    for i in range(len(p)):
        ax,az=p[i-1];bx,bz=p[i]
        if (az>z)!=(bz>z) and x<(bx-ax)*(z-az)/(bz-az)+ax:ins=not ins
    return ins

def seg_dist(x,z,a,b):
    dx=b[0]-a[0];dz=b[1]-a[1];t=max(0,min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz or 1)))
    return math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)

def area(p):return abs(sum(p[i][0]*p[(i+1)%len(p)][1]-p[(i+1)%len(p)][0]*p[i][1] for i in range(len(p)))/2)
def centre(p):return sum(v[0] for v in p)/len(p),sum(v[1] for v in p)/len(p)
