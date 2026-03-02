export function isoDateToday() {
  const now = new Date();
  const off = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return off.toISOString().slice(0, 10);
}
export function toIsoLocal(d) {
  const off = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return off.toISOString().slice(0, 16);
}
