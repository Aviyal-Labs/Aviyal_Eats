import { Button } from './Primitives';
export default function ErrorState({ message = 'Something went wrong.', onRetry }) { return <div className="flex flex-col items-center gap-3 p-8 text-center"><p role="alert" className="text-sm text-red-600">{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Retry</Button>}</div>; }
