# Downloads the registered road addresses (Kartverket "Adresser", open data, CC BY 4.0) within 300 m of Dalgård skole and
# writes data/dalgard-addresses.json: [address text, x, z] in local metres (x east, z south of home, as dist/map.json).
# 1 October 2026. Used by audit-dalgard-neighbourhood.py to give every building round the school an address, which is what
# the listing photos (FINN, broker pages) are found by. Service: https://ws.geonorge.no/adresser/v1/punktsok (no key).
import json,math,subprocess,sys
from pathlib import Path
lon0,lat0=10.32727325,63.39945456
sx=111320*math.cos(math.radians(lat0));sz=111320
CX,CZ,R=700,460,300
lat=lat0-CZ/sz;lon=lon0+CX/sx
rows={};page=0
while True:
 url='https://ws.geonorge.no/adresser/v1/punktsok?lat=%.6f&lon=%.6f&radius=%d&treffPerSide=500&side=%d&asciiKompatibel=true'%(lat,lon,R,page)
 out=subprocess.run(['curl','-sS','--fail','--max-time','90',url],capture_output=True,check=True).stdout.decode('utf-8')
 d=json.loads(out)
 for a in d['adresser']:
  p=a['representasjonspunkt']
  x=round((p['lon']-lon0)*sx,1);z=round((lat0-p['lat'])*sz,1)
  rows[a['adressetekst']]=[a['adressetekst'],x,z,a.get('objtype')]
 print('page',page,len(d['adresser']),file=sys.stderr)
 if len(d['adresser'])<500:break
 page+=1
Path('data').mkdir(exist_ok=True)
Path('data/dalgard-addresses.json').write_text(json.dumps({'source':'Kartverket, Adresser (https://ws.geonorge.no/adresser/v1), CC BY 4.0, downloaded 2026-10-01','columns':['adresse','x','z','type'],'centre':[CX,CZ],'radius':R,'rows':sorted(rows.values())},separators=(',',':'),ensure_ascii=False))
print(len(rows),'addresses')
