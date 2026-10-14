export type RoadIncident={id:string;source:'CHP'|'Caltrans';title:string;detail:string;lat:number;lon:number;updated:string;line?:[number,number][]};
export type RoadSnapshot={incidents:RoadIncident[];fetchedAt:string;available:boolean;partial:boolean};
function plain(value:string){return value.replace(/<br\s*\/?\s*>/gi,' · ').replace(/<[^>]*>/g,' ').replace(/&(?:amp|nbsp|quot|apos|lt|gt);/g,s=>({'&amp;':'&','&nbsp;':' ','&quot;':'"','&apos;':"'",'&lt;':'','&gt;':''}[s]??'')).replace(/\s+/g,' ').trim();}
export function parseRoadKml(kml:string,source:'CHP'|'Caltrans'):RoadIncident[]{
 const reports:RoadIncident[]=[],seen=new Set<string>();
 for(const match of kml.slice(0,4000000).matchAll(/<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/g)){
  const content=match[1],raw=content.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g,'')??'';
  const title=plain(raw.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]??content.match(/<name[^>]*>([\s\S]*?)<\/name>/)?.[1]??'Road report').slice(0,160);
  if(source==='CHP'&&/MZP|Assist CT with Maintenance/i.test(title))continue;
  const coords=(content.match(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/)?.[1]??'').trim().split(/\s+/).map(s=>s.split(',').slice(0,2).map(Number)).filter(p=>p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=85) as [number,number][];
  if(!coords.length)continue;const [lon,lat]=coords[0];
  const id=source+':'+lat.toFixed(6)+':'+lon.toFixed(6)+':'+title;
  if(seen.has(id))continue;seen.add(id);
  const detail=plain([...raw.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(m=>m[1]).join(' · ')).slice(0,650);
  const updated=plain(raw.match(/<span[^>]*class=["']iw-timestamp["'][^>]*>([\s\S]*?)<\/span>/)?.[1]??'').slice(0,80);
  const line=content.includes('<LineString')&&coords.length>1?coords.filter((_,i)=>i%Math.max(1,Math.ceil(coords.length/60))===0):undefined;
  reports.push({id,source,title,detail,lat,lon,updated,...line?{line}:{}});
  if(reports.length>=2000)break;
 }
 return reports;
}
