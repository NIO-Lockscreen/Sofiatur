// Mealtime in the house (23 November 2026, as in Sofia's space game). Two ways to eat, side by side and just as ordinary:
// with a spoon at a little round table (she sits on her chair facing the room; a tap gives her the next spoonful until the bowl is empty), or through her
// PEG tube with the feeding pump in its backpack, made after the real one: a red front with black zips, blue sides, yellow loops with a blue elastic cord
// laced through them in X's, a small red pocket at the bottom and black straps. She puts it on, the tube is clicked onto the button on her tummy, she turns
// round to show the backpack, a tap starts the pump, and drops of food run down the tube into her tummy while she can dance about. Three beeps when it is done.
// inside.js owns the room, the girl, her walking and the camera; this file has the furniture, the backpack and what she does at the meal, step by step.
// on(name) tells game.js each new step ('sit', 'eat', 'bite', 'full', 'pick', 'plug', 'ready', 'pump', 'dance', 'beep', 'unplug', 'drop', 'end').
export const MEAL={chair:{x:2.2,z:1.62},seat:.3,side:{x:1.56,z:1.62},table:{x:2.2,z:2.3,r:.46,h:.5},bowl:{x:2.12,z:1.98},bag:{x:3.05,z:2.52},stand:{x:3.05,z:1.9},chart:{x:2.3,y:2.92,z:-3.46}};
export const BITES=5,PUMP=16,BITE=1.05;
export const STEPS={spoon:['walk','sit','eat','full','up'],peg:['walk','pick','plug','ready','pump','beep','unplug','drop']};
const TIME={sit:.6,full:2,up:.5,pick:1.2,plug:.9,beep:1.5,unplug:.7,drop:1.1};
export const FOODS=[{name:'grøt med blåbær',color:'#efe0bb',dots:'#4b5fae'},{name:'pasta med tomatsaus',color:'#f2c35b',dots:'#d9452f'},{name:'yoghurt med jordbær',color:'#fff1f3',dots:'#e0304f'}];
const ease=k=>k*k*(3-2*k),mix=(a,b,k)=>a+(b-a)*k,turn=(from,to,k)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*k;

export function createMeal({T,scene,girl,walkTo,arrived,setHere,reduced=()=>false,on=()=>{}}){
 const std=(color,roughness=.8)=>new T.MeshStandardMaterial({color,roughness}),flat=color=>new T.MeshBasicMaterial({color});
 function add(g,m,x,y,z,parent=scene){const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
 const box=(w,h,d,m,x,y,z,p)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,p),cyl=(rt,rb,h,m,x,y,z,p,seg=24)=>add(new T.CylinderGeometry(rt,rb,h,seg),m,x,y,z,p),ball=(r,m,x,y,z,p)=>add(new T.SphereGeometry(r,16,10),m,x,y,z,p);
 const Y=new T.Vector3(0,1,0),va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3(),q=new T.Quaternion();
 // A rod from a to b (arrays), r thick: the cord on the backpack, its straps and the tube.
 function rod(a,b,r,m,p){va.set(...a);vb.set(...b);const len=va.distanceTo(vb)||1e-4,o=cyl(r,r,len,m,0,0,0,p,8);o.position.copy(va).add(vb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(Y,vb.sub(va).normalize());return o;}
 function place(o,a,b){va.set(...a);vb.set(...b);const len=va.distanceTo(vb)||1e-4;o.position.copy(va).add(vb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(Y,vb.sub(va).normalize());o.scale.set(1,len,1);}
 // ---- The table, her chair, the bowl, a cup and the spoon ----
 const wood=std('#d9a66c'),leg=std('#a8743f'),pink=std('#ff9ec4'),pink2=std('#e07aa3');
 const {table:tb,chair:ch,seat}=MEAL;
 cyl(tb.r,tb.r,.04,wood,tb.x,tb.h-.02,tb.z);cyl(tb.r-.04,tb.r-.04,.005,std('#f2d6ad'),tb.x,tb.h+.002,tb.z,scene,32);for(const [x,z] of [[-.28,-.28],[.28,-.28],[-.28,.28],[.28,.28]])cyl(.025,.025,tb.h-.04,leg,tb.x+x,(tb.h-.04)/2,tb.z+z);
 box(.4,.04,.38,pink,ch.x,seat-.02,ch.z);box(.4,.34,.04,pink,ch.x,seat+.19,ch.z-.19);box(.3,.08,.045,std('#ffd1e2'),ch.x,seat+.3,ch.z-.19);
 for(const [x,z] of [[-.17,-.16],[.17,-.16],[-.17,.16],[.17,.16]])cyl(.02,.02,seat-.04,pink2,ch.x+x,(seat-.04)/2,ch.z+z);
 const bowlY=tb.h,bowl=new T.Group();bowl.position.set(MEAL.bowl.x,bowlY,MEAL.bowl.z);scene.add(bowl);cyl(.1,.07,.07,std('#79e4e2',.5),0,.035,0,bowl);cyl(.105,.105,.012,std('#a9f0ee',.5),0,.07,0,bowl);
 const food=cyl(.088,.088,.02,std('#efe0bb'),0,.05,0,bowl),dots=[0,1,2,3,4].map(i=>{const a=i*2.4;return ball(.016,std('#4b5fae'),Math.cos(a)*.05,.062,Math.sin(a)*.05,bowl);});food.visible=false;for(const d of dots)d.visible=false;
 cyl(.04,.035,.09,std('#ffde71'),MEAL.bowl.x-.24,bowlY+.045,MEAL.bowl.z+.12);
 // the spoon: along +y from the hand, a silver handle and bowl, and a little food on it on its way up
 const spoon=new T.Group();scene.add(spoon);const silver=std('#c9ced8',.35);cyl(.006,.007,.11,silver,0,.055,0,spoon,8);const sb=ball(1,silver,0,.125,0,spoon);sb.scale.set(.02,.026,.008);
 const bite=ball(1,std('#efe0bb'),0,.128,-.008,spoon);bite.scale.set(.016,.018,.012);const restSpoon=()=>{spoon.position.set(MEAL.bowl.x+.17,bowlY+.008,MEAL.bowl.z-.02);spoon.quaternion.setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2);spoon.rotateOnWorldAxis(Y,.4);bite.visible=false;};restSpoon();
 // ---- The PEG backpack, built in the space game's sizes and scaled to her: bottom in the middle at the origin, the front towards +z ----
 const bag=new T.Group(),bagParts=new T.Group();bag.add(bagParts);bagParts.scale.setScalar(.62);scene.add(bag);
 {const P=bagParts,blue=std('#3b7fd8'),red=std('#d62f35'),black=std('#1c1c22'),yellow=std('#f4d22a'),cord=std('#2b7fe6');
  const bx=(hx,hy,hz,m,x,y,z)=>box(hx*2,hy*2,hz*2,m,x,y,z,P),bl=(sx,sy,sz,m,x,y,z)=>{const o=ball(1,m,x,y,z,P);o.scale.set(sx,sy,sz);return o;};
  bx(.17,.21,.1,blue,0,.29,0);bl(.17,.1,.1,blue,0,.5,0);bl(.17,.08,.1,blue,0,.08,0);bx(.014,.1,.075,black,.175,.18,.01);bx(.012,.11,.06,std('#2a4f8f'),-.175,.2,.01);
  bx(.115,.21,.03,red,0,.31,.085);bl(.115,.07,.04,red,0,.52,.075);for(const x of [-1,1])bx(.01,.21,.012,black,x*.12,.31,.1);bx(.08,.012,.012,black,0,.585,.095);
  bx(.088,.066,.026,std('#c9262d'),0,.13,.11);bx(.088,.007,.008,black,0,.197,.132);bx(.012,.03,.006,red,.064,.168,.14);
  const loops=[.46,.35,.24].flatMap(y=>[[-.075,y,.118],[.075,y,.118]]);for(const p of loops)bx(.024,.013,.013,yellow,...p);
  for(let r=0;r<2;r++){const a=loops[r*2],b=loops[r*2+1],c=loops[r*2+2],e=loops[r*2+3];rod([a[0],a[1],.124],[e[0],e[1],.124],.007,cord,P);rod([b[0],b[1],.124],[c[0],c[1],.124],.007,cord,P);}
  rod([-.075,.46,.124],[.075,.46,.124],.007,cord,P);rod([-.075,.24,.124],[-.13,.16,.12],.007,cord,P);bx(.018,.025,.015,black,-.135,.14,.12);}
 const bagLight=flat('#3a3a40'),lightBall=ball(.022*.62,bagLight,.06*.62,.6*.62,.06*.62,bag);
 const handle=new T.Group();bag.add(handle);{const black=std('#1c1c22');for(const [a,b] of [[[-.1,.56,0],[-.05,.72,0]],[[-.05,.72,0],[.05,.72,0]],[[.05,.72,0],[.1,.56,0]]])rod(a.map(v=>v*.62),b.map(v=>v*.62),.011,black,handle);}
 // ---- What she wears with it: the straps over her shoulders and the tube from the backpack's side round to the button on her tummy, with drops of food ----
 const body=girl.group.children[0],worn=new T.Group();body.add(worn);worn.visible=false;
 {const black=std('#1c1c22');for(const s of [-1,1]){rod([s*.07,.77,.11],[s*.1,.81,.01],.012,black,worn);rod([s*.1,.81,.01],[s*.09,.6,-.085],.012,black,worn);}}
 const TUBE=new T.CubicBezierCurve3(new T.Vector3(.11,.5,.12),new T.Vector3(.26,.36,.04),new T.Vector3(.17,.4,-.16),new T.Vector3(.035,.56,-.092)),tubeMat=std('#c8b4f0',.5);
 const SEG=14,segs=[],tubeOn=new T.Group();body.add(tubeOn);for(let i=0;i<SEG;i++)segs.push(cyl(.009,.009,1,tubeMat,0,0,0,tubeOn,8));
 const plug=cyl(.018,.018,.01,std('#9a7fd8'),.035,.56,-.092,tubeOn,12);plug.rotation.x=Math.PI/2;
 const drops=Array.from({length:7},()=>ball(.012,flat('#fff3d2'),0,0,0,tubeOn));
 function dressTube(grow,flow,time){tubeOn.visible=grow>0;if(!(grow>0))return;for(let i=0;i<SEG;i++){const u0=i/SEG,u1=(i+1)/SEG,show=u0<grow;segs[i].visible=show;if(show)place(segs[i],TUBE.getPoint(u0).toArray(),TUBE.getPoint(Math.min(u1,grow)).toArray());}
  plug.visible=grow>=1;drops.forEach((d,i)=>{d.visible=flow;if(flow)d.position.copy(TUBE.getPoint(((reduced()?0:time*.42)+i/7)%1));});}
 // ---- Hit boxes: the table (with the chair and bowl) and the backpack on the floor ----
 const hitMat=new T.MeshBasicMaterial({color:'#ff00ff'}),tableHit=box(1.05,.66,1.45,hitMat,tb.x,.33,(tb.z+ch.z)/2-.05),bagHit=box(.36,.5,.3,hitMat,MEAL.bag.x,.25,MEAL.bag.z);
 tableHit.visible=bagHit.visible=false;tableHit.userData.kind='table';bagHit.userData.kind='bag';
 // Where she cannot walk: the table with the chair, and the backpack on the floor.
 const obstacles=[{x0:tb.x-.62,x1:tb.x+.62,z0:ch.z-.36,z1:tb.z+.58},{x0:MEAL.bag.x-.3,x1:MEAL.bag.x+.3,z0:MEAL.bag.z-.25,z1:MEAL.bag.z+.3}];
 // ---- The brushing chart on the back wall: a sheet with a big tooth and ten places, a star for each time she brushes ----
 const chart=new T.Group();chart.position.set(MEAL.chart.x,MEAL.chart.y,MEAL.chart.z);scene.add(chart);
 box(.82,.64,.02,std('#fffaf0'),0,0,0,chart);box(.82,.14,.022,flat('#79e4e2'),0,.25,.002,chart);const tooth=ball(1,flat('#ffffff'),-.29,.02,.02,chart);tooth.scale.set(.09,.1,.01);for(const x of [-.05,.05]){const r=ball(1,flat('#ffffff'),-.29+x,-.08,.02,chart);r.scale.set(.035,.06,.01);}
 const starShape=new T.Shape();for(let i=0;i<10;i++){const r=i%2?.45:1,a=Math.PI/2+i*Math.PI/5;starShape[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}const starGeo=new T.ShapeGeometry(starShape),starOn=flat('#2fbfbc'),starOff=flat('#e8e0d0');
 const stars=Array.from({length:10},(_,i)=>{const s=add(starGeo,starOff,-.1+(i%5)*.11,.07-Math.floor(i/5)*.17,.015,chart);s.scale.setScalar(.04);return s;});
 function setBrushed(n){stars.forEach((s,i)=>{const on=i<Math.min(10,n);s.material=on?starOn:starOff;s.scale.setScalar(on?.05:.03);});}
 // ---- The meal, step by step ----
 // kind: null, 'spoon' or 'peg'; s: seconds into the step; bite: seconds into a spoonful (−1 between); queued: taps waiting; pump: seconds the pump has run;
 // dance: seconds into a twirl (−1 when not); view: how far the camera has glided in to the meal; food: today's dish (one after the other).
 const st={kind:null,last:null,step:'',s:0,bites:0,bite:-1,queued:0,pump:0,dance:-1,view:0,food:-1};
 function start(kind){if(st.kind)return false;Object.assign(st,{kind,last:kind,step:'walk',s:0,bites:0,bite:-1,queued:0,pump:0,dance:-1});if(kind==='spoon')st.food=(st.food+1)%FOODS.length;
  const f=FOODS[Math.max(0,st.food)];food.material.color.set(f.color);bite.material.color.set(f.color);for(const d of dots)d.material.color.set(f.dots);
  const to=kind==='spoon'?MEAL.side:MEAL.stand,face=kind==='spoon'?Math.atan2(-(ch.x-to.x),-(ch.z-to.z)):Math.atan2(-(MEAL.bag.x-to.x),-(MEAL.bag.z-to.z));walkTo(to.x,to.z,{yaw:face,meal:true},true);return true;}
 function next(){const list=STEPS[st.kind],i=list.indexOf(st.step);st.s=0;if(i>=list.length-1){end();return;}st.step=list[i+1];on(st.step);}
 function end(){const k=st.kind;if(!k)return;const p=k==='spoon'?MEAL.side:MEAL.stand;setHere(p.x,p.z,Math.PI);st.kind=null;st.step='';restSpoon();on('end');}
 function reset(){st.kind=null;st.step='';st.view=0;st.bite=-1;st.dance=-1;restSpoon();dress(0);}
 function tap(){if(!st.kind)return null;if(st.step==='eat'){if(st.bite>=0)st.queued=Math.min(2,st.queued+1);else st.bite=0;return 'bite';}
  if(st.step==='ready'){st.step='pump';st.s=0;st.pump=0;on('pump');return 'pump';}if(st.step==='pump'&&st.dance<0){st.dance=0;on('dance');return 'dance';}return null;}
 // «Ferdig» before the end: from the chair she gets up; with the pump it stops (three beeps), the tube comes off and the backpack goes back.
 function finish(){if(!st.kind)return;const i=STEPS[st.kind].indexOf(st.step);
  if(st.step==='walk'){st.kind=null;st.step='';restSpoon();on('end');return;}
  if(st.kind==='spoon'&&i<=2){st.step='up';st.s=0;st.bite=-1;st.queued=0;on('thanks');return;}
  if(st.kind==='peg'&&i>=2&&i<=4){st.step=i<=3?'unplug':'beep';st.s=0;on(st.step);}} // before the pump has run the tube just comes off
 const stepTime=()=>TIME[st.step]??Infinity;
 function update(dt,time){st.view+=((st.kind&&st.step!=='walk'?1:0)-st.view)*Math.min(1,dt*2.2);if(!st.kind){dress(time);return;}st.s+=dt;
  if(st.step==='walk'){if(arrived())next();}
  else if(st.step==='eat'&&st.bite>=0){const was=st.bite;st.bite+=dt;if(was<.5&&st.bite>=.5){st.bites++;on('bite');}if(st.bite>=BITE){st.bite=-1;if(st.bites>=BITES){next();dress(time);return;}if(st.queued>0){st.queued--;st.bite=0;}}}
  if(st.step==='pump'){st.pump+=dt;if(st.pump>=PUMP){st.step='beep';st.s=0;on('beep');}}
  if(st.dance>=0){st.dance+=dt;if(st.dance>=1.3)st.dance=-1;}
  if(st.s>=stepTime())next();dress(time);}
 // ---- Her pose, after inside.js has walked and posed her: on the chair, at the bowl, with the backpack ----
 const legs=girl.legs,arms=girl.arms;
 function aim(arm,dx,dy,dz){const l=Math.hypot(dx,dy,dz)||1;arm.rotation.set(Math.atan2(-dz/l,-dy/l),0,Math.asin(Math.max(-1,Math.min(1,dx/l))));}
 const SH=[[-.15,.76,0],[.15,.76,0]];
 // Body coordinates (she faces −z) of the bowl and her mouth while she sits on the chair facing the room.
 const BOWL=[MEAL.bowl.x-ch.x,0,0],seated={x:ch.x,y:seat-.4,z:ch.z},MOUTH=[0,.867,-.116];BOWL[0]=-(MEAL.bowl.x-ch.x);BOWL[1]=bowlY+.05-seated.y;BOWL[2]=-(MEAL.bowl.z-ch.z);
 const bagAt=new T.Vector3(),bagQ=new T.Quaternion(),floorQ=new T.Quaternion(),flip=new T.Quaternion();
 function dress(time){const k=st.kind,s=st.step,c=Math.min(1,st.s/stepTime());
  // the bowl: full at the start of a meal with the spoon, emptied a spoonful at a time
  const left=k==='spoon'&&['sit','eat','walk'].includes(s)?1-st.bites/BITES:0;food.visible=left>0;food.scale.set(.6+.4*left,1,.6+.4*left);food.position.y=.03+.03*left;dots.forEach((d,i)=>{d.visible=left>0&&i<Math.ceil(5*left);d.position.y=.045+.03*left;});
  // the backpack: on the floor, flying up onto her back (or down again), or on her back
  const wearing=k==='peg'&&['plug','ready','pump','beep','unplug'].includes(s),carry=k==='peg'&&(s==='pick'||s==='drop')?(s==='pick'?ease(Math.min(1,Math.max(0,(c-.25)/.6))):1-ease(Math.min(1,Math.max(0,(c-.1)/.6)))):wearing?1:0;
  worn.visible=carry>=1;handle.visible=carry<.5;bagHit.visible=false;bagHit.userData.kind=k?'none':'bag';
  if(carry<=0){bag.position.set(MEAL.bag.x,0,MEAL.bag.z);bag.quaternion.identity();}
  else{girl.group.updateMatrixWorld(true);body.localToWorld(bagAt.set(0,.42,.148));body.getWorldQuaternion(bagQ);if(carry>=1){bag.position.copy(bagAt);bag.quaternion.copy(bagQ);}
   else{bag.position.set(mix(MEAL.bag.x,bagAt.x,carry),mix(0,bagAt.y,carry)+Math.sin(carry*Math.PI)*.35,mix(MEAL.bag.z,bagAt.z,carry));bag.quaternion.copy(floorQ.identity()).slerp(bagQ,carry);}}
  const lit=s==='ready'?(Math.sin(time*6)>0?'#ffb43d':'#7a5a20'):s==='pump'?(Math.sin(time*5)>-.3?'#5be37a':'#2a7a3a'):s==='beep'?'#5be37a':'#3a3a40';bagLight.color.set(lit);
  dressTube(k==='peg'?(s==='plug'?c:s==='unplug'?1-c:['ready','pump','beep'].includes(s)?1:0):0,s==='pump',time);
  if(!(k==='spoon'&&s==='eat'))restSpoon();}
 // Called every frame after the girl has been posed and animated; the walk itself is inside.js's.
 function pose(time){const k=st.kind,s=st.step;if(!k||s==='walk')return false;const c=Math.min(1,st.s/stepTime()),g=girl.group;
  if(k==='spoon'){const side=MEAL.side,face0=Math.atan2(-(ch.x-side.x),-(ch.z-side.z));
   if(s==='sit'||s==='up'){const e=ease(s==='sit'?c:1-c);g.position.set(mix(side.x,seated.x,e),mix(0,seated.y,e)+Math.sin(e*Math.PI)*.3,mix(side.z,seated.z,e));g.rotation.set(0,turn(face0,Math.PI,e),0);
    if(e>.55)for(const l of legs)l.rotation.x=1.35*ease((e-.55)/.45);return true;}
   g.position.set(seated.x,seated.y+(s==='full'&&!reduced()?Math.abs(Math.sin(st.s*4.5))*.04:0),seated.z);g.rotation.set(0,Math.PI,0);for(const l of legs)l.rotation.x=1.35+(reduced()?0:Math.sin(time*2.2+(l===legs[0]?0:2))*.08);
   if(s==='full'){const pat=reduced()?0:Math.abs(Math.sin(st.s*9))*.04;aim(arms[0],.1,-.12+pat,-.12);aim(arms[1],-.1,-.12+pat,-.12);girl.setLaugh(true);return true;}
   const b=st.bite,lift=b<0?0:b<.4?ease(b/.4):b<.6?1:b<1?1-ease((b-.6)/.4):0,scoop=b>=0&&b<.15?Math.sin(b/.15*Math.PI)*.04:0;
   aim(arms[0],-.04,.6-.76,-.3);
   const to=[mix(BOWL[0],MOUTH[0]+.06,lift),mix(BOWL[1]-scoop,MOUTH[1]-.06,lift),mix(BOWL[2],MOUTH[2]-.1,lift)];aim(arms[1],to[0]-SH[1][0],to[1]-SH[1][1],to[2]-SH[1][2]);
   girl.setLaugh(b>=.36&&b<.58||b>=.58&&b<.98&&!reduced()&&Math.sin(time*22)>.3);
   // the spoon in her hand, pointing at the bowl or her mouth
   g.updateMatrixWorld(true);arms[1].localToWorld(va.set(0,-.25,0));const target=vc.set(mix(BOWL[0],MOUTH[0],lift),mix(BOWL[1]-.03,MOUTH[1],lift),mix(BOWL[2],MOUTH[2],lift));body.localToWorld(target);
   spoon.position.copy(va);spoon.quaternion.setFromUnitVectors(Y,vb.copy(target).sub(va).normalize());bite.visible=b>=.1&&b<.52;return true;}
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
 return {st,start,tap,finish,update,pose,reset,setBrushed,viewPoints,hits:[tableHit,bagHit],obstacles,bag,spoon,worn,tubeOn,chart,get active(){return !!st.kind;},get busy(){return !!st.kind&&st.step!=='walk';}};
}
