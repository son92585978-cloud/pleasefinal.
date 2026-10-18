const CACHE = 'travel-work-331-v12-expression-dialogue';
const ASSETS = [
  './index.html',
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
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy));
      return res;
    }).catch(()=>caches.match(req))
  );
});
