import {addBuildingRoof} from './building-roofs.js';
import {createJunctionBuildings,addJunctionDetails} from './junction-buildings.js';
import {roadWidth} from './transit-geometry.js';
import {createRoadSurface} from './road-surface.js';
import {createET5} from './car-model.js';
import {createCat} from './cat-model.js';
import {addMunkvoll,addTransit,addMunkvollDetails} from './munkvoll.js';
import {createTrafficLights} from './traffic-lights.js';
import {createRainbowTrail} from './rainbow-trail.js';
import {addLandmark,addLandmarkGround} from './landmarks.js';
import {buildingStyles,addKiwi} from './building-details.js';
import {addDalgardSchool,addSportsGrounds,addDalgardDetails} from './dalgard.js';
import {addStavset,addStavsetDetails,addBridges} from './stavset.js';
import {addStreetDetails,indexStreetDetails} from './street-details.js';
import {createCameraControls} from './camera-controls.js';
import {SoftwareRenderer} from './software-renderer.js';
import * as T from './vendor/three.js';
export { T };
export function createWorld(canvas, data) {
 const terrain=data.terrain;
 const verticalExaggeration=1.45,verticalDatum=160;
 // Lakes added by add-lakes.py (OSM multipolygons) lie flat at their level: the ground inside them is lowered to it.
 const lakes=data.areas.filter(a=>a.level!=null).map(a=>({...a,holes:a.holes||[],box:[Math.min(...a.p.map(v=>v[0])),Math.min(...a.p.map(v=>v[1])),Math.max(...a.p.map(v=>v[0])),Math.max(...a.p.map(v=>v[1]))]}));
 function inRing(ring,x,z){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;}return inside;}
 function lakeAt(x,z){for(const l of lakes)if(x>l.box[0]&&x<l.box[2]&&z>l.box[1]&&z<l.box[3]&&inRing(l.p,x,z)&&!l.holes.some(h=>inRing(h,x,z)))return l;return null;}
 function rawHeight(x,z){if(lakes.length){const lake=lakeAt(x,z);if(lake)return lake.level;}const a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/terrain.step)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/terrain.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return (h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
 function terrainHeight(x,z){return verticalDatum+(rawHeight(x,z)-verticalDatum)*verticalExaggeration;}
 // The road is built on the plain terrain; the ground everything else stands on is lowered wherever it would poke through a road.
 const roadSurface=createRoadSurface(data.roads,terrainHeight,data);
 function height(x,z){return terrainHeight(x,z)+roadSurface.lowerAt(x,z);}
 const scene=new T.Scene();scene.background=new T.Color('#bfdfed');scene.fog=new T.Fog('#bfdfed',165,510);
 // Small procedural sky/ground reflection map keeps the black sedan's curvature
 // readable on mobile, without an external HDR download or a mirror-render pass.
 const skyFaces=Array.from({length:6},(_,face)=>{const c=document.createElement('canvas');c.width=128;c.height=128;const q=c.getContext('2d'),g=q.createLinearGradient(0,0,0,128);g.addColorStop(0,face===3?'#879575':'#b6d1df');g.addColorStop(.48,face===2?'#dce8eb':'#e3e8e1');g.addColorStop(.58,'#a5b19f');g.addColorStop(1,'#65775d');q.fillStyle=g;q.fillRect(0,0,128,128);return c;});const skyEnv=new T.CubeTexture(skyFaces);skyEnv.colorSpace=T.SRGBColorSpace;skyEnv.needsUpdate=true;scene.environment=skyEnv;
 const camera=new T.PerspectiveCamera(51,1,.2,1700);
 const orbit=createCameraControls(canvas);
 let renderer; const supported=!!document.createElement('canvas').getContext('webgl2'); if(supported){renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}else{renderer=new SoftwareRenderer(canvas);console.info('WebGL unavailable: using software 3D renderer');}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const hemi=new T.HemisphereLight('#d9efff','#81935e',2.1);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff0cc',2.8);sun.position.set(-70,180,-90);scene.add(sun);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:420});sun.shadow.normalBias=.04;sun.shadow.bias=-.0006;scene.add(sun.target);
 const staticMaterial=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
 const buckets=new Map();const colorCache=new Map();
 function col(c){if(!colorCache.has(c))colorCache.set(c,new T.Color(c));return colorCache.get(c);}
 function bucket(x,z){const i=Math.floor(x/160),j=Math.floor(z/160),k=i*4096+j;let b=buckets.get(k);if(!b){b={x:i*160+80,z:j*160+80,p:new Float32Array(2304),c:new Float32Array(2304),n:0};buckets.set(k,b);}return b;}
 // Chunks collect straight into growing Float32Arrays: about half the memory of plain arrays and no conversion afterwards.
 function tri(b,a,c,d,colour){let n=b.n;if(n+9>b.p.length){const p=new Float32Array(b.p.length*2),q=new Float32Array(b.p.length*2);p.set(b.p);q.set(b.c);b.p=p;b.c=q;}const p=b.p,cc=b.c,q=col(colour);
  p[n]=a[0];p[n+1]=a[1];p[n+2]=a[2];p[n+3]=c[0];p[n+4]=c[1];p[n+5]=c[2];p[n+6]=d[0];p[n+7]=d[1];p[n+8]=d[2];
  for(let i=n;i<n+9;i+=3){cc[i]=q.r;cc[i+1]=q.g;cc[i+2]=q.b;}b.n=n+9;}
 function quad(b,a,c,d,e,colour){tri(b,a,c,d,colour);tri(b,a,d,e,colour);}
 function box(b,cx,cy,cz,wx,wy,wz,colour,angle=0){let pts=[];for(let y of [-.5,.5])for(let z of [-.5,.5])for(let x of [-.5,.5])pts.push([cx+x*wx*Math.cos(angle)+z*wz*Math.sin(angle),cy+y*wy,cz-x*wx*Math.sin(angle)+z*wz*Math.cos(angle)]);for(let f of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])quad(b,...f.map(i=>pts[i]),colour);}
 function groundPoly(poly,colour,lift=.07){if(poly.length<3)return;let p=poly.slice();if(p[0][0]===p.at(-1)[0]&&p[0][1]===p.at(-1)[1])p.pop();const shapes=p.map(v=>new T.Vector2(v[0],v[1]));for(const f of T.ShapeUtils.triangulateShape(shapes,[])){const vertices=f.map(i=>[p[i][0],height(...p[i])+lift,p[i][1]]);tri(bucket(vertices[0][0],vertices[0][2]),...vertices,colour);}}
 function ribbon(points,width,colour,lift=.13,ground=height){for(let j=0;j<points.length-1;j++){let a=points[j],b=points[j+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<.01)continue;let dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len;for(let d=0;d<len;d+=8){let e=Math.min(len,d+8),ax=a[0]+d*dx,az=a[1]+d*dz,bx=a[0]+e*dx,bz=a[1]+e*dz;quad(bucket(ax,az),[ax-dz*width/2,ground(ax-dz*width/2,az+dx*width/2)+lift,az+dx*width/2],[ax+dz*width/2,ground(ax+dz*width/2,az-dx*width/2)+lift,az-dx*width/2],[bx+dz*width/2,ground(bx+dz*width/2,bz-dx*width/2)+lift,bz-dx*width/2],[bx-dz*width/2,ground(bx-dz*width/2,bz+dx*width/2)+lift,bz+dx*width/2],colour);}}}
 // Terrain uses the same interpolated DTM surface as roads and the car.
 let seed=42;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
 // Each grid vertex is looked up once (four cells share it), as the road surface has it: the terrain there less how far the road lowered it.
 const groundStep=8,gxn=Math.round((terrain.nx-1)*terrain.step/groundStep),gzn=Math.round((terrain.nz-1)*terrain.step/groundStep),gh=new Float32Array((gxn+1)*(gzn+1));
 for(let j=0;j<=gzn;j++)for(let i=0;i<=gxn;i++)gh[j*(gxn+1)+i]=roadSurface.meshAt(terrain.x0+i*groundStep,terrain.z0+j*groundStep);
 for(let j=0;j<gzn;j++)for(let i=0;i<gxn;i++){const x=terrain.x0+i*groundStep,z=terrain.z0+j*groundStep,s=groundStep,k=j*(gxn+1)+i,c=['#93b96e','#96bc71','#99bd73','#91b56c'][Math.abs(Math.floor(x/40)*7+Math.floor(z/40)*11)%4];quad(bucket(x,z),[x,gh[k],z],[x+s,gh[k+1],z],[x+s,gh[k+gxn+2],z+s],[x,gh[k+gxn+1],z+s],c);}

 const greens={forest:'#7fa562',wood:'#7fa562',grass:'#8fb96b',meadow:'#9ac47a',park:'#8fba68',pitch:'#7eaf68',playground:'#bcca8b',recreation_ground:'#9bbe70',allotments:'#9eb878',water:'#6daeb4'};
 for(const a of data.areas)if(a.type==='water'&&a.level==null)groundPoly(a.p,greens.water,.09);
 // Lake surfaces are flat, a little above the lowered ground, with holes for the islands.
 for(const l of lakes){const y=verticalDatum+(l.level-verticalDatum)*verticalExaggeration+.12,all=[...l.p,...l.holes.flat()];
  for(const f of T.ShapeUtils.triangulateShape(l.p.map(v=>new T.Vector2(...v)),l.holes.map(h=>h.map(v=>new T.Vector2(...v)))))tri(bucket(all[f[0]][0],all[f[0]][1]),...f.map(i=>[all[i][0],y,all[i][1]]),'#4d9bc9');}
 const gravel=new Set(data.roads.filter(road=>['gravel','compacted','unpaved'].includes(road.surface)||(road.name==='Herlofsons veg'&&road.p.some(p=>Math.hypot(p[0],p[1])<58))));
 const va=[0,0,0],vb=[0,0,0],vc=[0,0,0],vd=[0,0,0],roadColours=['#737d7b','#b8bbae','#93b96e','#95ba70','#8f9996'];
 roadSurface.paint((cls,road,n,c,flip)=>{const colour=cls===0&&gravel.has(road)?'#989789':roadColours[cls],b=bucket(c[0],c[2]);va[0]=c[0];va[1]=c[1];va[2]=c[2];vb[0]=c[3];vb[1]=c[4];vb[2]=c[5];vc[0]=c[6];vc[1]=c[7];vc[2]=c[8];
  if(n===3)tri(b,va,vb,vc,colour);else{vd[0]=c[9];vd[1]=c[10];vd[2]=c[11];if(flip)quad(b,vb,vc,vd,va,colour);else quad(b,va,vb,vc,vd,colour);}});
 // Centre-line dashes sit on the drawn road in 1.5 m pieces, so they neither float above nor sink into it.
 for(const d of roadSurface.dashes)quad(bucket(d[0][0],d[0][2]),...d,'#e8d797');
 // The car rides 8 cm above the drawn road (wheel bottoms on the asphalt), on terrain elsewhere.
 const roadTop=(x,z)=>roadSurface.heightAt(x,z)??height(x,z)+.39,carHeight=(x,z)=>roadTop(x,z)+.08;
 // Trees, bus stops and the like keep clear of the smoothed centre lines.
 const roadSegments=roadSurface.geometry.roadSegments();
 addTransit({T,scene,data,height,bucket,quad,box,groundPoly,ribbon,roadSegments});
 const junctionBuildings=createJunctionBuildings(data);
 const houseBounds=[[-22,-16,16,16],[1798,226,1861,268],[1790,270,1850,337],[1450,169,1648,285]];
 // Pitches, the running track and car parks at Dalgård: drawn on the ground and kept free of trees.
 houseBounds.push(...addSportsGrounds({T,data,height,bucket,tri,box,ribbon}));
 const wallBase=new Map(); // Wall base and height per footprint, for details added after the loop.
 for(const building of data.buildings){let p=building.p.slice(0,-1);if(p.length<3)continue;let cx=p.reduce((a,b)=>a+b[0],0)/p.length,cz=p.reduce((a,b)=>a+b[1],0)/p.length;
 let area=0;for(let i=0;i<p.length;i++)area+=p[i][0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*p[i][1];area=Math.abs(area/2);if(area<4)continue;
 const landmark=addMunkvoll({T,scene,building,height,bucket,tri,quad,box})||addLandmark({T,scene,building,height,bucket,tri,quad,box})||addDalgardSchool({T,scene,data,building,height,bucket,tri,quad,box,groundPoly})||addStavset({T,scene,building,height,bucket,tri,quad,box});if(landmark){houseBounds.push(landmark.bounds);continue;}
 if(String(building.id)==='526443228'){const result=addKiwi({T,scene,building,height,bucket,tri,quad,box,groundPoly,ribbon});houseBounds.push(result.bounds);continue;}
 // Roofs without walls (building=roof: fuel canopies, bicycle and bus shelters) stand on posts at their corners.
 if(building.t.building==='roof'){const hs=p.map(v=>height(...v)),y=Math.max(...hs),top=y+(parseFloat(building.t.height)||(area>60?4.8:2.4)),b=bucket(cx,cz);
  for(const f of T.ShapeUtils.triangulateShape(p.map(v=>new T.Vector2(...v)),[])){tri(b,...f.map(i=>[p[i][0],top,p[i][1]]),'#e6e8e4');tri(b,...f.map(i=>[p[i][0],top-.4,p[i][1]]),'#cfd2cd');}
  for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length];quad(b,[a[0],top-.4,a[1]],[c[0],top-.4,c[1]],[c[0],top,c[1]],[a[0],top,a[1]],'#d7dad5');const x=a[0]+(cx-a[0])*.12,z=a[1]+(cz-a[1])*.12;box(b,x,(height(x,z)+top)/2,z,.22,top-height(x,z),.22,'#9aa0a2');}
  houseBounds.push([Math.min(...p.map(v=>v[0]))-1,Math.min(...p.map(v=>v[1]))-1,Math.max(...p.map(v=>v[0]))+1,Math.max(...p.map(v=>v[1]))+1]);continue;}
 const style={...buildingStyles[building.id],...junctionBuildings.style(building)};const t=building.t;const garage=['garage','garages','shed','carport'].includes(t.building)||area<35;
 const levels=style.levels||(parseFloat(t['building:levels'])||((t.building==='apartments'||area>800)?3:garage?1:2));
 const h=style.height||Math.min(26,parseFloat(t.height)||levels*2.65+(garage?.1:.5));
 const heights=p.map(v=>height(...v)).sort((a,b)=>a-b);const y=style.base==='low'?heights[Math.floor(heights.length*.25)]:Math.max(...heights);const base=Math.min(...p.map(v=>height(...v)))-.4;
 wallBase.set(String(building.id),{y,h});
 const b=bucket(cx,cz);let hash=parseInt(building.id)%997;const palette=['#f0efea','#e1e2df','#ebeae1','#bfc4c0','#f4f0e5','#d9dbd7','#aaafa9','#7b4236','#575951','#e8e7df'];const colour=style.wall||t['building:colour']||palette[hash%palette.length];const roofcolour=style.roof||t['roof:colour']||['#3e4547','#494b4a','#68625a','#624b40','#545851'][hash%5];const shapes=p.map(v=>new T.Vector2(...v));
 // Board joints are a darker shade of the cladding, so dark houses do not get pale stripes.
 const boardLine=style.horizontalSiding?'#'+new T.Color(colour).multiplyScalar(.82).getHexString():'#91897d';
 houseBounds.push([Math.min(...p.map(v=>v[0]))-2,Math.min(...p.map(v=>v[1]))-2,Math.max(...p.map(v=>v[0]))+2,Math.max(...p.map(v=>v[1]))+2]);
 // Ground shadow, foundation, walls and windows follow the original footprint.
 groundPoly(p,'#6f8e57',.105);
 for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length];quad(b,[a[0],base,a[1]],[c[0],base,c[1]],[c[0],y+.5,c[1]],[a[0],y+.5,a[1]],'#bcbfb2');quad(b,[a[0],y+.5,a[1]],[c[0],y+.5,c[1]],[c[0],y+h,c[1]],[a[0],y+h,a[1]],colour);
 const edgeLength=Math.hypot(c[0]-a[0],c[1]-a[1]);
 if(style.sections&&edgeLength>25){const dx=(c[0]-a[0])/edgeLength,dz=(c[1]-a[1])/edgeLength;for(let j=0;j<4;j++){const aa=[a[0]+dx*edgeLength*j/4,a[1]+dz*edgeLength*j/4],cc=[a[0]+dx*edgeLength*(j+1)/4,a[1]+dz*edgeLength*(j+1)/4];for(const sign of [-1,1])quad(b,[aa[0]-dz*.04*sign,y+.5,aa[1]+dx*.04*sign],[cc[0]-dz*.04*sign,y+.5,cc[1]+dx*.04*sign],[cc[0]-dz*.04*sign,y+h,cc[1]+dx*.04*sign],[aa[0]-dz*.04*sign,y+h,aa[1]+dx*.04*sign],style.sections[j]);}}
 if(style.balconies&&edgeLength>25){const dx=(c[0]-a[0])/edgeLength,dz=(c[1]-a[1])/edgeLength;let nx=-dz,nz=dx;if(nx*((a[0]+c[0])/2-cx)+nz*((a[1]+c[1])/2-cz)<0){nx=-nx;nz=-nz;}if(style.balconies==='south'?nz>.65:nx<-.65){const at=(d,yy,o)=>[a[0]+dx*d+nx*o,yy,a[1]+dz*d+nz*o];for(let floor=0;floor<3;floor++){const yy=y+.55+floor*2.65;for(let d=1;d<edgeLength-3;d+=7){const end=Math.min(d+6.6,edgeLength-1);quad(b,at(d,yy,0),at(end,yy,0),at(end,yy,1.55),at(d,yy,1.55),'#ddd7c7');quad(b,at(d,yy,1.55),at(end,yy,1.55),at(end,yy+.9,1.55),at(d,yy+.9,1.55),'#e7ddc9');for(let s=d;s<end;s+=.28){const p=at(s,yy+.48,1.59);box(b,p[0],p[1],p[2],.035,.87,.035,'#a89c84');}}}}}
 if(style.siding&&edgeLength>1){const dx=(c[0]-a[0])/edgeLength,dz=(c[1]-a[1])/edgeLength;for(let d=.3;d<edgeLength;d+=.48){const x=a[0]+dx*d,z=a[1]+dz*d;for(const sign of [-1,1])quad(b,[x-dz*.025*sign,y+.5,z+dx*.025*sign],[x+dx*.027-dz*.025*sign,y+.5,z+dz*.027+dx*.025*sign],[x+dx*.027-dz*.025*sign,y+h,z+dz*.027+dx*.025*sign],[x-dz*.025*sign,y+h,z+dx*.025*sign],'#'+new T.Color(colour).multiplyScalar(.82).getHexString());}box(b,(a[0]+c[0])/2,y+h-.04,(a[1]+c[1])/2,edgeLength,.14,.17,'#ecece5',Math.atan2(-dz,dx));}
 if(style.brick||style.horizontalSiding){for(let hy=y+.7;hy<y+h;hy+=style.horizontalSiding?.23:.32){const dx=(c[0]-a[0])/edgeLength,dz=(c[1]-a[1])/edgeLength;for(const sign of [-1,1])quad(b,[a[0]-dz*.025*sign,hy,a[1]+dx*.025*sign],[c[0]-dz*.025*sign,hy,c[1]+dx*.025*sign],[c[0]-dz*.025*sign,hy+.025,c[1]+dx*.025*sign],[a[0]-dz*.025*sign,hy+.025,a[1]+dx*.025*sign],boardLine);}}
 const len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len>3){const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;
 // Windows only on the outside of the wall: a copy facing into the building is never seen.
 const out=insideFootprint(p,(a[0]+c[0])/2-dz*.3,(a[1]+c[1])/2+dx*.3)?-1:1;for(let f=0;f<levels;f++)for(let j=1;j<=Math.floor(len/3.7);j++){const q=j/(Math.floor(len/3.7)+1),wx=a[0]+(c[0]-a[0])*q,wz=a[1]+(c[1]-a[1])*q,wy=y+1.5+f*2.65;const half=garage?.45:.63;const wa=[wx-dx*half,wy,wz-dz*half],wb=[wx+dx*half,wy,wz+dz*half],wc=[wb[0],wy+1.04,wb[2]],wd=[wa[0],wy+1.04,wa[2]];const nx=-dz*.065*out,nz=dx*.065*out;quad(b,...[wa,wb,wc,wd].map(v=>[v[0]+nx,v[1],v[2]+nz]),style.frame||'#fff6df');const glass=[[-.46,.15],[.46,.15],[.46,.92],[-.46,.92]].map(v=>[wx+dx*v[0],wy+v[1],wz+dz*v[0]]);quad(b,...glass.map(v=>[v[0]+nx*2,v[1],v[2]+nz*2]),'#718b91');}}
 }
 const roofTop=addBuildingRoof({T,p,cx,cz,y,h,style,t,area,b,tri,quad,colour,roofcolour});

 if(style.junction)addJunctionDetails({T,scene,building,p,cx,cz,y,h,levels,garage,style,roads:junctionBuildings.roads,roadIndex:junctionBuildings.roadIndex,height,bucket,tri,quad,box,roofTop});
 if(area>55&&area<260&&(style.chimney||!style.source&&hash%4===0))box(b,cx+1,y+h+.7,cz+.5,.65,2,.7,'#a39c8d');
 }
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
 // Street details (gangfelt, haitenner, islands, sidewalks, lamps...): the paths and roundabout islands keep the trees off them.
 indexStreetDetails(addStreetDetails({T,scene,data,height,roadTop,bucket,quad,tri,box,ribbon,groundPoly,segments:roadSegments,ground:roadSurface.groundTop}),index);
 const homeShrubs=[[-15,1],[-12,4],[-9,6],[-6,8],[-3,9],[0,12],[3,10],[6,9],[9,8],[11,7],[-8,10],[-11,7]];for(const [x,z] of homeShrubs){const b=bucket(x,z),y=height(x,z);const g=new T.IcosahedronGeometry(1,1);g.scale(1.65,.85,1.45);g.translate(x,y+.7,z);const p=g.attributes.position;for(let i=0;i<p.count;i+=3)tri(b,...[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]),'#688845');g.dispose();}
 for(let n=0;n<12000;n++){let x=-220+rnd()*2440,z=-700+rnd()*1520;if(!clear(x,z))continue;let y=height(x,z),h=3+rnd()*5,b=bucket(x,z);box(b,x,y+h*.3,z,.3,h*.6,.3,'#8c7152');if(rnd()<.6){cone(b,x,y+h*.25,z,h*.38,h*.7,'#538b60');cone(b,x,y+h*.54,z,h*.29,h*.55,'#689b64');}else{const geo=new T.IcosahedronGeometry(h*.35,0);geo.translate(x,y+h*.72,z);const at=geo.getAttribute('position');const cc=['#74a357','#8eb15f','#659850'][n%3];for(let i=0;i<at.count;i+=3)tri(b,[at.getX(i),at.getY(i),at.getZ(i)],[at.getX(i+1),at.getY(i+1),at.getZ(i+1)],[at.getX(i+2),at.getY(i+2),at.getZ(i+2)],cc);geo.dispose();}}
 // Around the lakes, where the terrain grid was widened: the same trees, less dense.
 for(let n=0;n<4000;n++){let x=terrain.x0+rnd()*(terrain.nx-1)*terrain.step,z=terrain.z0+rnd()*(840-terrain.z0);if(x>-220&&x<2220&&z>-700&&z<820||!clear(x,z))continue;let y=height(x,z),h=3+rnd()*5,b=bucket(x,z);box(b,x,y+h*.3,z,.3,h*.6,.3,'#8c7152');if(rnd()<.6){cone(b,x,y+h*.25,z,h*.38,h*.7,'#538b60');cone(b,x,y+h*.54,z,h*.29,h*.55,'#689b64');}else{const geo=new T.IcosahedronGeometry(h*.35,0);geo.translate(x,y+h*.72,z);const at=geo.getAttribute('position');const cc=['#74a357','#8eb15f','#659850'][n%3];for(let i=0;i<at.count;i+=3)tri(b,[at.getX(i),at.getY(i),at.getZ(i)],[at.getX(i+1),at.getY(i+1),at.getZ(i+1)],[at.getX(i+2),at.getY(i+2),at.getZ(i+2)],cc);geo.dispose();}}
 // South to Stavset (data.south): as dense as the main map inside, as around the lakes outside.
 const south=data.south||[],zEnd=terrain.z0+(terrain.nz-1)*terrain.step;if(south.length)for(let n=0;n<Math.round(7400*(zEnd-820)/740);n++){let x=terrain.x0+rnd()*(terrain.nx-1)*terrain.step,z=820+rnd()*(zEnd-820),keep=inRing(south,x,z)||rnd()<.55;if(!keep||!clear(x,z))continue;let y=height(x,z),h=3+rnd()*5,b=bucket(x,z);box(b,x,y+h*.3,z,.3,h*.6,.3,'#8c7152');if(rnd()<.6){cone(b,x,y+h*.25,z,h*.38,h*.7,'#538b60');cone(b,x,y+h*.54,z,h*.29,h*.55,'#689b64');}else{const geo=new T.IcosahedronGeometry(h*.35,0);geo.translate(x,y+h*.72,z);const at=geo.getAttribute('position');const cc=['#74a357','#8eb15f','#659850'][n%3];for(let i=0;i<at.count;i+=3)tri(b,[at.getX(i),at.getY(i),at.getZ(i)],[at.getX(i+1),at.getY(i+1),at.getZ(i+1)],[at.getX(i+2),at.getY(i+2),at.getZ(i+2)],cc);geo.dispose();}}
 const chunks=[];
 for(const b of buckets.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(b.p.slice(0,b.n),3));g.setAttribute('color',new T.BufferAttribute(b.c.slice(0,b.n),3));b.p=b.c=null;g.computeVertexNormals();g.computeBoundingSphere();const m=new T.Mesh(g,staticMaterial);m.receiveShadow=true;m.matrixAutoUpdate=false;m.updateMatrix();scene.add(m);chunks.push({mesh:m,x:b.x,z:b.z});}
 function label(text,x,z,colour='#164e48',scale=10){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=colour;ctx.beginPath();ctx.roundRect(4,6,504,108,24);ctx.fill();ctx.strokeStyle='#fff5d9';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#fff9e8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 32px sans-serif';ctx.fillText(text,256,61,465);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const mat=new T.SpriteMaterial({map:tex,depthTest:true});const s=new T.Sprite(mat);s.position.set(x,height(x,z)+7,z);s.scale.set(scale,scale/4,1);s.matrixAutoUpdate=false;s.updateMatrix();scene.add(s);return s;}
 const labels=[];labels.push(label('⌂  Hjemme',0,0,'#654d3e',10));for(const l of lakes)if(l.label)labels.push(label('≈  '+l.name,...l.label,'#2f6f96',12));for(const p of data.pois)if(['supermarket','school','kindergarten','fuel','bakery','sports_centre'].includes(p.type))labels.push(label(p.name,p.x,p.z,p.type==='kindergarten'?'#c98938':p.type==='sports_centre'?'#2f5f8a':'#3b6955',p.name.length>19?17:13));
 const goalPos=data.nodes[data.goal];const goalRing=new T.Mesh(new T.TorusGeometry(4,.18,6,48),new T.MeshBasicMaterial({color:'#ffe17a'}));goalRing.rotation.x=Math.PI/2;goalRing.position.set(goalPos[0],height(...goalPos)+.7,goalPos[1]);scene.add(goalRing);labels.push(label('⚑  Her er barnehagen!',...goalPos,'#c58b29',14));
 const trafficLights=createTrafficLights({T,scene,height,data});
 const {car,wheels,paint,skins}=createET5(T);scene.add(car);
 // The running cat (the reward for the fourth trip) rides in the car's group and takes its place: model 'car' or 'cat'.
 const bodywork=[...car.children],skinParts=new Set(Object.values(skins).flat()),cat=createCat(T);cat.group.visible=false;car.add(cat.group);
 let model='car',skin=null,rainbow=false;
 function showModel(){for(const o of bodywork)if(!skinParts.has(o))o.visible=model==='car';for(const [k,list] of Object.entries(skins))for(const m of list)m.visible=model==='car'&&k===skin;cat.group.visible=model==='cat';}
 function setCarSkin(name){skin=name||null;car.userData.skin=skin;showModel();}
 function setCarModel(name){model=name==='cat'?'cat':'car';car.userData.body=model;showModel();}
 // Paint colour (a reward). Black keeps the original deep metallic look; brighter colours are less metallic so they read as colour.
 // 'rainbow' (the reward for the third trip) runs slowly through all the colours; update() turns it.
 function setCarColour(hex){rainbow=hex==='rainbow';car.userData.colour=hex;if(rainbow){paint.metalness=.3;paint.roughness=.28;return;}paint.color.set(hex);const c=paint.color,dark=Math.max(c.r,c.g,c.b)<.06;paint.metalness=dark?.72:.38;paint.roughness=dark?.24:.3;}
 const trail=createRainbowTrail({T,scene});
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
 trail.update(dt,pos,carFacing);trafficLights.update(dt,pos);
 if(rainbow)paint.color.setHSL((time*.09)%1,.9,.42);if(model==='cat')cat.update(dt,Math.abs(velocity),time,paint.color);
 car.position.copy(pos);const yaw=Math.atan2(-carFacing.x,-carFacing.z);rot.setFromEuler(facing.set(Math.atan2(carFacing.y,Math.hypot(carFacing.x,carFacing.z)),yaw,0));car.quaternion.slerp(rot,1-Math.exp(-dt*9));wheels.forEach(w=>w.rotation.x-=velocity*dt/.39);
 sm.position.set(pos.x,height(pos.x,pos.z)+.25,pos.z);sm.rotation.z=-yaw;turnArrow.position.set(pos.x,pos.y+6.2+Math.sin(time*3)*.22,pos.z);turnArrow.scale.setScalar(4.5+Math.sin(time*3)*.16);if(finished)turnArrow.visible=false;
 const follow=follows[mode]||follows.follow;
 horizontal.set(tangent.x,0,tangent.z).normalize();if(horizontal.lengthSq()<.1)horizontal.set(0,0,-1);
 orbitDirection.copy(horizontal).applyAxisAngle(up,orbit.yaw);
 const orbitAngle=Math.atan2(follow.up,follow.back)+orbit.tilt,orbitDistance=Math.hypot(follow.back,follow.up);
 target.copy(pos).addScaledVector(orbitDirection,-Math.cos(orbitAngle)*orbitDistance);target.y=Math.max(pos.y+Math.sin(orbitAngle)*orbitDistance,height(target.x,target.z)+2.5);
 camLook.copy(pos).addScaledVector(orbitDirection,orbit.active?0:follow.ahead);camLook.y+=1;
 // Face the home's photographed west-facing gables before setting off.
 if(mode==='intro'&&!orbit.active){target.set(-27,height(-27,-15)+5,-15);camLook.set(0,height(-7,-3)+2.4,0);}
 // With the colour picker on the start screen, turn a little left so the parked car shows beside the card, house still in view.
 if(mode==='introCar'&&!orbit.active){target.set(-27,height(-27,-15)+5,-15);camLook.set(2.8,height(-7,-3)+2.4,-11.3);}
 if(!initialized){camera.position.copy(target);look.copy(camLook);initialized=true;}else{camera.position.lerp(target,1-Math.exp(-dt*3));look.lerp(camLook,1-Math.exp(-dt*4));}camera.lookAt(look);
 sun.position.set(pos.x-70,pos.y+160,pos.z-90);sun.target.position.copy(pos);sun.target.updateMatrixWorld();
 for(const c of chunks){const d=Math.hypot(c.x-pos.x,c.z-pos.z);c.mesh.visible=d<680;c.mesh.castShadow=d<110;}
 for(const l of labels)l.visible=l.position.distanceTo(pos)<165&&l.position.distanceTo(pos)>27;
 goalRing.visible=Math.hypot(pos.x-goalPos[0],pos.z-goalPos[1])<150;goalRing.scale.setScalar(1+.08*Math.sin(time*2));
 for(let i=0;i<confetti.length;i++){const c=confetti[i];c.visible=finished;if(finished){const phase=(time*.7+i*.037)%4;c.position.set(pos.x+Math.sin(i*5.3)*5+Math.sin(time+i),pos.y+9-phase*2,pos.z+Math.cos(i*2.3)*5);c.rotation.set(time+i,time*.8,i);}}
 renderer.render(scene,camera);
 }
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 resize();window.addEventListener('resize',resize);return {height,rawHeight,carHeight,roadLine:path=>roadSurface.edgeLine(path,.08),surfaceTop:(x,z,near)=>roadSurface.heightAt(x,z,near),scene,camera,renderer,car,update,resize,setTurnArrow,setCarColour,setCarSkin,setCarModel,setTrail:trail.setOn,trafficLights,resetCamera(){initialized=false;orbit.reset();trail.clear();}};
}
