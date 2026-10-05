// Original, lightweight ET5 sedan mesh. Proportions and details reference NIO's
// Norwegian ET5 imagery (2022–25 sedan), not the Touring or newer China facelift.
// The cyan glow under each folded wheel in hover mode (5 October 2026; also the fire engine's, rides.js): one soft round plane a wheel (additive, no depth write), shown by show(h, time).
export function hoverGlow(T,count,size){const N=32,px=new Uint8Array(N*N*4); // a soft round glow, made pixel by pixel (no canvas needed)
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const r=Math.min(1,Math.hypot(x-N/2+.5,y-N/2+.5)/(N/2)),i=(y*N+x)*4;px[i]=120-90*r;px[i+1]=235-65*r;px[i+2]=255;px[i+3]=255*Math.pow(1-r,1.6);}
 const tx=new T.DataTexture(px,N,N),group=new T.Group();tx.colorSpace=T.SRGBColorSpace;tx.magFilter=tx.minFilter=T.LinearFilter;tx.needsUpdate=true;group.visible=false;
 const discs=Array.from({length:count},()=>{const d=new T.Mesh(new T.PlaneGeometry(size,size),new T.MeshBasicMaterial({map:tx,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));d.rotation.x=-Math.PI/2;d.renderOrder=3;group.add(d);return d;});
 return {group,discs,show(h,time){group.visible=h>.01;discs.forEach((d,i)=>{d.material.opacity=h*(.8+.12*Math.sin(time*31+i*1.7)+.06*Math.sin(time*17));});}};}
export function createET5(T){
 const car=new T.Group();car.name='NIO ET5 · Deep Black';const wheels=[],hinges=[];
 const paint=new T.MeshPhysicalMaterial({color:'#14171c',metalness:.72,roughness:.24,clearcoat:1,clearcoatRoughness:.16});
 const glass=new T.MeshPhysicalMaterial({color:'#14262d',metalness:.42,roughness:.16,clearcoat:1});
 const rubber=new T.MeshStandardMaterial({color:'#15191c',roughness:.88});
 const trim=new T.MeshStandardMaterial({color:'#343b40',metalness:.55,roughness:.34});
 const silver=new T.MeshStandardMaterial({color:'#bfcbd0',metalness:.8,roughness:.24});
 const white=new T.MeshBasicMaterial({color:'#eefaff'}),red=new T.MeshBasicMaterial({color:'#ff433f'});
 function mesh(g,m,x=0,y=0,z=0,parent=car){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,m,x,y,z,parent=car){return mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent);}
 function line(points,r,m,parent=car){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(8,points.length*5),r,5,false),m,0,0,0,parent);}
 function skin(rows,m){const p=[],ix=[];const n=rows[0].length;for(const row of rows)for(const v of row)p.push(...v);for(let j=0;j<rows.length-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i;ix.push(a,a+n,a+1,a+1,a+n,a+n+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();const o=mesh(g,m);o.material.side=T.DoubleSide;return o;}
 const stations=[[-2.395,.71,.66],[-2.27,.87,.78],[-1.96,.956,.87],[-1.44,.98,.94],[-.85,.965,.96],[0,.95,.955],[1.1,.979,.97],[1.62,.96,.94],[2.12,.92,.92],[2.395,.78,.82]];
 function profile(z){let i=0;while(i<stations.length-2&&z>stations[i+1][0])i++;const a=stations[i],b=stations[i+1],t=(z-a[0])/(b[0]-a[0]);return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
 // Curved shoulder and bonnet, with actual open wheel arches instead of cubes
 // covering the upper half of each tyre.
 const body=[];for(let j=0;j<=120;j++){const z=-2.395+j*4.79/120,[w,h]=profile(z);let bottom=.22;for(const axle of [-1.444,1.444]){const d=Math.abs(z-axle);if(d<.44)bottom=Math.max(bottom,.355+Math.sqrt(.44*.44-d*d));}
 const left=[[-w*.78,.22,z],[-w*.99,bottom,z],[-w,Math.max(bottom,h-.19),z],[-w*.96,Math.max(bottom,h-.07),z],[-w*.83,h+.005,z],[-w*.5,h+.027,z],[0,h+.042,z]];
 body.push([...left,...left.slice(0,-1).reverse().map(([x,y,z])=>[-x,y,z])]);}skin(body,paint);
 for(const end of [-2.395,2.395]){const [w,h]=profile(end);skin([Array.from({length:17},(_,i)=>[-w+i*w/8,.25,end]),Array.from({length:17},(_,i)=>[-w+i*w/8,h+.042-Math.pow((i-8)/8,2)*.04,end])],paint);}
 // Panoramic glass cabin: arched windscreen, rounded roof and sloping rear screen.
 const cabin=[[-1.30,.81,.971],[-1.11,.785,1.095],[-.75,.73,1.36],[-.48,.698,1.445],[0,.70,1.472],[.57,.706,1.44],[.86,.72,1.34],[1.22,.77,1.12],[1.66,.83,.99]];
 const roof=cabin.map(([z,w,y])=>Array.from({length:17},(_,i)=>{const u=(i-8)/8;return [u*w,y-.11*u*u,z];}));skin(roof,glass);
 for(const side of [-1,1]){
  const rows=cabin.map(([z,w,y])=>[[side*w,y-.11,z],[side*(.84+Math.sin((z+1.3)/3*Math.PI)*.025),.965,z]]);skin(rows,glass);
  // Narrow silver window surround, black B-pillar and painted roof rails.
  line(cabin.map(([z,w,y])=>[side*w,y-.10,z]),.017,silver);
  line([[-1.30,.81],[.2,.86],[1.38,.83],[1.66,.83]].map(([z,w])=>[side*w,.974,z]),.012,silver);
  line([[side*.867,.976,.13],[side*.706,1.451,.13]],.032,trim);
  line(cabin.slice(1,-1).map(([z,w,y])=>[side*(w-.022),y-.087,z]),.027,paint);
  for(const z of [-.18,1.05]){box(.018,.035,.19,trim,side*.964,.872,z);box(.025,.012,.14,silver,side*.977,.877,z);}
  // Door seams and long, slim sill; front/rear doors remain visible in black paint.
  for(const z of [.18,1.20])line([[side*.965,.87,z],[side*.95,.62,z-.025],[side*.93,.3,z-.06]],.006,trim);
  line([[side*.91,.28,-1.0],[side*.955,.27,0],[side*.925,.28,1.04]],.034,trim);
  const mirror=mesh(new T.SphereGeometry(1,16,8),paint,side*1.043,1.05,-.88);mirror.scale.set(.17,.065,.14);box(.14,.025,.055,trim,side*.946,1.024,-.88);
  const mirrorGlass=mesh(new T.SphereGeometry(1,12,6),silver,side*1.05,1.054,-.785);mirrorGlass.scale.set(.115,.037,.008);
  // Narrow double-dash DRL, separate lower lamp and the signature air-curtain slit.
  line([[side*.34,.825,-2.29],[side*.59,.854,-2.25],[side*.86,.867,-2.08]],.019,white);
  line([[side*.56,.798,-2.284],[side*.76,.827,-2.184]],.009,white);
  box(.16,.12,.07,rubber,side*.80,.57,-2.26);box(.12,.028,.076,white,side*.80,.595,-2.267);
  line([[side*.89,.72,-2.15],[side*.86,.43,-2.21],[side*.69,.36,-2.27]],.034,trim);
  // Split Y-spoke wheels, dark pockets, red brake calipers and raised tyre lip.
  // Each wheel hangs on a hinge group (5 October 2026), which the hover mode folds flat under the car; the wheel inside it still rolls.
   for(const z of [-1.444,1.444]){const hinge=new T.Group();hinge.position.set(side*.916,.355,z);hinge.userData.side=side;car.add(hinge);const wheel=new T.Group();hinge.add(wheel);wheels.push(wheel);hinges.push(hinge);
   const tire=mesh(new T.CylinderGeometry(.355,.355,.235,40),rubber,0,0,0,wheel);tire.rotation.z=Math.PI/2;
   const disc=mesh(new T.CylinderGeometry(.254,.254,.242,32),trim,0,0,0,wheel);disc.rotation.z=Math.PI/2;
   const rim=mesh(new T.TorusGeometry(.276,.014,6,40),silver,side*.123,0,0,wheel);rim.rotation.y=Math.PI/2;
   const brake=mesh(new T.CylinderGeometry(.223,.223,.01,24),silver,side*.112,0,0,wheel);brake.rotation.z=Math.PI/2;
   box(.028,.12,.065,red,side*.124,.015,.21,wheel);
   for(let k=0;k<5;k++)for(const fork of [-1,1]){const a=k*Math.PI*2/5,b=a+fork*.18;line([[side*.132,Math.sin(a)*.06,Math.cos(a)*.06],[side*.135,Math.sin(a+fork*.06)*.15,Math.cos(a+fork*.06)*.15],[side*.132,Math.sin(b)*.27,Math.cos(b)*.27]],.015,silver,wheel);}
   const hub=mesh(new T.CylinderGeometry(.058,.058,.274,20),trim,0,0,0,wheel);hub.rotation.z=Math.PI/2;
   // Arch lip sits on the body, does not rotate with the tyre.
   const arc=Array.from({length:21},(_,i)=>{const a=i/20*Math.PI;return [side*.973,.355+Math.sin(a)*.437,z+Math.cos(a)*.437];});line(arc,.017,paint);
  }
 }
 // Black sensor trio above the windscreen and discreet shark-fin antenna.
 for(const x of [-.54,0,.54]){const s=mesh(new T.SphereGeometry(1,16,8),paint,x,1.44,-.53);s.scale.set(x===0?.12:.065,.068,.13);box(x===0?.17:.08,.027,.015,glass,x,1.466,-.646);}
 const fin=mesh(new T.ConeGeometry(.055,.115,4),paint,0,1.45,.68);fin.scale.z=1.7;
 // A curved light ribbon follows the rear shoulder; spoiler is an integral ducktail.
 line([[-.86,.836,2.15],[-.75,.848,2.347],[0,.87,2.405],[.75,.848,2.347],[.86,.836,2.15]],.017,red);
 line([[-.85,.967,2.11],[-.7,.985,2.22],[0,.996,2.25],[.7,.985,2.22],[.85,.967,2.11]],.025,paint);
 box(1.19,.12,.035,rubber,0,.365,-2.398);box(1.41,.13,.06,trim,0,.27,2.34);
 for(const x of [-.5,-.25,0,.25,.5])box(.024,.10,.21,rubber,x,.24,2.30);
 // The number plate has its own white background; the chrome badges sit straight on the paint, whatever its colour.
 function decal(text,w,h,x,y,z,front=false){const plate=text==='SOFIA',c=document.createElement('canvas');c.width=512;c.height=128;const q=c.getContext('2d');if(plate){q.fillStyle='#f0f2e9';q.fillRect(0,0,512,128);}else q.clearRect(0,0,512,128);q.fillStyle=plate?'#24333a':'#d8e1e4';q.font='500 68px sans-serif';q.textAlign='center';q.textBaseline='middle';q.fillText(text,256,67,470);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const o=mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide,transparent:!plate}),x,y,z);if(front)o.rotation.y=Math.PI;}
 decal('SOFIA',.53,.13,0,.58,2.401);decal('N I O',.33,.083,0,.764,2.403);decal('ET5',.11,.047,-.54,.70,2.40);decal('SOFIA',.53,.13,0,.52,-2.404,true);
 // Simple geometric NIO bonnet emblem.
 line([[-.04,.838,-2.20],[-.036,.857,-2.20],[0,.869,-2.20],[.036,.857,-2.20],[.04,.838,-2.20]],.006,silver);
 // Secret KIWI paint (unlocked by parking at KIWI Dalgård): the shop's logo on both front doors, hidden until chosen.
 const kiwi=[];{const c=document.createElement('canvas');c.width=512;c.height=160;const q=c.getContext('2d');q.clearRect(0,0,512,160);q.fillStyle='#1f2424';q.beginPath();q.roundRect?.(6,10,500,140,34);if(!q.roundRect)q.rect(6,10,500,140);q.fill();
  q.fillStyle='#8dc63f';q.font='900 104px Arial';q.textAlign='center';q.textBaseline='middle';q.fillText('KIWI',210,84);q.fillStyle='#ffffff';q.font='bold 32px Arial';q.fillText('mini',420,62);q.fillText('pris',420,104);
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:tx,transparent:true,side:T.FrontSide});
  for(const side of [-1,1]){const o=new T.Mesh(new T.PlaneGeometry(1.25,.39),m);o.position.set(side*.99,.6,.12);o.rotation.y=side*Math.PI/2;o.visible=false;car.add(o);kiwi.push(o);}}
 // The yellow cab (5 October 2026, unlocked by visiting KIWI, Ludvig, Dalgård ishall, Rema 1000 and the kindergarten): a lit TAXI sign on the roof, a black-and-white
 // checker band along both sides and TAXI on the front doors. Hidden until world.js shows it with the taxi. Choosing the taxi paints it yellow (game.js), but it takes
 // any colour like the car; with the KIWI skin the band moves down to the sills (dress), clear of the shop's logo on the doors.
 const taxi=new T.Group();taxi.visible=false;car.add(taxi);const midBands=[],lowBands=[];
 {const canvas=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;return tx;};
  const sign=text=>canvas(256,96,(q,w,h)=>{q.fillStyle='#ffd93a';q.fillRect(0,0,w,h);q.fillStyle='#14171c';q.fillRect(0,0,w,8);q.fillRect(0,h-8,w,8);q.font='900 70px Arial';q.textAlign='center';q.textBaseline='middle';q.fillText(text,w/2,h/2+4,w-24);}),
   checker=(cols,rows)=>canvas(cols*32,rows*32,q=>{for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){q.fillStyle=(i+j)%2?'#101214':'#f7f7f2';q.fillRect(i*32,j*32,32,32);}});
  const lamp=new T.MeshStandardMaterial({color:'#ffd93a',emissive:'#ffb800',emissiveIntensity:.55,roughness:.5});
  box(.3,.045,.17,trim,0,1.485,.05,taxi);box(.64,.2,.26,lamp,0,1.6,.05,taxi);
  for(const front of [0,1]){const o=mesh(new T.PlaneGeometry(.6,.17),new T.MeshBasicMaterial({map:sign('TAXI')}),0,1.6,.05+(front?-1:1)*.1325,taxi);if(front)o.rotation.y=Math.PI;}
  const mid=checker(16,2),low=checker(36,2);
  for(const side of [-1,1]){const band=mesh(new T.PlaneGeometry(2.04,.26),new T.MeshBasicMaterial({map:mid}),side*.985,.62,0,taxi),sill=mesh(new T.PlaneGeometry(1.94,.108),new T.MeshBasicMaterial({map:low}),side*.985,.345,0,taxi);
   band.rotation.y=sill.rotation.y=side*Math.PI/2;sill.visible=false;midBands.push(band);lowBands.push(sill);
   const door=mesh(new T.PlaneGeometry(.4,.11),new T.MeshBasicMaterial({map:canvas(256,70,(q,w,h)=>{q.fillStyle='#ffd93a';q.fillRect(0,0,w,h);q.fillStyle='#14171c';q.font='900 58px Arial';q.textAlign='center';q.textBaseline='middle';q.fillText('TAXI',w/2,h/2+3,w-12);})}),side*.968,.88,-.58,taxi);door.rotation.y=side*Math.PI/2;}}
 taxi.userData.dress=skin=>{midBands.forEach(m=>m.visible=skin!=='kiwi');lowBands.forEach(m=>m.visible=skin==='kiwi');};
 // Hover mode (5 October 2026, "Back to the Future"): hover(h, time) with h from 0 to 1 folds every wheel flat under the car on its hinge (the tyre's outer face
 // turns down) and lights a cyan glow under each; h = 0 puts the wheels back exactly. world.js lifts the car with the same blend.
 const lights=hoverGlow(T,hinges.length,1.5),glow=lights.group;car.add(glow);
 function hover(h,time=0){lights.show(h,time);hinges.forEach((hinge,i)=>{const side=hinge.userData.side;hinge.rotation.z=-side*h*Math.PI/2;hinge.position.x=side*(.916-.45*h);hinge.position.y=.355-.26*h;lights.discs[i].position.set(hinge.position.x,hinge.position.y-.13,hinge.position.z);});}
 car.userData={model:'NIO ET5 sedan',length:4.79,width:1.96,wheelbase:2.888};return {car,wheels,hinges,paint,skins:{kiwi},taxi,glow,hover};
}
