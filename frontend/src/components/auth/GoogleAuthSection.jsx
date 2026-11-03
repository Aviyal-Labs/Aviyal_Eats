import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isUnregisteredGoogleAccount } from '../../api/authApi';
import mapApiError from '../../api/errorMapper';
import { sessionDestination } from '../../utils/sessionDestination';
import GoogleSignInButton from './GoogleSignInButton';
import GoogleOnboardingForm from './GoogleOnboardingForm';

export default function GoogleAuthSection({ disabled = false }) {
  const { googleLogin, googleSignup } = useAuth();
  const navigate = useNavigate();
  const credential = useRef(null);
  const working = useRef(false);
  const active = useRef(true);
  const [busy, setBusy] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; credential.current = null; };
  }, []);
  useEffect(() => {
    if (!onboarding) return undefined;
    // Keep credentials short-lived even if the onboarding form is left open.
    const timer = setTimeout(() => expireCredential(), 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [onboarding]);

  function clearCredential() {
    credential.current = null;
    setOnboarding(false);
  }
  function expireCredential() {
    clearCredential();
    setError('Please continue with Google again to refresh your identity verification.');
  }
  async function handleCredential(value) {
    if (working.current || disabled) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const session = await googleLogin(value);
      credential.current = null;
      if (active.current) navigate(sessionDestination(session), { replace: true });
    } catch (failure) {
      if (!active.current) return;
      if (isUnregisteredGoogleAccount(failure)) {
        credential.current = value;
        setOnboarding(true);
      } else {
        setError(mapApiError(failure).message);
      }
    } finally {
      working.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function completeSignup(values) {
    if (!credential.current) { expireCredential(); return; }
    const session = await googleSignup(credential.current, values);
    clearCredential();
    if (active.current) navigate(sessionDestination(session), { replace: true });
  }

  return <section aria-label="Continue with Google" className="mt-6 border-t border-slate-200 pt-6">
    {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
    {onboarding
      ? <GoogleOnboardingForm onSubmit={completeSignup} onCancel={clearCredential} onExpired={expireCredential} />
      : <GoogleSignInButton disabled={busy || disabled} onCredential={handleCredential} />}
    <p className="mt-3 text-center text-xs leading-5 text-muted">Google accounts are not automatically linked to an existing email/password account.</p>
  </section>;
}
