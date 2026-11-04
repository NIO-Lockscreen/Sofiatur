// Inside the house (5 October 2026): the "Gå inn" button on the start screen opens a cosy room, drawn with the world's renderer (game.js hands it over, so the
// WebGL renderer and the software one both work). A podium, "pallen", against the back wall has a place for each of the 19 unlocks: a little turning model of the real
// one, a medallion with its emoji where it has no model, a grey "?" where it is still locked. Tapping a place is picked here (pick) and told to game.js, which says how
// it was unlocked or gives a hint; the girl (girl.js) walks to where you tap, and a pig hides behind the sofa until it is tapped (game.js findPig).
// A separate scene and camera, lit by a hemisphere light and one warm light, no shadows. Solid colours only: the software renderer skips see-through things and ignores lights.
// Bedtime (4 November 2026, copied from Sofia's space game): the sofa is a sofa bed. A tap on it (game.js calls sleep) walks the girl over; she pulls the bed out,
// hops in and lies down under the duvet with her eyes shut. The camera glides in, night falls in the window, and she dreams (dream.js). wake() gets her up again.
import {createGirlModel} from './girl.js';
import {createET5} from './car-model.js';
import {createCat} from './cat-model.js';
import {createDog,createRideDuck,createRocket,createUnicorn,createFireTruck,createBalloon,createTRex,createPig,PIG_SKIN} from './rides.js';
import {createBoyModel} from './boy.js';
import {createDuckRunnerModel} from './duck-runner.js';
import {createDream} from './dream.js';

// The three steps of the podium, from the front (low) to the back (high): item ids in order, the height of the step's top, its middle z and its width. 1 m is a slot.
export const STEPS=[{ids:['colour','cat','trail','horn','dog','duck','rocket'],top:.35,z:-.5,w:8.6},{ids:['unicorn','bubbles','firetruck','rainbow','balloon','trex'],top:.7,z:-1.7,w:7.4},{ids:['kiwi','ludvig','duckRunner','taxi','pig','hover'],top:1.05,z:-2.9,w:7.4}];
const SLOT=1.2,TARGET=1,ROOM={x:4.5,front:3,back:-3.5,height:3.6}; // slot spacing; the size a model is fitted to (m); the room's half width, front and back edges, wall height
// What each model is dressed in on the podium (the colour its ride would take; the cars and the rainbow have their own; the pig is always pig-pink).
const PAINT={pig:PIG_SKIN,cat:'#e07b39',dog:'#b9824a',duck:'#8a7a68',rocket:'#d94a4a',unicorn:'#f4efff',firetruck:'#c62828',balloon:'#e5528f',trex:'#4caf50'};
const RIM={colour:'#ff6b6b',trail:'#5ccf66',bubbles:'#41a7f4',horn:'#ffc83d',hover:'#8b6cf0'}; // a medallion's rim
const HIDE={x:-4.2,z:2.65},OUT={x:.95,z:1.95,yaw:Math.PI-.5}; // the pig behind the sofa, and on the rug once found
// The sofa bed: where she takes hold of the seat, facing the sofa, and where she stands once she has pulled it out (PULL m); how she lies (her feet towards the open front, her head on the pillow at the back, propped up
// a little so her face shows over the duvet); the middle of the dream bubble and its size, and the way the Z's drift (towards the wall, away from the bubble).
const GRAB={x:-2.82,z:1.55,yaw:Math.PI/2},SIDE={x:-2.47,z:1.55},PULL=.35,LIE={x:-3.3,y:.7,z:1.81,yaw:Math.PI,tilt:1.23},BUBBLE={x:-2.2,y:2.7,z:1.3,size:.75},ZSIDE=[-.85,0,.5];
const MODELS=new Set(['cat','dog','duck','rocket','unicorn','firetruck','rainbow','balloon','trex','kiwi','ludvig','duckRunner','taxi','pig']); // the podium's places with a model of their own
const ease=k=>k*k*(3-2*k);

export function createInside({T,renderer,canvas}){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.1,120);scene.background=new T.Color('#f3e7d3');
 const std=(color,roughness=.85,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});
 const blockers=[],pickables=[]; // blockers: walls, the podium and the furniture, which a tap cannot go through
 function add(g,m,x,y,z,parent=scene,kind=null){const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);if(kind){o.userData.kind=kind;(kind==='block'?blockers:pickables).push(o);}return o;}
 const box=(w,h,d,m,x,y,z,parent,kind)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,parent,kind),cyl=(rt,rb,h,m,x,y,z,parent,kind,seg=24)=>add(new T.CylinderGeometry(rt,rb,h,seg),m,x,y,z,parent,kind),ball=(r,m,x,y,z,parent)=>add(new T.SphereGeometry(r,16,10),m,x,y,z,parent);
 const hemi=new T.HemisphereLight('#fff4e2','#c9a77c',1.9);scene.add(hemi);const lamp=new T.DirectionalLight('#ffdfb0',2.3);lamp.position.set(-3,8,7);scene.add(lamp);
 // ---- The room: a wooden floor with plank lines, three walls with skirting boards (the front is open, like a dollhouse), a backdrop so nothing outside shows through ----
 const backdrop=new T.MeshBasicMaterial({color:'#f3e7d3',toneMapped:false}); // darkens to night while she sleeps
 add(new T.PlaneGeometry(80,40),backdrop,0,8,-10);
 add(new T.PlaneGeometry(80,60),backdrop,0,-.22,8).rotation.x=-Math.PI/2; // and under it, for what the camera sees below the open front
 const wood=std('#c98f56',.8),seam=std('#a8703c',.9),wall=std('#f5e7d0'),side=std('#eedac0'),skirting=std('#fffaf0'),white=std('#fffaf0'),gold=std('#e3b23c',.35,{metalness:.5}),cream=std('#f6e7c1');
 box(9,.2,6.5,wood,0,-.1,-.25); // the floor is no blocker: a tap on it walks the girl there
 let n=7;const rnd=()=>(n=(n*1664525+1013904223)>>>0)/4294967296;
 for(let k=1;k<13;k++){const z=ROOM.back+k*.5;box(9,.004,.014,seam,0,.003,z);for(let j=0;j<2;j++)box(.014,.004,.5,seam,(rnd()-.5)*8.4,.003,z-.25);}
 box(9.4,ROOM.height,.2,wall,0,ROOM.height/2,-3.6,scene,'block');box(.2,ROOM.height,6.8,side,-4.6,ROOM.height/2,-.3,scene,'block');box(.2,ROOM.height,6.8,side,4.6,ROOM.height/2,-.3,scene,'block');
 box(9,.16,.05,skirting,0,.08,-3.475);box(.05,.16,6.4,skirting,-4.475,.08,-.25);box(.05,.16,6.4,skirting,4.475,.08,-.25);
 // The window on the back wall, over the podium, with curtains; pictures on each side of it.
 const night={glass:null,sky:[]}; // the window's glass, and the moon and stars that come out in it at night
 {const frame=std('#ffffff',.6),glass=new T.MeshBasicMaterial({color:'#bfe6f7'}),rod=gold,curtain=std('#e5528f'),curtain2=std('#f08cb8'),z=-3.47;
  add(new T.PlaneGeometry(2.1,1.05),glass,0,2.95,z+.012);night.glass=glass;
  // at night: a crescent moon (a yellow disc with one of the glass in front of it) and five stars
  {const moon=add(new T.CircleGeometry(.16,24),new T.MeshBasicMaterial({color:'#fff3c4'}),.62,3.2,z+.016),cut=add(new T.CircleGeometry(.14,24),glass,.69,3.25,z+.018);night.sky.push([moon,1],[cut,1]);
   const shape=new T.Shape();for(let i=0;i<10;i++){const r=i%2?.45:1,a=Math.PI/2+i*Math.PI/5;shape[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}const star=new T.ShapeGeometry(shape),light=new T.MeshBasicMaterial({color:'#fff1b8'});
   for(const [x,y,r] of [[-.75,3.3,.05],[-.3,3.12,.035],[-.62,2.68,.04],[.3,2.7,.03],[.85,2.6,.045]])night.sky.push([add(star,light,x,y,z+.016),r]);for(const [o] of night.sky)o.visible=false;}box(2.3,.1,.08,frame,0,3.5,z);box(2.3,.1,.08,frame,0,2.4,z);box(.1,1.2,.08,frame,-1.1,2.95,z);box(.1,1.2,.08,frame,1.1,2.95,z);box(.06,1.05,.06,frame,0,2.95,z+.01);box(2.1,.05,.06,frame,0,2.95,z+.01);
  cyl(.03,.03,3.1,rod,0,3.62,z+.04).rotation.z=Math.PI/2;
  for(const s of [-1,1]){box(.62,1.55,.1,curtain,s*1.45,2.85,z+.06);box(.2,1.55,.11,curtain2,s*1.2,2.85,z+.07);ball(.04,gold,s*1.2,2.4,z+.14);}
  // A child's drawing of the car, and a rainbow.
  box(1.15,.9,.04,std('#8a5a3a'),-3.4,2.85,-3.47);add(new T.PlaneGeometry(1.0,.75),new T.MeshBasicMaterial({color:'#fffdf4'}),-3.4,2.85,-3.448);
  const ink=(w,h,color,x,y,r=0)=>{add(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color}),-3.4+x,2.85+y,-3.444+r*.001);};
  ink(1,.2,'#7ccb5a',0,-.275);ink(.5,.17,'#e5373a',0,-.12,1);ink(.26,.12,'#e5373a',-.02,0,1);ink(.18,.08,'#9bd8f2',-.02,0,2);for(const x of [-.15,.15]){add(new T.CircleGeometry(.065,14),new T.MeshBasicMaterial({color:'#1d2226'}),-3.4+x,2.85-.2,-3.442);}
  add(new T.CircleGeometry(.1,16),new T.MeshBasicMaterial({color:'#ffd23a'}),-3.4+.33,2.85+.22,-3.446);
  box(1.15,.9,.04,std('#8a5a3a'),3.4,2.85,-3.47);add(new T.PlaneGeometry(1.0,.75),new T.MeshBasicMaterial({color:'#fffdf4'}),3.4,2.85,-3.448);
  ['#e5373a','#ff9a2e','#ffd23a','#5ccf66','#41a7f4','#8b6cf0'].forEach((c,i)=>{add(new T.TorusGeometry(.4-i*.045,.025,6,24,Math.PI),new T.MeshBasicMaterial({color:c}),3.4,2.58,-3.444);});}
 // ---- The rug, the sofa (the pig hides behind it), a floor lamp, a plant and the door ----
 {const rug=std('#e8788f',.95),ring=std('#f7e3c0',.95);cyl(1.55,1.55,.02,rug,0,.01,1.4);cyl(1.25,1.25,.026,ring,0,.013,1.4);cyl(.95,.95,.032,rug,0,.016,1.4);cyl(.5,.5,.038,ring,0,.019,1.4);}
 // The sofa is a sofa bed (4 November 2026): a tap on it is a tap on the bed. It opens with its own parts: the two throw pillows are laid down as her pillow at
 // the head end, the seat slides out towards the room (on two legs of its own) and the back folds down flat into the gap behind it, level with the seat cushions.
 // Then a duvet comes, folded at the foot end until she lies down, when it is pulled up to her shoulders. No mattress and no sheet: she sleeps on the sofa.
 const sofaBed={};
 {const sofa=new T.Group();sofa.position.set(-3.55,0,1.45);scene.add(sofa);const cloth=std('#5b8fb9'),soft=std('#7aa6cb'),leg=std('#5a3d28');
  const seat=new T.Group();sofa.add(seat);box(.95,.4,2.1,cloth,0,.32,0,seat,'bed');const cushions=[-1,1].map(s=>box(.62,.14,.82,soft,.1,.58,s*.45,seat));
  const seatLegs=[-1,1].map(s=>{const hinge=new T.Group();hinge.position.set(.4,.12,s*.7);seat.add(hinge);cyl(.035,.035,.12,leg,0,-.06,0,hinge);return hinge;}); // fold down as it comes out
  box(.355,.27,2.1,cloth,-.3,.255,0,sofa,'bed'); // the frame under the back, hidden in the seat until the seat slides out
  const back=box(.26,.62,2.1,cloth,-.35,.85,0,sofa,'bed');for(const s of [-1,1])box(.95,.3,.24,cloth,0,.6,s*.93,sofa,'bed');
  for(const s of [-1,1])for(const x of [-.38,.38])cyl(.04,.04,.15,leg,x,.075,s*.92,sofa);
  const p1=box(.14,.34,.34,std('#f6c445'),-.2,.9,-.5,sofa);p1.rotation.z=-.25;const p2=box(.14,.3,.3,std('#ec6aa8'),-.2,.88,.55,sofa);p2.rotation.z=-.2;p2.rotation.x=.2;
  // the duvet: a long soft roll over her, with a cream folded edge at the top
  const duvet=new T.Group();duvet.position.set(.25,.62,.5);sofa.add(duvet);const roll=new T.CylinderGeometry(1,1,1,28); // the duvet group sits around the middle of where it lies, so it can flutter and unfold about it
  const turquoise=std('#79e4e2'),cover=add(roll,turquoise,0,0,0,duvet),fold=add(roll,std('#f5efe2'),0,0,0,duvet),end=ball(1,turquoise,0,0,0,duvet);cover.rotation.x=fold.rotation.x=Math.PI/2; // end: the rounded foot end
  Object.assign(sofaBed,{group:sofa,seat,seatLegs,cushions,back,p1,p2,duvet,cover,fold,end});}
 const shade=std('#ffe29a',.6,{emissive:'#ffc860',emissiveIntensity:.5}); // glows a little brighter at night
 {const post=std('#6b4a2e');cyl(.22,.25,.04,post,4.05,.02,.4);cyl(.025,.025,1.5,post,4.05,.78,.4,scene,'block');cyl(.2,.3,.38,shade,4.05,1.65,.4,scene,'block');}
 {const pot=std('#c2693f'),leaf=std('#4aa04a');cyl(.22,.17,.36,pot,4,.18,2.6,scene,'block');for(let k=0;k<8;k++){const a=k*.8,l=ball(1,leaf,4+Math.cos(a)*.14,.7+(k%3)*.12,2.6+Math.sin(a)*.14);l.scale.set(.06,.34,.11);l.rotation.set(Math.sin(a)*.5,-a,Math.cos(a)*.5);}}
 const door=box(.08,2.1,1.05,std('#9a6a42'),4.45,1.05,1.5,scene,'door'); // tapping it leads out
 {const trim=std('#fffaf0');box(.1,2.2,.07,trim,4.45,1.1,.94);box(.1,2.2,.07,trim,4.45,1.1,2.06);box(.1,.08,1.2,trim,4.45,2.18,1.5);ball(.05,gold,4.38,1.05,1.95);box(.7,.03,.5,std('#b5654a'),3.95,.015,1.5);
  for(const z of [1.2,1.8])box(.02,.7,.34,std('#8a5a3a'),4.4,1.6,z);}
 // ---- The podium: three white steps with gold edges; a round pedestal, a place and an invisible hit box for each of the 19 unlocks ----
 const slots=[];
 for(const step of STEPS){box(step.w,step.top,1.2,white,0,step.top/2,step.z,scene,'block');box(step.w+.06,.05,.07,gold,0,step.top-.02,step.z+.6);box(step.w+.06,.05,.07,gold,0,step.top-.02,step.z-.6);
  step.ids.forEach((id,j)=>{const x=(j-(step.ids.length-1)/2)*SLOT,base=step.top;cyl(.4,.46,.2,cream,x,base+.1,step.z);cyl(.42,.42,.02,gold,x,base+.21,step.z);
   const holder=new T.Group();holder.position.set(x,base+.22,step.z);scene.add(holder);
   const hit=box(SLOT-.05,1.1,.8,new T.MeshBasicMaterial({color:'#ff00ff'}),x,base+.62,step.z,scene,'item');hit.visible=false;hit.userData.id=id; // low and shallow enough that a tap on a back place does not hit the front one
   slots.push({id,x,z:step.z,base,holder,hit,content:null,key:''});});}
 // ---- What stands on a place ----
 const cache=new Map();let items=[];
 function visibleBox(o){const b=new T.Box3();o.updateWorldMatrix(true,true);o.traverseVisible(m=>{if(m.isMesh)b.expandByObject(m,false);});return b;}
 // A model fitted to TARGET metres and standing on the pedestal, turning slowly: spin holds the model, centred on its middle and its feet.
 function fitted(model,tick){const spin=new T.Group();spin.add(model.group);const b=visibleBox(model.group),size=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3()),k=TARGET/Math.max(size.x,size.y,size.z);
  model.group.position.set(-c.x,-b.min.y,-c.z);spin.scale.setScalar(k);const holder=new T.Group();holder.add(spin);return {group:holder,spin,tick};}
 function build(id){const red=new T.Color(PAINT[id]||'#d93a3a');
  const rides={cat:createCat,dog:createDog,duck:createRideDuck,rocket:createRocket,unicorn:createUnicorn,firetruck:createFireTruck,balloon:createBalloon,trex:createTRex,pig:createPig};
  if(rides[id]){const m=rides[id](T);m.update(0,0,0,red);return fitted(m,(dt,time)=>m.update(dt,0,time,red));}
  if(id==='ludvig'){const m=createBoyModel(T);return fitted(m,(dt,time)=>m.update(dt,0,time));}
  if(id==='duckRunner'){const m=createDuckRunnerModel(T);return fitted(m,(dt,time)=>m.update(dt,0,time));}
  if(id==='kiwi'||id==='rainbow'||id==='taxi'){const e=createET5(T);e.paint.metalness=.25;e.paint.roughness=.35;
   if(id==='kiwi'){e.paint.color.set('#5fae36');for(const m of e.skins.kiwi)m.visible=true;}if(id==='taxi'){e.paint.color.set('#f3c531');e.taxi.visible=true;}
   return fitted({group:e.car},id==='rainbow'?(dt,time)=>e.paint.color.setHSL((time*.3)%1,.9,.45):()=>{});}
  // only in the dream: her car, red like the one in the drawing on the wall, and a rainbow with a cloud at each end
  if(id==='car'){const e=createET5(T);e.paint.color.set('#e5373a');e.paint.metalness=.25;e.paint.roughness=.35;return fitted({group:e.car},()=>{});}
  if(id==='arc'){const g=new T.Group();['#e5373a','#ff9a2e','#ffd23a','#5ccf66','#41a7f4','#8b6cf0'].forEach((c,i)=>{const r=add(new T.TorusGeometry(.5-i*.055,.03,8,28,Math.PI),new T.MeshBasicMaterial({color:c}),0,0,0,g);r.scale.z=1.6;});
   for(const s of [-1,1])for(const [x,y,r] of [[0,.02,.1],[.09,.0,.075],[-.09,.0,.075]])ball(r,std('#ffffff'),s*.39+x,y,0,g);return fitted({group:g},()=>{});}
  return null;}
 // A medallion: an upright disc with the emoji on both faces (two planes back to back, so neither is mirrored) and a bright rim; grey with a "?" while locked.
 function medallion(id,icon,locked){const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d');q.fillStyle=locked?'#aaa59c':'#fff8e8';q.fillRect(0,0,256,256);q.textAlign='center';q.textBaseline='middle';
  if(locked){q.fillStyle='#ffffff';q.font='900 190px Arial, sans-serif';q.fillText('?',128,138);}else{q.font='150px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';q.fillText(icon,128,142);}
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const face=new T.MeshBasicMaterial({map:tx}),group=new T.Group(),spin=new T.Group();group.add(spin);spin.position.y=.5;
  cyl(.47,.47,.07,std(locked?'#8d887f':RIM[id]||'#ffb23d',.5),0,0,0,spin,null,32).rotation.x=Math.PI/2;
  add(new T.CircleGeometry(.4,32),face,0,0,.038,spin);const back=add(new T.CircleGeometry(.4,32),face,0,0,-.038,spin);back.rotation.y=Math.PI;
  return {group,spin,locked,medal:true,tick:()=>{}};}
 function content(slot){const it=items.find(i=>i.id===slot.id),on=!!it?.unlocked,key=slot.id+(on?'+':'-'),old=slot.content;if(slot.key===key)return;slot.key=key;if(old)slot.holder.remove(old.group);
  let c=null;if(on){if(!cache.has(slot.id))cache.set(slot.id,build(slot.id)||'none');c=cache.get(slot.id);if(c==='none')c=null;}
  if(!c){const k='m'+key;if(!cache.has(k))cache.set(k,medallion(slot.id,it?.icon||'',!on));c=cache.get(k);}
  slot.content=c;slot.holder.add(c.group);}
 // ---- The girl and the pig ----
 const girl=createGirlModel(T);girl.group.rotation.order='YXZ';scene.add(girl.group); // YXZ: lying down tips her back, then turns her
 const pig=createPig(T);pig.group.scale.setScalar(.18);scene.add(pig.group);
 const pigHit=box(1.4,1,1.1,new T.MeshBasicMaterial({color:'#ff00ff'}),-3.95,.5,3,scene,'pig');pigHit.visible=false;
 let gx=0,gz=1.4,yaw=Math.PI,walk=null,arrive=null,waveLeft=0,pigOut=false,hop=-1;
 // Where the girl may walk: the free floor in front of the podium, clear of the sofa, the lamp, the plant and the door. (Going to bed she goes closer, to take hold of it.)
 const clamp=(x,z)=>[Math.min(3.45,Math.max(-2.7,x)),Math.min(2.85,Math.max(.6,z))];
 function walkTo(x,z,face=null,free=false){if(!free)[x,z]=clamp(x,z);walk={x,z};arrive=face;waveLeft=0;}
 // ---- Bedtime: on (told to sleep), u (0 a sofa .. 1 a bed), k (in bed, 0 standing by it .. 1 lying), night (0..1, eases with on), view (the camera at the bed, 0..1:
 // it stays there until the sofa is a sofa again), dream (seconds dreamt) ----
 const bed={on:false,u:0,k:0,night:0,view:0,dream:0,open:true}; // open: the sofa is (or was last) opening; the bounces come at the bed end then, at the sofa end closing
 const dream=createDream({T,scene,build:id=>build(id)});
 const head=new T.Vector3(),bubbleAt=new T.Vector3(BUBBLE.x,BUBBLE.y,BUBBLE.z),zSide=new T.Vector3(...ZSIDE).normalize(),DAY='#f3e7d3',NIGHT='#2f2f57',GLASS='#bfe6f7',DARK='#1c2858',tint=new T.Color();
 function dreamList(){return ['car','arc',...items.filter(i=>i.unlocked&&MODELS.has(i.id)).map(i=>i.id)];}
 // To bed: she walks to the sofa (or, already by it, stays), makes the bed of it and lies down (bedtime, below). Already on her way or asleep: nothing.
 function sleep(){if(bed.on)return false;bed.on=true;bed.dream=0;dream.reset();dream.setList(dreamList());waveLeft=0;if(bed.k===0&&bed.u===0)walkTo(GRAB.x,GRAB.z,{yaw:GRAB.yaw,bed:true},true);return true;}
 // Up again: a burst of sparkles where the dream was, then she climbs out and makes the bed a sofa again. On her way to bed, she just stops.
 function wake(){if(!bed.on)return false;if(bed.dream>1.5)dream.burst(bubbleAt,22,3);bed.on=false;bed.dream=0;if(bed.k===0){walk=null;arrive=null;}return true;}
 const atGrab=()=>!walk&&Math.hypot(gx-GRAB.x,gz-GRAB.z)<.06&&Math.abs(Math.atan2(Math.sin(GRAB.yaw-yaw),Math.cos(GRAB.yaw-yaw)))<.2;
 // Making the bed takes 3.2 s, making the sofa again 2.6 s; she lies down in 1.5 s and gets up in 1.2 s. The dream starts once she lies still.
 function bedtime(dt){if(bed.u===0)bed.open=true;else if(bed.u===1)bed.open=false;
  if(bed.on){if(bed.u<1){if(bed.k===0&&(bed.u>0||atGrab()))bed.u=Math.min(1,bed.u+dt/3.2);}else bed.k=Math.min(1,bed.k+dt/1.5);if(bed.k===1)bed.dream+=dt;}
  else if(bed.k>0)bed.k=Math.max(0,bed.k-dt/1.2);else if(bed.u>0)bed.u=Math.max(0,bed.u-dt/2.6);
  bed.night=bed.on?Math.min(1,bed.night+dt/2.6):Math.max(0,bed.night-dt/1.8);bed.view=bed.on||bed.k>0||bed.u>0?Math.min(1,bed.view+dt/2.6):Math.max(0,bed.view-dt/1.8);}
 // ---- How the sofa becomes a bed, in four parts of u, and how she helps ----
 // A: she lays the two throw pillows at the head end, the pink one first, the yellow on top, each in a little hop and a twirl, squashing as it lands.
 // B: she takes hold of the seat and walks backwards with it, leaning back; its legs fold down, and it stops with a jolt that squashes the cushions.
 // C: the back tips forward and falls flat into the gap behind the seat, bounces once, and she cheers. D: the duvet comes fluttering down and lands folded at the foot end.
 // Closing runs the other way (u back to 0): the duvet flies up, the back is lifted and settles upright with a nod, she pushes the seat in, leaning forward,
 // and the pillows hop back. Opening, things bounce as they reach the bed; closing, as they reach the sofa. Which way is kept from end to end (bed.open), so
 // a change of mind halfway simply runs the same motion backwards.
 const part=(u,a,b)=>Math.min(1,Math.max(0,(u-a)/(b-a))),bump=(x,a,b)=>x>a&&x<b?Math.sin((x-a)/(b-a)*Math.PI):0,mix=(a,b,k)=>a+(b-a)*k;
 const outBack=k=>1+2.2*(k-1)**3+1.2*(k-1)**2; // past the end a little, and back
 let mo={};
 function motion(){const u=bed.u,open=bed.open,A=part(u,0,.22),B=part(u,.22,.5),C=part(u,.5,.75),D=part(u,.75,1),a2=part(A,0,.6),a1=part(A,.35,1);
  const end=(k,a)=>open?bump(k,a,1):bump(1-k,a,1); // a bump as something reaches the bed (opening) or the sofa (closing)
  return {A,B,C,D,open,a1,a2,
   slide:open?(B<.8?ease(B/.8):1-.05*bump(B,.8,1)):(1-B<.8?1-ease((1-B)/.8):.05*bump(1-B,.8,1)),squash:end(B,.8),legs:open?outBack(part(B,.45,.9)):ease(part(B,.2,.6)),
   tip:open?(C<.72?(C/.72)**2:1-.07*bump(C,.72,1)):(1-C<.75?1-ease((1-C)/.75):.05*bump(1-C,.75,1)),thud:open?bump(C,.72,.88):0,
   drop:open?(D<.7?(D/.7)**2:1-.05*bump(D,.7,1)):ease(D),land1:end(a1,.8),land2:end(a2,.8)};}
 // The sofa bed as it is now, from the motion. All in the sofa's own coordinates: x towards the room, z towards the front, her head at −z.
 function dressBed(time){const {seat,seatLegs,cushions,back,p1,p2,duvet,cover,fold,end}=sofaBed,m=mo;
  // the pillows: from leaning on the back to lying flat at the head end, the yellow on the pink
  const hop=(p,k,land,[x0,y0,z0,rx0,rz0],[x1,y1,z1],arc)=>{const e=ease(k);p.position.set(mix(x0,x1,e),mix(y0,y1,e)+Math.sin(k*Math.PI)*arc,mix(z0,z1,e));p.rotation.set(mix(rx0,0,e),Math.PI*e,mix(rz0,-Math.PI/2,e));p.scale.set(1-.3*land,1+.12*land,1+.12*land);};
  hop(p2,m.a2,m.land2,[-.2,.88,.55,.2,-.2],[.25,.72,-.55],.32);hop(p1,m.a1,m.land1,[-.2,.9,-.5,0,-.25],[.25,.86,-.55],.42);
  seat.position.x=PULL*m.slide;for(const l of seatLegs){l.visible=m.B>0;l.rotation.z=-Math.PI/2*(1-m.legs);}
  for(const c of cushions)c.scale.y=1-.25*m.squash-.15*m.thud;
  back.position.set(mix(-.35,-.17,m.tip),mix(.85,.52,m.tip),0);back.rotation.z=-Math.PI/2*m.tip;back.scale.x=1-.2*m.thud;
  // the duvet: she throws it from her hands over her head, a small bundle that unfolds as it flutters down onto the foot end (and back up into her hands)
  duvet.visible=m.D>0;const k=Math.max(.01,.35+.65*ease(m.D)),f=m.drop,g=sofaBed.group.position;duvet.scale.set(k,k,k);
  duvet.position.set(mix(SIDE.x-g.x,.25,f),mix(1.3,.62,f)+Math.sin(Math.min(1,f)*Math.PI)*.45,mix(SIDE.z-g.z,.5,f));duvet.rotation.set(Math.sin(m.D*8)*.18*(1-m.D),Math.sin(m.D*6)*.4*(1-m.D),Math.sin(m.D*10)*.3*(1-m.D));
  // pulled up to her shoulders as she lies down, rising and falling a little as she breathes
  const c=ease(Math.max(0,(bed.k-.75)/.25)),breathe=1+(c?Math.sin(time*1.5)*.03*c:0),z0=mix(.33,-.3,c),z1=.68,ry=mix(.16,.4,c)*breathe;
  cover.scale.set(.4,z1-z0,ry);cover.position.set(0,0,(z0+z1)/2-.5);end.scale.set(.4,ry,.13);end.position.set(0,0,z1-.5);fold.visible=c>0;fold.scale.set(.42,.07,ry+.02);fold.position.set(0,0,z0+.035-.5);}
 // Night falls with her going to bed: the window turns dark blue with the moon and the stars, the light and the world outside the room dim, the lamp glows.
 function dressNight(){const n=ease(bed.night);night.glass.color.set(GLASS).lerp(tint.set(DARK),n);for(const [o,r] of night.sky){o.visible=n>.05;o.scale.setScalar(Math.max(n,.01)*r);}
 backdrop.color.set(DAY).lerp(tint.set(NIGHT),n*.85);scene.background.copy(backdrop.color);hemi.intensity=1.9-.6*n;lamp.intensity=2.3-.9*n;shade.emissiveIntensity=.5+.8*n;}
 // Her pose: walking and standing as before. Making the bed she is by the seat: she reaches for the pillows, walks backwards with the seat leaning back (or pushes
 // it in leaning forward), cheers with a little hop when the back lands, and throws up her arms for the duvet. Getting into bed she hops up, turns and tips back
 // onto the pillows, and the same way back out.
 function pose(){let lean=0,up=0;
  if(bed.u>0&&bed.k===0){gx=GRAB.x+PULL*mo.slide;gz=GRAB.z;yaw=GRAB.yaw;lean=(mo.open?.24:-.2)*Math.sin(mo.B*Math.PI);up=mo.open?.12*bump(mo.C,.72,.95):0;}
  if(bed.k===0){girl.group.position.set(gx,up,gz);girl.group.rotation.set(lean,yaw,0);}
  else{const c=ease(bed.k);girl.group.position.set(gx+(LIE.x-gx)*c,LIE.y*c+Math.sin(c*Math.PI)*.45,gz+(LIE.z-gz)*c);girl.group.rotation.set(LIE.tilt*c,turn(yaw,LIE.yaw,c),0);}
  girl.setAsleep(bed.on&&bed.k>.85);}
 // Her arms while she makes the bed, after girl.update has swung them: forward for the pillows and the seat, up and out to cheer, up for the duvet.
 function arms(){if(!(bed.u>0&&bed.k===0))return;const m=mo,ahead=1.3*Math.sin(m.A*Math.PI)+1.45*Math.min(1,4*m.B,4*(1-m.B))+(m.open?0:2.4*Math.sin(m.C*Math.PI))+2.3*bump(m.D,0,.75),out=m.open?2.4*bump(m.C,.6,1):0;
  const [l,r]=girl.arms;l.rotation.x=r.rotation.x=ahead;l.rotation.z=-.08-out;r.rotation.z=.08+out;}
 function placePig(){const p=pigOut?OUT:HIDE;pig.group.position.set(p.x,0,p.z);pig.group.rotation.y=pigOut?OUT.yaw:0;pigHit.userData.kind=pigOut?'item':'pig';pigHit.userData.id='pig';
  if(pigOut){pigHit.position.set(OUT.x,.4,OUT.z);pigHit.scale.set(.65,.8,.9);}else{pigHit.position.set(-3.95,.5,3);pigHit.scale.set(1,1,1);}}
 placePig();
 // Found now (hidden before): the pig hops out onto the rug. Already out, or still hidden: it stays where it is.
 function refresh(list,opts={}){items=list;dream.setList(dreamList());if(opts.pigHidden!==false){pigOut=false;hop=-1;}else if(!pigOut){pigOut=true;hop=0;}if(hop<0)placePig();for(const s of slots)content(s);}
 function enter(list,opts={}){pigOut=opts.pigHidden===false;hop=-1;items=[];for(const s of slots)s.key='';refresh(list,opts);gx=0;gz=1.4;yaw=Math.PI;walk=null;arrive=null;waveLeft=2.2;
  Object.assign(bed,{on:false,u:0,k:0,night:0,view:0,dream:0,open:true});mo=motion();dream.reset();dressBed(0);dressNight();pose();fit(true);} // she always comes in awake, with the bed folded in
 // ---- The camera: from the front and a little above (the narrower the screen, the higher), as close as lets the whole room show, the front corners of the floor included ----
 const corners=[[-4.5,0,3],[4.5,0,3],[-4.5,3.6,-3.5],[4.5,3.6,-3.5],[0,0,3],[0,3.6,-3.5]].map(p=>new T.Vector3(...p)),probe=new T.Vector3();let aspect=0;
 function fit(force){const w=canvas.clientWidth||1,h=canvas.clientHeight||1,a=w/h;if(!force&&a===aspect)return;aspect=a;camera.aspect=a;
  const el=(38-14*Math.min(1,Math.max(0,(a-.55)/.7)))*Math.PI/180;let d=6;
  for(let i=0;i<90;i++,d*=1.03){camera.position.set(0,1.3+Math.sin(el)*d,-.4+Math.cos(el)*d);camera.lookAt(0,1.3,-.4);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
   if(corners.every(p=>{probe.copy(p).project(camera);return Math.abs(probe.x)<.97&&Math.abs(probe.y)<.95;}))break;}
  roomEye.copy(camera.position);fitBed(a);aim();}
 // At bedtime the camera glides in to the sofa bed and the dream (and stays while she makes the bed and, getting up, the sofa again), from the front and a little to the right, so it sees her face from the foot end. It comes as close
 // as lets the bed, her Z's and the whole bubble show, clear of the buttons at the top and the title at the bottom.
 const roomEye=new T.Vector3(),roomAt=new T.Vector3(0,1.3,-.4),bedEye=new T.Vector3(),bedAt=new T.Vector3(),lookAt=new T.Vector3(),bedDir=new T.Vector3(.42,.62,1).normalize();
 const bedPoints=[[-4.05,.65,.35],[-2.7,.65,.35],[-4.05,.65,2.55],[-2.7,.65,2.55],[-4.05,.8,.4],[-3.6,2.35,1.3]].map(p=>new T.Vector3(...p)),camRight=new T.Vector3(),camUp=new T.Vector3();
 function fitBed(a){bubbleAt.set(BUBBLE.x,BUBBLE.y,BUBBLE.z);if(a<.8)bubbleAt.set(-2.75,2.9,1.2);else if(a>1.7)bubbleAt.set(-1.75,2.15,1.45); // upright screens have room above the bed, wide and low ones beside it
  bedAt.set(-3.3,1.3,1.45).lerp(bubbleAt,.35);let d=3;const h=canvas.clientHeight||1,top=1-2*95/h,bottom=-1+2*80/h; // under the header, over the title
  for(let i=0;i<90;i++,d*=1.03){camera.position.copy(bedAt).addScaledVector(bedDir,d);camera.lookAt(bedAt);camera.updateMatrixWorld(true);const e=camera.matrixWorld.elements;camRight.set(e[0],e[1],e[2]);camUp.set(e[4],e[5],e[6]);
   const rim=[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>bubbleAt.clone().addScaledVector(camRight,x*1.38*BUBBLE.size).addScaledVector(camUp,y*1.03*BUBBLE.size));
   if([...bedPoints,...rim].every(p=>{probe.copy(p).project(camera);return Math.abs(probe.x)<.94&&probe.y<top&&probe.y>bottom;}))break;}
  bedEye.copy(camera.position);}
 function aim(){const e=ease(bed.view);camera.position.lerpVectors(roomEye,bedEye,e);lookAt.lerpVectors(roomAt,bedAt,e);camera.lookAt(lookAt);camera.updateMatrixWorld(true);}
 // ---- Taps: the nearest of the hit boxes, the door and the walls and furniture decides; a tap on the floor walks the girl there ----
 const ray=new T.Raycaster(),ndc=new T.Vector2(),floor=new T.Plane(new T.Vector3(0,1,0),0),at=new T.Vector3();
 function pick(clientX,clientY){const r=canvas.getBoundingClientRect();ndc.set((clientX-r.left)/(r.width||1)*2-1,-((clientY-r.top)/(r.height||1))*2+1);fit();aim();scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);ray.setFromCamera(ndc,camera);
  const dreaming=dream.targets(),resting=bed.on||bed.k>0; // resting: on her way to bed, in it or getting up; then only the bed and the dream answer
  const hit=ray.intersectObjects([...pickables,...blockers,...dreaming],false)[0],onFloor=ray.ray.intersectPlane(floor,at),floorAt=onFloor?ray.ray.origin.distanceTo(at):Infinity;
  if(hit&&dreaming.includes(hit.object)){const found=dream.hit(hit.object,hit.point);return found&&found.type!=='sky'?found:null;}
  if(hit&&hit.object.userData.kind==='bed')return {type:'bed'}; // to bed, or up again: game.js decides
  if(resting)return null;
  if(hit&&hit.distance<floorAt){const o=hit.object,kind=o.userData.kind;
   if(o===pigHit&&kind==='item'){walkTo(OUT.x-.9,OUT.z+.1,{yaw:-Math.PI/2});return {type:'item',id:'pig'};} // the pig out on the rug
   if(kind==='item'){const slot=slots.find(s=>s.id===o.userData.id);walkTo(slot.x,.65,{yaw:0});return {type:'item',id:slot.id};}
   if(kind==='pig'){walkTo(-2.7,2.6,{yaw:Math.PI*.7});return {type:'pig'};}
   if(kind==='door'){walkTo(3.45,1.5,{yaw:-Math.PI/2});return {type:'door'};}
   return null;}
  if(onFloor&&Math.abs(at.x)<ROOM.x&&at.z>ROOM.back&&at.z<ROOM.front){walkTo(at.x,at.z);return {type:'floor'};}
  return null;}
 // ---- Every frame: the girl walks and waves (or goes to bed and dreams), the models turn, the pig wiggles or hops out, then draw ----
 const turn=(from,to,k)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*k;
 function update(dt,time){
  fit();let speed=0;bedtime(dt);mo=motion();
  if(walk){const dx=walk.x-gx,dz=walk.z-gz,d=Math.hypot(dx,dz);
   if(d<.04){walk=null;if(arrive&&!arrive.bed){waveLeft=2.6;}}else{const step=Math.min(d,1.4*dt);gx+=dx/d*step;gz+=dz/d*step;yaw=turn(yaw,Math.atan2(-dx,-dz),Math.min(1,dt*10));speed=1.4;}}
  else if(arrive){yaw=turn(yaw,arrive.yaw,Math.min(1,dt*8));}
  let wave=0;if(waveLeft>0){waveLeft=Math.max(0,waveLeft-dt);wave=Math.min(1,waveLeft*3,(2.6-waveLeft)*3);if(waveLeft===0)arrive=null;}
  pose();girl.update(dt,bed.u>0&&bed.k===0&&mo.B>0&&mo.B<1?.6:speed,time,Math.max(0,wave));arms();dressBed(time);dressNight();aim();
  girl.head.getWorldPosition(head);dream.update(dt,time,{t:bed.on&&bed.k===1?bed.dream:0,head,at:bubbleAt,size:BUBBLE.size,camera,side:zSide});
  slots.forEach((s,i)=>{const c=s.content;if(!c)return;if(c.locked){c.spin.position.y=.5+Math.sin(time*2+i)*.05;c.spin.rotation.y=Math.sin(time*.8+i)*.35;}else c.spin.rotation.y=time*(c.medal?.9:.7)+i;});
  for(const c of cache.values())if(c!=='none'&&c.group.parent)c.tick(dt,time); // the ones on show come alive
  // the pig behind the sofa wiggles its rump now and then; found, it hops out onto the rug and stands there
  if(hop>=0){hop+=dt/1.1;const t=Math.min(1,hop),e=t*t*(3-2*t);pig.group.position.set(HIDE.x+(OUT.x-HIDE.x)*e,Math.sin(Math.PI*t)*.55,HIDE.z+(OUT.z-HIDE.z)*e);pig.group.rotation.y=turn(0,OUT.yaw,e);if(t>=1){hop=-1;placePig();}}
  else if(!pigOut)pig.group.rotation.y=Math.max(0,Math.sin(time*.9)-.6)*Math.sin(time*16)*.35;
  pig.update(dt,0,time);
  renderer.render(scene,camera);}
 return {scene,camera,girl,pig,slots,pigHit,door,enter,refresh,update,pick,sleep,wake,get asleep(){return bed.on;},bed,dream,sofaBed,hitBoxes:slots.map(s=>s.hit)};
}
