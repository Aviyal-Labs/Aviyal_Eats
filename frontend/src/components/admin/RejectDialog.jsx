import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ConfirmDialog from '../common/ConfirmDialog';
import { rejectionSchema } from '../../schemas/rejectionSchema';
export default function RejectDialog({ open, busy, onConfirm, onCancel }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(rejectionSchema), defaultValues: { reason: '' } });
  useEffect(() => { if (!open) reset(); }, [open, reset]);
  return <ConfirmDialog open={open} busy={busy} title="Reject restaurant?" description="Provide a clear reason so the owner knows what to update." confirmLabel="Reject restaurant" variant="danger" onConfirm={handleSubmit(onConfirm)} onCancel={onCancel}>
    <label htmlFor="rejection-reason" className="mt-4 grid gap-2 text-sm font-medium">
      Reason
      <textarea id="rejection-reason" rows={4} maxLength={2000} disabled={busy} aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? 'rejection-reason-error' : undefined} className="rounded-xl border border-slate-200 p-3 focus:border-brand" {...register('reason')} />
      {errors.reason && <span role="alert" id="rejection-reason-error" className="text-xs text-red-700">{errors.reason.message}</span>}
    </label>
  </ConfirmDialog>;
}
