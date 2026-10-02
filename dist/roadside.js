import {roadWidth,streetSegments,segmentIndex,projectPoint} from './transit-geometry.js';
import {fitPath,KERB_BAND,PATH_GAP} from './street-details.js';
import {addTrees} from './trees.js';
// Roadside (30 September 2026): what stands beside the roads in reality and used to be missing: fences, hedges, walls, retaining walls, noise
// barriers and guard rails, driveways, paths and steps, benches, bins, post boxes, playground equipment, parked cars, flagpoles, masts, pylons
// with their wires, and the trees (trees.js). It draws data.roadside (add-roadside.py reads OpenStreetMap, NVDB and AR5; sources, tags and what is
// approximate: docs/roadside.md). Everything is merged into the world's chunks (bucket/quad/tri), the trees are instanced meshes.
// Nothing stands on a carriageway: lines are pushed out to half a road + kerb band + a gap and cut where they run over the road, and the
// road surface's own heightAt (onSurface) cuts what is left over at junctions. `index` tells the world's clear() what trees must keep off.
const unit=(x,z)=>{const l=Math.hypot(x,z)||1;return [x/l,z/l];};
const hash=(x,z,k=0)=>{let h=Math.imul((x*8.3|0)+k*374761393,668265263)^Math.imul((z*8.3|0)+k*2246822519,374761393);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
const inRing=(ring,x,z)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
const PICKET=['#ece8dc','#e3ddcc','#8c5b45','#a98a62','#b4482f'];       // white, cream, brown, natural timber, Falu red
const CARS=['#d9dcdc','#2b2f33','#9ea5a9','#8a2027','#24476f','#46534b','#c7c2b4','#1f2a36'];
export const WAY_COLOUR={driveway:'#8f928d',aisle:'#7d8380',service:'#8f928d',track:'#a49d8b',footway:'#aeaca2',path:'#9b8d72',steps:'#bab6a9',pedestrian:'#b3afa4'};
const SURFACE={paving_stones:'#b3afa4',cobblestone:'#a7a398',sett:'#a7a398',gravel:'#a49d8b',fine_gravel:'#a49d8b',compacted:'#a8a08b',unpaved:'#a39a83',dirt:'#9b8d72',ground:'#9b8d72',concrete:'#bdbcb4',grass_paver:'#9ba88b',grass:'#9ba88b'};
const WAY_LIFT={driveway:.1,aisle:.1,service:.1,track:.09,footway:.09,path:.08,steps:.1,pedestrian:.1};
const THICK={fence:.12,hedge:.9,wall:.4,retaining:.4,noise:.14,guardrail:.16}; // what a line of this kind needs beside the road

export function addRoadside({T,scene,data,height,ground=height,roadTop,onSurface=()=>false,bucket,tri,quad,box,segments,index=()=>{},clear=()=>true,lakeAt=()=>false,density=1,skip=()=>false}){
 const S=data.roadside,out={barriers:[],ways:[],furniture:[],cars:[],trees:[],chunks:[],counts:{},power:[],kindTris:{},triangles:0};if(!S)return out;
 const segs=segments||streetSegments(data.roads),idx=segmentIndex(segs),count=k=>out.counts[k]=(out.counts[k]||0)+1;
 let nTri=0,lapAt=performance.now(),lapTri=0;out.timing={};const lap=k=>{const now=performance.now();out.timing[k]={ms:Math.round(now-lapAt),tris:nTri-lapTri};lapAt=now;lapTri=nTri;};
 const T3=(b,a,c,d,col)=>{nTri++;tri(b,a,c,d,col);},Q=(b,a,c,d,e,col)=>{nTri+=2;quad(b,a,c,d,e,col);};
 const obstacle=(a,b,w)=>{const len=Math.hypot(b[0]-a[0],b[1]-a[1]),seg=[a,b,w-5];for(let d=0;d<=len;d+=15){const t=len?d/len:0;index(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,{road:seg});}index(b[0],b[1],{road:seg});};
 const block=b=>{for(let x=Math.floor(b[0]/40)*40;x<=b[2];x+=40)for(let z=Math.floor(b[1]/40)*40;z<=b[3];z+=40)index(x,z,{house:b});}; // a box trees keep out of, as the world's house bounds
 const edge=(x,z,reach=10)=>{let best=1e9;for(const [a,b,w] of idx.near(x,z,reach)){best=Math.min(best,projectPoint([x,z],a,b).distance-w/2-KERB_BAND);}return best;}; // metres from the kerb band
 const walk=(line,step,fn)=>{let s=0,next=step/2;for(let i=0;i<line.length-1;i++){const a=line[i],b=line[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l<1e-6)continue;const tx=(b[0]-a[0])/l,tz=(b[1]-a[1])/l;
   while(next<=s+l){const d=next-s;fn(a[0]+tx*d,a[1]+tz*d,tx,tz,next);next+=step;}s+=l;}return s;};
 const samples=(line,step)=>{const pts=[];for(let i=0;i<line.length-1;i++){const a=line[i],b=line[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]),k=Math.max(1,Math.round(l/step));for(let j=0;j<(i===line.length-2?k+1:k);j++){const x=a[0]+(b[0]-a[0])*j/k,z=a[1]+(b[1]-a[1])*j/k;pts.push({x,z,y:ground(x,z)});}}return pts;};
 const lengthOf=l=>l.reduce((s,p,i)=>i?s+Math.hypot(p[0]-l[i-1][0],p[1]-l[i-1][1]):0,0);
 // The road surface has a skirt under its kerb band: a point is clear of it when it and four points 0.1 m round it are off the surface (the skirt reaches 0.25 m beyond the kerb band; lines are pushed out to 0.3 m).
 const clearOfRoad=(x,z,m=.1)=>!onSurface(x,z)&&!onSurface(x+m,z)&&!onSurface(x-m,z)&&!onSurface(x,z+m)&&!onSurface(x,z-m);
 // Douglas-Peucker: the fewest points that keep the line within tol metres.
 function simplify(p,tol){if(p.length<3)return p;const keep=new Uint8Array(p.length),todo=[[0,p.length-1]];keep[0]=keep[p.length-1]=1;
  while(todo.length){const [i,j]=todo.pop();if(j-i<2)continue;const ax=p[i][0],az=p[i][1],dx=p[j][0]-ax,dz=p[j][1]-az,l2=dx*dx+dz*dz||1e-9;let far=0,at=-1;
   for(let k=i+1;k<j;k++){const t=Math.max(0,Math.min(1,((p[k][0]-ax)*dx+(p[k][1]-az)*dz)/l2)),e=(p[k][0]-ax-t*dx)**2+(p[k][1]-az-t*dz)**2;if(e>far){far=e;at=k;}}
   if(far>tol*tol){keep[at]=1;todo.push([i,at],[at,j]);}}
  return p.filter((_,k)=>keep[k]);}
 // Cut a polyline into the runs where keep(x,z) holds (every `step` m); runs shorter than `min` are dropped.
 function clip(line,keep,step=1,min=3){const runs=[];let cur=[];
  for(let i=0;i<line.length-1;i++){const a=line[i],b=line[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]),k=Math.max(1,Math.ceil(l/step));
   for(let j=0;j<=k;j++){if(i&&!j)continue;const x=a[0]+(b[0]-a[0])*j/k,z=a[1]+(b[1]-a[1])*j/k;if(keep(x,z))cur.push([x,z]);else{if(cur.length>1&&lengthOf(cur)>=min)runs.push(simplify(cur,.08));cur=[];}}}
  if(cur.length>1&&lengthOf(cur)>=min)runs.push(simplify(cur,.08));return runs;}
 // A place beside the road: moved out to half a road + kerb band + margin from every centre line, or null if it still lies on the surface.
 function place(x,z,margin){for(let pass=0;pass<4;pass++){let moved=false;for(const [a,b,w] of idx.near(x,z,8)){const q=projectPoint([x,z],a,b),need=w/2+KERB_BAND+margin;if(q.distance<need){const [ux,uz]=q.distance>.01?unit(x-q.x,z-q.z):unit(-(b[1]-a[1]),b[0]-a[0]);x+=ux*(need-q.distance);z+=uz*(need-q.distance);moved=true;}}if(!moved)break;}
  return !clearOfRoad(x,z)||edge(x,z,8)<margin-.05?null:[x,z];}
 const nearRoad=(x,z,reach=30)=>{let best=null;for(const [a,b,w] of idx.near(x,z,reach)){const q=projectPoint([x,z],a,b);if(!best||q.distance<best.d)best={d:q.distance,x:q.x,z:q.z,tx:(b[0]-a[0])/(Math.hypot(b[0]-a[0],b[1]-a[1])||1),tz:(b[1]-a[1])/(Math.hypot(b[0]-a[0],b[1]-a[1])||1),w};}return best;};
 // Buildings, for what must not stand inside one
 const cellB=new Map();const buildings=data.buildings.filter(b=>b.p.length>3).map(b=>b.p.slice(0,-1));
 buildings.forEach((p,i)=>{let ax=1e9,az=1e9,bx=-1e9,bz=-1e9;for(const [x,z] of p){ax=Math.min(ax,x);az=Math.min(az,z);bx=Math.max(bx,x);bz=Math.max(bz,z);}for(let gx=Math.floor(ax/32);gx<=Math.floor(bx/32);gx++)for(let gz=Math.floor(az/32);gz<=Math.floor(bz/32);gz++){const k=gx*65536+gz;if(!cellB.has(k))cellB.set(k,[]);cellB.get(k).push(i);}});
 const inBuilding=(x,z)=>(cellB.get(Math.floor(x/32)*65536+Math.floor(z/32))||[]).some(i=>inRing(buildings[i],x,z));
 const pole=(b,x,y,z,r0,r1,h,sides,c,rot=.4)=>{const a=[],e=[];for(let i=0;i<sides;i++){const t=rot+i/sides*Math.PI*2;a.push([x+Math.cos(t)*r0,y,z+Math.sin(t)*r0]);e.push([x+Math.cos(t)*r1,y+h,z+Math.sin(t)*r1]);}
  for(let i=0;i<sides;i++){const j=(i+1)%sides;Q(b,a[i],a[j],e[j],e[i],c);}};
 const post=(b,x,y,z,w,h,c)=>{const p=[[x-w,y,z-w],[x+w,y,z-w],[x+w,y,z+w],[x-w,y,z+w]];for(let i=0;i<4;i++){const a=p[i],d=p[(i+1)%4];Q(b,a,d,[d[0],y+h,d[2]],[a[0],y+h,a[2]],c);}};
 const post2=(b,x,y,z,w,h,c)=>{Q(b,[x-w,y,z],[x+w,y,z],[x+w,y+h,z],[x-w,y+h,z],c);Q(b,[x,y,z-w],[x,y,z+w],[x,y+h,z+w],[x,y+h,z-w],c);}; // a thin post: two crossing planes
 const bx=(b,cx,cy,cz,wx,wy,wz,c,angle=0)=>{nTri+=12;box(b,cx,cy,cz,wx,wy,wz,c,angle);};

 // ---- Driveways, car park aisles, footpaths, paths, steps: ribbons on the visible ground ------------------------------------------------------
 const wayGrid=new Map(); // segments [a,b,halfwidth] of the ways that a fence or hedge leaves open (a gate where a driveway or path comes through), by 12 m cell
 const leaveOpen=(a,b,h,grid=wayGrid)=>{const s=[a,b,h];for(let i=Math.floor((Math.min(a[0],b[0])-h-.4)/12);i<=Math.floor((Math.max(a[0],b[0])+h+.4)/12);i++)for(let j=Math.floor((Math.min(a[1],b[1])-h-.4)/12);j<=Math.floor((Math.max(a[1],b[1])+h+.4)/12);j++){const k=i*65536+j;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(s);}};
 const treeWays=new Map(); // every way, narrow or wide: no tree stands on one
 function ribbon(p,width,colour,lift){
  const q=[p[0]];for(let i=0;i<p.length-1;i++){const a=p[i],c=p[i+1],k=Math.max(1,Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/4));for(let j=1;j<=k;j++)q.push([a[0]+(c[0]-a[0])*j/k,a[1]+(c[1]-a[1])*j/k]);}
  const sides=q.map((v,i)=>{const d1=unit(v[0]-(q[i-1]||v)[0],v[1]-(q[i-1]||v)[1]),d2=unit((q[i+1]||v)[0]-v[0],(q[i+1]||v)[1]-v[1]),a=i?d1:d2,c=q[i+1]?d2:d1,n1=[-a[1],a[0]],n2=[-c[1],c[0]],m=unit(n1[0]+n2[0],n1[1]+n2[1]),s=Math.min(1.6,1/Math.max(.1,m[0]*n1[0]+m[1]*n1[1]))*width/2;
   const l=[v[0]+m[0]*s,v[1]+m[1]*s],r=[v[0]-m[0]*s,v[1]-m[1]*s];return [[l[0],ground(...l)+lift,l[1]],[r[0],ground(...r)+lift,r[1]],[v[0],ground(...v)+lift,v[1]]];});
  for(let i=0;i<q.length-1;i++){const [l0,r0,c0]=sides[i],[l1,r1,c1]=sides[i+1],b=bucket(...q[i]);
   if(Math.abs(c0[1]-(l0[1]+r0[1])/2)>.04||Math.abs(c1[1]-(l1[1]+r1[1])/2)>.04){Q(b,l0,c0,c1,l1,colour);Q(b,c0,r0,r1,c1,colour);}else Q(b,l0,r0,r1,l1,colour);}}
 for(const w of S.ways||[]){
  const width=w.w,hw=width/2,lift=WAY_LIFT[w.k]||.09,colour=SURFACE[w.s]||WAY_COLOUR[w.k]||'#9b9a92';
  // beyond the carriageway (the road surface's own heightAt) and not over a building
  for(const line of clip(w.p,(x,z)=>!onSurface(x,z)&&edge(x,z,6)>-KERB_BAND+.02&&!inBuilding(x,z)&&!skip(x,z,'way'),1,3)){
   const fitted=line.length>2?line:line;ribbon(fitted,width,colour,lift);count('ways');out.ways.push({k:w.k,p:fitted,w:width});
   if(w.k==='steps'){const len=lengthOf(fitted);walk(fitted,.85,(x,z,tx,tz)=>{const nx=-tz*hw,nz=tx*hw,y=ground(x,z)+lift+.012;Q(bucket(x,z),[x-nx,y,z-nz],[x+nx,y,z+nz],[x+nx+tx*.12,y,z+nz+tz*.12],[x-nx+tx*.12,y,z-nz+tz*.12],'#8e8a7e');});}
   for(let i=0;i<fitted.length-1;i++){obstacle(fitted[i],fitted[i+1],Math.max(width,1.4));leaveOpen(fitted[i],fitted[i+1],hw,treeWays);if(width>=1.5&&w.k!=='steps')leaveOpen(fitted[i],fitted[i+1],hw);}}}
 const offWays=(x,z,m)=>{for(const [a,b,h] of treeWays.get(Math.floor(x/12)*65536+Math.floor(z/12))||[])if(projectPoint([x,z],a,b).distance<h+m)return false;return true;};
 const wayGap=(x,z)=>{let best=1e9;for(const [a,b,h] of wayGrid.get(Math.floor(x/12)*65536+Math.floor(z/12))||[])best=Math.min(best,projectPoint([x,z],a,b).distance-h);return best;};

 lap('ways');
 // ---- Barriers ------------------------------------------------------------------------------------------------------------------------------
 function drawBarrier(k,t,line,h,colour,meta){
  const dummy=line[0],key=hash(dummy[0],dummy[1],1);
  if(k==='fence'){
   if(t==='picket'){const c=colour||PICKET[Math.floor(key*PICKET.length)],dark='#'+new T.Color(c).multiplyScalar(.78).getHexString();
    walk(line,.6,(x,z,tx,tz)=>{const y=ground(x,z),b=bucket(x,z),w=.1,hh=h*(.93+.07*hash(x,z,2));Q(b,[x-tx*w,y-.02,z-tz*w],[x+tx*w,y-.02,z+tz*w],[x+tx*w,y+hh,z+tz*w],[x-tx*w,y+hh,z-tz*w],c);});
    for(const p of samples(line,3))post2(bucket(p.x,p.z),p.x,p.y-.02,p.z,.06,h*1.03,dark);}
   else if(t==='board'){const c=colour||['#9a7a55','#7a5a42','#b09068'][Math.floor(key*3)],ps=samples(line,2.2);
    for(let i=0;i<ps.length-1;i++){const a=ps[i],d=ps[i+1],b=bucket(a.x,a.z),v=1+.05*(hash(a.x,a.z,3)-.5);Q(b,[a.x,a.y-.05,a.z],[d.x,d.y-.05,d.z],[d.x,d.y+h,d.z],[a.x,a.y+h,a.z],'#'+new T.Color(c).multiplyScalar(v).getHexString());}
    for(const p of ps)post2(bucket(p.x,p.z),p.x,p.y-.05,p.z,.08,h+.08,'#5a4334');}
   else if(t==='mesh'||t==='glass'){const c=colour||(t==='glass'?'#bcd6dc':'#9aa4a1'),ps=samples(line,3);
    for(let i=0;i<ps.length-1;i++){const a=ps[i],d=ps[i+1],b=bucket(a.x,a.z);Q(b,[a.x,a.y+.05,a.z],[d.x,d.y+.05,d.z],[d.x,d.y+h,d.z],[a.x,a.y+h,a.z],c);Q(b,[a.x,a.y+h-.05,a.z],[d.x,d.y+h-.05,d.z],[d.x,d.y+h+.03,d.z],[a.x,a.y+h+.03,a.z],'#6d7574');}
    for(const p of ps)post2(bucket(p.x,p.z),p.x,p.y-.05,p.z,.06,h+.06,'#6d7574');}
   else{ // rail, wire
    const wire=t==='wire',c=colour||(wire?'#8d8a82':'#4a5258'),ps=samples(line,wire?6:3);
    for(const p of ps)post2(bucket(p.x,p.z),p.x,p.y-.05,p.z,wire?.05:.055,h+.04,wire?'#7b6a52':c);
    for(let i=0;i<ps.length-1;i++)for(const f of wire?[.45,.95]:[.3,.97]){const a=ps[i],d=ps[i+1],b=bucket(a.x,a.z),e=wire?.015:.04;Q(b,[a.x,a.y+h*f-e,a.z],[d.x,d.y+h*f-e,d.z],[d.x,d.y+h*f+e,d.z],[a.x,a.y+h*f+e,a.z],c);}
    if(!wire)for(let i=0;i<ps.length-1;i++){const a=ps[i],d=ps[i+1],b=bucket(a.x,a.z);Q(b,[a.x,a.y+h*.63-.03,a.z],[d.x,d.y+h*.63-.03,d.z],[d.x,d.y+h*.63+.03,d.z],[a.x,a.y+h*.63+.03,a.z],c);}}
  }else if(k==='hedge'){
   const ps=samples(line,1.7),c0=['#3f6f3b','#487a40','#547f3f','#3a6635'][Math.floor(key*4)],top=ps.map((p,i)=>p.y+h*(.88+.22*hash(p.x,p.z,4))),half=.46;
   const n=ps.map((p,i)=>{const a=ps[Math.max(0,i-1)],d=ps[Math.min(ps.length-1,i+1)],[tx,tz]=unit(d.x-a.x,d.z-a.z);return [-tz,tx];});
   for(let i=0;i<ps.length-1;i++){const a=ps[i],d=ps[i+1],na=n[i],nd=n[i+1],b=bucket(a.x,a.z),v=1+.12*(hash(a.x,a.z,5)-.5),c='#'+new T.Color(c0).multiplyScalar(v).getHexString(),ct='#'+new T.Color(c0).multiplyScalar(v*1.14).getHexString();
    const L=(p,nn,s,y)=>[p.x+nn[0]*s,y,p.z+nn[1]*s];
    Q(b,L(a,na,half,a.y-.05),L(d,nd,half,d.y-.05),L(d,nd,half*.72,top[i+1]),L(a,na,half*.72,top[i]),c);
    Q(b,L(a,na,-half,a.y-.05),L(d,nd,-half,d.y-.05),L(d,nd,-half*.72,top[i+1]),L(a,na,-half*.72,top[i]),c);
    Q(b,L(a,na,half*.72,top[i]),L(d,nd,half*.72,top[i+1]),L(d,nd,-half*.72,top[i+1]),L(a,na,-half*.72,top[i]),ct);}
  }else if(k==='wall'||k==='retaining'){
   const c=colour||(t==='stone'?['#8d897d','#9a9688','#7f7b70'][Math.floor(key*3)]:['#b9b8b0','#aaa9a1','#c2c1b9'][Math.floor(key*3)]),cap=t==='stone'?'#a8a497':'#cfcec6',ps=samples(line,3);
   for(let i=0;i<ps.length-1;i++){const a=ps[i],d=ps[i+1],b=bucket(a.x,a.z),[tx,tz]=unit(d.x-a.x,d.z-a.z),hw=.17;
    Q(b,[a.x,a.y-.3,a.z],[d.x,d.y-.3,d.z],[d.x,d.y+h,d.z],[a.x,a.y+h,a.z],'#'+new T.Color(c).multiplyScalar(1+.06*(hash(a.x,a.z,6)-.5)).getHexString());
    Q(b,[a.x-tz*hw,a.y+h+.01,a.z+tx*hw],[d.x-tz*hw,d.y+h+.01,d.z+tx*hw],[d.x+tz*hw,d.y+h+.01,d.z-tx*hw],[a.x+tz*hw,a.y+h+.01,a.z-tx*hw],cap);}
  }else if(k==='noise'){
   const c=colour||(t==='glass'?'#b9d6dc':t==='concrete'?'#b3b2aa':t==='metal'?'#8a9290':'#a58659'),ps=samples(line,2.5),cap=t==='timber'?'#5e4632':'#8a8d8a';
   for(let i=0;i<ps.length-1;i++){const a=ps[i],d=ps[i+1],b=bucket(a.x,a.z),[tx,tz]=unit(d.x-a.x,d.z-a.z),hw=.08,v=1+.07*(hash(a.x,a.z,7)-.5);
    Q(b,[a.x,a.y-.15,a.z],[d.x,d.y-.15,d.z],[d.x,d.y+h,d.z],[a.x,a.y+h,a.z],'#'+new T.Color(c).multiplyScalar(v).getHexString());
    Q(b,[a.x-tz*hw,a.y+h+.01,a.z+tx*hw],[d.x-tz*hw,d.y+h+.01,d.z+tx*hw],[d.x+tz*hw,d.y+h+.01,d.z-tx*hw],[a.x+tz*hw,a.y+h+.01,a.z-tx*hw],cap);}
   if(t==='glass')for(const p of ps)post2(bucket(p.x,p.z),p.x,p.y-.1,p.z,.06,h+.05,'#6d7574');
  }else if(k==='guardrail'){
   const ps=samples(line,2),steel=meta&&meta.post==='stål',pc=steel?'#8f9695':'#8a6a47',c=colour||'#b2b8b7';
   for(const p of ps)post(bucket(p.x,p.z),p.x,p.y-.05,p.z,.07,h*.98,pc);
   for(let i=0;i<ps.length-1;i++){const a=ps[i],d=ps[i+1],b=bucket(a.x,a.z);
    if(t==='tube'){for(const f of [.66,.93])Q(b,[a.x,a.y+h*f-.05,a.z],[d.x,d.y+h*f-.05,d.z],[d.x,d.y+h*f+.05,d.z],[a.x,a.y+h*f+.05,a.z],c);}
    else Q(b,[a.x,a.y+h*.62,a.z],[d.x,d.y+h*.62,d.z],[d.x,d.y+h*1.02,d.z],[a.x,a.y+h*1.02,a.z],c);}
  }
 }
 const GAPS=new Set(['fence','hedge','wall','retaining']);
 for(const b of S.barriers||[]){
  const th=THICK[b.k]||.2;
  let lines=fitPath(b.p,th/2+.3-PATH_GAP,idx);
  if(!lines.length)continue;
  for(let line of lines){
   for(const run of clip(line,(x,z)=>clearOfRoad(x,z)&&(!GAPS.has(b.k)||wayGap(x,z)>.3)&&!(b.k!=='noise'&&b.k!=='guardrail'&&b.k!=='retaining'&&inBuilding(x,z)),1,2.5)){
    const n0=nTri,m0=lengthOf(run);drawBarrier(b.k,b.t,run,b.h,b.c,b);count(b.k);(out.kindTris[b.k+':'+b.t]??=[0,0]);out.kindTris[b.k+':'+b.t][0]+=nTri-n0;out.kindTris[b.k+':'+b.t][1]+=m0;out.barriers.push({k:b.k,t:b.t,p:run,h:b.h,o:b.o});
    for(let i=0;i<run.length-1;i++)obstacle(run[i],run[i+1],Math.max(th,.6));}}}

 lap('barriers');
 // ---- Furniture -----------------------------------------------------------------------------------------------------------------------------
 const stops=(data.stops||[]).map(s=>s.p);
 const L=(x,z,ang)=>(u,v)=>[x+u*Math.cos(ang)+v*Math.sin(ang),z-u*Math.sin(ang)+v*Math.cos(ang)]; // local (u along, v across) to world
 function bench(x,z,ang){const b=bucket(x,z),y=ground(x,z),l=L(x,z,ang),part=(u,v,yy,wx,wy,wz,c)=>{const [px,pz]=l(u,v);bx(b,px,y+yy,pz,wx,wy,wz,c,ang);};
  part(0,0,.46,1.7,.07,.46,'#8b6a47');part(0,-.2,.78,1.7,.42,.06,'#8b6a47');part(-.7,0,.22,.08,.44,.42,'#3b4043');part(.7,0,.22,.08,.44,.42,'#3b4043');}
 function bin(x,z){const b=bucket(x,z),y=ground(x,z);pole(b,x,y,z,.22,.2,.85,6,'#3f5a4b');pole(b,x,y+.85,z,.23,.23,.05,6,'#2a2f2d');}
 function postbox(x,z,ang){const b=bucket(x,z),y=ground(x,z);bx(b,x,y+.6,z,.42,1.2,.36,'#c4252a',ang);bx(b,x,y+1.22,z,.46,.07,.4,'#2b2b2b',ang);}
 function recycling(x,z,ang){const b=bucket(x,z),y=ground(x,z),l=L(x,z,ang);[['#3d7d4a',-1.3],['#2f5f9f',0],['#7e8689',1.3]].forEach(([c,u])=>{const [px,pz]=l(u,0);bx(b,px,y+.7,pz,1.05,1.4,1.05,c,ang);bx(b,px,y+1.43,pz,1.1,.06,1.1,'#2a2f2d',ang);});}
 function picnic(x,z,ang){const b=bucket(x,z),y=ground(x,z),l=L(x,z,ang),part=(u,v,yy,wx,wy,wz,c)=>{const [px,pz]=l(u,v);bx(b,px,y+yy,pz,wx,wy,wz,c,ang);};
  part(0,0,.76,1.9,.06,.8,'#8b6a47');part(0,.62,.46,1.9,.05,.28,'#8b6a47');part(0,-.62,.46,1.9,.05,.28,'#8b6a47');part(-.7,0,.38,.08,.76,.9,'#6e5238');part(.7,0,.38,.08,.76,.9,'#6e5238');}
 function bicycle(x,z,ang){const b=bucket(x,z),y=ground(x,z),l=L(x,z,ang);for(let i=-1;i<=1;i+=.5){const [px,pz]=l(0,i*.9);bx(b,px,y+.4,pz,.04,.8,.04,'#585f63',ang);bx(b,px,y+.8,pz,.04,.04,.4,'#585f63',ang);}}
 function flagpole(x,z){const b=bucket(x,z),y=ground(x,z);pole(b,x,y,z,.09,.04,9,5,'#d9dcdc');const fy=y+8.6;Q(b,[x,fy,z],[x+1.9,fy+.02,z+.3],[x+1.9,fy-1.15,z+.3],[x,fy-1.15,z],'#c8202f');
  Q(b,[x+.5,fy-.02,z+.08],[x+.72,fy-.02,z+.11],[x+.72,fy-1.13,z+.11],[x+.5,fy-1.13,z+.08],'#fdfdfd');Q(b,[x,fy-.46,z],[x+1.9,fy-.44,z+.3],[x+1.9,fy-.68,z+.3],[x,fy-.68,z],'#fdfdfd');
  Q(b,[x+.54,fy-.04,z+.085],[x+.68,fy-.04,z+.105],[x+.68,fy-1.11,z+.105],[x+.54,fy-1.11,z+.085],'#1c3f8f');Q(b,[x,fy-.51,z+.002],[x+1.9,fy-.49,z+.302],[x+1.9,fy-.63,z+.302],[x,fy-.63,z+.002],'#1c3f8f');}
 function mast(x,z,m,h0){const b=bucket(x,z),y=ground(x,z);
  if(m==='c'){const h=h0||24;for(let i=0;i<6;i++)pole(b,x,y+h/6*i,z,.44-.04*i*.9,.44-.04*(i+1)*.9,h/6,6,i%2?'#f2f2ee':'#c7332d');for(let i=0;i<3;i++){const a=i*2.094;bx(b,x+Math.cos(a)*.55,y+h-1.4,z+Math.sin(a)*.55,.25,1.4,.12,'#d9dcdc',-a);}}
  else{const h=h0||18;pole(b,x,y,z,.26,.15,h,6,'#8a9290');bx(b,x,y+h+.15,z,2.8,.3,.5,'#c9cbc4',.7);for(let i=-1;i<=1;i++)bx(b,x+Math.cos(.7)*i*.9,y+h-.05,z-Math.sin(.7)*i*.9,.7,.22,.36,'#f5f1d2',.7);}}
 // Power: a lattice tower (steel, about 27 m) with two cross arms across the line, conductors in catenaries between them
 const towers=[];
 function pylon(x,z,m){const b=bucket(x,z),y=ground(x,z),H=27,line=(S.power_lines||[]).map(l=>l.p).flatMap(p=>p.slice(1).map((q,i)=>[p[i],q])),near=line.map(([a,c])=>({q:projectPoint([x,z],a,c),t:unit(c[0]-a[0],c[1]-a[1])})).sort((a,c)=>a.q.distance-c.q.distance)[0],[tx,tz]=near&&near.q.distance<25?near.t:[1,0],ang=Math.atan2(-tz,tx);
  const leg=(sx,sz)=>{const x0=x+sx*2.4,z0=z+sz*2.4,x1=x+sx*.55,z1=z+sz*.55,c='#8c9598';for(const w of [.1]){const d=[[x0-w,z0-w],[x0+w,z0+w]],e=[[x1-w,z1-w],[x1+w,z1+w]];Q(b,[d[0][0],y-.3,d[0][1]],[d[1][0],y-.3,d[1][1]],[e[1][0],y+21,e[1][1]],[e[0][0],y+21,e[0][1]],c);Q(b,[d[0][0],y-.3,d[1][1]],[d[1][0],y-.3,d[0][1]],[e[1][0],y+21,e[0][1]],[e[0][0],y+21,e[1][1]],c);}};
  for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]])leg(sx,sz);
  for(const f of [.12,.4,.68,.95]){const w=2.4-(2.4-.55)*f,yy=y+21*f;for(const [ax,az,cx,cz] of [[-w,-w,w,-w],[w,-w,w,w],[w,w,-w,w],[-w,w,-w,-w]])Q(b,[x+ax,yy-.08,z+az],[x+cx,yy-.08,z+cz],[x+cx,yy+.08,z+cz],[x+ax,yy+.08,z+az],'#8c9598');}
  for(const side of [[1,1],[-1,-1],[1,-1],[-1,1]].slice(0,2))for(const f of [0,.27,.54,.8]){const w0=2.4-(2.4-.55)*f,w1=2.4-(2.4-.55)*(f+.27),y0=y+21*f,y1=y+21*(f+.27);for(const s of [1,-1])Q(b,[x+side[0]*w0,y0,z+side[1]*w0*s],[x+side[0]*w1,y1,z+side[1]*w1*-s],[x+side[0]*w1,y1+.06,z+side[1]*w1*-s],[x+side[0]*w0,y0+.06,z+side[1]*w0*s],'#8c9598');}
  const arm=(yy,len)=>{const a=[x-Math.cos(ang)*len,z+Math.sin(ang)*len],c=[x+Math.cos(ang)*len,z-Math.sin(ang)*len];for(const dy of [0,-.5])Q(b,[a[0],y+yy+dy,a[1]],[c[0],y+yy+dy,c[1]],[c[0],y+yy+dy+.22,c[1]],[a[0],y+yy+dy+.22,a[1]],'#8c9598');};
  arm(21,4.6);arm(24.5,3.4);pole(b,x,y+21,z,.55,.12,6,4,'#8c9598');
  const tips=[[-4.6,21],[4.6,21],[-3.4,24.5],[3.4,24.5]];towers.push({x,z,y,ang,tips:tips.map(([u,yy])=>[x+Math.cos(ang)*u,y+yy-.5,z-Math.sin(ang)*u])});}
 function wires(){ // between the pylons of each mapped line; the nodes of the line are the towers
  for(const l of S.power_lines||[]){const p=l.p;for(let i=0;i<p.length-1;i++){const a=towers.find(t=>Math.hypot(t.x-p[i][0],t.z-p[i][1])<6),c=towers.find(t=>Math.hypot(t.x-p[i+1][0],t.z-p[i+1][1])<6);if(!a||!c)continue;
   for(let k=0;k<4;k++){const A=a.tips[k],C=c.tips[k],span=Math.hypot(C[0]-A[0],C[2]-A[2]),n=Math.max(4,Math.round(span/12));let prev=null;
    for(let s=0;s<=n;s++){const t=s/n,x=A[0]+(C[0]-A[0])*t,z=A[2]+(C[2]-A[2])*t,y=A[1]+(C[1]-A[1])*t-span*.035*4*t*(1-t),cur=[x,y,z];
     if(prev){const b=bucket(x,z);Q(b,[prev[0],prev[1]-.07,prev[2]],[x,y-.07,z],[x,y+.07,z],[prev[0],prev[1]+.07,prev[2]],'#3d4244');Q(b,[prev[0]-.07,prev[1],prev[2]],[x-.07,y,z],[x+.07,y,z],[prev[0]+.07,prev[1],prev[2]],'#3d4244');}prev=cur;}
    out.power.push(span);}}}}
 // Playground equipment, at the middle of a playground area (or at a mapped playground node)
 function playground(x,z,ang,seed){const b=bucket(x,z),y=ground(x,z),l=L(x,z,ang),part=(u,v,yy,wx,wy,wz,c)=>{const [px,pz]=l(u,v);bx(b,px,y+yy,pz,wx,wy,wz,c,ang);},frame=['#3572b0','#d04a3a','#e0b030','#3f8f5a'][Math.floor(seed*4)];
  const kind=Math.floor(hash(x,z,8)*3);
  if(kind===0){for(const s of [-1,1]){for(const e of [-1,1]){const [px,pz]=l(s*1.2,e*.7),[qx,qz]=l(s*1.2,0);Q(b,[px,y,pz],[px+.06,y,pz],[qx+.04,y+2.2,qz],[qx,y+2.2,qz],frame);}}
   part(0,0,2.2,2.6,.1,.1,frame);for(const s of [-.5,.5]){part(s,0,1.2,.03,1.0,.03,'#555a5d');part(s,0,.7,.4,.05,.25,'#2b2f33');}}
  else if(kind===1){part(-1.3,0,.85,1.0,1.7,1.0,frame);part(-1.3,0,1.78,1.1,.08,1.1,'#d04a3a');const a=l(-.75,0),c=l(2.2,0);Q(b,[a[0],y+1.5,a[1]],[c[0],y+.15,c[1]],[c[0]-Math.sin(ang)*.45,y+.15,c[1]-Math.cos(ang)*.45],[a[0]-Math.sin(ang)*.45,y+1.5,a[1]-Math.cos(ang)*.45],'#e0b030');
   part(-.6,0,.7,.03,.03,.03,frame);}
  else{part(0,0,.12,2.6,.24,2.6,'#8b6a47');part(0,0,.25,2.4,.02,2.4,'#e0cf9a');part(1.6,0,.9,.9,1.8,.9,frame);part(1.6,0,1.85,1.0,.08,1.0,'#d04a3a');}}
 const placed=[];
 for(const f of S.furniture||[]){
  let [x,z]=f.p;
  if(f.k==='play'&&skip(x,z,'play'))continue; // schoolyard.js draws the equipment of the school grounds
  if(f.k==='bench'&&stops.some(s=>Math.hypot(s[0]-x,s[1]-z)<6))continue; // the bus shelters draw their own seats
  if(['mast','pylon'].includes(f.k)){if(f.k==='pylon'){pylon(x,z,f.m);count('pylon');out.furniture.push({k:f.k,p:[x,z]});}else{mast(x,z,f.m,f.h);count('mast');out.furniture.push({k:f.k,p:[x,z]});}continue;}
  const np=place(x,z,f.k==='picnic'?1.3:.5);if(!np||inBuilding(...np))continue;[x,z]=np;
  const r=nearRoad(x,z,14),ang=r&&r.d<14?Math.atan2(-(z-r.z),(x-r.x))+Math.PI/2+(hash(x,z,9)<.5?0:0):hash(x,z,10)*6.28;
  // a bench faces the road (its back to the other side): the local v axis points away from the road
  const face=r&&r.d<14?Math.atan2(-r.tz,r.tx):ang;
  switch(f.k){case 'bench':bench(x,z,face);break;case 'bin':bin(x,z);break;case 'postbox':postbox(x,z,face);break;case 'recycling':recycling(x,z,face);break;case 'picnic':picnic(x,z,hash(x,z,11)*3.14);break;case 'bicycle':bicycle(x,z,face);break;case 'flagpole':flagpole(x,z);break;case 'play':playground(x,z,hash(x,z,12)*3.14,hash(x,z,13));break;default:continue;}
  count(f.k);out.furniture.push({k:f.k,p:[x,z]});placed.push([x,z]);obstacle([x-.4,z],[x+.4,z],f.k==='picnic'||f.k==='recycling'||f.k==='play'?4.2:1.4);
 }
 wires();
 for(const a of data.areas){if(a.type!=='playground')continue;const p=a.p.slice(0,-1);let cx=0,cz=0;for(const [x,z] of p){cx+=x;cz+=z;}cx/=p.length;cz/=p.length;let area=0;for(let i=0;i<p.length;i++)area+=p[i][0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*p[i][1];area=Math.abs(area/2);
  if(area<80||!inRing(p,cx,cz)||inBuilding(cx,cz)||onSurface(cx,cz)||edge(cx,cz,10)<3||skip(cx,cz,'play'))continue;
  playground(cx,cz,hash(cx,cz,12)*3.14,hash(cx,cz,13));count('play');out.furniture.push({k:'play',p:[cx,cz]});block([cx-5,cz-5,cx+5,cz+5]);}

 lap('furniture');
 // ---- Parked cars: at the house end of some driveways, and on car parks that the map did not draw yet --------------------------------------------
 function car(x,z,ang,key){const b=bucket(x,z),y=ground(x,z),c=CARS[Math.floor(key*CARS.length)],l=L(x,z,ang);
  bx(b,x,y+.52,z,4.45,.62,1.8,c,ang);bx(b,x,y+.25,z,4.0,.3,1.72,'#1c1e20',ang);const [cx,cz]=l(-.15,0);bx(b,cx,y+1.02,cz,2.3,.46,1.6,'#27323a',ang);bx(b,cx,y+1.27,cz,2.15,.06,1.56,c,ang);}
 const carFits=(x,z,ang)=>{const l=L(x,z,ang);for(const [u,v] of [[-2.3,-1],[-2.3,1],[2.3,-1],[2.3,1],[0,0]]){const [px,pz]=l(u,v);if(onSurface(px,pz)||edge(px,pz,6)<.6||inBuilding(px,pz)||lakeAt(px,pz))return false;}return true;};
 for(const w of S.ways||[]){
  if(w.k!=='driveway'||w.w<2.6||hash(w.p[0][0],w.p[0][1],20)>.4)continue;
  const line=out.ways.find(o=>o.p[0][0]===w.p[0][0]&&o.p[0][1]===w.p[0][1]);if(!line||lengthOf(line.p)<7)continue;
  const p=line.p,da=nearRoad(...p[0],60),de=nearRoad(...p.at(-1),60),atEnd=(de?de.d:0)>(da?da.d:0),q=atEnd?p:p.slice().reverse(),n=q.length;
  let s=3.3,i=n-1,x=q[n-1][0],z=q[n-1][1],tx=0,tz=0;
  for(i=n-1;i>0;i--){const l=Math.hypot(q[i][0]-q[i-1][0],q[i][1]-q[i-1][1]);if(l>=s){const f=s/l;x=q[i][0]+(q[i-1][0]-q[i][0])*f;z=q[i][1]+(q[i-1][1]-q[i][1])*f;[tx,tz]=unit(q[i][0]-q[i-1][0],q[i][1]-q[i-1][1]);break;}s-=l;}
  if(!tx&&!tz)continue;const ang=Math.atan2(-tz,tx);if(!carFits(x,z,ang))continue;car(x,z,ang,hash(x,z,21));count('car');out.cars.push({p:[x,z],a:ang,at:'driveway'});obstacle([x-2,z],[x+2,z],3.4);
 }
 // car parks: a road-like surface, bay lines, cars on about half the bays
 const subdivide=(a,b,c,fn,max=5)=>{const e=[[a,b],[b,c],[c,a]],l=e.map(([p,q])=>Math.hypot(p[0]-q[0],p[1]-q[1])),m=Math.max(...l);if(m<=max){fn(a,b,c);return;}const i=l.indexOf(m),[p,q]=e[i],o=[c,a,b][i],mid=[(p[0]+q[0])/2,(p[1]+q[1])/2];subdivide(p,mid,o,fn,max);subdivide(mid,q,o,fn,max);};
 for(const lot of S.parking||[]){
  const p=lot.p;if(p.some(v=>onSurface(...v))||p.some(v=>inBuilding(...v)))continue;
  const pts=p.map(v=>new T.Vector2(v[0],v[1])),b0=bucket(p[0][0],p[0][1]);
  for(const f of T.ShapeUtils.triangulateShape(pts,[])){const P=f.map(i=>p[i]);subdivide(P[0],P[1],P[2],(a,c,d)=>{const Y=v=>[v[0],ground(v[0],v[1])+.07,v[1]];T3(bucket(a[0],a[1]),Y(a),Y(c),Y(d),'#777d7b');});}
  count('parking');
  let L0=0,ang=0;for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],l=Math.hypot(c[0]-a[0],c[1]-a[1]);if(l>L0){L0=l;ang=Math.atan2(-(c[1]-a[1]),c[0]-a[0]);}}
  const l=L(0,0,ang),inv=(x,z)=>[x*Math.cos(ang)-z*Math.sin(ang),x*Math.sin(ang)+z*Math.cos(ang)];
  let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(const [x,z] of p){const [u,v]=inv(x,z);u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);}
  const Pt=(u,v,lift)=>{const [x,z]=l(u,v);return [x,ground(x,z)+lift,z];};
  if(L0<14||v1-v0<11)continue;
  // bays of 2.6 x 5 m in back-to-back rows, an aisle of 6 m between each pair; a row is drawn where it lies inside the car park and off any road
  for(let v=v0+2.6;v<v1-2;v+=16)for(const rowV of [v,v+5.1])for(let u=u0+1.4;u<u1-1.4;u+=2.6){
   const [x,z]=l(u,rowV),[ax,az]=l(u,rowV-2.3),[bxx,bzz]=l(u,rowV+2.3);
   if(!inRing(p,x,z)||!inRing(p,ax,az)||!inRing(p,bxx,bzz)||onSurface(x,z)||inBuilding(x,z))continue;
   const b=bucket(x,z);Q(b,Pt(u-1.3-.05,rowV-2.45,.09),Pt(u-1.3+.05,rowV-2.45,.09),Pt(u-1.3+.05,rowV+2.45,.09),Pt(u-1.3-.05,rowV+2.45,.09),'#e9e9e1');
   if(hash(x,z,22)<.5&&carFits(x,z,ang-Math.PI/2)){car(x,z,ang-Math.PI/2,hash(x,z,23));count('car');out.cars.push({p:[x,z],a:ang-Math.PI/2,at:'parking'});}
  }
  block([Math.min(...p.map(q=>q[0]))-2,Math.min(...p.map(q=>q[1]))-2,Math.max(...p.map(q=>q[0]))+2,Math.max(...p.map(q=>q[1]))+2]);
 }
 lap('cars and car parks');
 // ---- Trees, last: they keep off everything above (index) ---------------------------------------------------------------------------------------
 const trees=addTrees({T,scene,data,ground,idx,segments:segs,clear,lakeAt,onSurface,offWays,inBuilding,density});
 lap('trees');out.timing.treesDetail=trees.timing;out.trees=trees.list;out.chunks=trees.chunks;out.counts.trees=trees.list.length;out.treeTriangles=trees.triangles;out.triangles=nTri;
 return out;
}
