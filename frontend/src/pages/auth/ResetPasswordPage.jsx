import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Card, Field } from '../../components/common/Primitives';
import PasswordField from '../../components/auth/PasswordField';
import OTPInput from '../../components/auth/OTPInput';
import { useAuth } from '../../hooks/useAuth';
import mapApiError from '../../api/errorMapper';
import { passwordResetSchema } from '../../schemas/passwordResetSchema';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: location.state?.email || '', otp: '', new_password: '', confirm_password: '' }, mode: 'onBlur',
  });

  async function savePassword(values) {
    try {
      await resetPassword(values);
      toast.success('Password reset. Please sign in.');
      navigate('/login', { replace: true });
    } catch (failure) {
      const error = mapApiError(failure);
      setError('root.server', { message: error.status === 410 ? 'This reset code has expired. Request a new code.' : error.message });
      Object.entries(error.fields).forEach(([field, messages]) => {
        if (['email', 'otp', 'new_password'].includes(field)) setError(field, { message: Array.isArray(messages) ? messages[0] : messages });
      });
    }
  }

  return <Card>
    <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Account recovery</p>
    <h1 className="display mt-2 text-3xl">Choose a new password</h1>
    <form onSubmit={handleSubmit(savePassword)} className="mt-7 grid gap-4" noValidate>
      <Field label="Email" id="reset-confirm-email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <div>
        <p className="mb-2 text-sm font-medium">Six-digit reset code</p>
        <Controller name="otp" control={control} render={({ field }) => <OTPInput value={field.value} onChange={field.onChange} disabled={isSubmitting} error={Boolean(errors.otp)} />} />
        {errors.otp && <p role="alert" className="mt-2 text-xs text-red-700">{errors.otp.message}</p>}
      </div>
      <PasswordField label="New password" id="reset-password" autoComplete="new-password" error={errors.new_password?.message} {...register('new_password')} />
      <PasswordField label="Confirm password" id="reset-confirm-password" autoComplete="new-password" error={errors.confirm_password?.message} {...register('confirm_password')} />
      {errors.root?.server && <p role="alert" className="text-sm text-red-700">{errors.root.server.message}</p>}
      <Button disabled={isSubmitting} type="submit">{isSubmitting ? 'Saving...' : 'Save new password'}</Button>
    </form>
    <Link className="mt-5 block text-sm font-semibold text-brand" to="/forgot-password">Request a new reset code</Link>
    <Link className="mt-3 block text-sm text-muted" to="/login">Back to sign in</Link>
  </Card>;
}