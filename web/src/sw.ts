/// <reference lib="webworker" />
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// Registered before the Firebase messaging import runs so it takes precedence over the
// SDK's own click handler (we stop propagation so the link isn't opened twice).
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation();
  event.notification.close();
  const d = event.notification.data as
    | {
        FCM_MSG?: { data?: { link?: string }; fcmOptions?: { link?: string } };
        link?: string;
      }
    | undefined;
  const raw = d?.FCM_MSG?.data?.link ?? d?.FCM_MSG?.fcmOptions?.link ?? d?.link ?? '/';
  let target = '/';
  try {
    const url = new URL(raw, self.location.origin);
    if (url.origin === self.location.origin) target = url.href;
  } catch {
    /* keep '/' */
  }
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = all.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        try {
          await client.focus();
          await client.navigate(target);
          return;
        } catch {
          /* fall through to a new window */
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

void self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
// Exclude /__/ (firebase auth handler/init) so redirect sign-in reaches the network.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/__\//] }),
);

// Initializing messaging lets the FCM SDK display payloads that carry a `notification`.
// Must run synchronously at SW start so its push listener is registered in time.
const env = import.meta.env;
if (
  env.VITE_FB_API_KEY &&
  env.VITE_FB_PROJECT_ID &&
  env.VITE_FB_APP_ID &&
  env.VITE_FB_MESSAGING_SENDER_ID &&
  env.VITE_USE_EMULATORS !== '1'
) {
  try {
    const app = initializeApp({
      apiKey: env.VITE_FB_API_KEY,
      authDomain: env.VITE_FB_AUTH_DOMAIN,
      projectId: env.VITE_FB_PROJECT_ID,
      storageBucket: env.VITE_FB_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FB_MESSAGING_SENDER_ID,
      appId: env.VITE_FB_APP_ID,
    });
    getMessaging(app);
  } catch (err) {
    console.error('messaging init failed', err);
  }
}
