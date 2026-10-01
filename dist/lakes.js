// The lakes added by add-lakes.py (OSM multipolygons, each with a flat water level) and the ground round them.
// The ground meets the water along the lake's outline: over a bank before it the ground runs down to the water level, and
// under the water the bottom falls away gently. The bank is four times as wide as the ground there stands above the water
// (16 to SHORE metres), so a high shore slopes down as gently as a low one and a road along it can follow. (Until
// 30 September 2026 the ground dropped to the level inside the outline, a step that the 8 m ground grid cut into a
// saw-tooth shore with walls.) Heights here are raw terrain metres, before the world's vertical exaggeration.
export const SHORE=64;
export function inRing(ring,x,z){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;}return inside;}
export function createLakes(data){
 const terrain=data.terrain;
 const lakes=data.areas.filter(a=>a.level!=null).map(a=>({...a,holes:a.holes||[],box:[Math.min(...a.p.map(v=>v[0])),Math.min(...a.p.map(v=>v[1])),Math.max(...a.p.map(v=>v[0])),Math.max(...a.p.map(v=>v[1]))]}));
 function lakeAt(x,z){for(const l of lakes)if(x>l.box[0]&&x<l.box[2]&&z>l.box[1]&&z<l.box[3]&&inRing(l.p,x,z)&&!l.holes.some(h=>inRing(h,x,z)))return l;return null;}
 // An edge whose bounding box is farther away than the best distance so far cannot be the nearest: skipped without the exact distance (same result, a third of the time; the lakes' rawHeight is called for every ground and road sample near them).
 function shoreDistance(l,x,z){let d=Infinity;for(const ring of [l.p,...l.holes])for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,az]=ring[j],[bx,bz]=ring[i],ex=Math.max(Math.min(ax,bx)-x,x-Math.max(ax,bx),0),ez=Math.max(Math.min(az,bz)-z,z-Math.max(az,bz),0);if(ex*ex+ez*ez>=d*d)continue;
   const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));d=Math.min(d,Math.hypot(x-ax-t*dx,z-az-t*dz));}return d;}
 function gridHeight(x,z){const a=Math.max(0,Math.min(terrain.nx-1.001,(x-terrain.x0)/terrain.step)),b=Math.max(0,Math.min(terrain.nz-1.001,(z-terrain.z0)/terrain.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=terrain.heights;return (h[j*terrain.nx+i]*(1-u)+h[j*terrain.nx+i+1]*u)*(1-v)+(h[(j+1)*terrain.nx+i]*(1-u)+h[(j+1)*terrain.nx+i+1]*u)*v;}
 function rawHeight(x,z){const g=gridHeight(x,z);
  for(const l of lakes){if(x<l.box[0]-SHORE||x>l.box[2]+SHORE||z<l.box[1]-SHORE||z>l.box[3]+SHORE)continue;const d=shoreDistance(l,x,z);
   if(inRing(l.p,x,z)&&!l.holes.some(h=>inRing(h,x,z)))return l.level-Math.min(2.5,.05+d*.06); // the lake bottom
   // The bank; where the ground beside the lake lies below the water (the outlet, or noise in the terrain tiles) it dips away from the shore instead.
   const bank=Math.min(SHORE,Math.max(16,Math.abs(g-l.level)*4));if(d<bank){const s=d/bank,k=s*s*(3-2*s);return l.level+(g<l.level?g-l.level:Math.max(.5,g-l.level))*k;}}
  return g;}
 // The big duck's circle on Lianvannet (duck.js, world.js): radius R, as near the turning circle at the end of Vetle
 // Vislies veg (data.lakeside) as leaves 10 m of open water round it. Null without the lake or the turning circle.
 function duckCircle(R=13){const at=data.lakeside&&data.nodes[data.lakeside],lake=at&&lakes.find(l=>l.name==='Lianvannet');if(!lake)return null;let best=null;
  for(let dx=-120;dx<=120;dx+=4)for(let dz=-120;dz<=120;dz+=4){const x=at[0]+dx,z=at[1]+dz,d=Math.hypot(dx,dz);if(best&&d>=best.d||lakeAt(x,z)!==lake||shoreDistance(lake,x,z)<R+10)continue;best={x,z,d};}
  return best&&{lake,centre:[best.x,best.z],R};}
 return {lakes,lakeAt,shoreDistance,gridHeight,rawHeight,duckCircle};
}
