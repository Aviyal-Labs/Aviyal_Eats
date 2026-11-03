export function formatPhone(value = '') {
  const compact = value.replace(/[\s().-]/g, '');
  if (compact.startsWith('+91') && compact.length === 13) return `${compact.slice(0, 3)} ${compact.slice(3, 8)} ${compact.slice(8)}`;
  return value || '—';
}
