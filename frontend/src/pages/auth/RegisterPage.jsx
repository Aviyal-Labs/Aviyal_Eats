import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Card, Field } from '../../components/common/Primitives';
import { authApi } from '../../api/authApi';
import mapApiError from '../../api/errorMapper';
import { registrationSchema } from '../../schemas/registrationSchema';
import { slugify } from '../../utils/slug';

const defaultValues = { owner_full_name: '', email: '', mobile: '', password: '', confirm_password: '', restaurant_name: '', restaurant_phone: '', city: '', slug: '' };
const errorMessage = (value) => Array.isArray(value) ? value[0] : value;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');
  const [requestId, setRequestId] = useState('');
  const slugManuallyEdited = useRef(false);
  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(registrationSchema), defaultValues, mode: 'onBlur' });
  const restaurantName = watch('restaurant_name');

  useEffect(() => {
    if (!slugManuallyEdited.current) setValue('slug', slugify(restaurantName), { shouldValidate: Boolean(restaurantName) });
  }, [restaurantName, setValue]);

  const submit = async (values) => {
    setSubmitError('');
    setRequestId('');
    const { confirm_password: _confirmPassword, ...payload } = values;
    try {
      const registration = await authApi.register(payload);
      toast.success('Verification code sent');
      const otpExpiresInSeconds = registration?.otp_expires_in_seconds ?? 300;
      const resendAfterSeconds = registration?.resend_after_seconds ?? 60;
      navigate('/verify-email', { state: { email: values.email, otpExpiresInSeconds, resendAfterSeconds, otpExpiresAt: Date.now() + (otpExpiresInSeconds * 1000), message: 'Check your email for the six-digit verification code.' } });
    } catch (error) {
      const mapped = mapApiError(error);
      setRequestId(mapped.requestId || '');
      Object.entries(mapped.fields || {}).forEach(([field, messages]) => { if (field !== 'non_field_errors' && field in defaultValues) setError(field, { type: 'server', message: errorMessage(messages) }); });
      if (mapped.status === 409) setSubmitError('Those registration details are already in use. Check your email, mobile number, or slug.');
      else if (mapped.status === 429) setSubmitError('Too many registration attempts. Please wait and try again.');
      else if (mapped.status === 503) setSubmitError('We could not send the verification email. Please try again shortly.');
      else if (!mapped.status) setSubmitError('We could not reach the registration service. Check your connection and try again.');
      else if (mapped.status >= 500) setSubmitError('The registration service is temporarily unavailable. Please try again shortly.');
      else setSubmitError(mapped.message || 'Please review the highlighted fields and try again.');
    }
  };

  const field = (name) => ({ id: name, error: errors[name]?.message, ...register(name) });
  const slugRegistration = register('slug');
  return <Card className="p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Get started</p><h1 className="display mt-2 text-3xl">Open your restaurant workspace</h1><p className="mt-2 text-sm leading-6 text-muted">Register your owner account and submit your restaurant for approval. Approval comes after email verification and review.</p>{submitError && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>}{requestId && <p className="mt-2 text-xs text-muted">Request ID: <span className="font-mono">{requestId}</span></p>}<form onSubmit={handleSubmit(submit)} noValidate className="mt-6 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Owner details</p></div><div className="sm:col-span-2"><Field label="Full name" placeholder="Anu Nair" autoComplete="name" {...field('owner_full_name')} /></div><Field label="Email" type="email" placeholder="anu@example.com" autoComplete="email" {...field('email')} /><Field label="Mobile number" type="tel" placeholder="+919876543210" autoComplete="tel" {...field('mobile')} /><Field label="Password" type="password" placeholder="Strong password" autoComplete="new-password" {...field('password')} /><Field label="Confirm password" type="password" placeholder="Repeat password" autoComplete="new-password" {...field('confirm_password')} /><div className="sm:col-span-2"><p className="mb-1 mt-2 text-xs font-bold uppercase tracking-wider text-muted">Restaurant details</p></div><Field label="Restaurant name" placeholder="Coconut Kitchen" {...field('restaurant_name')} /><Field label="Restaurant phone" type="tel" placeholder="+914842000000" {...field('restaurant_phone')} /><Field label="City" placeholder="Kochi" autoComplete="address-level2" {...field('city')} /><Field label="Restaurant slug" placeholder="coconut-kitchen" {...slugRegistration} id="slug" error={errors.slug?.message} onChange={(event) => { slugManuallyEdited.current = true; slugRegistration.onChange(event); }} /><p className="-mt-2 text-xs text-muted sm:col-span-2">This becomes your public URL. We’ll suggest one from the restaurant name until you edit it.</p><Button disabled={isSubmitting} type="submit" className="mt-2 min-h-11 sm:col-span-2">{isSubmitting ? 'Submitting registration…' : 'Continue to email verification'}</Button></form><p className="mt-5 text-center text-sm text-muted">Already have an account? <Link className="font-semibold text-brand" to="/login">Sign in</Link></p></Card>;
}
