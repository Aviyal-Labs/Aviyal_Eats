import { Card } from '../common/Primitives';
export default function AuthFormShell({ children, className = '' }) { return <Card className={`p-5 sm:p-7 ${className}`}>{children}</Card>; }
