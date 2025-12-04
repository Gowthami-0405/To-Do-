self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("dcache").then(c =>
      c.addAll(["./", "./index.html", "./styles.css", "./app.js", "./qrcode.min.js"])
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});