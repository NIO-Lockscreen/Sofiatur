import fs from 'node:fs';import assert from 'node:assert/strict';
// Home-screen icon (11 November 2026): real PNGs of the right size, a manifest pointing at them, and the four head tags.
const png=f=>{const b=fs.readFileSync('dist/'+f);assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',f+' has the PNG signature');assert.equal(b.subarray(12,16).toString(),'IHDR');return [b.readUInt32BE(16),b.readUInt32BE(20)];};
for(const n of [180,192,512])assert.deepEqual(png(`icon-${n}.png`),[n,n],`icon-${n}.png is ${n}x${n}`);
const m=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8'));
assert.equal(m.name,'Sofias biltur');assert.equal(m.short_name,'Biltur');assert.equal(m.lang,'nb');assert.equal(m.start_url,'.');assert.equal(m.scope,'.');assert.equal(m.display,'standalone');assert.equal(m.background_color,'#b3dce5');assert.equal(m.theme_color,'#164b47');
assert.deepEqual(m.icons.map(i=>i.sizes).sort(),['192x192','512x512']);
for(const i of m.icons){assert.equal(i.type,'image/png');assert.equal(i.purpose,'any');assert.ok(fs.existsSync('dist/'+i.src),i.src+' exists');const n=parseInt(i.sizes);assert.deepEqual(png(i.src),[n,n],i.src+' matches its sizes');}
const h=fs.readFileSync('dist/index.html','utf8');
for(const t of ['<link rel="apple-touch-icon" href="icon-180.png">','<link rel="manifest" href="manifest.webmanifest">','<meta name="apple-mobile-web-app-title" content="Sofias biltur">','<meta name="mobile-web-app-capable" content="yes">','<meta name="apple-mobile-web-app-capable" content="yes">'])assert.ok(h.includes(t),'index.html has '+t);
assert.match(h,/<link rel="icon" href="data:image\/svg\+xml/,'the SVG favicon is kept');
console.log('App icon: PNG sizes, manifest, head tags: OK');
