import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field } from '../common/Primitives';
import { googleSignupSchema } from '../../schemas/googleSignupSchema';
import { slugify } from '../../utils/slug';
import mapApiError from '../../api/errorMapper';

export default function GoogleOnboardingForm({ onSubmit, onCancel, onExpired }) {
  const slugEdited = useRef(false);
  const { register, watch, setValue, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(googleSignupSchema),
    defaultValues: { mobile: '', restaurant_name: '', restaurant_phone: '', city: '', requested_slug: '' },
  });
  const restaurantName = watch('restaurant_name');
  useEffect(() => {
    if (!slugEdited.current) setValue('requested_slug', slugify(restaurantName));
  }, [restaurantName, setValue]);

  async function completeSignup(values) {
    try {
      await onSubmit(values);
    } catch (failure) {
      const error = mapApiError(failure);
      if (error.status === 401) {
        onExpired();
        return;
      }
      const fields = ['mobile', 'restaurant_name', 'restaurant_phone', 'city', 'requested_slug'];
      Object.entries(error.fields || {}).forEach(([field, messages]) => {
        if (fields.includes(field)) setError(field, { type: 'server', message: Array.isArray(messages) ? messages[0] : messages });
      });
      setError('root.server', { message: error.message });
    }
  }

  const slugField = register('requested_slug');
  return <form onSubmit={handleSubmit(completeSignup)} className="mt-5 grid gap-4" noValidate>
    <h2 className="display text-2xl">Introduce your restaurant</h2>
    <p className="text-sm leading-6 text-muted">Your Google identity is verified. Add your contact and restaurant details to submit for approval.</p>
    <Field label="Your mobile number" id="google-mobile" type="tel" autoComplete="tel" placeholder="+91..." error={errors.mobile?.message} {...register('mobile')} />
    <Field label="Restaurant name" id="google-restaurant-name" error={errors.restaurant_name?.message} {...register('restaurant_name')} />
    <Field label="Restaurant phone" id="google-restaurant-phone" type="tel" placeholder="+91..." error={errors.restaurant_phone?.message} {...register('restaurant_phone')} />
    <Field label="City" id="google-city" autoComplete="address-level2" error={errors.city?.message} {...register('city')} />
    <Field label="Restaurant slug" id="google-slug" error={errors.requested_slug?.message} {...slugField} onChange={(event) => { slugEdited.current = true; slugField.onChange(event); }} />
    {errors.root?.server && <p role="alert" className="text-sm text-red-700">{errors.root.server.message}</p>}
    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit restaurant for approval'}</Button>
    <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onCancel}>Cancel Google signup</Button>
  </form>;
}
