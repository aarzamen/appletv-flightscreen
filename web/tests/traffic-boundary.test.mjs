import test from 'node:test';
import assert from 'node:assert/strict';
const {default:worker}=await import('../dist/server/index.js');
const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}};
const ctx={waitUntil(){},passThroughOnException(){}};
const request=(station,radius=30)=>worker.fetch(new Request(`http://localhost/api/traffic?station=${station}&radius=${radius}`),env,ctx);
// Initialize Vinext's fetch wrapper before replacing the external network boundary.
await request('unsupported');
function fixture(url,offset=0){const match=String(url).match(/lat\/([^/]+)\/lon\/([^/]+)/);return {ac:[{hex:'a12345',flight:'N123AA',lat:Number(match[1]),lon:Number(match[2]),alt_baro:5000,gs:120,track:90,baro_rate:0,seen_pos:1}],now:(Date.now()+offset)/1000,total:1,msg:'No error',ctime:0,ptime:0};}
test('expired upstream snapshot uses the second live source instead of fresh empty airspace',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return Response.json(fixture(url,String(url).includes('api.adsb.lol')?-180000:0));};
 try{const response=await request('seattle');const data=await response.json();assert.equal(response.status,200);assert.equal(data.source,'adsb.fi');assert.equal(data.aircraft.length,1);assert.equal(calls.length,2);}finally{globalThis.fetch=original;}
});
test('upstream Retry-After is honored across station requests even while fallback works',async()=>{
 const original=globalThis.fetch;let primaryCalls=0,fallbackCalls=0;
 globalThis.fetch=async url=>{if(String(url).includes('api.adsb.lol')){primaryCalls++;return new Response('Busy',{status:429,headers:{'Retry-After':'120'}});}fallbackCalls++;return Response.json(fixture(url));};
 try{for(const station of ['denver','jfk']){const response=await request(station);assert.equal(response.status,200);assert.equal((await response.json()).source,'adsb.fi');}assert.equal(primaryCalls,1);assert.equal(fallbackCalls,2);}finally{globalThis.fetch=original;}
});
