import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as T from './dist/vendor/three.js';
const {createRainbowTrail}=await import(process.env.TRAIL_SRC||'./dist/rainbow-trail.js'); // TRAIL_SRC=<file> --print: regenerate the goldens from another implementation

// The rainbow trail (dist/rainbow-trail.js): the per-frame update was rewritten on 11 November 2026 to allocate nothing (it built two arrays per vertex, a spread list and
// a rear array every frame). The output must stay bit for bit what the old code produced: the golden checksums below were made by running the ORIGINAL code over this exact
// scenario (900 frames: a wiggling drive, a stretch standing still, a jump, a clear, an off/on), once with the default life and once with a long life so the trail
// fills all 180 points. Also checks that update() makes no per-vertex typed-array calls and that the heap does not grow while it runs.
function run(opts,onFrame){const scene=new T.Scene(),t=createRainbowTrail({T,scene,...opts});t.setOn(true);let x=0,z=0,yaw=0;
 for(let f=0;f<900;f++){const still=f>=300&&f<360;if(!still){yaw+=Math.sin(f*.03)*.05;const sp=f<120?.4:.9;x+=Math.sin(yaw)*sp;z-=Math.cos(yaw)*sp;}
  if(f===500)x+=50;if(f===650)t.clear();if(f===700){t.setOn(false);t.setOn(true);}
  t.update(.045,{x,y:100+Math.sin(f*.02)*3,z},{x:Math.sin(yaw),y:Math.sin(f*.05)*.3,z:-Math.cos(yaw)});onFrame(f,t);}
 return t;}
const GOLDEN={"default":{"0":"97bc94c50ab63104","50":"dc0c96972752b9e4","119":"fb3bd57f9971bedf","200":"fd0ca2551462925e","299":"23889c98ca91f862","330":"d11bc7df994a389b","359":"f564091a28c463fc","420":"557a601951daeeb8","499":"48b927c88fc23b8a","500":"427b79f05c33931e","520":"72634462965dc69c","649":"18df65609b3e158d","650":"2d241271f478e1cf","651":"7a539423097f864f","699":"b881a67f8440a085","700":"a9be26fc63c585ea","720":"660df700a02a7484","899":"f413f398f474b86c"},"long":{"0":"97bc94c50ab63104","50":"113483a941c48090","119":"f84e880ed6cb6116","200":"fce98d5fdfda2ff4","299":"654d81328a6e8b4f","330":"ac1c82e7d47bfd68","359":"62ae639b57431299","420":"a73f3ff25683f1f7","499":"d86de14bb5592f95","500":"467ca64835c8352d","520":"c766a56015fb7bbb","649":"c640fcfc08ec54b8","650":"e6f811893f082afb","651":"aac82074b109b031","699":"395cab0fb7787c9c","700":"c6e3d82fbf506814","720":"0bc7ded5d5cce09b","899":"17f3e4bf0a7f4d2d"}};
const sum=t=>{const g=t.mesh.geometry,h=crypto.createHash('sha1');h.update(Buffer.from(g.attributes.position.array.buffer));h.update(Buffer.from(g.attributes.color.array.buffer));h.update(g.drawRange.start+':'+g.drawRange.count);return h.digest('hex').slice(0,16);};
const frames=[0,50,119,200,299,330,359,420,499,500,520,649,650,651,699,700,720,899];
const got={default:{},long:{}};
for(const [name,opts] of [['default',{}],['long',{life:30,length:400,spacing:.3}]])run(opts,(f,t)=>{if(frames.includes(f))got[name][f]=sum(t);});
if(process.argv.includes('--print')){console.log(JSON.stringify(got));process.exit(0);}
const golden=GOLDEN;
assert.deepEqual(got,golden,'trail buffers differ from the original code');
console.log('Trail: buffers and draw range identical to the original at',frames.length,'frames in 2 scenarios: OK');

// The long scenario really fills the trail.
{const t=run({life:30,length:400,spacing:.3},()=>{});assert.equal(t.points.length,179,'the long trail holds max-1 points');}

// No per-vertex typed-array set() calls, no growth of the heap.
{let calls=0;const orig=Float32Array.prototype.set;Float32Array.prototype.set=function(...a){calls++;return orig.apply(this,a);};
 try{run({life:30,length:400,spacing:.3},()=>{});}finally{Float32Array.prototype.set=orig;}
 assert.equal(calls,0,'update() calls no Float32Array.set (the old code made 2 per vertex)');
 const scene=new T.Scene(),t=createRainbowTrail({T,scene,life:30,length:400,spacing:.3});t.setOn(true);const fc={x:0,y:0,z:-1};const pos={x:0,y:100,z:0};
 for(let i=0;i<400;i++){pos.z-=.5;t.update(.045,pos,fc);} // warm up, the trail is full
 const before=process.memoryUsage().heapUsed;for(let i=0;i<600;i++){pos.z-=.5;t.update(.045,pos,fc);}const grown=process.memoryUsage().heapUsed-before;
 assert.ok(grown<1.5e6,'update() makes no garbage: heap grew '+grown+' bytes over 600 full-trail frames (the old code: tens of MB)');
 console.log('Trail: no Float32Array.set calls, heap growth over 600 frames',grown,'bytes: OK');}

// Behaviour around the edges: off does nothing, on again keeps the points, a jump starts a new trail.
{const scene=new T.Scene(),t=createRainbowTrail({T,scene}),fc={x:0,y:0,z:-1},pos={x:0,y:0,z:0};t.update(.045,pos,fc);assert.equal(t.points.length,0,'off: nothing laid');
 t.setOn(true);for(let i=0;i<10;i++){pos.z-=1;t.update(.045,pos,fc);}const n=t.points.length;assert.ok(n>0&&t.mesh.visible);t.setOn(true);assert.equal(t.points.length,n);
 pos.z-=40;t.update(.045,pos,fc);assert.equal(t.points.length,1);t.setOn(false);assert.equal(t.mesh.visible,false);assert.equal(t.points.length,0);assert.equal(t.mesh.geometry.drawRange.count,0);
 console.log('Trail: off, on again, jump, hide: OK');}
