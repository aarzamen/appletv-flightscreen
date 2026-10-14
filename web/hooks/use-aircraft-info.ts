'use client';
import {useEffect,useState} from 'react';
import type {Track} from '@/lib/radar';
import type {AircraftInfo} from '@/lib/aircraft';
const cache=new Map<string,AircraftInfo>();
export function useAircraftInfo(aircraft:Track|null){
 const hex=aircraft?.hex??'',callsign=aircraft?.callsign??'';
 const key=hex+':'+callsign;
 const [received,setReceived]=useState<{key:string;info:AircraftInfo}|null>(null);
 useEffect(()=>{
  setReceived(null);if(!/^[a-f0-9]{6}$/i.test(hex))return;
  const stored=cache.get(key);if(stored&&Date.now()-Date.parse(stored.fetchedAt)<600000){setReceived({key,info:stored});return;}
  const controller=new AbortController();
  fetch(`/api/aircraft?${new URLSearchParams({hex,callsign})}`,{signal:controller.signal}).then(async r=>{if(!r.ok)return;const d=await r.json() as AircraftInfo;if(!controller.signal.aborted){if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,d);setReceived({key,info:d});}}).catch(()=>{});
  return()=>controller.abort();
 },[hex,callsign,key]);
 return received?.key===key?received.info:null;
}
