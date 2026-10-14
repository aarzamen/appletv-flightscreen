export async function GET() {
 try {
  const response=await fetch('https://api.rainviewer.com/public/weather-maps.json',{signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error();
  const data=await response.json() as {host?:string;radar?:{past?:{path:string;time:number}[]}};
  const frame=data.radar?.past?.at(-1);
  if(!frame||!Number.isFinite(frame.time)||!/^\/v2\/radar\/[a-zA-Z0-9/_-]+$/.test(frame.path)||data.host!=='https://tilecache.rainviewer.com')throw Error();
  return Response.json({url:`${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,time:frame.time},{headers:{'Cache-Control':'public,max-age=300'}});
 }catch{return Response.json({error:'Weather radar is unavailable. Try again shortly.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
