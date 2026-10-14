import type {Metadata,Viewport} from 'next';
import './globals.css';
import './flightscreen.css';
export const metadata:Metadata={authors:[{name:'Aaron A'}],creator:'Aaron A',generator:'ChatGPT',title:'FlightScreen · A little closer to the sky',description:'A live window into the sky. Explore real aircraft, follow a flight, and see the weather in a cinematic radar view inspired by FlightScreen for Apple TV and iPad.',manifest:'/manifest.webmanifest',applicationName:'FlightScreen',appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'FlightScreen'},icons:{icon:[{url:'/favicon.svg',type:'image/svg+xml'},{url:'/favicon.ico',sizes:'32x32'}],apple:'/apple-touch-icon.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#08121e',colorScheme:'dark'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" className="dark"><body>{children}</body></html>}
