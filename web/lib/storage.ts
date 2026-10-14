export function restoreSavedWork(storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,data:Record<string,unknown>){
 const previous:Record<string,string|null>={};
 try{for(const k of Object.keys(data))previous[k]=storage.getItem('aerodeck:'+k)}catch{return {ok:false,restored:true}}
 try{for(const [k,v] of Object.entries(data))storage.setItem('aerodeck:'+k,JSON.stringify(v));return {ok:true,restored:false}}catch{
  let restored=true;
  for(const k of Object.keys(previous)){try{storage.removeItem('aerodeck:'+k)}catch{restored=false}}
  for(const [k,v] of Object.entries(previous)){try{if(v!=null)storage.setItem('aerodeck:'+k,v)}catch{restored=false}}
  return {ok:false,restored};
 }
}
