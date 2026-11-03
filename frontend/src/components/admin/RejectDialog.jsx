import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ConfirmDialog from '../common/ConfirmDialog';
import { Field } from '../common/Primitives';
import { rejectionSchema } from '../../schemas/rejectionSchema';
export default function RejectDialog({ open, busy, onConfirm, onCancel }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(rejectionSchema), defaultValues: { reason: '' } });
  useEffect(() => { if (!open) reset(); }, [open, reset]);
  return <ConfirmDialog open={open} busy={busy} title="Reject restaurant?" description="Provide a clear reason so the owner knows what to update." confirmLabel="Reject restaurant" variant="danger" onConfirm={handleSubmit(onConfirm)} onCancel={onCancel}><div className="mt-4"><Field label="Reason" id="rejection-reason" error={errors.reason?.message} {...register('reason')} /></div></ConfirmDialog>;
}
