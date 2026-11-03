import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Badge, Button, Card, PageHeader } from '../../components/common/Primitives';

export default function RejectedRestaurantPage() {
  const { restaurant } = useAuth();
  return <><PageHeader eyebrow="Action needed" title="A few details need attention." description="Update the requested information and resubmit your restaurant for review." /><Card className="max-w-2xl"><Badge tone="red">REJECTED</Badge><h2 className="display mt-4 text-2xl">{restaurant?.name || 'Restaurant submission'}</h2><p className="mt-2 text-sm leading-6 text-muted">{restaurant?.rejection_reason || 'A rejection reason is not available here. Check your notification email for review details.'}</p><dl className="mt-5 grid gap-2 text-sm"><div><dt className="text-muted">City</dt><dd className="font-medium">{restaurant?.city || '—'}</dd></div><div><dt className="text-muted">Slug</dt><dd className="font-medium">/{restaurant?.slug || '—'}</dd></div></dl><Link to="/owner/restaurant/edit"><Button className="mt-6">Edit and resubmit</Button></Link></Card></>;
}
