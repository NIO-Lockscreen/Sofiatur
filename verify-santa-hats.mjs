import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.js';
import {isDecember,santaSeason,setSantaSeason,HAT_TIP} from './dist/santa-hat.js';
import {createDuck} from './dist/duck.js';
import {createRideDuck} from './dist/rides.js';
import {createDuckRunnerModel,createDucklingModel} from './dist/duck-runner.js';
import {createGirlModel} from './dist/girl.js';
import {createSpider} from './dist/spider.js';
import fs from 'node:fs';
// The Santa hats (dist/santa-hat.js, 24 November 2026): in December Sofia and every duck wear one, the smallest yellow duckling too.

// December by the device's own calendar, from midnight on 1 December to midnight on 1 January.
for(const [y,m,d,h,mi,on] of [[2026,11,30,23,59,false],[2026,12,1,0,0,true],[2026,12,24,18,0,true],[2026,12,31,23,59,true],[2027,1,1,0,0,false],[2027,7,1,12,0,false]])
 assert.equal(isDecember(new Date(y,m-1,d,h,mi)),on,`${d}.${m}.${y} ${h}:${mi}`);
// santaSeason() follows the calendar while the game is open: it looks again every half minute, so the hats come on just after midnight on 1 December.
const RealDate=Date;let now=new RealDate(2026,10,30,23,59,50).getTime();
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}};
setSantaSeason(null);assert.equal(santaSeason(),false,'30 November');
now+=20000;assert.equal(santaSeason(),false,'checked at most every half minute');
now+=11000;assert.equal(santaSeason(),true,'just after midnight on 1 December, with the game open');
now=new RealDate(2026,11,31,23,59,50).getTime();setSantaSeason(null);assert.equal(santaSeason(),true,'New Year\'s Eve');
now+=31000;assert.equal(santaSeason(),false,'gone on 1 January');
setSantaSeason(true);assert.equal(santaSeason(),true);setSantaSeason(false);now=new RealDate(2026,11,24).getTime();assert.equal(santaSeason(),false,'forced off on Christmas Eve');
setSantaSeason(null);assert.equal(santaSeason(),true,'back to the calendar');
// ?jul=1 in the address puts the hats on any day, ?jul=0 takes them off in December (a fresh copy of the module reads the address).
now=new RealDate(2026,10,24,12).getTime();
globalThis.location={search:'?jul=1'};assert.equal((await import('./dist/santa-hat.js?on')).santaSeason(),true,'?jul=1 in November');
now=new RealDate(2026,11,24,12).getTime();
globalThis.location={search:'?jul=0'};assert.equal((await import('./dist/santa-hat.js?off')).santaSeason(),false,'?jul=0 on Christmas Eve');
globalThis.location={search:''};assert.equal((await import('./dist/santa-hat.js?plain')).santaSeason(),true,'no address: the calendar');
delete globalThis.location;globalThis.Date=RealDate;

// The hat's shape: it stands up from the brim and flops over to the side, the pompom at the tip.
assert.ok(HAT_TIP[0]>.9&&HAT_TIP[1]>.6&&HAT_TIP[1]<1.6,'the tip flops over: '+HAT_TIP.map(v=>v.toFixed(2)));

// Every model: one hat on its head, shown in December and hidden otherwise; it sits on top of the head, clear of the eyes, about as wide as the head.
const box=(o,skip)=>{const b=new T.Box3();o.updateWorldMatrix(true,true);o.traverse(m=>{if(m.isMesh&&!(skip&&skip(m)))b.expandByObject(m,false);});return b;};
const inHat=m=>{for(let p=m;p;p=p.parent)if(p.name==='Nisselue')return true;return false;};
setSantaSeason(true);
const spider=createSpider(T,{rider:createGirlModel(T)});
const models=[['the big duck in Lianvannet',createDuck(T),'#1c1f21'],['the duck you drive as',createRideDuck(T),'#1c1f21'],['the small duck behind the car',createDuckRunnerModel(T),'#1c1f21'],
 ['the yellow duckling',createDucklingModel(T),'#1c1f21'],['Sofia',createGirlModel(T),'#2a1a14']];
const call=(m,time)=>m===models[0][1]?m.update(0,time):m.update(0,0,time,0); // the big duck's update is (dt, time), the others' (dt, speed, time, …)
for(const [name,m,eyeColour] of models){
 const hats=[];m.group.traverse(o=>{if(o.name==='Nisselue')hats.push(o);});assert.equal(hats.length,1,name+': one hat');
 assert.ok(m.hat&&hats[0]===m.hat.group,name+': the hat is the model\'s own');let p=hats[0].parent;while(p&&p!==m.head)p=p.parent;assert.ok(p===m.head,name+': the hat is on the head, so it follows it');
 const tall=box(m.group).getSize(new T.Vector3()).y;
 setSantaSeason(false);call(m,1);assert.ok(!m.hat.on&&!m.hat.group.parent,name+': no hat outside December');
 assert.ok(box(m.group).getSize(new T.Vector3()).y<tall-.01,name+': taken off, the hat counts in no bounding box');
 setSantaSeason(true);call(m,1);assert.ok(m.hat.on,name+': the hat back on in December');
 const head=box(m.head,inHat),hat=box(m.hat.group),eyes=box(m.head,o=>inHat(o)||!(o.material?.color?.getHexString()===eyeColour.slice(1)));
 const size=head.getSize(new T.Vector3()),hs=hat.getSize(new T.Vector3()),hc=hat.getCenter(new T.Vector3()),c=head.getCenter(new T.Vector3());
 // Nothing of the hat as far forward as the eyes (forward is −z) comes down to them; it sits back, so only its back may be lower.
 let front=Infinity;m.hat.group.traverse(o=>{if(!o.isMesh)return;const v=new T.Vector3(),pos=o.geometry.attributes.position;for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);if(v.z<=eyes.max.z)front=Math.min(front,v.y);}});
 assert.ok(front>eyes.max.y,`${name}: the hat is above the eyes (${front.toFixed(3)} > ${eyes.max.y.toFixed(3)})`);
 assert.ok(hat.min.y<head.max.y&&hat.max.y>head.max.y+size.y*.15,`${name}: the hat sits on top of the head`);
 assert.ok(Math.abs(hc.x-c.x)<size.x*.5,name+': the hat is in the middle of the head');
 const w=Math.max(hs.x,hs.z)/Math.max(size.x,size.z);assert.ok(w>.75&&w<2,`${name}: the hat fits the head (${w.toFixed(2)} of its width)`);
 const tip=m.hat.pompom.getWorldPosition(new T.Vector3());call(m,2.2);m.group.updateWorldMatrix(true,true);assert.ok(tip.distanceTo(m.hat.pompom.getWorldPosition(new T.Vector3()))>0,name+': the top sways');}
// Sofia on the spider wears hers too (the podium and the dream build their ducks with the same functions, so theirs come with them).
{let n=0;spider.group.traverse(o=>{if(o.name==='Nisselue')n++;});assert.equal(n,1,'Sofia on the spider');}
// The game loads the new file as a module of its own, so it needs no build step; it is in dist/ like the rest.
assert.ok(fs.existsSync('dist/santa-hat.js'));for(const f of ['duck.js','rides.js','duck-runner.js','girl.js'])assert.ok(fs.readFileSync('dist/'+f,'utf8').includes("from './santa-hat.js'"),f);
setSantaSeason(null);
console.log('Santa hats: in December only (1 December 00:00 to 31 December 23:59, also with the game open), ?jul=1 and ?jul=0, and one on each of the big duck, the ride duck, the small duck, the yellow duckling and Sofia (also on the spider), above the eyes and on top of the head.');
