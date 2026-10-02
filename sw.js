const CACHE='huskeliste-v4';
const FILES=['./','./index.html','./src/app.js','./src/style.css','./src/date.js','./src/commands.js','./src/storage.js','./src/config.js','./src/sync.js','./src/cloud.js','./manifest.webmanifest','./icons/icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
// Supabase-kall må alltid gå til nettet; bare appens egne filer og supabase-js fra CDN mellomlagres.
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method==='GET'&&(url.origin===location.origin||url.hostname==='cdn.jsdelivr.net'))event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;})));});
