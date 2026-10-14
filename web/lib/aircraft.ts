import data from './aircraft-data.json' with {type:'json'};
type IdentityInput={hex:string;type:string;onGround:boolean;military:boolean;category?:string};
export type AircraftKind='ground'|'helicopter'|'gyroplane'|'glider'|'light'|'jet'|'heavy'|'fighter'|'balloon'|'drone'|'unknown';
export type AircraftIdentity={kind:AircraftKind;family:string;countryCode:string;country:string;military:boolean;engine:string;engineCount:string;typeKnown:boolean};
const types=data.types as Record<string,string[]>;
const countries=data.countries as Record<string,string>;
const blocks=data.blocks as [number,number,string,number][];
const friendly:Record<string,string>={C172:'172 / Skyhawk family',C150:'150 family',C152:'152 family',C130:'C-130 Hercules family',H60:'H-60 / S-70 family',SR20:'Cirrus SR20',SR22:'Cirrus SR22',P28A:'Piper PA-28 family',P28R:'PA-28R / Arrow family',P28T:'PA-28 turbo family',A359:'Airbus A350-900 family',A35K:'Airbus A350-1000 family',A318:'Airbus A318 family',A319:'Airbus A319 family',A320:'Airbus A320 family',A321:'Airbus A321 family',B788:'Boeing 787-8 family',B789:'Boeing 787-9 family',B78X:'Boeing 787-10 family'};
Object.assign(friendly,{PC12:'Pilatus PC-12 family',PC24:'Pilatus PC-24 family',C82R:'R182 / Skylane family',C182:'182 / Skylane family',C206:'206 / Stationair family',C208:'Cessna Caravan family',PA32:'PA-32 / Cherokee Six family',PA44:'PA-44 / Seminole family',PA46:'Piper PA-46 family',RV8:'RV-8 homebuilt family',RV7:'RV-7 homebuilt family',RV6:'RV-6 homebuilt family',RV10:'RV-10 homebuilt family',RV12:'RV-12 homebuilt family',B06:'Bell 206 family',AS50:'H125 / AS350 family',R44:'Robinson R44 family',R22:'Robinson R22 family',E75L:'Embraer 175 family',E75S:'Embraer 175 family',E170:'Embraer 170 family',E190:'Embraer 190 family',B738:'Boeing 737-800 family',B739:'Boeing 737-900 family',B38M:'Boeing 737 MAX 8 family',B39M:'Boeing 737 MAX 9 family',B772:'Boeing 777-200 family',B77W:'Boeing 777-300ER family',A20N:'Airbus A320neo family',A21N:'Airbus A321neo family'});
export function identifyAircraft(a:IdentityInput):AircraftIdentity {
 const type=types[a.type],n=/^[a-f\d]{6}$/i.test(a.hex)?parseInt(a.hex,16):-1;
 const block=n>=0?blocks.find(([start,end])=>n>=start&&n<=end):null;
 const military=a.military||!!block?.[3],countryCode=block?.[2]??'';
 const species=type?.[2],engine=type?.[3],wake=type?.[4],category=a.category??'';
 let kind:AircraftKind='unknown';
 if(a.onGround)kind='ground';
 else if(species==='H'||species==='T'||category==='A7')kind='helicopter';
 else if(species==='G')kind='gyroplane';
 else if(category==='B1')kind='glider';
 else if(category==='B2')kind='balloon';
 else if(category==='B6')kind='drone';
 else if(military&&/^(F1[4568]|F2[25]|F3[25]|A10|EUFI|RFAL|TOR|MIG|SU)/.test(a.type))kind='fighter';
 else if(wake==='H'||wake==='J'||category==='A5')kind='heavy';
 else if(engine==='J')kind='jet';
 else if(type||category==='A1'||category==='A2')kind='light';
 const manufacturer=type?.[0]??'',model=type?.[1]??'';
 const family=friendly[a.type]??(type?`${manufacturer?manufacturer+' ':''}${a.type} family`:a.type||'Unidentified aircraft');
 return {kind,family,countryCode,country:countries[countryCode]??'',military,engine:engine==='P'?'Piston':engine==='T'?'Turboprop / turboshaft':engine==='J'?'Jet':engine==='E'?'Electric':'',engineCount:type?.[5]??'',typeKnown:!!type};
}
export function reportedRouteScope(airports:{countryiso2:string}[]):'domestic'|'international'|'unknown' {
 if(airports.length<2||airports.some(a=>!a.countryiso2))return 'unknown';
 return new Set(airports.map(a=>a.countryiso2.toUpperCase())).size>1?'international':'domestic';
}
export const isAirborne=(a:{onGround:boolean;altitude?:number|null})=>!a.onGround&&typeof a.altitude==='number'&&Number.isFinite(a.altitude);
export function closestAirborne<T extends {lat:number;lon:number;onGround:boolean;altitude:number|null}>(tracks:T[],position:{lat:number;lon:number}):T|null {
 const rad=Math.PI/180;let closest:T|null=null,best=Infinity;
 for(const a of tracks){if(!isAirborne(a))continue;const dlat=(a.lat-position.lat)*rad,dlon=(a.lon-position.lon)*rad;const h=Math.sin(dlat/2)**2+Math.cos(position.lat*rad)*Math.cos(a.lat*rad)*Math.sin(dlon/2)**2;if(h<best){best=h;closest=a;}}
 return closest;
}
export const kindLabels:Record<AircraftKind,string>={ground:'On the ground',helicopter:'Helicopter / rotorcraft',gyroplane:'Gyroplane',glider:'Glider',light:'Fixed-wing aircraft',jet:'Jet aircraft',heavy:'Heavy aircraft',fighter:'Military jet',balloon:'Lighter than air',drone:'Uncrewed aircraft',unknown:'Aircraft'};
export type AircraftInfo={manufacturer?:string;model?:string;country?:string;countryCode?:string;registration?:string;route?:{scope:'domestic'|'international'|'unknown';codes:string[];airports:{icao:string;name:string;countryiso2:string}[]};fetchedAt:string};
