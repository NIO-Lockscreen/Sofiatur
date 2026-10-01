// How the houses look: colours, cladding and the seeded random numbers that keep every building the same between runs.
// 30 September 2026. The palettes are estimates from what the aerial photo, Statens vegvesen road images and listing photos
// of Byåsen show (docs/building-references.md, docs/junction-references.md): white and cream boards, light and dark grey,
// dark brown, falu red and ochre yellow on the walls; black, grey, red and brown roofs. Buildings with a style record
// (building-details.js, junction-observations.js) or an OSM colour tag keep that colour; everything else is drawn
// from these lists with a random generator seeded by the OSM id.

// A fast seeded generator (mulberry32) and a string hash for the seed.
export function seedOf(id){let h=2166136261;for(const c of String(id)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function pick(r,list){let total=0;for(const e of list)total+=e[1];let x=r()*total;for(const e of list){x-=e[1];if(x<=0)return e[0];}return list[list.length-1][0];}

// Colour arithmetic on '#rrggbb' strings, cached because the same few dozen colours are used for thousands of faces.
const cache=new Map();
const rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const hexOf=(r,g,b)=>'#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
export function shade(h,f){const k=h+'*'+f;let v=cache.get(k);if(!v){const [r,g,b]=rgb(h);v=hexOf(r*f,g*f,b*f);cache.set(k,v);}return v;}
export function mix(a,b,t){const k=a+'+'+b+t;let v=cache.get(k);if(!v){const x=rgb(a),y=rgb(b);v=hexOf(x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t);cache.set(k,v);}return v;}
export const luminance=h=>{const [r,g,b]=rgb(h);return(.299*r+.587*g+.114*b)/255;};
// The tone of a cladding stripe or roof seam: darker on light surfaces, lighter on dark ones, so both show.
export const stripeTone=(h,amount=1)=>luminance(h)>.42?shade(h,1-.075*amount):mix(h,'#ffffff',.09*amount);
// '#abc', 'red' and '#aabbcc' all become '#aabbcc'.
const NAMED={white:'#f4f4f0',grey:'#9a9d9b',gray:'#9a9d9b',red:'#9a3f30',brown:'#7b5a43',yellow:'#d8b75c',green:'#7e8b6a',blue:'#7c8fa0',black:'#2d2f31',beige:'#d9c7a1',orange:'#c9803f',darkgrey:'#5d6366',lightgrey:'#cfd2cf'};
export function normHex(c){if(typeof c!=='string')return null;const s=c.trim().toLowerCase();if(/^#[0-9a-f]{6}$/.test(s))return s;if(/^#[0-9a-f]{3}$/.test(s))return '#'+[...s.slice(1)].map(x=>x+x).join('');return NAMED[s]||null;}

// Walls: [colour, weight]. Weights follow the mix seen along the streets: a lot of white/cream and grey, dark and mid brown,
// falu red, some ochre yellow, a little beige, sage green and blue-grey.
export const WALLS=[['#f1efe6',6],['#e9e5d6',4],['#eee9dc',3],['#cfd2cf',4],['#b8bcb9',3],['#9ea4a4',2],['#5d6366',2],['#45494b',2],
 ['#7b5a43',4],['#634633',3],['#4a3428',3],['#9a3f30',4],['#833326',3],['#b2543c',2],['#dcc276',3],['#e3cf91',3],['#cfae5c',2],
 ['#d9c7a1',3],['#cdb893',2],['#8a9578',1.5],['#657563',.7],['#8396a5',1.3],['#667a8c',.6]];
// Flats and terraces of the 1970s-2000s: beige, cream, brown, rust, yellow; fewer strong colours.
export const BLOCK_WALLS=[['#e9e3d3',5],['#d9cfb8',4],['#c9bfa6',3],['#e4e0d8',4],['#b9a58a',3],['#a8695a',2],['#c2a06a',2],['#8d7a66',2],['#bfc4bd',2],['#d8c27a',1]];
export const TERRACE_WALLS=[['#7b5a43',4],['#634633',3],['#e9e5d6',3],['#d8b75c',3],['#9a3f30',3],['#b8bcb9',3],['#5d6366',2],['#d9c7a1',2],['#7e8b6a',1],['#4a3428',2]];
export const PUBLIC_WALLS=[['#d9d6cb',4],['#bfc4bd',3],['#e9e5d6',3],['#b9a58a',2],['#a59a8a',2],['#8f979a',2],['#c2a06a',1]];
// Roofs: black and grey concrete tile or sheet, red and brown tile.
export const ROOFS=[['#373b3d',22],['#2f3335',14],['#444a4c',10],['#66696a',10],['#7a7f80',6],['#7f3b2c',9],['#8a4431',6],['#6f3427',4],['#5b4538',5],['#6a5242',3],['#4f5e52',.4]];
export const FLAT_ROOFS=[['#4a4e50',5],['#5b5f60',3],['#72767a',2],['#6d7d5e',.4]];
export const DOORS=[['#8e2b27',3],['#2f4a3f',2],['#2d3f5a',2],['#3c2f2a',3],['#2d2f31',3],['#e9e7df',3],['#c9a13c',1],['#6d7276',2],['#7a4a2c',2]];
export const PLINTHS=[['#a7aaa5',4],['#9a9d99',3],['#b3b5b0',3],['#8f9390',2]];
export const GLASS_TOPS=[['#b8cdd3',5],['#a9c0c8',4],['#c7d4d6',3],['#8fb0ba',3],['#e3dcc8',2],['#3f535a',1.5]];

// Class of a Matrikkelen building type (SSB bygningstype), the same as type_class() in add-buildings.py.
export const typeClass=c=>c>=111&&c<=113?'house':c===121||c===122||c===123?'semi':c===131||c===132||c===133?'terrace':(c>=141&&c<=146)||c===135||c===136||c===159?'block':c>=181&&c<=189?'garage':c>=161&&c<=169?'cabin':'public';
export const GARAGE_TYPES=[181,182,183,184,189];
// Kind of building: from the OSM tag and the footprint, and, where add-buildings.py noted one (mk = [bygningstype, dwellings]), from the
// type registered in Matrikkelen, which wins when the two disagree (a row of houses mapped as building=house, a garage mapped as
// building=yes). 'garage' also covers sheds and other small outbuildings.
export function kindOf(t,area,garage,mk=null){
 if(mk){const c=typeClass(mk[0]);
  if(c==='garage')return 'garage';
  if(garage&&area>=40&&(c==='house'||c==='semi'||c==='terrace'))garage=false;
  if(!garage){if(c==='house')return 'house';if(c==='semi')return 'semi';if(c==='terrace')return area>70?'terrace':'house';if(c==='block')return area>=150?'block':'house';}}
 if(garage)return 'garage';
 let b=t.building;
 if(b==='construction')b=area>300?'apartments':'house';
 if(b==='terrace')return area>70?'terrace':'house';
 if(b==='semidetached_house')return 'semi';
 if(b==='apartments'||(b==='residential'&&area>330)||((b==='yes'||b==='residential')&&area>500&&!t.shop&&!t.amenity))return 'block';
 if(['school','kindergarten','civic','commercial','retail','office','warehouse','industrial','sports_hall','sports_centre','service','transportation','hospital','church','chapel','farm_auxiliary','barn','greenhouse'].includes(b)||t.shop||t.amenity)return 'public';
 return 'house';
}

// Wall colour, trim, roof and cladding of one building. `style` holds photo-matched overrides; `neighbour` is the look of the
// house a garage belongs to (a garage next to a house is nearly always painted like it).
export function lookFor({id,t,style,kind,area,neighbour=null,normalise=normHex}){
 const r=rng(seedOf(id));
 const wallPick=pick(r,kind==='terrace'?TERRACE_WALLS:kind==='block'?BLOCK_WALLS:kind==='public'?PUBLIC_WALLS:WALLS);
 const roofPick=pick(r,ROOFS),flatPick=pick(r,FLAT_ROOFS),doorPick=pick(r,DOORS),plinth=pick(r,PLINTHS);
 const panelRoll=r(),dirRoll=r(),trimRoll=r(),tileRoll=r();
 const own=normalise(style.wall)||normalise(t['building:colour']);
 let wall=own||(neighbour&&neighbour.wall)||wallPick;
 const ownRoof=normalise(style.roof)||normalise(t['roof:colour']);
 const shape=style.flat?'flat':style.roofShape||(style.gabled?'gabled':t['roof:shape'])||(area<450&&t.building!=='apartments'?'gabled':'flat'),flat=!['gabled','hipped','skillion','half-hipped'].includes(shape);
 let roof=ownRoof||(neighbour&&!neighbour.flat&&!flat&&neighbour.roof)||(flat?flatPick:roofPick);
 // Cladding: timber colours are nearly always boards, white and grey houses are boards about half the time, the rest render.
 const w=luminance(wall),[cr,cg,cb]=rgb(wall),timber=(Math.max(cr,cg,cb)-Math.min(cr,cg,cb))/Math.max(1,Math.max(cr,cg,cb))>.22||w<.36;
 let panel;
 if(style.horizontalSiding)panel='h';else if(style.siding)panel='v';else if(style.brick)panel='brick';
 else if(neighbour&&neighbour.panel&&!own)panel=neighbour.panel;
 else if(kind==='block')panel=panelRoll<.22?'h':'none';
 else if(kind==='public')panel='none';
 else panel=panelRoll<(timber?.93:.58)?(dirRoll<(kind==='terrace'?.6:.5)?'h':'v'):'none';
 // Trim: white on most; dark on some dark houses; cream on cream houses.
 let trim=normalise(style.trim)||(neighbour&&neighbour.trim)||(w<.3&&trimRoll<.35?'#dcdad2':w>.8&&trimRoll<.25?'#cfcdc4':trimRoll<.07?'#3a3e40':'#f3f1e9');
 const metal=!ownRoof?!(roof==='#7f3b2c'||roof==='#8a4431'||roof==='#6f3427'||roof==='#5b4538'||roof==='#6a5242'||roof==='#9a4a34')&&tileRoll<.42:false;
 return {wall,roof,flat,panel,trim,door:normalise(style.door)||doorPick,plinth,metal,
  frame:normalise(style.frames)||normalise(style.frame)||trim,glass:normalise(style.glass)||null};
}
