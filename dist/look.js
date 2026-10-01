// The look of Sofias biltur: a late-summer afternoon in Trondheim, drawn as a calm, stylised low-poly world (30 September 2026).
// Everything that decides how the world is lit and coloured lives here, apart from the colours of buildings and trees:
// renderer and output settings, sun, sky light, shadows, fog, the sky dome with clouds and the hills on the horizon,
// the colour of the ground, the asphalt, kerbs and paths, and the water. world.js only calls into this module.
// Colours are written as sRGB hex, as everywhere else in the game, and computed in linear light. Nothing here runs a
// full-screen pass: the sky is a few thousand coloured triangles drawn behind the world, the rest is vertex colour.

// ---------------------------------------------------------------- palette and settings (also read by verify-look.mjs)
export const SKY={horizon:'#c8dde9',low:'#9fc6ee',mid:'#74a9e5',zenith:'#558fd4',glow:'#f8e4bd'};
export const FOG={colour:SKY.horizon,near:110,far:560}; // the fog is the colour of the sky at the horizon, so the far ground melts into it
// The sun stands in the west-south-west, 33 degrees up (afternoon light, long soft shadows); the sky light is blue above
// and warm olive from the ground, so shadows come out cool and lit grass warm.
export const SUN={azimuth:238,elevation:37,colour:'#ffd9a6',intensity:2.9,distance:230};
export const HEMI={sky:'#b0c9ea',ground:'#869160',intensity:2.05};
export const RENDER={exposure:1.12,shadowSize:2048,shadowHalf:54,shadowAhead:18,maxPixelRatio:1.6};
// Ground, in sRGB hex. The ground is painted per vertex from these, by land cover, slope and a little noise.
export const GROUND={lawn:['#80a857','#8fb05e','#77a052'],meadow:['#a2a95d','#b1b064','#97a259'],forest:['#476b44','#3e5e3c','#58703f'],rock:'#8d8b7b',earth:'#9b8d6c',sand:'#a9a684',reed:'#7a8f55'};
// Roads, kerbs and paths. Asphalt a touch darker and bluer than before, the kerb band a clean light concrete grey.
export const ROAD={asphalt:'#5f676c',kerb:'#b3b6b2',island:'#80a857',steep:'#767f84',gravel:'#a39a82',dash:'#ecd98a'};
export const PATH={sidewalk:'#a9a9a2',cycleway:'#686f72',paving:'#b3b0a8',kerbStone:'#cbcac4'};
export const WATER={colour:'#3f8cb6',specular:'#ffe6b8',pond:'#4a93ae',sky:'#cfe4f2',opacity:.86,bed:{sand:'#a9a684',shallow:'#6f9f94',mid:'#3f8b9d',deep:'#2a6e91'}};

// ---------------------------------------------------------------- small helpers
const lin1=v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);
export function lin(hex){const n=parseInt(hex.slice(1),16);return [lin1((n>>16&255)/255),lin1((n>>8&255)/255),lin1((n&255)/255)];}
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export function hash2(i,j){let h=(Math.imul(i|0,374761393)+Math.imul(j|0,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
// Smooth value noise in [0,1], from a 256 x 256 table of hashes (it repeats after 256 cells: 2.4 km at the finest scale used here).
const LATTICE=new Float32Array(65536);for(let j=0;j<256;j++)for(let i=0;i<256;i++)LATTICE[j<<8|i]=hash2(i,j);
export function vnoise(x,z){const fi=Math.floor(x),fj=Math.floor(z),u=x-fi,v=z-fj,i=fi&255,j=fj&255,i1=(i+1)&255,j1=(j+1)&255,a=LATTICE[j<<8|i],b=LATTICE[j<<8|i1],c=LATTICE[j1<<8|i],d=LATTICE[j1<<8|i1],su=u*u*(3-2*u),sv=v*v*(3-2*v);return a+(b-a)*su+(c-a)*sv+(a-b-c+d)*su*sv;}
const sunDirection=()=>{const az=SUN.azimuth*Math.PI/180,el=SUN.elevation*Math.PI/180;return [Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el)];}; // x east, z south

// Sets layer[index]=value for every vertex of the grid inside a polygon (even-odd over all the rings given: an outline and its islands),
// row by row: the cost is the rows times the edges, not every cell times every edge.
function fillRings(rings,layer,value,nx,nz,step,x0,z0){
 let lz=1e9,hz=-1e9;for(const ring of rings)for(const v of ring){if(v[1]<lz)lz=v[1];if(v[1]>hz)hz=v[1];}
 const xs=[];for(let j=Math.max(0,Math.floor((lz-z0)/step));j<=Math.min(nz-1,Math.ceil((hz-z0)/step));j++){const z=z0+j*step;xs.length=0;
  for(const ring of rings)for(let a=0,b=ring.length-1;a<ring.length;b=a++)if((ring[b][1]>z)!==(ring[a][1]>z))xs.push(ring[b][0]+(z-ring[b][1])/(ring[a][1]-ring[b][1])*(ring[a][0]-ring[b][0]));
  xs.sort((p,q)=>p-q);for(let k=0;k+1<xs.length;k+=2)for(let i=Math.max(0,Math.ceil((xs[k]-x0)/step));i<=Math.min(nx-1,Math.floor((xs[k+1]-x0)/step));i++)layer[j*nx+i]=value;}
}

// ---------------------------------------------------------------- renderer, lights, fog
export function configureRenderer(T,renderer){
 renderer.setPixelRatio(Math.min(devicePixelRatio,RENDER.maxPixelRatio));
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=RENDER.exposure;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
}
// Sun and sky light. follow() moves the shadow box with the car, a little ahead of it, in whole shadow-map texels so the shadow
// edges do not crawl when the car moves; it allocates nothing.
export function createLights(T,scene){
 const hemi=new T.HemisphereLight(HEMI.sky,HEMI.ground,HEMI.intensity);scene.add(hemi);
 const sun=new T.DirectionalLight(SUN.colour,SUN.intensity);sun.castShadow=true;
 const d=sunDirection(),off=[d[0]*SUN.distance,d[1]*SUN.distance,d[2]*SUN.distance],half=RENDER.shadowHalf;
 sun.shadow.mapSize.set(RENDER.shadowSize,RENDER.shadowSize);Object.assign(sun.shadow.camera,{left:-half,right:half,top:half,bottom:-half,near:8,far:SUN.distance*2+40});
 sun.shadow.normalBias=.08;sun.shadow.bias=-.0012;
 // Bias found by trial: less shows a sawtooth shadow of the 9 cm kerb step on the kerb band, and a larger normal bias makes that worse.
 sun.position.set(off[0],off[1],off[2]);scene.add(sun);scene.add(sun.target);
 // The light's own axes (the shadow camera looks from the sun at the target with y up): x = up × sunDir, y = sunDir × x.
 let rx=d[2],rz=-d[0];const rl=Math.hypot(rx,rz)||1;rx/=rl;rz/=rl;const ux=d[1]*rz,uy=d[2]*rx-d[0]*rz,uz=-d[1]*rx,texel=2*half/RENDER.shadowSize;
 function follow(px,py,pz,hx,hz){
  let tx=px+hx*RENDER.shadowAhead,ty=py,tz=pz+hz*RENDER.shadowAhead;
  const a=tx*rx+tz*rz,b=tx*ux+ty*uy+tz*uz,da=Math.round(a/texel)*texel-a,db=Math.round(b/texel)*texel-b;
  tx+=da*rx+db*ux;ty+=db*uy;tz+=da*rz+db*uz;
  sun.target.position.set(tx,ty,tz);sun.position.set(tx+off[0],ty+off[1],tz+off[2]);sun.target.updateMatrixWorld();
 }
 return {hemi,sun,follow,direction:d};
}
// A small sky-and-ground reflection map for the car's paint (MeshStandardMaterial only; the world's own material ignores it).
export function createEnvironment(T){
 const faces=Array.from({length:6},(_,face)=>{const c=document.createElement('canvas');c.width=128;c.height=128;const q=c.getContext('2d'),g=q.createLinearGradient(0,0,0,128);
  g.addColorStop(0,face===3?'#7b8d66':SKY.mid);g.addColorStop(.46,face===2?'#e8eef0':SKY.low);g.addColorStop(.5,SKY.horizon);g.addColorStop(.58,'#a7b497');g.addColorStop(1,'#62775a');q.fillStyle=g;q.fillRect(0,0,128,128);return c;});
 const env=new T.CubeTexture(faces);env.colorSpace=T.SRGBColorSpace;env.needsUpdate=true;return env;
}

// ---------------------------------------------------------------- sky dome, distant hills, fjord and clouds
// Seen from the chase camera only the lowest ten degrees or so of the sky are on the screen, so the sky is built for that band:
// hazy horizon, a little blue above it, low cumulus, and Bymarka, the Byåsen ridge, the hills east of Trondheim and the fjord
// as layers of blue on the horizon. Bearings are compass degrees (0 north, 90 east); the world is x east, z south.
// Each layer is a ring of triangles round the camera, drawn behind the world (depth-tested, so the ground covers it) from the
// farthest to the nearest layer. The ring follows the camera, so it is always at the horizon.
const HILLS=[ // [radius, colour, haze, massifs as [bearing, width, elevation angle]]
 {r:1420,colour:'#8aa9bd',haze:.55,floor:.35,m:[[300,38,4.6],[8,28,1.3],[95,26,3.0],[140,22,2.0],[205,30,2.4]]},
 {r:1240,colour:'#6f9a88',haze:.42,floor:.25,m:[[302,32,3.9],[235,20,2.8],[190,24,2.2],[22,26,.8],[72,22,2.3],[118,18,1.8],[152,16,1.4]]},
 {r:1060,colour:'#56806b',haze:.3,floor:.15,m:[[292,26,3.3],[252,14,2.2],[214,18,1.8],[330,10,1.2],[168,24,1.3],[85,24,1.4],[122,12,1.0]]}];
const angleDiff=(a,b)=>{let d=(a-b)%360;if(d>180)d-=360;if(d<-180)d+=360;return d;};
export function hillElevation(layer,bearing){const L=HILLS[layer];let e=L.floor;for(const [c,w,p] of L.m)e+=p*Math.exp(-.5*Math.pow(angleDiff(bearing,c)/w,2));
 e*=.72+.56*vnoise(bearing/5+layer*7.3,layer*3.1)+.22*(vnoise(bearing/1.7+layer*2.1,5.5)-.5);return Math.max(.05,e);} // degrees above the horizon
function dirAt(bearing,elevation,r){const b=bearing*Math.PI/180,e=elevation*Math.PI/180;return [Math.sin(b)*Math.cos(e)*r,Math.sin(e)*r,-Math.cos(b)*Math.cos(e)*r];}
export function skyColour(elevation,bearing,out){ // the dome's colour in linear light
 const stops=[[-90,SKY.horizon],[0,SKY.horizon],[1.5,SKY.horizon],[6,SKY.low],[19,SKY.mid],[55,SKY.zenith],[90,SKY.zenith]];let k=0;while(k<stops.length-2&&elevation>stops[k+1][0])k++;
 const a=lin(stops[k][1]),b=lin(stops[k+1][1]),t=smooth(stops[k][0],stops[k+1][0],elevation);out[0]=mix(a[0],b[0],t);out[1]=mix(a[1],b[1],t);out[2]=mix(a[2],b[2],t);
 // The glow of the sun: wide and creamy (mixed in, not added, which would turn the blue lilac), faded out towards the horizon so the horizon stays the colour of the fog.
 const sd=sunDirection(),b2=bearing*Math.PI/180,e2=elevation*Math.PI/180,cosA=Math.sin(b2)*Math.cos(e2)*sd[0]+Math.sin(e2)*sd[1]-Math.cos(b2)*Math.cos(e2)*sd[2];
 const g=Math.min(.6,Math.pow(Math.max(0,cosA),6)*.5+Math.pow(Math.max(0,cosA),1.5)*.16)*smooth(3,11,elevation),gl=lin(SKY.glow);out[0]=mix(out[0],gl[0],g);out[1]=mix(out[1],gl[1],g);out[2]=mix(out[2],gl[2],g);return out;
}
export function createSky(T){
 const group=new T.Group();group.name='Himmel';const fog=lin(FOG.colour);
 let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 function mesh(positions,colours,order){const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(Float32Array.from(positions),3));g.setAttribute('color',new T.BufferAttribute(Float32Array.from(colours),3));
  const m=new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,fog:false,depthWrite:false,side:T.DoubleSide}));m.renderOrder=order;m.frustumCulled=false;m.matrixAutoUpdate=false;group.add(m);return m;}
 // Dome: rings at chosen elevations (close together near the horizon, where the gradient matters), 72 sectors.
 const E=[-90,-25,-6,0,1.5,3,5,8,12,18,26,36,50,68,90],S=72,pos=[],col=[],c3=[0,0,0];
 for(const e of E)for(let s=0;s<=S;s++){const b=s*360/S,p=dirAt(b,e,1500);pos.push(p[0],p[1],p[2]);skyColour(e,b,c3);col.push(c3[0],c3[1],c3[2]);}
 const dome=[];for(let r=0;r<E.length-1;r++)for(let s=0;s<S;s++){const a=r*(S+1)+s,b=a+1,c=a+S+1,d=c+1;dome.push(a,b,d,a,d,c);}
 const domeMesh=mesh(dome.flatMap(i=>[pos[3*i],pos[3*i+1],pos[3*i+2]]),dome.flatMap(i=>[col[3*i],col[3*i+1],col[3*i+2]]),10);
 // Hills: one ring per layer, four rows (the foot far below and the horizon, both in the colour of the fog; the slope; the ridge), ridge height from the massifs above.
 const hillMeshes=[];
 HILLS.forEach((L,layer)=>{const N=180,rows=4,hp=[],hc=[],base=lin(L.colour),foot=-320;
  const P=[],C=[];for(let i=0;i<=N;i++){const b=i*2,e=hillElevation(layer,b),top=Math.tan(e*Math.PI/180)*L.r,x=Math.sin(b*Math.PI/180)*L.r,z=-Math.cos(b*Math.PI/180)*L.r;
   const shade=1+.08*(vnoise(b/2.5+layer*9,1.7)-.5);
   // Slopes facing the camera side of the sun are lit a little more; the ridge is lighter and warmer, the foot dissolves into the haze.
   const lit=.94+.12*Math.max(0,-(Math.sin(b*Math.PI/180)*sunDirection()[0]-Math.cos(b*Math.PI/180)*sunDirection()[2]));
   const rowY=[foot,0,top*(.42+.2*vnoise(b/3,layer+3)),top],rowT=[1,1,.45,0];
   for(let r=0;r<rows;r++){P.push(x,rowY[r],z);const h=L.haze+(1-L.haze)*rowT[r]*.55,tint=r===3?1.1:1;for(let k=0;k<3;k++){const c=base[k]*shade*lit*tint;C.push(mix(c,fog[k],r===0?1:r===1?.94:h*(r===2?.75:.9)));}}}
  for(let i=0;i<N;i++)for(let r=0;r<rows-1;r++){const a=i*rows+r,b=a+rows,c=a+1,d=b+1;for(const v of [a,b,d,a,d,c])hp.push(P[3*v],P[3*v+1],P[3*v+2]),hc.push(C[3*v],C[3*v+1],C[3*v+2]);}
  hillMeshes.push(mesh(hp,hc,11+layer*2));});
 // The fjord: a pale blue-grey ribbon low on the horizon towards the north and east, where Byåsen looks out over Trondheim.
 {const N=60,P=[],C=[],water=lin('#86b2d0'),edge=fog;for(let i=0;i<=N;i++){const b=-35+i*(135/N),t=Math.sin(Math.PI*i/N),r=1330,lo=dirAt(b,.05,r),hi=dirAt(b,.7+.5*t,r);P.push(lo[0],lo[1],lo[2],hi[0],hi[1],hi[2]);const a=Math.pow(t,.6);
   for(const w of [0,1])for(let k=0;k<3;k++)C.push(mix(edge[k],water[k]*(w?1.06:.96),a));}
  const fp=[],fc=[];for(let i=0;i<N;i++){const a=i*2,b=a+2,c=a+1,d=b+1;for(const v of [a,b,d,a,d,c])fp.push(P[3*v],P[3*v+1],P[3*v+2]),fc.push(C[3*v],C[3*v+1],C[3*v+2]);}mesh(fp,fc,12);}
 // Clouds: squashed low-poly puffs with flat bellies, lit from the sun's side, as one mesh that drifts slowly round the camera.
 const sd=sunDirection(),cp=[],cc=[],belly=lin('#aebfd9'),top=lin('#fffaf0').map(v=>v*1.12),warm=lin('#ffe2b4'),ico=new T.IcosahedronGeometry(1,1),ip=ico.attributes.position;
 const cloud=[];for(let n=0;n<16;n++){const bearing=(n+rnd()*.8)*360/16,R=1130+rnd()*170,alt=55+rnd()*130,size=55+rnd()*70,blobs=4+Math.floor(rnd()*3);
  const cx=Math.sin(bearing*Math.PI/180)*R,cz=-Math.cos(bearing*Math.PI/180)*R,tx=Math.cos(bearing*Math.PI/180),tz=Math.sin(bearing*Math.PI/180);
  for(let k=0;k<blobs;k++){const f=(k/(blobs-1)-.5)*2,rad=size*(.55+.45*Math.cos(f*1.3))*(.8+.4*rnd()),ox=f*size*1.35,oy=alt+rad*.5*(1-Math.abs(f)*.5);cloud.push({cx:cx+tx*ox,cz:cz+tz*ox,y:oy,rx:rad,ry:rad*.62,rz:rad*.85,base:alt,seed:n*17+k});}}
 for(const b of cloud){const v=[];for(let i=0;i<ip.count;i++){let x=ip.getX(i),y=ip.getY(i),z=ip.getZ(i);const q=hash2(Math.round(x*50)+b.seed*31,Math.round(y*50)+Math.round(z*50)*7);const j=1+.22*(q-.5);x*=j;y*=j;z*=j;
   let py=b.y+y*b.ry;if(py<b.base)py=b.base+(py-b.base)*.12;v.push([b.cx+x*b.rx,py,b.cz+z*b.rz]);}
  for(let i=0;i<v.length;i+=3){const A=v[i],B=v[i+1],Cc=v[i+2],ux=B[0]-A[0],uy=B[1]-A[1],uz=B[2]-A[2],wx=Cc[0]-A[0],wy=Cc[1]-A[1],wz=Cc[2]-A[2];let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
   // Keep the normals pointing away from the cloud's centre.
   const mx=(A[0]+B[0]+Cc[0])/3-b.cx,my=(A[1]+B[1]+Cc[1])/3-b.y,mz=(A[2]+B[2]+Cc[2])/3-b.cz;if(nx*mx+ny*my+nz*mz<0){nx=-nx;ny=-ny;nz=-nz;}
   const lit=smooth(-.2,.8,nx*sd[0]+ny*sd[1]+nz*sd[2]),up=smooth(-.5,.7,ny),shade=clamp(.25+.55*up+.4*lit);
   for(const P of [A,B,Cc]){cp.push(P[0],P[1],P[2]);for(let k=0;k<3;k++)cc.push(mix(belly[k],top[k],shade)+warm[k]*.16*lit*lit);}}}
 ico.dispose();
 const clouds=mesh(cp,cc,14);
 // update(): the whole sky rides with the camera; the clouds drift round it (one full turn in about 50 minutes).
 function update(eye,time){group.position.copy(eye);group.updateMatrix();clouds.rotation.y=time*.0021;clouds.updateMatrix();}
 group.matrixAutoUpdate=false;
 return {group,update,domeMesh,hillMeshes,clouds,triangles:()=>{let n=0;group.traverse(o=>{if(o.isMesh)n+=o.geometry.attributes.position.count/3;});return n;}};
}

// ---------------------------------------------------------------- water
// One semi-transparent surface per lake over a lake bed that is coloured by depth (see createGround): shallow sand and teal at the
// shore, deep blue in the middle. The water reflects the sky more at a low angle, and the sun glitters on small moving ripples.
export function createWater(T){
 const material=new T.MeshPhongMaterial({color:WATER.colour,specular:WATER.specular,shininess:140,transparent:true,opacity:WATER.opacity,depthWrite:false});
 const uniforms={time:{value:0},sky:{value:new T.Color(WATER.sky)}};
 material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWorld;\nuniform float time;\nuniform vec3 sky;')
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   {vec2 w=vWorld.xz;vec3 q=vec3(sin(w.x*.61+time*.9)+sin(w.y*.83-time*.7)+sin((w.x+w.y)*1.37+time*1.3),0.,cos(w.y*.57+time*.8)+cos(w.x*.91-time*.6)+cos((w.x-w.y)*1.21-time*1.1));
    normal=normalize(normal+.035*normalize((viewMatrix*vec4(q,0.)).xyz));}`)
   .replace('#include <opaque_fragment>',`float fres=pow(1.0-saturate(dot(normalize(vViewPosition),normal)),3.0);
    outgoingLight=mix(outgoingLight,sky,fres*.65);diffuseColor.a=mix(diffuseColor.a,.97,fres);
    #include <opaque_fragment>`);};
 function build(triangles){const g=new T.BufferGeometry(),n=triangles.length/3,normal=new Float32Array(triangles.length);for(let i=0;i<n;i++)normal[3*i+1]=1;
  g.setAttribute('position',new T.BufferAttribute(Float32Array.from(triangles),3));g.setAttribute('normal',new T.BufferAttribute(normal,3));g.computeBoundingSphere();
  const m=new T.Mesh(g,material);m.name='Vann';m.matrixAutoUpdate=false;m.updateMatrix();m.renderOrder=-1;return m;} // before the other see-through things (the duck's ripples lie on it)
 return {material,build,update:time=>{uniforms.time.value=time;}};
}

// ---------------------------------------------------------------- the ground
// createGround paints every vertex of the 8 m ground grid: land cover (lawn where people live, rough meadow and dark forest floor
// where they do not, from the density of buildings and from OSM's wood, grass, park and meadow areas), a little rock on steep
// ground, noise so that nothing repeats, darker ground at the foot of buildings, sand and teal at the lake shores and the lake
// bed coloured by depth. colours is a Float32Array of linear r,g,b per vertex; the road surface's verges take their colour from it
// (sample) so a verge melts into the lawn beside it.
export function createGround({data,gh,nx,nz,step,x0,z0,lakes=[],shoreDistance=()=>1e9,waterY=()=>0}){
 const N=nx*nz,colours=new Float32Array(3*N),at=(i,j)=>j*nx+i;
 // -- built-up density: the share of the ground within 48 m that lies under buildings (summed-area table of footprint areas)
 const mass=new Float32Array(N),ao=new Float32Array(N),R=6,AO_R=9;
 for(const b of data.buildings){const p=b.p;if(!p||p.length<4)continue;let cx=0,cz=0,area=0;const n=p.length-1;for(let k=0;k<n;k++){cx+=p[k][0];cz+=p[k][1];area+=p[k][0]*p[k+1][1]-p[k+1][0]*p[k][1];}cx/=n;cz/=n;area=Math.abs(area/2);
  const ci=Math.round((cx-x0)/step),cj=Math.round((cz-z0)/step);if(ci>=0&&ci<nx&&cj>=0&&cj<nz)mass[at(ci,cj)]+=area;
  // Darker ground at the foot of the walls: every 4 m along an edge darkens the vertices within AO_R of it.
  for(let k=0;k<n;k++){const a=p[k],c=p[k+1],len=Math.sqrt((c[0]-a[0])**2+(c[1]-a[1])**2),m=Math.max(1,Math.ceil(len/4));
   for(let s=0;s<m;s++){const x=a[0]+(c[0]-a[0])*s/m,z=a[1]+(c[1]-a[1])*s/m,i0=Math.max(0,Math.floor((x-AO_R-x0)/step)),i1=Math.min(nx-1,Math.ceil((x+AO_R-x0)/step));
    for(let j=Math.max(0,Math.floor((z-AO_R-z0)/step)),j1=Math.min(nz-1,Math.ceil((z+AO_R-z0)/step));j<=j1;j++){const dz=z0+j*step-z;
     for(let i=i0;i<=i1;i++){const dx=x0+i*step-x,d2=dx*dx+dz*dz;if(d2<AO_R*AO_R){const v=1-Math.sqrt(d2)/AO_R,w=v*v,q=j*nx+i;if(w>ao[q])ao[q]=w;}}}}}}
 const sat=new Float64Array((nx+1)*(nz+1));for(let j=0;j<nz;j++){let row=0;for(let i=0;i<nx;i++){row+=mass[at(i,j)];sat[(j+1)*(nx+1)+i+1]=sat[j*(nx+1)+i+1]+row;}}
 const built=(i,j)=>{const i0=Math.max(0,i-R),i1=Math.min(nx,i+R+1),j0=Math.max(0,j-R),j1=Math.min(nz,j+R+1);return (sat[j1*(nx+1)+i1]-sat[j0*(nx+1)+i1]-sat[j1*(nx+1)+i0]+sat[j0*(nx+1)+i0])/(((i1-i0)*(j1-j0))*step*step);};
 // -- areas from OSM, rasterised onto the vertices
 const wood=new Float32Array(N),lawnArea=new Float32Array(N),meadowArea=new Float32Array(N);
 for(const a of data.areas){const layer=a.type==='wood'||a.type==='forest'?wood:a.type==='grass'||a.type==='park'||a.type==='recreation_ground'?lawnArea:a.type==='meadow'?meadowArea:null;if(layer&&a.level==null)fillRings([a.p],layer,1,nx,nz,step,x0,z0);}
 // -- the lakes, filled row by row (even-odd over the outline and the islands' outlines): which lake, if any, each vertex lies in
 const inLake=new Uint8Array(N);
 lakes.forEach((L,n)=>fillRings([L.p,...(L.holes||[])],inLake,n+1,nx,nz,step,x0,z0));
 const lawnC=GROUND.lawn.map(lin),meadowC=GROUND.meadow.map(lin),forestC=GROUND.forest.map(lin),rock=lin(GROUND.rock),earth=lin(GROUND.earth),sand=lin(GROUND.sand),reed=lin(GROUND.reed);
 const bed=[lin(WATER.bed.sand),lin(WATER.bed.shallow),lin(WATER.bed.mid),lin(WATER.bed.deep)];
 const c=[0,0,0],tone=(pal,t,out)=>{const k=t<.5?0:1,u=t<.5?t*2:(t-.5)*2,a=pal[k],b=pal[k+1];out[0]=mix(a[0],b[0],u);out[1]=mix(a[1],b[1],u);out[2]=mix(a[2],b[2],u);return out;};
 const t0=[0,0,0],t1=[0,0,0],t2=[0,0,0];
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
  const q=at(i,j),x=x0+i*step,z=z0+j*step,h=gh[q],
   sx=(gh[at(Math.min(nx-1,i+1),j)]-gh[at(Math.max(0,i-1),j)])/(step*(Math.min(nx-1,i+1)-Math.max(0,i-1))),sz=(gh[at(i,Math.min(nz-1,j+1))]-gh[at(i,Math.max(0,j-1))])/(step*(Math.min(nz-1,j+1)-Math.max(0,j-1))),slope=Math.hypot(sx,sz);
  const n1=vnoise(x/95+3.1,z/95+8.7),n2=vnoise(x/27+11.3,z/27+2.9),n3=vnoise(x/9.5+5.2,z/9.5+17.1),n4=vnoise(x/60+40.5,z/60+21.4);
  const settled=smooth(.012,.085,built(i,j)),wild=1-settled,inWood=wood[q];
  // Forest where OSM says wood, and in patches over the unbuilt land (the trees grow there too); rough meadow in the rest of the unbuilt land.
  const forestW=clamp(inWood+wild*smooth(.38,.62,n1)*(1-lawnArea[q]),0,1),meadowW=clamp(meadowArea[q]+wild*(1-forestW)*.85*(1-lawnArea[q]),0,1)*(1-forestW),lawnW=Math.max(0,1-forestW-meadowW);
  tone(lawnC,smooth(.2,.8,n2*.62+n1*.38),t0);tone(meadowC,n2*.7+n3*.3,t1);tone(forestC,n4,t2);
  const dry=smooth(.58,.8,n4)*.55*lawnW*(1-lawnArea[q]*.6); // dry patches in the lawns, as after a warm August
  for(let k=0;k<3;k++)c[k]=t0[k]*(lawnW-dry)+t1[k]*(meadowW+dry)+t2[k]*forestW;
  // Large soft patches of lighter and darker ground, and a fine speckle, in every cover.
  const patch=.83+.34*n1+.1*(n3-.5);c[0]*=patch;c[1]*=patch;c[2]*=patch*(1+.08*(n4-.5));
  // Steep ground shows earth and rock: from about 30 degrees, mostly rock above 45 (the terrain is exaggerated 1.45 times).
  const steep=smooth(.5,1.05,slope)*.72;if(steep>0){const r=mix(earth[0],rock[0],n3),g=mix(earth[1],rock[1],n3),b=mix(earth[2],rock[2],n3);c[0]=mix(c[0],r,steep);c[1]=mix(c[1],g,steep);c[2]=mix(c[2],b,steep);}
  // Ambient occlusion at the foot of buildings: darker and cooler.
  const o=ao[q]*.34;c[0]*=1-o;c[1]*=1-o*.92;c[2]*=1-o*.75;
  // Lakes: bed by depth under the water; sand and reeds along the shore.
  const l=inLake[q]?lakes[inLake[q]-1]:null;if(l){const ramp=Math.pow(clamp(Math.max(0,waterY(l)-h)/3),.7)*3,s=Math.min(2,Math.floor(ramp)),f=ramp-s,a=bed[s],b=bed[s+1];c[0]=mix(a[0],b[0],f);c[1]=mix(a[1],b[1],f);c[2]=mix(a[2],b[2],f);}
  else for(const L of lakes){const up=h-waterY(L);if(up<1.1&&up>-.5&&x>L.box[0]-70&&x<L.box[2]+70&&z>L.box[1]-70&&z<L.box[3]+70&&shoreDistance(L,x,z)<14){const w=smooth(1.1,.1,up)*.5;
    const s2=mix(sand[0],reed[0],n3),g2=mix(sand[1],reed[1],n3),b2=mix(sand[2],reed[2],n3);c[0]=mix(c[0],s2,w);c[1]=mix(c[1],g2,w);c[2]=mix(c[2],b2,w);break;}}
  colours[3*q]=c[0];colours[3*q+1]=c[1];colours[3*q+2]=c[2];}
 // Bilinear colour at (x,z), for the road surface's verges.
 function sample(x,z,out){const a=clamp((x-x0)/step,0,nx-1.001),b=clamp((z-z0)/step,0,nz-1.001),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,q=at(i,j);
  for(let k=0;k<3;k++)out[k]=(colours[3*q+k]*(1-u)+colours[3*(q+1)+k]*u)*(1-v)+(colours[3*(q+nx)+k]*(1-u)+colours[3*(q+nx+1)+k]*u)*v;return out;}
 return {colours,sample,nx,nz,step,x0,z0};
}

// ---------------------------------------------------------------- the road surface
// Colours for the primitives of road-surface.js (class 0 carriageway, 1 kerb band, 2 island grass, 3 verge, 4 steep face), per
// corner, in linear light: asphalt with slow patches of lighter and darker, gravel roads warmer, kerbs a light concrete.
export function createRoadPainter(ground){
 const asphalt=lin(ROAD.asphalt),kerb=lin(ROAD.kerb),island=lin(ROAD.island),steep=lin(ROAD.steep),gravel=lin(ROAD.gravel),g=[0,0,0];
 return function paint(cls,isGravel,n,c,out){
  for(let k=0;k<n;k++){const x=c[3*k],z=c[3*k+2];let base,amp,m;
   if(cls===3){ground.sample(x,z,g);m=.96;out[3*k]=g[0]*m;out[3*k+1]=g[1]*m;out[3*k+2]=g[2]*m;continue;}
   if(cls===0)base=isGravel?gravel:asphalt;else if(cls===1)base=kerb;else if(cls===2)base=island;else base=steep;
   amp=cls===0?.2:cls===1?.08:.14;
   // Patches about 11 m wide and a fine speckle; the bigger patches also shift a little in hue (warmer where it is worn).
   const n=vnoise(x/11+.5,z/11+9.5),f=1+amp*(n-.5)*2+.05*(vnoise(x/3.1,z/3.1)-.5);
   out[3*k]=base[0]*f*(1+.05*(n-.5));out[3*k+1]=base[1]*f;out[3*k+2]=base[2]*f*(1-.05*(n-.5));}
 };
}

// ---------------------------------------------------------------- everything together
export function createLook({T,scene}){
 scene.background=new T.Color(FOG.colour);scene.fog=new T.Fog(FOG.colour,FOG.near,FOG.far);
 const lights=createLights(T,scene),sky=createSky(T),water=createWater(T);scene.add(sky.group);
 // The world's own material: vertex colours, Lambert light. (scene.environment does not reach it.)
 const staticMaterial=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
 return {lights,sky,water,staticMaterial,configureRenderer:r=>configureRenderer(T,r),environment:()=>createEnvironment(T),
  // Per frame: eye = the camera's position, pos = the car, hx/hz = the direction the car (camera) looks in on the ground.
  update(time,eye,pos,hx,hz){lights.follow(pos.x,pos.y,pos.z,hx,hz);sky.update(eye,time);water.update(time);}};
}
