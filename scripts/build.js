import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of ['index.html','manifest.webmanifest','sw.js','src','icons']) await cp(file,`dist/${file}`,{recursive:true});
console.log('Bygget appen i dist/');
