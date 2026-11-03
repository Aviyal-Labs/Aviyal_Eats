export default function RequestIdText({ requestId }) { return requestId ? <p className="text-xs text-muted">Request ID: <span className="font-mono">{requestId}</span></p> : null; }
