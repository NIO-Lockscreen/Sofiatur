import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {createSpider,SPIDER_PURPLE} from './dist/spider.js';
import {createGirlModel} from './dist/girl.js';

// The spider (dist/spider.js, 11 November 2026): the model, Sofia on its saddle, the legs' inverse kinematics, the gait, the rearing up on the horn and the paint.
const dt=1/60,V=(x,y,z)=>new T.Vector3(x,y,z),purple=new T.Color(SPIDER_PURPLE);
const make=(rider=true,logos={})=>{const girl=rider?createGirlModel(T):null,s=createSpider(T,{logos,rider:girl});return {s,girl};};
const meshes=o=>{let n=0;o.traverse(m=>{if(m.isMesh)n++;});return n;};
const legs=s=>{const out=[];for(const o of s.group.children)if(o.isMesh&&o.geometry.type==='CylinderGeometry')out.push(o);return out;}; // femurs and tibias, in order: femur, tibia, … per leg
const world=o=>{o.updateWorldMatrix(true,false);return V(0,0,0).setFromMatrixPosition(o.matrixWorld);};

// 1. The API of a ride (rides.js), a sensible size, and nothing under the ground.
{const {s}=make();for(const k of ['group','update','skins','seat','honk'])assert.ok(k in s,'has '+k);assert.equal(typeof s.update,'function');
 for(let i=0;i<120;i++)s.update(dt,0,i*dt,purple);const b=new T.Box3().setFromObject(s.group),size=b.getSize(V(0,0,0));
 assert.ok(size.x>5&&size.x<6.6,'about 6 m across the feet: '+size.x.toFixed(2));assert.ok(size.z>5&&size.z<7.5,'about 6.5 m from the front feet to the back feet: '+size.z.toFixed(2));
 assert.ok(size.y>3.2&&size.y<4.4,'Sofia on the saddle is the top: '+size.y.toFixed(2));assert.ok(b.min.y>-.08,'nothing under the ground: '+b.min.y.toFixed(3));
 const n=meshes(s.group);assert.ok(n<200,'a modest number of meshes for the iPad: '+n);
 console.log(`Spider: a ride's API, ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} m with Sofia, ${n} meshes, nothing under the ground: OK`);}

// 2. The legs: eight, femur and tibia each; every frame the knee is exactly a femur from the root and the foot exactly a tibia from the knee (the IK keeps the bones'
// lengths), the knee arches above the root, and no foot goes under the ground. Checked standing, walking, running, scuttling at 50 m/s and rearing up.
{const {s}=make(),bones=legs(s);assert.equal(bones.length,16,'eight legs of two bones');
 const len=m=>{m.geometry.computeBoundingBox();return m.geometry.boundingBox.max.y-m.geometry.boundingBox.min.y;};
 let worstBone=0,lowestFoot=9,kneesUnder=0,frames=0;
 const speeds=t=>t<2?0:t<5?1.5:t<8?8:t<11?50:0;
 for(let i=0;i<14*60;i++){const t=i*dt;if(i===12*60)s.honk();s.update(dt,speeds(t),t,purple);frames++;
  for(let k=0;k<16;k+=2){const fem=bones[k],tib=bones[k+1],root=fem.position,knee=tib.position,up=V(0,1,0);
   const kneeFromFemur=root.clone().addScaledVector(up.clone().applyQuaternion(fem.quaternion),len(fem));worstBone=Math.max(worstBone,kneeFromFemur.distanceTo(knee));
   const foot=knee.clone().addScaledVector(V(0,1,0).applyQuaternion(tib.quaternion),len(tib));lowestFoot=Math.min(lowestFoot,foot.y);if(knee.y<root.y+.25)kneesUnder++;}}
 assert.ok(worstBone<1e-4,'the femur ends at the knee: '+worstBone);assert.ok(lowestFoot>-.02,'no foot under the ground: '+lowestFoot.toFixed(3));
 assert.equal(kneesUnder,0,'every knee arches at least 25 cm above its root');
 console.log(`Spider: 8 legs of 2 bones, bones keep their length, knees arch over the roots, feet above the ground over ${frames} frames from 0 to 50 m/s and rearing: OK`);}

// 3. The gait. Walking (1.5 m/s) and trotting (8 m/s), each foot stands still on the ground while it bears (the stride matches the speed): measured in the world as
// the spider moves forward. The two groups of four alternate: left 1, right 2, left 3, right 4 swing together, then the others. Faster than its feet can keep up
// (about 54 km/h) it scuttles at its quickest step.
for(const speed of [1.5,8]){const {s}=make(),feet=[];for(const o of s.group.children)if(o.isMesh&&o.geometry.type==='SphereGeometry'&&o.scale.y<o.scale.x)feet.push(o);
 assert.equal(feet.length,8,'eight feet');const planted=feet.map(()=>null),drift=feet.map(()=>0),swings=feet.map(()=>0),together=[];
 for(let i=0;i<8*60;i++){const t=i*dt;s.group.position.z-=speed*dt;s.update(dt,speed,t,purple);if(t<3)continue;
  const up=feet.map(f=>f.position.y>f.scale.y+.003); /* a planted foot rests on the ground: its ball's middle at its own height */feet.forEach((f,k)=>{const w=world(f);if(!up[k]){if(planted[k])drift[k]=Math.max(drift[k],w.distanceTo(planted[k]));else planted[k]=w;}else{if(planted[k])swings[k]++;planted[k]=null;}});
  if(up.some(Boolean))together.push(up);}
 const worst=Math.max(...drift);assert.ok(worst<.03,`at ${speed} m/s a planted foot stays put: it slid ${worst.toFixed(3)} m`);assert.ok(swings.every(n=>n>=2),'every foot steps: '+swings);
 // feet in order: for each pair front to back, left then right (spider.js LEGS); group A = L1 R2 L3 R4 = indices 0 3 4 7
 const A=[0,3,4,7],B=[1,2,5,6],mixed=together.filter(up=>A.some(k=>up[k])&&B.some(k=>up[k])).length;
 assert.ok(mixed/together.length<.2,`the two groups of four swing in turn (both groups up in ${(100*mixed/together.length).toFixed(0)} % of the swinging frames)`);
 console.log(`Spider: at ${speed} m/s the feet stay planted (slide ${(1000*worst).toFixed(0)} mm), every foot steps, the two groups of four alternate: OK`);}

// 4. On the horn it rears up: the body lifts, the front feet go up beside the face (above 1.8 m, wider than they stand) and wave, and after 1.4 s it stands again.
{const {s,girl}=make();for(let i=0;i<120;i++)s.update(dt,0,i*dt,purple);const feet=[];for(const o of s.group.children)if(o.isMesh&&o.geometry.type==='SphereGeometry'&&o.scale.y<o.scale.x)feet.push(o);
 const restX=[feet[0].position.x,feet[1].position.x];s.honk();assert.equal(s.rearing,true);let top=0,wave=0;
 for(let i=0;i<40;i++)s.update(dt,0,2+i*dt,purple);top=Math.min(feet[0].position.y,feet[1].position.y);wave=girl.arms[1].rotation.z;
 assert.ok(top>1.8,'both front feet up in the air: '+top.toFixed(2));assert.ok(Math.abs(feet[0].position.x)>Math.abs(restX[0])&&Math.abs(feet[1].position.x)>Math.abs(restX[1]),'out to the sides, not in front of the face');
 assert.ok(feet.slice(4).every(f=>f.position.y<.2),'the back legs stay on the ground');assert.ok(wave>1.5,'Sofia waves: '+wave.toFixed(2));
 for(let i=0;i<60;i++)s.update(dt,0,2.7+i*dt,purple);assert.equal(s.rearing,false);assert.ok(feet.every(f=>f.position.y<.2),'all eight feet down again');
 console.log('Spider: on the horn it rears up, waves its front legs out beside its face, the back legs stay down, Sofia waves, all down again after 1.3 s: OK');}

// 5. Sofia sits on the saddle (as tall as in the balloon), on top, astride; she leans into the run and her pigtails blow back; without a rider there is none.
{const {s,girl}=make();for(let i=0;i<60;i++)s.update(dt,0,i*dt,purple);assert.ok(s.seat.children.includes(girl.group),'she is on the seat');assert.equal(girl.group.scale.x,1.75);
 const hip=world(girl.legs[0]),seat=world(s.seat),head=world(girl.head);assert.ok(hip.distanceTo(seat)<.3,'her hips on the saddle: '+hip.distanceTo(seat).toFixed(2));
 assert.ok(head.y>3,'her head up top, over the abdomen: '+head.y.toFixed(2));assert.ok(Math.abs(girl.legs[0].rotation.z)>.7&&girl.legs[0].rotation.z*girl.legs[1].rotation.z<0,'astride: legs out to both sides');
 for(let i=0;i<200;i++)s.update(dt,20,1+i*dt,purple);assert.ok(girl.group.rotation.x<-.1,'leaning into the run');assert.ok(girl.pigtails.every(p=>p.rotation.x<-.5),'pigtails blowing back');
 const none=make(false).s;assert.equal(none.seat.children.length,0,'no rider on the podium');
 console.log('Spider: Sofia astride on the saddle, head over the abdomen, leaning into the run with her pigtails blowing back; no rider when none is given: OK');}

// 6. The paint: every swatch of the start card (and white and black) keeps the bands, the knees, the heart and the spots clearly lighter or darker than the coat.
{const {s}=make(false),mats=new Set();s.group.traverse(o=>{if(o.isMesh)mats.add(o.material);});const coat=[...mats].find(m=>m.color.getHex()===purple.getHex());
 const swatches=['#14171c','#c62828','#ec6aa8','#7b4cc2','#1f63c6','#17a2a0','#3b9a43','#f3c531','#f07b22','#eef0ef','#9a9186','#5fae36'];
 for(const hex of swatches){const c=new T.Color(hex);s.update(dt,0,1,c);assert.equal(coat.color.getHex(),c.getHex(),'the coat takes the paint');
  const l=m=>{const h={};m.color.getHSL(h);return h.l;},others=[...mats].filter(m=>m!==coat&&m.color&&m.isMeshStandardMaterial),light=others.find(m=>Math.abs(l(m)-l(coat))>.2);
  assert.ok(light,`a contrasting shade on ${hex}`);}
 console.log('Spider: the paint on the coat and a contrasting shade for the details on all '+swatches.length+' colours: OK');}

// 7. The KIWI skin: a logo on each flank of the abdomen, hidden until world.js shows it; the same input gives the same picture; the per-frame code allocates nothing.
{const logo=new T.MeshBasicMaterial(),{s}=make(true,{kiwi:logo});assert.equal(s.skins.kiwi.length,2);assert.ok(s.skins.kiwi.every(m=>m.material===logo&&m.visible===false));
 const run=()=>{const {s}=make();for(let i=0;i<300;i++){if(i===150)s.honk();s.update(dt,i<100?0:6,i*dt,purple);}const out=[];s.group.traverse(o=>{if(o.isMesh)out.push(...o.matrixWorld.elements.slice(12,15).map(v=>v.toFixed(5)));});s.group.updateMatrixWorld(true);return out.join();};
 assert.equal(run(),run(),'deterministic');
 const src=fs.readFileSync('dist/spider.js','utf8'),body=name=>{const a=src.indexOf('function '+name+'('),b=src.indexOf('\n }\n',a);return src.slice(a,b);};
 for(const name of ['update','place','ride'])assert.ok(!/\bnew\b|=>|\[\s*[\d.'"-]|\{\s*\w+\s*:/.test(body(name)),name+': no new, no closure, no array or object literal per frame');
 console.log('Spider: the KIWI logo on both flanks, deterministic, nothing allocated per frame: OK');}
