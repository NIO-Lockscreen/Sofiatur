import {createFreeDrive} from './free-drive.js';
import {createWorld,T} from './world.js';
import {roundaboutChoices} from './roundabouts.js';
const $=id=>document.getElementById(id);
let world,data,state='loading',paused=false,sound=true,current,previous=null,active=null,distance=0,speed=0,travelled=0,turns=0,heading=new T.Vector3(0,0,1),position=new T.Vector3(),choices=[],best=null,totalInitial=0,maxKmh=200,camMode='follow',lastTime=performance.now(),time=0,mapClock=0,menuWasPaused=false;
let roundaboutUndo=null,freeMode=false,free=null;
const keys=new Set(),touch=new Set(),heldPointers=new Map(),cameraHeading=new T.Vector3();
function clearInputs(){keys.clear();touch.clear();heldPointers.clear();for(const id of ['freeLeft','freeRight','freeBrake','freeDrift'])$(id).classList.remove('held');}
function freeInput(){return {left:keys.has('ArrowLeft')||keys.has('KeyA')||touch.has('left'),right:keys.has('ArrowRight')||keys.has('KeyD')||touch.has('right'),brake:keys.has('ArrowDown')||keys.has('KeyS')||touch.has('brake'),drift:keys.has('Space')||touch.has('drift')};}
function startFree(){state='free';paused=false;active=null;choices=[];roundaboutUndo=null;clearInputs();free.reset(position.x,position.z,Math.atan2(heading.x,-heading.z));ui.welcome.hidden=true;ui.drive.hidden=false;ui.mini.hidden=false;ui.finish.hidden=true;clearWorldChoices();document.body.classList.remove('choosing');$('freeControls').hidden=false;$('undoRoundabout').hidden=true;$('pause').disabled=false;$('street').textContent='Frikjøring';updateHud();}
function recoverFree(){if(state!=='free')return;clearInputs();free.recover();position.set(free.car.x,free.altitude,free.car.z);speed=0;heading.set(Math.sin(free.car.yaw),0,-Math.cos(free.car.yaw));world.resetCamera();}

let adjacency=new Map(),distances=new Map(),optimal=new Map(),openRoads=new Set();
const ui={welcome:$('welcome'),decision:$('decision'),drive:$('driveHud'),mini:$('mini'),finish:$('finish')};
function say(text){if(!sound||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();const s=new SpeechSynthesisUtterance(text);s.lang='nb-NO';s.rate=.88;s.pitch=1.1;const v=speechSynthesis.getVoices().find(x=>/^nb|^no/.test(x.lang));if(v)s.voice=v;speechSynthesis.speak(s);}catch{}}
let toastTimer;function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3100);}
function point(n){const p=data.nodes[n];return new T.Vector3(p[0],world.height(...p)+.47,p[1]);}
function endDirection(e,start=true){const p=e.path.map(n=>data.nodes[n]);const a=start?p[0]:p[p.length-2],b=start?p[1]:p.at(-1);return new T.Vector3(b[0]-a[0],0,b[1]-a[1]).normalize();}
function routeFrom(n){const route=[];const visited=new Set();while(n!==data.goal&&!visited.has(n)){visited.add(n);const e=optimal.get(n);if(!e)break;route.push(e);n=e.to;}return route;}
function computeRoutes(){const reverse=new Map();for(const e of data.edges){if(!adjacency.has(e.from))adjacency.set(e.from,[]);adjacency.get(e.from).push(e);if(!reverse.has(e.to))reverse.set(e.to,[]);reverse.get(e.to).push(e);}distances.set(data.goal,0);const todo=[data.goal];while(todo.length){todo.sort((a,b)=>distances.get(b)-distances.get(a));const n=todo.pop(),d=distances.get(n);for(const e of reverse.get(n)||[]){const nd=d+(e.cost||e.length);if(nd<(distances.get(e.from)??Infinity)){distances.set(e.from,nd);optimal.set(e.from,e);if(!todo.includes(e.from))todo.push(e.from);}}}}
function reset(){clearInputs();$('freeControls').hidden=true;roundaboutUndo=null;$('undoRoundabout').hidden=true;maxKmh=200;current=data.start;previous=null;active=null;distance=0;speed=0;travelled=0;turns=0;state='intro';paused=false;position.copy(point(current));heading.copy(endDirection(optimal.get(current)));totalInitial=routeFrom(current).reduce((n,e)=>n+e.length,0);ui.welcome.hidden=false;ui.drive.hidden=true;ui.decision.hidden=true;ui.finish.hidden=true;document.body.classList.remove('choosing');$('game').classList.remove('paused');$('pause').disabled=true;$('pause').textContent='Ⅱ';world.resetCamera();clearWorldChoices();world.setTurnArrow(null);$('remaining').textContent='Herlofsons veg → Skjermvegen';}
function start(){if(state!=='intro')return;if(freeMode){startFree();return;}ui.welcome.hidden=true;ui.drive.hidden=false;$('pause').disabled=false;state='decision';say('Hei Sofia! Nå skal vi kjøre til barnehagen. Trykk på en pil for å velge vei.');showDecision();}
function directionInfo(e,h=heading){const dir=endDirection(e.roundaboutPlan?e.exitEdge:e,e.roundaboutPlan?false:true);const dot=T.MathUtils.clamp(h.x*dir.x+h.z*dir.z,-1,1);const cross=h.x*dir.z-h.z*dir.x;const angle=Math.atan2(cross,dot);if(Math.abs(angle)>2.5)return {label:'Snu',symbol:'↶',angle};if(angle>.42)return {label:'Høyre',symbol:'↱',angle};if(angle<-.42)return {label:'Venstre',symbol:'↰',angle};return {label:'Rett frem',symbol:'↑',angle};}
function clearWorldChoices(){const wrap=$('worldArrows');wrap.replaceChildren();wrap.hidden=true;$('turnHint').hidden=true;}
function renderWorldChoices(){
 const wrap=$('worldArrows');wrap.replaceChildren();const groups=new Map();
 for(const e of choices){const info=directionInfo(e),key=info.label==='Rett frem'?'straight':info.label==='Venstre'?'left':info.label==='Høyre'?'right':'reverse';if(!groups.has(key))groups.set(key,[]);groups.get(key).push({e,info});}
 const positions={straight:[50,48],left:[27,66],right:[73,66],reverse:[50,76]};
 for(const [key,items] of groups)items.forEach(({e,info},i)=>{
  const b=document.createElement('button');b.type='button';b.className=`world-choice ${key}${e.roundaboutPlan?' roundabout-choice':''}`;
  b.style.left=(positions[key][0]+(key==='straight'||key==='reverse'?(i-(items.length-1)/2)*19:0))+'%';
  b.style.top=(positions[key][1]+(key==='left'||key==='right'?(i-(items.length-1)/2)*17:0))+'%';
  b.setAttribute('aria-label',`${e.roundaboutPlan?e.exitNumber+'. avkjørsel, ':''}${info.label}: ${e.name}`);
  const g=document.createElement('span');g.className='choice-glyph';g.textContent=key==='straight'?'↑':key==='left'?'←':key==='right'?'→':'↶';
  const n=document.createElement('span');n.className='choice-name';n.textContent=e.name==='Lokalvei'?'Innkjøring':e.name;b.append(g,n);
  if(e.roundaboutPlan){const badge=document.createElement('span');badge.className='exit-number';badge.textContent=e.exitNumber;b.append(badge);}
  b.onclick=()=>choose(e.id,true);wrap.append(b);
 });
 wrap.hidden=false;$('turnHint').textContent=choices.some(e=>e.roundaboutPlan)?'Rundkjøring · velg avkjørsel':'Trykk på en pil for å velge vei';$('turnHint').hidden=false;
}
function ringNodes(n){const ring=new Set();while(n!==undefined&&!ring.has(n)){ring.add(n);n=(adjacency.get(n)||[]).find(e=>e.roundabout)?.to;}return ring;}
// Blindvei: a road from which neither the kindergarten nor home can be reached without driving back through the junction or turning around.
function computeOpenRoads(){
 const target=n=>n===data.goal||n===data.start;
 const leadsOn=e=>{if(e.roundabout)return true;const seen=(adjacency.get(e.from)||[]).some(x=>x.roundabout)?ringNodes(e.from):new Set([e.from]);if(seen.has(e.to))return false;seen.add(e.to);const todo=[e.to];while(todo.length){const n=todo.pop();if(target(n))return true;for(const x of adjacency.get(n)||[])if(!seen.has(x.to)){seen.add(x.to);todo.push(x.to);}}return false;};
 const through=data.edges.filter(leadsOn),before=new Map();
 for(const x of through){const h=endDirection(x,false);for(const y of adjacency.get(x.to)||[])if(y.to!==x.from&&directionInfo(y,h).label!=='Snu'){if(!before.has(y))before.set(y,[]);before.get(y).push(x);}}
 const todo=through.filter(e=>target(e.to));todo.forEach(e=>openRoads.add(e));
 while(todo.length)for(const x of before.get(todo.pop())||[])if(!openRoads.has(x)){openRoads.add(x);todo.push(x);}
}
function showDecision(){
 if(current===data.goal){finish();return;}
 const outgoing=(adjacency.get(current)||[]).filter(e=>distances.has(e.to));
 if(outgoing.some(e=>e.roundabout)){
  choices=roundaboutChoices(current,previous,adjacency,distances);
  best=choices.reduce((a,e)=>!a||e.cost+distances.get(e.to)<a.cost+distances.get(a.to)?e:a,null);
  choices=choices.filter(e=>e===best||openRoads.has(e.segments.find(s=>!s.roundabout)));
 }else{
  best=optimal.get(current);
  const open=outgoing.filter(e=>e===best||openRoads.has(e));
  let nonback=open.filter(e=>e.to!==previous&&directionInfo(e).label!=='Snu');
  if(!nonback.length)nonback=open;
  const seen=new Set();choices=nonback.filter(e=>{if(seen.has(e.to))return false;seen.add(e.to);return true;}).sort((a,b)=>directionInfo(a).angle-directionInfo(b).angle);
  if(best&&!choices.some(e=>e.id===best.id)&&outgoing.some(e=>e.id===best.id))choices.push(best);
 }
 // With one road left (e.g. right, when straight ahead is a blindvei) the car drives on by itself.
 if(choices.length===1&&previous&&directionInfo(choices[0]).label!=='Snu'){choose(choices[0].id,false);return;}
 state='decision';speed=0;ui.decision.hidden=true;ui.mini.hidden=true;document.body.classList.add('choosing');
 clearWorldChoices();renderWorldChoices();updateHud();
}
function choose(edgeId,manual=true){if(paused||state!=='decision')return false;const e=(manual?choices:[...choices,...(adjacency.get(current)||[])]).find(e=>e.id===Number(edgeId));if(!e)return false;if(manual&&!choices.some(x=>x.id===e.id))return false;
 if(manual&&e.roundaboutPlan){roundaboutUndo={current,previous,position:position.clone(),heading:heading.clone(),travelled,turns};$('undoRoundabout').hidden=false;}
 const pts=e.path.map(point);if(pts.length<2)return false;const curve=new T.CatmullRomCurve3(pts,false,'centripetal',.15);curve.arcLengthDivisions=Math.max(50,Math.ceil(e.length*2));const len=curve.getLength();const info=directionInfo(e);let ringDistance=0;if(e.roundaboutPlan){const exitPoint=point(e.segments.find(s=>!s.roundabout).from);let nearest=Infinity;for(let j=0;j<=500;j++){const u=j/500,d=curve.getPointAt(u).distanceToSquared(exitPoint);if(d<nearest){nearest=d;ringDistance=u*len;}}}active={e,curve,len,ringDistance};distance=0;state='driving';clearWorldChoices();world.setTurnArrow(null);ui.decision.hidden=true;ui.mini.hidden=false;document.body.classList.remove('choosing');$('street').textContent=e.name==='Lokalvei'?'Innkjøringen':e.name;
 if(manual){turns++;say(e.roundaboutPlan?`Vi tar avkjørsel ${e.exitNumber}.`:(info.label==='Snu'?'Vi snur!':info.label+'. Da kjører vi!'));}
 return true;
}
function undoRoundabout(){
 if(!roundaboutUndo)return;
 const saved=roundaboutUndo;roundaboutUndo=null;$('undoRoundabout').hidden=true;
 setPause(false);current=saved.current;previous=saved.previous;position.copy(saved.position);heading.copy(saved.heading);travelled=saved.travelled;turns=saved.turns;
 active=null;distance=0;speed=0;state='decision';world.resetCamera();$('street').textContent='Rundkjøring';showDecision();say('Prøv en annen avkjørsel!');
}
$('undoRoundabout').onclick=undoRoundabout;
function arrive(){if(!active)return;previous=active.e.arrivalFrom??active.e.from;current=active.e.to;position.copy(point(current));heading.copy(active.curve.getTangentAt(1));active=null;speed=0;state='decision';showDecision();}
function finish(){state='finished';roundaboutUndo=null;$('undoRoundabout').hidden=true;clearWorldChoices();world.setTurnArrow(null);speed=0;ui.decision.hidden=true;ui.mini.hidden=true;ui.finish.hidden=false;document.body.classList.remove('choosing');$('remaining').textContent='Fremme!';$('finishSummary').textContent=`${(travelled/1000).toLocaleString('nb-NO',{maximumFractionDigits:1})} km gjennom nabolaget · ${turns} veivalg`;$('pause').disabled=true;say('Hurra Sofia! Du fant barnehagen! Så flink du er!');}
function remaining(){let rem=0;if(active){rem=active.len-distance;for(const e of routeFrom(active.e.to))rem+=e.length;}else for(const e of routeFrom(current))rem+=e.length;return rem;}
function updateHud(){const rem=remaining();$('remaining').textContent=freeMode?'Frikjøring · automatisk gass':rem>1000?`${(rem/1000).toLocaleString('nb-NO',{maximumFractionDigits:1})} km igjen`:`${Math.round(rem/10)*10} m igjen`;$('speed').textContent=Math.round(speed*3.6);const horizontal=Math.max(.01,Math.hypot(heading.x,heading.z));let slope=Math.round(100*heading.y/horizontal);if(world?.rawHeight){const hx=heading.x/horizontal,hz=heading.z/horizontal;const ahead=world.rawHeight(position.x+hx*2,position.z+hz*2),behind=world.rawHeight(position.x-hx*2,position.z-hz*2);slope=Math.round(100*(ahead-behind)/4);} $('slope').textContent=state==='free'&&free.car.drifting?'Drifter!':state==='decision'?'Vi velger vei':Math.abs(slope)<2?'Langs veien':slope>0?'↗ Oppoverbakke':'↘ Nedoverbakke';const realAltitude=world?.rawHeight?world.rawHeight(position.x,position.z):position.y;$('altitude').textContent=`${Math.round(realAltitude)} moh.${Math.abs(slope)>=2?' · '+Math.abs(slope)+' %':''}`;}
function drawMap(canvas,{local=false}={}){const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#e5eddd';ctx.fillRect(0,0,w,h);let transform;
 if(local){const hx=heading.x/Math.hypot(heading.x,heading.z),hz=heading.z/Math.hypot(heading.x,heading.z);const scale=w/155;transform=p=>[w*.5+((p[0]-position.x)*-hz+(p[1]-position.z)*hx)*scale,h*.69-((p[0]-position.x)*hx+(p[1]-position.z)*hz)*scale];}
 else{let minx=-80,minz=-170,maxx=1930,maxz=560;const s=Math.min((w-50)/(maxx-minx),(h-44)/(maxz-minz));transform=p=>[(w-(maxx-minx)*s)/2+(p[0]-minx)*s,(h-(maxz-minz)*s)/2+(p[1]-minz)*s];}
 function path(points){ctx.beginPath();points.forEach((p,i)=>{const v=transform(p);i?ctx.lineTo(...v):ctx.moveTo(...v);});}
 for(const a of data.areas){if(!['water','forest','wood'].includes(a.type))continue;path(a.p);ctx.closePath();ctx.fillStyle=a.type==='water'?'#a4d0d1':'#c6d9b7';ctx.fill();}
 if(local)for(const b of data.buildings){const p=b.p[0];if(Math.hypot(p[0]-position.x,p[1]-position.z)>150)continue;path(b.p);ctx.fillStyle='#c6ccb8';ctx.fill();}
 ctx.lineCap='round';ctx.lineJoin='round';for(const r of data.roads){if(local&&!r.p.some(p=>Math.hypot(p[0]-position.x,p[1]-position.z)<170))continue;path(r.p);ctx.strokeStyle='#ced6c7';ctx.lineWidth=local?23:r.type==='service'?2.5:5;ctx.stroke();ctx.strokeStyle='#fafbf2';ctx.lineWidth=local?16:r.type==='service'?1:3;ctx.stroke();}
 
 if(!local){const home=transform(data.home),goal=transform(data.nodes[data.goal]),car=transform([position.x,position.z]);for(const [p,c,t] of [[home,'#75846a','⌂'],[goal,'#e8ba48','⚑']]){ctx.beginPath();ctx.arc(...p,14,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 19px sans-serif';ctx.fillText(t,p[0],p[1]+6);}ctx.save();ctx.translate(...car);ctx.rotate(Math.atan2(heading.x,-heading.z));ctx.fillStyle='#26697a';ctx.strokeStyle='white';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(8,9);ctx.lineTo(0,5);ctx.lineTo(-8,9);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
}
function drawJunction(){drawMap($('junctionMap'),{local:true});}
function setPause(on){if(!['driving','decision','free'].includes(state))return;paused=on;if(on)clearInputs();$('pause').textContent=on?'▶':'Ⅱ';$('pause').setAttribute('aria-label',on?'Fortsett turen':'Pause');$('pause').classList.toggle('active',on);$('game').classList.toggle('paused',on);if(on&&'speechSynthesis'in window)speechSynthesis.cancel();}
function openMenu(){menuWasPaused=paused;setPause(true);$('menu').showModal();}
$('closeMenu').onclick=()=>$('menu').close();$('menu').addEventListener('close',()=>{if(!menuWasPaused)setPause(false);});$('settings').onclick=openMenu;$('about').onclick=openMenu;$('pause').onclick=()=>setPause(!paused);$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♫':'♪';$('sound').classList.toggle('active',!sound);$('sound').setAttribute('aria-label',sound?'Slå av stemmen':'Slå på stemmen');if(!sound&&'speechSynthesis'in window)speechSynthesis.cancel();if(sound)say('Hei Sofia!');};
$('cameraMode').onchange=e=>camMode=e.target.value;$('start').onclick=start;$('again').onclick=()=>{reset();start();};$('restart').onclick=()=>{$('menu').close();reset();if(freeMode)start();};
$('driveMode').onchange=e=>{if(!world)return;freeMode=e.target.value==='free';$('recoverCar').hidden=!freeMode;menuWasPaused=false;reset();$('menu').close();start();};
$('recoverCar').onclick=()=>{recoverFree();menuWasPaused=false;$('menu').close();setPause(false);};
for(const [id,action] of [['freeLeft','left'],['freeRight','right'],['freeBrake','brake'],['freeDrift','drift']]){const el=$(id);el.addEventListener('pointerdown',e=>{if(state!=='free'||paused)return;e.preventDefault();el.setPointerCapture?.(e.pointerId);heldPointers.set(e.pointerId,action);touch.add(action);el.classList.add('held');});const release=e=>{heldPointers.delete(e.pointerId);if(![...heldPointers.values()].includes(action)){touch.delete(action);el.classList.remove('held');}};for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,release);}
window.addEventListener('keydown',e=>{if($('menu').open)return;const code=e.code||({' ':'Space',a:'KeyA',d:'KeyD',s:'KeyS',q:'KeyQ',Q:'KeyQ'}[e.key]||e.key);
 if(state==='free'){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyS','Space'].includes(code)){e.preventDefault();if(!paused)keys.add(code);}if(code==='KeyQ'&&!e.repeat){e.preventDefault();recoverFree();}if((code==='KeyP'||code==='Escape')&&!e.repeat)setPause(!paused);return;}
 if(e.key===' '&&!e.repeat){e.preventDefault();if(state==='intro')start();else setPause(!paused);}if(state==='decision'&&!paused){const labels={ArrowLeft:'Venstre',ArrowRight:'Høyre',ArrowUp:'Rett frem',ArrowDown:'Snu'};const match=choices.find(c=>directionInfo(c).label===labels[e.key]);if(match){e.preventDefault();choose(match.id,true);}}});
window.addEventListener('keyup',e=>keys.delete(e.code||({' ':'Space',a:'KeyA',d:'KeyD',s:'KeyS'}[e.key]||e.key)));
window.addEventListener('blur',()=>{clearInputs();setPause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);lastTime=performance.now();});
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.045,Math.max(0,(now-lastTime)/1000));lastTime=now;time+=dt;if(!world)return;
 if(state==='free'&&!paused){travelled+=free.step(dt,freeInput());const c=free.car;speed=c.speed;position.set(c.x,free.altitude,c.z);const hx=Math.sin(c.yaw),hz=-Math.cos(c.yaw),slope=(world.height(c.x+hx,c.z+hz)-world.height(c.x-hx,c.z-hz))/2;heading.set(hx,slope,hz).normalize();$('freeDrift').classList.toggle('held',c.drifting);}
 if(state==='driving'&&!paused&&active){const remaining=active.len-distance;const out=(adjacency.get(active.e.to)||[]).filter(e=>e.to!==active.e.from);const stop=out.length!==1||active.e.to===data.goal;const targetSpeed=Math.min(maxKmh,active.e.roundaboutPlan&&distance<active.ringDistance+4?25:200)/3.6;const approachSpeed=remaining<55?Math.max(2.4,Math.sqrt(Math.max(0,remaining)*7.5)):targetSpeed;const maxspeed=Math.min(targetSpeed,approachSpeed);speed=T.MathUtils.damp(speed,maxspeed,5.5,dt);const step=Math.min(remaining,speed*dt);distance+=step;travelled+=step;const u=Math.min(1,distance/active.len);position.copy(active.curve.getPointAt(u));heading.copy(active.curve.getTangentAt(u));if(distance>=active.len-.015)arrive();}
 cameraHeading.copy(heading);if(state==='free')cameraHeading.set(Math.sin(free.car.course),heading.y,-Math.cos(free.car.course)).normalize();
 world.update(dt,position,cameraHeading,paused?0:speed,(state==='intro'||travelled===0&&state==='decision')?'intro':camMode,state==='finished',time,heading);
 mapClock+=dt;if(mapClock>.16){mapClock=0;if(state!=='intro'&&state!=='finished')updateHud();if(!ui.mini.hidden&&!ui.drive.hidden)drawMap($('minimap'));}
}
function gameState(){return {state,paused,mode:freeMode?'free':'route',speedKmh:Math.round(speed*3.6),drifting:state==='free'&&free.car.drifting,position:[position.x,position.z],street:$('street').textContent,currentNode:current,remainingMetres:Math.round(remaining()),travelledMetres:Math.round(travelled),choices:state==='decision'?choices.map(e=>({id:e.id,direction:directionInfo(e).label,street:e.name,exitNumber:e.exitNumber,roundabout:!!e.roundaboutPlan,recommended:e.id===best?.id})):[]};}
function registerTools(){const m=document.modelContext;if(!m?.registerTool)return;const definitions=[{name:'read_drive_state',description:'Read the car state and currently offered road choices.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>gameState()},{name:'start_drive',description:'Start Sofia’s drive from home.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>{if(state!=='intro')throw new Error('The drive is already started');start();return gameState();}},{name:'choose_road',description:'Choose one of the currently offered roads at a paused junction.',inputSchema:{type:'object',properties:{edgeId:{type:'integer'}},required:['edgeId'],additionalProperties:false},execute:input=>{if(!input||!Number.isInteger(input.edgeId)||state!=='decision'||!choose(input.edgeId,true))throw new Error('That road choice is not available');return gameState();}}];for(const def of definitions)try{Promise.resolve(m.registerTool(def)).catch(()=>{});}catch{}}
try{const response=await fetch('./map.json');if(!response.ok)throw new Error('Kartet kunne ikke lastes');data=await response.json();if(!data.terrain)throw new Error('Terrengdata mangler');$('loading').textContent='Bygger husene og bakkene …';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));world=createWorld($('world'),data);free=createFreeDrive(data,world.height);computeRoutes();computeOpenRoads();if(!optimal.has(data.start))throw new Error('Fant ikke en sammenhengende rute');reset();$('start').disabled=false;$('start').textContent='Kjør til barnehagen  ↗';$('loading').hidden=true;registerTools();requestAnimationFrame(animate);}catch(error){console.error(error);$('loading').hidden=false;$('loading').textContent='Spillet kunne ikke starte. Prøv å laste siden på nytt.';$('start').textContent='Last inn på nytt';$('start').disabled=false;$('start').onclick=()=>location.reload();}
