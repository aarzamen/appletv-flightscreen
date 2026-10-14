import test from 'node:test';import assert from 'node:assert/strict';
const roads=await import('../lib/roads.ts').catch(()=>({}));
const placemark=(lon,title)=>`<Placemark><description><![CDATA[<h2 class="iw-title">${title}</h2><p class="iw-text">1 of 3 lanes closed &amp; paving</p><span class="iw-timestamp">Last updated: today</span>]]></description><Point><coordinates>${lon},34.2,0</coordinates></Point></Placemark>`;
test('road reports preserve coordinates and sanitize source HTML into plain text',()=>{
 assert.equal(typeof roads.parseRoadKml,'function');const [r]=roads.parseRoadKml(placemark(-119.2,'Northbound 101 Lane Closure'),'Caltrans');assert.equal(r.lon,-119.2);assert.equal(r.lat,34.2);assert.equal(r.title,'Northbound 101 Lane Closure');assert.match(r.detail,/1 of 3 lanes closed & paving/);assert.doesNotMatch(r.detail,/<|>/);
});
test('different closure directions or coordinates never collapse under a reused closure ID',()=>{assert.equal(typeof roads.parseRoadKml,'function');const r=roads.parseRoadKml(placemark(-119.2,'Northbound 1')+placemark(-119.3,'Southbound 1'),'Caltrans');assert.equal(r.length,2);assert.notEqual(r[0].id,r[1].id);});
test('invalid coordinates are excluded and line-only closures retain their road geometry',()=>{assert.equal(typeof roads.parseRoadKml,'function');const kml='<Placemark><name>Closure</name><LineString><coordinates>-119.2,34.2 -119.21,34.21</coordinates></LineString></Placemark>';const [r]=roads.parseRoadKml(kml,'Caltrans');assert.equal(r.line.length,2);assert.deepEqual(roads.parseRoadKml(placemark(999,'Invalid'),'CHP'),[]);});
