import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OTPInput from '../../components/auth/OTPInput';
import { Button, Card, Field } from '../../components/common/Primitives';
import mapApiError from '../../api/errorMapper';
import { authApi } from '../../api/authApi';
import { otpSchema } from '../../schemas/otpSchema';
import { useAuth } from '../../hooks/useAuth';

const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const messageFor = (mapped) => { if (mapped.status === 410) return 'This verification code or registration has expired. Start again or request a new code.'; if (mapped.status === 429) return 'Please wait for the resend timer to finish before requesting another code.'; if (mapped.status === 400 && /too many|maximum|attempt/i.test(mapped.message)) return 'You have used all five attempts. Request a new verification code.'; if (mapped.status === 400) return 'That code is incorrect. Check the email and try again.'; if (!mapped.status) return 'We could not reach the verification service. Check your connection and try again.'; if (mapped.status >= 500) return 'The verification service is temporarily unavailable. Please try again shortly.'; return mapped.message || 'We could not verify that code.'; };

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const isMockMode = import.meta.env.VITE_USE_MOCKS !== 'false';
  const emailFromState = location.state?.email || '';
  const initialExpiry = location.state?.otpExpiresAt || Date.now() + ((location.state?.otpExpiresInSeconds || 300) * 1000);
  const initialResend = location.state?.resendAfterSeconds ?? 60;
  const [expiresAt, setExpiresAt] = useState(initialExpiry);
  const [resendAvailableAt, setResendAvailableAt] = useState(Date.now() + (initialResend * 1000));
  const [now, setNow] = useState(Date.now());
  const [submitError, setSubmitError] = useState('');
  const [requestId, setRequestId] = useState('');
  const [verified, setVerified] = useState(false);
  const { register, control, handleSubmit, setValue, setError, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(otpSchema), defaultValues: { email: emailFromState, otp: '' }, mode: 'onBlur' });
  const email = watch('email');
  const secondsRemaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendRemaining = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  const expired = secondsRemaining === 0;
  const displayEmail = useMemo(() => email || 'your email address', [email]);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const resetTimers = (data = {}) => { const otpSeconds = data.otp_expires_in_seconds ?? 300; const resendSeconds = data.resend_after_seconds ?? 60; const timestamp = Date.now(); setExpiresAt(timestamp + (otpSeconds * 1000)); setResendAvailableAt(timestamp + (resendSeconds * 1000)); setNow(timestamp); };
  const submit = async (values) => { setSubmitError(''); setRequestId(''); try { const result = await authApi.verifyEmail({ email: values.email, otp: values.otp }); setValue('otp', ''); toast.success('Email verified'); if (result?.restaurant?.status !== 'PENDING') { setSubmitError('Registration was submitted, but the server returned an unexpected status.'); return; } if (isMockMode && result.user && result.restaurant) { setSession({ accessToken: result.accessToken, user: result.user, restaurant: result.restaurant }); navigate('/owner/pending', { replace: true, state: { registrationSubmitted: true } }); return; } setVerified(true); } catch (error) { const mapped = mapApiError(error); setRequestId(mapped.requestId || ''); const message = messageFor(mapped); setError('otp', { type: 'server', message }); setSubmitError(message); } };
  const resend = async () => { if (resendRemaining > 0 || !email) return; setSubmitError(''); setRequestId(''); try { const data = await authApi.resendOtp({ email }); resetTimers(data); toast.success('A new verification code was sent'); } catch (error) { const mapped = mapApiError(error); setRequestId(mapped.requestId || ''); setSubmitError(messageFor(mapped)); } };
  if (verified) return <Card className="p-6 text-center sm:p-8"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-brand">✓</div><p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-brand">Registration submitted</p><h1 className="display mt-2 text-3xl">Your email is verified.</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">Your restaurant is now awaiting Super Admin approval. We’ll keep the status pending until the approval team reviews it.</p><Link to="/login" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark">Continue to sign in</Link></Card>;
  return <Card className="p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Email verification</p><h1 className="display mt-2 text-3xl">Confirm your email</h1><p className="mt-2 text-sm leading-6 text-muted">We sent a six-digit code to <strong className="text-ink">{displayEmail}</strong>. Enter it below to submit your restaurant for approval.</p>{submitError && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>}{requestId && <p className="mt-2 text-xs text-muted">Request ID: <span className="font-mono">{requestId}</span></p>}<form onSubmit={handleSubmit(submit)} noValidate className="mt-7 grid gap-5"><Field label="Email" type="email" autoComplete="email" readOnly={Boolean(emailFromState)} error={errors.email?.message} id="verification-email" {...register('email')} /><div><div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-ink">Six-digit code</span><span className={`text-xs font-semibold ${expired ? 'text-red-600' : 'text-muted'}`}>{expired ? 'Code expired' : `Expires in ${formatTime(secondsRemaining)}`}</span></div><Controller name="otp" control={control} render={({ field }) => <OTPInput value={field.value} onChange={field.onChange} disabled={isSubmitting || expired} error={Boolean(errors.otp)} />} />{errors.otp?.message && <p role="alert" className="mt-2 text-xs text-red-600">{errors.otp.message}</p>}</div><Button type="submit" disabled={isSubmitting || expired} className="min-h-11 w-full">{isSubmitting ? 'Verifying code…' : 'Verify email'}</Button></form><div className="mt-6 flex flex-col items-center gap-3 text-center text-sm sm:flex-row sm:justify-between"><button type="button" className="font-semibold text-brand disabled:cursor-not-allowed disabled:text-slate-400" disabled={resendRemaining > 0 || !email} onClick={resend}>{resendRemaining > 0 ? `Resend code in ${formatTime(resendRemaining)}` : 'Resend code'}</button><Link className="font-semibold text-muted hover:text-brand" to="/register">Use a different email</Link></div><p className="mt-5 text-center text-xs leading-5 text-muted">The code is valid for five minutes. The server enforces expiry and maximum attempts.</p></Card>;
}
