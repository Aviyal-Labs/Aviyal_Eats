import { useEffect, useId, useRef } from 'react';
import { Button, Card } from './Primitives';

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', variant = 'primary', busy = false, onConfirm, onCancel, children }) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open || !dialog.current) return undefined;
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;
  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    className="m-auto max-h-[90vh] w-[calc(100%-2.5rem)] max-w-md rounded-2xl border-0 bg-white p-0 text-ink shadow-xl backdrop:bg-slate-900/40"
    onCancel={(event) => { event.preventDefault(); if (!busy) onCancel?.(); }}
    onClick={(event) => {
      if (busy || event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCancel?.();
    }}>
    <Card className="w-full">
      <h2 id={titleId} className="display text-2xl">{title}</h2>
      <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">{description}</p>
      {children}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant={variant} type="button" onClick={onConfirm} disabled={busy}>{busy ? 'Working...' : confirmLabel}</Button>
      </div>
    </Card>
  </dialog>;
}