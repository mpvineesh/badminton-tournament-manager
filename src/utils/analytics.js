const MEASUREMENT_ID = String(import.meta.env.VITE_MEASUREMENT_ID || '').trim();

let initialized = false;
let scriptRequested = false;
let lastTrackedScreen = '';

function isEnabled() {
  return Boolean(MEASUREMENT_ID);
}

function ensureDataLayer() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

function loadScriptOnce() {
  if (typeof document === 'undefined') return;
  if (scriptRequested) return;
  scriptRequested = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export function initAnalytics() {
  if (!isEnabled()) return false;
  if (initialized) return true;
  ensureDataLayer();
  loadScriptOnce();
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
  });
  initialized = true;
  return true;
}

export function setAnalyticsUser(userId, props = {}) {
  if (!initAnalytics()) return;
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return;
  window.gtag('set', 'user_properties', props || {});
  window.gtag('config', MEASUREMENT_ID, { user_id: normalizedUserId });
}

export function clearAnalyticsUser() {
  if (!initAnalytics()) return;
  window.gtag('set', 'user_properties', {});
  window.gtag('config', MEASUREMENT_ID, { user_id: null });
}

export function trackScreenView(screenName) {
  if (!initAnalytics()) return;
  const normalized = String(screenName || '').trim();
  if (!normalized) return;
  if (lastTrackedScreen === normalized) return;
  lastTrackedScreen = normalized;
  window.gtag('event', 'screen_view', {
    app_name: 'badminton-fixture-maker',
    screen_name: normalized,
  });
}

export function trackAnalyticsEvent(name, params = {}) {
  if (!initAnalytics()) return;
  const eventName = String(name || '').trim();
  if (!eventName) return;
  window.gtag('event', eventName, params || {});
}

