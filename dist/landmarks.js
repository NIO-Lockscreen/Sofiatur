// Photo-led landmark geometry. Footprints are from OSM; dimensions are visual estimates.
// See docs/building-references.md for observations and limits.
export function addLandmark({T,scene,building,height,bucket,tri,quad,box}){
 const id=String(building.id);if(!['187113250','1037053935','645815923'].includes(id))return null;
 const p=building.p.slice(0,-1),cx=p.reduce((s,v)=>s+v[0],0)/p.length,cz=p.reduce((s,v)=>s+v[1],0)/p.length,b=bucket(cx,cz);
 const timber=id==='645815923'?'#875b3d':'#39261f';
 const bounds=[Math.min(...p.map(v=>v[0]))-3,Math.min(...p.map(v=>v[1]))-3,Math.max(...p.map(v=>v[0]))+3,Math.max(...p.map(v=>v[1]))+3];
 function beam(a,c,width,colour){const g=new T.CylinderGeometry(width/2,width/2,new T.Vector3(...a).distanceTo(new T.Vector3(...c)),4);const m=new T.Matrix4();const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...c).sub(new T.Vector3(...a)).normalize());m.compose(new T.Vector3(...a).add(new T.Vector3(...c)).multiplyScalar(.5),q,new T.Vector3(1,1,1));g.applyMatrix4(m);const v=g.attributes.position,ix=g.index;for(let i=0;i<ix.count;i+=3)tri(b,...[0,1,2].map(k=>[v.getX(ix.getX(i+k)),v.getY(ix.getX(i+k)),v.getZ(ix.getX(i+k))]),colour);g.dispose();}
 function edge(a,c){const len=Math.hypot(c[0]-a[0],c[1]-a[1]),dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;let nx=-dz,nz=dx;if(nx*((a[0]+c[0])/2-cx)+nz*((a[1]+c[1])/2-cz)<0){nx=-nx;nz=-nz;}return {len,dx,dz,nx,nz,v:(d,y,o=0)=>[a[0]+dx*d+nx*o,y,a[1]+dz*d+nz*o]};}
 function panel(e,d,y,w,h,colour,o=.07){quad(b,e.v(d-w/2,y,o),e.v(d+w/2,y,o),e.v(d+w/2,y+h,o),e.v(d-w/2,y+h,o),colour);}
 function window(e,d,y,w,h,frame='#e9e8db',mullion=true){panel(e,d,y,w,h,frame,.075);panel(e,d,y+.1,w-.2,h-.2,'#496770',.09);if(mullion){panel(e,d,y+.09,.07,h-.18,frame,.105);panel(e,d,y+h*.5,w-.14,.065,frame,.105);}}
 function walls(y,h,clad=timber){for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],e=edge(a,c);quad(b,[a[0],Math.min(height(...a)-.2,y),a[1]],[c[0],Math.min(height(...c)-.2,y),c[1]],[c[0],y,c[1]],[a[0],y,a[1]],'#88897e');quad(b,e.v(0,y),e.v(e.len,y),e.v(e.len,y+h),e.v(0,y+h),clad);for(let d=.2;d<e.len;d+=.25)panel(e,d,y,.028,h,id==='645815923'?'#7b624a':'#291e19',.035);}}
 function flat(poly,y,colour){for(const f of T.ShapeUtils.triangulateShape(poly.map(v=>new T.Vector2(...v)),[]))tri(b,...f.map(i=>[poly[i][0],y,poly[i][1]]),colour);}
 function sign(text,at,normal,width,h){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=timber;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#faf7e8';ctx.font='bold 66px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64,1000);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const s=new T.Mesh(new T.PlaneGeometry(width,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}));s.name=text;s.position.set(...at);s.rotation.y=Math.atan2(...normal);scene.add(s);}
 if(id==='645815923'){
  const y=height(1830,241)+.25,h=3.25;walls(y,h);flat(p,y+h,'#646c6c');
  // Photo: lower wings plus a two-storey eastern block, not a uniform tall box.
  const upper=[];for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],sa=a[0]-1826.5,sc=c[0]-1826.5;if(sa>=0)upper.push(a);if((sa>=0)!==(sc>=0)){const t=sa/(sa-sc);upper.push([1826.5,a[1]+(c[1]-a[1])*t]);}}
  flat(upper,y+6.65,'#697274');
  for(let i=0;i<upper.length;i++){const e=edge(upper[i],upper[(i+1)%upper.length]);quad(b,e.v(0,y+h),e.v(e.len,y+h),e.v(e.len,y+6.65),e.v(0,y+6.65),'#9a8170');for(let d=.08;d<e.len;d+=.13)panel(e,d,y+h,.027,3.4,['#756a60','#aa9380','#806c59'][Math.floor(d*100)%3],.035);beam(e.v(0,y+6.65),e.v(e.len,y+6.65),.12,'#737f83');if(e.len>4)for(let d=1.35;d<e.len-1;d+=2.9){window(e,d,y+3.8,2.05,2.02,'#353f42',false);beam(e.v(d-1.1,y+5.89,.12),e.v(d+1.1,y+5.89,.12),.08,'#a9b3b0');}}
  for(let i=0;i<p.length;i++){const e=edge(p[i],p[(i+1)%p.length]);beam(e.v(0,y+h),e.v(e.len,y+h),.16,'#747c7b');if(e.len<5)continue;
   for(let d=1.7;d<e.len-1;d+=4.1){window(e,d,y+1.4,1.8,.7,'#555c54',false);}
   if(e.nx>.6||e.nz>.6){panel(e,e.len*.62,y+.12,1.18,2.18,'#3d4947',.12);panel(e,e.len*.62,y+.4,.85,1.75,'#263b3d',.14);}
   // Photo shows a continuous low porch on the playground-facing south and west facades.
   if(e.nz>.35||e.nx<-.7||e.nx>.6){const depth=2.2;quad(b,e.v(0,y+3.08,-.08),e.v(e.len,y+3.08,-.08),e.v(e.len,y+2.86,depth),e.v(0,y+2.86,depth),'#969f9b');beam(e.v(0,y+2.80,depth),e.v(e.len,y+2.80,depth),.24,'#a18863');quad(b,e.v(0,y+.25),e.v(e.len,y+.25),e.v(e.len,y+.25,depth+.25),e.v(0,y+.25,depth+.25),'#a29a84');for(let d=.3;d<e.len;d+=3.3){beam(e.v(d,y+.12,depth-.1),e.v(d,y+2.94,depth-.1),.23,'#b79565');beam(e.v(d,y+2.87,-.02),e.v(d,y+2.66,depth),.15,'#b69a70');}for(let step=0;step<3;step++){const yy=y+.20-step*.09,o=depth+.25+step*.27;quad(b,e.v(0,yy,o),e.v(e.len,yy,o),e.v(e.len,yy,o+.28),e.v(0,yy,o+.28),'#a6a294');beam(e.v(0,yy,o),e.v(e.len,yy,o),.06,'#777e75');}beam(e.v(e.len-.2,y+.1,depth+.05),e.v(e.len-.2,y+2.86,depth+.05),.09,'#cbd0c8');}
  }
  // Name on the eastern gable, observed in the council's facade photograph.
  const e=edge(p[4],p[5]);sign('SKJERMVEGEN BARNEHAGE',e.v(e.len/2,y+6.22,.11),[e.nx,e.nz],8,.52);
  return {bounds};
 }
 const garage=id==='1037053935';const y=garage?height(-3.71,-12.21)+.15:height(-7,-3)+.12,h=garage?2.65:2.95;
 walls(y,h);
 // Both street-facing gables face west; the old generic garage ridge was rotated 90 degrees.
 const origin=garage?[-3.71,-12.21]:[-5.79,2.62],u=[.942,-.336],v=[.336,.942],width=garage?10.12:9.2,length=garage?7:15.84,rise=garage?2.15:3.25;
 const pt=(x,z,yy)=>[origin[0]+u[0]*x+v[0]*z,yy,origin[1]+u[1]*x+v[1]*z];
 for(const z of [0,width]){quad(b,pt(-.35,z===0?-.35:width+.35,y+h-.10),pt(length+.35,z===0?-.35:width+.35,y+h-.10),pt(length+.35,width/2,y+h+rise),pt(-.35,width/2,y+h+rise),'#303537');}
 for(const x of [0,length]){tri(b,pt(x,0,y+h),pt(x,width,y+h),pt(x,width/2,y+h+rise),timber);for(const z of [0,width])beam(pt(x-.05,z,y+h),pt(x-.05,width/2,y+h+rise),.16,'#f0eee4');}
 // Parallel roof tile courses, no downloaded photo textures.
 for(let z=.4;z<width;z+=.55){const yy=y+h+rise*(1-Math.abs(z-width/2)/(width/2))+.035;beam(pt(-.2,z,yy),pt(length+.2,z,yy),.035,'#44494a');}
 const front=edge([origin[0],origin[1]],[origin[0]+v[0]*width,origin[1]+v[1]*width]);
 if(garage){
  panel(front,4,y+.04,5.8,2.35,'#e9e6db',.09);panel(front,4,y+.08,5.4,2.13,'#93683e',.11);for(let yy=.35;yy<2.1;yy+=.25)panel(front,4,y+yy,5.38,.027,'#b68a55',.13);
  panel(front,8.4,y+.04,1.45,2.32,'#efede3',.09);panel(front,8.4,y+.10,1.18,2.12,'#28251e',.11);
  // Apron slopes towards the existing driveway; no window above the garage door.
  const a=front.v(0,y+.015),c=front.v(width,y+.015),d=front.v(width,y+.015,6),e=front.v(0,y+.015,6);d[1]=height(d[0],d[2])+.16;e[1]=height(e[0],e[2])+.16;quad(b,a,c,d,e,'#737771');
 }else{
  window(front,width*.54,y+.12,4.2,2.38);window(front,width*.54,y+3.22,1.3,1.4,'#eeeade',false);
  // Timber balcony across the exposed west gable and its corner support posts.
  quad(b,front.v(.4,y+2.68),front.v(width-.4,y+2.68),front.v(width-.4,y+2.68,1.15),front.v(.4,y+2.68,1.15),'#61402d');panel(front,width/2,y+2.68,width-.8,.95,'#784a34',1.16);for(let d=.5;d<width-.4;d+=.3)panel(front,d,y+2.7,.035,.91,'#4a3026',1.18);for(const d of [.45,width-.45])beam(front.v(d,y,1.1),front.v(d,y+2.68,1.1),.17,'#4a3028');
  // Low pitched porch roof above the front door, white bargeboards as in the user photo.
  const porch=[[-2.4,y+2.35,-1.1],[1.3,y+2.35,-2.42],[-.55,y+3.8,-1.76]];
  tri(b,...porch,timber);beam(porch[0],porch[2],.14,'#efede5');beam(porch[1],porch[2],.14,'#efede5');
  quad(b,porch[0],porch[2],[porch[2][0]+.6,y+3.8,porch[2][2]+1.6],[porch[0][0]+.6,y+2.35,porch[0][2]+1.6],'#34393b');
  quad(b,porch[1],porch[2],[porch[2][0]+.6,y+3.8,porch[2][2]+1.6],[porch[1][0]+.6,y+2.35,porch[1][2]+1.6],'#34393b');
  // Entrance porch faces the driveway between the house and the detached garage.
  const north=edge(p[0],p[1]);panel(north,north.len*.55,y+.1,1.05,2.12,'#e6e3d8',.12);panel(north,north.len*.55,y+.18,.84,1.94,'#513829',.14);
  for(let i=0;i<p.length;i++){const e=edge(p[i],p[(i+1)%p.length]);if(e.len>6&&e.nx>-.7)for(let d=2;d<e.len-1;d+=4)window(e,d,y+1.1,1.5,1.1);}
  const chimney=pt(10,width*.43,y+h+rise+.2);box(b,chimney[0],chimney[1],chimney[2],.65,1.75,.7,'#44464b');
 }
 return {bounds};
}


export function addLandmarkGround({height,bucket,quad,box,groundPoly,ribbon}){
 const b=bucket(0,0);
 // Connected asphalt apron, fitted to the real driveway and detached garage front.
 const yard=[[-21,-11],[-14,-13],[-3.8,-12.2],[-.25,-2.7],[-5.8,2.6],[-11,2],[-15,-2]];
 const ys=yard.map(([x,z],i)=>i===2?height(-3.71,-12.21)+.17:i===3?height(-3.71,-12.21)+.17:i===4?height(-7,-3)+.10:height(x,z)+.20);
 for(let i=1;i<yard.length-1;i++)quad(b,[yard[0][0],ys[0],yard[0][1]],[yard[i][0],ys[i],yard[i][1]],[yard[i+1][0],ys[i+1],yard[i+1][1]],[yard[0][0],ys[0],yard[0][1]],'#757972');
 // The curved dry-stone edge is on the planted, downhill side of the driveway.
 const wall=[[-20,-6],[-17,-3],[-14,-.2],[-11,2.3],[-8,4.3],[-5,5.5]];
 for(let i=0;i<wall.length-1;i++){const a=wall[i],c=wall[i+1],len=Math.hypot(c[0]-a[0],c[1]-a[1]),angle=Math.atan2(a[1]-c[1],c[0]-a[0]);for(let d=0;d<len;d+=1.25){const t=Math.min(1,(d+.6)/len),x=a[0]+(c[0]-a[0])*t,z=a[1]+(c[1]-a[1])*t,y=height(x,z);for(let row=0;row<2;row++)box(b,x,y+.2+row*.32,z,1.3,.30,.6,row?'#a4a59a':'#72776f',angle);}}
 // Mapped parking 1323632156 beside the access route; positions copied from OSM.
 groundPoly([[1811.7,307],[1814.5,329.6],[1829.8,327.4],[1826.8,305.1]],'#777e78',.2);
 for(let z=309;z<326;z+=2.5){const x=1812+(z-307)*.124;ribbon([[x,z],[x+4.8,z-.65]],.10,'#efeee2',.23);}
 // Paved margin around the photo-observed preschool porch.
 ribbon([[1805,246],[1812,255],[1828,252],[1846,248],[1855,244]],3,'#949b91',.15);
 // Paved entrance forecourt connects the corrected goal to the eastern porch.
 groundPoly([[1856,260],[1842,262],[1830,256],[1846,248],[1857,244],[1862,252]],'#858c86',.18);
 // Asphalt strip in front of the photo-observed garage doors, not a lawn.
 groundPoly([[1917,249],[1924,249],[1930,309],[1924,312]],'#777e79',.25);
}
