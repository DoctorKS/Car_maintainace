/**
 * "Pull the latest app version without losing cache + queue".
 *
 * vite-plugin-pwa (autoUpdate, generateSW) registers a Service Worker that
 * fetches the new bundle on next page visit. The Dexie database and the
 * Workbox runtime caches both live outside the page lifecycle and survive
 * a reload — so the user's pending queue, signed-in session, and FBX
 * model don't have to re-download.
 *
 * Steps:
 *   1. Ask the SW for its latest registration and trigger an update check.
 *   2. If a new SW is waiting (downloaded but not active), tell it to skip
 *      waiting and become active immediately.
 *   3. Reload the page so the freshly-active SW serves new HTML/JS/CSS.
 */
export async function reloadAppVersion(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }
  } catch (e) {
    console.warn('[reload] service worker update failed; reloading anyway', e);
  }
  // location.reload() does NOT clear IndexedDB or Workbox caches, so the
  // Dexie queue and the cached FBX/textures survive.
  window.location.reload();
}
