import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const origin = 'https://aerodeck.example';
const key = input => new URL(typeof input === 'string' ? input : input.url, origin).href;
const withoutSearch = input => { const url = new URL(key(input)); url.search = ''; return url.href; };
function find(entries, input, options = {}) {
  if (!options.ignoreSearch) return entries.get(key(input));
  return [...entries].find(([url]) => withoutSearch(url) === withoutSearch(input))?.[1];
}
class MockCacheStorage {
  stores = new Map();
  async open(name) {
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    const entries = this.stores.get(name);
    return {
      match: async (input, options) => find(entries, input, options)?.clone(),
      put: async (input, response) => { entries.set(key(input), response.clone()); },
      delete: async input => entries.delete(key(input)),
    };
  }
  async keys() { return [...this.stores.keys()]; }
  async delete(name) { return this.stores.delete(name); }
  async match(input, options) {
    for (const entries of this.stores.values()) {
      const match = find(entries, input, options);
      if (match) return match.clone();
    }
  }
}
function environment(build, storage = new MockCacheStorage()) {
  const handlers = new Map(), routes = new Map(), requested = [];
  let offline = false, skipWaiting = 0, claimed = 0;
  const self = { location: { origin }, addEventListener: (type, cb) => handlers.set(type, cb),
    skipWaiting: async () => { skipWaiting++; }, clients: { claim: async () => { claimed++; } } };
  const network = async (input, options = {}) => {
    const path = new URL(key(input)).pathname + new URL(key(input)).search;
    requested.push(path);
    if (offline) throw new TypeError('Network offline');
    const found = routes.get(path);
    const response = typeof found === 'function' ? Promise.resolve(found(input, options)) : Promise.resolve(found ? found.clone() : new Response('Not found', { status: 404 }));
    if (!options.signal) return response;
    if (options.signal.aborted) throw options.signal.reason;
    return new Promise((resolve, reject) => {
      const abort = () => reject(options.signal.reason);
      options.signal.addEventListener('abort', abort, { once: true });
      response.then(value => { options.signal.removeEventListener('abort', abort); resolve(value); }, error => { options.signal.removeEventListener('abort', abort); reject(error); });
    });
  };
  vm.runInNewContext(source.replaceAll('__BUILD_ID__', build), { self, caches: storage, fetch: network, Response, URL, AbortSignal });
  async function lifecycle(type) {
    let pending;
    handlers.get(type)({ waitUntil: p => { pending = p; } });
    return pending;
  }
  async function message(type) {
    let pending, result;
    handlers.get('message')({ data: { type }, ports: [{ postMessage: r => { result = r; } }], waitUntil: p => { pending = p; } });
    await pending;
    return result;
  }
  function dispatch(path, mode = 'same-origin', method = 'GET') {
    let response;
    handlers.get('fetch')({ request: { url: new URL(path, origin).href, method, mode }, respondWith: p => { response = p; } });
    return response;
  }
  return { storage, routes, requested, lifecycle, message, dispatch, setOffline: v => { offline = v; }, get skipped() { return skipWaiting; }, get claimed() { return claimed; } };
}
const json = v => new Response(JSON.stringify(v), { headers: { 'Content-Type': 'application/json' } });
const html = text => new Response(text, { headers: { 'Content-Type': 'text/html' } });
function publish(env, build, extra = {}) {
  env.routes.set('/offline-manifest.json', json({ version: build, pages: ['/', '/desk'], assets: [`/assets/${build}.js`, `/assets/${build}.css`, '/favicon.svg'] }));
  env.routes.set(`/assets/${build}.js`, new Response(`console.log('${build}')`, { headers: { 'Content-Type': 'text/javascript' } }));
  env.routes.set(`/assets/${build}.css`, new Response(`/* ${build} */`, { headers: { 'Content-Type': 'text/css' } }));
  env.routes.set('/favicon.svg', new Response('<svg/>'));
  env.routes.set('/', html(`<html data-build="${build}"><link href="/assets/${build}.css"><script src="/assets/${build}.js"></script></html>`));
  env.routes.set('/desk', html(`<html data-build="${build}" data-page="desk"><link href="/assets/${build}.css"><script src="/assets/${build}.js"></script><h1>Pilot workspace</h1></html>`));
  for (const [path, response] of Object.entries(extra)) env.routes.set(path, response);
}
const results = [];
async function check(name, run) {
  try { const evidence = await run(); results.push({ name, result: 'PASS', evidence }); }
  catch (error) { results.push({ name, result: 'FAIL', error: error.message }); }
}

await check('Cold offline start after complete install', async () => {
  const env = environment('A'); publish(env, 'A');
  await env.lifecycle('install'); await env.lifecycle('activate');
  assert.equal(env.skipped, 1); assert.equal(env.claimed, 1);
  const cold = environment('A', env.storage); cold.setOffline(true);
  assert.match(await (await cold.dispatch('/', 'navigate')).text(), /data-build="A"/);
  assert.match(await (await cold.dispatch('/assets/A.js')).text(), /console.log/);
  const status = await cold.message('GET_STATUS'); assert.equal(status.ok, true);
  return status;
});
await check('Offline desk reload preserves the pilot workspace instead of showing radar home', async () => {
  const env=environment('A');publish(env,'A');await env.lifecycle('install');await env.lifecycle('activate');env.setOffline(true);
  const response=await env.dispatch('/desk?view=flights','navigate');
  assert.equal(response.status,200);assert.match(await response.text(),/data-page="desk"/);
  const root=await env.dispatch('/','navigate');assert.doesNotMatch(await root.text(),/data-page="desk"/);
  return {deskCached:true,rootPreserved:true};
});
await check('New build B caches matching new hashes and preserves A assets for old tabs', async () => {
  const a = environment('A'); publish(a, 'A'); await a.lifecycle('install'); await a.lifecycle('activate');
  const b = environment('B', a.storage); publish(b, 'B'); await b.lifecycle('install'); await b.lifecycle('activate'); b.setOffline(true);
  assert.match(await (await b.dispatch('/', 'navigate')).text(), /data-build="B"/);
  assert.match(await (await b.dispatch('/assets/B.js')).text(), /'B'/);
  assert.match(await (await b.dispatch('/assets/A.js')).text(), /'A'/);
  return await b.storage.keys();
});
await check('Failed new build asset preparation preserves prior usable A build', async () => {
  const a = environment('A'); publish(a, 'A'); await a.lifecycle('install');
  const b = environment('B', a.storage); publish(b, 'B', { '/assets/B.css': new Response('Unavailable', { status: 503 }) });
  await assert.rejects(b.lifecycle('install'), /could not be downloaded/);
  assert.equal(b.skipped, 0); assert.equal((await b.storage.keys()).includes('aerodeck-build-B'), false);
  a.setOffline(true); assert.match(await (await a.dispatch('/', 'navigate')).text(), /data-build="A"/);
  return { remainingCaches: await b.storage.keys(), oldStatus: await a.message('GET_STATUS') };
});
await check('HTML with a different asset hash is rejected without replacing prior build', async () => {
  const a = environment('A'); publish(a, 'A'); await a.lifecycle('install');
  const b = environment('B', a.storage); publish(b, 'B', { '/': html('<script src="/assets/C.js"></script>') });
  await assert.rejects(b.lifecycle('install'), /still settling/);
  assert.equal((await a.message('GET_STATUS')).ok, true);
  return await b.storage.keys();
});
await check('Manifest build mismatch rejects preparation', async () => {
  const env = environment('A'); publish(env, 'B');
  const result = await env.message('CACHE_WORKSPACE');
  assert.equal(result.ok, false); assert.match(result.error, /newer version/);
  return result;
});
await check('API, cross-origin maps and non-GET requests bypass SW cache', async () => {
  const env = environment('A'); publish(env, 'A'); await env.lifecycle('install');
  assert.equal(env.dispatch('/api/weather?ids=KCMA'), undefined);
  assert.equal(env.dispatch('https://maps.example/tile.png'), undefined);
  assert.equal(env.dispatch('/assets/A.js', 'same-origin', 'POST'), undefined);
  const keys = [...env.storage.stores.values()].flatMap(m => [...m.keys()]);
  assert.equal(keys.some(k => k.includes('/api/')), false);
  return { interceptedAPI: false, cachedAPI: false };
});
await check('HTTP 503 navigation falls back to verified offline home', async () => {
  const env = environment('A'); publish(env, 'A'); await env.lifecycle('install');
  env.routes.set('/', new Response('Origin unavailable', { status: 503 }));
  const result = await env.dispatch('/', 'navigate');
  assert.equal(result.status, 200);
  const body = await result.text(); assert.match(body, /data-build="A"/);
  return { status: result.status, cachedBuild: 'A', ready: await env.message('GET_STATUS') };
});
await check('Stalled navigation falls back after six-second timeout', async () => {
  const env = environment('A'); publish(env, 'A'); await env.lifecycle('install');
  env.routes.set('/', () => new Promise(() => {}));
  const keepAlive = setTimeout(() => {}, 8000), started = Date.now();
  try {
    const result = await env.dispatch('/', 'navigate'), elapsed = Date.now() - started;
    assert.equal(result.status, 200); assert.match(await result.text(), /data-build="A"/);
    assert.ok(elapsed >= 5900 && elapsed < 7500, `Fallback took ${elapsed} ms`);
    return { elapsedMs: elapsed, status: result.status };
  } finally { clearTimeout(keepAlive); }
});
await check('Query-string HTML asset resolves from build cache while offline', async () => {
  const env = environment('A'); publish(env, 'A', { '/': html('<script src="/assets/A.js?v=1"></script>') });
  await env.lifecycle('install'); env.setOffline(true);
  const status = await env.message('GET_STATUS'); assert.equal(status.ok, true);
  assert.match(await (await env.dispatch('/assets/A.js?v=1')).text(), /console.log\('A'\)/);
  return { status, fulfilledCachedRequest: '/assets/A.js?v=1' };
});
await check('Concurrent preparation shares one network request and one successful result', async () => {
  const env = environment('A'); publish(env, 'A');
  await env.lifecycle('install'); await env.lifecycle('activate');
  // Model repair of an already active build whose readiness marker was lost.
  await (await env.storage.open('aerodeck-build-A')).delete('/__offline_ready__');
  let entered;
  const firstEntered = new Promise(resolve => { entered = resolve; });
  let resolveFirst;
  const firstAsset = new Promise(resolve => { resolveFirst = resolve; });
  let calls = 0;
  env.routes.set('/assets/A.js', () => {
    calls++;
    if (calls === 1) { entered(); return firstAsset; }
    return new Response('A');
  });
  const first = env.message('CACHE_WORKSPACE'); await firstEntered;
  const second = env.message('CACHE_WORKSPACE');
  resolveFirst(new Response('A'));
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.ok, true); assert.deepEqual(a, b); assert.equal(calls, 1);
  const statusAfter = await env.message('GET_STATUS'); assert.equal(statusAfter.ok, true);
  return { assetNetworkCalls: calls, first: a, second: b, statusAfter };
});
await check('Concurrent preparation shares failure and permits a clean retry', async () => {
  const env = environment('A'); publish(env, 'A');
  let entered, rejectAsset;
  const assetEntered = new Promise(resolve => { entered = resolve; });
  const asset = new Promise((resolve, reject) => { rejectAsset = reject; });
  let calls = 0;
  env.routes.set('/assets/A.js', () => { calls++; entered(); return asset; });
  const first = env.message('CACHE_WORKSPACE'); await assetEntered;
  const second = env.message('CACHE_WORKSPACE'); rejectAsset(new Error('Transient failure'));
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.ok, false); assert.deepEqual(a, b); assert.equal(calls, 1);
  env.routes.set('/assets/A.js', new Response('A'));
  const retry = await env.message('CACHE_WORKSPACE'); assert.equal(retry.ok, true);
  return { failedRequestCount: calls, failure: a, retry };
});
await check('Activation retains current and previous build only', async () => {
  const storage = new MockCacheStorage();
  for (const build of ['A', 'B', 'C', 'D']) {
    const env = environment(build, storage); publish(env, build); await env.lifecycle('install'); await env.lifecycle('activate');
  }
  const names = await storage.keys(); assert.deepEqual(names, ['aerodeck-build-C', 'aerodeck-build-D']); return names;
});
console.log(JSON.stringify({ source: 'public/sw.js', results }, null, 2));
process.exitCode = results.some(r => r.result === 'FAIL') ? 1 : 0;
