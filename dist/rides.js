// More things to drive as (3 October 2026): the rewards for the fifth, sixth and seventh trip to the kindergarten, after the cat:
// a dog, a duck and a rocket. Like the cat (cat-model.js) each takes the car's place and its paint colour, is about the car's size so
// the camera frames it the same way, has forward −z and the ground at y = 0, and update(dt, speed, time, colour) animates it at the
// car's speed. With the KIWI skin they wear the KIWI logo on both sides (logos: skin name -> material), as the car and the cat do.
import {hoverGlow} from './car-model.js';

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
 const skins=flankLogos(T,body,logos,{cy:1.45,cz:.1,rx:.95,ry:.78,rz:1.55,w:1.05,h:.36,y:1.08,z:.35}); // 7 October 2026: smaller, below the folded wings (they cover the flank above y 1.3) and above the belly
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
 const skins=flankLogos(T,body,logos,{cy:Y,cz:0,rx:R,ry:R,rz:40,w:1.35,h:.42,y:Y-.32,z:.2}); // 7 October 2026: bent on the cylinder (rz long), so the ends of the logo do not sink into it
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

// The unicorn: a pony-like horse in the car's colour (the coat takes the paint) with a golden spiral horn, a rainbow mane and tail, galloping.
// Redesigned 7 October 2026 (the first one was a toy of eggs and sticks): a body, a neck and a head each lofted from cross-sections (a deep chest, a tucked belly, a
// withers and a rump; an arched neck; a pony's head with a big forehead, a small muzzle and a pink nose), big glossy eyes with lashes, upright ears with pink insides,
// legs with thigh, bending knee, fetlock and golden hoof, a long golden spiral horn with a sparkle, six locks of rainbow mane on each side of the neck with a forelock,
// and a long wavy tail of six rainbow strands. Forward is −z, the ground is y = 0.
export function createUnicorn(T,{logos={}}={}){
 const group=new T.Group();group.name='Enhjørning';
 const std=(color,roughness=.7,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});
 const coat=std('#14171c',.62),pink=std('#f6a9bd',.7),nose=std('#f4b3c3',.6),blush=std('#f9a8bd',.8),hoof=std('#e8b83a',.35,{metalness:.5});
 const gold=std('#f4cd55',.3,{metalness:.6,emissive:'#5a4310',emissiveIntensity:.3}),goldDark=std('#d9962b',.35,{metalness:.6,emissive:'#4a3008',emissiveIntensity:.3});
 const dark=new T.MeshBasicMaterial({color:'#2a2250'}),iris=new T.MeshBasicMaterial({color:'#7a52c8'}),shine=new T.MeshBasicMaterial({color:'#ffffff'}),nostril=new T.MeshBasicMaterial({color:'#a55c75'}),spark=new T.MeshBasicMaterial({color:'#fff3b8'});
 const rainbow=['#ff5a5a','#ffa63d','#ffd94a','#5ccf66','#41a7f4','#8b6cf0'].map(c=>std(c,.55));
 const sphere=sphereGeo(T),ball=new T.SphereGeometry(1,10,8),shin=new T.CylinderGeometry(1,.75,1,8),cone=new T.ConeGeometry(1,1,8);
 const V=(x,y,z)=>new T.Vector3(x,y,z);
 const body=new T.Group();group.add(body);
 const part=(g,m,[x,y,z],[sx,sy,sz],parent=body)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
 const put=(geo,mat,parent)=>{const o=new T.Mesh(geo,mat);o.castShadow=true;parent.add(o);return o;};
 // loft(rings): a smooth skin through elliptical rings {c: centre, a and b: the two half axes}, closed at both ends with a fan to the end ring's centre.
 function loft(rings,n=18){const pos=[],idx=[],m=rings.length;
  for(const {c,a,b} of rings)for(let k=0;k<n;k++){const f=k/n*Math.PI*2,cs=Math.cos(f),sn=Math.sin(f);pos.push(c.x+a.x*cs+b.x*sn,c.y+a.y*cs+b.y*sn,c.z+a.z*cs+b.z*sn);}
  for(let i=0;i<m-1;i++)for(let k=0;k<n;k++){const p=i*n+k,q=i*n+(k+1)%n;idx.push(p,p+n,q,q,p+n,q+n);}
  const P=i=>V(pos[i*3],pos[i*3+1],pos[i*3+2]);
  if(P(idx[1]).sub(P(idx[0])).cross(P(idx[2]).sub(P(idx[0]))).dot(P(idx[0]).sub(rings[0].c))<0)for(let i=0;i<idx.length;i+=3){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;} // triangles face outwards
  for(const [i,j] of [[0,1],[m-1,m-2]]){const ci=pos.length/3,ring=rings[i],dir=ring.c.clone().sub(rings[j].c);pos.push(ring.c.x,ring.c.y,ring.c.z);
   for(let k=0;k<n;k++){const p=i*n+k,q=i*n+(k+1)%n;idx.push(...(P(p).sub(ring.c).cross(P(q).sub(ring.c)).dot(dir)>0?[ci,p,q]:[ci,q,p]));}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
 // sweep(points, wide, thick, side): a tapered ribbon or tube along a curve through the points; wide(u) and thick(u) are its half width (along side) and half thickness, u from 0 to 1.
 function sweep(points,wide,thick,side=V(1,0,0),seg=14,n=10){const curve=new T.CatmullRomCurve3(points.map(p=>V(...p))),rings=[];
  for(let i=0;i<=seg;i++){const u=i/seg,c=curve.getPointAt(u),t=curve.getTangentAt(u),a=side.clone().addScaledVector(t,-side.dot(t)).normalize(),b=t.clone().cross(a).normalize();rings.push({c,a:a.multiplyScalar(wide(u)),b:b.multiplyScalar(thick(u))});}
  return loft(rings,n);}
 const taperTo=(a,b,e=1)=>u=>b+(a-b)*Math.pow(1-u,e); // from a at the root to b at the tip
 // stations → rings: a Catmull-Rom through the stations, three rings to each step
 const cr=(p0,p1,p2,p3,t)=>.5*(2*p1+(p2-p0)*t+(2*p0-5*p1+4*p2-p3)*t*t+(3*p1-p0-3*p2+p3)*t*t*t);
 function station(stations,ring){const out=[],at=j=>stations[Math.max(0,Math.min(stations.length-1,j))];
  for(let i=0;i<stations.length-1;i++)for(let s=0;s<3;s++){const t=s/3;out.push(ring([0,1,2,3].map(k=>cr(at(i-1)[k],at(i)[k],at(i+1)[k],at(i+2)[k],t))));}
  out.push(ring(stations.at(-1)));return out;}
 // ---- The body: z, belly, back, half width. Withers and croup high, the back dips between, the chest is deep and the belly tucks up behind it ----
 const KZ=.9,bodyRings=station([[-1.34,1.88,2.2,.07],[-1.28,1.62,2.46,.26],[-1.1,1.42,2.62,.45],[-.86,1.34,2.78,.58],[-.46,1.36,2.72,.62],[0,1.43,2.67,.62],[.46,1.52,2.7,.62],[.83,1.6,2.75,.62],[1.15,1.6,2.78,.6],[1.43,1.62,2.7,.52],[1.62,1.72,2.5,.36],[1.73,1.9,2.3,.1]],
  ([z,lo,hi,w])=>({c:V(0,(lo+hi)/2,z*KZ),a:V(Math.max(.03,w),0,0),b:V(0,Math.max(.05,(hi-lo)/2),0)}));
 const torso=new T.Mesh(loft(bodyRings,22),coat);torso.castShadow=true;body.add(torso);
 // where the body's skin is at a given z (to lay the KIWI logo on it): centre height, half height, half width
 const prof=z=>{for(let i=0;i<bodyRings.length-1;i++){const p=bodyRings[i],q=bodyRings[i+1];if(z>=p.c.z&&z<=q.c.z){const f=(z-p.c.z)/(q.c.z-p.c.z||1);return [p.c.y+(q.c.y-p.c.y)*f,p.b.y+(q.b.y-p.b.y)*f,p.a.x+(q.a.x-p.a.x)*f];}}return [2,.6,.6];};
 // ---- The legs: a thigh or forearm that tapers to the knee, the cannon with its fetlock, a sloping pastern and a golden hoof, each lofted in one smooth piece; the hind legs have a hock that points back ----
 const limb=(rows,k=1)=>loft(rows.map(([y,rx,rz,dz=0])=>({c:V(0,y*k,dz),a:V(rx,0,0),b:V(0,0,rz)})),14);
 const upperF=limb([[.2,.16,.2],[.05,.2,.24],[-.15,.17,.2,.0],[-.35,.125,.14],[-.58,.105,.115]],1.07),upperR=limb([[.22,.2,.27],[.05,.25,.32,.03],[-.15,.2,.25,.02],[-.35,.135,.16],[-.58,.11,.12]],1.07);
 const lowerG=limb([[.02,.105,.115],[-.1,.08,.088],[-.26,.066,.07],[-.38,.075,.08],[-.46,.092,.1]],1.13),pasternG=limb([[.02,.09,.098],[-.09,.066,.072],[-.17,.078,.084]]);
 const legs=[[-.4,-.66,0,0],[.4,-.66,Math.PI,0],[-.4,.9,Math.PI+.4,1],[.4,.9,.4,1]].map(([x,z,o,rear])=>{const hip=new T.Group();hip.position.set(x,1.5,z);body.add(hip);
  put(rear?upperR:upperF,coat,hip);const knee=new T.Group();knee.position.set(0,-.62,0);hip.add(knee);put(lowerG,coat,knee);
  const fet=new T.Group();fet.position.set(0,-.52,0);knee.add(fet);put(pasternG,coat,fet);
  part(new T.CylinderGeometry(.092,.135,.2,12),hoof,[0,-.26,0],[1,1,1],fet);return {hip,knee,fet,o,rear};});
 // ---- The neck: lofted from the shoulders up and forward to the poll, arched, thick at the base and slim at the head ----
 const neckBase=V(0,2.2,-.56),poll=V(0,3.0,-1.44),neck=new T.Group();neck.position.copy(neckBase);body.add(neck);
 const nk=new T.CatmullRomCurve3([V(0,0,0),V(0,.38,-.3),V(0,.7,-.62),V(0,.82,-.88)]),rw=taperTo(.4,.24,.9),rn=taperTo(.5,.3,.9),nrm=t=>V(0,-t.z,t.y).normalize(); // nrm: the way the crest faces (up and back)
 {const rr=[];for(let i=0;i<=14;i++){const u=i/14,c=nk.getPointAt(u);rr.push({c,a:V(rw(u),0,0),b:nrm(nk.getTangentAt(u)).multiplyScalar(rn(u))});}put(loft(rr,18),coat,neck);}
 // ---- The head, pitched down from the poll: a loft with a big forehead and a small muzzle, a pink nose, big eyes, cheeks with a blush, ears, a smile, the horn ----
 const head=new T.Group();head.position.copy(poll).sub(neckBase);neck.add(head);const pitch=-.68;
 put(loft(station([[.2,0,.18,.13],[.12,0,.27,.22],[-.05,0,.3,.265],[-.25,-.02,.29,.26],[-.45,-.08,.22,.19],[-.65,-.12,.16,.14],[-.82,-.14,.125,.115],[-.9,-.15,.11,.1],[-.95,-.15,.06,.05]],
  ([z,cy,h,w])=>({c:V(0,cy,z),a:V(w,0,0),b:V(0,h,0)})),18),coat,head);
 part(sphere,nose,[0,-.15,-.86],[.108,.105,.085],head);
 for(const s of [-1,1]){part(ball,nostril,[s*.05,-.14,-.93],[.024,.032,.016],head);part(sphere,blush,[s*.2,-.1,-.4],[.03,.075,.09],head);
  part(ball,dark,[s*.225,.03,-.28],[.05,.095,.085],head);part(ball,iris,[s*.25,.03,-.28],[.032,.07,.062],head);part(ball,shine,[s*.268,.07,-.3],[.02,.03,.03],head);part(ball,shine,[s*.262,-.02,-.25],[.012,.016,.016],head);
  const lash=part(shin,dark,[s*.225,.125,-.18],[.012,.11,.012],head);lash.rotation.set(.7,0,-s*.35);const lash2=part(shin,dark,[s*.235,.115,-.24],[.012,.1,.012],head);lash2.rotation.set(.25,0,-s*.6);
  const e=new T.Group();e.position.set(s*.15,.24,.0);e.rotation.set(.55,0,-s*.2);head.add(e);part(cone,coat,[0,.14,0],[.14,.31,.07],e);part(cone,pink,[0,.11,-.035],[.09,.23,.035],e);e.userData.s=s;}
 const smile=new T.TubeGeometry(new T.CatmullRomCurve3([V(.09,-.215,-.9),V(.125,-.23,-.82),V(.145,-.22,-.74)]),8,.006,4,false);for(const s of [-1,1]){const m=new T.Mesh(smile,nostril);m.scale.x=s;head.add(m);}
 // the horn: a long golden cone with a spiral ridge winding up it, and a sparkle twinkling by its tip
 const hornLen=.78,hornGeo=new T.ConeGeometry(.08,hornLen,14);hornGeo.translate(0,hornLen/2,0);const horn=new T.Group();horn.position.set(0,.24,-.2);horn.rotation.x=.12;head.add(horn);
 put(hornGeo,gold,horn);
 const helix=[];for(let i=0;i<=40;i++){const u=i/40,r=.08*(1-u*.96)+.008,f=u*Math.PI*2*3.2;helix.push(V(Math.cos(f)*r,u*hornLen*.96,Math.sin(f)*r));}
 horn.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(helix),90,.011,5,false),goldDark));
 const star=new T.Group();star.position.set(.02,hornLen+.1,-.1);horn.add(star);const oct=new T.OctahedronGeometry(1);
 for(const sc of [[.15,.035,.035],[.035,.15,.035],[.035,.035,.15]])part(oct,spark,[0,0,0],sc,star);
 head.rotation.x=pitch;head.scale.setScalar(1.25);
 // ---- The mane: six locks (one in each colour) follow the neck down each side from the crest, lifting off it toward their ends; a forelock falls between the ears and the horn ----
 const locks=[];
 for(let k=0;k<6;k++)for(const s of [-1,1]){const u0=.95-k*.12,pts=[];
  for(let j=0;j<=7;j++){const f=j/7,u=Math.max(.03,u0-f*.38),c=nk.getPointAt(u),t=nk.getTangentAt(u),ph=(80-52*Math.pow(f,.8))*Math.PI/180,o=1.05+.5*f*f+.03*k,wave=Math.sin(f*5+k)*.025;
   pts.push(c.clone().addScaledVector(V(s,0,0),rw(u)*Math.cos(ph)*o+wave).addScaledVector(nrm(t),rn(u)*Math.sin(ph)*o));}
  const g=new T.Group();g.position.copy(pts[0]);neck.add(g);const rel=pts.map(p=>p.clone().sub(pts[0]).toArray());
  put(sweep(rel,taperTo(.1,.015,.7),taperTo(.04,.012),V(0,.6,-.8),14,8),rainbow[k],g);locks.push({g,k,s});}
 for(const [i,s] of [[2,-1],[4,1]]){const g=new T.Group();g.position.set(s*.1,.31,-.02);head.add(g);
  put(sweep([[0,0,0],[s*.012,.02,-.12],[s*.02,-.02,-.26],[s*.02,-.11,-.38],[s*.015,-.19,-.48]],taperTo(.05,.01),taperTo(.03,.008),V(1,0,0),10,8),rainbow[i],g);locks.push({g,k:i,s,fore:true});}
 // ---- The tail: six strands in the six colours in two linked halves, which stream up behind it and wave ----
 const tailA=[[0,0,0],[0,.14,.28],[0,.13,.56],[0,-.04,.8]],tailB=[[0,0,0],[0,-.26,.15],[0,-.58,.22]],tail=[];
 for(let i=0;i<6;i++){const g=new T.Group();g.position.set((i-2.5)*.05,2.3,1.4);g.rotation.y=(i-2.5)*.1;g.userData.fan=(i-2.5)*.09;body.add(g);
  put(sweep(tailA,taperTo(.08,.065),taperTo(.075,.06),V(1,0,0),12,8),rainbow[i],g);const h=new T.Group();h.position.set(0,-.04,.8);g.add(h);
  put(sweep(tailB,taperTo(.065,.012,.7),taperTo(.06,.012,.7),V(1,0,0),10,8),rainbow[i],h);tail.push({g,h,i});}
 // the KIWI logo (a plane bent onto the barrel's skin, 2 cm off it, one on each flank: tail to head on the right, head to tail on the left)
 const skins={};
 for(const [name,material] of Object.entries(logos))skins[name]=[-1,1].map(s=>{const g=new T.PlaneGeometry(1.2,.42,16,4),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const yy=2+p.getY(i),zz=.05-s*p.getX(i),[cy,ry,rx]=prof(zz),e=1-((yy-cy)/ry)**2;p.setXYZ(i,s*(rx*Math.sqrt(Math.max(0,e))+.02),yy,zz);}
  g.computeVertexNormals();const m=new T.Mesh(g,material);m.name=name+' logo';m.visible=false;body.add(m);return m;});
 let phase=0,hop=0;
 function update(dt,speed,time,colour){
  if(colour)coat.color.copy(colour);
  const run=Math.min(1,speed/6),amp=.3+.55*Math.min(1,speed/14);phase+=dt*(1.7+speed*.4);hop=Math.max(0,hop-dt*1.5);const neigh=Math.sin(Math.PI*Math.min(1,hop)); // honk: rears its head back (a neigh)
  // a gallop in diagonal pairs: the leg swings, and the knee bends while it swings forward
  for(const {hip,knee,fet,o,rear} of legs){const a=phase+o,bend=Math.max(0,Math.cos(a))*(.35+.8*amp)*run;
   hip.rotation.x=(rear?-.25:0)+Math.sin(a)*amp*run;knee.rotation.x=(rear?.45:0)-bend*(rear?1.2:1.3);fet.rotation.x=(rear?.1:.2)-bend*.5;}
  body.position.y=Math.abs(Math.sin(phase))*.16*run;body.rotation.x=Math.sin(phase+Math.PI/2)*.045*run;torso.scale.y=1+Math.sin(time*2.2)*.008*(1-run);
  neck.rotation.x=-Math.sin(phase)*.08*run+Math.sin(time*.8)*.05*(1-run)+.25*neigh;head.rotation.x=pitch+Math.sin(phase+1)*.06*run+.75*neigh;head.rotation.y=Math.sin(time*.6)*.12*(1-run);
  for(const e of head.children)if(e.userData.s){e.rotation.x=.55-.35*run;e.rotation.z=-e.userData.s*.2+Math.sin(time*.9+e.userData.s)*.04+(Math.max(0,Math.sin(time*.37+e.userData.s*2)-.92)*3)*e.userData.s;}
  for(const {g,k,s,fore} of locks){g.rotation.x=fore?neigh*-.4:-.2*run-.45*neigh+Math.sin(time*3.1+k*.7)*.04;g.rotation.z=fore?0:s*(Math.sin(time*2.3+k)*.04+.08*run);}
  for(const {g,h,i} of tail){g.rotation.x=g.userData.fan+.1*(1-run)-.32*run+Math.sin(time*2.6+i*.5)*.05;g.rotation.z=Math.sin(time*2.1+i*.45)*(.08+.18*run);h.rotation.x=Math.sin(time*3.4+i*.5-1)*(.14+.12*run)-.1*run;h.rotation.z=Math.sin(time*2.7+i*.4)*.16*(.5+run);}
  star.scale.setScalar(.85+.3*Math.sin(time*5));star.rotation.z=time*1.2;
 }
 update(0,0,0);
 return {group,update,skins,honk(){hop=1;}};
}

// The fire engine: red, with a white stripe, lockers along the sides, a ladder on the roof, blue lights that flash and wheels that turn.
// The fire engine's beacons, two colours for each colour of game.js's picker (3 October 2026, the user: red is the standard fire engine, with blue
// lights; KIWI has green and white lights). 'rainbow' sends them round the rainbow; any other colour gets blue.
export const BEACONS={'#14171c':['#2a6bff','#ff2b2b'],'#c62828':['#2a6bff','#2a6bff'],'#ec6aa8':['#b04cff','#ffffff'],'#7b4cc2':['#ff5fb8','#ffd23a'],'#1f63c6':['#ff2b2b','#ffffff'],
 '#17a2a0':['#ffd23a','#ff5fb8'],'#3b9a43':['#ffd23a','#ffffff'],'#f3c531':['#ff8a00','#ff8a00'],'#f07b22':['#ffd23a','#2a6bff'],'#eef0ef':['#ff2b2b','#2a6bff'],kiwi:['#39d353','#ffffff']};
export function createFireTruck(T,{logos={}}={}){
 const group=new T.Group();group.name='Brannbil';
 const red=new T.MeshStandardMaterial({color:'#c62828',roughness:.45,metalness:.2}),white=new T.MeshStandardMaterial({color:'#f2f1ec',roughness:.5});
 const grey=new T.MeshStandardMaterial({color:'#9aa1a6',roughness:.4,metalness:.6}),tyre=new T.MeshStandardMaterial({color:'#1d1f22',roughness:.9}),glass=new T.MeshStandardMaterial({color:'#2d4654',roughness:.15,metalness:.5});
 const blue=[0,1].map(()=>new T.MeshStandardMaterial({color:'#2a6bff',emissive:'#2a6bff',emissiveIntensity:1,roughness:.3})),lamp=new T.MeshStandardMaterial({color:'#fff6d8',emissive:'#fff1b0',emissiveIntensity:.8});
 const box=new T.BoxGeometry(1,1,1),body=new T.Group();group.add(body);
 const part=(m,[x,y,z],[sx,sy,sz],parent=body,g=box)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
 part(red,[0,1.35,-1.75],[2.2,1.9,1.6]);part(glass,[0,1.75,-2.56],[2,.8,.04]);for(const s of [-1,1])part(glass,[s*1.11,1.8,-1.8],[.03,.65,1.1]);
 part(red,[0,1.45,.75],[2.2,2.1,3.5]);part(white,[0,1.05,-.4],[2.23,.16,5.3]);
 for(const s of [-1,1])for(const z of [-.2,.75,1.7])part(grey,[s*1.115,1.6,z],[.02,1.15,.85]); // the locker doors
 for(const s of [-1,1]){part(grey,[s*.4,2.6,.7],[.07,.1,4.2]);}for(let z=-1.2;z<=2.6;z+=.42)part(grey,[0,2.6,z],[.8,.06,.06]); // the ladder
 const lights=[-1,1].map((s,i)=>part(blue[i],[s*.45,2.4,-2.1],[.5,.2,.3]));
 for(const s of [-1,1])part(lamp,[s*.75,.85,-2.57],[.35,.22,.04]);part(grey,[0,.6,-2.6],[2.1,.25,.12]);
 // Each wheel hangs on a hinge group (5 October 2026), which the hover mode folds flat at the fire engine's side, under its body; the wheel inside it still rolls.
 const hinges=[],wheels=[[-1,-1.8],[1,-1.8],[-1,.6],[1,.6],[-1,1.7],[1,1.7]].map(([s,z])=>{const hinge=new T.Group();hinge.position.set(s*1.0,.48,z);hinge.userData.side=s;body.add(hinge);hinges.push(hinge);const w=new T.Group();hinge.add(w);
  part(tyre,[0,0,0],[.5,.3,.5],w,new T.CylinderGeometry(1,1,1,16)).rotation.z=Math.PI/2;part(grey,[s*.16,0,0],[.25,.04,.25],w,new T.CylinderGeometry(1,1,1,12)).rotation.z=Math.PI/2;return w;});
 // Hover mode (5 October 2026, "Back to the Future"; 6 October: like the DeLorean's): hover(h, time) with h from 0 to 1 folds the six wheels flat (the tyre's outer face turns
 // down) at the sides of the fire engine, just under its body, so about the outer half of each tyre sticks out; each has a cyan glow. h = 0 puts them back exactly. world.js lifts the fire engine with the same blend.
 const under=hoverGlow(T,hinges.length,2.1);body.add(under.group);
 function hover(h,time=0){under.show(h,time);hinges.forEach((hinge,i)=>{const side=hinge.userData.side;hinge.rotation.z=-side*h*Math.PI/2;hinge.position.x=side*(1+.05*h);hinge.position.y=.48-.26*h;under.discs[i].position.set(hinge.position.x,hinge.position.y-.14,hinge.position.z);});}
 const skins=flankLogos(T,body,logos,{cy:1.45,cz:.75,rx:1.15,ry:20,rz:20,w:1.4,h:.45,y:1.6,z:.75}); // 7 October 2026: on the locker doors (their faces are at 1.125), not behind them
 let flash=0,hop=0,rainbowLights=false;const hsl={h:0,s:0,l:0};
 // The paint is the car's colour (red by default, the standard fire engine); on a pale paint the stripe turns red. The beacons follow the colour chosen.
 function beacons(key){rainbowLights=key==='rainbow';const pair=BEACONS[key]||BEACONS[String(key).toLowerCase()]||['#2a6bff','#2a6bff'];pair.forEach((c,i)=>{blue[i].color.set(c);blue[i].emissive.set(c);});}
 function update(dt,speed,time,colour){
  if(colour){red.color.copy(colour);white.color.set(colour.getHSL(hsl).l>.75?'#c62828':'#f2f1ec');}
  if(rainbowLights)blue.forEach((m,i)=>{m.color.setHSL((time*.4+i*.5)%1,1,.55);m.emissive.copy(m.color);});
  for(const w of wheels)w.rotation.x-=speed*dt/.5;
  flash+=dt*(hop>0?14:6);const on=Math.sin(flash*Math.PI)>0;blue[0].emissiveIntensity=on?1.4:.1;blue[1].emissiveIntensity=on?.1:1.4;
  hop=Math.max(0,hop-dt/2);body.position.y=Math.sin(time*9)*.01*Math.min(1,speed/5);
 }
 update(0,0,0);
 return {group,update,skins,beacons,beaconColours:()=>blue.map(m=>'#'+m.emissive.getHexString()),paint:red,stripe:white,honk(){hop=1;},hover,hinges,wheels};
}

// The hot-air balloon: an envelope of gores in the car's colour and yellow, a basket on ropes, floating over the road; the burner puffs.
export function createBalloon(T,{logos={}}={}){
 const group=new T.Group();group.name='Luftballong';
 const paint=new T.MeshStandardMaterial({color:'#14171c',roughness:.6}),yellow=new T.MeshStandardMaterial({color:'#ffd34d',roughness:.6});
 const wicker=new T.MeshStandardMaterial({color:'#9a6a3a',roughness:.9}),rope=new T.MeshStandardMaterial({color:'#5a4a3a',roughness:.9});
 const flame=new T.Mesh(new T.ConeGeometry(.16,.6,10,1,true),new T.MeshBasicMaterial({color:'#ffb347',transparent:true,opacity:.85,depthWrite:false,side:T.DoubleSide}));
 const body=new T.Group();group.add(body);
 const G=12,envY=4.85; // the envelope sits high enough (5 October 2026) for a passenger standing in the basket to clear the burner and the skirt
 for(let k=0;k<G;k++){const g=new T.Mesh(new T.SphereGeometry(1.7,3,12,k*Math.PI*2/G,Math.PI*2/G,0,Math.PI*.78),k%2?yellow:paint);g.scale.set(1,1.12,1);g.position.y=envY;g.castShadow=true;body.add(g);}
 const skirt=new T.Mesh(new T.CylinderGeometry(1.08,.42,1.1,12,1,true),paint);skirt.position.y=envY-1.95;skirt.material=paint;body.add(skirt);
 // A roomy basket (1.6 m wide, its floor at .3 m, its rim at 1.2 m) with a rope from each corner to the skirt of the envelope.
 const basket=new T.Mesh(new T.BoxGeometry(1.6,.9,1.6),wicker);basket.position.y=.75;basket.castShadow=true;body.add(basket);
 for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const a=new T.Vector3(x*.72,1.2,z*.72),b=new T.Vector3(x*.7,3.3,z*.7),d=b.clone().sub(a),r=new T.Mesh(new T.CylinderGeometry(.025,.025,d.length(),4),rope);r.position.copy(a).addScaledVector(d,.5);r.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());body.add(r);}
 flame.position.y=2.5;body.add(flame);
 // Where a passenger stands (5 October 2026, the girl of world.js): on the basket's floor, inside the solid basket box, so only her waist up shows over the rim; it bobs with the basket.
 const seat=new T.Group();seat.position.y=.32;body.add(seat);
 const skins=flankLogos(T,body,logos,{cy:envY,cz:0,rx:1.72,ry:1.9,rz:1.72,w:1.5,h:.5,y:envY-.2,z:0});
 let hop=0;
 function update(dt,speed,time,colour){
  if(colour)paint.color.copy(colour);
  body.position.y=.35+Math.sin(time*1.1)*.18;body.rotation.z=Math.sin(time*.7)*.04;body.rotation.x=-.05*Math.min(1,speed/10);
  hop=Math.max(0,hop-dt);const puff=Math.max(0,Math.sin(time*1.7)-.6)/.4+hop*1.5;flame.scale.set(1,.2+puff,1);flame.visible=puff>.05;flame.position.y=2.5+.3*(.2+puff)/2;
 }
 update(0,0,0);
 return {group,update,skins,honk(){hop=1;},seat};
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
 const jaw=new T.Group();jaw.position.set(0,-.18,0);head.add(jaw);const grip=new T.Object3D();grip.position.set(.46,-.04,-.5);jaw.add(grip);part(sphere,skin,[0,-.12,-.4],[.42,.18,.7],jaw);part(sphere,mouth,[0,-.02,-.45],[.36,.08,.6],jaw);
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
 let phase=0,roar=0;const held={carrying:false};
 function update(dt,speed,time,colour){
  if(colour)skin.color.copy(colour);
  const run=Math.min(1,speed/5);phase+=dt*(1.8+speed*.35);
  legs.forEach(({hip,knee},i)=>{const p=phase+i*Math.PI;hip.rotation.x=Math.sin(p)*.65*run;knee.rotation.x=Math.max(0,-Math.cos(p))*.7*run;});
  body.position.y=Math.abs(Math.sin(phase))*.14*run;body.rotation.x=-.08*run+Math.sin(phase*2)*.03*run;
  tail.forEach((seg,i)=>{seg.rotation.y=Math.sin(time*(2+run*3)-i*.5)*(.12+.05*run);seg.rotation.x=i?.04:-.05;});
  arms.forEach((a,i)=>{a.rotation.x=Math.sin(phase+i)*.3*run;});
  roar=Math.max(0,roar-dt*.8);const open=Math.sin(Math.PI*Math.min(1,roar*1.3));jaw.rotation.x=Math.max(held.carrying?.3:0,.75*open+.06*run*Math.abs(Math.sin(phase)));head.rotation.x=-.25*open+Math.sin(phase*2)*.04*run;head.rotation.y=held.carrying?-.3+Math.sin(time*1.3)*.05:Math.sin(time*.6)*.15*(1-run);
 }
 update(0,0,0);
 return {group,update,skins,jaw,grip,honk(){roar=1;},get carrying(){return held.carrying;},set carrying(v){held.carrying=!!v;}};
}

// ---- The pig (5 October 2026, the reward for finding it hiding in the house): a big round pink pig with a curly tail that wiggles, a snout with two nostrils,
// floppy ears and four short legs that trot at the car's speed ----
// The body takes the paint colour like the dog and the cat do (pink to begin with, PIG_SKIN); the snout, the tail, the insides of the ears and the hooves are shades
// of it (a little darker, or a little lighter on a dark paint), so it reads as a pig in any colour; eyes and nostrils stay dark. With the KIWI skin it wears the logo on
// both flanks. honk() makes it hop and wiggle.
export const PIG_SKIN='#f3a6b8';
export function createPig(T,{logos={}}={}){
 const group=new T.Group();group.name='Gris'; // about 4.4 m long and 2.2 m high
 const std=(color,roughness=.7)=>new T.MeshStandardMaterial({color,roughness});
 const pink=std(PIG_SKIN),snoutPink=std('#e98aa2',.6),inner=std('#e47f9a'),nostril=std('#8a3a54',.6),hoof=std('#d9758f',.5),eye=new T.MeshBasicMaterial({color:'#2a1a1e'}),glint=new T.MeshBasicMaterial({color:'#ffffff'});
 const sphere=sphereGeo(T),limb=new T.CylinderGeometry(1,.82,1,12),cone=new T.ConeGeometry(1,1,3),barrel=new T.CylinderGeometry(1,1,1,18);
 const body=new T.Group();group.add(body);
 const part=(g,m,[x,y,z],[sx,sy,sz],parent=body)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
 const torso=part(sphere,pink,[0,1.38,.1],[1,.95,1.5]);
 const head=new T.Group();head.position.set(0,1.6,-1.55);body.add(head);
 part(sphere,pink,[0,0,0],[.8,.74,.72],head);
 part(barrel,snoutPink,[0,-.12,-.8],[.38,.36,.38],head).rotation.x=Math.PI/2;part(sphere,snoutPink,[0,-.12,-.97],[.38,.38,.14],head);
 for(const s of [-1,1]){part(sphere,nostril,[s*.14,-.12,-1.1],[.065,.095,.03],head);part(sphere,eye,[s*.42,.2,-.5],[.095,.11,.07],head);part(sphere,glint,[s*.44,.24,-.55],[.03,.03,.02],head);}
 const ears=[-1,1].map(s=>{const ear=new T.Group();ear.position.set(s*.46,.56,-.12);head.add(ear);part(cone,pink,[0,.27,0],[.38,.56,.08],ear);part(cone,inner,[0,.25,-.02],[.24,.4,.06],ear);ear.rotation.set(-1.2,0,s*.8);return ear;});
 const legs=[[-.55,-.85],[.55,-.85],[-.55,.95],[.55,.95]].map(([x,z])=>{const hip=new T.Group();hip.position.set(x,1,z);body.add(hip);
  part(limb,pink,[0,-.5,0],[.24,.97,.24],hip);part(sphere,hoof,[0,-.95,-.04],[.27,.1,.31],hip);return hip;});
 // The tail: a corkscrew of tube out of the rump, up and back, which wiggles from its root.
 const tail=new T.Group();tail.position.set(0,1.85,1.52);tail.rotation.x=-.4;body.add(tail);
 const curl=new T.CatmullRomCurve3(Array.from({length:30},(_,i)=>{const t=i/29,a=t*Math.PI*2*2.3,r=.14*(.55+.45*t);return new T.Vector3(r*Math.sin(a),r*(1-Math.cos(a)),.62*t);}));
 const spiral=new T.Mesh(new T.TubeGeometry(curl,90,.055,6,false),snoutPink);spiral.castShadow=true;tail.add(spiral);
 const skins=flankLogos(T,body,logos,{cy:1.38,cz:.1,rx:1,ry:.95,rz:1.5,w:1.4,h:.45,y:1.45,z:.25});
 // The paint: the body is the colour, the rest are shades of it (k times darker; on a dark paint, lighter, or they would vanish).
 const hsl={h:0,s:0,l:0};
 function dress(c){pink.color.copy(c);c.getHSL(hsl);const dark=hsl.l<.25,s=Math.min(1,hsl.s*1.08),shade=(m,k)=>m.color.setHSL(hsl.h,s,dark?hsl.l+.09*k:hsl.l*(1-.17*k));shade(snoutPink,1);shade(inner,1.5);shade(hoof,2.2);}
 let phase=0,hop=0;
 function update(dt,speed,time,colour){
  if(colour)dress(colour);
  const run=Math.min(1,speed/6),amp=.2+.55*Math.min(1,speed/14);phase+=dt*(1.8+speed*.5);
  const swing=[0,Math.PI,Math.PI,0].map(o=>Math.sin(phase+o)*amp*run);legs.forEach((leg,i)=>{leg.rotation.x=swing[i];}); // a trot: the diagonal pairs of legs go together
  hop=Math.max(0,hop-dt*1.3);const h=Math.sin(Math.PI*Math.min(1,hop));
  body.position.y=Math.abs(Math.sin(phase))*.1*run+h*.55;body.rotation.x=Math.sin(phase+Math.PI/2)*.03*run-h*.12;torso.scale.y=.95+Math.sin(time*2.2)*.012*(1-run);
  head.rotation.x=-Math.sin(phase+Math.PI/2)*.05*run+Math.sin(time*1.7)*.03*(1-run);head.rotation.y=Math.sin(time*.8)*.2*(1-run);
  ears.forEach((ear,i)=>{ear.rotation.x=-1.2+(Math.sin(phase*2+i)*.2*run)+h*.5;});
  tail.rotation.z=Math.sin(time*(5+3*run+9*h))*(.2+.4*h);tail.rotation.y=Math.sin(time*3.1+1)*(.18+.25*h);
 }
 update(0,0,0);
 return {group,update,skins,honk(){hop=1;},tones:{skin:pink,snout:snoutPink}};
}
