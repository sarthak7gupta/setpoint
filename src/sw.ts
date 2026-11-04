/// <reference lib="webworker" />
/**
 * Production service worker (injectManifest).
 * Precaches the shell and serves index.html for all navigations so iOS
 * home-screen / offline launches work for the SPA router.
 */
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    // Don't treat built assets / the SW itself as document navigations.
    denylist: [/^\/assets\//, /\/sw\.js$/, /\/workbox-.*\.js$/],
  }),
)

// An update waits for every tab using the old worker to close. In particular,
// never activate (or reload a client) while someone is recording a match.
// Claim uncontrolled clients only on normal activation, including first install.
clientsClaim()
