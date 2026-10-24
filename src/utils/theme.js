// Theme preference stored in localStorage and applied as a `dark` class on
// <html> (Tailwind darkMode: 'class'). The club theme defaults to dark.
const KEY = 'tm_theme';

export function getTheme() {
  try {
    const savedTheme = localStorage.getItem(KEY);
    return savedTheme === 'light' ? 'light' : 'dark';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getTheme());
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
