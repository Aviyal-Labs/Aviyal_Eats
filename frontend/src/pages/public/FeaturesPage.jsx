import { Link } from 'react-router-dom';
import { Check, Clock3 } from 'lucide-react';

const currentFeatures = [
  ['Owner onboarding', 'Register your owner and restaurant details, verify your email, and submit for review.'],
  ['Google sign-in', 'Use your Google identity and provide the restaurant details needed to complete signup.'],
  ['A clear approval status', 'See whether your restaurant is pending, approved or needs changes. Resubmit a rejected registration.'],
  ['Account and session controls', 'Sign in, recover your password, and sign out from your current device or every device.'],
  ['An approval workspace', 'Super Admins can search registrations, review details and follow the approval history.'],
];

export default function FeaturesPage() {
  return <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-brand">The foundation, thoughtfully built</p>
    <h1 className="display mt-4 max-w-3xl text-4xl leading-tight sm:text-6xl">Your restaurant.<br />A clearer way forward.</h1>
    <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">Start with registration, identity and restaurant review. Here is what the current platform supports, and what is still ahead.</p>
    <div className="mt-14 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
      <section aria-labelledby="available-heading">
        <h2 id="available-heading" className="display text-3xl">Available now</h2>
        <div className="mt-7 divide-y divide-emerald-950/10">
          {currentFeatures.map(([title, description]) => <article key={title} className="flex gap-4 py-6">
            <Check className="mt-1 shrink-0 text-brand" size={20} /><div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted">{description}</p></div>
          </article>)}
        </div>
      </section>
      <aside className="self-start rounded-3xl bg-[#f3e9dc] p-7 sm:p-9">
        <Clock3 className="text-brand" /><p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-brand">Coming later</p>
        <h2 className="display mt-3 text-3xl">Room to grow.</h2>
        <p className="mt-4 text-sm leading-7 text-muted">Subscription plans, loyalty campaigns, payments and analytics are planned. They are not available services or included benefits today.</p>
        <Link to="/pricing" className="mt-6 inline-block text-sm font-semibold text-brand">Explore the plans preview →</Link>
      </aside>
    </div>
    <div className="mt-12 border-t border-emerald-950/10 pt-8"><Link to="/register" className="inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">Register your restaurant</Link></div>
  </div>;
}
