import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { Card, PageHeader } from '../../components/common/Primitives';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError('');
    setCounts(null);
    Promise.all([
      adminApi.list({ status: 'PENDING', page_size: 1 }),
      adminApi.list({ page_size: 1 }),
    ]).then(([pending, all]) => {
      if (active) setCounts({ pending: pending.count, all: all.count });
    }).catch(() => {
      if (active) setError('Unable to load the restaurant summary.');
    });
    return () => { active = false; };
  }, [attempt]);

  return <>
    <PageHeader eyebrow="Administration" title="Restaurant overview" description="Review restaurant registrations and approval decisions." />
    {error ? <Card><ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} /></Card>
      : !counts ? <Card><LoadingState label="Loading restaurant summary..." /></Card>
        : <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <p className="text-sm text-muted">Pending review</p>
            <p className="display mt-2 text-4xl">{counts.pending}</p>
            <Link className="mt-5 inline-block text-sm font-semibold text-brand" to="/admin/restaurants/pending">Open approval queue</Link>
          </Card>
          <Card>
            <p className="text-sm text-muted">Total restaurants</p>
            <p className="display mt-2 text-4xl">{counts.all}</p>
            <Link className="mt-5 inline-block text-sm font-semibold text-brand" to="/admin/restaurants">Browse restaurants</Link>
          </Card>
        </div>}
  </>;
}