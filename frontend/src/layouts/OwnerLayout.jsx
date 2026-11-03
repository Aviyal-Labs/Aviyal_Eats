import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
export default function OwnerLayout() { const [open, setOpen] = useState(false); return <div className="flex min-h-screen bg-cream"><Sidebar open={open} onClose={() => setOpen(false)} /><div className="min-w-0 flex-1"><Topbar onMenu={() => setOpen(true)} /><main className="mx-auto max-w-7xl p-5 lg:p-8"><Outlet /></main></div></div>; }
