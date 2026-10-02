// Bøckmans veg 102, where the game says "Du besøker Ludvig" (2 October 2026, from the user's Google Street View photo of May 2026 and
// Statens vegvesen's road images of Bøckmans veg (county road 6656) of 14 July 2025, both viewed only; docs/ludvig.md).
// What the pictures show, and what is drawn here or set as a style record:
// - 102C-D (OSM 189462739, Matrikkelen 10469007: a detached house with two dwellings): white vertical boards, white trim, a dark grey
//   tiled gable roof with a cross gable over the entrance towards the road, dark-stained timber steps, rails and a terrace in front of
//   the east wing.
// - 102A-B (OSM 1036716392/93, a new semi-detached pair): a tall white house of three floors in vertical boards, a low dark roof.
// - The garage west of 102C-D (OSM 189462749): white, flat-roofed, its door towards the road; the new house beyond it (OSM 1036716586):
//   white boards, dark tiled gable roof.
// - In front of them all, between the kerb and the houses, an open yard of grey gravel with a bed of dark earth and weeds in front of
//   102C; the car parks on the gravel in front of the garage (map_fixes.add_ludvig_parking), where the user marked it.
export const ludvigStyles={
 '189462739':{wall:'#efeee9',roof:'#3a3c40',trim:'#f7f6f2',door:'#ece9e1',levels:1,height:4.3,roofRise:3.6,siding:true,roofShape:'gabled',source:'streetview-2026-05;vegbilder-2025-07-14'}, // one and a half floors under a steep roof
 '1036716392':{wall:'#e9e8e3',roof:'#3b3d41',trim:'#f4f3ee',levels:3,siding:true,roofShape:'gabled',source:'vegbilder-2025-07-14'},
 '1036716393':{wall:'#e9e8e3',roof:'#3b3d41',trim:'#f4f3ee',levels:3,siding:true,roofShape:'gabled',source:'vegbilder-2025-07-14'},
 '189462749':{wall:'#f0efea',roof:'#d4d3cd',levels:1,flat:true,source:'streetview-2026-05;vegbilder-2025-07-14'},
 '1036716586':{wall:'#eeede8',roof:'#383a3e',trim:'#f6f5f1',levels:2,siding:true,roofShape:'gabled',source:'streetview-2026-05'},
};
const GRAVEL='#8f8b81',GRAVEL_DARK='#7f7a70',SOIL='#4e4a42',TIMBER='#4a3e35',TIMBER_DARK='#3a312a';
const inside=(p,x,z)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [ax,az]=p[j],[bx,bz]=p[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};
// The yard: from the kerb of Bøckmans veg (its south edge, 3.65 m half width plus the kerb) back to the house fronts, x 1775-1810.
export const LUDVIG_YARD=[[1775,111.2],[1783.8,109.3],[1795,106.2],[1804.9,103.5],[1810.5,101.9],[1810.5,116.6],[1801,120.4],[1792,121.5],[1788.2,124.6],[1780,123.6],[1775,123.2]];
const BED=[[1790.6,113.3],[1801.2,110.3],[1802.2,113.6],[1797.2,115.4],[1792,116.9]];
export function addLudvig({data,wallBase,ground,bucket,quad,box,onRoad=()=>false}){
 if(!data.nodes['ludvig-parkering'])return {triangles:0};
 let tris=0;const q=(b,a,c,d,e,col)=>{quad(b,a,c,d,e,col);tris+=2;};
 // Gravel in 2 m cells that follow the ground, a little over it; none on the road or the driveway; the earth bed in front of 102C.
 const S=2;for(let x=1775;x<1810.5;x+=S)for(let z=101;z<125;z+=S){const cx=x+S/2,cz=z+S/2;if(!inside(LUDVIG_YARD,cx,cz)||onRoad(cx,cz))continue;
  const bed=inside(BED,cx,cz),col=bed?SOIL:((Math.floor(x/S)+Math.floor(z/S))%3?GRAVEL:GRAVEL_DARK),lift=bed?.075:.06,b=bucket(cx,cz);
  q(b,[x,ground(x,z)+lift,z],[x+S,ground(x+S,z)+lift,z],[x+S,ground(x+S,z+S)+lift,z+S],[x,ground(x,z+S)+lift,z+S],col);}
 // Weeds and a small shrub in the bed.
 for(const [x,z,s] of [[1793.5,114.6,.55],[1796.2,113.4,.4],[1799.4,112.4,.65],[1795,115.6,.35]])box(bucket(x,z),x,ground(x,z)+s/2,z,s*1.3,s,s*1.1,'#5d6b3c',.4),tris+=12;
 // 102C-D: the terrace in front of the east wing (its front wall runs from (1801.3, 120.6) to (1807.9, 118.5)), on dark posts at the
 // floor's level, with a rail of dark slats; dark timber steps down from it at the west end.
 const base=wallBase.get('189462739');if(base){
  const floor=base.y+.5,a=[1801.6,120.5],c=[1807.6,118.6],L=Math.hypot(c[0]-a[0],c[1]-a[1]),dx=(c[0]-a[0])/L,dz=(c[1]-a[1])/L,nx=dz,nz=-dx,D=2.4; // n: out of the house (north)
  const P=(u,o,y)=>[a[0]+dx*u+nx*o,y,a[1]+dz*u+nz*o],b=bucket(a[0],a[1]),angle=Math.atan2(-dz,dx);
  q(b,P(0,0,floor),P(L,0,floor),P(L,D,floor),P(0,D,floor),TIMBER);q(b,P(0,D,floor-.22),P(L,D,floor-.22),P(L,D,floor),P(0,D,floor),TIMBER_DARK);
  for(const u of [.15,L/2,L-.15]){const [x,,z]=P(u,D-.12,0),g=ground(x,z);if(floor-g>.1){box(b,x,(floor+g)/2,z,.14,floor-g,.14,TIMBER_DARK,angle);tris+=12;}}
  for(let u=.1;u<L;u+=.24){const [x,,z]=P(u,D-.06,0);box(b,x,floor+.5,z,.07,1,.04,TIMBER,angle);tris+=12;}
  for(let s=0;s<2;s++){const o=s?0:D-.06;q(b,P(0,o,floor+.98),P(L,o,floor+.98),P(L,o,floor+1.06),P(0,o,floor+1.06),TIMBER_DARK);}
  // the steps from the terrace to the yard at its west end
  const g=ground(...[P(0,D+1,0)[0],P(0,D+1,0)[2]]),drop=floor-g,n=Math.max(1,Math.min(6,Math.ceil(drop/.18)));
  if(drop>.15)for(let k=0;k<n;k++){const y=floor-(k+1)*drop/n,o=D+k*.28;q(b,P(-.05,o,y),P(1.1,o,y),P(1.1,o+.3,y),P(-.05,o+.3,y),TIMBER);q(b,P(-.05,o,y),P(1.1,o,y),P(1.1,o,y+drop/n),P(-.05,o,y+drop/n),TIMBER_DARK);}
 }
 return {triangles:tris};
}
