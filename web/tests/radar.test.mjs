import test from 'node:test';
import assert from 'node:assert/strict';
const radar = await import('../lib/radar.ts').catch(() => ({}));
const now = 1800000000000;
const station = {id:'test',lat:0,lon:0,name:'Test',label:'Test',icao:'KLAX'};
const ac = {hex:'a12345',flight:' UAL123 ',lat:0,lon:0,alt_baro:32000,gs:450,track:90,baro_rate:-512,seen_pos:4,r:'N123AA',t:'B738',squawk:'1200'};
test('traffic accepts zero coordinates and preserves source measurement units', () => {
 assert.equal(typeof radar.normalizeTraffic,'function');
 const [track] = radar.normalizeTraffic({ac:[ac],now:now/1000},station,now);
 assert.equal(track.callsign,'UAL123'); assert.equal(track.lat,0); assert.equal(track.lon,0);
 assert.equal(track.altitude,32000); assert.equal(track.speed,450); assert.equal(track.heading,90);
 assert.equal(track.verticalRate,-512); assert.equal(track.seenAt,now-4000); assert.equal(track.distanceNm,0);
});
test('invalid, missing and stale positions never become displayed live targets', () => {
 assert.equal(typeof radar.normalizeTraffic,'function');
 const candidates=[{...ac,lat:null},{...ac,lat:'34'},{...ac,lon:181},{...ac,lat:91},{...ac,seen_pos:121},{...ac,seen_pos:121,seen:1},{...ac,seen_pos:null,seen:null},{...ac,lat:NaN}];
 assert.deepEqual(radar.normalizeTraffic({ac:candidates,now:now/1000},station,now),[]);
 assert.throws(()=>radar.normalizeTraffic({ac:[ac],now:now/1000-200},station,now),/timestamp/);
 assert.throws(()=>radar.normalizeTraffic({ac:[ac],now:now/1000+3600},station,now),/timestamp/);
});
test('missing telemetry stays unknown and explicit ground altitude stays zero', () => {
 assert.equal(typeof radar.normalizeTraffic,'function');
 const [unknown] = radar.normalizeTraffic({ac:[{...ac,alt_baro:undefined,gs:null,track:null,baro_rate:undefined}]},station,now);
 assert.equal(unknown.altitude,null); assert.equal(unknown.speed,null); assert.equal(unknown.heading,null); assert.equal(unknown.verticalRate,null);
 const [ground] = radar.normalizeTraffic({ac:[{...ac,alt_baro:'ground'}]},station,now);
 assert.equal(ground.altitude,0); assert.equal(ground.onGround,true);
});
test('deduplicates identifiers and marks emergency squawks without inferring routes', () => {
 assert.equal(typeof radar.normalizeTraffic,'function');
 const tracks=radar.normalizeTraffic({ac:[{...ac,squawk:'7700'},ac]},station,now);
 assert.equal(tracks.length,1); assert.equal(tracks[0].emergency,true); assert.equal(tracks[0].destination,undefined);
});
test('station/radius validation prevents arbitrary upstream requests', () => {
 assert.equal(typeof radar.trafficQuery,'function');
 assert.equal(radar.trafficQuery('bogus','60'),null);
 assert.equal(radar.trafficQuery('ventura','99999'),null);
 assert.equal(radar.trafficQuery('ventura','0'),null);
 assert.equal(radar.trafficQuery('ventura','60').radius,60);
});
test('altitude filters leave unknown observations outside numeric bands', () => {
 assert.equal(typeof radar.filterTracks,'function');
 const list=[{...ac,hex:'1',altitude:null},{...ac,hex:'2',altitude:5000},{...ac,hex:'3',altitude:32000}];
 assert.deepEqual(radar.filterTracks(list,'low','').map(x=>x.hex),['2']);
 assert.deepEqual(radar.filterTracks(list,'high','').map(x=>x.hex),['3']);
});
test('military filter agrees with aircraft allocation identity even without provider flags',()=>{
 const a={hex:'ae1234',type:'H60',callsign:'HAWK',registration:'',onGround:false,military:false,altitude:1200};
 assert.equal(radar.filterTracks([a],'military','').length,1);
});
