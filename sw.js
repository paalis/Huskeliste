const CACHE='huskeliste-v7';
const FILES=['./','./index.html','./src/app.js','./src/style.css','./src/date.js','./src/commands.js','./src/storage.js','./src/config.js','./src/sync.js','./src/cloud.js','./src/voice.js','./manifest.webmanifest','./icons/icon.svg'];
// Ny versjon tar over med en gang, slik at oppdateringer når appen på Hjem-skjermen uten at den må lukkes helt.
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Supabase-kall må alltid gå til nettet; bare appens egne filer og supabase-js fra CDN mellomlagres.
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);
// config.js lages ved bygging fra secrets, så den hentes fra nettet først og faller tilbake på hurtigbufferen uten nett.
if(event.request.method==='GET'&&url.origin===location.origin&&url.pathname.endsWith('/src/config.js'))return event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request)));
if(event.request.method==='GET'&&(url.origin===location.origin||url.hostname==='cdn.jsdelivr.net'))event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;})));});
