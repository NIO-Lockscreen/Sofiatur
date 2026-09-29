// Colours observed in road photographs; shapes/positions remain OSM footprints.
// Observation records and stable source identifiers: docs/building-references.md.
export const buildingStyles={
 '1036716365':{wall:'#8d806a',roof:'#4c5049',levels:1,height:2.25,flat:true,siding:true,source:'hallset89-aerial'},
 '186841247':{wall:'#f1f0e8',roof:'#656255',levels:3,height:8.5,gabled:true,roofRise:2.8,horizontalSiding:true,balconies:'south',source:'hallset89-aerial'},
 '186841219':{wall:'#f1f0e8',roof:'#656255',levels:3,height:8.5,gabled:true,roofRise:2.8,horizontalSiding:true,balconies:'west',source:'hallset89-aerial'},
 '140872528':{wall:'#e1e7e4',roof:'#43494b',levels:4,height:11.2,flat:true,source:'hallset89-aerial'},
 '186839677':{wall:'#e9e9df',roof:'#b86d49',levels:3,height:8.6,gabled:true,roofRise:2.7,horizontalSiding:true,source:'hallset89-aerial'},
 '187112208':{wall:'#72523e',roof:'#41433d',levels:2,siding:true,source:'user-home-neighbour'},
 '188005702':{wall:'#4a4234',roof:'#3e413b',levels:2,siding:true,source:'user-home-downhill'},
 '89233508':{wall:'#bda399',roof:'#56574e',levels:3,height:8.7,gabled:true,roofRise:3.1,sections:['#bda399','#b77b59','#c2a69a','#bb8361'],balconies:'south',source:'hallset84-listing'},
 '89233417':{wall:'#c9b493',roof:'#56574e',levels:3,height:8.7,gabled:true,roofRise:3.1,balconies:'south',source:'hallset84-courtyard-photo'},
 '186841243':{wall:'#e9e7df',roof:'#56574e',levels:3,height:8.5,gabled:true,roofRise:2.7,siding:true,source:'adolf2b-balcony-photo'},
 '187113250':{wall:'#40251f',roof:'#303237',levels:1,height:3.4,roofRise:3.2,siding:true,source:'user-home'},
 '1037053935':{wall:'#37241e',roof:'#303237',levels:1,height:2.8,siding:true,source:'user-home'},
 '89233532':{wall:'#ae9182',roof:'#4e5050',levels:2,height:7.1,flat:true,base:'low',brick:true,source:'svv-selsbakk'},
 '295892551':{wall:'#e5deca',roof:'#484a43',levels:3,height:8.6,source:'svv-byasen'},
 '189462751':{wall:'#eeeeea',roof:'#45494a',levels:2,siding:true,source:'svv-selsbakk'},
 '1036716388':{wall:'#b7aea9',roof:'#484a47',levels:2,siding:true,source:'svv-selsbakk'},
 '1036716389':{wall:'#b7aea9',roof:'#484a47',levels:2,siding:true,source:'svv-selsbakk'},
 '189462743':{wall:'#f1efdf',roof:'#414641',levels:2,siding:true,source:'svv-school-east'},
 '1036716586':{wall:'#ecebdc',roof:'#494c47',levels:2,siding:true,source:'svv-school-east'},
 '189457460':{wall:'#97452b',roof:'#404344',levels:2,siding:true,source:'svv-school-east'},
 '1036716218':{wall:'#f2f1e9',roof:'#484943',levels:2,siding:true,source:'svv-school-east'},
 '1036716464':{wall:'#e6e5da',roof:'#55574e',levels:2,siding:true,source:'svv-selsbakk'},
 '189462748':{wall:'#72786f',roof:'#414943',levels:2,siding:true,source:'svv-school-west'},
 '1036715927':{wall:'#72786f',roof:'#414943',levels:2,siding:true,source:'svv-school-west'},
 '89233446':{wall:'#bfc2b1',roof:'#55584d',levels:2,height:6.4,siding:true,source:'svv-school-west'},
 '186841234':{wall:'#f0eeea',roof:'#946849',levels:2,siding:true,source:'svv-munkvoll'},
 '169707628':{wall:'#dbd8bd',roof:'#656659',levels:2,siding:true,source:'svv-byasen'},
 '1036716339':{wall:'#dbd8bd',roof:'#656659',levels:2,siding:true,source:'svv-byasen'},
 // Dalgårdstunet (2024): hus A light sand render, five storeys over the Extra shop; hus B gold-khaki cladding, four storeys.
 '1312240278':{wall:'#e8dcbb',roof:'#3b3f41',levels:5,height:16.4,flat:true,source:'dalgardstunet-prospekt'},
 '1312240279':{wall:'#b6a26b',roof:'#3b3f41',levels:4,height:13.4,flat:true,balconies:'south',source:'dalgardstunet-prospekt'},
 // The old house behind Bunnpris Ugla (user's photo): white vertical boards, dark red window frames, dark tiled gable
 // roof. The shop in front of it is modelled in stavset.js.
 '191198632':{wall:'#efeee7',roof:'#36312e',levels:2,siding:true,frame:'#8e2b27',gabled:true,roofRise:3.4,chimney:true,source:'bunnpris-photos'}
};

// Two chargers at the head of the parking bays on the car park's south-west edge, between bays, 8 m from Drivhusvegen's
// centre line. They used to stand in Drivhusvegen itself, where the car drives in to KIWI.
export const KIWI_CHARGERS=[[777.7,217.9],[780.4,222.5]];
export function addKiwi({T,scene,building,height,bucket,tri,quad,box,groundPoly,ribbon}){
 const p=building.p.slice(0,-1),b=bucket(813,194);
 const y=Math.max(...p.map(v=>height(...v)))+.15,top=y+5.5;
 const centre=p.reduce((a,v)=>[a[0]+v[0]/p.length,a[1]+v[1]/p.length],[0,0]);
 // Silver flat roof and anthracite vertical cladding match the 2017 aerial reference.
 for(let i=0;i<p.length;i++){
  const a=p[i],c=p[(i+1)%p.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]),dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len;
  let nx=-dz,nz=dx;if(nx*((a[0]+c[0])/2-centre[0])+nz*((a[1]+c[1])/2-centre[1])<0){nx=-nx;nz=-nz;}
  const v=(d,h,offset=.07)=>[a[0]+dx*d+nx*offset,h,a[1]+dz*d+nz*offset];
  quad(b,[a[0],height(...a)-.4,a[1]],[c[0],height(...c)-.4,c[1]],[c[0],y+.2,c[1]],[a[0],y+.2,a[1]],'#b5b5af');
  quad(b,v(0,y,0),v(len,y,0),v(len,top,0),v(0,top,0),'#292f30');
  // Front has a long clerestory; parking-side entrance has full-height glass.
  if(i===0)quad(b,v(4,y+3.5),v(len-8,y+3.5),v(len-8,y+4.5),v(4,y+4.5),'#8cabb0');
  if(i===1)quad(b,v(1,y+.22),v(len-2,y+.22),v(len-2,y+3.65),v(1,y+3.65),'#587580');
  for(let d=.6;d<len;d+=.75)quad(b,v(d,y+.2,.09),v(d+.045,y+.2,.09),v(d+.045,top-.2,.09),v(d,top-.2,.09),'#373d3d');
  if(i===1){for(let d=1;d<len-2;d+=2.7)quad(b,v(d,y+.2,.15),v(d+.09,y+.2,.15),v(d+.09,y+3.8,.15),v(d,y+3.8,.15),'#c0c8c7');}
  quad(b,v(0,top-.08,.14),v(len,top-.08,.14),v(len,top+.17,.14),v(0,top+.17,.14),'#d4d9d8');
  if(i===0||i===1){
   const along=i===0?len-4.6:5.5;
   const textureCanvas=document.createElement('canvas');textureCanvas.width=768;textureCanvas.height=192;const ctx=textureCanvas.getContext('2d');
   ctx.fillStyle='#252b2b';ctx.fillRect(0,0,768,192);ctx.fillStyle='#8dc63f';ctx.font='900 135px Arial';ctx.textAlign='center';ctx.fillText('KIWI',305,139);ctx.fillStyle='#ffffff';ctx.font='bold 40px Arial';ctx.fillText('mini',660,86);ctx.fillText('pris',660,132);
   const tex=new T.CanvasTexture(textureCanvas);tex.colorSpace=T.SRGBColorSpace;
   const sign=new T.Mesh(new T.PlaneGeometry(7.3,1.8),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));sign.name='KIWI facade sign';sign.position.set(...v(along,y+4.55,.2));sign.rotation.y=Math.atan2(nx,nz);scene.add(sign);
   quad(b,v(i===0?len-9:1,y,.19),v(i===0?len-8.5:1.5,y,.19),v(i===0?len-6.8:3.2,y+3.6,.19),v(i===0?len-7.3:2.7,y+3.6,.19),'#77b52f');
  }
 }
 for(const f of T.ShapeUtils.triangulateShape(p.map(v=>new T.Vector2(...v)),[]))tri(b,...f.map(i=>[p[i][0],top+.1,p[i][1]]),'#cbd0cd');
 // Solar grid sits entirely inside the real trapezoidal building outline.
 const a=p[0],u=[(p[1][0]-a[0])/43.64,(p[1][1]-a[1])/43.64],v=[u[1],-u[0]];
 const roofPoint=(x,z,h)=>[a[0]+u[0]*x+v[0]*z,h,a[1]+u[1]*x+v[1]*z];
 for(let x=4;x<38;x+=3.4)for(let z=3;z<19;z+=2.6){quad(b,roofPoint(x,z,top+.24),roofPoint(x+3,z,top+.24),roofPoint(x+3,z+2.15,top+.62),roofPoint(x,z+2.15,top+.62),'#3b526b');quad(b,roofPoint(x+1.48,z,top+.26),roofPoint(x+1.53,z,top+.26),roofPoint(x+1.53,z+2.15,top+.64),roofPoint(x+1.48,z+2.15,top+.64),'#adb9c1');}
 // OSM surface parking polygon 526443211, not a guessed plaza.
 const parking=[[773.2,213.6],[789.5,241.9],[798.8,235.9],[798.6,230.3],[803.3,227.7],[789.7,204.1],[784.8,195.8],[780,198.3],[785.1,207.1]];
 groundPoly(parking,'#707773',.44);
 for(let i=0;i<6;i++){const x=777.3+i*2.7*.5,z=215+i*2.7*.86;ribbon([[x,z],[x+4.5,z-2.6]],.13,'#e8e9df',.48);}
 for(const [x,z] of KIWI_CHARGERS){box(b,x,height(x,z)+.9,z,.6,1.6,.45,'#343e3d');box(b,x,height(x,z)+1.27,z,.61,.52,.46,'#8abd39');}
 return {bounds:[773,170,838,242]};
}
