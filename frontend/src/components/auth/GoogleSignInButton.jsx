import { useEffect, useRef, useState } from 'react';
import { Button } from '../common/Primitives';

let libraryPromise = null;
let initialized = false;
let credentialHandler = null;

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!libraryPromise) {
    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      const timeout = window.setTimeout(() => fail(), 15000);
      function fail() {
        window.clearTimeout(timeout);
        script.remove();
        reject(new Error('Google sign-in could not be loaded.'));
      }
      script.onload = () => {
        window.clearTimeout(timeout);
        if (window.google?.accounts?.id) resolve(window.google.accounts.id);
        else fail();
      };
      script.onerror = fail;
      document.head.append(script);
    }).catch((error) => {
      libraryPromise = null;
      throw error;
    });
  }
  return libraryPromise;
}

export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const container = useRef(null);
  const callback = useRef(onCredential);
  const disabledRef = useRef(disabled);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  callback.current = onCredential;
  disabledRef.current = disabled;

  useEffect(() => {
    if (!clientId) return undefined;
    let active = true;
    const handler = (response) => {
      if (active && !disabledRef.current && response.credential) callback.current(response.credential);
    };
    setLoading(true);
    setError('');
    loadGoogleIdentity().then((identity) => {
      if (!active) return;
      credentialHandler = handler;
      if (!initialized) {
        identity.initialize({
          client_id: clientId,
          auto_select: false,
          callback: (response) => credentialHandler?.(response),
        });
        initialized = true;
      }
      container.current.replaceChildren();
      identity.renderButton(container.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular' });
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError('Google sign-in could not be loaded. You can use email instead.');
        setLoading(false);
      }
    });
    return () => {
      active = false;
      if (credentialHandler === handler) credentialHandler = null;
    };
  }, [clientId, attempt]);

  if (!clientId) return <p className="text-sm text-muted">Google sign-in is unavailable. Please use email to continue.</p>;
  return <div>
    {loading && <p role="status" className="text-sm text-muted">Loading Google sign-in...</p>}
    {error && <div><p role="alert" className="text-sm text-red-700">{error}</p><Button type="button" variant="secondary" className="mt-3" onClick={() => setAttempt((value) => value + 1)}>Retry Google sign-in</Button></div>}
    <div ref={container} hidden={disabled} className="flex min-h-11 justify-center" />
    {disabled && <p role="status" className="text-sm text-muted">Checking your Google account...</p>}
  </div>;
}
