import {createRailProfiles,placeBusStop,streetSegments,segmentIndex} from './transit-geometry.js';
// Photo-led landmarks, original geometry only. See docs/munkvoll-references.md.
// The canvas keeps the sign's proportions, so short text on small plates (door numbers) is not squeezed thin.
// Text is one line, or several lines given as [text, colour, relative size]; bg null leaves the plate see-through.
export function drawSign(T,scene,text,at,normal,w,h,fg='#f2f0e5',bg='#2c3032',serif=false){
 const lines=Array.isArray(text)?text:[[text,fg,1]],c=document.createElement('canvas'),cw=Math.max(160,Math.min(1024,Math.round(160*w/h)));c.width=cw;c.height=160;const q=c.getContext('2d');
 if(bg){q.fillStyle=bg;q.fillRect(0,0,cw,160);}else q.clearRect(0,0,cw,160);
 const total=lines.reduce((sum,l)=>sum+(l[2]??1),0);let top=0;q.textAlign='center';q.textBaseline='middle';
 for(const [t,col,size=1] of lines){const band=160*size/total;q.fillStyle=col||fg;q.font=`bold ${Math.round(band*.656)}px ${serif?'Georgia':'sans-serif'}`;q.fillText(t,cw/2,top+band*.519,cw-39);top+=band;}
 const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide,transparent:!bg}));m.name=lines.map(l=>l[0]).join(' ');m.position.set(...at);m.rotation.y=Math.atan2(normal[0],normal[1]);scene.add(m);return m;}
// Round logos (solarium sun, sushi bar badge): a disc with a ring and a short word.
function drawDisc(T,scene,text,at,normal,r,fg,bg,ring=fg){
 const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d');q.clearRect(0,0,256,256);
 q.fillStyle=bg;q.beginPath();q.arc(128,128,124,0,Math.PI*2);q.fill();q.strokeStyle=ring;q.lineWidth=10;q.beginPath();q.arc(128,128,112,0,Math.PI*2);q.stroke();
 q.fillStyle=fg;q.font='bold 46px sans-serif';q.textAlign='center';q.textBaseline='middle';text.split('\n').forEach((t,i,all)=>q.fillText(t,128,128+(i-(all.length-1)/2)*50,200));
 const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(r*2,r*2),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide,transparent:true}));m.name=text.replace('\n',' ');m.position.set(...at);m.rotation.y=Math.atan2(normal[0],normal[1]);scene.add(m);return m;}

export function addMunkvoll({T,scene,building,height,bucket,quad,tri,box}){
 const id=String(building.id);if(!['89233421','89233428','89233446','186840391','186841224','186841235','186841226','186841234'].includes(id))return null;
 const p=building.p.slice(0,-1),cx=p.reduce((s,v)=>s+v[0],0)/p.length,cz=p.reduce((s,v)=>s+v[1],0)/p.length,b=bucket(cx,cz);
 const bounds=[Math.min(...p.map(v=>v[0]))-3,Math.min(...p.map(v=>v[1]))-3,Math.max(...p.map(v=>v[0]))+3,Math.max(...p.map(v=>v[1]))+3];
 const sign=(text,at,normal,w,h,fg,bg,serif)=>drawSign(T,scene,text,at,normal,w,h,fg,bg,serif);
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
  // Signs face out of the wall they hang on (near or far long side, near or far end), so the text reads the right way round.
  const out=(x,z,side)=>side==='long'?(z<d/2?[-v[0],-v[1]]:v):(x<w/2?[-u[0],-u[1]]:u);
  // White barge boards along both gable rakes, just proud of the gable wall.
  const fascia=col=>{if(hipped)return;for(const [x,o] of [[0,-.07],[w,.07]])for(const z of [-.22,d+.22])q([x+o,h-.1,z],[x+o,h+rise-.1,d/2],[x+o,h+rise+.16,d/2],[x+o,h+.16,z],col);};
  return {at,q,beam,panel,fascia,u,v,w,d,h,y,sign:(t,x,yy,z,ww,hh,side='long',fg,bg,serif)=>sign(t,at(x,yy,z),out(x,z,side),ww,hh,fg,bg,serif),disc:(t,x,yy,z,r,side,fg,bg,ring)=>drawDisc(T,scene,t,at(x,yy,z),out(x,z,side),r,fg,bg,ring)};
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
  // Grey-green vertical boards, dark tiled roofs and white barge boards (Statens vegvesen road images, July 2025).
  const wall='#8e9382',roof='#3d3733';
  const main=frame([1595.13,150.41],[.99,-.141],19.8,8.25,6.5,2.25,wall,roof);main.fascia('#ecebe4');
  for(const z of [-.045,8.30])for(const x of [2.7,7.3,12,16.8]){main.panel(x,3.85,z,1.5,1.35,'#efeee2');main.panel(x,3.95,z+(z<0?-.015:.015),1.32,1.15,'#68818a');}
  // Sunny Beach Solstudio: the big sign on the west gable faces the junction; a second sign and the door face Bøckmans veg.
  for(const z of [1.5,4.12,6.75])for(const yy of [.9,3.85]){main.panel(-.045,yy,z,1.2,1.3,'#efeee2','end');main.panel(-.06,yy+.1,z,1.02,1.1,'#68818a','end');}
  main.panel(-.045,6.95,4.12,.8,.75,'#efeee2','end');main.panel(-.06,7.03,4.12,.64,.59,'#68818a','end');
  for(const z of [1.5,4.12,6.75]){main.panel(-.075,.95,z,.96,1.04,'#f3f1e8','end');main.disc('',-.09,1.47,z,.3,'end','#f6c64f','#e0762c','#f3f1e8');}
  main.disc('SUNNY\nBEACH',-.09,3.05,.95,.55,'end','#fbe7a1','#d36a2a','#f7d56a');
  main.sign(['SUNNY BEACH','SOLSTUDIO'].map(t=>[t,'#e6d25f',1]),-.09,3.05,4.0,4.6,1.05,'end',undefined,'#4f5448');
  main.sign([['ÅPENT','#e6d25f',1],['07–23','#e6d25f',1],['ALLE DAGER','#e6d25f',.8]],-.09,3.05,7.35,1.2,1.05,'end',undefined,'#4f5448');
  main.sign(['SUNNY BEACH','SOLSTUDIO'].map(t=>[t,'#e6d25f',1]),8.4,3.05,-.09,4.6,.95,'long',undefined,'#4f5448');main.disc('SUNNY\nBEACH',11.3,3.05,-.09,.5,'long','#fbe7a1','#d36a2a','#f7d56a');
  main.panel(11.9,.35,-.05,1.2,2.25,'#e5e4dc');main.panel(11.9,.45,-.07,1.0,2.05,'#6e7f82');
  main.panel(18.3,.35,-.05,1.1,2.2,'#e5e4dc');main.panel(18.3,.45,-.07,.92,2.0,'#c9cbc4');main.sign([['Byåsen','#222',1],['Fotklinikk','#222',1]],19.2,2.3,-.09,.75,.45,'long',undefined,'#f4f4ef');
  for(const x of [3.2,6.2,14.3,16.3]){main.panel(x,.9,-.045,1.2,1.3,'#efeee2');main.panel(x,1.0,-.06,1.02,1.1,x===14.3?'#f3f1e8':'#68818a');}
  for(const x of [11.9,18.3]){const a=main.at(x,.18,-.75);box(b,...a,1.4,.36,1.3,'#6d716a',Math.atan2(-main.u[1],main.u[0]));}
  const wing=frame([1590.04,162.09],[.99,-.141],15.5,15.1,3.0,2.7,wall,roof);wing.fascia('#ecebe4');
  // Low south-facing gable dining wing; green awning above broad shop window.
  wing.panel(-.06,.7,7.55,10.0,1.65,'#f0eee3','end');wing.panel(-.08,.85,7.55,9.7,1.33,'#526d78','end');
  for(let z=3;z<12.2;z+=2)wing.panel(-.10,.78,z,.08,1.55,'#e2e5db','end');
  wing.q([-.1,2.5,2.3],[-.1,2.5,12.8],[-1.3,2.23,12.8],[-1.3,2.23,2.3],'#216b4b');
  wing.sign('palermo',-.11,3.95,7.55,9.7,1.25,'end','#232828',wall,true);
  const porch=frame([1607.31,172.85],[.99,-.141],11,4.5,2.8,1.0,wall,roof);
  for(const x of [2,4]){porch.panel(x,.8,4.54,1,1.5,'#ebece3');porch.panel(x,.9,4.56,.8,1.3,'#506870');}
  porch.panel(7.5,.1,4.55,1.4,2.3,'#ecebe1');porch.panel(7.5,.2,4.58,1.2,2.1,'#3c555d');porch.sign('palermo',7.3,3.62,4.6,4.2,.72,'long','#232828','#e3e3d8',true);
  porch.q([6,.05,8],[9,.05,8],[9,.6,4.5],[6,.6,4.5],'#9daba9');
 }else if(id==='186841226'){
  // Sabrura sushi: dark green boards, red-brown tiled gable roof, white frames; the badge gable faces the side road.
  const f=frame([1540.9,111.3],[14.2,-3.8],14.7,9.6,3.0,2.6,'#27352b','#74443a');f.fascia('#e9e8df');
  for(const z of [2.2,7.4]){f.panel(14.745,.8,z,1.5,1.3,'#ecebe3','end');f.panel(14.76,.9,z,1.3,1.1,'#3f5157','end');}
  f.panel(14.745,.05,4.8,1.25,2.25,'#ecebe3','end');f.panel(14.76,.12,4.8,1.05,2.1,'#51646a','end');
  f.disc('SABRURA',14.8,4.0,4.8,.62,'end','#f1efe6','#1d2320');f.sign('TAKEAWAY',14.8,3.22,4.8,1.6,.32,'end','#f1efe6','#27352b');
  for(const x of [3.2,6.2,9.2,12])for(const z of [-.045,9.645]){f.panel(x,.9,z,1.05,1.15,'#ecebe3');f.panel(x,1.0,z+(z<0?-.015:.015),.87,.95,'#3f5157');}
  box(b,...f.at(4,5.3,4.8),.55,1.4,.55,'#8a4a3a');
 }else if(id==='186841234'){
  // White two-storey corner house; Lille Szechuan's name is painted on the east gable facing the junction.
  const f=frame([1547.2,128.8],[9.7,-2.5],10.0,7.1,5.3,2.4,'#f1f0ea','#77412f');f.fascia('#f6f5f0');
  f.sign([['LILLE','#c0282d',1.25],['SZECHUAN','#c0282d',.7],['BYÅSEN','#1f2224',.9],['TAKE AWAY · CATERING','#6d6f70',.42]],10.07,3.05,3.55,3.3,2.05,'end',undefined,null);
  for(const x of [2,5,8])for(const yy of [.9,3.55]){f.panel(x,yy,7.145,1.05,1.2,'#ffffff');f.panel(x,yy+.1,7.16,.85,1.0,'#546a71');}
  for(const z of [1.8,5.3]){f.panel(10.045,.9,z,1.05,1.2,'#ffffff','end');f.panel(10.06,1.0,z,.85,1.0,'#546a71','end');}
  // Weathered timber balcony on the south side, upstairs.
  box(b,...f.at(3.2,2.72,7.85),3.8,.16,1.5,'#9a9285',Math.atan2(-f.u[1],f.u[0]));
  f.q([1.3,2.8,8.6],[5.1,2.8,8.6],[5.1,3.8,8.6],[1.3,3.8,8.6],'#8f877a');for(const x of [1.3,5.1])f.q([x,2.8,7.15],[x,2.8,8.6],[x,3.8,8.6],[x,3.8,7.15],'#8f877a');
  for(const x of [1.4,5])box(b,...f.at(x,1.36,8.5),.14,2.72,.14,'#9a9285');
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

 const roadIndex=segmentIndex(roadSegments),nearRoad=(x,z)=>[...roadIndex.near(x,z,5)].some(([a,c,w])=>{const dx=c[0]-a[0],dz=c[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<w/2+1;});
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
 // Vintage tram no. 29 waits in the yard north of the Boreal workshop door, on the spur up to the main line,
 // pulled back from the Selsbakkvegen crossing.
 const spur=(data.rails||[]).find(r=>r.id==='92540874');let tram=null;
 if(spur){const a=[1571.02,220.44],c=[1580.47,210.66],len=Math.hypot(c[0]-a[0],c[1]-a[1]),dir=[(c[0]-a[0])/len,(c[1]-a[1])/len],centre=[(a[0]+c[0])/2-dir[0]*2.5,(a[1]+c[1])/2-dir[1]*2.5];tram={centre,dir,base:railHeight(spur,...centre)+.5};addVintageTram({T,scene,bucket,quad,box,...tram});}
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
 return {tram};
}

// Trondheim tram no. 29 as kept by the tram museum: cream-yellow body, blue window band and lining,
// beige roof, roof searchlight and a pantograph up to the wire. Stylised from the user's photograph.
export function addVintageTram({T,scene,bucket,quad,box,centre,dir,base}){
 const [cx,cz]=centre,len=13.4,wid=2.3,b=bucket(cx,cz),angle=Math.atan2(-dir[1],dir[0]),n=[-dir[1],dir[0]];
 // s runs along the car (front at +len/2), t across it (+ is the door side), y is height above the rail top.
 const at=(s,y,t)=>[cx+dir[0]*s+n[0]*t,base+y,cz+dir[1]*s+n[1]*t];
 const part=(s,y,t,l,h,w,c)=>box(b,...at(s,y,t),l,h,w,c,angle);
 const side=(s0,s1,y0,y1,t,c)=>quad(b,at(s0,y0,t),at(s1,y0,t),at(s1,y1,t),at(s0,y1,t),c);
 const end=(s,t0,t1,y0,y1,c)=>quad(b,at(s,y0,t0),at(s,y0,t1),at(s,y1,t1),at(s,y1,t0),c);
 const bar=(s0,y0,s1,y1,t,c)=>quad(b,at(s0,y0-.035,t),at(s1,y1-.035,t),at(s1,y1+.035,t),at(s0,y0+.035,t),c);
 const Y='#ffe36b',B='#2f86c8',R='#b49d78',G='#22323b',K='#26292b';
 for(const s of [-4.3,4.3]){part(s,.45,0,2.4,.42,1.9,K);for(const w of [-.72,.72])for(const t of [-.5,.5])part(s+w,.33,t,.66,.66,.1,'#3b3f41');}
 part(0,.86,0,12.4,.3,2.0,K);for(const s of [-len/2-.15,len/2+.15])part(s,.95,0,.3,.22,.35,K);
 part(0,1.62,0,len,1.25,wid,Y);part(0,1.06,0,len+.02,.07,wid+.03,B);part(0,2.24,0,len+.02,.1,wid+.03,B);
 part(0,2.84,0,len,1.1,wid-.04,B);
 part(0,3.47,0,len-.08,.18,wid-.06,R);part(0,3.6,0,len-.3,.12,wid-.5,R);part(0,3.69,0,len-.7,.08,wid-1.1,R);
 for(const t of [-wid/2-.012,wid/2+.012]){
  for(let s=-5.7;s<=5.9;s+=1.3){if(t>0&&s>3.2&&s<5.6)continue;side(s-.5,s+.5,2.42,3.2,t,G);}
  side(-6.55,6.55,1.12,1.16,t,B);
 }
 // Double door behind the front cab: yellow leaves, tall narrow round-topped windows.
 const T0=wid/2+.02;side(3.65,5.25,.95,3.25,T0,'#e7d27f');for(const s of [3.85,4.2,4.7,5.05])side(s-.13,s+.13,1.45,3.1,T0+.005,G);side(4.43,4.47,.95,3.25,T0+.006,K);
 // Ends: windscreen, destination box, headlamp, route number.
 for(const e of [1,-1]){const s=e*(len/2+.012);
  end(s,-.95,.95,2.42,3.12,G);end(s,-.03,.03,2.42,3.12,B);part(e*(len/2+.02),1.55,0,.06,.24,.24,'#f4f1dc');
  const sg=drawSign(T,scene,'CHARTERVOGN',at(e*(len/2+.03),3.28,0),[dir[0]*e,dir[1]*e],1.45,.24,'#1f2326','#f1f0e8');sg.name='Tram destination';
  drawSign(T,scene,'29',at(e*(len/2+.03),1.62,.62),[dir[0]*e,dir[1]*e],.42,.36,B,null);}
 for(const e of [1,-1])drawSign(T,scene,'29',at(-3.2,1.6,e*(wid/2+.03)),[n[0]*e,n[1]*e],.42,.36,B,null);
 // Roof searchlight over the front and the pantograph near the rear, up to the contact wire.
 part(len/2-1.1,3.9,0,.5,.34,.5,'#c7cbcb');part(len/2-.84,3.9,0,.04,.42,.42,'#f6f4e2');
 part(-2.4,3.8,0,1.2,.1,1.5,'#3a3e40');for(const t of [-.45,.45]){bar(-3.3,3.82,-1.9,5.05,t,'#3a3e40');bar(-1.9,5.05,-2.9,5.86,t,'#3a3e40');}
 part(-2.9,5.88,0,.12,.07,1.8,'#3a3e40');
}

// Details on footprints that otherwise use the generic builder with photo-matched styles
// (dist/junction-observations.js): Byåsen skole's name and red stair screens, and the Boreal workshop's door and sign.
// A wall of a mapped footprint, found by a point near its middle, on the base and height the generic builder used.
export function createFacades({data,wallBase,bucket,quad}){
 return function wall(id,near){const building=data.buildings.find(x=>String(x.id)===id),base=wallBase.get(id);if(!building||!base)return null;const p=building.p.slice(0,-1),{y,h}=base;
  let best=null;for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<2)continue;const d=Math.hypot((a[0]+c[0])/2-near[0],(a[1]+c[1])/2-near[1]);if(!best||d<best.d)best={a,c,len,d};}
  const {a,c,len}=best,dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;
  let nx=-dz,nz=dx;const mx=(a[0]+c[0])/2,mz=(a[1]+c[1])/2;if(insidePolygon(p,mx+nx*.4,mz+nz*.4)){nx=-nx;nz=-nz;}
  const at=(d,yy,o)=>[a[0]+dx*d+nx*o,y+yy,a[1]+dz*d+nz*o];
  return {len,y,h,at,normal:[nx,nz],angle:Math.atan2(-dz,dx),b:bucket(mx,mz),panel:(d,yy,w,h,col,o)=>quad(bucket(mx,mz),at(d-w/2,yy,o),at(d+w/2,yy,o),at(d+w/2,yy+h,o),at(d-w/2,yy+h,o),col)};};
}
export function addMunkvollDetails({T,scene,data,wallBase,bucket,quad,box}){
 const wall=createFacades({data,wallBase,bucket,quad});
 // Byåsen skole: silver name and coat of arms high on the south wall, red corrugated screens at the west stair tower.
 const south=wall('89233532',[1692.9,100.3]);
 if(south){const top=south.h-.62;drawSign(T,scene,'BYÅSEN SKOLE',south.at(5.2,top,.14),south.normal,3.9,.46,'#e3e6e5',null);south.panel(2.75,top-.27,.34,.46,'#f1f2ee',.12);south.panel(2.75,top-.23,.26,.3,'#3d6fb3',.13);}
 const tower=wall('89233532',[1677.4,94.5]);
 if(tower)for(const d of [2.1,6.9]){const hh=tower.h-.2,[x,yy,z]=tower.at(d,.3+hh/2,.95);box(tower.b,x,yy,z,2.4,hh,.08,'#a3281f',tower.angle);for(let k=-1.1;k<=1.1;k+=.2)tower.panel(d+k,.35,.05,hh-.1,'#861f19',1.0);}
 // Boreal Bane's workshop: concrete pilasters, tall dark door and the dark sign board above it, on the east wall.
 const door=wall('89233524',[1559.5,245]);
 if(door){const m=door.len/2;for(const k of [-1,1]){const [x,yy,z]=door.at(m+k*3.85,(door.h+.3)/2,.3);box(door.b,x,yy,z,1.1,door.h+.3,.6,'#b3b0a6',door.angle);}
  door.panel(m,.5,6.4,5.3,'#33393b',.25);door.panel(m,.5,.07,5.3,'#8a9294',.27);for(const yy of [2.85,3.55])door.panel(m,yy,6.3,.55,'#8fa2a6',.27);
  drawSign(T,scene,[['BOREAL','#d9322e',1.25],['Lakk- og karosseriverksted','#ecebe6',.55],['GråkallBanen','#ecebe6',.5]],door.at(m,door.h-1.25,.28),door.normal,6.4,2.2,undefined,'#2d3234');}
}
function insidePolygon(poly,x,z){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [ax,az]=poly[j],[bx,bz]=poly[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;}return inside;}
