import { Badge } from '../common/Primitives';
export default function RestaurantStatusBadge({ status }) { return <Badge tone={status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'orange'}>{status}</Badge>; }
