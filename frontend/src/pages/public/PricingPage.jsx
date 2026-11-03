import { useSearchParams } from 'react-router-dom';
import PlanCard from '../../components/subscriptions/PlanCard';

// Fixed future identities only. Published prices and entitlements must come from the future API.
const planPreviews = ['Starter', 'Growth', 'Pro'].map((name) => ({
  id: name.toLowerCase(),
  name,
  description: 'A future Aviyal Eats plan. The published offering is still being developed.',
  features: ['Feature details to be announced', 'Usage limits to be announced', 'Billing is not available yet'],
}));

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const preselectedPlan = searchParams.get('plan');

  return <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Future plans preview</p>
      <h1 className="display mt-4 text-4xl leading-tight sm:text-6xl">A little room.<br />A lot of possibility.</h1>
      <p className="mt-6 text-lg leading-8 text-muted">Starter, Growth and Pro are planned. Prices, included features and limits have not been published.</p>
    </div>
    <div role="note" className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center text-sm leading-6 text-amber-900">Preview only. There is no checkout, payment, trial or active subscription. You can register a restaurant without choosing a plan.</div>
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {planPreviews.map((plan) => <PlanCard key={plan.id} plan={plan} selected={preselectedPlan === plan.id} />)}
    </div>
    <section className="mx-auto mt-14 max-w-3xl space-y-5">
      <h2 className="display text-3xl">A few things to know</h2>
      <details className="border-b border-emerald-950/10 pb-5"><summary className="cursor-pointer font-semibold">Can I register before plans launch?</summary><p className="mt-3 text-sm leading-7 text-muted">Yes. Register your restaurant and complete identity verification. Restaurant approval is separate from any future subscription.</p></details>
      <details className="border-b border-emerald-950/10 pb-5"><summary className="cursor-pointer font-semibold">Will registration create a subscription?</summary><p className="mt-3 text-sm leading-7 text-muted">No. Your registration does not activate a subscription, start a trial or create a payment obligation.</p></details>
    </section>
  </div>;
}
