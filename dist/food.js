// The white mobile on Sofia's table and the food she orders on it (25 November 2026, as in Sofia's space game). The user: «Legg til en hvit mobil.
// Gjem den synlig på matbordet. Hvis hun trykker på den så kan hun bestille mat. Pizza, burger, sushi, egg. Mat hun bestiller legges i rommet. Og når hun så
// trykker på spis så får hun valg å velge maten hun har kjøpt.»
// The mobile lies on the table in plain sight, and nothing says it is there; now and then its screen lights up, as if a message came in. What she orders
// waits on a trolley at the front of the room (at most FOOD_MAX dishes) until she eats it, one dish a meal, at the table where the bowl stood (meal.js).
// This file has the list of dishes and what can be done with the list she has, and the models: the dishes, a bite of one in her hand, the mobile and the trolley.
// The models are made in the space game's sizes and scaled to this house, as the PEG backpack is.

// word: on the buttons; name: «I dag blir det …»; the: «Her kommer …»; hand: eaten with her fingers (the egg, soft-boiled in an egg cup, with the spoon).
export const DISHES=[{id:'pizza',word:'Pizza',name:'pizza',the:'pizzaen',emoji:'🍕',hand:true},{id:'burger',word:'Burger',name:'burger',the:'burgeren',emoji:'🍔',hand:true},
 {id:'sushi',word:'Sushi',name:'sushi',the:'sushien',emoji:'🍣',hand:true},{id:'egg',word:'Egg',name:'egg',the:'egget',emoji:'🥚',hand:false}];
export const FOOD_MAX=6;
export const dishById=id=>DISHES.find(d=>d.id===id)||null;
// Known dishes only, at most FOOD_MAX, in the order they came.
export function cleanFood(list){return Array.isArray(list)?list.filter(id=>dishById(id)).slice(0,FOOD_MAX):[];}
// A new order goes last on the trolley, unless it is full; a dish she eats is taken from the trolley (the first of its kind).
export function orderFood(list,id){return dishById(id)&&list.length<FOOD_MAX?[...list,id]:list;}
export function eatFood(list,id){const i=list.indexOf(id);return i<0?list:[...list.slice(0,i),...list.slice(i+1)];}
// What there is to choose from when she is going to eat: each kind once, with how many, in the menu's order.
export function foodChoices(list){return DISHES.map(d=>({...d,n:list.filter(id=>id===d.id).length})).filter(d=>d.n>0);}

const SCALE=.6,PIECES=5; // the space game's sizes to this house's (its bowl is .17 across the middle, this one .1); five bites, as the bowl has
function kit(T){const mats=new Map(),std=(color,roughness=.7)=>{const k=color+roughness;if(!mats.has(k))mats.set(k,new T.MeshStandardMaterial({color,roughness}));return mats.get(k);};
 const add=(g,m,x,y,z,p)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o;};
 // the space game's shapes: a box by its half sizes, a cylinder by its radius and half height, a ball by its radii
 const box=(hx,hy,hz,c,x,y,z,p)=>add(new T.BoxGeometry(hx*2,hy*2,hz*2),std(c),x,y,z,p);
 const cyl=(r,hy,c,x,y,z,p,seg=20)=>add(new T.CylinderGeometry(r,r,hy*2,seg),std(c),x,y,z,p);
 const ball=(rx,ry,rz,c,x,y,z,p)=>{const o=add(new T.SphereGeometry(1,16,10),std(c),x,y,z,p);o.scale.set(rx,ry,rz);return o;};
 // A fifth of a round pizza: the tip at the origin, pointing along +y in the x–y plane and t thick along z (lay it flat with rotation.x = −π/2).
 const slice=(r,t,c,p)=>{const s=new T.Shape(),w=Math.PI*2/5;s.moveTo(0,0);s.absarc(0,0,r,Math.PI/2-w/2,Math.PI/2+w/2,false);s.lineTo(0,0);
  const g=new T.ExtrudeGeometry(s,{depth:t,bevelEnabled:false,curveSegments:8});g.translate(0,0,-t/2);return add(g,std(c),0,0,0,p);};
 return {std,add,box,cyl,ball,slice};}
// A dish, standing on the table at the group's origin. set(left): how much is left (1 whole, 0 eaten): pizza in five slices, one fewer each bite; the burger
// smaller; five pieces of sushi on a board, from the end by her right hand; the egg lower, its yolk showing once it is opened.
export function createDish(T,id){const k=kit(T),group=new T.Group(),inner=new T.Group();inner.scale.setScalar(SCALE);group.add(inner);const pieces=[];let shrink=null,egg=null,yolk=null;
 if(id==='pizza'){k.cyl(.2,.006,'#ffffff',0,.006,0,inner,28);
  for(let i=0;i<PIECES;i++){const a=i*Math.PI*2/5+.3,s=new T.Group();s.rotation.y=a;s.position.set(-Math.sin(a)*.006,.012,-Math.cos(a)*.006);inner.add(s);
   const crust=k.slice(.175,.018,'#dc9a4c',s),cheese=k.slice(.15,.006,'#f7c948',s);crust.rotation.x=cheese.rotation.x=-Math.PI/2;crust.position.y=.009;cheese.position.set(0,.021,.004);
   for(const [x,z] of [[.026,-.11],[-.022,-.066],[-.03,-.13]])k.cyl(.02,.002,'#c8382b',x,.025,z,s,12);pieces.push(s);}}
 else if(id==='burger'){k.cyl(.16,.006,'#ffffff',0,.006,0,inner,28);shrink=new T.Group();shrink.position.y=.012;inner.add(shrink);const b=shrink;
  k.cyl(.115,.02,'#d7934a',0,.02,0,b);k.cyl(.122,.014,'#6b3b22',0,.05,0,b);k.box(.088,.003,.088,'#ffc93a',0,.066,0,b).rotation.y=.7;
  k.cyl(.128,.004,'#6cc04a',0,.071,0,b);k.cyl(.1,.004,'#e5483a',0,.079,0,b);const top=k.add(new T.SphereGeometry(1,20,10,0,Math.PI*2,0,Math.PI/2),k.std('#e7a556'),0,.083,0,b);top.scale.set(.12,.072,.12);
  for(let i=0;i<7;i++){const a=i*2.4,r=.03+.05*(i%3)/2;k.ball(.01,.004,.006,'#fff4d6',Math.cos(a)*r,.083+.072*Math.sqrt(1-(r/.12)**2),Math.sin(a)*r,b).rotation.y=a;}}
 else if(id==='sushi'){k.box(.21,.012,.075,'#8a5a34',0,.012,0,inner);for(const x of [-.17,.17])k.box(.02,.006,.07,'#6f4527',x,-.004,0,inner);
  for(let i=0;i<PIECES;i++)pieces.push(sushi(T,k,.15-i*.075,.024,0,i,inner));}
 else if(id==='egg'){k.cyl(.08,.005,'#ffffff',0,.005,0,inner,24);k.cyl(.03,.014,'#ffd23f',0,.022,0,inner);k.cyl(.046,.022,'#ffd23f',0,.056,0,inner);
  egg=k.ball(.043,.068,.043,'#fff6e6',0,.07,0,inner);yolk=k.ball(.026,.008,.026,'#ffb81c',0,.13,0,inner);}
 function set(left){const n=Math.ceil(PIECES*left-1e-6);pieces.forEach((p,i)=>p.visible=i<n);
  if(shrink){shrink.visible=n>0;shrink.scale.setScalar(.4+.6*left);}
  if(egg){const h=.068*(.35+.65*left);egg.visible=n>0;egg.scale.y=h;yolk.visible=n>0&&left<1;yolk.position.y=.07+h-.005;}}
 set(1);return {group,set,id};}
// One piece of sushi in the space game's sizes, standing on y: a maki roll (seaweed round rice with salmon in the middle) for even i, a nigiri
// (rice with a slice of salmon over it) for odd.
function sushi(T,k,x,y,z,i,p){const g=new T.Group();g.position.set(x,y,z);p.add(g);
 if(i%2===0){k.cyl(.031,.026,'#1f3a2a',0,.026,0,g);k.cyl(.026,.002,'#fbfbf5',0,.053,0,g);k.cyl(.011,.002,'#ff8a5c',0,.0545,0,g,12);}
 else{k.box(.024,.016,.042,'#fbfbf5',0,.016,0,g);k.box(.028,.006,.048,'#ff8a5c',0,.037,0,g);for(const s of [-1,1])k.box(.029,.0008,.003,'#ffd3bd',0,.0435,s*.016,g);}
 return g;}
// A bite on its way to her mouth, held in her hand: a slice of pizza standing up with its tip at the top and the cheese towards −z (the way she faces),
// a little burger, or a piece of sushi. Its origin is where her fingers hold it.
export function createBite(T,id){const k=kit(T),group=new T.Group(),inner=new T.Group();inner.scale.setScalar(SCALE);group.add(inner);
 if(id==='pizza'){const s=new T.Group();s.rotation.x=Math.PI;s.position.y=.075;inner.add(s);k.slice(.075,.014,'#dc9a4c',s);const c=k.slice(.064,.006,'#f7c948',s);c.position.set(0,.004,.008);
  for(const [x,y,r] of [[0,.05,.012],[.012,.028,.009]]){const d=k.cyl(r,.002,'#c8382b',x,y,.012,s,12);d.rotation.x=Math.PI/2;}}
 else if(id==='burger'){k.ball(.042,.03,.042,'#e7a556',0,.034,0,inner);k.cyl(.045,.009,'#6b3b22',0,.012,0,inner);k.cyl(.04,.008,'#d7934a',0,-.002,0,inner);}
 else if(id==='sushi')sushi(T,k,0,-.01,0,0,inner);
 return group;}
// The mobile, lying flat with its top towards −z: white, with a dark screen that lights up (set(lit), 0..1) and the camera at the top.
export function createPhone(T){const k=kit(T),group=new T.Group(),inner=new T.Group();inner.scale.setScalar(SCALE*1.15);group.add(inner);
 k.box(.062,.009,.118,'#f8f9fc',0,.009,0,inner);const screen=new T.MeshBasicMaterial({color:'#1d2540'});k.add(new T.BoxGeometry(.104,.0024,.196),screen,0,.0185,.006,inner);
 k.cyl(.007,.002,'#2a2f3a',0,.0185,-.106,inner,12);const dark=new T.Color('#1d2540'),light=new T.Color('#9fd3ff');
 return {group,set:lit=>screen.color.copy(dark).lerp(light,lit)};}
// The trolley: white shelves with a mint rim, grey legs on little wheels and a pink handle. slots: where the dishes stand, the top shelf first.
export function createCart(T){const k=kit(T),group=new T.Group(),inner=new T.Group();inner.scale.setScalar(.72);group.add(inner);const white='#fdfbf7',mint='#79e4e2',steel='#c9ced8';
 k.box(.62,.025,.26,white,0,.58,0,inner);for(const s of [-1,1]){k.box(.62,.012,.01,mint,0,.615,s*.255,inner);k.box(.01,.012,.26,mint,s*.615,.615,0,inner);}
 k.box(.6,.02,.24,white,0,.22,0,inner);
 for(const [x,z] of [[-.58,-.22],[.58,-.22],[-.58,.22],[.58,.22]]){k.cyl(.022,.27,steel,x,.34,z,inner,10);k.ball(.05,.05,.05,'#3a3a40',x,.05,z,inner);}
 for(const s of [-1,1])k.box(.014,.1,.014,steel,.64,.7,s*.2,inner);k.box(.022,.022,.24,'#ff9ec4',.66,.8,0,inner);
 const slots=[0,1,2,3,4,5].map(i=>new T.Vector3((i%3-1)*.4*.72,(i<3?.605:.24)*.72,0));
 return {group,slots,half:{x:.68*.72,z:.27*.72}};}
