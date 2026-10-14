export async function offlineStatus(prepare=false):Promise<{ok:boolean;build?:string;assets?:number;error?:string}>{
 if(!('serviceWorker' in navigator))return {ok:false,error:'Offline support unavailable in this browser.'};
 return new Promise(resolve=>{const timeout=setTimeout(()=>resolve({ok:false,error:'Offline preparation timed out. Stay online and try again.'}),20000);navigator.serviceWorker.ready.then(r=>{if(!r.active)throw Error();const channel=new MessageChannel();channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data)};r.active.postMessage({type:prepare?'CACHE_WORKSPACE':'GET_STATUS'},[channel.port2])}).catch(()=>{clearTimeout(timeout);resolve({ok:false,error:'Offline workspace unavailable.'})})})
}
