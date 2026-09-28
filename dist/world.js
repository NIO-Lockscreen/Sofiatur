import {addBuildingRoof} from './building-roofs.js';
import {createJunctionBuildings,addJunctionDetails} from './junction-buildings.js';
import {roadWidth} from './transit-geometry.js';
import {createET5} from './car-model.js';
import {addMunkvoll,addTransit} from './munkvoll.js';
import {addLandmark,addLandmarkGround} from './landmarks.js';
import {buildingStyles,addKiwi} from './building-details.js';
import {createCameraControls} from './camera-controls.js';
import {SoftwareRenderer} from './software-renderer.js';
import * as T from './vendor/three.js';
export { T };
export function createWorld(canvas, data) {
 const terrain=data.terrain;
 const verticalExaggeration=1.45,verticalDatum=160;
 function rawHeight(x,z){const a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/terrain.step)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/terrain.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return (h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
 function height(x,z){return verticalDatum+(rawHeight(x,z)-verticalDatum)*verticalExaggeration;}
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
 function bucket(x,z){let k=Math.floor(x/160)+','+Math.floor(z/160);if(!buckets.has(k))buckets.set(k,{x:Math.floor(x/160)*160+80,z:Math.floor(z/160)*160+80,p:[],c:[]});return buckets.get(k);}
 function tri(b,a,c,d,colour){b.p.push(...a,...c,...d);const q=col(colour);for(let i=0;i<3;i++)b.c.push(q.r,q.g,q.b);}
 function quad(b,a,c,d,e,colour){tri(b,a,c,d,colour);tri(b,a,d,e,colour);}
 function box(b,cx,cy,cz,wx,wy,wz,colour,angle=0){let pts=[];for(let y of [-.5,.5])for(let z of [-.5,.5])for(let x of [-.5,.5])pts.push([cx+x*wx*Math.cos(angle)+z*wz*Math.sin(angle),cy+y*wy,cz-x*wx*Math.sin(angle)+z*wz*Math.cos(angle)]);for(let f of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])quad(b,...f.map(i=>pts[i]),colour);}
 function groundPoly(poly,colour,lift=.07){if(poly.length<3)return;let p=poly.slice();if(p[0][0]===p.at(-1)[0]&&p[0][1]===p.at(-1)[1])p.pop();const shapes=p.map(v=>new T.Vector2(v[0],v[1]));for(const f of T.ShapeUtils.triangulateShape(shapes,[])){const vertices=f.map(i=>[p[i][0],height(...p[i])+lift,p[i][1]]);tri(bucket(vertices[0][0],vertices[0][2]),...vertices,colour);}}
 function ribbon(points,width,colour,lift=.13){for(let j=0;j<points.length-1;j++){let a=points[j],b=points[j+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<.01)continue;let dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len;for(let d=0;d<len;d+=8){let e=Math.min(len,d+8),ax=a[0]+d*dx,az=a[1]+d*dz,bx=a[0]+e*dx,bz=a[1]+e*dz;quad(bucket(ax,az),[ax-dz*width/2,height(ax-dz*width/2,az+dx*width/2)+lift,az+dx*width/2],[ax+dz*width/2,height(ax+dz*width/2,az-dx*width/2)+lift,az-dx*width/2],[bx+dz*width/2,height(bx+dz*width/2,bz-dx*width/2)+lift,bz-dx*width/2],[bx-dz*width/2,height(bx-dz*width/2,bz+dx*width/2)+lift,bz+dx*width/2],colour);}}}
 // Terrain uses the same interpolated DTM surface as roads and the car.
 let seed=42;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
 const groundStep=8;for(let z=terrain.z0;z<terrain.z0+(terrain.nz-1)*terrain.step;z+=groundStep)for(let x=terrain.x0;x<terrain.x0+(terrain.nx-1)*terrain.step;x+=groundStep){let s=groundStep;let c=['#93b96e','#96bc71','#99bd73','#91b56c'][Math.abs(Math.floor(x/40)*7+Math.floor(z/40)*11)%4];quad(bucket(x,z),[x,height(x,z),z],[x+s,height(x+s,z),z],[x+s,height(x+s,z+s),z+s],[x,height(x,z+s),z+s],c);}

 const greens={forest:'#7fa562',wood:'#7fa562',grass:'#8fb96b',meadow:'#9ac47a',park:'#8fba68',pitch:'#7eaf68',playground:'#bcca8b',recreation_ground:'#9bbe70',allotments:'#9eb878',water:'#6daeb4'};
 for(const a of data.areas)if(a.type==='water')groundPoly(a.p,greens.water,.09);
 const roadSegments=[];
 for(const road of data.roads){const width=roadWidth(road);const nearHome=road.p.some(p=>Math.hypot(p[0],p[1])<58);const gravel=['gravel','compacted','unpaved'].includes(road.surface)||(nearHome&&road.name==='Herlofsons veg');ribbon(road.p,width+1.4,'#b8bbae',.3);ribbon(road.p,width,gravel?'#989789':'#737d7b',.39);
 for(let i=0;i<road.p.length-1;i++)roadSegments.push([road.p[i],road.p[i+1],width]);
 if(road.mark){for(let i=0;i<road.p.length-1;i++){let a=road.p[i],b=road.p[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let s=0;s<l-2;s+=9)ribbon([[a[0]+(b[0]-a[0])*s/l,a[1]+(b[1]-a[1])*s/l],[a[0]+(b[0]-a[0])*Math.min(l,s+3)/l,a[1]+(b[1]-a[1])*Math.min(l,s+3)/l]],.13,'#e8d797',.43);}}
 }
 addTransit({T,scene,data,height,bucket,quad,box,groundPoly,ribbon,roadSegments});
 const junctionBuildings=createJunctionBuildings(data);
 const houseBounds=[[-22,-16,16,16],[1798,226,1861,268],[1790,270,1850,337],[1450,169,1648,285]];
 for(const building of data.buildings){let p=building.p.slice(0,-1);if(p.length<3)continue;let cx=p.reduce((a,b)=>a+b[0],0)/p.length,cz=p.reduce((a,b)=>a+b[1],0)/p.length;
 let area=0;for(let i=0;i<p.length;i++)area+=p[i][0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*p[i][1];area=Math.abs(area/2);if(area<4)continue;
 const landmark=addMunkvoll({T,scene,building,height,bucket,tri,quad,box})||addLandmark({T,scene,building,height,bucket,tri,quad,box});if(landmark){houseBounds.push(landmark.bounds);continue;}
 if(String(building.id)==='526443228'){const result=addKiwi({T,scene,building,height,bucket,tri,quad,box,groundPoly,ribbon});houseBounds.push(result.bounds);continue;}
 const style={...buildingStyles[building.id],...junctionBuildings.style(building)};const t=building.t;const garage=['garage','garages','shed','carport'].includes(t.building)||area<35;
 const levels=style.levels||(parseFloat(t['building:levels'])||((t.building==='apartments'||area>800)?3:garage?1:2));
 const h=style.height||Math.min(26,parseFloat(t.height)||levels*2.65+(garage?.1:.5));
 const heights=p.map(v=>height(...v)).sort((a,b)=>a-b);const y=style.base==='low'?heights[Math.floor(heights.length*.25)]:Math.max(...heights);const base=Math.min(...p.map(v=>height(...v)))-.4;
 const b=bucket(cx,cz);let hash=parseInt(building.id)%997;const palette=['#f0efea','#e1e2df','#ebeae1','#bfc4c0','#f4f0e5','#d9dbd7','#aaafa9','#7b4236','#575951','#e8e7df'];const colour=style.wall||t['building:colour']||palette[hash%palette.length];const roofcolour=style.roof||t['roof:colour']||['#3e4547','#494b4a','#68625a','#624b40','#545851'][hash%5];const shapes=p.map(v=>new T.Vector2(...v));
 houseBounds.push([Math.min(...p.map(v=>v[0]))-2,Math.min(...p.map(v=>v[1]))-2,Math.max(...p.map(v=>v[0]))+2,Math.max(...p.map(v=>v[1]))+2]);
 // Ground shadow, foundation, walls and windows follow the original footprint.
 groundPoly(p,'#6f8e57',.105);
 for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length];quad(b,[a[0],base,a[1]],[c[0],base,c[1]],[c[0],y+.5,c[1]],[a[0],y+.5,a[1]],'#bcbfb2');quad(b,[a[0],y+.5,a[1]],[c[0],y+.5,c[1]],[c[0],y+h,c[1]],[a[0],y+h,a[1]],colour);
 const edgeLength=Math.hypot(c[0]-a[0],c[1]-a[1]);
 if(style.sections&&edgeLength>25){const dx=(c[0]-a[0])/edgeLength,dz=(c[1]-a[1])/edgeLength;for(let j=0;j<4;j++){const aa=[a[0]+dx*edgeLength*j/4,a[1]+dz*edgeLength*j/4],cc=[a[0]+dx*edgeLength*(j+1)/4,a[1]+dz*edgeLength*(j+1)/4];for(const sign of [-1,1])quad(b,[aa[0]-dz*.04*sign,y+.5,aa[1]+dx*.04*sign],[cc[0]-dz*.04*sign,y+.5,cc[1]+dx*.04*sign],[cc[0]-dz*.04*sign,y+h,cc[1]+dx*.04*sign],[aa[0]-dz*.04*sign,y+h,aa[1]+dx*.04*sign],style.sections[j]);}}
 if(style.balconies&&edgeLength>25){const dx=(c[0]-a[0])/edgeLength,dz=(c[1]-a[1])/edgeLength;let nx=-dz,nz=dx;if(nx*((a[0]+c[0])/2-cx)+nz*((a[1]+c[1])/2-cz)<0){nx=-nx;nz=-nz;}if(style.balconies==='south'?nz>.65:nx<-.65){const at=(d,yy,o)=>[a[0]+dx*d+nx*o,yy,a[1]+dz*d+nz*o];for(let floor=0;floor<3;floor++){const yy=y+.55+floor*2.65;for(let d=1;d<edgeLength-3;d+=7){const end=Math.min(d+6.6,edgeLength-1);quad(b,at(d,yy,0),at(end,yy,0),at(end,yy,1.55),at(d,yy,1.55),'#ddd7c7');quad(b,at(d,yy,1.55),at(end,yy,1.55),at(end,yy+.9,1.55),at(d,yy+.9,1.55),'#e7ddc9');for(let s=d;s<end;s+=.28){const p=at(s,yy+.48,1.59);box(b,p[0],p[1],p[2],.035,.87,.035,'#a89c84');}}}}}
 if(style.siding&&edgeLength>1){const dx=(c[0]-a[0])/edgeLength,dz=(c[1]-a[1])/edgeLength;for(let d=.3;d<edgeLength;d+=.48){const x=a[0]+dx*d,z=a[1]+dz*d;for(const sign of [-1,1])quad(b,[x-dz*.025*sign,y+.5,z+dx*.025*sign],[x+dx*.027-dz*.025*sign,y+.5,z+dz*.027+dx*.025*sign],[x+dx*.027-dz*.025*sign,y+h,z+dz*.027+dx*.025*sign],[x-dz*.025*sign,y+h,z+dx*.025*sign],'#'+new T.Color(colour).multiplyScalar(.82).getHexString());}box(b,(a[0]+c[0])/2,y+h-.04,(a[1]+c[1])/2,edgeLength,.14,.17,'#ecece5',Math.atan2(-dz,dx));}
 if(style.brick||style.horizontalSiding){for(let hy=y+.7;hy<y+h;hy+=style.horizontalSiding?.23:.32){const dx=(c[0]-a[0])/edgeLength,dz=(c[1]-a[1])/edgeLength;for(const sign of [-1,1])quad(b,[a[0]-dz*.025*sign,hy,a[1]+dx*.025*sign],[c[0]-dz*.025*sign,hy,c[1]+dx*.025*sign],[c[0]-dz*.025*sign,hy+.025,c[1]+dx*.025*sign],[a[0]-dz*.025*sign,hy+.025,a[1]+dx*.025*sign],style.horizontalSiding?'#c6c8bf':'#91897d');}}
 const len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len>3){const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;for(let f=0;f<levels;f++)for(let j=1;j<=Math.floor(len/3.7);j++){const q=j/(Math.floor(len/3.7)+1),wx=a[0]+(c[0]-a[0])*q,wz=a[1]+(c[1]-a[1])*q,wy=y+1.5+f*2.65;const half=garage?.45:.63;const wa=[wx-dx*half,wy,wz-dz*half],wb=[wx+dx*half,wy,wz+dz*half],wc=[wb[0],wy+1.04,wb[2]],wd=[wa[0],wy+1.04,wa[2]];const nx=-dz*.065,nz=dx*.065;quad(b,...[wa,wb,wc,wd].map(v=>[v[0]+nx,v[1],v[2]+nz]),'#fff6df');quad(b,...[wa,wb,wc,wd].map(v=>[v[0]-nx,v[1],v[2]-nz]),'#fff6df');const glass=[[-.46,.15],[.46,.15],[.46,.92],[-.46,.92]].map(v=>[wx+dx*v[0],wy+v[1],wz+dz*v[0]]);quad(b,...glass.map(v=>[v[0]+nx*2,v[1],v[2]+nz*2]),'#718b91');quad(b,...glass.map(v=>[v[0]-nx*2,v[1],v[2]-nz*2]),'#718b91');}}
 }
 const roofTop=addBuildingRoof({T,p,cx,cz,y,h,style,t,area,b,tri,quad,colour,roofcolour});

 if(style.junction)addJunctionDetails({T,scene,building,p,cx,cz,y,h,levels,garage,style,roads:junctionBuildings.roads,height,bucket,tri,quad,box,roofTop});
 if(area>55&&area<260&&(style.chimney||!style.source&&hash%4===0))box(b,cx+1,y+h+.7,cz+.5,.65,2,.7,'#a39c8d');
 }
 function distanceSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
 // A spatial index keeps decorative trees away from real roads and buildings.
 const obstacles=new Map();function index(x,z,val){let k=Math.floor(x/40)+','+Math.floor(z/40);if(!obstacles.has(k))obstacles.set(k,[]);obstacles.get(k).push(val);}
 for(const r of roadSegments){const [a,b]=r;let len=Math.hypot(a[0]-b[0],a[1]-b[1]);for(let d=0;d<=len;d+=15){let t=len?d/len:0;index(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,{road:r});}index(b[0],b[1],{road:r});}
 for(const b of houseBounds)for(let x=Math.floor(b[0]/40)*40;x<=b[2];x+=40)for(let z=Math.floor(b[1]/40)*40;z<=b[3];z+=40)index(x,z,{house:b});
 function clear(x,z){for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){let a=obstacles.get((Math.floor(x/40)+dx)+','+(Math.floor(z/40)+dz))||[];for(const o of a){if(o.road&&distanceSegment(x,z,o.road[0],o.road[1])<o.road[2]/2+4)return false;if(o.house&&x>o.house[0]&&x<o.house[2]&&z>o.house[1]&&z<o.house[3])return false;}}return true;}
 function cone(b,x,y,z,r,h,c,sides=7){for(let i=0;i<sides;i++){let a=i/sides*Math.PI*2,a2=(i+1)/sides*Math.PI*2;tri(b,[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(a2)*r,y,z+Math.sin(a2)*r],[x,y+h,z],c);}}
 addLandmarkGround({height,bucket,quad,box,groundPoly,ribbon});
 const homeShrubs=[[-15,1],[-12,4],[-9,6],[-6,8],[-3,9],[0,12],[3,10],[6,9],[9,8],[11,7],[-8,10],[-11,7]];for(const [x,z] of homeShrubs){const b=bucket(x,z),y=height(x,z);const g=new T.IcosahedronGeometry(1,1);g.scale(1.65,.85,1.45);g.translate(x,y+.7,z);const p=g.attributes.position;for(let i=0;i<p.count;i+=3)tri(b,...[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]),'#688845');g.dispose();}
 for(let n=0;n<12000;n++){let x=-220+rnd()*2440,z=-700+rnd()*1520;if(!clear(x,z))continue;let y=height(x,z),h=3+rnd()*5,b=bucket(x,z);box(b,x,y+h*.3,z,.3,h*.6,.3,'#8c7152');if(rnd()<.6){cone(b,x,y+h*.25,z,h*.38,h*.7,'#538b60');cone(b,x,y+h*.54,z,h*.29,h*.55,'#689b64');}else{const geo=new T.IcosahedronGeometry(h*.35,0);geo.translate(x,y+h*.72,z);const at=geo.getAttribute('position');const cc=['#74a357','#8eb15f','#659850'][n%3];for(let i=0;i<at.count;i+=3)tri(b,[at.getX(i),at.getY(i),at.getZ(i)],[at.getX(i+1),at.getY(i+1),at.getZ(i+1)],[at.getX(i+2),at.getY(i+2),at.getZ(i+2)],cc);geo.dispose();}}
 const chunks=[];
 for(const b of buckets.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('color',new T.Float32BufferAttribute(b.c,3));g.computeVertexNormals();g.computeBoundingSphere();const m=new T.Mesh(g,staticMaterial);m.receiveShadow=true;scene.add(m);chunks.push({mesh:m,x:b.x,z:b.z});}
 function label(text,x,z,colour='#164e48',scale=10){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=colour;ctx.beginPath();ctx.roundRect(4,6,504,108,24);ctx.fill();ctx.strokeStyle='#fff5d9';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#fff9e8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 32px sans-serif';ctx.fillText(text,256,61,465);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const mat=new T.SpriteMaterial({map:tex,depthTest:true});const s=new T.Sprite(mat);s.position.set(x,height(x,z)+7,z);s.scale.set(scale,scale/4,1);scene.add(s);return s;}
 const labels=[];labels.push(label('⌂  Hjemme',0,0,'#654d3e',10));for(const p of data.pois)if(['supermarket','school','kindergarten','fuel','bakery'].includes(p.type))labels.push(label(p.name,p.x,p.z,p.type==='kindergarten'?'#c98938':'#3b6955',p.name.length>19?17:13));
 const goalPos=data.nodes[data.goal];const goalRing=new T.Mesh(new T.TorusGeometry(4,.18,6,48),new T.MeshBasicMaterial({color:'#ffe17a'}));goalRing.rotation.x=Math.PI/2;goalRing.position.set(goalPos[0],height(...goalPos)+.7,goalPos[1]);scene.add(goalRing);labels.push(label('⚑  Her er barnehagen!',...goalPos,'#c58b29',14));
 const {car,wheels}=createET5(T);scene.add(car);
 // Soft contact shadow remains visible with economical mobile shadows.
 const shc=document.createElement('canvas');shc.width=64;shc.height=64;const sc=shc.getContext('2d'),gr=sc.createRadialGradient(32,32,6,32,32,32);gr.addColorStop(0,'rgba(24,40,35,.48)');gr.addColorStop(1,'rgba(24,40,35,0)');sc.fillStyle=gr;sc.fillRect(0,0,64,64);const sm=new T.Mesh(new T.PlaneGeometry(3.4,6),new T.MeshBasicMaterial({map:new T.CanvasTexture(shc),transparent:true,depthWrite:false}));sm.rotation.x=-Math.PI/2;scene.add(sm);
 const confetti=[];const cg=new T.BoxGeometry(.12,.04,.24);for(let i=0;i<75;i++){const m=new T.Mesh(cg,new T.MeshBasicMaterial({color:['#ffd66c','#6ad2c9','#e99584','#fff5cf'][i%4]}));m.visible=false;scene.add(m);confetti.push(m);}
 // A floating turn cue follows the car. It is only shown while Sofia is choosing a road.
 const arrowCanvas=document.createElement('canvas');arrowCanvas.width=256;arrowCanvas.height=256;const arrowCtx=arrowCanvas.getContext('2d');
 const arrowTexture=new T.CanvasTexture(arrowCanvas);arrowTexture.colorSpace=T.SRGBColorSpace;const arrowMat=new T.SpriteMaterial({map:arrowTexture,transparent:true,depthTest:false,depthWrite:false});const turnArrow=new T.Sprite(arrowMat);turnArrow.scale.set(4.8,4.8,1);turnArrow.visible=false;scene.add(turnArrow);
 function paintTurnArrow(symbol,label){arrowCtx.clearRect(0,0,256,256);arrowCtx.fillStyle='#f5c656';arrowCtx.beginPath();arrowCtx.arc(128,128,108,0,Math.PI*2);arrowCtx.fill();arrowCtx.strokeStyle='#fff8dd';arrowCtx.lineWidth=10;arrowCtx.stroke();arrowCtx.fillStyle='#173e3c';arrowCtx.textAlign='center';arrowCtx.textBaseline='middle';arrowCtx.font='bold 112px Arial';arrowCtx.fillText(symbol,128,120);arrowCtx.font='bold 22px Arial';arrowCtx.fillText(label.toUpperCase(),128,210);arrowTexture.needsUpdate=true;}
 function setTurnArrow(info){if(!info){turnArrow.visible=false;return;}paintTurnArrow(info.symbol,info.label);turnArrow.visible=true;}
 const look=new T.Vector3(),target=new T.Vector3();let initialized=false,overview=false;
 function update(dt,pos,tangent,velocity,mode,finished,time,carFacing=tangent){
 car.position.copy(pos);const yaw=Math.atan2(-carFacing.x,-carFacing.z);const rot=new T.Quaternion().setFromEuler(new T.Euler(Math.atan2(carFacing.y,Math.hypot(carFacing.x,carFacing.z)),yaw,0,'YXZ'));car.quaternion.slerp(rot,1-Math.exp(-dt*9));wheels.forEach(w=>w.rotation.x-=velocity*dt/.39);
 sm.position.set(pos.x,height(pos.x,pos.z)+.25,pos.z);sm.rotation.z=-yaw;turnArrow.position.set(pos.x,pos.y+7.3+Math.sin(time*3)*.22,pos.z);turnArrow.scale.setScalar(4.5+Math.sin(time*3)*.16);if(finished)turnArrow.visible=false;
 const follow=mode==='high'?{back:26,up:22,ahead:13}:mode==='intro'?{back:14,up:7,ahead:2}:{back:14,up:7.8,ahead:8};
 const horizontal=new T.Vector3(tangent.x,0,tangent.z).normalize();if(horizontal.lengthSq()<.1)horizontal.set(0,0,-1);
 const orbitDirection=horizontal.clone().applyAxisAngle(new T.Vector3(0,1,0),orbit.yaw);
 const orbitAngle=Math.atan2(follow.up,follow.back)+orbit.tilt,orbitDistance=Math.hypot(follow.back,follow.up);
 target.copy(pos).addScaledVector(orbitDirection,-Math.cos(orbitAngle)*orbitDistance);target.y=Math.max(pos.y+Math.sin(orbitAngle)*orbitDistance,height(target.x,target.z)+2.5);
 const camLook=pos.clone().addScaledVector(orbitDirection,orbit.active?0:follow.ahead);camLook.y+=1;
 // Face the home's photographed west-facing gables before setting off.
 if(mode==='intro'&&!orbit.active){target.set(-27,height(-27,-15)+5,-15);camLook.set(0,height(-7,-3)+2.4,0);}
 if(!initialized){camera.position.copy(target);look.copy(camLook);initialized=true;}else{camera.position.lerp(target,1-Math.exp(-dt*3));look.lerp(camLook,1-Math.exp(-dt*4));}camera.lookAt(look);
 sun.position.set(pos.x-70,pos.y+160,pos.z-90);sun.target.position.copy(pos);sun.target.updateMatrixWorld();
 for(const c of chunks){const d=Math.hypot(c.x-pos.x,c.z-pos.z);c.mesh.visible=d<680;c.mesh.castShadow=d<110;}
 for(const l of labels)l.visible=l.position.distanceTo(pos)<165&&l.position.distanceTo(pos)>27;
 goalRing.visible=Math.hypot(pos.x-goalPos[0],pos.z-goalPos[1])<150;goalRing.scale.setScalar(1+.08*Math.sin(time*2));
 for(let i=0;i<confetti.length;i++){const c=confetti[i];c.visible=finished;if(finished){const phase=(time*.7+i*.037)%4;c.position.set(pos.x+Math.sin(i*5.3)*5+Math.sin(time+i),pos.y+9-phase*2,pos.z+Math.cos(i*2.3)*5);c.rotation.set(time+i,time*.8,i);}}
 renderer.render(scene,camera);
 }
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 resize();window.addEventListener('resize',resize);return {height,rawHeight,scene,camera,renderer,car,update,resize,setTurnArrow,resetCamera(){initialized=false;orbit.reset();}};
}
