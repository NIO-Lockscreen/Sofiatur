// A running cat, the reward for the second trip to the kindergarten: it takes the car's place and colour (a black cat in
// black paint, a rainbow cat with the rainbow car). About the car's size, so the camera frames it the same way. Forward
// is −z and the ground is y = 0, as for the car. update() swings the legs in a bounding gallop at the car's speed, bobs the
// body and sways the tail; standing still it breathes and flicks its tail and ears.
export function createCat(T,{logos={}}={}){
 const group=new T.Group();group.name='Katt';
 const fur=new T.MeshStandardMaterial({color:'#14171c',roughness:.85}),light=new T.MeshStandardMaterial({color:'#f2eee4',roughness:.9});
 const pink=new T.MeshStandardMaterial({color:'#f29bb2',roughness:.7}),iris=new T.MeshBasicMaterial({color:'#9be15d'}),pupil=new T.MeshBasicMaterial({color:'#101214'}),whisker=new T.MeshBasicMaterial({color:'#f6f4ee'});
 const sphere=new T.SphereGeometry(1,18,12),cone=new T.ConeGeometry(1,1,4),limb=new T.CylinderGeometry(1,.8,1,10),taper=new T.CylinderGeometry(.92,1,1,10);
 function part(g,m,[x,y,z],[sx,sy,sz]=[1,1,1],parent=body){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;}
 const body=new T.Group();group.add(body);
 // Torso, chest and a light belly; head with muzzle, nose, ears, eyes and whiskers.
 const torso=part(sphere,fur,[0,1.25,.15],[.72,.66,1.45]);part(sphere,fur,[0,1.32,-.75],[.7,.7,.8]);part(sphere,light,[0,.98,-.1],[.5,.3,1.05]);
 const head=new T.Group();head.position.set(0,1.85,-1.5);body.add(head);
 part(sphere,fur,[0,0,0],[.6,.55,.56],head);part(sphere,light,[0,-.17,-.47],[.32,.22,.2],head);part(sphere,pink,[0,-.05,-.63],[.08,.06,.05],head);
 const ears=[-1,1].map(s=>{const ear=new T.Group();ear.position.set(s*.32,.42,-.02);head.add(ear);part(cone,fur,[0,.2,0],[.22,.46,.18],ear).rotation.y=Math.PI/4;part(cone,pink,[0,.17,-.07],[.12,.3,.06],ear).rotation.y=Math.PI/4;ear.rotation.z=-s*.18;return ear;});
 for(const s of [-1,1]){part(sphere,iris,[s*.23,.1,-.49],[.12,.13,.07],head);part(sphere,pupil,[s*.23,.1,-.54],[.035,.1,.03],head);
  for(const tilt of [-.12,0,.12]){const w=part(limb,whisker,[s*.42,-.14+tilt*.3,-.52],[.008,.5,.008],head);w.rotation.z=s*(Math.PI/2-tilt);}}
 // Legs hang from the shoulders and hips; each has a light paw.
 const legs=[[-.36,-.8],[.36,-.8],[-.36,.95],[.36,.95]].map(([x,z])=>{const hip=new T.Group();hip.position.set(x,1.12,z);body.add(hip);
  part(limb,fur,[0,-.45,0],[.17,.9,.17],hip);part(sphere,light,[0,-.98,-.06],[.2,.14,.26],hip);return hip;});
 // The tail: a chain of shrinking segments with round joints, each turning a little further, so it curls and sways.
 const tail=[];let joint=new T.Group();joint.position.set(0,1.45,1.5);body.add(joint);
 for(let i=0;i<7;i++){const r=.16-i*.013;part(taper,fur,[0,.19,0],[r,.38,r],joint);part(sphere,fur,[0,0,0],[r,r,r],joint);tail.push(joint);const next=new T.Group();next.position.set(0,.38,0);joint.add(next);joint=next;}
 part(sphere,fur,[0,.05,0],[.09,.12,.09],joint);
 // Skin logos (logos: skin name -> material; the KIWI car's logo for the KIWI skin), hidden until that skin is chosen: one on
 // each flank, a strip bent round the body 2 cm off the fur, reading tail to head on the right and head to tail on the
 // left, as on the car's doors.
 const skins={};
 for(const [name,material] of Object.entries(logos))skins[name]=[-1,1].map(s=>{const g=new T.PlaneGeometry(1.3,.42,16,4),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=1.3+p.getY(i),z=.3-s*p.getX(i),e=1-((y-1.25)/.66)**2-((z-.15)/1.45)**2;p.setXYZ(i,s*(.72*Math.sqrt(Math.max(0,e))+.02),y,z);}
  g.computeVertexNormals();const m=new T.Mesh(g,material);m.name=name+' logo';m.visible=false;body.add(m);return m;});
 let phase=0;
 function update(dt,speed,time,colour){
  if(colour)fur.color.copy(colour);
  const run=Math.min(1,speed/6),amp=.2+.7*Math.min(1,speed/14);phase+=dt*(1.5+speed*.42);
  // Bounding gallop: the front pair and the hind pair each move nearly together, half a stride apart.
  const swing=[0,.3,Math.PI,Math.PI+.3].map(o=>Math.sin(phase+o)*amp*run);legs.forEach((leg,i)=>{leg.rotation.x=swing[i];});
  body.position.y=Math.abs(Math.sin(phase))*.16*run;body.rotation.x=Math.sin(phase+Math.PI/2)*.07*run;
  torso.scale.y=.66+Math.sin(time*2.4)*.012*(1-run); // breathing when it stands
  head.rotation.x=-Math.sin(phase+Math.PI/2)*.05*run;head.rotation.y=Math.sin(time*.7)*.12*(1-run);
  ears.forEach((ear,i)=>{ear.rotation.x=(1-run)*Math.max(0,Math.sin(time*1.3+i*2)-.9)*3-.25*run;});
  // Standing, the tail rises behind and curls forward at the tip; running, it streams out behind.
  tail.forEach((seg,i)=>{seg.rotation.x=i===0?.55+.75*run:-.16*(1-run)+.04*run;seg.rotation.z=Math.sin(time*(2+2*run)-i*.6)*(.12+.1*(1-run));});
 }
 update(0,0,0);
 return {group,update,skins};
}
