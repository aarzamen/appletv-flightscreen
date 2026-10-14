import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from 'node:fs/promises';

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders FlightScreen, retains the pilot desk, and references complete offline assets", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html=await response.text();
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.match(html, /FlightScreen · A little closer to the sky/);
  assert.match(html, /Choose radar station/);
  assert.match(html, /Main navigation/);
  assert.match(html, /apple-touch-icon/);
  const desk=await worker.fetch(new Request('http://localhost/desk',{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal(desk.status,200);
  const deskHtml=await desk.text();
  assert.match(deskHtml,/Fuel &amp; diversion budget/);
  assert.match(deskHtml,/Prepare trip brief/);
  assert.match(deskHtml,/Return to FlightScreen/);
  const manifest=JSON.parse(await readFile(new URL('../dist/client/offline-manifest.json',import.meta.url),'utf8'));
  const refs=[...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].map(x=>x[1]).filter(x=>x.startsWith('/'));
  assert.ok(refs.length>0);
  for(const ref of refs)assert.ok(manifest.assets.includes(ref.split('?')[0]),`Missing offline dependency: ${ref}`);
  assert.ok(manifest.assets.includes('/map-style.json'),'Static map style must be available to the offline shell');
  const invalid=await worker.fetch(new Request('http://localhost/api/traffic?station=unsupported&radius=60'),{}, {waitUntil(){},passThroughOnException(){}});
  assert.equal(invalid.status,400);
  const badRadius=await worker.fetch(new Request('http://localhost/api/traffic?station=ventura&radius=9999'),{}, {waitUntil(){},passThroughOnException(){}});
  assert.equal(badRadius.status,400);
});
