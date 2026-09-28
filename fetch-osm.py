# Downloads the OpenStreetMap extract prepare-map.py reads (byasen.osm) from the OSM API: the Byåsen box used since
# 24 September 2026 and the strip south to Stavset added on 28 September 2026. One call returns at most 50 000 nodes, so
# the boxes are fetched one by one and merged, each node, way and relation once. Optional arguments: saved extracts to
# merge instead of downloading.
import subprocess,sys,xml.etree.ElementTree as ET
from pathlib import Path
BOXES=['10.325,63.393,10.369,63.406', # Byåsen: home to the kindergarten
       '10.321,63.3858,10.3525,63.3935'] # south: Odd Husbys veg, Stavset senter, Byåsveien and Kystad
files=[Path(f) for f in sys.argv[1:]]
if not files:
 for i,box in enumerate(BOXES):
  f=Path(f'byasen-{i}.osm')
  if not f.exists():subprocess.run(['curl','-sS','--fail','--max-time','300','-o',str(f),'https://api.openstreetmap.org/api/0.6/map?bbox='+box],check=True)
  files.append(f)
root=ET.Element('osm',{'version':'0.6','generator':'fetch-osm.py'});seen=set();parts={'node':[],'way':[],'relation':[]}
for f in files:
 for e in ET.parse(f).getroot():
  if e.tag in parts and (e.tag,e.attrib['id']) not in seen:seen.add((e.tag,e.attrib['id']));parts[e.tag].append(e)
for tag in parts:root.extend(parts[tag])
ET.ElementTree(root).write('byasen.osm',encoding='utf-8',xml_declaration=True)
print({tag:len(v) for tag,v in parts.items()})
