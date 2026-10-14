'use client';
import {memo,useEffect,useRef,useState} from 'react';
import type {Map as GLMap,GeoJSONSource,Marker} from 'maplibre-gl';
import type {Station,Track} from '@/lib/radar';
import {identifyAircraft} from '@/lib/aircraft';
import {aircraftShapes} from '@/lib/aircraft-shapes';
import type {RoadIncident} from '@/lib/roads';
import 'maplibre-gl/dist/maplibre-gl.css';

export type MapCommand={id:number;action:'in'|'out'|'center'|'north'|'target'};
export type RadarFrame={url:string;time:number}|null;
type Props={station:Station;radius:number;aircraft:Track[];selected:Track|null;follow:boolean;layer:string;sweep:boolean;tilt:boolean;radar:RadarFrame;radarOpacity:number;routeScope:string;roads:RoadIncident[];command:MapCommand|null;onSelect:(id:string|null)=>void;onCamera:(bearing:number,pitch:number)=>void;onStopFollowing:()=>void;onIncident:(id:string)=>void};
const collection=(features:GeoJSON.Feature[]):GeoJSON.FeatureCollection=>({type:'FeatureCollection',features});
const point=(coordinates:number[],properties:Record<string,unknown>={}):GeoJSON.Feature=>({type:'Feature',geometry:{type:'Point',coordinates},properties});
const destination=(s:Station,nm:number,angle:number):[number,number]=>{
 const rad=Math.PI/180,d=nm/3440.065,lat=s.lat*rad,lng=s.lon*rad,a=angle*rad;
 const y=Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(a));
 const x=lng+Math.atan2(Math.sin(a)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(y));
 return [x/rad,y/rad];
};
function RadarMap(props:Props) {
 const container=useRef<HTMLDivElement>(null),map=useRef<GLMap|null>(null),latest=useRef(props),sweepMarker=useRef<Marker|null>(null),labelMarker=useRef<Marker|null>(null),ringLabels=useRef<Marker[]>([]),trails=useRef(new Map<string,[number,number][]>()),baseLayers=useRef<{id:string;visible:boolean;labels:boolean;road:boolean}[]>([]);
 latest.current=props;
 const [ready,setReady]=useState(false),[failure,setFailure]=useState('');
 useEffect(()=>{
  let cancelled=false;
  import('maplibre-gl').then(gl=>{
   if(cancelled||!container.current)return;
   const s=latest.current.station;
   let instance:GLMap;
   try {
    instance=new gl.Map({container:container.current,center:[s.lon,s.lat],zoom:7,pitch:0,bearing:0,minZoom:3,maxZoom:15,maxPitch:60,pixelRatio:Math.min(window.devicePixelRatio||1,2),maxTileCacheSize:80,renderWorldCopies:false,attributionControl:false,canvasContextAttributes:{antialias:false},style:'/map-style.json'});
   }catch{setFailure('This browser could not start the map. Live aircraft are available in the Flights tab.');return;}
   map.current=instance;
   instance.addControl(new gl.AttributionControl({compact:true}),'bottom-right');
   instance.on('load',()=>{
    if(cancelled)return;
    baseLayers.current=instance.getStyle().layers.map(layer=>({id:layer.id,visible:layer.layout?.visibility!=='none',labels:layer.type==='symbol',road:layer.type==='line'&&/highway|motorway|trunk|primary/.test(layer.id)}));
    for(const [kind,path] of Object.entries(aircraftShapes))for(const [id,color] of [['low','#65d6f4'],['high','#8bb9fa'],['military','#f4c27a'],['active','#42efb2'],['emergency','#ff687b'],['ground','#8a9da9']]){
     const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const c=canvas.getContext('2d')!;
     c.scale(2,2);const shape=new Path2D(path);c.strokeStyle='#06121c';c.lineWidth=2.8;c.lineJoin='round';c.stroke(shape);c.fillStyle=color;c.fill(shape);
     instance.addImage(kind+'-'+id,c.getImageData(0,0,64,64),{pixelRatio:2});
    }
    instance.addSource('scope',{type:'geojson',data:collection([])});
    instance.addLayer({id:'scope',type:'line',source:'scope',paint:{'line-color':'#69d9e6','line-width':1,'line-opacity':.22,'line-dasharray':[3,5]}});
    instance.addSource('road-reports',{type:'geojson',data:collection([])});
    instance.addLayer({id:'road-closure-outline',type:'line',source:'road-reports',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':'#101d27','line-width':6,'line-opacity':.9}});
    instance.addLayer({id:'road-closures',type:'line',source:'road-reports',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':'#d3a16a','line-width':3,'line-opacity':.85,'line-dasharray':[2,1]}});
    instance.addLayer({id:'road-incidents',type:'circle',source:'road-reports',filter:['==',['geometry-type'],'Point'],minzoom:7,paint:{'circle-radius':['interpolate',['linear'],['zoom'],7,3,11,6],'circle-color':'#d9a466','circle-stroke-color':'#17232c','circle-stroke-width':1.8,'circle-opacity':.85}});
    instance.addSource('station',{type:'geojson',data:collection([])});
    instance.addLayer({id:'station-halo',type:'circle',source:'station',paint:{'circle-radius':11,'circle-color':'#33e8aa','circle-opacity':.09,'circle-stroke-color':'#33e8aa','circle-stroke-width':1,'circle-stroke-opacity':.4}});
    instance.addLayer({id:'station-dot',type:'circle',source:'station',paint:{'circle-radius':3,'circle-color':'#70f0c0','circle-stroke-color':'#0a281f','circle-stroke-width':2}});
    instance.addSource('trail',{type:'geojson',data:collection([])});
    instance.addLayer({id:'trail',type:'line',source:'trail',paint:{'line-color':'#40edb2','line-width':2,'line-opacity':.65,'line-dasharray':[2,3]}});
    instance.addSource('traffic',{type:'geojson',data:collection([])});
    instance.addSource('ground-traffic',{type:'geojson',data:collection([]),cluster:true,clusterRadius:30,clusterMaxZoom:11});
    instance.addLayer({id:'ground-clusters',type:'circle',source:'ground-traffic',filter:['has','point_count'],paint:{'circle-color':'#18313e','circle-opacity':.8,'circle-radius':['step',['get','point_count'],13,10,17,30,21],'circle-stroke-color':'#7997a7','circle-stroke-width':1,'circle-stroke-opacity':.5}});
    instance.addLayer({id:'ground-count',type:'symbol',source:'ground-traffic',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':['Noto Sans Regular'],'text-size':11,'text-allow-overlap':true},paint:{'text-color':'#c6dbe7'}});
    instance.addLayer({id:'ground-individual',type:'symbol',source:'ground-traffic',filter:['!', ['has','point_count']],layout:{'icon-image':'ground-ground','icon-size':.6,'icon-allow-overlap':true},paint:{'icon-opacity':.7}});
    instance.addLayer({id:'international-route-cue',type:'circle',source:'traffic',filter:['==',['get','routeScope'],'international'],paint:{'circle-radius':27,'circle-color':'#bfa0ff','circle-opacity':0,'circle-stroke-color':'#c2a9ff','circle-stroke-width':1.5,'circle-stroke-opacity':.85}});
    instance.addLayer({id:'target-halo',type:'circle',source:'traffic',filter:['==',['get','active'],true],paint:{'circle-radius':22,'circle-color':'#39eaae','circle-opacity':.12,'circle-stroke-color':'#43efb4','circle-stroke-width':1.3,'circle-stroke-opacity':.7}});
    instance.addLayer({id:'aircraft-unknown-heading',type:'circle',source:'traffic',filter:['==',['get','hasHeading'],false],paint:{'circle-radius':4,'circle-color':'#71d9ee','circle-stroke-color':'#091a24','circle-stroke-width':1}});
    for(const priority of [false,true])instance.addLayer({id:priority?'aircraft-priority':'aircraft',type:'symbol',source:'traffic',filter:['all',['==',['get','hasHeading'],true],['==',['get','priority'],priority]],layout:{'icon-image':['get','icon'],'icon-size':['interpolate',['linear'],['zoom'],5,['case',['get','active'],1.1,['get','ground'],.58,.5],10,['case',['get','active'],1.1,['get','ground'],.58,.8]],'icon-rotate':['get','heading'],'icon-rotation-alignment':'map','icon-pitch-alignment':'map','icon-allow-overlap':priority,'icon-ignore-placement':priority,'icon-padding':2,'symbol-sort-key':['get','distance']}});
    const beam=document.createElement('div');beam.className='fs-map-sweep';beam.innerHTML='<div class="fs-sweep-beam"></div>';beam.setAttribute('aria-hidden','true');beam.tabIndex=-1;beam.setAttribute('role','presentation');
    sweepMarker.current=new gl.Marker({element:beam,anchor:'center',pitchAlignment:'map',rotationAlignment:'map'}).setLngLat([s.lon,s.lat]).addTo(instance);
    const label=document.createElement('div');label.className='fs-target-label';label.setAttribute('aria-hidden','true');label.tabIndex=-1;label.setAttribute('role','presentation');
    labelMarker.current=new gl.Marker({element:label,anchor:'bottom',offset:[0,-27]}).setLngLat([s.lon,s.lat]);
    const sizeBeam=()=>{const p=latest.current,center=instance.project([p.station.lon,p.station.lat]),east=instance.project(destination(p.station,p.radius,90));const diameter=Math.max(1,Math.hypot(east.x-center.x,east.y-center.y)*2);beam.style.width=`${diameter}px`;beam.style.height=`${diameter}px`;};
    instance.on('zoom',sizeBeam);
    instance.on('click',event=>{
     const {x,y}=event.point,features=instance.queryRenderedFeatures([[x-14,y-14],[x+14,y+14]],{layers:['aircraft-priority','aircraft','aircraft-unknown-heading','ground-individual','ground-clusters','road-incidents','road-closures']});
     const flight=features.find(f=>f.properties?.hex);if(flight){latest.current.onSelect(flight.properties!.hex);return;}
     const cluster=features.find(f=>f.properties?.cluster_id!==undefined);
     if(cluster&&cluster.geometry.type==='Point'){const center=cluster.geometry.coordinates as [number,number];(instance.getSource('ground-traffic') as GeoJSONSource).getClusterExpansionZoom(cluster.properties!.cluster_id).then(zoom=>instance.easeTo({center,zoom,duration:500}));return;}
     const report=features.find(f=>f.properties?.incidentId);if(report){latest.current.onIncident(report.properties!.incidentId);return;}
     latest.current.onSelect(null);
    });
    instance.on('mouseenter','aircraft',()=>{instance.getCanvas().style.cursor='pointer';});
    instance.on('mouseleave','aircraft',()=>{instance.getCanvas().style.cursor='';});
    instance.on('dragstart',()=>latest.current.onStopFollowing());
    instance.on('moveend',()=>latest.current.onCamera(instance.getBearing(),instance.getPitch()));
    setReady(true);sizeBeam();
   });
   instance.on('error',event=>{if(event.error?.message?.includes('WebGL'))setFailure('The map paused. Reload the page to reconnect, or use the Flights tab.');});
  }).catch(()=>setFailure('The map could not load. Check your connection and reload; the Flights tab remains available.'));
  const observer=new ResizeObserver(()=>map.current?.resize());if(container.current)observer.observe(container.current);
  return()=>{cancelled=true;observer.disconnect();sweepMarker.current?.remove();labelMarker.current?.remove();ringLabels.current.forEach(m=>m.remove());map.current?.remove();map.current=null;};
 },[]);
 useEffect(()=>{
  const m=map.current;if(!ready||!m)return;
  trails.current.clear();
  const {station:s,radius}=props;
  const features:GeoJSON.Feature[]=[];
  for(let r=1;r<=4;r++)features.push({type:'Feature',properties:{radius:radius*r/4},geometry:{type:'LineString',coordinates:Array.from({length:97},(_,i)=>destination(s,radius*r/4,i*3.75))}});
  (m.getSource('scope') as GeoJSONSource).setData(collection(features));
  (m.getSource('station') as GeoJSONSource).setData(collection([point([s.lon,s.lat])]));
  sweepMarker.current?.setLngLat([s.lon,s.lat]);
  ringLabels.current.forEach(l=>l.remove());ringLabels.current=[];
  import('maplibre-gl').then(gl=>{if(map.current!==m)return;for(let i=1;i<=4;i++){const el=document.createElement('span');el.className='fs-ring-label';el.textContent=`${radius*i/4} nm`;el.setAttribute('aria-hidden','true');el.tabIndex=-1;el.setAttribute('role','presentation');ringLabels.current.push(new gl.Marker({element:el,anchor:'center'}).setLngLat(destination(s,radius*i/4,45) as [number,number]).addTo(m));}});
  const mobile=m.getContainer().clientWidth<640;
  m.fitBounds([destination(s,radius,225) as [number,number],destination(s,radius,45) as [number,number]],{padding:mobile?{top:150,bottom:240,left:35,right:35}:{top:105,bottom:90,left:360,right:100},duration:700,maxZoom:10});
 },[ready,props.station,props.radius]);
 useEffect(()=>{
  const m=map.current;if(!ready||!m)return;
  const active=props.selected;
  const main:GeoJSON.Feature[]=[],ground:GeoJSON.Feature[]=[];
  for(const a of props.aircraft){const identity=identifyAircraft(a),selected=a.hex===active?.hex,color=a.emergency?'emergency':selected?'active':identity.military?'military':a.onGround?'ground':(a.altitude??0)>25000?'high':'low';const feature=point([a.lon,a.lat],{hex:a.hex,heading:a.heading??0,hasHeading:a.heading!==null||a.onGround,ground:a.onGround,active:selected,priority:selected||a.emergency||identity.military||latest.current.station.id==='nearby'||['light','helicopter','gyroplane','glider','balloon','drone'].includes(identity.kind),distance:a.distanceNm,routeScope:selected?props.routeScope:'unknown',icon:identity.kind+'-'+color});if(a.onGround&&!selected&&!identity.military)ground.push(feature);else main.push(feature);}
  (m.getSource('traffic') as GeoJSONSource).setData(collection(main));(m.getSource('ground-traffic') as GeoJSONSource).setData(collection(ground));
  for(const a of props.aircraft){const path=trails.current.get(a.hex)??[],last=path.at(-1);if(!last||last[0]!==a.lon||last[1]!==a.lat)path.push([a.lon,a.lat]);trails.current.set(a.hex,path.slice(-25));}
  const ids=new Set(props.aircraft.map(a=>a.hex));for(const id of trails.current.keys())if(!ids.has(id))trails.current.delete(id);
  const path=active?trails.current.get(active.hex):null;
  (m.getSource('trail') as GeoJSONSource).setData(collection(path&&path.length>1?[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:path}}]:[]));
  if(active){const marker=labelMarker.current!;marker.getElement().textContent=active.callsign;marker.setLngLat([active.lon,active.lat]).addTo(m);if(props.follow)m.easeTo({center:[active.lon,active.lat],offset:[0,m.getContainer().clientWidth<640?-m.getContainer().clientHeight*.17:0],duration:900});}else labelMarker.current?.remove();
 },[ready,props.aircraft,props.selected,props.follow,props.routeScope]);
 useEffect(()=>{
  const m=map.current;if(!ready||!m)return;
  const satellite=props.layer==='satellite';
  if(satellite&&!m.getSource('satellite')){m.addSource('satellite',{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:18,attribution:'Imagery © Esri, Maxar, Earthstar Geographics'});m.addLayer({id:'satellite',type:'raster',source:'satellite',paint:{'raster-brightness-max':.75,'raster-saturation':-.25}},baseLayers.current.find(l=>l.road||l.labels)?.id??'scope');}
  if(m.getLayer('satellite'))m.setLayoutProperty('satellite','visibility',satellite?'visible':'none');
  for(const base of baseLayers.current)if(m.getLayer(base.id))m.setLayoutProperty(base.id,'visibility',!base.visible||satellite&&!base.labels&&!base.road?'none':'visible');
 },[ready,props.layer]);
 useEffect(()=>{const m=map.current;if(!ready||!m)return;m.easeTo({pitch:props.tilt?55:0,duration:600});},[ready,props.tilt]);
 useEffect(()=>{if(sweepMarker.current)sweepMarker.current.getElement().style.display=props.sweep?'':'none';},[ready,props.sweep]);
 useEffect(()=>{
  const m=map.current;if(!ready||!m)return;
  if(m.getLayer('rain'))m.removeLayer('rain');if(m.getSource('rain'))m.removeSource('rain');
  if(props.radar){m.addSource('rain',{type:'raster',tiles:[props.radar.url],tileSize:256,minzoom:0,maxzoom:7,attribution:'Weather radar © <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>'});m.addLayer({id:'rain',type:'raster',source:'rain',paint:{'raster-opacity':latest.current.radarOpacity,'raster-fade-duration':0}},'scope');}
 },[ready,props.radar]);
 useEffect(()=>{const m=map.current;if(ready&&m?.getLayer('rain'))m.setPaintProperty('rain','raster-opacity',props.radarOpacity);},[ready,props.radarOpacity]);
 useEffect(()=>{const m=map.current;if(!ready||!m)return;const features:GeoJSON.Feature[]=[];for(const r of props.roads){features.push(point([r.lon,r.lat],{incidentId:r.id}));if(r.line&&r.line.length>1)features.push({type:'Feature',properties:{incidentId:r.id},geometry:{type:'LineString',coordinates:r.line}});}(m.getSource('road-reports') as GeoJSONSource).setData(collection(features));},[ready,props.roads]);
 useEffect(()=>{
  const m=map.current,c=props.command;if(!ready||!m||!c)return;
  if(c.action==='in')m.zoomIn({duration:300});if(c.action==='out')m.zoomOut({duration:300});if(c.action==='north')m.easeTo({bearing:0,pitch:0,duration:500});
  const s=c.action==='target'?latest.current.selected:latest.current.station;if(s&&(c.action==='center'||c.action==='target'))m.easeTo({center:[s.lon,s.lat],offset:[0,c.action==='target'&&m.getContainer().clientWidth<640?-m.getContainer().clientHeight*.17:0],duration:650});
 },[ready,props.command]);
 return <div className="fs-map" aria-label="Interactive live aircraft map. Drag to pan, pinch to zoom, use two fingers to rotate."><div className="fs-map-engine" ref={container}/><div className="fs-map-vignette"/>{!ready&&!failure&&<div className="fs-map-loading"><span className="fs-loading-ring"/><span>Opening the airspace…</span></div>}{failure&&<div className="fs-map-failure" role="status">{failure}</div>}</div>;
}
export default memo(RadarMap);
