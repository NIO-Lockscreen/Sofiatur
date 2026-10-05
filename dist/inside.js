// Inside the house (5 October 2026): the "Gå inn" button on the start screen opens a cosy room, drawn with the world's renderer (game.js hands it over, so the
// WebGL renderer and the software one both work). A podium, "pallen", against the back wall has a place for each of the 19 unlocks: a little turning model of the real
// one, a medallion with its emoji where it has no model, a grey "?" where it is still locked. Tapping a place is picked here (pick) and told to game.js, which says how
// it was unlocked or gives a hint; the girl (girl.js) walks to where you tap, and a pig hides behind the sofa until it is tapped (game.js findPig).
// A separate scene and camera, lit by a hemisphere light and one warm light, no shadows. Solid colours only: the software renderer skips see-through things and ignores lights.
import {createGirlModel} from './girl.js';
import {createET5} from './car-model.js';
import {createCat} from './cat-model.js';
import {createDog,createRideDuck,createRocket,createUnicorn,createFireTruck,createBalloon,createTRex,createPig,PIG_SKIN} from './rides.js';
import {createBoyModel} from './boy.js';
import {createDuckRunnerModel} from './duck-runner.js';

// The three steps of the podium, from the front (low) to the back (high): item ids in order, the height of the step's top, its middle z and its width. 1 m is a slot.
export const STEPS=[{ids:['colour','cat','trail','rainbow','dog','duck','rocket'],top:.35,z:-.5,w:8.6},{ids:['unicorn','bubbles','firetruck','horn','balloon','trex'],top:.7,z:-1.7,w:7.4},{ids:['kiwi','ludvig','duckRunner','taxi','pig','hover'],top:1.05,z:-2.9,w:7.4}];
const SLOT=1.2,TARGET=1,ROOM={x:4.5,front:3,back:-3.5,height:3.6}; // slot spacing; the size a model is fitted to (m); the room's half width, front and back edges, wall height
// What each model is dressed in on the podium (the colour its ride would take; the cars and the rainbow have their own; the pig is always pig-pink).
const PAINT={pig:PIG_SKIN,cat:'#e07b39',dog:'#b9824a',duck:'#8a7a68',rocket:'#d94a4a',unicorn:'#f4efff',firetruck:'#c62828',balloon:'#e5528f',trex:'#4caf50'};
const RIM={colour:'#ff6b6b',trail:'#5ccf66',bubbles:'#41a7f4',horn:'#ffc83d',hover:'#8b6cf0'}; // a medallion's rim
const HIDE={x:-4.2,z:2.65},OUT={x:.95,z:1.95,yaw:Math.PI-.5}; // the pig behind the sofa, and on the rug once found

export function createInside({T,renderer,canvas}){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.1,120);scene.background=new T.Color('#f3e7d3');
 const std=(color,roughness=.85,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});
 const blockers=[],pickables=[]; // blockers: walls, the podium and the furniture, which a tap cannot go through
 function add(g,m,x,y,z,parent=scene,kind=null){const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);if(kind){o.userData.kind=kind;(kind==='block'?blockers:pickables).push(o);}return o;}
 const box=(w,h,d,m,x,y,z,parent,kind)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,parent,kind),cyl=(rt,rb,h,m,x,y,z,parent,kind,seg=24)=>add(new T.CylinderGeometry(rt,rb,h,seg),m,x,y,z,parent,kind),ball=(r,m,x,y,z,parent)=>add(new T.SphereGeometry(r,16,10),m,x,y,z,parent);
 scene.add(new T.HemisphereLight('#fff4e2','#c9a77c',1.9));const lamp=new T.DirectionalLight('#ffdfb0',2.3);lamp.position.set(-3,8,7);scene.add(lamp);
 // ---- The room: a wooden floor with plank lines, three walls with skirting boards (the front is open, like a dollhouse), a backdrop so nothing outside shows through ----
 add(new T.PlaneGeometry(80,40),new T.MeshBasicMaterial({color:'#f3e7d3',toneMapped:false}),0,8,-10);
 add(new T.PlaneGeometry(80,60),new T.MeshBasicMaterial({color:'#f3e7d3',toneMapped:false}),0,-.22,8).rotation.x=-Math.PI/2; // and under it, for what the camera sees below the open front
 const wood=std('#c98f56',.8),seam=std('#a8703c',.9),wall=std('#f5e7d0'),side=std('#eedac0'),skirting=std('#fffaf0'),white=std('#fffaf0'),gold=std('#e3b23c',.35,{metalness:.5}),cream=std('#f6e7c1');
 box(9,.2,6.5,wood,0,-.1,-.25); // the floor is no blocker: a tap on it walks the girl there
 let n=7;const rnd=()=>(n=(n*1664525+1013904223)>>>0)/4294967296;
 for(let k=1;k<13;k++){const z=ROOM.back+k*.5;box(9,.004,.014,seam,0,.003,z);for(let j=0;j<2;j++)box(.014,.004,.5,seam,(rnd()-.5)*8.4,.003,z-.25);}
 box(9.4,ROOM.height,.2,wall,0,ROOM.height/2,-3.6,scene,'block');box(.2,ROOM.height,6.8,side,-4.6,ROOM.height/2,-.3,scene,'block');box(.2,ROOM.height,6.8,side,4.6,ROOM.height/2,-.3,scene,'block');
 box(9,.16,.05,skirting,0,.08,-3.475);box(.05,.16,6.4,skirting,-4.475,.08,-.25);box(.05,.16,6.4,skirting,4.475,.08,-.25);
 // The window on the back wall, over the podium, with curtains; pictures on each side of it.
 {const frame=std('#ffffff',.6),glass=new T.MeshBasicMaterial({color:'#bfe6f7'}),rod=gold,curtain=std('#e5528f'),curtain2=std('#f08cb8'),z=-3.47;
  add(new T.PlaneGeometry(2.1,1.05),glass,0,2.95,z+.012);box(2.3,.1,.08,frame,0,3.5,z);box(2.3,.1,.08,frame,0,2.4,z);box(.1,1.2,.08,frame,-1.1,2.95,z);box(.1,1.2,.08,frame,1.1,2.95,z);box(.06,1.05,.06,frame,0,2.95,z+.01);box(2.1,.05,.06,frame,0,2.95,z+.01);
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
 {const sofa=new T.Group();sofa.position.set(-3.55,0,1.45);scene.add(sofa);const cloth=std('#5b8fb9'),soft=std('#7aa6cb'),leg=std('#5a3d28');
  box(.95,.4,2.1,cloth,0,.32,0,sofa,'block');box(.26,.62,2.1,cloth,-.35,.85,0,sofa,'block');for(const s of [-1,1])box(.95,.3,.24,cloth,0,.6,s*.93,sofa,'block');
  for(const s of [-1,1]){box(.62,.14,.82,soft,.1,.58,s*.45,sofa);for(const x of [-.38,.38])cyl(.04,.04,.15,leg,x,.075,s*.92,sofa);}
  const p1=box(.14,.34,.34,std('#f6c445'),-.2,.9,-.5,sofa);p1.rotation.z=-.25;const p2=box(.14,.3,.3,std('#ec6aa8'),-.2,.88,.55,sofa);p2.rotation.z=-.2;p2.rotation.x=.2;}
 {const post=std('#6b4a2e'),shade=std('#ffe29a',.6,{emissive:'#ffc860',emissiveIntensity:.5});cyl(.22,.25,.04,post,4.05,.02,.4);cyl(.025,.025,1.5,post,4.05,.78,.4,scene,'block');cyl(.2,.3,.38,shade,4.05,1.65,.4,scene,'block');}
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
 const girl=createGirlModel(T);scene.add(girl.group);
 const pig=createPig(T);pig.group.scale.setScalar(.18);scene.add(pig.group);
 const pigHit=box(1.4,1,1.1,new T.MeshBasicMaterial({color:'#ff00ff'}),-3.95,.5,3,scene,'pig');pigHit.visible=false;
 let gx=0,gz=1.4,yaw=Math.PI,walk=null,arrive=null,waveLeft=0,pigOut=false,hop=-1;
 // Where the girl may walk: the free floor in front of the podium, clear of the sofa, the lamp, the plant and the door.
 const clamp=(x,z)=>[Math.min(3.45,Math.max(-2.7,x)),Math.min(2.85,Math.max(.6,z))];
 function walkTo(x,z,face=null){[x,z]=clamp(x,z);walk={x,z};arrive=face;waveLeft=0;}
 function placePig(){const p=pigOut?OUT:HIDE;pig.group.position.set(p.x,0,p.z);pig.group.rotation.y=pigOut?OUT.yaw:0;pigHit.userData.kind=pigOut?'item':'pig';pigHit.userData.id='pig';
  if(pigOut){pigHit.position.set(OUT.x,.4,OUT.z);pigHit.scale.set(.65,.8,.9);}else{pigHit.position.set(-3.95,.5,3);pigHit.scale.set(1,1,1);}}
 placePig();
 // Found now (hidden before): the pig hops out onto the rug. Already out, or still hidden: it stays where it is.
 function refresh(list,opts={}){items=list;if(opts.pigHidden!==false){pigOut=false;hop=-1;}else if(!pigOut){pigOut=true;hop=0;}if(hop<0)placePig();for(const s of slots)content(s);}
 function enter(list,opts={}){pigOut=opts.pigHidden===false;hop=-1;items=[];for(const s of slots)s.key='';refresh(list,opts);gx=0;gz=1.4;yaw=Math.PI;walk=null;arrive=null;waveLeft=2.2;girl.group.position.set(gx,0,gz);girl.group.rotation.y=yaw;fit(true);}
 // ---- The camera: from the front and a little above (the narrower the screen, the higher), as close as lets the whole room show, the front corners of the floor included ----
 const corners=[[-4.5,0,3],[4.5,0,3],[-4.5,3.6,-3.5],[4.5,3.6,-3.5],[0,0,3],[0,3.6,-3.5]].map(p=>new T.Vector3(...p)),probe=new T.Vector3();let aspect=0;
 function fit(force){const w=canvas.clientWidth||1,h=canvas.clientHeight||1,a=w/h;if(!force&&a===aspect)return;aspect=a;camera.aspect=a;
  const el=(38-14*Math.min(1,Math.max(0,(a-.55)/.7)))*Math.PI/180;let d=6;
  for(let i=0;i<90;i++,d*=1.03){camera.position.set(0,1.3+Math.sin(el)*d,-.4+Math.cos(el)*d);camera.lookAt(0,1.3,-.4);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
   if(corners.every(p=>{probe.copy(p).project(camera);return Math.abs(probe.x)<.97&&Math.abs(probe.y)<.95;}))break;}}
 // ---- Taps: the nearest of the hit boxes, the door and the walls and furniture decides; a tap on the floor walks the girl there ----
 const ray=new T.Raycaster(),ndc=new T.Vector2(),floor=new T.Plane(new T.Vector3(0,1,0),0),at=new T.Vector3();
 function pick(clientX,clientY){const r=canvas.getBoundingClientRect();ndc.set((clientX-r.left)/(r.width||1)*2-1,-((clientY-r.top)/(r.height||1))*2+1);fit();scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);ray.setFromCamera(ndc,camera);
  const hit=ray.intersectObjects([...pickables,...blockers],false)[0],onFloor=ray.ray.intersectPlane(floor,at),floorAt=onFloor?ray.ray.origin.distanceTo(at):Infinity;
  if(hit&&hit.distance<floorAt){const o=hit.object,kind=o.userData.kind;
   if(o===pigHit&&kind==='item'){walkTo(OUT.x-.9,OUT.z+.1,{yaw:-Math.PI/2});return {type:'item',id:'pig'};} // the pig out on the rug
   if(kind==='item'){const slot=slots.find(s=>s.id===o.userData.id);walkTo(slot.x,.65,{yaw:0});return {type:'item',id:slot.id};}
   if(kind==='pig'){walkTo(-2.7,2.6,{yaw:Math.PI*.7});return {type:'pig'};}
   if(kind==='door'){walkTo(3.45,1.5,{yaw:-Math.PI/2});return {type:'door'};}
   return null;}
  if(onFloor&&Math.abs(at.x)<ROOM.x&&at.z>ROOM.back&&at.z<ROOM.front){walkTo(at.x,at.z);return {type:'floor'};}
  return null;}
 // ---- Every frame: the girl walks and waves, the models turn, the pig wiggles or hops out, then draw ----
 const turn=(from,to,k)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*k;
 function update(dt,time){
  fit();let speed=0;
  if(walk){const dx=walk.x-gx,dz=walk.z-gz,d=Math.hypot(dx,dz);
   if(d<.04){walk=null;if(arrive){waveLeft=2.6;}}else{const step=Math.min(d,1.4*dt);gx+=dx/d*step;gz+=dz/d*step;yaw=turn(yaw,Math.atan2(-dx,-dz),Math.min(1,dt*10));speed=1.4;}}
  else if(arrive){yaw=turn(yaw,arrive.yaw,Math.min(1,dt*8));}
  let wave=0;if(waveLeft>0){waveLeft=Math.max(0,waveLeft-dt);wave=Math.min(1,waveLeft*3,(2.6-waveLeft)*3);if(waveLeft===0)arrive=null;}
  girl.group.position.set(gx,0,gz);girl.group.rotation.y=yaw;girl.update(dt,speed,time,Math.max(0,wave));
  slots.forEach((s,i)=>{const c=s.content;if(!c)return;if(c.locked){c.spin.position.y=.5+Math.sin(time*2+i)*.05;c.spin.rotation.y=Math.sin(time*.8+i)*.35;}else c.spin.rotation.y=time*(c.medal?.9:.7)+i;});
  for(const c of cache.values())if(c!=='none'&&c.group.parent)c.tick(dt,time); // the ones on show come alive
  // the pig behind the sofa wiggles its rump now and then; found, it hops out onto the rug and stands there
  if(hop>=0){hop+=dt/1.1;const t=Math.min(1,hop),e=t*t*(3-2*t);pig.group.position.set(HIDE.x+(OUT.x-HIDE.x)*e,Math.sin(Math.PI*t)*.55,HIDE.z+(OUT.z-HIDE.z)*e);pig.group.rotation.y=turn(0,OUT.yaw,e);if(t>=1){hop=-1;placePig();}}
  else if(!pigOut)pig.group.rotation.y=Math.max(0,Math.sin(time*.9)-.6)*Math.sin(time*16)*.35;
  pig.update(dt,0,time);
  renderer.render(scene,camera);}
 return {scene,camera,girl,pig,slots,pigHit,door,enter,refresh,update,pick,hitBoxes:slots.map(s=>s.hit)};
}
