import { useAuth } from '../../hooks/useAuth';
import { Badge, Card, PageHeader } from '../../components/common/Primitives';

export default function OwnerProfilePage() {
  const { user, restaurant } = useAuth();
  const status = restaurant?.status;
  const tone = status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'orange';

  return <>
    <PageHeader eyebrow="Account" title="Your profile" description="The owner and restaurant attached to your account." />
    <div className="grid max-w-3xl gap-5 md:grid-cols-2">
      <Card>
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Owner</p>
        <h2 className="display mt-3 text-2xl">{user?.full_name || 'Not available'}</h2>
        <p className="mt-2 text-sm text-muted">{user?.email || 'Not available'}</p>
        <p className="mt-1 text-sm text-muted">{user?.mobile || 'Mobile not available'}</p>
      </Card>
      <Card>
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Restaurant</p>
        <h2 className="display mt-3 text-2xl">{restaurant?.name || 'Not available'}</h2>
        <p className="mt-2 text-sm text-muted">{restaurant?.slug ? `/${restaurant.slug}` : 'URL not available'}</p>
        <Badge tone={tone}>{status || 'Status not available'}</Badge>
      </Card>
    </div>
  </>;
}