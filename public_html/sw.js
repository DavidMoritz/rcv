importScripts('/cache-polyfill.js');

self.addEventListener('install', function(e) {
 e.waitUntil(
   caches.open('airhorner').then(function(cache) {
     return cache.addAll([
       'index.html',
       'wrap.css',
       'wrap.js',
       'favicon.ico',
       's1.png',
       's2.png',
       's3.png',
       'lib/',
       'lib/bootstrap.min.js',
       'lib/bootstrap.min.css',
       'lib/jquery.slim.min.js',
       'lib/tether.min.js'
     ]);
   })
 );
});

self.addEventListener('fetch', function(event) {

  console.log(event.request.url);

  event.respondWith(

  caches.match(event.request).then(function(response) {

    return response || fetch(event.request);

  })

  );

});