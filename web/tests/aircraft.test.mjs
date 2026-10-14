import test from 'node:test';
import assert from 'node:assert/strict';
const identity=await import('../lib/aircraft.ts').catch(()=>({}));
test('small homebuilt and helicopter types receive distinct useful identities',()=>{
 assert.equal(typeof identity.identifyAircraft,'function');
 const hobby=identity.identifyAircraft({hex:'a12345',type:'RV8',onGround:false,military:false,category:'A1'});
 assert.equal(hobby.kind,'light');assert.match(hobby.family,/RV-8/);assert.equal(hobby.countryCode,'US');
 const helicopter=identity.identifyAircraft({hex:'ae1234',type:'H60',onGround:false,military:true,category:'A7'});
 assert.equal(helicopter.kind,'helicopter');assert.equal(helicopter.military,true);
});
test('only explicit ground status creates ground symbols; unknown is never a parked plane',()=>{
 assert.equal(typeof identity.identifyAircraft,'function');
 assert.equal(identity.identifyAircraft({hex:'a12345',type:'C172',onGround:true,military:false,category:'A1'}).kind,'ground');
 assert.equal(identity.identifyAircraft({hex:'a12345',type:'C172',onGround:false,military:false,category:'A1'}).kind,'light');
});
test('reported route scope is derived from airport countries, never aircraft registration',()=>{
 assert.equal(typeof identity.reportedRouteScope,'function');
 assert.equal(identity.reportedRouteScope([{countryiso2:'US'},{countryiso2:'FR'}]),'international');
 assert.equal(identity.reportedRouteScope([{countryiso2:'JP'},{countryiso2:'JP'}]),'domestic');
 assert.equal(identity.reportedRouteScope([{countryiso2:'US'},{countryiso2:''}]),'unknown');
 assert.equal(identity.reportedRouteScope([]),'unknown');
});
test('overhead selection excludes parked aircraft and chooses shortest horizontal distance',()=>{
 assert.equal(typeof identity.closestAirborne,'function');
 const tracks=[{hex:'ground',lat:34,lon:-118,onGround:true,altitude:0},{hex:'far',lat:34.1,lon:-118,onGround:false,altitude:5000},{hex:'near',lat:34.01,lon:-118,onGround:false,altitude:1000},{hex:'unknown',lat:34.001,lon:-118,onGround:false,altitude:null}];
 assert.equal(identity.closestAirborne(tracks,{lat:34,lon:-118}).hex,'near');
 assert.equal(identity.closestAirborne([tracks[0]],{lat:34,lon:-118}),null);
});
test('gyroplanes and amphibians are not mislabeled as gliders or balloons',()=>{
 const gyro=identity.identifyAircraft({hex:'a12345',type:'AC10',onGround:false,military:false});
 const amphibian=identity.identifyAircraft({hex:'a12345',type:'A5',onGround:false,military:false});
 assert.equal(gyro.kind,'gyroplane');assert.equal(amphibian.kind,'light');
 assert.equal(identity.identifyAircraft({hex:'a12345',type:'',onGround:false,military:false,category:'B1'}).kind,'glider');
});
test('a family lookup does not claim a specific business-jet subvariant',()=>{
 const input={hex:'a12345',onGround:false,military:false};
 assert.equal(identity.identifyAircraft({...input,type:'A359'}).family,'Airbus A350-900 family');
 assert.equal(identity.identifyAircraft({...input,type:'B789'}).family,'Boeing 787-9 family');
 assert.equal(identity.identifyAircraft({...input,type:'PC12'}).family,'Pilatus PC-12 family');
 assert.doesNotMatch(identity.identifyAircraft({...input,type:'C82R'}).family,/Aviones|Reims/);
});
