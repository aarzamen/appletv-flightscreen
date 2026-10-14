import {identifyAircraft,isAirborne} from './aircraft.ts';
export type Station = {id:string; name:string; label:string; region:string; lat:number; lon:number; icao:string; timezone:string};
export const stations:Station[] = [
 {id:'ventura',name:'Ventura / LAX basin',label:'Southern California',region:'California, United States',lat:34.28,lon:-119.29,icao:'KOXR',timezone:'America/Los_Angeles'},
 {id:'sfo',name:'San Francisco Bay',label:'San Francisco',region:'California, United States',lat:37.6213,lon:-122.379,icao:'KSFO',timezone:'America/Los_Angeles'},
 {id:'seattle',name:'Seattle / Tacoma',label:'Seattle',region:'Washington, United States',lat:47.4502,lon:-122.3088,icao:'KSEA',timezone:'America/Los_Angeles'},
 {id:'jfk',name:'New York / JFK',label:'New York',region:'New York, United States',lat:40.6413,lon:-73.7781,icao:'KJFK',timezone:'America/New_York'},
 {id:'chicago',name:'Chicago O’Hare',label:'Chicago',region:'Illinois, United States',lat:41.9742,lon:-87.9073,icao:'KORD',timezone:'America/Chicago'},
 {id:'denver',name:'Denver Metro',label:'Denver',region:'Colorado, United States',lat:39.8561,lon:-104.6737,icao:'KDEN',timezone:'America/Denver'},
 {id:'london',name:'London / Heathrow',label:'London',region:'United Kingdom',lat:51.47,lon:-0.4543,icao:'EGLL',timezone:'Europe/London'},
 {id:'tokyo',name:'Tokyo / Haneda',label:'Tokyo',region:'Japan',lat:35.5494,lon:139.7798,icao:'RJTT',timezone:'Asia/Tokyo'},
 {id:'okinawa',name:'Okinawa / Naha',label:'Okinawa',region:'Japan',lat:26.1958,lon:127.6459,icao:'ROAH',timezone:'Asia/Tokyo'},
];
export type Track = {hex:string; callsign:string; lat:number; lon:number; altitude:number|null; onGround:boolean; speed:number|null; heading:number|null; verticalRate:number|null; squawk:string|null; registration:string; type:string; category?:string; seenAt:number; distanceNm:number; emergency:boolean; military:boolean};
export type TrafficSnapshot = {aircraft:Track[]; source:string; fetchedAt:string};
export type AltitudeFilter = 'all'|'airborne'|'ground'|'military'|'low'|'mid'|'high'|'emergency';
export const ranges=[15,30,60,120] as const;
const finite = (v:unknown):v is number => typeof v==='number' && Number.isFinite(v);
const metric = (v:unknown,min:number,max:number) => finite(v)&&v>=min&&v<=max?v:null;
const text = (v:unknown,max=24) => typeof v==='string'?v.trim().slice(0,max):'';
export function nauticalDistance(a:{lat:number;lon:number},b:{lat:number;lon:number}) {
 const r=Math.PI/180, dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r;
 const h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2;
 return 6880.13*Math.atan2(Math.sqrt(Math.min(1,h)),Math.sqrt(Math.max(0,1-h)));
}
export function trafficQuery(id:string|null,radius:string|null,lat?:string|null,lon?:string|null) {
 let station=stations.find(s=>s.id===id);const n=Number(radius??60);
 if(id==='nearby'&&lat?.trim()&&lon?.trim()&&Number.isFinite(Number(lat))&&Math.abs(Number(lat))<=85&&Number.isFinite(Number(lon))&&Math.abs(Number(lon))<=180)station={id:'nearby',name:'Near your location',label:'Your overhead airspace',region:'Your current area',lat:Math.round(Number(lat)*100)/100,lon:Math.round(Number(lon)*100)/100,icao:'',timezone:'UTC'};
 return station&&ranges.some(r=>r===n)?{station,radius:n}:null;
}
export function normalizeTraffic(body:unknown,station:{lat:number;lon:number},now=Date.now()):Track[] {
 if(!body||typeof body!=='object')throw Error('Invalid traffic response');
 const d=body as Record<string,unknown>;
 if(!Array.isArray(d.ac))throw Error('Invalid traffic response');
 const sourceTime=finite(d.now)?(d.now>1e12?d.now:d.now*1000):now;
 if(sourceTime>now+30000 || now-sourceTime>120000)throw Error('Traffic snapshot timestamp is stale or invalid');
 const found=new Set<string>(),tracks:Track[]=[];
 for(const raw of d.ac.slice(0,2500)) {
  if(!raw||typeof raw!=='object')continue;
  const a=raw as Record<string,unknown>,hex=text(a.hex,7).toLowerCase();
  const seen=metric(a.seen_pos,0,120);
  if(!/^[a-f0-9]{6}$|^~[a-f0-9]{6}$/i.test(hex)||found.has(hex)||!finite(a.lat)||Math.abs(a.lat)>90||!finite(a.lon)||Math.abs(a.lon)>180||seen===null)continue;
  const seenAt=sourceTime-seen*1000;
  if(now-seenAt>120000)continue;
  const altitude=a.alt_baro==='ground'?0:metric(a.alt_baro,-2000,100000)??metric(a.alt_geom,-2000,100000);
  const squawk=/^\d{4}$/.test(text(a.squawk))?text(a.squawk):null;
  const track:Track={hex,callsign:text(a.flight,16)||hex.toUpperCase(),lat:a.lat,lon:a.lon,altitude,onGround:a.alt_baro==='ground',speed:metric(a.gs,0,1500),heading:metric(a.track,0,360),verticalRate:metric(a.baro_rate,-20000,20000)??metric(a.geom_rate,-20000,20000),squawk,registration:text(a.r,16),type:text(a.t,12),seenAt,distanceNm:nauticalDistance(station,{lat:a.lat,lon:a.lon}),emergency:['7500','7600','7700'].includes(squawk??''),military:finite(a.dbFlags)&&(a.dbFlags&1)!==0};
  track.category=text(a.category,2);found.add(hex);tracks.push(track);
 }
 return tracks.sort((a,b)=>a.distanceNm-b.distanceNm).slice(0,400);
}
export function filterTracks(tracks:Track[],filter:AltitudeFilter,query:string):Track[] {
 const q=query.trim().toLowerCase();
 return tracks.filter(a=>(!q||`${a.callsign} ${a.hex} ${a.registration} ${a.type} ${identifyAircraft(a).family}`.toLowerCase().includes(q))&&(filter==='all'||filter==='airborne'&&isAirborne(a)||filter==='ground'&&a.onGround||filter==='military'&&identifyAircraft(a).military||filter==='emergency'&&a.emergency||a.altitude!==null&&(filter==='low'&&a.altitude<10000||filter==='mid'&&a.altitude>=10000&&a.altitude<=25000||filter==='high'&&a.altitude>25000)));
}
export function altitudeLabel(track:Pick<Track,'altitude'|'onGround'>) {
 if(track.onGround)return 'Ground';
 if(track.altitude===null)return 'Unknown';
 return `${Math.round(track.altitude).toLocaleString('en-US')} ft`;
}
export const emergencyLabel=(squawk:string|null)=>squawk==='7500'?'Unlawful interference':squawk==='7600'?'Radio failure':squawk==='7700'?'General emergency':'';
