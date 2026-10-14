'use client';
import {useEffect,useState} from 'react';
export default function NumberField({label,value,onChange,min=0,max=100000,step='any',onValidity}:{label:string;value:number;onChange:(v:number)=>void;min?:number;max?:number;step?:number|string;onValidity?:(valid:boolean)=>void}){
 const [text,setText]=useState(String(value)),[error,setError]=useState(false);
 useEffect(()=>{setText(String(value));setError(false);onValidity?.(true)},[value]);
 return <label className="field"><span>{label}</span><input type="number" inputMode="decimal" min={min} max={max} step={step} value={text} aria-invalid={error} onChange={e=>{const s=e.target.value,n=Number(s),ok=s.trim()!==''&&Number.isFinite(n)&&n>=min&&n<=max;setText(s);setError(!ok);onValidity?.(ok);if(ok)onChange(n)}}/>{error&&<small className="error">Enter {min}–{max}. Last valid value: {value}.</small>}</label>
}
