// Mealtime in the house (23 November 2026, as in Sofia's space game). Two ways to eat, side by side and just as ordinary:
// with a spoon at a little round table (she sits on her chair facing the room; a tap gives her the next spoonful until the bowl is empty), or through her
// PEG tube with the feeding pump in its backpack, made after the real one: a red front with black zips, blue sides, yellow loops with a blue elastic cord
// laced through them in X's, a small red pocket at the bottom and black straps. She puts it on, the tube is clicked onto the button on her tummy, she turns
// round to show the backpack, a tap starts the pump, and drops of food run down the tube into her tummy while she can dance about. Three beeps when it is done.
// inside.js owns the room, the girl, her walking and the camera; this file has the furniture, the backpack and what she does at the meal, step by step.
// (24 November 2026) The food lies in a heap in the bowl that gets smaller with each spoonful, so the bowl is empty just as the last one is eaten, and a tap
// on the glass of water by the bowl makes her drink: she takes it with her free hand, lifts it to her mouth, tips it, «glugg glugg», and puts it back.
// on(name) tells game.js each new step ('sit', 'eat', 'bite', 'full', 'pick', 'plug', 'ready', 'pump', 'dance', 'beep', 'unplug', 'drop', 'end'),
// and 'gulp' and 'ahh' while she drinks.
// (25 November 2026) A white mobile lies on the table, and the food she orders on it waits on a trolley at the front of the room (food.js, game.js).
// start('spoon', dish) puts a dish from the trolley where the bowl stands; she eats it in five bites like the bowl, pizza, the burger and sushi with her
// fingers, the egg with the spoon. 'taken' is told at the first bite, when the dish has left the trolley for good.
export const MEAL={chair:{x:2.2,z:1.62},seat:.3,side:{x:1.56,z:1.62},table:{x:2.2,z:2.3,r:.46,h:.5},bowl:{x:2.12,z:1.98},glass:{x:2.4,z:1.935},bag:{x:3.05,z:2.52},stand:{x:3.05,z:1.9},chart:{x:2.3,y:2.92,z:-3.46},
 phone:{x:2.45,z:2.55,yaw:.5},cart:{x:-1.75,z:2.62}}; // the mobile at the front of the table to the right, on the screen on every size (not under the title); the trolley in front of the sofa, by the rug
export const BITES=5,PUMP=16,BITE=1.05,DRINK=2;
export const STEPS={spoon:['walk','sit','eat','full','up'],peg:['walk','pick','plug','ready','pump','beep','unplug','drop']};
export const TIME={sit:.6,full:2,up:.5,pick:1.2,plug:.9,beep:1.5,unplug:.7,drop:1.1};
export const FOODS=[{name:'grøt med blåbær',color:'#efe0bb',dots:'#4b5fae'},{name:'pasta med tomatsaus',color:'#f2c35b',dots:'#d9452f'},{name:'yoghurt med jordbær',color:'#fff1f3',dots:'#e0304f'}];
const ease=k=>k*k*(3-2*k),mix=(a,b,k)=>a+(b-a)*k,turn=(from,to,k)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*k;

import {createStarWall} from './star-wall.js';
import {createDish,createBite,createPhone,createCart,dishById} from './food.js';
// Small builders shared with Ludvig's things at the table (friends.js, 25 November 2026): materials, meshes on a parent, rods between two points, an arm aimed at a point.
export function meshKit(T){
 const std=(color,roughness=.8)=>new T.MeshStandardMaterial({color,roughness}),flat=color=>new T.MeshBasicMaterial({color});
 function add(g,m,x,y,z,parent){const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
 const box=(w,h,d,m,x,y,z,p)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,p),cyl=(rt,rb,h,m,x,y,z,p,seg=24)=>add(new T.CylinderGeometry(rt,rb,h,seg),m,x,y,z,p),ball=(r,m,x,y,z,p)=>add(new T.SphereGeometry(r,16,10),m,x,y,z,p);
 const Y=new T.Vector3(0,1,0),va=new T.Vector3(),vb=new T.Vector3();
 function rod(a,b,r,m,p){va.set(...a);vb.set(...b);const len=va.distanceTo(vb)||1e-4,o=cyl(r,r,len,m,0,0,0,p,8);o.position.copy(va).add(vb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(Y,vb.sub(va).normalize());return o;}
 function place(o,a,b){va.set(...a);vb.set(...b);const len=va.distanceTo(vb)||1e-4;o.position.copy(va).add(vb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(Y,vb.sub(va).normalize());o.scale.set(1,len,1);}
 return {std,flat,add,box,cyl,ball,rod,place};}
// An arm (a shoulder group, the arm hanging along −y) pointed along dx, dy, dz in the body's own coordinates.
export function aimArm(arm,dx,dy,dz){const l=Math.hypot(dx,dy,dz)||1;arm.rotation.set(Math.atan2(-dz/l,-dy/l),0,Math.asin(Math.max(-1,Math.min(1,dx/l))));}
// The PEG backpack, built in the space game's sizes and scaled to a child: bottom in the middle at the origin, the front towards +z. Sofia's is made after
// the photo of hers; Ludvig's (friends.js) is the same backpack in his own colours. light: the pump's lamp (its colour is set while it runs); handle: the carrying strap.
export const PEG_COLOURS={front:'#d62f35',pocket:'#c9262d',sides:'#3b7fd8',sidePocket:'#2a4f8f',loops:'#f4d22a',cord:'#2b7fe6'};
export function createPegBag(T,col=PEG_COLOURS){const {std,flat,box,ball,rod}=meshKit(T);
 const bag=new T.Group(),bagParts=new T.Group();bag.add(bagParts);bagParts.scale.setScalar(.62);
 {const P=bagParts,blue=std(col.sides),red=std(col.front),black=std('#1c1c22'),yellow=std(col.loops),cord=std(col.cord);
  const bx=(hx,hy,hz,m,x,y,z)=>box(hx*2,hy*2,hz*2,m,x,y,z,P),bl=(sx,sy,sz,m,x,y,z)=>{const o=ball(1,m,x,y,z,P);o.scale.set(sx,sy,sz);return o;};
  bx(.17,.21,.1,blue,0,.29,0);bl(.17,.1,.1,blue,0,.5,0);bl(.17,.08,.1,blue,0,.08,0);bx(.014,.1,.075,black,.175,.18,.01);bx(.012,.11,.06,std(col.sidePocket),-.175,.2,.01);
  bx(.115,.21,.03,red,0,.31,.085);bl(.115,.07,.04,red,0,.52,.075);for(const x of [-1,1])bx(.01,.21,.012,black,x*.12,.31,.1);bx(.08,.012,.012,black,0,.585,.095);
  bx(.088,.066,.026,std(col.pocket),0,.13,.11);bx(.088,.007,.008,black,0,.197,.132);bx(.012,.03,.006,red,.064,.168,.14);
  const loops=[.46,.35,.24].flatMap(y=>[[-.075,y,.118],[.075,y,.118]]);for(const p of loops)bx(.024,.013,.013,yellow,...p);
  for(let r=0;r<2;r++){const a=loops[r*2],b=loops[r*2+1],c=loops[r*2+2],e=loops[r*2+3];rod([a[0],a[1],.124],[e[0],e[1],.124],.007,cord,P);rod([b[0],b[1],.124],[c[0],c[1],.124],.007,cord,P);}
  rod([-.075,.46,.124],[.075,.46,.124],.007,cord,P);rod([-.075,.24,.124],[-.13,.16,.12],.007,cord,P);bx(.018,.025,.015,black,-.135,.14,.12);}
 const light=flat('#3a3a40');ball(.022*.62,light,.06*.62,.6*.62,.06*.62,bag);
 const handle=new T.Group();bag.add(handle);{const black=std('#1c1c22');for(const [a,b] of [[[-.1,.56,0],[-.05,.72,0]],[[-.05,.72,0],[.05,.72,0]],[[.05,.72,0],[.1,.56,0]]])rod(a.map(v=>v*.62),b.map(v=>v*.62),.011,black,handle);}
 return {bag,light,handle};}
// The lamp on the pump: amber while it waits to be started, green while it runs and when it is done, dark otherwise.
export const pumpLight=(step,time)=>step==='ready'?(Math.sin(time*6)>0?'#ffb43d':'#7a5a20'):step==='pump'?(Math.sin(time*5)>-.3?'#5be37a':'#2a7a3a'):step==='beep'?'#5be37a':'#3a3a40';
// The tube from the backpack's side round to the button on the tummy (curve, in the body's coordinates), with drops of food running down it while the pump runs.
// dress(grow, flow, time): grow 0..1 is how far it has reached (the button clicks on at 1); flow: the drops run.
export function createPegTube(T,parent,curve,reduced=()=>false){const {std,flat,cyl,ball,place}=meshKit(T);
 const mat=std('#c8b4f0',.5),SEG=14,segs=[],group=new T.Group();parent.add(group);for(let i=0;i<SEG;i++)segs.push(cyl(.009,.009,1,mat,0,0,0,group,8));
 const end=curve.getPoint(1),plug=cyl(.018,.018,.01,std('#9a7fd8'),end.x,end.y,end.z,group,12);plug.rotation.x=Math.PI/2;
 const drops=Array.from({length:7},()=>ball(.012,flat('#fff3d2'),0,0,0,group));
 function dress(grow,flow,time){group.visible=grow>0;if(!(grow>0))return;for(let i=0;i<SEG;i++){const u0=i/SEG,u1=(i+1)/SEG,show=u0<grow;segs[i].visible=show;if(show)place(segs[i],curve.getPoint(u0).toArray(),curve.getPoint(Math.min(u1,grow)).toArray());}
  plug.visible=grow>=1;drops.forEach((d,i)=>{d.visible=flow;if(flow)d.position.copy(curve.getPoint(((reduced()?0:time*.42)+i/7)%1));});}
 return {group,dress,plug,drops};}
export function createMeal({T,scene,girl,walkTo,arrived,setHere,reduced=()=>false,on=()=>{}}){
 const std=(color,roughness=.8)=>new T.MeshStandardMaterial({color,roughness}),flat=color=>new T.MeshBasicMaterial({color});
 function add(g,m,x,y,z,parent=scene){const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
 const box=(w,h,d,m,x,y,z,p)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,p),cyl=(rt,rb,h,m,x,y,z,p,seg=24)=>add(new T.CylinderGeometry(rt,rb,h,seg),m,x,y,z,p),ball=(r,m,x,y,z,p)=>add(new T.SphereGeometry(r,16,10),m,x,y,z,p);
 const Y=new T.Vector3(0,1,0),va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3(),vd=new T.Vector3(),q=new T.Quaternion();
 const {rod}=meshKit(T); // a rod from a to b (arrays), r thick: the straps
 // ---- The table, her chair, the bowl, a glass of water and the spoon ----
 const wood=std('#d9a66c'),leg=std('#a8743f'),pink=std('#ff9ec4'),pink2=std('#e07aa3');
 const {table:tb,chair:ch,seat}=MEAL;
 cyl(tb.r,tb.r,.04,wood,tb.x,tb.h-.02,tb.z);cyl(tb.r-.04,tb.r-.04,.005,std('#f2d6ad'),tb.x,tb.h+.002,tb.z,scene,32);for(const [x,z] of [[-.28,-.28],[.28,-.28],[-.28,.28],[.28,.28]])cyl(.025,.025,tb.h-.04,leg,tb.x+x,(tb.h-.04)/2,tb.z+z);
 box(.4,.04,.38,pink,ch.x,seat-.02,ch.z);box(.4,.34,.04,pink,ch.x,seat+.19,ch.z-.19);box(.3,.08,.045,std('#ffd1e2'),ch.x,seat+.3,ch.z-.19);
 for(const [x,z] of [[-.17,-.16],[.17,-.16],[-.17,.16],[.17,.16]])cyl(.02,.02,seat-.04,pink2,ch.x+x,(seat-.04)/2,ch.z+z);
 const bowlY=tb.h,bowl=new T.Group();bowl.position.set(MEAL.bowl.x,bowlY,MEAL.bowl.z);scene.add(bowl);cyl(.1,.07,.07,std('#79e4e2',.5),0,.035,0,bowl);cyl(.105,.105,.012,std('#a9f0ee',.5),0,.07,0,bowl);
 // The bowl is solid, so the food is a heap on top of its rim, over a darker disc that is the inside of the bowl (food sunk below the rim could not be seen).
 cyl(.09,.09,.002,std('#5fc9c7',.5),0,.077,0,bowl,32);const HEAP=.077;
 const food=add(new T.SphereGeometry(1,24,10,0,Math.PI*2,0,Math.PI/2),std('#efe0bb'),0,HEAP,0,bowl),dots=[0,1,2,3,4].map(()=>ball(.014,std('#4b5fae'),0,HEAP,0,bowl));food.visible=false;for(const d of dots)d.visible=false;
 // the glass of water: yellow, full to the top; its middle is the group's origin
 const GLASS_H=.09,glassAt=new T.Vector3(MEAL.glass.x,bowlY+GLASS_H/2,MEAL.glass.z),glass=new T.Group();glass.position.copy(glassAt);scene.add(glass);
 cyl(.04,.035,GLASS_H,std('#ffde71'),0,0,0,glass);cyl(.033,.033,.003,std('#9fd8f0',.3),0,GLASS_H/2+.001,0,glass);
 // the spoon: along +y from the hand, a silver handle and bowl, and a little food on it on its way up
 const spoon=new T.Group();scene.add(spoon);const silver=std('#c9ced8',.35);cyl(.006,.007,.11,silver,0,.055,0,spoon,8);const sb=ball(1,silver,0,.125,0,spoon);sb.scale.set(.02,.026,.008);
 const bite=ball(1,std('#efe0bb'),0,.128,-.008,spoon);bite.scale.set(.016,.018,.012);const restSpoon=()=>{spoon.position.set(MEAL.bowl.x+.17,bowlY+.008,MEAL.bowl.z-.02);spoon.quaternion.setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2);spoon.rotateOnWorldAxis(Y,.4);bite.visible=false;};restSpoon();
 // ---- The white mobile and the trolley with the food she orders (food.js): only in her own room (homeThings; inside.js hides it at Ludvig's) ----
 // ordered: what she has ordered (game.js, setFood), arriving: the orders still on their way; the trolley shows the rest, without the dish on the table.
 const homeThings=new T.Group();scene.add(homeThings);
 const phone=createPhone(T);phone.group.position.set(MEAL.phone.x,bowlY+.002,MEAL.phone.z);phone.group.rotation.y=MEAL.phone.yaw;homeThings.add(phone.group);let phoneOpen=false;
 const cart=createCart(T);cart.group.position.set(MEAL.cart.x,0,MEAL.cart.z);homeThings.add(cart.group);cart.group.visible=false;
 let ordered=[],arriving=[],shownKey=null,onCart=[],pop={i:-1,at:0};
 // the dish she eats sits where the bowl stands; a bite of pizza, the burger or sushi is in her hand on its way up
 const dishSpot=new T.Group();dishSpot.position.set(MEAL.bowl.x,bowlY,MEAL.bowl.z);scene.add(dishSpot);let dish=null,handBite=null;
 const dispose=g=>g.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
 // ---- The PEG backpack (createPegBag, above), on the floor beside the table ----
 const {bag,light:bagLight,handle}=createPegBag(T);scene.add(bag);
 // ---- What she wears with it: the straps over her shoulders and the tube from the backpack's side round to the button on her tummy, with drops of food ----
 const body=girl.group.children[0],worn=new T.Group();body.add(worn);worn.visible=false;
 {const black=std('#1c1c22');for(const s of [-1,1]){rod([s*.07,.77,.11],[s*.1,.81,.01],.012,black,worn);rod([s*.1,.81,.01],[s*.09,.6,-.085],.012,black,worn);}}
 const TUBE=new T.CubicBezierCurve3(new T.Vector3(.11,.5,.12),new T.Vector3(.26,.36,.04),new T.Vector3(.17,.4,-.16),new T.Vector3(.035,.56,-.092));
 const tube=createPegTube(T,body,TUBE,reduced),tubeOn=tube.group,dressTube=tube.dress;
 // ---- Hit boxes: the table (with the chair and bowl) and the backpack on the floor ----
 // and the glass on the table, a little bigger than it is (inside the table's box: inside.js takes the glass when both are hit).
 const hitMat=new T.MeshBasicMaterial({color:'#ff00ff'}),tableHit=box(1.05,.66,1.45,hitMat,tb.x,.33,(tb.z+ch.z)/2-.05),bagHit=box(.36,.5,.3,hitMat,MEAL.bag.x,.25,MEAL.bag.z),glassHit=box(.17,.2,.17,hitMat,glassAt.x,bowlY+.08,glassAt.z);
 tableHit.visible=bagHit.visible=glassHit.visible=false;tableHit.userData.kind='table';bagHit.userData.kind='bag';glassHit.userData.kind='glass';
 // the mobile, a little bigger than it is (partly inside the table's box: inside.js takes the mobile when both are hit), and each dish on the trolley
 // (moved out of the way while its place is empty)
 const phoneHit=box(.26,.16,.3,hitMat,MEAL.phone.x,bowlY+.04,MEAL.phone.z);phoneHit.visible=false;Object.assign(phoneHit.userData,{kind:'phone',home:true});
 const slotHits=cart.slots.map((p,i)=>{const h=box(.27,.24,.3,hitMat,0,-50,0);h.visible=false;Object.assign(h.userData,{kind:'dish',home:true,slot:i});return h;});
 // Where she cannot walk: the table with the chair, and the backpack on the floor.
 const obstacles=[{x0:tb.x-.62,x1:tb.x+.62,z0:ch.z-.36,z1:tb.z+.58},{x0:MEAL.bag.x-.3,x1:MEAL.bag.x+.3,z0:MEAL.bag.z-.25,z1:MEAL.bag.z+.3}];
 // and the trolley, while it stands there (dressCart puts it in and takes it out of the list)
 const cartRect={x0:MEAL.cart.x-cart.half.x-.06,x1:MEAL.cart.x+cart.half.x+.06,z0:MEAL.cart.z-cart.half.z-.06,z1:MEAL.cart.z+cart.half.z+.06};
 // ---- The brushing chart on the back wall: a sheet with a big tooth and ten places, a star for each time she brushes ----
 const wallArt=new T.Group();scene.add(wallArt); // the chart and the stars: Sofia's, so they are not on the walls at Ludvig's (inside.js)
 const chart=new T.Group();chart.position.set(MEAL.chart.x,MEAL.chart.y,MEAL.chart.z);wallArt.add(chart);
 box(.82,.64,.02,std('#fffaf0'),0,0,0,chart);box(.82,.14,.022,flat('#79e4e2'),0,.25,.002,chart);const tooth=ball(1,flat('#ffffff'),-.29,.02,.02,chart);tooth.scale.set(.09,.1,.01);for(const x of [-.05,.05]){const r=ball(1,flat('#ffffff'),-.29+x,-.08,.02,chart);r.scale.set(.035,.06,.01);}
 const starShape=new T.Shape();for(let i=0;i<10;i++){const r=i%2?.45:1,a=Math.PI/2+i*Math.PI/5;starShape[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}const starGeo=new T.ShapeGeometry(starShape),starOn=flat('#2fbfbc'),starOff=flat('#e8e0d0');
 const stars=Array.from({length:10},(_,i)=>{const s=add(starGeo,starOff,-.1+(i%5)*.11,.07-Math.floor(i/5)*.17,.015,chart);s.scale.setScalar(.04);return s;});
 // After ten the chart is full, and the stars go on the walls, as many as she brushes (star-wall.js).
 const starWall=createStarWall(T,wallArt);
 function setBrushed(n){stars.forEach((s,i)=>{const on=i<Math.min(10,n);s.material=on?starOn:starOff;s.scale.setScalar(on?.05:.03);});starWall.set(n);}
 // ---- The meal, step by step ----
 // kind: null, 'spoon' or 'peg'; s: seconds into the step; bite: seconds into a spoonful (−1 between); queued: taps waiting; pump: seconds the pump has run;
 // dance: seconds into a twirl (−1 when not); view: how far the camera has glided in to the meal; food: today's dish (one after the other);
 // drink: seconds into a drink from the glass (−1 when not); drinkNext: the glass was tapped while she was busy, so she drinks next.
 // dish: the id of a dish from the trolley eaten instead of the bowl (null for the bowl); taken: it has left the trolley for good (at the first bite).
 const st={kind:null,last:null,step:'',s:0,bites:0,bite:-1,queued:0,pump:0,dance:-1,drink:-1,drinkNext:false,view:0,food:-1,dish:null,taken:false};
 function start(kind,dishId=null){if(st.kind)return false;const d=kind==='spoon'&&ordered.includes(dishId)?dishId:null;
  Object.assign(st,{kind,last:kind,step:'walk',s:0,bites:0,bite:-1,queued:0,pump:0,dance:-1,drink:-1,drinkNext:false,dish:d,taken:false});if(kind==='spoon'&&!d)st.food=(st.food+1)%FOODS.length;
  const f=FOODS[Math.max(0,st.food)];food.material.color.set(f.color);bite.material.color.set(d==='egg'?'#ffd96a':f.color);for(const d of dots)d.material.color.set(f.dots);
  if(dish){dishSpot.remove(dish.group);dispose(dish.group);dish=null;}if(handBite){scene.remove(handBite);dispose(handBite);handBite=null;}
  if(d){dish=createDish(T,d);dishSpot.add(dish.group);if(dishById(d).hand){handBite=createBite(T,d);handBite.visible=false;scene.add(handBite);}}
  const to=kind==='spoon'?MEAL.side:MEAL.stand,face=kind==='spoon'?Math.atan2(-(ch.x-to.x),-(ch.z-to.z)):Math.atan2(-(MEAL.bag.x-to.x),-(MEAL.bag.z-to.z));walkTo(to.x,to.z,{yaw:face,meal:true},true);return true;}
 function next(){const list=STEPS[st.kind],i=list.indexOf(st.step);st.s=0;if(i>=list.length-1){end();return;}st.step=list[i+1];on(st.step);if(st.step==='eat'&&st.drinkNext){st.drinkNext=false;st.drink=0;}}
 function end(){const k=st.kind;if(!k)return;const p=k==='spoon'?MEAL.side:MEAL.stand;setHere(p.x,p.z,Math.PI);st.kind=null;st.step='';restSpoon();on('end');}
 function reset(){st.kind=null;st.step='';st.view=0;st.bite=-1;st.dance=-1;st.drink=-1;st.drinkNext=false;st.dish=null;st.taken=false;restSpoon();dress(0);}
 function tap(){if(!st.kind)return null;if(st.step==='eat'){if(st.bite>=0||st.drink>=0)st.queued=Math.min(2,st.queued+1);else st.bite=0;return 'bite';}
  if(st.step==='ready'){st.step='pump';st.s=0;st.pump=0;on('pump');return 'pump';}if(st.step==='pump'&&st.dance<0){st.dance=0;on('dance');return 'dance';}return null;}
 // A tap on the glass at a meal with the spoon: she drinks now ('drink'), or as soon as this spoonful is eaten or she has sat down ('later').
 function drink(){if(st.kind!=='spoon')return null;if(st.step==='walk'||st.step==='sit'||st.step==='eat'&&st.bite>=0){st.drinkNext=true;return 'later';}
  if(st.step!=='eat'||st.drink>=0)return null;st.drink=0;return 'drink';}
 // «Ferdig» before the end: from the chair she gets up; with the pump it stops (three beeps), the tube comes off and the backpack goes back.
 function finish(){if(!st.kind)return;const i=STEPS[st.kind].indexOf(st.step);
  if(st.step==='walk'){st.kind=null;st.step='';restSpoon();on('end');return;}
  if(st.kind==='spoon'&&i<=2){st.step='up';st.s=0;st.bite=-1;st.queued=0;st.drink=-1;st.drinkNext=false;on('thanks');return;}
  if(st.kind==='peg'&&i>=2&&i<=4){st.step=i<=3?'unplug':'beep';st.s=0;on(st.step);}} // before the pump has run the tube just comes off
 const stepTime=()=>TIME[st.step]??Infinity;
 function update(dt,time){starWall.update(time,reduced());st.view+=((st.kind&&st.step!=='walk'?1:0)-st.view)*Math.min(1,dt*2.2);if(!st.kind){dress(time);return;}st.s+=dt;
  if(st.step==='walk'){if(arrived())next();}
  // a drink: «glugg» while the glass is tipped at her mouth, «ahh» as it comes down, then any spoonful tapped meanwhile
  else if(st.step==='eat'&&st.drink>=0){const was=st.drink;st.drink+=dt;if(was<.8&&st.drink>=.8)on('gulp');if(was<1.45&&st.drink>=1.45)on('ahh');
   if(st.drink>=DRINK){st.drink=-1;if(st.bites>=BITES){next();dress(time);return;}if(st.queued>0){st.queued--;st.bite=0;}}}
  else if(st.step==='eat'&&st.bite>=0){const was=st.bite;st.bite+=dt;if(was<.5&&st.bite>=.5){st.bites++;on('bite');if(st.dish&&!st.taken){st.taken=true;on('taken');}}
   if(st.bite>=BITE){st.bite=-1;if(st.drinkNext){st.drinkNext=false;st.drink=0;}else if(st.bites>=BITES){next();dress(time);return;}else if(st.queued>0){st.queued--;st.bite=0;}}}
  if(st.step==='pump'){st.pump+=dt;if(st.pump>=PUMP){st.step='beep';st.s=0;on('beep');}}
  if(st.dance>=0){st.dance+=dt;if(st.dance>=1.3)st.dance=-1;}
  if(st.s>=stepTime())next();dress(time);}
 // How much food is left in the bowl (1 full, 0 empty): a spoonful leaves the bowl as the spoon scoops it up, before it reaches her mouth.
 function foodLeft(){if(st.kind!=='spoon'||!['walk','sit','eat'].includes(st.step))return 0;return Math.max(0,1-(st.bites+(st.step==='eat'&&st.bite>=.1&&st.bite<.5?1:0))/BITES);}
 // ---- Her pose, after inside.js has walked and posed her: on the chair, at the bowl, with the backpack ----
 const legs=girl.legs,arms=girl.arms;
 const aim=aimArm;
 const SH=[[-.15,.76,0],[.15,.76,0]];
 // Body coordinates (she faces −z) of the bowl and her mouth while she sits on the chair facing the room.
 const BOWL=[MEAL.bowl.x-ch.x,0,0],seated={x:ch.x,y:seat-.4,z:ch.z},MOUTH=[0,.867,-.116];BOWL[0]=-(MEAL.bowl.x-ch.x);BOWL[1]=bowlY+.05-seated.y;BOWL[2]=-(MEAL.bowl.z-ch.z);
 const bagAt=new T.Vector3(),bagQ=new T.Quaternion(),floorQ=new T.Quaternion(),flip=new T.Quaternion();
 // Drinking, in body coordinates: the glass on the table and at her mouth (tipped towards her), and where her left hand holds it: by the side nearest her on
 // the table, by its left side at her mouth. The glass stands at the edge of the table nearest her, and her arm stretches a little (at most a quarter) to reach it.
 const GLASS={table:[-(MEAL.glass.x-ch.x),bowlY+GLASS_H/2-seated.y,-(MEAL.glass.z-ch.z)],mouth:[0,MOUTH[1]-.02,MOUTH[2]-.067],gripTable:[-.02,0,.06],gripMouth:[-.06,-.01,0]},REST=[-.04,-.16,-.3],ARM=.235;
 const mix3=(a,b,k)=>a.map((v,i)=>mix(v,b[i],k)),hand=new T.Vector3(),tilt=new T.Quaternion(),X=new T.Vector3(1,0,0);
 function drinkPhase(){const k=st.drink,up=k<.35?0:k<.8?ease((k-.35)/.45):k<1.4?1:k<1.8?1-ease((k-1.4)/.4):0,sip=k<.8||k>=1.4?0:ease(Math.min(1,(k-.8)/.3));
  return {up,sip,free:k<.35?1-ease(k/.35):k>=1.8?ease(Math.min(1,(k-1.8)/.2)):0,held:k>=.35&&k<1.8,open:k>=.7&&k<1.45};}
 // Her left arm towards the glass (or resting), and the glass in her hand.
 function drinkArm(){const P=drinkPhase(),c=mix3(GLASS.table,[GLASS.mouth[0],GLASS.mouth[1]+.024*P.sip,GLASS.mouth[2]],P.up),g=mix3(GLASS.gripTable,GLASS.gripMouth,P.up),
   want=[c[0]+g[0]-SH[0][0],c[1]+g[1]-SH[0][1],c[2]+g[2]-SH[0][2]],len=Math.hypot(...want),dir=mix3(want.map(v=>v/len),REST.map(v=>v/Math.hypot(...REST)),P.free);
  aim(arms[0],...dir);arms[0].scale.y=mix(Math.min(1.25,Math.max(1,len/ARM)),1,P.free);if(!P.held)return P;
  // the glass where her hand really is, so she always holds it
  girl.group.updateMatrixWorld(true);arms[0].localToWorld(hand.set(0,-ARM,0));body.worldToLocal(hand);hand.sub(va.set(...g));glass.position.copy(body.localToWorld(hand));
  body.getWorldQuaternion(glass.quaternion);glass.quaternion.multiply(tilt.setFromAxisAngle(X,P.up*(.6+.4*P.sip)));return P;}
 // ---- The trolley and the mobile ----
 // What stands on the trolley: what she has ordered, in order, without the orders still on their way and the dish she has taken to the table.
 function cartList(){const l=[...ordered];for(const id of arriving){const i=l.lastIndexOf(id);if(i>=0)l.splice(i,1);}
  if(st.kind==='spoon'&&st.dish&&!st.taken){const i=l.indexOf(st.dish);if(i>=0)l.splice(i,1);}return l;}
 // The dishes on the trolley, made again when the list changes (a dish that has just come pops up); the trolley is there while it has food on it or she eats
 // a dish from it, and is in the way (obstacles) while it is there in her own room. The mobile's screen lights up now and then, and while it is open.
 function dressCart(time){const list=cartList(),key=list.join();
  if(key!==shownKey){const grew=shownKey!==null&&list.length>onCart.length;for(const d of onCart){cart.group.remove(d.group);dispose(d.group);}
   onCart=list.map((id,i)=>{const d=createDish(T,id);d.group.position.copy(cart.slots[i]);cart.group.add(d.group);return d;});shownKey=key;if(grew)pop={i:list.length-1,at:time};
   slotHits.forEach((h,i)=>{if(i<list.length){cart.group.updateMatrixWorld(true);cart.group.localToWorld(h.position.copy(cart.slots[i]));h.position.y+=.06;h.userData.id=list[i];}else{h.position.set(0,-50,0);h.userData.id=null;}});}
  const p=onCart[pop.i],u=(time-pop.at)/.45;if(p){const k=u>=1||u<0?1:1+Math.sin(u*Math.PI)*.35*(1-u)-(1-u)*(1-u)*.9;p.group.scale.setScalar(Math.max(.05,k));if(u>=1)pop.i=-1;}
  cart.group.visible=list.length>0||st.kind==='spoon'&&!!st.dish;
  const i=obstacles.indexOf(cartRect),want=cart.group.visible&&homeThings.visible;if(want&&i<0)obstacles.push(cartRect);else if(!want&&i>=0)obstacles.splice(i,1);
  phone.set(phoneOpen?1:reduced()?.3:Math.pow(Math.max(0,Math.sin(time*1.3)),8));}
 function dress(time){const k=st.kind,s=st.step,c=Math.min(1,st.s/stepTime());dressCart(time);
  // a dish from the trolley stands where the bowl was while she eats it, and is gone when she gets down from the chair
  const onTable=!!dish&&k==='spoon'&&['walk','sit','eat','full','up'].includes(s);bowl.visible=!onTable;if(dish){dish.group.visible=onTable;if(onTable)dish.set(foodLeft());}if(handBite)handBite.visible=false;
  // the bowl: a full heap at the start of a meal with the spoon, smaller with each spoonful (as the spoon scoops it up) and gone with the last one
  const left=foodLeft(),r=.085*(.5+.5*left),h=.007+.03*left;food.visible=left>0;food.scale.set(r,h,r);
  dots.forEach((d,i)=>{const a=i*2.4;d.visible=left>0&&i<Math.ceil(5*left);d.position.set(Math.cos(a)*.5*r,HEAP+.82*h,Math.sin(a)*.5*r);});
  if(!(k==='spoon'&&s==='eat'&&drinkPhase().held)){glass.position.copy(glassAt);glass.quaternion.identity();} // in her hand while she drinks (pose)
  // the backpack: on the floor, flying up onto her back (or down again), or on her back
  const wearing=k==='peg'&&['plug','ready','pump','beep','unplug'].includes(s),carry=k==='peg'&&(s==='pick'||s==='drop')?(s==='pick'?ease(Math.min(1,Math.max(0,(c-.25)/.6))):1-ease(Math.min(1,Math.max(0,(c-.1)/.6)))):wearing?1:0;
  worn.visible=carry>=1;handle.visible=carry<.5;bagHit.visible=false;bagHit.userData.kind=k?'none':'bag';
  if(carry<=0){bag.position.set(MEAL.bag.x,0,MEAL.bag.z);bag.quaternion.identity();}
  else{girl.group.updateMatrixWorld(true);body.localToWorld(bagAt.set(0,.42,.148));body.getWorldQuaternion(bagQ);if(carry>=1){bag.position.copy(bagAt);bag.quaternion.copy(bagQ);}
   else{bag.position.set(mix(MEAL.bag.x,bagAt.x,carry),mix(0,bagAt.y,carry)+Math.sin(carry*Math.PI)*.35,mix(MEAL.bag.z,bagAt.z,carry));bag.quaternion.copy(floorQ.identity()).slerp(bagQ,carry);}}
  bagLight.color.set(pumpLight(s,time));
  dressTube(k==='peg'?(s==='plug'?c:s==='unplug'?1-c:['ready','pump','beep'].includes(s)?1:0):0,s==='pump',time);
  if(!(k==='spoon'&&s==='eat'))restSpoon();}
 // Called every frame after the girl has been posed and animated; the walk itself is inside.js's.
 function pose(time){arms[0].scale.y=1;const k=st.kind,s=st.step;if(!k||s==='walk')return false;const c=Math.min(1,st.s/stepTime()),g=girl.group;
  if(k==='spoon'){const side=MEAL.side,face0=Math.atan2(-(ch.x-side.x),-(ch.z-side.z));
   if(s==='sit'||s==='up'){const e=ease(s==='sit'?c:1-c);g.position.set(mix(side.x,seated.x,e),mix(0,seated.y,e)+Math.sin(e*Math.PI)*.3,mix(side.z,seated.z,e));g.rotation.set(0,turn(face0,Math.PI,e),0);
    if(e>.55)for(const l of legs)l.rotation.x=1.35*ease((e-.55)/.45);return true;}
   g.position.set(seated.x,seated.y+(s==='full'&&!reduced()?Math.abs(Math.sin(st.s*4.5))*.04:0),seated.z);g.rotation.set(0,Math.PI,0);for(const l of legs)l.rotation.x=1.35+(reduced()?0:Math.sin(time*2.2+(l===legs[0]?0:2))*.08);
   if(s==='full'){const pat=reduced()?0:Math.abs(Math.sin(st.s*9))*.04;aim(arms[0],.1,-.12+pat,-.12);aim(arms[1],-.1,-.12+pat,-.12);girl.setLaugh(true);return true;}
   const b=st.bite,lift=b<0?0:b<.4?ease(b/.4):b<.6?1:b<1?1-ease((b-.6)/.4):0,scoop=b>=0&&b<.15?Math.sin(b/.15*Math.PI)*.04:0;
   const to=[mix(BOWL[0],MOUTH[0]+.06,lift),mix(BOWL[1]-scoop,MOUTH[1]-.06,lift),mix(BOWL[2],MOUTH[2]-.1,lift)];aim(arms[1],to[0]-SH[1][0],to[1]-SH[1][1],to[2]-SH[1][2]);
   const drinking=st.drink>=0?drinkArm():null;if(!drinking)aim(arms[0],...REST);
   girl.setLaugh(drinking?.open||b>=.36&&b<.58||b>=.58&&b<.98&&!reduced()&&Math.sin(time*22)>.3);
   // the spoon in her hand, pointing at the bowl or her mouth
   g.updateMatrixWorld(true);arms[1].localToWorld(va.set(0,-.25,0));const target=vc.set(mix(BOWL[0],MOUTH[0],lift),mix(BOWL[1]-.03,MOUTH[1],lift),mix(BOWL[2],MOUTH[2],lift));body.localToWorld(target);
   spoon.position.copy(va);spoon.quaternion.setFromUnitVectors(Y,vb.copy(target).sub(va).normalize());bite.visible=b>=.1&&b<.52;
   // pizza, the burger and sushi with her fingers: the spoon stays on the table, and the bite is held over her hand and a little in front of it
   // (half way from her fingers to her mouth as it comes up, so it is by her mouth when her hand is up)
   if(handBite){restSpoon();body.worldToLocal(vd.copy(va));vd.y+=.035;vd.z-=.035;vd.lerp(vb.set(...MOUTH),.5*lift);handBite.position.copy(body.localToWorld(vd));body.getWorldQuaternion(handBite.quaternion);handBite.visible=b>=.1&&b<.52;}
   return true;}
  // with the backpack: by it on the floor to pick it up and put it down; turned round to show it while the pump waits; free to dance while it runs
  const st0=MEAL.stand,toBag=Math.atan2(-(MEAL.bag.x-st0.x),-(MEAL.bag.z-st0.z));let yaw=Math.PI,y=0;
  if(s==='pick')yaw=turn(toBag,Math.PI,ease(Math.max(0,(c-.3)/.6)));
  if(s==='drop')yaw=turn(Math.PI,toBag,ease(Math.min(1,c/.4)));
  if(s==='ready')yaw=turn(Math.PI,.55,ease(Math.min(1,st.s/.7)));if(s==='pump')yaw=turn(.55,Math.PI,ease(Math.min(1,st.s/.7)));
  if(st.dance>=0){const d=st.dance/1.3;yaw=Math.PI+(reduced()?0:ease(d)*Math.PI*2);y=Math.sin(d*Math.PI)*(reduced()?.12:.3);const up=2.5*Math.sin(d*Math.PI);arms[0].rotation.set(0,0,-.08-up);arms[1].rotation.set(0,0,.08+up);girl.setLaugh(true);}
  else if(s==='pick'||s==='drop'){const reach=Math.sin(c*Math.PI);arms[0].rotation.x=arms[1].rotation.x=-1.2*reach;}
  g.position.set(st0.x,y,st0.z);g.rotation.set(0,yaw,0);return true;}
 // The camera glides in to the table, or to her and the backpack: what it should keep in view.
 function viewPoints(){const k=st.kind||st.last;return k==='spoon'?[[tb.x-.45,.5,tb.z+.1],[tb.x+.45,.5,tb.z+.1],[ch.x-.35,1.1,ch.z-.2],[ch.x+.35,1.1,ch.z-.2]]:[[MEAL.stand.x-.4,1.2,MEAL.stand.z],[MEAL.stand.x+.35,0,MEAL.stand.z],[MEAL.bag.x-.3,0,MEAL.bag.z+.25],[MEAL.bag.x+.3,.5,MEAL.bag.z]];}
 // game.js tells what she has ordered and what is on its way, and when the mobile is open.
 function setFood(list,onTheWay=[]){ordered=[...list];arriving=[...onTheWay];}
 return {st,start,tap,drink,finish,update,pose,reset,setBrushed,starWall,wallArt,foodLeft,viewPoints,hits:[tableHit,bagHit,glassHit,phoneHit,...slotHits],obstacles,bag,spoon,glass,food,worn,tubeOn,chart,
  setFood,cartList,setPhoneOpen:o=>{phoneOpen=!!o;},homeThings,phone,cart,phoneHit,slotHits,dishSpot,get dish(){return dish;},get handBite(){return handBite;},get onCart(){return onCart;},
  get active(){return !!st.kind;},get busy(){return !!st.kind&&st.step!=='walk';}};
}
