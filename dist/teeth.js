/* Tannpuss (23 November 2026): a close-up of Sofia's open mouth, drawn on a canvas of its own over the room. The same game is in her car game (Sofiatur,
   dist/teeth.js) and her space game (SofiaSpace, teeth.js); only the colours of her skin and hair, the sounds and the voice come from the game around it.
   Four steps: toothpaste on the brush (tap the tube), brushing every tooth clean (drag the brush over the teeth; the little germs let go and float off
   in the foam), rinsing (tap the cup), and a big smile with shining teeth. It cannot be lost: there is no clock, and the voice helps along the way.
   Brushing well means every tooth, the back ones too: each tooth needs a few seconds of brushing, and too fast does not clean faster. */
export function createToothGame({canvas,say=()=>{},sound=()=>{},onStep=()=>{},onDone=()=>{},reduced=()=>false,insets=()=>({top:0,bottom:0}),skin='#f6d1a8',hair='#77523c'}={}){
 // The eight teeth of each row that show from the front, from the viewer's left: first molar, canine, the two incisors, and the same again.
 // u: the middle of the tooth across the mouth (−1..1 of its half width); w: width (of the half width); h: height (of the half height).
 const ROW=[['molar',.724,.21],['canine',.517,.165],['lateral',.327,.176],['central',.114,.209]];
 const HEIGHT={up:{central:.5,lateral:.44,canine:.47,molar:.34},down:{central:.37,lateral:.37,canine:.41,molar:.32}};
 const teeth=[];
 for(const row of ['up','down'])for(const side of [-1,1])for(const [kind,u,w] of ROW)teeth.push({row,kind,u:side*u,w,h:HEIGHT[row][kind],dirt:1,germ:null,clean:false,shine:-9,spots:[]});
 teeth.sort((p,q)=>p.row===q.row?p.u-q.u:p.row==='up'?-1:1);
 // RATE: how much one tooth-width of brushing cleans; CAP: the most a tooth can be cleaned in a second (so it takes about four seconds of brushing each).
 const RATE=.16,CAP=.3,GERMS=['#7fcf5c','#a873e6','#f39a4a','#5cc6d8'];
 let step='idle',time=0,stepTime=0,seed=1,running=false,raf=0,last=0;
 let squeeze=-1,rinse=-1,smile=0,popped=0,lastTalk=-9,lastClean=0,hintTalk=-9,hint=null,half=false,missed=0,scrubSound=0,doneSent=false,brushOut=0;
 // The brush: where its head is, whether a finger holds it, how much toothpaste is on it, which way the handle points (side −1 left .. 1 right) and
 // which way the bristles face (flip 1 up .. −1 down). scrub: how far it has moved since the last frame. move: a flight from one place to another.
 const brush={x:0,y:0,held:false,paste:0,side:1,flip:1,scrub:0,move:null,inCup:true};
 const foam=[],sparks=[],flying=[];
 let W=1,H=1,dpr=1;
 const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=k=>k*k*(3-2*k),mix=(a,b,k)=>a+(b-a)*k;
 function measure(){const r=canvas.getBoundingClientRect?canvas.getBoundingClientRect():null;W=Math.max(1,(r&&r.width)||canvas.clientWidth||1);H=Math.max(1,(r&&r.height)||canvas.clientHeight||1);}
 // Everything is measured from the mouth: a is its half width, b its half height. The tube lies in the bottom left corner, the cup stands in the bottom right.
 function L(){const ins=insets()||{},t=ins.top||0,h=Math.max(1,H-t-(ins.bottom||0)),a=Math.min(W*.42,h*.56),b=a*.6,cy=t+h*.46;
  return {a,b,cx:W/2,cy,lip:a*.075,gum:b*.15,top:t,bottom:t+h,tube:{x:Math.max(a*.42,W*.13),y:t+h-Math.max(a*.2,h*.11)},cup:{x:W-Math.max(a*.36,W*.12),y:t+h-Math.max(a*.25,h*.14),r:a*.17,h:a*.36}};}
 // The inside of the mouth: a rounded shape, a little deeper below than above, whose corners lift as she smiles.
 const S=u=>Math.pow(Math.max(0,1-Math.pow(Math.abs(u),2.6)),1/2.6),lift=(l,u)=>smile*l.b*.32*u*u;
 const topY=(l,u)=>l.cy-l.b*.82*S(u)-lift(l,u),botY=(l,u)=>l.cy+l.b*1.05*S(u)-lift(l,u);
 function rect(l,t){const w=t.w*l.a,h=t.h*l.b,x=l.cx+t.u*l.a-w/2;if(t.row==='up')return {x,y:topY(l,t.u)+l.gum*.45,w,h};return {x,y:botY(l,t.u)-l.gum*.45-h,w,h};}
 const centre=(l,t)=>{const r=rect(l,t);return {x:r.x+r.w/2,y:t.row==='up'?r.y+r.h*.58:r.y+r.h*.42};};
 // ---- The steps ----
 function setStep(s){step=s;stepTime=0;hint=null;onStep(s);}
 function talk(text,force=false){if(!force&&time-lastTalk<2.6)return;lastTalk=time;say(text);}
 function start(opts={}){measure();seed=(seed+(opts.seed??Math.floor(Math.random()*1e6)))>>>0||1;time=0;squeeze=-1;rinse=-1;smile=0;popped=0;lastTalk=-9;lastClean=0;hintTalk=-9;half=false;missed=0;scrubSound=0;doneSent=false;brushOut=0;
  foam.length=sparks.length=flying.length=0;Object.assign(brush,{held:false,paste:0,side:1,flip:1,scrub:0,move:null,inCup:true,up:false});
  for(const t of teeth){t.dirt=clamp((t.kind==='molar'?1:t.kind==='canine'?.86:.74)+(rnd()-.5)*.16,.6,1);t.clean=false;t.shine=-9;t.germ=null;
   t.spots=Array.from({length:3},()=>({x:.2+rnd()*.6,y:.25+rnd()*.55,r:.1+rnd()*.07,crumb:rnd()<.3?(rnd()<.5?'#86b84e':'#e58a44'):null}));}
  // Six germs: one on a back tooth in each row (the ones that are easy to forget), the rest anywhere.
  const pick=list=>list[Math.floor(rnd()*list.length)],free=()=>teeth.filter(t=>!t.germ);
  for(const row of ['up','down'])pick(free().filter(t=>t.row===row&&t.kind==='molar')).germ={c:GERMS[Math.floor(rnd()*4)],p:rnd()*6};
  for(let i=0;i<4;i++)pick(free()).germ={c:GERMS[Math.floor(rnd()*4)],p:rnd()*6};
  setStep('paste');talk('Nå skal vi pusse tennene! Først litt tannkrem på tannbørsten. Trykk på tuben.',true);
  if(opts.loop!==false&&typeof requestAnimationFrame==='function'&&!running){running=true;last=performance.now();raf=requestAnimationFrame(frame);}else running=opts.loop!==false&&running;}
 function stop(){running=false;if(raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(raf);raf=0;brush.held=false;step='idle';}
 function frame(now){if(!running)return;const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;update(dt);draw();raf=requestAnimationFrame(frame);}
 const cleanCount=()=>teeth.filter(t=>t.clean).length;
 // ---- Taps and the finger ----
 const near=(x,y,p,r)=>Math.hypot(x-p.x,y-p.y)<r;
 function press(x,y){if(step==='idle')return;const l=L();
  if(step==='paste'){if(squeeze>=0){brush.held=true;brush.tx=x;brush.ty=y;return;}if(near(x,y,l.tube,l.a*.48)||near(x,y,{x:l.cup.x,y:l.cup.y-l.cup.h*.6},l.a*.42)||missed>=2){startPaste(l);return;}missed++;sound('tap');talk('Først tannkrem! Trykk på tuben.');return;}
  if(step==='brush'){brush.held=true;brush.tx=x;brush.ty=y;if(!(brush.move&&brush.move.lock))brush.move={from:{x:brush.x,y:brush.y},to:null,t:0,d:.08};return;}
  if(step==='rinse'){if(rinse>=0)return;if(near(x,y,{x:l.cup.x,y:l.cup.y-l.cup.h*.4},l.a*.5)||missed>=2){startRinse();return;}missed++;sound('tap');talk('Trykk på koppen med vann!');return;}
  if(step==='done'){sound('ding',sparks.length%8);for(let i=0;i<5;i++)sparks.push({x:x+(rnd()-.5)*40,y:y+(rnd()-.5)*40,t:0,s:.5+rnd()*.6});}}
 function moveTo(x,y){if(!brush.held)return;if(step!=='brush'||(brush.move&&brush.move.lock)){brush.tx=x;brush.ty=y;return;}const l=L(),d=Math.min(Math.hypot(x-brush.tx,y-brush.ty),l.a*.3);brush.scrub+=d;brush.tx=x;brush.ty=y;}
 function release(){brush.held=false;}
 function startPaste(l){squeeze=0;brush.inCup=false;const nozzle={x:l.tube.x+l.a*.36,y:l.tube.y-l.a*.17};brush.move={from:{x:brush.x,y:brush.y},to:nozzle,t:0,d:.35,lock:true};brush.side=1;sound('squeeze');}
 function startRinse(){rinse=0;sound('rinse');}
 function clientPoint(e){const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
 if(canvas.addEventListener){canvas.style&&(canvas.style.touchAction='none');
  canvas.addEventListener('pointerdown',e=>{if(step==='idle')return;e.preventDefault();canvas.setPointerCapture?.(e.pointerId);press(...clientPoint(e));});
  canvas.addEventListener('pointermove',e=>{if(step!=='idle')moveTo(...clientPoint(e));});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,release);}
 // ---- Every frame ----
 function update(dt){measure();time+=dt;stepTime+=dt;const l=L(),calm=reduced();
  // The brush: flying somewhere, following the finger, or waiting. Its handle points away from the middle of the mouth, its bristles towards the teeth.
  const home=cupBrush(l);
  if(brush.inCup){brush.x=home.x;brush.y=home.y;}
  else if(brush.move){const m=brush.move;m.t+=dt;const k=ease(Math.min(1,m.t/m.d)),to=m.to||{x:brush.tx,y:brush.ty};brush.x=mix(m.from.x,to.x,k);brush.y=mix(m.from.y,to.y,k)-Math.sin(k*Math.PI)*(m.to?l.a*.12:0);if(m.t>=m.d){brush.move=null;if(m.home)brush.inCup=true;else if(brush.held&&m.to&&step==='brush')brush.move={from:{x:brush.x,y:brush.y},to:null,t:0,d:.1};}}
  else if(brush.held){brush.x=brush.tx;brush.y=brush.ty;}
  if(!brush.inCup){const want=brush.x<l.cx-l.a*.25?-1:brush.x>l.cx+l.a*.25?1:Math.sign(brush.side)||1; // the handle changes side only well past the middlebrush.side+=(want-brush.side)*Math.min(1,dt*9);
   const gap=(topY(l,0)+botY(l,0))/2+l.b*.12,face=brush.y>gap?-1:1;brush.flip+=(face-brush.flip)*Math.min(1,dt*12);}
  // Toothpaste: the brush flies to the tube, a ribbon of paste comes out onto the bristles, and the brush comes up to the mouth.
  if(squeeze>=0){squeeze+=dt;brush.paste=clamp((squeeze-.35)/.55,0,1);
   if(squeeze>=1.05&&!brush.move&&!brush.up&&step==='paste'){brush.up=true;brush.move={from:{x:brush.x,y:brush.y},to:{x:l.cx,y:(topY(l,0)+botY(l,0))/2+l.b*.05},t:0,d:.4,lock:true};}
   if(squeeze>=1.5&&step==='paste'){squeeze=-1;setStep('brush');lastClean=time;talk('Sånn! Nå pusser vi. Dra tannbørsten over alle tennene, både oppe og nede.',true);}}
  // Brushing: every tooth under the bristles gets cleaner the further the brush moves, up to CAP a second. Foam comes as it moves.
  if(step==='brush'){const tip=bristles(l),reach=l.a*.2,moved=brush.scrub;brush.scrub=0;let cleaned=0;
   if(moved>0&&brush.held)for(const t of teeth){if(t.clean)continue;const r=rect(l,t),dx=Math.max(r.x-tip.x,0,tip.x-r.x-r.w),dy=Math.max(r.y-tip.y,0,tip.y-r.y-r.h);if(Math.hypot(dx,dy)>reach)continue;
    const c=Math.min(moved/(t.w*l.a)*RATE,CAP*dt);t.dirt=Math.max(0,t.dirt-c);cleaned+=c;
    if(t.germ&&!t.germ.gone&&t.dirt<.45)popGerm(l,t);
    if(t.dirt<=.02){t.dirt=0;t.clean=true;t.shine=time;const n=cleanCount();sound('ding',n-1);const p=centre(l,t);for(let i=0;i<6;i++)sparks.push({x:p.x+(rnd()-.5)*t.w*l.a,y:p.y+(rnd()-.5)*t.h*l.b*.6,t:-i*.05,s:.4+rnd()*.5});}}
   if(moved>0&&brush.held&&brush.paste>0){const n=Math.min(4,Math.ceil(moved/(l.a*.06)));for(let i=0;i<n&&foam.length<140;i++)foam.push({u:(tip.x-l.cx)/l.a+(rnd()-.5)*.22,v:(tip.y-l.cy)/l.b+(rnd()-.5)*.25,r:.014+rnd()*.028,life:0,max:4.5+rnd()*4,du:(rnd()-.5)*.02,dv:.01+rnd()*.02});brush.paste=Math.max(.35,brush.paste-moved/(l.a*120));}
   if(cleaned>0){lastClean=time;hint=null;scrubSound-=dt;if(scrubSound<=0){sound('scrub');scrubSound=.2;}}
   const n=cleanCount();
   if(!half&&n>=8){half=true;talk('Kjempebra, Sofia! Husk tennene helt bak også.',true);}
   // Stuck for a while: the dirtiest tooth left blinks, and the voice says so now and then.
   if(time-lastClean>4.5&&n<teeth.length){hint=teeth.filter(t=>!t.clean).sort((p,q)=>q.dirt-p.dirt)[0];if(time-hintTalk>9){hintTalk=time;talk('Se der det blinker. Der er det litt igjen!',true);}}
   if(n===teeth.length){setStep('rinse');missed=0;brush.held=false;brush.move={from:{x:brush.x,y:brush.y},to:cupBrush(l),t:0,d:.5,lock:true,home:true};talk('Alle tennene er rene! Nå skyller vi munnen. Trykk på koppen.',true);}}
  // Rinsing: the cup comes up to her mouth, the water swirls round and the foam goes with it.
  if(rinse>=0){rinse+=dt;if(rinse>.5)for(const f of foam)f.life=Math.max(f.life,f.max-.6);
   if(rinse>=1.9&&step==='rinse'){rinse=-1;setStep('done');sound('done');talk('Så rene og fine tenner! Du pusset kjempebra, Sofia!',true);for(const t of teeth)t.shine=time+rnd()*.6;}}
  if(step==='done'){smile=Math.min(1,smile+dt/.7);if(!calm&&Math.floor(time*3)!==Math.floor((time-dt)*3)){const t=teeth[Math.floor(rnd()*teeth.length)],p=centre(l,t);sparks.push({x:p.x,y:p.y,t:0,s:.5+rnd()*.4});}
   if(stepTime>=3.4&&!doneSent){doneSent=true;onDone({teeth:teeth.length});}}
  for(const f of foam){f.life+=dt;f.u+=f.du*dt;f.v+=f.dv*dt*(rinse>=0?-6:1);}for(let i=foam.length-1;i>=0;i--)if(foam[i].life>=foam[i].max)foam.splice(i,1);
  for(const s of sparks)s.t+=dt;for(let i=sparks.length-1;i>=0;i--)if(sparks[i].t>1)sparks.splice(i,1);
  for(const g of flying){g.t+=dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.vy-=l.a*.25*dt;}for(let i=flying.length-1;i>=0;i--)if(flying[i].t>1.6)flying.splice(i,1);}
 // A germ lets go: it floats away in a bubble, spinning, and the voice says goodbye to the first one.
 function popGerm(l,t){t.germ.gone=true;popped++;const p=centre(l,t);flying.push({x:p.x,y:p.y,vx:(t.u<0?-1:1)*l.a*(.35+rnd()*.3),vy:-l.a*(.25+rnd()*.25),t:0,c:t.germ.c,spin:(rnd()-.5)*6});sound('pop');
  const left=teeth.filter(q=>q.germ&&!q.germ.gone).length;talk(popped===1?'Hade, bakterie!':!left?'Alle bakteriene er borte!':left<=2?'Snart er alle borte!':popped%2?'Bort med deg, bakterie!':'Pling! Den ble med skummet.');}
 // Where the brush stands in the cup, and where its bristles touch.
 // The cup comes up to her mouth and tips while she rinses, with the brush in it.
 function cupPose(l){const c=l.cup;if(rinse<0)return {x:c.x,y:c.y,tilt:0};const k=ease(Math.min(1,rinse/.45))*(1-ease(clamp((rinse-1.45)/.45,0,1)));return {x:mix(c.x,l.cx+l.a*.55,k),y:mix(c.y,botY(l,.55)+c.h*.75,k),tilt:-.9*k};}
 const turn=(p,a)=>({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)});
 function cupBrush(l){const c=cupPose(l),o=turn({x:-l.cup.r*.15,y:-l.cup.h-l.a*.2},c.tilt);return {x:c.x+o.x,y:c.y+o.y};}
 function axes(){if(brush.inCup||(brush.move&&brush.move.home)){const t=rinse>=0?cupPose(L()).tilt:0;return {d:turn({x:.18,y:.98},t),n:turn({x:-.98,y:.18},t),f:1};}const s=brush.side,len=Math.hypot(s,.3)||1,d={x:s/len,y:.3/len};let n={x:-d.y,y:d.x};if(n.y<0)n={x:-n.x,y:-n.y};return {d,n,f:brush.flip};}
 function bristles(l){const {f}=axes(),k=l.a*.11*.5+l.a*.06;return {x:brush.x,y:brush.y-Math.sign(f||1)*k};} // straight up or down from the brush, whichever way the handle points
 // ---- Drawing ----
 function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
 function mouthPath(g,l){g.beginPath();for(let i=0;i<=40;i++){const u=-1+i/20;g[i?'lineTo':'moveTo'](l.cx+u*l.a,topY(l,u));}for(let i=40;i>=0;i--){const u=-1+i/20;g.lineTo(l.cx+u*l.a,botY(l,u));}g.closePath();}
 function toothPath(g,l,t){const r=rect(l,t),up=t.row==='up',free=up?r.y+r.h:r.y,root=up?r.y:r.y+r.h,s=up?1:-1,rf=r.w*(t.kind==='molar'?.28:.42);
  g.beginPath();g.moveTo(r.x,root-s*r.h*.2);g.lineTo(r.x,free-s*rf);g.quadraticCurveTo(r.x,free,r.x+rf,free);
  if(t.kind==='canine'){g.lineTo(r.x+r.w*.5,free+s*r.h*.08);}
  if(t.kind==='molar'){g.lineTo(r.x+r.w*.45,free);g.quadraticCurveTo(r.x+r.w*.5,free-s*r.h*.06,r.x+r.w*.55,free);}
  g.lineTo(r.x+r.w-rf,free);g.quadraticCurveTo(r.x+r.w,free,r.x+r.w,free-s*rf);g.lineTo(r.x+r.w,root-s*r.h*.2);g.closePath();return r;}
 function drawTooth(g,l,t){const r=toothPath(g,l,t),up=t.row==='up',edge=Math.abs(t.u)>.5;
  const grad=g.createLinearGradient(r.x,0,r.x+r.w,0);grad.addColorStop(0,edge?'#e9e1cf':'#f3eddf');grad.addColorStop(.45,'#fffdf7');grad.addColorStop(1,edge?'#e4dbc7':'#efe8d8');g.fillStyle=grad;g.fill();
  g.lineWidth=Math.max(1,l.a*.006);g.strokeStyle='#dccfb4';g.stroke();
  if(t.dirt>0){g.save();toothPath(g,l,t);g.clip();const gum=up?r.y:r.y+r.h,free=up?r.y+r.h:r.y,p=g.createLinearGradient(0,gum,0,free);
   p.addColorStop(0,`rgba(214,180,72,${.72*t.dirt})`);p.addColorStop(.55,`rgba(222,196,96,${.36*t.dirt})`);p.addColorStop(1,`rgba(226,204,120,${.14*t.dirt})`);g.fillStyle=p;g.fillRect(r.x,r.y,r.w,r.h);
   for(const s of t.spots){const a=s.crumb?Math.max(0,(t.dirt-.35)/.65):t.dirt;if(a<=0)continue;g.globalAlpha=a;g.fillStyle=s.crumb||'#c9a43a';g.beginPath();g.ellipse(r.x+s.x*r.w,r.y+(up?s.y:1-s.y)*r.h,s.r*r.w*(s.crumb?.8:1),s.r*r.w*(s.crumb?.65:.8),s.x*3,0,Math.PI*2);g.fill();}
   g.restore();g.globalAlpha=1;}
  else{g.fillStyle='rgba(255,255,255,.75)';rr(g,r.x+r.w*.18,r.y+r.h*.15,r.w*.14,r.h*.5,r.w*.07);g.fill();}}
 function drawGerm(g,x,y,s,c,p,spin=0,alpha=1){g.save();g.translate(x,y);g.rotate(spin);g.globalAlpha=alpha;const wob=reduced()?0:Math.sin(p*5)*.06;
  g.fillStyle=c;g.beginPath();for(let i=0;i<=16;i++){const a=i/16*Math.PI*2,r=s*(1+.12*Math.sin(a*5+p*3)+wob*Math.sin(a*2));g[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r*.9);}g.closePath();g.fill();
  g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=s*.08;g.stroke();
  for(const sx of [-1,1]){g.fillStyle='#fff';g.beginPath();g.ellipse(sx*s*.34,-s*.15,s*.26,s*.3,0,0,Math.PI*2);g.fill();g.fillStyle='#2b2038';g.beginPath();g.arc(sx*s*.34+s*.05,-s*.1,s*.13,0,Math.PI*2);g.fill();}
  g.strokeStyle='#2b2038';g.lineWidth=s*.1;g.lineCap='round';g.beginPath();g.arc(0,s*.2,s*.25,.2*Math.PI,.8*Math.PI);g.stroke();
  for(const sx of [-1,1]){g.strokeStyle=c;g.lineWidth=s*.16;g.beginPath();g.moveTo(sx*s*.85,s*.1);g.lineTo(sx*s*1.25,-s*.25+(reduced()?0:Math.sin(p*7+sx)*s*.2));g.stroke();}
  g.restore();}
 function star(g,x,y,r,a=0){g.beginPath();for(let i=0;i<8;i++){const k=i%2?r*.38:r,ang=a+i*Math.PI/4;g[i?'lineTo':'moveTo'](x+Math.cos(ang)*k,y+Math.sin(ang)*k);}g.closePath();g.fill();}
 function drawBrush(g,l){const {d,n,f}=axes(),k=l.a,hw=k*.34,hh=k*.11;g.save();g.setTransform(dpr*d.x,dpr*d.y,dpr*n.x*f,dpr*n.y*f,dpr*brush.x,dpr*brush.y);
  // In this frame the handle goes along +x and the bristles stand up along −y.
  g.fillStyle='#3f9fe0';rr(g,hw*.45,-hh*.32,k*.16,hh*.64,hh*.3);g.fill();rr(g,hw*.45+k*.12,-hh*.62,k*.86,hh*1.24,hh*.6);g.fill();
  g.fillStyle='#8fd3ff';rr(g,hw*.45+k*.3,-hh*.36,k*.5,hh*.3,hh*.15);g.fill();g.fillStyle='#ffd54a';rr(g,hw*.45+k*.3,hh*.08,k*.5,hh*.28,hh*.14);g.fill();
  g.fillStyle='#3f9fe0';rr(g,-hw/2,-hh/2,hw,hh,hh*.45);g.fill();
  for(let i=0;i<7;i++){const x=-hw/2+hw*.07+i*hw*.86/6;g.fillStyle=i%2?'#d9f1ff':'#ffffff';rr(g,x-hw*.055,-hh/2-hh*.95,hw*.11,hh,hw*.04);g.fill();}
  if(brush.paste>0){const p=brush.paste,w=hw*.85*Math.min(1,p+.15),y=-hh/2-hh*.95;g.fillStyle='#ffffff';g.beginPath();g.moveTo(-w/2,y+hh*.12);
   for(let i=0;i<=8;i++){const x=-w/2+w*i/8;g.lineTo(x,y-hh*.42*p-Math.sin(i*1.3)*hh*.1);}g.lineTo(w/2,y+hh*.12);g.closePath();g.fill();g.strokeStyle='rgba(90,170,230,.9)';g.lineWidth=hh*.14;g.beginPath();g.moveTo(-w*.42,y-hh*.12*p);g.quadraticCurveTo(0,y-hh*.5*p,w*.42,y-hh*.15*p);g.stroke();}
  g.restore();}
 function drawTube(g,l){const t=l.tube,k=l.a,s=squeeze>=0?Math.sin(Math.min(1,squeeze/.9)*Math.PI):0,glow=step==='paste'&&squeeze<0?.5+.5*Math.sin(time*5):0;g.save();g.translate(t.x,t.y);g.rotate(-.12);
  if(glow){g.fillStyle=`rgba(255,232,120,${.35*glow})`;g.beginPath();g.ellipse(0,0,k*.42,k*.2,0,0,Math.PI*2);g.fill();}
  g.fillStyle='#ffffff';g.beginPath();g.moveTo(-k*.3,-k*.1);g.lineTo(k*.2,-k*.09*(1-.45*s));g.lineTo(k*.2,k*.09*(1-.45*s));g.lineTo(-k*.3,k*.1);g.closePath();g.fill();
  g.strokeStyle='#cfd8e3';g.lineWidth=k*.01;g.stroke();g.fillStyle='#e8434f';g.fillRect(-k*.31,-k*.105,k*.05,k*.21);g.fillStyle='#4aa3df';g.fillRect(-k*.18,-k*.06*(1-.2*s),k*.28,k*.035);g.fillStyle='#e8434f';g.fillRect(-k*.18,k*.025,k*.28,k*.035);
  g.fillStyle='#4aa3df';rr(g,k*.2,-k*.055,k*.1,k*.11,k*.02);g.fill();g.restore();}
 function drawCup(g,l,front){const c=l.cup,{x,y,tilt}=cupPose(l);
  const glow=step==='rinse'&&rinse<0?.5+.5*Math.sin(time*5):0;g.save();g.translate(x,y);g.rotate(tilt);
  if(!front){if(glow){g.fillStyle=`rgba(255,232,120,${.4*glow})`;g.beginPath();g.ellipse(0,-c.h*.5,c.r*2,c.h*.95,0,0,Math.PI*2);g.fill();}g.restore();return;}
  g.fillStyle='#ff8fb6';g.beginPath();g.moveTo(-c.r,-c.h);g.lineTo(c.r,-c.h);g.lineTo(c.r*.82,0);g.lineTo(-c.r*.82,0);g.closePath();g.fill();
  g.fillStyle='rgba(120,200,255,.7)';g.fillRect(-c.r*.9,-c.h*.85,c.r*1.8,c.h*.12);g.fillStyle='#ffb3cf';g.fillRect(-c.r,-c.h,c.r*2,c.h*.1);
  g.fillStyle='#ffffff';star(g,0,-c.h*.45,c.r*.35,time*(reduced()?0:.5));g.restore();}
 function draw(){const g=canvas.getContext&&canvas.getContext('2d');if(!g)return;measure();dpr=Math.min(2,(typeof devicePixelRatio==='number'&&devicePixelRatio)||1);
  const pw=Math.round(W*dpr),ph=Math.round(H*dpr);if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}if(W<10||H<10)return;const l=L(),calm=reduced();
  g.setTransform(dpr,0,0,dpr,0,0);
  // The bathroom wall: pale tiles.
  g.fillStyle='#dcf1ee';g.fillRect(0,0,W,H);g.strokeStyle='#c2e2dd';g.lineWidth=2;const tile=Math.max(36,l.a*.32);g.beginPath();for(let x=tile/2;x<W;x+=tile){g.moveTo(x,0);g.lineTo(x,H);}for(let y=tile/2;y<H;y+=tile){g.moveTo(0,y);g.lineTo(W,y);}g.stroke();
  // Her face, close up: hair round the top, cheeks, a little nose and the chin.
  g.fillStyle=hair;g.beginPath();g.ellipse(l.cx,l.cy-l.b*.55,l.a*1.78,l.b*2.75,0,0,Math.PI*2);g.fill();
  g.fillStyle=skin;g.beginPath();g.ellipse(l.cx,l.cy+l.b*.32,l.a*1.6,l.b*2.45,0,0,Math.PI*2);g.fill();
  g.fillStyle='rgba(255,140,160,.35)';for(const s of [-1,1]){g.beginPath();g.ellipse(l.cx+s*l.a*1.18,l.cy-l.b*.35-smile*l.b*.12,l.a*.24,l.b*.3,0,0,Math.PI*2);g.fill();}
  g.strokeStyle='rgba(150,90,60,.45)';g.lineWidth=l.a*.022;g.lineCap='round';g.beginPath();g.arc(l.cx,l.cy-l.b*1.5,l.a*.1,.15*Math.PI,.85*Math.PI);g.stroke();
  // The mouth: lips, the dark inside, the tongue, the teeth and the gums. Everything inside is clipped to the mouth.
  mouthPath(g,l);g.lineJoin='round';g.lineWidth=l.lip*2;g.strokeStyle='#d8627a';g.stroke();g.fillStyle='#5a1a2e';g.fill();
  g.save();mouthPath(g,l);g.clip();
  const throat=g.createRadialGradient(l.cx,l.cy+l.b*.1,l.a*.05,l.cx,l.cy+l.b*.1,l.a*.8);throat.addColorStop(0,'#3a0d1d');throat.addColorStop(1,'#6e2236');g.fillStyle=throat;g.fillRect(l.cx-l.a*1.1,l.cy-l.b*1.2,l.a*2.2,l.b*2.6);
  g.fillStyle='#e57f8d';g.beginPath();g.ellipse(l.cx,botY(l,0)-l.b*.18,l.a*.62,l.b*.5,0,0,Math.PI*2);g.fill();g.strokeStyle='rgba(160,50,70,.35)';g.lineWidth=l.a*.012;g.beginPath();g.moveTo(l.cx,botY(l,0)-l.b*.6);g.lineTo(l.cx,botY(l,0)-l.b*.2);g.stroke();
  for(const t of teeth)drawTooth(g,l,t);
  g.fillStyle='#f39aaa';for(const row of ['up','down']){g.beginPath();for(let i=0;i<=40;i++){const u=-1+i/20,y=row==='up'?topY(l,u):botY(l,u);g[i?'lineTo':'moveTo'](l.cx+u*l.a,y);}
   for(let i=40;i>=0;i--){const u=-1+i/20,y=row==='up'?topY(l,u)+l.gum*.62:botY(l,u)-l.gum*.62;g.lineTo(l.cx+u*l.a,y);}g.closePath();g.fill();}
  // Germs sitting on the teeth, waving.
  for(const t of teeth)if(t.germ&&!t.germ.gone){const p=centre(l,t);drawGerm(g,p.x,p.y,t.w*l.a*.27,t.germ.c,time+t.germ.p);}
  // Rinse water rising and swirling.
  if(rinse>.35){const k=Math.min(1,(rinse-.35)/.5)*(1-clamp((rinse-1.35)/.45,0,1)),lvl=mix(botY(l,0)+l.b*.1,l.cy-l.b*.35,k);g.fillStyle='rgba(130,205,255,.55)';g.beginPath();g.moveTo(l.cx-l.a*1.1,l.cy+l.b*1.3);
   for(let i=0;i<=24;i++){const x=l.cx-l.a*1.1+l.a*2.2*i/24;g.lineTo(x,lvl+Math.sin(i*.8+rinse*9)*l.b*.05);}g.lineTo(l.cx+l.a*1.1,l.cy+l.b*1.3);g.closePath();g.fill();}
  // Foam from the toothpaste.
  for(const f of foam){const a=Math.min(1,f.life/.2,(f.max-f.life)/.8);if(a<=0)continue;g.globalAlpha=a*.85;g.fillStyle='#ffffff';g.beginPath();g.arc(l.cx+f.u*l.a,l.cy+f.v*l.b,f.r*l.a,0,Math.PI*2);g.fill();g.strokeStyle='rgba(140,200,240,.6)';g.lineWidth=1;g.stroke();}
  g.globalAlpha=1;g.restore();
  // The tooth that still needs brushing blinks with a ring.
  if(hint&&step==='brush'){const p=centre(l,hint),pulse=calm?.8:.6+.4*Math.sin(time*7);g.strokeStyle=`rgba(255,214,64,${pulse})`;g.lineWidth=l.a*.025;g.beginPath();g.ellipse(p.x,p.y,hint.w*l.a*.8,hint.h*l.b*.75,0,0,Math.PI*2);g.stroke();}
  // Sparkles on clean teeth, and germs floating away in their bubbles.
  for(const s of sparks){if(s.t<0)continue;const k=Math.sin(Math.min(1,s.t)*Math.PI);g.fillStyle=`rgba(255,248,190,${k})`;star(g,s.x,s.y,l.a*.05*s.s*(.5+k),s.t*3);}
  if(step==='done'){for(const t of teeth){const k=(time-t.shine)%2.2;if(k<0||k>.6)continue;const p=centre(l,t),a=Math.sin(k/.6*Math.PI);g.fillStyle=`rgba(255,255,255,${a})`;star(g,p.x+t.w*l.a*.25,p.y-t.h*l.b*.2*(t.row==='up'?1:-1),l.a*.045*a,k*4);}}
  for(const f of flying){const a=1-Math.max(0,(f.t-1)/.6),s=l.a*.05;drawGerm(g,f.x,f.y,s,f.c,time,f.t*f.spin,a);g.globalAlpha=a*.7;g.strokeStyle='#bfe6ff';g.lineWidth=2;g.beginPath();g.arc(f.x,f.y,s*1.9,0,Math.PI*2);g.stroke();g.globalAlpha=1;}
  // The tube, the cup with the brush in it (or the brush in her hand), and the tally of clean teeth at the top.
  drawTube(g,l);drawCup(g,l,false);if(brush.inCup||(brush.move&&brush.move.home)){const c=cupPose(l);g.save();g.translate(c.x,c.y);g.rotate(c.tilt);g.beginPath();g.rect(-W*2,-H*2,W*4,H*2-l.cup.h*.3);g.clip();drawBrush(g,l);g.restore();}drawCup(g,l,true);if(!(brush.inCup||(brush.move&&brush.move.home)))drawBrush(g,l);
  if(step==='paste'&&squeeze>=0&&squeeze<1.05){const k=clamp((squeeze-.3)/.5,0,1),t=l.tube,from={x:t.x+l.a*.3,y:t.y-l.a*.06};g.strokeStyle='#ffffff';g.lineWidth=l.a*.045;g.lineCap='round';g.beginPath();g.moveTo(from.x,from.y);g.lineTo(mix(from.x,brush.x,k),mix(from.y,brush.y-l.a*.1,k));g.stroke();}
  const n=cleanCount(),size=Math.min(22,(W-40)/17),x0=W/2-size*8,y0=l.top+12;g.fillStyle='rgba(255,255,255,.82)';rr(g,x0-10,y0-6,size*16+20,size+12,(size+12)/2);g.fill();
  teeth.forEach((t,i)=>{const x=x0+i*size+size*.15,w=size*.7,clean=t.clean;g.fillStyle=clean?'#ffffff':`rgb(${mix(255,226,t.dirt)|0},${mix(255,200,t.dirt)|0},${mix(255,110,t.dirt)|0})`;rr(g,x,y0,w,size,w*.35);g.fill();g.strokeStyle=clean?'#ffcf3d':'#d9c9a6';g.lineWidth=clean?2:1;g.stroke();});
  if(H>260){const text=n===teeth.length?'Alle tennene er rene!':`${n} av ${teeth.length} tenner er rene`,fs=Math.round(size*.62);g.font=`800 ${fs}px system-ui,sans-serif`;g.textAlign='center';g.textBaseline='middle';const tw=g.measureText(text).width+fs*1.4;
  g.fillStyle='rgba(255,255,255,.82)';rr(g,W/2-tw/2,y0+size+9,tw,fs*1.7,fs*.85);g.fill();g.fillStyle='#5a4a3a';g.fillText(text,W/2,y0+size+9+fs*.87);}}
 return {start,stop,update,draw,press,move:moveTo,release,get step(){return step;},get running(){return running;},teeth,brush,foam,cleanCount,layout:L,rect:t=>rect(L(),t),centre:t=>centre(L(),t),bristles:()=>bristles(L()),
  measure,canvas};
}
