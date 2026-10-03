// See-through buildings (3 October 2026): a building the camera is inside, or that stands between the camera and the car, fades out (a dithered
// dissolve, then gone) so it never blocks the game, and fades back in when the camera has left it. world.js draws each building's walls and roof
// into a building twin of its chunk with the building's id on every corner (claim() decides which triangles stand up off the ground: the car park
// or the yard drawn with a building stays). Each frame update() walks the line from the camera to the car and picks the buildings it passes
// through below their roofs; only the chunks holding such a building draw with the see-through material, so the rest of the town keeps the
// plain one (a shader that can discard costs more on the iPad's GPU).
export const HIDE_MAX=8;
const inside=(p,x,z)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [ax,az]=p[j],[bx,bz]=p[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
function edgeDistance(p,x,z){let best=Infinity;for(let i=0,j=p.length-1;i<p.length;j=i++){const [ax,az]=p[j],[bx,bz]=p[i],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));best=Math.min(best,Math.hypot(x-ax-t*dx,z-az-t*dz));}return best;}
export function createSeeThrough({T,base,cell=24,step=.75,margin=1,cameraMargin=1.8,nearCar=2,fadeIn=5,fadeOut=3}){
 const buildings=[],grid=new Map(),fades=new Map(),meshes=new Map();
 // One footprint ([[x,z],...]) per building; the id (from 1) goes on its corners.
 function add(p){let x0=Infinity,z0=Infinity,x1=-Infinity,z1=-Infinity;for(const [x,z] of p){x0=Math.min(x0,x);z0=Math.min(z0,z);x1=Math.max(x1,x);z1=Math.max(z1,z);}
  buildings.push({p,x0,z0,x1,z1,top:-Infinity,bottom:Infinity});return buildings.length;}
 // Is this triangle (corners a, c, d; the ground under its middle at g) part of the building: near its footprint and standing up off the ground?
 function claim(id,a,c,d,g){const B=buildings[id-1],x=(a[0]+c[0]+d[0])/3,y=(a[1]+c[1]+d[1])/3,z=(a[2]+c[2]+d[2])/3;
  if(x<B.x0-3||x>B.x1+3||z<B.z0-3||z>B.z1+3||y<g+.3)return false;B.top=Math.max(B.top,a[1],c[1],d[1]);B.bottom=Math.min(B.bottom,a[1],c[1],d[1]);return true;}
 function attach(id,mesh){if(!meshes.has(id))meshes.set(id,new Set());meshes.get(id).add(mesh);}
 // After the world is drawn: a grid of the buildings that got any triangles, for the search along the camera's line.
 function index(){grid.clear();buildings.forEach((B,i)=>{if(B.top===-Infinity)return;for(let gx=Math.floor((B.x0-margin-cameraMargin)/cell);gx<=Math.floor((B.x1+margin+cameraMargin)/cell);gx++)for(let gz=Math.floor((B.z0-margin-cameraMargin)/cell);gz<=Math.floor((B.z1+margin+cameraMargin)/cell);gz++){const k=gx*65536+gz;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i+1);}});}
 // The buildings in the way: the camera is inside one (with a wider margin, for the camera's near plane), or the line to the car passes through one
 // below its roof (up to nearCar metres short of the car, so the building the car is beside is left alone). Nearest the camera first.
 function select(cam,car){const out=[],seen=new Set(),dx=car.x-cam.x,dy=car.y-cam.y,dz=car.z-cam.z,len=Math.hypot(dx,dy,dz),end=Math.max(0,len-nearCar);
  for(let s=0;s<=end;s+=step){const t=len?s/len:0,x=cam.x+dx*t,y=cam.y+dy*t,z=cam.z+dz*t,m=s?margin:cameraMargin;
   for(const id of grid.get(Math.floor(x/cell)*65536+Math.floor(z/cell))||[]){if(seen.has(id))continue;const B=buildings[id-1];
    if(y>B.top+.2||y<B.bottom-.5||x<B.x0-m||x>B.x1+m||z<B.z0-m||z>B.z1+m)continue;if(inside(B.p,x,z)||edgeDistance(B.p,x,z)<m){seen.add(id);out.push(id);}}}
  return out;}
 // The see-through material: the plain one plus the dissolve of up to HIDE_MAX buildings (ids and how far each has faded, 0..1).
 const hideId={value:new Array(HIDE_MAX).fill(0)},hideFade={value:new Array(HIDE_MAX).fill(0)},material=base.clone();material.name='see-through';
 material.onBeforeCompile=shader=>{shader.uniforms.hideId=hideId;shader.uniforms.hideFade=hideFade;
  shader.vertexShader='attribute float buildingId;\nvarying float vBuildingId;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vBuildingId=buildingId;');
  shader.fragmentShader=`varying float vBuildingId;\nuniform float hideId[${HIDE_MAX}];\nuniform float hideFade[${HIDE_MAX}];\nconst float BAYER[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);\n`+shader.fragmentShader.replace('void main() {',`void main() {
 float hide=0.;for(int i=0;i<${HIDE_MAX};i++)hide=max(hide,step(abs(vBuildingId-hideId[i]),.5)*hideFade[i]);
 if(hide>0.){ivec2 q=ivec2(mod(gl_FragCoord.xy,4.));if(hide>.995||(BAYER[q.x+q.y*4]+.5)/16.<hide)discard;}`);};
 material.customProgramCacheKey=()=>'see-through';
 // Each frame: fade the buildings in the way out and the others back in; returns the meshes that must draw with the see-through material now.
 const active=new Set();
 function update(dt,cam,car){const want=select(cam,car);for(const id of want)fades.set(id,Math.min(1,(fades.get(id)||0)+dt*fadeIn));
  for(const [id,f] of fades)if(!want.includes(id)){const g=f-dt*fadeOut;if(g<=0)fades.delete(id);else fades.set(id,g);}
  const order=id=>{const i=want.indexOf(id);return i<0?HIDE_MAX*4+1-fades.get(id):i;},shown=[...fades.keys()].sort((a,b)=>order(a)-order(b)).slice(0,HIDE_MAX); // those in the way first
  for(let i=0;i<HIDE_MAX;i++){hideId.value[i]=shown[i]||0;hideFade.value[i]=shown[i]?fades.get(shown[i]):0;}
  active.clear();for(const id of shown)for(const m of meshes.get(id)||[])active.add(m);return active;}
 return {add,claim,attach,index,select,update,material,fades,buildings,hideId,hideFade};
}
