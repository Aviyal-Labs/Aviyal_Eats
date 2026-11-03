import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return <div className="min-h-screen bg-cream">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
    <header className="border-b border-emerald-950/10 bg-cream">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8">
        <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 font-semibold">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-xl font-bold text-white">A</span>
          Aviyal Eats
        </Link>
        <button type="button" className="p-2 md:hidden" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="public-navigation" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav id="public-navigation" aria-label="Main navigation" className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-5 md:flex md:w-auto md:flex-row md:items-center md:gap-8`}>
          <NavLink to="/features" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'font-semibold text-brand' : 'text-sm text-muted'}>Features</NavLink>
          <NavLink to="/pricing" onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'font-semibold text-brand' : 'text-sm text-muted'}>Plans preview</NavLink>
          <Link to="/login" className="text-sm font-semibold" onClick={() => setMenuOpen(false)}>Sign in</Link>
          <Link to="/register" className="rounded-xl bg-brand px-5 py-3 text-center text-sm font-semibold text-white hover:bg-brand-dark" onClick={() => setMenuOpen(false)}>Register restaurant</Link>
        </nav>
      </div>
    </header>
    <main id="main-content"><Outlet /></main>
    <footer className="border-t border-emerald-950/10">
      <div className="mx-auto grid max-w-7xl gap-7 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto]">
        <div><Link to="/" className="font-semibold">Aviyal Eats</Link><p className="mt-2 max-w-md text-sm leading-6 text-muted">A considered start for your restaurant’s next chapter.</p></div>
        <nav aria-label="Footer navigation" className="flex flex-wrap items-start gap-6 text-sm text-muted">
          <Link to="/features">Features</Link><Link to="/pricing">Plans preview</Link><Link to="/register">Register</Link><Link to="/login">Sign in</Link>
        </nav>
        <p className="text-xs text-muted md:col-span-2">Restaurant registration and approval are available. Subscription plans and loyalty tools are coming later.</p>
      </div>
    </footer>
  </div>;
}
