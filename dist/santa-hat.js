// The Santa hat (24 November 2026): all through December Sofia and every duck in the game wear one. The ducks are the big duck in Lianvannet (duck.js), the duck
// you drive as (rides.js), the small duck that runs after the car and the little yellow duckling that runs after it (duck-runner.js); Sofia (girl.js) wears hers
// in the house, in bed, at the table, in the hot-air balloon and on the spider. The hat is part of each model, so the ducks on the podium and in the dream wear it too.
// A red hat that stands up from a fluffy white brim and flops over at the top, with a white pompom at the tip that sways a little.
// When: from the device's own calendar, looked at every half minute, so it comes on at midnight on 1 December and goes at midnight on 1 January even if the game is
// left open. The address can decide instead, to see it on any day: ?jul=1 puts the hats on, ?jul=0 takes them off.
export const isDecember=(date=new Date())=>date.getMonth()===11;
let forced=null;
try{const v=new URLSearchParams(globalThis.location?.search||'').get('jul');if(v!==null)forced=v!=='0';}catch{}
let season=false,checked=-Infinity;
// Whether the hats are on now. setSantaSeason(true/false) decides for the tests; setSantaSeason(null) goes back to the calendar (and the address).
export function santaSeason(){const now=Date.now();if(now-checked>30000||now<checked){checked=now;season=forced??isDecember(new Date(now));}return season;}
export function setSantaSeason(on){forced=on==null?null:!!on;checked=-Infinity;}

// The hat's shape, in units of the brim's radius: a tube 2.4 long that starts straight up and bends over towards +x more and more (2.4 radians by the tip),
// narrowing from 0.86 at the brim to 0.14 at the tip. at(u) is the middle of the tube u of the way up, its direction and its radius.
const LENGTH=2.4,BEND=2.4,STEPS=24;
function at(u){let x=0,y=0;const n=40;for(let i=0;i<n;i++){const a=BEND*Math.pow((i+.5)/n*u,2.2);x+=Math.sin(a)*LENGTH*u/n;y+=Math.cos(a)*LENGTH*u/n;}
 const a=BEND*Math.pow(u,2.2);return {x,y,dx:Math.sin(a),dy:Math.cos(a),r:.86-.72*u};}
export const HAT_TIP=(({x,y})=>[x,y,0])(at(1));
let geometryCache=null;
function hatGeometry(T){if(geometryCache?.T===T)return geometryCache.g;const SIDES=18,pos=[],nor=[],idx=[];
 for(let i=0;i<=STEPS;i++){const u=i/STEPS,p=at(u);for(let j=0;j<=SIDES;j++){const v=j/SIDES*Math.PI*2,c=Math.cos(v),s=Math.sin(v),nx=p.dy*c,ny=-p.dx*c,nz=s; // the ring's own plane: across the bend (dy,−dx,0) and z
   pos.push(p.x+nx*p.r,p.y+ny*p.r,nz*p.r);nor.push(nx,ny,nz);}}
 for(let i=0;i<STEPS;i++)for(let j=0;j<SIDES;j++){const a=i*(SIDES+1)+j,b=a+SIDES+1;idx.push(a,a+1,b,a+1,b+1,b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setIndex(idx);
 g.computeBoundingSphere();geometryCache={T,g};return g;}

// Puts a hat on parent (a head group). at: the middle of the brim in the parent; size: the brim's radius in metres; tilt: [x, y, z] rotation of the hat (it stands up
// along +y); flop: which way the top falls over, as an angle round the hat (0 is towards +x, Math.PI/2 towards −z). update(time) puts the hat on in December and sways
// the top. Outside December the hat is taken off the head altogether, so it counts in no size or bounding box (the podium fits its models to their size).
export function addSantaHat(T,parent,{at:[x,y,z]=[0,0,0],size=.1,tilt=[0,0,0],flop=-Math.PI*3/4}={}){
 const group=new T.Group();group.name='Nisselue';group.position.set(x,y,z);group.rotation.set(tilt[0],tilt[1],tilt[2]);group.scale.setScalar(size);
 const red=new T.MeshStandardMaterial({color:'#dc2b33',roughness:.85}),fur=new T.MeshStandardMaterial({color:'#fbf8f1',roughness:1});
 const turn=new T.Group();turn.rotation.y=flop;group.add(turn);
 // The red hat, with its back side drawn too so the inside never shows as a hole. sway tips the whole of it a little.
 const sway=new T.Group();turn.add(sway);
 const hat=new T.Mesh(hatGeometry(T),red);hat.castShadow=true;sway.add(hat);red.side=T.DoubleSide;
 const pompom=new T.Mesh(new T.SphereGeometry(.3,12,10),fur);pompom.position.set(...HAT_TIP);pompom.castShadow=true;sway.add(pompom);
 // The brim: a fat white roll with a few tufts of fur round it.
 const brim=new T.Mesh(new T.TorusGeometry(.9,.2,10,28),fur);brim.rotation.x=Math.PI/2;brim.position.y=.05;brim.castShadow=true;group.add(brim);
 const tuft=new T.SphereGeometry(.17,8,6);for(let i=0;i<14;i++){const a=i/14*Math.PI*2,t=new T.Mesh(tuft,fur);t.position.set(Math.cos(a)*.96,.06+(i%2)*.05,Math.sin(a)*.96);group.add(t);}
 let shown=null;
 function update(time=0){const on=santaSeason();if(on!==shown){shown=on;if(on)parent.add(group);else parent.remove(group);}if(on)sway.rotation.z=-.05-Math.sin(time*1.8)*.05;}
 update(0);
 return {group,update,hat,pompom,brim,get on(){return group.parent===parent;}};
}
