import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi } from '../../api/adminApi';
import { Button, Card, PageHeader } from '../../components/common/Primitives';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import RequestIdText from '../../components/common/RequestIdText';
import ApproveDialog from '../../components/admin/ApproveDialog';
import RejectDialog from '../../components/admin/RejectDialog';
import ApprovalTimeline from '../../components/admin/ApprovalTimeline';
import RestaurantStatusBadge from '../../components/admin/RestaurantStatusBadge';
import { formatDateTime } from '../../utils/dateTime';
import { formatPhone } from '../../utils/phone';
import mapApiError from '../../api/errorMapper';

export default function RestaurantDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => { setLoading(true); setError(''); adminApi.get(id).then((result) => { if (!result) throw new Error('Restaurant not found.'); setData(result); }).catch((failure) => setError(failure.message || 'Restaurant could not be loaded.')).finally(() => setLoading(false)); };
  useEffect(load, [id]);

  const completeAction = async (action, reason) => {
    setBusy(true); setRequestId('');
    try {
      const result = action === 'approve' ? await adminApi.approve(id) : await adminApi.reject(id, { reason });
      const history = await adminApi.history(id);
      setData({ ...result, history });
      setDialog(null);
      toast.success(action === 'approve' ? 'Restaurant approved.' : 'Restaurant rejected.');
    } catch (failure) {
      const mapped = mapApiError(failure);
      setRequestId(mapped.requestId || '');
      if (mapped.status === 409) { setDialog(null); toast.error('The restaurant status changed. Details were refreshed.'); load(); }
      else toast.error(mapped.message || 'The action could not be completed.');
    } finally { setBusy(false); }
  };

  if (loading) return <Card><LoadingState label="Loading restaurant details…" /></Card>;
  if (error || !data) return <Card><ErrorState message={error || 'Restaurant not found.'} onRetry={load} /></Card>;
  return <>
    <PageHeader eyebrow="Restaurant review" title={data.name} description={`/${data.slug} · ${data.city || '—'}`} action={<Link to="/admin/restaurants/pending" className="text-sm font-semibold text-brand">← Back to queue</Link>} />
    {requestId && <div className="mb-4"><RequestIdText requestId={requestId} /></div>}
    <div className="grid max-w-5xl gap-5 lg:grid-cols-[1fr_1.3fr]">
      <Card><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted">Current status</p><div className="mt-2"><RestaurantStatusBadge status={data.status} /></div></div><p className="text-right text-xs text-muted">Created<br />{formatDateTime(data.created_at)}</p></div><dl className="mt-7 grid gap-3 text-sm"><div><dt className="text-muted">Phone</dt><dd className="font-medium">{formatPhone(data.phone)}</dd></div><div><dt className="text-muted">Owner</dt><dd className="font-medium">{data.owner_full_name || '—'}</dd><dd className="text-muted">{data.owner_email || '—'}</dd></div></dl>{data.status === 'PENDING' && <div className="mt-7 grid gap-3"><Button onClick={() => setDialog('approve')}>Approve restaurant</Button><Button variant="secondary" onClick={() => setDialog('reject')}>Reject restaurant</Button></div>}</Card>
      <Card><p className="text-xs font-bold uppercase tracking-wider text-muted">Approval timeline</p>{data.history?.length ? <ApprovalTimeline events={data.history} /> : <EmptyState title="No approval history" description="The submission history will appear here." />}</Card>
    </div>
    <ApproveDialog open={dialog === 'approve'} busy={busy} onConfirm={() => completeAction('approve')} onCancel={() => setDialog(null)} />
    <RejectDialog open={dialog === 'reject'} busy={busy} onConfirm={({ reason }) => completeAction('reject', reason)} onCancel={() => setDialog(null)} />
  </>;
}
