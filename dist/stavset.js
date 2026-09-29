import {drawSign,createFacades} from './munkvoll.js';
import {addBuildingRoof} from './building-roofs.js';
// Bunnpris Ugla at Odd Husbys veg and Stavset senter with Rema 1000, at the far end of the detour south. Footprints,
// car parks and aisles are OSM (add-stavset.py); forms, colours and signs follow the user's photographs, listed with
// their uncertainty in docs/stavset-references.md. Dimensions are visual estimates.

// A plane with a canvas picture on it, facing along normal (x, z).
function picture(T,scene,name,at,normal,w,h,draw,cw=1024,ch=Math.max(64,Math.round(cw*h/w))){
 const c=document.createElement('canvas');c.width=cw;c.height=ch;const q=c.getContext('2d');q.clearRect(0,0,cw,ch);draw(q,cw,ch);
 const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=4;
 const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide,transparent:true}));
 m.name=name;m.position.set(...at);m.rotation.y=Math.atan2(normal[0],normal[1]);scene.add(m);return m;}
// Bunnpris' shop letters: bold yellow capitals with a black outline and shadow, as on both of its signs.
const bunnprisLetters=(q,w,h)=>{q.font=`900 ${Math.round(h*.78)}px "Arial Black", Arial, sans-serif`;q.textAlign='center';q.textBaseline='middle';q.lineJoin='round';
 q.fillStyle='#161616';q.fillText('BUNNPRIS',w/2+h*.05,h*.56,w*.94);q.strokeStyle='#161616';q.lineWidth=h*.13;q.strokeText('BUNNPRIS',w/2,h*.52,w*.94);q.fillStyle='#ffd21c';q.fillText('BUNNPRIS',w/2,h*.52,w*.94);};
// The REMA 1000 logo, drawn after the chain's own: rounded red REMA and blue 1000 on white.
export const REMA_RED='#d71f2e',REMA_BLUE='#023ea5';
const remaLogo=(q,w,h)=>{q.fillStyle='#ffffff';q.beginPath();q.roundRect(0,0,w,h,h*.18);q.fill();q.font=`900 ${Math.round(h*.7)}px "Arial Black", Arial, sans-serif`;q.textBaseline='middle';q.textAlign='right';
 q.lineJoin='round';q.lineWidth=h*.06;q.fillStyle=q.strokeStyle=REMA_RED;q.strokeText('REMA',w*.545,h*.55,w*.5);q.fillText('REMA',w*.545,h*.55,w*.5);
 q.textAlign='left';q.fillStyle=q.strokeStyle=REMA_BLUE;q.strokeText('1000',w*.585,h*.55,w*.38);q.fillText('1000',w*.585,h*.55,w*.38);};

// ----- Bunnpris Ugla (OSM 1037053709; the old house behind it is 191198632) ------------------------------------------
// A single-storey white shop with a black gable roof and dark red trim. The gable faces Odd Husbys veg, the road south
// to Stavset: big yellow BUNNPRIS letters, the black opening-hours board and a yellow poster. The roof runs on over the
// entrance on the car park side as a canopy on red posts. Frame: u along the long side (south-east, from the gable),
// v across (south-west, from the car park side).
const BP={o:[468.4,494.5],u:[.7359,.677],len:16.5,wid:11.2,eave:3.35,ridgeV:4.1,rise:3,canopy:[-3.6,9.6]};
export const bunnprisFrame=BP;
function addBunnpris({T,scene,height,bucket,tri,quad,box}){
 const {o,u:[ux,uz],len,wid,eave,ridgeV,rise}=BP,vx=-uz,vz=ux,[cv,cu]=BP.canopy;
 const at=(u,v,h)=>[o[0]+ux*u+vx*v,h,o[1]+uz*u+vz*v],ground=(u,v)=>height(o[0]+ux*u+vx*v,o[1]+uz*u+vz*v),b=bucket(...[at(8,5,0)[0],at(8,5,0)[2]]);
 const y=ground(8,-3.5)+.12,half=ridgeV-cv,roofY=v=>y+eave+rise*Math.max(0,1-Math.abs(v-ridgeV)/half),top=wid+.5;
 const WHITE='#efeee7',BOARDS='#d9d6cc',RED='#8a2525',ROOF='#2c2f31',GLASS='#34464c';
 // Walls: white render up to 3.4 m, light boards in the gables, up to the underside of the roof.
 function wall(a,c,col=WHITE){const [au,av]=a,[cu2,cv2]=c,cuts=[0,1],f=(ridgeV-av)/(cv2-av);if(cv2!==av&&f>0&&f<1)cuts.splice(1,0,f);
  for(let i=1;i<cuts.length;i++){const p=cuts[i-1],q=cuts[i],u0=au+(cu2-au)*p,v0=av+(cv2-av)*p,u1=au+(cu2-au)*q,v1=av+(cv2-av)*q;
   quad(b,at(u0,v0,Math.min(ground(u0,v0),y)-.4),at(u1,v1,Math.min(ground(u1,v1),y)-.4),at(u1,v1,y+.3),at(u0,v0,y+.3),'#b9b8b0');
   quad(b,at(u0,v0,y+.3),at(u1,v1,y+.3),at(u1,v1,y+3.4),at(u0,v0,y+3.4),col);
   if(roofY(v0)>y+3.4||roofY(v1)>y+3.4)quad(b,at(u0,v0,y+3.4),at(u1,v1,y+3.4),at(u1,v1,Math.max(y+3.4,roofY(v1))),at(u0,v0,Math.max(y+3.4,roofY(v0))),BOARDS);}}
 wall([0,0],[0,wid]);wall([0,wid],[len,wid]);wall([len,wid],[len,0]);wall([len,0],[0,0]);
 for(let h=y+3.6;h<y+eave+rise-.1;h+=.24){const k=half*(1-(h-y-eave)/rise)-.05,va=Math.max(0,ridgeV-k),vb=Math.min(wid,ridgeV+k);if(vb-va>.1)quad(b,at(-.03,va,h),at(-.03,vb,h),at(-.03,vb,h+.025),at(-.03,va,h+.025),'#b8b4a8');} // board joints in the gable
 // Roof: the car park side reaches out over the entrance canopy, then ends at a short eave; 0.4 m over the gable.
 const plane=(u0,u1,v0,v1)=>quad(b,at(u0,v0,roofY(v0)),at(u1,v0,roofY(v0)),at(u1,v1,roofY(v1)),at(u0,v1,roofY(v1)),ROOF);
 plane(-.4,cu,cv,ridgeV);plane(cu,len,-.6,ridgeV);plane(-.4,len,ridgeV,top);
 const trim=(a,c)=>{const t=.28;quad(b,at(...a,roofY(a[1])+.05),at(...c,roofY(c[1])+.05),at(...c,roofY(c[1])-t),at(...a,roofY(a[1])-t),RED);};
 trim([-.42,cv],[-.42,ridgeV]);trim([-.42,ridgeV],[-.42,top]);trim([-.4,cv],[cu,cv]);trim([cu,cv],[cu,-.6]);trim([cu,-.6],[len,-.6]);trim([-.4,top],[len,top]);
 // Canopy ceiling, two red posts, and the corner post at the gable.
 quad(b,at(0,cv+.1,y+eave-.12),at(cu,cv+.1,y+eave-.12),at(cu,0,y+eave-.12),at(0,0,y+eave-.12),'#f1efe8');
 for(const pu of [.25,cu-.3]){const [x,,z]=at(pu,cv+.25,0),g=ground(pu,cv+.25);box(b,x,(g+y+eave)/2,z,.26,y+eave-g,.26,'#9c2a26');}
 // Entrance under the canopy: glass doors with a shutter box, the rest of the long side with the chain's yellow posters.
 const face=(u0,u1,h0,h1,col,off=-.06)=>quad(b,at(u0,off,y+h0),at(u1,off,y+h0),at(u1,off,y+h1),at(u0,off,y+h1),col);
 face(3.4,6.6,0,2.55,'#8d9290');face(3.55,6.45,.05,2.45,GLASS,-.09);face(4.98,5.02,.05,2.45,'#8d9290',-.11);face(3.3,6.7,2.6,3.05,'#a4a7a5',-.14);
 for(const [u0,u1] of [[7.2,8.4],[10.3,11.5],[11.9,13.1],[13.5,14.7]]){face(u0,u1,.9,2.55,'#151515');face(u0+.07,u1-.07,.97,2.48,'#f3cb18',-.08);face(u0+.3,u1-.3,1.35,1.9,'#1b1b1b',-.1);}
 // Gable: letters, the black board with the opening hours (every day until 22), and the yellow dinner poster.
 const gable=[-ux,-uz];
 picture(T,scene,'BUNNPRIS',at(-.14,4.4,y+4.25),gable,5.4,1.05,bunnprisLetters);
 picture(T,scene,'Man-Fre 9-22 Lørdag 10-22 Søndag 10-22',at(-.12,4.6,y+3.62),gable,4.7,.5,(q,w,h)=>{q.fillStyle='#1d1f20';q.fillRect(0,0,w,h);q.textBaseline='middle';q.fillStyle='#f4f4f0';q.font=`bold ${h*.5}px Arial`;q.textAlign='left';
  q.fillText('Man-Fre 9-22   Lørdag 10-22',w*.04,h*.55,w*.66);q.fillStyle='#f0f0ea';q.fillRect(w*.73,h*.1,w*.25,h*.8);q.fillStyle='#e0245e';q.font=`bold ${h*.42}px Arial`;q.textAlign='center';q.fillText('SØNDAG 10-22',w*.855,h*.55,w*.23);});
 picture(T,scene,'Billig middag hver dag',at(-.1,7.2,y+1.95),gable,6.2,1.7,(q,w,h)=>{q.fillStyle='#f6cf19';q.fillRect(0,0,w,h);q.fillStyle='#1c1c1c';q.font=`900 ${h*.2}px Arial`;q.textAlign='left';q.textBaseline='middle';q.fillText('BILLIG',w*.04,h*.25);q.fillText('MIDDAG',w*.04,h*.47);q.font=`bold ${h*.12}px Arial`;q.fillText('HVER DAG',w*.04,h*.66);
  for(let i=0;i<4;i++){const cx=w*(.36+i*.155);q.fillStyle='#ffffff';q.fillRect(cx-w*.06,h*.14,w*.12,h*.5);q.fillStyle='#1c1c1c';q.beginPath();q.arc(cx+w*.035,h*.72,h*.13,0,Math.PI*2);q.fill();q.fillStyle='#f6cf19';q.font=`900 ${h*.13}px Arial`;q.textAlign='center';q.fillText('25,-',cx+w*.035,h*.73);}},512);
 // The smaller sign on the roof in front of the old house, facing the car park.
 const [sx,,sz]=at(13.4,-.35,0);picture(T,scene,'BUNNPRIS (tak)',[sx,roofY(-.35)+.62,sz],[-vx,-vz],3.3,.72,bunnprisLetters);box(b,sx,roofY(-.35)+.1,sz,2.8,.35,.12,'#3a3a3a',Math.atan2(-uz,ux));
 // Under the canopy: post box, bins, trolleys, the flower rack and the yellow "open on Sunday" board.
 const stand=(u,v,w,h,d,col,lift=0)=>{const [x,,z]=at(u,v,0),g=ground(u,v);box(b,x,Math.max(g,y-.12)+lift+h/2,z,w,h,d,col,Math.atan2(-uz,ux));};
 stand(8.6,-.45,.55,1.25,.5,'#d4231c');stand(9.2,-3.95,.62,1.05,.62,'#2d3132');stand(-1.2,-2.4,.62,1.05,.62,'#2d3132');
 for(let k=0;k<5;k++)stand(10.6+k*.35,-2.1,.1,1,.9,'#9ea4a6');
 for(const [k,h] of [[0,.1],[1,.6],[2,1.1]]){stand(1.1,-2.6,1.3,.06,.5,'#7d8386',h);for(let i=0;i<4;i++)stand(.66+i*.29,-2.6,.24,.34,.24,['#d9467a','#f0a0b8','#c8325a','#e8e0e4'][(i+k)%4],h+.06);} // flower rack
 for(const du of [.5,1.7])stand(du,-2.6,.05,1.35,.5,'#7d8386');
 stand(10.2,-4.6,.9,1.2,.12,'#f5cf1b');const [ax,,az]=at(10.2,-4.68,0);picture(T,scene,'Åpent søndag',[ax,Math.max(ground(10.2,-4.6),y-.12)+.8,az],[-vx,-vz],.62,.62,(q,w,h)=>{q.fillStyle='#e3262f';q.beginPath();q.arc(w/2,h/2,w*.46,0,Math.PI*2);q.fill();q.fillStyle='#fff';q.font=`bold ${w*.17}px Arial`;q.textAlign='center';q.textBaseline='middle';q.fillText('ÅPENT',w/2,h*.4);q.fillText('SØNDAG',w/2,h*.62);},128);
 const xs=[],zs=[];for(const [uu,vv] of [[-2,-5],[len+1,-5],[len+1,top+1],[-2,top+1]]){const [x,,z]=at(uu,vv,0);xs.push(x);zs.push(z);}
 return {bounds:[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)]};
}

// ----- Stavset senter (OSM 89061195) with Rema 1000 --------------------------------------------------------------------
// One storey of light render with blue trim and a low grey hipped metal roof (user's photo 4). Rema 1000's entrance
// (photo 3) is a tall black block in the middle of the south front: big white STAVSET SENTER letters on top, a white
// portal, and the REMA 1000 logo over the doors. Glazed shop fronts along the car park, with the bakery, the pharmacy,
// the hairdresser and the florist named where OSM puts them. Frame: u along the front (east), v out of it (south).
const SS={o:[134.5,1358.86],u:[.9798,-.1998],wall:5.4,rema:[5,8]}; // rema: footprint points 5..8 are the entrance front
export const senterFrame=SS;
function addSenter({T,scene,building,height,bucket,tri,quad,box}){
 let p=building.p.slice(0,-1);const [r0,r1]=SS.rema,A=p[r0],C=p[r1];p=[...p.slice(0,r0+1),...p.slice(r1)]; // straight Rema front
 const [ux,uz]=SS.u,nx=-uz,nz=ux,H=SS.wall;
 const cx=p.reduce((s,v)=>s+v[0],0)/p.length,cz=p.reduce((s,v)=>s+v[1],0)/p.length,b=bucket(cx,cz);
 const y=height((A[0]+C[0])/2+nx*3,(A[1]+C[1])/2+nz*3)+.12; // floor level with the car park at the entrance
 const inside=(x,z)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [ax,az]=p[j],[bx,bz]=p[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
 const WHITE='#eceeea',BLUE='#1f58b0',GLASS='#3a4d57';
 const edges=[];
 for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<.2)continue;const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;let ox=-dz,oz=dx;
  if(inside((a[0]+c[0])/2+ox*.3,(a[1]+c[1])/2+oz*.3)){ox=-ox;oz=-oz;}const at=(d,h,o=0)=>[a[0]+dx*d+ox*o,h,a[1]+dz*d+oz*o];edges.push({a,c,len,dx,dz,ox,oz,at,rema:a===A});}
 for(const e of edges){const {a,c,len,at}=e;
  quad(b,[a[0],Math.min(height(...a),y)-.5,a[1]],[c[0],Math.min(height(...c),y)-.5,c[1]],[c[0],y+.3,c[1]],[a[0],y+.3,a[1]],'#a9aca6');
  if(e.rema)continue;quad(b,at(0,y+.3),at(len,y+.3),at(len,y+H),at(0,y+H),WHITE);
  quad(b,at(0,y+H-.55,.06),at(len,y+H-.55,.06),at(len,y+H,.06),at(0,y+H,.06),BLUE);
  for(let d=3;d<len-1;d+=7)quad(b,at(d-.18,y+.3,.07),at(d+.18,y+.3,.07),at(d+.18,y+H-.55,.07),at(d-.18,y+H-.55,.07),BLUE);
  // Shop fronts towards the car park: glass in blue frames under a white band.
  if(e.oz>.55&&len>2.5){for(let d=.6;d<len-.8;d+=1.6){const w=Math.min(1.45,len-.6-d);quad(b,at(d,y+.35,.08),at(d+w,y+.35,.08),at(d+w,y+3.05,.08),at(d,y+3.05,.08),GLASS);quad(b,at(d+w,y+.35,.09),at(d+w+.12,y+.35,.09),at(d+w+.12,y+3.1,.09),at(d+w,y+3.1,.09),BLUE);}
   quad(b,at(.5,y+3.05,.09),at(len-.5,y+3.05,.09),at(len-.5,y+3.2,.09),at(.5,y+3.2,.09),BLUE);}
 }
 // Low hipped roof in grey metal over the whole centre, sealed to the walls.
 let area=0;for(let i=0;i<p.length;i++)area+=p[i][0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*p[i][1];
 addBuildingRoof({T,p,cx,cz,y,h:H,style:{roofShape:'hipped',roofRise:3.2},t:{},area:Math.abs(area/2),b,tri,quad,colour:WHITE,roofcolour:'#a7aeb1'});
 // Rema 1000's entrance: the black block, the white portal and the signs.
 const e=edges.find(x=>x.rema),{len,at,ox,oz}=e,angle=Math.atan2(-e.dz,e.dx),n=[ox,oz],H2=8.3;
 const blk=(d,h,o)=>at(d,h,o);
 quad(b,blk(0,y+.3),blk(len,y+.3),blk(len,y+H2),blk(0,y+H2),'#222629');
 for(const [d0,d1] of [[0,0],[len,len]]){quad(b,blk(d0,y+H,0),blk(d0,y+H,-1.2),blk(d0,y+H2,-1.2),blk(d0,y+H2,0),'#222629');}
 quad(b,blk(0,y+H2,0),blk(len,y+H2,0),blk(len,y+H2,-1.2),blk(0,y+H2,-1.2),'#2b2f32');quad(b,blk(0,y+H,-1.2),blk(len,y+H,-1.2),blk(len,y+H2,-1.2),blk(0,y+H2,-1.2),'#222629');
 drawSign(T,scene,'STAVSET SENTER',blk(len/2,y+7.05,.1),n,len-1.2,1.25,'#f3f3ef',null);
 // White portal: a beam out over the doors on two pillars, the left one leaning out as in the photo.
 const portal=(d,h,o)=>blk(d,h,o),bx=portal(len/2,y+5.05,1.45);box(b,bx[0],bx[1],bx[2],len-.4,.55,2.9,'#f4f5f2',angle);
 for(const [d,lean] of [[.55,.7],[len-.55,0]]){const lo=portal(d,y,2.35),hi=portal(d-lean,y+4.8,2.35);const t=.32;
  for(const s of [-1,1])quad(b,[lo[0]+e.dx*t*s,lo[1],lo[2]+e.dz*t*s],[hi[0]+e.dx*t*s,hi[1],hi[2]+e.dz*t*s],[hi[0]+e.dx*t*s+ox*.5,hi[1],hi[2]+e.dz*t*s+oz*.5],[lo[0]+e.dx*t*s+ox*.5,lo[1],lo[2]+e.dz*t*s+oz*.5],'#f4f5f2');
  quad(b,[lo[0]-e.dx*t,lo[1],lo[2]-e.dz*t],[lo[0]+e.dx*t,lo[1],lo[2]+e.dz*t],[hi[0]+e.dx*t,hi[1],hi[2]+e.dz*t],[hi[0]-e.dx*t,hi[1],hi[2]-e.dz*t],'#f4f5f2');}
 picture(T,scene,'REMA 1000',blk(len/2,y+3.95,.14),n,7.6,1.4,remaLogo);
 const pane=(d0,d1,h0,h1,col,o=.08)=>quad(b,blk(d0,y+h0,o),blk(d1,y+h0,o),blk(d1,y+h1,o),blk(d0,y+h1,o),col);
 pane(3.3,6.5,.3,2.7,'#1a1d1f');pane(3.45,6.35,.35,2.6,GLASS,.1);pane(4.88,4.92,.35,2.6,'#1a1d1f',.12);
 for(const [d0,d1] of [[.9,3],[6.9,len-.8]]){pane(d0,d1,.3,.95,REMA_BLUE,.1);pane(d0,d1,.95,2.9,GLASS,.1);for(let d=d0+1.2;d<d1-.2;d+=1.2)pane(d-.04,d+.04,.95,2.9,'#1a1d1f',.12);}
 picture(T,scene,'Bare lave priser',blk(len-3.6,y+.62,.13),n,2.6,.3,(q,w,h)=>{q.fillStyle='#fff';q.font=`bold ${h*.62}px Arial`;q.textAlign='center';q.textBaseline='middle';q.fillText('Bare lave priser',w/2,h*.55,w*.95);},256);
 // Granite blocks in front of the entrance (photo 3).
 for(const [d,o] of [[-2.2,4.4],[1.2,6.8],[4.8,7.4],[8.4,7],[12,5.2]]){const [x,,z]=blk(d,0,o);box(b,x,height(x,z)+.4,z,.9,.8,.9,'#b9b8b1',angle+.3);}
 // Shop signs along the front, where OSM puts the shops; a second REMA 1000 logo faces Byåsveien.
 const near=(x,z)=>edges.filter(k=>k.oz>.55&&!k.rema&&k.len>5).map(k=>{const t=Math.max(1.5,Math.min(k.len-1.5,(x-k.a[0])*k.dx+(z-k.a[1])*k.dz));const q=k.at(t,0);return {k,t,dist:Math.hypot(q[0]-x,q[2]-z)};}).sort((a,b)=>a.dist-b.dist)[0];
 for(const [name,x,z,fg,bg,w] of [['Byåsen Bakeri',143.9,1358.7,'#f6ecd4','#6b4a33',4.2],['APOTEK 1',165,1358,'#ffffff','#00843d',3.4],['FIINBECK & FIA',176.2,1347.6,'#303234','#f4f3ef',4.4],['MESTER GRØNN',192,1346,'#ffffff','#2f7d3a',4.2]]){
  const s=near(x,z);if(s)drawSign(T,scene,name,s.k.at(s.t,y+H-1.05,.16),[s.k.ox,s.k.oz],w,.62,fg,bg);}
 const back=edges.filter(k=>k.oz<-.6).sort((a,b)=>b.len-a.len)[0];
 if(back)picture(T,scene,'REMA 1000 (Byåsveien)',back.at(back.len/2,y+H-1.6,.16),[back.ox,back.oz],9,1.65,remaLogo);
 const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);
 return {bounds:[Math.min(...xs)-4,Math.min(...zs)-4,Math.max(...xs)+4,Math.max(...zs)+4]};
}

export function addStavset(args){const id=String(args.building.id);return id==='1037053709'?addBunnpris(args):id==='89061195'?addSenter(args):null;}

// Around the two shops: the goods door at Bunnpris, parking bays in both car parks, the trolley shelter at Stavset.
export function addStavsetDetails({T,scene,data,wallBase,height,bucket,quad,box,ribbon}){
 const wall=createFacades({data,wallBase,bucket,quad});
 const goods=wall('191198632',[486.2,501.9]);
 if(goods){goods.panel(goods.len/2,.02,2.9,2.7,'#dfe1dd',.08);for(let h=.35;h<2.7;h+=.45)goods.panel(goods.len/2,h,2.9,.04,'#b3b6b1',.1);drawSign(T,scene,'VAREMOTTAK',goods.at(goods.len/2+2.5,1.9,.12),goods.normal,1.1,.32,'#1d1d1d','#f4f4f0');}
 const road=id=>data.roads.find(r=>String(r.id)===id),area=id=>data.areas.find(a=>a.osm===id);
 const inRing=(ring,x,z)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
 // Bays 2.5 m wide and 5 m deep on both sides of an aisle, wherever they lie inside the car park.
 function bays(aisle,lot){if(!aisle||!lot)return;const p=aisle.p;for(let i=0;i<p.length-1;i++){const a=p[i],c=p[i+1],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<6)continue;const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;
  for(let d=1.5;d<=len-1.5;d+=2.5)for(const s of [-1,1]){const x0=a[0]+dx*d-dz*s*3,z0=a[1]+dz*d+dx*s*3,x1=x0-dz*s*5,z1=z0+dx*s*5;if(inRing(lot.p,x0,z0)&&inRing(lot.p,x1,z1))ribbon([[x0,z0],[x1,z1]],.12,'#e9eae3',.12);}}}
 bays(road('89061191'),area('w89061200'));bays(road('23390718'),area('w207829382'));
 // Trolley shelter at Stavset senter (OSM 1362384532): a blue arch over the trolleys.
 const tb=[[192.2,1368.8],[194.3,1368],[196,1372.4],[194,1373.2]],c=[(tb[0][0]+tb[2][0])/2,(tb[0][1]+tb[2][1])/2],b=bucket(...c),g=height(...c);
 const ax=(tb[3][0]-tb[0][0])/4.7,az=(tb[3][1]-tb[0][1])/4.7,bxv=(tb[1][0]-tb[0][0])/2.25,bzv=(tb[1][1]-tb[0][1])/2.25,pt=(s,t,h)=>[c[0]+ax*s+bxv*t,g+h,c[1]+az*s+bzv*t];
 for(let k=0;k<6;k++){const t0=-1.2+k*.48,t1=t0+.48,h=t=>2.1+.4*Math.cos(t/1.25*Math.PI/2);quad(b,pt(-2.4,t0,h(t0)),pt(2.4,t0,h(t0)),pt(2.4,t1,h(t1)),pt(-2.4,t1,h(t1)),'#2d62b8');}
 for(const s of [-2.3,2.3])for(const t of [-1.15,1.15]){const q=pt(s,t,1.05);box(b,q[0],q[1],q[2],.1,2.1,.1,'#2d62b8');}
 for(let s=-1.8;s<=1.8;s+=.5){const q=pt(s,0,.55);box(b,q[0],q[1],q[2],.42,.9,1.4,'#9ea4a6',Math.atan2(-az,ax));}
}

// Road bridges (OSM bridge=yes: Kystadbrua, and Dalgårdbrua, where Byåsveien crosses the Dalgård valley 16 m up): along the
// drawn centre line a concrete deck under the road, edge beams and a steel railing on both sides, and piers every 30 m
// down to the ground wherever the deck stands more than 3 m above it. The deck itself is the road surface (road-geometry.js).
export function addBridges({data,roadTop,roadWidth,bucket,quad,box,height,geometry}){
 const lines=geometry?geometry.roads.filter(g=>g.bridge).map(g=>({r:g.road,p:g.pts})):data.roads.filter(r=>r.bridge).map(r=>({r,p:r.p}));
 const piers=[];
 for(const {r,p} of lines){const hw=roadWidth(r)/2,w=hw+.35;let run=0,nextPier=14;
  for(let i=0;i<p.length-1;i++){const a=p[i],c=p[i+1],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<.01)continue;
   const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len,top=d=>roadTop(a[0]+dx*d,a[1]+dz*d),across=Math.atan2(-dx,-dz);
   const at=(d,s,o,h)=>[a[0]+dx*d-dz*s*o,top(d)+h,a[1]+dz*d+dx*s*o];
   for(let d=0;d<len;d+=4){const e=Math.min(len,d+4),bk=bucket(a[0]+dx*d,a[1]+dz*d);
    quad(bk,at(d,-1,w+.4,-1.4),at(e,-1,w+.4,-1.4),at(e,1,w+.4,-1.4),at(d,1,w+.4,-1.4),'#a3a69f'); // underside of the deck
    for(const s of [-1,1]){quad(bk,at(d,s,w,-.6),at(e,s,w,-.6),at(e,s,w,.35),at(d,s,w,.35),'#b3b5ae');quad(bk,at(d,s,w,.35),at(e,s,w,.35),at(e,s,w+.4,.35),at(d,s,w+.4,.35),'#c4c6bf');
     quad(bk,at(d,s,w+.4,-1.4),at(e,s,w+.4,-1.4),at(e,s,w+.4,.35),at(d,s,w+.4,.35),'#a9aba4');
     for(const h of [.8,1.15])quad(bk,at(d,s,w+.2,h),at(e,s,w+.2,h),at(e,s,w+.2,h+.07),at(d,s,w+.2,h+.07),'#8d9496');
     const q=at(d,s,w+.2,.78);box(bk,q[0],q[1],q[2],.08,.9,.08,'#8d9496');}}
   for(;nextPier<run+len;nextPier+=30){const d=nextPier-run,x=a[0]+dx*d,z=a[1]+dz*d,deck=top(d)-1.4;if(!height||deck-height(x,z)<3)continue;
    const bk=bucket(x,z);box(bk,x,deck-.4,z,2*w,.8,1.4,'#aeb0a9',across); // pier cap across the deck
    for(const s of [-1,1]){const px=x-dz*s*(hw-1.3),pz=z+dx*s*(hw-1.3),g=height(px,pz)-.6;box(bk,px,(g+deck-.8)/2,pz,1.2,deck-.8-g,1.2,'#b9bbb4',across);}
    piers.push([x,z]);}
   run+=len;}}
 return {piers};
}
