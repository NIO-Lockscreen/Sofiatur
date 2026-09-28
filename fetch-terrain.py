import json,math,urllib.parse,subprocess,concurrent.futures,pathlib
D=json.load(open('dist/map.json'));lon,lat=D['origin'];sx=111320*math.cos(math.radians(lat)); step=40; x0=-240;z0=-720;nx=64;nz=40
points=[[round(lon+(x0+i*step)/sx,7),round(lat-(z0+j*step)/111320,7)] for j in range(nz) for i in range(nx)]
pathlib.Path('terrain-cache').mkdir(exist_ok=True)
def task(item):
 i,ps=item;f=pathlib.Path(f'terrain-cache/{i}.json')
 if not f.exists():
  url='https://ws.geonorge.no/hoydedata/v1/punkt?'+urllib.parse.urlencode({'koordsys':4326,'punkter':json.dumps(ps,separators=(',',':'))})
  r=subprocess.run(['curl','-sS','--retry','2','--max-time','90',url],capture_output=True)
  if r.returncode:raise RuntimeError(r.stderr)
  d=json.loads(r.stdout)
  assert len(d['punkter'])==len(ps),d
  f.write_bytes(r.stdout)
 return i,json.load(open(f))['punkter']
result=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for i,p in pool.map(task,[(i,points[i:i+50]) for i in range(0,len(points),50)]):
  result.extend(p);print('height points',len(result),'/',len(points),flush=True)
assert all(p['z'] is not None for p in result)
D=json.load(open('dist/map.json'))
D['terrain']={'x0':x0,'z0':z0,'step':step,'nx':nx,'nz':nz,'heights':[p['z'] for p in result],'source':'Kartverket DTM1','sampleSpacingMetres':40}
pathlib.Path('dist/map.json').write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
print('RANGE',min(p['z'] for p in result),max(p['z'] for p in result))
