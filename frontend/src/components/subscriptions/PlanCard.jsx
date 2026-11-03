import { Link } from 'react-router-dom';

export function PlanFeatureList({ features = [] }) {
  return <ul className="mt-6 grid gap-3 text-sm leading-6 text-muted">
    {features.map((feature) => <li key={feature} className="flex gap-3"><span aria-hidden="true">—</span>{feature}</li>)}
  </ul>;
}

export default function PlanCard({ plan, selected = false }) {
  return <article className={`flex h-full flex-col rounded-3xl border p-7 ${selected ? 'border-brand bg-emerald-50' : 'border-emerald-950/15 bg-white'}`}>
    <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Coming soon</p>
    <h2 className="display mt-4 text-3xl">{plan.name}</h2>
    <p className="mt-3 text-sm leading-7 text-muted">{plan.description}</p>
    <p className="mt-7 text-lg font-semibold">Pricing to be announced</p>
    <PlanFeatureList features={plan.features} />
    <Link to={`/register?plan=${encodeURIComponent(plan.id)}`} className="mt-8 rounded-xl border border-brand px-4 py-3 text-center text-sm font-semibold text-brand hover:bg-emerald-50">Register your restaurant</Link>
    <p className="mt-3 text-xs leading-5 text-muted">Registration does not select or activate a paid plan.</p>
  </article>;
}
