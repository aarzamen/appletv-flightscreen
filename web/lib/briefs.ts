import data from './airport-briefs.json';
export type RunwayEnd={id:string;trueHeadingDeg:number|null;derivedTrueHeadingDeg:number|null;trafficPattern:string|null;displacedThresholdFt:number|null;landingDistanceAvailableFt:number|null};
export type AirportBrief={id:string;towerHoursLocal:string|null;trafficPatternAltitudeAglFt:number|null;runways:{id:string;lengthFt:number;widthFt:number;surface:string;ends:RunwayEnd[]}[];frequencies:{kind:string;label:string;frequencyMHz:string;sector:string|null;remarks:string|null;use:string;facilityName:string|null}[];operationalRemarks:{field:string;element:string|null;text:string}[];atcRemarks:string[]};
export const briefSource={title:data.sourceTitle,url:data.sourceUrl,effective:data.effectiveDate,next:data.nextCycleDate};
export const airportBriefs=data.airports as Record<string,AirportBrief>;
