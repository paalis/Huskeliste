import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { configSource } from './config.js';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
createServer(async(req,res)=>{try{const url=decodeURIComponent(req.url.split('?')[0]);if(url==='/src/config.js'){res.setHeader('Content-Type','text/javascript');return res.end(configSource());}let path=join(process.cwd(),url);if((await stat(path)).isDirectory())path=join(path,'index.html');res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end('Ikke funnet');}}).listen(4173,'0.0.0.0',()=>console.log('Huskeliste: http://localhost:4173'));
