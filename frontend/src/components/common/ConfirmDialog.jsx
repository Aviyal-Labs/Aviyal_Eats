import { Button, Card } from './Primitives';
export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', variant = 'primary', busy = false, onConfirm, onCancel, children }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel?.(event); }}><Card role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="w-full max-w-md" onMouseDown={(event) => event.stopPropagation()}><h2 id="dialog-title" className="display text-2xl">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{description}</p>{children}<div className="mt-6 flex justify-end gap-3"><Button variant="secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</Button><Button variant={variant} type="button" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button></div></Card></div>;
}
