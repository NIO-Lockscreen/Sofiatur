import {roadWidth} from './transit-geometry.js';
// The drawn road: 8 m quads laid on the terrain, a kerb band under the carriageway.
// The world renders exactly these quads and the car rides on them, so it cannot sink below
// the road where the terrain bends between two map nodes.
export function createRoadSurface(roads,height){
 const quads=[],cells=new Map(),size=8;
 function index(t){const xs=t.map(p=>p[0]),zs=t.map(p=>p[2]);for(let x=Math.floor(Math.min(...xs)/size);x<=Math.floor(Math.max(...xs)/size);x++)for(let z=Math.floor(Math.min(...zs)/size);z<=Math.floor(Math.max(...zs)/size);z++){const k=x+','+z;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(t);}}
 function strip(road,width,lift,kerb){const p=road.p;for(let j=0;j<p.length-1;j++){const a=p[j],b=p[j+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<.01)continue;const dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len,at=(x,z)=>[x,height(x,z)+lift,z];
  for(let d=0;d<len;d+=8){const e=Math.min(len,d+8),ax=a[0]+d*dx,az=a[1]+d*dz,bx=a[0]+e*dx,bz=a[1]+e*dz;
   const corners=[at(ax-dz*width/2,az+dx*width/2),at(ax+dz*width/2,az-dx*width/2),at(bx+dz*width/2,bz-dx*width/2),at(bx-dz*width/2,bz+dx*width/2)];
   quads.push({road,kerb,x:ax,z:az,corners});index([corners[0],corners[1],corners[2]]);index([corners[0],corners[2],corners[3]]);}}}
 for(const road of roads){const width=roadWidth(road);strip(road,width+1.4,.3,true);strip(road,width,.39,false);}
 // Highest drawn road at (x,z), or null off the road.
 function heightAt(x,z){let top=null;for(const [p,q,r] of cells.get(Math.floor(x/size)+','+Math.floor(z/size))||[]){const d=(q[2]-r[2])*(p[0]-r[0])+(r[0]-q[0])*(p[2]-r[2]);if(Math.abs(d)<1e-9)continue;const u=((q[2]-r[2])*(x-r[0])+(r[0]-q[0])*(z-r[2]))/d,v=((r[2]-p[2])*(x-r[0])+(p[0]-r[0])*(z-r[2]))/d,w=1-u-v;if(u<-1e-7||v<-1e-7||w<-1e-7)continue;const y=u*p[1]+v*q[1]+w*r[1];if(top===null||y>top)top=y;}return top;}
 return {quads,heightAt};
}
