'use client';

import { useEffect } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import { useStore } from '@/store/useStore';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const loadUser = useStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white">
      <Header />
      <main className="pt-14 pb-20 max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
