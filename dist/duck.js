// An unnaturally large duck: a mallard drake some 12 m long and 7 m tall, two and a half times the car, that swims round
// in a circle on Lianvannet.
// It is the surprise by the water at the end of Vetle Vislies veg (world.js places it and lets it rise out of the lake
// the first time the car comes near). Forward is −z and the water line is y = 0. update() bobs it on the water, nods its
// head, wags its tail, now and then dips its bill, and pulses the ring of ripples round it.
export function createDuck(T){
 const group=new T.Group();group.name='Kjempeand';group.scale.setScalar(1.4);
 const mat=(color,roughness=.7,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const grey=mat('#9a9186'),chestnut=mat('#6e3a26'),green=mat('#17643a',.35,.25),white=mat('#f3f0e6'),bill=mat('#e5b52b',.5),black=mat('#1c1f21'),blue=mat('#3055b5',.4,.2),wing=mat('#7b7268');
 const sphere=new T.SphereGeometry(1,24,16);
 const body=new T.Group();group.add(body);
 function part(material,[x,y,z],[sx,sy,sz],parent=body,geometry=sphere){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
 // Body riding low in the water, the chestnut breast in front, folded wings with the blue patch, a black tail with its curl.
 part(grey,[0,.45,0],[1.8,1.2,3.1]);part(chestnut,[0,.85,-2.1],[1.55,1.25,1.35]);
 for(const s of [-1,1]){part(wing,[s*1.55,1.05,.45],[.45,.75,2.3]);part(blue,[s*1.93,1.1,.9],[.1,.28,.7]);part(white,[s*1.94,1.1,1.62],[.08,.24,.1]);}
 const tail=new T.Group();tail.position.set(0,.9,2.9);body.add(tail);part(black,[0,.25,.35],[1.05,.6,.9],tail);
 part(black,[0,.95,.3],[.16,.3,.16],tail,new T.TorusGeometry(1,.45,8,16,Math.PI*1.4)).rotation.set(0,Math.PI/2,Math.PI*.6);
 // Neck and head: the white collar, the shiny green head, the yellow bill, black eyes with a white glint.
 const head=new T.Group();head.position.set(0,1.7,-2.45);body.add(head);
 part(green,[0,.75,-.15],[.75,1.05,.75],head);part(white,[0,.2,-.05],[.8,.18,.8],head);
 part(green,[0,1.75,-.45],[.95,.9,1.05],head);part(bill,[0,1.55,-1.55],[.42,.17,.72],head);part(bill,[0,1.45,-1.45],[.36,.12,.62],head);
 for(const s of [-1,1]){part(black,[s*.72,1.95,-.95],[.13,.15,.13],head);part(white,[s*.8,2.,-1.02],[.04,.05,.04],head);}
 // Ripples: a pale ring on the water round the duck.
 const ripple=new T.Mesh(new T.RingGeometry(1,1.18,48),new T.MeshBasicMaterial({color:'#e9f5f8',transparent:true,opacity:.55,depthWrite:false,side:T.DoubleSide}));
 ripple.rotation.x=-Math.PI/2;ripple.position.y=.03;group.add(ripple);
 function update(dt,time){
  body.position.y=Math.sin(time*1.7)*.12;body.rotation.z=Math.sin(time*1.1)*.04;
  // Every nine seconds or so the duck tips forward and dips its bill in the water.
  const dip=Math.max(0,Math.sin(time*.7)-.93)/.07;body.rotation.x=dip*.45;
  head.rotation.x=Math.sin(time*2.3)*.08-dip*.35;head.rotation.y=Math.sin(time*.6)*.18;tail.rotation.y=Math.sin(time*5)*.2;
  const r=3.4+((time*.6)%1)*1.6;ripple.scale.set(r,r,1);ripple.material.opacity=.55*(1-((time*.6)%1));
 }
 update(0,0);
 return {group,update};
}
