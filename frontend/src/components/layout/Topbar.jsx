import { useState } from 'react';
import { Menu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Unable to sign out. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 lg:px-8">
    <button aria-label="Open navigation" className="text-muted lg:hidden" onClick={onMenu}><Menu /></button>
    <div className="ml-auto flex items-center gap-4">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-semibold">{user?.full_name || 'Account'}</p>
        <p className="text-xs text-muted">{user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Restaurant Owner'}</p>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 font-semibold text-brand">{user?.full_name?.[0] || '?'}</div>
      <button aria-label="Log out" title="Log out" disabled={busy} className="text-muted hover:text-coral disabled:opacity-50" onClick={handleLogout}><LogOut size={18} /></button>
    </div>
  </header>;
}