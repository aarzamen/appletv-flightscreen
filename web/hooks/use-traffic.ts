'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {TrafficSnapshot,Station} from '@/lib/radar';

export function useTraffic(station:Station,radius:number,enabled=true) {
 const [snapshot,setSnapshot]=useState<TrafficSnapshot|null>(null);
 const key=JSON.stringify([station.id,station.lat,station.lon,radius]);
 const [areaKey,setAreaKey]=useState('');
 const [status,setStatus]=useState<'connecting'|'live'|'stale'|'offline'|'unavailable'>('connecting');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(0);
 const refreshRef=useRef<()=>void>(()=>{});
 useEffect(()=>{
  if(!enabled)return;
  let disposed=false,controller:AbortController|null=null,timer:ReturnType<typeof setTimeout>|undefined,failures=0,nextAllowed=0,hasData=false;
  setSnapshot(null);setAreaKey(key);setStatus('connecting');setError('');setNow(Date.now());
  const schedule=(delay:number)=>{clearTimeout(timer);if(!disposed)timer=setTimeout(run,delay);};
  async function run() {
   if(disposed||controller||document.hidden)return;
   if(!navigator.onLine){setStatus('offline');schedule(30000);return;}
   if(Date.now()<nextAllowed){schedule(nextAllowed-Date.now());return;}
   controller=new AbortController();const active=controller;setBusy(true);
   try {
    const params=new URLSearchParams({station:station.id,radius:String(radius)});if(station.id==='nearby'){params.set('lat',station.lat.toFixed(2));params.set('lon',station.lon.toFixed(2));}
    const response=await fetch(`/api/traffic?${params}`,{signal:AbortSignal.any([active.signal,AbortSignal.timeout(20000)])});
    const data=await response.json() as TrafficSnapshot & {error?:string};
    if(!response.ok){const delay=Number(response.headers.get('Retry-After'));if(Number.isFinite(delay)&&delay>0)nextAllowed=Date.now()+Math.min(delay,300)*1000;throw Error(data.error||'Live traffic is unavailable.');}
    if(!Array.isArray(data.aircraft)||typeof data.source!=='string'||!Number.isFinite(Date.parse(data.fetchedAt)))throw Error('The traffic response could not be read.');
    if(disposed||active.signal.aborted)return;
    setSnapshot(data);hasData=true;failures=0;setStatus('live');setError('');setNow(Date.now());nextAllowed=Date.now()+15000;
   }catch(e){
    if(disposed||active.signal.aborted)return;
    failures++;setStatus(navigator.onLine?(hasData?'stale':'unavailable'):'offline');setError(e instanceof Error?e.message:'Live traffic is unavailable.');
    nextAllowed=Math.max(nextAllowed,Date.now()+Math.min(15000*2**Math.min(failures,3),120000));
   }finally{if(controller===active)controller=null;if(!disposed){setBusy(false);schedule(Math.max(15000,nextAllowed-Date.now()));}}
  }
  const wake=()=>{if(document.hidden){clearTimeout(timer);controller?.abort();controller=null;setBusy(false);}else{setNow(Date.now());void run();}};
  const offline=()=>{setStatus('offline');controller?.abort();controller=null;setBusy(false);};
  refreshRef.current=()=>{clearTimeout(timer);void run();};
  const clock=setInterval(()=>{
   if(document.hidden)return;
   const current=Date.now();setNow(current);
   setSnapshot(previous=>{if(!previous)return previous;const aircraft=previous.aircraft.filter(a=>current-a.seenAt<=120000);return aircraft.length===previous.aircraft.length?previous:{...previous,aircraft};});
  },5000);
  document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake);window.addEventListener('offline',offline);
  void run();
  return()=>{disposed=true;clearInterval(clock);clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',wake);window.removeEventListener('online',wake);window.removeEventListener('offline',offline);};
 },[station,radius,enabled,key]);
 const stale=snapshot&&now-Date.parse(snapshot.fetchedAt)>35000;
 const current=areaKey===key;
 return {snapshot:current?snapshot:null,status:!current?'connecting':status==='live'&&stale?'stale':status,error:current?error:'',busy:current?busy:true,now,refresh:useCallback(()=>refreshRef.current(),[])};
}
