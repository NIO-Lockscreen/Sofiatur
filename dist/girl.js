// A small girl with brown hair (5 October 2026): Sofia herself, who walks about inside the house (inside.js) and, once she has been in, rides in the
// hot-air balloon's basket (world.js). About 1.05 m tall, with a fringe and two pigtails that bounce when she walks, rosy cheeks, a raspberry top, a purple
// skirt, white socks and purple shoes. The same API as Ludvig (boy.js): update(dt, speed, time, wave) walks at speed m/s and waves with her right arm
// (wave 0..1); forward is −z and the ground is y = 0.
export function createGirlModel(T){
 const group=new T.Group();group.name='Sofia';
 const std=(color,roughness=.85)=>new T.MeshStandardMaterial({color,roughness});
 const skin=std('#f4cba9',.8),hair=std('#6b4226',.9),top=std('#e5528f'),skirt=std('#8e4fd0'),hem=std('#b98cf0'),sock=std('#fbfbf6'),shoe=std('#6a3fb0',.7),tie=std('#ff8cc0',.6);
 const dark=new T.MeshBasicMaterial({color:'#2a1a14'}),glint=new T.MeshBasicMaterial({color:'#ffffff'}),cheek=new T.MeshBasicMaterial({color:'#ff9aa8'}),mouth=new T.MeshBasicMaterial({color:'#b83a4b'});
 const sphere=new T.SphereGeometry(1,16,12),limb=new T.CylinderGeometry(1,.85,1,10),box=new T.BoxGeometry(1,1,1),flare=new T.CylinderGeometry(.58,1,1,16),smile=new T.TorusGeometry(1,.16,6,12,Math.PI);
 function part(g,m,[x,y,z],[sx,sy,sz],parent){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;}
 const body=new T.Group();group.add(body);
 // Top, a flared skirt with a lighter hem, and the neck.
 const torso=part(limb,top,[0,.64,0],[.115,.28,.085],body);part(flare,skirt,[0,.44,0],[.15,.22,.115],body);part(flare,hem,[0,.335,0],[.162,.03,.125],body);part(limb,hem,[0,.515,0],[.112,.022,.085],body);part(limb,skin,[0,.8,0],[.035,.05,.035],body);
 // The head: face with eyes, rosy cheeks and a smile; brown hair over the top and back, a fringe, and a pigtail on each side tied with a pink bobble.
 const head=new T.Group();head.position.set(0,.91,0);body.add(head);
 part(sphere,skin,[0,0,0],[.12,.13,.12],head);
 part(sphere,hair,[0,.035,.015],[.13,.12,.13],head);part(sphere,hair,[0,-.03,.075],[.12,.14,.07],head);
 part(sphere,hair,[0,.062,-.098],[.112,.05,.045],head);part(sphere,hair,[-.055,.052,-.104],[.07,.045,.04],head).rotation.z=.5;part(sphere,hair,[.055,.052,-.104],[.07,.045,.04],head).rotation.z=-.5;
 for(const s of [-1,1]){part(sphere,dark,[s*.045,.002,-.113],[.017,.024,.01],head);part(sphere,glint,[s*.05,.01,-.121],[.006,.008,.004],head);part(sphere,cheek,[s*.07,-.043,-.1],[.027,.018,.01],head);part(sphere,skin,[s*.12,-.005,0],[.022,.03,.022],head);}
 part(smile,mouth,[0,-.043,-.116],[.03,.03,.012],head).rotation.z=Math.PI;
 const pigtails=[-1,1].map(s=>{const pivot=new T.Group();pivot.position.set(s*.118,.03,.03);head.add(pivot);
  part(sphere,tie,[0,0,0],[.026,.026,.026],pivot);part(sphere,hair,[s*.01,-.075,0],[.043,.1,.043],pivot);part(sphere,hair,[s*.016,-.155,.004],[.036,.05,.036],pivot);return pivot;});
 // Legs from the hips (skin, white sock, purple shoe) and arms from the shoulders (short sleeve, hand), each in a group that swings.
 const legs=[-1,1].map(s=>{const hip=new T.Group();hip.position.set(s*.06,.42,0);body.add(hip);
  part(limb,skin,[0,-.11,0],[.04,.22,.04],hip);part(limb,sock,[0,-.29,0],[.046,.14,.046],hip);part(box,shoe,[0,-.39,-.025],[.075,.06,.15],hip);return hip;});
 const arms=[-1,1].map(s=>{const sh=new T.Group();sh.position.set(s*.15,.76,0);body.add(sh);
  part(limb,top,[0,-.04,0],[.04,.09,.04],sh);part(limb,skin,[0,-.15,0],[.031,.13,.031],sh);part(sphere,skin,[0,-.235,0],[.034,.034,.034],sh);return sh;});
 let phase=0;
 // speed in m/s; wave 0..1 lifts the right arm and waves it.
 function update(dt,speed,time,wave=0){
  const run=Math.min(1,speed/1.6);phase+=dt*Math.min(16,5+speed*2.4);
  const s=Math.sin(phase)*.75*run;legs[0].rotation.x=s;legs[1].rotation.x=-s;arms[0].rotation.x=-s*.9;arms[1].rotation.x=s*.9;
  arms[0].rotation.z=-.08;arms[1].rotation.z=.08;
  body.position.y=Math.abs(Math.cos(phase))*.03*run;body.rotation.x=-.06*run;torso.scale.y=.28+Math.sin(time*2.2)*.004*(1-run);
  head.rotation.y=Math.sin(time*.9)*.25*(1-run);head.rotation.z=Math.sin(time*.7)*.04*(1-run);
  // the pigtails swing out and bounce with each step, and sway a little when she stands
  pigtails.forEach((p,i)=>{const side=i?1:-1;p.rotation.z=side*(.12+.14*Math.abs(Math.cos(phase))*run)+Math.sin(time*1.3+i)*.03;p.rotation.x=Math.sin(phase*2+i)*.16*run+Math.sin(time*1.1)*.02;});
  if(wave>0){arms[1].rotation.x=-.2*wave;arms[1].rotation.z=2.6*wave+Math.sin(time*9)*.35*wave;}
 }
 update(0,0,0);
 return {group,update,legs,arms,head,pigtails};
}
