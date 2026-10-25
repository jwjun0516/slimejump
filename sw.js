// 서비스 워커: 브라우저가 이 사이트를 "설치할 수 있는 앱"으로 인식하게 해줌 (삼성 인터넷 / 크롬)
// 파일을 저장해두지 않고 항상 인터넷에서 새로 받음 → 게임을 고쳐 올리면 바로 반영
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => e.respondWith(fetch(e.request)));
