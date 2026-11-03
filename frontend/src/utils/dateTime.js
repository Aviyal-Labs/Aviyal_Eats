export function formatDateTime(value) {
  if (!value) return '—';
  const formatted = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(new Date(value));
  const values = Object.fromEntries(formatted.map(({ type, value: part }) => [type, part]));
  return `${values.day} ${values.month} ${values.year}, ${values.hour}:${values.minute} ${values.dayPeriod.toUpperCase()} IST`;
}
