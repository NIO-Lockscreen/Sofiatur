// Follow directed OSM roundabout edges once; each choice contains a complete drive to an exit.
export function roundaboutChoices(entry, previous, adjacency, distances) {
 // The whole circle first: its length gives each exit's place around it, and its nodes tell a lane back into it.
 const ringNodes=new Set();let circumference=0;for(let n=entry;!ringNodes.has(n);){ringNodes.add(n);const next=(adjacency.get(n)||[]).find(e=>e.roundabout);if(!next)break;circumference+=next.length;n=next.to;}
 const plans=[], visited=new Set();let node=entry,ring=[];
 while(!visited.has(node)){
  visited.add(node);
  for(const exit of adjacency.get(node)||[]){
   if(exit.roundabout||!distances.has(exit.to)||(node===entry&&exit.to===previous))continue;
   const segments=[...ring,exit];let last=exit;const outside=new Set([node]);
   // Carry through one-way splitter islands to the actual outgoing street. The other lane at the island only
   // leads back into this circle, so it is not a choice: once an exit is picked the car simply drives out.
   while(last.to!==entry&&!outside.has(last.to)){
    outside.add(last.to);
    const next=(adjacency.get(last.to)||[]).filter(e=>e.to!==last.from&&distances.has(e.to)&&!ringNodes.has(e.to));
    if(next.length!==1||next[0].roundabout)break;
    last=next[0];segments.push(last);
   }
   const path=[entry];for(const e of segments)path.push(...e.path.slice(1));
   const ringLength=ring.reduce((s,e)=>s+e.length,0);
   plans.push({id:-exit.id-1,from:entry,to:last.to,path,name:segments.slice(ring.length).find(e=>e.name!=='Lokalvei')?.name||'Avkjørsel',length:segments.reduce((s,e)=>s+e.length,0),cost:segments.reduce((s,e)=>s+(e.cost||e.length),0),roundaboutPlan:true,exitNumber:plans.length+1,exitEdge:last,arrivalFrom:last.from,ringLength,sweep:circumference?360*ringLength/circumference:0,segments});
  }
  const next=(adjacency.get(node)||[]).find(e=>e.roundabout);
  if(!next)break;ring.push(next);node=next.to;
 }
 return plans;
}

