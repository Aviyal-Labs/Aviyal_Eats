import { Link } from 'react-router-dom';
import { ArrowRight, Check, Mail, Store, ShieldCheck } from 'lucide-react';

const steps = [
  { title: 'Introduce your restaurant', description: 'Create your owner account and tell us about your restaurant.', icon: Store },
  { title: 'Verify your email', description: 'Use the code sent to your inbox, or continue with Google.', icon: Mail },
  { title: 'Get ready for review', description: 'Follow your approval status and update your submission if requested.', icon: ShieldCheck },
];

export default function HomePage() {
  return <>
    <section className="surface-grid">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-brand">Made for restaurant owners</p>
          <h1 className="display mt-5 max-w-2xl text-5xl leading-[1.08] sm:text-6xl lg:text-7xl">Good food.<br />Great beginnings.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted">Bring your restaurant to Aviyal Eats. One owner account, a clear registration process, and a workspace that keeps you informed.</p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link to="/register" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">Register your restaurant <ArrowRight size={18} /></Link>
            <Link to="/features" className="text-sm font-semibold text-brand">Explore what’s available</Link>
          </div>
          <p className="mt-5 text-xs leading-5 text-muted">Registration submits your restaurant for approval. No subscription is activated.</p>
        </div>
        <div className="relative rounded-[2rem] bg-[#e6ede2] p-6 sm:p-10">
          <div aria-hidden="true" className="absolute right-7 top-5 text-7xl text-brand/20">✳</div>
          <p className="relative text-xs font-bold uppercase tracking-[.2em] text-brand">A clear path to your workspace</p>
          <h2 className="display relative mt-3 max-w-xs text-3xl leading-tight">Your next chapter starts here.</h2>
          <ol className="relative mt-8 grid gap-3">
            {['Create your owner account', 'Verify your identity', 'Submit for restaurant review'].map((label, index) => <li key={label} className="flex items-center gap-4 rounded-2xl bg-white/90 px-4 py-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-semibold text-brand">0{index + 1}</span>
              <span className="text-sm font-medium">{label}</span>
            </li>)}
          </ol>
          <p className="mt-5 flex items-center gap-2 text-xs text-brand"><Check size={15} /> One owner. One restaurant. Your own workspace.</p>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">How it works</p><h2 className="display mt-3 text-3xl sm:text-4xl">Less guesswork. A clear next step.</h2></div>
        <span className="text-sm text-muted">From registration to review</span>
      </div>
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {steps.map(({ title, description, icon: Icon }, index) => <article key={title} className="border-t border-emerald-950/15 pt-6">
          <div className="flex items-center justify-between"><Icon size={25} className="text-brand" /><span className="text-xs text-muted">0{index + 1}</span></div>
          <h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted">{description}</p>
        </article>)}
      </div>
    </section>
    <section className="mx-auto mb-16 max-w-7xl px-5 sm:px-8">
      <div className="grid gap-8 rounded-[2rem] bg-brand-dark p-8 text-white sm:p-12 md:grid-cols-[1fr_auto] md:items-center">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-200">Built with tomorrow in mind</p><h2 className="display mt-3 text-3xl">Start with your restaurant.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-emerald-100">Starter, Growth and Pro are planned for the future. Explore the preview while we build the next chapter.</p></div>
        <Link to="/pricing" className="inline-flex items-center gap-3 font-semibold">View plans preview <ArrowRight size={18} /></Link>
      </div>
    </section>
  </>;
}
