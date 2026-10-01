# Downloads the building points of Matrikkelen (Kartverket, open data, CC BY 4.0) for the area of the game and writes
# data/matrikkel-bygningspunkt.json: one row per registered building [bygningsnummer, x, z, bygningstype, status,
# bruksenheter], x east and z south of home in local metres (as dist/map.json). 30 September 2026.
#
# Why: OSM footprints are missing where a house was built after the building import, and prepare-map.py cannot tell.
# Matrikkelen is the official register, so a registered building without an OSM footprint next to it is a candidate for
# a missing building (audit-buildings.py compares the two; add-buildings.py adds the ones checked by eye).
# Service: https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt (WFS 2.0, layer app:Bygning, no key needed).
# bygningstype: SSB building types (111 enebolig, 112 enebolig med hybel, 113 store enebolig, 121 tomannsbolig vertikal,
# 122 horisontal, 131 rekkehus, 133 store rekkehus, 135 bofellesskap, 136 andre småhus, 141 tremannsbolig, 142 store
# boligbygg, 143 ..., 144 ..., 145 ..., 146 ..., 151 bo- og servicesenter, 161 fritidsbolig, 181 garasje til bolig, 182 uthus,
# 183 naust, 184 drivhus, 189 annen bygning til bolig, 2xx industri, 3xx kontor/forretning, 6xx skole/barnehage ...).
import json,math,re,subprocess,sys
from pathlib import Path
lon0,lat0=10.32727325,63.39945456
sx=111320*math.cos(math.radians(lat0));sz=111320
# Lat/lon box round the game's map (local x -400..2400, z -900..1700).
BOX=(63.3841,10.3192,63.4076,10.3755)
URL='https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt?service=WFS&version=2.0.0&request=GetFeature&typeNames=app:Bygning&srsName=urn:ogc:def:crs:EPSG::4326&bbox=%s,%s,%s,%s,urn:ogc:def:crs:EPSG::4326&count=%d&startIndex=%d'
rows=[];start=0;PAGE=1000
while True:
 xml=subprocess.run(['curl','-sS','--fail','--max-time','180',URL%(*BOX,PAGE,start)],capture_output=True,check=True).stdout.decode('utf-8')
 members=xml.split('<wfs:member>')[1:]
 for m in members:
  g=lambda tag:(re.search(r'<app:%s>([^<]*)</app:%s>'%(tag,tag),m) or [None,None])[1]
  pos=re.search(r'<gml:pos>([-\d.]+) ([-\d.]+)</gml:pos>',m)
  if not pos:continue
  lat,lon=float(pos.group(1)),float(pos.group(2))
  rows.append([int(g('bygningsnummer')),round((lon-lon0)*sx,1),round((lat0-lat)*sz,1),int(g('bygningstype') or 0),g('bygningsstatus'),len(re.findall('<app:Bruksenhet>',m))])
 print('page',start,len(members),file=sys.stderr)
 if len(members)<PAGE:break
 start+=PAGE
rows.sort()
Path('data').mkdir(exist_ok=True)
Path('data/matrikkel-bygningspunkt.json').write_text(json.dumps({'source':'Matrikkelen - Bygningspunkt, Kartverket (https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt), CC BY 4.0, downloaded 2026-09-30','columns':['bygningsnummer','x','z','bygningstype','bygningsstatus','bruksenheter'],'origin':[lon0,lat0],'rows':rows},separators=(',',':')))
print(len(rows),'buildings')
