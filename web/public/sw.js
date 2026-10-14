const BUILD='__BUILD_ID__',PREFIX='aerodeck-build-',CACHE=PREFIX+BUILD;
async function status(){
 const c=await caches.open(CACHE),marker=await c.match('/__offline_ready__');
 if(!marker)return {ok:false,error:'This app build has not finished downloading.'};
 const m=await marker.json(),pages=m.pages??['/'];
 for(const p of [...pages,...m.assets])if(!await c.match(p))return {ok:false,error:'Offline files are incomplete. Reconnect and reload the app.'};
 return {ok:true,build:BUILD,assets:m.assets.length+pages.length};
}
let preparing;
function prepare(){if(!preparing)preparing=prepareBuild().finally(()=>{preparing=null});return preparing;}
async function prepareBuild(){
 if((await status()).ok)return status();
 const response=await fetch('/offline-manifest.json',{cache:'no-store'});
 if(!response.ok)throw Error('Offline manifest unavailable');
 const m=await response.json();
 if(m.version!==BUILD||!Array.isArray(m.assets))throw Error('A newer version is available. Reload online, then prepare again.');
 const pages=m.pages??['/'];
 if(!Array.isArray(pages)||!pages.length||pages.some(p=>!['/','/desk'].includes(p)))throw Error('Invalid offline pages');
 const c=await caches.open(CACHE);await c.delete('/__offline_ready__');
 try{
  for(const p of m.assets){
   if(typeof p!=='string'||!p.startsWith('/')||p.startsWith('//'))throw Error('Invalid asset');
   const r=await fetch(p,{cache:p.startsWith('/assets/')?'default':'reload'});
   if(!r.ok||r.redirected)throw Error('A required app file could not be downloaded');
   await c.put(p,r);
  }
  for(const page of pages){
   const home=await fetch(page,{cache:'no-store'});
   if(!home.ok||home.redirected||!home.headers.get('content-type')?.includes('text/html'))throw Error('App page unavailable');
   const html=await home.clone().text();
   const refs=[...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].map(x=>new URL(x[1],self.location.origin));
   for(const u of refs)if(u.origin===self.location.origin&&!m.assets.includes(u.pathname))throw Error('App update is still settling. Reload online and try again.');
   await c.put(page,home);
  }
  await c.put('/__offline_ready__',new Response(JSON.stringify({...m,pages})));return status();
 }catch(e){await caches.delete(CACHE);throw e;}
}
self.addEventListener('install',e=>e.waitUntil(prepare().then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{if(!(await status()).ok)return;const names=await caches.keys();const previous=names.filter(n=>n.startsWith(PREFIX)&&n!==CACHE).at(-1);for(const name of names)if(name.startsWith('aerodeck-workspace-')||(name.startsWith(PREFIX)&&name!==CACHE&&name!==previous))await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;
 if(r.mode==='navigate'){
  e.respondWith(fetch(r,{signal:AbortSignal.timeout(6000)}).then(response=>{if(response.status>=500)throw Error('Server unavailable');return response;}).catch(async()=>{const c=await caches.open(CACHE),page=/^\/desk\/?$/.test(u.pathname)?'/desk':'/';return await c.match(page)||new Response('Offline files unavailable. Reconnect and reload.',{status:503});}));return;
 }
 if((/\.(js|css|svg|png|ico|webmanifest|woff2?)$/.test(u.pathname)||u.pathname==='/map-style.json')&&!u.pathname.endsWith('/sw.js'))e.respondWith((async()=>{const c=await caches.open(CACHE);return await c.match(r,{ignoreSearch:true})||await caches.match(r,{ignoreSearch:true})||fetch(r);})());
});
self.addEventListener('message',e=>{if(!['CACHE_WORKSPACE','GET_STATUS'].includes(e.data?.type))return;e.waitUntil((e.data.type==='CACHE_WORKSPACE'?prepare():status()).then(r=>e.ports[0]?.postMessage(r)).catch(err=>e.ports[0]?.postMessage({ok:false,error:err.message})));});
