// The robot vacuum in Sofia's room (26 November 2026, as in the space game). The user: «vi har en svart roborock støvsuger med dock. Vi har anime øyne
// klistermerke på den. legge den i rommet og hvis man trykker på den så starter den å støvsuge opp all maten. Hvis man starter støvsugeren og går ut av huset
// så kommer man inn til rent hus.» And: «legg øyne på toppen av støvsugeren».
// A round black robot vacuum in its black dock in front of the podium, to the right, with an anime-eyes sticker on its lid: two big eyes with purple irises,
// shiny highlights and a thick line of lashes, looking forward. A tap on it, and it drives out of the dock and from dish to dish on the floor (always the
// nearest next, round the table, the backpacks and the trolley, as she walks), sucking each one up, until the floor is clean; then it drives home, turns
// round and backs into the dock. A tap while it runs sends it home. With nothing on the floor it takes a little round of the rug. It cleans the floor only.
// game.js clears the floor if she goes out while it runs. meal.js owns it (in her room only) and tells game.js what it does with on(): 'vacuum:start',
// 'vacuum:round', 'vacuum:home', 'vacuum:done', 'vacuum:back', 'vacuum:hum', 'vacuum:slurp', and 'suck:<place>' when a dish has been sucked up.
import {createDish,FLOOR_FOOD,FOOD_CART} from './food.js';
// The dock (the middle of the robot standing in it, facing the room; the tower is behind, against the podium), the spot in front of it where it turns, its size,
// its speed (m/s), how fast it turns (rad/s), how long a dish takes, and the round of the rug.
export const VAC={dock:{x:3.15,z:.53},out:{x:3.15,z:1.1},r:.19,h:.08,speed:1.3,turn:8,suck:.22,round:[{x:1.6,z:.75},{x:-1.7,z:.75},{x:-1.7,z:2.4},{x:1.0,z:2.4},{x:3.15,z:1.1}]};
const turnBy=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function createVacuum({T,parent,route=(ax,az,bx,bz)=>[{x:bx,z:bz}],reduced=()=>false,on=()=>{}}){
 const mats=new Map(),std=(c,r=.5)=>{const k=c+r;if(!mats.has(k))mats.set(k,new T.MeshStandardMaterial({color:c,roughness:r}));return mats.get(k);},flat=c=>new T.MeshBasicMaterial({color:c});
 const add=(g,m,x,y,z,p)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o;};
 const box=(w,h,d,c,x,y,z,p)=>add(new T.BoxGeometry(w,h,d),typeof c==='string'?std(c):c,x,y,z,p),cyl=(r,h,c,x,y,z,p,seg=32)=>add(new T.CylinderGeometry(r,r,h,seg),typeof c==='string'?std(c):c,x,y,z,p);
 const ell=(rx,ry,rz,c,x,y,z,p)=>{const o=add(new T.SphereGeometry(1,20,10),typeof c==='string'?std(c,.35):c,x,y,z,p);o.scale.set(rx,ry,rz);return o;};
 // ---- The dock: a black tower against the podium with a light, and a ramp on the floor that the robot stands on ----
 const dock=new T.Group();dock.position.set(VAC.dock.x,0,VAC.dock.z);parent.add(dock);const R=VAC.r;
 box(.32,.36,.17,'#16171b',0,.18,-R-.11,dock);box(.33,.016,.18,'#2a2d34',0,.365,-R-.11,dock);box(.22,.16,.006,'#0f1013',0,.22,-R-.022,dock);
 const dockLight=new T.MeshBasicMaterial({color:'#79e4e2'});ell(.01,.01,.004,dockLight,0,.27,-R-.018,dock);box(.4,.008,.4,'#24262c',0,.004,-.04,dock);
 // ---- The robot, front towards +z: black body, a lighter lid, the laser tower at the back, buttons and a light, a side brush, and the eyes on top ----
 const robot=new T.Group();parent.add(robot);
 cyl(R,.06,'#1b1d22',0,.04,0,robot,40);cyl(R-.012,.006,std('#2a2d34',.3),0,.073,0,robot,40);
 for(let i=-4;i<=4;i++){const a=i*.34,b=box(.05,.045,.008,'#111216',Math.sin(a)*(R+.003),.035,Math.cos(a)*(R+.003),robot);b.rotation.y=a;}
 cyl(.05,.03,'#15161a',0,.09,-.05,robot);cyl(.046,.004,'#2a2d34',0,.106,-.05,robot);const laser=new T.Group();laser.position.set(0,.092,-.05);robot.add(laser);box(.016,.008,.004,flat('#3a6fd8'),0,0,.05,laser);
 for(const s of [-1,1])box(.018,.004,.03,'#4a4e57',s*.024,.078,.045,robot);const light=new T.MeshBasicMaterial({color:'#cfd3da'});ell(.008,.003,.008,light,0,.078,.075,robot);
 const brush=new T.Group();brush.position.set(-.12,.008,.12);robot.add(brush);for(let k=0;k<3;k++){const b=box(.005,.003,.07,'#8a8f99',0,0,.035,brush);b.rotation.y=k*2.09;b.position.set(Math.sin(k*2.09)*.035,0,Math.cos(k*2.09)*.035);}
 // The anime-eyes sticker on the lid (made up: the real one's look is not known): each eye a tall oval, its top towards the back, so the robot looks forward;
 // a purple iris low in it, a dark pupil, two shiny highlights, and a thick line of lashes along the top with a flick at the outer corner.
 for(const s of [-1,1]){const eye=new T.Group();eye.position.set(s*.052,.0765,.075);robot.add(eye);
  ell(.038,.002,.048,'#ffffff',0,0,0,eye);ell(.028,.0025,.036,'#7b4fe0',0,.0004,.008,eye);ell(.022,.003,.024,'#4a2aa8',0,.0008,.014,eye);ell(.012,.0035,.015,'#140c2e',0,.0012,.01,eye);
  ell(.008,.004,.008,flat('#ffffff'),-s*.009,.0018,-.008,eye);ell(.004,.004,.004,flat('#ffffff'),s*.01,.0018,.026,eye);
  const lash=box(.08,.004,.008,'#0d0d12',0,.001,-.045,eye);lash.rotation.y=s*.12;const flick=box(.022,.004,.007,'#0d0d12',s*.042,.001,-.036,eye);flick.rotation.y=-s*.6;}
 // the dish it is sucking up, drawn into it
 let sucking=null;
 // Hit boxes: the robot (it moves) and the dock; inside.js takes taps on them only in her own room (home).
 const hitMat=new T.MeshBasicMaterial({color:'#ff00ff'}),robotHit=add(new T.BoxGeometry(.46,.24,.46),hitMat,0,.1,0,robot),dockHit=add(new T.BoxGeometry(.38,.42,.24),hitMat,0,.2,-R-.11,dock);
 for(const h of [robotHit,dockHit]){h.visible=false;Object.assign(h.userData,{kind:'vacuum',home:true});}
 // mode: 'dock', 'out', 'clean', 'round', 'home', 'back'; path: the way to where it goes (route); target: the place of the dish it goes to
 const st={mode:'dock',x:VAC.dock.x,z:VAC.dock.z,yaw:0,path:[],target:-1,stop:false,round:[],cleaned:0,hum:0,spin:0,suckSlot:-1};
 // Towards p along the way round the furniture: turn, then go. true when there.
 function drive(p,dt,reverse=false,near=.04){if(!st.path.length||st.path.goal!==p){st.path=reverse?[{x:p.x,z:p.z}]:route(st.x,st.z,p.x,p.z);st.path.goal=p;}
  const q=st.path[0],dx=q.x-st.x,dz=q.z-st.z,dist=Math.hypot(dx,dz),last=st.path.length===1;
  if(dist<(last?near:.08)){if(last){st.path=[];return true;}st.path.shift();return false;}
  const want=Math.atan2(dx,dz)+(reverse?Math.PI:0),t=turnBy(st.yaw,want);st.yaw+=Math.sign(t)*Math.min(Math.abs(t),VAC.turn*dt);
  if(Math.abs(t)<.35){const step=Math.min(dist,VAC.speed*(reverse?.5:1)*dt);st.x+=dx/dist*step;st.z+=dz/dist*step;}return false;}
 function start(anyFood){if(st.mode!=='dock')return false;Object.assign(st,{mode:'out',path:[],target:-1,stop:false,cleaned:0,hum:0,round:anyFood?[]:VAC.round.map(p=>({...p}))});on(anyFood?'vacuum:start':'vacuum:round');return true;}
 function home(){if(st.mode==='dock'||st.stop)return false;st.stop=true;on('vacuum:home');return true;}
 function endSuck(){if(!sucking)return;parent.remove(sucking.group);sucking.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});sucking=null;}
 // Every frame: floor, the dishes on the floor now ({id, slot}, meal.js); the dish it sucks up is not on the floor while it does (suckSlot).
 function update(dt,time,floor){const running=st.mode!=='dock';light.color.set(running?'#79e4e2':'#cfd3da');dockLight.color.set(running?'#3a3d45':'#79e4e2');
  if(running){st.spin+=dt*(st.mode==='back'?4:16);st.hum-=dt;if(st.hum<=0){st.hum=.45;on('vacuum:hum');}}
  laser.rotation.y=reduced()?0:st.spin*.6;brush.rotation.y=reduced()?0:st.spin;
  if(running&&!sucking)step(dt,floor);
  if(sucking){sucking.t+=dt;const k=Math.min(1,sucking.t/VAC.suck),e=k*k;sucking.group.position.set(sucking.at.x+(st.x-sucking.at.x)*e,sucking.at.y+.02*Math.sin(k*Math.PI),sucking.at.z+(st.z-sucking.at.z)*e);
   sucking.group.scale.setScalar(.9*(1-e));sucking.group.rotation.y=sucking.yaw+k*3;if(k>=1){const slot=st.suckSlot;endSuck();st.suckSlot=-1;st.cleaned++;on('suck:'+slot);}}
  robot.position.set(st.x,0,st.z);robot.rotation.y=st.yaw;}
 function step(dt,floor){
  if(st.mode==='out'){if(drive(VAC.out,dt))st.mode=st.round.length?'round':'clean';return;}
  if(st.mode==='clean'){if(st.stop){st.mode='home';return;}
   let d=floor.find(o=>o.slot===st.target);if(!d){let best=Infinity;for(const o of floor){const f=FLOOR_FOOD[o.slot-FOOD_CART];if(!f)continue;const e=Math.hypot(f.x-st.x,f.z-st.z);if(e<best){best=e;d=o;}}st.target=d?d.slot:-1;st.path=[];}
   if(!d){st.mode='home';return;}const f=FLOOR_FOOD[d.slot-FOOD_CART];
   if(drive(f,dt,false,.05)){st.suckSlot=d.slot;st.target=-1;const m=createDish(T,d.id,true);m.group.position.set(f.x,f.y,f.z);m.group.rotation.y=f.yaw;m.group.scale.setScalar(.9);parent.add(m.group);
    sucking={group:m.group,t:0,at:{x:f.x,y:f.y,z:f.z},yaw:f.yaw};on('vacuum:slurp');}return;}
  if(st.mode==='round'){if(st.stop||!st.round.length){st.mode='home';return;}if(drive(st.round[0],dt,false,.08)){st.round.shift();st.path=[];}return;}
  if(st.mode==='home'){if(drive(VAC.out,dt))st.mode='back';return;}
  if(st.mode==='back'&&drive(VAC.dock,dt,true,.02)){Object.assign(st,{mode:'dock',x:VAC.dock.x,z:VAC.dock.z,yaw:0,path:[]});on(st.cleaned?'vacuum:done':'vacuum:back');}}
 // Back in its dock at once (coming in again, or the floor cleared while she was out).
 function reset(){endSuck();Object.assign(st,{mode:'dock',x:VAC.dock.x,z:VAC.dock.z,yaw:0,path:[],target:-1,stop:false,round:[],suckSlot:-1});robot.position.set(st.x,0,st.z);robot.rotation.y=0;}
 reset();
 return {st,start,home,update,reset,robot,dock,hits:[robotHit,dockHit],get running(){return st.mode!=='dock';},get suckSlot(){return st.suckSlot;}};}
