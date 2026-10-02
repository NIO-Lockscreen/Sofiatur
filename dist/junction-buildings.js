import {junctionObservations} from './junction-observations.js';
import {neighbourhoodStyles} from './dalgard-neighbourhood.js';
import {streetSegments,segmentIndex} from './transit-geometry.js';
// The junction detail pass (doors, window sashes, fascia near junctions) now lives in houses.js and applies to every building by distance to the drivable network (30 September 2026).

export function createJunctionBuildings(data){
 const outgoing=new Map();for(const e of data.edges){if(!outgoing.has(e.from))outgoing.set(e.from,[]);outgoing.get(e.from).push(e);}
 const nodes=[...outgoing].filter(([n,es])=>new Set(es.map(e=>e.to)).size>2||es.some(e=>e.roundabout)||n===data.start).map(([id])=>({id,p:data.nodes[id]}));
 const roads=streetSegments(data.roads),roadIndex=segmentIndex(roads),near=new Set(),cells=new Map(),cell=n=>Math.floor(n/40);
 for(const n of nodes){const k=cell(n.p[0])+','+cell(n.p[1]);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(n);}
 const nearNode=p=>{for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const n of cells.get((cell(p[0])+i)+','+(cell(p[1])+j))||[])if(Math.hypot(p[0]-n.p[0],p[1]-n.p[1])<40)return true;return false;};
 for(const b of data.buildings)if(b.p.some(nearNode))near.add(b.id);
 function style(building){const t=building.t,observed={...junctionObservations[building.id],...neighbourhoodStyles[building.id]},detailed=near.has(building.id)||!!observed.source;
  const material=t['building:material']||t['building:facade:material'];
  return {junction:detailed,...(t['roof:height']?{roofRise:parseFloat(t['roof:height'])}:{}),...(material==='brick'?{brick:true}:{}),...observed};
 }
 return {nodes,near,roads,roadIndex,style};
}
