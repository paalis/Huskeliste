const CACHE='huskeliste-v8';
const FILES=['./','./index.html','./src/app.js','./src/style.css','./src/date.js','./src/commands.js','./src/storage.js','./src/config.js','./src/sync.js','./src/cloud.js','./src/voice.js','./manifest.webmanifest','./icons/icon.svg'];
const store=(request,response)=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;};
// Ny versjon tar over med en gang. cache:'reload' hindrer at nettleserens egen hurtigbuffer gir gamle filer ved installering.
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))));});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Appens egne filer hentes fra nettet først, så oppdateringer vises med en gang; hurtigbufferen brukes bare uten nett.
// supabase-js fra CDN har fast versjon og hentes fra hurtigbufferen først. Supabase-kall går alltid rett til nettet.
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET')return;
  if(url.origin===location.origin)event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>store(event.request,response)).catch(()=>caches.match(event.request,{ignoreSearch:true})));
  else if(url.hostname==='cdn.jsdelivr.net')event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>store(event.request,response))));
});
