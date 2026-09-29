import {createFreeDrive} from './free-drive.js';
import {createWorld,T} from './world.js';
import {roundaboutChoices} from './roundabouts.js';
import {createMusic} from './music.js';
const $=id=>document.getElementById(id);
let world,data,state='loading',sound=true,current,previous=null,active=null,distance=0,speed=0,travelled=0,turns=0,heading=new T.Vector3(0,0,1),position=new T.Vector3(),choices=[],best=null,totalInitial=0,maxKmh=200,camMode='follow',lastTime=performance.now(),time=0,mapClock=0,leavingHome=false;
let roundaboutUndo=null,freeMode=false,free=null,carHeight,showDeadEnds=true,choicesStale=false,musicOn=true,queue=[],preview=null,picked=null,pickedUntil=-9,aheadShown=false,planKey='';
let arrivals=0,carColour='#14171c',trailOn=true,catOn=false,newReward=null;
const roundaboutKmh=45; // speed round the circle and into it
// Junctions where every road is offered, also with blindveier off: the Palermo traffic lights (left, straight on, right).
const everyRoadAt=new Set(['91783986']);
let chooseAhead=false; // Menu option: arrows for the next junction while driving, to queue up to two roads. Off by default.
const music=createMusic();
const keys=new Set(),touch=new Set(),heldPointers=new Map(),cameraHeading=new T.Vector3();
function clearInputs(){keys.clear();touch.clear();heldPointers.clear();for(const id of ['freeLeft','freeRight','freeBrake','freeDrift'])$(id).classList.remove('held');}
function freeInput(){return {left:keys.has('ArrowLeft')||keys.has('KeyA')||touch.has('left'),right:keys.has('ArrowRight')||keys.has('KeyD')||touch.has('right'),brake:keys.has('ArrowDown')||keys.has('KeyS')||touch.has('brake'),drift:keys.has('Space')||touch.has('drift')};}
function startFree(){state='free';active=null;choices=[];queue=[];preview=null;roundaboutUndo=null;clearInputs();free.reset(position.x,position.z,Math.atan2(heading.x,-heading.z));ui.welcome.hidden=true;ui.drive.hidden=false;ui.mini.hidden=false;ui.finish.hidden=true;clearWorldChoices();document.body.classList.remove('choosing');$('freeControls').hidden=false;$('undoRoundabout').hidden=true;$('street').textContent='Frikjøring';updateHud();}
function recoverFree(){if(state!=='free')return;clearInputs();free.recover();position.set(free.car.x,free.altitude,free.car.z);speed=0;heading.set(Math.sin(free.car.yaw),0,-Math.cos(free.car.yaw));world.resetCamera();}

let adjacency=new Map(),incoming=new Map(),distances=new Map(),optimal=new Map(),openRoads=new Set();
const ui={welcome:$('welcome'),decision:$('decision'),drive:$('driveHud'),mini:$('mini'),finish:$('finish')};
function say(text){if(!sound||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();const s=new SpeechSynthesisUtterance(text);s.lang='nb-NO';s.rate=.88;s.pitch=1.1;const v=speechSynthesis.getVoices().find(x=>/^nb|^no/.test(x.lang));if(v)s.voice=v;s.onstart=()=>music.duck(true);s.onend=s.onerror=()=>music.duck(false);speechSynthesis.speak(s);}catch{}}
let toastTimer;function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3100);}
function point(n){const p=data.nodes[n];return new T.Vector3(p[0],carHeight(...p),p[1]);}
// The car follows the drawn road's smoothed centre line (world.roadLine: samples 2 m apart, level and bends as drawn); without it, sample the road every 2 m between map nodes.
function roadPoints(path){if(world.roadLine)return world.roadLine(path).map(p=>new T.Vector3(p[0],p[2],p[1]));const pts=[];for(const n of path){const [x,z]=data.nodes[n],last=pts.at(-1);if(last){const len=Math.hypot(x-last.x,z-last.z);if(len<.05)continue;const steps=Math.ceil(len/2);for(let k=1;k<steps;k++){const px=last.x+(x-last.x)*k/steps,pz=last.z+(z-last.z)*k/steps;pts.push(new T.Vector3(px,carHeight(px,pz),pz));}}pts.push(point(n));}return pts;}
// Curves are built once per road; a roundabout plan's path depends on its entrance, so plans are keyed by entrance and exit.
const curves=new Map();
function roadCurve(e){const key=e.roundaboutPlan?e.from+'>'+e.id:e.id;let curve=curves.get(key);if(!curve){curve=new T.CatmullRomCurve3(roadPoints(e.path),false,'centripetal',.15);curve.arcLengthDivisions=Math.max(50,Math.ceil(e.length*2));curves.set(key,curve);}return curve;}
function endDirection(e,start=true){const p=e.path.map(n=>data.nodes[n]),i=start?e.stub||0:p.length-2;const a=p[i],b=p[i+1];return new T.Vector3(b[0]-a[0],0,b[1]-a[1]).normalize();}
function routeFrom(n){const route=[];const visited=new Set();while(n!==data.goal&&!visited.has(n)){visited.add(n);const e=optimal.get(n);if(!e)break;route.push(e);n=e.to;}return route;}
function computeRoutes(){const reverse=incoming;for(const e of data.edges){if(!adjacency.has(e.from))adjacency.set(e.from,[]);adjacency.get(e.from).push(e);if(!reverse.has(e.to))reverse.set(e.to,[]);reverse.get(e.to).push(e);}distances.set(data.goal,0);const todo=[data.goal];while(todo.length){todo.sort((a,b)=>distances.get(b)-distances.get(a));const n=todo.pop(),d=distances.get(n);for(const e of reverse.get(n)||[]){const nd=d+(e.cost||e.length);if(nd<(distances.get(e.from)??Infinity)){distances.set(e.from,nd);optimal.set(e.from,e);if(!todo.includes(e.from))todo.push(e.from);}}}}
function reset(){clearInputs();$('freeControls').hidden=true;roundaboutUndo=null;queue=[];preview=null;picked=null;$('undoRoundabout').hidden=true;maxKmh=200;current=data.start;previous=null;active=null;distance=0;speed=0;travelled=0;turns=0;state='intro';position.copy(point(current));heading.copy(endDirection(optimal.get(current)));totalInitial=routeFrom(current).reduce((n,e)=>n+e.length,0);ui.welcome.hidden=false;ui.drive.hidden=true;ui.decision.hidden=true;ui.finish.hidden=true;document.body.classList.remove('choosing');world.resetCamera();clearWorldChoices();world.setTurnArrow(null);$('remaining').textContent='Herlofsons veg → Skjermvegen';newReward=null;showRewards();}
function start(){if(state!=='intro')return;if(sound&&musicOn)music.play();if(freeMode){startFree();return;}ui.welcome.hidden=true;ui.drive.hidden=false;state='decision';say('Hei Sofia! Nå kjører vi til barnehagen. Ved hvert kryss velger du vei med en pil.');leavingHome=true;showDecision();}
// A roundabout exit's arrow shows where its road goes, seen from the circle (roundaboutLabels); without that, where its
// road leaves the circle, seen from the car as it comes in. An exit that leads back to the junction the car came from
// is a U-turn, however the roads meet (at Stavset, Byåsveien's lanes part before the circle).
function roundaboutDirection(e,h){const d=endDirection(e.segments.find(s=>!s.roundabout)),angle=e.turn??Math.atan2(h.x*d.z-h.z*d.x,T.MathUtils.clamp(h.x*d.x+h.z*d.z,-1,1)),deg=Math.abs(angle)*180/Math.PI;
 const label=e.label||(deg>150||e.uTurn?'Snu':deg<55?'Rett frem':angle>0?'Høyre':'Venstre');return {label,symbol:{Høyre:'↱','Rett frem':'↑',Venstre:'↰',Snu:'↶'}[label],angle};}
function directionInfo(e,h=heading){if(e.roundaboutPlan)return roundaboutDirection(e,h);const dir=endDirection(e);const dot=T.MathUtils.clamp(h.x*dir.x+h.z*dir.z,-1,1);const cross=h.x*dir.z-h.z*dir.x;const angle=Math.atan2(cross,dot);if(e.label)return {label:e.label,symbol:e.label==='Høyre'?'↱':'↰',angle};if(Math.abs(angle)>2.5)return {label:'Snu',symbol:'↶',angle};if(angle>.42)return {label:'Høyre',symbol:'↱',angle};if(angle<-.42)return {label:'Venstre',symbol:'↰',angle};return {label:'Rett frem',symbol:'↑',angle};}
function clearWorldChoices(){planKey='';aheadShown=false;const wrap=$('worldArrows');wrap.replaceChildren();wrap.hidden=true;$('turnHint').hidden=true;}
function renderWorldChoices(list=choices,h=heading,pick=e=>choose(e.id,true),ahead=false){
 const wrap=$('worldArrows');wrap.replaceChildren();const groups=new Map();
 for(const e of list){const info=directionInfo(e,h),key=info.label==='Rett frem'?'straight':info.label==='Venstre'?'left':info.label==='Høyre'?'right':'reverse';if(!groups.has(key))groups.set(key,[]);groups.get(key).push({e,info});}
 // Arrows ahead sit higher, clear of the minimap that shows while driving.
 const positions=ahead?{straight:[50,38],left:[27,52],right:[73,52],reverse:[50,62]}:{straight:[50,48],left:[27,66],right:[73,66],reverse:[50,76]};
 // On each side the gentlest turn sits highest, as its road runs furthest ahead, and the sharpest lowest.
 for(const [key,items] of groups){if(key==='left'||key==='right')items.sort((a,b)=>Math.abs(a.info.angle)-Math.abs(b.info.angle));items.forEach(({e,info},i)=>{
  const b=document.createElement('button');b.type='button';b.className=`world-choice ${key}${e.roundaboutPlan?' roundabout-choice':''}${ahead?' ahead':''}`;
  b.style.left=(positions[key][0]+(key==='straight'||key==='reverse'?(i-(items.length-1)/2)*19:0))+'%';
  b.style.top=(positions[key][1]+(key==='left'||key==='right'?(i-(items.length-1)/2)*17:0))+'%';
  b.setAttribute('aria-label',`${e.roundaboutPlan?e.exitNumber+'. avkjørsel, ':''}${info.label}: ${e.name}`);
  const g=document.createElement('span');g.className='choice-glyph';g.textContent=key==='straight'?'↑':key==='left'?'←':key==='right'?'→':'↶';
  const n=document.createElement('span');n.className='choice-name';n.textContent=e.name==='Lokalvei'?'Innkjøring':e.name;b.append(g,n);
  if(e.roundaboutPlan){const badge=document.createElement('span');badge.className='exit-number';badge.textContent=e.exitNumber;b.append(badge);}
  b.onclick=()=>pick(e);wrap.append(b);
 });}
 wrap.hidden=false;$('turnHint').textContent=list.some(e=>e.roundaboutPlan)?'Rundkjøring · velg avkjørsel':'Trykk på en pil for å velge vei';$('turnHint').hidden=false;
}
function ringNodes(n){const ring=new Set();while(n!==undefined&&!ring.has(n)){ring.add(n);n=(adjacency.get(n)||[]).find(e=>e.roundabout)?.to;}return ring;}
// Blindvei: a road from which neither the kindergarten nor home can be reached without driving back through the junction or turning around.
function computeOpenRoads(){
 const target=n=>n===data.goal||n===data.start||parkingPlaces.has(n); // car parks at KIWI, the ice rink, Rema 1000 Stavset and Bunnpris are places to go, not blindveier
 const leadsOn=e=>{if(e.roundabout)return true;const seen=(adjacency.get(e.from)||[]).some(x=>x.roundabout)?ringNodes(e.from):new Set([e.from]);if(seen.has(e.to))return false;seen.add(e.to);const todo=[e.to];while(todo.length){const n=todo.pop();if(target(n))return true;for(const x of adjacency.get(n)||[])if(!seen.has(x.to)){seen.add(x.to);todo.push(x.to);}}return false;};
 const through=data.edges.filter(leadsOn),before=new Map();
 for(const x of through){const h=endDirection(x,false);for(const y of adjacency.get(x.to)||[])if(y.to!==x.from&&directionInfo(y,h).label!=='Snu'){if(!before.has(y))before.set(y,[]);before.get(y).push(x);}}
 const todo=through.filter(e=>target(e.to));todo.forEach(e=>openRoads.add(e));
 while(todo.length)for(const x of before.get(todo.pop())||[])if(!openRoads.has(x)){openRoads.add(x);todo.push(x);}
}
function roadChoices(node,prev,h){
 const outgoing=(adjacency.get(node)||[]).filter(e=>distances.has(e.to));let list,top;
 if(outgoing.some(e=>e.roundabout)){
  list=roundaboutChoices(node,prev,adjacency,distances);roundaboutLabels(list,node,prev,h);
  top=list.reduce((a,e)=>!a||e.cost+distances.get(e.to)<a.cost+distances.get(a.to)?e:a,null);
  if(!showDeadEnds)list=list.filter(e=>e===top||openRoads.has(e.segments.find(s=>!s.roundabout)));
 }else{
  top=optimal.get(node);
  const open=showDeadEnds||everyRoadAt.has(node)?outgoing:outgoing.filter(e=>e===top||openRoads.has(e));
  straightest(outgoing.filter(e=>e.to!==prev),h);
  let nonback=open.filter(e=>e.to!==prev&&directionInfo(e,h).label!=='Snu');
  if(!nonback.length)nonback=open;
  const seen=new Set();list=nonback.filter(e=>{if(seen.has(e.to))return false;seen.add(e.to);return true;}).sort((a,b)=>directionInfo(a,h).angle-directionInfo(b,h).angle);
  if(top&&!list.some(e=>e.id===top.id)&&outgoing.some(e=>e.id===top.id))list.push(top);
 }
 return {list,top};
}
// Where a roundabout's roads go, as a driver sees them from the circle: the bearing from the circle's centre to the road
// in, 35 m before the circle, and to each exit road, 35 m after it. Opposite the road in (within 45°) is straight on, a
// quarter turn round the circle right, three quarters left; only the exit back to the road in is Snu, a sharp turn onto
// another road is right or left. Measured on the map, so the car's heading as it reaches the circle does not matter:
// lanes at splitter islands curve in, which used to turn every arrow a little (coming down Munkvollvegen into the
// roundabout on Byåsveien by Midelfarts veg, Byåsveien straight ahead read as a right turn and Midelfarts veg, to the
// left, as straight on).
// Of two exits within 45°, only the straighter is straight on.
function roundaboutLabels(list,node,prev,h){
 const entry=(adjacency.get(prev)||[]).find(e=>e.to===node&&!e.roundabout),ring=ringNodes(node);if(!entry){straightest(list,h);return;}
 const pts=[...ring].map(n=>data.nodes[n]),c=[pts.reduce((s,p)=>s+p[0],0)/pts.length,pts.reduce((s,p)=>s+p[1],0)/pts.length];
 const a=alongRoad(entry,35,true,ring),inX=c[0]-a[0],inZ=c[1]-a[1];
 for(const e of list){const x=alongRoad(e.segments.find(s=>!s.roundabout),35,false,ring),dx=x[0]-c[0],dz=x[1]-c[1];e.turn=Math.atan2(inX*dz-inZ*dx,inX*dx+inZ*dz);
  e.label=e.uTurn?'Snu':Math.abs(e.turn)<Math.PI/4?'Rett frem':e.turn>0?'Høyre':'Venstre';}
 for(const e of list.filter(e=>e.label==='Rett frem').sort((a,b)=>Math.abs(a.turn)-Math.abs(b.turn)).slice(1))e.label=e.turn>0?'Høyre':'Venstre';
}
// The point `metres` along a road from the start of edge e (back: from its end, backwards), carrying on the straightest
// way at junctions and never into the circle `ring`; the road's end if it ends sooner.
function alongRoad(e,metres,back,ring){
 let edge=e,left=metres,last=data.nodes[back?e.to:e.from];const seen=new Set();
 while(edge&&!seen.has(edge)){seen.add(edge);const p=(back?[...edge.path].reverse():edge.path).map(n=>data.nodes[n]);
  for(let i=1;i<p.length;i++){const l=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);if(l>=left){const t=left/l;return [p[i-1][0]+(p[i][0]-p[i-1][0])*t,p[i-1][1]+(p[i][1]-p[i-1][1])*t];}left-=l;}
  last=p[p.length-1];const a=p[p.length-2],end=back?edge.from:edge.to,dx=last[0]-a[0],dz=last[1]-a[1];
  const next=((back?incoming:adjacency).get(end)||[]).filter(x=>!x.roundabout&&!ring.has(back?x.from:x.to)&&(back?x.from:x.to)!==(back?edge.to:edge.from));
  edge=next.map(x=>{const q=(back?[...x.path].reverse():x.path).map(n=>data.nodes[n]),vx=q[1][0]-q[0][0],vz=q[1][1]-q[0][1];return {x,c:(vx*dx+vz*dz)/(Math.hypot(vx,vz)||1)};}).sort((a,b)=>b.c-a.c)[0]?.x;}
 return last;
}
// Two roads that both read as straight on cannot both be: only the straighter one is, the other bends to its own side.
// At the Munkvoll roundabout, coming up Byåsveien, Bøckmans veg (47° right) is the right turn and Byåsveien (36° left) straight on.
// Counted over every road at the junction, blindveier included, so the arrows do not change with that setting.
function straightest(list,h){for(const e of list)delete e.label;const straight=list.map(e=>({e,i:directionInfo(e,h)})).filter(x=>x.i.label==='Rett frem').sort((a,b)=>Math.abs(a.i.angle)-Math.abs(b.i.angle));
 for(const {e,i} of straight.slice(1))e.label=i.angle>0?'Høyre':'Venstre';}
// With one road left (e.g. right, when straight ahead is a blindvei) the car drives on by itself.
function autoRoad(list,prev,h){return list.length===1&&prev&&directionInfo(list[0],h).label!=='Snu'?list[0]:null;}
// Look past road e: junctions taken automatically or by a queued choice are driven through without slowing
// (with blindveier on, automatic junctions still slow the car; roundabouts are entered at circle speed).
// Returns where the car must slow down (metres past e, speed there) and the first junction still waiting for a choice.
function lookAhead(e,curve){
 let ahead=0,node=e.to,prev=e.arrivalFrom??e.from,h=curve.getTangentAt(1),planned=0,slow=null;
 for(let step=0;step<40&&ahead<3000;step++){
  if(node===data.goal)return {slow:slow??{ahead,floor:2.4},junction:null};
  const {list,top}=roadChoices(node,prev,h);let next=autoRoad(list,prev,h);
  if(next){if(showDeadEnds)slow??={ahead,floor:2.4};}
  else if(queue[planned]?.node===node&&(next=list.find(c=>c.id===queue[planned].id)))planned++;
  else return {slow:slow??{ahead,floor:2.4},junction:{node,prev,h,list,top,ahead,key:node+':'+list.map(c=>c.id)}};
  if(next.roundaboutPlan)slow??={ahead,floor:roundaboutKmh/3.6};
  ahead+=next.length;node=next.to;prev=next.arrivalFrom??next.from;h=roadCurve(next).getTangent(1);
 }
 return {slow:slow??{ahead:Infinity,floor:2.4},junction:null};
}
function planAhead(){if(!active)return;const {slow,junction}=lookAhead(active.e,active.curve);active.ahead=slow.ahead;active.floor=slow.floor;preview=junction;renderPlan();}
// While driving: a picked arrow lights up briefly, then arrows for the next open junction appear once it is within 250 m.
// Queued roads show in the hint and as the floating cue over the car.
function renderPlan(){
 if(state!=='driving')return;
 const confirming=!!picked&&time<pickedUntil,show=chooseAhead&&!confirming&&!!preview&&!!active&&active.len-distance+preview.ahead<=250&&queue.length<2;
 // Rebuild only when something visible changes, so a tap is not lost while passing automatic junctions.
 const key=`${confirming}|${show?preview.key:''}|${queue.map(q=>q.id)}`;if(key===planKey)return;
 const next=queue[0];world.setTurnArrow(next?{symbol:next.symbol,label:next.label}:null);
 if(confirming){renderWorldChoices([picked.e],picked.h,()=>{},true);$('worldArrows').children[0]?.classList.add('picked');}
 else if(show)renderWorldChoices(preview.list,preview.h,queueChoice,true);else clearWorldChoices();
 planKey=key;aheadShown=show;
 const planned=queue.map(q=>`${q.glyph} ${q.name}`).join(' · så ');
 $('turnHint').textContent=planned?`Neste: ${planned}`:show&&preview.list.some(e=>e.roundaboutPlan)?'Neste rundkjøring · velg avkjørsel':'Velg neste vei';$('turnHint').hidden=!planned&&!show;
}
// Tapping an arrow before the junction queues it, at most two junctions ahead. Roundabout plans are rebuilt while
// driving, so the tapped road is matched by id.
function queueChoice(tapped){
 const e=aheadShown&&tapped&&preview.list.find(c=>c.id===tapped.id);if(state!=='driving'||!e||queue.length>=2)return false;
 const info=directionInfo(e,preview.h),glyph={Venstre:'←',Høyre:'→','Rett frem':'↑',Snu:'↶'}[info.label];
 queue.push({node:preview.node,id:e.id,name:e.name==='Lokalvei'?'Innkjøring':e.name,label:e.roundaboutPlan?`Avkjørsel ${e.exitNumber}`:info.label,symbol:e.roundaboutPlan?String(e.exitNumber):info.symbol,glyph:e.roundaboutPlan?`${e.exitNumber}.`:glyph});
 picked={e,h:preview.h};pickedUntil=time+.8;say(e.roundaboutPlan?`Så tar vi avkjørsel ${e.exitNumber}.`:{Venstre:'Så svinger vi til venstre!',Høyre:'Så svinger vi til høyre!','Rett frem':'Så kjører vi rett frem!',Snu:'Så snur vi!'}[info.label]);
 planAhead();return true;
}
function showDecision(){
 if(current===data.goal){finish();return;}
 choicesStale=false;({list:choices,top:best}=roadChoices(current,previous,heading));
 // Leaving the parking place there is only one road: the start button already said go, so no arrow is shown for it.
 const next=parkingPlaces.has(current)?null:autoRoad(choices,previous,heading)||(leavingHome&&choices.length===1?choices[0]:null);leavingHome=false;if(next){choose(next.id,false);return;}
 const planned=queue[0]?.node===current?choices.find(e=>e.id===queue[0].id):null;if(planned){queue.shift();choose(planned.id,true,true);return;}
 queue=[];preview=null;world.setTurnArrow(null);
 state='decision';speed=0;ui.decision.hidden=true;ui.mini.hidden=true;document.body.classList.add('choosing');
 clearWorldChoices();renderWorldChoices();updateHud();
}
function choose(edgeId,manual=true,planned=false){if(state!=='decision')return false;const e=(manual?choices:[...choices,...(adjacency.get(current)||[])]).find(e=>e.id===Number(edgeId));if(!e)return false;if(manual&&!choices.some(x=>x.id===e.id))return false;
 if(manual&&e.roundaboutPlan){roundaboutUndo={current,previous,position:position.clone(),heading:heading.clone(),travelled,turns};$('undoRoundabout').hidden=false;}
 const curve=roadCurve(e);if(curve.points.length<2)return false;const len=curve.getLength();const info=directionInfo(e);let ringDistance=0;if(e.roundaboutPlan){const exitPoint=point(e.segments.find(s=>!s.roundabout).from);let nearest=Infinity;for(let j=0;j<=500;j++){const u=j/500,d=curve.getPointAt(u).distanceToSquared(exitPoint);if(d<nearest){nearest=d;ringDistance=u*len;}}}active={e,curve,len,ringDistance,ahead:0,floor:2.4};distance=0;state='driving';ui.decision.hidden=true;ui.mini.hidden=false;document.body.classList.remove('choosing');$('street').textContent=e.name==='Lokalvei'?'Innkjøringen':e.name;
 if(manual){turns++;if(!planned){picked={e,h:heading.clone()};pickedUntil=time+.8;say(e.roundaboutPlan?`Vi tar avkjørsel ${e.exitNumber}.`:(info.label==='Snu'?'Vi snur!':info.label+'. Da kjører vi!'));}}
 planAhead();return true;
}
function undoRoundabout(){
 if(!roundaboutUndo)return;
 const saved=roundaboutUndo;roundaboutUndo=null;$('undoRoundabout').hidden=true;
 queue=[];preview=null;current=saved.current;previous=saved.previous;position.copy(saved.position);heading.copy(saved.heading);travelled=saved.travelled;turns=saved.turns;
 active=null;distance=0;speed=0;state='decision';world.resetCamera();$('street').textContent='Rundkjøring';showDecision();say('Prøv en annen avkjørsel!');
}
$('undoRoundabout').onclick=undoRoundabout;
function arrive(){if(!active)return;previous=active.e.arrivalFrom??active.e.from;current=active.e.to;if(current===kiwiParking)parkAtKiwi();if(current===ishallParking)parkAtIshall();if(current===remaParking)parkAtRema();if(current===bunnprisParking)parkAtBunnpris();position.copy(point(current));heading.copy(active.curve.getTangentAt(1));if(!active.ahead&&active.floor<=2.4)speed=0;active=null;state='decision';showDecision();}
function finish(){state='finished';roundaboutUndo=null;queue=[];preview=null;$('undoRoundabout').hidden=true;clearWorldChoices();world.setTurnArrow(null);speed=0;ui.decision.hidden=true;ui.mini.hidden=true;ui.finish.hidden=false;document.body.classList.remove('choosing');$('remaining').textContent='Fremme!';$('finishSummary').textContent=`${(travelled/1000).toLocaleString('nb-NO',{maximumFractionDigits:1})} km gjennom nabolaget · ${turns} veivalg`;
 arrivals++;newReward=['colour','trail','rainbow','cat'][arrivals-1]||null;if(newReward==='rainbow')carColour='rainbow';if(newReward==='cat')catOn=true;saveProgress();if(newReward&&newReward!=='colour')applyRewards();
 const reward={colour:['🎨 Ny overraskelse! Nå kan du velge farge på bilen. Fargene finner du på startskjermen.','Velg farge på bilen 🎨',' Nå kan du velge farge på bilen!'],trail:['🌈 Ny overraskelse! Bilen har fått et regnbuespor. Du kan slå det av og på på startskjermen.','Prøv regnbuesporet 🌈',' Og nå har bilen fått et regnbuespor!'],
  rainbow:['🌈 Ny overraskelse! Du har fått en regnbuebil som skifter farge. Du finner den blant fargene på startskjermen.','Se regnbuebilen 🌈',' Nå har du fått en regnbuebil som skifter farge!'],
  cat:['🐱 Ny overraskelse! Nå kan du kjøre som en katt som løper. Du kan bytte mellom bil og katt på startskjermen.','Møt katten 🐱',' Og nå kan du løpe som en katt!']}[newReward];
 $('unlock').hidden=!reward;if(reward)$('unlock').textContent=reward[0];$('again').textContent=reward?reward[1]:'Kjør en gang til ↗';
 say('Hurra Sofia! Du fant barnehagen! Så flink du er!'+(reward?reward[2]:''));}
function remaining(){let rem=0;if(active){rem=active.len-distance;for(const e of routeFrom(active.e.to))rem+=e.length;}else for(const e of routeFrom(current))rem+=e.length;return rem;}
function updateHud(){const rem=remaining();$('remaining').textContent=freeMode?'Frikjøring · automatisk gass':rem>1000?`${(rem/1000).toLocaleString('nb-NO',{maximumFractionDigits:1})} km igjen`:`${Math.round(rem/10)*10} m igjen`;$('speed').textContent=Math.round(speed*3.6);const horizontal=Math.max(.01,Math.hypot(heading.x,heading.z));let slope=Math.round(100*heading.y/horizontal);if(world?.rawHeight){const hx=heading.x/horizontal,hz=heading.z/horizontal;const ahead=world.rawHeight(position.x+hx*2,position.z+hz*2),behind=world.rawHeight(position.x-hx*2,position.z-hz*2);slope=Math.round(100*(ahead-behind)/4);} $('slope').textContent=state==='free'&&free.car.drifting?'Drifter!':state==='decision'?'Vi velger vei':Math.abs(slope)<2?'Langs veien':slope>0?'↗ Oppoverbakke':'↘ Nedoverbakke';const realAltitude=world?.rawHeight?world.rawHeight(position.x,position.z):position.y;$('altitude').textContent=`${Math.round(realAltitude)} moh.${Math.abs(slope)>=2?' · '+Math.abs(slope)+' %':''}`;}
let mapLayer=null,mapSouth=false;const mapLayers=new Map();
function drawMap(canvas,{local=false}={}){const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;let transform;
 if(local){const hx=heading.x/Math.hypot(heading.x,heading.z),hz=heading.z/Math.hypot(heading.x,heading.z);const scale=w/155;transform=p=>[w*.5+((p[0]-position.x)*-hz+(p[1]-position.z)*hx)*scale,h*.69-((p[0]-position.x)*hx+(p[1]-position.z)*hz)*scale];}
 // The overview runs from home to the kindergarten; on the detour south it is taller, down to Stavset senter.
 else{mapSouth=position.z>(mapSouth?520:600);const [minx,minz,maxx,maxz]=mapSouth?[-160,-170,1930,1480]:[-80,-170,1930,560];const s=Math.min((w-50)/(maxx-minx),(h-44)/(maxz-minz));transform=p=>[(w-(maxx-minx)*s)/2+(p[0]-minx)*s,(h-(maxz-minz)*s)/2+(p[1]-minz)*s];mapLayer=mapLayers.get(`${w}x${h}x${maxz}`)||null;}
 // The overview's areas and roads never change: they are painted once, and only the markers are redrawn.
 if(local||!mapLayer){const layer=local?canvas:Object.assign(document.createElement('canvas'),{width:w,height:h}),g=layer.getContext('2d');
  function path(points){g.beginPath();points.forEach((p,i)=>{const v=transform(p);i?g.lineTo(...v):g.moveTo(...v);});}
  g.clearRect(0,0,w,h);g.fillStyle='#e5eddd';g.fillRect(0,0,w,h);
  for(const a of data.areas){if(!['water','forest','wood'].includes(a.type))continue;path(a.p);g.closePath();g.fillStyle=a.type==='water'?'#a4d0d1':'#c6d9b7';g.fill();}
  if(local)for(const b of data.buildings){const p=b.p[0];if(Math.hypot(p[0]-position.x,p[1]-position.z)>150)continue;path(b.p);g.fillStyle='#c6ccb8';g.fill();}
  g.lineCap='round';g.lineJoin='round';for(const r of data.roads){if(local&&!r.p.some(p=>Math.hypot(p[0]-position.x,p[1]-position.z)<170))continue;path(r.p);g.strokeStyle='#ced6c7';g.lineWidth=local?23:r.type==='service'?2.5:5;g.stroke();g.strokeStyle='#fafbf2';g.lineWidth=local?16:r.type==='service'?1:3;g.stroke();}
  if(!local){mapLayer=layer;mapLayers.set(`${w}x${h}x${mapSouth?1480:560}`,layer);}}
 if(!local){ctx.clearRect(0,0,w,h);ctx.drawImage(mapLayer,0,0);}
 if(!local){const home=transform(data.home),goal=transform(data.nodes[data.goal]),car=transform([position.x,position.z]);for(const [p,c,t] of [[home,'#75846a','⌂'],[goal,'#e8ba48','⚑']]){ctx.beginPath();ctx.arc(...p,14,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 19px sans-serif';ctx.fillText(t,p[0],p[1]+6);}ctx.save();ctx.translate(...car);ctx.rotate(Math.atan2(heading.x,-heading.z));ctx.fillStyle='#26697a';ctx.strokeStyle='white';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(8,9);ctx.lineTo(0,5);ctx.lineTo(-8,9);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
}
function drawJunction(){drawMap($('junctionMap'),{local:true});}
// The game never pauses. The settings menu is a modal box over the running game; changes to the road choices apply when it closes.
function openMenu(){$('menu').showModal();}
$('closeMenu').onclick=()=>$('menu').close();$('menu').addEventListener('close',()=>{if(choicesStale&&state==='decision')showDecision();});$('settings').onclick=openMenu;$('about').onclick=openMenu;$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♫':'♪';$('sound').classList.toggle('active',!sound);$('sound').setAttribute('aria-label',sound?'Slå av lyden':'Slå på lyden');if(!sound&&'speechSynthesis'in window)speechSynthesis.cancel();if(sound&&musicOn)music.play();else music.stop();if(sound)say('Hei Sofia!');};
// Music and blindvei choices are remembered on this device (browser storage may be unavailable, e.g. in private mode).
function saveSettings(){try{localStorage.setItem('sofiatur.innstillinger',JSON.stringify({v:2,music:musicOn?'on':'off',deadEnds:showDeadEnds?'on':'off',ahead:chooseAhead?'on':'off'}));}catch{}}
try{const saved=JSON.parse(localStorage.getItem('sofiatur.innstillinger'))||{};musicOn=saved.music!=='off';showDeadEnds=saved.v===2?saved.deadEnds==='on':true;chooseAhead=saved.ahead==='on';}catch{} // blindveier are on unless chosen off since 29 September 2026 (v:2); older saved values do not count
$('music').value=musicOn?'on':'off';$('deadEnds').value=showDeadEnds?'on':'off';$('chooseAhead').value=chooseAhead?'on':'off';
// Rewards: after the first trip to the kindergarten Sofia can pick the car's colour on the start screen;
// after the second the car gets a rainbow trail. Trips and choices are remembered on this device.
const carColours=[['Svart','#14171c'],['Rød','#c62828'],['Rosa','#ec6aa8'],['Lilla','#7b4cc2'],['Blå','#1f63c6'],['Turkis','#17a2a0'],['Grønn','#3b9a43'],['Gul','#f3c531'],['Oransje','#f07b22'],['Hvit','#eef0ef']];
// A secret: parking at KIWI Dalgård unlocks a KIWI-green car with the shop's logo on the doors (colour 'kiwi').
const kiwiParking='kiwi-parkering';let kiwiUnlocked=false;
// Dalgårdvegen ends at Dalgård ishall and the sports grounds; the car park beside the hall is a place to drive to.
const ishallParking='ishall-parkering';
// Rema 1000 at Stavset senter, at the far end of the detour down Odd Husbys veg, and Bunnpris Ugla on the way there.
const remaParking='rema-parkering',bunnprisParking='bunnpris-parkering';
// The car stops at a parking place and waits for a choice, even where a road leads on (Bunnpris has two ways in).
const parkingPlaces=new Set([kiwiParking,ishallParking,remaParking,bunnprisParking]);
// Rewards by trips to the kindergarten: 1 the colour picker, 2 the rainbow trail, 3 the rainbow car that changes colour (colour 'rainbow'), 4 the running cat.
function saveProgress(){try{localStorage.setItem('sofiatur.fremgang',JSON.stringify({arrivals,colour:carColour,trail:trailOn?'on':'off',kiwi:kiwiUnlocked?'on':'off',model:catOn?'cat':'car'}));}catch{}}
try{const saved=JSON.parse(localStorage.getItem('sofiatur.fremgang'))||{};arrivals=Math.max(0,Math.floor(Number(saved.arrivals))||0);kiwiUnlocked=saved.kiwi==='on';if(/^#[0-9a-f]{6}$/i.test(saved.colour)||saved.colour==='kiwi'&&kiwiUnlocked||saved.colour==='rainbow'&&arrivals>=3)carColour=saved.colour;trailOn=saved.trail!=='off';catOn=saved.model==='cat'&&arrivals>=4;}catch{}
const swatches=carColours.map(([name,hex])=>{const b=document.createElement('button');b.type='button';b.className='swatch';b.title=name;b.setAttribute('aria-label',name);b.style.background=hex;b.onclick=()=>pickColour(hex);return b;});
const kiwiSwatch=document.createElement('button');kiwiSwatch.type='button';kiwiSwatch.className='swatch kiwi';kiwiSwatch.title='KIWI';kiwiSwatch.setAttribute('aria-label','Hemmelig KIWI-bil');kiwiSwatch.textContent='K';kiwiSwatch.onclick=()=>pickColour('kiwi');
const rainbowSwatch=document.createElement('button');rainbowSwatch.type='button';rainbowSwatch.className='swatch rainbow';rainbowSwatch.title='Regnbue';rainbowSwatch.setAttribute('aria-label','Regnbuebil som skifter farge');rainbowSwatch.onclick=()=>pickColour('rainbow');
$('carColours').append(...swatches,rainbowSwatch,kiwiSwatch);
function pickColour(hex){carColour=hex.toLowerCase();saveProgress();applyRewards();showRewards();}
function applyRewards(){if(!world)return;const kiwi=carColour==='kiwi'&&kiwiUnlocked;world.setCarColour?.(kiwi?'#5fae36':arrivals>=1&&carColour!=='kiwi'?carColour:'#14171c');world.setCarSkin?.(kiwi?'kiwi':null);world.setTrail?.(arrivals>=2&&trailOn);world.setCarModel?.(catOn&&arrivals>=4?'cat':'car');}
// Before the first trip to the kindergarten, a KIWI unlock shows only black and the KIWI car.
function showRewards(){$('rewards').hidden=arrivals<1&&!kiwiUnlocked;$('trailRow').hidden=arrivals<2;$('trail').checked=trailOn;$('catRow').hidden=arrivals<4;$('cat').checked=catOn;$('customColour').value=/^#/.test(carColour)?carColour:'#14171c';$('customColour').parentElement&&($('customColour').parentElement.hidden=arrivals<1);
 swatches.forEach((b,i)=>{const on=carColours[i][1]===carColour||i===0&&carColour!=='kiwi'&&arrivals<1;b.hidden=arrivals<1&&i>0;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');});
 rainbowSwatch.hidden=arrivals<3;rainbowSwatch.classList.toggle('on',carColour==='rainbow');rainbowSwatch.setAttribute('aria-pressed',carColour==='rainbow'?'true':'false');kiwiSwatch.hidden=!kiwiUnlocked;kiwiSwatch.classList.toggle('on',carColour==='kiwi');kiwiSwatch.setAttribute('aria-pressed',carColour==='kiwi'?'true':'false');
 $('rewardTeaser').hidden=arrivals>=4;$('rewardTeaser').textContent=arrivals<1?'🎁 Kom frem til barnehagen, så får du en overraskelse!':'🎁 Kjør til barnehagen én gang til for en ny overraskelse!';}
function parkAtKiwi(){
 if(kiwiUnlocked){toast('🥝 Parkert ved KIWI');say('Vi har parkert ved KIWI!');return;}
 kiwiUnlocked=true;carColour='kiwi';saveProgress();applyRewards();showRewards();
 toast('🥝 Hemmelig KIWI-bil låst opp!');say('Du parkerte ved KIWI! Nå har du låst opp en hemmelig KIWI-bil!');
}
function parkAtIshall(){toast('🏒 Framme ved Dalgård ishall');say('Vi er framme ved Dalgård ishall og idrettsparken!');}
function parkAtRema(){toast('🛒 Framme ved Rema 1000 Stavset');say('Vi er framme ved Rema 1000 på Stavset senter! Rundkjøringene tar oss videre til barnehagen.');}
function parkAtBunnpris(){toast('🛒 Parkert ved Bunnpris');say('Vi har parkert ved Bunnpris på Ugla!');}
$('customColour').oninput=e=>pickColour(e.target.value);
$('trail').onchange=e=>{trailOn=!!e.target.checked;saveProgress();applyRewards();};
$('cat').onchange=e=>{catOn=!!e.target.checked;saveProgress();applyRewards();};
$('music').onchange=e=>{musicOn=e.target.value==='on';saveSettings();if(musicOn&&sound)music.play();else music.stop();};
$('cameraMode').onchange=e=>camMode=e.target.value;$('start').onclick=start;$('again').onclick=()=>{const toStart=!!newReward;reset();if(!toStart)start();};$('restart').onclick=()=>{$('menu').close();reset();if(freeMode)start();};
$('deadEnds').onchange=e=>{showDeadEnds=e.target.value==='on';saveSettings();queue=[];if(active)planAhead();choicesStale=true;};
// Switching choosing ahead off drops any queued roads; the car then stops at the next junction again.
$('chooseAhead').onchange=e=>{chooseAhead=e.target.value==='on';saveSettings();if(!chooseAhead){queue=[];picked=null;}planKey='';if(active)planAhead();};
$('driveMode').onchange=e=>{if(!world)return;freeMode=e.target.value==='free';$('recoverCar').hidden=!freeMode;reset();$('menu').close();start();};
$('recoverCar').onclick=()=>{recoverFree();$('menu').close();};
for(const [id,action] of [['freeLeft','left'],['freeRight','right'],['freeBrake','brake'],['freeDrift','drift']]){const el=$(id);el.addEventListener('pointerdown',e=>{if(state!=='free')return;e.preventDefault();el.setPointerCapture?.(e.pointerId);heldPointers.set(e.pointerId,action);touch.add(action);el.classList.add('held');});const release=e=>{heldPointers.delete(e.pointerId);if(![...heldPointers.values()].includes(action)){touch.delete(action);el.classList.remove('held');}};for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,release);}
window.addEventListener('keydown',e=>{if($('menu').open)return;const code=e.code||({' ':'Space',a:'KeyA',d:'KeyD',s:'KeyS',q:'KeyQ',Q:'KeyQ'}[e.key]||e.key);
 if(state==='free'){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyS','Space'].includes(code)){e.preventDefault();keys.add(code);}if(code==='KeyQ'&&!e.repeat){e.preventDefault();recoverFree();}return;}
 if(e.key===' '&&!e.repeat){e.preventDefault();if(state==='intro')start();}const labels={ArrowLeft:'Venstre',ArrowRight:'Høyre',ArrowUp:'Rett frem',ArrowDown:'Snu'};if(state==='decision'){const match=choices.find(c=>directionInfo(c).label===labels[e.key]);if(match){e.preventDefault();choose(match.id,true);}}else if(state==='driving'&&aheadShown&&!e.repeat){const match=preview.list.find(c=>directionInfo(c,preview.h).label===labels[e.key]);if(match){e.preventDefault();queueChoice(match);}}});
window.addEventListener('keyup',e=>keys.delete(e.code||({' ':'Space',a:'KeyA',d:'KeyD',s:'KeyS'}[e.key]||e.key)));
window.addEventListener('blur',clearInputs);
document.addEventListener('visibilitychange',()=>{lastTime=performance.now();});
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.045,Math.max(0,(now-lastTime)/1000));lastTime=now;time+=dt;if(!world)return;
 if(state==='free'){travelled+=free.step(dt,freeInput());const c=free.car;speed=c.speed;position.set(c.x,free.altitude,c.z);const hx=Math.sin(c.yaw),hz=-Math.cos(c.yaw),slope=(carHeight(c.x+hx,c.z+hz)-carHeight(c.x-hx,c.z-hz))/2;heading.set(hx,slope,hz).normalize();$('freeDrift').classList.toggle('held',c.drifting);}
 if(state==='driving'&&active){const remaining=active.len-distance;const targetSpeed=Math.min(maxKmh,active.e.roundaboutPlan&&distance<active.ringDistance+4?roundaboutKmh:200)/3.6;const toSlow=remaining+active.ahead;const approachSpeed=toSlow<55?Math.max(active.floor,Math.sqrt(Math.max(0,toSlow)*7.5)):targetSpeed;const maxspeed=Math.min(targetSpeed,approachSpeed);speed=T.MathUtils.damp(speed,maxspeed,5.5,dt);const step=Math.min(remaining,speed*dt);distance+=step;travelled+=step;const u=Math.min(1,distance/active.len);position.copy(active.curve.getPointAt(u));heading.copy(active.curve.getTangentAt(u));if(distance>=active.len-.015)arrive();}
 if(state==='driving')renderPlan();
 cameraHeading.copy(heading);if(state==='free')cameraHeading.set(Math.sin(free.car.course),heading.y,-Math.cos(free.car.course)).normalize();
 world.update(dt,position,cameraHeading,speed,state==='intro'&&arrivals>=1?'introCar':(state==='intro'||travelled===0&&state==='decision')?'intro':camMode,state==='finished',time,heading);
 mapClock+=dt;if(mapClock>.16){mapClock=0;if(state!=='intro'&&state!=='finished')updateHud();if(!ui.mini.hidden&&!ui.drive.hidden)drawMap($('minimap'));}
}
function gameState(){return {state,mode:freeMode?'free':'route',speedKmh:Math.round(speed*3.6),drifting:state==='free'&&free.car.drifting,position:[position.x,position.z],street:$('street').textContent,currentNode:current,remainingMetres:Math.round(remaining()),travelledMetres:Math.round(travelled),choices:state==='decision'?choices.map(e=>({id:e.id,direction:directionInfo(e).label,street:e.name,exitNumber:e.exitNumber,roundabout:!!e.roundaboutPlan,recommended:e.id===best?.id})):[],upcomingMetres:state==='driving'&&aheadShown?Math.round(active.len-distance+preview.ahead):null,upcoming:state==='driving'&&aheadShown?preview.list.map(e=>({id:e.id,direction:directionInfo(e,preview.h).label,street:e.name,exitNumber:e.exitNumber,roundabout:!!e.roundaboutPlan,recommended:e.id===preview.top?.id})):[],queued:queue.map(q=>({id:q.id,direction:q.label,street:q.name}))};}
function registerTools(){const m=document.modelContext;if(!m?.registerTool)return;const definitions=[{name:'read_drive_state',description:'Read the car state and currently offered road choices.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>gameState()},{name:'start_drive',description:'Start Sofia’s drive from home.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>{if(state!=='intro')throw new Error('The drive is already started');start();return gameState();}},{name:'choose_road',description:'Choose one of the offered roads at a junction, or while driving queue one of the upcoming roads (up to two junctions ahead).',inputSchema:{type:'object',properties:{edgeId:{type:'integer'}},required:['edgeId'],additionalProperties:false},execute:input=>{const ok=Number.isInteger(input?.edgeId)&&(state==='decision'?choose(input.edgeId,true):state==='driving'&&queueChoice({id:input.edgeId}));if(!ok)throw new Error('That road choice is not available');return gameState();}}];for(const def of definitions)try{Promise.resolve(m.registerTool(def)).catch(()=>{});}catch{}}
try{const response=await fetch('./map.json');if(!response.ok)throw new Error('Kartet kunne ikke lastes');data=await response.json();if(!data.terrain)throw new Error('Terrengdata mangler');$('loading').textContent='Bygger husene og bakkene …';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));world=createWorld($('world'),data);carHeight=world.carHeight||((x,z)=>world.height(x,z)+.47);free=createFreeDrive(data,carHeight);computeRoutes();computeOpenRoads();if(!optimal.has(data.start))throw new Error('Fant ikke en sammenhengende rute');applyRewards();reset();$('start').disabled=false;$('start').textContent='Kjør til barnehagen  ↗';$('loading').hidden=true;registerTools();requestAnimationFrame(animate);}catch(error){console.error(error);$('loading').hidden=false;$('loading').textContent='Spillet kunne ikke starte. Prøv å laste siden på nytt.';$('start').textContent='Last inn på nytt';$('start').disabled=false;$('start').onclick=()=>location.reload();}
