// Traffic lights at the Palermo junction (Bøckmans veg / Selsbakkvegen; signals are visible in the 2025 road images).
// For Sofia they are a friendly cue rather than traffic control: red while the car is on its way,
// red and amber as it gets there, and green once the car is at the junction. When it drives off: amber, then red.
export function createTrafficLights({T,scene,height,data,node='91783986',greenWithin=22}){
 const centre=data.nodes[node];if(!centre)return {update(){},state:()=>null,signals:[]};
 const lit={red:'#ff3b2f',amber:'#ffb627',green:'#3ee27a'},dim={red:'#3b1714',amber:'#3a2c12',green:'#12311d'};
 const materials=Object.fromEntries(Object.keys(lit).map(k=>[k,{on:new T.MeshBasicMaterial({color:lit[k]}),off:new T.MeshBasicMaterial({color:dim[k]})}]));
 const pole=new T.MeshLambertMaterial({color:'#8d9699'}),housing=new T.MeshLambertMaterial({color:'#20272a'});
 const lampGeometry=new T.CircleGeometry(.155,20),visorGeometry=new T.BoxGeometry(.36,.03,.18),group=new T.Group();group.name='Palermo traffic lights';scene.add(group);
 const lamps={red:[],amber:[],green:[]},signals=[];
 // One signal on the right-hand side of each road into the junction, 9 m out, facing the cars coming in.
 for(const e of data.edges.filter(e=>e.from===node)){
  const a=data.nodes[e.path[0]],b=data.nodes[e.path[1]],l=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/l,dz=(b[1]-a[1])/l;
  const x=centre[0]+dx*9+dz*4.6,z=centre[1]+dz*9-dx*4.6,signal=new T.Group();signal.position.set(x,height(x,z),z);signal.rotation.y=Math.atan2(dx,dz);
  const add=(geometry,material,px,py,pz)=>{const m=new T.Mesh(geometry,material);m.position.set(px,py,pz);signal.add(m);return m;};
  add(new T.CylinderGeometry(.07,.08,3.5,10),pole,0,1.75,0);add(new T.BoxGeometry(.44,1.24,.28),housing,0,3.1,0);add(new T.BoxGeometry(.66,1.46,.03),housing,0,3.1,-.16);
  [['red',3.5],['amber',3.1],['green',2.7]].forEach(([k,py])=>{lamps[k].push(add(lampGeometry,materials[k].off,0,py,.145));add(visorGeometry,housing,0,py+.17,.22);});
  group.add(signal);signals.push({road:e.name,x,z,facing:[dx,dz]});
 }
 let phase='red',timer=0;
 function show(){for(const [k,on] of [['red',phase==='red'||phase==='redAmber'],['amber',phase==='redAmber'||phase==='amber'],['green',phase==='green']])for(const m of lamps[k])m.material=on?materials[k].on:materials[k].off;}
 show();
 function update(dt,pos){
  const d=Math.hypot(pos.x-centre[0],pos.z-centre[1]),before=phase;group.visible=d<420;timer-=dt;
  if(d<greenWithin){if(phase==='red'||phase==='amber'){phase='redAmber';timer=.45;}else if(phase==='redAmber'&&timer<=0)phase='green';}
  else{if(phase==='green'||phase==='redAmber'){phase='amber';timer=.9;}else if(phase==='amber'&&timer<=0)phase='red';}
  if(phase!==before)show();
 }
 return {update,state:()=>phase,signals,group};
}
