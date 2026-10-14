import {NextRequest} from 'next/server';
import {parseRoadKml} from '@/lib/roads';
import type {RoadIncident} from '@/lib/roads';
import {trafficQuery,nauticalDistance} from '@/lib/radar';
type RoadCache={incidents:RoadIncident[];fetchedAt:string;partial:boolean};
let saved:RoadCache|null=null;
let pending:Promise<RoadCache>|null=null;
async function statewide(){
 if(saved&&Date.now()-Date.parse(saved.fetchedAt)<300000)return saved;
 if(pending)return pending;
 pending=(async()=>{const results=await Promise.allSettled(([['CHP','https://quickmap.dot.ca.gov/data/chp-only.kml'],['Caltrans','https://quickmap.dot.ca.gov/data/lcs2way.kml']] as const).map(async([source,url])=>{const response=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/vnd.google-earth.kml+xml,text/xml'}});if(!response.ok)throw Error();const kml=await response.text();if(!kml.includes('<Placemark')&&!kml.includes('<kml'))throw Error();return parseRoadKml(kml,source);}));const successful=results.filter((r):r is PromiseFulfilledResult<RoadIncident[]>=>r.status==='fulfilled');if(!successful.length)throw Error();saved={incidents:successful.flatMap(r=>r.value),fetchedAt:new Date().toISOString(),partial:successful.length<2};return saved;})().finally(()=>{pending=null;});return pending;
}
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams,q=trafficQuery(p.get('station'),p.get('radius'),p.get('lat'),p.get('lon'));if(!q)return Response.json({error:'Choose a supported map location.'},{status:400});
 const {station,radius}=q;if(station.lat<32||station.lat>42.2||station.lon< -125||station.lon> -113.8)return Response.json({incidents:[],available:false,partial:false,fetchedAt:new Date().toISOString()},{headers:{'Cache-Control':'public,max-age=300'}});
 try{const all=await statewide(),incidents=all.incidents.filter(a=>nauticalDistance(station,a)<=radius||a.line?.some(([lon,lat])=>nauticalDistance(station,{lat,lon})<=radius)).sort((a,b)=>nauticalDistance(station,a)-nauticalDistance(station,b)).slice(0,120);return Response.json({...all,incidents,available:true},{headers:{'Cache-Control':'public,max-age=180'}});}catch{return Response.json({error:'Road reports are unavailable. Major roads remain visible.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
