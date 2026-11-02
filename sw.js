const CACHE = 'travel-english-v43-upload-split-20261102-r6';
const ASSETS = [
  './index.html',
  './inline-word-data.js','./inline-word-data-2.js','./inline-word-data-3.js','./inline-word-data-4.js','./inline-word-data-5.js','./inline-word-data-6.js','./inline-word-data-7.js','./word-order-data.js',
  './404.html',
  './audio-engine.js',
  './audio/index.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key.startsWith('travel-work-331-') && key !== CACHE).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  if(new URL(req.url).pathname.includes('/audio/')||new URL(req.url).pathname.includes('/neural/')){
    event.respondWith(caches.open(CACHE).then(async cache=>{
      const cached=await cache.match(req);if(cached)return cached;
      const res=await fetch(req);if(res.ok)await cache.put(req,res.clone());return res;
    }));
    return;
  }
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
        return res;
      }).catch(()=>caches.open(CACHE).then(cache=>cache.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy));
      return res;
    }).catch(()=>caches.open(CACHE).then(cache=>cache.match(req)))
  );
});
