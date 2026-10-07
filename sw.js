/* Wartungsprotokoll-App Service Worker
   Bei jedem Update VERSION hochzählen (und APP_VERSION in index.html). */
var VERSION='1.3-GM';
var CACHE='wartung-'+VERSION;
var FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(FILES.map(function(f){
      return fetch(f,{cache:'reload'}).then(function(r){if(r&&r.ok)return c.put(f,r);}).catch(function(){});
    }));
  }));
  self.skipWaiting();
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(k){
    return Promise.all(k.filter(function(n){return n!==CACHE;}).map(function(n){return caches.delete(n);}));
  }).then(function(){return self.clients.claim();}));
});

/* Netz zuerst (immer neueste Version), bei schlechtem Netz nach 3,5 s bzw. offline aus dem Zwischenspeicher */
function netFirst(r){
  return new Promise(function(ok){
    var done=false;
    function fromCache(fallback){
      caches.match(r,{ignoreSearch:true}).then(function(h){
        if(done)return;
        if(h){done=true;ok(h);}
        else if(fallback){done=true;ok(fallback);}
      });
    }
    var t=setTimeout(function(){fromCache(null);},3500);
    fetch(r,{cache:'no-store'}).then(function(res){
      clearTimeout(t);
      if(res&&res.ok){
        var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp);});
        if(!done){done=true;ok(res);}
      }else fromCache(res);
    }).catch(function(){
      clearTimeout(t);
      fromCache(Response.error());
    });
  });
}

self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(netFirst(r));
});
