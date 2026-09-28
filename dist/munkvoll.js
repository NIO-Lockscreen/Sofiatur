import {createRailProfiles,placeBusStop,streetSegments} from './transit-geometry.js';
// Photo-led landmarks, original geometry only. See docs/munkvoll-references.md.
export function addMunkvoll({T,scene,building,height,bucket,quad,tri,box}){
 const id=String(building.id);if(!['89233421','89233428','89233446','186840391','186841224','186841235'].includes(id))return null;
 const p=building.p.slice(0,-1),cx=p.reduce((s,v)=>s+v[0],0)/p.length,cz=p.reduce((s,v)=>s+v[1],0)/p.length,b=bucket(cx,cz);
 const bounds=[Math.min(...p.map(v=>v[0]))-3,Math.min(...p.map(v=>v[1]))-3,Math.max(...p.map(v=>v[0]))+3,Math.max(...p.map(v=>v[1]))+3];
 function sign(text,at,normal,w,h,fg='#f2f0e5',bg='#2c3032',serif=false){const c=document.createElement('canvas');c.width=1024;c.height=160;const q=c.getContext('2d');q.fillStyle=bg;q.fillRect(0,0,1024,160);q.fillStyle=fg;q.font=`bold 105px ${serif?'Georgia':'sans-serif'}`;q.textAlign='center';q.textBaseline='middle';q.fillText(text,512,83,985);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}));m.name=text;m.position.set(...at);m.rotation.y=Math.atan2(normal[0],normal[1]);scene.add(m);}
 function frame(origin,u,w,d,h,rise,wall,roof,hipped=false){const ul=Math.hypot(...u);u=u.map(v=>v/ul);const v=[-u[1],u[0]],y=Math.max(...[origin,[origin[0]+u[0]*w,origin[1]+u[1]*w]].map(a=>height(...a)))+.12;
  const at=(x,yy,z)=>[origin[0]+u[0]*x+v[0]*z,y+yy,origin[1]+u[1]*x+v[1]*z];
  const q=(a,c,d,e,col)=>quad(b,at(...a),at(...c),at(...d),at(...e),col);
  const beam=(a,c,size,col)=>{const aa=at(...a),cc=at(...c),dx=cc[0]-aa[0],dy=cc[1]-aa[1],dz=cc[2]-aa[2];if(Math.abs(dy)<.001)box(b,(aa[0]+cc[0])/2,aa[1],(aa[2]+cc[2])/2,Math.hypot(dx,dz),size,size,col,Math.atan2(-dz,dx));else{quad(b,[aa[0]-.05,aa[1],aa[2]],[aa[0]+.05,aa[1],aa[2]],[cc[0]+.05,cc[1],cc[2]],[cc[0]-.05,cc[1],cc[2]],col);}};
  for(const z of [0,d]){const a=at(0,0,z),c=at(w,0,z);quad(b,[a[0],height(a[0],a[2])-.2,a[2]],[c[0],height(c[0],c[2])-.2,c[2]],c,a,'#a1a59d');q([0,0,z],[w,0,z],[w,h,z],[0,h,z],wall);for(let x=.22;x<w;x+=.28)q([x,0,z+(z?1:-1)*.025],[x+.025,0,z+(z?1:-1)*.025],[x+.025,h,z+(z?1:-1)*.025],[x,h,z+(z?1:-1)*.025],'#'+new T.Color(wall).multiplyScalar(.84).getHexString());}
  for(const x of [0,w]){q([x,0,0],[x,0,d],[x,h,d],[x,h,0],wall);if(!hipped)tri(b,at(x,h,0),at(x,h,d),at(x,h+rise,d/2),wall);}
  const inset=hipped?Math.min(d/2,w/3):0;
  q([-.2,h,-.22],[w+.2,h,-.22],[w-inset,h+rise,d/2],[inset,h+rise,d/2],roof);
  q([-.2,h,d+.22],[w+.2,h,d+.22],[w-inset,h+rise,d/2],[inset,h+rise,d/2],roof);
  if(hipped){tri(b,at(-.2,h,-.22),at(-.2,h,d+.22),at(inset,h+rise,d/2),roof);tri(b,at(w+.2,h,-.22),at(w+.2,h,d+.22),at(w-inset,h+rise,d/2),roof);}
  for(let x=.6;x<w-.4;x+=.7){if(hipped&&(x<inset||x>w-inset))continue;for(const z of [0,d])beam([x,h+.02,z],[x,h+rise+.02,d/2],.04,'#657078');}
  for(const z of [0,d])beam([0,h,z],[w,h,z],.14,roof);
  const panel=(x,yy,z,ww,hh,col,side='long')=>side==='long'?q([x-ww/2,yy,z],[x+ww/2,yy,z],[x+ww/2,yy+hh,z],[x-ww/2,yy+hh,z],col):q([x,yy,z-ww/2],[x,yy,z+ww/2],[x,yy+hh,z+ww/2],[x,yy+hh,z-ww/2],col);
  return {at,q,beam,panel,u,v,w,d,h,y,sign:(t,x,yy,z,ww,hh,side='long',fg,bg,serif)=>sign(t,at(x,yy,z),side==='long'?v:u,ww,hh,fg,bg,serif)};
 }
 if(id==='186841224'||id==='186841235'){
  // Two distinct hipped dark standing-seam roofs, photographed numbered doors
  // face west onto Adolf Andreassens veg. No generic house windows.
  const origin=id==='186841224'?[1929.86,308.42]:[1926.47,278.03];const f=frame(origin,[-.105,-.995],28.3,6.2,2.35,1.5,'#696c61','#343f4c',true);
  // Inward depth is east; road-facing doors are on the west edge (depth zero).
  for(let i=0;i<9;i++){const x=1.55+i*3.1;f.panel(x,.06,-.04,2.8,2.15,'#494e46');f.panel(x,.13,-.06,2.56,1.98,'#7a7e70');for(let yy=.32;yy<2;yy+=.24)f.panel(x,yy,-.075,2.54,.023,'#999b8d');f.sign(String((id==='186841224'?11:2)+i),x,1.89,-.085,.22,.16,'long','#d8c491','#7a7e70');const lamp=f.at(x+1.40,2.20,-.15);box(b,...lamp,.12,.12,.12,'#f1efd5');}
  return {bounds};
 }
 if(id==='186840391'){
  const f=frame([1614.94,197.43],[.966,-.259],10.55,8.2,2.6,1.7,'#eae5cf','#9d493f');
  // Western gable faces the forecourt and tracks, matching exterior photograph.
  for(const z of [1.65,6.45]){f.panel(-.04,.65,z,2.45,1.45,'#9a4941','end');f.panel(-.06,.77,z,2.23,1.22,'#597582','end');}
  f.panel(-.04,.05,4.1,1.25,2.25,'#a64b43','end');f.panel(-.06,.15,4.1,1.04,2.00,'#486675','end');
  f.sign('PIZZABAKEREN',-.08,3.05,4.1,3.2,.65,'end','#f7c14b','#753622');
  for(const z of [0,8.2]){f.beam([-.24,2.62,z],[ -.24,4.32,4.1],.18,'#b65b4f');for(const x of [0,10.55]){const a=f.at(x,1.3,z);box(b,...a,.14,2.6,.14,'#9d493f');}}
  for(const z of [1.6,6.5]){const a=f.at(-.9,.47,z);box(b,...a,.48,.14,2.3,'#8e4437');}
 }else if(id==='89233446'){
  const main=frame([1595.13,150.41],[.99,-.141],19.8,8.25,6.5,2.25,'#b9beba','#41494a');
  for(const z of [-.045,8.30])for(const x of [2.7,7.3,12,16.8]){main.panel(x,3.85,z,1.5,1.35,'#efeee2');main.panel(x,3.95,z+(z<0?-.015:.015),1.32,1.15,'#68818a');}
  const wing=frame([1590.04,162.09],[.99,-.141],15.5,15.1,3.0,2.7,'#b9beba','#41494a');
  // Low south-facing gable dining wing; green awning above broad shop window.
  wing.panel(-.06,.7,7.55,10.0,1.65,'#f0eee3','end');wing.panel(-.08,.85,7.55,9.7,1.33,'#526d78','end');
  for(let z=3;z<12.2;z+=2)wing.panel(-.10,.78,z,.08,1.55,'#e2e5db','end');
  wing.q([-.1,2.5,2.3],[-.1,2.5,12.8],[-1.3,2.23,12.8],[-1.3,2.23,2.3],'#216b4b');
  wing.sign('palermo',-.11,3.95,7.55,9.7,1.25,'end','#232828','#b9beba',true);
  const porch=frame([1607.31,172.85],[.99,-.141],11,4.5,2.8,1.0,'#b9beba','#41494a');
  for(const x of [2,4]){porch.panel(x,.8,4.54,1,1.5,'#ebece3');porch.panel(x,.9,4.56,.8,1.3,'#506870');}
  porch.panel(7.5,.1,4.55,1.4,2.3,'#ecebe1');porch.panel(7.5,.2,4.58,1.2,2.1,'#3c555d');porch.sign('palermo',7.3,3.62,4.6,4.2,.72,'long','#232828','#e3e3d8',true);
  porch.q([6,.05,8],[9,.05,8],[9,.6,4.5],[6,.6,4.5],'#9daba9');
 }else if(id==='89233421'){
  const f=frame([1517.64,176.81],[.974,-.226],49,14.05,4.3,2.4,'#353e40','#afb7b9');
  for(let x=3;x<45;x+=4.5){f.panel(x,.05,14.09,3.8,3.95,'#d6ddda');f.panel(x,.25,14.12,3.52,3.5,'#536d76');for(const xx of [x-.87,x,x+.87])f.panel(xx,.15,14.14,.065,3.72,'#c5cecb');for(const yy of [1.15,2.55])f.panel(x,yy,14.16,3.62,.075,'#c5cecb');}
  f.sign('SPORVEISMUSEET',38,3.5,14.20,10.2,.73);
  // Projecting entrance pavilion at the Selsbakkvegen end.
  const entry=frame([1557.37,182.05],[.974,-.226],10,12.9,4.0,2.8,'#353e40','#a6afb0');entry.sign('SPORVEISMUSEET',5,2.8,12.96,6.5,.6);entry.panel(5,.1,12.95,1.6,2.4,'#222e30');
  for(const x of [7,21,35]){const a=f.at(x,.45,15.4);box(b,...a,2,.13,.5,'#979e97');}
 }else{
  const f=frame([1472.28,207.5],[.965,-.263],45,13,4.2,3.1,'#303a3e','#b4b9b9');
  for(let i=0;i<3;i++){const z=2.25+i*4.2;f.panel(45.04,.04,z,3.95,4.0,'#252c2e','end');f.panel(45.06,.12,z,3.68,3.84,'#9c403a','end');for(let yy=.3;yy<3.9;yy+=.2)f.panel(45.08,yy,z,3.64,.026,'#bc6157','end');f.sign(String(11+i),45.10,4.57,z,.55,.4,'end');}
  f.beam([45.13,4.2,0],[45.13,7.3,6.5],.23,'#eeeee7');f.beam([45.13,4.2,13],[45.13,7.3,6.5],.23,'#eeeee7');
 }
 return {bounds};
}

export function addTransit({T,scene,data,height,bucket,quad,box,groundPoly,ribbon,roadSegments}){
 // Asphalt depot apron and the gravel shop forecourt observed in exterior photos.
 groundPoly([[1466,199],[1485,191],[1530,188],[1571,180],[1586,192],[1561,235],[1520,244],[1469,237]],'#888b82',.28);
 groundPoly([[1605,193],[1635,188],[1642,215],[1628,229],[1613,230],[1601,216]],'#b4b2a2',.29);
 const railSegments=[],wires=[];
 const {bridges,railHeight}=createRailProfiles(data.rails||[],height,roadSegments);
 // Sloped steel deck, side girders, concrete abutments and open railings.
 for(const {rail,level} of bridges){
  for(let i=1;i<rail.p.length;i++){const a=rail.p[i-1],c=rail.p[i],len=Math.hypot(c[0]-a[0],c[1]-a[1]),dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len,x=(a[0]+c[0])/2,z=(a[1]+c[1])/2,b=bucket(x,z),angle=Math.atan2(-dz,dx);
   box(b,x,level-.43,z,len+.05,.86,4.2,'#626e77',angle);
   for(const side of [-1,1]){const xx=x-dz*side*2,zz=z+dx*side*2;box(b,xx,level+.16,zz,len+.05,.58,.18,'#8b979d',angle);box(b,xx,level+1.13,zz,len+.05,.08,.08,'#bac3be',angle);box(b,xx,level+.68,zz,len+.05,.06,.06,'#a5b2ad',angle);
    for(let d=0;d<len;d+=2.7)box(b,a[0]+dx*d-dz*side*2,level+.66,a[1]+dz*d+dx*side*2,.065,1,.065,'#a5b2ad');}
  }
  const a=rail.p[0],c=rail.p.at(-1),angle=Math.atan2(-(c[1]-a[1]),c[0]-a[0]);
  if(rail.id==='14012126'){
   const len=Math.hypot(c[0]-a[0],c[1]-a[1]),dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;
   for(const d of [16,39]){const x=a[0]+dx*d,z=a[1]+dz*d,base=height(x,z),b=bucket(x,z);
    if(roadSegments.some(([p,q,w])=>{const vx=q[0]-p[0],vz=q[1]-p[1],t=Math.max(0,Math.min(1,((x-p[0])*vx+(z-p[1])*vz)/(vx*vx+vz*vz||1)));return Math.hypot(x-p[0]-t*vx,z-p[1]-t*vz)<w/2+1.5;}))continue;
    box(b,x,base+.2,z,1.1,.4,1.1,'#aaad9f',angle);
    for(const side of [-1,1]){const verts=[];for(const face of [-1,1])for(const [u,y] of [[-.2,base+.3],[.2,base+.3],[side*2+.2,level-.83],[side*2-.2,level-.83]])verts.push([x+dx*u-dz*face*.22,y,z+dz*u+dx*face*.22]);for(const f of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]])quad(b,...f.map(i=>verts[i]),'#82918e');}
   }
  }

  for(const [x,z] of [a,c]){const base=height(x,z)-.3;box(bucket(x,z),x,(base+level-.85)/2,z,1.7,Math.max(.3,level-.85-base),5,'#a3a69b',angle);}
 }
 function railRibbon(rail,points,width,colour,lift){const [a,c]=points,len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<.001)return;const nx=-(c[1]-a[1])/len*width/2,nz=(c[0]-a[0])/len*width/2,ya=railHeight(rail,...a)+lift,yc=railHeight(rail,...c)+lift;quad(bucket(...a),[a[0]+nx,ya,a[1]+nz],[a[0]-nx,ya,a[1]-nz],[c[0]-nx,yc,c[1]-nz],[c[0]+nx,yc,c[1]+nz],colour);}

 const nearRoad=(x,z)=>roadSegments.some(([a,c,w])=>{const dx=c[0]-a[0],dz=c[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<w/2+1;});
 // Metre-gauge Gråkallbanen rails follow actual OSM centre lines, including switches.
 for(const rail of data.rails||[]){let nextPole=0,travel=0;for(let i=0;i<rail.p.length-1;i++){const a=rail.p[i],c=rail.p[i+1],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<.01)continue;const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;railSegments.push([a,c,3.2]);
  for(let d=0;d<len;d+=1.7){const e=Math.min(len,d+1.7),x=a[0]+dx*d,z=a[1]+dz*d,xx=a[0]+dx*e,zz=a[1]+dz*e;if(rail.bridge||!nearRoad(x,z)){railRibbon(rail,[[x,z],[xx,zz]],2.6,'#a4a39a',.30);box(bucket(x,z),x,railHeight(rail,x,z)+.355,z,2,.11,.19,'#706456',Math.atan2(dx,dz));}
   // Embankment under raised approaches, so sleepers never float above the DTM.
   if(!rail.bridge&&!nearRoad(x,z)&&railHeight(rail,x,z)-height(x,z)>.2)for(const side of [-1,1]){const ox=-dz*side,oz=dx*side;quad(bucket(x,z),[x+ox*1.3,railHeight(rail,x,z)+.3,z+oz*1.3],[xx+ox*1.3,railHeight(rail,xx,zz)+.3,zz+oz*1.3],[xx+ox*2.4,height(xx+ox*2.4,zz+oz*2.4),zz+oz*2.4],[x+ox*2.4,height(x+ox*2.4,z+oz*2.4),z+oz*2.4],'#808b72');}
   for(const s of [-1,1]){const offset=s*(rail.gauge||1)/2;railRibbon(rail,[[x-dz*offset,z+dx*offset],[xx-dz*offset,zz+dx*offset]],.095,'#b4bcc0',.495);}
  }
  // The main line gets regularly spaced support poles. Yard spurs keep wires only.
  const yard=a[0]>1450&&a[0]<1660&&a[1]>170&&a[1]<290;
  while(nextPole<=travel+len){const d=nextPole-travel;if(d>=0&&!yard&&!rail.bridge){const x=a[0]+dx*d-dz*2.5,z=a[1]+dz*d+dx*2.5,y=railHeight(rail,x,z),b=bucket(x,z);box(b,x,y+3.8,z,.16,7.6,.16,'#6b7779');box(b,x+dz*1.3,y+6.55,z-dx*1.3,2.9,.075,.075,'#5e696c',Math.atan2(dx,dz));}nextPole+=38;}
  travel+=len;wires.push(a[0],railHeight(rail,...a)+6.5,a[1],c[0],railHeight(rail,...c)+6.5,c[1]);
 }}
 roadSegments.push(...railSegments); // Prevent trees sprouting in the tracks.
 // Munkvoll crossing: photo-observed clearance bar, signal posts and crossbucks.
 for(const [x,z] of [[1583,202],[1591,181]]){const y=height(x,z),b=bucket(x,z);box(b,x,y+2.1,z,.13,4.2,.13,'#acb7b4');box(b,x,y+2.2,z,.42,.65,.18,'#354143');for(const s of [-1,1]){const a=[x-.58,y+3.4-s*.36,z+.1],c=[x+.58,y+3.4+s*.36,z+.1];quad(b,[a[0],a[1]-.075,a[2]],[c[0],c[1]-.075,c[2]],[c[0],c[1]+.075,c[2]],[a[0],a[1]+.075,a[2]],'#eee9da');}box(b,x,y+2.35,z+.12,.19,.19,.025,'#ad5550');}
 {const x=1582,z=211,y=height(x,z),b=bucket(x,z);for(const xx of [x-4.5,x+4.5])box(b,xx,y+3.4,z,.16,6.8,.16,'#a2b0b0');box(b,x,y+6.7,z,9,.19,.19,'#a2b0b0');for(let j=0;j<14;j++)box(b,x-3.5+j*.5,y+5.35,z,.5,.32,.16,j%2?'#e8b246':'#303a3e');}
 const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(wires,3));const wire=new T.LineSegments(wg,new T.LineBasicMaterial({color:'#59686b'}));wire.name='Tram overhead wires';scene.add(wire);
 const busRoads=streetSegments(data.roads);
 for(const stop of data.stops||[]){
  if(stop.tram){const [x,z]=stop.p,y=height(x,z),b=bucket(x,z);box(b,x+.6,y+1.8,z+2.2,.075,3.6,.075,'#c5cdca');box(b,x+.6,y+3.25,z+2.2,.66,.68,.075,'#194d5f');ribbon([[x-9,z+2.2],[x+9,z-2.6]],1.6,'#9baba5',.50);continue;}
  const f=placeBusStop(stop,busRoads);if(!f)continue;
  const y=Math.max(...f.footprint.map(p=>height(...p))),b=bucket(f.x,f.z);
  const part=(u,h,v,w,t,d,c)=>{const [x,z]=f.point(u,v);box(b,x,y+h,z,w,t,d,c,f.angle);};
  const vertex=(u,h,v)=>{const [x,z]=f.point(u,v);return [x,y+h,z];};
  // Visual stops: the long side follows the road; the opening faces the kerb.
  part(0,.15,0,3.8,.25,1.8,'#a8b0a8');
  for(const u of [-1.6,1.6])part(u,1.35,.6,.08,2.4,.08,'#374746');
  part(0,2.58,0,3.6,.14,1.75,'#3c4c4b');part(0,.62,.45,2.8,.14,.45,'#866d52');
  quad(b,vertex(-1.6,.3,.65),vertex(1.6,.3,.65),vertex(1.6,2.48,.65),vertex(-1.6,2.48,.65),'#9fb6b3');
  part(-2.15,1.8,0,.075,3.6,.075,'#c5cdca');part(-2.15,3.25,0,.66,.68,.075,'#245a97');
  part(-2.15,3.27,-.048,.49,.47,.025,'#f4f2df');part(-2.15,3.3,-.065,.31,.22,.015,'#263d4b');
  for(const u of [-2.26,-2.04])part(u,3.12,-.075,.065,.07,.02,'#263d4b');
 }
}
