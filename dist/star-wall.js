// The brushing stars after the chart (24 November 2026, the same as in the space game): there is no limit. The chart on the back wall has ten places; star 11
// and on spill out of it onto the back wall, the nearest places first, until that wall is full; then onto the side walls; then round after round in the gaps,
// a little smaller each time. They keep clear of the window and the curtains, the pictures, the chart, the podium's top step, the sofa, the lamp, the plant and
// the door. Unlit, so they glow at night like stickers that shine in the dark. One InstancedMesh per colour (the software renderer draws each instance in its
// material's colour); the newest star twinkles.
// Where (from SofiaSpace's game-core.js, the same function): Star 11 and on spill out of the chart onto the
// wall it hangs on, the nearest places first, until that wall is full (two rounds of places, the second in the gaps of the first); then onto the room's
// other walls the same way, the nearest to the chart first (as if the walls were unfolded round the corners); then round after round in the gaps, a
// little smaller each time, the chart's wall first, for as long as she brushes.
// walls: the first is the chart's; each {o: a corner, u: the direction along it, v: up, w, h: its size in metres, at(u,v): where a place is on the unfolded
// walls, as [x, y] with the chart's wall as it is, skip: [[u0,u1,v0,v1],...] what is on the wall already}. from: the chart's middle, [x, y]. gap: metres
// between places in a round; r: a star's size in the first round. Returns n places {p: [x,y,z], wall, round, size, colour (0..4), spin}.
export function brushStarSpots(n,{walls,from,gap=.4,r=.12}){
 const hash=(...k)=>{let h=0;for(const v of k)h=Math.sin(h*12.9898+v*78.233+.5)*43758.5453;return h-Math.floor(h);};
 // The places of one round on every wall, each with its distance from the chart over the unfolded walls.
 const places=round=>{const off=[[0,0],[.5,.5],[.5,0],[0,.5]][round]||[hash(round,1),hash(round,2)],size=r*([1,.85,.75,.75][round]??.68),list=[];
  walls.forEach((w,wi)=>{const m=size*1.2;
   for(let i=0;(i+off[0]-.5)*gap<=w.w;i++)for(let j=0;(j+off[1]-.5)*gap<=w.h;j++){
    const u=(i+off[0])*gap+(hash(round,wi,i,j,3)-.5)*gap*.3,v=(j+off[1])*gap+(hash(round,wi,i,j,4)-.5)*gap*.3;
    if(u<m||u>w.w-m||v<m||v>w.h-m||(w.skip||[]).some(([u0,u1,v0,v1])=>u>u0-m&&u<u1+m&&v>v0-m&&v<v1+m))continue;
    const [x,y]=w.at(u,v);list.push({u,v,wi,round,size,d:Math.hypot(x-from[0],y-from[1])});}});
  return list;};
 const out=[],near=(a,b)=>a.d-b.d,take=list=>{for(const c of list){if(out.length>=n)return;const w=walls[c.wi];
  out.push({p:[0,1,2].map(k=>w.o[k]+w.u[k]*c.u+w.v[k]*c.v),wall:c.wi,round:c.round,size:c.size,colour:Math.floor(hash(c.u*31,c.v*17,c.round)*5),spin:hash(c.v*13,c.u*7,c.round)*Math.PI*2});}};
 // The chart's wall full first (rounds 0 and 1 together), then the other walls, then each round after on every wall, the chart's wall first.
 const first=[...places(0),...places(1)];take(first.filter(c=>!c.wi).sort(near));take(first.filter(c=>c.wi).sort(near));
 for(let round=2,empty=0;out.length<n&&empty<4;round++){const list=places(round);empty=list.length?0:empty+1;take(list.sort((a,b)=>(a.wi?1:0)-(b.wi?1:0)||a.d-b.d));}
 return out;}

export const BRUSH_COLOURS=['#2fbfbc','#ffcf4a','#ff8fbd','#b9a3ff','#fff3c4'];
// The room's walls (inside.js: inner faces at z −3.5 and x ±4.5, 3.6 m high, open at z 3.1): the back wall with the chart first.
export const BRUSH_WALLS=[
 {o:[-4.5,0,-3.485],u:[1,0,0],v:[0,1,0],n:[0,0,1],w:9,h:3.55,at:(u,v)=>[u-4.5,v],skip:[[0,9,0,1.1],[2.65,6.35,2,3.7],[.45,1.75,2.33,3.37],[7.25,8.55,2.33,3.37],[6.35,7.25,2.55,3.3]]},
 {o:[4.485,0,-3.5],u:[0,0,1],v:[0,1,0],n:[-1,0,0],w:6.6,h:3.55,at:(u,v)=>[4.5+u,v],skip:[[0,6.6,0,.2],[4.3,5.7,0,2.3],[3.55,4.25,0,1.95],[5.75,6.6,0,1.15]]},
 {o:[-4.485,0,3.1],u:[0,0,-1],v:[0,1,0],n:[1,0,0],w:6.6,h:3.55,at:(u,v)=>[-4.5-(6.6-u),v],skip:[[0,6.6,0,.2],[.5,2.8,0,1.3]]}];
export const CHART_AT=[2.3,2.92];

export function createStarWall(T,parent,{walls=BRUSH_WALLS,from=CHART_AT,colours=BRUSH_COLOURS}={}){
 const shape=new T.Shape();for(let i=0;i<10;i++){const r=i%2?.44:1,a=Math.PI/2+i*Math.PI/5;shape[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}
 const geo=new T.ShapeGeometry(shape),mats=colours.map(c=>new T.MeshBasicMaterial({color:c}));
 let meshes=[],spots=[],newest=null,n=-1;const m=new T.Matrix4(),basis=new T.Matrix4(),q=new T.Quaternion(),spin=new T.Quaternion(),z=new T.Vector3(0,0,1),pos=new T.Vector3(),scl=new T.Vector3();
 const place=(s,k=1)=>{const w=walls[s.wall];basis.makeBasis(new T.Vector3(...w.u),new T.Vector3(...w.v),new T.Vector3(...w.n));q.setFromRotationMatrix(basis).multiply(spin.setFromAxisAngle(z,s.spin));
  return m.compose(pos.set(...s.p),q,scl.setScalar(s.size*k));};
 // count: how many stars there are in all (the chart's ten first).
 function set(count){const want=Math.max(0,Math.floor(count)-10);if(want===n)return;n=want;spots=brushStarSpots(n,{walls,from});
  for(const mesh of meshes){parent.remove(mesh);mesh.dispose?.();}meshes=[];
  const by=colours.map(()=>[]);spots.forEach((s,i)=>by[s.colour].push(i));
  by.forEach((list,k)=>{if(!list.length)return;const mesh=new T.InstancedMesh(geo,mats[k],list.length);mesh.name='Tannpusstjerner';mesh.userData.spots=list;
   list.forEach((i,j)=>mesh.setMatrixAt(j,place(spots[i])));mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;parent.add(mesh);meshes.push(mesh);});
  const last=spots.length-1;newest=last<0?null:{mesh:meshes.find(x=>x.userData.spots.includes(last)),i:last};if(newest)newest.j=newest.mesh.userData.spots.indexOf(last);}
 // The newest star twinkles: it grows and shrinks a little.
 function update(time,still=false){if(!newest)return;newest.mesh.setMatrixAt(newest.j,place(spots[newest.i],still?1.15:1.15+.2*Math.sin(time*3)));newest.mesh.instanceMatrix.needsUpdate=true;}
 return {set,update,get spots(){return spots;},get meshes(){return meshes;}};
}
