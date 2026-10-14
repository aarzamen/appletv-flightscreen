import {NextRequest} from 'next/server';
import {trafficQuery,normalizeTraffic} from '@/lib/radar';
import type {TrafficSnapshot} from '@/lib/radar';
const snapshots=new Map<string,{data:TrafficSnapshot;time:number}>();
const pending=new Map<string,Promise<TrafficSnapshot>>();
const cooldowns=new Map<string,number>();
const headers={'Cache-Control':'public, max-age=10, s-maxage=15','X-Content-Type-Options':'nosniff'};
export async function GET(req:NextRequest) {
 const query=trafficQuery(req.nextUrl.searchParams.get('station'),req.nextUrl.searchParams.get('radius'),req.nextUrl.searchParams.get('lat'),req.nextUrl.searchParams.get('lon'));
 if(!query)return Response.json({error:'Choose a supported station and range.'},{status:400});
 const {station,radius}=query,key=`${station.id}:${station.lat}:${station.lon}:${radius}`,cached=snapshots.get(key);
 if(cached&&Date.now()-cached.time<15000)return Response.json(cached.data,{headers});
 let request=pending.get(key);
 if(!request) {
  request=(async()=>{
   let throttled=false;
   for(const provider of [
    {name:'ADSB.lol',url:`https://api.adsb.lol/v2/lat/${station.lat}/lon/${station.lon}/dist/${radius}`},
    {name:'adsb.fi',url:`https://opendata.adsb.fi/api/v3/lat/${station.lat}/lon/${station.lon}/dist/${radius}`}
   ]) {
    if((cooldowns.get(provider.name)??0)>Date.now()){throttled=true;continue;}
    try {
     const response=await fetch(provider.url,{headers:{Accept:'application/json','User-Agent':'FlightScreen/1.0 (+https://aerodeck-plus.annonable.chatgpt.site)'},signal:AbortSignal.timeout(8000)});
     if(response.status===429){console.warn('Traffic upstream',provider.name,'HTTP',response.status,(await response.text()).slice(0,300));const retry=response.headers.get('Retry-After')??'60',seconds=Number(retry),until=Number.isFinite(seconds)?Date.now()+Math.max(15,seconds)*1000:Date.parse(retry);cooldowns.set(provider.name,Number.isFinite(until)&&until>Date.now()?until:Date.now()+60000);throttled=true;continue;}
     if(response.status===403)cooldowns.set(provider.name,Date.now()+900000);
     if(!response.ok){console.warn('Traffic upstream',provider.name,'HTTP',response.status,(await response.text()).slice(0,300));continue;}
     const body=await response.json();
     const data:TrafficSnapshot={aircraft:normalizeTraffic(body,station),source:provider.name,fetchedAt:new Date().toISOString()};
     if(snapshots.size>=96)snapshots.delete(snapshots.keys().next().value!);snapshots.set(key,{data,time:Date.now()});return data;
    }catch(e){console.warn('Traffic upstream',provider.name,e instanceof Error?e.message:'unreadable response');}
   }
   throw Error(throttled?'throttled':'unavailable');
  })();
  pending.set(key,request);
 }
 try{return Response.json(await request,{headers});}
 catch(e){const throttled=e instanceof Error&&e.message==='throttled',delays=[...cooldowns.values()].filter(until=>until>Date.now()).map(until=>Math.ceil((until-Date.now())/1000)),retry=delays.length?Math.max(15,Math.min(...delays)):60;return Response.json({error:throttled?'Traffic provider is busy. Waiting before retrying.':'Live traffic is temporarily unavailable. Retrying shortly.'},{status:throttled?429:502,headers:{'Cache-Control':'no-store','Retry-After':throttled?String(retry):'30'}});}
 finally{pending.delete(key);}
}
