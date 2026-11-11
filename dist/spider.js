// The spider (11 November 2026, the user: "Add a spider vehicle. Sofia rides it. Unlocks on kinder garden goal after flying car."): the very last unlock, given on the
// first trip to the kindergarten after the hover car. A big, friendly jumping spider, the cutest kind there is: a round head-chest with two huge glossy eyes (two
// white glints each, lids that blink), four little eyes on top, fuzzy eyebrows, a smile with rosy cheeks, a fuzzy beard and two feelers that wiggle, and a big
// round abdomen with a heart and spots on it and a saddle on top, where Sofia (girl.js) sits astride and holds on to the pommel, her pigtails blowing back.
// Eight banded legs walk with a spider's real gait: two alternating groups of four (left 1, right 2, left 3, right 4, and the others), each foot planted on the
// ground while the body passes over it and then lifted in an arc to the front, the knees arching high over the body, solved every frame by two-bone inverse
// kinematics. Walking slowly, the stride matches the speed, so the feet do not slide; faster, it scuttles at up to five or six steps a second. Standing, it
// breathes, looks about, blinks and taps a front foot now and then. On the horn it rears up and waves its front legs, and Sofia waves.
// The same API as the rides in rides.js: update(dt, speed m/s, time, colour) with the paint colour (the head, the body and the legs; the bands, the heart, the spots,
// the knees, the brows and the beard are a light shade of it, or a dark one on a light paint), the KIWI logo on the abdomen's flanks (skins), honk(), and seat
// (where the rider sits). Forward is −z and the ground is y = 0. About 4.6 m long, 6 m across the feet and 2.4 m high to the saddle.
import {flankLogos} from './rides.js';

export const SPIDER_PURPLE='#7b4cc2';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=k=>k*k*(3-2*k);
// The head-chest (cephalothorax) and the abdomen, as ellipsoids: centre and radii. The abdomen hangs from the waist (its pivot), so it can sway and jiggle.
const CEPH={c:[0,1.2,-1.02],r:[.92,.72,1]},WAIST=[0,1.18,-.2],ABD={c:[0,.36,1.2],r:[1,.86,1.3]};
// The legs, front to back: where each joins the head-chest (the angle from straight ahead), where its foot stands (angle and distance from the head-chest's middle),
// the femur and the tibia (m; a short femur and a long tibia arch the knee high) and how stout it is (the front legs are the strongest, as on a jumping spider).
const LEGS=[{root:36,foot:40,reach:2.9,a:1.4,b:2.2,k:1.35},{root:64,foot:64,reach:2.8,a:1.4,b:2.15,k:1.15},{root:100,foot:104,reach:2.8,a:1.45,b:2.2,k:1.1},{root:134,foot:140,reach:3,a:1.55,b:2.4,k:1.15}];
const STRIDE=1.3,F_MIN=.7,F_MAX=5; // the longest stride without sliding (m); the slowest and the fastest step (Hz)

export function createSpider(T,{logos={},rider=null}={}){
 const group=new T.Group();group.name='Edderkopp';
 const std=(color,roughness=.85,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});
 const coat=std(SPIDER_PURPLE),light=std('#c9b4f4',.8),deep=std('#3e2470',.7);
 const gloss=std('#1d1526',.12,{metalness:.1}),glint=new T.MeshBasicMaterial({color:'#ffffff'}),blush=new T.MeshBasicMaterial({color:'#ff8fb1'}),dark=new T.MeshBasicMaterial({color:'#2a1530'});
 const leather=std('#8a4b2a',.55),strap=std('#5e3119',.6),blanket=std('#e5528f',.8),trim=std('#ffd34d',.6);
 const sphere=new T.SphereGeometry(1,28,18),ball=new T.SphereGeometry(1,14,10),cone=new T.ConeGeometry(1,1,10),cyl=new T.CylinderGeometry(1,1,1,14);
 const V=(x,y,z)=>new T.Vector3(x,y,z),UP=V(0,1,0);
 const part=(g,m,[x,y,z],[sx,sy,sz],parent)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
 // A point on the head-chest's surface: its front (z) for a given x and y, or its top (y) for a given x and z, pushed out by `out` metres; in the face's frame.
 const [cx,cy,cz]=CEPH.c,[rx,ry,rz]=CEPH.r,F=(x,y,z)=>[x-cx,y-cy,z-cz];
 const front=(x,y,out=0)=>F(x,y,cz-(rz+out)*Math.sqrt(Math.max(0,1-(x/rx)**2-((y-cy)/ry)**2))),top=(x,z,out=0)=>F(x,cy+(ry+out)*Math.sqrt(Math.max(0,1-(x/rx)**2-((z-cz)/rz)**2)),z);
 // Lays a flat shape (in the xy plane) onto an ellipsoid (centre c, radii r): on the plane touching it in the direction dir, every point pushed out from the
 // centre onto the surface and lift metres beyond, so a heart, a spot or the saddle blanket hugs the round body.
 function onShell(geo,c,r,dir,lift=.02){const n=dir.clone().normalize(),t=1/Math.hypot(n.x/r[0],n.y/r[1],n.z/r[2]),p0=n.clone().multiplyScalar(t);
  const e1=Math.abs(n.y)>.98?V(1,0,0):UP.clone().cross(n).normalize(),e2=n.clone().cross(e1).normalize(),p=geo.attributes.position,q=V(0,0,0);
  for(let i=0;i<p.count;i++){q.copy(p0).addScaledVector(e1,p.getX(i)).addScaledVector(e2,p.getY(i));const k=1/Math.hypot(q.x/r[0],q.y/r[1],q.z/r[2]);q.multiplyScalar(k);
   const len=q.length();q.multiplyScalar((len+lift)/len);p.setXYZ(i,c[0]+q.x,c[1]+q.y,c[2]+q.z);}
  geo.computeVertexNormals();return geo;}
 const shell=(geo,m,c,r,dir,lift,parent)=>{const o=new T.Mesh(onShell(geo,c,r,dir,lift),m);o.receiveShadow=true;parent.add(o);return o;};

 // ---- The body: bobs, rolls and pitches as it walks; the legs are not in it (their feet stay on the ground), but their roots follow it ----
 const body=new T.Group();group.add(body);
 part(sphere,coat,CEPH.c,CEPH.r,body);
 // The face, which turns a little as the spider looks about.
 const face=new T.Group();face.position.set(...CEPH.c);body.add(face);
 // Two huge glossy eyes, set into the front with a light rim; two glints each; a lid of fur over each that closes to blink.
 const eyes=[-1,1].map(s=>{const eye=new T.Group(),[x,y,z]=front(s*.34,cy+.15,-.11);eye.position.set(x,y,z);face.add(eye);
  part(sphere,light,[0,0,.02],[.375,.375,.375],eye);part(sphere,gloss,[0,0,-.02],[.35,.35,.35],eye);
  part(ball,glint,[-.11,.13,-.305],[.1,.1,.045],eye);part(ball,glint,[.1,-.09,-.33],[.045,.045,.02],eye);
  const lid=new T.Mesh(new T.SphereGeometry(.39,24,12,0,TAU,0,Math.PI/2),coat);lid.castShadow=true;eye.add(lid);return {eye,lid};});
 // Four little eyes on top, as on a jumping spider; a fuzzy brow over each big eye (two little tufts that lift when it rears up).
 for(const s of [-1,1]){part(ball,gloss,top(s*.48,cz-.35,-.03),[.09,.09,.09],face);part(ball,gloss,top(s*.2,cz-.62,-.02),[.065,.065,.065],face);}
 const BROW_Y=front(0,cy+.5,-.04)[1],brows=[-1,1].map(s=>{const b=new T.Group(),[x,y,z]=front(s*.34,cy+.5,-.04);b.position.set(x,y,z);b.userData.s=s;face.add(b);
  for(const [dx,h,r] of [[-.07,.26,-.35],[.07,.22,-.65]]){const t=part(cone,light,[s*dx,.1,0],[.06,h,.06],b);t.rotation.set(-.45,0,s*r);}return b;});
 // The smile, rosy cheeks and a fuzzy beard (two round tufts under the smile), and two feelers (pedipalps) with round fuzzy tips.
 const smile=part(new T.TorusGeometry(1,.2,8,16,Math.PI),dark,front(0,cy-.24,.02),[.14,.11,.08],face);smile.rotation.z=Math.PI;
 for(const s of [-1,1])part(ball,blush,front(s*.56,cy-.1,-.02),[.13,.08,.06],face).rotation.y=s*.65;
 for(const s of [-1,1])part(ball,light,front(s*.12,cy-.42,-.06),[.15,.16,.13],face);
 const palps=[-1,1].map(s=>{const p=new T.Group(),[x,y,z]=front(s*.36,cy-.34,-.08);p.position.set(x,y,z);face.add(p);
  part(cyl,coat,[0,-.2,-.08],[.075,.42,.075],p).rotation.x=.35;part(ball,light,[0,-.42,-.17],[.13,.13,.13],p);return p;});

 // ---- The abdomen, hung from the waist: a heart and spots on its back, a spinneret, a strap round it and the saddle on top ----
 const abd=new T.Group();abd.position.set(...WAIST);body.add(abd);
 part(sphere,coat,ABD.c,ABD.r,abd);
 const heart=new T.Shape();heart.moveTo(0,-.45);heart.bezierCurveTo(-.15,-.3,-.5,-.1,-.5,.15);heart.bezierCurveTo(-.5,.42,-.22,.52,0,.3);heart.bezierCurveTo(.22,.52,.5,.42,.5,.15);heart.bezierCurveTo(.5,-.1,.15,-.3,0,-.45);
 shell(new T.ShapeGeometry(heart,14).scale(.95,.95,1),light,ABD.c,ABD.r,V(0,.5,.87),.02,abd);
 for(const s of [-1,1])for(const [y,z,r] of [[.2,.55,.14],[.05,.15,.12],[-.15,.65,.1],[.42,.85,.09]])shell(new T.CircleGeometry(r,16),light,ABD.c,ABD.r,V(s*.9,y,z),.02,abd);
 part(cone,deep,[0,ABD.c[1]-.25,ABD.c[2]+ABD.r[2]-.05],[.12,.25,.12],abd).rotation.x=Math.PI/2+.5;
 // The saddle sits on the top of the abdomen, a little forward of its middle; a strap goes round the abdomen under it.
 const SEAT_DIR=V(0,.97,-.24).normalize(),seatT=1/Math.hypot(SEAT_DIR.x/ABD.r[0],SEAT_DIR.y/ABD.r[1],SEAT_DIR.z/ABD.r[2]),SEAT=[ABD.c[0],ABD.c[1]+SEAT_DIR.y*seatT,ABD.c[2]+SEAT_DIR.z*seatT];
 {const k=Math.sqrt(1-((SEAT[2]-ABD.c[2])/ABD.r[2])**2);part(new T.TorusGeometry(1,.045,8,40),strap,[0,ABD.c[1],SEAT[2]],[ABD.r[0]*k+.02,ABD.r[1]*k+.02,1],abd).castShadow=false;}
 shell(new T.CircleGeometry(.62,28).scale(1,1.15,1),trim,ABD.c,ABD.r,SEAT_DIR,.025,abd);shell(new T.CircleGeometry(.55,28).scale(1,1.15,1),blanket,ABD.c,ABD.r,SEAT_DIR,.035,abd);
 const saddle=new T.Group();saddle.position.set(...SEAT);saddle.quaternion.setFromUnitVectors(UP,SEAT_DIR);abd.add(saddle);
 part(sphere,leather,[0,.07,0],[.36,.1,.42],saddle);part(sphere,leather,[0,.14,.36],[.32,.13,.09],saddle);
 part(cyl,strap,[0,.2,-.36],[.05,.22,.05],saddle);part(ball,leather,[0,.32,-.36],[.09,.07,.09],saddle);
 const seat=new T.Group();seat.position.set(0,.14,.02);saddle.add(seat);
 const skins=flankLogos(T,abd,logos,{cy:ABD.c[1],cz:ABD.c[2],rx:ABD.r[0],ry:ABD.r[1],rz:ABD.r[2],w:1.25,h:.36,y:ABD.c[1]-.15,z:ABD.c[2]+.1});

 // ---- The legs: a femur from the head-chest up to a high knee, a banded tibia down to a round foot. Built along +y and turned into place every frame. ----
 const legs=[];
 LEGS.forEach((L,pair)=>{for(const s of [-1,1]){const k=L.k,ra=L.root*Math.PI/180,fa=L.foot*Math.PI/180;
  const femur=new T.Mesh(new T.CylinderGeometry(.13*k,.165*k,L.a,14).translate(0,L.a/2,0),coat),tibia=new T.Mesh(new T.CylinderGeometry(.075*k,.125*k,L.b,14).translate(0,L.b/2,0),coat);
  const knee=new T.Mesh(ball,light),foot=new T.Mesh(ball,deep);knee.scale.setScalar(.16*k);foot.scale.set(.13*k,.1*k,.15*k);
  for(const [t,r] of [[.3,.116],[.62,.1]]){const b=new T.Mesh(cyl,light);b.scale.set(r*k,.11,r*k);b.position.y=t*L.b;tibia.add(b);}
  for(const o of [femur,tibia,knee,foot]){o.castShadow=true;group.add(o);}
  legs.push({s,pair,a:L.a,b:L.b,fr:.1*k,femur,tibia,knee,foot,root:V(s*rx*.85*Math.sin(ra),cy-.12,cz-rz*.85*Math.cos(ra)),
   rest:V(s*L.reach*Math.sin(fa),0,cz-L.reach*Math.cos(fa)),g:(pair+(s<0?0:1))%2});}}); // two alternating groups of four (g), each with a little ripple front to back (update)

 // ---- Sofia on the saddle (the girl of girl.js, as tall as in the balloon): astride, holding the pommel ----
 const RIDE_Y=-.42*1.75+.1;
 if(rider){rider.group.scale.setScalar(1.75);rider.group.position.set(0,RIDE_Y,.06);seat.add(rider.group);}

 // ---- The paint: the head, the body and the legs are the colour; the rest are shades of it ----
 const hsl={h:0,s:0,l:0};
 function dress(c){coat.color.copy(c);c.getHSL(hsl);const lightPaint=hsl.l>.62;
  light.color.setHSL(hsl.h,hsl.s*.75,lightPaint?hsl.l*.62:Math.min(.9,hsl.l+.34));deep.color.setHSL(hsl.h,hsl.s*.9,hsl.l<.22?hsl.l+.06:hsl.l*.5);}

 // ---- Animation ----
 const rootW=V(0,0,0),target=V(0,0,0),wave=V(0,0,0),kneeAt=V(0,0,0),dir=V(0,0,0),hor=V(0,0,0);
 let phase=0,stride=0,lift=0,rear=0,blinkAt=3.3;
 // Two-bone IK in the upright plane through the root and the target: the knee bends upwards, the foot ends at the target (or as near as the leg reaches).
 function place(leg){const {a,b}=leg;hor.set(target.x-rootW.x,0,target.z-rootW.z);const d=Math.max(1e-4,hor.length());hor.multiplyScalar(1/d);
  const h=target.y-rootW.y,D=clamp(Math.hypot(d,h),Math.abs(a-b)+.02,a+b-.02),el=Math.atan2(h,d)+Math.acos(clamp((a*a+D*D-b*b)/(2*a*D),-1,1));
  kneeAt.copy(rootW).addScaledVector(hor,a*Math.cos(el));kneeAt.y+=a*Math.sin(el);
  leg.femur.position.copy(rootW);dir.subVectors(kneeAt,rootW).normalize();leg.femur.quaternion.setFromUnitVectors(UP,dir);
  leg.knee.position.copy(kneeAt);leg.tibia.position.copy(kneeAt);dir.subVectors(target,kneeAt).normalize();leg.tibia.quaternion.setFromUnitVectors(UP,dir);
  leg.foot.position.copy(kneeAt).addScaledVector(dir,b);leg.foot.rotation.y=Math.atan2(dir.x,dir.z);}
 function update(dt,speed,time,colour){
  if(colour)dress(colour);
  const run=clamp(speed/8,0,1),go=clamp(speed/.6,0,1),duty=.62-.12*clamp(speed/10,0,1);
  // the step: as many as the speed needs for a stride of up to STRIDE (feet planted while they bear), never slower than F_MIN or faster than F_MAX (a little
  // more at motorway speeds, a scuttle)
  const f=clamp(speed*duty/STRIDE,F_MIN,F_MAX+clamp((speed-20)/40,0,1)),want=Math.min(STRIDE*1.15,speed*duty/f);
  phase+=dt*f;stride+=(want-stride)*(1-Math.exp(-dt*8));lift+=((.25+.3*clamp(stride/STRIDE,0,1))*go-lift)*(1-Math.exp(-dt*8));
  rear=Math.max(0,rear-dt*.75);const up=rear>0?Math.sin(Math.PI*(1-rear)):0; // the honk: rears up and waves its front legs for 1.3 s
  // the body: a bob twice a step (each group of four takes the weight in turn), a little roll, leaning into the run; up and back when it rears
  body.position.y=.05*run*Math.cos(TAU*2*phase)+.02*Math.sin(time*1.6)*(1-go)+.3*up;
  body.rotation.x=-.05*run+.28*up;body.rotation.z=.03*run*Math.sin(TAU*phase);body.updateMatrix();
  abd.rotation.x=.06*run*Math.sin(TAU*2*phase-.9)+.025*Math.sin(time*1.6)*(1-go)-.1*up;abd.rotation.z=.04*run*Math.sin(TAU*phase-.6);abd.scale.setScalar(1+.012*Math.sin(time*1.6)*(1-go));
  const ripple=.05*(1-.6*run),idle=1-go,tapLeg=Math.floor(time/6.5)%2?1:0,tap=(time%6.5)<1.1?Math.abs(Math.sin(Math.PI*(time%6.5)/.55))*idle:0; // standing: now and then a front foot taps twice
  for(const leg of legs){
   rootW.copy(leg.root).applyMatrix4(body.matrix);
   const u=((phase+leg.g*.5+leg.pair*ripple)%1+1)%1;let dz,dy=0;
   if(u<duty)dz=stride*(-.5+u/duty);else{const t=(u-duty)/(1-duty);dz=stride*(.5-smooth(t));dy=lift*Math.sin(Math.PI*t);}
   target.set(leg.rest.x,leg.fr+dy,leg.rest.z+dz); // the foot ball's middle: standing, it rests on the ground
   if(leg.pair===0&&(leg.s<0?0:1)===tapLeg&&tap)target.y=leg.fr+.3*tap;
   // rearing up: the front legs go up and out to the sides (beside the face, not in front of it) and wave, blended from wherever the step had them
   if(leg.pair===0&&up){const w=Math.sin(time*11+leg.s*1.3);wave.set(leg.rest.x*1.12+leg.s*.18*w,2.35+.25*Math.cos(time*11+leg.s),leg.rest.z+1.1);target.lerp(wave,up);}
   else if(leg.pair===1&&up)target.y=Math.max(target.y,leg.fr+.3*up);
   place(leg);}
  // the face: looks about while standing, eyes wide on the horn, a blink every few seconds
  face.rotation.y=(.16*Math.sin(time*.45)+.06*Math.sin(time*1.3))*idle;face.rotation.x=.05*Math.sin(time*.8)*idle-.1*up;
  if(time>=blinkAt+.16||time<blinkAt-10)blinkAt=time+2.2+((Math.sin(time*12.9898)*43758.5453)%1+1)%1*3;
  const blink=time>=blinkAt?Math.sin(Math.PI*(time-blinkAt)/.16):0,open=1.25+.3*up;
  for(let i=0;i<2;i++){const e=eyes[i],b=brows[i],p=palps[i],s=i?-1:1;e.lid.rotation.x=open-(open+Math.PI/2)*blink;e.eye.scale.setScalar(1+.12*up);
   b.position.y=BROW_Y+.06*up;b.rotation.z=s*.15*up;p.rotation.x=.25*Math.sin(time*(2.4+4*run)+i*1.7)-.2*up;p.rotation.z=s*(.08+.06*Math.sin(time*1.9+i));}
  if(rider)ride(dt,speed,time,run,idle,up);
 }
 // Sofia: astride (her legs out and down round the abdomen), both hands on the pommel, leaning into the run with her pigtails blowing back; she bobs with
 // the saddle, waves now and then while standing, and waves when the spider rears up.
 function ride(dt,speed,time,run,idle,up){
  const wave=Math.max(up,idle*clamp(Math.sin(time*.5)*1.7-.9,0,1));rider.update(dt,0,time,wave);
  for(let i=0;i<2;i++){const s=i?1:-1;rider.legs[i].rotation.set(.22+.05*Math.sin(TAU*2*phase)*run,0,s*.95);if(!i||wave<=.02)rider.arms[i].rotation.set(.95+.05*run,0,-s*.32);}
  rider.group.rotation.x=-.16*run+.12*up;rider.group.position.y=RIDE_Y+.04*run*Math.abs(Math.sin(TAU*2*phase));
  const wind=clamp(speed/18,0,1);for(let i=0;i<2;i++)rider.pigtails[i].rotation.x+=-.95*wind+.12*wind*Math.sin(time*13+i*2);
  rider.head.rotation.y*=1-run;rider.head.rotation.z*=1-run; // she looks about while it stands (girl.js), ahead while it runs
 }
 update(0,0,0);
 return {group,update,skins,seat,honk(){rear=1;},get rearing(){return rear>0;}};
}
