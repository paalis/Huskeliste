import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { configSource } from './config.js';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of ['index.html','manifest.webmanifest','sw.js','src','icons']) await cp(file,`dist/${file}`,{recursive:true});
await writeFile('dist/src/config.js',configSource());
if(!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY) console.warn('SUPABASE_URL eller SUPABASE_PUBLISHABLE_KEY mangler – appen bygges uten synkronisering.');
console.log('Bygget appen i dist/');
