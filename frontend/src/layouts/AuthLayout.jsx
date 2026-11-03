import { Outlet, Link } from 'react-router-dom';

export default function AuthLayout() {
  return <main className="surface-grid min-h-screen">
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center gap-3 font-semibold"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-lg font-bold text-white">A</span>Aviyal Eats</Link>
        <Link to="/" className="text-sm text-muted">Back to website</Link>
      </header>
      <div className="grid flex-1 items-center py-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
        <div className="hidden lg:block">
          <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-brand">Your restaurant's next chapter</p>
          <h2 className="display max-w-lg text-6xl leading-[1.05]">Good things start with a clear beginning.</h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-muted">Create your owner account, introduce your restaurant, and follow your submission through review.</p>
        </div>
        <div className="mx-auto w-full max-w-lg"><Outlet /></div>
      </div>
    </div>
  </main>;
}