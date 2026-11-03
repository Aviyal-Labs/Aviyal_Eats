import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ownerApi } from '../../api/ownerApi';
import { Button, Card, Field, PageHeader } from '../../components/common/Primitives';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { restaurantEditSchema } from '../../schemas/restaurantEditSchema';
import mapApiError from '../../api/errorMapper';
import { useAuth } from '../../hooks/useAuth';

export default function EditRejectedRestaurantPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState(null);
  const { register, reset, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(restaurantEditSchema) });

  const load = () => { setLoading(true); ownerApi.restaurant().then((restaurant) => reset({ restaurant_name: restaurant.name, restaurant_phone: restaurant.phone, city: restaurant.city, slug: restaurant.slug })).catch(() => setLoadError('We could not load the rejected restaurant.')).finally(() => setLoading(false)); };
  useEffect(load, [reset]);

  const submit = (values) => { setPendingValues(values); setConfirmOpen(true); };
  const resubmit = async () => {
    setConfirmOpen(false);
    try {
      const updated = await ownerApi.updateRestaurant(pendingValues);
      const result = await ownerApi.resubmit();
      setSession({ restaurant: result || updated });
      toast.success('Restaurant resubmitted for review.');
      navigate('/owner/pending', { replace: true });
    } catch (error) {
      const mapped = mapApiError(error);
      Object.entries(mapped.fields || {}).forEach(([field, message]) => setError(field, { type: 'server', message: Array.isArray(message) ? message[0] : message }));
      toast.error(mapped.message || 'The restaurant could not be resubmitted.');
    }
  };

  if (loading) return <Card><LoadingState label="Loading restaurant details…" /></Card>;
  if (loadError) return <Card><ErrorState message={loadError} onRetry={load} /></Card>;
  return <><PageHeader eyebrow="Restaurant details" title="Update your submission" description="Only rejected restaurant details can be edited in Week 1." /><Card className="max-w-2xl"><form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2" noValidate><Field label="Restaurant name" id="restaurant_name" error={errors.restaurant_name?.message} {...register('restaurant_name')} /><Field label="Phone" id="restaurant_phone" error={errors.restaurant_phone?.message} {...register('restaurant_phone')} /><Field label="City" id="city" error={errors.city?.message} {...register('city')} /><Field label="Slug" id="slug" error={errors.slug?.message} {...register('slug')} /><Button disabled={isSubmitting} type="submit" className="sm:col-span-2">{isSubmitting ? 'Saving…' : 'Save and resubmit'}</Button></form></Card><ConfirmDialog open={confirmOpen} title="Resubmit restaurant?" description="Your updated details will return the restaurant to pending approval." confirmLabel="Resubmit" busy={isSubmitting} onConfirm={resubmit} onCancel={() => setConfirmOpen(false)} /></>;
}
