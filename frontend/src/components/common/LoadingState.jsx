export default function LoadingState({ label = 'Loading…' }) { return <div className="p-8 text-center text-sm text-muted" role="status" aria-live="polite">{label}</div>; }
