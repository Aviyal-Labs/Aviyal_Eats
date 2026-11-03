export function getRequestId(error) {
  const headers = error?.response?.headers;
  return headers?.['x-request-id'] || headers?.get?.('x-request-id') || null;
}
