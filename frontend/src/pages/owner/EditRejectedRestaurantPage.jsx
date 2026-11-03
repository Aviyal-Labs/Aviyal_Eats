import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ownerApi } from '../../api/ownerApi';
import { Button, Card, Field, PageHeader } from '../../components/common/Primitives';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { restaurantEditSchema } from '../../schemas/restaurantEditSchema';
import mapApiError from '../../api/errorMapper';
import { useAuth } from '../../hooks/useAuth';

export default function EditRejectedRestaurantPage() {
  const navigate = useNavigate();
  const { restaurant, setSession, refreshProfile } = useAuth();
  const [pendingValues, setPendingValues] = useState(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submitting = useRef(false);
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(restaurantEditSchema),
    defaultValues: { name: restaurant?.name || '', phone: restaurant?.phone || '', city: restaurant?.city || '' },
  });

  async function saveAndResubmit() {
    if (submitting.current || !pendingValues) return;
    submitting.current = true;
    setBusy(true);
    setSubmitError('');
    try {
      const updated = await ownerApi.updateRestaurant(pendingValues);
      setSession({ restaurant: updated });
      const resubmitted = await ownerApi.resubmit();
      setSession({ restaurant: resubmitted });
      toast.success('Restaurant resubmitted for review.');
      navigate('/owner/pending', { replace: true });
    } catch (error) {
      const mapped = mapApiError(error);
      setSubmitError(mapped.message);
      Object.entries(mapped.fields || {}).forEach(([field, messages]) => {
        if (['name', 'phone', 'city'].includes(field)) {
          setError(field, { type: 'server', message: Array.isArray(messages) ? messages[0] : messages });
        }
      });
      if (mapped.status === 409) await refreshProfile().catch(() => {});
    } finally {
      submitting.current = false;
      setBusy(false);
      setPendingValues(null);
    }
  }

  return <>
    <PageHeader eyebrow="Restaurant details" title="Update your submission" description="Review the restaurant details and submit them for another review." />
    <Card className="max-w-2xl">
      <p className="mb-5 text-sm text-muted">Your restaurant URL stays the same. If phone or city is blank, enter the current details before submitting.</p>
      {submitError && <p role="alert" className="mb-4 text-sm text-red-700">{submitError}</p>}
      <form onSubmit={handleSubmit(setPendingValues)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Restaurant name" id="name" error={errors.name?.message} {...register('name')} />
        <Field label="Phone" id="phone" type="tel" error={errors.phone?.message} {...register('phone')} />
        <Field label="City" id="city" error={errors.city?.message} {...register('city')} />
        <Button disabled={busy} type="submit" className="sm:col-span-2">{busy ? 'Saving...' : 'Save and resubmit'}</Button>
      </form>
    </Card>
    <ConfirmDialog open={Boolean(pendingValues)} title="Resubmit restaurant?" description="Your updated details will return the restaurant to pending approval." confirmLabel="Resubmit" busy={busy} onConfirm={saveAndResubmit} onCancel={() => { if (!busy) setPendingValues(null); }} />
  </>;
}