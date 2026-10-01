import {createFreeDrive} from './free-drive.js';
import {createWorld,T} from './world.js';
import {roundaboutChoices} from './roundabouts.js';
import {createDrivingLines} from './driving-line.js';
import {createMusic} from './music.js';
const $=id=>document.getElementById(id);
let world,data,state='loading',sound=true,current,previous=null,active=null,distance=0,speed=0,travelled=0,turns=0,heading=new T.Vector3(0,0,1),position=new T.Vector3(),choices=[],best=null,totalInitial=0,maxKmh=200,camMode='follow',lastTime=performance.now(),time=0,mapClock=0,leavingHome=false,lastEdge=null,lines=null;
let roundaboutUndo=null,freeMode=false,free=null,carHeight,showDeadEnds=true,choicesStale=false,musicOn=true,queue=[],preview=null,picked=null,pickedUntil=-9,aheadShown=false,planKey='';
let arrivals=0,carColour='#14171c',trailOn=true,catOn=false,newReward=null;
const roundaboutKmh=45; // speed round the circle and into it
// The car speeds up by ACCEL, brakes ahead of a slower stretch (a turn, a junction where it must stop) by DECEL, and by BRAKE at most when a new plan needs it at once.
// Strong, like a toy car (30 September 2026; 7, 4.5 and 8 before), so it reaches 200 km/h on the longest stretches of the trip again; turns keep their gentle arcs (driving-line.js A_LAT).
const ACCEL=20,DECEL=12,BRAKE=16,STOP=2.4;
// Junctions where every road is offered, also with blindveier off: the Palermo traffic lights (left, straight on, right).
const everyRoadAt=new Set(['91783986']);
let chooseAhead=false; // Menu option: arrows for the next junction while driving, to queue up to two roads. Off by default.
const music=createMusic();
const keys=new Set(),touch=new Set(),heldPointers=new Map(),cameraHeading=new T.Vector3();
function clearInputs(){keys.clear();touch.clear();heldPointers.clear();for(const id of ['freeLeft','freeRight','freeBrake','freeDrift'])$(id).classList.remove('held');}
function freeInput(){return {left:keys.has('ArrowLeft')||keys.has('KeyA')||touch.has('left'),right:keys.has('ArrowRight')||keys.has('KeyD')||touch.has('right'),brake:keys.has('ArrowDown')||keys.has('KeyS')||touch.has('brake'),drift:keys.has('Space')||touch.has('drift')};}
function startFree(){state='free';active=null;choices=[];queue=[];preview=null;roundaboutUndo=null;clearInputs();free.reset(position.x,position.z,Math.atan2(heading.x,-heading.z));ui.welcome.hidden=true;ui.drive.hidden=false;ui.finish.hidden=true;clearWorldChoices();document.body.classList.remove('choosing');$('freeControls').hidden=false;$('undoRoundabout').hidden=true;$('street').textContent='Frikjøring';updateHud();}
function recoverFree(){if(state!=='free')return;clearInputs();free.recover();position.set(free.car.x,free.altitude,free.car.z);speed=0;heading.set(Math.sin(free.car.yaw),0,-Math.cos(free.car.yaw));world.resetCamera();}

let adjacency=new Map(),incoming=new Map(),distances=new Map(),optimal=new Map(),openRoads=new Set();
const ui={welcome:$('welcome'),decision:$('decision'),drive:$('driveHud'),finish:$('finish')};
function say(text){if(!sound||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();const s=new SpeechSynthesisUtterance(text);s.lang='nb-NO';s.rate=.88;s.pitch=1.1;const v=speechSynthesis.getVoices().find(x=>/^nb|^no/.test(x.lang));if(v)s.voice=v;s.onstart=()=>music.duck(true);s.onend=s.onerror=()=>music.duck(false);speechSynthesis.speak(s);}catch{}}
let toastTimer;function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3100);}
function point(n){const p=data.nodes[n];return new T.Vector3(p[0],carHeight(...p),p[1]);}
// The car follows the drawn road's smoothed centre line (world.roadLine: samples 2 m apart, level and bends as drawn); without it, sample the road every 2 m between map nodes.
function roadPoints(path){if(world.roadLine)return world.roadLine(path);const pts=[];for(const n of path){const [x,z]=data.nodes[n],last=pts.at(-1);if(last){const len=Math.hypot(x-last[0],z-last[1]);if(len<.05)continue;const steps=Math.ceil(len/2);for(let k=1;k<steps;k++){const px=last[0]+(x-last[0])*k/steps,pz=last[1]+(z-last[1])*k/steps;pts.push([px,pz,carHeight(px,pz)]);}}pts.push([x,z,carHeight(x,z)]);}return pts;}
// The car's line: right-hand lane, an arc through every junction, and a speed limit from its curvature (dist/driving-line.js).
// A line runs from the stop line before one junction to the stop line before the next; lines(a,b) is the line of road b driven after road a (null after a standing start).
const drivingLines=()=>lines||(lines=createDrivingLines({data,roadLine:roadPoints,carHeight:(x,z)=>carHeight(x,z),surfaceTop:world.surfaceTop||null,adjacency,centred:n=>n===data.goal||n===data.start||parkingPlaces.has(n)}));
// The road the car arrived on. Tests and undo put the car on a node without it, then the road from the previous node that most closely ends in the heading.
function incomingEdge(){if(lastEdge&&lastEdge.to===current)return lastEdge;if(previous==null)return null;let best=null,bestDot=-2;for(const x of adjacency.get(previous)||[]){if(x.to!==current)continue;const d=endDirection(x,false),dot=d.x*heading.x+d.z*heading.z;if(dot>bestDot){bestDot=dot;best=x;}}return best;}
function endDirection(e,start=true){const p=e.path.map(n=>data.nodes[n]),i=start?e.stub||0:p.length-2;const a=p[i],b=p[i+1];return new T.Vector3(b[0]-a[0],0,b[1]-a[1]).normalize();}
function routeFrom(n){const route=[];const visited=new Set();while(n!==data.goal&&!visited.has(n)){visited.add(n);const e=optimal.get(n);if(!e)break;route.push(e);n=e.to;}return route;}
function computeRoutes(){const reverse=incoming;for(const e of data.edges){if(!adjacency.has(e.from))adjacency.set(e.from,[]);adjacency.get(e.from).push(e);if(!reverse.has(e.to))reverse.set(e.to,[]);reverse.get(e.to).push(e);}distances.set(data.goal,0);const todo=[data.goal];while(todo.length){todo.sort((a,b)=>distances.get(b)-distances.get(a));const n=todo.pop(),d=distances.get(n);for(const e of reverse.get(n)||[]){const nd=d+(e.cost||e.length);if(nd<(distances.get(e.from)??Infinity)){distances.set(e.from,nd);optimal.set(e.from,e);if(!todo.includes(e.from))todo.push(e.from);}}}}
function reset(){clearInputs();$('freeControls').hidden=true;roundaboutUndo=null;queue=[];preview=null;picked=null;$('undoRoundabout').hidden=true;maxKmh=200;current=data.start;previous=null;lastEdge=null;active=null;distance=0;speed=0;travelled=0;turns=0;state='intro';position.copy(point(current));heading.copy(endDirection(optimal.get(current)));totalInitial=routeFrom(current).reduce((n,e)=>n+e.length,0);ui.welcome.hidden=false;ui.drive.hidden=true;ui.decision.hidden=true;ui.finish.hidden=true;document.body.classList.remove('choosing');world.resetCamera();clearWorldChoices();world.setTurnArrow(null);$('remaining').textContent='Herlofsons veg → Skjermvegen';newReward=null;showRewards();}
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
 // Arrows ahead sit higher while the car drives on.
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
 const target=n=>n===data.goal||n===data.start||parkingPlaces.has(n); // car parks at KIWI, the ice rink, Rema 1000 Stavset and Bunnpris, and Lianvannet, are places to go, not blindveier
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
// The centre of a ring: the least-squares circle through its nodes. Their centroid is pulled off by up to half a metre where the arms hang on some of them.
function circleCentre(p){const n=p.length,mx=p.reduce((s,q)=>s+q[0],0)/n,mz=p.reduce((s,q)=>s+q[1],0)/n;let uu=0,uv=0,vv=0,uuu=0,vvv=0,uvv=0,vuu=0;for(const q of p){const u=q[0]-mx,v=q[1]-mz;uu+=u*u;uv+=u*v;vv+=v*v;uuu+=u**3;vvv+=v**3;uvv+=u*v*v;vuu+=v*u*u;}
 const det=uu*vv-uv*uv;if(Math.abs(det)<1e-9)return [mx,mz];return [mx+(.5*(uuu+uvv)*vv-.5*(vvv+vuu)*uv)/det,mz+(.5*(vvv+vuu)*uu-.5*(uuu+uvv)*uv)/det];}
function roundaboutLabels(list,node,prev,h){
 const entry=(adjacency.get(prev)||[]).find(e=>e.to===node&&!e.roundabout),ring=ringNodes(node);if(!entry){straightest(list,h);return;}
 const c=circleCentre([...ring].map(n=>data.nodes[n]));
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
// Look past the line of road e: junctions taken automatically or by a queued choice are driven through without stopping
// (with blindveier on, automatic junctions still slow the car to a crawl; parking places and the goal always stop it).
// Returns the lines driven on after e, the speed the car may have where each of them ends (STOP: it must stop or crawl;
// Infinity: it drives on) and the first junction still waiting for a choice, with its distance from the end of e.
function lookAhead(e,line){
 const items=[{e,line}],floors=[];let node=e.to,prev=e.arrivalFrom??e.from,h=line.tangent(line.len,new T.Vector3()),from=e,planned=0,ahead=0,junction=null;
 for(let step=0;step<40&&ahead<3000;step++){
  if(node===data.goal){floors.push(STOP);break;}
  const {list,top}=roadChoices(node,prev,h);let next=parkingPlaces.has(node)?null:autoRoad(list,prev,h);
  if(next)floors.push(showDeadEnds?STOP:Infinity);
  else if(queue[planned]?.node===node&&(next=list.find(c=>c.id===queue[planned].id))){planned++;floors.push(Infinity);}
  else{floors.push(STOP);junction={node,prev,h,list,top,ahead,key:node+':'+list.map(c=>c.id)};break;}
  const nl=drivingLines().line(from,next);items.push({e:next,line:nl});
  ahead+=nl.len;node=next.to;prev=next.arrivalFrom??next.from;h=nl.tangent(nl.len,new T.Vector3());from=next;
 }
 while(floors.length<items.length)floors.push(Infinity);
 return {items,floors,junction};
}
// Where a roundabout plan's line passes its exit node: the car keeps to roundaboutKmh until 4 m after it.
function ringStation(e,line){if(line.ring!==undefined)return line.ring;let ring=0;if(e.roundaboutPlan){const [ex,ez]=data.nodes[e.segments.find(s=>!s.roundabout).from];let nearest=Infinity;for(let i=0;i<line.n;i++){const d=(line.x[i]-ex)**2+(line.z[i]-ez)**2;if(d<nearest){nearest=d;ring=line.s[i];}}}return line.ring=ring;}
// Speed limits along the lines ahead, worked backwards from where the car must slow: the curvature limit of every stretch, the circle speed of a roundabout, and braking at DECEL to reach each limit in time.
function planAhead(){if(!active)return;const {items,floors,junction}=lookAhead(active.e,active.line),limits=[];
 for(let k=items.length-1;k>=0;k--){const {e,line}=items[k],endLimit=Math.min(floors[k],k+1<items.length?limits[k+1][0]:Infinity),ring=e.roundaboutPlan?ringStation(e,line)+4:0;
  limits[k]=drivingLines().profile(line,endLimit,DECEL,e.roundaboutPlan?s=>s<ring?roundaboutKmh/3.6:Infinity:null);}
 active.limits=limits[0];active.hold=floors[0]<=STOP;preview=junction;renderPlan();}
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
 state='decision';speed=0;ui.decision.hidden=true;document.body.classList.add('choosing');
 clearWorldChoices();renderWorldChoices();updateHud();
}
function choose(edgeId,manual=true,planned=false){if(state!=='decision')return false;const e=(manual?choices:[...choices,...(adjacency.get(current)||[])]).find(e=>e.id===Number(edgeId));if(!e)return false;if(manual&&!choices.some(x=>x.id===e.id))return false;
 if(manual&&e.roundaboutPlan){roundaboutUndo={current,previous,lastEdge,position:position.clone(),heading:heading.clone(),travelled,turns};$('undoRoundabout').hidden=false;}
 const line=drivingLines().line(incomingEdge(),e);if(line.n<2)return false;const info=directionInfo(e);active={e,line,len:line.len,limits:null,hold:true};distance=0;state='driving';ui.decision.hidden=true;document.body.classList.remove('choosing');$('street').textContent=e.name==='Lokalvei'?'Innkjøringen':e.name;
 if(manual){turns++;if(!planned){picked={e,h:heading.clone()};pickedUntil=time+.8;say(e.roundaboutPlan?`Vi tar avkjørsel ${e.exitNumber}.`:(info.label==='Snu'?'Vi snur!':info.label+'. Da kjører vi!'));}}
 planAhead();return true;
}
function undoRoundabout(){
 if(!roundaboutUndo)return;
 const saved=roundaboutUndo;roundaboutUndo=null;$('undoRoundabout').hidden=true;
 queue=[];preview=null;current=saved.current;previous=saved.previous;lastEdge=saved.lastEdge;position.copy(saved.position);heading.copy(saved.heading);travelled=saved.travelled;turns=saved.turns;
 active=null;distance=0;speed=0;state='decision';world.resetCamera();$('street').textContent='Rundkjøring';showDecision();say('Prøv en annen avkjørsel!');
}
$('undoRoundabout').onclick=undoRoundabout;
function arrive(){if(!active)return;previous=active.e.arrivalFrom??active.e.from;current=active.e.to;if(current===kiwiParking)parkAtKiwi();if(current===ishallParking)parkAtIshall();if(current===remaParking)parkAtRema();if(current===bunnprisParking)parkAtBunnpris();if(current===data.lakeside)parkAtLake();active.line.at(active.len,position);active.line.tangent(active.len,heading);lastEdge=active.e;if(active.hold)speed=0;active=null;state='decision';showDecision();}
function finish(){state='finished';roundaboutUndo=null;queue=[];preview=null;$('undoRoundabout').hidden=true;clearWorldChoices();world.setTurnArrow(null);speed=0;ui.decision.hidden=true;ui.finish.hidden=false;document.body.classList.remove('choosing');$('remaining').textContent='Fremme!';$('finishSummary').textContent=`${(travelled/1000).toLocaleString('nb-NO',{maximumFractionDigits:1})} km gjennom nabolaget · ${turns} veivalg`;
 arrivals++;newReward=['colour','cat','trail','rainbow'][arrivals-1]||null;if(newReward==='rainbow')carColour='rainbow';if(newReward==='cat')catOn=true;saveProgress();if(newReward&&newReward!=='colour')applyRewards();
 const reward={colour:['🎨 Ny overraskelse! Nå kan du velge farge på bilen. Fargene finner du på startskjermen.','Velg farge på bilen 🎨',' Nå kan du velge farge på bilen!'],trail:['🌈 Ny overraskelse! Bilen har fått et regnbuespor. Du kan slå det av og på på startskjermen.','Prøv regnbuesporet 🌈',' Og nå har bilen fått et regnbuespor!'],
  rainbow:['🌈 Ny overraskelse! Du har fått en regnbuebil som skifter farge. Du finner den blant fargene på startskjermen.','Se regnbuebilen 🌈',' Nå har du fått en regnbuebil som skifter farge!'],
  cat:['🐱 Ny overraskelse! Nå kan du kjøre som en katt som løper. Du kan bytte mellom bil og katt på startskjermen.','Møt katten 🐱',' Og nå kan du løpe som en katt!']}[newReward];
 $('unlock').hidden=!reward;if(reward)$('unlock').textContent=reward[0];$('again').textContent=reward?reward[1]:'Kjør en gang til ↗';
 say('Hurra Sofia! Du fant barnehagen! Så flink du er!'+(reward?reward[2]:''));}
function remaining(){let rem=0;if(active){rem=active.len-distance;for(const e of routeFrom(active.e.to))rem+=e.length;}else for(const e of routeFrom(current))rem+=e.length;return rem;}
function updateHud(){const rem=remaining();$('remaining').textContent=freeMode?'Frikjøring · automatisk gass':rem>1000?`${(rem/1000).toLocaleString('nb-NO',{maximumFractionDigits:1})} km igjen`:`${Math.round(rem/10)*10} m igjen`;$('speed').textContent=Math.round(speed*3.6);const horizontal=Math.max(.01,Math.hypot(heading.x,heading.z));let slope=Math.round(100*heading.y/horizontal);if(world?.rawHeight){const hx=heading.x/horizontal,hz=heading.z/horizontal;const ahead=world.rawHeight(position.x+hx*2,position.z+hz*2),behind=world.rawHeight(position.x-hx*2,position.z-hz*2);slope=Math.round(100*(ahead-behind)/4);} $('slope').textContent=state==='free'&&free.car.drifting?'Drifter!':state==='decision'?'Vi velger vei':Math.abs(slope)<2?'Langs veien':slope>0?'↗ Oppoverbakke':'↘ Nedoverbakke';const realAltitude=world?.rawHeight?world.rawHeight(position.x,position.z):position.y;$('altitude').textContent=`${Math.round(realAltitude)} moh.${Math.abs(slope)>=2?' · '+Math.abs(slope)+' %':''}`;}
// The game never pauses. The settings menu is a modal box over the running game; changes to the road choices apply when it closes.
function openMenu(){$('menu').showModal();}
$('closeMenu').onclick=()=>$('menu').close();$('menu').addEventListener('close',()=>{if(choicesStale&&state==='decision')showDecision();});// Fullscreen (the Fullscreen API, with Safari's webkit names): the button shows where the browser allows it (not on an
// iPhone) and turns into "exit fullscreen" while the game fills the screen; the world follows the resize by itself.
const fsElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
function toggleFullscreen(){const root=document.documentElement;try{if(fsElement())(document.exitFullscreen||document.webkitExitFullscreen).call(document);else (root.requestFullscreen||root.webkitRequestFullscreen).call(root,{navigationUI:'hide'})?.catch?.(()=>{});}catch{}}
function showFullscreen(){const on=!!fsElement(),b=$('fullscreen');b.classList.toggle('on',on);b.setAttribute('aria-label',on?'Avslutt fullskjerm':'Fullskjerm');b.title=on?'Avslutt fullskjerm':'Fullskjerm';}
$('fullscreen').hidden=!(document.fullscreenEnabled||document.webkitFullscreenEnabled);$('fullscreen').onclick=toggleFullscreen;
for(const type of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(type,showFullscreen);
$('settings').onclick=openMenu;$('about').onclick=openMenu;$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♫':'♪';$('sound').classList.toggle('active',!sound);$('sound').setAttribute('aria-label',sound?'Slå av lyden':'Slå på lyden');if(!sound&&'speechSynthesis'in window)speechSynthesis.cancel();if(sound&&musicOn)music.play();else music.stop();if(sound)say('Hei Sofia!');};
// Music and blindvei choices are remembered on this device (browser storage may be unavailable, e.g. in private mode).
function saveSettings(){try{localStorage.setItem('sofiatur.innstillinger',JSON.stringify({v:2,music:musicOn?'on':'off',deadEnds:showDeadEnds?'on':'off',ahead:chooseAhead?'on':'off'}));}catch{}}
try{const saved=JSON.parse(localStorage.getItem('sofiatur.innstillinger'))||{};musicOn=saved.music!=='off';showDeadEnds=saved.v===2?saved.deadEnds==='on':true;chooseAhead=saved.ahead==='on';}catch{} // blindveier are on unless chosen off since 29 September 2026 (v:2); older saved values do not count
$('music').value=musicOn?'on':'off';$('deadEnds').value=showDeadEnds?'on':'off';$('chooseAhead').value=chooseAhead?'on':'off';
// Rewards: after the first trip to the kindergarten Sofia can pick the car's colour on the start screen, after the second
// the car can be a running cat, after the third it gets a rainbow trail, after the fourth the rainbow colour. Trips and
// choices are remembered on this device.
const carColours=[['Svart','#14171c'],['Rød','#c62828'],['Rosa','#ec6aa8'],['Lilla','#7b4cc2'],['Blå','#1f63c6'],['Turkis','#17a2a0'],['Grønn','#3b9a43'],['Gul','#f3c531'],['Oransje','#f07b22'],['Hvit','#eef0ef']];
// A secret: parking at KIWI Dalgård unlocks a KIWI-green car with the shop's logo on the doors (colour 'kiwi').
const kiwiParking='kiwi-parkering';let kiwiUnlocked=false;
// Dalgårdvegen ends at Dalgård ishall and the sports grounds; the car park beside the hall is a place to drive to.
const ishallParking='ishall-parkering';
// Rema 1000 at Stavset senter, at the far end of the detour down Odd Husbys veg, and Bunnpris Ugla on the way there.
const remaParking='rema-parkering',bunnprisParking='bunnpris-parkering';
// The car stops at a parking place and waits for a choice, even where a road leads on (Bunnpris has two ways in).
const parkingPlaces=new Set([kiwiParking,ishallParking,remaParking,bunnprisParking]);
// Rewards by trips to the kindergarten (the order since 30 September 2026): 1 the colour picker, 2 the running cat, 3 the rainbow trail, 4 the rainbow car
// that changes colour (colour 'rainbow').
function saveProgress(){try{localStorage.setItem('sofiatur.fremgang',JSON.stringify({arrivals,colour:carColour,trail:trailOn?'on':'off',kiwi:kiwiUnlocked?'on':'off',model:catOn?'cat':'car'}));}catch{}}
try{const saved=JSON.parse(localStorage.getItem('sofiatur.fremgang'))||{};arrivals=Math.max(0,Math.floor(Number(saved.arrivals))||0);kiwiUnlocked=saved.kiwi==='on';if(/^#[0-9a-f]{6}$/i.test(saved.colour)||saved.colour==='kiwi'&&kiwiUnlocked||saved.colour==='rainbow'&&arrivals>=4)carColour=saved.colour;trailOn=saved.trail!=='off';catOn=saved.model==='cat'&&arrivals>=2;}catch{}
const swatches=carColours.map(([name,hex])=>{const b=document.createElement('button');b.type='button';b.className='swatch';b.title=name;b.setAttribute('aria-label',name);b.style.background=hex;b.onclick=()=>pickColour(hex);return b;});
const kiwiSwatch=document.createElement('button');kiwiSwatch.type='button';kiwiSwatch.className='swatch kiwi';kiwiSwatch.title='KIWI';kiwiSwatch.setAttribute('aria-label','Hemmelig KIWI-bil');kiwiSwatch.textContent='K';kiwiSwatch.onclick=()=>pickColour('kiwi');
const rainbowSwatch=document.createElement('button');rainbowSwatch.type='button';rainbowSwatch.className='swatch rainbow';rainbowSwatch.title='Regnbue';rainbowSwatch.setAttribute('aria-label','Regnbuebil som skifter farge');rainbowSwatch.onclick=()=>pickColour('rainbow');
// The colour wheel (a free colour) goes in the same row, after the ten colours and before the rainbow and KIWI (it stood a little below them).
const customSwatch=$('customColour').parentElement;$('carColours').append(...swatches,...(customSwatch?[customSwatch]:[]),rainbowSwatch,kiwiSwatch);
function pickColour(hex){carColour=hex.toLowerCase();saveProgress();applyRewards();showRewards();}
function applyRewards(){if(!world)return;const kiwi=carColour==='kiwi'&&kiwiUnlocked;world.setCarColour?.(kiwi?'#5fae36':arrivals>=1&&carColour!=='kiwi'?carColour:'#14171c');world.setCarSkin?.(kiwi?'kiwi':null);world.setTrail?.(arrivals>=3&&trailOn);world.setCarModel?.(catOn&&arrivals>=2?'cat':'car');}
// Before the first trip to the kindergarten, a KIWI unlock shows only black and the KIWI car.
function showRewards(){$('rewards').hidden=arrivals<1&&!kiwiUnlocked;$('trailRow').hidden=arrivals<3;$('trail').checked=trailOn;$('catRow').hidden=arrivals<2;$('cat').checked=catOn;$('customColour').value=/^#/.test(carColour)?carColour:'#14171c';$('customColour').parentElement&&($('customColour').parentElement.hidden=arrivals<1);
 swatches.forEach((b,i)=>{const on=carColours[i][1]===carColour||i===0&&carColour!=='kiwi'&&arrivals<1;b.hidden=arrivals<1&&i>0;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');});
 rainbowSwatch.hidden=arrivals<4;rainbowSwatch.classList.toggle('on',carColour==='rainbow');rainbowSwatch.setAttribute('aria-pressed',carColour==='rainbow'?'true':'false');kiwiSwatch.hidden=!kiwiUnlocked;kiwiSwatch.classList.toggle('on',carColour==='kiwi');kiwiSwatch.setAttribute('aria-pressed',carColour==='kiwi'?'true':'false');
 $('rewardTeaser').hidden=arrivals>=4;$('rewardTeaser').textContent=arrivals<1?'🎁 Kom frem til barnehagen, så får du en overraskelse!':'🎁 Kjør til barnehagen én gang til for en ny overraskelse!';}
// Debug keys, to test the unlocks (keyboard only, not while typing in a field): X counts one more trip to the
// kindergarten, Z one fewer. Counting up picks the new reward as an arrival does (the cat at 2, the rainbow car at 4);
// counting down locks what the count no longer allows. The count is saved like a real one.
function debugArrivals(delta){const before=arrivals;arrivals=Math.max(0,arrivals+delta);if(arrivals===before)return;
 if(delta>0){if(arrivals===2)catOn=true;if(arrivals===4)carColour='rainbow';}else{if(arrivals<2)catOn=false;if(arrivals<4&&carColour==='rainbow')carColour='#14171c';}
 saveProgress();applyRewards();showRewards();
 const unlocked=['','farge på bilen','katt','regnbuespor','regnbuebil'][arrivals]??'alt låst opp';toast(`🛠 Turer til barnehagen: ${arrivals}${unlocked?' · '+unlocked:''}`);}
function parkAtKiwi(){
 if(kiwiUnlocked){toast('🥝 Parkert ved KIWI');say('Vi har parkert ved KIWI!');return;}
 kiwiUnlocked=true;carColour='kiwi';saveProgress();applyRewards();showRewards();
 toast('🥝 Hemmelig KIWI-bil låst opp!');say('Du parkerte ved KIWI! Nå har du låst opp en hemmelig KIWI-bil!');
}
function parkAtIshall(){toast('🏒 Framme ved Dalgård ishall');say('Vi er framme ved Dalgård ishall og idrettsparken!');}
function parkAtRema(){toast('🛒 Framme ved Rema 1000 Stavset');say('Vi er framme ved Rema 1000 på Stavset senter! Rundkjøringene tar oss videre til barnehagen.');}
function parkAtBunnpris(){toast('🛒 Parkert ved Bunnpris');say('Vi har parkert ved Bunnpris på Ugla!');}
// Lianvannet: the turning circle by the water at the end of Vetle Vislies veg (data.lakeside, a parking place once the map
// is loaded). The big duck in the lake (world.js) rises out of the water as the car comes near.
let duckSeen=false;
function parkAtLake(){toast('🦆 Framme ved Lianvannet');say('Vi er framme ved Lianvannet. Hei, and!');}
function watchDuck(){if(duckSeen||!world?.duck?.shown)return;duckSeen=true;toast('🦆 Se! En kjempeand i Lianvannet!');say('Se! En kjempestor and svømmer rundt i vannet!');}
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
window.addEventListener('keydown',e=>{if($('menu').open)return;
 const letter=(e.key||'').toLowerCase();if((letter==='x'||letter==='z')&&!e.repeat&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||'')){e.preventDefault();debugArrivals(letter==='x'?1:-1);return;}
 const code=e.code||({' ':'Space',a:'KeyA',d:'KeyD',s:'KeyS',q:'KeyQ',Q:'KeyQ'}[e.key]||e.key);
 if(state==='free'){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyS','Space'].includes(code)){e.preventDefault();keys.add(code);}if(code==='KeyQ'&&!e.repeat){e.preventDefault();recoverFree();}return;}
 if(e.key===' '&&!e.repeat){e.preventDefault();if(state==='intro')start();}const labels={ArrowLeft:'Venstre',ArrowRight:'Høyre',ArrowUp:'Rett frem',ArrowDown:'Snu'};if(state==='decision'){const match=choices.find(c=>directionInfo(c).label===labels[e.key]);if(match){e.preventDefault();choose(match.id,true);}}else if(state==='driving'&&aheadShown&&!e.repeat){const match=preview.list.find(c=>directionInfo(c,preview.h).label===labels[e.key]);if(match){e.preventDefault();queueChoice(match);}}});
window.addEventListener('keyup',e=>keys.delete(e.code||({' ':'Space',a:'KeyA',d:'KeyD',s:'KeyS'}[e.key]||e.key)));
window.addEventListener('blur',clearInputs);
document.addEventListener('visibilitychange',()=>{lastTime=performance.now();});
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.045,Math.max(0,(now-lastTime)/1000));lastTime=now;time+=dt;if(!world)return;
 if(state==='free'){travelled+=free.step(dt,freeInput());const c=free.car;speed=c.speed;position.set(c.x,free.altitude,c.z);const hx=Math.sin(c.yaw),hz=-Math.cos(c.yaw),slope=(carHeight(c.x+hx,c.z+hz)-carHeight(c.x-hx,c.z-hz))/2;heading.set(hx,slope,hz).normalize();$('freeDrift').classList.toggle('held',c.drifting);}
 if(state==='driving'&&active){const remaining=active.len-distance;
  // The limit at this point already includes braking for whatever lies ahead (planAhead); the car catches up to it at ACCEL and follows it down at DECEL, or BRAKE at most.
  if(!active.limits)planAhead();
  const target=Math.min(maxKmh/3.6,active.line.limit(active.limits,distance));speed=speed<target?Math.min(target,speed+ACCEL*dt):Math.max(target,speed-BRAKE*dt);
  const step=Math.min(remaining,speed*dt);distance+=step;travelled+=step;active.line.at(distance,position);active.line.tangent(distance,heading);if(distance>=active.len-.015)arrive();}
 if(state==='driving')renderPlan();
 cameraHeading.copy(heading);if(state==='free')cameraHeading.set(Math.sin(free.car.course),heading.y,-Math.cos(free.car.course)).normalize();
 // Stopped by Lianvannet, the camera turns from the road to the water and the big duck (the lake lies behind the car as it arrives).
 if(state==='decision'&&current===data.lakeside&&world.duck)cameraHeading.set(world.duck.centre[0]-position.x,0,world.duck.centre[1]-position.z).normalize();
 world.update(dt,position,cameraHeading,state==='driving'&&active&&active.line.reversing(distance)?-speed:speed,state==='intro'&&arrivals>=1?'introCar':(state==='intro'||travelled===0&&state==='decision')?'intro':camMode,state==='finished',time,heading);
 mapClock+=dt;if(mapClock>.16){mapClock=0;if(state!=='intro'&&state!=='finished')updateHud();watchDuck();}
}
function gameState(){return {state,mode:freeMode?'free':'route',speedKmh:Math.round(speed*3.6),drifting:state==='free'&&free.car.drifting,position:[position.x,position.z],street:$('street').textContent,currentNode:current,remainingMetres:Math.round(remaining()),travelledMetres:Math.round(travelled),choices:state==='decision'?choices.map(e=>({id:e.id,direction:directionInfo(e).label,street:e.name,exitNumber:e.exitNumber,roundabout:!!e.roundaboutPlan,recommended:e.id===best?.id})):[],upcomingMetres:state==='driving'&&aheadShown?Math.round(active.len-distance+preview.ahead):null,upcoming:state==='driving'&&aheadShown?preview.list.map(e=>({id:e.id,direction:directionInfo(e,preview.h).label,street:e.name,exitNumber:e.exitNumber,roundabout:!!e.roundaboutPlan,recommended:e.id===preview.top?.id})):[],queued:queue.map(q=>({id:q.id,direction:q.label,street:q.name}))};}
function registerTools(){const m=document.modelContext;if(!m?.registerTool)return;const definitions=[{name:'read_drive_state',description:'Read the car state and currently offered road choices.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>gameState()},{name:'start_drive',description:'Start Sofia’s drive from home.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>{if(state!=='intro')throw new Error('The drive is already started');start();return gameState();}},{name:'choose_road',description:'Choose one of the offered roads at a junction, or while driving queue one of the upcoming roads (up to two junctions ahead).',inputSchema:{type:'object',properties:{edgeId:{type:'integer'}},required:['edgeId'],additionalProperties:false},execute:input=>{const ok=Number.isInteger(input?.edgeId)&&(state==='decision'?choose(input.edgeId,true):state==='driving'&&queueChoice({id:input.edgeId}));if(!ok)throw new Error('That road choice is not available');return gameState();}}];for(const def of definitions)try{Promise.resolve(m.registerTool(def)).catch(()=>{});}catch{}}
try{const response=await fetch('./map.json');if(!response.ok)throw new Error('Kartet kunne ikke lastes');data=await response.json();if(!data.terrain)throw new Error('Terrengdata mangler');$('loading').textContent='Bygger husene og bakkene …';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));world=createWorld($('world'),data);carHeight=world.carHeight||((x,z)=>world.height(x,z)+.47);free=createFreeDrive(data,carHeight);if(data.lakeside)parkingPlaces.add(data.lakeside);computeRoutes();computeOpenRoads();if(!optimal.has(data.start))throw new Error('Fant ikke en sammenhengende rute');applyRewards();reset();$('start').disabled=false;$('start').textContent='Kjør til barnehagen  ↗';$('loading').hidden=true;registerTools();requestAnimationFrame(animate);}catch(error){console.error(error);$('loading').hidden=false;$('loading').textContent='Spillet kunne ikke starte. Prøv å laste siden på nytt.';$('start').textContent='Last inn på nytt';$('start').disabled=false;$('start').onclick=()=>location.reload();}
