const statuses = ['PENDING', 'APPROVED', 'REJECTED'];

export default function RestaurantFilters({ status, onStatusChange, pendingOnly = false }) {
  return <label className="grid gap-1 text-sm font-medium text-ink">
    <span className="sr-only">Filter by status</span>
    <select value={status} onChange={(event) => onStatusChange(event.target.value)} disabled={pendingOnly} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-emerald-100">
      <option value="">All statuses</option>
      {statuses.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>;
}