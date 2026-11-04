// Sofia's dream (4 November 2026, copied from the bedtime in Sofia's space game, SofiaSpace's bedtime.js): once she has fallen asleep on the sofa bed in the house
// (inside.js), Z's float up from the pillow and a dream bubble swells over her. Three little clouds rise from her head, then a bubble of night sky with twinkling stars
// opens. In it float the car, a rainbow and the rides and friends she has unlocked on the podium (a little turning model of each), three at a time. Each one swaps to
// the next every seven seconds with a little pop, and now and then a comet streaks across. Everything in it can be tapped: inside.js casts its ray at targets() and
// asks hit() what was found. Solid colours only, as the software renderer skips see-through things. The Z's are sprites, which it draws as pictures, so their
// fading is baked into five textures.
const SWAP=7,ITEM=.55,SLOT_AT={1:[[0,0]],2:[[-.42,.06],[.44,-.08]],3:[[-.5,.14],[.06,-.22],[.55,.16]]}; // seconds an item stays; its size in the bubble; where the items float
const ease=k=>k*k*(3-2*k),pop=k=>k<=0?0:1+2.70158*(k-1)**3+1.70158*(k-1)**2,clamp=k=>Math.min(1,Math.max(0,k));

// build(id): a model fitted to a metre and standing on y = 0, {group, spin, tick} (inside.js), or null.
export function createDream({T,scene,build}){
 const group=new T.Group();group.name='dream';group.visible=false;scene.add(group); // the bubble, turned to face the camera
 const inner=new T.Group();group.add(inner); // and grown from nothing
 const basic=color=>new T.MeshBasicMaterial({color}),soft=color=>new T.MeshStandardMaterial({color,roughness:.9,emissive:color,emissiveIntensity:.4});
 const mesh=(g,m,parent,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
 const ball=new T.SphereGeometry(1,14,10);
 // ---- The bubble: a disc of night sky with a rim of soft clouds and ten twinkling stars ----
 const sky=mesh(new T.CircleGeometry(1,48),basic('#1b2152'),inner,0,0,-.08);sky.scale.set(1.08,.74,1);
 const rim=Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2;return mesh(ball,soft(i%2?'#ece6ff':'#ddd5ff'),inner,Math.cos(a)*1.08,Math.sin(a)*.74,-.03);});
 const shape=new T.Shape();for(let i=0;i<10;i++){const r=i%2?.45:1,a=Math.PI/2+i*Math.PI/5;shape[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}
 const starGeo=new T.ShapeGeometry(shape),starMat=basic('#fff1b8'),STARS=Array.from({length:10},(_,i)=>[Math.sin(i*5.3)*.78,Math.cos(i*3.7)*.5,.025+(i%3)*.012]);
 const stars=STARS.map(([x,y],i)=>{const s=mesh(starGeo,starMat,inner,x,y,.02);s.rotation.z=i;return s;});
 // Three puffs on the way from her head up to the bubble; they stand in the room, not in the bubble.
 const PUFFS=[[.2,.07],[.45,.11],[.7,.15]],puffs=PUFFS.map(()=>{const p=mesh(ball,soft('#ece6ff'),scene);p.visible=false;return p;});
 // ---- The items: a place for each, with an invisible ball to tap ----
 const hitMat=new T.MeshBasicMaterial({color:'#ff00ff'});
 const slots=[0,1,2].map(j=>{const holder=new T.Group();holder.visible=false;inner.add(holder);const turn=new T.Group();turn.rotation.x=.3;turn.scale.setScalar(ITEM);holder.add(turn); // tipped a little towards the camera
  const hit=mesh(ball,hitMat,holder);hit.visible=false;hit.scale.setScalar(.28);return {j,holder,turn,hit,id:null,cycle:-1,model:null,show:0};});
 const models=new Map(); // one of each, built when first dreamt of
 // ---- The comet: a white head and a tail of shrinking blue balls; only what is inside the bubble shows ----
 const comet=new T.Group();inner.add(comet);comet.visible=false;
 const cometHead=mesh(ball,basic('#f2fdff'),comet,0,0,.14);cometHead.scale.setScalar(.065);
 const tail=Array.from({length:8},(_,i)=>mesh(ball,basic(['#c9f6ff','#9fe3ff','#7ec8ff','#8aa6ff'][(i+1)%4]),comet));
 const cometHit=mesh(ball,hitMat,comet);cometHit.visible=false;cometHit.scale.setScalar(.2);
 // ---- The Z's: three sprites, each with five textures from faint to full ----
 const zLevels=[0,1,2,3,4].map(level=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.globalAlpha=(level+1)/5;
  g.font='900 52px "Arial Black",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=8;g.strokeStyle='#3b3480';g.strokeText('Z',32,35);g.fillStyle='#ece6ff';g.fillText('Z',32,35);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return new T.SpriteMaterial({map,transparent:true,depthWrite:false});});
 const zs=[0,1,2].map(()=>{const s=new T.Sprite(zLevels[4]);s.visible=false;scene.add(s);return s;});
 // ---- Sparkles: a burst of little balls where something in the dream is tapped, and from the bubble when she wakes ----
 const sparks=Array.from({length:28},(_,i)=>{const m=mesh(ball,basic(['#ffde71','#ffffff','#79e4e2','#ece6ff'][i%4]),scene);m.visible=false;return {m,v:new T.Vector3(),life:0};});
 let seed=11;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
 function burst(p,n=12,speed=1.6){let k=0;for(const s of sparks){if(k>=n)break;if(s.life>0)continue;k++;const a=rnd()*Math.PI*2,b=rnd()*2-1,r=Math.sqrt(1-b*b);
  s.life=.8;s.m.position.copy(p);s.v.set(Math.cos(a)*r,b,Math.sin(a)*r).multiplyScalar(speed*(.5+rnd()*.5));s.m.visible=true;}}
 // ---- What she dreams of, and which of it shows where ----
 let list=['car','arc'],next=0,cometCycle=-1,cometTapped=-1,cometOn=false;
 function setList(ids){list=ids.length?[...ids]:['car'];}
 function reset(){for(const s of slots){s.id=null;s.cycle=-1;s.show=0;s.holder.visible=false;}next=0;cometTapped=-1;cometOn=false;}
 // the next thing in the list that is not already floating in another place
 function pick(s,n){for(let i=0;i<list.length;i++){const id=list[next++%list.length];if(!slots.some(o=>o!==s&&o.j<n&&o.id===id))return id;}return list[0];}
 function dress(s){const id=s.id;if(!models.has(id))models.set(id,build(id));const m=models.get(id);if(s.model&&s.model!==m)s.turn.remove(s.model.group);s.model=m;if(!m)return;
  if(m.h===undefined){const b=new T.Box3();m.group.updateWorldMatrix(true,true);m.group.traverseVisible(o=>{if(o.isMesh)b.expandByObject(o,false);});m.h=b.isEmpty()?0:b.max.y-b.min.y;}m.group.position.y=-m.h/2;s.turn.add(m.group);}
 const right=new T.Vector3(),up=new T.Vector3(),toHead=new T.Vector3(),rimAt=new T.Vector3(),from=new T.Vector3();
 // t: seconds she has dreamt (0: not dreaming); head: the middle of her head; at: the middle of the bubble; size: its scale in metres; side: where the Z's drift.
 function update(dt,time,{t=0,head,at,size=1,camera,side}){
  for(const s of sparks){if(s.life<=0)continue;s.life-=dt;s.m.position.addScaledVector(s.v,dt);s.v.multiplyScalar(Math.max(0,1-dt*1.8));s.m.scale.setScalar(.055*Math.max(0,s.life)/.8);if(s.life<=0)s.m.visible=false;}
  const grow=t>0?pop(clamp((t-.7)/.8)):0;group.visible=grow>0;cometOn=false;
  for(const p of puffs)p.visible=false;for(const z of zs)z.visible=false;if(t<=0)return;
  const e=camera.matrixWorld.elements;right.set(e[0],e[1],e[2]).normalize();up.set(e[4],e[5],e[6]).normalize();
  // the puffs, one after another, from just over her head towards the edge of the bubble that faces her
  toHead.subVectors(head,at);const a=Math.atan2(toHead.dot(up)/.74,toHead.dot(right)/1.08);rimAt.copy(at).addScaledVector(right,Math.cos(a)*1.08*size).addScaledVector(up,Math.sin(a)*.74*size);from.copy(head).addScaledVector(up,.3);
  PUFFS.forEach(([f,r],i)=>{const k=pop(clamp((t-i*.25)/.3))*r*size;puffs[i].visible=k>.003;puffs[i].scale.setScalar(Math.max(k,.001));puffs[i].position.lerpVectors(from,rimAt,f);});
  // the Z's rise from the pillow and fade, growing as they go
  const z=t-.3;if(z>0)zs.forEach((s,i)=>{if(z*.42<i/3)return;const f=(z*.42+1-i/3)%1,alpha=Math.min(1,f/.15,(1-f)/.35),k=.16+f*.32;if(alpha<=0)return;
   s.material=zLevels[Math.max(0,Math.min(4,Math.ceil(alpha*5)-1))];s.scale.set(k,k,1);s.visible=true;
   s.position.copy(head).addScaledVector(side,.15+f*.5+Math.sin(f*7+i)*.08);s.position.y+=.3+f*1.3;});
  if(!group.visible)return;
  group.position.copy(at);group.quaternion.copy(camera.quaternion);inner.scale.setScalar(size*grow);
  rim.forEach((c,i)=>{const r=.24+.07*Math.sin(i*2.7)+.025*Math.sin(time*1.3+i);c.scale.set(r,r,r*.6);});
  stars.forEach((s,i)=>{const k=STARS[i][2]*(.7+.3*Math.sin(time*3+i*1.9));s.scale.set(k,k,1);});
  // Up to three things at a time; each place swaps to the next every seven seconds, a third of that after the one before it.
  const n=Math.min(3,list.length),place=SLOT_AT[n];
  for(const s of slots){if(s.j>=n){s.show=0;s.holder.visible=false;continue;}
   const tj=t+s.j*SWAP/3,cycle=Math.floor(tj/SWAP),f=(tj%SWAP)/SWAP;if(cycle!==s.cycle){s.cycle=cycle;s.id=pick(s,n);dress(s);}
   s.show=pop(clamp(f/.1))*ease(clamp((1-f)/.1));s.holder.visible=s.show>.005&&!!s.model;s.holder.scale.setScalar(Math.max(s.show,.001));
   s.holder.position.set(place[s.j][0]+Math.sin(time*.4+s.j*2)*.08,place[s.j][1]+Math.cos(time*.5+s.j)*.05,.1);
   if(s.model){s.model.spin.rotation.y=time*.6+s.j*2;s.model.tick(dt,time);}}
  // A comet every 3.2 seconds, across and down, from either side; tapped, it is gone until the next one.
  const cc=Math.floor(t/3.2),cf=(t%3.2)/1.6;comet.visible=cf<1&&cc!==cometTapped&&grow>.9;
  if(comet.visible){const dir=cc%2?1:-1,y0=.5-(cc%3)*.08,hx=-1.25*dir+2.5*dir*cf,hy=y0-.8*cf,inside=(x,y)=>(x/.98)**2+(y/.66)**2<1;
   cometHead.position.set(hx,hy,.14);cometHead.visible=inside(hx,hy);cometHit.position.copy(cometHead.position);cometOn=cometHead.visible;cometCycle=cc;
   tail.forEach((b,i)=>{const x=hx-dir*(i+1)*.07,y=hy+(i+1)*.022;b.position.set(x,y,.13);b.scale.setScalar(.06*(1-(i+1)/10));b.visible=inside(x,y);});}}
 // What a tap may hit in the dream: the sky (which takes the tap and does nothing), the things that are fully there and the comet.
 function targets(){if(!group.visible||inner.scale.x<.05)return [];return [sky,...slots.filter(s=>s.holder.visible&&s.show>.3).map(s=>s.hit),...(cometOn?[cometHit]:[])];}
 function hit(o,point){if(o===cometHit&&cometOn){cometTapped=cometCycle;cometOn=false;comet.visible=false;burst(point,16,1.8);return {type:'comet'};}
  const s=slots.find(s=>s.hit===o);if(s&&s.id){burst(point,12,1.4);return {type:'dream',id:s.id};}
  return o===sky?{type:'sky'}:null;}
 return {group,sky,slots,zs,puffs,sparks,comet,cometHit,setList,reset,update,targets,hit,burst,get list(){return list;}};
}
