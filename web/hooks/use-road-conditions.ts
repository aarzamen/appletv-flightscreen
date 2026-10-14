'use client';
import {useEffect,useState} from 'react';
import type {Station} from '@/lib/radar';
import type {RoadSnapshot} from '@/lib/roads';
export function useRoadConditions(station:Station,radius:number,enabled:boolean){
 const [snapshot,setSnapshot]=useState<RoadSnapshot|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  setSnapshot(null);setError('');if(!enabled)return;
  let disposed=false,controller:AbortController|null=null;
  async function refresh(){if(controller||document.hidden)return;controller=new AbortController();try{const params=new URLSearchParams({station:station.id,radius:String(radius)});if(station.id==='nearby'){params.set('lat',station.lat.toFixed(2));params.set('lon',station.lon.toFixed(2));}const r=await fetch('/api/roads?'+params,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}),d=await r.json() as RoadSnapshot&{error?:string};if(!r.ok||!Array.isArray(d.incidents)||!Number.isFinite(Date.parse(d.fetchedAt)))throw Error(d.error||'Road reports unavailable.');if(!disposed){setSnapshot(d);setError(d.partial?'Some road feeds are unavailable. Showing available reports.':'');}}catch(e){if(!disposed&&!controller?.signal.aborted)setError(e instanceof Error?e.message:'Road reports unavailable.');}finally{controller=null;}}
  void refresh();const timer=setInterval(refresh,300000);
  const wake=()=>{if(!document.hidden)void refresh();else controller?.abort();};document.addEventListener('visibilitychange',wake);
  return()=>{disposed=true;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',wake);};
 },[station,radius,enabled]);
 return {snapshot,error};
}
