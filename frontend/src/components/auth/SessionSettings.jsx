import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, PageHeader } from '../common/Primitives';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import mapApiError from '../../api/errorMapper';

export default function SessionSettings() {
  const { logoutAll } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signOutEverywhere() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await logoutAll();
      navigate('/login', { replace: true });
      toast.success('Signed out of all devices.');
    } catch (failure) {
      setError(mapApiError(failure).message);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return <>
    <PageHeader eyebrow="Account" title="Settings" description="Manage your account sessions." />
    <Card className="max-w-2xl">
      <h2 className="font-semibold">Sign out of all devices</h2>
      <p className="mt-2 text-sm text-muted">End every active session for your account. You will need to sign in again.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <Button variant="danger" className="mt-5" onClick={() => setOpen(true)}>Sign out of all devices</Button>
    </Card>
    <ConfirmDialog open={open} title="Sign out of all devices?" description="Every active session for your account will be revoked." confirmLabel="Sign out everywhere" variant="danger" busy={busy} onConfirm={signOutEverywhere} onCancel={() => { if (!busy) setOpen(false); }} />
  </>;
}
