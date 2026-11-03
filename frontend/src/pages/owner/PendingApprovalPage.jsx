import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Badge, Button, Card, PageHeader } from '../../components/common/Primitives';

export default function PendingApprovalPage() {
  const { restaurant, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function checkStatus() {
    setBusy(true);
    setError('');
    try {
      await refreshProfile();
    } catch {
      setError('Unable to check your status. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <PageHeader eyebrow="Owner workspace" title="Your restaurant is under review." description="Check here for the latest approval status." />
    <Card className="max-w-2xl">
      <Badge tone="orange">PENDING APPROVAL</Badge>
      <h2 className="display mt-3 text-2xl">{restaurant?.name || 'Not available'}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Your submission is read-only while the approval team reviews it.</p>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button disabled={busy} onClick={checkStatus}>{busy ? 'Checking...' : 'Check approval status'}</Button>
        <Link className="text-sm font-semibold text-brand" to="/owner/profile">Review profile</Link>
      </div>
    </Card>
  </>;
}