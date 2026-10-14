import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist/client');
async function walk(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat()}
const files=(await walk(root)).filter(f=>(/\.(js|css|svg|png|ico|webmanifest|woff2?)$/.test(f)||f.endsWith('/map-style.json'))&&!f.endsWith('/sw.js')).sort();
const hash=createHash('sha256');for(const f of files){hash.update(f.slice(root.length));hash.update(await readFile(f))}hash.update(await readFile('public/sw.js'));
const version=hash.digest('hex').slice(0,20),assets=files.map(f=>f.slice(root.length));
await writeFile(path.join(root,'offline-manifest.json'),JSON.stringify({version,assets,pages:['/','/desk']}));
await writeFile(path.join(root,'sw.js'),(await readFile('public/sw.js','utf8')).replaceAll('__BUILD_ID__',version));
console.log(`Offline build ${version}: ${assets.length} assets in manifest.`);
