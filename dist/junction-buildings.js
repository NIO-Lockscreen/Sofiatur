import {junctionObservations} from './junction-observations.js';
import {projectPoint,streetSegments,segmentIndex} from './transit-geometry.js';

export function createJunctionBuildings(data){
 const outgoing=new Map();for(const e of data.edges){if(!outgoing.has(e.from))outgoing.set(e.from,[]);outgoing.get(e.from).push(e);}
 const nodes=[...outgoing].filter(([n,es])=>new Set(es.map(e=>e.to)).size>2||es.some(e=>e.roundabout)||n===data.start).map(([id])=>({id,p:data.nodes[id]}));
 const roads=streetSegments(data.roads),roadIndex=segmentIndex(roads),near=new Set(),cells=new Map(),cell=n=>Math.floor(n/40);
 for(const n of nodes){const k=cell(n.p[0])+','+cell(n.p[1]);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(n);}
 const nearNode=p=>{for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const n of cells.get((cell(p[0])+i)+','+(cell(p[1])+j))||[])if(Math.hypot(p[0]-n.p[0],p[1]-n.p[1])<40)return true;return false;};
 for(const b of data.buildings)if(b.p.some(nearNode))near.add(b.id);
 function style(building){const t=building.t,observed=junctionObservations[building.id]||{},detailed=near.has(building.id)||!!observed.source;
  const material=t['building:material']||t['building:facade:material'];
  return {junction:detailed,...(t['roof:height']?{roofRise:parseFloat(t['roof:height'])}:{}),...(material==='brick'?{brick:true}:{}),...observed};
 }
 return {nodes,near,roads,roadIndex,style};
}

// Original stylised joinery; exact colours and roof forms only come from mapped
// tags or individually recorded photographs. Unseen doors/windows are estimates.
export function addJunctionDetails({T,scene,building,p,cx,cz,y,h,levels,garage,style,roads,roadIndex,height,bucket,tri,quad,box,roofTop}){
 const b=bucket(cx,cz),trim=style.trim||'#efeee6',glass=style.glass||'#52676d',frames=style.frames||trim;
 let front=null;
 for(let i=0;i<p.length;i++){
  const a=p[i],c=p[(i+1)%p.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<2)continue;
  const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;let nx=-dz,nz=dx;if(nx*((a[0]+c[0])/2-cx)+nz*((a[1]+c[1])/2-cz)<0){nx=-nx;nz=-nz;}
  const at=(d,hy,o=.12)=>[a[0]+dx*d+nx*o,hy,a[1]+dz*d+nz*o],panel=(d,hy,w,hh,col,o=.12)=>quad(b,at(d-w/2,hy,o),at(d+w/2,hy,o),at(d+w/2,hy+hh,o),at(d-w/2,hy+hh,o),col);
  const centre=at(len/2,y);let road=null;const inFront=list=>{for(const [u,v] of list){const q=projectPoint([centre[0],centre[2]],u,v);if((q.x-centre[0])*nx+(q.z-centre[2])*nz>0&&(!road||q.distance<road.distance))road=q;}};
  // Nearest road in front of the wall: nearby segments first, all roads only when none is within 60 m.
  inFront(roadIndex.near(centre[0],centre[2],60));if(!road||road.distance>60){road=null;inFront(roads);}
  if(road&&len>4&&(!front||road.distance<front.distance))front={at,panel,len,distance:road.distance,dx,dz,nx,nz};
  if(style.upperWall)panel(len/2,y+h*.65,len,h*.35,style.upperWall,.08);
  if(style.lowerWall)panel(len/2,y+.5,len,Math.min(2.25,h-.5),style.lowerWall,.08);
  if(style.floorBands)for(let f=1;f<levels;f++)panel(len/2,y+.35+f*2.65,len,.42,style.floorBands,.18);
  if(style.flat&&style.parapet)panel(len/2,y+h-.65,len,.65,style.parapet,.19);
  // Fascia follows the roof including gable ends, instead of a floating rectangle.
  const mid=[(a[0]+c[0])/2,(a[1]+c[1])/2],segments=[[a,mid],[mid,c]];
  for(const [u,v] of segments){const hu=roofTop(u),hv=roofTop(v);quad(b,[u[0]+nx*.14,hu,u[1]+nz*.14],[v[0]+nx*.14,hv,v[1]+nz*.14],[v[0]+nx*.14,hv-.16,v[1]+nz*.14],[u[0]+nx*.14,hu-.16,u[1]+nz*.14],trim);}
  panel(.08,y+.5,.12,h-.5,trim);panel(len-.08,y+.5,.12,h-.5,trim);
  // Sashes and sills sit in the existing window openings; no extra windows.
  if(!garage)for(let f=0;f<levels;f++)for(let j=1;j<=Math.floor(len/3.7);j++){
   const d=len*j/(Math.floor(len/3.7)+1),hy=y+1.5+f*2.65;if(hy+.98>y+h)continue;
   panel(d,hy+.15,.92,.77,glass,.14);panel(d,hy+.15,.045,.77,frames,.16);panel(d,hy+.5,.94,.04,frames,.16);panel(d,hy-.04,1.38,.08,trim,.17);
  }
  if(style.windowBand&&len>8){for(let f=0;f<levels;f++){const hy=y+.9+f*2.65;if(hy+1.8>y+h-.5)continue;panel(len/2,hy,len-1.1,1.8,glass,.22);for(let d=.55;d<len-.5;d+=2.1)panel(d,hy,.1,1.8,trim,.25);}}
  if(style.schoolEntrance&&Math.abs(a[0]-556.06)<.1&&Math.abs(c[0]-566.4)<.1){
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=180;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,180);ctx.fillStyle='#283333';ctx.font='bold 104px Arial';ctx.textBaseline='middle';ctx.fillText('UGLA SKOLE',190,95);ctx.fillStyle='#e9ebe5';ctx.beginPath();ctx.arc(95,88,65,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#354440';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(95,45);ctx.lineTo(95,88);ctx.lineTo(124,102);ctx.stroke();const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(7.4,1.0),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));sign.position.set(...at(len*.6,y+h-.45,.28));sign.rotation.y=Math.atan2(nx,nz);sign.name='Ugla school entrance clock and lettering';scene.add(sign);
  }
 }
 if(front&&front.distance<50){const f=front,d=f.len/2,hy=y+.5,w=garage?Math.min(2.8,f.len-1):1.06,hh=garage?Math.min(2.1,h-.6):2.05;
  f.panel(d,hy,w+.2,hh+.1,trim,.15);f.panel(d,hy,w,hh,style.door||'#3c4a49',.18);
  if(garage){for(let z=.23;z<hh;z+=.3)f.panel(d,hy+z,w,.025,'#a4a7a2',.20);}else{f.panel(d,hy+1.2,.66,.6,glass,.2);f.panel(d+.32,hy+.9,.1,.045,'#b4b9b5',.23);}
  if(style.canopy){const q=f.at(d,hy+hh+.12,.55);box(b,q[0],q[1],q[2],w+1,.13,1.25,style.roof||'#464c4c',Math.atan2(-f.dz,f.dx));}
 }
 if(style.penthouse){
  const pp=p.map(v=>[cx+(v[0]-cx)*.69,cz+(v[1]-cz)*.69]),bottom=y+h+.1,top=bottom+2.6;
  for(let i=0;i<pp.length;i++){const a=pp[i],c=pp[(i+1)%pp.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<.1)continue;const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;
   quad(b,[a[0],bottom,a[1]],[c[0],bottom,c[1]],[c[0],top,c[1]],[a[0],top,a[1]],style.penthouse);
   let nx=-dz,nz=dx;if(nx*((a[0]+c[0])/2-cx)+nz*((a[1]+c[1])/2-cz)<0){nx=-nx;nz=-nz;}
   const at=(d,yy,o=.03)=>[a[0]+dx*d+nx*o,yy,a[1]+dz*d+nz*o];
   if(len>3)quad(b,at(.5,bottom+.25),at(len-.5,bottom+.25),at(len-.5,top-.3),at(.5,top-.3),glass);
   for(let d=.5;d<len;d+=2.5)quad(b,at(d,bottom+.2,.06),at(d+.075,bottom+.2,.06),at(d+.075,top-.15,.06),at(d,top-.15,.06),'#414947');
   const u=p[i],v=p[(i+1)%p.length];quad(b,[u[0],bottom,u[1]],[v[0],bottom,v[1]],[v[0],bottom+.85,v[1]],[u[0],bottom+.85,u[1]],'#a7baba');
  }
  for(const f of T.ShapeUtils.triangulateShape(pp.map(v=>new T.Vector2(...v)),[]))tri(b,...f.map(i=>[pp[i][0],top+.08,pp[i][1]]),style.roof||'#3b4040');
 }
}
