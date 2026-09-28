import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createFreeDrive} from './dist/free-drive.js';
const data={bounds:[-2000,-2000,2000,2000],buildings:[],roads:[{p:[[-1000,0],[1000,0]]}]};
const f=createFreeDrive(data,()=>160),tick=(seconds,input={})=>{for(let i=0;i<seconds*60;i++)f.step(1/60,input);};
f.reset(0,0,0);tick(8);assert.equal(f.car.speed,90/3.6);assert.ok(f.car.z<-150);tick(1,{right:true,drift:true});assert.equal(f.car.drifting,true);assert.ok(Math.abs(f.car.yaw-f.car.course)>.3,'Drifting must slide, not merely turn');tick(1);assert.equal(f.car.drifting,false);assert.ok(Math.abs(f.car.yaw-f.car.course)<.01,'Tyres regain grip');tick(3,{brake:true});assert.equal(f.car.speed,0);assert.ok(f.recover());assert.equal(f.car.z,0);
const wall=createFreeDrive({...data,buildings:[{p:[[-10,-20],[10,-20],[10,-10],[-10,-10],[-10,-20]]}]},()=>0);wall.reset(0,0,0);for(let i=0;i<180;i++)wall.step(1/60,{});assert.ok(wall.car.z>-10);assert.equal(wall.car.speed,0);wall.reset(1994,0,Math.PI/2,90/3.6);wall.step(.045,{});assert.ok(wall.car.x<1995);assert.equal(wall.car.speed,0);
// Road node order must never determine which way recovery faces.
for(const p of [[[-500,0],[500,0]],[[500,0],[-500,0]],[[0,-500],[0,500]],[[0,500],[0,-500]]])for(const sign of [-1,1]){
 const dx=p[1][0]-p[0][0],dz=p[1][1]-p[0][1],heading=Math.atan2(dx,-dz)+(sign<0?Math.PI:0),r=createFreeDrive({...data,roads:[{p}]},()=>0);
 r.reset(15,20,heading+.35);assert.ok(r.recover());assert.ok(Math.cos(r.car.yaw-heading)>.999,'Q preserves prior direction on either axis and OSM node order');
 const old={x:r.car.x,z:r.car.z};r.step(.1,{});assert.ok((r.car.x-old.x)*Math.sin(heading)-(r.car.z-old.z)*Math.cos(heading)>0,'Driving continues in prior direction');
}
const html=fs.readFileSync('dist/index.html','utf8'),game=fs.readFileSync('dist/game.js','utf8');for(const id of ['cameraReset','pace','speedControls','maxSpeed','gas'])assert.ok(!html.includes('id="'+id+'"'));assert.ok(!game.includes("$('pace')"));assert.ok(html.includes('id="driveMode"'));assert.ok(html.includes('id="freeDrift"'));
console.log('Free drive: auto 90 km/h, steering/slip/grip, brake, building/boundary collisions, road recovery and removed controls OK');
