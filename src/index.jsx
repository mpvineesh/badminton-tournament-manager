import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './style.css';
import { ensureAnonymousAuth } from './firebaseClient.js';
import { initTheme } from './utils/theme.js';

// Apply saved light/dark theme before first paint to avoid a flash.
initTheme();

// Establish a Firebase session early so Firestore reads/writes are authorized
// (rules require request.auth). Fire-and-forget; the app's own login is separate.
ensureAnonymousAuth();

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
