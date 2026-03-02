export function nid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
