import {NextRequest} from 'next/server';
import {reportedRouteScope} from '@/lib/aircraft';
import type {AircraftInfo} from '@/lib/aircraft';
const cache=new Map<string,{value:AircraftInfo;time:number}>();
const clean=(v:unknown,max=100)=>typeof v==='string'?v.trim().slice(0,max):'';
export async function GET(req:NextRequest){
 const hex=(req.nextUrl.searchParams.get('hex')??'').toLowerCase(),callsign=(req.nextUrl.searchParams.get('callsign')??'').toUpperCase().trim();
 if(!/^[a-f0-9]{6}$/.test(hex)||callsign&&!/^[A-Z0-9]{1,16}$/.test(callsign))return Response.json({error:'Valid aircraft identity required.'},{status:400});
 const key=hex+':'+callsign,saved=cache.get(key);if(saved&&Date.now()-saved.time<600000)return Response.json(saved.value,{headers:{'Cache-Control':'public,max-age=600'}});
 const info:AircraftInfo={fetchedAt:new Date().toISOString()};
 const jobs=[(async()=>{try{const r=await fetch(`https://api.adsbdb.com/v0/aircraft/${hex}`,{signal:AbortSignal.timeout(5000)});if(!r.ok)return;const body=await r.json() as {response?:{aircraft?:Record<string,unknown>}},a=body.response?.aircraft;if(!a)return;info.manufacturer=clean(a.manufacturer);info.model=clean(a.type);info.country=clean(a.registered_owner_country_name);info.countryCode=clean(a.registered_owner_country_iso_name,3);info.registration=clean(a.registration,16);}catch{/* Local ICAO type families remain available. */}})()];
 if(/^[A-Z]{3}\d[A-Z0-9]*$/.test(callsign))jobs.push((async()=>{try{const r=await fetch(`https://vrs-standing-data.adsb.lol/routes/${callsign.slice(0,2)}/${callsign}.json`,{signal:AbortSignal.timeout(5000)});if(!r.ok)return;const d=await r.json() as {_airports?:{icao:string;name:string;countryiso2:string}[]};if(!Array.isArray(d._airports)||d._airports.length<2)return;const airports=d._airports.slice(0,12).map(a=>({icao:clean(a.icao,4),name:clean(a.name,80),countryiso2:clean(a.countryiso2,2)}));if(airports.some(a=>!/^[A-Z0-9]{3,4}$/.test(a.icao)))return;info.route={scope:reportedRouteScope(airports),codes:airports.map(a=>a.icao),airports};}catch{/* Routes remain unknown when no standing record is available. */}})());
 await Promise.allSettled(jobs);if(cache.size>=160)cache.delete(cache.keys().next().value!);cache.set(key,{value:info,time:Date.now()});
 return Response.json(info,{headers:{'Cache-Control':'public,max-age=600'}});
}
