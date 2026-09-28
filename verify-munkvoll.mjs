import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './dist/vendor/three.js';
import {addMunkvoll,addTransit,addMunkvollDetails,addVintageTram} from './dist/munkvoll.js';
import {streetSegments,projectPoint,createRailProfiles} from './dist/transit-geometry.js';

// Canvas-backed signs only need a 2D context that accepts drawing calls.
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}}),width:0,height:0})};
const data=JSON.parse(fs.readFileSync('dist/map.json')),t=data.terrain,roads=streetSegments(data.roads);
function height(x,z){const a=Math.max(0,Math.min(t.nx-1.001,(x-t.x0)/t.step)),b=Math.max(0,Math.min(t.nz-1.001,(z-t.z0)/t.step)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=t.heights;return 160+(((h[j*t.nx+i]*(1-u)+h[j*t.nx+i+1]*u)*(1-v)+(h[(j+1)*t.nx+i]*(1-u)+h[(j+1)*t.nx+i+1]*u)*v)-160)*1.45;}
let points=[];const scene=new T.Scene(),bucket=()=>({}),tri=(b,...v)=>points.push(...v.slice(0,3)),quad=(b,...v)=>points.push(...v.slice(0,4));
const box=(b,x,y,z,w,h,d)=>points.push([x,y-h/2,z],[x,y+h/2,z]);
const named=name=>{const found=[];scene.traverse(o=>{if(o.name===name)found.push(o);});return found;};
const inside=(poly,x,z)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [ax,az]=poly[j],[bx,bz]=poly[i];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)c=!c;}return c;};

// Tram no. 29: every part stands on the yard spur, clear of the streets and the depot buildings,
// with the pantograph head just under the contact wire.
const placed=addTransit({T,scene,data,height,bucket,quad,box,groundPoly(){},ribbon(){},roadSegments:roads.map(r=>[...r])}).tram;
const [front,rear]=named('Tram destination');assert.ok(front&&rear,'Tram has a destination box at both ends');
const {railHeight}=createRailProfiles(data.rails,height,roads),spur=data.rails.find(r=>r.id==='92540874');
const mid=[(front.position.x+rear.position.x)/2,(front.position.z+rear.position.z)/2],rail=[spur.p.at(-3),spur.p.at(-2)];
assert.ok(projectPoint(mid,...rail).distance<.05,'Tram centred on the spur');assert.ok(Math.abs(Math.hypot(front.position.x-rear.position.x,front.position.z-rear.position.z)-13.46)<.1,'Tram is 13.4 m long');
const top=railHeight(spur,...mid)+.5;assert.ok(Math.abs(placed.base-top)<.01);
points=[];addVintageTram({T,scene:new T.Scene(),bucket,quad,box,...placed});const tram=points;
assert.ok(tram.length>150,`Tram geometry drawn (${tram.length})`);assert.ok(Math.min(...tram.map(p=>p[1]))>=top-.01,'Wheels sit on the rail top');
assert.ok(Math.max(...tram.map(p=>p[1]))<railHeight(spur,...mid)+6.5,'Pantograph stays under the wire');
// The spur is laid in the asphalt of the depot's service lane (as in the photo); public streets stay clear.
const streets=streetSegments(data.roads.filter(r=>r.type!=='service'));
for(const p of tram){for(const [a,b,w] of streets)assert.ok(projectPoint([p[0],p[2]],a,b).distance>w/2+.3,'Tram clear of the street');
 for(const id of ['89233524','89233421','89233428'])assert.ok(!inside(data.buildings.find(b=>b.id===id).p,p[0],p[2]),'Tram clear of depot building '+id);}

// Junction landmarks: Palermo with the solarium signs, Sabrura and the Lille Szechuan house replace their generic boxes.
for(const id of ['89233446','186841226','186841234'])assert.ok(addMunkvoll({T,scene,building:data.buildings.find(b=>b.id===id),height,bucket,tri,quad,box}),'Landmark model '+id);
assert.equal(named('SUNNY BEACH SOLSTUDIO').length,2,'Solarium sign on the west gable and over the door');
for(const name of ['SABRURA','TAKEAWAY','LILLE SZECHUAN BYÅSEN TAKE AWAY · CATERING'])assert.ok(named(name).length,name+' sign');

// Details on generic footprints sit on the wall base and within the wall height the builder used.
const wallBase=new Map([['89233532',{y:136.3,h:7.1}],['89233524',{y:131.6,h:8.2}]]);points=[];
addMunkvollDetails({T,scene,data,wallBase,bucket,quad,box});
const [school]=named('BYÅSEN SKOLE'),[boreal]=named('BOREAL Lakk- og karosseriverksted GråkallBanen');
assert.ok(school&&school.position.y<136.3+7.1&&school.position.y>136.3+5.5,'School name under the roof edge');
assert.ok(boreal&&boreal.position.y+1.1<=131.6+8.2+.01&&boreal.position.y-1.1>131.6+5.5,'Boreal sign above the door, under the roof edge');
assert.ok(points.every(p=>p[1]>=136.3-.01||p[1]>=131.6-.01),'Details never below the wall base');
console.log(`Munkvoll: tram no. 29 on the yard spur (${tram.length} vertices, clear of streets and depot), Palermo with Sunny Beach Solstudio, Sabrura, Lille Szechuan, Byåsen skole and Boreal signs: OK`);
