import {createHouses} from './houses.js';
import {createJunctionBuildings} from './junction-buildings.js';
import {roadWidth} from './transit-geometry.js';
import {createRoadSurface} from './road-surface.js';
import {createET5} from './car-model.js';
import {createCat} from './cat-model.js';
import {createDog,createRideDuck,createRocket,createUnicorn,createFireTruck,createBalloon,createTRex} from './rides.js';
import {createBubbles} from './bubbles.js';
import {createDuck} from './duck.js';
import {createLakes,inRing} from './lakes.js';
import {addMunkvoll,addTransit,addMunkvollDetails} from './munkvoll.js';
import {createTrafficLights} from './traffic-lights.js';
import {createRainbowTrail} from './rainbow-trail.js';
import {createBoy} from './boy.js';
import {createDuckRunner} from './duck-runner.js';
import {addLandmark,addLandmarkGround} from './landmarks.js';
import {buildingStyles,addKiwi} from './building-details.js';
import {addDalgardSchool,addSportsGrounds,addDalgardDetails} from './dalgard.js';
import {addStavset,addStavsetDetails,addBridges} from './stavset.js';
import {addStreetDetails,indexStreetDetails} from './street-details.js';
import {createLook,createGround,createRoadPainter,ROAD,WATER,RENDER} from './look.js';
import {addFootbridges} from './footbridges.js';
import {addLudvig} from './ludvig.js';
import {createSeeThrough} from './see-through.js';
import {addRoadside} from './roadside.js';
import {createSchoolyard} from './schoolyard.js';
import {createCameraControls} from './camera-controls.js';
import {SoftwareRenderer} from './software-renderer.js';
import * as T from './vendor/three.js';
export { T };
export function createWorld(canvas, data) {
 const terrain=data.terrain;
 const verticalExaggeration=1.45,verticalDatum=160;
 // Lakes lie flat at their level, and the ground runs down to the water along their outline (lakes.js).
 const {lakes,lakeAt,shoreDistance,rawHeight,duckCircle}=createLakes(data);
 function terrainHeight(x,z){return verticalDatum+(rawHeight(x,z)-verticalDatum)*verticalExaggeration;}
 // The road is built on the plain terrain; the ground everything else stands on is lowered wherever it would poke through a road.
 const roadSurface=createRoadSurface(data.roads,terrainHeight,data);
 function height(x,z){return terrainHeight(x,z)+roadSurface.lowerAt(x,z);}
 // look.js: fog, sun and sky light, the sky with clouds and hills, the water and the world's material (the look of the world is decided there).
 const scene=new T.Scene(),mood=createLook({T,scene});
 // Small procedural sky/ground reflection map keeps the black sedan's curvature readable on mobile, without an external HDR download or a mirror-render pass.
 scene.environment=mood.environment();
 const camera=new T.PerspectiveCamera(51,1,.2,1700);
 const orbit=createCameraControls(canvas);
 let renderer; const supported=!!document.createElement('canvas').getContext('webgl2'); if(supported){renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}else{renderer=new SoftwareRenderer(canvas);console.info('WebGL unavailable: using software 3D renderer');}
 mood.configureRenderer(renderer);if(!supported)mood.sky.group.visible=false; // the software rasteriser draws no sky; water is see-through, which it skips, so the lake bed shows
 const staticMaterial=mood.staticMaterial;
 const buckets=new Map();const colorCache=new Map();
 function col(c){if(!colorCache.has(c))colorCache.set(c,new T.Color(c));return colorCache.get(c);}
 function bucket(x,z){const i=Math.floor(x/160),j=Math.floor(z/160),k=i*4096+j;let b=buckets.get(k);if(!b){b={x:i*160+80,z:j*160+80,p:new Float32Array(2304),c:new Float32Array(2304),n:0};buckets.set(k,b);}return b;}
 // See-through buildings (see-through.js): while a building is drawn (drawing: its id), the triangles that stand up off the ground go to the chunk's
 // building twin, with the id per triangle (d), so the building can fade out when it is in the camera's way.
 const seeThrough=supported?createSeeThrough({T,base:staticMaterial}):null;let drawing=0;
 function twin(b){return b.twin||(b.twin={x:b.x,z:b.z,p:new Float32Array(2304),c:new Float32Array(2304),d:new Uint16Array(256),n:0,ids:new Set()});}
 function into(b,a,c,d){if(!drawing||!seeThrough.claim(drawing,a,c,d,height((a[0]+c[0]+d[0])/3,(a[2]+c[2]+d[2])/3)))return b;const t=twin(b);t.ids.add(drawing);return t;}
 function grow(b){const p=new Float32Array(b.p.length*2),q=new Float32Array(b.p.length*2);p.set(b.p);q.set(b.c);b.p=p;b.c=q;if(b.d){const d=new Uint16Array(b.d.length*2);d.set(b.d);b.d=d;}}
 // Chunks collect straight into growing Float32Arrays: about half the memory of plain arrays and no conversion afterwards.
 function tri(b,a,c,d,colour){b=into(b,a,c,d);let n=b.n;if(n+9>b.p.length)grow(b);if(b.d)b.d[n/9]=drawing;const p=b.p,cc=b.c,q=col(colour);
  p[n]=a[0];p[n+1]=a[1];p[n+2]=a[2];p[n+3]=c[0];p[n+4]=c[1];p[n+5]=c[2];p[n+6]=d[0];p[n+7]=d[1];p[n+8]=d[2];
  for(let i=n;i<n+9;i+=3){cc[i]=q.r;cc[i+1]=q.g;cc[i+2]=q.b;}b.n=n+9;}
 function quad(b,a,c,d,e,colour){tri(b,a,c,d,colour);tri(b,a,d,e,colour);}
 // A triangle with a colour per corner: k holds linear r,g,b triples, i/j/l pick the corners' colours (the ground and the road surface are painted this way).
 function triV(b,a,c,d,k,i,j,l){b=into(b,a,c,d);let n=b.n;if(n+9>b.p.length)grow(b);if(b.d)b.d[n/9]=drawing;const p=b.p,cc=b.c;
  p[n]=a[0];p[n+1]=a[1];p[n+2]=a[2];p[n+3]=c[0];p[n+4]=c[1];p[n+5]=c[2];p[n+6]=d[0];p[n+7]=d[1];p[n+8]=d[2];
  cc[n]=k[3*i];cc[n+1]=k[3*i+1];cc[n+2]=k[3*i+2];cc[n+3]=k[3*j];cc[n+4]=k[3*j+1];cc[n+5]=k[3*j+2];cc[n+6]=k[3*l];cc[n+7]=k[3*l+1];cc[n+8]=k[3*l+2];b.n=n+9;}
 function box(b,cx,cy,cz,wx,wy,wz,colour,angle=0){let pts=[];for(let y of [-.5,.5])for(let z of [-.5,.5])for(let x of [-.5,.5])pts.push([cx+x*wx*Math.cos(angle)+z*wz*Math.sin(angle),cy+y*wy,cz-x*wx*Math.sin(angle)+z*wz*Math.cos(angle)]);for(let f of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])quad(b,...f.map(i=>pts[i]),colour);}
 function groundPoly(poly,colour,lift=.07){if(poly.length<3)return;let p=poly.slice();if(p[0][0]===p.at(-1)[0]&&p[0][1]===p.at(-1)[1])p.pop();const shapes=p.map(v=>new T.Vector2(v[0],v[1]));for(const f of T.ShapeUtils.triangulateShape(shapes,[])){const vertices=f.map(i=>[p[i][0],height(...p[i])+lift,p[i][1]]);tri(bucket(vertices[0][0],vertices[0][2]),...vertices,colour);}}
 function ribbon(points,width,colour,lift=.13,ground=height){for(let j=0;j<points.length-1;j++){let a=points[j],b=points[j+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<.01)continue;let dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len;for(let d=0;d<len;d+=8){let e=Math.min(len,d+8),ax=a[0]+d*dx,az=a[1]+d*dz,bx=a[0]+e*dx,bz=a[1]+e*dz;quad(bucket(ax,az),[ax-dz*width/2,ground(ax-dz*width/2,az+dx*width/2)+lift,az+dx*width/2],[ax+dz*width/2,ground(ax+dz*width/2,az-dx*width/2)+lift,az-dx*width/2],[bx+dz*width/2,ground(bx+dz*width/2,bz-dx*width/2)+lift,bz-dx*width/2],[bx-dz*width/2,ground(bx-dz*width/2,bz+dx*width/2)+lift,bz+dx*width/2],colour);}}}
 // Terrain uses the same interpolated DTM surface as roads and the car.
 let seed=42;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
 // Each grid vertex is looked up once (four cells share it), as the road surface has it: the terrain there less how far the road lowered it.
 const groundStep=8,gxn=Math.round((terrain.nx-1)*terrain.step/groundStep),gzn=Math.round((terrain.nz-1)*terrain.step/groundStep),gh=new Float32Array((gxn+1)*(gzn+1));
 for(let j=0;j<=gzn;j++)for(let i=0;i<=gxn;i++)gh[j*(gxn+1)+i]=roadSurface.meshAt(terrain.x0+i*groundStep,terrain.z0+j*groundStep);
 // The ground is painted per vertex (look.js): lawn where people live, rough meadow and forest floor where they do not, rock on steep
 // ground, noise, darker at the foot of buildings, a lake bed coloured by depth. The diagonal of each cell is the one the road surface lowers the ground for.
 const waterY=l=>verticalDatum+(l.level-verticalDatum)*verticalExaggeration+.12;
 const ground=createGround({data,gh,nx:gxn+1,nz:gzn+1,step:groundStep,x0:terrain.x0,z0:terrain.z0,lakes,shoreDistance,waterY}),gv=ground.colours;
 for(let j=0;j<gzn;j++)for(let i=0;i<gxn;i++){const x=terrain.x0+i*groundStep,z=terrain.z0+j*groundStep,s=groundStep,k=j*(gxn+1)+i,b=bucket(x,z),A=[x,gh[k],z],B=[x+s,gh[k+1],z],C=[x+s,gh[k+gxn+2],z+s],D=[x,gh[k+gxn+1],z+s];triV(b,A,B,C,gv,k,k+1,k+gxn+2);triV(b,A,C,D,gv,k,k+gxn+2,k+gxn+1);}

 for(const a of data.areas)if(a.type==='water'&&a.level==null)groundPoly(a.p,WATER.pond,.09);
 // Lake surfaces are flat, a little above the ground where it meets them at the shore, with holes for the islands. They are one see-through mesh
 // (look.js) over the lake bed, which is coloured by depth, so the water is light at the shore and deep blue further out.
 const waterTriangles=[];
 for(const l of lakes){const y=waterY(l),all=[...l.p,...l.holes.flat()];
  for(const f of T.ShapeUtils.triangulateShape(l.p.map(v=>new T.Vector2(...v)),l.holes.map(h=>h.map(v=>new T.Vector2(...v)))))for(const i of f)waterTriangles.push(all[i][0],y,all[i][1]);}
 if(waterTriangles.length)scene.add(mood.water.build(waterTriangles));
 // The big duck (duck.js) swims round its circle on Lianvannet by the turning circle at the end of Vetle Vislies veg
 // (lakes.js duckCircle); the car stops there and the camera turns to it (game.js). It rises out of the lake the first
 // time the car comes within 140 m of it, and stays for the rest of the visit.
 const duck=(()=>{const circle=duckCircle();if(!circle)return null;const model=createDuck(T);model.group.visible=false;scene.add(model.group);
  return {model,centre:circle.centre,R:circle.R,y:waterY(circle.lake),angle:0,rise:0,shown:false};})();
 function updateDuck(dt,pos,time){
  if(!duck)return;if(!duck.shown&&Math.hypot(pos.x-duck.centre[0],pos.z-duck.centre[1])<140)duck.shown=true;if(!duck.shown)return;
  duck.rise=Math.min(1,duck.rise+dt/1.8);duck.angle+=dt*2.2/duck.R;const a=duck.angle,g=duck.model.group,r=duck.rise,pop=1+2.7*(r-1)**3+1.7*(r-1)**2; // rises with a little overshoot
  g.visible=true;g.position.set(duck.centre[0]+Math.cos(a)*duck.R,duck.y-(1-r)*4,duck.centre[1]+Math.sin(a)*duck.R);g.rotation.y=Math.atan2(Math.sin(a),-Math.cos(a));g.scale.setScalar(1.4*Math.max(.01,pop));
  duck.model.update(dt,time);
 }
 const gravel=new Set(data.roads.filter(road=>['gravel','compacted','unpaved'].includes(road.surface)||(road.name==='Herlofsons veg'&&road.p.some(p=>Math.hypot(p[0],p[1])<58))));
 // Asphalt, kerb band, island grass, verge and steep faces get their colour per corner (look.js); the verges take the colour of the ground beside them.
 const va=[0,0,0],vb=[0,0,0],vc=[0,0,0],vd=[0,0,0],roadCol=new Float32Array(12),paintRoad=createRoadPainter(ground);
 roadSurface.paint((cls,road,n,c,flip)=>{const b=bucket(c[0],c[2]);paintRoad(cls,cls===0&&gravel.has(road),n,c,roadCol);va[0]=c[0];va[1]=c[1];va[2]=c[2];vb[0]=c[3];vb[1]=c[4];vb[2]=c[5];vc[0]=c[6];vc[1]=c[7];vc[2]=c[8];
  if(n===3)triV(b,va,vb,vc,roadCol,0,1,2);else{vd[0]=c[9];vd[1]=c[10];vd[2]=c[11];if(flip){triV(b,vb,vc,vd,roadCol,1,2,3);triV(b,vb,vd,va,roadCol,1,3,0);}else{triV(b,va,vb,vc,roadCol,0,1,2);triV(b,va,vc,vd,roadCol,0,2,3);}}});
 // Centre-line dashes sit on the drawn road in 1.5 m pieces, so they neither float above nor sink into it.
 for(const d of roadSurface.dashes)quad(bucket(d[0][0],d[0][2]),...d,ROAD.dash);
 // The car rides 8 cm above the drawn road (wheel bottoms on the asphalt), on terrain elsewhere.
 const roadTop=(x,z)=>roadSurface.heightAt(x,z)??height(x,z)+.39,carHeight=(x,z)=>roadTop(x,z)+.08;
 // Trees, bus stops and the like keep clear of the smoothed centre lines.
 const roadSegments=roadSurface.geometry.roadSegments();
 addTransit({T,scene,data,height,bucket,quad,box,groundPoly,ribbon,roadSegments});
 const junctionBuildings=createJunctionBuildings(data);
 const houseBounds=[[1775,101,1810.5,124], // the gravel yard at Bøckmans veg 102 (ludvig.js): no trees on it
  [-22,-16,16,16],[1798,226,1861,268],[1790,270,1850,337],[1450,169,1648,285]];
 // Pitches, the running track and car parks at Dalgård: drawn on the ground and kept free of trees.
 houseBounds.push(...addSportsGrounds({T,data,height,bucket,tri,box,ribbon}));
 const houses=createHouses({T,scene,data,height,bucket,tri,quad,box,groundPoly,junctionBuildings,buildingStyles,groundColour:ground.sample,onRoad:(x,z)=>roadSurface.heightAt(x,z)!==null});
const wallBase=new Map(); // Wall base and height per footprint, for details added after the loop.
 for(const building of data.buildings){let p=building.p.slice(0,-1);if(p.length<3)continue;let cx=p.reduce((a,b)=>a+b[0],0)/p.length,cz=p.reduce((a,b)=>a+b[1],0)/p.length;
 let area=0;for(let i=0;i<p.length;i++)area+=p[i][0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*p[i][1];area=Math.abs(area/2);if(area<4)continue;
 drawing=seeThrough?seeThrough.add(p):0; // what this building draws can fade out (see-through.js)
 const landmark=addMunkvoll({T,scene,building,height,bucket,tri,quad,box})||addLandmark({T,scene,building,height,bucket,tri,quad,box})||addDalgardSchool({T,scene,data,building,height,bucket,tri,quad,box,groundPoly})||addStavset({T,scene,building,height,bucket,tri,quad,box});if(landmark){houseBounds.push(landmark.bounds);continue;}
 if(String(building.id)==='526443228'){const result=addKiwi({T,scene,building,height,bucket,tri,quad,box,groundPoly,ribbon});houseBounds.push(result.bounds);continue;}
 // Roofs without walls (building=roof: fuel canopies, bicycle and bus shelters) stand on posts at their corners.
 if(building.t.building==='roof'){const hs=p.map(v=>height(...v)),y=Math.max(...hs),top=y+(parseFloat(building.t.height)||(area>60?4.8:2.4)),b=bucket(cx,cz);
  for(const f of T.ShapeUtils.triangulateShape(p.map(v=>new T.Vector2(...v)),[])){tri(b,...f.map(i=>[p[i][0],top,p[i][1]]),'#e6e8e4');tri(b,...f.map(i=>[p[i][0],top-.4,p[i][1]]),'#cfd2cd');}
  for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length];quad(b,[a[0],top-.4,a[1]],[c[0],top-.4,c[1]],[c[0],top,c[1]],[a[0],top,a[1]],'#d7dad5');const x=a[0]+(cx-a[0])*.12,z=a[1]+(cz-a[1])*.12;box(b,x,(height(x,z)+top)/2,z,.22,top-height(x,z),.22,'#9aa0a2');}
  houseBounds.push([Math.min(...p.map(v=>v[0]))-1,Math.min(...p.map(v=>v[1]))-1,Math.max(...p.map(v=>v[0]))+1,Math.max(...p.map(v=>v[1]))+1]);continue;}
 // Ordinary buildings (houses.js): walls, plinth, cladding, windows, doors, roof with eaves, chimney, balcony or veranda.
 houses.add({building,p,cx,cz,area,wallBase,houseBounds});
 }
 drawing=0;
 function insideFootprint(poly,x,z){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [ax,az]=poly[j],[bx,bz]=poly[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;}return inside;}
 function distanceSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
 // A spatial index keeps decorative trees away from real roads and buildings.
 const obstacles=new Map();function index(x,z,val){let k=Math.floor(x/40)+','+Math.floor(z/40);if(!obstacles.has(k))obstacles.set(k,[]);obstacles.get(k).push(val);}
 for(const r of roadSegments){const [a,b]=r;let len=Math.hypot(a[0]-b[0],a[1]-b[1]);for(let d=0;d<=len;d+=15){let t=len?d/len:0;index(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,{road:r});}index(b[0],b[1],{road:r});}
 for(const b of houseBounds)for(let x=Math.floor(b[0]/40)*40;x<=b[2];x+=40)for(let z=Math.floor(b[1]/40)*40;z<=b[3];z+=40)index(x,z,{house:b});
 function clear(x,z){if(lakeAt(x,z))return false;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){let a=obstacles.get((Math.floor(x/40)+dx)+','+(Math.floor(z/40)+dz))||[];for(const o of a){if(o.road&&distanceSegment(x,z,o.road[0],o.road[1])<o.road[2]/2+4)return false;if(o.house&&x>o.house[0]&&x<o.house[2]&&z>o.house[1]&&z<o.house[3])return false;}}return true;}
 function cone(b,x,y,z,r,h,c,sides=7){for(let i=0;i<sides;i++){let a=i/sides*Math.PI*2,a2=(i+1)/sides*Math.PI*2;tri(b,[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(a2)*r,y,z+Math.sin(a2)*r],[x,y+h,z],c);}}
 addLandmarkGround({height,bucket,quad,box,groundPoly,ribbon});
 addMunkvollDetails({T,scene,data,wallBase,bucket,quad,box});
 addDalgardDetails({T,scene,data,wallBase,bucket,quad,box});
 addStavsetDetails({T,scene,data,wallBase,height,bucket,quad,box,ribbon});addBridges({data,roadTop,roadWidth,bucket,quad,box,height,geometry:roadSurface.geometry});
 // Bøckmans veg 102 (ludvig.js): the gravel yard in front of the houses, the earth bed and the dark timber terrace of 102C-D, from the photos.
 addLudvig({data,wallBase,ground:roadSurface.groundTop,bucket,quad,box,onRoad:(x,z)=>roadSurface.heightAt(x,z)!==null});
 // Street details (gangfelt, haitenner, islands, sidewalks, lamps...): the paths and roundabout islands keep the trees off them.
 indexStreetDetails(addStreetDetails({T,scene,data,height,roadTop,bucket,quad,tri,box,ribbon,groundPoly,segments:roadSegments,ground:roadSurface.groundTop}),index);
 // Footbridges and underpasses (footbridges.js): decks over the roads, dips under them cut out of the ground mesh drawn above.
 addFootbridges({data,surface:roadSurface,bucket,quad,box,index,segments:roadSegments});
 const homeShrubs=[[-15,1],[-12,4],[-9,6],[-6,8],[-3,9],[0,12],[3,10],[6,9],[9,8],[11,7],[-8,10],[-11,7]];for(const [x,z] of homeShrubs){const b=bucket(x,z),y=height(x,z);const g=new T.IcosahedronGeometry(1,1);g.scale(1.65,.85,1.45);g.translate(x,y+.7,z);const p=g.attributes.position;for(let i=0;i<p.count;i+=3)tri(b,...[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]),'#688845');g.dispose();}
 // Roadside (roadside.js, data.roadside): fences, hedges, walls, noise barriers, guard rails, driveways, paths, benches, playground equipment, parked cars,
 // pylons, and all the trees (trees.js: five instanced species from OSM, NVDB and AR5 forest types). It keeps the trees off everything it draws.
 // The school grounds (schoolyard.js, data.schoolyard): asphalt yard, playgrounds, court, statue, road signs; roadside.js leaves out what it draws instead (skip).
 const schoolyard=createSchoolyard({T,scene,data,ground:roadSurface.groundTop,bucket,tri,quad,box,ribbon,segments:roadSegments,onSurface:(x,z)=>roadSurface.heightAt(x,z)!==null});
 const roadside=addRoadside({T,scene,data,height,ground:roadSurface.groundTop,roadTop,onSurface:(x,z)=>roadSurface.heightAt(x,z)!==null,bucket,tri,quad,box,segments:roadSegments,index,clear,lakeAt,skip:schoolyard.owns});
 const chunks=[],buildingMeshes=[];
 // The chunks hold nearly all the world's geometry (2 October 2026: 225 MB as 32-bit floats). Colours go to the GPU as 8-bit and the flat face normals as
 // 8-bit too (normalised integers), which halves the memory and the upload: about 105 MB. Positions stay 32-bit floats.
 function packed(g){const n=g.attributes.normal.array,c=g.attributes.color.array,N=new Int8Array(n.length),C=new Uint8Array(c.length);
  for(let i=0;i<n.length;i++)N[i]=Math.round(n[i]*127);for(let i=0;i<c.length;i++)C[i]=Math.round(Math.min(1,Math.max(0,c[i]))*255);
  g.setAttribute('normal',new T.BufferAttribute(N,3,true));g.setAttribute('color',new T.BufferAttribute(C,3,true));return g;}
 for(const b of buckets.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(b.p.slice(0,b.n),3));g.setAttribute('color',new T.BufferAttribute(b.c.slice(0,b.n),3));b.p=b.c=null;g.computeVertexNormals();packed(g);g.computeBoundingSphere();const m=new T.Mesh(g,staticMaterial);m.receiveShadow=true;m.matrixAutoUpdate=false;m.updateMatrix();scene.add(m);chunks.push({mesh:m,x:b.x,z:b.z});
  const t=b.twin;if(!t)continue;const tg=new T.BufferGeometry(),ids=new Uint16Array(t.n/3);for(let i=0;i<ids.length;i++)ids[i]=t.d[Math.floor(i/3)];
  tg.setAttribute('position',new T.BufferAttribute(t.p.slice(0,t.n),3));tg.setAttribute('color',new T.BufferAttribute(t.c.slice(0,t.n),3));tg.setAttribute('buildingId',new T.BufferAttribute(ids,1));t.p=t.c=t.d=null;tg.computeVertexNormals();packed(tg);tg.computeBoundingSphere();
  const tm=new T.Mesh(tg,staticMaterial);tm.name='Bygninger';tm.receiveShadow=true;tm.matrixAutoUpdate=false;tm.updateMatrix();scene.add(tm);chunks.push({mesh:tm,x:t.x,z:t.z});buildingMeshes.push(tm);for(const id of t.ids)seeThrough.attach(id,tm);}
 seeThrough?.index();

 chunks.push(...roadside.chunks);
 function label(text,x,z,colour='#164e48',scale=10){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=colour;ctx.beginPath();ctx.roundRect(4,6,504,108,24);ctx.fill();ctx.strokeStyle='#fff5d9';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#fff9e8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 32px sans-serif';ctx.fillText(text,256,61,465);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const mat=new T.SpriteMaterial({map:tex,depthTest:true});const s=new T.Sprite(mat);s.position.set(x,height(x,z)+7,z);s.scale.set(scale,scale/4,1);s.matrixAutoUpdate=false;s.updateMatrix();scene.add(s);return s;}
 const labels=[];labels.push(label('⌂  Hjemme',0,0,'#654d3e',10));for(const l of lakes)if(l.label)labels.push(label('≈  '+l.name,...l.label,'#2f6f96',12));for(const p of data.pois)if(['supermarket','school','kindergarten','fuel','bakery','sports_centre'].includes(p.type))labels.push(label(p.name,p.x,p.z,p.type==='kindergarten'?'#c98938':p.type==='sports_centre'?'#2f5f8a':'#3b6955',p.name.length>19?17:13));
 const goalPos=data.nodes[data.goal];const goalRing=new T.Mesh(new T.TorusGeometry(4,.18,6,48),new T.MeshBasicMaterial({color:'#ffe17a'}));goalRing.rotation.x=Math.PI/2;goalRing.position.set(goalPos[0],height(...goalPos)+.7,goalPos[1]);scene.add(goalRing);labels.push(label('⚑  Her er barnehagen!',...goalPos,'#c58b29',14));
 const trafficLights=createTrafficLights({T,scene,height,data});
 const {car,wheels,paint,skins}=createET5(T);scene.add(car);
 // The running cat (the reward for the second trip) rides in the car's group and takes its place: model 'car' or 'cat'.
 // The cat wears the car's skin logos on its flanks (the KIWI logo with the KIWI skin).
 // The dog, the duck and the rocket (rides.js, the rewards for the fifth, sixth and seventh trip) ride in it the same way: model 'dog', 'duck' or 'rocket'.
 const bodywork=[...car.children],skinParts=new Set(Object.values(skins).flat()),logos=Object.fromEntries(Object.entries(skins).map(([k,list])=>[k,list[0].material]));
 const rides={cat:createCat(T,{logos}),dog:createDog(T,{logos}),duck:createRideDuck(T,{logos}),rocket:createRocket(T,{logos}),unicorn:createUnicorn(T,{logos}),firetruck:createFireTruck(T,{logos}),balloon:createBalloon(T,{logos}),trex:createTRex(T,{logos})};
 for(const r of Object.values(rides)){r.group.visible=false;car.add(r.group);}
 let model='car',skin=null,rainbow=false;
 function showModel(){for(const o of bodywork)if(!skinParts.has(o))o.visible=model==='car';for(const [k,list] of Object.entries(skins))for(const m of list)m.visible=model==='car'&&k===skin;for(const [name,r] of Object.entries(rides)){for(const [k,list] of Object.entries(r.skins))for(const m of list)m.visible=k===skin;r.group.visible=model===name;}}
 function setCarSkin(name){skin=name||null;car.userData.skin=skin;showModel();paintBeacons();}
 // The fire engine's beacons follow the colour chosen (rides.js BEACONS): KIWI green and white, the rainbow round the rainbow.
 function paintBeacons(){rides.firetruck.beacons(skin==='kiwi'?'kiwi':rainbow?'rainbow':car.userData.colour);}
 function setCarModel(name){model=rides[name]?name:'car';car.userData.body=model;showModel();}
 // The horn (the reward for the eleventh trip): a little hop, and the ride's own reaction (the T. rex opens its jaws).
 const holdAt=new T.Vector3(),holdQ=new T.Quaternion();
 let hopT=0;function honk(){hopT=.55;rides[model]?.honk?.();}
 // Paint colour (a reward). Black keeps the original deep metallic look; brighter colours are less metallic so they read as colour.
 // 'rainbow' (the reward for the fourth trip) runs through all the colours in a little over three seconds; update() turns it.
 function setCarColour(hex){rainbow=hex==='rainbow';car.userData.colour=hex;paintBeacons();if(rainbow){paint.metalness=.3;paint.roughness=.28;return;}paint.color.set(hex);const c=paint.color,dark=Math.max(c.r,c.g,c.b)<.06;paint.metalness=dark?.72:.38;paint.roughness=dark?.24:.3;}
 const trail=createRainbowTrail({T,scene}),boy=createBoy({T,scene}),duckRunner=createDuckRunner({T,scene}),bubbles=createBubbles({T,scene}); // behind the car: the rainbow trail, Ludvig running after it (boy.js), a running duck (duck-runner.js) or soap bubbles (bubbles.js), one at a time
 // Soft contact shadow remains visible with economical mobile shadows.
 const shc=document.createElement('canvas');shc.width=64;shc.height=64;const sc=shc.getContext('2d'),gr=sc.createRadialGradient(32,32,6,32,32,32);gr.addColorStop(0,'rgba(24,40,35,.48)');gr.addColorStop(1,'rgba(24,40,35,0)');sc.fillStyle=gr;sc.fillRect(0,0,64,64);const sm=new T.Mesh(new T.PlaneGeometry(3.4,6),new T.MeshBasicMaterial({map:new T.CanvasTexture(shc),transparent:true,depthWrite:false}));sm.rotation.x=-Math.PI/2;scene.add(sm);
 const confetti=[];const cg=new T.BoxGeometry(.12,.04,.24);for(let i=0;i<75;i++){const m=new T.Mesh(cg,new T.MeshBasicMaterial({color:['#ffd66c','#6ad2c9','#e99584','#fff5cf'][i%4]}));m.visible=false;scene.add(m);confetti.push(m);}
 // A floating turn cue follows the car. It shows the next road Sofia has chosen ahead.
 const arrowCanvas=document.createElement('canvas');arrowCanvas.width=256;arrowCanvas.height=256;const arrowCtx=arrowCanvas.getContext('2d');
 const arrowTexture=new T.CanvasTexture(arrowCanvas);arrowTexture.colorSpace=T.SRGBColorSpace;const arrowMat=new T.SpriteMaterial({map:arrowTexture,transparent:true,depthTest:false,depthWrite:false});const turnArrow=new T.Sprite(arrowMat);turnArrow.scale.set(4.8,4.8,1);turnArrow.visible=false;scene.add(turnArrow);
 function paintTurnArrow(symbol,label){arrowCtx.clearRect(0,0,256,256);arrowCtx.fillStyle='#f5c656';arrowCtx.beginPath();arrowCtx.arc(128,128,108,0,Math.PI*2);arrowCtx.fill();arrowCtx.strokeStyle='#fff8dd';arrowCtx.lineWidth=10;arrowCtx.stroke();arrowCtx.fillStyle='#173e3c';arrowCtx.textAlign='center';arrowCtx.textBaseline='middle';arrowCtx.font='bold 112px Arial';arrowCtx.fillText(symbol,128,120);arrowCtx.font='bold 22px Arial';arrowCtx.fillText(label.toUpperCase(),128,210);arrowTexture.needsUpdate=true;}
 function setTurnArrow(info){if(!info){turnArrow.visible=false;return;}paintTurnArrow(info.symbol,info.label);turnArrow.visible=true;}
 const look=new T.Vector3(),target=new T.Vector3();let initialized=false,overview=false;
 const up=new T.Vector3(0,1,0),horizontal=new T.Vector3(),orbitDirection=new T.Vector3(),camLook=new T.Vector3(),facing=new T.Euler(0,0,0,'YXZ'),rot=new T.Quaternion();
 const follows={high:{back:26,up:22,ahead:13},intro:{back:14,up:7,ahead:2},introCar:{back:14,up:7,ahead:2},follow:{back:14,up:7.8,ahead:8}};
 // Adaptive resolution, judged over ~1.5 s: when many frames are slow (under ~45 fps) the pixel ratio steps down; with steady headroom it steps
 // back up. A step up that proves too slow makes the next try wait twice as long.
 const maxRatio=renderer.getPixelRatio(),minRatio=Math.min(maxRatio,.8);let frameAt=0,frames=0,slowFrames=0,fastFrames=0,frameTime=0,raiseAt=0,raisedAt=-1e9,backoff=8000;
 function adaptResolution(){
  const now=performance.now(),ms=now-frameAt;frameAt=now;if(!supported||ms>1000)return;frames++;frameTime+=ms;if(ms>22)slowFrames++;else if(ms<18)fastFrames++;if(frameTime<1500||frames<5)return;
  const ratio=renderer.getPixelRatio();
  if(slowFrames>frames*.3&&ratio>minRatio){if(now-raisedAt<6000)backoff=Math.min(backoff*2,120000);renderer.setPixelRatio(Math.max(minRatio,ratio-(frameTime/frames>40?.3:.15)));raiseAt=now+backoff;}
  else if(fastFrames>frames*.9&&ratio<maxRatio&&now>raiseAt){renderer.setPixelRatio(Math.min(maxRatio,ratio+.1));raisedAt=now;raiseAt=now+3000;}
  frames=slowFrames=fastFrames=frameTime=0;
 }
 function update(dt,pos,tangent,velocity,mode,finished,time,carFacing=tangent){
 adaptResolution();
 const carrying=model==='trex'&&boy.isOn();rides.trex.carrying=carrying; // the easter egg: the T. rex carries Ludvig in its mouth
 trail.update(dt,pos,carFacing);boy.update(dt,pos,carFacing,velocity,time,{held:carrying});duckRunner.update(dt,pos,carFacing,velocity,time);bubbles.update(dt,pos,carFacing);trafficLights.update(dt,pos);updateDuck(dt,pos,time);
 if(rainbow)paint.color.setHSL((time*.3)%1,.9,.42);if(rides[model])rides[model].update(dt,Math.abs(velocity),time,paint.color);
 car.position.copy(pos);if(hopT>0){hopT=Math.max(0,hopT-dt);car.position.y+=Math.sin(Math.PI*hopT/.55)*.45;}const yaw=Math.atan2(-carFacing.x,-carFacing.z);rot.setFromEuler(facing.set(Math.atan2(carFacing.y,Math.hypot(carFacing.x,carFacing.z)),yaw,0));car.quaternion.slerp(rot,1-Math.exp(-dt*9));wheels.forEach(w=>w.rotation.x-=velocity*dt/.39);
 if(carrying){car.updateMatrixWorld(true);boy.hold(rides.trex.grip.getWorldPosition(holdAt),rides.trex.grip.getWorldQuaternion(holdQ),dt,time);}
 sm.position.set(pos.x,height(pos.x,pos.z)+.25,pos.z);sm.rotation.z=-yaw;turnArrow.position.set(pos.x,pos.y+6.2+Math.sin(time*3)*.22,pos.z);turnArrow.scale.setScalar(4.5+Math.sin(time*3)*.16);if(finished)turnArrow.visible=false;
 const follow=follows[mode]||follows.follow;
 horizontal.set(tangent.x,0,tangent.z).normalize();if(horizontal.lengthSq()<.1)horizontal.set(0,0,-1);
 orbitDirection.copy(horizontal).applyAxisAngle(up,orbit.yaw);
 const orbitAngle=Math.atan2(follow.up,follow.back)+orbit.tilt,orbitDistance=Math.hypot(follow.back,follow.up);
 target.copy(pos).addScaledVector(orbitDirection,-Math.cos(orbitAngle)*orbitDistance);target.y=Math.max(pos.y+Math.sin(orbitAngle)*orbitDistance,height(target.x,target.z)+2.5);
 camLook.copy(pos).addScaledVector(orbitDirection,orbit.active?0:follow.ahead);camLook.y+=1;
 // Face the home's photographed west-facing gables before setting off.
 if(mode==='intro'&&!orbit.active){target.set(-27,height(-27,-15)+5,-15);camLook.set(0,height(-7,-3)+2.4,0);}
 // With the colour picker on the start screen, look at the parked car: the view shift below puts it in the middle of the screen beside the card.
 if(mode==='introCar'&&!orbit.active){target.set(-27,height(-27,-15)+5,-15);camLook.set(pos.x,pos.y+2,pos.z);}
 if(!initialized){camera.position.copy(target);look.copy(camLook);initialized=true;shiftX=wantShiftX;shiftY=wantShiftY;}else{camera.position.lerp(target,1-Math.exp(-dt*3));look.lerp(camLook,1-Math.exp(-dt*4));}camera.lookAt(look);
 // The view shift (3 October 2026): the start card covers the left of the screen (the bottom on a phone), so the picture's middle, where the camera looks,
 // is moved into the free part (a view offset, in CSS pixels; setViewShift). It eases there and back (and jumps with the camera), so the car is never behind
 // the card, also after a swipe has turned the camera round it.
 const ease=1-Math.exp(-dt*4);shiftX+=(wantShiftX-shiftX)*ease;shiftY+=(wantShiftY-shiftY)*ease;
 if(Math.abs(shiftX)+Math.abs(shiftY)>.5){const w=canvas.clientWidth||1,h=canvas.clientHeight||1;camera.setViewOffset(w,h,-shiftX,shiftY,w,h);shifted=true;}else if(shifted){camera.clearViewOffset();shifted=false;}
 // See-through buildings: those in the line from the camera to the car fade out; only their chunks draw with the see-through material meanwhile.
 if(seeThrough){const now=seeThrough.update(dt,camera.position,seeAt.set(pos.x,pos.y+1.2,pos.z));
  for(const m of cutMeshes)if(!now.has(m)){m.material=staticMaterial;cutMeshes.delete(m);}for(const m of now)if(!cutMeshes.has(m)){m.material=seeThrough.material;cutMeshes.add(m);}}
 mood.update(time,camera.position,pos,orbitDirection.x,orbitDirection.z); // the sun's shadow box follows the car, the sky follows the camera
 // Shadow casters: every chunk whose square reaches into the sun's shadow box (look.js), widened by how far a tall building's shadow falls, so a shadow
 // never appears suddenly inside the box (it did when chunks cast only with their centre within 110 m of the car). Chunks are 160 m, the trees' 320 m.
 const st=mood.lights.sun.target.position,reach=RENDER.shadowHalf+30;
 for(const c of chunks){const d=Math.hypot(c.x-pos.x,c.z-pos.z),h=c.trees?160:80;c.mesh.visible=d<680;c.mesh.castShadow=Math.abs(c.x-st.x)<h+reach&&Math.abs(c.z-st.z)<h+reach;}
 for(const l of labels)l.visible=l.position.distanceTo(pos)<165&&l.position.distanceTo(pos)>27;
 goalRing.visible=Math.hypot(pos.x-goalPos[0],pos.z-goalPos[1])<150;goalRing.scale.setScalar(1+.08*Math.sin(time*2));
 for(let i=0;i<confetti.length;i++){const c=confetti[i];c.visible=finished;if(finished){const phase=(time*.7+i*.037)%4;c.position.set(pos.x+Math.sin(i*5.3)*5+Math.sin(time+i),pos.y+9-phase*2,pos.z+Math.cos(i*2.3)*5);c.rotation.set(time+i,time*.8,i);}}
 renderer.render(scene,camera);
 }
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;if(shifted)camera.setViewOffset(w,h,-shiftX,shiftY,w,h);camera.updateProjectionMatrix();}
 const seeAt=new T.Vector3(),cutMeshes=new Set();let shiftX=0,shiftY=0,wantShiftX=0,wantShiftY=0,shifted=false;function setViewShift(x=0,y=0){wantShiftX=x;wantShiftY=y;}
 // Warm-up (2 October 2026): every chunk's geometry goes to the GPU and every shader is compiled while the game loads, into a tiny target with the culling
 // off and every chunk casting, instead of the first time a chunk comes into view or into the shadow box while driving. Each of those was a stall of
 // tens of milliseconds on an iPad: the stutter and the pop-in after the graphics polish.
 if(supported){const rt=new T.WebGLRenderTarget(8,8),keep=chunks.map(c=>[c.mesh.visible,c.mesh.frustumCulled,c.mesh.castShadow]);
  for(const c of chunks){c.mesh.visible=true;c.mesh.frustumCulled=false;c.mesh.castShadow=true;}
  renderer.compile(scene,camera);renderer.setRenderTarget(rt);renderer.render(scene,camera);
  for(const m of buildingMeshes)m.material=seeThrough.material;renderer.compile(scene,camera);renderer.render(scene,camera);for(const m of buildingMeshes)m.material=staticMaterial; // the see-through shader, compiled now
  renderer.setRenderTarget(null);rt.dispose();
  chunks.forEach((c,i)=>{[c.mesh.visible,c.mesh.frustumCulled,c.mesh.castShadow]=keep[i];});}
 resize();window.addEventListener('resize',resize);return {houseStats:houses.stats,height,rawHeight,carHeight,roadLine:path=>roadSurface.edgeLine(path,.08),surfaceTop:(x,z,near)=>roadSurface.heightAt(x,z,near),scene,camera,renderer,car,update,resize,setTurnArrow,setCarColour,setCarSkin,setCarModel,setViewShift,cameraYaw:()=>orbit.yaw,setTrail:trail.setOn,setBoy:boy.setOn,setDuckRunner:duckRunner.setOn,setBubbles:bubbles.setOn,boy,honk,trafficLights,duck:duck&&{centre:duck.centre,get shown(){return duck.shown;}},resetCamera(){initialized=false;orbit.reset();trail.clear();boy.clear();duckRunner.clear();bubbles.clear();}};
}
