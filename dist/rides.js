// More things to drive as (3 October 2026): the rewards for the fifth, sixth and seventh trip to the kindergarten, after the cat:
// a dog, a duck and a rocket. Like the cat (cat-model.js) each takes the car's place and its paint colour, is about the car's size so
// the camera frames it the same way, has forward −z and the ground at y = 0, and update(dt, speed, time, colour) animates it at the
// car's speed. With the KIWI skin they wear the KIWI logo on both sides (logos: skin name -> material), as the car and the cat do.

// A logo bent onto an ellipsoid body (centre cy, cz, radii rx, ry, rz), 2 cm off it, one on each flank: tail to head on the right,
// head to tail on the left, as on the car's doors.
function flankLogos(T,body,logos,{cy,cz,rx,ry,rz,w,h,y=cy,z=cz}){
 const skins={};
 for(const [name,material] of Object.entries(logos))skins[name]=[-1,1].map(s=>{const g=new T.PlaneGeometry(w,h,16,4),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const yy=y+p.getY(i),zz=z-s*p.getX(i),e=1-((yy-cy)/ry)**2-((zz-cz)/rz)**2;p.setXYZ(i,s*(rx*Math.sqrt(Math.max(0,e))+.02),yy,zz);}
  g.computeVertexNormals();const m=new T.Mesh(g,material);m.name=name+' logo';m.visible=false;body.add(m);return m;});
 return skins;
}
const sphereGeo=T=>new T.SphereGeometry(1,18,12);

// ---- The dog: a big friendly dog in the car's colour, galloping, with floppy ears, a wagging tail, a red collar and its tongue out ----
export function createDog(T,{logos={}}={}){
 const group=new T.Group();group.name='Hund';
 const coat=new T.MeshStandardMaterial({color:'#14171c',roughness:.85}),light=new T.MeshStandardMaterial({color:'#efe4d0',roughness:.9});
 const dark=new T.MeshStandardMaterial({color:'#1b1d20',roughness:.6}),pink=new T.MeshStandardMaterial({color:'#ef8aa0',roughness:.6}),red=new T.MeshStandardMaterial({color:'#d8352d',roughness:.6}),gold=new T.MeshStandardMaterial({color:'#e9b934',roughness:.35,metalness:.5});
 const eye=new T.MeshBasicMaterial({color:'#2a1a10'}),glint=new T.MeshBasicMaterial({color:'#ffffff'});
 const sphere=sphereGeo(T),limb=new T.CylinderGeometry(1,.85,1,10),taper=new T.CylinderGeometry(.9,1,1,10);
 const body=new T.Group();group.add(body);
 const part=(g,m,[x,y,z],[sx,sy,sz],parent=body)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
 const torso=part(sphere,coat,[0,1.3,.1],[.74,.68,1.42]);part(sphere,coat,[0,1.4,-.85],[.72,.74,.78]);part(sphere,light,[0,1.12,-.95],[.5,.5,.5]);
 // collar with a tag
 const collar=part(new T.TorusGeometry(1,.16,8,20),red,[0,1.72,-1.3],[.5,.5,.5]);collar.rotation.x=Math.PI/2-.5;part(sphere,gold,[0,1.38,-1.58],[.09,.09,.04]);
 const head=new T.Group();head.position.set(0,2.05,-1.62);body.add(head);
 part(sphere,coat,[0,0,0],[.52,.5,.52],head);part(sphere,light,[0,-.14,-.5],[.3,.25,.42],head);part(sphere,dark,[0,-.04,-.88],[.11,.09,.08],head);
 const tongue=part(sphere,pink,[0,-.36,-.72],[.11,.05,.2],head);
 for(const s of [-1,1]){part(sphere,eye,[s*.2,.12,-.44],[.08,.09,.06],head);part(sphere,glint,[s*.22,.15,-.49],[.025,.025,.02],head);}
 const ears=[-1,1].map(s=>{const ear=new T.Group();ear.position.set(s*.42,.3,0);head.add(ear);part(sphere,coat,[s*.08,-.32,0],[.13,.38,.24],ear);ear.rotation.z=s*.15;return ear;});
 const legs=[[-.38,-.85],[.38,-.85],[-.38,.95],[.38,.95]].map(([x,z])=>{const hip=new T.Group();hip.position.set(x,1.15,z);body.add(hip);
  part(limb,coat,[0,-.46,0],[.2,.92,.2],hip);part(sphere,light,[0,-1,-.08],[.22,.14,.28],hip);return hip;});
 const tail=[];let joint=new T.Group();joint.position.set(0,1.6,1.45);body.add(joint);
 for(let i=0;i<5;i++){const r=.13-i*.017;part(taper,coat,[0,.17,0],[r,.34,r],joint);tail.push(joint);const next=new T.Group();next.position.set(0,.34,0);joint.add(next);joint=next;}
 const skins=flankLogos(T,body,logos,{cy:1.3,cz:.1,rx:.74,ry:.68,rz:1.42,w:1.3,h:.42,y:1.35,z:.25});
 let phase=0;
 function update(dt,speed,time,colour){
  if(colour)coat.color.copy(colour);
  const run=Math.min(1,speed/6),amp=.22+.7*Math.min(1,speed/14);phase+=dt*(1.5+speed*.42);
  const swing=[0,.3,Math.PI,Math.PI+.3].map(o=>Math.sin(phase+o)*amp*run);legs.forEach((leg,i)=>{leg.rotation.x=swing[i];});
  body.position.y=Math.abs(Math.sin(phase))*.15*run;body.rotation.x=Math.sin(phase+Math.PI/2)*.06*run;torso.scale.y=.68+Math.sin(time*2.6)*.012*(1-run);
  head.rotation.x=-Math.sin(phase+Math.PI/2)*.06*run;head.rotation.y=Math.sin(time*.8)*.15*(1-run);
  ears.forEach((ear,i)=>{ear.rotation.x=-.6*run*(.6+.4*Math.sin(phase+i));});tongue.scale.z=.2*(.4+.6*run);tongue.position.y=-.36-.05*run;
  // the tail stands up and wags: fast when standing (happy), streaming out behind when running
  tail.forEach((seg,i)=>{seg.rotation.x=i===0?-.5+1.3*run:.12*(1-run);seg.rotation.z=Math.sin(time*(13-6*run)-i*.4)*(.35-.2*run);});
 }
 update(0,0,0);
 return {group,update,skins};
}

// ---- The duck: a mallard on orange webbed feet, waddling, its body in the car's colour, the green head and yellow bill as a drake's ----
export function createRideDuck(T,{logos={}}={}){
 const group=new T.Group();group.name='And';group.scale.setScalar(.85); // about 3 m tall with its head up, 4 m long
 const plumage=new T.MeshStandardMaterial({color:'#14171c',roughness:.75}),chestnut=new T.MeshStandardMaterial({color:'#6e3a26',roughness:.75});
 const green=new T.MeshStandardMaterial({color:'#17643a',roughness:.35,metalness:.25}),white=new T.MeshStandardMaterial({color:'#f3f0e6',roughness:.7});
 const bill=new T.MeshStandardMaterial({color:'#e5b52b',roughness:.5}),orange=new T.MeshStandardMaterial({color:'#f08a24',roughness:.6}),black=new T.MeshStandardMaterial({color:'#1c1f21',roughness:.6}),blue=new T.MeshStandardMaterial({color:'#3055b5',roughness:.4,metalness:.2});
 const sphere=sphereGeo(T),limb=new T.CylinderGeometry(1,1,1,8);
 const body=new T.Group();group.add(body);
 const part=(g,m,[x,y,z],[sx,sy,sz],parent=body)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
 part(sphere,plumage,[0,1.45,.1],[.95,.78,1.55]);part(sphere,chestnut,[0,1.65,-1.05],[.82,.72,.75]);part(sphere,white,[0,1.15,.2],[.7,.35,1.1]);
 const wings=[-1,1].map(s=>{const w=new T.Group();w.position.set(s*.82,1.7,.2);body.add(w);part(sphere,plumage,[s*.12,0,.2],[.26,.42,1.2],w);part(sphere,blue,[s*.36,.05,.5],[.05,.16,.4],w);return w;});
 const tail=new T.Group();tail.position.set(0,1.7,1.55);body.add(tail);part(sphere,black,[0,.12,.25],[.5,.3,.45],tail);
 part(new T.TorusGeometry(1,.45,8,16,Math.PI*1.4),black,[0,.5,.2],[.08,.15,.08],tail).rotation.set(0,Math.PI/2,Math.PI*.6);
 const head=new T.Group();head.position.set(0,2.05,-1.35);body.add(head);
 part(sphere,green,[0,.42,-.05],[.38,.55,.38],head);part(sphere,white,[0,.1,0],[.41,.09,.41],head);part(sphere,green,[0,.95,-.2],[.48,.45,.52],head);
 part(sphere,bill,[0,.82,-.78],[.22,.09,.38],head);part(sphere,bill,[0,.76,-.72],[.19,.06,.33],head);
 for(const s of [-1,1]){part(sphere,black,[s*.36,1.05,-.47],[.07,.08,.07],head);part(sphere,white,[s*.4,1.08,-.51],[.02,.025,.02],head);}
 // legs from the hips, orange webbed feet
 const legs=[-1,1].map(s=>{const hip=new T.Group();hip.position.set(s*.42,.95,.15);body.add(hip);
  part(limb,orange,[0,-.45,0],[.08,.9,.08],hip);const foot=part(new T.ConeGeometry(1,1,3),orange,[0,-.9,-.22],[.32,.44,.06],hip);foot.rotation.x=-Math.PI/2;return hip;});
 const skins=flankLogos(T,body,logos,{cy:1.45,cz:.1,rx:.95,ry:.78,rz:1.55,w:1.3,h:.45,y:1.55,z:.35});
 let phase=0;
 function update(dt,speed,time,colour){
  if(colour)plumage.color.copy(colour);
  const run=Math.min(1,speed/5);phase+=dt*(2+speed*.55);
  const s=Math.sin(phase)*.7*run;legs[0].rotation.x=s;legs[1].rotation.x=-s;
  // the waddle: the body rolls from foot to foot and bobs; the wings lift a little at speed; the head bobs forward
  body.rotation.z=Math.sin(phase)*.12*run;body.position.y=Math.abs(Math.cos(phase))*.12*run;body.rotation.x=-.1*run;
  wings.forEach((w,i)=>{w.rotation.z=(i?-1:1)*(.15+.5*Math.min(1,speed/20)*(.5+.5*Math.sin(time*14)))*Math.min(1,speed/8);});
  head.position.z=-1.35-.12*Math.sin(phase*2)*run;head.rotation.y=Math.sin(time*.7)*.3*(1-run);head.rotation.x=Math.max(0,Math.sin(time*.9)-.9)*3*(1-run);
  tail.rotation.y=Math.sin(time*6)*.2;
 }
 update(0,0,0);
 return {group,update,skins};
}

// ---- The rocket: a rocket in the car's colour that hovers over the road, white nose, red fins, round windows and a flame behind it ----
export function createRocket(T,{logos={}}={}){
 const group=new T.Group();group.name='Rakett';
 const paint=new T.MeshStandardMaterial({color:'#14171c',roughness:.35,metalness:.35}),white=new T.MeshStandardMaterial({color:'#f2f1ec',roughness:.4});
 const red=new T.MeshStandardMaterial({color:'#d63b2f',roughness:.45}),metal=new T.MeshStandardMaterial({color:'#5b6066',roughness:.35,metalness:.8});
 const glass=new T.MeshStandardMaterial({color:'#7fc4ea',roughness:.1,metalness:.3,emissive:'#1d4b66',emissiveIntensity:.4});
 const R=.72,L=3.1,Y=1.35;
 const body=new T.Group();group.add(body);
 const along=(g,m,z,parent=body)=>{const o=new T.Mesh(g,m);o.rotation.x=-Math.PI/2;o.position.set(0,Y,z);o.castShadow=true;parent.add(o);return o;}; // a solid of revolution along −z
 along(new T.CylinderGeometry(R,R,L,24),paint,0);
 along(new T.ConeGeometry(R,1.5,24),white,-L/2-.75);along(new T.ConeGeometry(.2,.4,16),red,-L/2-1.38);
 along(new T.CylinderGeometry(R*1.01,R*1.01,.22,24),white,-L/2+.25);along(new T.CylinderGeometry(R*1.01,R*1.01,.12,24),red,-L/2+.45);
 along(new T.CylinderGeometry(R*.62,R*.78,.5,20),metal,L/2+.2);
 // round windows down each side, a white frame round blue glass
 const ring=new T.TorusGeometry(.2,.045,8,20),disc=new T.CircleGeometry(.19,20);
 for(const s of [-1,1])for(const z of [-.75,.05]){const f=new T.Mesh(ring,white);f.position.set(s*(R+.01),Y+.15,z);f.rotation.y=s*Math.PI/2;body.add(f);const g=new T.Mesh(disc,glass);g.position.set(s*(R+.015),Y+.15,z);g.rotation.y=s*Math.PI/2;body.add(g);}
 // four red fins at the back, swept back
 for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4,fin=new T.Mesh(new T.BoxGeometry(.08,.95,1.1),red);fin.position.set(Math.cos(a)*(R+.4),Y+Math.sin(a)*(R+.4),L/2-.25);fin.rotation.z=a-Math.PI/2;fin.castShadow=true;body.add(fin);}
 // the flame: two see-through cones that grow with the speed and flicker, unlit, no shadow
 const flameOuter=new T.Mesh(new T.ConeGeometry(.42,1,16,1,true),new T.MeshBasicMaterial({color:'#ff8a2b',transparent:true,opacity:.75,depthWrite:false,side:T.DoubleSide}));
 const flameInner=new T.Mesh(new T.ConeGeometry(.24,1,12,1,true),new T.MeshBasicMaterial({color:'#fff1a8',transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide}));
 for(const f of [flameOuter,flameInner]){f.rotation.x=Math.PI/2;f.position.set(0,Y,L/2+.45);f.renderOrder=3;body.add(f);}
 const skins=flankLogos(T,body,logos,{cy:Y,cz:0,rx:R,ry:R,rz:L*.9,w:1.35,h:.42,y:Y-.32,z:.2});
 function update(dt,speed,time,colour){
  if(colour)paint.color.copy(colour);
  const go=Math.min(1,speed/30),flick=.85+.15*Math.sin(time*37)+.08*Math.sin(time*23);
  const len=(.5+3.2*go)*flick;for(const [f,k] of [[flameOuter,1],[flameInner,.62]]){f.scale.set(1,len*k,1);f.position.z=L/2+.45+len*k/2;}
  flameOuter.material.opacity=.45+.35*go;
  // hovering: a gentle bob and a slow roll; nose a little up at speed
  body.position.y=.12+Math.sin(time*2.1)*.08;body.rotation.z=Math.sin(time*1.3)*.05;body.rotation.x=.04*go;
 }
 update(0,0,0);
 return {group,update,skins};
}

// ---- More rewards (3 October 2026, trips 8, 10, 12 and 13): a unicorn, a fire engine, a hot-air balloon and, last of all, a T. rex ----
// honk() (the horn, the reward for the eleventh trip) makes each one do its own thing: the T. rex opens its jaws.

// The unicorn: a horse in the car's colour with a golden horn, a rainbow mane and a rainbow tail, galloping.
export function createUnicorn(T,{logos={}}={}){
 const group=new T.Group();group.name='Enhjørning';
 const coat=new T.MeshStandardMaterial({color:'#14171c',roughness:.8}),hoof=new T.MeshStandardMaterial({color:'#d9b347',roughness:.4,metalness:.5});
 const gold=new T.MeshStandardMaterial({color:'#f2c94c',roughness:.3,metalness:.6,emissive:'#5a4310',emissiveIntensity:.3}),eye=new T.MeshBasicMaterial({color:'#24160e'}),pinkNose=new T.MeshStandardMaterial({color:'#e8a4b4',roughness:.7});
 const rainbow=['#ff5a5a','#ffa63d','#ffd94a','#5ccf66','#41a7f4','#8b6cf0'].map(c=>new T.MeshStandardMaterial({color:c,roughness:.6}));
 const sphere=sphereGeo(T),limb=new T.CylinderGeometry(1,.8,1,10);
 const body=new T.Group();group.add(body);
 const part=(g,m,[x,y,z],[sx,sy,sz],parent=body)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
 part(sphere,coat,[0,1.6,.1],[.62,.66,1.45]);
 const neck=new T.Group();neck.position.set(0,1.95,-1.05);body.add(neck);const n=part(sphere,coat,[0,.45,-.2],[.32,.75,.38],neck);n.rotation.x=.5;
 const head=new T.Group();head.position.set(0,1.05,-.55);neck.add(head);
 part(sphere,coat,[0,0,0],[.3,.32,.38],head);part(sphere,coat,[0,-.12,-.42],[.24,.22,.36],head);part(sphere,pinkNose,[0,-.17,-.7],[.18,.14,.1],head);
 for(const s of [-1,1]){part(sphere,eye,[s*.25,.06,-.14],[.06,.08,.06],head);const ear=part(new T.ConeGeometry(1,1,6),coat,[s*.14,.38,.1],[.08,.26,.08],head);ear.rotation.z=-s*.25;}
 const horn=part(new T.ConeGeometry(1,1,12),gold,[0,.5,-.18],[.07,.6,.07],head);horn.rotation.x=-.45;
 rainbow.forEach((m,i)=>part(sphere,m,[0,1.1-i*.18,.05+i*.08],[.12,.2,.16],neck)); // the mane down the back of the neck
 const legs=[[-.3,-.85],[.3,-.85],[-.3,.95],[.3,.95]].map(([x,z])=>{const hip=new T.Group();hip.position.set(x,1.3,z);body.add(hip);
  part(limb,coat,[0,-.6,0],[.14,1.2,.14],hip);part(new T.CylinderGeometry(1,1,1,10),hoof,[0,-1.25,0],[.15,.1,.15],hip);return hip;});
 const tail=new T.Group();tail.position.set(0,1.95,1.5);body.add(tail);rainbow.forEach((m,i)=>{const s=part(sphere,m,[0,-.15-i*.17,.25+i*.06],[.13,.22,.13],tail);s.rotation.x=.4;});
 const skins=flankLogos(T,body,logos,{cy:1.6,cz:.1,rx:.62,ry:.66,rz:1.45,w:1.3,h:.4,y:1.62,z:.25});
 let phase=0,hop=0;
 function update(dt,speed,time,colour){
  if(colour)coat.color.copy(colour);
  const run=Math.min(1,speed/6),amp=.25+.6*Math.min(1,speed/14);phase+=dt*(1.6+speed*.38);
  [0,.35,Math.PI,Math.PI+.35].forEach((o,i)=>{legs[i].rotation.x=Math.sin(phase+o)*amp*run;});
  body.position.y=Math.abs(Math.sin(phase))*.18*run;body.rotation.x=Math.sin(phase+Math.PI/2)*.05*run;
  neck.rotation.x=-Math.sin(phase)*.1*run+Math.sin(time*.8)*.06*(1-run);tail.rotation.x=.3+.6*run+Math.sin(time*3)*.15;tail.rotation.z=Math.sin(time*2.4)*.25;
  hop=Math.max(0,hop-dt*1.6);head.rotation.x=-.5*Math.sin(Math.PI*hop); // honk: rears its head (a neigh)
 }
 update(0,0,0);
 return {group,update,skins,honk(){hop=1;}};
}

// The fire engine: red, with a white stripe, lockers along the sides, a ladder on the roof, blue lights that flash and wheels that turn.
export function createFireTruck(T,{logos={}}={}){
 const group=new T.Group();group.name='Brannbil';
 const red=new T.MeshStandardMaterial({color:'#c8211c',roughness:.45,metalness:.2}),white=new T.MeshStandardMaterial({color:'#f2f1ec',roughness:.5});
 const grey=new T.MeshStandardMaterial({color:'#9aa1a6',roughness:.4,metalness:.6}),tyre=new T.MeshStandardMaterial({color:'#1d1f22',roughness:.9}),glass=new T.MeshStandardMaterial({color:'#2d4654',roughness:.15,metalness:.5});
 const blue=[0,1].map(()=>new T.MeshStandardMaterial({color:'#2a6bff',emissive:'#1e5bff',emissiveIntensity:1,roughness:.3})),lamp=new T.MeshStandardMaterial({color:'#fff6d8',emissive:'#fff1b0',emissiveIntensity:.8});
 const box=new T.BoxGeometry(1,1,1),body=new T.Group();group.add(body);
 const part=(m,[x,y,z],[sx,sy,sz],parent=body,g=box)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
 part(red,[0,1.35,-1.75],[2.2,1.9,1.6]);part(glass,[0,1.75,-2.56],[2,.8,.04]);for(const s of [-1,1])part(glass,[s*1.11,1.8,-1.8],[.03,.65,1.1]);
 part(red,[0,1.45,.75],[2.2,2.1,3.5]);part(white,[0,1.05,-.4],[2.23,.16,5.3]);
 for(const s of [-1,1])for(const z of [-.2,.75,1.7])part(grey,[s*1.115,1.6,z],[.02,1.15,.85]); // the locker doors
 for(const s of [-1,1]){part(grey,[s*.4,2.6,.7],[.07,.1,4.2]);}for(let z=-1.2;z<=2.6;z+=.42)part(grey,[0,2.6,z],[.8,.06,.06]); // the ladder
 const lights=[-1,1].map((s,i)=>part(blue[i],[s*.45,2.4,-2.1],[.5,.2,.3]));
 for(const s of [-1,1])part(lamp,[s*.75,.85,-2.57],[.35,.22,.04]);part(grey,[0,.6,-2.6],[2.1,.25,.12]);
 const wheels=[[-1,-1.8],[1,-1.8],[-1,.6],[1,.6],[-1,1.7],[1,1.7]].map(([s,z])=>{const w=new T.Group();w.position.set(s*1.0,.48,z);body.add(w);
  part(tyre,[0,0,0],[.5,.3,.5],w,new T.CylinderGeometry(1,1,1,16)).rotation.z=Math.PI/2;part(grey,[s*.16,0,0],[.25,.04,.25],w,new T.CylinderGeometry(1,1,1,12)).rotation.z=Math.PI/2;return w;});
 const skins=flankLogos(T,body,logos,{cy:1.45,cz:.75,rx:1.1,ry:20,rz:20,w:1.4,h:.45,y:2.15,z:.75});
 let flash=0,hop=0;
 function update(dt,speed,time){
  for(const w of wheels)w.rotation.x-=speed*dt/.5;
  flash+=dt*(hop>0?14:6);const on=Math.sin(flash*Math.PI)>0;blue[0].emissiveIntensity=on?1.4:.1;blue[1].emissiveIntensity=on?.1:1.4;
  hop=Math.max(0,hop-dt/2);body.position.y=Math.sin(time*9)*.01*Math.min(1,speed/5);
 }
 update(0,0,0);
 return {group,update,skins,honk(){hop=1;}};
}

// The hot-air balloon: an envelope of gores in the car's colour and yellow, a basket on ropes, floating over the road; the burner puffs.
export function createBalloon(T,{logos={}}={}){
 const group=new T.Group();group.name='Luftballong';
 const paint=new T.MeshStandardMaterial({color:'#14171c',roughness:.6}),yellow=new T.MeshStandardMaterial({color:'#ffd34d',roughness:.6});
 const wicker=new T.MeshStandardMaterial({color:'#9a6a3a',roughness:.9}),rope=new T.MeshStandardMaterial({color:'#5a4a3a',roughness:.9});
 const flame=new T.Mesh(new T.ConeGeometry(.16,.6,10,1,true),new T.MeshBasicMaterial({color:'#ffb347',transparent:true,opacity:.85,depthWrite:false,side:T.DoubleSide}));
 const body=new T.Group();group.add(body);
 const G=12,envY=4.1;
 for(let k=0;k<G;k++){const g=new T.Mesh(new T.SphereGeometry(1.7,3,12,k*Math.PI*2/G,Math.PI*2/G,0,Math.PI*.78),k%2?yellow:paint);g.scale.set(1,1.12,1);g.position.y=envY;g.castShadow=true;body.add(g);}
 const skirt=new T.Mesh(new T.CylinderGeometry(1.08,.42,1.1,12,1,true),paint);skirt.position.y=envY-1.95;skirt.material=paint;body.add(skirt);
 const basket=new T.Mesh(new T.BoxGeometry(.95,.7,.95),wicker);basket.position.y=.85;basket.castShadow=true;body.add(basket);
 for(const [x,z] of [[-.42,-.42],[.42,-.42],[-.42,.42],[.42,.42]]){const r=new T.Mesh(new T.CylinderGeometry(.02,.02,1.45,4),rope);r.position.set(x*.8,1.9,z*.8);r.rotation.set(z*.25,0,-x*.25);body.add(r);}
 flame.position.y=1.75;body.add(flame);
 const skins=flankLogos(T,body,logos,{cy:envY,cz:0,rx:1.72,ry:1.9,rz:1.72,w:1.5,h:.5,y:envY-.2,z:0});
 let hop=0;
 function update(dt,speed,time,colour){
  if(colour)paint.color.copy(colour);
  body.position.y=.35+Math.sin(time*1.1)*.18;body.rotation.z=Math.sin(time*.7)*.04;body.rotation.x=-.05*Math.min(1,speed/10);
  hop=Math.max(0,hop-dt);const puff=Math.max(0,Math.sin(time*1.7)-.6)/.4+hop*1.5;flame.scale.set(1,.2+puff,1);flame.visible=puff>.05;flame.position.y=1.75+.3*(.2+puff)/2;
 }
 update(0,0,0);
 return {group,update,skins,honk(){hop=1;}};
}

// The T. rex (the last reward): on two big legs, its tail held out behind, tiny arms, a big head with teeth; it runs at the car's
// speed, and on honk opens its jaws wide (a roar).
export function createTRex(T,{logos={}}={}){
 const group=new T.Group();group.name='T-rex';
 const skin=new T.MeshStandardMaterial({color:'#14171c',roughness:.8}),belly=new T.MeshStandardMaterial({color:'#d9cfa6',roughness:.85});
 const tooth=new T.MeshStandardMaterial({color:'#fbf8ec',roughness:.5}),mouth=new T.MeshStandardMaterial({color:'#9c2f34',roughness:.7}),eye=new T.MeshBasicMaterial({color:'#f2c230'}),pupil=new T.MeshBasicMaterial({color:'#121212'});
 const sphere=sphereGeo(T),limb=new T.CylinderGeometry(1,.75,1,10),cone=new T.ConeGeometry(1,1,6);
 const body=new T.Group();group.add(body);
 const part=(g,m,[x,y,z],[sx,sy,sz],parent=body)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
 part(sphere,skin,[0,2.15,.1],[.78,.85,1.45]);part(sphere,belly,[0,1.85,-.2],[.55,.55,1.0]);part(sphere,skin,[0,2.55,-1.05],[.55,.6,.65]);
 const head=new T.Group();head.position.set(0,3.05,-1.55);body.add(head);
 part(sphere,skin,[0,.05,-.35],[.48,.42,.78],head);
 const jaw=new T.Group();jaw.position.set(0,-.18,0);head.add(jaw);part(sphere,skin,[0,-.12,-.4],[.42,.18,.7],jaw);part(sphere,mouth,[0,-.02,-.45],[.36,.08,.6],jaw);
 for(const s of [-1,1]){for(let k=0;k<5;k++){const z=-.15-k*.17;part(cone,tooth,[s*.3*(1-k*.08),-.12,z],[.035,.1,.035],head).rotation.x=Math.PI;part(cone,tooth,[s*.27*(1-k*.08),.02,z-.05],[.03,.08,.03],jaw);}
  part(sphere,eye,[s*.33,.25,-.25],[.08,.08,.07],head);part(sphere,pupil,[s*.37,.25,-.27],[.03,.07,.03],head);}
 // tiny arms with two claws each
 const arms=[-1,1].map(s=>{const a=new T.Group();a.position.set(s*.45,2.35,-1.15);body.add(a);part(limb,skin,[0,-.16,-.05],[.07,.32,.07],a).rotation.x=.9;part(cone,tooth,[0,-.3,-.25],[.03,.07,.03],a).rotation.x=-1.2;return a;});
 // big legs: thigh, shin, foot with claws
 const legs=[-1,1].map(s=>{const hip=new T.Group();hip.position.set(s*.55,2.05,.25);body.add(hip);
  part(sphere,skin,[0,-.35,.05],[.33,.6,.42],hip);const knee=new T.Group();knee.position.set(0,-.85,.15);hip.add(knee);
  part(limb,skin,[0,-.45,0],[.17,.9,.17],knee);part(sphere,skin,[0,-.95,-.2],[.22,.1,.42],knee);for(const c of [-.1,0,.1])part(cone,tooth,[c,-.95,-.62],[.03,.12,.03],knee).rotation.x=-Math.PI/2;
  return {hip,knee};});
 // the tail: a chain of shrinking segments held out behind
 const tail=[];let joint=new T.Group();joint.position.set(0,2.25,1.4);body.add(joint);
 for(let i=0;i<6;i++){const r=.5-i*.075;part(sphere,skin,[0,0,.3],[r,r*.9,.55],joint);tail.push(joint);const next=new T.Group();next.position.set(0,0,.55);joint.add(next);joint=next;}
 const skins=flankLogos(T,body,logos,{cy:2.15,cz:.1,rx:.78,ry:.85,rz:1.45,w:1.3,h:.42,y:2.25,z:.25});
 let phase=0,roar=0;
 function update(dt,speed,time,colour){
  if(colour)skin.color.copy(colour);
  const run=Math.min(1,speed/5);phase+=dt*(1.8+speed*.35);
  legs.forEach(({hip,knee},i)=>{const p=phase+i*Math.PI;hip.rotation.x=Math.sin(p)*.65*run;knee.rotation.x=Math.max(0,-Math.cos(p))*.7*run;});
  body.position.y=Math.abs(Math.sin(phase))*.14*run;body.rotation.x=-.08*run+Math.sin(phase*2)*.03*run;
  tail.forEach((seg,i)=>{seg.rotation.y=Math.sin(time*(2+run*3)-i*.5)*(.12+.05*run);seg.rotation.x=i?.04:-.05;});
  arms.forEach((a,i)=>{a.rotation.x=Math.sin(phase+i)*.3*run;});
  roar=Math.max(0,roar-dt*.8);const open=Math.sin(Math.PI*Math.min(1,roar*1.3));jaw.rotation.x=.75*open+.06*run*Math.abs(Math.sin(phase));head.rotation.x=-.25*open+Math.sin(phase*2)*.04*run;head.rotation.y=Math.sin(time*.6)*.15*(1-run);
 }
 update(0,0,0);
 return {group,update,skins,jaw,honk(){roar=1;}};
}
