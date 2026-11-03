import { useAuth } from '../../hooks/useAuth'; import { Badge, Card, PageHeader } from '../../components/common/Primitives';

function statusTone(status) {
  if (status === 'APPROVED') return 'green';
  if (status === 'REJECTED') return 'red';
  return 'orange';
}

export default function OwnerProfilePage() { const { user, restaurant } = useAuth(); const status = restaurant?.status || 'PENDING'; return <><PageHeader eyebrow="Account" title="Your profile" description="The owner and restaurant information attached to this workspace." /><div className="grid max-w-3xl gap-5 md:grid-cols-2"><Card><p className="text-xs font-bold uppercase tracking-wider text-muted">Owner</p><h2 className="display mt-3 text-2xl">{user?.full_name || 'Anu Nair'}</h2><p className="mt-2 text-sm text-muted">{user?.email || 'anu@example.com'}</p><p className="mt-1 text-sm text-muted">{user?.mobile || '+919876543210'}</p></Card><Card><p className="text-xs font-bold uppercase tracking-wider text-muted">Restaurant</p><h2 className="display mt-3 text-2xl">{restaurant?.name || 'Coconut Kitchen'}</h2><p className="mt-2 text-sm text-muted">/{restaurant?.slug || 'coconut-kitchen'}</p><Badge tone={statusTone(status)}>{status}</Badge></Card></div></>; }
