import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Card, Field } from '../../components/common/Primitives';
import { authApi } from '../../api/authApi';
import mapApiError from '../../api/errorMapper';
import { passwordResetRequestSchema } from '../../schemas/passwordResetSchema';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(passwordResetRequestSchema), defaultValues: { email: '' }, mode: 'onBlur',
  });

  async function requestReset(values) {
    try {
      const result = await authApi.requestPasswordReset(values);
      toast.success(result.message || 'If eligible, a reset code has been sent.');
      navigate('/reset-password', { state: { email: values.email } });
    } catch (failure) {
      const error = mapApiError(failure);
      setError('root.server', { message: error.message });
      if (error.fields.email) setError('email', { message: error.fields.email[0] });
    }
  }

  return <Card>
    <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Account recovery</p>
    <h1 className="display mt-2 text-3xl">Reset your password</h1>
    <p className="mt-2 text-sm text-muted">We will send a six-digit reset code if the account is eligible.</p>
    <form onSubmit={handleSubmit(requestReset)} className="mt-7 grid gap-4" noValidate>
      <Field label="Email" id="reset-email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      {errors.root?.server && <p role="alert" className="text-sm text-red-700">{errors.root.server.message}</p>}
      <Button disabled={isSubmitting} type="submit">{isSubmitting ? 'Sending...' : 'Send reset code'}</Button>
    </form>
    <Link className="mt-5 block text-center text-sm font-semibold text-brand" to="/login">Back to sign in</Link>
  </Card>;
}