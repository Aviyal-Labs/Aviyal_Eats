import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button, Card, Field } from '../../components/common/Primitives';
import PasswordField from '../../components/auth/PasswordField';
import { useAuth } from '../../hooks/useAuth';
import mapApiError from '../../api/errorMapper';
import { loginSchema } from '../../schemas/loginSchema';
import RequestIdText from '../../components/common/RequestIdText';
import GoogleAuthSection from '../../components/auth/GoogleAuthSection';
import { sessionDestination } from '../../utils/sessionDestination';

export default function LoginPage() {
  const [requestId, setRequestId] = useState('');
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (data) => {
    setRequestId('');
    try {
      const session = await login(data);
      toast.success('Welcome back');
      navigate(sessionDestination(session), { replace: true });
    } catch (error) {
      const mapped = mapApiError(error);
      setRequestId(mapped.requestId || '');
      setError('root.server', { type: 'server', message: mapped.status === 423 ? 'Too many failed attempts. Please try again later.' : mapped.message || 'Unable to sign in.' });
      if (mapped.fields?.email) setError('email', { type: 'server', message: Array.isArray(mapped.fields.email) ? mapped.fields.email[0] : mapped.fields.email });
      if (mapped.fields?.password) setError('password', { type: 'server', message: Array.isArray(mapped.fields.password) ? mapped.fields.password[0] : mapped.fields.password });
    }
  };

  return <Card>
    <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Welcome back</p>
    <h1 className="display mt-2 text-3xl">Sign in to your workspace</h1>
    <p className="mt-2 text-sm text-muted">Use your Aviyal Eats account to continue.</p>
    <form onSubmit={handleSubmit(submit)} className="mt-7 grid gap-4" noValidate>
      <Field label="Email" id="login-email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <PasswordField label="Password" id="login-password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
      {errors.root?.server && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.server.message}</p>}
      {requestId && <RequestIdText requestId={requestId} />}
      <Button disabled={isSubmitting} type="submit" className="mt-2 w-full">{isSubmitting ? 'Signing in...' : 'Sign in'}</Button>
    </form>
    <GoogleAuthSection disabled={isSubmitting} />
    <div className="mt-5 flex justify-between text-sm text-muted">
      <Link className="hover:text-brand" to="/forgot-password">Forgot password?</Link>
      <Link className="font-semibold text-brand" to="/register">Create account</Link>
    </div>
  </Card>;
}