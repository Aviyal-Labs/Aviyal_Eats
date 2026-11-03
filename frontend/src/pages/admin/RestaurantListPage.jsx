import { useEffect, useState } from 'react';
import { adminApi, RESTAURANT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../../api/adminApi';
import { Card } from '../../components/common/Primitives';
import PageHeader from '../../components/common/PageHeader';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import PaginationControls from '../../components/common/PaginationControls';
import RestaurantSearch from '../../components/admin/RestaurantSearch';
import RestaurantFilters from '../../components/admin/RestaurantFilters';
import RestaurantTable from '../../components/admin/RestaurantTable';
import useDebouncedValue from '../../hooks/useDebouncedValue';

export default function RestaurantListPage({ pendingOnly = false }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(pendingOnly ? 'PENDING' : '');

  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, page: 1, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');
    adminApi.list({
      status: pendingOnly ? 'PENDING' : status,
      search: debouncedSearch,

      page,
      page_size: RESTAURANT_PAGE_SIZE,
    }).then((result) => {
      if (active) setData(result);
    }).catch(() => {
      if (active) setError('We could not load the restaurant directory. Please try again.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [debouncedSearch, page, pendingOnly, retryToken, status]);

  const title = pendingOnly ? 'Pending restaurants' : 'All restaurants';
  const description = pendingOnly
    ? 'Review new restaurant submissions before they join the platform.'
    : 'Search the restaurant directory. Newest submissions appear first.';

  return <>
    <PageHeader eyebrow={pendingOnly ? 'Approvals' : 'Directory'} title={title} description={description} />
    <Card className="mb-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><RestaurantSearch value={search} onChange={setSearch} /><RestaurantFilters status={status} onStatusChange={setStatus} pendingOnly={pendingOnly} /></div>
      {!pendingOnly && status && <button type="button" onClick={() => setStatus('')} className="mt-3 text-xs font-semibold text-brand hover:text-brand-dark">Clear status filter</button>}
      <p className="mt-3 text-xs text-muted">Search updates after {SEARCH_DEBOUNCE_MS}ms. Showing {data.count} result{data.count === 1 ? '' : 's'}.</p>
    </Card>

    <Card className="overflow-hidden p-0">
      {isLoading && <LoadingState label="Loading restaurants…" />}
      {!isLoading && error && <ErrorState message={error} onRetry={() => setRetryToken((current) => current + 1)} />}
      {!isLoading && !error && data.results.length === 0 && <EmptyState title="No restaurants found" description="Try a different search or clear the current filter." />}
      {!isLoading && !error && data.results.length > 0 && <>
        <RestaurantTable rows={data.results} />
        <PaginationControls page={data.page} totalPages={data.total_pages} onPrevious={() => setPage((current) => Math.max(1, current - 1))} onNext={() => setPage((current) => Math.min(data.total_pages, current + 1))} />
      </>}
    </Card>
  </>;
}
