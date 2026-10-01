# Forest and tree type from AR5 (30 September 2026). AR5 is the national land-resource map (NIBIO, NLOD / CC BY 4.0): it says where
# there is forest and whether it is coniferous (barskog), deciduous (lauvskog) or mixed (blandingsskog). NIBIO serves it as a WMS
# (https://wms.nibio.no/cgi-bin/ar5, layer Treslag); this asks for the layer as a 1 m/pixel picture in UTM 33 (EPSG:25833),
# tile by tile, and reads the class from the exact colour of the layer's legend (not from a photograph: the layer is the thematic
# AR5 map). The classes are then sampled into cells of 5 m in the game's local metres (x east, z south of home) and written to
# ar5-skog.json as run-length rows, which add-roadside.py puts into dist/map.json. Run: python3 fetch-ar5.py [out.json]
# (needs network access and PIL and numpy; about a minute)
import json,math,sys,io,time,urllib.request
from pathlib import Path
import numpy as np
from PIL import Image

D=json.loads(Path('dist/map.json').read_text());lon0,lat0=D['origin'];sx=111320*math.cos(math.radians(lat0))
OUT=Path(sys.argv[1] if len(sys.argv)>1 else 'ar5-skog.json')
X0,X1,Z0,Z1=-450,2800,-1200,1900;CELL=5

# EPSG:25833 (GRS80, UTM 33, central meridian 15 E) forward transform, Kruger series (same as fetch-nvdb.py)
a_=6378137.0;f_=1/298.257222101;n_=f_/(2-f_);A_=a_/(1+n_)*(1+n_**2/4+n_**4/64);K0=.9996;E0=500000.0;L0=math.radians(15)
al=[n_/2-2*n_**2/3+5*n_**3/16,13*n_**2/48-3*n_**3/5,61*n_**3/240]
def to_utm(lon,lat):
 p=math.radians(lat);dl=math.radians(lon)-L0;q=2*math.sqrt(n_)/(1+n_)
 t=math.sinh(math.atanh(math.sin(p))-q*math.atanh(q*math.sin(p)))
 xi=math.atan2(t,math.cos(dl));eta=math.atanh(math.sin(dl)/math.sqrt(1+t*t))
 xi2=xi+sum(al[j]*math.sin(2*(j+1)*xi)*math.cosh(2*(j+1)*eta) for j in range(3));eta2=eta+sum(al[j]*math.cos(2*(j+1)*xi)*math.sinh(2*(j+1)*eta) for j in range(3))
 return E0+K0*A_*eta2,K0*A_*xi2
def utm(x,z):return to_utm(lon0+x/sx,lat0-z/111320)

corners=[utm(x,z) for x in (X0,X1) for z in (Z0,Z1)]
e0,e1=math.floor(min(c[0] for c in corners)),math.ceil(max(c[0] for c in corners))
n0,n1=math.floor(min(c[1] for c in corners)),math.ceil(max(c[1] for c in corners))
W,H=e1-e0,n1-n0 # one pixel per metre
mosaic=np.zeros((H,W,3),np.uint8)+255
T=800
for ty in range(n0,n1,T):
 for tx in range(e0,e1,T):
  bx1,by1=min(tx+T,e1),min(ty+T,n1)
  url=f"https://wms.nibio.no/cgi-bin/ar5?service=WMS&version=1.1.1&request=GetMap&layers=Treslag&styles=&srs=EPSG:25833&bbox={tx},{ty},{bx1},{by1}&width={bx1-tx}&height={by1-ty}&format=image/png&transparent=false"
  for k in range(5):
   try:
    with urllib.request.urlopen(url,timeout=90) as r:im=Image.open(io.BytesIO(r.read())).convert('RGB');break
   except Exception as e:print('retry',k,e,file=sys.stderr);time.sleep(2*(k+1))
  else:raise SystemExit('WMS did not answer')
  arr=np.asarray(im);mosaic[H-(by1-n0):H-(ty-n0),tx-e0:bx1-e0]=arr
  print('tile',tx,ty,file=sys.stderr)
# legend colours of the layer Treslag: Barskog, Lauvskog, Blandingsskog (Ikke tresatt is not forest)
COLOURS={1:(125,191,110),2:(128,255,8),3:(158,204,115)}
cls=np.zeros((H,W),np.uint8)
for k,c in COLOURS.items():cls[(np.abs(mosaic.astype(int)-np.array(c)).sum(axis=2)<=12)]=k
# sample cells of CELL m in local metres: the class of the majority of the 3 x 3 pixels round the cell centre (0 = not forest)
nx,nz=(X1-X0)//CELL,(Z1-Z0)//CELL;rows=[];total={0:0,1:0,2:0,3:0}
for j in range(nz):
 row=[]
 for i in range(nx):
  e,n=utm(X0+(i+.5)*CELL,Z0+(j+.5)*CELL);px,py=int(round(e-e0)),H-1-int(round(n-n0))
  if not (1<=px<W-1 and 1<=py<H-1):row.append(0);continue
  w=cls[py-1:py+2,px-1:px+2].ravel();c=int(np.bincount(w,minlength=4).argmax()) if w.any() else 0;row.append(c)
 for c in row:total[c]+=1
 runs=[];prev=row[0];count=0
 for c in row:
  if c==prev:count+=1
  else:runs.append(f'{prev}:{count}');prev=c;count=1
 runs.append(f'{prev}:{count}');rows.append(' '.join(runs))
OUT.write_text(json.dumps({'source':'NIBIO AR5 (WMS Treslag, NLOD), fetched 30 September 2026','x0':X0,'z0':Z0,'cell':CELL,'nx':nx,'nz':nz,'classes':{'1':'barskog','2':'lauvskog','3':'blandingsskog'},'rows':rows},separators=(',',':')))
ha=lambda n:n*CELL*CELL/10000
print(f"{nx} x {nz} cells of {CELL} m; forest: barskog {ha(total[1]):.0f} ha, lauvskog {ha(total[2]):.0f} ha, blandingsskog {ha(total[3]):.0f} ha; {OUT.stat().st_size} bytes")
