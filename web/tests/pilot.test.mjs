import test from 'node:test';
import assert from 'node:assert/strict';
const pilot=await import('../lib/pilot.ts').catch(()=>({}));
test('fuel budget includes ground, climb, alternate, and reserve without hiding shortage',()=>{
 assert.equal(typeof pilot.fuelBudget,'function');
 const r=pilot.fuelBudget({tripMinutes:60,alternateMinutes:30,burn:10,taxiFuel:1,climbFuel:2,reserveMinutes:45,onBoard:20});
 assert.equal(r.trip,10);assert.equal(r.alternate,5);assert.equal(r.reserve,7.5);assert.equal(r.required,25.5);assert.equal(r.margin,-5.5);assert.equal(r.atDestination,7);
});
test('density altitude is pressure altitude plus ISA temperature correction',()=>{
 assert.equal(typeof pilot.densityAltitude,'function');
 const r=pilot.densityAltitude(5000,29.92,30);assert.equal(r.pressure,5000);assert.ok(Math.abs(r.density-7988.72)<1);
});
test('glide arrival uses MSL destination elevation and arrival margin',()=>{
 assert.equal(typeof pilot.glideArrival,'function');
 const r=pilot.glideArrival({distanceNm:10,track:0,altitudeMsl:5000,destinationElevation:1000,arrivalMargin:1000,ratio:30,tas:60,windFrom:0,windSpeed:0});
 assert.ok(Math.abs(r.heightLoss-2025.3713)<.01);assert.ok(Math.abs(r.margin-974.6287)<.01);
});
test('headwind worsens glide and impossible wind never yields a reachable indication',()=>{
 assert.equal(typeof pilot.glideArrival,'function');const args={distanceNm:10,track:0,altitudeMsl:5000,destinationElevation:1000,arrivalMargin:1000,ratio:30,tas:60};
 const calm=pilot.glideArrival({...args,windFrom:0,windSpeed:0}),head=pilot.glideArrival({...args,windFrom:0,windSpeed:30}),bad=pilot.glideArrival({...args,windFrom:90,windSpeed:100});
 assert.ok(head.heightLoss>calm.heightLoss);assert.equal(bad.possible,false);assert.equal(bad.margin,null);
});
test('invalid fuel and atmospheric inputs produce unavailable results',()=>{
 assert.equal(typeof pilot.fuelBudget,'function');assert.equal(pilot.fuelBudget({tripMinutes:Infinity,alternateMinutes:0,burn:10,taxiFuel:0,climbFuel:0,reserveMinutes:45,onBoard:40}).valid,false);
 assert.equal(pilot.densityAltitude(0,0,20),null);
});

const flight=await import('../lib/flight.ts');
const airports=[{id:'A',name:'A',city:'',lat:34,lon:-118,elevation:100},{id:'B',name:'B',city:'',lat:35,lon:-118,elevation:100},{id:'C',name:'C',city:'',lat:36,lon:-118,elevation:100}];
const plan={id:'draft',name:'Test',ids:['A','B'],created:'',tas:110,burn:9,windDir:0,windSpeed:0,altitude:5500};
test('legacy plans remain valid; equal destination and diversion is rejected',()=>{assert.equal(flight.validPlan(plan,airports),true);assert.equal(flight.validPlan({...plan,alternateId:'B'},airports),false);assert.equal(flight.validPlan({...plan,alternateId:'C'},airports),true);assert.equal(flight.validPlan({...plan,tas:0},airports),false)});
test('malformed observation timestamps cannot reach date rendering',()=>{assert.equal(flight.validWeather({fetchedAt:new Date().toISOString(),data:[{icaoId:'A',obsTime:1e20}]}),false);assert.equal(flight.validWeather({fetchedAt:'bad',data:[]}),false)});
test('CG envelope rejects missing or extra numbers and interpolates verified breakpoints',()=>{
 assert.equal(pilot.parseEnvelope('1000,,47\n2000,35,47'),null);assert.equal(pilot.parseEnvelope('1000,30,47,99\n2000,35,47'),null);assert.equal(pilot.parseEnvelope('2000,35,47\n1000,30,47'),null);
 const a=pilot.aircraftTemplate('piston');a.stations=[{name:'Test',weight:1500,arm:34}];a.envelope=pilot.parseEnvelope('1000,30,47\n2000,35,47');a.maxWeight=1400;
 const r=pilot.loading(a);assert.equal(r.limits.min,32.5);assert.equal(r.cg,34);assert.equal(r.cgOutside,false);assert.equal(r.overweight,true);a.stations[0].weight=2100;assert.equal(pilot.loading(a).limits,null);
});
test('profile snapshots survive later changes to reusable aircraft',()=>{const a=pilot.aircraftTemplate('glider');const p={...plan,aircraftSnapshot:structuredClone(a)};a.tas=70;a.stations[0].weight=1000;assert.equal(p.aircraftSnapshot.tas,55);assert.equal(p.aircraftSnapshot.stations[0].weight,0);assert.equal(flight.validPlan(p,airports),true)});
test('trip import rejects malformed airport, weather, and runway details',()=>{
 const p={version:1,id:'p',name:'Trip',created:new Date().toISOString(),plan,aircraft:null,airports,weather:[],tafs:[],checklist:[],notes:''};
 assert.equal(pilot.validPack(p),true);assert.equal(pilot.validPack({...p,airports:[{id:'A',name:'A'}]}),false);assert.equal(pilot.validPack({...p,weather:[{icaoId:'A',obsTime:1e20}]}),false);assert.equal(pilot.validPack({...p,briefs:{A:{id:'A',runways:null}}}),false);
});
test('TAFs require valid issue and expiry timestamps',()=>{assert.equal(pilot.validTaf({icaoId:'A',rawTAF:'TAF',issueTime:'bad',validTimeTo:1}),false);assert.equal(pilot.validTaf({icaoId:'A',rawTAF:'TAF',issueTime:'2026-09-05T12:00:00Z',validTimeTo:Infinity}),false)});
test('printable brief escaping protects user-entered notes and aircraft labels',()=>{assert.equal(pilot.escapeHtml('<script>" & \'</script>'),'&lt;script&gt;&quot; &amp; &#39;&lt;/script&gt;')});
test('quota failure restores all original backup categories',async()=>{
 const {restoreSavedWork}=await import('../lib/storage.ts');const map=new Map([['aerodeck:draft','old draft'],['aerodeck:aircraft','old aircraft']]);let once=true;
 const storage={getItem:k=>map.get(k)??null,removeItem:k=>map.delete(k),setItem:(k,v)=>{if(k==='aerodeck:aircraft'&&once){once=false;throw Error('quota')}map.set(k,v)}};
 const r=restoreSavedWork(storage,{draft:{name:'new'},aircraft:[]});assert.deepEqual(r,{ok:false,restored:true});assert.equal(map.get('aerodeck:draft'),'old draft');assert.equal(map.get('aerodeck:aircraft'),'old aircraft');
});
test('every FAA airport brief can be saved without inventing missing headings',async()=>{const {readFile}=await import('node:fs/promises');const d=JSON.parse(await readFile(new URL('../lib/airport-briefs.json',import.meta.url),'utf8'));assert.equal(Object.keys(d.airports).length,43);assert.equal(pilot.validBriefs(d.airports),true);assert.ok(d.airports.L94.runways.every(r=>r.ends.every(e=>e.trueHeadingDeg===null&&e.derivedTrueHeadingDeg===null)));assert.equal(d.airports.KPOC.runways[0].ends[0].trueHeadingDeg,93)});
