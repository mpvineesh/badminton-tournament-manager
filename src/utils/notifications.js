// Thin wrapper around the Web Notifications API for foreground/in-app alerts.
// Background push (when the app is closed) would need FCM + a server trigger;
// that's intentionally out of scope here.

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// Prefer the service worker registration (works when installed/standalone),
// fall back to a page Notification.
export async function showAppNotification(title, options = {}) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const opts = { icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', ...options };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, opts);
        return;
      }
    }
  } catch {
    /* fall through to page notification */
  }
  try {
    // eslint-disable-next-line no-new
    new Notification(title, opts);
  } catch {
    /* noop */
  }
}
