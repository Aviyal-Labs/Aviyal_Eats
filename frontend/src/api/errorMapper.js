function safeMessage(value) {
  return typeof value === 'string' && !/<\/?[a-z][\s\S]*>/i.test(value) ? value : null;
}

export default function mapApiError(error) {
  const response = error?.response;
  const body = response?.data && typeof response.data === 'object' ? response.data : {};
  const headers = response?.headers;
  let fields = {};
  if (body.errors && typeof body.errors === 'object' && !Array.isArray(body.errors)) fields = body.errors;
  else if (response?.status === 400) {
    fields = Object.fromEntries(Object.entries(body).filter(([key]) => !['detail', 'message', 'code', 'errors'].includes(key)));
  }
  let message = safeMessage(body.message) || safeMessage(body.detail);
  if (!response) message = error?.code === 'ECONNABORTED'
    ? 'The request timed out. Please check the result before trying again.'
    : 'Unable to reach the service. Check your connection and try again.';
  else if (response.status >= 500) message = 'The service is temporarily unavailable. Please try again later.';
  else if (!message) message = response.status === 400 ? 'Please review the highlighted fields.' : 'The request could not be completed. Please try again.';

  return {
    status: response?.status,
    code: body.code,
    message,
    fields,
    requestId: headers?.['x-request-id'] || headers?.get?.('x-request-id') || null,
  };
}