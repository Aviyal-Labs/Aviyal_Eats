import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Badge, Card, PageHeader } from '../../components/common/Primitives';

export default function OwnerDashboardPage() {
  const { user, restaurant } = useAuth();
  return <>
    <PageHeader eyebrow="Owner workspace" title={`Welcome, ${user?.full_name?.split(' ')[0] || 'owner'}.`} description="Your approved restaurant and owner account." />
    <div className="grid gap-5 md:grid-cols-3">
      <Card className="md:col-span-2">
        <p className="text-sm text-muted">Restaurant</p>
        <h2 className="display mt-2 text-3xl">{restaurant?.name || 'Not available'}</h2>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge tone="green">{restaurant?.status || 'Status not available'}</Badge>
          {restaurant?.slug && <Link to={`/r/${encodeURIComponent(restaurant.slug)}/dashboard`} className="text-sm text-brand">/{restaurant.slug}</Link>}
        </div>
      </Card>
      <Card>
        <p className="text-sm text-muted">Owner account</p><p className="mt-3 break-words font-semibold">{user?.email || 'Not available'}</p>
        <Link className="mt-5 inline-block text-sm font-semibold text-brand" to="/owner/profile">View profile →</Link>
      </Card>
      <Card className="md:col-span-3">
        <h2 className="font-semibold">Subscriptions and additional tools</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">Plans and additional feature access are coming later. Restaurant approval does not activate a subscription.</p>
        <button type="button" disabled className="mt-4 rounded-xl border border-slate-200 px-4 py-3 text-sm text-muted opacity-60">Subscription management — coming soon</button>
      </Card>
    </div>
  </>;
}