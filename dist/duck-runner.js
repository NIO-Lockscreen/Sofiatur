// A duck that runs after the car (4 October 2026): the easter egg for visiting the big duck at Lianvannet, driving as the duck, and honking
// (game.js). It is the same follower as Ludvig (boy.js: it keeps to the car's own track a few metres behind, catches up when the car stops and
// stands by its rear corner) with a mallard drake for a model, like the big one in the lake (duck.js) but small and on two orange legs: about
// 0.9 m tall, so the chase camera sees it. It waddles with its whole body, stretches its neck, and half spreads and beats its wings as it runs;
// standing by the parked car it flaps them (the "wave" of the follower). Folded, a wing lies along the flank; spread, it is a paddle out to the side.
// Forward is −z and the ground is y = 0.
import {createBoy} from './boy.js';

export function createDuckRunnerModel(T){
 const group=new T.Group();group.name='Løpende and';
 const mat=(color,roughness=.7,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const grey=mat('#9a9186'),chestnut=mat('#6e3a26'),green=mat('#17643a',.35,.25),white=mat('#f3f0e6'),bill=mat('#e5b52b',.5),orange=mat('#e8832a',.6),black=mat('#1c1f21'),blue=mat('#3055b5',.4,.2),wingGrey=mat('#7b7268');
 const sphere=new T.SphereGeometry(1,16,12),limb=new T.CylinderGeometry(1,.85,1,8),box=new T.BoxGeometry(1,1,1),curl=new T.TorusGeometry(1,.45,6,12,Math.PI*1.4);
 function part(g,m,[x,y,z],[sx,sy,sz],parent){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;}
 const body=new T.Group();group.add(body);
 // The grey body, the chestnut breast in front, a black tail with its curl.
 part(sphere,grey,[0,.46,.02],[.22,.19,.34],body);part(sphere,chestnut,[0,.52,-.24],[.19,.19,.17],body);part(sphere,black,[0,.55,.34],[.12,.09,.12],body);
 part(curl,black,[0,.63,.4],[.045,.07,.045],body).rotation.set(0,Math.PI/2,Math.PI*.6);
 // Wings from the shoulders: one long oval with the blue patch on its back, which lies along the flank when folded and, spread, is a flat paddle
// out to the side; update() sets its shape and lifts it to beat.
 const wings=[-1,1].map(s=>{const sh=new T.Group();sh.position.set(s*.2,.58,-.02);body.add(sh);
  const paddle=part(sphere,wingGrey,[s*.03,-.05,.1],[.05,.045,.3],sh);part(box,blue,[0,.9,.5],[.7,.25,.25],paddle);sh.userData.paddle=paddle;return sh;});
 // The neck, the white collar, the shiny green head with the yellow bill and black eyes.
 const head=new T.Group();head.position.set(0,.58,-.28);body.add(head);
 part(sphere,green,[0,.1,-.03],[.075,.13,.075],head);part(sphere,white,[0,.03,-.01],[.088,.03,.088],head);part(sphere,green,[0,.24,-.07],[.125,.115,.135],head);
 part(sphere,bill,[0,.215,-.21],[.058,.027,.1],head);for(const s of [-1,1])part(sphere,black,[s*.09,.26,-.13],[.021,.026,.021],head);
 // Orange legs from the hips, each with a flat webbed foot; they swing.
 const legs=[-1,1].map(s=>{const hip=new T.Group();hip.position.set(s*.09,.32,.02);body.add(hip);
  part(limb,orange,[0,-.15,0],[.022,.15,.022],hip);part(box,orange,[0,-.305,-.05],[.09,.015,.13],hip);return hip;});
 let phase=0;
 // speed in m/s; wave 0..1 flaps the wings hard (standing by the parked car).
 function update(dt,speed,time,wave=0){
  const run=Math.min(1,speed/2.5);phase+=dt*Math.min(18,5+speed*1.1);
  const s=Math.sin(phase)*run;legs[0].rotation.x=s;legs[1].rotation.x=-s;
  // The waddle: the body rolls from side to side with the steps, hops a little and leans forward; the head is held steadier and the neck stretches.
  body.rotation.z=Math.sin(phase)*.14*run;body.position.y=Math.abs(Math.cos(phase))*.05*run;body.rotation.x=-.12*run;
  head.rotation.x=.25*run+Math.sin(phase*2)*.06*run;head.rotation.z=-body.rotation.z*.6;head.rotation.y=Math.sin(time*.9)*.3*(1-run);
  // The wings: folded along the flank, spread more the faster it runs, and raised and beating when it flaps by the parked car.
  const spread=Math.min(1,run*.6+wave),beat=Math.sin(wave>.2?time*16:phase*2),swing=run*.3+wave*.55;
  wings.forEach((w,i)=>{const side=i?1:-1,m=w.userData.paddle;m.scale.set(.05+spread*.17,.045,.3-spread*.07);m.position.set(side*(.03+spread*.14),-.05*(1-spread),.1);w.rotation.z=side*spread*(.25+swing*(beat*(i?1:.9)));});
 }
 update(0,0,0);
 return {group,update,legs,wings,head};
}

export function createDuckRunner({T,scene}){return createBoy({T,scene,createModel:createDuckRunnerModel});}
